import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_MATCH_CONFIG,
} from "../src/lib/authoritative-match.ts";
import {
  createNodAuthoritativeMatch,
} from "../src/lib/match-bootstrap.ts";
import {
  MatchSessionManager,
} from "../src/lib/match-session-manager.ts";
import {
  createMatchSessionsRouter,
} from "../src/routes/matches.ts";
import { createExtractionRouter } from "../src/routes/extractions.ts";

const generatedMapPath = fileURLToPath(
  new URL("../src/data/generated/nod-level-geometry.json", import.meta.url),
);
const generatedGameplayPath = fileURLToPath(
  new URL("../src/data/generated/nod-gameplay-registry.json", import.meta.url),
);

test("match session routes load the map, assign server identity, and authorize actions", async () => {
  let nowNs = 1_000_000_000n;
  let authoritativeMatch;
  const bootstrap = async () => {
    const result = await createNodAuthoritativeMatch(
      DEFAULT_MATCH_CONFIG,
      generatedMapPath,
      generatedGameplayPath,
    );
    authoritativeMatch = result.match;
    return result;
  };
  const manager = new MatchSessionManager(
    bootstrap,
    {
      maxActiveSessions: 1,
      idleTimeoutMs: 1_000,
      maxSessionLifetimeMs: 10_000,
      nowNs: () => nowNs,
    },
  );
  const app = express();
  app.use(express.json({ limit: "16kb" }));
  app.use((req, _res, next) => {
    const userId = req.get("x-test-user-id");
    if (userId) req.user = { id: userId };
    req.isAuthenticated = () => Boolean(req.user);
    next();
  });
  app.use("/api", createMatchSessionsRouter(manager));
  app.use("/api", createExtractionRouter(manager));

  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  try {
    const anonymousCreate = await fetch(`${baseUrl}/matches`, { method: "POST" });
    assert.equal(anonymousCreate.status, 401);

    const createdResponse = await fetch(`${baseUrl}/matches`, {
      method: "POST",
      headers: { "x-test-user-id": "host" },
    });
    assert.equal(createdResponse.status, 201);
    assert.equal(createdResponse.headers.get("cache-control"), "no-store");
    const created = await createdResponse.json();
    assert.ok(created.mapNodeCount > 0);
    assert.equal(created.maxPlayers, 64);

    const fullResponse = await fetch(`${baseUrl}/matches`, {
      method: "POST",
      headers: { "x-test-user-id": "host" },
    });
    assert.equal(fullResponse.status, 503);

    const invalidJoinResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/players`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-user-id": "host" },
        body: JSON.stringify({ spawn: { x: 0, y: 0, z: 0 } }),
      },
    );
    assert.equal(invalidJoinResponse.status, 400);
    const invalidOperatorResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/players`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-user-id": "host" },
        body: JSON.stringify({ operatorId: "admin" }),
      },
    );
    assert.equal(invalidOperatorResponse.status, 400);

    const joinedResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/players`,
      { method: "POST", headers: { "x-test-user-id": "guest" } },
    );
    assert.equal(joinedResponse.status, 201);
    const joined = await joinedResponse.json();
    assert.match(joined.playerId, /^[0-9a-f-]{36}$/i);
    assert.match(joined.accessToken, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(joined.snapshot.players[0].playerId, joined.playerId);
    assert.deepEqual(joined.snapshot.players[0].position, { x: 0, y: 0, z: 86 });

    const accountJoinResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/players`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test-user-id": "account-owner",
        },
        body: JSON.stringify({ operatorId: "jaya" }),
      },
    );
    assert.equal(accountJoinResponse.status, 201);
    const accountJoin = await accountJoinResponse.json();
    const ownerStatus = await fetch(
      `${baseUrl}/matches/${created.matchId}/extraction/status`,
      {
        headers: {
          authorization: `Bearer ${accountJoin.accessToken}`,
          "x-test-user-id": "account-owner",
        },
      },
    );
    assert.equal(ownerStatus.status, 200);
    assert.equal((await ownerStatus.json()).ready, false);

    const otherAccountStatus = await fetch(
      `${baseUrl}/matches/${created.matchId}/extraction/status`,
      {
        headers: {
          authorization: `Bearer ${accountJoin.accessToken}`,
          "x-test-user-id": "different-account",
        },
      },
    );
    assert.equal(otherAccountStatus.status, 401);

    const forgedExtraction = await fetch(
      `${baseUrl}/matches/${created.matchId}/extraction/settle`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accountJoin.accessToken}`,
          "x-test-user-id": "account-owner",
          "content-type": "application/json",
        },
        body: JSON.stringify({ loot: [{ scrap: 500_000 }] }),
      },
    );
    assert.equal(forgedExtraction.status, 400);

    const unauthenticatedStatus = await fetch(
      `${baseUrl}/matches/${created.matchId}/extraction/status`,
      { headers: { authorization: `Bearer ${accountJoin.accessToken}` } },
    );
    assert.equal(unauthenticatedStatus.status, 401);

    const secondJoinResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/players`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-user-id": "guest" },
        body: JSON.stringify({ operatorId: "aset" }),
      },
    );
    assert.equal(secondJoinResponse.status, 201);
    const secondJoin = await secondJoinResponse.json();
    assert.equal(secondJoin.operatorId, "aset");
    const secondSpawn = secondJoin.snapshot.players.find(
      (player) => player.playerId === secondJoin.playerId,
    );
    assert.equal(secondSpawn.operatorId, "aset");
    assert.equal(secondSpawn.rightWeapon.weaponId, "rail");
    assert.ok(Math.hypot(secondSpawn.position.x, secondSpawn.position.z - 86) > 12);
    assert.ok(Math.abs(secondSpawn.position.x) <= 152);
    assert.ok(Math.abs(secondSpawn.position.z) <= 152);

    const missingGameplayAuth = await fetch(
      `${baseUrl}/matches/${created.matchId}/world-state`,
    );
    assert.equal(missingGameplayAuth.status, 401);

    const gameplayResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/world-state`,
      { headers: { authorization: `Bearer ${joined.accessToken}` } },
    );
    assert.equal(gameplayResponse.status, 200);
    const gameplayState = await gameplayResponse.json();
    assert.equal(gameplayState.gameplay.lootSpawns.length, 87);
    assert.equal(gameplayState.gameplay.terminals.length, 4);
    assert.deepEqual(
      gameplayState.gameplay.objectives.map((objective) => objective.id),
      ["rescue-alpha", "rescue-omega", "raise-beacon", "extract"],
    );
    assert.equal(
      gameplayState.gameplay.objectives[0].state,
      "waiting-for-server-event",
    );

    const missingAuth = await fetch(
      `${baseUrl}/matches/${created.matchId}/snapshot`,
    );
    assert.equal(missingAuth.status, 401);

    const spoofedInput = await fetch(
      `${baseUrl}/matches/${created.matchId}/input`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${joined.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sequenceNumber: 1,
          inputFlags: 1,
          pitch: 0,
          yaw: 0,
          movementVector: { forward: 0, strafe: 0 },
          playerId: "another-player",
        }),
      },
    );
    assert.equal(spoofedInput.status, 400);

    for (const clientClaim of [
      { objectiveId: "mission-terminal", isBreached: true },
      { weaponClassId: 201, rewardClaim: "extracted" },
    ]) {
      const forgedClaimResponse = await fetch(
        `${baseUrl}/matches/${created.matchId}/input`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${joined.accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sequenceNumber: 1,
            inputFlags: 0,
            pitch: 0,
            yaw: 0,
            movementVector: { forward: 0, strafe: 0 },
            ...clientClaim,
          }),
        },
      );
      assert.equal(forgedClaimResponse.status, 400);
    }

    const inputResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/input`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${joined.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sequenceNumber: 1,
          inputFlags: 1,
          pitch: 0,
          yaw: 0,
          movementVector: { forward: 0, strafe: 0 },
        }),
      },
    );
    assert.equal(inputResponse.status, 202);

    manager.advanceAt(nowNs);
    nowNs += 20_000_000n;
    manager.advanceAt(nowNs);

    const snapshotResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/snapshot`,
      { headers: { authorization: `Bearer ${joined.accessToken}` } },
    );
    assert.equal(snapshotResponse.status, 200);
    const state = await snapshotResponse.json();
    assert.equal(state.snapshot.players[0].rightHandState, "FIRING");
    assert.equal(state.snapshot.players[0].lastProcessedSequence, 1);

    const targetLoot = gameplayState.gameplay.lootSpawns[0];
    assert.ok(targetLoot);
    const spoofedLootClaim = await fetch(
      `${baseUrl}/matches/${created.matchId}/loot/${targetLoot.id}/claim`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${joined.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          position: { x: targetLoot.x, y: 0, z: targetLoot.z },
          grant: { scrap: 100_000 },
        }),
      },
    );
    assert.equal(spoofedLootClaim.status, 400);

    authoritativeMatch.getPlayerPosition = () => ({ x: 500, y: 0, z: 500 });
    const outOfRangeClaim = await fetch(
      `${baseUrl}/matches/${created.matchId}/loot/${targetLoot.id}/claim`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${joined.accessToken}` },
      },
    );
    assert.equal(outOfRangeClaim.status, 422);

    authoritativeMatch.getPlayerPosition = () => ({
      x: targetLoot.x,
      y: 0,
      z: targetLoot.z,
    });
    const claimResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/loot/${targetLoot.id}/claim`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${joined.accessToken}` },
      },
    );
    assert.equal(claimResponse.status, 200);
    const claimed = await claimResponse.json();
    assert.equal(claimed.item.lootId, targetLoot.id);
    assert.equal(claimed.inventory.length, 1);

    const duplicateClaim = await fetch(
      `${baseUrl}/matches/${created.matchId}/loot/${targetLoot.id}/claim`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${joined.accessToken}` },
      },
    );
    assert.equal(duplicateClaim.status, 409);

    const refreshedGameplayResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/world-state`,
      { headers: { authorization: `Bearer ${joined.accessToken}` } },
    );
    const refreshedGameplay = await refreshedGameplayResponse.json();
    assert.equal(
      refreshedGameplay.gameplay.lootSpawns.find((spawn) => spawn.id === targetLoot.id)
        .available,
      false,
    );
    assert.equal(refreshedGameplay.gameplay.inventory.length, 1);

    const targetTerminal = gameplayState.gameplay.terminals[0];
    assert.ok(targetTerminal);
    authoritativeMatch.getPlayerPosition = () => ({
      x: targetTerminal.x + targetTerminal.interactionRadius + 1,
      y: 0,
      z: targetTerminal.z,
    });
    const outOfRangeTerminal = await fetch(
      `${baseUrl}/matches/${created.matchId}/terminals/${targetTerminal.id}/open`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${joined.accessToken}` },
      },
    );
    assert.equal(outOfRangeTerminal.status, 422);

    authoritativeMatch.getPlayerPosition = () => ({
      x: targetTerminal.x,
      y: 0,
      z: targetTerminal.z,
    });
    const openedTerminal = await fetch(
      `${baseUrl}/matches/${created.matchId}/terminals/${targetTerminal.id}/open`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${joined.accessToken}` },
      },
    );
    assert.equal(openedTerminal.status, 200);
    const terminalResult = await openedTerminal.json();
    assert.equal(terminalResult.lootIds.length, 4);

    const duplicateTerminal = await fetch(
      `${baseUrl}/matches/${created.matchId}/terminals/${targetTerminal.id}/open`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${joined.accessToken}` },
      },
    );
    assert.equal(duplicateTerminal.status, 409);

    const openedWorldResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/world-state`,
      { headers: { authorization: `Bearer ${joined.accessToken}` } },
    );
    const openedWorld = await openedWorldResponse.json();
    assert.equal(
      openedWorld.gameplay.terminals.find((entry) => entry.id === targetTerminal.id).state,
      "opened",
    );
    assert.equal(openedWorld.gameplay.lootSpawns.length, 91);

    const leaveResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/player`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${joined.accessToken}` },
      },
    );
    assert.equal(leaveResponse.status, 204);

    nowNs += 1_001_000_000n;
    manager.advanceAt(nowNs);
    const expiredResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/snapshot`,
      { headers: { authorization: `Bearer ${joined.accessToken}` } },
    );
    assert.equal(expiredResponse.status, 404);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    manager.stop();
  }
});
