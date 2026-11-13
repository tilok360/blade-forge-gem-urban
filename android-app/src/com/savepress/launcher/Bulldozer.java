package com.savepress.launcher;

import java.io.File;
import java.util.LinkedHashMap;
import java.util.Map;

/** Reads and writes the Bulldozer Master save folder. */
public final class Bulldozer {
    private static final String[] NAMES = {
            "UserData", "UserData_BigCoin",
            "item_4", "item_4_s",
            "stat_upgrade_v2_4", "stat_upgrade_v2_4_s",
            "vehicle_4", "vehicle_4_s",
            "in_app_shop_1", "in_app_shop_1_s",
            "secretary_room_4", "secretary_room_4_s",
            "secretary_gift_4", "secretary_gift_4_s",
            "secretary_gift", "secretary_likeability_4"
    };

    public final String folder;
    public final Map<String, String> files = new LinkedHashMap<String, String>();

    private Bulldozer(String folder) {
        this.folder = folder;
    }

    public static Bulldozer load(String pkg) {
        String encoded = Codec.encodeName("UserData");
        String[] roots = new String[]{
                "/storage/emulated/0/Android/data/" + pkg + "/files/" + encoded,
                "/sdcard/Android/data/" + pkg + "/files/" + encoded,
                "/mnt/user/0/emulated/0/Android/data/" + pkg + "/files/" + encoded,
                "/storage/self/primary/Android/data/" + pkg + "/files/" + encoded
        };
        for (String path : roots) {
            try {
                String text = Codec.decodeBody(Shell.readPath(path));
                if (text == null || !text.contains("\"coin\"")) continue;
                File parent = new File(path).getParentFile();
                if (parent == null) continue;
                Bulldozer pack = new Bulldozer(parent.getAbsolutePath());
                pack.files.put("UserData", text);
                for (String name : NAMES) {
                    if ("UserData".equals(name)) continue;
                    pack.read(name);
                }
                pack.readNearby();
                return pack;
            } catch (Exception ignored) {
                /* try the next location */
            }
        }
        return null;
    }

    public void save() throws Exception {
        for (Map.Entry<String, String> entry : files.entrySet()) {
            String path = new File(folder, Codec.encodeName(entry.getKey())).getAbsolutePath();
            Shell.writePath(path, Codec.encodeBody(entry.getValue()));
        }
    }

    private void readNearby() {
        for (String path : Shell.listFiles(folder)) {
            java.io.File file = new java.io.File(path);
            java.io.File parent = file.getParentFile();
            if (parent == null || !folder.equals(parent.getAbsolutePath())) continue;
            String logical = Codec.logicalName(file.getName());
            if (files.containsKey(logical)) continue;
            String low = logical.toLowerCase(java.util.Locale.US);
            if (low.contains("gift") || low.contains("secretary") || low.contains("likeab")) read(logical);
        }
    }

    private void read(String logical) {
        try {
            String path = new File(folder, Codec.encodeName(logical)).getAbsolutePath();
            String text = Codec.decodeBody(Shell.readPath(path));
            if (text != null) files.put(logical, text);
        } catch (Exception ignored) {
            /* optional file */
        }
    }
}
