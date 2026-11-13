import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collect,
  hexPreview,
  isBinary,
  parseText,
  planStamp,
  sampleSave,
  serialize,
  tokensOf,
  withOverrides,
} from "./engine.ts";

describe("savepress engine", () => {
  it("splits camel case into tokens", () => {
    assert.deepEqual(tokensOf("coinsAmount"), ["coins", "amount"]);
    assert.deepEqual(tokensOf("spice_unlocked"), ["spice", "unlocked"]);
    assert.deepEqual(tokensOf("engagement"), ["engagement"]);
  });

  it("stamps money, locks, and upgrades on the sample and leaves the day alone", () => {
    const { leaves } = collect(sampleSave());
    const plan = planStamp(leaves, {
      money: true,
      unlocks: true,
      upgrades: true,
      maxMoney: 9_999_999,
      maxLevel: 10,
    });
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
    const { leaves } = collect(loaded.data);
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
