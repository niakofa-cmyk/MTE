import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GoldDiscController, discSwipe } from "./gold-disc.ts";

describe("gold disc", () => {
  it("maps swipes to judgment, reload, swap, and bloodline", () => {
    assert.equal(discSwipe(0, -40), "ult");
    assert.equal(discSwipe(40, 0), "reload");
    assert.equal(discSwipe(0, 40), "swap");
    assert.equal(discSwipe(-40, 0), "blood");
    assert.equal(discSwipe(4, 4), null);
  });

  it("holds for a beacon and releases cleanly without a swipe", () => {
    const disc = new GoldDiscController();
    disc.begin(0, 0, 0);
    assert.equal(disc.hold(200).length, 0);
    const held = disc.hold(300);
    assert.equal(held[0]?.type, "interact");
    const end = disc.end(0, 0, 340);
    assert.equal(end.some((command) => command.type === "interact" && command.down === false), true);
    assert.equal(end.some((command) => command.type === "pulse"), false);
  });

  it("does not turn a moving reload swipe into a long-press interaction", () => {
    const disc = new GoldDiscController();
    disc.begin(0, 0, 0);
    disc.move(34, 0);
    assert.equal(disc.hold(301).length, 0);
    const end = disc.end(34, 0, 340);
    assert.deepEqual(end, [{ type: "pulse", key: "reload" }]);
  });

  it("releases an already-started hold and still recognizes a delayed swipe", () => {
    const disc = new GoldDiscController();
    disc.begin(0, 0, 0);
    assert.deepEqual(disc.hold(301), [{ type: "interact", down: true }]);
    disc.move(34, 0);
    const end = disc.end(34, 0, 340);
    assert.deepEqual(end, [
      { type: "interact", down: false },
      { type: "pulse", key: "reload" },
    ]);
  });

  it("turns a second tap into solar mass instead of two abilities", () => {
    const disc = new GoldDiscController();
    disc.begin(0, 0, 0);
    assert.equal(disc.end(2, 1, 40)[0]?.type, "await-tap");
    const second = disc.begin(0, 0, 180);
    assert.equal(second[0]?.type === "pulse" && second[0].key, "mass");
    assert.equal(disc.flush(500).length, 0);
    assert.equal(disc.end(0, 0, 220).length, 0);
  });

  it("fires the tactical skill only after the double-tap window", () => {
    const disc = new GoldDiscController();
    disc.begin(0, 0, 0);
    disc.end(1, 1, 30);
    assert.equal(disc.flush(200).length, 0);
    const fired = disc.flush(280);
    assert.equal(fired[0]?.type === "pulse" && fired[0].key, "ability");
  });
});
