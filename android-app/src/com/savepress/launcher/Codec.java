package com.savepress.launcher;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/** Supercent stores the save name and body as base64 of UTF-16 text. */
public final class Codec {
    private Codec() {}

    public static String logicalName(String fileName) {
        if (fileName == null) return "";
        int slash = Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\'));
        String base = slash >= 0 ? fileName.substring(slash + 1) : fileName;
        String text = utf16(base);
        if (text == null) return base;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c < 32 || c > 126) return base;
        }
        return text;
    }

    public static String encodeName(String logical) {
        return Base64.getEncoder().encodeToString(logical.getBytes(StandardCharsets.UTF_16LE));
    }

    public static String decodeBody(byte[] data) {
        if (data == null || data.length < 4 || data.length > 1_500_000) return null;
        String asText;
        try {
            asText = new String(data, StandardCharsets.US_ASCII).trim();
        } catch (Exception e) {
            return null;
        }
        if (!looksB64(asText)) return null;
        String text = utf16(asText);
        if (text == null) return null;
        String trimmed = text.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.matches("-?\\d+")) return text;
        return null;
    }

    public static byte[] encodeBody(String text) {
        return Base64.getEncoder().encode(text.getBytes(StandardCharsets.UTF_16LE));
    }

    private static String utf16(String base64) {
        try {
            String padded = base64;
            while (padded.length() % 4 != 0) padded += "=";
            byte[] raw = Base64.getDecoder().decode(padded);
            if (raw.length < 2 || raw.length % 2 != 0) return null;
            return new String(raw, StandardCharsets.UTF_16LE);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static boolean looksB64(String value) {
        if (value.length() < 4 || value.length() > 2_000_000) return false;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            boolean ok = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')
                    || c == '+' || c == '/' || c == '=';
            if (!ok) return false;
        }
        return true;
    }
}
