package com.savepress.launcher;

public class SaveTextTest {
    public static void main(String[] args) {
        String json = "{\n  \"purse\": { \"coins\": 40, \"gems\": 2 },\n"
                + "  \"stalls\": { \"spice\": { \"unlocked\": false } },\n"
                + "  \"gear\": { \"kettle\": { \"level\": 1 }, \"lockbox\": { \"locked\": true } },\n"
                + "  \"day\": 3\n}\n";
        SaveText.Doc doc = SaveText.parse(json);
        check(doc != null, "json parsed");
        int n = SaveText.stamp(doc, 9999999L, 10);
        check(n >= 4, "stamped " + n);
        String out = doc.render();
        check(out.contains("\"coins\": 9999999"), out);
        check(out.contains("\"unlocked\": true"), out);
        check(out.contains("\"locked\": false"), out);
        check(out.contains("\"level\": 10"), out);
        check(out.contains("\"day\": 3"), out);
        check("other".equals(SaveText.roleOf("engagement", "", "1")), "engagement");

        String xml = "<map>\n<int name=\"coins\" value=\"40\" />\n<boolean name=\"locked\" value=\"true\" />\n</map>\n";
        SaveText.Doc prefs = SaveText.parse(xml);
        check(prefs != null && "xml".equals(prefs.format), "xml");
        SaveText.stamp(prefs, 9999999L, 10);
        String xmlOut = prefs.render();
        check(xmlOut.contains("value=\"9999999\""), xmlOut);
        check(xmlOut.contains("value=\"false\""), xmlOut);

        String pairs = "coins=40\nlevel=1\nday=3\n";
        SaveText.Doc kv = SaveText.parse(pairs);
        check(kv != null && "pairs".equals(kv.format), "pairs");
        SaveText.stamp(kv, 9999999L, 10);
        String kvOut = kv.render();
        check(kvOut.contains("coins=9999999"), kvOut);
        check(kvOut.contains("level=10"), kvOut);
        check(kvOut.contains("day=3"), kvOut);
        check(SaveText.interest(doc) > SaveText.interest(SaveText.parse("{\"day\":3}\n")), "interest");
        SaveText.Doc quoted = SaveText.parse("{\"coins\":\"40\",\"currencies\":[{\"amount\":3}]}\n");
        check(quoted != null, "quoted");
        check(SaveText.stamp(quoted, 5000L, 10) >= 2, "quoted stamp");
        String quotedOut = quoted.render();
        check(quotedOut.contains("\"coins\":\"5000\""), quotedOut);
        check(quotedOut.contains("\"amount\":5000"), quotedOut);
        check("money".equals(SaveText.roleOf("amount", "currencies", "3")), "currency parent");
        check(SaveText.analytics("session_data.json", "{\"gaSessionId\":1,\"sessionCount\":1}"), "analytics");
        check(!SaveText.analytics("save.json", "{\"coins\":40}"), "not analytics");
        check("UserData".equals(Codec.logicalName("VQBzAGUAcgBEAGEAdABhAA==")), "name");
        String body = new String(Codec.encodeBody("{\"coin\":0,\"key\":1}"), java.nio.charset.StandardCharsets.US_ASCII);
        String decoded = Codec.decodeBody(body.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        SaveText.Doc money = SaveText.parse(decoded);
        check(SaveText.stamp(money, 9999999L, 10) >= 2, "coin stamp");
        check(money.render().contains("\"coin\":9999999"), money.render());
        java.util.Map<String, String> files = new java.util.LinkedHashMap<String, String>();
        files.put("UserData", "{\"coin\":0,\"key\":0,\"roundCoin\":0,\"no_ads\":false,\"isOnOpenAppAds\":true}");
        files.put("UserData_BigCoin", "0");
        files.put("item_4", "{\"item_info_array\":[ {\"item_id\":\"10005\", \"amount\":\"3\", \"ever_owned\":\"false\"}, {\"item_id\":\"20001\", \"amount\":\"0\", \"ever_owned\":\"false\"} ]}");
        files.put("stat_upgrade_v2_4", "{\"stat_infos\":[ {\"stat_level\":\"0\"} ]}");
        files.put("vehicle_4", "{\"inst\":{\"601\":{\"purchased\":\"false\", \"unlocked\":\"false\", \"purchase_count\":\"0\"}}}");
        files.put("in_app_shop_1", "{\"is_purchased_no_ads\":\"false\", \"equipment_array\":[  ]}");
        BulldozerText.giveAll(files, "999999999");
        check(files.get("UserData").contains("\"coin\":200000000"), files.get("UserData"));
        check("200000000".equals(files.get("UserData_BigCoin")), files.get("UserData_BigCoin"));
        check(files.get("item_4").contains("\"amount\":\"200000000\""), files.get("item_4"));
        check(files.get("stat_upgrade_v2_4").contains("\"stat_level\":\"20\""), files.get("stat_upgrade_v2_4"));
        check(files.get("vehicle_4").contains("\"purchased\":\"true\""), files.get("vehicle_4"));
        check(files.get("in_app_shop_1").contains("\"equipment_id\":\"601\""), files.get("in_app_shop_1"));
        java.util.Map<String, String> one = new java.util.LinkedHashMap<String, String>();
        one.put("item_4", "{\"item_info_array\":[ {\"item_id\":\"10001\", \"amount\":\"59\"}, {\"item_id\":\"10005\", \"amount\":\"3\"} ]}");
        one.put("item_4_s", one.get("item_4"));
        java.util.List<BulldozerText.Row> rows = BulldozerText.rows(one);
        check("Cash".equals(rows.get(0).title), rows.get(0).line());
        check(BulldozerText.setOne(one, rows.get(0), "1234"), "set cash");
        check(one.get("item_4").contains("\"item_id\":\"10001\", \"amount\":\"1234\""), one.get("item_4"));
        check(one.get("item_4").contains("\"amount\":\"3\""), one.get("item_4"));
        check(one.get("item_4_s").contains("\"amount\":\"1234\""), one.get("item_4_s"));
        java.util.Map<String, String> gifts = new java.util.LinkedHashMap<String, String>();
        gifts.put("secretary_room_4", "{\"gifts\":[ {\"gift_id\":\"20008\", \"amount\":\"9\"}, {\"gift_id\":\"20007\", \"amount\":\"5\"} ], \"secretaries\":[  ]}");
        gifts.put("secretary_room_4_s", gifts.get("secretary_room_4"));
        java.util.List<BulldozerText.Row> giftRows = BulldozerText.rows(gifts);
        check("Pink earrings".equals(giftRows.get(0).title) && "9".equals(giftRows.get(0).value), giftRows.get(0).line());
        check(BulldozerText.setOne(gifts, giftRows.get(0), "40"), "set gift");
        check(gifts.get("secretary_room_4").contains("\"gift_id\":\"20008\", \"amount\":\"40\""), gifts.get("secretary_room_4"));
        check(gifts.get("secretary_room_4").contains("\"amount\":\"5\""), gifts.get("secretary_room_4"));
        check(gifts.get("secretary_room_4_s").contains("\"amount\":\"40\""), gifts.get("secretary_room_4_s"));
        System.out.println("ok");
    }

    private static void check(boolean ok, String message) {
        if (!ok) throw new AssertionError(message);
    }
}
