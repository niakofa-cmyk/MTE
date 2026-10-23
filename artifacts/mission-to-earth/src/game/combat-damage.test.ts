import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveHitDamage } from "./combat-damage.ts";

describe("combat hit-zone damage", () => {
  it("keeps torso damage at its base value", () => {
    assert.deepEqual(resolveHitDamage(20, "body", false), {
      damage: 20,
      slowsTarget: false,
    });
  });

  it("applies the headshot multiplier and skill-shot bonus", () => {
    assert.deepEqual(resolveHitDamage(20, "head", true), {
      damage: 20 * 2.15 * 1.35,
      slowsTarget: false,
    });
  });

  it("reduces leg damage and applies the movement slow", () => {
    assert.deepEqual(resolveHitDamage(20, "leg", false), {
      damage: 20 * 0.72,
      slowsTarget: true,
    });
  });
});
