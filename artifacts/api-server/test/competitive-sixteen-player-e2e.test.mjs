import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import {
  competitiveMatchResultsTable,
  competitiveMatchSessionsTable,
  competitiveQueueEntriesTable,
  competitiveRatingsTable,
  db,
  usersTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import test from "node:test";
import { WebSocket } from "ws";
import { CompetitiveMatchService } from "../src/lib/competitive-match-service.ts";
import { PostgresCompetitiveQueueStore } from "../src/lib/competitive-queue-store.ts";
import { MemoryCompetitiveQueueStore } from "./helpers/memory-competitive-queue-store.mjs";
import { MatchRealtimeGateway } from "../src/lib/match-realtime-gateway.ts";
import { createCinderRowAuthoritativeMatch } from "../src/lib/match-bootstrap.ts";
import { MatchSessionManager } from "../src/lib/match-session-manager.ts";
import { createCompetitiveRouter } from "../src/routes/competitive.ts";
import {
  CINDER_ROW_CAPTURE_SECONDS,
  CINDER_ROW_RELAY,
  CINDER_ROW_RELAY_8V8_PROFILE,
} from "../src/lib/cinder-row-arena.ts";
import { ClientInputFlags } from "../src/lib/authoritative-match.ts";

const CLIENTS = 16;

function nextMessage(socket, predicate, timeoutMs = 4_000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error("Timed out waiting for the expected match message."));
    }, timeoutMs);
    const onMessage = (data) => {
      const value = JSON.parse(data.toString());
      if (!predicate(value)) return;
      clearTimeout(timeout);
      socket.off("message", onMessage);
      resolve(value);
    };
    socket.on("message", onMessage);
  });
}

function openSocket(url, sid) {
  const socket = new WebSocket(url, {
    headers: { Origin: new URL(url).origin, Cookie: `sid=${sid}` },
  });
  return new Promise((resolve, reject) => {
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function playerSnapshot(manager, ticket) {
  const snapshot = manager.getSnapshot(ticket.matchId, ticket.accessToken).snapshot;
  const player = snapshot.players.find((entry) => entry.playerId === ticket.playerId);
  assert.ok(player, "Ticket owner must remain in the authoritative match.");
  return player;
}

async function sendInput(socket, ticket, sequences, {
  inputFlags = 0,
  yaw = 0,
  pitch = 0,
  movementVector = { forward: 0, strafe: 0 },
} = {}) {
  const sequenceNumber = (sequences.get(ticket.playerId) ?? 0) + 1;
  const accepted = nextMessage(
    socket,
    (message) =>
      message.type === "input-accepted" &&
      message.sequenceNumber === sequenceNumber,
  );
  socket.send(JSON.stringify({
    type: "input",
    sequenceNumber,
    inputFlags,
    yaw,
    pitch,
    movementVector,
  }));
  await accepted;
  sequences.set(ticket.playerId, sequenceNumber);
}

function advanceSimulation(manager, clock, seconds) {
  const steps = Math.round(seconds / 0.05);
  for (let step = 0; step < steps; step += 1) {
    clock.nowNs += 50_000_000n;
    manager.advanceAt(clock.nowNs);
  }
}

async function movePlayerTo(manager, clock, socket, ticket, sequences, target) {
  let previousDistance = Number.POSITIVE_INFINITY;
  let stalledSteps = 0;
  for (let step = 0; step < 160; step += 1) {
    const player = playerSnapshot(manager, ticket);
    const dx = target.x - player.position.x;
    const dz = target.z - player.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 1.5) return player;
    await sendInput(socket, ticket, sequences, {
      yaw: Math.atan2(dx, dz) * 180 / Math.PI,
      movementVector: { forward: 1, strafe: 0 },
    });
    advanceSimulation(manager, clock, 0.1);
    const moved = playerSnapshot(manager, ticket);
    const remaining = Math.hypot(
      target.x - moved.position.x,
      target.z - moved.position.z,
    );
    stalledSteps = remaining >= previousDistance - 0.01 ? stalledSteps + 1 : 0;
    assert.ok(stalledSteps < 12, "Server-authoritative movement became stuck en route.");
    previousDistance = remaining;
  }
  throw new Error(`Player ${ticket.playerId} could not reach its test waypoint.`);
}

test("phase-two 8v8 supports sixteen authenticated ranked WebSocket clients", async () => {
  const manager = new MatchSessionManager(async () => createCinderRowAuthoritativeMatch());
  const userIds = Array.from({ length: CLIENTS }, () => `phase-two-user-${randomUUID()}`);
  const sidToUser = new Map(userIds.map((userId) => [userId, userId]));
  const regionId = `test-${randomUUID()}`;
  await db.insert(usersTable).values(userIds.map((id) => ({ id })));

  const fourVsFour = new CompetitiveMatchService(manager, {
    queueStore: new MemoryCompetitiveQueueStore(),
    readRating: async () => 1_000,
    persistResult: async () => undefined,
  });
  const eightVsEight = new CompetitiveMatchService(manager, {
    profileId: CINDER_ROW_RELAY_8V8_PROFILE.id,
    queueStore: new PostgresCompetitiveQueueStore(
      CINDER_ROW_RELAY_8V8_PROFILE.id,
      regionId,
    ),
    readRating: async () => 1_000,
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
  app.use("/api", createCompetitiveRouter(fourVsFour, eightVsEight));

  const server = createServer(app);
  const gateway = new MatchRealtimeGateway(manager, {
    updateIntervalMs: 50,
    heartbeatIntervalMs: 1_000,
    authTimeoutMs: 1_000,
    authenticateUser: async (request) => {
      const cookie = request.headers.cookie ?? "";
      const sid = cookie.split(";").map((part) => part.trim())
        .find((part) => part.startsWith("sid="))?.slice(4);
      return sid ? sidToUser.get(sid) ?? null : null;
    },
  });
  gateway.attach(server);
  manager.start();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const apiUrl = `http://127.0.0.1:${address.port}/api`;
  const sockets = [];

  try {
    const queueResponses = await Promise.all(userIds.map((userId) =>
      fetch(`${apiUrl}/competitive/ranked/queue`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test-user-id": userId,
        },
        body: JSON.stringify({
          operatorId: "jaya",
          profileId: CINDER_ROW_RELAY_8V8_PROFILE.id,
        }),
      })
    ));
    assert.ok(queueResponses.every((response) => response.status === 202));

    const tickets = await Promise.all(userIds.map(async (userId) => {
      const response = await fetch(
        `${apiUrl}/competitive/ranked/status?profileId=${CINDER_ROW_RELAY_8V8_PROFILE.id}`,
        { headers: { "x-test-user-id": userId } },
      );
      assert.equal(response.status, 200);
      const status = await response.json();
      assert.equal(status.state, "matched");
      assert.equal(status.match.profileId, CINDER_ROW_RELAY_8V8_PROFILE.id);
      return status.match;
    }));
    assert.equal(new Set(tickets.map((ticket) => ticket.matchId)).size, 1);

    const matchId = tickets[0].matchId;
    const realtimeUrl = `ws://127.0.0.1:${address.port}/api/matches/${matchId}/realtime`;
    sockets.push(...await Promise.all(tickets.map((ticket, index) =>
      openSocket(realtimeUrl, userIds[index])
    )));
    const readyPromises = sockets.map((socket, index) => {
      const ready = nextMessage(socket, (message) => message.type === "ready");
      socket.send(JSON.stringify({
        type: "authenticate",
        accessToken: tickets[index].accessToken,
      }));
      return ready;
    });
    const ready = await Promise.all(readyPromises);
    assert.ok(ready.every((message) => message.snapshot.players.length === CLIENTS));
    const teams = ready[0].snapshot.players.reduce((counts, player) => {
      counts[player.team] = (counts[player.team] ?? 0) + 1;
      return counts;
    }, {});
    assert.deepEqual(teams, { accord: 8, "eon-dusk": 8 });
    const positions = ready[0].snapshot.players.map((player) => player.position);
    for (let first = 0; first < positions.length; first += 1) {
      for (let second = first + 1; second < positions.length; second += 1) {
        const distance = Math.hypot(
          positions[first].x - positions[second].x,
          positions[first].z - positions[second].z,
        );
        assert.ok(distance >= 1.5, "8v8 spawns must not overlap player bodies.");
      }
    }

    const inputAcks = sockets.map((socket, index) =>
      nextMessage(
        socket,
        (message) =>
          message.type === "input-accepted" && message.sequenceNumber === index + 1,
      )
    );
    sockets.forEach((socket, index) => {
      socket.send(JSON.stringify({
        type: "input",
        sequenceNumber: index + 1,
        inputFlags: 0,
        yaw: 0,
        pitch: 0,
        movementVector: { forward: 0, strafe: 0 },
      }));
    });
    await Promise.all(inputAcks);
    const snapshotsPerClient = Array(CLIENTS).fill(0);
    sockets.forEach((socket, index) => {
      socket.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "snapshot") snapshotsPerClient[index] += 1;
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 700));
    assert.ok(
      snapshotsPerClient.every((count) => count >= 8),
      `Each 8v8 client should continue receiving snapshots; got ${snapshotsPerClient.join(",")}.`,
    );
    console.log(
      `Phase 2 local match check: 16 authenticated clients, balanced 8v8 teams, accepted input, snapshot minimum=${Math.min(...snapshotsPerClient)}.`,
    );
  } finally {
    gateway.close();
    manager.stop();
    for (const socket of sockets) socket.terminate();
    await new Promise((resolve) => server.close(resolve));
    await db.delete(competitiveMatchSessionsTable)
      .where(eq(competitiveMatchSessionsTable.regionId, regionId));
    await db.delete(usersTable).where(inArray(usersTable.id, userIds));
  }
});
