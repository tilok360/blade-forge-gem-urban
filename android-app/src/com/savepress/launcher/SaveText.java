package com.savepress.launcher;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Reads JSON, Android preference XML, Unity PlayerPrefs, key=value, and light binary saves. */
public final class SaveText {
    public static final long SAFE_MONEY = 999_999_999L;
    public static final long INT32_MAX = 2_147_483_647L;
    private static final String CHECKSUM_WARNING =
            "This field has a checksum or hash next to it. Changing the amount may not stick until the hash is updated too.";

    private static final Set<String> MONEY_CORE = set(
            "gold", "coin", "coins", "money", "cash", "gem", "gems", "credit", "credits",
            "diamond", "diamonds", "token", "tokens", "silver", "buck", "bucks", "dollar",
            "dollars", "currency", "ruby", "rubies", "emerald", "emeralds", "soul", "souls",
            "crystal", "crystals", "jewel", "jewels", "pearl", "pearls", "essence", "shard", "shards",
            "orb", "orbs", "premium", "wallet", "bank", "savings", "balance", "funds",
            "softcurrency", "hardcurrency",
            "oro", "dinero", "moneda", "monedas", "gema", "gemas", "argent", "gemme", "gemmes",
            "geld", "muenzen", "munzen", "chip", "chips", "coinage", "wealth", "riches", "bankroll",
            "purse", "treasury", "ingot", "ingots", "ore", "ores", "mineral", "minerals");
    private static final Set<String> MONEY_SOFT = set(
            "star", "stars", "ticket", "tickets", "key", "keys", "heart", "hearts",
            "life", "lives", "energy", "stamina", "point", "points", "score", "sc", "hc", "cur");
    private static final Set<String> MONEY_PARENT = set(
            "wallet", "purse", "bank", "currency", "currencies", "money", "cash", "coins", "coin",
            "gold", "gems", "gem", "credits", "credit", "treasury", "funds", "tickets", "keys",
            "stars", "hearts", "lives", "energy", "stamina", "points", "savings", "premium",
            "crystal", "crystals", "diamond", "diamonds", "token", "tokens", "balance",
            "softcurrency", "hardcurrency");
    private static final Set<String> AMOUNT = set(
            "amount", "value", "count", "qty", "quantity", "bal", "balance", "total", "num", "number");
    private static final Set<String> QUALIFIER = set(
            "m", "player", "my", "current", "total", "soft", "hard", "user", "account", "owned",
            "available", "global", "profile", "save", "data", "game", "pref", "prefs");
    private static final Set<String> REJECT = set(
            "cost", "price", "fee", "paid", "pay", "spend", "spent", "spending",
            "required", "require", "requirement", "needed", "need", "needs",
            "reward", "rewards", "rewarded", "payout", "drop", "loot",
            "id", "ids", "uid", "uuid", "guid", "index", "idx",
            "timestamp", "time", "date", "datetime", "created", "updated", "modified",
            "version", "ver", "revision", "rev", "build",
            "hash", "checksum", "crc", "crc32", "md5", "sha", "sha1", "sha256",
            "signature", "sig", "digest", "integrity",
            "purchase", "purchased", "purchases", "bought",
            "max", "min", "cap", "limit", "capacity",
            "per", "rate", "multiplier", "mult",
            "earned", "given", "granted", "award", "awarded",
            "used", "usage", "consume", "consumed", "consumption",
            "initial", "default", "base", "start", "starting",
            "duration", "interval", "cooldown", "delay", "expiry", "expire", "ttl",
            "to", "from", "add", "added", "plus", "delta", "diff", "change", "gain", "gained",
            "high");
    private static final Set<String> UNLOCK_ON = set(
            "unlocked", "owned", "purchased", "bought", "available", "opened", "complete", "completed");
    private static final Set<String> UNLOCK_OFF = set("locked", "sealed");
    private static final Set<String> UPGRADE = set("level", "lvl", "upgrade", "rank", "tier", "star", "skill", "power");
    private static final Set<String> CHECKSUM_NAME = set(
            "hash", "checksum", "crc", "crc32", "md5", "sha", "sha1", "sha256", "signature", "sig",
            "digest", "integrity", "savehash", "checksumvalue");

    public static final class Field {
        public final String path;
        public final String key;
        public final String role;
        public final boolean lockOff;
        public final String literal;
        final int start;
        final int end;
        String replacement;
        public int confidence;
        public String warning;
        public String valueType;
        Blob blob;
        int binaryOffset = -1;

        Field(String path, String key, String role, boolean lockOff, String literal, int start, int end) {
            this.path = path;
            this.key = key;
            this.role = role;
            this.lockOff = lockOff;
            this.literal = literal;
            this.start = start;
            this.end = end;
        }

        public String shown() {
            return replacement != null ? replacement : literal;
        }

        public boolean changed() {
            return replacement != null && !replacement.equals(literal);
        }
    }

    static final class Blob {
        final int from;
        final int to;
        final String kind;
        final String decoded;
        final boolean jsonEscape;
        final boolean xmlEscape;

        Blob(int from, int to, String kind, String decoded, boolean jsonEscape, boolean xmlEscape) {
            this.from = from;
            this.to = to;
            this.kind = kind;
            this.decoded = decoded;
            this.jsonEscape = jsonEscape;
            this.xmlEscape = xmlEscape;
        }
    }

    public static final class Doc {
        public final String format;
        public final String original;
        public final List<Field> fields;
        public final List<Blob> blobs;
        public final String warning;
        public final boolean writable;
        public final boolean encrypted;
        public final byte[] originalBytes;

        Doc(String format, String original, List<Field> fields) {
            this(format, original, fields, new ArrayList<Blob>(), null, true, false, null);
        }

        Doc(String format, String original, List<Field> fields, List<Blob> blobs,
            String warning, boolean writable, boolean encrypted, byte[] originalBytes) {
            this.format = format;
            this.original = original;
            this.fields = fields;
            this.blobs = blobs != null ? blobs : new ArrayList<Blob>();
            this.warning = warning;
            this.writable = writable;
            this.encrypted = encrypted;
            this.originalBytes = originalBytes;
        }

        public String render() {
            StringBuilder out = new StringBuilder(original == null ? "" : original);
            List<int[]> spans = new ArrayList<int[]>();
            List<String> texts = new ArrayList<String>();
            if (blobs != null) {
                for (Blob blob : blobs) {
                    spans.add(new int[]{blob.from, blob.to});
                    texts.add(renderBlob(blob, fields));
                }
            }
            for (Field field : fields) {
                if (field.blob != null || !field.changed()) continue;
                spans.add(new int[]{field.start, field.end});
                texts.add(field.replacement);
            }
            List<Integer> order = new ArrayList<Integer>();
            for (int i = 0; i < spans.size(); i++) order.add(i);
            order.sort((a, b) -> Integer.compare(spans.get(b)[0], spans.get(a)[0]));
            for (int i : order) {
                int[] span = spans.get(i);
                if (span[0] < 0 || span[1] > out.length() || span[0] > span[1]) continue;
                out.replace(span[0], span[1], texts.get(i));
            }
            return out.toString();
        }

        public byte[] renderBytes() {
            if (originalBytes != null && "binary".equals(format)) {
                byte[] next = new byte[originalBytes.length];
                System.arraycopy(originalBytes, 0, next, 0, originalBytes.length);
                for (Field field : fields) {
                    if (!field.changed() || field.binaryOffset < 0) continue;
                    long value;
                    try {
                        value = Long.parseLong(field.replacement.trim());
                    } catch (NumberFormatException e) {
                        continue;
                    }
                    if (value > SAFE_MONEY) value = SAFE_MONEY;
                    if (value < 0) value = 0;
                    if (field.binaryOffset + 4 <= next.length) {
                        int v = (int) value;
                        next[field.binaryOffset] = (byte) (v & 0xff);
                        next[field.binaryOffset + 1] = (byte) ((v >> 8) & 0xff);
                        next[field.binaryOffset + 2] = (byte) ((v >> 16) & 0xff);
                        next[field.binaryOffset + 3] = (byte) ((v >> 24) & 0xff);
                    }
                }
                return next;
            }
            return render().getBytes(StandardCharsets.UTF_8);
        }
    }

    private SaveText() {}

    public static boolean looksBinary(byte[] bytes) {
        int n = Math.min(bytes.length, 8000);
        for (int i = 0; i < n; i++) {
            if (bytes[i] == 0) return true;
        }
        return false;
    }

    public static Doc parse(String text) {
        if (text == null) return null;
        String trimmed = stripBom(text).trim();
        if (trimmed.matches("-?\\d+")) {
            int start = text.indexOf(trimmed);
            List<Field> fields = new ArrayList<Field>();
            fields.add(makeField("coin", "coin", "", trimmed, start, start + trimmed.length()));
            applyWarnings(fields);
            return new Doc("number", text, fields);
        }
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            List<Field> fields = new ArrayList<Field>();
            List<Blob> blobs = new ArrayList<Blob>();
            Parser parser = new Parser(text, fields, blobs);
            if (parser.parse()) {
                applyWarnings(fields);
                return new Doc("json", text, fields, blobs, null, true, false, null);
            }
        }
        if (trimmed.contains("<map") || trimmed.contains("<int ") || trimmed.contains("<boolean ")
                || trimmed.contains("<unity_prefs") || trimmed.contains("<pref ")) {
            List<Blob> blobs = new ArrayList<Blob>();
            List<Field> fields = parsePrefs(text, blobs);
            if (!fields.isEmpty()) {
                applyWarnings(fields);
                return new Doc("xml", text, fields, blobs, checksumDocWarning(fields), true, false, null);
            }
        }
        List<Field> pairs = parsePairs(text);
        if (!pairs.isEmpty()) {
            applyWarnings(pairs);
            return new Doc("pairs", text, pairs);
        }
        return null;
    }

    public static boolean analytics(String name, String text) {
        String lower = name == null ? "" : name.toLowerCase(Locale.US);
        if (lower.contains("session_data") || lower.contains("firebase") || lower.contains("crashlytics")
                || lower.contains("appsflyer") || lower.contains("analytics") || lower.contains("adjust")) {
            return true;
        }
        if (text != null && text.contains("gaSessionId") && interest(parse(text)) == 0) return true;
        return false;
    }

    public static int interest(Doc doc) {
        if (doc == null) return 0;
        int score = 0;
        for (Field field : doc.fields) {
            if ("money".equals(field.role)) score += 20 + field.confidence / 2;
            else if ("unlock".equals(field.role)) score += 15;
            else if ("upgrade".equals(field.role)) score += 15;
        }
        return score;
    }

    public static boolean setNumber(Field field, String typed) {
        String cleaned = typed.trim().replace(",", "");
        if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
        Double value = asNumber(cleaned);
        if (value == null) return false;
        if (!"long".equals(field.valueType) && value > SAFE_MONEY) {
            cleaned = Long.toString(SAFE_MONEY);
        }
        field.replacement = cleaned;
        return true;
    }

    public static int stamp(Doc doc, long money, int level) {
        int n = 0;
        for (Field field : doc.fields) {
            String next = suggest(field, money, level);
            if (next == null || next.equals(field.literal)) continue;
            field.replacement = next;
            n++;
        }
        return n;
    }

    private static String suggest(Field field, long money, int level) {
        if ("money".equals(field.role)) {
            Double current = asNumber(field.literal);
            if (current == null) return null;
            long cap = "long".equals(field.valueType) ? 1_000_000_000_000L : SAFE_MONEY;
            long wanted = Math.min(money, cap);
            if (current >= wanted) return null;
            if (field.literal.contains(".")) return Long.toString(wanted) + ".0";
            return Long.toString(wanted);
        }
        if ("unlock".equals(field.role)) {
            if ("true".equals(field.literal) || "false".equals(field.literal)) {
                return field.lockOff ? "false" : "true";
            }
            if ("0".equals(field.literal) || "1".equals(field.literal)) {
                return field.lockOff ? "0" : "1";
            }
        }
        if ("upgrade".equals(field.role)) {
            Double value = asNumber(field.literal);
            if (value == null || value != Math.rint(value) || value >= level || value < 0) return null;
            return Integer.toString(level);
        }
        return null;
    }

    static String roleOf(String key, String parent, String literal) {
        return classify(key, parent, literal).role;
    }

    static boolean lockOff(String key) {
        return contains(tokens(key), UNLOCK_OFF);
    }

    static final class Classified {
        final String role;
        final boolean lockOff;
        final int confidence;

        Classified(String role, boolean lockOff, int confidence) {
            this.role = role;
            this.lockOff = lockOff;
            this.confidence = confidence;
        }
    }

    static Classified classify(String key, String parent, String literal) {
        List<String> tokenList = tokens(key);
        List<String> parentTokens = tokens(parent);
        boolean rejected = contains(tokenList, REJECT);
        boolean numeric = asNumber(literal) != null;
        if (numeric && !rejected) {
            Double value = asNumber(literal);
            int money = moneyConfidence(tokenList, parentTokens, value == null ? 0 : value);
            if (money > 0) return new Classified("money", false, money);
        }
        if (contains(tokenList, UNLOCK_ON)) return new Classified("unlock", false, 90);
        if (contains(tokenList, UNLOCK_OFF)) return new Classified("unlock", true, 90);
        Double value = asNumber(literal);
        if (value != null && value == Math.rint(value) && value >= 0 && value <= 100000
                && (contains(tokenList, UPGRADE) || tokenList.contains("stars"))) {
            return new Classified("upgrade", false, 85);
        }
        return new Classified("other", false, 0);
    }

    static int moneyConfidence(List<String> tokenList, List<String> parent, double value) {
        List<String> coreInKey = new ArrayList<String>();
        List<String> softInKey = new ArrayList<String>();
        for (String token : tokenList) {
            if (MONEY_CORE.contains(token)) coreInKey.add(token);
            if (MONEY_SOFT.contains(token)) softInKey.add(token);
        }
        boolean amountInKey = contains(tokenList, AMOUNT);
        boolean parentMoney = contains(parent, MONEY_PARENT) || contains(parent, MONEY_SOFT) || contains(parent, MONEY_CORE);
        boolean prefix = tokenList.contains("sc") || tokenList.contains("hc") || tokenList.contains("cur");
        if (softInKey.contains("star") && !softInKey.contains("stars") && coreInKey.isEmpty()
                && !amountInKey && !parentMoney && !prefix) {
            return 0;
        }
        if (tokenList.size() == 1 && "stars".equals(tokenList.get(0)) && value <= 10 && !parentMoney) {
            return 0;
        }
        if (!coreInKey.isEmpty()) {
            if (tokenList.size() == 1) return 95;
            if (tokenList.size() == 2 && (amountInKey || prefix || contains(tokenList, QUALIFIER))) return 92;
            return 88;
        }
        if (amountInKey && parentMoney) return 85;
        if (prefix && (amountInKey || !softInKey.isEmpty())) return 80;
        if (!softInKey.isEmpty()) {
            if (amountInKey || prefix || parentMoney) return 75;
            if (tokenList.size() == 1) return 70;
            return 62;
        }
        return 0;
    }

    static Field makeField(String path, String key, String parent, String literal, int start, int end) {
        Classified found = classify(key, parent, literal);
        Field field = new Field(path, key, found.role, found.lockOff, literal, start, end);
        field.confidence = found.confidence;
        return field;
    }

    public static String confidenceLabel(int confidence) {
        if (confidence >= 85) return "High · " + confidence + "%";
        if (confidence >= 65) return "Medium · " + confidence + "%";
        return "Low · " + confidence + "%";
    }

    private static void applyWarnings(List<Field> fields) {
        Map<String, List<String>> siblings = new LinkedHashMap<String, List<String>>();
        for (Field field : fields) {
            String parent = parentPath(field.path);
            List<String> list = siblings.get(parent);
            if (list == null) {
                list = new ArrayList<String>();
                siblings.put(parent, list);
            }
            list.add(field.key);
        }
        for (Field field : fields) {
            if (field.warning != null) continue;
            String parent = parentPath(field.path);
            field.warning = checksumWarning(field.key, siblings.get(parent));
        }
    }

    private static String checksumDocWarning(List<Field> fields) {
        for (Field field : fields) {
            if (field.warning != null) return field.warning;
        }
        return null;
    }

    private static String parentPath(String path) {
        int d = path.lastIndexOf('.');
        int b = path.lastIndexOf('[');
        int at = Math.max(d, b);
        return at < 0 ? "" : path.substring(0, at);
    }

    private static String checksumWarning(String key, List<String> siblings) {
        if (siblings == null) return null;
        String lower = key.toLowerCase(Locale.US);
        for (String sibling : siblings) {
            if (sibling.equals(key)) continue;
            String sl = sibling.toLowerCase(Locale.US);
            if (CHECKSUM_NAME.contains(sl)) return CHECKSUM_WARNING;
            if (sl.equals(lower + "hash") || sl.equals(lower + "_hash") || sl.equals("hash_" + lower)
                    || sl.equals(lower + "checksum") || sl.equals(lower + "_checksum")
                    || sl.equals("checksum_" + lower) || sl.equals(lower + "crc")
                    || sl.equals(lower + "_crc") || sl.equals(lower + "sig") || sl.equals(lower + "_sig")) {
                return CHECKSUM_WARNING;
            }
        }
        return null;
    }

    private static List<Field> parsePrefs(String text, List<Blob> blobs) {
        List<Field> fields = new ArrayList<Field>();
        int i = 0;
        while (i < text.length()) {
            int open = text.indexOf('<', i);
            if (open < 0) break;
            int close = text.indexOf('>', open);
            if (close < 0) break;
            String tag = text.substring(open + 1, close);
            i = close + 1;
            if (tag.startsWith("/") || tag.startsWith("?") || tag.startsWith("!")) continue;
            String kind = tag.split("\\s+")[0];
            boolean unity = kind.equals("pref");
            if (!kind.equals("int") && !kind.equals("long") && !kind.equals("float")
                    && !kind.equals("double") && !kind.equals("boolean") && !kind.equals("string")
                    && !unity) continue;
            if (kind.equals("string") || unity) {
                String name = attr(tag, "name");
                String closeTag = unity ? "</pref>" : "</string>";
                int contentEnd = text.indexOf(closeTag, close + 1);
                if (name == null || contentEnd < 0) continue;
                int from = close + 1;
                while (from < contentEnd && Character.isWhitespace(text.charAt(from))) from++;
                int to = contentEnd;
                while (to > from && Character.isWhitespace(text.charAt(to - 1))) to--;
                String raw = text.substring(from, to);
                String value = unescapeXml(raw);
                Decoded decoded = tryDecode(value);
                if (decoded != null) {
                    Doc inner = SaveText.parse(decoded.text);
                    if (inner != null && !inner.fields.isEmpty()) {
                        Blob blob = new Blob(from, to, decoded.kind, decoded.text, false, !raw.equals(value));
                        blobs.add(blob);
                        for (Field field : inner.fields) {
                            Field child = makeField(name + "." + field.path, field.key, lastKey(name),
                                    field.literal, field.start, field.end);
                            child.blob = blob;
                            child.confidence = field.confidence;
                            child.warning = field.warning;
                            child.valueType = field.valueType;
                            fields.add(child);
                        }
                        i = contentEnd + closeTag.length();
                        continue;
                    }
                }
                if (asNumber(value) == null && !(unity && asNumber(value) != null)) {
                    if (!unity || asNumber(value) == null) {
                        if (unity) {
                            String type = attr(tag, "type");
                            if (type != null && (type.equalsIgnoreCase("int") || type.equalsIgnoreCase("long")
                                    || type.equalsIgnoreCase("float") || type.equalsIgnoreCase("double")
                                    || type.equalsIgnoreCase("bool") || type.equalsIgnoreCase("boolean"))) {
                                // number/bool handled below if asNumber works
                            } else {
                                i = contentEnd + closeTag.length();
                                continue;
                            }
                        } else {
                            i = contentEnd + closeTag.length();
                            continue;
                        }
                    }
                }
                if (asNumber(value) == null && !"true".equals(value) && !"false".equals(value)) {
                    i = contentEnd + closeTag.length();
                    continue;
                }
                Field field = makeField(name, name, "", value, from, to);
                if (unity) {
                    String type = attr(tag, "type");
                    field.valueType = type == null ? "string" : type.toLowerCase(Locale.US);
                    if ("integer".equals(field.valueType) || "int".equals(field.valueType)) field.valueType = "int";
                    if ("bool".equals(field.valueType)) field.valueType = "boolean";
                    if ("double".equals(field.valueType)) field.valueType = "float";
                } else {
                    field.valueType = "string";
                }
                fields.add(field);
                i = contentEnd + closeTag.length();
                continue;
            }
            String name = attr(tag, "name");
            String value = attr(tag, "value");
            if (name == null || value == null) continue;
            int valueKey = tag.indexOf("value=");
            if (valueKey < 0) continue;
            int quote = open + 1 + valueKey + "value=".length();
            if (quote >= text.length()) continue;
            char q = text.charAt(quote);
            if (q != '"' && q != '\'') continue;
            int start = quote + 1;
            int end = text.indexOf(q, start);
            if (end < 0 || !text.substring(start, end).equals(value)) continue;
            Field field = makeField(name, name, "", value, start, end);
            field.valueType = kind.equals("double") ? "float" : kind;
            fields.add(field);
        }
        return fields;
    }

    private static List<Field> parsePairs(String text) {
        List<Field> fields = new ArrayList<Field>();
        int lineStart = 0;
        int rows = 0;
        int hits = 0;
        for (int i = 0; i <= text.length(); i++) {
            if (i != text.length() && text.charAt(i) != '\n') continue;
            int end = i;
            if (end > lineStart && text.charAt(end - 1) == '\r') end--;
            String line = text.substring(lineStart, end);
            String trimmed = line.trim();
            rows++;
            if (!trimmed.isEmpty() && !trimmed.startsWith("#") && !trimmed.startsWith("//")) {
                int eq = line.indexOf('=');
                if (eq < 0) eq = line.indexOf(':');
                if (eq > 0) {
                    String key = line.substring(0, eq).trim();
                    int valueStart = lineStart + eq + 1;
                    int valueEnd = end;
                    String literal = text.substring(valueStart, valueEnd).trim();
                    if (!key.isEmpty() && literal.length() < 64 && (asNumber(literal) != null
                            || "true".equals(literal) || "false".equals(literal))) {
                        int from = valueStart;
                        while (from < valueEnd && text.charAt(from) == ' ') from++;
                        int to = from + literal.length();
                        fields.add(makeField(key, key, "", literal, from, to));
                        hits++;
                    }
                }
            }
            lineStart = i + 1;
        }
        if (rows == 0 || hits * 2 < Math.max(1, rows / 2)) return new ArrayList<Field>();
        return fields;
    }

    private static String attr(String tag, String name) {
        int at = tag.indexOf(name + "=");
        if (at < 0) return null;
        int q = at + name.length() + 1;
        if (q >= tag.length()) return null;
        char quote = tag.charAt(q);
        if (quote != '"' && quote != '\'') return null;
        int end = tag.indexOf(quote, q + 1);
        if (end < 0) return null;
        return tag.substring(q + 1, end);
    }

    private static String unescapeXml(String value) {
        return value.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
                .replace("&quot;", "\"").replace("&apos;", "'");
    }

    private static String escapeXml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private static String jsonEscape(String value) {
        StringBuilder out = new StringBuilder(value.length() + 8);
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c == '\\' || c == '"') out.append('\\').append(c);
            else if (c == '\n') out.append("\\n");
            else if (c == '\r') out.append("\\r");
            else if (c == '\t') out.append("\\t");
            else out.append(c);
        }
        return out.toString();
    }

    static final class Decoded {
        final String kind;
        final String text;

        Decoded(String kind, String text) {
            this.kind = kind;
            this.text = text;
        }
    }

    static Decoded tryDecode(String raw) {
        if (raw == null) return null;
        String text = raw.trim();
        if (text.length() < 2) return null;
        if (looksLikeJson(text)) return new Decoded("json-string", text);
        if (text.contains("%") && (text.toLowerCase(Locale.US).contains("%7b")
                || text.toLowerCase(Locale.US).contains("%5b")
                || text.toLowerCase(Locale.US).contains("%22"))) {
            try {
                String decoded = URLDecoder.decode(text, "UTF-8");
                if (looksLikeJson(decoded)) return new Decoded("url", decoded.trim());
            } catch (Exception ignored) {
                /* not url */
            }
        }
        if (looksBase64(text)) {
            try {
                byte[] bytes = Base64.getDecoder().decode(padB64(text));
                String utf8 = new String(bytes, StandardCharsets.UTF_8).trim();
                if (looksLikeJson(utf8)) return new Decoded("base64", utf8);
                if (bytes.length >= 2 && bytes.length % 2 == 0) {
                    String utf16 = new String(bytes, StandardCharsets.UTF_16LE).trim();
                    if (looksLikeJson(utf16)) return new Decoded("base64", utf16);
                }
            } catch (IllegalArgumentException ignored) {
                /* not base64 */
            }
        }
        return null;
    }

    private static boolean looksLikeJson(String text) {
        String t = text == null ? "" : text.trim();
        if (!(t.startsWith("{") && t.endsWith("}") || t.startsWith("[") && t.endsWith("]"))) return false;
        Doc doc = null;
        try {
            List<Field> fields = new ArrayList<Field>();
            Parser parser = new Parser(t, fields, new ArrayList<Blob>());
            return parser.parse();
        } catch (Exception e) {
            return false;
        }
    }

    private static boolean looksBase64(String value) {
        if (value.length() < 8 || value.length() > 2_000_000 || value.length() % 4 != 0) return false;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            boolean ok = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')
                    || c == '+' || c == '/' || c == '=';
            if (!ok) return false;
        }
        return true;
    }

    private static String padB64(String value) {
        int pad = (4 - (value.length() % 4)) % 4;
        if (pad == 0) return value;
        StringBuilder out = new StringBuilder(value);
        for (int i = 0; i < pad; i++) out.append('=');
        return out.toString();
    }

    private static String renderBlob(Blob blob, List<Field> fields) {
        StringBuilder out = new StringBuilder(blob.decoded);
        List<Field> mine = new ArrayList<Field>();
        for (Field field : fields) {
            if (field.blob == blob && field.changed()) mine.add(field);
        }
        mine.sort((a, b) -> Integer.compare(b.start, a.start));
        for (Field field : mine) {
            if (field.start < 0 || field.end > out.length()) continue;
            out.replace(field.start, field.end, field.replacement);
        }
        String inner = out.toString();
        if ("base64".equals(blob.kind)) {
            inner = Base64.getEncoder().encodeToString(inner.getBytes(StandardCharsets.UTF_8));
        } else if ("url".equals(blob.kind)) {
            try {
                inner = URLEncoder.encode(inner, "UTF-8").replace("+", "%20");
            } catch (Exception e) {
                /* keep inner */
            }
        }
        if (blob.jsonEscape) inner = jsonEscape(inner);
        if (blob.xmlEscape) inner = escapeXml(inner);
        return inner;
    }

    private static final class Parser {
        final String text;
        final List<Field> fields;
        final List<Blob> blobs;
        int i;
        boolean ok = true;

        Parser(String text, List<Field> fields, List<Blob> blobs) {
            this.text = text;
            this.fields = fields;
            this.blobs = blobs;
            int start = 0;
            if (text.startsWith("\uFEFF")) start = 1;
            while (start < text.length() && Character.isWhitespace(text.charAt(start))) start++;
            this.i = start;
        }

        boolean parse() {
            value("", "", "");
            skip();
            return ok && i >= text.length();
        }

        void value(String path, String key, String parent) {
            if (!ok) return;
            skip();
            if (i >= text.length()) {
                ok = false;
                return;
            }
            char c = text.charAt(i);
            if (c == '{') object(path);
            else if (c == '[') array(path, key);
            else if (c == '"') quoted(path, key, parent);
            else if (c == 't' || c == 'f') bool(path, key, parent);
            else if (c == 'n') nul();
            else if (c == '-' || (c >= '0' && c <= '9')) number(path, key, parent);
            else ok = false;
        }

        void object(String path) {
            i++;
            skip();
            List<String> keys = new ArrayList<String>();
            if (eat('}')) {
                markSiblings(path, keys);
                return;
            }
            while (ok) {
                skip();
                if (i >= text.length() || text.charAt(i) != '"') {
                    ok = false;
                    return;
                }
                String key = string();
                if (!ok) return;
                keys.add(key);
                skip();
                if (!eat(':')) {
                    ok = false;
                    return;
                }
                String child = path.isEmpty() ? key : path + "." + key;
                value(child, key, lastKey(path));
                skip();
                if (eat('}')) {
                    markSiblings(path, keys);
                    return;
                }
                if (!eat(',')) {
                    ok = false;
                    return;
                }
            }
        }

        void markSiblings(String path, List<String> keys) {
            for (Field field : fields) {
                if (field.warning != null) continue;
                if (!parentPath(field.path).equals(path)) continue;
                field.warning = checksumWarning(field.key, keys);
            }
        }

        void array(String path, String parentKey) {
            i++;
            skip();
            if (eat(']')) return;
            int index = 0;
            while (ok) {
                String child = path + "[" + index + "]";
                value(child, Integer.toString(index), parentKey);
                skip();
                if (eat(']')) return;
                if (!eat(',')) {
                    ok = false;
                    return;
                }
                index++;
            }
        }

        void quoted(String path, String key, String parent) {
            int open = i;
            String raw = string();
            if (!ok) return;
            int from = open + 1;
            int to = i - 1;
            if (!path.isEmpty() && raw.length() <= 24 && asNumber(raw) != null) {
                if (to >= from && text.substring(from, to).equals(raw)) {
                    add(path, key, parent, raw, from, to);
                }
                return;
            }
            Decoded decoded = tryDecode(raw);
            if (decoded != null && blobs != null) {
                Doc inner = SaveText.parse(decoded.text);
                if (inner != null && !inner.fields.isEmpty()) {
                    Blob blob = new Blob(from, to, decoded.kind, decoded.text, true, false);
                    blobs.add(blob);
                    for (Field field : inner.fields) {
                        String childPath = path.isEmpty() ? field.path : path + "." + field.path;
                        Field child = makeField(childPath, field.key, key, field.literal, field.start, field.end);
                        child.blob = blob;
                        child.confidence = field.confidence;
                        child.warning = field.warning;
                        fields.add(child);
                    }
                }
            }
        }

        String string() {
            if (i >= text.length() || text.charAt(i) != '"') {
                ok = false;
                return "";
            }
            i++;
            StringBuilder raw = new StringBuilder();
            while (i < text.length()) {
                char c = text.charAt(i++);
                if (c == '"') return raw.toString();
                if (c == '\\' && i < text.length()) {
                    char n = text.charAt(i++);
                    if (n == 'u' && i + 4 <= text.length()) i += 4;
                    raw.append(n);
                } else raw.append(c);
            }
            ok = false;
            return "";
        }

        void bool(String path, String key, String parent) {
            int start = i;
            String word = text.startsWith("true", i) ? "true" : text.startsWith("false", i) ? "false" : null;
            if (word == null) {
                ok = false;
                return;
            }
            i += word.length();
            add(path, key, parent, word, start, i);
        }

        void number(String path, String key, String parent) {
            int start = i;
            if (text.charAt(i) == '-') i++;
            if (i >= text.length() || !Character.isDigit(text.charAt(i))) {
                ok = false;
                return;
            }
            while (i < text.length() && Character.isDigit(text.charAt(i))) i++;
            if (i < text.length() && text.charAt(i) == '.') {
                i++;
                while (i < text.length() && Character.isDigit(text.charAt(i))) i++;
            }
            if (i < text.length() && (text.charAt(i) == 'e' || text.charAt(i) == 'E')) {
                i++;
                if (i < text.length() && (text.charAt(i) == '+' || text.charAt(i) == '-')) i++;
                while (i < text.length() && Character.isDigit(text.charAt(i))) i++;
            }
            String literal = text.substring(start, i);
            add(path, key, parent, literal, start, i);
        }

        void nul() {
            if (!text.startsWith("null", i)) {
                ok = false;
                return;
            }
            i += 4;
        }

        void add(String path, String key, String parent, String literal, int start, int end) {
            if (path.isEmpty()) return;
            fields.add(makeField(path, key, parent, literal, start, end));
        }

        boolean eat(char c) {
            skip();
            if (i < text.length() && text.charAt(i) == c) {
                i++;
                return true;
            }
            return false;
        }

        void skip() {
            while (i < text.length() && Character.isWhitespace(text.charAt(i))) i++;
        }
    }

    private static String lastKey(String path) {
        if (path.isEmpty()) return "";
        int dot = path.lastIndexOf('.');
        String tail = dot < 0 ? path : path.substring(dot + 1);
        int bracket = tail.indexOf('[');
        return bracket < 0 ? tail : tail.substring(0, bracket);
    }

    static List<String> tokens(String key) {
        String spaced = key.replaceAll("([a-z0-9])([A-Z])", "$1 $2")
                .replaceAll("([A-Z]+)([A-Z][a-z])", "$1 $2");
        String[] parts = spaced.split("[^A-Za-z0-9]+");
        List<String> out = new ArrayList<String>();
        for (String part : parts) {
            if (!part.isEmpty()) out.add(part.toLowerCase(Locale.US));
        }
        return out;
    }

    private static boolean contains(List<String> tokenList, Set<String> words) {
        for (String token : tokenList) if (words.contains(token)) return true;
        return false;
    }

    private static Double asNumber(String literal) {
        try {
            if (literal == null || "true".equals(literal) || "false".equals(literal)) return null;
            return Double.valueOf(literal);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String stripBom(String text) {
        return text.startsWith("\uFEFF") ? text.substring(1) : text;
    }

    private static Set<String> set(String... words) {
        Set<String> out = new HashSet<String>();
        for (String word : words) out.add(word);
        return out;
    }

    public static boolean isSqlite(byte[] bytes) {
        if (bytes == null || bytes.length < 16) return false;
        String head = new String(bytes, 0, 15, StandardCharsets.UTF_8);
        return "SQLite format 3".equals(head);
    }

    public static double shannonEntropy(byte[] bytes) {
        int n = Math.min(bytes.length, 4096);
        if (n == 0) return 0;
        int[] freq = new int[256];
        for (int i = 0; i < n; i++) freq[bytes[i] & 0xff]++;
        double entropy = 0;
        for (int count : freq) {
            if (count == 0) continue;
            double p = (double) count / n;
            entropy -= p * (Math.log(p) / Math.log(2));
        }
        return entropy;
    }

    public static boolean looksEncrypted(byte[] bytes) {
        if (bytes == null || bytes.length < 32) return false;
        if (isSqlite(bytes)) return false;
        String head = new String(bytes, 0, Math.min(16, bytes.length), StandardCharsets.ISO_8859_1);
        if (head.startsWith("{") || head.startsWith("[") || head.startsWith("<")
                || head.startsWith("PK") || head.startsWith("UnityFS") || head.startsWith("SQLite")) {
            return false;
        }
        return shannonEntropy(bytes) >= 7.5;
    }

    private static int indexOf(byte[] haystack, byte[] needle, int from) {
        if (needle.length == 0 || needle.length > haystack.length) return -1;
        outer:
        for (int i = from; i <= haystack.length - needle.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) continue outer;
            }
            return i;
        }
        return -1;
    }

    private static boolean isLetterOrDigit(byte b) {
        int c = b & 0xff;
        return (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
    }

    private static byte[] utf8(String word) {
        return word.getBytes(StandardCharsets.UTF_8);
    }

    private static byte[] utf16le(String word) {
        byte[] out = new byte[word.length() * 2];
        for (int i = 0; i < word.length(); i++) {
            int c = word.charAt(i);
            out[i * 2] = (byte) (c & 0xff);
            out[i * 2 + 1] = (byte) (c >> 8);
        }
        return out;
    }

    private static int readInt32LE(byte[] bytes, int offset) {
        if (offset < 0 || offset + 4 > bytes.length) return Integer.MIN_VALUE;
        return (bytes[offset] & 0xff)
                | ((bytes[offset + 1] & 0xff) << 8)
                | ((bytes[offset + 2] & 0xff) << 16)
                | ((bytes[offset + 3] & 0xff) << 24);
    }

    public static List<Field> scanBinary(byte[] bytes) {
        List<Field> hits = new ArrayList<Field>();
        Set<Integer> seen = new HashSet<Integer>();
        Set<String> words = new HashSet<String>(MONEY_CORE);
        for (String word : MONEY_SOFT) if (word.length() >= 3) words.add(word);
        for (String word : words) {
            byte[][] needles = new byte[][]{
                    utf8(word), utf16le(word),
                    utf8(word.substring(0, 1).toUpperCase(Locale.US) + word.substring(1)),
                    utf16le(word.substring(0, 1).toUpperCase(Locale.US) + word.substring(1)),
                    utf8(word.toUpperCase(Locale.US))
            };
            int[] strides = new int[]{1, 2, 1, 2, 1};
            for (int n = 0; n < needles.length; n++) {
                byte[] needle = needles[n];
                int stride = strides[n];
                int from = 0;
                while (from < bytes.length) {
                    int at = indexOf(bytes, needle, from);
                    if (at < 0) break;
                    from = at + 1;
                    if (stride == 1) {
                        if (at > 0 && isLetterOrDigit(bytes[at - 1])) continue;
                        if (at + needle.length < bytes.length && isLetterOrDigit(bytes[at + needle.length])) continue;
                    }
                    int end = at + needle.length;
                    int after = end;
                    if (after < bytes.length && bytes[after] == 0) after += stride;
                    int[] offsets = new int[]{after, (after + 3) & ~3, after + 4, after + 8};
                    for (int off : offsets) {
                        if (seen.contains(off)) continue;
                        int le = readInt32LE(bytes, off);
                        if (le < 0 || le > 1_000_000_000) continue;
                        if (le > 0 && le == bytes.length - off - 4 && le > 4096) continue;
                        seen.add(off);
                        String path = word;
                        for (Field hit : hits) {
                            if (hit.key.equals(word)) {
                                path = word + "@" + off;
                                break;
                            }
                        }
                        Field field = makeField(path, word, "", Integer.toString(le), 0, 0);
                        field.binaryOffset = off;
                        field.valueType = "int";
                        hits.add(field);
                        break;
                    }
                }
            }
        }
        return hits;
    }

    private static String decodeBest(byte[] bytes) {
        if (bytes.length >= 2 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xfe) {
            return new String(bytes, 2, bytes.length - 2, StandardCharsets.UTF_16LE);
        }
        if (looksUtf16le(bytes)) return new String(bytes, StandardCharsets.UTF_16LE);
        return new String(bytes, StandardCharsets.UTF_8);
    }

    private static boolean looksUtf16le(byte[] bytes) {
        if (bytes.length < 8) return false;
        int n = Math.min(bytes.length, 400);
        int zeros = 0;
        for (int i = 1; i < n; i += 2) if (bytes[i] == 0) zeros++;
        return zeros / (double) Math.max(1, n / 2) > 0.7;
    }

    private static boolean mostlyText(String text) {
        if (text == null || text.isEmpty()) return false;
        int n = Math.min(text.length(), 4000);
        int bad = 0;
        for (int i = 0; i < n; i++) {
            char c = text.charAt(i);
            if (c == 0 || (c < 9) || (c > 13 && c < 32 && c != 10 && c != 9)) bad++;
        }
        return bad / (double) n < 0.05;
    }

    public static Doc parseBytes(byte[] bytes) {
        if (bytes == null) return null;
        if (isSqlite(bytes)) {
            String warning = "This looks like a SQLite or Cocos local-storage file. Currency keys are listed when they can be read, but Savepress won't rewrite the database.";
            List<Field> fields = extractSqlite(bytes);
            applyWarnings(fields);
            return new Doc("binary", "", fields, new ArrayList<Blob>(), warning, false, false, bytes);
        }
        boolean encrypted = looksEncrypted(bytes);
        if (!encrypted) {
            String asText = decodeBest(bytes);
            if (mostlyText(asText)) {
                Doc doc = parse(asText);
                if (doc != null) {
                    return new Doc(doc.format, asText, doc.fields, doc.blobs, doc.warning, true, false, bytes);
                }
            }
        }
        List<Field> hits = scanBinary(bytes);
        if (encrypted && hits.isEmpty()) {
            return new Doc("binary", "", new ArrayList<Field>(), new ArrayList<Blob>(),
                    "This save looks encrypted. Savepress won't change it, so the file stays intact.",
                    false, true, bytes);
        }
        if (!hits.isEmpty()) {
            applyWarnings(hits);
            return new Doc("binary", "", hits, new ArrayList<Blob>(),
                    "Amounts were found next to currency names in this binary file. A backup is kept when you save. Check the values before putting the file back.",
                    true, false, bytes);
        }
        return new Doc("binary", "", new ArrayList<Field>(), new ArrayList<Blob>(),
                encrypted
                        ? "This save looks encrypted. Savepress won't change it, so the file stays intact."
                        : "This save is in an unknown binary format. Savepress won't change it, so the file stays intact.",
                false, encrypted, bytes);
    }

    private static List<Field> extractSqlite(byte[] bytes) {
        List<Field> fields = new ArrayList<Field>();
        String text = new String(bytes, StandardCharsets.ISO_8859_1);
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("[A-Za-z_][A-Za-z0-9_.]{1,40}|-?\\d{1,15}(?:\\.\\d+)?").matcher(text);
        List<String> runs = new ArrayList<String>();
        while (matcher.find()) runs.add(matcher.group());
        for (int i = 0; i < runs.size(); i++) {
            String run = runs.get(i);
            if (run.length() > 0 && (run.charAt(0) == '-' || Character.isDigit(run.charAt(0)))) continue;
            int conf = moneyConfidence(tokens(run), new ArrayList<String>(), 1);
            if (conf == 0) continue;
            for (int j = i + 1; j < Math.min(i + 6, runs.size()); j++) {
                String next = runs.get(j);
                if (!next.matches("-?\\d+(\\.\\d+)?")) continue;
                Double num = asNumber(next);
                if (num == null || num < 0 || num > 1e14) continue;
                String path = run;
                for (Field existing : fields) {
                    if (existing.key.equals(run)) {
                        path = run + "_" + i;
                        break;
                    }
                }
                Field field = makeField(path, run, "", next, 0, 0);
                fields.add(field);
                break;
            }
        }
        return fields;
    }
}
