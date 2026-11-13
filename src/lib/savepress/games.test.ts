import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { launchHref, packageProblem, scoreSaveName } from "./games.ts";

describe("game links", () => {
  it("scores save-like names and skips assets", () => {
    assert.ok(scoreSaveName("PersistentData.json") > scoreSaveName("notes.txt"));
    assert.equal(scoreSaveName("hero.png"), -1);
    assert.ok(scoreSaveName("slot1.sav") > 0);
  });

  it("rejects bad and blocked package names", () => {
    assert.equal(packageProblem(""), null);
    assert.equal(packageProblem("com.studio.game"), null);
    assert.match(packageProblem("game") ?? "", /com\.studio\.game/);
    assert.match(packageProblem("com.paypal.android") ?? "", /banking/);
  });

  it("builds an Android launch intent", () => {
    const href = launchHref("com.studio.game");
    assert.match(href, /package=com\.studio\.game;/);
    assert.match(href, /^intent:#Intent;/);
    assert.throws(() => launchHref("com.bank.app"));
  });
});
