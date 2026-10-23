/**
 * Server-owned match simulation primitives.
 *
 * A transport must authenticate a connection and pass its server-resolved
 * player ID to submitInput. The packet itself never establishes identity.
 * This module is deliberately transport-agnostic: it owns bounded movement,
 * player combat, and operator effects, but not account identity, matchmaking,
 * client prediction, or durable progression.
 */

import { SpatialHashGrid } from "./spatial-hash-grid.ts";
import {
  StaticWorldCollisionMap,
  type StaticAabb,
} from "./static-world-collision-map.ts";
import { loadLevelGeometryAsset } from "./level-asset-loader.ts";
import {
  MTEAuthoritativeAbilityManager,
  MTE_SERVER_WEAPON_CATALOG,
  MTEWeaponTelemetryEngine,
  SERVER_OPERATOR_PROFILES,
  type AbilityType,
  type PlayerAbilityState,
  type RuntimeWeaponProfile,
  type ServerOperatorId,
} from "./authoritative-combat-systems.ts";

export const ClientInputFlags = {
  FIRE_RIGHT: 1 << 0,
  FIRE_LEFT: 1 << 1,
  RELOAD_RIGHT: 1 << 2,
  RELOAD_LEFT: 1 << 3,
  FOCUS_AIM: 1 << 4,
  RELOAD_REQUEST: 1 << 5,
  ACTIVATE_ABILITY: 1 << 6,
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

export type HandAction = "IDLE" | "FIRING" | "RELOADING" | "DRY_CLICK";

export interface WeaponHandSnapshot {
  weaponId: string;
  ammoInMagazine: number;
  reserveAmmo: number;
  maxClipSize: number;
  isReloading: boolean;
  reloadRemainingSeconds: number;
}

export interface PlayerAbilitySnapshot {
  abilityId: AbilityType;
  isActive: boolean;
  cooldownRemainingSeconds: number;
  activeDurationRemainingSeconds: number;
}

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
  maxLookDegreesPerSecond: number;
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
  maxLookDegreesPerSecond: 900,
  focusSpeedMultiplier: 0.72,
  spatialCellSize: 128,
  worldHalfExtent: 152,
  preDropSeconds: 10,
  initialZoneRadius: 152,
  safeZoneCenter: { x: 0, z: 0 },
  safeZoneRings: [
    { targetRadius: 100, lootingSeconds: 90, collapseSeconds: 60 },
    { targetRadius: 60, lootingSeconds: 60, collapseSeconds: 45 },
    { targetRadius: 25, lootingSeconds: 60, collapseSeconds: 45 },
  ],
  zoneDamagePerSecond: 10,
};

export interface PlayerStateSnapshot {
  playerId: string;
  lastProcessedSequence: number;
  position: Position3;
  velocity: Position3;
  yaw: number;
  pitch: number;
  rightHandState: HandAction;
  leftHandState: HandAction;
  operatorId: ServerOperatorId;
  rightWeapon: WeaponHandSnapshot;
  leftWeapon: WeaponHandSnapshot;
  ability: PlayerAbilitySnapshot;
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
  protocolVersion: 3;
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
  yaw: number;
  pitch: number;
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
  operatorId: ServerOperatorId;
  rightWeapon: InternalWeaponHand;
  leftWeapon: InternalWeaponHand;
  ability: PlayerAbilityState;
  abilityHeld: boolean;
  reloadHeld: boolean;
  lastReloadRequestAtMs: number | null;
  reloadLeftAfterRight: boolean;
  dryClickUntilMs: { right: number; left: number };
  gatewayEntry: Position3 | null;
  gatewayExit: Position3 | null;
  gatewayLockSeconds: number;
}

interface InternalWeaponHand {
  profile: RuntimeWeaponProfile;
  ammoInMagazine: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadRemainingSeconds: number;
  nextShotAtMs: number;
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

function normalizeDegrees(degrees: number): number {
  return ((degrees + 180) % 360 + 360) % 360 - 180;
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
    ["maxLookDegreesPerSecond", config.maxLookDegreesPerSecond],
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

function raySphereDistance(
  origin: Position3,
  direction: Position3,
  center: Position3,
  radius: number,
): number | null {
  const offset = {
    x: origin.x - center.x,
    y: origin.y - center.y,
    z: origin.z - center.z,
  };
  const b =
    offset.x * direction.x +
    offset.y * direction.y +
    offset.z * direction.z;
  const c =
    offset.x * offset.x +
    offset.y * offset.y +
    offset.z * offset.z -
    radius * radius;
  const discriminant = b * b - c;
  if (discriminant < 0) return null;
  const near = -b - Math.sqrt(discriminant);
  if (near >= 0) return near;
  const far = -b + Math.sqrt(discriminant);
  return far >= 0 ? far : null;
}

export class AuthoritativeMatch {
  private readonly config: MatchConfig;
  private readonly players = new Map<string, InternalPlayer>();
  private readonly spatialGrid: SpatialHashGrid<InternalPlayer>;
  private readonly collisionMap: StaticWorldCollisionMap;
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
    this.collisionMap = new StaticWorldCollisionMap(
      this.config.worldHalfExtent,
    );
    this.phaseRemainingSeconds = config.preDropSeconds;
    this.currentRadius = config.initialZoneRadius;
    this.targetRadius = config.initialZoneRadius;
  }

  /**
   * Spawn position and player identity must come from server-side match logic.
   * Never pass client-submitted identity or coordinates directly here.
   */
  registerPlayer(
    playerId: string,
    serverSelectedSpawn: Position3,
    operatorId: ServerOperatorId = "jaya",
  ): void {
    if (!playerId.trim() || playerId.length > 128) {
      throw new Error("playerId must be a non-empty server-owned identifier.");
    }
    if (this.players.has(playerId)) {
      throw new Error("Player is already registered in this match.");
    }
    if (!Object.hasOwn(SERVER_OPERATOR_PROFILES, operatorId)) {
      throw new Error("Operator selection is not in the server roster.");
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
    if (!this.collisionMap.isPositionClear(serverSelectedSpawn)) {
      throw new Error("Spawn position intersects static world geometry.");
    }

    const operatorProfile = SERVER_OPERATOR_PROFILES[operatorId];
    const makeWeaponHand = (weaponId: string): InternalWeaponHand => {
      const profile = MTEWeaponTelemetryEngine.calculateRuntimeProfile(
        { weaponId, equippedAttachmentIds: [] },
        MTE_SERVER_WEAPON_CATALOG,
      );
      return {
        profile,
        ammoInMagazine: profile.maxClipSize,
        reserveAmmo: profile.maxClipSize * 2,
        isReloading: false,
        reloadRemainingSeconds: 0,
        nextShotAtMs: 0,
      };
    };
    const player: InternalPlayer = {
      playerId,
      position: { ...serverSelectedSpawn },
      velocity: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
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
      operatorId,
      rightWeapon: makeWeaponHand(operatorProfile.primaryWeaponId),
      leftWeapon: makeWeaponHand(operatorProfile.secondaryWeaponId),
      ability: MTEAuthoritativeAbilityManager.createDefaultState(
        operatorProfile.abilityId,
      ),
      abilityHeld: false,
      reloadHeld: false,
      lastReloadRequestAtMs: null,
      reloadLeftAfterRight: false,
      dryClickUntilMs: { right: 0, left: 0 },
      gatewayEntry: null,
      gatewayExit: null,
      gatewayLockSeconds: 0,
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
   * Read a copy of the server-simulated position for an authenticated player.
   * Callers must resolve the player ID from a server-owned session first.
   */
  getPlayerPosition(playerId: string): Position3 | null {
    const player = this.players.get(playerId);
    return player ? { ...player.position } : null;
  }

  /**
   * Add immutable level geometry from trusted server-side map data. Never
   * expose this method to raw client packets.
   */
  addStaticCollisionBounds(bounds: StaticAabb): void {
    if (this.players.size > 0) {
      throw new Error("Static collision geometry must load before players.");
    }
    this.collisionMap.addStaticBounds(bounds);
  }

  /**
   * Load validated trusted level footprints before players join the match.
   * The transport/bootstrap layer is responsible for supplying the asset.
   */
  loadLevelGeometryAsset(jsonStream: string): number {
    if (this.players.size > 0) {
      throw new Error("Static collision geometry must load before players.");
    }
    return loadLevelGeometryAsset(jsonStream, this.collisionMap);
  }

  traceWorldOcclusion(
    origin: Position3,
    direction: Position3,
    maxDistance: number,
  ): number | null {
    return this.collisionMap.traceRay(origin, direction, maxDistance);
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
        player.isFocusAiming = false;
      } else {
        this.simulatePlayerInput(player, input, boundedDelta);
      }

      this.simulateCombat(
        player,
        input && player.health > 0 ? flags : 0,
        boundedDelta,
        serverNowMs,
      );
    }

    this.applyZoneDamage(boundedDelta);
    for (const player of this.players.values()) {
      if (player.health <= 0) {
        player.velocity = { x: 0, y: 0, z: 0 };
        player.rightHandState = "IDLE";
        player.leftHandState = "IDLE";
        player.isFocusAiming = false;
        player.ability.isActive = false;
        player.gatewayEntry = null;
        player.gatewayExit = null;
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
      protocolVersion: 3,
      snapshotId: this.snapshotId,
      serverTimestampMs,
      players: [...this.players.values()].map((player) => ({
        playerId: player.playerId,
        lastProcessedSequence: player.lastProcessedSequence,
        position: { ...player.position },
        velocity: { ...player.velocity },
        yaw: player.yaw,
        pitch: player.pitch,
        rightHandState: player.rightHandState,
        leftHandState: player.leftHandState,
        operatorId: player.operatorId,
        rightWeapon: this.toWeaponHandSnapshot(player.rightWeapon),
        leftWeapon: this.toWeaponHandSnapshot(player.leftWeapon),
        ability: {
          abilityId: player.ability.abilityId,
          isActive: player.ability.isActive,
          cooldownRemainingSeconds: player.ability.cooldownRemainingSec,
          activeDurationRemainingSeconds:
            player.ability.activeDurationRemainingSec,
        },
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

  private toWeaponHandSnapshot(
    hand: InternalWeaponHand,
  ): WeaponHandSnapshot {
    return {
      weaponId: hand.profile.weaponId,
      ammoInMagazine: hand.ammoInMagazine,
      reserveAmmo: hand.reserveAmmo,
      maxClipSize: hand.profile.maxClipSize,
      isReloading: hand.isReloading,
      reloadRemainingSeconds: hand.reloadRemainingSeconds,
    };
  }

  private simulateCombat(
    player: InternalPlayer,
    flags: number,
    deltaSeconds: number,
    serverNowMs: number,
  ): void {
    MTEAuthoritativeAbilityManager.advanceAbilityTimeline(
      player.ability,
      deltaSeconds,
    );
    player.gatewayLockSeconds = Math.max(
      0,
      player.gatewayLockSeconds - deltaSeconds,
    );
    if (!player.ability.isActive && player.ability.abilityId === "MANDALA_GATEWAY") {
      player.gatewayEntry = null;
      player.gatewayExit = null;
    }
    if (player.ability.isActive && player.ability.abilityId === "RAS_RADIANCE") {
      if (player.health > 0) {
        player.health = Math.min(100, player.health + 16 * deltaSeconds);
      }
    }

    this.advanceReload(player.rightWeapon, deltaSeconds);
    this.advanceReload(player.leftWeapon, deltaSeconds);
    if (player.reloadLeftAfterRight && !player.rightWeapon.isReloading) {
      player.reloadLeftAfterRight = false;
      this.beginReload(player.leftWeapon);
    }

    const reloadMask =
      ClientInputFlags.RELOAD_REQUEST |
      ClientInputFlags.RELOAD_RIGHT |
      ClientInputFlags.RELOAD_LEFT;
    const reloadIsHeld = (flags & reloadMask) !== 0;
    if (reloadIsHeld && !player.reloadHeld) {
      if ((flags & ClientInputFlags.RELOAD_REQUEST) !== 0) {
        this.handleReloadRequest(player, serverNowMs);
      } else {
        if ((flags & ClientInputFlags.RELOAD_RIGHT) !== 0) {
          this.beginReload(player.rightWeapon);
        }
        if ((flags & ClientInputFlags.RELOAD_LEFT) !== 0) {
          this.beginReload(player.leftWeapon);
        }
      }
    }
    player.reloadHeld = reloadIsHeld;

    const abilityIsHeld =
      (flags & ClientInputFlags.ACTIVATE_ABILITY) !== 0;
    if (abilityIsHeld && !player.abilityHeld) {
      this.activatePlayerAbility(player);
    }
    player.abilityHeld = abilityIsHeld;

    this.updateHandAction(
      player,
      "right",
      player.rightWeapon,
      (flags & ClientInputFlags.FIRE_RIGHT) !== 0,
      serverNowMs,
    );
    this.updateHandAction(
      player,
      "left",
      player.leftWeapon,
      (flags & ClientInputFlags.FIRE_LEFT) !== 0,
      serverNowMs,
    );
  }

  private handleReloadRequest(player: InternalPlayer, serverNowMs: number): void {
    const doubleTap =
      player.lastReloadRequestAtMs !== null &&
      serverNowMs - player.lastReloadRequestAtMs <= 320;
    player.lastReloadRequestAtMs = serverNowMs;
    const rightNeedsReload = this.needsReload(player.rightWeapon);
    const leftNeedsReload = this.needsReload(player.leftWeapon);
    if (!rightNeedsReload && !leftNeedsReload) return;

    if (doubleTap) {
      player.reloadLeftAfterRight = false;
      this.beginReload(player.rightWeapon, 1.2, true);
      this.beginReload(player.leftWeapon, 1.2, true);
      return;
    }
    if (rightNeedsReload && leftNeedsReload) {
      player.reloadLeftAfterRight = this.beginReload(player.rightWeapon);
      if (!player.reloadLeftAfterRight) this.beginReload(player.leftWeapon);
      return;
    }
    this.beginReload(
      rightNeedsReload ? player.rightWeapon : player.leftWeapon,
    );
  }

  private needsReload(hand: InternalWeaponHand): boolean {
    return (
      !hand.isReloading &&
      hand.reserveAmmo > 0 &&
      hand.ammoInMagazine < hand.profile.maxClipSize
    );
  }

  private beginReload(
    hand: InternalWeaponHand,
    durationMultiplier = 1,
    restartExisting = false,
  ): boolean {
    const canReload =
      hand.reserveAmmo > 0 &&
      hand.ammoInMagazine < hand.profile.maxClipSize &&
      (restartExisting || !hand.isReloading);
    if (!canReload) return false;
    hand.isReloading = true;
    hand.reloadRemainingSeconds =
      hand.profile.reloadDurationSec * durationMultiplier;
    return true;
  }

  private advanceReload(hand: InternalWeaponHand, deltaSeconds: number): void {
    if (!hand.isReloading) return;
    hand.reloadRemainingSeconds = Math.max(
      0,
      hand.reloadRemainingSeconds - deltaSeconds,
    );
    if (hand.reloadRemainingSeconds > 0) return;
    const loaded = Math.min(
      hand.profile.maxClipSize - hand.ammoInMagazine,
      hand.reserveAmmo,
    );
    hand.ammoInMagazine += loaded;
    hand.reserveAmmo -= loaded;
    hand.isReloading = false;
  }

  private activatePlayerAbility(player: InternalPlayer): void {
    if (player.ability.abilityId === "MANDALA_GATEWAY") {
      if (player.ability.cooldownRemainingSec > 0) return;
      if (!player.gatewayEntry) {
        player.gatewayEntry = { ...player.position };
        player.ability.isActive = true;
        player.ability.activeDurationRemainingSec = 18;
        return;
      }
      if (player.gatewayExit) return;
      const yaw = (player.yaw * Math.PI) / 180;
      const endpoint = {
        x: this.clampWorldCoordinate(player.position.x + Math.sin(yaw) * 14),
        y: player.position.y,
        z: this.clampWorldCoordinate(player.position.z + Math.cos(yaw) * 14),
      };
      if (!this.collisionMap.isPositionClear(endpoint)) return;
      player.gatewayExit = endpoint;
      player.ability.cooldownRemainingSec = 16;
      player.ability.activeDurationRemainingSec = 18;
      player.ability.isActive = true;
      return;
    }

    if (!MTEAuthoritativeAbilityManager.executeActivationTrigger(player.ability)) {
      return;
    }
    switch (player.ability.abilityId) {
      case "THERMITE_BREACH":
        this.applyThermiteBreach(player);
        break;
      case "QUANTUM_SHIFT":
        this.applyQuantumShift(player);
        break;
      case "SHATTER_PULSE":
        this.applyShatterPulse(player);
        break;
      default:
        break;
    }
  }

  private applyThermiteBreach(player: InternalPlayer): void {
    const direction = this.lookDirection(player);
    const origin = { ...player.position, y: player.position.y + 1.2 };
    const wallDistance = this.collisionMap.traceRay(origin, direction, 18);
    const blastDistance = wallDistance === null ? 6 : Math.min(16, wallDistance);
    const center = {
      x: origin.x + direction.x * blastDistance,
      y: origin.y + direction.y * blastDistance,
      z: origin.z + direction.z * blastDistance,
    };
    this.applyAreaDamage(player, center, wallDistance === null ? 3.4 : 4.6, wallDistance === null ? 34 : 70);
  }

  private applyQuantumShift(player: InternalPlayer): void {
    const direction = this.lookDirection(player);
    const movement = this.collisionMap.resolveHorizontalMovement(
      player.position,
      direction.x * 8,
      direction.z * 8,
    );
    if (
      Math.hypot(
        movement.position.x - player.position.x,
        movement.position.z - player.position.z,
      ) < 0.5
    ) {
      return;
    }
    player.position = {
      x: this.clampWorldCoordinate(movement.position.x),
      y: player.position.y,
      z: this.clampWorldCoordinate(movement.position.z),
    };
    player.velocity = { x: 0, y: 0, z: 0 };
    this.spatialGrid.update(player);
  }

  private applyShatterPulse(player: InternalPlayer): void {
    const direction = this.lookDirection(player);
    for (const target of this.players.values()) {
      if (target === player || target.health <= 0) continue;
      const dx = target.position.x - player.position.x;
      const dz = target.position.z - player.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 15) continue;
      const facingDot =
        (dx * direction.x + dz * direction.z) / Math.max(distance, 0.001);
      if (facingDot < Math.cos(Math.PI / 3)) continue;
      target.health = Math.max(0, target.health - 48);
    }
  }

  private applyAreaDamage(
    attacker: InternalPlayer,
    center: Position3,
    radius: number,
    damage: number,
  ): void {
    for (const target of this.players.values()) {
      if (target === attacker || target.health <= 0) continue;
      const distance = Math.hypot(
        target.position.x - center.x,
        target.position.z - center.z,
      );
      if (distance > radius) continue;
      if (
        target.ability.isActive &&
        target.ability.abilityId === "TEMPORAL_PHASE" &&
        Math.hypot(
          target.position.x - attacker.position.x,
          target.position.z - attacker.position.z,
        ) > 4
      ) {
        continue;
      }
      target.health = Math.max(0, target.health - damage);
    }
  }

  private lookDirection(player: InternalPlayer): Position3 {
    const yaw = (player.yaw * Math.PI) / 180;
    const pitch = (player.pitch * Math.PI) / 180;
    const horizontal = Math.cos(pitch);
    return {
      x: Math.sin(yaw) * horizontal,
      y: Math.sin(pitch),
      z: Math.cos(yaw) * horizontal,
    };
  }

  private updateHandAction(
    player: InternalPlayer,
    hand: "right" | "left",
    state: InternalWeaponHand,
    wantsFire: boolean,
    serverNowMs: number,
  ): void {
    if (state.isReloading) {
      if (hand === "right") player.rightHandState = "RELOADING";
      else player.leftHandState = "RELOADING";
      return;
    }
    if (!wantsFire) {
      const action =
        serverNowMs < player.dryClickUntilMs[hand] ? "DRY_CLICK" : "IDLE";
      if (hand === "right") player.rightHandState = action;
      else player.leftHandState = action;
      return;
    }
    if (state.ammoInMagazine <= 0) {
      player.dryClickUntilMs[hand] = serverNowMs + 120;
      if (hand === "right") player.rightHandState = "DRY_CLICK";
      else player.leftHandState = "DRY_CLICK";
      return;
    }
    if (serverNowMs >= state.nextShotAtMs) {
      state.ammoInMagazine -= 1;
      state.nextShotAtMs =
        serverNowMs + state.profile.fireIntervalMs;
      this.resolveServerShot(player, state.profile);
    }
    if (hand === "right") player.rightHandState = "FIRING";
    else player.leftHandState = "FIRING";
  }

  private resolveServerShot(
    attacker: InternalPlayer,
    weapon: RuntimeWeaponProfile,
  ): void {
    const direction = this.lookDirection(attacker);
    const origin = {
      x: attacker.position.x,
      y: attacker.position.y + 1.5,
      z: attacker.position.z,
    };
    let bestTarget: InternalPlayer | null = null;
    let bestDistance = weapon.maxEffectiveRange;
    for (const target of this.players.values()) {
      if (target === attacker || target.health <= 0) continue;
      const distance = raySphereDistance(
        origin,
        direction,
        {
          x: target.position.x,
          y: target.position.y + 1,
          z: target.position.z,
        },
        0.55,
      );
      if (distance === null || distance >= bestDistance) continue;
      if (
        target.ability.isActive &&
        target.ability.abilityId === "TEMPORAL_PHASE" &&
        Math.hypot(
          target.position.x - attacker.position.x,
          target.position.z - attacker.position.z,
        ) > 4
      ) {
        continue;
      }
      const wallDistance = this.collisionMap.traceRay(
        origin,
        direction,
        distance,
      );
      if (wallDistance !== null && wallDistance < distance - 0.02) continue;
      bestTarget = target;
      bestDistance = distance;
    }
    if (!bestTarget) return;
    const falloffRange = Math.max(
      0.001,
      weapon.maxEffectiveRange - weapon.falloffStartRange,
    );
    const falloffProgress = Math.max(
      0,
      Math.min(1, (bestDistance - weapon.falloffStartRange) / falloffRange),
    );
    const multiplier =
      1 -
      falloffProgress * (1 - weapon.minimumDamageMultiplier);
    bestTarget.health = Math.max(
      0,
      bestTarget.health - weapon.damage * multiplier,
    );
  }

  private tryTraverseGateway(player: InternalPlayer): void {
    if (
      player.gatewayLockSeconds > 0 ||
      !player.ability.isActive ||
      !player.gatewayEntry ||
      !player.gatewayExit
    ) {
      return;
    }
    const nearEntry =
      Math.hypot(
        player.position.x - player.gatewayEntry.x,
        player.position.z - player.gatewayEntry.z,
      ) <= 1.25;
    const nearExit =
      Math.hypot(
        player.position.x - player.gatewayExit.x,
        player.position.z - player.gatewayExit.z,
      ) <= 1.25;
    if (!nearEntry && !nearExit) return;
    const destination = nearEntry ? player.gatewayExit : player.gatewayEntry;
    player.position = { ...destination };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.gatewayLockSeconds = 0.5;
    this.spatialGrid.update(player);
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
    const maxRotation = this.config.maxLookDegreesPerSecond * deltaSeconds;
    const yawDelta = normalizeDegrees(input.yaw - player.yaw);
    const boundedYawDelta = Math.max(-maxRotation, Math.min(maxRotation, yawDelta));
    const pitchDelta = input.pitch - player.pitch;
    const boundedPitchDelta = Math.max(
      -maxRotation,
      Math.min(maxRotation, pitchDelta),
    );
    player.yaw = normalizeDegrees(player.yaw + boundedYawDelta);
    player.pitch = Math.max(-89, Math.min(89, player.pitch + boundedPitchDelta));
    const yawRadians = (player.yaw * Math.PI) / 180;
    const moveX = strafe * Math.cos(yawRadians) + forward * Math.sin(yawRadians);
    const moveZ = -strafe * Math.sin(yawRadians) + forward * Math.cos(yawRadians);
    const speed =
      this.config.moveSpeed *
      (player.isFocusAiming ? this.config.focusSpeedMultiplier : 1);

    const velocity = {
      x: moveX * speed,
      y: 0,
      z: moveZ * speed,
    };
    const resolvedMovement = this.collisionMap.resolveHorizontalMovement(
      player.position,
      velocity.x * deltaSeconds,
      velocity.z * deltaSeconds,
    );
    player.velocity = {
      x: resolvedMovement.blockedX ? 0 : velocity.x,
      y: 0,
      z: resolvedMovement.blockedZ ? 0 : velocity.z,
    };
    player.position = {
      x: this.clampWorldCoordinate(resolvedMovement.position.x),
      y: player.position.y,
      z: this.clampWorldCoordinate(resolvedMovement.position.z),
    };
    this.spatialGrid.update(player);
    this.tryTraverseGateway(player);
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
