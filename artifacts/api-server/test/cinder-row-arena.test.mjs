import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import { fileURLToPath } from "node:url";
import { CinderRowRelayRound } from "../src/lib/cinder-row-arena.ts";
import { createCinderRowAuthoritativeMatch } from "../src/lib/match-bootstrap.ts";
import { MatchSessionManager } from "../src/lib/match-session-manager.ts";
import { createMatchSessionsRouter } from "../src/routes/matches.ts";

const geometryPath = fileURLToPath(
  new URL("../src/data/generated/cinder-row-blackout-level-geometry.json", import.meta.url),
);
const registryPath = fileURLToPath(
  new URL("../src/data/generated/cinder-row-blackout-gameplay-registry.json", import.meta.url),
);

const accord = {
  playerId: "accord-player",
  team: "accord",
  position: { x: 0, z: 0 },
  alive: true,
};
const dusk = {
  playerId: "dusk-player",
  team: "eon-dusk",
  position: { x: 0, z: 0 },
  alive: true,
};

test("Cinder Row relay waits for both teams and does not advance while contested", () => {
  const round = new CinderRowRelayRound();

  round.step(1, [accord]);
  assert.equal(round.snapshot().phase, "waiting");

  round.step(1, [accord, dusk]);
  const contested = round.snapshot();
  assert.equal(contested.phase, "active");
  assert.equal(contested.contested, true);
  assert.equal(contested.relayProgress, 0);
});

test("Cinder Row relay awards the round after uncontested control", () => {
  const round = new CinderRowRelayRound();
  round.step(1, [accord, dusk]);

  for (let tick = 0; tick < 200; tick += 1) {
    round.step(0.1, [accord]);
  }

  const completed = round.snapshot();
  assert.equal(completed.phase, "finished");
  assert.equal(completed.winner, "accord");
  assert.equal(completed.controlledBy, "accord");
  assert.equal(completed.relayProgress, 100);
});

test("Cinder Row timed-out rounds finish as draws", () => {
  const round = new CinderRowRelayRound();
  const outside = { ...accord, position: { x: 20, z: 20 } };
  const duskOutside = { ...dusk, position: { x: 22, z: 20 } };

  for (let tick = 0; tick < 1_810; tick += 1) {
    round.step(0.1, [outside, duskOutside]);
  }

  assert.deepEqual(
    { phase: round.snapshot().phase, winner: round.snapshot().winner },
    { phase: "finished", winner: null },
  );
});

test("players outside the relay cannot capture it and non-finite time is ignored", () => {
  const round = new CinderRowRelayRound();
  const outside = { ...accord, position: { x: 20, z: 20 } };
  const duskOutside = { ...dusk, position: { x: 22, z: 20 } };
  const before = round.snapshot();

  round.step(Number.NaN, [outside, duskOutside]);
  round.step(5, [outside, duskOutside]);

  const after = round.snapshot();
  assert.equal(after.relayProgress, before.relayProgress);
  assert.equal(after.winner, null);
});

test("Cinder Row match creation joins two server-assigned teams at opposing spawns", async () => {
  let nowNs = 1_000_000_000n;
  const manager = new MatchSessionManager(
    async () => createCinderRowAuthoritativeMatch(undefined, geometryPath, registryPath),
    { maxActiveSessions: 2, nowNs: () => nowNs },
  );
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: "cinder-test-user" };
    req.isAuthenticated = () => true;
    next();
  });
  app.use("/api", createMatchSessionsRouter(manager));
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  try {
    const createdResponse = await fetch(`${baseUrl}/matches`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mapId: "cinder-row-blackout" }),
    });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();
    assert.equal(created.mapId, "cinder-row-blackout");
    assert.equal(created.gameModeId, "relay-control");
    assert.equal(created.maxPlayers, 8);

    const joined = [];
    for (const operatorId of ["jaya", "khensu"]) {
      const response = await fetch(`${baseUrl}/matches/${created.matchId}/players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operatorId }),
      });
      assert.equal(response.status, 201);
      joined.push(await response.json());
    }

    const accordPlayer = joined[0].snapshot.players.find(
      (player) => player.playerId === joined[0].playerId,
    );
    const duskPlayer = joined[1].snapshot.players.find(
      (player) => player.playerId === joined[1].playerId,
    );
    assert.equal(accordPlayer.team, "accord");
    assert.equal(duskPlayer.team, "eon-dusk");
    assert.ok(accordPlayer.position.x < 0);
    assert.ok(duskPlayer.position.x > 0);
    assert.equal(joined[1].snapshot.mapVersion, "1.0.0");
    assert.equal(joined[1].snapshot.arenaRound.phase, "waiting");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    manager.stop();
  }
});
