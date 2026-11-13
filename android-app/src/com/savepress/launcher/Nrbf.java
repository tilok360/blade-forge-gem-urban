package com.savepress.launcher;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Reads Unity .NET BinaryFormatter saves used by several puzzle games:
 * Charm Color Sort / Island Match (GameMgrData with cion, diamond, boosters)
 * and Splendid Match / Luxe Puzzle (Watermelon.GlobalSave with JSON blobs).
 */
final class Nrbf {
    private Nrbf() {}

    static boolean isNrbf(byte[] bytes) {
        return bytes != null && bytes.length >= 9
                && bytes[0] == 0 && bytes[1] == 1 && bytes[2] == 0 && bytes[3] == 0 && bytes[4] == 0
                && (bytes[5] & 0xff) == 0xff && (bytes[6] & 0xff) == 0xff
                && (bytes[7] & 0xff) == 0xff && (bytes[8] & 0xff) == 0xff;
    }

    static List<SaveText.Field> parse(byte[] bytes) {
        List<SaveText.Field> fields = new ArrayList<SaveText.Field>();
        if (!isNrbf(bytes)) return fields;
        extractClassPrimitives(bytes, fields);
        extractJsonBlobs(bytes, fields);
        return fields;
    }

    static byte[] render(byte[] original, List<SaveText.Field> fields) {
        if (original == null) return new byte[0];
        byte[] out = new byte[original.length];
        System.arraycopy(original, 0, out, 0, original.length);

        Map<Integer, List<SaveText.Field>> groups = new LinkedHashMap<Integer, List<SaveText.Field>>();
        List<SaveText.Field> primitives = new ArrayList<SaveText.Field>();
        for (SaveText.Field field : fields) {
            if (!field.changed()) continue;
            if (field.packedAt >= 0 && field.jsonStart >= 0) {
                List<SaveText.Field> group = groups.get(field.packedAt);
                if (group == null) {
                    group = new ArrayList<SaveText.Field>();
                    groups.put(field.packedAt, group);
                }
                group.add(field);
            } else if (field.binaryOffset >= 0) {
                primitives.add(field);
            }
        }

        List<Integer> packedStarts = new ArrayList<Integer>(groups.keySet());
        packedStarts.sort(Comparator.reverseOrder());
        int shift = 0;
        // We'll apply from the end, so earlier offsets stay valid until we pass them.
        // Track applied delta for primitive offsets that sit after a splice.
        int[] deltaAt = new int[]{0}; // unused placeholder
        for (int packedAt : packedStarts) {
            List<SaveText.Field> group = groups.get(packedAt);
            out = spliceJsonGroup(out, group);
        }
        // After splices, recompute primitive offsets: if a splice happened before the offset, it moved.
        // spliceJsonGroup changes length of strings at/after packedAt. Re-apply primitives on the
        // current buffer by mapping through the new lengths from the original.
        // Safer: apply primitives first (fixed width, no shift), then JSON splices from the end.
        return renderInOrder(original, primitives, groups, packedStarts);
    }

    private static byte[] renderInOrder(byte[] original, List<SaveText.Field> primitives,
                                       Map<Integer, List<SaveText.Field>> groups, List<Integer> packedStarts) {
        byte[] out = new byte[original.length];
        System.arraycopy(original, 0, out, 0, original.length);
        // JSON splices from end of file so earlier primitive offsets stay put if they are before the splice.
        for (int packedAt : packedStarts) {
            out = spliceJsonGroup(out, groups.get(packedAt));
        }
        int grown = out.length - original.length;
        for (SaveText.Field field : primitives) {
            int off = field.binaryOffset;
            if (off < 0) continue;
            // If the file grew, only JSON after this primitive should have moved it.
            int adjusted = off;
            if (grown != 0) {
                int delta = 0;
                for (int packedAt : groups.keySet()) {
                    if (packedAt < off) {
                        // this group sits before the primitive; compute new vs old json length
                        delta += groupDelta(original, groups.get(packedAt));
                    }
                }
                adjusted = off + delta;
            }
            writePrimitive(out, field, adjusted);
        }
        return out;
    }

    private static int groupDelta(byte[] original, List<SaveText.Field> group) {
        if (group == null || group.isEmpty()) return 0;
        SaveText.Field any = group.get(0);
        int oldLen = readPacked(original, any.packedAt);
        int newLen = oldLen;
        List<SaveText.Field> ordered = new ArrayList<SaveText.Field>(group);
        ordered.sort((a, b) -> Integer.compare(b.start, a.start));
        for (SaveText.Field field : ordered) {
            newLen += field.replacement.getBytes(StandardCharsets.US_ASCII).length - (field.end - field.start);
        }
        return packedSize(newLen) + newLen - (packedSize(oldLen) + oldLen);
    }

    private static byte[] spliceJsonGroup(byte[] data, List<SaveText.Field> group) {
        if (group == null || group.isEmpty()) return data;
        SaveText.Field any = group.get(0);
        int packedAt = any.packedAt;
        int jsonStart = any.jsonStart;
        int jsonEnd = any.jsonEnd;
        if (packedAt < 0 || jsonStart < 0 || jsonEnd > data.length) return data;
        byte[] json = new byte[jsonEnd - jsonStart];
        System.arraycopy(data, jsonStart, json, 0, json.length);
        List<SaveText.Field> ordered = new ArrayList<SaveText.Field>(group);
        ordered.sort((a, b) -> Integer.compare(b.start, a.start));
        for (SaveText.Field field : ordered) {
            int from = field.start - jsonStart;
            int to = field.end - jsonStart;
            if (from < 0 || to > json.length || from > to) continue;
            byte[] rep = field.replacement.getBytes(StandardCharsets.US_ASCII);
            json = splice(json, from, to, rep);
        }
        int oldPackedSize = packedSize(readPacked(data, packedAt));
        byte[] packed = writePacked(json.length);
        byte[] prefix = new byte[packedAt];
        System.arraycopy(data, 0, prefix, 0, packedAt);
        byte[] suffix = new byte[data.length - jsonEnd];
        System.arraycopy(data, jsonEnd, suffix, 0, suffix.length);
        return concat(prefix, packed, json, suffix);
    }

    private static void writePrimitive(byte[] data, SaveText.Field field, int off) {
        if (off < 0) return;
        String typed = field.replacement.trim();
        try {
            if ("float".equals(field.valueType)) {
                if (off + 4 > data.length) return;
                float v = Float.parseFloat(typed);
                int bits = Float.floatToIntBits(v);
                writeInt32(data, off, bits);
            } else if ("long".equals(field.valueType)) {
                if (off + 8 > data.length) return;
                long v = Long.parseLong(typed);
                writeInt32(data, off, (int) (v & 0xffffffffL));
                writeInt32(data, off + 4, (int) (v >> 32));
            } else {
                if (off + 4 > data.length) return;
                long v = Long.parseLong(typed);
                if (v > Integer.MAX_VALUE) v = Integer.MAX_VALUE;
                if (v < Integer.MIN_VALUE) v = Integer.MIN_VALUE;
                writeInt32(data, off, (int) v);
            }
        } catch (NumberFormatException ignored) {
            /* leave the original bytes */
        }
    }

    private static void extractClassPrimitives(byte[] bytes, List<SaveText.Field> fields) {
        int i = 0;
        while (i < bytes.length - 10) {
            if (bytes[i] != 5) {
                i++;
                continue;
            }
            int start = i;
            try {
                i++;
                int objectId = readInt32(bytes, i); i += 4;
                String className = readString(bytes, i);
                i = skipString(bytes, i);
                int count = readInt32(bytes, i); i += 4;
                if (count < 1 || count > 80) {
                    i = start + 1;
                    continue;
                }
                String[] names = new String[count];
                boolean interesting = false;
                for (int n = 0; n < count; n++) {
                    names[n] = readString(bytes, i);
                    i = skipString(bytes, i);
                    if (currencyMember(names[n])) interesting = true;
                }
                int[] btypes = new int[count];
                for (int n = 0; n < count; n++) btypes[n] = bytes[i++] & 0xff;
                int[] primCodes = new int[count];
                for (int n = 0; n < count; n++) {
                    int bt = btypes[n];
                    if (bt == 0 || bt == 7) {
                        primCodes[n] = bytes[i++] & 0xff;
                    } else if (bt == 3) {
                        i = skipString(bytes, i);
                    } else if (bt == 4) {
                        i = skipString(bytes, i);
                        i += 4;
                    }
                }
                i += 4; // library id
                if (!interesting) continue;
                readPrimitiveValues(bytes, i, names, btypes, primCodes, fields);
            } catch (IndexOutOfBoundsException e) {
                i = start + 1;
            }
        }
    }

    private static void readPrimitiveValues(byte[] bytes, int valueStart, String[] names,
                                           int[] btypes, int[] primCodes, List<SaveText.Field> fields) {
        int leading = 0;
        while (leading < names.length && btypes[leading] == 0) leading++;
        if (leading == 0) return;
        int nextString = findStringRecord(bytes, valueStart);
        boolean compact = shouldUseFourByte(primCodes, leading, valueStart, nextString);
        int i = valueStart;
        for (int n = 0; n < leading; n++) {
            String name = names[n];
            int code = primCodes[n];
            int width = compact ? 4 : widthOf(code);
            if (i + width > bytes.length) break;
            if (currencyMember(name)) {
                String literal;
                String type;
                if (compact && code == 11 || compact && code == 10 || !compact && code == 10) {
                    float v = Float.intBitsToFloat(readInt32(bytes, i));
                    literal = trimFloat(v);
                    type = "float";
                    width = 4;
                } else if (!compact && (code == 8 || code == 11 || code == 12 || code == 15)) {
                    long v = readInt64(bytes, i);
                    literal = Long.toString(v);
                    type = "long";
                } else {
                    int v = readInt32(bytes, i);
                    literal = Integer.toString(v);
                    type = "int";
                    width = 4;
                }
                // Skip obvious junk dates / huge ticks if a field like date slipped in
                if (!name.toLowerCase(Locale.US).contains("date") && !name.toLowerCase(Locale.US).contains("time")
                        && !name.toLowerCase(Locale.US).contains("ticks")) {
                    SaveText.Field field = SaveText.makeField(name, name, "", literal, i, i + width);
                    field.binaryOffset = i;
                    field.valueType = type;
                    if (field.confidence < 90) field.confidence = 90;
                    fields.add(field);
                }
            }
            i += width;
        }
    }

    private static boolean shouldUseFourByte(int[] primCodes, int leading, int valueStart, int nextString) {
        int eight = 0;
        for (int n = 0; n < leading; n++) eight += widthOf(primCodes[n]);
        if (nextString < 0) return eight > 4 * leading;
        int room = nextString - valueStart;
        return eight > room && 4 * leading <= room;
    }

    private static int widthOf(int code) {
        if (code == 1 || code == 2 || code == 9) return 1;
        if (code == 3 || code == 6 || code == 13) return 2;
        if (code == 5 || code == 8 || code == 11 || code == 12 || code == 15) return 8;
        if (code == 4) return 16;
        return 4;
    }

    private static void extractJsonBlobs(byte[] bytes, List<SaveText.Field> fields) {
        int i = 0;
        int booster = 0;
        while (i < bytes.length - 6) {
            if (bytes[i] != 6) {
                i++;
                continue;
            }
            int rec = i;
            try {
                int packedAt = rec + 5;
                int len = readPacked(bytes, packedAt);
                int packedBytes = packedSizeAt(bytes, packedAt);
                int jsonStart = packedAt + packedBytes;
                if (len < 5 || len > 20000 || jsonStart + len > bytes.length) {
                    i = rec + 1;
                    continue;
                }
                if (bytes[jsonStart] != '{') {
                    i = rec + 1;
                    continue;
                }
                String json = new String(bytes, jsonStart, len, StandardCharsets.UTF_8);
                if (!json.endsWith("}")) {
                    i = rec + 1;
                    continue;
                }
                if (skipJson(json)) {
                    i = jsonStart + len;
                    continue;
                }
                List<SaveText.Field> found = SaveText.parseJsonFields(json);
                if (found.isEmpty()) {
                    i = jsonStart + len;
                    continue;
                }
                String parent = jsonParent(json, booster);
                if (parent.startsWith("Booster")) booster++;
                for (SaveText.Field field : found) {
                    if (ignoreJsonKey(field.key, json)) continue;
                    String path;
                    String key;
                    String parentKey;
                    if ("coins".equals(parent) && "amount".equalsIgnoreCase(field.key)) {
                        path = "Coins.amount";
                        key = "coins";
                        parentKey = "coins";
                    } else if (parent.startsWith("Booster") && "amount".equalsIgnoreCase(field.key)) {
                        path = parent + ".Amount";
                        key = "booster";
                        parentKey = "boosters";
                    } else if ("Lives".equals(parent) && "LivesCount".equals(field.key)) {
                        path = "Lives.LivesCount";
                        key = "lives";
                        parentKey = "lives";
                    } else {
                        continue;
                    }
                    SaveText.Field copy = SaveText.makeField(path, key, parentKey, field.literal,
                            jsonStart + field.start, jsonStart + field.end);
                    if (copy.confidence < 90) copy.confidence = 90;
                    if ("other".equals(copy.role)) copy = reRole(copy, "money", 90);
                    copy.valueType = "ascii";
                    copy.packedAt = packedAt;
                    copy.jsonStart = jsonStart;
                    copy.jsonEnd = jsonStart + len;
                    fields.add(copy);
                }
                i = jsonStart + len;
            } catch (Exception e) {
                i = rec + 1;
            }
        }
    }

    private static SaveText.Field reRole(SaveText.Field field, String role, int confidence) {
        SaveText.Field next = new SaveText.Field(field.path, field.key, role, field.lockOff,
                field.literal, field.start, field.end);
        next.confidence = confidence;
        next.valueType = field.valueType;
        next.packedAt = field.packedAt;
        next.jsonStart = field.jsonStart;
        next.jsonEnd = field.jsonEnd;
        next.warning = field.warning;
        return next;
    }

    private static String jsonParent(String json, int booster) {
        String compact = json.replaceAll("\\s+", "");
        if (compact.contains("\"LivesCount\"")) return "Lives";
        if (compact.contains("\"Amount\":") && compact.contains("\"IsUnlocked\"")) return "Booster " + (booster + 1);
        if (compact.contains("\"amount\":") && !compact.contains("\"IsUnlocked\"")
                && compact.indexOf(',') < 0) return "coins";
        return "";
    }

    private static boolean skipJson(String json) {
        String compact = json.replaceAll("\\s+", "");
        if (compact.contains("\"VolumeDatas\"") || compact.contains("\"AudioType\"")) return true;
        if (compact.contains("\"TimesPurchased\"") || compact.contains("\"FirstPurchase\"")) return true;
        if (compact.contains("\"ForcedAdDisabledUntil\"") || compact.contains("\"RewardCoinQuotaDate\"")) return true;
        if (compact.contains("\"previewUrl\"") || compact.contains("\"Entries\"")) return true;
        if (compact.contains("\"LastDailyCoinsClaimDate\"") || compact.contains("\"MaxReachedLevelIndex\"")) return true;
        if (compact.contains("\"PremiumUnlocked\"") || compact.contains("\"SelectedLevelIndex\"")) return true;
        if (compact.equals("{\"IsActive\":true}") || compact.equals("{\"IsActive\":false}")) return true;
        if (compact.equals("{\"value\":0}") || compact.equals("{\"value\":false}") || compact.equals("{\"value\":true}")) return true;
        return false;
    }

    private static boolean ignoreJsonKey(String key, String json) {
        String lower = key.toLowerCase(Locale.US);
        if (lower.contains("date") || lower.contains("unix") || lower.contains("ticks") || lower.contains("binary")) {
            return true;
        }
        return false;
    }

    private static boolean currencyMember(String name) {
        if (name == null) return false;
        String lower = name.toLowerCase(Locale.US);
        return lower.contains("cion") || lower.contains("coin") || lower.contains("diamond")
                || lower.contains("gem") || lower.contains("hint") || lower.contains("undo")
                || lower.contains("refresh") || lower.contains("remove") || lower.contains("shuffle")
                || lower.contains("prop") || lower.contains("gold") || lower.contains("cash")
                || lower.contains("life") || lower.contains("energy");
    }

    private static String trimFloat(float v) {
        if (v == Math.rint(v) && Math.abs(v) < 1e15f) return Integer.toString((int) v);
        return Float.toString(v);
    }

    private static int findStringRecord(byte[] bytes, int from) {
        for (int i = from; i < bytes.length - 6; i++) {
            if (bytes[i] != 6) continue;
            try {
                int packedAt = i + 5;
                int len = readPacked(bytes, packedAt);
                int start = packedAt + packedSizeAt(bytes, packedAt);
                if (len < 1 || start + len > bytes.length) continue;
                int c = bytes[start] & 0xff;
                if (c >= 32 && c < 127) return i;
            } catch (Exception ignored) {
                /* not a string record */
            }
        }
        return -1;
    }

    private static String readString(byte[] bytes, int i) {
        int n = readPacked(bytes, i);
        int size = packedSizeAt(bytes, i);
        return new String(bytes, i + size, n, StandardCharsets.UTF_8);
    }

    private static int skipString(byte[] bytes, int i) {
        int n = readPacked(bytes, i);
        return i + packedSizeAt(bytes, i) + n;
    }

    static int readPacked(byte[] bytes, int i) {
        int n = 0;
        int shift = 0;
        while (i < bytes.length) {
            int b = bytes[i++] & 0xff;
            n |= (b & 0x7f) << shift;
            if ((b & 0x80) == 0) return n;
            shift += 7;
        }
        throw new IndexOutOfBoundsException();
    }

    static int packedSizeAt(byte[] bytes, int i) {
        int size = 0;
        while (i + size < bytes.length) {
            size++;
            if ((bytes[i + size - 1] & 0x80) == 0) return size;
        }
        throw new IndexOutOfBoundsException();
    }

    static int packedSize(int value) {
        int size = 1;
        int v = value;
        while (v > 0x7f) {
            v >>= 7;
            size++;
        }
        return size;
    }

    static byte[] writePacked(int value) {
        if (value < 0) value = 0;
        byte[] tmp = new byte[5];
        int n = 0;
        int v = value;
        while (v > 0x7f) {
            tmp[n++] = (byte) ((v & 0x7f) | 0x80);
            v >>= 7;
        }
        tmp[n++] = (byte) v;
        byte[] out = new byte[n];
        System.arraycopy(tmp, 0, out, 0, n);
        return out;
    }

    static int readInt32(byte[] bytes, int i) {
        return (bytes[i] & 0xff)
                | ((bytes[i + 1] & 0xff) << 8)
                | ((bytes[i + 2] & 0xff) << 16)
                | ((bytes[i + 3] & 0xff) << 24);
    }

    static long readInt64(byte[] bytes, int i) {
        return (readInt32(bytes, i) & 0xffffffffL) | ((long) readInt32(bytes, i + 4) << 32);
    }

    static void writeInt32(byte[] bytes, int i, int v) {
        bytes[i] = (byte) (v & 0xff);
        bytes[i + 1] = (byte) ((v >> 8) & 0xff);
        bytes[i + 2] = (byte) ((v >> 16) & 0xff);
        bytes[i + 3] = (byte) ((v >> 24) & 0xff);
    }

    static byte[] splice(byte[] data, int from, int to, byte[] insert) {
        byte[] out = new byte[data.length - (to - from) + insert.length];
        System.arraycopy(data, 0, out, 0, from);
        System.arraycopy(insert, 0, out, from, insert.length);
        System.arraycopy(data, to, out, from + insert.length, data.length - to);
        return out;
    }

    static byte[] concat(byte[]... parts) {
        int n = 0;
        for (byte[] part : parts) n += part.length;
        byte[] out = new byte[n];
        int i = 0;
        for (byte[] part : parts) {
            System.arraycopy(part, 0, out, i, part.length);
            i += part.length;
        }
        return out;
    }
}
