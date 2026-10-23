import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CombatFeedback, damageDirection } from "./combat-feedback.ts";

describe("combat feedback", () => {
  it("classifies incoming damage relative to the player's facing", () => {
    assert.equal(damageDirection(0, 0, 0, 0, -10), "front");
    assert.equal(damageDirection(0, 0, 0, 10, 0), "right");
    assert.equal(damageDirection(0, 0, 0, 0, 10), "back");
    assert.equal(damageDirection(0, 0, 0, -10, 0), "left");
    assert.equal(damageDirection(0, 0, Math.PI / 2, -10, 0), "front");
  });

  it("does not assign a direction when the source overlaps the player", () => {
    assert.equal(damageDirection(4, -2, 1, 4, -2), null);
  });

  it("shows headshots distinctly and fades hit feedback over time", () => {
    const feedback = new CombatFeedback();

    feedback.markHit(true);
    assert.equal(feedback.hitOpacity, 1);
    assert.equal(feedback.headshot, true);

    feedback.update(0.16);
    assert.ok(feedback.hitOpacity > 0.49 && feedback.hitOpacity < 0.51);

    feedback.markHit(false);
    assert.equal(feedback.headshot, false);
    feedback.update(0.32);
    assert.equal(feedback.hitOpacity, 0);
    assert.equal(feedback.headshot, false);
  });

  it("fades each damage direction independently and ignores negative frame time", () => {
    const feedback = new CombatFeedback();

    feedback.markDamage("left");
    feedback.markDamage("front");
    feedback.update(-1);
    assert.equal(feedback.damageOpacity("left"), 1);

    feedback.update(0.36);
    assert.ok(
      feedback.damageOpacity("left") > 0.49 &&
        feedback.damageOpacity("left") < 0.51,
    );
    assert.equal(feedback.damageOpacity("right"), 0);

    feedback.update(0.36);
    assert.equal(feedback.damageOpacity("left"), 0);
  });
});
