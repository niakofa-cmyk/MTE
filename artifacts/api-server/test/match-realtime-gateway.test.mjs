import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { WebSocket } from "ws";
import { createCinderRowAuthoritativeMatch } from "../src/lib/match-bootstrap.ts";
import { MatchRealtimeGateway } from "../src/lib/match-realtime-gateway.ts";
import { MatchSessionManager } from "../src/lib/match-session-manager.ts";
import { CINDER_ROW_MAP_ID } from "../src/lib/cinder-row-arena.ts";

function nextMessage(socket, predicate, timeoutMs = 3_000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error("Timed out waiting for a match server message."));
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
    headers: {
      Origin: new URL(url).origin,
      Cookie: `sid=${sid}`,
    },
  });
  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  return socket;
}

test("real-time gateway authenticates owned players and streams server snapshots", async () => {
  let nowNs = 1_000_000_000n;
  const manager = new MatchSessionManager(
    async () => createCinderRowAuthoritativeMatch(),
    { nowNs: () => nowNs },
  );
  const created = await manager.createSession(CINDER_ROW_MAP_ID);
  const first = manager.joinSession(created.matchId, "jaya", "user-one");
  const second = manager.joinSession(created.matchId, "khensu", "user-two");
  manager.advanceAt(nowNs);

  const server = createServer((_request, response) => response.end("ok"));
  const gateway = new MatchRealtimeGateway(manager, {
    updateIntervalMs: 25,
    heartbeatIntervalMs: 1_000,
    authTimeoutMs: 1_000,
    authenticateUser: async (request) => {
      const cookie = request.headers.cookie ?? "";
      if (cookie.includes("sid=one")) return "user-one";
      if (cookie.includes("sid=two")) return "user-two";
      return null;
    },
  });
  gateway.attach(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `ws://127.0.0.1:${address.port}/api/matches/${created.matchId}/realtime`;
  const sockets = [];

  try {
    let firstSocket = await openSocket(url, "one");
    sockets.push(firstSocket);
    const firstReadyPromise = nextMessage(firstSocket, (message) => message.type === "ready");
    firstSocket.send(JSON.stringify({ type: "authenticate", accessToken: first.accessToken }));
    const firstReady = await firstReadyPromise;
    assert.equal(firstReady.playerId, first.playerId);
    assert.equal(firstReady.protocolVersion, 1);
    assert.equal(firstReady.snapshot.players.length, 2);
    assert.equal(
      manager.isRealtimePlayerConnected(created.matchId, first.accessToken, "user-one"),
      true,
    );

    firstSocket.close();
    await new Promise((resolve) => firstSocket.once("close", resolve));
    assert.equal(
      manager.isRealtimePlayerConnected(created.matchId, first.accessToken, "user-one"),
      false,
    );
    const replacementSocket = await openSocket(url, "one");
    sockets.push(replacementSocket);
    const replacementReadyPromise = nextMessage(
      replacementSocket,
      (message) => message.type === "ready",
    );
    replacementSocket.send(JSON.stringify({
      type: "authenticate",
      accessToken: first.accessToken,
    }));
    assert.equal((await replacementReadyPromise).playerId, first.playerId);
    firstSocket = replacementSocket;
    assert.equal(
      manager.isRealtimePlayerConnected(created.matchId, first.accessToken, "user-one"),
      true,
    );

    const secondSocket = await openSocket(url, "two");
    sockets.push(secondSocket);
    const secondReadyPromise = nextMessage(secondSocket, (message) => message.type === "ready");
    secondSocket.send(JSON.stringify({ type: "authenticate", accessToken: second.accessToken }));
    const secondReady = await secondReadyPromise;
    assert.equal(secondReady.playerId, second.playerId);
    assert.notEqual(
      secondReady.snapshot.players.find((player) => player.playerId === first.playerId).team,
      secondReady.snapshot.players.find((player) => player.playerId === second.playerId).team,
    );

    const acceptedPromise = nextMessage(firstSocket, (message) => message.type === "input-accepted");
    const updatedSnapshotPromise = nextMessage(
      firstSocket,
      (message) => message.type === "snapshot" &&
        message.snapshot.players.find((player) => player.playerId === first.playerId)
          ?.lastProcessedSequence === 1,
    );
    firstSocket.send(JSON.stringify({
      type: "input",
      sequenceNumber: 1,
      inputFlags: 0,
      yaw: 0,
      pitch: 0,
      movementVector: { forward: 1, strafe: 0 },
    }));
    const accepted = await acceptedPromise;
    assert.equal(accepted.sequenceNumber, 1);
    nowNs += 50_000_000n;
    manager.advanceAt(nowNs);
    const updatedSnapshot = await updatedSnapshotPromise;
    assert.equal(
      updatedSnapshot.snapshot.players.find((player) => player.playerId === first.playerId)
        .lastProcessedSequence,
      1,
    );

    const spoofSocket = await openSocket(url, "two");
    sockets.push(spoofSocket);
    const rejectedPromise = nextMessage(spoofSocket, (message) => message.type === "error");
    spoofSocket.send(JSON.stringify({ type: "authenticate", accessToken: first.accessToken }));
    const rejected = await rejectedPromise;
    assert.equal(rejected.code, "unauthorized");
  } finally {
    gateway.close();
    manager.stop();
    for (const socket of sockets) socket.terminate();
    await new Promise((resolve) => server.close(resolve));
  }
});
