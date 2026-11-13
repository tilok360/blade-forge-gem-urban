import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SAFE_MONEY,
  collect,
  confidenceLabel,
  hexPreview,
  isBinary,
  looksEncrypted,
  parseBytes,
  parseText,
  planStamp,
  sampleSave,
  scanBinary,
  serialize,
  serializeBytes,
  shannonEntropy,
  tokensOf,
  withOverrides,
} from "./engine.ts";

const STAMP = {
  money: true,
  unlocks: true,
  upgrades: true,
  maxMoney: 9_999_999,
  maxLevel: 10,
};

describe("savepress engine", () => {
  it("splits camel case into tokens", () => {
    assert.deepEqual(tokensOf("coinsAmount"), ["coins", "amount"]);
    assert.deepEqual(tokensOf("spice_unlocked"), ["spice", "unlocked"]);
    assert.deepEqual(tokensOf("engagement"), ["engagement"]);
    assert.deepEqual(tokensOf("totalCoins"), ["total", "coins"]);
    assert.deepEqual(tokensOf("m_coins"), ["m", "coins"]);
    assert.deepEqual(tokensOf("sc_gold"), ["sc", "gold"]);
    assert.deepEqual(tokensOf("PlayerGold"), ["player", "gold"]);
    assert.deepEqual(tokensOf("softCurrency"), ["soft", "currency"]);
    assert.deepEqual(tokensOf("_gold"), ["gold"]);
  });

  it("stamps money, locks, and upgrades on the sample and leaves the day alone", () => {
    const { leaves } = collect(sampleSave());
    const plan = planStamp(leaves, STAMP);
    assert.equal(plan["purse.coins"], 9_999_999);
    assert.equal(plan["purse.gems"], 9_999_999);
    assert.equal(plan["stalls.spice.unlocked"], true);
    assert.equal(plan["gear.lockbox.locked"], false);
    assert.equal(plan["gear.kettle.level"], 10);
    assert.equal(plan["day"], undefined);

    const next = withOverrides(sampleSave(), plan);
    const again = collect(next).leaves.find((leaf) => leaf.path === "purse.coins");
    assert.equal(again?.value, 9_999_999);
  });

  it("does not treat engagement as gems", () => {
    const { leaves } = collect({ engagement: 12, gemsAmount: 4 });
    const engagement = leaves.find((leaf) => leaf.key === "engagement");
    const gems = leaves.find((leaf) => leaf.key === "gemsAmount");
    assert.equal(engagement?.role, "other");
    assert.equal(gems?.role, "money");
  });

  it("does not lower money that is already higher", () => {
    const { leaves } = collect({ coins: 50_000_000 });
    const plan = planStamp(leaves, {
      money: true,
      unlocks: true,
      upgrades: true,
      maxMoney: 9_999_999,
      maxLevel: 99,
    });
    assert.deepEqual(plan, {});
  });

  it("round-trips android preferences", () => {
    const xml = [
      "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>",
      "<map>",
      '    <int name="coins" value="40" />',
      '    <boolean name="spice_unlocked" value="false" />',
      '    <int name="kettle_level" value="1" />',
      "</map>",
      "",
    ].join("\n");
    const loaded = parseText("save.xml", xml);
    assert.equal(loaded.format, "prefs");
    const { leaves } = collect(loaded.data, { tags: loaded.tags });
    const plan = planStamp(leaves, {
      money: true,
      unlocks: true,
      upgrades: true,
      maxMoney: 1000,
      maxLevel: 8,
    });
    const text = serialize(loaded, withOverrides(loaded.data!, plan));
    assert.match(text, /name="coins" value="1000"/);
    assert.match(text, /name="spice_unlocked" value="true"/);
    assert.match(text, /name="kettle_level" value="8"/);
  });

  it("round-trips key=value saves", () => {
    const loaded = parseText("save.txt", "coins=40\nspice_unlocked=false\nkettle_level=1\n");
    assert.equal(loaded.format, "pairs");
    const plan = planStamp(collect(loaded.data).leaves, {
      money: true,
      unlocks: false,
      upgrades: false,
      maxMoney: 70,
      maxLevel: 1,
    });
    const text = serialize(loaded, withOverrides(loaded.data!, plan));
    assert.match(text, /^coins=70$/m);
    assert.match(text, /^spice_unlocked=false$/m);
  });

  it("flags binary files and previews hex", () => {
    const bytes = new Uint8Array([0x00, 0x41, 0x42, 0x00]);
    assert.equal(isBinary(bytes), true);
    assert.match(hexPreview(bytes), /0041 4200|00 41 42 00/);
  });
});

describe("wider currency detection", () => {
  it("finds compound keys, prefixes, and soft currencies, and skips prices and rewards", () => {
    const { leaves } = collect({
      totalCoins: 40,
      numGems: 2,
      m_coins: 9,
      sc_gold: 12,
      hc_gems: 3,
      PlayerGold: 300,
      coinCount: 11,
      cur_tickets: 3,
      hearts: 6,
      stamina: 25,
      shards: 14,
      essence: 2,
      orbs: 1,
      pearls: 8,
      jewels: 3,
      lives: 5,
      tokens: 7,
      keys: 2,
      souls: 1,
      premium: 4,
      crystals: 3,
      diamonds: 1,
      energy: 15,
      points: 200,
      gemCost: 20,
      coinPrice: 25,
      rewardCoins: 15,
      rewardGold: 5,
      playerId: 4412,
      version: 7,
      timestamp: 1730000000,
      purchaseCount: 2,
      itemCount: 4,
      engagement: 12,
      highScore: 9000,
    });
    const money = new Map(leaves.filter((l) => l.role === "money").map((l) => [l.path, l]));
    for (const key of [
      "totalCoins",
      "numGems",
      "m_coins",
      "sc_gold",
      "hc_gems",
      "PlayerGold",
      "coinCount",
      "cur_tickets",
      "hearts",
      "stamina",
      "shards",
      "essence",
      "orbs",
      "pearls",
      "jewels",
      "lives",
      "tokens",
      "keys",
      "souls",
      "premium",
      "crystals",
      "diamonds",
      "energy",
      "points",
    ]) {
      assert.equal(money.get(key)?.role, "money", `expected money: ${key}`);
      assert.ok((money.get(key)?.confidence ?? 0) >= 60, `${key} confidence`);
    }
    for (const key of [
      "gemCost",
      "coinPrice",
      "rewardCoins",
      "rewardGold",
      "playerId",
      "version",
      "timestamp",
      "purchaseCount",
      "itemCount",
      "engagement",
      "highScore",
    ]) {
      const leaf = leaves.find((l) => l.path === key);
      assert.notEqual(leaf?.role, "money", `false positive: ${key}`);
    }
  });

  it("treats wallet.amount and currencies[].amount as money", () => {
    const { leaves } = collect({
      wallet: { amount: 70, crystals: 3 },
      currencies: [{ amount: 3 }],
    });
    const money = leaves.filter((l) => l.role === "money").map((l) => l.path).sort();
    assert.deepEqual(money, ["currencies[0].amount", "wallet.amount", "wallet.crystals"]);
  });

  it("reads numbers stored as strings and writes them back as strings", () => {
    const loaded = parseText("save.json", '{"coins":"40","gems":"2"}\n');
    const { leaves } = collect(loaded.data);
    const coins = leaves.find((l) => l.path === "coins");
    assert.equal(coins?.role, "money");
    assert.equal(coins?.stringly, true);
    const plan = planStamp(leaves, { ...STAMP, maxMoney: 70 });
    const text = serialize(loaded, withOverrides(loaded.data!, plan));
    assert.match(text, /"coins": "70"/);
    assert.match(text, /"gems": "70"/);
  });

  it("ranks money fields by confidence and labels them", () => {
    const { leaves } = collect({ coins: 40, points: 200, wallet: { amount: 7 } });
    const coins = leaves.find((l) => l.path === "coins");
    const points = leaves.find((l) => l.path === "points");
    const amount = leaves.find((l) => l.path === "wallet.amount");
    assert.ok((coins?.confidence ?? 0) > (points?.confidence ?? 0));
    assert.ok((coins?.confidence ?? 0) >= 90);
    assert.match(confidenceLabel(coins!.confidence), /High/);
    assert.match(confidenceLabel(points!.confidence), /Medium|Low/);
    assert.equal(amount?.role, "money");
  });

  it("flags a checksum sibling without changing the hash", () => {
    const { leaves } = collect({ coins: 40, coins_hash: "abc", gems: 2, checksum: "fff" });
    const coins = leaves.find((l) => l.path === "coins");
    const gems = leaves.find((l) => l.path === "gems");
    assert.equal(coins?.role, "money");
    assert.ok(coins?.warning?.toLowerCase().includes("checksum") || coins?.warning?.toLowerCase().includes("hash"));
    assert.ok(gems?.warning);
    const plan = planStamp(leaves, STAMP);
    assert.equal(plan["coins_hash"], undefined);
    assert.equal(plan.checksum, undefined);
    assert.equal(plan.coins, 9_999_999);
  });

  it("clamps stamped ints to the safe max of 999999999", () => {
    const { leaves } = collect({ coins: 40 }, { tags: { coins: "int" } });
    const plan = planStamp(leaves, { ...STAMP, maxMoney: 3_000_000_000 });
    assert.equal(plan.coins, SAFE_MONEY);
    assert.ok(plan.coins! <= 2_147_483_647);
  });

  it("parses Unity PlayerPrefs XML and stamps currency keys", () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<unity_prefs version_major="1" version_minor="1">
    <pref name="totalCoins" type="int">1250</pref>
    <pref name="numGems" type="int">8</pref>
    <pref name="PlayerGold" type="int">300</pref>
    <pref name="gemCost" type="int">50</pref>
    <pref name="highScore" type="int">9000</pref>
</unity_prefs>
`;
    const loaded = parseText("player.prefs", xml);
    assert.equal(loaded.format, "prefs");
    assert.equal(loaded.prefStyle, "unity");
    const { leaves } = collect(loaded.data, { tags: loaded.tags });
    const money = leaves.filter((l) => l.role === "money").map((l) => l.path).sort();
    assert.deepEqual(money, ["PlayerGold", "numGems", "totalCoins"]);
    const plan = planStamp(leaves, { ...STAMP, maxMoney: 5000 });
    const text = serialize(loaded, withOverrides(loaded.data!, plan));
    assert.match(text, /<pref name="totalCoins" type="int">5000<\/pref>/);
    assert.match(text, /<pref name="gemCost" type="int">50<\/pref>/);
  });

  it("opens nested JSON, base64, and URL-encoded blobs inside shared_prefs", () => {
    const inner = JSON.stringify({ wallet: { softCurrency: 80, hardCurrency: 5 }, itemPrice: 9 });
    const xml = [
      "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>",
      "<map>",
      '    <int name="m_coins" value="40" />',
      `    <string name="playerData">${inner.replace(/</g, "&lt;")}</string>`,
      '    <string name="coins">500</string>',
      '    <int name="coinPrice" value="25" />',
      '    <int name="rewardCoins" value="15" />',
      "</map>",
      "",
    ].join("\n");
    const loaded = parseText("com.game_preferences.xml", xml);
    assert.equal(loaded.format, "prefs");
    const { leaves } = collect(loaded.data, { tags: loaded.tags });
    const money = new Map(leaves.filter((l) => l.role === "money").map((l) => [l.path, l]));
    assert.equal(money.get("m_coins")?.value, 40);
    assert.equal(money.get("coins")?.value, 500);
    assert.equal(money.get("coins")?.stringly, true);
    assert.equal(money.get("playerData.wallet.softCurrency")?.value, 80);
    assert.equal(money.get("playerData.wallet.hardCurrency")?.value, 5);
    assert.equal(money.get("coinPrice"), undefined);
    assert.equal(money.get("rewardCoins"), undefined);
    assert.equal(leaves.find((l) => l.path === "playerData.itemPrice")?.role !== "money", true);
    const plan = planStamp(leaves, { ...STAMP, maxMoney: 1000 });
    const text = serialize(loaded, withOverrides(loaded.data!, plan));
    const unescaped = text.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
    assert.match(text, /name="m_coins" value="1000"/);
    assert.match(unescaped, /softCurrency":1000/);
    assert.match(text, />1000<\/string>/); // coins string
    assert.match(unescaped, /itemPrice":9/);
  });

  it("decodes base64 and URL-encoded JSON values", () => {
    const payload = { coins: 40, diamonds: 7 };
    const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    const url = encodeURIComponent(JSON.stringify({ totalCoins: 99, crystalCount: 4 }));
    const loaded = parseText("nest.json", JSON.stringify({ save: b64, blob: url, itemCost: 10 }));
    const { leaves } = collect(loaded.data);
    const money = new Map(leaves.filter((l) => l.role === "money").map((l) => [l.path, l]));
    assert.equal(money.get("save.coins")?.value, 40);
    assert.equal(money.get("save.diamonds")?.value, 7);
    assert.equal(money.get("blob.totalCoins")?.value, 99);
    assert.equal(money.get("blob.crystalCount")?.value, 4);
    assert.notEqual(leaves.find((l) => l.path === "itemCost")?.role, "money");
    const plan = planStamp(leaves, { ...STAMP, maxMoney: 200 });
    const text = serialize(loaded, withOverrides(loaded.data!, plan));
    const again = parseText("nest.json", text);
    const leaves2 = collect(again.data).leaves;
    assert.equal(leaves2.find((l) => l.path === "save.coins")?.value, 200);
    assert.equal(leaves2.find((l) => l.path === "blob.totalCoins")?.value, 200);
  });

  it("finds ES3 Easy Save 3 unencrypted currency values", () => {
    const es3 = `{
  "coins": { "__type": "System.Int32,mscorlib", "value": 40 },
  "gems": { "__type": "System.Int32,mscorlib", "value": 2 },
  "energy": { "__type": "System.Int32,mscorlib", "value": 15 },
  "level": { "__type": "System.Int32,mscorlib", "value": 4 }
}`;
    const loaded = parseText("save.es3", es3);
    const { leaves } = collect(loaded.data);
    const money = leaves.filter((l) => l.role === "money").map((l) => l.path).sort();
    assert.deepEqual(money, ["coins.value", "energy.value", "gems.value"]);
    const level = leaves.find((l) => l.path === "level.value" || l.path === "level");
    // level.value: key is value (amount), parent is level (upgrade, not money parent)
    // MONEY_PARENT does not have "level". So it should be other or... amount + parent "level" is not money.
    assert.notEqual(level?.role, "money");
    const plan = planStamp(leaves, { ...STAMP, maxMoney: 500 });
    const next = withOverrides(loaded.data!, plan);
    const text = serialize(loaded, next);
    assert.match(text, /"value": 500/);
    assert.match(text, /"__type"/);
  });

  it("scans a binary save for int32 values next to currency names", () => {
    const parts: number[] = [];
    const key = Buffer.from("coins\0", "utf8");
    const value = Buffer.alloc(4);
    value.writeInt32LE(40, 0);
    const gems = Buffer.from("gems\0", "utf8");
    const gval = Buffer.alloc(4);
    gval.writeInt32LE(7, 0);
    const bytes = Buffer.concat([Buffer.from("HDR\0"), key, value, Buffer.from("\0\0"), gems, gval]);
    const hits = scanBinary(new Uint8Array(bytes));
    const byKey = new Map(hits.map((h) => [h.key, h]));
    assert.equal(byKey.get("coins")?.value, 40);
    assert.equal(byKey.get("gems")?.value, 7);
    const loaded = parseBytes("slot.sav", new Uint8Array(bytes));
    assert.equal(loaded.format, "binary");
    assert.equal(loaded.writable, true);
    const { leaves } = collect(loaded.data, { tags: loaded.tags });
    const plan = planStamp(leaves, { ...STAMP, maxMoney: 1000 });
    const patched = serializeBytes(loaded, withOverrides(loaded.data!, plan));
    assert.equal(Buffer.from(patched).readInt32LE(byKey.get("coins")!.offset), 1000);
    assert.equal(Buffer.from(patched).readInt32LE(byKey.get("gems")!.offset), 1000);
    // original header intact
    assert.equal(Buffer.from(patched).subarray(0, 4).toString("latin1"), "HDR\0");
  });

  it("refuses to rewrite an encrypted or unknown binary file", () => {
    const random = new Uint8Array(512);
    for (let i = 0; i < random.length; i++) random[i] = (i * 47 + 13 * (i >> 3) + 191) & 0xff;
    // scramble further for high entropy
    let s = 123456789;
    for (let i = 0; i < random.length; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      random[i] = s & 0xff;
    }
    assert.ok(shannonEntropy(random) > 7.0);
    const loaded = parseBytes("encrypted.dat", random);
    assert.equal(loaded.writable, false);
    assert.equal(loaded.data, null);
    assert.ok(loaded.warnings?.some((w) => /encrypted|unknown/i.test(w)));
    assert.ok(looksEncrypted(random) || loaded.encrypted || loaded.warnings?.length);
  });

  it("detects a SQLite header and does not mark the file writable", () => {
    const header = Buffer.alloc(100, 0);
    header.write("SQLite format 3\0");
    header.write("coins", 32);
    header.write("40", 40);
    const loaded = parseBytes("localstorage.db", new Uint8Array(header));
    assert.equal(loaded.writable, false);
    assert.ok(loaded.warnings?.some((w) => /sqlite|cocos/i.test(w)));
  });
});
