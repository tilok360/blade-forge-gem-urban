package com.savepress.launcher;

public class SaveTextTest {
    public static void main(String[] args) throws Exception {
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
        check("Coins".equals(rows.get(0).title), rows.get(0).line());
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

        check("money".equals(SaveText.roleOf("totalCoins", "", "40")), "totalCoins");
        check("money".equals(SaveText.roleOf("m_coins", "", "9")), "m_coins");
        check("money".equals(SaveText.roleOf("sc_gold", "", "12")), "sc_gold");
        check("money".equals(SaveText.roleOf("PlayerGold", "", "300")), "PlayerGold");
        check("money".equals(SaveText.roleOf("cur_tickets", "", "3")), "tickets");
        check("money".equals(SaveText.roleOf("crystals", "", "3")), "crystals");
        check("money".equals(SaveText.roleOf("energy", "", "15")), "energy");
        check("money".equals(SaveText.roleOf("amount", "wallet", "70")), "wallet amount");
        check(!"money".equals(SaveText.roleOf("gemCost", "", "20")), "gemCost");
        check(!"money".equals(SaveText.roleOf("coinPrice", "", "25")), "coinPrice");
        check(!"money".equals(SaveText.roleOf("rewardCoins", "", "15")), "rewardCoins");
        check(!"money".equals(SaveText.roleOf("playerId", "", "4412")), "playerId");
        check(!"money".equals(SaveText.roleOf("version", "", "7")), "version");
        check(!"money".equals(SaveText.roleOf("highScore", "", "9000")), "highScore");
        check(!"money".equals(SaveText.roleOf("purchaseCount", "", "2")), "purchaseCount");

        String unity = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"
                + "<unity_prefs version_major=\"1\" version_minor=\"1\">\n"
                + "    <pref name=\"totalCoins\" type=\"int\">1250</pref>\n"
                + "    <pref name=\"numGems\" type=\"int\">8</pref>\n"
                + "    <pref name=\"gemCost\" type=\"int\">50</pref>\n"
                + "</unity_prefs>\n";
        SaveText.Doc unityDoc = SaveText.parse(unity);
        check(unityDoc != null && "xml".equals(unityDoc.format), "unity");
        int unityN = SaveText.stamp(unityDoc, 5000L, 10);
        check(unityN >= 2, "unity stamp " + unityN);
        String unityOut = unityDoc.render();
        check(unityOut.contains(">5000</pref>") && unityOut.contains("gemCost") && unityOut.contains(">50</pref>"), unityOut);

        String nested = "<map>\n"
                + "<int name=\"m_coins\" value=\"40\" />\n"
                + "<string name=\"playerData\">{\"wallet\":{\"softCurrency\":80,\"hardCurrency\":5},\"itemPrice\":9}</string>\n"
                + "<string name=\"coins\">500</string>\n"
                + "<int name=\"coinPrice\" value=\"25\" />\n"
                + "</map>\n";
        SaveText.Doc nest = SaveText.parse(nested);
        check(nest != null, "nested");
        int nestN = SaveText.stamp(nest, 1000L, 10);
        check(nestN >= 3, "nested stamp " + nestN);
        String nestOut = nest.render();
        check(nestOut.contains("value=\"1000\""), nestOut);
        check(nestOut.contains("\"softCurrency\":1000"), nestOut);
        check(nestOut.contains("\"itemPrice\":9"), nestOut);
        check(nestOut.contains(">1000</string>"), nestOut);
        check(!nestOut.contains("value=\"1000\"") || nestOut.contains("coinPrice\" value=\"25\""), nestOut);

        String payload = "{\"coins\":40,\"diamonds\":7}";
        String b64 = java.util.Base64.getEncoder().encodeToString(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String url = java.net.URLEncoder.encode("{\"totalCoins\":50,\"crystalCount\":4}", "UTF-8");
        SaveText.Doc encoded = SaveText.parse("{\"save\":\"" + b64 + "\",\"blob\":\"" + url + "\",\"itemCost\":10}\n");
        check(encoded != null, "encoded " + (encoded == null ? "null" : encoded.fields.size()));
        int encN = SaveText.stamp(encoded, 200L, 10);
        check(encN >= 3, "encoded stamp " + encN);
        String encOut = encoded.render();
        SaveText.Doc again = SaveText.parse(encOut);
        boolean coins200 = false, total200 = false, costLeft = encOut.contains("\"itemCost\":10");
        if (again != null) {
            for (SaveText.Field f : again.fields) {
                if (f.path.contains("coins") && "200".equals(f.literal)) coins200 = true;
                if (f.path.contains("totalCoins") && "200".equals(f.literal)) total200 = true;
            }
        }
        check(coins200 && total200 && costLeft, encOut);

        String es3 = "{\"coins\":{\"__type\":\"System.Int32,mscorlib\",\"value\":40},"
                + "\"gems\":{\"__type\":\"System.Int32,mscorlib\",\"value\":2},"
                + "\"energy\":{\"__type\":\"System.Int32,mscorlib\",\"value\":15},"
                + "\"level\":{\"__type\":\"System.Int32,mscorlib\",\"value\":4}}";
        SaveText.Doc es = SaveText.parse(es3);
        check(es != null, "es3");
        int esN = SaveText.stamp(es, 500L, 10);
        check(esN >= 3, "es3 stamp " + esN);
        check(es.render().contains("\"value\":500"), es.render());
        check(es.render().contains("\"__type\""), es.render());

        String hashJson = "{\"coins\":40,\"coins_hash\":\"abc\",\"gems\":2}";
        SaveText.Doc hashed = SaveText.parse(hashJson);
        boolean warned = false;
        for (SaveText.Field f : hashed.fields) {
            if ("coins".equals(f.key) && f.warning != null) warned = true;
        }
        check(warned, "checksum warning");
        SaveText.stamp(hashed, 999L, 10);
        check(hashed.render().contains("\"coins_hash\":\"abc\""), hashed.render());

        java.nio.ByteBuffer bin = java.nio.ByteBuffer.allocate(32).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        // "coins\0" + int 40 + "\0" + "gems\0" + int 7, with a header
        byte[] header = "HDR\0".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        byte[] coinsK = "coins\0".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        byte[] gemsK = "gems\0".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        java.io.ByteArrayOutputStream bout = new java.io.ByteArrayOutputStream();
        bout.write(header);
        bout.write(coinsK);
        bout.write(new byte[]{40, 0, 0, 0});
        bout.write(new byte[]{0, 0});
        bout.write(gemsK);
        bout.write(new byte[]{7, 0, 0, 0});
        byte[] rawBin = bout.toByteArray();
        java.util.List<SaveText.Field> scanned = SaveText.scanBinary(rawBin);
        boolean foundCoins = false, foundGems = false;
        for (SaveText.Field f : scanned) {
            if ("coins".equals(f.key) && "40".equals(f.literal)) foundCoins = true;
            if ("gems".equals(f.key) && "7".equals(f.literal)) foundGems = true;
        }
        check(foundCoins && foundGems, "binary scan " + scanned.size());
        SaveText.Doc binDoc = SaveText.parseBytes(rawBin);
        check(binDoc != null && binDoc.writable, "binary writable");
        SaveText.stamp(binDoc, 1000L, 10);
        byte[] patched = binDoc.renderBytes();
        java.nio.ByteBuffer pb = java.nio.ByteBuffer.wrap(patched).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        boolean patchedOk = false;
        for (SaveText.Field f : binDoc.fields) {
            if (f.binaryOffset >= 0 && "coins".equals(f.key)) {
                patchedOk = pb.getInt(f.binaryOffset) == 1000;
            }
        }
        check(patchedOk, "binary patch");
        check(new String(patched, 0, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("HDR\0"), "header kept");

        SaveText.Field intField = SaveText.parse("{\"coins\":40}").fields.get(0);
        String suggested = null;
        SaveText.stamp(SaveText.parse("{\"coins\":40}"), 3_000_000_000L, 10);
        SaveText.Doc clamped = SaveText.parse("{\"coins\":40}");
        SaveText.stamp(clamped, 3_000_000_000L, 10);
        check(clamped.render().contains("999999999"), clamped.render());
        check(!clamped.render().contains("3000000000"), clamped.render());

        byte[] sqlite = new byte[64];
        byte[] magic = "SQLite format 3\0".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        System.arraycopy(magic, 0, sqlite, 0, magic.length);
        SaveText.Doc sql = SaveText.parseBytes(sqlite);
        check(sql != null && !sql.writable && sql.warning.toLowerCase().contains("sqlite"), "sqlite");

        String es3Unquoted = "{\n\t\"PlayerInfo\" : {\n\t\t\"__type\" : \"PlayerInfo\",\n\t\t\"value\" : {\n\t\t\"TotalCoins\" : 150,\n\t\t\"TotalDiamond\" : 20,\n\t\t\"WatchCounts\" : {100001:44}\n\t}\n\t},\n}";
        SaveText.Doc unquoted = SaveText.parse(es3Unquoted, "GameSave");
        check(unquoted != null, "unquoted es3 parse");
        boolean coins = false, diamonds = false;
        for (SaveText.Field f : unquoted.fields) {
            if ("TotalCoins".equals(f.key) && "150".equals(f.literal) && "money".equals(f.role)) {
                coins = true;
                check(SaveText.fieldLabel(f).equals("Coins"), "label coins " + SaveText.fieldLabel(f));
            }
            if ("TotalDiamond".equals(f.key) && "20".equals(f.literal) && "money".equals(f.role)) {
                diamonds = true;
                check(SaveText.fieldLabel(f).equals("Diamonds"), "label diamonds");
            }
        }
        check(coins && diamonds, "unquoted es3 fields");

        check(SaveText.friendlyFileKey("files/VQBzAGUAcgBEAGEAdABhAF8AQgBpAGcAQwBvAGkAbgA=").equals("UserData_BigCoin"), "file key");
        SaveText.Doc bare = SaveText.parse("MgAwADAAMAAwADAAMAAwADAA", "files/VQBzAGUAcgBEAGEAdABhAF8AQgBpAGcAQwBvAGkAbgA=");
        // wrapped? Codec may not apply in parse(); the body is already a number after Codec.decodeBody.
        // Test the decoded number path:
        SaveText.Doc bareNum = SaveText.parse("200000000", "UserData_BigCoin");
        check(bareNum != null && !bareNum.fields.isEmpty(), "bare number");
        check(SaveText.fieldLabel(bareNum.fields.get(0)).equals("Big Coins"), "big coins label " + SaveText.fieldLabel(bareNum.fields.get(0)));

        SaveText.Doc pixel = SaveText.parse("{\"curCoin\":220,\"curLanguage\":1,\"curBrush\":4,\"ShufferPropCount\":5}");
        boolean gotCoin = false, gotLang = false, gotBrush = false, gotShuffle = false;
        for (SaveText.Field f : pixel.fields) {
            if ("curCoin".equals(f.key) && "money".equals(f.role)) {
                gotCoin = true;
                check(SaveText.fieldLabel(f).equals("Coins"), "curCoin label");
            }
            if ("curLanguage".equals(f.key) && "money".equals(f.role)) gotLang = true;
            if ("curBrush".equals(f.key) && "money".equals(f.role)) {
                gotBrush = true;
                check(SaveText.fieldLabel(f).startsWith("Boosters: Brush"), "brush label " + SaveText.fieldLabel(f));
            }
            if ("ShufferPropCount".equals(f.key) && "money".equals(f.role)) gotShuffle = true;
        }
        check(gotCoin && gotBrush && gotShuffle && !gotLang, "pixel boosters");

        SaveText.Doc unsure = SaveText.parse("{\"day\":3}");
        check(SaveText.fieldLabel(unsure.fields.get(0)).contains("(unsure)"), "unsure label");

        {
        java.io.File charm = new java.io.File("/workspace/savepress/phone-saves/com.charmcolor.sortpuzzle/files/Gamedata.txt");
        if (charm.isFile()) {
            byte[] bytes = java.nio.file.Files.readAllBytes(charm.toPath());
            check(Nrbf.isNrbf(bytes), "charm is nrbf");
            SaveText.Doc nrbfDoc = SaveText.parseBytes(bytes, "Gamedata.txt");
            check(nrbfDoc != null && "nrbf".equals(nrbfDoc.format), "charm format " + (nrbfDoc == null ? "null" : nrbfDoc.format));
            boolean gotCoins = false, gotDiamonds = false, gotHint = false;
            for (SaveText.Field f : nrbfDoc.fields) {
                String label = SaveText.fieldLabel(f);
                if (label.equals("Coins") && "50".equals(f.literal)) gotCoins = true;
                if (label.equals("Diamonds") && "0".equals(f.literal)) gotDiamonds = true;
                if (label.equals("Boosters: Hint")) gotHint = true;
            }
            check(gotCoins, "charm coins 50, got labels " + labelsOf(nrbfDoc));
            check(gotDiamonds, "charm diamonds 0");
            check(gotHint, "charm hint booster");
            SaveText.stamp(nrbfDoc, 9999, 10);
            byte[] written = nrbfDoc.renderBytes();
            SaveText.Doc nrbfAgain = SaveText.parseBytes(written, "Gamedata.txt");
            boolean gotStamped = false;
            for (SaveText.Field f : nrbfAgain.fields) {
                if (SaveText.fieldLabel(f).equals("Coins") && "9999".equals(f.literal)) gotStamped = true;
            }
            check(gotStamped, "charm coins stamped in rewritten file, got " + labelsOf(nrbfAgain));
        }
        }

        {
        java.io.File island = new java.io.File("/workspace/savepress/phone-saves/com.islandmatch.tripletilegp/files/Gamedata.txt");
        if (island.isFile()) {
            SaveText.Doc nrbfDoc = SaveText.parseBytes(java.nio.file.Files.readAllBytes(island.toPath()), "Gamedata.txt");
            boolean gotCoins = false, gotRemove = false;
            for (SaveText.Field f : nrbfDoc.fields) {
                if (SaveText.fieldLabel(f).equals("Coins") && "20".equals(f.literal)) gotCoins = true;
                if (SaveText.fieldLabel(f).equals("Boosters: Remove")) gotRemove = true;
            }
            check(gotCoins, "island coins 20, got " + labelsOf(nrbfDoc));
            check(gotRemove, "island remove booster, got " + labelsOf(nrbfDoc));
        }
        }

        {
        java.io.File splendid = new java.io.File("/workspace/savepress/phone-saves/com.drava.match.splendid/files/save");
        if (splendid.isFile()) {
            SaveText.Doc nrbfDoc = SaveText.parseBytes(java.nio.file.Files.readAllBytes(splendid.toPath()), "save");
            boolean gotCoins = false, gotLives = false, gotBooster = false;
            for (SaveText.Field f : nrbfDoc.fields) {
                String label = SaveText.fieldLabel(f);
                if (label.equals("Coins") && "40".equals(f.literal)) gotCoins = true;
                if (label.equals("Lives") && "5".equals(f.literal)) gotLives = true;
                if (label.startsWith("Booster") && "3".equals(f.literal)) gotBooster = true;
            }
            check(gotCoins, "splendid coins 40, got " + labelsOf(nrbfDoc));
            check(gotLives, "splendid lives 5, got " + labelsOf(nrbfDoc));
            check(gotBooster, "splendid booster 3, got " + labelsOf(nrbfDoc));
            SaveText.stamp(nrbfDoc, 123456, 10);
            byte[] written = nrbfDoc.renderBytes();
            check(Nrbf.isNrbf(written), "splendid rewrite stays nrbf");
            SaveText.Doc nrbfAgain = SaveText.parseBytes(written, "save");
            boolean gotStamped = false, gotLivesStamped = false;
            for (SaveText.Field f : nrbfAgain.fields) {
                if (SaveText.fieldLabel(f).equals("Coins") && "123456".equals(f.literal)) gotStamped = true;
                if (SaveText.fieldLabel(f).equals("Lives") && "123456".equals(f.literal)) gotLivesStamped = true;
            }
            check(gotStamped, "splendid coins stamped to 123456, got " + labelsOf(nrbfAgain));
            check(gotLivesStamped, "splendid lives stamped, got " + labelsOf(nrbfAgain));
        }
        }

        {
        java.io.File luxe = new java.io.File("/workspace/savepress/phone-saves/com.drava.puzzle.luxe/files/save");
        if (luxe.isFile()) {
            SaveText.Doc nrbfDoc = SaveText.parseBytes(java.nio.file.Files.readAllBytes(luxe.toPath()), "save");
            boolean gotCoins = false;
            for (SaveText.Field f : nrbfDoc.fields) {
                if (SaveText.fieldLabel(f).equals("Coins") && "20".equals(f.literal)) gotCoins = true;
            }
            check(gotCoins, "luxe coins 20, got " + labelsOf(nrbfDoc));
        }
        }

        System.out.println("ok");

    }

    private static String labelsOf(SaveText.Doc doc) {
        StringBuilder out = new StringBuilder();
        for (SaveText.Field f : doc.fields) {
            if (out.length() > 0) out.append(", ");
            out.append(SaveText.fieldLabel(f)).append("=").append(f.literal);
        }
        return out.toString();
    }

    private static void check(boolean ok, String message) {
        if (!ok) throw new AssertionError(message);
    }
}
