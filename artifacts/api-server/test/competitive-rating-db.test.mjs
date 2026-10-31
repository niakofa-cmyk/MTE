import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import {
  competitiveMatchResultsTable,
  competitiveRatingsTable,
  db,
  usersTable,
} from "@workspace/db";
import test from "node:test";
import { persistCompetitiveResult } from "../src/lib/competitive-match-service.ts";

test("ranked Elo results persist transactionally and cannot be claimed twice", async () => {
  const matchId = randomUUID();
  const winnerId = `ranked-test-${randomUUID()}`;
  const loserId = `ranked-test-${randomUUID()}`;
  const userIds = [winnerId, loserId];

  await db.insert(usersTable).values([
    { id: winnerId },
    { id: loserId },
  ]);
  try {
    const result = {
      matchId,
      winner: "accord",
      players: [
        { userId: winnerId, team: "accord" },
        { userId: loserId, team: "eon-dusk" },
      ],
    };
    await persistCompetitiveResult(result);

    const ratingsAfterFirstClaim = await db
      .select()
      .from(competitiveRatingsTable)
      .where(inArray(competitiveRatingsTable.userId, userIds));
    assert.deepEqual(
      Object.fromEntries(ratingsAfterFirstClaim.map((row) => [row.userId, row.rating])),
      { [winnerId]: 1016, [loserId]: 984 },
    );
    const [storedResult] = await db
      .select()
      .from(competitiveMatchResultsTable)
      .where(eq(competitiveMatchResultsTable.matchId, matchId));
    assert.equal(storedResult.participants.length, 2);

    await persistCompetitiveResult(result);
    const ratingsAfterDuplicate = await db
      .select()
      .from(competitiveRatingsTable)
      .where(inArray(competitiveRatingsTable.userId, userIds));
    assert.deepEqual(
      Object.fromEntries(ratingsAfterDuplicate.map((row) => [row.userId, row.rating])),
      { [winnerId]: 1016, [loserId]: 984 },
    );
    assert.deepEqual(
      Object.fromEntries(ratingsAfterDuplicate.map((row) => [row.userId, row.gamesPlayed])),
      { [winnerId]: 1, [loserId]: 1 },
    );
  } finally {
    await db.delete(competitiveMatchResultsTable)
      .where(eq(competitiveMatchResultsTable.matchId, matchId));
    await db.delete(competitiveRatingsTable)
      .where(inArray(competitiveRatingsTable.userId, userIds));
    await db.delete(usersTable).where(inArray(usersTable.id, userIds));
  }
});
