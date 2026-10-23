import assert from "node:assert/strict";
import test from "node:test";
import {
  deserializeWorldSnapshot,
  serializeWorldSnapshot,
} from "../src/lib/authoritative-snapshot-codec.ts";

function sampleSnapshot() {
  return {
    snapshotId: 17,
    serverTimestampMs: 1_234.5,
    players: [
      {
        playerId: "player-01",
        lastProcessedSequence: 4_294_967_000,
        position: { x: 10.25, y: 1.5, z: -2.75 },
        velocity: { x: 0.5, y: 0, z: -1.25 },
        rightHandState: "FIRING",
        leftHandState: "RELOADING",
        isFocusAiming: true,
        health: 87.5,
      },
      {
        playerId: "玩家-02",
        lastProcessedSequence: 4,
        position: { x: -20, y: 0, z: 30 },
        velocity: { x: 0, y: 0, z: 5 },
        rightHandState: "IDLE",
        leftHandState: "FIRING",
        isFocusAiming: false,
        health: 100,
      },
    ],
    zoneState: {
      center: { x: 1.25, z: -3.5 },
      currentRadius: 500,
      targetRadius: 250,
      phase: "ZONE_COLLAPSE",
      phaseRemainingSeconds: 12.5,
    },
  };
}

test("round-trips compact snapshots including UTF-8 IDs and dual-hand states", () => {
  const snapshot = sampleSnapshot();
  const bytes = serializeWorldSnapshot(snapshot);
  const decoded = deserializeWorldSnapshot(bytes);

  assert.deepEqual(decoded, snapshot);
  assert.equal(
    new TextDecoder().decode(bytes.subarray(0, 3)),
    "MTE",
  );
  assert.equal(bytes[3], 1);
});

test("each encoding owns its bytes instead of sharing a mutable static buffer", () => {
  const first = serializeWorldSnapshot(sampleSnapshot());
  const firstCopy = first.slice();
  const secondSnapshot = sampleSnapshot();
  secondSnapshot.snapshotId += 1;
  const second = serializeWorldSnapshot(secondSnapshot);

  assert.notEqual(first.buffer, second.buffer);
  assert.deepEqual(first, firstCopy);
});

test("rejects oversized, duplicate-ID, and unrepresentable snapshot fields", () => {
  assert.throws(
    () => serializeWorldSnapshot(sampleSnapshot(), 39),
    /packet size limit/,
  );

  const duplicateIds = sampleSnapshot();
  duplicateIds.players[1].playerId = duplicateIds.players[0].playerId;
  assert.throws(() => serializeWorldSnapshot(duplicateIds), /unique/);

  const invalidSequence = sampleSnapshot();
  invalidSequence.players[0].lastProcessedSequence = 4_294_967_296;
  assert.throws(() => serializeWorldSnapshot(invalidSequence), /32-bit/);

  const invalidHealth = sampleSnapshot();
  invalidHealth.players[0].health = 101;
  assert.throws(() => serializeWorldSnapshot(invalidHealth), /health/);
});

test("rejects invalid headers, truncation, trailing data, and reserved bits", () => {
  const encoded = serializeWorldSnapshot(sampleSnapshot());

  const badMagic = encoded.slice();
  badMagic[0] = 0;
  assert.throws(
    () => deserializeWorldSnapshot(badMagic),
    /magic header/,
  );

  const truncated = encoded.subarray(0, encoded.length - 1);
  assert.throws(() => deserializeWorldSnapshot(truncated), /truncated/);

  const trailing = new Uint8Array(encoded.length + 1);
  trailing.set(encoded);
  assert.throws(
    () => deserializeWorldSnapshot(trailing),
    /trailing bytes/,
  );

  const reservedBit = encoded.slice();
  const firstStateOffset =
    39 + 1 + new TextEncoder().encode("player-01").length + 4 + 12 + 12 + 4;
  reservedBit[firstStateOffset] |= 0x80;
  assert.throws(
    () => deserializeWorldSnapshot(reservedBit),
    /reserved state bits/,
  );
});
