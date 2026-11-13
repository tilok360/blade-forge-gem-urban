package com.savepress.launcher;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Reads JSON, Android preference XML, and key=value saves without rewriting the rest of the file. */
public final class SaveText {
    private static final Set<String> MONEY = set(
            "gold", "coin", "coins", "money", "cash", "gem", "gems", "credit", "credits",
            "diamond", "diamonds", "token", "tokens", "silver", "buck", "bucks", "dollar",
            "dollars", "currency", "ruby", "rubies", "emerald", "emeralds", "soul", "souls",
            "oro", "dinero", "moneda", "monedas", "gema", "gemas", "argent", "gemme", "gemmes",
            "geld", "muenzen", "munzen", "balance", "funds", "currencies", "coinage", "chips",
            "wealth", "riches", "bankroll", "purse", "wallet", "treasury", "ore", "ores",
            "mineral", "minerals", "crystal", "crystals", "ingot", "ingots", "dollar", "key", "keys");
    private static final Set<String> MONEY_PARENT = set(
            "wallet", "purse", "bank", "currency", "currencies", "money", "cash", "coins", "coin",
            "gold", "gems", "gem", "credits", "credit", "treasury", "funds");
    private static final Set<String> AMOUNT = set("amount", "value", "count", "qty", "quantity", "bal", "balance");
    private static final Set<String> UNLOCK_ON = set(
            "unlocked", "owned", "purchased", "bought", "available", "opened", "complete", "completed");
    private static final Set<String> UNLOCK_OFF = set("locked", "sealed");
    private static final Set<String> UPGRADE = set("level", "lvl", "upgrade", "rank", "tier", "star", "stars", "skill", "power");

    public static final class Field {
        public final String path;
        public final String key;
        public final String role;
        public final boolean lockOff;
        public final String literal;
        final int start;
        final int end;

        String replacement;

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

    public static final class Doc {
        public final String format;
        public final String original;
        public final List<Field> fields;

        Doc(String format, String original, List<Field> fields) {
            this.format = format;
            this.original = original;
            this.fields = fields;
        }

        public String render() {
            StringBuilder out = new StringBuilder(original);
            List<Field> ordered = new ArrayList<Field>(fields);
            ordered.sort((a, b) -> Integer.compare(b.start, a.start));
            for (Field field : ordered) {
                if (!field.changed()) continue;
                out.replace(field.start, field.end, field.replacement);
            }
            return out.toString();
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
            fields.add(new Field("coin", "coin", "money", false, trimmed, start, start + trimmed.length()));
            return new Doc("number", text, fields);
        }
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            List<Field> fields = new ArrayList<Field>();
            Parser parser = new Parser(text, fields);
            if (parser.parse()) return new Doc("json", text, fields);
        }
        if (trimmed.contains("<map") || trimmed.contains("<int ") || trimmed.contains("<boolean ")) {
            List<Field> fields = parsePrefs(text);
            if (!fields.isEmpty()) return new Doc("xml", text, fields);
        }
        List<Field> pairs = parsePairs(text);
        if (!pairs.isEmpty()) return new Doc("pairs", text, pairs);
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
            if ("money".equals(field.role)) score += 40;
            else if ("unlock".equals(field.role)) score += 15;
            else if ("upgrade".equals(field.role)) score += 15;
        }
        return score;
    }

    public static boolean setNumber(Field field, String typed) {
        String cleaned = typed.trim().replace(",", "");
        if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
        if (asNumber(cleaned) == null) return false;
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
            if (asNumber(field.literal) == null) return null;
            return Long.toString(money);
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
        List<String> tokens = tokens(key);
        List<String> parentTokens = tokens(parent);
        boolean numeric = asNumber(literal) != null;
        boolean money = contains(tokens, MONEY)
                || (contains(tokens, AMOUNT) && contains(parentTokens, MONEY_PARENT));
        if (money && numeric) return "money";
        if (contains(tokens, UNLOCK_ON) || contains(tokens, UNLOCK_OFF)) return "unlock";
        Double value = asNumber(literal);
        if (value != null && value == Math.rint(value) && value >= 0 && value <= 100000 && contains(tokens, UPGRADE)) {
            return "upgrade";
        }
        return "other";
    }

    static boolean lockOff(String key) {
        return contains(tokens(key), UNLOCK_OFF);
    }

    private static List<Field> parsePrefs(String text) {
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
            if (!kind.equals("int") && !kind.equals("long") && !kind.equals("float")
                    && !kind.equals("double") && !kind.equals("boolean") && !kind.equals("string")) continue;
            if (kind.equals("string")) {
                String name = attr(tag, "name");
                int contentEnd = text.indexOf("</string>", close + 1);
                if (name == null || contentEnd < 0) continue;
                int from = close + 1;
                while (from < contentEnd && Character.isWhitespace(text.charAt(from))) from++;
                int to = contentEnd;
                while (to > from && Character.isWhitespace(text.charAt(to - 1))) to--;
                String value = text.substring(from, to);
                if (value.startsWith("{") || value.startsWith("[")) {
                    Doc inner = parse(value);
                    if (inner != null && !inner.fields.isEmpty()) {
                        for (Field field : inner.fields) {
                            fields.add(new Field(name + "." + field.path, field.key, field.role, field.lockOff,
                                    field.literal, from + field.start, from + field.end));
                        }
                        i = contentEnd + "</string>".length();
                        continue;
                    }
                }
                if (asNumber(value) == null) {
                    i = contentEnd + "</string>".length();
                    continue;
                }
                String role = roleOf(name, "", value);
                fields.add(new Field(name, name, role, lockOff(name), value, from, to));
                i = contentEnd + "</string>".length();
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
            String role = roleOf(name, "", value);
            fields.add(new Field(name, name, role, lockOff(name), value, start, end));
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
                        String role = roleOf(key, "", literal);
                        fields.add(new Field(key, key, role, lockOff(key), literal, from, to));
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

    private static final class Parser {
        final String text;
        final List<Field> fields;
        int i;
        boolean ok = true;

        Parser(String text, List<Field> fields) {
            this.text = text;
            this.fields = fields;
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
            if (eat('}')) return;
            while (ok) {
                skip();
                if (i >= text.length() || text.charAt(i) != '"') {
                    ok = false;
                    return;
                }
                String key = string();
                if (!ok) return;
                skip();
                if (!eat(':')) {
                    ok = false;
                    return;
                }
                String child = path.isEmpty() ? key : path + "." + key;
                value(child, key, lastKey(path));
                skip();
                if (eat('}')) return;
                if (!eat(',')) {
                    ok = false;
                    return;
                }
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
            if (!ok || path.isEmpty() || raw.length() > 24 || asNumber(raw) == null) return;
            int start = open + 1;
            int end = i - 1;
            if (end >= start && text.substring(start, end).equals(raw)) {
                add(path, key, parent, raw, start, end);
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
            String role = roleOf(key, parent, literal);
            fields.add(new Field(path, key, role, lockOff(key), literal, start, end));
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
        String spaced = key.replaceAll("([a-z0-9])([A-Z])", "$1 $2");
        String[] parts = spaced.split("[^A-Za-z0-9]+");
        List<String> out = new ArrayList<String>();
        for (String part : parts) {
            if (!part.isEmpty()) out.add(part.toLowerCase(Locale.US));
        }
        return out;
    }

    private static boolean contains(List<String> tokens, Set<String> words) {
        for (String token : tokens) if (words.contains(token)) return true;
        return false;
    }

    private static Double asNumber(String literal) {
        try {
            if ("true".equals(literal) || "false".equals(literal)) return null;
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
}
