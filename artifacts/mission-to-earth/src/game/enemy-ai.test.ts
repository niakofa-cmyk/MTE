import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stepEnemyMind } from "./enemy-ai.ts";

describe("enemy mind", () => {
  it("does not shoot on the first glimpse", () => {
    const next = stepEnemyMind({
      state: "patrol",
      seen: true,
      heard: false,
      dt: 0.1,
      age: 0,
      lastX: 0,
      lastZ: 0,
      actorX: 4,
      actorZ: 2,
    });
    assert.equal(next.state, "suspicious");
    assert.equal(next.shoot, false);
  });

  it("engages after the suspicion window and records the last known point", () => {
    const next = stepEnemyMind({
      state: "suspicious",
      seen: true,
      heard: false,
      dt: 0.5,
      age: 0.4,
      lastX: 1,
      lastZ: 1,
      actorX: 8,
      actorZ: -3,
    });
    assert.equal(next.state, "engage");
    assert.equal(next.shoot, true);
    assert.equal(next.lastX, 8);
    assert.equal(next.lastZ, -3);
  });

  it("investigates when sight is lost, then searches, then returns to patrol", () => {
    const investigate = stepEnemyMind({
      state: "engage",
      seen: false,
      heard: false,
      dt: 0.2,
      age: 1,
      lastX: 12,
      lastZ: 4,
      actorX: 12,
      actorZ: 4,
    });
    assert.equal(investigate.state, "investigate");
    assert.equal(investigate.shoot, false);
    const search = stepEnemyMind({ ...investigate, seen: false, heard: false, dt: 4.1, actorX: 12, actorZ: 4 });
    assert.equal(search.state, "search");
    const patrol = stepEnemyMind({ ...search, seen: false, heard: false, dt: 3.6, actorX: 12, actorZ: 4 });
    assert.equal(patrol.state, "patrol");
  });

  it("does not see through a wall when the caller says unseen", () => {
    const next = stepEnemyMind({
      state: "patrol",
      seen: false,
      heard: false,
      dt: 1,
      age: 0,
      lastX: 0,
      lastZ: 0,
      actorX: 20,
      actorZ: 20,
    });
    assert.equal(next.state, "patrol");
    assert.equal(next.shoot, false);
  });
});
