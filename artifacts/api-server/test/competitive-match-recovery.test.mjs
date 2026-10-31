import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import {
  competitiveMatchResultsTable,
  competitiveMatchSessionsTable,
  competitiveRatingsTable,
  db,
  usersTable,
} from "@workspace/db";
import test from "node:test";
import { MatchSessionManager } from "../src/lib/match-session-manager.ts";
import { createCinderRowAuthoritativeMatch } from "../src/lib/match-bootstrap.ts";
import {
  CompetitiveMatchService,
  interruptUnfinishedCompetitiveMatches,
  persistCompetitiveResult,
} from "../src/lib/competitive-match-service.ts";
import { MemoryCompetitiveQueueStore } from "./helpers/memory-competitive-queue-store.mjs";

test("restart recovery marks a live match interrupted and lets its player requeue", async () => {
  const userId = `recovery-${randomUUID()}`;
  const matchId = randomUUID();
  const modeId = `recovery-mode-${randomUUID()}`;
  const regionId = `recovery-region-${randomUUID()}`;
  await db.insert(usersTable).values({ id: userId });
  await db.insert(competitiveMatchSessionsTable).values({
    matchId,
    modeId,
    regionId,
    mapId: "cinder-row-blackout",
    status: "active",
    participants: [{ userId, team: "accord" }],
  });

  const manager = new MatchSessionManager(async () => createCinderRowAuthoritativeMatch());
  const competitive = new CompetitiveMatchService(manager, {
    matchSize: 2,
    queueStore: new MemoryCompetitiveQueueStore(),
    readRating: async () => 1_000,
    persistResult: async () => {
      throw new Error("An interrupted match must not grant a ranked result.");
    },
  });

  try {
    assert.equal(await interruptUnfinishedCompetitiveMatches({ modeId, regionId }), 1);
    assert.deepEqual(await competitive.status(userId), {
      state: "interrupted",
      rating: 1_000,
    });

    const requeued = await competitive.enqueue(userId, "jaya");
    assert.equal(requeued.state, "queued");
    assert.equal(requeued.position, 1);
  } finally {
    manager.stop();
    await db.delete(competitiveMatchSessionsTable)
      .where(eq(competitiveMatchSessionsTable.matchId, matchId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  }
});

test("a settled ranked result survives restart without rating duplication or false interruption", async () => {
  const matchId = randomUUID();
  const modeId = "cinder-row-relay-4v4";
  const regionId = `settled-region-${randomUUID()}`;
  const userIds = [`settled-${randomUUID()}`, `settled-${randomUUID()}`];
  await db.insert(usersTable).values(userIds.map((id) => ({ id })));
  await db.insert(competitiveMatchSessionsTable).values({
    matchId,
    modeId,
    regionId,
    mapId: "cinder-row-blackout",
    status: "active",
    participants: [
      { userId: userIds[0], team: "accord" },
      { userId: userIds[1], team: "eon-dusk" },
    ],
  });
  const result = {
    matchId,
    winner: "accord",
    players: [
      { userId: userIds[0], team: "accord" },
      { userId: userIds[1], team: "eon-dusk" },
    ],
  };
  const managerAfterRestart = new MatchSessionManager(
    async () => createCinderRowAuthoritativeMatch(),
  );

  try {
    await persistCompetitiveResult(result);
    assert.equal(
      await interruptUnfinishedCompetitiveMatches({ modeId, regionId }),
      0,
      "A completed result must not be marked interrupted at startup.",
    );

    const serviceAfterRestart = new CompetitiveMatchService(managerAfterRestart, {
      profileId: modeId,
      matchSize: 2,
      queueStore: new MemoryCompetitiveQueueStore(),
    });
    assert.deepEqual(await serviceAfterRestart.status(userIds[0]), { state: "idle" });
    await persistCompetitiveResult(result);

    const [session] = await db.select()
      .from(competitiveMatchSessionsTable)
      .where(eq(competitiveMatchSessionsTable.matchId, matchId));
    assert.equal(session.status, "completed");
    const [storedResult] = await db.select()
      .from(competitiveMatchResultsTable)
      .where(eq(competitiveMatchResultsTable.matchId, matchId));
    assert.equal(storedResult.participants.length, 2);
    const ratings = await db.select()
      .from(competitiveRatingsTable)
      .where(inArray(competitiveRatingsTable.userId, userIds));
    assert.equal(ratings.length, 2);
    assert.ok(ratings.every((rating) => rating.gamesPlayed === 1));
    assert.deepEqual(
      Object.fromEntries(ratings.map((rating) => [rating.userId, rating.rating])),
      { [userIds[0]]: 1_016, [userIds[1]]: 984 },
    );
  } finally {
    managerAfterRestart.stop();
    await db.delete(competitiveMatchResultsTable)
      .where(eq(competitiveMatchResultsTable.matchId, matchId));
    await db.delete(competitiveRatingsTable)
      .where(inArray(competitiveRatingsTable.userId, userIds));
    await db.delete(competitiveMatchSessionsTable)
      .where(eq(competitiveMatchSessionsTable.matchId, matchId));
    await db.delete(usersTable).where(inArray(usersTable.id, userIds));
  }
});
