package com.savepress.launcher;

import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public final class Finder {
    public static final class Hit {
        public final String name;
        public final String detail;
        public final String key;
        public final boolean uri;
        public final int score;
        public final long modified;

        Hit(String name, String detail, String key, boolean uri, int score, long modified) {
            this.name = name;
            this.detail = detail;
            this.key = key;
            this.uri = uri;
            this.score = score;
            this.modified = modified;
        }
    }

    private Finder() {}

    public static List<Hit> find(Context context, String pkg) {
        List<Hit> hits = new ArrayList<Hit>();
        String[] roots = new String[]{
                "/storage/emulated/0/Android/data/" + pkg,
                "/storage/emulated/0/Android/media/" + pkg,
                "/sdcard/Android/data/" + pkg,
                "/data/user/0/" + pkg + "/shared_prefs",
                "/data/data/" + pkg + "/shared_prefs",
                "/data/user/0/" + pkg + "/files"
        };
        for (String root : roots) {
            for (String path : Shell.listFiles(root)) {
                int score = scorePath(path);
                if (score <= 0) continue;
                String name = path.substring(path.lastIndexOf('/') + 1);
                hits.add(new Hit(name, path, path, false, score, 0));
            }
        }
        probePrefs(pkg, hits);
        String tree = context.getSharedPreferences("savepress", Context.MODE_PRIVATE).getString("tree:" + pkg, null);
        if (tree != null) scanTree(context, Uri.parse(tree), hits);
        Collections.sort(hits, byRank());
        List<Hit> ranked = sniff(context, hits);
        if (ranked.size() > 8) return new ArrayList<Hit>(ranked.subList(0, 8));
        return ranked;
    }

    /** The file that looks most like a progress save. Never asks the user. */
    public static Hit pick(Context context, String pkg) {
        Hit direct = readUserData(pkg);
        if (direct != null) {
            remember(context, pkg, direct);
            return direct;
        }
        List<Hit> hits = find(context, pkg);
        if (hits.isEmpty() || hits.get(0).score < 100) {
            context.getSharedPreferences("savepress", Context.MODE_PRIVATE).edit().remove("save:" + pkg).apply();
            return null;
        }
        Hit best = hits.get(0);
        remember(context, pkg, best);
        return best;
    }

    /** Supercent writes cash into files/UserData, with a base64 UTF-16 file name. */
    private static Hit readUserData(String pkg) {
        String file = Codec.encodeName("UserData");
        String[] roots = new String[]{
                "/storage/emulated/0/Android/data/" + pkg + "/files/" + file,
                "/sdcard/Android/data/" + pkg + "/files/" + file,
                "/mnt/user/0/emulated/0/Android/data/" + pkg + "/files/" + file,
                "/storage/self/primary/Android/data/" + pkg + "/files/" + file
        };
        for (String path : roots) {
            try {
                String text = Codec.decodeBody(Shell.readPath(path));
                if (text != null && text.contains("\"coin\"")) {
                    return new Hit("UserData", path, path, false, 5000, 0);
                }
            } catch (Exception ignored) {
                /* try the next location */
            }
        }
        return null;
    }

    public static String seen(String pkg) {
        StringBuilder out = new StringBuilder();
        int n = 0;
        String[] roots = new String[]{
                "/storage/emulated/0/Android/data/" + pkg + "/files",
                "/storage/emulated/0/Android/data/" + pkg,
                "/data/user/0/" + pkg + "/shared_prefs",
                "/data/user/0/" + pkg + "/files"
        };
        for (String root : roots) {
            for (String path : Shell.listFiles(root)) {
                String name = path.substring(path.lastIndexOf('/') + 1);
                if (out.indexOf(name) >= 0) continue;
                if (n == 8) return out + "…";
                if (n > 0) out.append(", ");
                out.append(name);
                n++;
            }
        }
        return out.length() == 0 ? "" : out.toString();
    }

    private static void probePrefs(String pkg, List<Hit> hits) {
        String[] paths = new String[]{
                "/data/user/0/" + pkg + "/shared_prefs/" + pkg + ".v2.playerprefs.xml",
                "/data/data/" + pkg + "/shared_prefs/" + pkg + ".v2.playerprefs.xml",
                "/data/user/0/" + pkg + "/shared_prefs/" + pkg + "_preferences.xml"
        };
        for (String path : paths) {
            String name = path.substring(path.lastIndexOf('/') + 1);
            hits.add(new Hit(name, path, path, false, 30, 0));
        }
    }

    public static Hit remembered(Context context, String pkg, List<Hit> hits) {
        String key = context.getSharedPreferences("savepress", Context.MODE_PRIVATE).getString("save:" + pkg, null);
        if (key == null) return null;
        for (Hit hit : hits) {
            if (key.equals(hit.key)) return hit;
        }
        return null;
    }

    public static void remember(Context context, String pkg, Hit hit) {
        SharedPreferences prefs = context.getSharedPreferences("savepress", Context.MODE_PRIVATE);
        prefs.edit().putString("save:" + pkg, hit.key).apply();
    }

    public static void rememberTree(Context context, String pkg, Uri tree) {
        context.getSharedPreferences("savepress", Context.MODE_PRIVATE)
                .edit()
                .putString("tree:" + pkg, tree.toString())
                .apply();
    }

    public static Hit choose(List<Hit> hits) {
        return hits.isEmpty() ? null : hits.get(0);
    }

    private static List<Hit> sniff(Context context, List<Hit> hits) {
        int limit = Math.min(40, hits.size());
        List<Hit> ranked = new ArrayList<Hit>();
        for (int i = 0; i < hits.size(); i++) {
            Hit hit = hits.get(i);
            int score = hit.score;
            long modified = hit.modified;
            if (i < limit) {
                try {
                    byte[] bytes = hit.uri
                            ? Shell.readUri(context, Uri.parse(hit.key))
                            : Shell.readPath(hit.key);
                    if (!hit.uri) modified = Shell.modified(hit.key);
                    String text = Codec.decodeBody(bytes);
                    if (text == null) {
                        if (bytes.length > 1_500_000 || SaveText.looksBinary(bytes)) score = -50;
                        else text = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                    }
                    if (text != null) {
                        String logical = Codec.logicalName(hit.name);
                        if (SaveText.analytics(logical, text)) score = -1000;
                        else {
                            SaveText.Doc doc = SaveText.parse(text);
                            int interest = SaveText.interest(doc);
                            if (doc != null && interest >= 40) score = 1000 + interest;
                            else if (doc != null && !doc.fields.isEmpty()) score = 100 + interest;
                            else score = 0;
                        }
                    }
                } catch (Exception ignored) {
                    score = -1;
                }
            }
            ranked.add(new Hit(hit.name, hit.detail, hit.key, hit.uri, score, modified));
        }
        Collections.sort(ranked, byRank());
        return ranked;
    }

    private static Comparator<Hit> byRank() {
        return new Comparator<Hit>() {
            @Override
            public int compare(Hit a, Hit b) {
                int byScore = Integer.compare(b.score, a.score);
                if (byScore != 0) return byScore;
                return Long.compare(b.modified, a.modified);
            }
        };
    }

    static int scorePath(String path) {
        int slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        String rawName = slash >= 0 ? path.substring(slash + 1) : path;
        String lower = path.toLowerCase(Locale.US);
        String name = rawName.toLowerCase(Locale.US);
        if (lower.contains("/unity/") || lower.contains("/il2cpp/") || lower.contains("/mb/")
                || lower.contains("/analytics/") || lower.contains("/cache/")) {
            return -1;
        }
        if (name.matches(".*\\.(png|jpe?g|webp|gif|mp3|ogg|wav|mp4|webm|atlas|ttf|otf|woff2?|so|dex|pak|unity3d|bundle|assets|resource|db|sqlite)$")) {
            return -1;
        }
        String logical = Codec.logicalName(rawName).toLowerCase(Locale.US);
        if (logical.contains("session_data") || logical.contains("firebase") || logical.contains("crashlytics")
                || logical.contains("appsflyer") || logical.contains("analytics") || logical.contains("adjust")
                || logical.startsWith("ga_") || logical.contains("measurement") || logical.contains("device_info")
                || logical.contains("aws_event") || logical.contains("funnel")) {
            return -1;
        }
        int score = 1;
        if ("userdata".equals(logical)) score += 80;
        if (logical.contains("bigcoin") || logical.equals("coin") || logical.contains("userdata")) score += 20;
        if (name.matches(".*\\.(json|xml|txt|sav|cfg|ini|pref|prefs|es3|dat)$")) score += 3;
        if (name.matches(".*(save|slot|player|prefs|persistent|progress|profile|userdata|gamedata|playerdata).*")) score += 6;
        if (lower.contains("/shared_prefs/")) score += 8;
        if (lower.contains("/files/")) score += 3;
        if (lower.contains("/saves/") || lower.contains("/save/")) score += 6;
        if (name.endsWith(".data") && name.matches(".*(save|persistent|player|game).*")) score += 4;
        return score;
    }

    private static void scanTree(Context context, Uri tree, List<Hit> hits) {
        try {
            String root = DocumentsContract.getTreeDocumentId(tree);
            walkTree(context, tree, root, "", 0, hits);
        } catch (Exception ignored) {
            /* permission dropped */
        }
    }

    private static void walkTree(Context context, Uri tree, String docId, String prefix, int depth, List<Hit> hits) {
        if (depth > 4 || hits.size() >= 80) return;
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, docId);
        Cursor cursor = context.getContentResolver().query(children, new String[]{
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE
        }, null, null, null);
        if (cursor == null) return;
        try {
            while (cursor.moveToNext() && hits.size() < 80) {
                String id = cursor.getString(0);
                String name = cursor.getString(1);
                String mime = cursor.getString(2);
                if (name == null || name.startsWith(".")) continue;
                String path = prefix.isEmpty() ? name : prefix + "/" + name;
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    walkTree(context, tree, id, path, depth + 1, hits);
                    continue;
                }
                int score = scorePath(path);
                if (score <= 0) continue;
                Uri file = DocumentsContract.buildDocumentUriUsingTree(tree, id);
                hits.add(new Hit(name, path, file.toString(), true, score, 0));
            }
        } finally {
            cursor.close();
        }
    }
}
