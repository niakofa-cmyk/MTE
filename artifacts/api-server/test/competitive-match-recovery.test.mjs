import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  competitiveMatchSessionsTable,
  db,
  usersTable,
} from "@workspace/db";
import test from "node:test";
import { MatchSessionManager } from "../src/lib/match-session-manager.ts";
import { createCinderRowAuthoritativeMatch } from "../src/lib/match-bootstrap.ts";
import {
  CompetitiveMatchService,
  interruptUnfinishedCompetitiveMatches,
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
