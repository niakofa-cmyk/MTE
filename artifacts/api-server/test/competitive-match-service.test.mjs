import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import test from "node:test";
import { createCinderRowAuthoritativeMatch } from "../src/lib/match-bootstrap.ts";
import { CompetitiveMatchService } from "../src/lib/competitive-match-service.ts";
import { MatchSessionManager } from "../src/lib/match-session-manager.ts";
import { createCompetitiveRouter } from "../src/routes/competitive.ts";
import { balancedTeamJoinOrder } from "../src/lib/competitive-match-service.ts";

test("ranked team drafting minimizes average rating gap", () => {
  const players = [2_000, 1_900, 1_800, 1_700, 1_600, 1_500, 1_400, 1_300]
    .map((rating, index) => ({ userId: `player-${index}`, rating }));
  const order = balancedTeamJoinOrder(players);
  const accord = order.filter((_player, index) => index % 2 === 0);
  const dusk = order.filter((_player, index) => index % 2 === 1);
  const average = (team) =>
    team.reduce((sum, player) => sum + player.rating, 0) / team.length;

  assert.equal(Math.abs(average(accord) - average(dusk)), 0);
});

test("ranked team drafting remains bounded for future large match profiles", () => {
  const players = Array.from({ length: 100 }, (_, index) => ({
    userId: `large-player-${index}`,
    rating: 800 + ((index * 7_919) % 3_000),
  }));
  const order = balancedTeamJoinOrder(players);
  const accord = order.filter((_player, index) => index % 2 === 0);
  const dusk = order.filter((_player, index) => index % 2 === 1);

  assert.equal(order.length, 100);
  assert.equal(new Set(order.map((player) => player.userId)).size, 100);
  assert.equal(accord.length, 50);
  assert.equal(dusk.length, 50);
  assert.throws(
    () => balancedTeamJoinOrder([{ rating: 1 }, { rating: Number.NaN }]),
    /non-negative safe integers/,
  );
});

test("ranked queue forms a private account-owned match and supports cancellation", async () => {
  const manager = new MatchSessionManager(async () => createCinderRowAuthoritativeMatch());
  const competitive = new CompetitiveMatchService(manager, {
    matchSize: 2,
    readRating: async (userId) => userId === "ranked-one" ? 1_200 : 1_180,
    persistResult: async () => undefined,
  });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const userId = req.get("x-test-user-id");
    if (userId) req.user = { id: userId };
    req.isAuthenticated = () => Boolean(req.user);
    next();
  });
  app.use("/api", createCompetitiveRouter(competitive));
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  try {
    const anonymous = await fetch(`${baseUrl}/competitive/ranked/queue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operatorId: "jaya" }),
    });
    assert.equal(anonymous.status, 401);

    const firstResponse = await fetch(`${baseUrl}/competitive/ranked/queue`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-user-id": "ranked-one",
      },
      body: JSON.stringify({ operatorId: "jaya" }),
    });
    assert.equal(firstResponse.status, 202);
    const first = await firstResponse.json();
    assert.equal(first.state, "queued");
    assert.equal(first.rating, 1_200);
    assert.equal(first.position, 1);

    const secondResponse = await fetch(`${baseUrl}/competitive/ranked/queue`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-user-id": "ranked-two",
      },
      body: JSON.stringify({ operatorId: "khensu" }),
    });
    assert.equal(secondResponse.status, 202);
    const second = await secondResponse.json();
    assert.equal(second.state, "matched");
    assert.equal(second.match.mapId, "cinder-row-blackout");
    assert.equal(second.match.team === "accord" || second.match.team === "eon-dusk", true);

    const firstStatus = await fetch(`${baseUrl}/competitive/ranked/status`, {
      headers: { "x-test-user-id": "ranked-one" },
    });
    const firstTicket = await firstStatus.json();
    assert.equal(firstStatus.status, 200);
    assert.equal(firstTicket.state, "matched");
    assert.equal(firstTicket.match.matchId, second.match.matchId);
    assert.match(firstTicket.match.accessToken, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(
      manager.getRealtimeState(
        firstTicket.match.matchId,
        firstTicket.match.accessToken,
        "ranked-one",
      ).playerId,
      firstTicket.match.playerId,
    );

    const cannotCancelMatched = await fetch(`${baseUrl}/competitive/ranked/queue`, {
      method: "DELETE",
      headers: { "x-test-user-id": "ranked-one" },
    });
    assert.equal(cannotCancelMatched.status, 409);

    const queuedThird = await fetch(`${baseUrl}/competitive/ranked/queue`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-user-id": "ranked-three",
      },
      body: JSON.stringify({ operatorId: "aset" }),
    });
    assert.equal((await queuedThird.json()).state, "queued");
    const cancelled = await fetch(`${baseUrl}/competitive/ranked/queue`, {
      method: "DELETE",
      headers: { "x-test-user-id": "ranked-three" },
    });
    assert.equal(cancelled.status, 200);
    assert.equal((await cancelled.json()).state, "idle");
  } finally {
    manager.stop();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("a completed draw persists its result and releases matched player tickets", async () => {
  const manager = new MatchSessionManager(async () => createCinderRowAuthoritativeMatch());
  const savedResults = [];
  let finishedResult = null;
  const competitive = new CompetitiveMatchService(manager, {
    matchSize: 2,
    readRating: async () => 1_000,
    readFinishedResult: () => finishedResult,
    persistResult: async (result) => savedResults.push(result),
  });

  await competitive.enqueue("draw-one", "jaya");
  const match = await competitive.enqueue("draw-two", "khensu");
  assert.equal(match.state, "matched");
  if (match.state !== "matched") throw new Error("Expected a ranked match ticket.");
  assert.equal(competitive.status("draw-one").state, "matched");

  finishedResult = {
    matchId: match.match.matchId,
    winner: "draw",
    players: [
      { userId: "draw-one", team: "accord" },
      { userId: "draw-two", team: "eon-dusk" },
    ],
  };
  await competitive.runMaintenance();

  assert.deepEqual(savedResults, [finishedResult]);
  assert.equal(competitive.status("draw-one").state, "idle");
  assert.equal(competitive.status("draw-two").state, "idle");
});

test("a completed draw releases ranked tickets without awarding a team win", async () => {
  const manager = new MatchSessionManager(async () => createCinderRowAuthoritativeMatch());
  let finishedResult = null;
  const persistedResults = [];
  const competitive = new CompetitiveMatchService(manager, {
    matchSize: 2,
    readRating: async () => 1_000,
    readFinishedResult: () => finishedResult,
    persistResult: async (result) => persistedResults.push(result),
  });

  await competitive.enqueue("draw-one", "jaya");
  const matched = await competitive.enqueue("draw-two", "khensu");
  assert.equal(matched.state, "matched");
  assert.equal(competitive.status("draw-one").state, "matched");
  assert.equal(competitive.status("draw-two").state, "matched");
  if (matched.state !== "matched") throw new Error("The test match was not formed.");

  finishedResult = {
    matchId: matched.match.matchId,
    winner: "draw",
    players: [
      { userId: "draw-one", team: "accord" },
      { userId: "draw-two", team: "eon-dusk" },
    ],
  };
  await competitive.runMaintenance();

  assert.deepEqual(persistedResults, [finishedResult]);
  assert.equal(competitive.status("draw-one").state, "idle");
  assert.equal(competitive.status("draw-two").state, "idle");
});
