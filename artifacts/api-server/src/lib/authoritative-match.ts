/**
 * Server-owned match simulation primitives.
 *
 * A transport must authenticate a connection and pass its server-resolved
 * player ID to submitInput. The packet itself never establishes identity.
 * This module is deliberately transport-agnostic and does not implement
 * matchmaking, weapon raycasts, or client prediction.
 */

import { SpatialHashGrid } from "./spatial-hash-grid.ts";

export const ClientInputFlags = {
  FIRE_RIGHT: 1 << 0,
  FIRE_LEFT: 1 << 1,
  RELOAD_RIGHT: 1 << 2,
  RELOAD_LEFT: 1 << 3,
  FOCUS_AIM: 1 << 4,
} as const;

const VALID_INPUT_FLAGS = Object.values(ClientInputFlags).reduce(
  (flags, value) => flags | value,
  0,
);
const MAX_SEQUENCE_NUMBER = 0xffff_ffff;

export type MatchPhase =
  | "PRE_DROP"
  | "ACTIVE_LOOTING"
  | "ZONE_COLLAPSE"
  | "EXTRACTION_READY"
  | "MATCH_OVER";

export type HandAction = "IDLE" | "FIRING" | "RELOADING";

export interface Position3 {
  x: number;
  y: number;
  z: number;
}

export interface ZoneCenter {
  x: number;
  z: number;
}

export interface SafeZoneRing {
  targetRadius: number;
  lootingSeconds: number;
  collapseSeconds: number;
}

/**
 * Untrusted client input. Identity, position, speed, and client timestamps
 * are intentionally absent; the authenticated transport supplies identity.
 */
export interface ClientInputPacket {
  sequenceNumber: number;
  inputFlags: number;
  pitch: number;
  yaw: number;
  movementVector: {
    forward: number;
    strafe: number;
  };
}

export interface MatchConfig {
  maxPlayers: number;
  maxPendingInputsPerPlayer: number;
  maxInputsPerPlayerPerTick: number;
  maxInputsPerSecond: number;
  inputTimeoutMs: number;
  maxDeltaSeconds: number;
  moveSpeed: number;
  focusSpeedMultiplier: number;
  spatialCellSize: number;
  worldHalfExtent: number;
  preDropSeconds: number;
  initialZoneRadius: number;
  safeZoneCenter: ZoneCenter;
  safeZoneRings: readonly SafeZoneRing[];
  zoneDamagePerSecond: number;
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  maxPlayers: 64,
  maxPendingInputsPerPlayer: 32,
  maxInputsPerPlayerPerTick: 4,
  maxInputsPerSecond: 120,
  inputTimeoutMs: 250,
  maxDeltaSeconds: 0.05,
  moveSpeed: 5,
  focusSpeedMultiplier: 0.72,
  spatialCellSize: 128,
  worldHalfExtent: 2_200,
  preDropSeconds: 10,
  initialZoneRadius: 2_000,
  safeZoneCenter: { x: 0, z: 0 },
  safeZoneRings: [
    { targetRadius: 1_000, lootingSeconds: 90, collapseSeconds: 60 },
    { targetRadius: 500, lootingSeconds: 60, collapseSeconds: 45 },
    { targetRadius: 250, lootingSeconds: 60, collapseSeconds: 45 },
  ],
  zoneDamagePerSecond: 10,
};

export interface PlayerStateSnapshot {
  playerId: string;
  lastProcessedSequence: number;
  position: Position3;
  velocity: Position3;
  rightHandState: HandAction;
  leftHandState: HandAction;
  isFocusAiming: boolean;
  health: number;
}

export interface ZoneStateSnapshot {
  center: ZoneCenter;
  currentRadius: number;
  targetRadius: number;
  phase: MatchPhase;
  phaseRemainingSeconds: number;
}

export interface AuthoritativeWorldSnapshot {
  snapshotId: number;
  serverTimestampMs: number;
  players: PlayerStateSnapshot[];
  zoneState: ZoneStateSnapshot;
}

export type SubmitInputReason =
  | "unknown-player"
  | "invalid-packet"
  | "invalid-server-time"
  | "out-of-order-sequence"
  | "input-rate-limit"
  | "input-queue-full";

export type SubmitInputResult =
  | { accepted: true }
  | { accepted: false; reason: SubmitInputReason };

interface InternalPlayer {
  playerId: string;
  position: Position3;
  velocity: Position3;
  health: number;
  lastAcceptedSequence: number;
  lastProcessedSequence: number;
  lastInputReceivedAtMs: number | null;
  rateWindowStartMs: number | null;
  inputsInRateWindow: number;
  pendingInputs: ClientInputPacket[];
  currentInput: ClientInputPacket | null;
  rightHandState: HandAction;
  leftHandState: HandAction;
  isFocusAiming: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseClientInput(value: unknown): ClientInputPacket | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "sequenceNumber",
      "inputFlags",
      "pitch",
      "yaw",
      "movementVector",
    ])
  ) {
    return null;
  }

  const { sequenceNumber, inputFlags, pitch, yaw, movementVector } = value;
  if (
    !Number.isSafeInteger(sequenceNumber) ||
    (sequenceNumber as number) < 1 ||
    (sequenceNumber as number) > MAX_SEQUENCE_NUMBER ||
    !Number.isInteger(inputFlags) ||
    ((inputFlags as number) & ~VALID_INPUT_FLAGS) !== 0 ||
    !isFiniteNumber(pitch) ||
    pitch < -89 ||
    pitch > 89 ||
    !isFiniteNumber(yaw) ||
    yaw < -180 ||
    yaw > 180 ||
    !isRecord(movementVector) ||
    !hasExactKeys(movementVector, ["forward", "strafe"])
  ) {
    return null;
  }

  const { forward, strafe } = movementVector;
  if (
    !isFiniteNumber(forward) ||
    forward < -1 ||
    forward > 1 ||
    !isFiniteNumber(strafe) ||
    strafe < -1 ||
    strafe > 1
  ) {
    return null;
  }

  return {
    sequenceNumber: sequenceNumber as number,
    inputFlags: inputFlags as number,
    pitch,
    yaw,
    movementVector: { forward, strafe },
  };
}

function validateConfig(config: MatchConfig): void {
  const positiveIntegers: Array<[string, number]> = [
    ["maxPlayers", config.maxPlayers],
    ["maxPendingInputsPerPlayer", config.maxPendingInputsPerPlayer],
    ["maxInputsPerPlayerPerTick", config.maxInputsPerPlayerPerTick],
    ["maxInputsPerSecond", config.maxInputsPerSecond],
  ];
  for (const [name, value] of positiveIntegers) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${name} must be a positive integer.`);
    }
  }

  const positiveNumbers: Array<[string, number]> = [
    ["inputTimeoutMs", config.inputTimeoutMs],
    ["maxDeltaSeconds", config.maxDeltaSeconds],
    ["moveSpeed", config.moveSpeed],
    ["spatialCellSize", config.spatialCellSize],
    ["worldHalfExtent", config.worldHalfExtent],
    ["preDropSeconds", config.preDropSeconds],
    ["initialZoneRadius", config.initialZoneRadius],
    ["zoneDamagePerSecond", config.zoneDamagePerSecond],
  ];
  for (const [name, value] of positiveNumbers) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${name} must be a positive finite number.`);
    }
  }

  if (
    !Number.isFinite(config.focusSpeedMultiplier) ||
    config.focusSpeedMultiplier <= 0 ||
    config.focusSpeedMultiplier > 1
  ) {
    throw new Error("focusSpeedMultiplier must be in the range (0, 1].");
  }
  if (
    !isFiniteNumber(config.safeZoneCenter.x) ||
    !isFiniteNumber(config.safeZoneCenter.z)
  ) {
    throw new Error("safeZoneCenter coordinates must be finite.");
  }
  if (config.safeZoneRings.length === 0) {
    throw new Error("At least one safe-zone ring is required.");
  }

  let previousRadius = config.initialZoneRadius;
  for (const [index, ring] of config.safeZoneRings.entries()) {
    if (
      !Number.isFinite(ring.targetRadius) ||
      ring.targetRadius <= 0 ||
      ring.targetRadius >= previousRadius
    ) {
      throw new Error(
        `Safe-zone ring ${index} must have a positive radius smaller than the previous radius.`,
      );
    }
    if (
      !Number.isFinite(ring.lootingSeconds) ||
      ring.lootingSeconds <= 0 ||
      !Number.isFinite(ring.collapseSeconds) ||
      ring.collapseSeconds <= 0
    ) {
      throw new Error(`Safe-zone ring ${index} durations must be positive.`);
    }
    previousRadius = ring.targetRadius;
  }
}

function copyInput(packet: ClientInputPacket): ClientInputPacket {
  return {
    ...packet,
    movementVector: { ...packet.movementVector },
  };
}

export class AuthoritativeMatch {
  private readonly config: MatchConfig;
  private readonly players = new Map<string, InternalPlayer>();
  private readonly spatialGrid: SpatialHashGrid<InternalPlayer>;
  private readonly spatialQueryScratch: InternalPlayer[] = [];
  private phase: MatchPhase = "PRE_DROP";
  private phaseRemainingSeconds: number;
  private currentRadius: number;
  private targetRadius: number;
  private currentRingIndex = 0;
  private snapshotId = 0;
  private lastServerTimeMs: number | null = null;

  constructor(config: MatchConfig = DEFAULT_MATCH_CONFIG) {
    validateConfig(config);
    this.config = {
      ...config,
      safeZoneCenter: { ...config.safeZoneCenter },
      safeZoneRings: config.safeZoneRings.map((ring) => ({ ...ring })),
    };
    this.spatialGrid = new SpatialHashGrid(this.config.spatialCellSize);
    this.phaseRemainingSeconds = config.preDropSeconds;
    this.currentRadius = config.initialZoneRadius;
    this.targetRadius = config.initialZoneRadius;
  }

  /**
   * Spawn position and player identity must come from server-side match logic.
   * Never pass client-submitted identity or coordinates directly here.
   */
  registerPlayer(playerId: string, serverSelectedSpawn: Position3): void {
    if (!playerId.trim() || playerId.length > 128) {
      throw new Error("playerId must be a non-empty server-owned identifier.");
    }
    if (this.players.has(playerId)) {
      throw new Error("Player is already registered in this match.");
    }
    if (this.players.size >= this.config.maxPlayers) {
      throw new Error("Match player capacity has been reached.");
    }
    if (
      !isFiniteNumber(serverSelectedSpawn.x) ||
      !isFiniteNumber(serverSelectedSpawn.y) ||
      !isFiniteNumber(serverSelectedSpawn.z) ||
      Math.abs(serverSelectedSpawn.x) > this.config.worldHalfExtent ||
      Math.abs(serverSelectedSpawn.z) > this.config.worldHalfExtent
    ) {
      throw new Error("Spawn position must be finite and inside world bounds.");
    }

    const player: InternalPlayer = {
      playerId,
      position: { ...serverSelectedSpawn },
      velocity: { x: 0, y: 0, z: 0 },
      health: 100,
      lastAcceptedSequence: 0,
      lastProcessedSequence: 0,
      lastInputReceivedAtMs: null,
      rateWindowStartMs: null,
      inputsInRateWindow: 0,
      pendingInputs: [],
      currentInput: null,
      rightHandState: "IDLE",
      leftHandState: "IDLE",
      isFocusAiming: false,
    };
    this.players.set(playerId, player);
    this.spatialGrid.insert(player);
  }

  unregisterPlayer(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;
    this.spatialGrid.remove(player);
    return this.players.delete(playerId);
  }

  /**
   * Query nearby registered players for future interest-management and
   * collision broadphase work. `out` may be reused to avoid a result-array
   * allocation. The query still performs exact radius filtering.
   */
  findNearbyPlayerIds(
    x: number,
    z: number,
    radius: number,
    out: string[] = [],
  ): number {
    const count = this.spatialGrid.queryRadius(
      x,
      z,
      radius,
      this.spatialQueryScratch,
    );
    out.length = 0;
    for (let index = 0; index < count; index += 1) {
      out[index] = this.spatialQueryScratch[index]!.playerId;
    }
    out.length = count;
    return count;
  }

  /**
   * `authenticatedPlayerId` must be resolved from a trusted server-side
   * connection/session. `receivedAtMs` must come from the server's monotonic
   * clock, never from the packet.
   */
  submitInput(
    authenticatedPlayerId: string,
    untrustedPacket: unknown,
    receivedAtMs: number,
  ): SubmitInputResult {
    const player = this.players.get(authenticatedPlayerId);
    if (!player) {
      return { accepted: false, reason: "unknown-player" };
    }

    const packet = parseClientInput(untrustedPacket);
    if (!packet) {
      return { accepted: false, reason: "invalid-packet" };
    }

    if (
      !isFiniteNumber(receivedAtMs) ||
      receivedAtMs < 0 ||
      (this.lastServerTimeMs !== null &&
        receivedAtMs < this.lastServerTimeMs) ||
      (player.lastInputReceivedAtMs !== null &&
        receivedAtMs < player.lastInputReceivedAtMs)
    ) {
      return { accepted: false, reason: "invalid-server-time" };
    }
    if (packet.sequenceNumber <= player.lastAcceptedSequence) {
      return { accepted: false, reason: "out-of-order-sequence" };
    }

    if (
      player.rateWindowStartMs === null ||
      receivedAtMs - player.rateWindowStartMs >= 1_000
    ) {
      player.rateWindowStartMs = receivedAtMs;
      player.inputsInRateWindow = 0;
    }
    if (player.inputsInRateWindow >= this.config.maxInputsPerSecond) {
      return { accepted: false, reason: "input-rate-limit" };
    }
    if (
      player.pendingInputs.length >=
      this.config.maxPendingInputsPerPlayer
    ) {
      return { accepted: false, reason: "input-queue-full" };
    }

    player.pendingInputs.push(copyInput(packet));
    player.lastAcceptedSequence = packet.sequenceNumber;
    player.lastInputReceivedAtMs = receivedAtMs;
    player.inputsInRateWindow += 1;
    return { accepted: true };
  }

  /**
   * Advance with server-measured elapsed time. Large frame hitches are capped
   * to bound movement and damage in a single simulation step.
   */
  tick(deltaSeconds: number, serverNowMs: number): AuthoritativeWorldSnapshot {
    if (
      !isFiniteNumber(deltaSeconds) ||
      deltaSeconds < 0 ||
      !isFiniteNumber(serverNowMs) ||
      serverNowMs < 0 ||
      (this.lastServerTimeMs !== null && serverNowMs < this.lastServerTimeMs)
    ) {
      throw new Error("Tick requires finite, non-negative, monotonic server time.");
    }

    const boundedDelta = Math.min(deltaSeconds, this.config.maxDeltaSeconds);
    this.advanceZone(boundedDelta);

    for (const player of this.players.values()) {
      const inputIsFresh =
        player.lastInputReceivedAtMs !== null &&
        serverNowMs - player.lastInputReceivedAtMs <=
          this.config.inputTimeoutMs;

      if (!inputIsFresh) {
        player.pendingInputs.length = 0;
        player.currentInput = null;
        player.lastProcessedSequence = player.lastAcceptedSequence;
      } else {
        let processed = 0;
        while (
          player.pendingInputs.length > 0 &&
          processed < this.config.maxInputsPerPlayerPerTick
        ) {
          const nextInput = player.pendingInputs.shift();
          if (!nextInput) break;
          player.currentInput = nextInput;
          player.lastProcessedSequence = nextInput.sequenceNumber;
          processed += 1;
        }
      }

      const input = inputIsFresh ? player.currentInput : null;
      const flags = input?.inputFlags ?? 0;
      player.isFocusAiming =
        (flags & ClientInputFlags.FOCUS_AIM) !== 0 && player.health > 0;

      if (!input || player.health <= 0) {
        player.velocity = { x: 0, y: 0, z: 0 };
        player.rightHandState = "IDLE";
        player.leftHandState = "IDLE";
        player.isFocusAiming = false;
        continue;
      }

      this.simulatePlayerInput(player, input, boundedDelta);
    }

    this.applyZoneDamage(boundedDelta);
    for (const player of this.players.values()) {
      if (player.health <= 0) {
        player.velocity = { x: 0, y: 0, z: 0 };
        player.rightHandState = "IDLE";
        player.leftHandState = "IDLE";
        player.isFocusAiming = false;
      }
    }

    this.lastServerTimeMs = serverNowMs;
    this.snapshotId += 1;
    return this.getSnapshot(serverNowMs);
  }

  finishMatch(): void {
    this.phase = "MATCH_OVER";
    this.phaseRemainingSeconds = 0;
  }

  getSnapshot(serverTimestampMs = this.lastServerTimeMs ?? 0): AuthoritativeWorldSnapshot {
    return {
      snapshotId: this.snapshotId,
      serverTimestampMs,
      players: [...this.players.values()].map((player) => ({
        playerId: player.playerId,
        lastProcessedSequence: player.lastProcessedSequence,
        position: { ...player.position },
        velocity: { ...player.velocity },
        rightHandState: player.rightHandState,
        leftHandState: player.leftHandState,
        isFocusAiming: player.isFocusAiming,
        health: player.health,
      })),
      zoneState: {
        center: { ...this.config.safeZoneCenter },
        currentRadius: this.currentRadius,
        targetRadius: this.targetRadius,
        phase: this.phase,
        phaseRemainingSeconds: this.phaseRemainingSeconds,
      },
    };
  }

  private simulatePlayerInput(
    player: InternalPlayer,
    input: ClientInputPacket,
    deltaSeconds: number,
  ): void {
    const { forward: rawForward, strafe: rawStrafe } = input.movementVector;
    const magnitude = Math.hypot(rawForward, rawStrafe);
    const normalization = magnitude > 1 ? 1 / magnitude : 1;
    const forward = rawForward * normalization;
    const strafe = rawStrafe * normalization;
    const yawRadians = (input.yaw * Math.PI) / 180;
    const moveX = strafe * Math.cos(yawRadians) + forward * Math.sin(yawRadians);
    const moveZ = -strafe * Math.sin(yawRadians) + forward * Math.cos(yawRadians);
    const speed =
      this.config.moveSpeed *
      (player.isFocusAiming ? this.config.focusSpeedMultiplier : 1);

    player.velocity = {
      x: moveX * speed,
      y: 0,
      z: moveZ * speed,
    };
    player.position = {
      x: this.clampWorldCoordinate(
        player.position.x + player.velocity.x * deltaSeconds,
      ),
      y: player.position.y,
      z: this.clampWorldCoordinate(
        player.position.z + player.velocity.z * deltaSeconds,
      ),
    };
    this.spatialGrid.update(player);

    const flags = input.inputFlags;
    player.rightHandState =
      (flags & ClientInputFlags.RELOAD_RIGHT) !== 0
        ? "RELOADING"
        : (flags & ClientInputFlags.FIRE_RIGHT) !== 0
          ? "FIRING"
          : "IDLE";
    player.leftHandState =
      (flags & ClientInputFlags.RELOAD_LEFT) !== 0
        ? "RELOADING"
        : (flags & ClientInputFlags.FIRE_LEFT) !== 0
          ? "FIRING"
          : "IDLE";
  }

  private clampWorldCoordinate(value: number): number {
    return Math.max(
      -this.config.worldHalfExtent,
      Math.min(this.config.worldHalfExtent, value),
    );
  }

  private advanceZone(deltaSeconds: number): void {
    let remaining = deltaSeconds;
    while (
      remaining > 0 &&
      this.phase !== "EXTRACTION_READY" &&
      this.phase !== "MATCH_OVER"
    ) {
      const step = Math.min(remaining, this.phaseRemainingSeconds);
      if (this.phase === "ZONE_COLLAPSE") {
        const ring = this.config.safeZoneRings[this.currentRingIndex];
        if (!ring) break;
        const shrinkPerSecond =
          (this.currentRadius - ring.targetRadius) / ring.collapseSeconds;
        this.currentRadius = Math.max(
          ring.targetRadius,
          this.currentRadius - shrinkPerSecond * step,
        );
      }

      this.phaseRemainingSeconds -= step;
      remaining -= step;

      if (this.phaseRemainingSeconds > 1e-9) {
        continue;
      }

      if (this.phase === "PRE_DROP") {
        this.phase = "ACTIVE_LOOTING";
        this.phaseRemainingSeconds =
          this.config.safeZoneRings[this.currentRingIndex]!.lootingSeconds;
      } else if (this.phase === "ACTIVE_LOOTING") {
        const ring = this.config.safeZoneRings[this.currentRingIndex]!;
        this.phase = "ZONE_COLLAPSE";
        this.targetRadius = ring.targetRadius;
        this.phaseRemainingSeconds = ring.collapseSeconds;
      } else if (this.phase === "ZONE_COLLAPSE") {
        const ring = this.config.safeZoneRings[this.currentRingIndex]!;
        this.currentRadius = ring.targetRadius;
        this.currentRingIndex += 1;
        const nextRing = this.config.safeZoneRings[this.currentRingIndex];
        if (!nextRing) {
          this.phase = "EXTRACTION_READY";
          this.targetRadius = this.currentRadius;
          this.phaseRemainingSeconds = 0;
        } else {
          this.phase = "ACTIVE_LOOTING";
          this.targetRadius = this.currentRadius;
          this.phaseRemainingSeconds = nextRing.lootingSeconds;
        }
      }
    }
  }

  private applyZoneDamage(deltaSeconds: number): void {
    if (this.phase === "PRE_DROP" || this.phase === "MATCH_OVER") {
      return;
    }
    const { x: centerX, z: centerZ } = this.config.safeZoneCenter;
    for (const player of this.players.values()) {
      if (player.health <= 0) continue;
      const distance = Math.hypot(
        player.position.x - centerX,
        player.position.z - centerZ,
      );
      if (distance > this.currentRadius) {
        player.health = Math.max(
          0,
          player.health - this.config.zoneDamagePerSecond * deltaSeconds,
        );
      }
    }
  }
}
