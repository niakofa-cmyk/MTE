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
  clientDelayMs = 0,
  drop = false,
  networkMetrics = null,
} = {}) {
  const sequenceNumber = (sequences.get(ticket.playerId) ?? 0) + 1;
  sequences.set(ticket.playerId, sequenceNumber);
  const startedAt = Date.now();
  if (clientDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, clientDelayMs));
  }
  if (drop) {
    if (networkMetrics) networkMetrics.droppedPackets += 1;
    return null;
  }
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
  if (networkMetrics) {
    networkMetrics.deliveredPackets += 1;
    networkMetrics.ackLatenciesMs.push(Date.now() - startedAt);
  }
  return sequenceNumber;
}

function waitForServer(seconds) {
  return new Promise((resolve) => setTimeout(resolve, Math.ceil(seconds * 1_000)));
}

async function movePlayerTo(
  manager,
  socket,
  ticket,
  sequences,
  target,
  { impaired = false, networkMetrics = null } = {},
) {
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
      clientDelayMs: impaired ? [0, 35, 70, 25][step % 4] : 0,
      drop: impaired && step === 6,
      networkMetrics: impaired ? networkMetrics : null,
    });
    await waitForServer(0.1);
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

test("phase-two 8v8 completes a live relay round under delayed and dropped client inputs", async () => {
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
  const sequences = new Map();
  let matchId = null;

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

    matchId = tickets[0].matchId;
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

    await Promise.all(tickets.map((ticket, index) =>
      sendInput(sockets[index], ticket, sequences)
    ));
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
    const socketByPlayerId = new Map(
      tickets.map((ticket, index) => [ticket.playerId, sockets[index]]),
    );
    const northPlayers = tickets
      .map((ticket) => ({
        ticket,
        socket: socketByPlayerId.get(ticket.playerId),
        position: playerSnapshot(manager, ticket).position,
      }))
      .filter(({ position }) => position.z < -17);
    let shooterEntry;
    let targetEntry;
    let closestNorthPair = Number.POSITIVE_INFINITY;
    for (const shooter of northPlayers.filter(({ ticket }) => ticket.team === "accord")) {
      for (const target of northPlayers.filter(({ ticket }) => ticket.team === "eon-dusk")) {
        const dz = Math.abs(shooter.position.z - target.position.z);
        if (dz < closestNorthPair) {
          shooterEntry = shooter;
          targetEntry = target;
          closestNorthPair = dz;
        }
      }
    }
    assert.ok(shooterEntry?.socket && targetEntry?.socket, "Both teams need a northern-lane combat pair.");
    const networkMetrics = {
      droppedPackets: 0,
      deliveredPackets: 0,
      ackLatenciesMs: [],
    };
    await movePlayerTo(
      manager,
      shooterEntry.socket,
      shooterEntry.ticket,
      sequences,
      { x: -10, z: -28 },
      { impaired: true, networkMetrics },
    );
    await movePlayerTo(
      manager,
      targetEntry.socket,
      targetEntry.ticket,
      sequences,
      { x: 10, z: -28 },
    );

    const shooterBefore = playerSnapshot(manager, shooterEntry.ticket);
    const targetBefore = playerSnapshot(manager, targetEntry.ticket);
    const horizontalDistance = Math.hypot(
      targetBefore.position.x - shooterBefore.position.x,
      targetBefore.position.z - shooterBefore.position.z,
    );
    const shotYaw = Math.atan2(
      targetBefore.position.x - shooterBefore.position.x,
      targetBefore.position.z - shooterBefore.position.z,
    ) * 180 / Math.PI;
    const shotPitch = Math.atan2(-0.5, horizontalDistance) * 180 / Math.PI;
    await sendInput(shooterEntry.socket, shooterEntry.ticket, sequences, {
      inputFlags: ClientInputFlags.FIRE_RIGHT,
      yaw: shotYaw,
      pitch: shotPitch,
    });
    await waitForServer(0.1);
    const shooterAfter = playerSnapshot(manager, shooterEntry.ticket);
    const targetAfter = playerSnapshot(manager, targetEntry.ticket);
    assert.ok(
      targetAfter.health < targetBefore.health,
      "Server-authoritative firing must damage the intended opponent.",
    );
    assert.ok(
      shooterAfter.rightWeapon.ammoInMagazine < shooterBefore.rightWeapon.ammoInMagazine,
      "The server must consume ammunition for the accepted shot.",
    );

    const runnerEntry = tickets
      .filter((ticket) =>
        ticket.team === "accord" && ticket.playerId !== shooterEntry.ticket.playerId
      )
      .map((ticket) => ({
        ticket,
        socket: socketByPlayerId.get(ticket.playerId),
        position: playerSnapshot(manager, ticket).position,
      }))
      .filter((entry) => entry.socket)
      .sort((left, right) =>
        Math.hypot(left.position.x, left.position.z) -
        Math.hypot(right.position.x, right.position.z)
      )[0];
    assert.ok(runnerEntry?.socket, "An Accord player must remain to capture the relay.");
    await movePlayerTo(
      manager,
      runnerEntry.socket,
      runnerEntry.ticket,
      sequences,
      { x: CINDER_ROW_RELAY.x, z: CINDER_ROW_RELAY.z },
    );
    const runnerPosition = playerSnapshot(manager, runnerEntry.ticket).position;
    assert.ok(
      Math.hypot(
        runnerPosition.x - CINDER_ROW_RELAY.x,
        runnerPosition.z - CINDER_ROW_RELAY.z,
      ) <= CINDER_ROW_RELAY.radius,
      "The runner must reach the actual server relay radius.",
    );

    let round = manager.getSnapshot(matchId, runnerEntry.ticket.accessToken)
      .snapshot.arenaRound;
    const captureIntervalSeconds = 0.15;
    const captureSteps = Math.ceil(CINDER_ROW_CAPTURE_SECONDS / captureIntervalSeconds) + 5;
    for (let step = 0; step < captureSteps; step += 1) {
      await sendInput(runnerEntry.socket, runnerEntry.ticket, sequences);
      await waitForServer(captureIntervalSeconds);
      round = manager.getSnapshot(matchId, runnerEntry.ticket.accessToken)
        .snapshot.arenaRound;
      if (round.phase === "finished") break;
    }
    assert.equal(round.phase, "finished");
    assert.equal(round.winner, "accord");
    assert.equal(round.controlledBy, "accord");

    await eightVsEight.runMaintenance();
    const [storedResult] = await db.select()
      .from(competitiveMatchResultsTable)
      .where(eq(competitiveMatchResultsTable.matchId, matchId));
    assert.equal(storedResult?.winner, "accord");
    assert.equal(storedResult?.participants.length, CLIENTS);
    const ratings = await db.select()
      .from(competitiveRatingsTable)
      .where(inArray(competitiveRatingsTable.userId, userIds));
    assert.equal(ratings.length, CLIENTS);
    assert.ok(ratings.every((row) => row.gamesPlayed === 1));
    assert.equal(ratings.filter((row) => row.wins === 1).length, 8);
    assert.equal(ratings.filter((row) => row.losses === 1).length, 8);
    const [storedSession] = await db.select()
      .from(competitiveMatchSessionsTable)
      .where(eq(competitiveMatchSessionsTable.matchId, matchId));
    assert.equal(storedSession?.status, "completed");
    await eightVsEight.runMaintenance();
    const ratingsAfterRetry = await db.select()
      .from(competitiveRatingsTable)
      .where(inArray(competitiveRatingsTable.userId, userIds));
    assert.ok(ratingsAfterRetry.every((row) => row.gamesPlayed === 1));
    const orderedAckLatencies = [...networkMetrics.ackLatenciesMs].sort((a, b) => a - b);
    const ackP95 = orderedAckLatencies[
      Math.max(0, Math.ceil(orderedAckLatencies.length * 0.95) - 1)
    ] ?? 0;
    assert.equal(networkMetrics.droppedPackets, 1);
    assert.ok(networkMetrics.deliveredPackets > 20);
    assert.ok(ackP95 < 250, `Local delayed-input acknowledgement p95 was ${ackP95}ms.`);
    console.log(
      `Phase 2 wall-clock round: 16 clients, movement and hit verified, Accord captured the relay, 16 ratings persisted once; client input impairment=${networkMetrics.droppedPackets} drop, delayed-input ack p95=${ackP95}ms.`,
    );
  } finally {
    gateway.close();
    manager.stop();
    for (const socket of sockets) socket.terminate();
    await new Promise((resolve) => server.close(resolve));
    await db.delete(competitiveMatchSessionsTable)
      .where(eq(competitiveMatchSessionsTable.regionId, regionId));
    if (matchId) {
      await db.delete(competitiveMatchResultsTable)
        .where(eq(competitiveMatchResultsTable.matchId, matchId));
    }
    await db.delete(competitiveQueueEntriesTable)
      .where(inArray(competitiveQueueEntriesTable.userId, userIds));
    await db.delete(competitiveRatingsTable)
      .where(inArray(competitiveRatingsTable.userId, userIds));
    await db.delete(usersTable).where(inArray(usersTable.id, userIds));
  }
});
