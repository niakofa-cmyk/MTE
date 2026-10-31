import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  getPlayerProfile,
  persistServerExtractionReceipt,
  settlePersistedExtraction,
} from "../src/lib/profile-service.ts";

test("server extraction settlement is transactional and idempotent per player and match", async () => {
  const userId = `test-${randomUUID()}`;
  const matchId = randomUUID();
  await db.insert(usersTable).values({
    id: userId,
    email: null,
    firstName: "Integration",
    lastName: "Test",
    profileImageUrl: null,
  });

  try {
    const grants = [
      {
        lootId: "map-loot-0001",
        kind: "weapon",
        label: "Test Weapon",
        scrap: 750,
        weaponId: "rail",
      },
    ];
    const firstReceipt = await persistServerExtractionReceipt(userId, matchId, grants, 6);
    const first = await settlePersistedExtraction(userId, matchId);
    const duplicateReceipt = await persistServerExtractionReceipt(userId, matchId, [
      { ...grants[0], label: "Forged replacement", scrap: 1 },
    ], 6);
    const duplicate = await settlePersistedExtraction(userId, matchId);
    const profile = await getPlayerProfile(userId);

    assert.equal(first.alreadySettled, false);
    assert.equal(firstReceipt.inventory[0]?.label, "Test Weapon");
    assert.equal(duplicateReceipt.inventory[0]?.label, "Test Weapon");
    assert.equal(first.creditsAwarded, 500);
    assert.equal(duplicate.alreadySettled, true);
    assert.equal(duplicate.creditsAwarded, 500);
    assert.equal(profile.credits, 500);
    assert.equal(profile.extractions, 1);
    assert.equal(profile.inventory.length, 1);
    assert.equal(profile.inventory[0]?.label, "Test Weapon");
  } finally {
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  }
});
