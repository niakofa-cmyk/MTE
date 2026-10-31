import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import express from "express";
import test from "node:test";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { MatchSessionError } from "../src/lib/match-session-manager.ts";
import {
  getPlayerProfile,
  getServerExtractionReceipt,
  persistServerExtractionReceipt,
} from "../src/lib/profile-service.ts";
import { createExtractionRouter } from "../src/routes/extractions.ts";

test("a server-verified receipt can settle after restart and remains private to its owner", async () => {
  const ownerId = `receipt-owner-${randomUUID()}`;
  const otherId = `receipt-other-${randomUUID()}`;
  const matchId = randomUUID();
  await db.insert(usersTable).values([
    {
      id: ownerId,
      email: null,
      firstName: "Receipt",
      lastName: "Owner",
      profileImageUrl: null,
    },
    {
      id: otherId,
      email: null,
      firstName: "Other",
      lastName: "Player",
      profileImageUrl: null,
    },
  ]);

  const trustedInventory = [{
    lootId: "map-loot-0001",
    kind: "ammo",
    label: "Verified salvage",
    scrap: 45,
  }];
  try {
    await persistServerExtractionReceipt(ownerId, matchId, trustedInventory, 6);

    // A fresh manager has no in-memory sessions; the durable receipt is the
    // only allowed recovery source after an API process restart.
    const restartedManager = {
      getExtractionStatus() {
        throw new MatchSessionError("not-found", "Match session was not found.");
      },
      getExtractionReward() {
        throw new MatchSessionError("not-found", "Match session was not found.");
      },
      markExtractionSettled() {
        throw new Error("A restarted manager cannot mark an old session.");
      },
    };
    const app = express();
    app.use(express.json({ limit: "16kb" }));
    app.use((req, _res, next) => {
      const userId = req.get("x-test-user-id");
      if (userId) req.user = { id: userId };
      req.isAuthenticated = () => Boolean(req.user);
      next();
    });
    app.use("/api", createExtractionRouter(restartedManager));

    const server = createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}/api/matches/${matchId}/extraction`;

    try {
      const ownerStatus = await fetch(`${baseUrl}/status`, {
        headers: { "x-test-user-id": ownerId },
      });
      assert.equal(ownerStatus.status, 200);
      assert.deepEqual(await ownerStatus.json(), {
        matchId,
        inRange: false,
        progress: 1,
        requiredSeconds: 6,
        ready: true,
        settled: false,
      });

      const otherStatus = await fetch(`${baseUrl}/status`, {
        headers: { "x-test-user-id": otherId },
      });
      assert.equal(otherStatus.status, 401);

      const unauthenticatedSettlement = await fetch(`${baseUrl}/settle`, {
        method: "POST",
      });
      assert.equal(unauthenticatedSettlement.status, 401);

      const forgedSettlement = await fetch(`${baseUrl}/settle`, {
        method: "POST",
        headers: {
          "x-test-user-id": ownerId,
          "content-type": "application/json",
        },
        body: JSON.stringify({ loot: [{ scrap: 999_999 }] }),
      });
      assert.equal(forgedSettlement.status, 400);
      assert.equal((await getPlayerProfile(ownerId)).credits, 0);

      const otherSettlement = await fetch(`${baseUrl}/settle`, {
        method: "POST",
        headers: { "x-test-user-id": otherId },
      });
      assert.equal(otherSettlement.status, 401);

      const ownerSettlement = await fetch(`${baseUrl}/settle`, {
        method: "POST",
        headers: { "x-test-user-id": ownerId },
      });
      assert.equal(ownerSettlement.status, 200);
      const firstResult = await ownerSettlement.json();
      assert.equal(firstResult.alreadySettled, false);
      assert.equal(firstResult.creditsAwarded, 45);
      assert.equal(firstResult.inventory[0].label, "Verified salvage");

      const retry = await fetch(`${baseUrl}/settle`, {
        method: "POST",
        headers: { "x-test-user-id": ownerId },
      });
      assert.equal(retry.status, 200);
      const retryResult = await retry.json();
      assert.equal(retryResult.alreadySettled, true);
      assert.equal(retryResult.profile.credits, 45);
      assert.equal(retryResult.profile.extractions, 1);

      const finalReceipt = await getServerExtractionReceipt(ownerId, matchId);
      assert.equal(finalReceipt?.settled, true);
      assert.equal((await getPlayerProfile(ownerId)).inventory.length, 1);
      assert.equal((await getPlayerProfile(otherId)).credits, 0);
    } finally {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
  } finally {
    await db.delete(usersTable).where(eq(usersTable.id, ownerId));
    await db.delete(usersTable).where(eq(usersTable.id, otherId));
  }
});
