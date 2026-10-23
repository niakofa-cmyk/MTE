import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stepEnemyMind, type MindInput } from "./enemy-ai.ts";

const input = (overrides: Partial<MindInput> = {}): MindInput => ({
  state: "patrol",
  seen: false,
  heard: false,
  dt: 0.1,
  age: 0,
  lastX: 0,
  lastZ: 0,
  actorX: 4,
  actorZ: 2,
  ...overrides,
});

describe("enemy mind", () => {
  it("does not shoot on the first glimpse", () => {
    const next = stepEnemyMind(input({ seen: true }));
    assert.equal(next.state, "suspicious");
    assert.equal(next.shoot, false);
    assert.equal(next.age, 0);
  });

  it("does not let 30 seconds of patrol skip the suspicion window", () => {
    const firstSight = stepEnemyMind(input({ seen: true, age: 30 }));
    assert.equal(firstSight.state, "suspicious");
    assert.equal(firstSight.age, 0);
    assert.equal(firstSight.shoot, false);

    const stillSuspicious = stepEnemyMind({
      ...input(),
      ...firstSight,
      seen: true,
      dt: 0.4,
    });
    assert.equal(stillSuspicious.state, "suspicious");
    assert.equal(stillSuspicious.shoot, false);

    const engaged = stepEnemyMind({
      ...input(),
      ...stillSuspicious,
      seen: true,
      dt: 0.06,
      actorX: 8,
      actorZ: -3,
    });
    assert.equal(engaged.state, "engage");
    assert.equal(engaged.age, 0);
    assert.equal(engaged.shoot, true);
    assert.equal(engaged.lastX, 8);
    assert.equal(engaged.lastZ, -3);
  });

  it("resets suspicion after cover loss and reacquisition, while preserving and refreshing the last known point", () => {
    const lostSight = stepEnemyMind(input({
      state: "suspicious",
      seen: false,
      dt: 0.1,
      age: 0.3,
      lastX: 12,
      lastZ: 4,
      actorX: 20,
      actorZ: 20,
    }));
    assert.equal(lostSight.state, "investigate");
    assert.equal(lostSight.age, 0);
    assert.equal(lostSight.lastX, 12);
    assert.equal(lostSight.lastZ, 4);

    const heard = stepEnemyMind({
      ...input(),
      ...lostSight,
      heard: true,
      dt: 0.3,
      actorX: 15,
      actorZ: 6,
    });
    assert.equal(heard.state, "investigate");
    assert.equal(heard.age, 0.3);
    assert.equal(heard.lastX, 15);
    assert.equal(heard.lastZ, 6);

    const reacquired = stepEnemyMind({
      ...input(),
      ...heard,
      seen: true,
      heard: true,
      dt: 2,
      actorX: 8,
      actorZ: -3,
    });
    assert.equal(reacquired.state, "suspicious");
    assert.equal(reacquired.age, 0);
    assert.equal(reacquired.shoot, false);
    assert.equal(reacquired.lastX, 8);
    assert.equal(reacquired.lastZ, -3);

    const afterWindow = stepEnemyMind({
      ...input(),
      ...reacquired,
      seen: true,
      dt: 0.46,
    });
    assert.equal(afterWindow.state, "engage");
    assert.equal(afterWindow.shoot, true);
  });

  it("transitions from investigation to search to patrol using time in each state", () => {
    const investigate = stepEnemyMind(input({
      state: "engage",
      seen: false,
      heard: false,
      dt: 0.2,
      age: 1,
      lastX: 12,
      lastZ: 4,
      actorX: 12,
      actorZ: 4,
    }));
    assert.equal(investigate.state, "investigate");
    assert.equal(investigate.age, 0);
    assert.equal(investigate.shoot, false);
    const search = stepEnemyMind({ ...input(), ...investigate, dt: 4.1 });
    assert.equal(search.state, "search");
    assert.equal(search.age, 0);
    const patrol = stepEnemyMind({ ...input(), ...search, dt: 3.6 });
    assert.equal(patrol.state, "patrol");
    assert.equal(patrol.age, 0);
  });

  it("does not see through a wall when the caller says unseen", () => {
    const next = stepEnemyMind(input({ seen: false, heard: false, dt: 1, actorX: 20, actorZ: 20 }));
    assert.equal(next.state, "patrol");
    assert.equal(next.age, 1);
    assert.equal(next.shoot, false);
  });

  it("reacts to a sound while patrolling without treating it as visual confirmation", () => {
    const next = stepEnemyMind(input({
      age: 30,
      heard: true,
      actorX: 15,
      actorZ: -8,
    }));
    assert.equal(next.state, "suspicious");
    assert.equal(next.age, 0);
    assert.equal(next.shoot, false);
    assert.equal(next.lastX, 15);
    assert.equal(next.lastZ, -8);
  });
});
