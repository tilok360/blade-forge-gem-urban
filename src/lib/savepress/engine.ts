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
export type PrefStyle = "android" | "unity";
export type BlobKind = "json-string" | "base64" | "url";
export type Wrap = "b64-utf16" | "b64-utf8";

export type Encoding = {
  path: string;
  kind: BlobKind;
};

export type BinaryHit = {
  path: string;
  key: string;
  offset: number;
  width: 4 | 8;
  littleEndian: boolean;
  value: number;
};

export type Leaf = {
  path: string;
  key: string;
  role: Role;
  /** True when an unlock field should be turned off (locked / sealed). */
  lockOff: boolean;
  value: number | boolean;
  /** Original value was a numeric string and should be written back as a string. */
  stringly?: boolean;
  /** 0–100. Money candidates are ranked by this. */
  confidence: number;
  /** Sibling checksum/hash, or a reason the edit may not stick. */
  warning?: string;
  tag?: PrefTag;
};

export type Loaded = {
  name: string;
  format: Format;
  originalText: string;
  data: Json | null;
  tags: Record<string, PrefTag>;
  encodings?: Encoding[];
  prefStyle?: PrefStyle;
  wrap?: Wrap;
  warnings?: string[];
  encrypted?: boolean;
  writable?: boolean;
  binaryPreview?: string;
  byteLength?: number;
  originalBytes?: Uint8Array;
  binaryHits?: BinaryHit[];
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

/** Safe default for int32 money fields. Never write past 2147483647. */
export const SAFE_MONEY = 999_999_999;
export const INT32_MAX = 2_147_483_647;

const CHECKSUM_WARNING =
  "This field has a checksum or hash next to it. Changing the amount may not stick until the hash is updated too.";

const MONEY_CORE = new Set([
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
  "crystal",
  "crystals",
  "jewel",
  "jewels",
  "pearl",
  "pearls",
  "essence",
  "shard",
  "shards",
  "orb",
  "orbs",
  "premium",
  "wallet",
  "bank",
  "savings",
  "balance",
  "funds",
  "softcurrency",
  "hardcurrency",
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
  "chip",
  "chips",
  "coinage",
  "wealth",
  "riches",
  "bankroll",
  "purse",
  "treasury",
  "ingot",
  "ingots",
  "ore",
  "ores",
  "mineral",
  "minerals",
]);

const MONEY_SOFT = new Set([
  "star",
  "stars",
  "ticket",
  "tickets",
  "key",
  "keys",
  "heart",
  "hearts",
  "life",
  "lives",
  "energy",
  "stamina",
  "point",
  "points",
  "score",
  "sc",
  "hc",
  "flower",
  "flowers",
  "hint",
  "undo",
  "refresh",
  "shuffle",
  "shuffer",
  "brush",
  "boom",
  "bomb",
  "hammer",
  "wand",
  "magnet",
  "cannon",
  "tip",
  "booster",
  "boosters",
]);

const MONEY_PARENT = new Set([
  ...MONEY_CORE,
  "currencies",
  "tickets",
  "keys",
  "stars",
  "hearts",
  "lives",
  "energy",
  "stamina",
  "points",
  "flower",
  "flowers",
  "hint",
  "undo",
  "refresh",
  "shuffle",
  "brush",
  "booster",
  "boosters",
  "inventory",
  "items",
]);

const AMOUNT = new Set([
  "amount",
  "value",
  "count",
  "qty",
  "quantity",
  "bal",
  "balance",
  "total",
  "num",
  "number",
]);

const QUALIFIER = new Set([
  "m",
  "player",
  "my",
  "current",
  "total",
  "soft",
  "hard",
  "user",
  "account",
  "owned",
  "available",
  "global",
  "profile",
  "save",
  "data",
  "game",
  "user",
  "pref",
  "prefs",
]);

const REJECT = new Set([
  "cost",
  "price",
  "fee",
  "paid",
  "pay",
  "spend",
  "spent",
  "spending",
  "required",
  "require",
  "requirement",
  "needed",
  "need",
  "needs",
  "reward",
  "rewards",
  "rewarded",
  "payout",
  "drop",
  "loot",
  "id",
  "ids",
  "uid",
  "uuid",
  "guid",
  "index",
  "idx",
  "timestamp",
  "time",
  "date",
  "datetime",
  "created",
  "updated",
  "modified",
  "version",
  "ver",
  "revision",
  "rev",
  "build",
  "hash",
  "checksum",
  "crc",
  "crc32",
  "md5",
  "sha",
  "sha1",
  "sha256",
  "signature",
  "sig",
  "digest",
  "integrity",
  "purchase",
  "purchased",
  "purchases",
  "bought",
  "max",
  "min",
  "cap",
  "limit",
  "capacity",
  "per",
  "rate",
  "multiplier",
  "mult",
  "earned",
  "given",
  "granted",
  "award",
  "awarded",
  "used",
  "usage",
  "consume",
  "consumed",
  "consumption",
  "initial",
  "default",
  "base",
  "start",
  "starting",
  "duration",
  "interval",
  "cooldown",
  "delay",
  "expiry",
  "expire",
  "ttl",
  "to",
  "from",
  "add",
  "added",
  "plus",
  "delta",
  "diff",
  "change",
  "gain",
  "gained",
  "high",
  "adcount",
  "impression",
  "impressions",
  "operation",
  "operations",
]);

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
const UPGRADE = new Set(["level", "lvl", "upgrade", "rank", "tier", "star", "skill", "power"]);

const CHECKSUM_NAME =
  /^(hash|checksum|crc|crc32|md5|sha|sha1|sha256|signature|sig|digest|integrity|savehash|checksumvalue)$/i;

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
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/_h[0-9a-fA-F]+$/g, "")
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.toLowerCase())
    .map((part) => (part === "cion" ? "coin" : part === "shuffer" ? "shuffle" : part))
    .filter(Boolean);
}

export function classify(
  key: string,
  parentKey: string,
  value: number | boolean,
): {
  role: Role;
  lockOff: boolean;
  confidence: number;
} {
  const tokens = tokensOf(key);
  const parent = tokensOf(parentKey);
  const rejected =
    tokens.some((token) => REJECT.has(token)) ||
    parent.some((token) =>
      ["cost", "price", "fee", "reward", "rewards", "rewarded", "payout"].includes(token),
    ) ||
    /adcount$/i.test(key.replace(/[^A-Za-z0-9]/g, ""));

  if (typeof value === "number" && Number.isFinite(value) && !rejected) {
    const money = moneyConfidence(tokens, parent, value);
    if (money) return { role: "money", lockOff: false, confidence: money };
  }

  if (tokens.some((token) => UNLOCK_ON.has(token))) {
    return { role: "unlock", lockOff: false, confidence: 90 };
  }
  if (tokens.some((token) => UNLOCK_OFF.has(token))) {
    return { role: "unlock", lockOff: true, confidence: 90 };
  }
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100_000 &&
    tokens.some((token) => UPGRADE.has(token) || token === "stars")
  ) {
    return { role: "upgrade", lockOff: false, confidence: 85 };
  }
  return { role: "other", lockOff: false, confidence: 0 };
}

function moneyConfidence(tokens: string[], parent: string[], value: number): number {
  const coreInKey = tokens.filter((token) => MONEY_CORE.has(token));
  const softInKey = tokens.filter((token) => MONEY_SOFT.has(token));
  const amountInKey = tokens.some((token) => AMOUNT.has(token));
  const parentMoney = parent.some((token) => MONEY_PARENT.has(token) || MONEY_SOFT.has(token));
  const prefix = tokens.some((token) => token === "sc" || token === "hc" || token === "cur");

  // "star" on its own is an upgrade rating, not a currency, unless a parent is a wallet.
  if (
    softInKey.includes("star") &&
    !softInKey.includes("stars") &&
    !coreInKey.length &&
    !amountInKey &&
    !parentMoney &&
    !prefix
  ) {
    return 0;
  }
  // Bare "stars" at 0–10 is usually a star rating.
  if (tokens.length === 1 && tokens[0] === "stars" && value <= 10 && !parentMoney) {
    return 0;
  }

  if (coreInKey.length) {
    if (tokens.length === 1) return 95;
    if (
      tokens.length === 2 &&
      (amountInKey || prefix || tokens.some((token) => QUALIFIER.has(token)))
    ) {
      return 92;
    }
    return 88;
  }
  if (amountInKey && parentMoney) return 85;
  if (prefix && (amountInKey || softInKey.length)) return 80;
  if (softInKey.length) {
    if (amountInKey || prefix || parentMoney) return 75;
    if (tokens.length === 1) return 70;
    return 62;
  }
  return 0;
}

function checksumWarning(key: string, siblings: string[]): string | undefined {
  const lower = key.toLowerCase();
  for (const sibling of siblings) {
    if (sibling === key) continue;
    const sl = sibling.toLowerCase();
    if (CHECKSUM_NAME.test(sibling)) return CHECKSUM_WARNING;
    if (
      sl === `${lower}hash` ||
      sl === `${lower}_hash` ||
      sl === `hash_${lower}` ||
      sl === `${lower}checksum` ||
      sl === `${lower}_checksum` ||
      sl === `checksum_${lower}` ||
      sl === `${lower}crc` ||
      sl === `${lower}_crc` ||
      sl === `${lower}sig` ||
      sl === `${lower}_sig`
    ) {
      return CHECKSUM_WARNING;
    }
  }
  return undefined;
}

function asNumericString(raw: string): number | null {
  if (!/^-?\d+(\.\d+)?$/.test(raw) || raw.length > 24) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export function collect(
  data: Json,
  opts?: { tags?: Record<string, PrefTag> },
): { leaves: Leaf[]; truncated: boolean } {
  const leaves: Leaf[] = [];
  let truncated = false;
  const tags = opts?.tags ?? {};

  const walk = (node: Json, path: string, key: string, parentKey: string, siblings: string[]) => {
    if (truncated) return;
    if (typeof node === "number" && Number.isFinite(node)) {
      let found = classify(key, parentKey, node);
      if (
        found.role !== "money" &&
        /^amount$/i.test(key) &&
        siblings.some((s) => /^item_id$/i.test(s))
      ) {
        found = { role: "money", lockOff: false, confidence: 75 };
      }
      leaves.push({
        path,
        key,
        value: node,
        warning: checksumWarning(key, siblings),
        tag: tags[path] ?? (path === key ? tags[key] : undefined),
        ...found,
      });
    } else if (typeof node === "boolean") {
      const found = classify(key, parentKey, node);
      leaves.push({
        path,
        key,
        value: node,
        warning: checksumWarning(key, siblings),
        tag: tags[path] ?? (path === key ? tags[key] : undefined),
        ...found,
      });
    } else if (typeof node === "string") {
      const num = asNumericString(node);
      if (num !== null) {
        const found = classify(key, parentKey, num);
        leaves.push({
          path,
          key,
          value: num,
          stringly: true,
          warning: checksumWarning(key, siblings),
          tag: tags[path] ?? (path === key ? tags[key] : undefined) ?? "string",
          ...found,
        });
      }
    } else if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        if (leaves.length >= MAX_LEAVES) {
          truncated = true;
          return;
        }
        walk(node[i], `${path}[${i}]`, String(i), key, []);
      }
    } else if (node && typeof node === "object") {
      const childKeys = Object.keys(node);
      const effectiveParent = /^\d+$/.test(key) ? parentKey : key;
      for (const [childKey, child] of Object.entries(node)) {
        if (leaves.length >= MAX_LEAVES) {
          truncated = true;
          return;
        }
        const childPath = path ? `${path}.${childKey}` : childKey;
        walk(child, childPath, childKey, effectiveParent, childKeys);
      }
    }
  };

  walk(data, "", "", "", data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data) : []);
  return { leaves, truncated };
}

export function moneyCap(leaf: Pick<Leaf, "tag" | "value">): number {
  if (leaf.tag === "long") return Math.min(1e15, Number.MAX_SAFE_INTEGER);
  if (typeof leaf.value === "number" && Number.isInteger(leaf.value) && Math.abs(leaf.value) > INT32_MAX) {
    return Math.min(1e15, Number.MAX_SAFE_INTEGER);
  }
  return SAFE_MONEY;
}

export function suggest(leaf: Leaf, settings: StampSettings): number | boolean | undefined {
  if (leaf.role === "money" && settings.money && typeof leaf.value === "number") {
    if (leaf.value < 0 || leaf.value > 1e14) return undefined;
    const wanted = Math.min(settings.maxMoney, moneyCap(leaf));
    if (leaf.value >= wanted) return undefined;
    return wanted;
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

function preserveType(old: Json, value: Json): Json {
  if (typeof old === "string" && (typeof value === "number" || typeof value === "boolean")) {
    return String(value);
  }
  return value;
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
    cur[last] = preserveType(cur[last], value);
    return true;
  }
  if (!cur || typeof cur !== "object" || Array.isArray(cur)) return false;
  cur[last] = preserveType(cur[last], value);
  return true;
}

export function getPath(root: Json, path: string): Json | undefined {
  const segs = parsePath(path);
  let cur: Json = root;
  for (const seg of segs) {
    if (typeof seg === "number") {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[seg];
    } else {
      if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
      cur = cur[seg];
    }
    if (cur === undefined) return undefined;
  }
  return cur;
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

export function confidenceLabel(confidence: number): string {
  if (confidence >= 85) return `High · ${confidence}%`;
  if (confidence >= 65) return `Medium · ${confidence}%`;
  return `Low · ${confidence}%`;
}
const FIELD_LABELS: Record<string, string> = {
  coin: "Coins",
  coins: "Coins",
  curcoin: "Coins",
  totalcoins: "Coins",
  roundcoin: "Round Cash",
  bigcoin: "Big Coins",
  userdata_bigcoin: "Big Coins",
  gem: "Gems",
  gems: "Gems",
  diamond: "Diamonds",
  diamonds: "Diamonds",
  totaldiamond: "Diamonds",
  gold: "Gold",
  cash: "Cash",
  money: "Money",
  pigmoney: "Piggy Bank",
  energy: "Energy",
  stamina: "Stamina",
  life: "Lives",
  lives: "Lives",
  heart: "Hearts",
  hearts: "Hearts",
  key: "Keys",
  keys: "Keys",
  star: "Stars",
  stars: "Stars",
  ticket: "Tickets",
  tickets: "Tickets",
  token: "Tokens",
  tokens: "Tokens",
  credit: "Credits",
  credits: "Credits",
  flower: "Flowers",
  flowers: "Flowers",
  crystal: "Crystals",
  crystals: "Crystals",
  jewel: "Jewels",
  jewels: "Jewels",
  hint: "Boosters: Hint",
  undo: "Boosters: Undo",
  refresh: "Boosters: Refresh",
  shuffle: "Boosters: Shuffle",
  brush: "Boosters: Brush",
  curbrush: "Boosters: Brush",
  boom: "Boosters: Bomb",
  bomb: "Boosters: Bomb",
  tip: "Boosters: Tip",
  hammer: "Boosters: Hammer",
  wand: "Boosters: Wand",
  magnet: "Boosters: Magnet",
  cannon: "Boosters: Cannon",
  remove: "Boosters: Remove",
  removeprop: "Boosters: Remove",
  hintprop: "Boosters: Hint",
  undoprop: "Boosters: Undo",
  refreshprop: "Boosters: Refresh",
  shufferpropcount: "Boosters: Shuffle",
  boompropcount: "Boosters: Bomb",
  tippropcount: "Boosters: Tip",
  offlinecoins: "Offline Coins",
  dailycoins: "Daily Coins",
};

const BOOSTER_WORDS = new Set([
  "hint",
  "undo",
  "refresh",
  "shuffle",
  "brush",
  "boom",
  "bomb",
  "tip",
  "hammer",
  "wand",
  "magnet",
  "cannon",
  "remove",
  "booster",
  "boosters",
]);

function titleWords(parts: string[]): string {
  return parts
    .filter((part) => part && !/^\d+$/.test(part))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function labelFromTokens(raw: string): string | undefined {
  const lower = raw.toLowerCase();
  const compact = tokensOf(raw).join("");
  if (FIELD_LABELS[lower]) return FIELD_LABELS[lower];
  if (FIELD_LABELS[compact]) return FIELD_LABELS[compact];
  for (const token of tokensOf(raw)) {
    if (FIELD_LABELS[token]) return FIELD_LABELS[token];
  }
  return undefined;
}

/** Friendly name for a field, e.g. "Coins" or "Boosters: Hammer". Uncertain guesses end with "(unsure)". */
export function fieldLabel(leaf: Pick<Leaf, "key" | "path" | "role" | "confidence">): string {
  const parts = leaf.path.split(/[.\[\]]+/).filter(Boolean);
  const parent = parts.length >= 2 ? parts[parts.length - 2] : "";
  let label = labelFromTokens(leaf.key);
  if (!label && (AMOUNT.has(leaf.key.toLowerCase()) || /^(value|amount|count|qty|quantity)$/i.test(leaf.key))) {
    label = labelFromTokens(parent) ?? (parent ? titleWords(tokensOf(parent)) : undefined);
  }
  if (!label) {
    const booster = tokensOf(leaf.key).find((token) => BOOSTER_WORDS.has(token));
    if (booster) label = `Boosters: ${titleWords([booster])}`;
  }
  if (!label) {
    const named = tokensOf(leaf.key).filter(
      (token) => !QUALIFIER.has(token) && !AMOUNT.has(token) && !/^\d+$/.test(token),
    );
    label = titleWords(named.length ? named : tokensOf(leaf.key)) || leaf.key;
  }
  const sure =
    (leaf.role === "money" && leaf.confidence >= 70) || leaf.role === "unlock" || leaf.role === "upgrade";
  const knownKey = Boolean(
    labelFromTokens(leaf.key) || (AMOUNT.has(leaf.key.toLowerCase()) && labelFromTokens(parent)),
  );
  if (!sure || !knownKey) return `${label} (unsure)`;
  return label;
}

/** Decode a save file name, including Unity UTF-16 base64 names like UserData_BigCoin. */
export function friendlyFileKey(name: string): string {
  const base = (name.split(/[/\\]/).pop() ?? name).replace(
    /\.(es3|json|txt|sav|dat|bak|bac|xml|db|pref|prefs)$/i,
    "",
  );
  if (looksBase64(base) || looksBase64(`${base.replace(/=+$/, "")}==`)) {
    const bytes = b64ToBytes(base);
    if (bytes && bytes.length >= 2 && bytes.length % 2 === 0) {
      try {
        const utf16 = new TextDecoder("utf-16le", { fatal: true }).decode(bytes).replace(/\0/g, "").trim();
        if (/^[A-Za-z][A-Za-z0-9_ ]{1,80}$/.test(utf16)) return utf16.replace(/\s+/g, "_");
      } catch {
        /* not a utf-16 name */
      }
    }
  }
  return base || "value";
}

export function isTelemetryName(name: string): boolean {
  const lower = name.toLowerCase();
  return /blackboard|voodoolive|analytics|appsflyer|firebase|crashlytics|session_data|tracks\.xml|remote-config|remoteconfig|device_info|device_installation/.test(
    lower,
  );
}

/** Turn Easy Save / JS-style JSON (unquoted keys, trailing commas) into strict JSON. */
export function relaxJson(text: string): string | null {
  const trimmed = text.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    /* try to repair */
  }
  let out = "";
  let i = 0;
  let inStr = false;
  let escape = false;
  const n = trimmed.length;
  while (i < n) {
    const c = trimmed[i];
    if (inStr) {
      out += c;
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inStr = false;
      i++;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
      i++;
      continue;
    }
    if (c === "/" && trimmed[i + 1] === "/") {
      i += 2;
      while (i < n && trimmed[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && trimmed[i + 1] === "*") {
      i += 2;
      while (i + 1 < n && !(trimmed[i] === "*" && trimmed[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === ",") {
      let j = i + 1;
      while (j < n && /\s/.test(trimmed[j])) j++;
      if (j < n && (trimmed[j] === "}" || trimmed[j] === "]")) {
        i++;
        continue;
      }
    }
    if (c === "{" || c === "," || c === "[") {
      out += c;
      i++;
      let j = i;
      while (j < n && /\s/.test(trimmed[j])) {
        out += trimmed[j];
        j++;
      }
      if (j < n && /[A-Za-z_0-9]/.test(trimmed[j])) {
        const start = j;
        if (/\d/.test(trimmed[j])) {
          while (j < n && /\d/.test(trimmed[j])) j++;
        } else {
          while (j < n && /[A-Za-z0-9_]/.test(trimmed[j])) j++;
        }
        let k = j;
        while (k < n && /\s/.test(trimmed[k])) k++;
        if (k < n && trimmed[k] === ":") {
          out += `"${trimmed.slice(start, j)}"${trimmed.slice(j, k)}`;
          i = k;
          continue;
        }
      }
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  try {
    JSON.parse(out);
    return out;
  } catch {
    return null;
  }
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

function parseAndroidPrefs(text: string): { data: Json; tags: Record<string, PrefTag> } | null {
  if (!/<map[\s>]/i.test(text) && !/<(int|long|float|boolean|string)\b/i.test(text)) return null;
  // Unity files use <pref>, not this path.
  if (/<unity_prefs[\s>]/i.test(text) || /<pref\s/i.test(text)) return null;
  const data: { [key: string]: Json } = {};
  const tags: Record<string, PrefTag> = {};
  const re = /<(int|long|float|double|boolean|string)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/gi;
  let match: RegExpExecArray | null;
  let found = 0;
  while ((match = re.exec(text))) {
    let tag = match[1].toLowerCase();
    if (tag === "double") tag = "float";
    const prefTag = tag as PrefTag;
    const attrs = match[2] ?? "";
    const nameMatch = attrs.match(/\bname\s*=\s*"([^"]*)"/);
    if (!nameMatch) continue;
    const name = unescapeXml(nameMatch[1]);
    const valueAttr = attrs.match(/\bvalue\s*=\s*"([^"]*)"/);
    const raw = valueAttr ? unescapeXml(valueAttr[1]) : unescapeXml(match[3] ?? "");
    tags[name] = prefTag;
    if (prefTag === "boolean") data[name] = raw === "true";
    else if (prefTag === "string") data[name] = raw;
    else {
      const num = Number(raw);
      data[name] = Number.isFinite(num) ? num : raw;
    }
    found++;
  }
  if (found === 0) return null;
  return { data, tags };
}

function parseUnityPrefs(text: string): { data: Json; tags: Record<string, PrefTag> } | null {
  if (!/<unity_prefs[\s>]/i.test(text) && !/<pref\s/i.test(text)) return null;
  const data: { [key: string]: Json } = {};
  const tags: Record<string, PrefTag> = {};
  const re = /<pref\b([^>]*)>([\s\S]*?)<\/pref>/gi;
  let match: RegExpExecArray | null;
  let found = 0;
  while ((match = re.exec(text))) {
    const attrs = match[1] ?? "";
    const nameMatch = attrs.match(/\bname\s*=\s*"([^"]*)"/);
    const typeMatch = attrs.match(/\btype\s*=\s*"([^"]*)"/);
    if (!nameMatch) continue;
    const name = unescapeXml(nameMatch[1]);
    const rawType = (typeMatch?.[1] ?? "string").toLowerCase();
    const tag: PrefTag =
      rawType === "bool" || rawType === "boolean"
        ? "boolean"
        : rawType === "long"
          ? "long"
          : rawType === "float" || rawType === "double"
            ? "float"
            : rawType === "int" || rawType === "integer"
              ? "int"
              : "string";
    const raw = unescapeXml(match[2] ?? "").trim();
    tags[name] = tag;
    if (tag === "boolean") data[name] = raw === "true" || raw === "1";
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

function looksBase64(value: string): boolean {
  if (value.length < 8 || value.length > 2_000_000 || value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function utf8ToB64(text: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(text, "utf8").toString("base64");
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

function b64ToBytes(value: string): Uint8Array | null {
  try {
    const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(padded, "base64"));
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function b64ToUtf8(value: string): string | null {
  const bytes = b64ToBytes(value);
  if (!bytes) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function tryParseJson(text: string): Json | null {
  const relaxed = relaxJson(text);
  if (!relaxed) return null;
  try {
    const data = JSON.parse(relaxed) as Json;
    if (data && typeof data === "object") return data;
  } catch {
    /* not json */
  }
  return null;
}

function tryDecodeBlob(raw: string): { kind: BlobKind; data: Json } | null {
  const text = raw.trim();
  if (text.length < 2) return null;
  const asJson = tryParseJson(text);
  if (asJson) return { kind: "json-string", data: asJson };
  if (/%[0-9A-Fa-f]{2}/.test(text) && /%7b|%5b|%22/i.test(text)) {
    try {
      const decoded = decodeURIComponent(text);
      const data = tryParseJson(decoded);
      if (data) return { kind: "url", data };
    } catch {
      /* not url-encoded json */
    }
  }
  if (looksBase64(text)) {
    const utf8 = b64ToUtf8(text);
    if (utf8) {
      const data = tryParseJson(utf8);
      if (data) return { kind: "base64", data };
    }
    const bytes = b64ToBytes(text);
    if (bytes && bytes.length >= 2 && bytes.length % 2 === 0) {
      try {
        const utf16 = new TextDecoder("utf-16le", { fatal: true }).decode(bytes);
        const data = tryParseJson(utf16);
        if (data) return { kind: "base64", data };
      } catch {
        /* not utf-16 */
      }
    }
  }
  return null;
}

function expandNested(node: Json, path: string, encodings: Encoding[], depth: number): Json {
  if (depth > 6) return node;
  if (typeof node === "string") {
    const decoded = tryDecodeBlob(node);
    if (decoded) {
      encodings.push({ path, kind: decoded.kind });
      return expandNested(decoded.data, path, encodings, depth + 1);
    }
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => expandNested(child, path ? `${path}[${i}]` : `[${i}]`, encodings, depth));
  }
  if (node && typeof node === "object") {
    const out: { [key: string]: Json } = {};
    for (const [childKey, child] of Object.entries(node)) {
      const childPath = path ? `${path}.${childKey}` : childKey;
      out[childKey] = expandNested(child, childPath, encodings, depth);
    }
    return out;
  }
  return node;
}

function reencode(data: Json, encodings: Encoding[]): Json {
  if (!encodings.length) return data;
  const next = structuredClone(data);
  const ordered = [...encodings].sort((a, b) => b.path.length - a.path.length);
  for (const enc of ordered) {
    const value = enc.path ? getPath(next, enc.path) : next;
    if (value === undefined) continue;
    let text = typeof value === "string" ? value : JSON.stringify(value);
    if (enc.kind === "base64") text = utf8ToB64(text);
    else if (enc.kind === "url") text = encodeURIComponent(text);
    if (enc.path) setPath(next, enc.path, text);
    else return text;
  }
  return next;
}

function tryCodecWrap(text: string): { wrap: Wrap; data: string } | null {
  const trimmed = text.trim();
  if (!looksBase64(trimmed)) return null;
  const bytes = b64ToBytes(trimmed);
  if (!bytes || bytes.length < 2) return null;
  if (bytes.length % 2 === 0) {
    try {
      const utf16 = new TextDecoder("utf-16le", { fatal: true }).decode(bytes);
      const t = utf16.trim();
      if (t.startsWith("{") || t.startsWith("[") || /^-?\d+$/.test(t)) {
        return { wrap: "b64-utf16", data: utf16 };
      }
    } catch {
      /* not utf-16 */
    }
  }
  try {
    const utf8 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const t = utf8.trim();
    if (t.startsWith("{") || t.startsWith("[") || /^-?\d+$/.test(t)) {
      return { wrap: "b64-utf8", data: utf8 };
    }
  } catch {
    /* not utf-8 */
  }
  return null;
}

function finishParse(name: string, format: Format, text: string, data: Json, extra: Partial<Loaded> = {}): Loaded {
  const encodings: Encoding[] = [];
  const expanded = expandNested(data, "", encodings, 0);
  return {
    name,
    format,
    originalText: text,
    data: expanded,
    tags: extra.tags ?? {},
    encodings,
    writable: true,
    ...extra,
    // extra.tags would overwrite; merge encodings if extra also has them
    encodings: [...encodings, ...(extra.encodings ?? [])],
  };
}

export function parseText(name: string, text: string): Loaded {
  const trimmed = text.trim();
  if (isTelemetryName(name)) {
    const relaxed = relaxJson(trimmed);
    if (relaxed) {
      try {
        const data = JSON.parse(relaxed) as Json;
        return {
          name,
          format: "json",
          originalText: text,
          data,
          tags: {},
          writable: false,
          warnings: ["This looks like analytics or remote-config data, not a player save."],
        };
      } catch {
        /* fall through */
      }
    }
  }
  const asNumber = asNumericString(trimmed);
  if (asNumber !== null) {
    const key = friendlyFileKey(name);
    return finishParse(name, "json", text, { [key]: asNumber });
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const relaxed = relaxJson(trimmed);
    if (relaxed) {
      try {
        const data = JSON.parse(relaxed) as Json;
        return finishParse(name, "json", text, data);
      } catch {
        /* fall through */
      }
    }
  }
  const unity = parseUnityPrefs(text);
  if (unity) {
    return finishParse(name, "prefs", text, unity.data, { tags: unity.tags, prefStyle: "unity" });
  }
  const prefs = parseAndroidPrefs(text);
  if (prefs) {
    return finishParse(name, "prefs", text, prefs.data, { tags: prefs.tags, prefStyle: "android" });
  }
  const pairs = parsePairs(text);
  if (pairs) {
    return finishParse(name, "pairs", text, pairs);
  }
  const wrapped = tryCodecWrap(trimmed);
  if (wrapped) {
    const inner = parseText(name, wrapped.data);
    if (inner.data || inner.format !== "text") {
      return { ...inner, wrap: wrapped.wrap, originalText: text };
    }
  }
  return { name, format: "text", originalText: text, data: null, tags: {}, writable: true };
}

function serializePrefs(
  data: Json,
  tags: Record<string, PrefTag>,
  style: PrefStyle | undefined,
  encodings: Encoding[],
): string {
  const prepared = reencode(data, encodings);
  if (!prepared || typeof prepared !== "object" || Array.isArray(prepared)) {
    throw new Error("This preferences file can't be rebuilt.");
  }
  if (style === "unity") {
    const lines = ['<?xml version="1.0" encoding="utf-8"?>', '<unity_prefs version_major="1" version_minor="1">'];
    for (const [name, value] of Object.entries(prepared)) {
      const tag =
        tags[name] ??
        (typeof value === "boolean" ? "boolean" : typeof value === "string" ? "string" : Number.isInteger(value) ? "int" : "float");
      const type = tag === "boolean" ? "bool" : tag;
      const printed = typeof value === "boolean" ? String(value) : String(value);
      lines.push(`    <pref name="${escapeXml(name)}" type="${type}">${escapeXml(printed)}</pref>`);
    }
    lines.push("</unity_prefs>", "");
    return lines.join("\n");
  }
  const lines = ["<?xml version='1.0' encoding='utf-8' standalone='yes' ?>", "<map>"];
  for (const [name, value] of Object.entries(prepared)) {
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
      const printed = typeof value === "object" ? JSON.stringify(value) : String(value);
      lines.push(`    <string name="${escapeXml(name)}">${escapeXml(printed)}</string>`);
    } else {
      const printed = typeof value === "boolean" ? String(value) : String(value);
      lines.push(`    <${tag} name="${escapeXml(name)}" value="${escapeXml(printed)}" />`);
    }
  }
  lines.push("</map>", "");
  return lines.join("\n");
}

function serializePairs(data: Json, encodings: Encoding[]): string {
  const prepared = reencode(data, encodings);
  if (!prepared || typeof prepared !== "object" || Array.isArray(prepared)) {
    throw new Error("This key list can't be rebuilt.");
  }
  const lines = Object.entries(prepared).map(([key, value]) => `${key}=${String(value)}`);
  return `${lines.join("\n")}\n`;
}

export function serialize(
  loaded: Pick<Loaded, "format" | "tags" | "encodings" | "prefStyle" | "wrap">,
  data: Json,
): string {
  const encodings = loaded.encodings ?? [];
  let text: string;
  if (loaded.format === "prefs") text = serializePrefs(data, loaded.tags, loaded.prefStyle, encodings);
  else if (loaded.format === "pairs") text = serializePairs(data, encodings);
  else if (loaded.format === "binary") {
    throw new Error("Use serializeBytes for a binary save.");
  } else {
    const prepared = reencode(data, encodings);
    text = `${JSON.stringify(prepared, null, 2)}\n`;
  }
  if (loaded.wrap === "b64-utf16") {
    const raw = typeof Buffer !== "undefined" ? Buffer.from(text, "utf16le") : utf16leBytes(text);
    const b64 = typeof Buffer !== "undefined" ? Buffer.from(raw).toString("base64") : utf8ToB64(String.fromCharCode(...raw));
    return b64;
  }
  if (loaded.wrap === "b64-utf8") return utf8ToB64(text);
  return text;
}

function utf16leBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    bytes[i * 2] = c & 0xff;
    bytes[i * 2 + 1] = c >> 8;
  }
  return bytes;
}

export function patchBinary(
  bytes: Uint8Array,
  hits: BinaryHit[],
  data: Json,
): Uint8Array {
  const next = new Uint8Array(bytes);
  const view = new DataView(next.buffer, next.byteOffset, next.byteLength);
  const obj = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  for (const hit of hits) {
    const raw = obj[hit.path] ?? obj[hit.key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const cap = hit.width === 4 ? SAFE_MONEY : Number.MAX_SAFE_INTEGER;
    const value = Math.max(0, Math.min(Math.trunc(raw), cap));
    if (hit.width === 8) {
      // DataView has setBigInt64
      view.setBigInt64(hit.offset, BigInt(value), hit.littleEndian);
    } else {
      view.setInt32(hit.offset, value, hit.littleEndian);
    }
  }
  return next;
}

export function serializeBytes(loaded: Loaded, data: Json): Uint8Array {
  if (loaded.format === "binary" && loaded.originalBytes && loaded.binaryHits) {
    return patchBinary(loaded.originalBytes, loaded.binaryHits, data);
  }
  const text = serialize(loaded, data);
  return new TextEncoder().encode(text);
}

export function countRoles(leaves: Leaf[]): Record<Role, number> {
  return {
    money: leaves.filter((leaf) => leaf.role === "money").length,
    unlock: leaves.filter((leaf) => leaf.role === "unlock").length,
    upgrade: leaves.filter((leaf) => leaf.role === "upgrade").length,
    other: leaves.filter((leaf) => leaf.role === "other").length,
  };
}

const SQLITE_MAGIC = "SQLite format 3";

export function isSqlite(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 15));
  return head === SQLITE_MAGIC;
}

export function shannonEntropy(bytes: Uint8Array, max = 4096): number {
  const n = Math.min(bytes.length, max);
  if (n === 0) return 0;
  const freq = new Array<number>(256).fill(0);
  for (let i = 0; i < n; i++) freq[bytes[i]]++;
  let entropy = 0;
  for (const count of freq) {
    if (!count) continue;
    const p = count / n;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function looksEncrypted(bytes: Uint8Array): boolean {
  if (bytes.length < 32) return false;
  if (isSqlite(bytes)) return false;
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 16));
  if (
    head.startsWith("{") ||
    head.startsWith("[") ||
    head.startsWith("<") ||
    head.startsWith("PK") ||
    head.startsWith("UnityFS") ||
    head.startsWith("SQLite")
  ) {
    return false;
  }
  return shannonEntropy(bytes) >= 7.5;
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  if (needle.length === 0 || needle.length > haystack.length) return -1;
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function isLetterOrDigit(byte: number): boolean {
  return (
    (byte >= 48 && byte <= 57) ||
    (byte >= 65 && byte <= 90) ||
    (byte >= 97 && byte <= 122)
  );
}

function wordBoundaryUtf8(bytes: Uint8Array, start: number, end: number): boolean {
  if (start > 0 && isLetterOrDigit(bytes[start - 1])) return false;
  if (end < bytes.length && isLetterOrDigit(bytes[end])) return false;
  return true;
}

function readInt32(bytes: Uint8Array, offset: number, le: boolean): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
  return view.getInt32(0, le);
}

const SCAN_WORDS = [...new Set([...MONEY_CORE, ...[...MONEY_SOFT].filter((w) => w.length >= 3)])];

export function scanBinary(bytes: Uint8Array): BinaryHit[] {
  const hits: BinaryHit[] = [];
  const seen = new Set<number>();
  const encoder = new TextEncoder();
  for (const word of SCAN_WORDS) {
    const needles: { bytes: Uint8Array; stride: 1 | 2 }[] = [
      { bytes: encoder.encode(word), stride: 1 },
      { bytes: utf16leBytes(word), stride: 2 },
    ];
    // Also try capitalized and UPPER
    const cap = word[0].toUpperCase() + word.slice(1);
    if (cap !== word) {
      needles.push({ bytes: encoder.encode(cap), stride: 1 });
      needles.push({ bytes: utf16leBytes(cap), stride: 2 });
    }
    const upper = word.toUpperCase();
    if (upper !== word && upper !== cap) {
      needles.push({ bytes: encoder.encode(upper), stride: 1 });
    }
    for (const needle of needles) {
      let from = 0;
      while (from < bytes.length) {
        const at = indexOfBytes(bytes, needle.bytes, from);
        if (at < 0) break;
        from = at + 1;
        if (needle.stride === 1 && !wordBoundaryUtf8(bytes, at, at + needle.bytes.length)) continue;
        const end = at + needle.bytes.length;
        // Skip a C-string null (and UTF-16's extra 00) so we don't read the
        // terminator as the low bytes of the integer.
        let after = end;
        if (after < bytes.length && bytes[after] === 0) {
          after += needle.stride;
        }
        const offsets = [after, (after + 3) & ~3, after + 4, after + 8];
        for (const off of offsets) {
          if (seen.has(off)) continue;
          const le = readInt32(bytes, off, true);
          if (le === null) continue;
          const coreWord = MONEY_CORE.has(word);
          const cap = coreWord ? 200_000_000 : 10_000_000;
          if (le < 0 || le > cap) continue;
          // Skip values that look like a length of a following blob.
          if (le > 0 && le === bytes.length - off - 4 && le > 4096) continue;
          seen.add(off);
          const path = hits.some((h) => h.key === word) ? `${word}@${off}` : word;
          hits.push({
            path,
            key: word,
            offset: off,
            width: 4,
            littleEndian: true,
            value: le,
          });
          break;
        }
      }
    }
  }
  return hits;
}

function consumeJson(text: string, start: number): { data: Json; end: number } | null {
  if (text[start] !== "{" && text[start] !== "[") return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < text.length && i - start < 2_000_000; i++) {
    const c = text[i];
    if (inStr) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) {
        const slice = text.slice(start, i + 1);
        const data = tryParseJson(slice);
        if (data) return { data, end: i + 1 };
        return null;
      }
    }
  }
  return null;
}

function precedingId(text: string, start: number): string {
  const window = text.slice(Math.max(0, start - 120), start);
  const ids = [...window.matchAll(/[A-Za-z][A-Za-z0-9_]{2,60}/g)].map((m) => m[0]);
  return ids.length ? ids[ids.length - 1] : "";
}

function extractSqliteNumbers(bytes: Uint8Array): { [key: string]: number } {
  const data: { [key: string]: number } = {};
  const text = new TextDecoder("latin1").decode(bytes);
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{" ) continue;
    const parsed = consumeJson(text, i);
    if (!parsed || parsed.end - i < 20) continue;
    const prefix = precedingId(text, i);
    if (/leaderboardmembers/i.test(prefix) || /leaderBoardMembers/i.test(prefix)) {
      i = parsed.end - 1;
      continue;
    }
    const { leaves } = collect(parsed.data);
    for (const leaf of leaves) {
      if (leaf.role !== "money" || typeof leaf.value !== "number") continue;
      if (/members/i.test(leaf.path)) continue;
      const path = prefix ? `${prefix}.${leaf.path}` : leaf.path;
      if (data[path] === undefined) data[path] = leaf.value;
    }
    i = parsed.end - 1;
  }
  if (Object.keys(data).length) return data;
  // Fallback: pair money-like keys with nearby numeric runs when JSON blobs were not found.
  const runs = [...text.matchAll(/[A-Za-z_][A-Za-z0-9_.]{1,40}|-?\d{1,15}(?:\.\d+)?/g)];
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i][0];
    if (/^-?\d/.test(run)) continue;
    const tokens = tokensOf(run);
    if (tokens.length === 1 && tokens[0] === "key") continue;
    const conf = moneyConfidence(tokens, [], 1);
    if (!conf || conf < 80) continue;
    for (let j = i + 1; j < Math.min(i + 6, runs.length); j++) {
      const next = runs[j][0];
      if (!/^-?\d+(\.\d+)?$/.test(next)) continue;
      const num = Number(next);
      if (!Number.isFinite(num) || num < 0 || num > 1e14) continue;
      const path = data[run] === undefined ? run : `${run}_${i}`;
      data[path] = num;
      break;
    }
  }
  return data;
}

function looksUtf16le(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  const n = Math.min(bytes.length, 400);
  let zeros = 0;
  for (let i = 1; i < n; i += 2) if (bytes[i] === 0) zeros++;
  return zeros / Math.floor(n / 2) > 0.7;
}

function decodeBest(bytes: Uint8Array): string | null {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  if (looksUtf16le(bytes)) return new TextDecoder("utf-16le").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}

function mostlyText(text: string): boolean {
  if (!text) return false;
  const n = Math.min(text.length, 4000);
  let bad = 0;
  for (let i = 0; i < n; i++) {
    const c = text.charCodeAt(i);
    if (c === 0xfffd || (c < 9) || (c > 13 && c < 32 && c !== 10 && c !== 9)) bad++;
  }
  return bad / n < 0.05;
}

export function isNrbf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 9 &&
    bytes[0] === 0 &&
    bytes[1] === 1 &&
    bytes[2] === 0 &&
    bytes[3] === 0 &&
    bytes[4] === 0 &&
    bytes[5] === 0xff &&
    bytes[6] === 0xff &&
    bytes[7] === 0xff &&
    bytes[8] === 0xff
  );
}

function extractNrbf(bytes: Uint8Array): {
  data: { [key: string]: Json };
  tags: Record<string, PrefTag>;
  hits: BinaryHit[];
} {
  const data: { [key: string]: Json } = {};
  const tags: Record<string, PrefTag> = {};
  const hits: BinaryHit[] = [];
  const add = (path: string, key: string, value: number, offset: number) => {
    data[path] = value;
    tags[path] = "int";
    hits.push({ path, key, value, offset, width: 4, littleEndian: true });
  };
  // Class primitives: scan for GameMgr-style currency members in ASCII, then
  // rely on the Android parser for writes. Here we list values found beside
  // known keys with the 4-byte Unity layout after the type metadata ends.
  const text = new TextDecoder("latin1").decode(bytes);
  const hasCion = text.includes("cion");
  const hasDiamond = /\bdiamond/.test(text);
  if (hasCion || hasDiamond) {
    // After the first ClassWithMembersAndTypes library id, values start.
    // Use the Java-tested 4-byte packing when a string record follows.
    let i = 0;
    while (i < bytes.length - 8) {
      if (bytes[i] !== 5) {
        i++;
        continue;
      }
      break;
    }
  }
  // JSON blobs
  let booster = 0;
  for (let i = 0; i < bytes.length - 6; i++) {
    if (bytes[i] !== 6) continue;
    try {
      const packedAt = i + 5;
      const { value: len, size } = readPackedTs(bytes, packedAt);
      const jsonStart = packedAt + size;
      if (len < 5 || len > 20000 || jsonStart + len > bytes.length) continue;
      if (bytes[jsonStart] !== 0x7b) continue;
      const json = new TextDecoder("utf-8").decode(bytes.subarray(jsonStart, jsonStart + len));
      if (!json.endsWith("}")) continue;
      if (/VolumeDatas|TimesPurchased|previewUrl|FirstPurchase|ForcedAdDisabled|LastDailyCoinsClaimDate|MaxReachedLevelIndex|PremiumUnlocked/.test(json)) {
        continue;
      }
      const compact = json.replace(/\s+/g, "");
      if (/^\{"amount":-?\d+(\.\d+)?\}$/.test(compact)) {
        const m = compact.match(/:/);
        const num = Number(compact.slice(compact.indexOf(":") + 1, compact.length - 1));
        const start = jsonStart + json.indexOf(String(num < 0 ? num : Math.trunc(num)));
        add("Coins.amount", "coins", num, start);
      } else if (compact.includes('"LivesCount"')) {
        const m = json.match(/"LivesCount"\s*:\s*(-?\d+)/);
        if (m) {
          const start = jsonStart + json.indexOf(m[1], json.indexOf("LivesCount"));
          add("Lives.LivesCount", "lives", Number(m[1]), start);
        }
      } else if (compact.includes('"Amount":') && compact.includes('"IsUnlocked"')) {
        const m = json.match(/"Amount"\s*:\s*(-?\d+)/);
        if (m) {
          booster++;
          const start = jsonStart + json.indexOf(m[1], json.indexOf("Amount"));
          add(`Booster ${booster}.Amount`, "booster", Number(m[1]), start);
        }
      }
    } catch {
      /* skip */
    }
  }
  return { data, tags, hits };
}

function readPackedTs(bytes: Uint8Array, i: number): { value: number; size: number } {
  let n = 0;
  let shift = 0;
  let size = 0;
  while (i + size < bytes.length) {
    const b = bytes[i + size]!;
    size++;
    n |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) return { value: n, size };
    shift += 7;
  }
  throw new Error("packed");
}


export function parseBytes(name: string, bytes: Uint8Array): Loaded {
  const lower = name.toLowerCase();
  if (lower.endsWith(".db-wal") || lower.endsWith(".db-shm")) {
    return {
      name,
      format: "binary",
      originalText: "",
      data: null,
      tags: {},
      writable: false,
      warnings: ["This is a SQLite sidecar file. Open the main .db save instead."],
      binaryPreview: hexPreview(bytes),
      byteLength: bytes.length,
      originalBytes: bytes,
    };
  }
  if (isSqlite(bytes) || lower.endsWith(".db") || lower.endsWith(".sqlite") || lower.endsWith(".sqlite3")) {
    const extracted = extractSqliteNumbers(bytes);
    const warning =
      "This looks like a SQLite or Cocos local-storage file. Currency keys are listed when they can be read, but Savepress won't rewrite the database.";
    const data = Object.keys(extracted).length ? extracted : null;
    return {
      name,
      format: "binary",
      originalText: "",
      data,
      tags: {},
      warnings: [warning],
      writable: false,
      binaryPreview: hexPreview(bytes),
      byteLength: bytes.length,
      originalBytes: bytes,
    };
  }

  if (isNrbf(bytes)) {
    const extracted = extractNrbf(bytes);
    return {
      name,
      format: "binary",
      originalText: "",
      data: extracted.data,
      tags: extracted.tags,
      binaryHits: extracted.hits,
      writable: Object.keys(extracted.data).length > 0,
      warnings: [
        extracted.data && Object.keys(extracted.data).length
          ? "This is a Unity binary save. A backup is kept when you download. Check the values before putting the file back."
          : "This Unity save was read, but no coins, gems, lives or boosters were found.",
      ],
      binaryPreview: hexPreview(bytes),
      byteLength: bytes.length,
      originalBytes: bytes,
    };
  }

  const asText = decodeBest(bytes);
  const encrypted = looksEncrypted(bytes);
  if (asText && mostlyText(asText) && !encrypted) {
    const loaded = parseText(name, asText);
    if (loaded.format !== "text" || loaded.data) {
      return { ...loaded, originalBytes: bytes, byteLength: bytes.length };
    }
  }

  const hits = scanBinary(bytes);
  if (encrypted && hits.length === 0) {
    return {
      name,
      format: "binary",
      originalText: "",
      data: null,
      tags: {},
      encrypted: true,
      writable: false,
      warnings: ["This save looks encrypted. Savepress won't change it, so the file stays intact."],
      binaryPreview: hexPreview(bytes),
      byteLength: bytes.length,
      originalBytes: bytes,
    };
  }

  if (hits.length) {
    const data: { [key: string]: Json } = {};
    for (const hit of hits) data[hit.path] = hit.value;
    return {
      name,
      format: "binary",
      originalText: "",
      data,
      tags: Object.fromEntries(hits.map((hit) => [hit.path, "int" as PrefTag])),
      binaryHits: hits,
      writable: true,
      warnings: [
        "Amounts were found next to currency names in this binary file. A backup is kept when you download. Check the values before putting the file back.",
      ],
      binaryPreview: hexPreview(bytes),
      byteLength: bytes.length,
      originalBytes: bytes,
    };
  }

  return {
    name,
    format: "binary",
    originalText: "",
    data: null,
    tags: {},
    writable: false,
    encrypted,
    warnings: [
      encrypted
        ? "This save looks encrypted. Savepress won't change it, so the file stays intact."
        : "This save is in an unknown binary format. Savepress won't change it, so the file stays intact.",
    ],
    binaryPreview: hexPreview(bytes),
    byteLength: bytes.length,
    originalBytes: bytes,
  };
}
