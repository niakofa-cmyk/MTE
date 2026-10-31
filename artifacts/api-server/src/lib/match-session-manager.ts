import { createHash, randomBytes, randomUUID } from "node:crypto";
import { FixedStepAccumulator } from "./fixed-step-accumulator.ts";
import { ExtractionHold, type ExtractionHoldStatus } from "./extraction-hold.ts";
import {
  DEFAULT_MATCH_CONFIG,
  type AuthoritativeMatch,
  type AuthoritativeWorldSnapshot,
  type SubmitInputResult,
} from "./authoritative-match.ts";
import {
  SERVER_OPERATOR_PROFILES,
  type ServerOperatorId,
} from "./authoritative-combat-systems.ts";
import {
  AuthoritativeGameplayState,
  type AuthoritativeGameplaySnapshot,
  type GrantedGameplayItem,
} from "./authoritative-gameplay-state.ts";
import {
  CINDER_ROW_MAP_ID,
  CINDER_ROW_MAP_VERSION,
  CINDER_ROW_MAX_PLAYERS,
  CINDER_ROW_SPAWNS,
  CinderRowRelayRound,
  type ArenaTeam,
  type CinderRowRoundSnapshot,
} from "./cinder-row-arena.ts";
import type { GameplayRegistryAsset } from "./gameplay-registry.ts";
import { logger } from "./logger.ts";
import {
  createCinderRowAuthoritativeMatch,
  createNodAuthoritativeMatch,
} from "./match-bootstrap.ts";

const NANOSECONDS_PER_MILLISECOND = 1_000_000n;
const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const STATIC_COLLISION_ERROR = "Spawn position intersects static world geometry.";

export type MatchSessionErrorCode =
  | "server-capacity"
  | "player-capacity"
  | "invalid-operator"
  | "not-found"
  | "unauthorized"
  | "no-safe-spawn"
  | "player-position-unavailable"
  | "extraction-not-ready"
  | "round-finished";

export type MatchMapId = "nod" | typeof CINDER_ROW_MAP_ID;

export class MatchSessionError extends Error {
  readonly code: MatchSessionErrorCode;

  constructor(
    code: MatchSessionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MatchSessionError";
    this.code = code;
  }
}

export interface MatchBootstrap {
  (mapId: MatchMapId): Promise<{
    match: AuthoritativeMatch;
    loadedGeometryCount: number;
    gameplayRegistry: GameplayRegistryAsset;
  }>;
}

export interface MatchSessionManagerOptions {
  maxActiveSessions?: number;
  maxPlayersPerSession?: number;
  idleTimeoutMs?: number;
  maxSessionLifetimeMs?: number;
  tickIntervalMs?: number;
  simulationStepSeconds?: number;
  maxCatchUpSteps?: number;
  nowNs?: () => bigint;
}

export interface CreatedMatchSession {
  matchId: string;
  mapId: MatchMapId;
  mapVersion: string;
  gameModeId: "extraction" | "relay-control";
  mapNodeCount: number;
  maxPlayers: number;
  expiresAfterMs: number;
}

export interface MatchSessionSnapshot extends AuthoritativeWorldSnapshot {
  mapId: MatchMapId;
  mapVersion: string;
  players: Array<AuthoritativeWorldSnapshot["players"][number] & {
    team?: ArenaTeam;
  }>;
  arenaRound?: CinderRowRoundSnapshot;
}

export interface JoinedMatchSession {
  matchId: string;
  playerId: string;
  operatorId: ServerOperatorId;
  team: ArenaTeam | null;
  accessToken: string;
  snapshot: MatchSessionSnapshot;
}

interface SessionPlayer {
  accessTokenDigest: string;
  ownerUserId: string | null;
  extractionHold: ExtractionHold;
  team: ArenaTeam | null;
  connected: boolean;
  realtimeConnectionId: number | null;
}

interface MatchSessionRecord {
  matchId: string;
  mapId: MatchMapId;
  mapVersion: string;
  maxPlayers: number;
  match: AuthoritativeMatch;
  gameplay: AuthoritativeGameplayState;
  extractionObjective: GameplayRegistryAsset["objectives"][number] | null;
  arenaRound: CinderRowRelayRound | null;
  mapNodeCount: number;
  createdAtNs: bigint;
  lastActivityAtNs: bigint;
  tickAccumulator: FixedStepAccumulator;
  players: Map<string, SessionPlayer>;
  playerByTokenDigest: Map<string, string>;
  lastOverloadWarningAtNs: bigint;
}

export interface MatchExtractionStatus {
  matchId: string;
  inRange: boolean;
  progress: number;
  requiredSeconds: number;
  ready: boolean;
  settled: boolean;
}

export class MatchSessionManager {
  private readonly sessions = new Map<string, MatchSessionRecord>();
  private pendingCreates = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly nowNs: () => bigint;
  private readonly maxActiveSessions: number;
  private readonly maxPlayersPerSession: number;
  private readonly idleTimeoutNs: bigint;
  private readonly maxSessionLifetimeNs: bigint;
  private readonly tickIntervalMs: number;
  private readonly simulationStepSeconds: number;
  private readonly maxCatchUpSteps: number;
  private readonly bootstrap: MatchBootstrap;

  constructor(
    bootstrap: MatchBootstrap = (mapId) =>
      mapId === CINDER_ROW_MAP_ID
        ? createCinderRowAuthoritativeMatch()
        : createNodAuthoritativeMatch(),
    options: MatchSessionManagerOptions = {},
  ) {
    this.bootstrap = bootstrap;
    this.nowNs = options.nowNs ?? (() => process.hrtime.bigint());
    this.maxActiveSessions = options.maxActiveSessions ?? 12;
    this.maxPlayersPerSession =
      options.maxPlayersPerSession ?? DEFAULT_MATCH_CONFIG.maxPlayers;
    const idleTimeoutMs = options.idleTimeoutMs ?? 5 * 60_000;
    const maxSessionLifetimeMs = options.maxSessionLifetimeMs ?? 30 * 60_000;
    if (
      !Number.isSafeInteger(idleTimeoutMs) ||
      idleTimeoutMs < 1 ||
      !Number.isSafeInteger(maxSessionLifetimeMs) ||
      maxSessionLifetimeMs < idleTimeoutMs
    ) {
      throw new Error("Session expiration limits are invalid.");
    }
    this.idleTimeoutNs = BigInt(idleTimeoutMs) * NANOSECONDS_PER_MILLISECOND;
    this.maxSessionLifetimeNs =
      BigInt(maxSessionLifetimeMs) * NANOSECONDS_PER_MILLISECOND;
    this.tickIntervalMs = options.tickIntervalMs ?? 16;
    this.simulationStepSeconds = options.simulationStepSeconds ?? 1 / 60;
    this.maxCatchUpSteps = options.maxCatchUpSteps ?? 5;

    if (!Number.isInteger(this.maxActiveSessions) || this.maxActiveSessions < 1) {
      throw new Error("maxActiveSessions must be a positive integer.");
    }
    if (
      !Number.isInteger(this.maxPlayersPerSession) ||
      this.maxPlayersPerSession < 1 ||
      this.maxPlayersPerSession > DEFAULT_MATCH_CONFIG.maxPlayers
    ) {
      throw new Error("maxPlayersPerSession is outside the supported range.");
    }
    if (
      !Number.isInteger(this.tickIntervalMs) ||
      this.tickIntervalMs < 1 ||
      !Number.isFinite(this.simulationStepSeconds) ||
      this.simulationStepSeconds <= 0 ||
      this.simulationStepSeconds > DEFAULT_MATCH_CONFIG.maxDeltaSeconds
    ) {
      throw new Error("The session scheduler configuration is invalid.");
    }
    if (!Number.isInteger(this.maxCatchUpSteps) || this.maxCatchUpSteps < 1) {
      throw new Error("maxCatchUpSteps must be a positive integer.");
    }
  }

  get activeSessionCount(): number {
    return this.sessions.size;
  }

  async createSession(mapId: MatchMapId = "nod"): Promise<CreatedMatchSession> {
    if (mapId !== "nod" && mapId !== CINDER_ROW_MAP_ID) {
      throw new MatchSessionError("not-found", "The requested map is unavailable.");
    }
    const nowNs = this.readClock();
    this.pruneExpired(nowNs);
    if (this.sessions.size + this.pendingCreates >= this.maxActiveSessions) {
      throw new MatchSessionError(
        "server-capacity",
        "The server has reached its active match limit.",
      );
    }

    this.pendingCreates += 1;
    try {
      const { match, loadedGeometryCount, gameplayRegistry } = await this.bootstrap(mapId);
      const extractionObjective = gameplayRegistry.objectives.find(
        (objective) => objective.kind === "extraction",
      );
      if (mapId === "nod" && !extractionObjective) {
        throw new Error("The server gameplay registry has no extraction objective.");
      }
      const createdAtNs = this.readClock();
      const matchId = randomUUID();
      const session: MatchSessionRecord = {
        matchId,
        mapId,
        mapVersion: mapId === CINDER_ROW_MAP_ID ? CINDER_ROW_MAP_VERSION : "nod-current",
        maxPlayers: mapId === CINDER_ROW_MAP_ID
          ? CINDER_ROW_MAX_PLAYERS
          : this.maxPlayersPerSession,
        match,
        gameplay: new AuthoritativeGameplayState(gameplayRegistry),
        extractionObjective: extractionObjective ?? null,
        arenaRound: mapId === CINDER_ROW_MAP_ID ? new CinderRowRelayRound() : null,
        mapNodeCount: loadedGeometryCount,
        createdAtNs,
        lastActivityAtNs: createdAtNs,
        tickAccumulator: new FixedStepAccumulator(
          this.simulationStepSeconds,
          this.maxCatchUpSteps,
        ),
        players: new Map(),
        playerByTokenDigest: new Map(),
        lastOverloadWarningAtNs: 0n,
      };
      this.sessions.set(matchId, session);
      return {
        matchId,
        mapId: session.mapId,
        mapVersion: session.mapVersion,
        gameModeId: mapId === CINDER_ROW_MAP_ID ? "relay-control" : "extraction",
        mapNodeCount: loadedGeometryCount,
        maxPlayers: session.maxPlayers,
        expiresAfterMs: Number(this.maxSessionLifetimeNs / NANOSECONDS_PER_MILLISECOND),
      };
    } finally {
      this.pendingCreates -= 1;
    }
  }

  joinSession(
    matchId: string,
    operatorId: ServerOperatorId = "jaya",
    ownerUserId: string | null = null,
  ): JoinedMatchSession {
    const nowNs = this.readClock();
    const session = this.getLiveSession(matchId, nowNs);
    if (!Object.hasOwn(SERVER_OPERATOR_PROFILES, operatorId)) {
      throw new MatchSessionError("invalid-operator", "Operator is not available.");
    }
    if (session.players.size >= session.maxPlayers) {
      throw new MatchSessionError(
        "player-capacity",
        "This match has no open player slots.",
      );
    }

    const playerId = randomUUID();
    const accessToken = randomBytes(32).toString("base64url");
    const accessTokenDigest = digestAccessToken(accessToken);
    const team = session.mapId === CINDER_ROW_MAP_ID
      ? this.selectArenaTeam(session)
      : null;
    if (team) {
      const spawnIndex = [...session.players.values()].filter((player) => player.team === team).length;
      const spawn = CINDER_ROW_SPAWNS[team][spawnIndex];
      if (!spawn) {
        throw new MatchSessionError("player-capacity", "This team has no open player slots.");
      }
      session.match.registerPlayer(playerId, spawn, operatorId);
    } else {
      this.registerAtServerSelectedSpawn(session, playerId, operatorId);
    }
    session.players.set(playerId, {
      accessTokenDigest,
      ownerUserId,
      extractionHold: new ExtractionHold(),
      team,
      connected: true,
      realtimeConnectionId: null,
    });
    session.playerByTokenDigest.set(accessTokenDigest, playerId);
    session.lastActivityAtNs = nowNs;

    return {
      matchId,
      playerId,
      operatorId,
      team,
      accessToken,
      snapshot: this.snapshotFor(session),
    };
  }

  submitInput(
    matchId: string,
    accessToken: string,
    packet: unknown,
  ): SubmitInputResult {
    const nowNs = this.readClock();
    const session = this.getLiveSession(matchId, nowNs);
    const playerId = this.resolvePlayer(session, accessToken);
    if (session.arenaRound?.snapshot().phase === "finished") {
      throw new MatchSessionError(
        "round-finished",
        "This arena round has ended.",
      );
    }
    const result = session.match.submitInput(
      playerId,
      packet,
      Number(nowNs) / Number(NANOSECONDS_PER_MILLISECOND),
    );
    if (result.accepted) session.lastActivityAtNs = nowNs;
    return result;
  }

  getSnapshot(
    matchId: string,
    accessToken: string,
  ): { matchId: string; snapshot: MatchSessionSnapshot } {
    const nowNs = this.readClock();
    const session = this.getLiveSession(matchId, nowNs);
    this.resolvePlayer(session, accessToken);
    session.lastActivityAtNs = nowNs;
    return { matchId, snapshot: this.snapshotFor(session) };
  }

  getRealtimeState(
    matchId: string,
    accessToken: string,
    ownerUserId: string,
    includeGameplay = true,
  ): {
    matchId: string;
    playerId: string;
    snapshot: MatchSessionSnapshot;
    gameplay?: AuthoritativeGameplaySnapshot;
  } {
    const nowNs = this.readClock();
    const session = this.getLiveSession(matchId, nowNs);
    if (session.mapId !== CINDER_ROW_MAP_ID) {
      throw new MatchSessionError(
        "not-found",
        "Real-time competitive matches are unavailable for this map.",
      );
    }
    const playerId = this.resolveOwnedPlayer(session, accessToken, ownerUserId);
    session.lastActivityAtNs = nowNs;
    return {
      matchId,
      playerId,
      snapshot: this.snapshotFor(session),
      ...(includeGameplay ? { gameplay: session.gameplay.getSnapshot(playerId) } : {}),
    };
  }

  getFinishedArenaResult(matchId: string): {
    matchId: string;
    winner: "accord" | "eon-dusk" | "draw";
    players: Array<{ userId: string; team: "accord" | "eon-dusk" }>;
  } | null {
    const session = this.sessions.get(matchId);
    if (!session?.arenaRound) return null;
    const round = session.arenaRound.snapshot();
    if (round.phase !== "finished") return null;
    const players = [...session.players.values()].flatMap((player) =>
      player.ownerUserId && player.team
        ? [{ userId: player.ownerUserId, team: player.team }]
        : [],
    );
    if (players.length < 2) return null;
    return { matchId, winner: round.winner ?? "draw", players };
  }

  setRealtimePresence(
    matchId: string,
    accessToken: string,
    ownerUserId: string,
    connectionId: number,
    connected: boolean,
  ): void {
    if (!Number.isSafeInteger(connectionId) || connectionId <= 0) {
      throw new Error("The connection identifier is invalid.");
    }
    const nowNs = this.readClock();
    const session = this.getLiveSession(matchId, nowNs);
    if (session.mapId !== CINDER_ROW_MAP_ID) {
      throw new MatchSessionError("not-found", "The real-time match is unavailable.");
    }
    const playerId = this.resolveOwnedPlayer(session, accessToken, ownerUserId);
    const player = session.players.get(playerId);
    if (!player) throw new MatchSessionError("unauthorized", "Player session is invalid.");
    if (connected) {
      player.connected = true;
      player.realtimeConnectionId = connectionId;
    } else if (player.realtimeConnectionId === connectionId) {
      player.connected = false;
      player.realtimeConnectionId = null;
    }
    session.lastActivityAtNs = nowNs;
  }

  isRealtimePlayerConnected(
    matchId: string,
    accessToken: string,
    ownerUserId: string,
  ): boolean {
    const session = this.getLiveSession(matchId, this.readClock());
    const playerId = this.resolveOwnedPlayer(session, accessToken, ownerUserId);
    return session.players.get(playerId)?.connected ?? false;
  }

  getGameplaySnapshot(
    matchId: string,
    accessToken: string,
  ): { matchId: string; gameplay: AuthoritativeGameplaySnapshot } {
    const nowNs = this.readClock();
    const session = this.getLiveSession(matchId, nowNs);
    const playerId = this.resolvePlayer(session, accessToken);
    session.lastActivityAtNs = nowNs;
    return {
      matchId,
      gameplay: session.gameplay.getSnapshot(playerId),
    };
  }

  claimLoot(
    matchId: string,
    accessToken: string,
    lootId: string,
  ): { matchId: string; item: GrantedGameplayItem; inventory: GrantedGameplayItem[] } {
    const nowNs = this.readClock();
    const session = this.getLiveSession(matchId, nowNs);
    const playerId = this.resolvePlayer(session, accessToken);
    const position = session.match.getPlayerPosition(playerId);
    if (!position) {
      throw new MatchSessionError(
        "player-position-unavailable",
        "The authenticated player is not present in this match.",
      );
    }
    const result = session.gameplay.claimLoot(playerId, lootId, position);
    session.lastActivityAtNs = nowNs;
    return { matchId, ...result };
  }

  openTerminal(
    matchId: string,
    accessToken: string,
    terminalId: string,
  ): { matchId: string; terminalId: string; lootIds: string[] } {
    const nowNs = this.readClock();
    const session = this.getLiveSession(matchId, nowNs);
    const playerId = this.resolvePlayer(session, accessToken);
    const position = session.match.getPlayerPosition(playerId);
    if (!position) {
      throw new MatchSessionError(
        "player-position-unavailable",
        "The authenticated player is not present in this match.",
      );
    }
    const result = session.gameplay.openTerminal(terminalId, position);
    session.lastActivityAtNs = nowNs;
    return { matchId, ...result };
  }

  getExtractionStatus(
    matchId: string,
    accessToken: string,
    ownerUserId: string,
  ): MatchExtractionStatus {
    const nowNs = this.readClock();
    const session = this.getLiveSession(matchId, nowNs);
    const playerId = this.resolveOwnedPlayer(session, accessToken, ownerUserId);
    this.refreshExtractionPlayer(session, playerId, nowNs);
    return this.toExtractionStatus(session, playerId, nowNs);
  }

  getExtractionReward(
    matchId: string,
    accessToken: string,
    ownerUserId: string,
  ): {
    matchId: string;
    playerId: string;
    requiredSeconds: number;
    inventory: GrantedGameplayItem[];
  } {
    const status = this.getExtractionStatus(matchId, accessToken, ownerUserId);
    if (!status.ready && !status.settled) {
      throw new MatchSessionError(
        "extraction-not-ready",
        "Remain inside the recovery zone until the extraction hold is complete.",
      );
    }
    const session = this.getLiveSession(matchId, this.readClock());
    const playerId = this.resolveOwnedPlayer(session, accessToken, ownerUserId);
    return {
      matchId,
      playerId,
      requiredSeconds: status.requiredSeconds,
      inventory: session.gameplay.getSnapshot(playerId).inventory,
    };
  }

  markExtractionSettled(
    matchId: string,
    accessToken: string,
    ownerUserId: string,
  ): void {
    const session = this.getLiveSession(matchId, this.readClock());
    const playerId = this.resolveOwnedPlayer(session, accessToken, ownerUserId);
    const player = session.players.get(playerId);
    if (!player) throw new MatchSessionError("unauthorized", "Player session is invalid.");
    player.extractionHold.markSettled();
  }

  leaveSession(matchId: string, accessToken: string): void {
    const nowNs = this.readClock();
    const session = this.getLiveSession(matchId, nowNs);
    const playerId = this.resolvePlayer(session, accessToken);
    const player = session.players.get(playerId);
    if (!player) {
      throw new MatchSessionError("unauthorized", "Player session is invalid.");
    }
    session.players.delete(playerId);
    session.playerByTokenDigest.delete(player.accessTokenDigest);
    session.match.unregisterPlayer(playerId);
    session.lastActivityAtNs = nowNs;
  }

  advanceAt(nowNs = this.readClock()): void {
    if (nowNs < 0n) throw new Error("Monotonic time must be non-negative.");
    this.pruneExpired(nowNs);
    const serverNowMs = Number(nowNs) / Number(NANOSECONDS_PER_MILLISECOND);
    for (const [matchId, session] of this.sessions) {
      try {
        const result = session.tickAccumulator.advanceFromMonotonicNs(
          nowNs,
          (stepSeconds) => {
            if (session.arenaRound?.snapshot().phase === "finished") return;
            session.match.tick(stepSeconds, serverNowMs);
            if (session.arenaRound) {
              const snapshot = session.match.getSnapshot(serverNowMs);
              const positionById = new Map(
                snapshot.players.map((player) => [player.playerId, player]),
              );
              session.arenaRound.step(
                stepSeconds,
                [...session.players.entries()].flatMap(([playerId, record]) => {
                  const player = positionById.get(playerId);
                  if (!player || !record.team) return [];
                  return [{
                    playerId,
                    team: record.team,
                    position: { x: player.position.x, z: player.position.z },
                    alive: player.health > 0 && record.connected,
                  }];
                }),
              );
            }
          },
        );
        if (session.extractionObjective) {
          for (const playerId of session.players.keys()) {
            this.refreshExtractionPlayer(session, playerId, nowNs);
          }
        }
        if (
          result.droppedSeconds > 0 &&
          (session.lastOverloadWarningAtNs === 0n ||
            nowNs - session.lastOverloadWarningAtNs >=
              10_000_000_000n)
        ) {
          logger.warn(
            { matchId, droppedSeconds: result.droppedSeconds },
            "Authoritative match tick dropped elapsed time.",
          );
          session.lastOverloadWarningAtNs = nowNs;
        }
      } catch (error) {
        logger.error(
          { err: error, matchId },
          "Retiring a match session after a simulation error.",
        );
        this.sessions.delete(matchId);
      }
    }
  }

  start(): void {
    if (this.timer) return;
    this.advanceAt(this.readClock());
    this.timer = setInterval(() => {
      this.advanceAt(this.readClock());
    }, this.tickIntervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private getLiveSession(matchId: string, nowNs: bigint): MatchSessionRecord {
    this.pruneExpired(nowNs);
    const session = this.sessions.get(matchId);
    if (!session) {
      throw new MatchSessionError("not-found", "Match session was not found.");
    }
    return session;
  }

  private resolvePlayer(
    session: MatchSessionRecord,
    accessToken: string,
  ): string {
    if (!ACCESS_TOKEN_PATTERN.test(accessToken)) {
      throw new MatchSessionError("unauthorized", "Player authorization failed.");
    }
    const playerId = session.playerByTokenDigest.get(
      digestAccessToken(accessToken),
    );
    if (!playerId) {
      throw new MatchSessionError("unauthorized", "Player authorization failed.");
    }
    return playerId;
  }

  private resolveOwnedPlayer(
    session: MatchSessionRecord,
    accessToken: string,
    ownerUserId: string,
  ): string {
    const playerId = this.resolvePlayer(session, accessToken);
    const player = session.players.get(playerId);
    if (!player || !player.ownerUserId || player.ownerUserId !== ownerUserId) {
      throw new MatchSessionError("unauthorized", "This match is not owned by the signed-in player.");
    }
    return playerId;
  }

  private refreshExtractionPlayer(
    session: MatchSessionRecord,
    playerId: string,
    nowNs: bigint,
  ): ExtractionHoldStatus {
    const player = session.players.get(playerId);
    if (!player) {
      return { inRange: false, progress: 0, ready: false, settled: false };
    }
    const objective = session.extractionObjective;
    if (!objective) {
      throw new MatchSessionError(
        "extraction-not-ready",
        "This competitive arena has no extraction objective.",
      );
    }
    const position = session.match.getPlayerPosition(playerId);
    const worldPlayer = session.match
      .getSnapshot(Number(nowNs) / Number(NANOSECONDS_PER_MILLISECOND))
      .players.find((entry) => entry.playerId === playerId);
    const distance = position
      ? Math.hypot(position.x - objective.x, position.z - objective.z)
      : Number.POSITIVE_INFINITY;
    const inRange =
      Boolean(worldPlayer && worldPlayer.health > 0) &&
      distance <= objective.interactionRadius;
    return player.extractionHold.update(
      inRange,
      nowNs,
      objective.holdSeconds ?? 6,
    );
  }

  private toExtractionStatus(
    session: MatchSessionRecord,
    playerId: string,
    nowNs: bigint,
  ): MatchExtractionStatus {
    const player = session.players.get(playerId);
    if (!player) throw new MatchSessionError("unauthorized", "Player session is invalid.");
    const objective = session.extractionObjective;
    if (!objective) {
      throw new MatchSessionError(
        "extraction-not-ready",
        "This competitive arena has no extraction objective.",
      );
    }
    const requiredSeconds = objective.holdSeconds ?? 6;
    const status = this.refreshExtractionPlayer(session, playerId, nowNs);
    return {
      matchId: session.matchId,
      inRange: status.inRange,
      progress: status.progress,
      requiredSeconds,
      ready: status.ready,
      settled: status.settled,
    };
  }

  private selectArenaTeam(session: MatchSessionRecord): ArenaTeam {
    let accordCount = 0;
    let duskCount = 0;
    for (const player of session.players.values()) {
      if (player.team === "accord") accordCount += 1;
      if (player.team === "eon-dusk") duskCount += 1;
    }
    if (accordCount >= 4) return "eon-dusk";
    if (duskCount >= 4) return "accord";
    return accordCount <= duskCount ? "accord" : "eon-dusk";
  }

  private snapshotFor(session: MatchSessionRecord): MatchSessionSnapshot {
    const snapshot = session.match.getSnapshot(
      Number(this.readClock()) / Number(NANOSECONDS_PER_MILLISECOND),
    );
    return {
      ...snapshot,
      mapId: session.mapId,
      mapVersion: session.mapVersion,
      players: snapshot.players.map((player) => {
        const team = session.players.get(player.playerId)?.team;
        return { ...player, ...(team ? { team } : {}) };
      }),
      ...(session.arenaRound
        ? { arenaRound: session.arenaRound.snapshot() }
        : {}),
    };
  }

  private registerAtServerSelectedSpawn(
    session: MatchSessionRecord,
    playerId: string,
    operatorId: ServerOperatorId,
  ): void {
    const nearbyPlayerIds: string[] = [];
    for (const spawn of makeSpawnCandidates()) {
      if (
        session.match.findNearbyPlayerIds(
          spawn.x,
          spawn.z,
          12,
          nearbyPlayerIds,
        ) > 0
      ) {
        continue;
      }
      try {
        session.match.registerPlayer(playerId, spawn, operatorId);
        return;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === STATIC_COLLISION_ERROR
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new MatchSessionError(
      "no-safe-spawn",
      "No unoccupied server-selected spawn was available.",
    );
  }

  private pruneExpired(nowNs: bigint): void {
    for (const [matchId, session] of this.sessions) {
      const isTooOld = nowNs - session.createdAtNs >= this.maxSessionLifetimeNs;
      const isIdle = nowNs - session.lastActivityAtNs >= this.idleTimeoutNs;
      if (isTooOld || isIdle) this.sessions.delete(matchId);
    }
  }

  private readClock(): bigint {
    const nowNs = this.nowNs();
    if (typeof nowNs !== "bigint" || nowNs < 0n) {
      throw new Error("Session clock must return a non-negative bigint.");
    }
    return nowNs;
  }
}

function digestAccessToken(accessToken: string): string {
  return createHash("sha256").update(accessToken, "utf8").digest("hex");
}

function makeSpawnCandidates(): Array<{ x: number; y: number; z: number }> {
  const candidates: Array<{ x: number; y: number; z: number }> = [];
  const angleOffset =
    (randomBytes(4).readUInt32BE(0) / 0x1_0000_0000) * Math.PI * 2;
  // Mission To Earth's current generated Nod region is about 300 units wide.
  // Keep server-selected players on that actual map instead of the generic
  // battle-royale safe-zone ring, which would strand them far from all loot.
  candidates.push({ x: 0, y: 0, z: 86 });
  const outerRadius = 62;

  for (let radius = 14; radius <= outerRadius; radius += 14) {
    const pointCount = Math.max(8, Math.ceil((Math.PI * 2 * radius) / 14));
    for (let point = 0; point < pointCount; point += 1) {
      const angle = angleOffset + (point / pointCount) * Math.PI * 2;
      candidates.push({
        x: Number((Math.cos(angle) * radius).toFixed(2)),
        y: 0,
        z: Number((86 + Math.sin(angle) * radius).toFixed(2)),
      });
    }
  }
  return candidates;
}
