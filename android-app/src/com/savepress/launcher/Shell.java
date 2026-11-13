package com.savepress.launcher;

import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import rikka.shizuku.Shizuku;

/** Reads and writes save files, using Shizuku when Android hides the game folder. */
public final class Shell {
    private static final int CAP = 8_000_000;

    private Shell() {}

    public static boolean shizukuReady() {
        try {
            return Shizuku.pingBinder()
                    && Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED;
        } catch (Throwable ignored) {
            return false;
        }
    }

    public static List<String> listFiles(String root) {
        List<String> out = new ArrayList<String>();
        File dir = new File(root);
        String[] probe = dir.list();
        if (probe != null) {
            walk(dir, 0, out);
            if (!out.isEmpty()) return out;
        }
        if (!shizukuReady()) return out;
        try {
            String text = new String(exec("find " + quote(root) + " \\( -path '*/Unity' -o -path '*/il2cpp' -o -path '*/cache' -o -path '*/mb' \\) -prune -o -type f -size -8M -print 2>/dev/null"), StandardCharsets.UTF_8);
            for (String line : text.split("\n")) {
                String path = line.trim();
                if (path.startsWith(root + "/") && !path.contains("..")) out.add(path);
                if (out.size() >= 400) break;
            }
        } catch (Exception ignored) {
            return out;
        }
        return out;
    }

    public static long modified(String path) {
        File file = new File(path);
        if (file.isFile()) return file.lastModified();
        if (!shizukuReady()) return 0;
        try {
            String text = new String(exec("stat -c %Y " + quote(path) + " 2>/dev/null"), StandardCharsets.UTF_8).trim();
            if (text.isEmpty()) return 0;
            return Long.parseLong(text) * 1000L;
        } catch (Exception ignored) {
            return 0;
        }
    }

    public static byte[] readPath(String path) throws Exception {
        File file = new File(path);
        if (file.isFile() && file.canRead()) {
            try (InputStream in = new FileInputStream(file)) {
                return readAll(in, CAP);
            }
        }
        if (!shizukuReady()) throw new IllegalStateException("Can't read that file. Start Shizuku and allow Savepress.");
        Process process = start("cat " + quote(path));
        byte[] data = readAll(process.getInputStream(), CAP);
        int code = process.waitFor();
        if (code != 0) throw new IllegalStateException("Couldn't read the save (" + code + ").");
        return data;
    }

    public static void writePath(String path, byte[] data) throws Exception {
        File file = new File(path);
        File parent = file.getParentFile();
        if (parent != null && parent.canWrite()) {
            try (OutputStream out = new FileOutputStream(file)) {
                out.write(data);
                return;
            } catch (Exception ignored) {
                /* try Shizuku */
            }
        }
        if (!shizukuReady()) throw new IllegalStateException("Can't write that file. Start Shizuku and allow Savepress.");
        Process process = start("cat > " + quote(path));
        OutputStream out = process.getOutputStream();
        out.write(data);
        out.close();
        int code = process.waitFor();
        if (code != 0) throw new IllegalStateException("The write was refused (" + code + ").");
    }

    public static byte[] readUri(Context context, Uri uri) throws Exception {
        try (InputStream in = context.getContentResolver().openInputStream(uri)) {
            if (in == null) throw new IllegalStateException("The folder permission expired.");
            return readAll(in, CAP);
        }
    }

    public static void writeUri(Context context, Uri uri, byte[] data) throws Exception {
        ParcelFileDescriptor fd = context.getContentResolver().openFileDescriptor(uri, "wt");
        if (fd == null) throw new IllegalStateException("The folder permission expired.");
        try (OutputStream out = new FileOutputStream(fd.getFileDescriptor())) {
            out.write(data);
        } finally {
            fd.close();
        }
    }

    private static void walk(File dir, int depth, List<String> out) {
        if (depth > 5 || out.size() >= 400) return;
        File[] kids = dir.listFiles();
        if (kids == null) return;
        for (File kid : kids) {
            if (kid.getName().startsWith(".")) continue;
            if (kid.isDirectory()) {
                String folder = kid.getName().toLowerCase(java.util.Locale.US);
                if (folder.equals("unity") || folder.equals("il2cpp") || folder.equals("mb") || folder.equals("cache")) continue;
                walk(kid, depth + 1, out);
            } else if (kid.isFile() && kid.length() <= CAP) out.add(kid.getAbsolutePath());
            if (out.size() >= 400) return;
        }
    }

    private static byte[] exec(String command) throws Exception {
        Process process = start(command);
        byte[] data = readAll(process.getInputStream(), CAP);
        process.waitFor();
        return data;
    }

    private static Process start(String command) throws Exception {
        Method method = Shizuku.class.getDeclaredMethod("newProcess", String[].class, String[].class, String.class);
        method.setAccessible(true);
        Object value = method.invoke(null, new String[]{"sh", "-c", command}, null, null);
        if (!(value instanceof Process)) throw new IllegalStateException("Shizuku did not start a shell.");
        return (Process) value;
    }

    static String quote(String value) {
        return "'" + value.replace("'", "'\\''") + "'";
    }

    private static byte[] readAll(InputStream in, int cap) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) >= 0) {
            if (out.size() + n > cap) throw new IllegalStateException("That save is over 8 MB.");
            out.write(buf, 0, n);
        }
        return out.toByteArray();
    }
}
