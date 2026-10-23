import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthoritativeMatch,
  ClientInputFlags,
  DEFAULT_MATCH_CONFIG,
} from "../src/lib/authoritative-match.ts";

function createConfig(overrides = {}) {
  return {
    ...DEFAULT_MATCH_CONFIG,
    ...overrides,
    safeZoneCenter: { ...DEFAULT_MATCH_CONFIG.safeZoneCenter },
    safeZoneRings: [
      { targetRadius: 50, lootingSeconds: 0.1, collapseSeconds: 0.2 },
    ],
  };
}

function packet(sequenceNumber, inputFlags = 0, movementVector = { forward: 0, strafe: 0 }, extra = {}) {
  return {
    sequenceNumber,
    inputFlags,
    pitch: 0,
    yaw: 0,
    movementVector,
    ...extra,
  };
}

function createMatch(overrides = {}) {
  const match = new AuthoritativeMatch(createConfig(overrides));
  match.registerPlayer("server-player-1", { x: 0, y: 0, z: 0 });
  return match;
}

test("identity and spawn position are server-owned", () => {
  const match = createMatch({ worldHalfExtent: 100 });
  const result = match.submitInput(
    "server-player-1",
    packet(1, 0, { forward: 1, strafe: 0 }, { playerId: "victim" }),
    1_000,
  );
  assert.deepEqual(result, { accepted: false, reason: "invalid-packet" });
  assert.deepEqual(
    match.submitInput("victim", packet(1), 1_000),
    { accepted: false, reason: "unknown-player" },
  );
  assert.throws(
    () => match.registerPlayer("outside", { x: 101, y: 0, z: 0 }),
    /inside world bounds/,
  );
});

test("server geometry rejects embedded spawns and blocks movement through cover", () => {
  const match = new AuthoritativeMatch(
    createConfig({ maxDeltaSeconds: 0.05, worldHalfExtent: 100 }),
  );
  match.addStaticCollisionBounds({
    min: { x: 0.5, y: 0, z: -2 },
    max: { x: 0.6, y: 2, z: 2 },
  });
  assert.throws(
    () => match.registerPlayer("embedded", { x: 0.2, y: 0, z: 0 }),
    /intersects static world geometry/,
  );
  match.registerPlayer("runner", { x: 0, y: 0, z: 0 });

  assert.deepEqual(
    match.submitInput(
      "runner",
      packet(1, 0, { forward: 1, strafe: 0 }, { yaw: 90 }),
      1_000,
    ),
    { accepted: true },
  );
  const player = match.tick(0.05, 1_050).players[0];
  assert.ok(player.position.x <= 0.15 + 1e-9);
  assert.equal(player.velocity.x, 0);
  assert.equal(
    match.traceWorldOcclusion(
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 },
      10,
    ),
    0.5,
  );
  assert.throws(
    () =>
      match.addStaticCollisionBounds({
        min: { x: 3, y: 0, z: 0 },
        max: { x: 4, y: 2, z: 1 },
      }),
    /load before players/,
  );
});

test("loads trusted level footprints before registration and rejects late loads", () => {
  const match = new AuthoritativeMatch(
    createConfig({ maxDeltaSeconds: 0.05, worldHalfExtent: 100 }),
  );
  const loaded = match.loadLevelGeometryAsset(
    JSON.stringify([
      {
        id: 7,
        type: "prison_wall",
        posX: 12,
        posY: 1,
        posZ: 8,
        sizeX: 4,
        sizeY: 2,
        sizeZ: 2,
      },
    ]),
  );
  assert.equal(loaded, 1);
  assert.throws(
    () => match.registerPlayer("embedded", { x: 12, y: 0, z: 8 }),
    /intersects static world geometry/,
  );
  match.registerPlayer("clear", { x: 0, y: 0, z: 0 });
  assert.throws(
    () => match.loadLevelGeometryAsset("[]"),
    /load before players/,
  );
});

test("valid sequenced input moves server state and keeps hand actions independent", () => {
  const match = createMatch({ maxDeltaSeconds: 0.25 });
  const flags =
    ClientInputFlags.FIRE_RIGHT |
    ClientInputFlags.RELOAD_LEFT |
    ClientInputFlags.FOCUS_AIM;
  assert.deepEqual(
    match.submitInput(
      "server-player-1",
      packet(1, flags, { forward: 1, strafe: 1 }),
      1_000,
    ),
    { accepted: true },
  );

  const snapshot = match.tick(0.1, 1_016);
  const player = snapshot.players[0];
  assert.ok(player.position.z > 0);
  assert.ok(player.position.x > 0);
  assert.ok(Math.hypot(player.velocity.x, player.velocity.z) <= 5 * 0.72 + 1e-9);
  assert.equal(player.rightHandState, "FIRING");
  assert.equal(player.leftHandState, "RELOADING");
  assert.equal(player.isFocusAiming, true);
  assert.equal(player.lastProcessedSequence, 1);
});

test("server bounds rotation speed and publishes server-owned yaw and pitch", () => {
  const match = createMatch({
    maxDeltaSeconds: 0.05,
    maxLookDegreesPerSecond: 900,
  });
  match.submitInput(
    "server-player-1",
    packet(1, 0, { forward: 0, strafe: 0 }, { yaw: 170, pitch: 80 }),
    1_000,
  );

  let player = match.tick(0.05, 1_050).players[0];
  assert.equal(player.yaw, 45);
  assert.equal(player.pitch, 45);
  player = match.tick(0.05, 1_100).players[0];
  assert.equal(player.yaw, 90);
  assert.equal(player.pitch, 80);
  player = match.tick(0.05, 1_150).players[0];
  assert.equal(player.yaw, 135);

  match.tick(0.05, 1_200);
  match.submitInput(
    "server-player-1",
    packet(2, 0, { forward: 0, strafe: 0 }, { yaw: -170, pitch: 80 }),
    1_201,
  );
  player = match.tick(0.05, 1_250).players[0];
  assert.equal(player.yaw, -170);
  assert.equal(player.pitch, 80);
});

test("rejects duplicate, old, malformed, and out-of-range input", () => {
  const match = createMatch();
  assert.deepEqual(
    match.submitInput("server-player-1", packet(2), 1_000),
    { accepted: true },
  );
  assert.deepEqual(
    match.submitInput("server-player-1", packet(2), 1_001),
    { accepted: false, reason: "out-of-order-sequence" },
  );
  assert.deepEqual(
    match.submitInput(
      "server-player-1",
      packet(3, 0, { forward: 1.5, strafe: 0 }),
      1_002,
    ),
    { accepted: false, reason: "invalid-packet" },
  );
  assert.deepEqual(
    match.submitInput(
      "server-player-1",
      { ...packet(3), yaw: 181 },
      1_002,
    ),
    { accepted: false, reason: "invalid-packet" },
  );
  assert.deepEqual(
    match.submitInput(
      "server-player-1",
      packet(4_294_967_296),
      1_003,
    ),
    { accepted: false, reason: "invalid-packet" },
  );
});

test("bounds queued input and per-player packet rate", () => {
  const queueLimited = createMatch({
    maxPendingInputsPerPlayer: 1,
    maxInputsPerSecond: 10,
  });
  assert.deepEqual(
    queueLimited.submitInput("server-player-1", packet(1), 1_000),
    { accepted: true },
  );
  assert.deepEqual(
    queueLimited.submitInput("server-player-1", packet(2), 1_001),
    { accepted: false, reason: "input-queue-full" },
  );

  const rateLimited = createMatch({
    maxPendingInputsPerPlayer: 10,
    maxInputsPerSecond: 1,
  });
  assert.deepEqual(
    rateLimited.submitInput("server-player-1", packet(1), 1_000),
    { accepted: true },
  );
  assert.deepEqual(
    rateLimited.submitInput("server-player-1", packet(2), 1_001),
    { accepted: false, reason: "input-rate-limit" },
  );
});

test("ignores stale held input after the server timeout", () => {
  const match = createMatch({ inputTimeoutMs: 200 });
  match.submitInput(
    "server-player-1",
    packet(1, ClientInputFlags.FIRE_RIGHT, { forward: 1, strafe: 0 }),
    1_000,
  );
  const snapshot = match.tick(0.1, 1_300);
  const player = snapshot.players[0];
  assert.deepEqual(player.velocity, { x: 0, y: 0, z: 0 });
  assert.equal(player.rightHandState, "IDLE");
  assert.equal(player.lastProcessedSequence, 1);
});

test("pre-drop and looting do not shrink the zone; collapse is phased and bounded", () => {
  const match = createMatch({
    maxDeltaSeconds: 0.25,
    preDropSeconds: 0.1,
    initialZoneRadius: 100,
  });

  let zone = match.tick(0.1, 100).zoneState;
  assert.equal(zone.phase, "ACTIVE_LOOTING");
  assert.equal(zone.currentRadius, 100);

  zone = match.tick(0.1, 200).zoneState;
  assert.equal(zone.phase, "ZONE_COLLAPSE");
  assert.equal(zone.currentRadius, 100);

  zone = match.tick(0.1, 300).zoneState;
  assert.equal(zone.phase, "ZONE_COLLAPSE");
  assert.equal(zone.currentRadius, 75);

  zone = match.tick(0.1, 400).zoneState;
  assert.equal(zone.phase, "EXTRACTION_READY");
  assert.equal(zone.currentRadius, 50);
  assert.equal(zone.targetRadius, 50);
});

test("caps simulation delta to prevent a hitch from teleporting a player", () => {
  const match = createMatch({ maxDeltaSeconds: 0.05 });
  match.submitInput(
    "server-player-1",
    packet(1, 0, { forward: 1, strafe: 0 }),
    1_000,
  );
  const player = match.tick(10, 1_001).players[0];
  assert.equal(player.position.z, 0.25);
});

test("returns detached JSON-friendly snapshots and can end the match", () => {
  const match = createMatch();
  const snapshot = match.tick(0, 1_000);
  snapshot.players[0].position.x = 999;
  snapshot.zoneState.center.x = 999;
  const current = match.getSnapshot();
  assert.equal(current.players[0].position.x, 0);
  assert.equal(current.zoneState.center.x, 0);

  match.finishMatch();
  assert.equal(match.getSnapshot().zoneState.phase, "MATCH_OVER");
});

test("spatial lookup is exact, updates after movement, and removes disconnected players", () => {
  const match = createMatch({
    maxDeltaSeconds: 0.25,
    spatialCellSize: 10,
    worldHalfExtent: 1_000,
  });
  match.registerPlayer("crossing", { x: 9.9, y: 0, z: 0 });

  const nearby = ["stale"];
  assert.equal(match.findNearbyPlayerIds(10.4, 0, 0.1, nearby), 0);
  assert.deepEqual(nearby, []);

  assert.deepEqual(
    match.submitInput(
      "crossing",
      packet(1, 0, { forward: 0, strafe: 1 }),
      1_000,
    ),
    { accepted: true },
  );
  match.tick(0.1, 1_016);
  assert.equal(match.findNearbyPlayerIds(10.4, 0, 0.1, nearby), 1);
  assert.deepEqual(nearby, ["crossing"]);

  assert.equal(match.unregisterPlayer("crossing"), true);
  assert.equal(match.findNearbyPlayerIds(10.4, 0, 1, nearby), 0);
  assert.deepEqual(nearby, []);
});
