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

const generatedMapPath = fileURLToPath(
  new URL("../src/data/generated/nod-level-geometry.json", import.meta.url),
);

test("match session routes load the map, assign server identity, and authorize actions", async () => {
  let nowNs = 1_000_000_000n;
  const manager = new MatchSessionManager(
    () => createNodAuthoritativeMatch(DEFAULT_MATCH_CONFIG, generatedMapPath),
    {
      maxActiveSessions: 1,
      idleTimeoutMs: 1_000,
      maxSessionLifetimeMs: 10_000,
      nowNs: () => nowNs,
    },
  );
  const app = express();
  app.use(express.json({ limit: "16kb" }));
  app.use("/api", createMatchSessionsRouter(manager));

  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  try {
    const createdResponse = await fetch(`${baseUrl}/matches`, {
      method: "POST",
    });
    assert.equal(createdResponse.status, 201);
    assert.equal(createdResponse.headers.get("cache-control"), "no-store");
    const created = await createdResponse.json();
    assert.ok(created.mapNodeCount > 0);
    assert.equal(created.maxPlayers, 64);

    const fullResponse = await fetch(`${baseUrl}/matches`, {
      method: "POST",
    });
    assert.equal(fullResponse.status, 503);

    const invalidJoinResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/players`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spawn: { x: 0, y: 0, z: 0 } }),
      },
    );
    assert.equal(invalidJoinResponse.status, 400);

    const joinedResponse = await fetch(
      `${baseUrl}/matches/${created.matchId}/players`,
      { method: "POST" },
    );
    assert.equal(joinedResponse.status, 201);
    const joined = await joinedResponse.json();
    assert.match(joined.playerId, /^[0-9a-f-]{36}$/i);
    assert.match(joined.accessToken, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(joined.snapshot.players[0].playerId, joined.playerId);

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
