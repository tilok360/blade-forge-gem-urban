package com.savepress.launcher;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Rewrites Bulldozer Master saves. Amounts stop at 200 million. */
public final class BulldozerText {
    public static final String CAP = "200000000";

    private BulldozerText() {}

    public static void giveAll(Map<String, String> files, String amount) {
        if (amount == null || !amount.matches("\\d+") || amount.length() > 9 || Long.parseLong(amount) > 200_000_000L) {
            amount = CAP;
        }
        String user = files.get("UserData");
        if (user != null) {
            user = setEvery(user, "coin", amount);
            user = setEvery(user, "key", amount);
            user = setEvery(user, "roundCoin", amount);
            user = user.replace("\"no_ads\":false", "\"no_ads\":true");
            user = user.replace("\"isOnOpenAppAds\":true", "\"isOnOpenAppAds\":false");
            files.put("UserData", user);
        }
        files.put("UserData_BigCoin", amount);
        for (String name : new String[]{"item_4", "item_4_s"}) {
            String body = files.get(name);
            if (body == null) continue;
            body = setEvery(body, "amount", amount);
            body = body.replace("\"ever_owned\":\"false\"", "\"ever_owned\":\"true\"");
            files.put(name, body);
        }
        for (String name : new String[]{"secretary_room_4", "secretary_room_4_s"}) {
            String body = files.get(name);
            if (body == null) continue;
            files.put(name, fillGifts(body, amount));
        }
        for (Map.Entry<String, String> entry : new ArrayList<Map.Entry<String, String>>(files.entrySet())) {
            if (!entry.getKey().toLowerCase(java.util.Locale.US).contains("gift")) continue;
            files.put(entry.getKey(), fillGifts(entry.getValue(), amount));
        }
        for (String name : new String[]{"stat_upgrade_v2_4", "stat_upgrade_v2_4_s"}) {
            String body = files.get(name);
            if (body == null) continue;
            files.put(name, setEvery(body, "stat_level", "20"));
        }
        List<String> machines = new ArrayList<String>();
        for (String name : new String[]{"vehicle_4", "vehicle_4_s"}) {
            String body = files.get(name);
            if (body == null) continue;
            if (machines.isEmpty()) machines = vehicleIds(body);
            body = body.replace("\"purchased\":\"false\"", "\"purchased\":\"true\"");
            body = body.replace("\"unlocked\":\"false\"", "\"unlocked\":\"true\"");
            body = body.replace("\"purchase_count\":\"0\"", "\"purchase_count\":\"1\"");
            files.put(name, body);
        }
        for (String name : new String[]{"in_app_shop_1", "in_app_shop_1_s"}) {
            String body = files.get(name);
            if (body == null) continue;
            body = body.replace("\"is_purchased_no_ads\":\"false\"", "\"is_purchased_no_ads\":\"true\"");
            if (!machines.isEmpty()) body = replaceArray(body, "equipment_array", equipmentList(machines));
            files.put(name, body);
        }
    }

    public static final class Row {
        public final String title;
        public final String value;
        public final String kind;
        public final String id;

        Row(String title, String value, String kind, String id) {
            this.title = title;
            this.value = value;
            this.kind = kind;
            this.id = id;
        }

        public String line() {
            return title + "  " + value;
        }
    }

    public static boolean setOne(Map<String, String> files, Row row, String amount) {
        if (row == null || row.kind == null) return false;
        if (amount == null || !amount.matches("\\d+") || amount.length() > 9 || Long.parseLong(amount) > 200_000_000L) {
            return false;
        }
        if ("item".equals(row.kind) || "gift".equals(row.kind)) {
            boolean hit = false;
            for (String name : new String[]{"item_4", "item_4_s"}) {
                String body = files.get(name);
                if (body == null) continue;
                String next = setItemAmount(body, row.id, amount);
                if (!next.equals(body)) {
                    files.put(name, next);
                    hit = true;
                }
            }
            if ("gift".equals(row.kind)) {
                for (Map.Entry<String, String> entry : new ArrayList<Map.Entry<String, String>>(files.entrySet())) {
                    String key = entry.getKey().toLowerCase(java.util.Locale.US);
                    if (!key.contains("gift") && !"item".equals(row.id) && !entry.getValue().contains("\"gift_id\":\"" + row.id + "\"")
                            && !entry.getValue().contains("\"item_id\":\"" + row.id + "\"")) continue;
                    if (!key.contains("gift") && !entry.getValue().contains(row.id)) continue;
                    String next = entry.getValue().contains("\"gift_id\"") || key.contains("gift")
                            ? setGiftAmount(entry.getValue(), row.id, amount)
                            : setItemAmount(entry.getValue(), row.id, amount);
                    if (next.equals(entry.getValue()) && (key.contains("gift") || entry.getValue().contains("\"gifts\""))) {
                        next = ensureGift(entry.getValue(), row.id, amount);
                    }
                    if (!next.equals(entry.getValue())) {
                        files.put(entry.getKey(), next);
                        hit = true;
                    }
                }
            }
            if (!hit && "gift".equals(row.kind)) {
                String created = ensureGift("{\"gifts\":[  ], \"vr\":\"1\", \"fg\":\"1\"}", row.id, amount);
                files.put("secretary_gift_4", created);
                files.put("secretary_gift_4_s", created);
                return true;
            }
            return hit;
        }
        if ("user".equals(row.kind)) {
            if (row.id.startsWith("likeability")) {
                boolean hit = false;
                for (String name : new String[]{"secretary_room_4", "secretary_room_4_s"}) {
                    String body = files.get(name);
                    if (body == null || !body.contains("\"" + row.id + "\"")) continue;
                    files.put(name, setEvery(body, row.id, amount));
                    hit = true;
                }
                return hit;
            }
            String user = files.get("UserData");
            if (user == null) return false;
            files.put("UserData", setEvery(user, row.id, amount));
            return true;
        }
        if ("big".equals(row.kind)) {
            files.put("UserData_BigCoin", amount);
            return true;
        }
        return false;
    }

    public static List<Row> rows(Map<String, String> files) {
        return rows(files, true);
    }

    public static List<Row> rows(Map<String, String> files, boolean showOther) {
        List<Row> money = new ArrayList<Row>();
        List<Row> gifts = new ArrayList<Row>();
        List<Row> rest = new ArrayList<Row>();
        Set<String> giftIds = new LinkedHashSet<String>();
        for (Map.Entry<String, String> entry : files.entrySet()) {
            String key = entry.getKey().toLowerCase(java.util.Locale.US);
            String body = entry.getValue();
            if (body == null) continue;
            if (key.contains("gift") || body.contains("\"gift_id\"")) addSecretaryGifts(body, gifts, giftIds);
        }
        boolean giftFile = !gifts.isEmpty();
        String items = files.get("item_4");
        if (items != null) {
            int at = 0;
            while ((at = items.indexOf("\"item_id\":\"", at)) >= 0) {
                int start = at + "\"item_id\":\"".length();
                int end = items.indexOf('"', start);
                if (end < 0) break;
                String id = items.substring(start, end);
                String amount = valueAfter(items, end, "amount");
                if (id.startsWith("200") && !giftFile) {
                    if (giftIds.add(id)) gifts.add(new Row(label(id), amount, "gift", id));
                } else if (!id.startsWith("200") || showOther) {
                    Row row = new Row(label(id), amount, "item", id);
                    if ("10001".equals(id) || "10004".equals(id) || "10005".equals(id)) money.add(row);
                    else if (showOther) rest.add(row);
                }
                at = end;
            }
        }
        List<Row> out = new ArrayList<Row>();
        out.addAll(money);
        out.addAll(gifts);
        if (showOther) {
            out.addAll(rest);
            String user = files.get("UserData");
            out.add(new Row("Coins", user == null ? "?" : valueOf(user, "coin"), "user", "coin"));
            out.add(new Row("Keys", user == null ? "?" : valueOf(user, "key"), "user", "key"));
            out.add(new Row("Round cash", user == null ? "?" : valueOf(user, "roundCoin"), "user", "roundCoin"));
            out.add(new Row("Big Coins", files.getOrDefault("UserData_BigCoin", "0").trim(), "big", "big"));
            String room = files.get("secretary_room_4");
            if (room != null) addAffinity(room, out);
        }
        return out;
    }

    static String setItemAmount(String json, String id, String value) {
        String mark = "\"item_id\":\"" + id + "\"";
        int at = json.indexOf(mark);
        if (at < 0) return json;
        int amt = json.indexOf("\"amount\":\"", at);
        if (amt < 0 || amt - at > 80) return json;
        int s = amt + "\"amount\":\"".length();
        int e = json.indexOf('"', s);
        if (e < 0) return json;
        return json.substring(0, s) + value + json.substring(e);
    }

    private static void addSecretaryGifts(String json, List<Row> gifts, Set<String> ids) {
        int at = 0;
        while ((at = json.indexOf("\"gift_id\":\"", at)) >= 0) {
            int start = at + "\"gift_id\":\"".length();
            int end = json.indexOf('"', start);
            if (end < 0) return;
            String id = json.substring(start, end);
            String amount = valueAfter(json, end, "amount");
            if (ids.add(id)) gifts.add(new Row(giftName(id), amount, "gift", id));
            at = end;
        }
        int key = json.indexOf("\"gifts\"");
        if (key < 0) return;
        int brace = json.indexOf('{', key);
        int bracket = json.indexOf('[', key);
        if (brace < 0 || (bracket >= 0 && bracket < brace)) return;
        int depth = 0;
        for (int i = brace; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == '{') depth++;
            else if (c == '}') {
                depth--;
                if (depth == 0) {
                    readGiftMap(json.substring(brace, i + 1), gifts, ids);
                    return;
                }
            }
        }
    }

    private static void readGiftMap(String map, List<Row> gifts, Set<String> ids) {
        int p = 0;
        while ((p = map.indexOf('"', p)) >= 0) {
            int q = map.indexOf('"', p + 1);
            if (q < 0) break;
            String id = map.substring(p + 1, q);
            int colon = map.indexOf(':', q);
            if (colon < 0 || !id.matches("\\d+")) {
                p = q + 1;
                continue;
            }
            int s = colon + 1;
            while (s < map.length() && map.charAt(s) == ' ') s++;
            String amount;
            int next;
            if (s < map.length() && map.charAt(s) == '"') {
                int e = map.indexOf('"', s + 1);
                if (e < 0) break;
                amount = map.substring(s + 1, e);
                next = e + 1;
            } else {
                int e = s;
                while (e < map.length() && Character.isDigit(map.charAt(e))) e++;
                amount = map.substring(s, e);
                next = e;
            }
            if (ids.add(id)) gifts.add(new Row(giftName(id), amount, "gift", id));
            p = next;
        }
    }

    static String fillGifts(String json, String amount) {
        StringBuilder out = new StringBuilder(json.length() + 16);
        int i = 0;
        while (i < json.length()) {
            int at = json.indexOf("\"gift_id\":\"", i);
            if (at < 0) {
                out.append(json.substring(i));
                break;
            }
            int amt = json.indexOf("\"amount\":\"", at);
            if (amt < 0 || amt - at > 80) {
                out.append(json.substring(i, at + 10));
                i = at + 10;
                continue;
            }
            int s = amt + "\"amount\":\"".length();
            int e = json.indexOf('"', s);
            if (e < 0) return json;
            out.append(json, i, s).append(amount);
            i = e;
        }
        return fillGiftMap(out.toString(), amount);
    }

    private static String fillGiftMap(String json, String amount) {
        int key = json.indexOf("\"gifts\"");
        if (key < 0) return json;
        int brace = json.indexOf('{', key);
        int bracket = json.indexOf('[', key);
        if (brace < 0 || (bracket >= 0 && bracket < brace)) return json;
        int depth = 0;
        int end = -1;
        for (int i = brace; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == '{') depth++;
            else if (c == '}') {
                depth--;
                if (depth == 0) {
                    end = i;
                    break;
                }
            }
        }
        if (end < 0) return json;
        String map = json.substring(brace, end + 1).replaceAll(":\"\\d+\"", ":\"" + amount + "\"");
        return json.substring(0, brace) + map + json.substring(end + 1);
    }

    static String setGiftAmount(String json, String id, String value) {
        String mark = "\"gift_id\":\"" + id + "\"";
        int at = json.indexOf(mark);
        if (at >= 0) {
            int amt = json.indexOf("\"amount\":\"", at);
            if (amt >= 0 && amt - at < 80) {
                int s = amt + "\"amount\":\"".length();
                int e = json.indexOf('"', s);
                if (e > s) return json.substring(0, s) + value + json.substring(e);
            }
        }
        String quoted = "\"" + id + "\":\"";
        int key = json.indexOf(quoted);
        if (key >= 0) {
            int s = key + quoted.length();
            int e = json.indexOf('"', s);
            if (e > s && json.substring(s, e).matches("\\d+")) return json.substring(0, s) + value + json.substring(e);
        }
        return json;
    }

    static String ensureGift(String json, String id, String value) {
        String updated = setGiftAmount(json, id, value);
        if (!updated.equals(json)) return updated;
        String entry = "{\"gift_id\":\"" + id + "\", \"amount\":\"" + value + "\"}";
        int key = json.indexOf("\"gifts\"");
        if (key < 0) {
            String trimmed = json.trim();
            if (trimmed.startsWith("{")) return "{\"gifts\":[ " + entry + " ], " + trimmed.substring(1);
            return "{\"gifts\":[ " + entry + " ], \"vr\":\"1\", \"fg\":\"1\"}";
        }
        int bracket = json.indexOf('[', key);
        if (bracket < 0) return json;
        boolean empty = true;
        for (int i = bracket + 1; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == ']') break;
            if (c != ' ') {
                empty = false;
                break;
            }
        }
        if (empty) return json.substring(0, bracket + 1) + " " + entry + " " + json.substring(bracket + 1);
        return json.substring(0, bracket + 1) + " " + entry + ", " + json.substring(bracket + 1);
    }

    private static void addAffinity(String json, List<Row> out) {
        int at = 0;
        while ((at = json.indexOf("\"secretary_id\":\"", at)) >= 0) {
            int start = at + "\"secretary_id\":\"".length();
            int end = json.indexOf('"', start);
            if (end < 0) return;
            String id = json.substring(start, end);
            String level = valueAfter(json, end, "likeability_level");
            String exp = valueAfter(json, end, "likeability_exp");
            if (!"?".equals(level)) out.add(new Row(secretaryName(id) + " affinity", level, "user", "likeability_level"));
            if (!"?".equals(exp)) out.add(new Row(secretaryName(id) + " affinity exp", exp, "user", "likeability_exp"));
            at = end;
        }
    }

    private static String secretaryName(String id) {
        if ("1".equals(id)) return "Sofia";
        if ("2".equals(id)) return "Scarlett";
        if ("3".equals(id)) return "Lily";
        if ("4".equals(id)) return "Sandy";
        if ("5".equals(id)) return "Chloe";
        if ("6".equals(id)) return "Naomi";
        if ("7".equals(id)) return "Nayeon";
        if ("8".equals(id)) return "Claire";
        if ("9".equals(id)) return "Mei";
        if ("10".equals(id)) return "Hina";
        if ("11".equals(id)) return "Clara";
        if ("12".equals(id)) return "Victor";
        if ("13".equals(id)) return "Dinar";
        if ("14".equals(id)) return "Elena";
        return "Secretary " + id;
    }

    static String setEvery(String json, String key, String value) {
        String mark = "\"" + key + "\":";
        StringBuilder out = new StringBuilder(json.length() + 32);
        int i = 0;
        while (i < json.length()) {
            int at = json.indexOf(mark, i);
            if (at < 0) {
                out.append(json.substring(i));
                break;
            }
            out.append(json, i, at).append(mark);
            int s = at + mark.length();
            while (s < json.length() && json.charAt(s) == ' ') s++;
            if (s < json.length() && json.charAt(s) == '"') {
                int e = json.indexOf('"', s + 1);
                if (e < 0) return json;
                if (json.substring(s + 1, e).matches("-?\\d+")) {
                    out.append('"').append(value).append('"');
                    i = e + 1;
                    continue;
                }
            } else {
                int e = s;
                while (e < json.length()) {
                    char c = json.charAt(e);
                    if (!(Character.isDigit(c) || c == '-' || c == '.')) break;
                    e++;
                }
                if (e > s) {
                    out.append(value);
                    i = e;
                    continue;
                }
            }
            if (s >= json.length()) break;
            out.append(json.charAt(s));
            i = s + 1;
        }
        return out.toString();
    }

    private static String valueOf(String json, String key) {
        String mark = "\"" + key + "\":";
        int at = json.indexOf(mark);
        if (at < 0) return "?";
        int s = at + mark.length();
        while (s < json.length() && json.charAt(s) == ' ') s++;
        if (s < json.length() && json.charAt(s) == '"') {
            int e = json.indexOf('"', s + 1);
            return e < 0 ? "?" : json.substring(s + 1, e);
        }
        int e = s;
        while (e < json.length()) {
            char c = json.charAt(e);
            if (!(Character.isDigit(c) || c == '-' || c == '.')) break;
            e++;
        }
        return json.substring(s, e);
    }

    private static String valueAfter(String json, int from, String key) {
        int at = json.indexOf("\"" + key + "\":\"", from);
        if (at < 0 || at - from > 80) return "?";
        int s = at + key.length() + 4;
        int e = json.indexOf('"', s);
        return e < 0 ? "?" : json.substring(s, e);
    }

    static List<String> vehicleIds(String json) {
        List<String> ids = new ArrayList<String>();
        String mark = "\":{\"purchased\"";
        int i = 0;
        while ((i = json.indexOf(mark, i)) >= 0) {
            int end = i;
            int start = json.lastIndexOf('"', end - 1);
            if (start >= 0) ids.add(json.substring(start + 1, end));
            i += mark.length();
        }
        return ids;
    }

    private static String equipmentList(List<String> ids) {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < ids.size(); i++) {
            if (i > 0) out.append(", ");
            out.append("{\"equipment_id\":\"").append(ids.get(i)).append("\"}");
        }
        return out.toString();
    }

    private static String replaceArray(String json, String key, String inside) {
        String mark = "\"" + key + "\":";
        int at = json.indexOf(mark);
        if (at < 0) return json;
        int open = json.indexOf('[', at);
        if (open < 0) return json;
        int depth = 0;
        for (int i = open; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == '[') depth++;
            else if (c == ']') {
                depth--;
                if (depth == 0) return json.substring(0, open) + "[ " + inside + " ]" + json.substring(i + 1);
            }
        }
        return json;
    }

    static String label(String id) {
        if ("10001".equals(id)) return "Coins";
        if ("10004".equals(id)) return "Gold bars";
        if ("10005".equals(id)) return "Gems";
        if ("10002".equals(id)) return "Research points";
        if ("10003".equals(id)) return "Gear";
        if ("10006".equals(id)) return "Biz points";
        if ("30001".equals(id)) return "Bond";
        if ("40001".equals(id)) return "Ticket";
        if ("40004".equals(id)) return "Lost mine voucher";
        if ("40005".equals(id)) return "Treasure";
        if ("40006".equals(id)) return "Ad ticket";
        if (id.startsWith("400")) return "Ticket " + id;
        if (id.startsWith("200") || id.startsWith("100") && id.length() == 4) return giftName(id);
        if ("10006".equals(id) || "30001".equals(id)) return "Gems " + id;
        if (id.startsWith("100")) return "Gear " + id;
        return "Item " + id;
    }

    static String giftName(String id) {
        String n = id;
        if (id.length() == 5 && id.startsWith("200")) n = "1" + id.substring(2);
        if ("1001".equals(n)) return "Heart ring";
        if ("1002".equals(n)) return "Pearl shell";
        if ("1003".equals(n)) return "Gold necklace";
        if ("1004".equals(n)) return "Dreamcatcher";
        if ("1005".equals(n)) return "Star brooch";
        if ("1006".equals(n)) return "Purple gem ring";
        if ("1007".equals(n)) return "Gold gem ring";
        if ("1008".equals(n)) return "Pink earrings";
        if ("1009".equals(n)) return "Blue earrings";
        if ("1010".equals(n)) return "Silver blue ring";
        if ("1011".equals(n)) return "Silver green ring";
        if ("1012".equals(n)) return "Gift 1012";
        if ("1013".equals(n)) return "Gift 1013";
        if ("1014".equals(n)) return "Gift 1014";
        return "Gift " + id;
    }
}
