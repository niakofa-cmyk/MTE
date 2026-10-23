import { TextDecoder, TextEncoder } from "node:util";
import type {
  AuthoritativeWorldSnapshot,
  HandAction,
  MatchPhase,
} from "./authoritative-match.ts";
import {
  OPERATOR_ABILITY_IDS,
  SERVER_OPERATOR_IDS,
  SERVER_SNAPSHOT_WEAPON_IDS,
} from "./authoritative-combat-systems.ts";

const MAGIC = [0x4d, 0x54, 0x45] as const; // "MTE"
const VERSION = 3;
const HEADER_BYTES = 39;
const PLAYER_FIXED_BYTES = 75;
const MAX_PACKET_BYTES = 64 * 1024;
const MAX_PLAYER_COUNT = 1_024;
const MAX_PLAYER_ID_BYTES = 128;
const UINT32_MAX = 0xffff_ffff;
const MAX_FLOAT32 = 3.4028234663852886e38;

const PHASE_TO_CODE: Record<MatchPhase, number> = {
  PRE_DROP: 0,
  ACTIVE_LOOTING: 1,
  ZONE_COLLAPSE: 2,
  EXTRACTION_READY: 3,
  MATCH_OVER: 4,
};
const CODE_TO_PHASE: readonly MatchPhase[] = [
  "PRE_DROP",
  "ACTIVE_LOOTING",
  "ZONE_COLLAPSE",
  "EXTRACTION_READY",
  "MATCH_OVER",
];

const ACTION_TO_CODE: Record<HandAction, number> = {
  IDLE: 0,
  FIRING: 1,
  RELOADING: 2,
  DRY_CLICK: 3,
};
const CODE_TO_ACTION: readonly HandAction[] = [
  "IDLE",
  "FIRING",
  "RELOADING",
  "DRY_CLICK",
];
const WEAPON_TO_CODE = new Map<string, number>(
  SERVER_SNAPSHOT_WEAPON_IDS.map((weaponId, index) => [weaponId, index + 1]),
);
const OPERATOR_TO_CODE = new Map<string, number>(
  SERVER_OPERATOR_IDS.map((operatorId, index) => [operatorId, index + 1]),
);
const ABILITY_TO_CODE = new Map<string, number>(
  OPERATOR_ABILITY_IDS.map((abilityId, index) => [abilityId, index + 1]),
);
const CODE_TO_WEAPON = [null, ...SERVER_SNAPSHOT_WEAPON_IDS] as const;
const CODE_TO_OPERATOR = [null, ...SERVER_OPERATOR_IDS] as const;
const CODE_TO_ABILITY = [null, ...OPERATOR_ABILITY_IDS] as const;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }
}

function assertFloat32(value: number, label: string): void {
  assertFinite(value, label);
  if (Math.abs(value) > MAX_FLOAT32) {
    throw new RangeError(`${label} is outside float32 range.`);
  }
}

function assertUInt32(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
    throw new RangeError(`${label} must be an unsigned 32-bit integer.`);
  }
}

function assertCanRead(
  bytes: Uint8Array,
  offset: number,
  length: number,
): void {
  if (offset < 0 || length < 0 || offset + length > bytes.byteLength) {
    throw new Error("Snapshot packet is truncated.");
  }
}

function readFloat32(view: DataView, offset: number, label: string): number {
  const value = view.getFloat32(offset, true);
  assertFinite(value, label);
  return value;
}

/**
 * Encode a detached, bounded snapshot for a future authenticated transport.
 *
 * Each call returns an owned Uint8Array. A shared static buffer is avoided so
 * a later snapshot cannot overwrite bytes still being sent asynchronously.
 */
export function serializeWorldSnapshot(
  snapshot: AuthoritativeWorldSnapshot,
  maxBytes = MAX_PACKET_BYTES,
): Uint8Array {
  if (
    !Number.isInteger(maxBytes) ||
    maxBytes < HEADER_BYTES ||
    maxBytes > MAX_PACKET_BYTES
  ) {
    throw new RangeError(
      `maxBytes must be between ${HEADER_BYTES} and ${MAX_PACKET_BYTES}.`,
    );
  }
  if (snapshot.protocolVersion !== VERSION) {
    throw new Error(`Snapshot protocol version must be ${VERSION}.`);
  }
  assertUInt32(snapshot.snapshotId, "snapshotId");
  assertFinite(snapshot.serverTimestampMs, "serverTimestampMs");
  if (snapshot.serverTimestampMs < 0) {
    throw new RangeError("serverTimestampMs cannot be negative.");
  }
  if (snapshot.players.length > MAX_PLAYER_COUNT) {
    throw new RangeError("Snapshot contains too many players.");
  }

  const phaseCode = PHASE_TO_CODE[snapshot.zoneState.phase];
  if (phaseCode === undefined) {
    throw new Error("Snapshot contains an unknown match phase.");
  }
  const zoneFloats = [
    snapshot.zoneState.center.x,
    snapshot.zoneState.center.z,
    snapshot.zoneState.currentRadius,
    snapshot.zoneState.targetRadius,
    snapshot.zoneState.phaseRemainingSeconds,
  ];
  for (const [index, value] of zoneFloats.entries()) {
    assertFloat32(value, `zone field ${index}`);
  }
  if (
    snapshot.zoneState.currentRadius < 0 ||
    snapshot.zoneState.targetRadius < 0 ||
    snapshot.zoneState.phaseRemainingSeconds < 0
  ) {
    throw new RangeError("Zone radii and remaining time cannot be negative.");
  }

  const encodedIds: Uint8Array[] = [];
  const playerIds = new Set<string>();
  let packetBytes = HEADER_BYTES;
  for (const [index, player] of snapshot.players.entries()) {
    if (typeof player.playerId !== "string" || player.playerId.length === 0) {
      throw new Error(`Player ${index} has an invalid playerId.`);
    }
    if (playerIds.has(player.playerId)) {
      throw new Error("Snapshot player IDs must be unique.");
    }
    playerIds.add(player.playerId);

    const idBytes = textEncoder.encode(player.playerId);
    if (idBytes.byteLength === 0 || idBytes.byteLength > MAX_PLAYER_ID_BYTES) {
      throw new RangeError(
        `Player ${index} ID must be between 1 and ${MAX_PLAYER_ID_BYTES} UTF-8 bytes.`,
      );
    }
    encodedIds.push(idBytes);
    assertUInt32(player.lastProcessedSequence, "lastProcessedSequence");

    for (const [label, value] of [
      ["position.x", player.position.x],
      ["position.y", player.position.y],
      ["position.z", player.position.z],
      ["velocity.x", player.velocity.x],
      ["velocity.y", player.velocity.y],
      ["velocity.z", player.velocity.z],
      ["yaw", player.yaw],
      ["pitch", player.pitch],
      ["health", player.health],
    ] as const) {
      assertFloat32(value, label);
    }
    if (player.health < 0 || player.health > 100) {
      throw new RangeError("Player health must be between 0 and 100.");
    }
    if (player.yaw < -180 || player.yaw >= 180) {
      throw new RangeError("Player yaw must be in the range [-180, 180).");
    }
    if (player.pitch < -89 || player.pitch > 89) {
      throw new RangeError("Player pitch must be between -89 and 89 degrees.");
    }
    if (
      ACTION_TO_CODE[player.rightHandState] === undefined ||
      ACTION_TO_CODE[player.leftHandState] === undefined ||
      typeof player.isFocusAiming !== "boolean"
    ) {
      throw new Error(`Player ${index} contains an invalid action state.`);
    }
    const rightWeaponCode = WEAPON_TO_CODE.get(player.rightWeapon.weaponId);
    const leftWeaponCode = WEAPON_TO_CODE.get(player.leftWeapon.weaponId);
    if (
      rightWeaponCode === undefined ||
      leftWeaponCode === undefined ||
      !OPERATOR_TO_CODE.has(player.operatorId) ||
      !ABILITY_TO_CODE.has(player.ability.abilityId) ||
      typeof player.rightWeapon.isReloading !== "boolean" ||
      typeof player.leftWeapon.isReloading !== "boolean" ||
      player.rightWeapon.isReloading !==
        (player.rightHandState === "RELOADING") ||
      player.leftWeapon.isReloading !==
        (player.leftHandState === "RELOADING") ||
      typeof player.ability.isActive !== "boolean"
    ) {
      throw new Error(`Player ${index} contains invalid combat identifiers or state.`);
    }
    for (const [label, hand] of [
      ["right", player.rightWeapon],
      ["left", player.leftWeapon],
    ] as const) {
      if (
        !Number.isInteger(hand.ammoInMagazine) ||
        hand.ammoInMagazine < 0 ||
        !Number.isInteger(hand.reserveAmmo) ||
        hand.reserveAmmo < 0 ||
        hand.reserveAmmo > 2_000 ||
        !Number.isInteger(hand.maxClipSize) ||
        hand.maxClipSize < 1 ||
        hand.maxClipSize > 500 ||
        hand.ammoInMagazine > hand.maxClipSize
      ) {
        throw new RangeError(`Player ${index} ${label} weapon ammo is invalid.`);
      }
      if (
        !Number.isFinite(hand.reloadRemainingSeconds) ||
        hand.reloadRemainingSeconds < 0 ||
        hand.reloadRemainingSeconds > 20
      ) {
        throw new RangeError(`Player ${index} ${label} reload time is invalid.`);
      }
    }
    if (
      !Number.isFinite(player.ability.cooldownRemainingSeconds) ||
      player.ability.cooldownRemainingSeconds < 0 ||
      player.ability.cooldownRemainingSeconds > 600 ||
      !Number.isFinite(player.ability.activeDurationRemainingSeconds) ||
      player.ability.activeDurationRemainingSeconds < 0 ||
      player.ability.activeDurationRemainingSeconds > 120
    ) {
      throw new RangeError(`Player ${index} ability timers are invalid.`);
    }

    packetBytes += PLAYER_FIXED_BYTES + idBytes.byteLength;
  }
  if (packetBytes > maxBytes) {
    throw new RangeError("Snapshot exceeds the configured packet size limit.");
  }

  const bytes = new Uint8Array(packetBytes);
  const view = new DataView(bytes.buffer);
  let offset = 0;
  for (const magicByte of MAGIC) {
    view.setUint8(offset, magicByte);
    offset += 1;
  }
  view.setUint8(offset, VERSION);
  offset += 1;
  view.setUint8(offset, phaseCode);
  offset += 1;
  view.setUint32(offset, snapshot.snapshotId, true);
  offset += 4;
  view.setFloat64(offset, snapshot.serverTimestampMs, true);
  offset += 8;
  for (const value of zoneFloats) {
    view.setFloat32(offset, value, true);
    offset += 4;
  }
  view.setUint16(offset, snapshot.players.length, true);
  offset += 2;

  for (const [index, player] of snapshot.players.entries()) {
    const idBytes = encodedIds[index]!;
    view.setUint8(offset, idBytes.byteLength);
    offset += 1;
    bytes.set(idBytes, offset);
    offset += idBytes.byteLength;

    view.setUint32(offset, player.lastProcessedSequence, true);
    offset += 4;
    for (const value of [
      player.position.x,
      player.position.y,
      player.position.z,
      player.velocity.x,
      player.velocity.y,
      player.velocity.z,
      player.health,
      player.yaw,
      player.pitch,
    ]) {
      view.setFloat32(offset, value, true);
      offset += 4;
    }

    const handAndFocusState =
      ACTION_TO_CODE[player.rightHandState] |
      (ACTION_TO_CODE[player.leftHandState] << 2) |
      (player.isFocusAiming ? 1 << 4 : 0);
    view.setUint8(offset, handAndFocusState);
    offset += 1;

    for (const hand of [player.rightWeapon, player.leftWeapon]) {
      view.setUint8(offset, WEAPON_TO_CODE.get(hand.weaponId)!);
      offset += 1;
      view.setUint16(offset, hand.ammoInMagazine, true);
      offset += 2;
      view.setUint16(offset, hand.reserveAmmo, true);
      offset += 2;
      view.setUint16(offset, hand.maxClipSize, true);
      offset += 2;
      view.setFloat32(offset, hand.reloadRemainingSeconds, true);
      offset += 4;
    }

    view.setUint8(offset, OPERATOR_TO_CODE.get(player.operatorId)!);
    offset += 1;
    view.setUint8(offset, ABILITY_TO_CODE.get(player.ability.abilityId)!);
    offset += 1;
    view.setUint8(offset, player.ability.isActive ? 1 : 0);
    offset += 1;
    view.setFloat32(offset, player.ability.cooldownRemainingSeconds, true);
    offset += 4;
    view.setFloat32(
      offset,
      player.ability.activeDurationRemainingSeconds,
      true,
    );
    offset += 4;
  }

  return bytes;
}

/**
 * Decode and validate a snapshot packet. Unknown versions, malformed UTF-8,
 * reserved state bits, duplicate IDs, and trailing bytes are rejected.
 */
export function deserializeWorldSnapshot(
  bytes: Uint8Array,
): AuthoritativeWorldSnapshot {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength < HEADER_BYTES ||
    bytes.byteLength > MAX_PACKET_BYTES
  ) {
    throw new Error("Snapshot packet has an invalid size.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  for (const magicByte of MAGIC) {
    if (view.getUint8(offset) !== magicByte) {
      throw new Error("Snapshot packet has an invalid magic header.");
    }
    offset += 1;
  }

  const version = view.getUint8(offset);
  offset += 1;
  if (version !== VERSION) {
    throw new Error(`Unsupported snapshot version ${version}.`);
  }
  const phaseCode = view.getUint8(offset);
  offset += 1;
  const phase = CODE_TO_PHASE[phaseCode];
  if (!phase) throw new Error("Snapshot packet has an invalid match phase.");

  const snapshotId = view.getUint32(offset, true);
  offset += 4;
  const serverTimestampMs = view.getFloat64(offset, true);
  offset += 8;
  assertFinite(serverTimestampMs, "serverTimestampMs");
  if (serverTimestampMs < 0) {
    throw new Error("Snapshot packet has a negative timestamp.");
  }

  const zoneCenter = {
    x: readFloat32(view, offset, "zone center x"),
    z: readFloat32(view, offset + 4, "zone center z"),
  };
  offset += 8;
  const currentRadius = readFloat32(view, offset, "current zone radius");
  const targetRadius = readFloat32(view, offset + 4, "target zone radius");
  const phaseRemainingSeconds = readFloat32(
    view,
    offset + 8,
    "phase remaining seconds",
  );
  offset += 12;
  if (
    currentRadius < 0 ||
    targetRadius < 0 ||
    phaseRemainingSeconds < 0
  ) {
    throw new Error("Snapshot packet has negative zone values.");
  }

  const playerCount = view.getUint16(offset, true);
  offset += 2;
  if (playerCount > MAX_PLAYER_COUNT) {
    throw new Error("Snapshot packet has too many players.");
  }

  const players: AuthoritativeWorldSnapshot["players"] = [];
  const playerIds = new Set<string>();
  for (let index = 0; index < playerCount; index += 1) {
    assertCanRead(bytes, offset, 1);
    const idLength = view.getUint8(offset);
    offset += 1;
    if (idLength === 0 || idLength > MAX_PLAYER_ID_BYTES) {
      throw new Error(`Player ${index} has an invalid ID length.`);
    }
    assertCanRead(bytes, offset, idLength + PLAYER_FIXED_BYTES - 1);

    let playerId: string;
    try {
      playerId = textDecoder.decode(bytes.subarray(offset, offset + idLength));
    } catch {
      throw new Error(`Player ${index} ID is not valid UTF-8.`);
    }
    offset += idLength;
    if (playerId.length === 0 || playerIds.has(playerId)) {
      throw new Error("Snapshot player IDs must be non-empty and unique.");
    }
    playerIds.add(playerId);

    const lastProcessedSequence = view.getUint32(offset, true);
    offset += 4;
    const position = {
      x: readFloat32(view, offset, "player position x"),
      y: readFloat32(view, offset + 4, "player position y"),
      z: readFloat32(view, offset + 8, "player position z"),
    };
    offset += 12;
    const velocity = {
      x: readFloat32(view, offset, "player velocity x"),
      y: readFloat32(view, offset + 4, "player velocity y"),
      z: readFloat32(view, offset + 8, "player velocity z"),
    };
    offset += 12;
    const health = readFloat32(view, offset, "player health");
    offset += 4;
    if (health < 0 || health > 100) {
      throw new Error("Snapshot packet has invalid player health.");
    }
    const yaw = readFloat32(view, offset, "player yaw");
    offset += 4;
    if (yaw < -180 || yaw >= 180) {
      throw new Error("Snapshot packet has invalid player yaw.");
    }
    const pitch = readFloat32(view, offset, "player pitch");
    offset += 4;
    if (pitch < -89 || pitch > 89) {
      throw new Error("Snapshot packet has invalid player pitch.");
    }

    const packedState = view.getUint8(offset);
    offset += 1;
    if ((packedState & 0b1110_0000) !== 0) {
      throw new Error("Snapshot packet contains reserved state bits.");
    }
    const rightAction = CODE_TO_ACTION[packedState & 0b11];
    const leftAction = CODE_TO_ACTION[(packedState >> 2) & 0b11];
    if (!rightAction || !leftAction) {
      throw new Error("Snapshot packet contains an invalid hand state.");
    }

    const decodeWeaponHand = (): AuthoritativeWorldSnapshot["players"][number]["rightWeapon"] => {
      const weaponCode = view.getUint8(offset);
      offset += 1;
      const weaponId = CODE_TO_WEAPON[weaponCode];
      if (!weaponId) throw new Error("Snapshot packet has an invalid weapon ID.");
      const ammoInMagazine = view.getUint16(offset, true);
      offset += 2;
      const reserveAmmo = view.getUint16(offset, true);
      offset += 2;
      const maxClipSize = view.getUint16(offset, true);
      offset += 2;
      const reloadRemainingSeconds = readFloat32(
        view,
        offset,
        "weapon reload remaining time",
      );
      offset += 4;
      if (
        maxClipSize < 1 ||
        maxClipSize > 500 ||
        ammoInMagazine > maxClipSize ||
        reserveAmmo > 2_000 ||
        reloadRemainingSeconds < 0 ||
        reloadRemainingSeconds > 20
      ) {
        throw new Error("Snapshot packet contains invalid weapon state.");
      }
      return {
        weaponId,
        ammoInMagazine,
        reserveAmmo,
        maxClipSize,
        isReloading: false,
        reloadRemainingSeconds,
      };
    };
    const rightWeapon = decodeWeaponHand();
    const leftWeapon = decodeWeaponHand();
    rightWeapon.isReloading = rightAction === "RELOADING";
    leftWeapon.isReloading = leftAction === "RELOADING";

    const operatorCode = view.getUint8(offset);
    offset += 1;
    const operatorId = CODE_TO_OPERATOR[operatorCode];
    const abilityCode = view.getUint8(offset);
    const abilityId = CODE_TO_ABILITY[abilityCode];
    const abilityFlags = view.getUint8(offset + 1);
    if (!operatorId || !abilityId || (abilityFlags & 0b1111_1110) !== 0) {
      throw new Error("Snapshot packet contains invalid operator ability state.");
    }
    offset += 2;
    const cooldownRemainingSeconds = readFloat32(
      view,
      offset,
      "ability cooldown remaining time",
    );
    offset += 4;
    const activeDurationRemainingSeconds = readFloat32(
      view,
      offset,
      "ability active remaining time",
    );
    offset += 4;
    if (
      cooldownRemainingSeconds < 0 ||
      cooldownRemainingSeconds > 600 ||
      activeDurationRemainingSeconds < 0 ||
      activeDurationRemainingSeconds > 120
    ) {
      throw new Error("Snapshot packet contains invalid ability timers.");
    }

    players.push({
      playerId,
      lastProcessedSequence,
      position,
      velocity,
      health,
      yaw,
      pitch,
      rightHandState: rightAction,
      leftHandState: leftAction,
      operatorId,
      rightWeapon,
      leftWeapon,
      ability: {
        abilityId,
        isActive: (abilityFlags & 1) !== 0,
        cooldownRemainingSeconds,
        activeDurationRemainingSeconds,
      },
      isFocusAiming: (packedState & (1 << 4)) !== 0,
    });
  }

  if (offset !== bytes.byteLength) {
    throw new Error("Snapshot packet has unexpected trailing bytes.");
  }

  return {
    protocolVersion: VERSION,
    snapshotId,
    serverTimestampMs,
    players,
    zoneState: {
      center: zoneCenter,
      currentRadius,
      targetRadius,
      phase,
      phaseRemainingSeconds,
    },
  };
}
