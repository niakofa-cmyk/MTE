import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import test from "node:test";
import { PostgresCompetitiveQueueStore } from "../src/lib/competitive-queue-store.ts";

test("ranked queue survives store recreation and an expired claim can be recovered", async () => {
  const userIds = [`queue-test-${randomUUID()}`, `queue-test-${randomUUID()}`];
  const regionId = `test-${randomUUID()}`;
  const firstStore = new PostgresCompetitiveQueueStore("test-mode", regionId);
  const secondStore = new PostgresCompetitiveQueueStore("test-mode", regionId);
  const now = Date.now();
  await db.insert(usersTable).values(userIds.map((id) => ({ id })));

  try {
    await Promise.all(userIds.map((userId, index) =>
      firstStore.enqueue({
        userId,
        operatorId: index === 0 ? "jaya" : "khensu",
        rating: 1_000 + index,
        queuedAt: now + index,
      })
    ));

    const recoveredStatus = await secondStore.status(userIds[1]);
    assert.equal(recoveredStatus?.entry.userId, userIds[1]);
    assert.equal(recoveredStatus?.position, 2);
    assert.equal(recoveredStatus?.queuedPlayers, 2);

    const firstClaim = await firstStore.claimNextBatch(2, now + 100);
    assert.ok(firstClaim);
    assert.equal(firstClaim.entries.length, 2);
    assert.equal(await secondStore.claimNextBatch(2, now + 100), null);
    assert.equal((await secondStore.status(userIds[0]))?.queuedPlayers, 2);

    const recoveredClaim = await secondStore.claimNextBatch(2, now + 31_000);
    assert.ok(recoveredClaim);
    await secondStore.completeClaim(recoveredClaim.claimId);
    assert.equal(await firstStore.status(userIds[0]), null);
    assert.equal(await firstStore.status(userIds[1]), null);
  } finally {
    await db.delete(usersTable).where(inArray(usersTable.id, userIds));
  }
});
