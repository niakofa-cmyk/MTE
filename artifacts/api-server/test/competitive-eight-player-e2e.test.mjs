import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import test from "node:test";
import { WebSocket } from "ws";
import { db, usersTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { CompetitiveMatchService } from "../src/lib/competitive-match-service.ts";
import { PostgresCompetitiveQueueStore } from "../src/lib/competitive-queue-store.ts";
import { MatchRealtimeGateway } from "../src/lib/match-realtime-gateway.ts";
import { createCinderRowAuthoritativeMatch } from "../src/lib/match-bootstrap.ts";
import { MatchSessionManager } from "../src/lib/match-session-manager.ts";
import { createCompetitiveRouter } from "../src/routes/competitive.ts";

const CLIENTS = 8;

function nextMessage(socket, predicate, timeoutMs = 3_000) {
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

async function openSocket(url, sid) {
  const socket = new WebSocket(url, {
    headers: { Origin: new URL(url).origin, Cookie: `sid=${sid}` },
  });
  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  return socket;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("phase-one 4v4 supports eight concurrent ranked WebSocket clients", async () => {
  const manager = new MatchSessionManager(async () => createCinderRowAuthoritativeMatch());
  const userIds = Array.from({ length: CLIENTS }, () => `phase-one-user-${randomUUID()}`);
  const sidToUser = new Map(userIds.map((userId) => [userId, userId]));
  const testRegion = `test-${randomUUID()}`;
  await db.insert(usersTable).values(userIds.map((id) => ({ id })));
  const competitive = new CompetitiveMatchService(manager, {
    queueStore: new PostgresCompetitiveQueueStore("cinder-row-relay-4v4", testRegion),
    readRating: async (_userId) => 1_000,
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
        body: JSON.stringify({ operatorId: "jaya" }),
      })
    ));
    assert.ok(queueResponses.every((response) => response.status === 202));

    const tickets = await Promise.all(userIds.map(async (userId) => {
      const response = await fetch(`${apiUrl}/competitive/ranked/status`, {
        headers: { "x-test-user-id": userId },
      });
      assert.equal(response.status, 200);
      const status = await response.json();
      assert.equal(status.state, "matched");
      return status.match;
    }));
    const matchIds = new Set(tickets.map((ticket) => ticket.matchId));
    assert.equal(matchIds.size, 1);

    const realtimeUrl = `ws://127.0.0.1:${address.port}/api/matches/${tickets[0].matchId}/realtime`;
    const openedSockets = await Promise.all(tickets.map((ticket, index) =>
      openSocket(realtimeUrl, userIds[index])
    ));
    sockets.push(...openedSockets);
    const readyPromises = openedSockets.map((socket, index) => {
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
    assert.deepEqual(teams, { accord: 4, "eon-dusk": 4 });

    const snapshotTimes = Array.from({ length: CLIENTS }, () => []);
    openedSockets.forEach((socket, index) => {
      socket.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type !== "snapshot") return;
        snapshotTimes[index].push(Date.now() - message.serverTimeMs);
      });
    });

    const acknowledgements = openedSockets.map((socket, index) =>
      nextMessage(
        socket,
        (message) =>
          message.type === "input-accepted" && message.sequenceNumber === index + 1,
      )
    );
    openedSockets.forEach((socket, index) => {
      socket.send(JSON.stringify({
        type: "input",
        sequenceNumber: index + 1,
        inputFlags: 0,
        yaw: 0,
        pitch: 0,
        movementVector: { forward: 0, strafe: 0 },
      }));
    });
    await Promise.all(acknowledgements);
    await wait(1_250);

    const counts = snapshotTimes.map((times) => times.length);
    assert.ok(counts.every((count) => count >= 10), `snapshot counts: ${counts.join(",")}`);
    const allArrivalTimes = snapshotTimes.flat().sort((left, right) => left - right);
    const p95Index = Math.min(
      allArrivalTimes.length - 1,
      Math.ceil(allArrivalTimes.length * 0.95) - 1,
    );
    const p95LocalDeliveryMs = allArrivalTimes[p95Index] ?? Number.POSITIVE_INFINITY;
    assert.ok(
      p95LocalDeliveryMs < 250,
      `local snapshot delivery p95 was ${p95LocalDeliveryMs}ms`,
    );
    console.log(
      `Phase 1 local match check: ${CLIENTS} clients, 4v4, ` +
        `snapshots/client min=${Math.min(...counts)}, ` +
        `local snapshot delivery p95=${p95LocalDeliveryMs}ms.`,
    );
  } finally {
    gateway.close();
    manager.stop();
    for (const socket of sockets) socket.terminate();
    await new Promise((resolve) => server.close(resolve));
    await db.delete(usersTable).where(inArray(usersTable.id, userIds));
  }
});
