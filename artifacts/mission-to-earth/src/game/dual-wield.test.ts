import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dualWieldSpreadMultiplier,
  handMuzzleOffset,
  planDualReload,
  weaponHandForMouseButton,
} from "./dual-wield.ts";

describe("dual-wield combat rules", () => {
  it("maps left and right mouse buttons to independent hands and reserves middle click for focus", () => {
    assert.equal(weaponHandForMouseButton(0), "right");
    assert.equal(weaponHandForMouseButton(2), "left");
    assert.equal(weaponHandForMouseButton(1), null);
  });

  it("reloads only the hand that needs ammunition", () => {
    assert.equal(planDualReload({ right: true, left: false }, false), "right");
    assert.equal(planDualReload({ right: false, left: true }, false), "left");
    assert.equal(planDualReload({ right: false, left: false }, false), "none");
  });

  it("stagger-reloads two low hands and reloads both on a double tap", () => {
    const both = { right: true, left: true };
    assert.equal(planDualReload(both, false), "staggered");
    assert.equal(planDualReload(both, true), "simultaneous");
  });

  it("keeps hand offsets mirrored and applies focus accuracy trade-offs", () => {
    assert.equal(handMuzzleOffset("right"), 0.17);
    assert.equal(handMuzzleOffset("left"), -0.17);
    assert.equal(dualWieldSpreadMultiplier(false), 1.25);
    assert.equal(dualWieldSpreadMultiplier(true), 0.82);
  });
});
