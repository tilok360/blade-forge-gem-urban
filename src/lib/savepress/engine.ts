export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

export type Format = "json" | "prefs" | "pairs" | "text" | "binary";
export type PrefTag = "int" | "long" | "float" | "boolean" | "string";
export type Role = "money" | "unlock" | "upgrade" | "other";

export type Leaf = {
  path: string;
  key: string;
  role: Role;
  /** True when an unlock field should be turned off (locked / sealed). */
  lockOff: boolean;
  value: number | boolean;
};

export type Loaded = {
  name: string;
  format: Format;
  originalText: string;
  data: Json | null;
  tags: Record<string, PrefTag>;
  binaryPreview?: string;
  byteLength?: number;
};

export type StampSettings = {
  money: boolean;
  unlocks: boolean;
  upgrades: boolean;
  maxMoney: number;
  maxLevel: number;
};

export type RecipeEdit = {
  path: string;
  key: string;
  value: number | boolean;
};

const MAX_LEAVES = 4000;

const MONEY = new Set([
  "gold",
  "coin",
  "coins",
  "money",
  "cash",
  "gem",
  "gems",
  "credit",
  "credits",
  "diamond",
  "diamonds",
  "token",
  "tokens",
  "silver",
  "buck",
  "bucks",
  "dollar",
  "dollars",
  "currency",
  "ruby",
  "rubies",
  "emerald",
  "emeralds",
  "soul",
  "souls",
  "oro",
  "dinero",
  "moneda",
  "monedas",
  "gema",
  "gemas",
  "argent",
  "gemme",
  "gemmes",
  "geld",
  "muenzen",
  "munzen",
  "balance",
  "funds",
]);

const MONEY_PARENT = new Set([
  "wallet",
  "purse",
  "bank",
  "currency",
  "money",
  "cash",
  "coins",
  "coin",
  "gold",
  "gems",
  "gem",
  "credits",
  "credit",
]);

const AMOUNT = new Set(["amount", "value", "count", "qty", "quantity", "bal", "balance"]);
const UNLOCK_ON = new Set([
  "unlocked",
  "owned",
  "purchased",
  "bought",
  "available",
  "opened",
  "complete",
  "completed",
]);
const UNLOCK_OFF = new Set(["locked", "sealed"]);
const UPGRADE = new Set([
  "level",
  "lvl",
  "upgrade",
  "rank",
  "tier",
  "star",
  "stars",
  "skill",
  "power",
]);

export function sampleSave(): Json {
  return {
    purse: { coins: 40, gems: 2 },
    stalls: {
      spice: { unlocked: false },
      lantern: { unlocked: false },
      river: { unlocked: false },
    },
    gear: {
      kettle: { level: 1 },
      awning: { level: 1 },
      lockbox: { level: 0, locked: true },
    },
    day: 3,
  };
}

export const SAMPLE_TEXT = `${JSON.stringify(sampleSave(), null, 2)}\n`;

export const SAMPLE_RECIPES: {
  id: string;
  title: string;
  note: string;
  edits: RecipeEdit[];
}[] = [
  {
    id: "max_money",
    title: "Max money",
    note: "Coins and gems to 9,999,999",
    edits: [
      { path: "purse.coins", key: "coins", value: 9_999_999 },
      { path: "purse.gems", key: "gems", value: 9_999_999 },
    ],
  },
  {
    id: "unlock",
    title: "Unlock stalls",
    note: "Opens every stall and the lockbox",
    edits: [
      { path: "stalls.spice.unlocked", key: "unlocked", value: true },
      { path: "stalls.lantern.unlocked", key: "unlocked", value: true },
      { path: "stalls.river.unlocked", key: "unlocked", value: true },
      { path: "gear.lockbox.locked", key: "locked", value: false },
    ],
  },
  {
    id: "max_gear",
    title: "Max gear",
    note: "Kettle, awning, and lockbox to level 10",
    edits: [
      { path: "gear.kettle.level", key: "level", value: 10 },
      { path: "gear.awning.level", key: "level", value: 10 },
      { path: "gear.lockbox.level", key: "level", value: 10 },
    ],
  },
  {
    id: "works",
    title: "The works",
    note: "Money, stalls, and gear in one stamp",
    edits: [
      { path: "purse.coins", key: "coins", value: 9_999_999 },
      { path: "purse.gems", key: "gems", value: 9_999_999 },
      { path: "stalls.spice.unlocked", key: "unlocked", value: true },
      { path: "stalls.lantern.unlocked", key: "unlocked", value: true },
      { path: "stalls.river.unlocked", key: "unlocked", value: true },
      { path: "gear.lockbox.locked", key: "locked", value: false },
      { path: "gear.kettle.level", key: "level", value: 10 },
      { path: "gear.awning.level", key: "level", value: 10 },
      { path: "gear.lockbox.level", key: "level", value: 10 },
    ],
  },
];

export function tokensOf(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.toLowerCase())
    .filter(Boolean);
}

export function classify(key: string, parentKey: string, value: number | boolean): {
  role: Role;
  lockOff: boolean;
} {
  const tokens = tokensOf(key);
  const parent = tokensOf(parentKey);
  const money =
    tokens.some((token) => MONEY.has(token)) ||
    (tokens.some((token) => AMOUNT.has(token)) && parent.some((token) => MONEY_PARENT.has(token)));
  if (money && typeof value === "number") return { role: "money", lockOff: false };

  if (tokens.some((token) => UNLOCK_ON.has(token))) {
    return { role: "unlock", lockOff: false };
  }
  if (tokens.some((token) => UNLOCK_OFF.has(token))) {
    return { role: "unlock", lockOff: true };
  }
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100_000 &&
    tokens.some((token) => UPGRADE.has(token))
  ) {
    return { role: "upgrade", lockOff: false };
  }
  return { role: "other", lockOff: false };
}

export function collect(data: Json): { leaves: Leaf[]; truncated: boolean } {
  const leaves: Leaf[] = [];
  let truncated = false;

  const walk = (node: Json, path: string, key: string, parentKey: string) => {
    if (truncated) return;
    if (typeof node === "number" && Number.isFinite(node)) {
      const found = classify(key, parentKey, node);
      leaves.push({ path, key, value: node, ...found });
    } else if (typeof node === "boolean") {
      const found = classify(key, parentKey, node);
      leaves.push({ path, key, value: node, ...found });
    } else if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        if (leaves.length >= MAX_LEAVES) {
          truncated = true;
          return;
        }
        walk(node[i], `${path}[${i}]`, String(i), key);
      }
    } else if (node && typeof node === "object") {
      for (const [childKey, child] of Object.entries(node)) {
        if (leaves.length >= MAX_LEAVES) {
          truncated = true;
          return;
        }
        const childPath = path ? `${path}.${childKey}` : childKey;
        walk(child, childPath, childKey, key);
      }
    }
  };

  walk(data, "", "", "");
  return { leaves, truncated };
}

export function suggest(leaf: Leaf, settings: StampSettings): number | boolean | undefined {
  if (leaf.role === "money" && settings.money && typeof leaf.value === "number") {
    if (leaf.value < 0 || leaf.value > 1e14) return undefined;
    if (leaf.value >= settings.maxMoney) return undefined;
    return settings.maxMoney;
  }
  if (leaf.role === "unlock" && settings.unlocks) {
    if (typeof leaf.value === "boolean") return leaf.lockOff ? false : true;
    if (leaf.value === 0 || leaf.value === 1) return leaf.lockOff ? 0 : 1;
  }
  if (leaf.role === "upgrade" && settings.upgrades && typeof leaf.value === "number") {
    if (leaf.value >= settings.maxLevel) return undefined;
    return settings.maxLevel;
  }
  return undefined;
}

export function planStamp(leaves: Leaf[], settings: StampSettings): Record<string, number | boolean> {
  const overrides: Record<string, number | boolean> = {};
  for (const leaf of leaves) {
    const next = suggest(leaf, settings);
    if (next === undefined || next === leaf.value) continue;
    overrides[leaf.path] = next;
  }
  return overrides;
}

type Seg = string | number;

export function parsePath(path: string): Seg[] {
  const out: Seg[] = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(path))) {
    if (match[1] !== undefined) out.push(match[1]);
    else out.push(Number(match[2]));
  }
  return out;
}

export function setPath(root: Json, path: string, value: Json): boolean {
  const segs = parsePath(path);
  if (segs.length === 0) return false;
  let cur: Json = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i];
    if (typeof seg === "number") {
      if (!Array.isArray(cur) || cur[seg] == null) return false;
      cur = cur[seg];
    } else {
      if (!cur || typeof cur !== "object" || Array.isArray(cur)) return false;
      if (!(seg in cur)) return false;
      cur = cur[seg];
    }
  }
  const last = segs[segs.length - 1];
  if (typeof last === "number") {
    if (!Array.isArray(cur)) return false;
    cur[last] = value;
    return true;
  }
  if (!cur || typeof cur !== "object" || Array.isArray(cur)) return false;
  cur[last] = value;
  return true;
}

export function withOverrides(data: Json, overrides: Record<string, number | boolean>): Json {
  const next = structuredClone(data);
  for (const [path, value] of Object.entries(overrides)) setPath(next, path, value);
  return next;
}

export function isBinary(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 8000);
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return true;
  return false;
}

export function hexPreview(bytes: Uint8Array, max = 192): string {
  const n = Math.min(bytes.length, max);
  const lines: string[] = [];
  for (let i = 0; i < n; i += 16) {
    const slice = bytes.subarray(i, Math.min(i + 16, n));
    const hex = [...slice].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const ascii = [...slice]
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
      .join("");
    lines.push(`${i.toString(16).padStart(4, "0")}  ${hex.padEnd(47, " ")}  ${ascii}`);
  }
  if (bytes.length > max) lines.push(`… ${bytes.length - max} more bytes`);
  return lines.join("\n");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&" + "amp;")
    .replaceAll("<", "&" + "lt;")
    .replaceAll(">", "&" + "gt;")
    .replaceAll('"', "&" + "quot;")
    .replaceAll("'", "&" + "apos;");
}

function unescapeXml(value: string): string {
  return value
    .replaceAll("&" + "amp;", "&")
    .replaceAll("&" + "lt;", "<")
    .replaceAll("&" + "gt;", ">")
    .replaceAll("&" + "quot;", '"')
    .replaceAll("&" + "apos;", "'");
}

function parsePrefs(text: string): { data: Json; tags: Record<string, PrefTag> } | null {
  if (!/<map[\s>]/i.test(text)) return null;
  const data: { [key: string]: Json } = {};
  const tags: Record<string, PrefTag> = {};
  const re = /<(int|long|float|boolean|string)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/gi;
  let match: RegExpExecArray | null;
  let found = 0;
  while ((match = re.exec(text))) {
    const tag = match[1].toLowerCase() as PrefTag;
    const attrs = match[2] ?? "";
    const nameMatch = attrs.match(/\bname\s*=\s*"([^"]*)"/);
    if (!nameMatch) continue;
    const name = unescapeXml(nameMatch[1]);
    const valueAttr = attrs.match(/\bvalue\s*=\s*"([^"]*)"/);
    const raw = valueAttr ? unescapeXml(valueAttr[1]) : unescapeXml(match[3] ?? "");
    tags[name] = tag;
    if (tag === "boolean") data[name] = raw === "true";
    else if (tag === "string") data[name] = raw;
    else {
      const num = Number(raw);
      data[name] = Number.isFinite(num) ? num : raw;
    }
    found++;
  }
  if (found === 0) return null;
  return { data, tags };
}

function parsePairs(text: string): Json | null {
  const lines = text.split(/\r?\n/);
  const data: { [key: string]: Json } = {};
  let matched = 0;
  let filled = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
    filled++;
    const match = trimmed.match(/^([A-Za-z_][\w.-]*)\s*[=:]\s*(.*)$/);
    if (!match) continue;
    matched++;
    data[match[1]] = coerceScalar(match[2].trim());
  }
  if (filled < 2 || matched / filled < 0.8) return null;
  return data;
}

function coerceScalar(raw: string): Json {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const num = Number(raw);
    if (Number.isFinite(num)) return num;
  }
  return raw;
}

export function parseText(name: string, text: string): Loaded {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const data = JSON.parse(trimmed) as Json;
      return { name, format: "json", originalText: text, data, tags: {} };
    } catch {
      /* fall through */
    }
  }
  const prefs = parsePrefs(text);
  if (prefs) {
    return {
      name,
      format: "prefs",
      originalText: text,
      data: prefs.data,
      tags: prefs.tags,
    };
  }
  const pairs = parsePairs(text);
  if (pairs) {
    return { name, format: "pairs", originalText: text, data: pairs, tags: {} };
  }
  return { name, format: "text", originalText: text, data: null, tags: {} };
}

function serializePrefs(data: Json, tags: Record<string, PrefTag>): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("This preferences file can't be rebuilt.");
  }
  const lines = ["<?xml version='1.0' encoding='utf-8' standalone='yes' ?>", "<map>"];
  for (const [name, value] of Object.entries(data)) {
    const tag =
      tags[name] ??
      (typeof value === "boolean"
        ? "boolean"
        : typeof value === "string"
          ? "string"
          : Number.isInteger(value)
            ? "int"
            : "float");
    if (tag === "string") {
      lines.push(`    <string name="${escapeXml(name)}">${escapeXml(String(value))}</string>`);
    } else {
      const printed = typeof value === "boolean" ? String(value) : String(value);
      lines.push(`    <${tag} name="${escapeXml(name)}" value="${escapeXml(printed)}" />`);
    }
  }
  lines.push("</map>", "");
  return lines.join("\n");
}

function serializePairs(data: Json): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("This key list can't be rebuilt.");
  }
  const lines = Object.entries(data).map(([key, value]) => `${key}=${String(value)}`);
  return `${lines.join("\n")}\n`;
}

export function serialize(loaded: Pick<Loaded, "format" | "tags">, data: Json): string {
  if (loaded.format === "prefs") return serializePrefs(data, loaded.tags);
  if (loaded.format === "pairs") return serializePairs(data);
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function countRoles(leaves: Leaf[]): Record<Role, number> {
  return {
    money: leaves.filter((leaf) => leaf.role === "money").length,
    unlock: leaves.filter((leaf) => leaf.role === "unlock").length,
    upgrade: leaves.filter((leaf) => leaf.role === "upgrade").length,
    other: leaves.filter((leaf) => leaf.role === "other").length,
  };
}
