import { createHash, randomBytes, randomUUID } from "node:crypto";
import { FixedStepAccumulator } from "./fixed-step-accumulator.ts";
import {
  DEFAULT_MATCH_CONFIG,
  type AuthoritativeMatch,
  type AuthoritativeWorldSnapshot,
  type SubmitInputResult,
} from "./authoritative-match.ts";
import { logger } from "./logger.ts";
import { createNodAuthoritativeMatch } from "./match-bootstrap.ts";

const NANOSECONDS_PER_MILLISECOND = 1_000_000n;
const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const STATIC_COLLISION_ERROR = "Spawn position intersects static world geometry.";

export type MatchSessionErrorCode =
  | "server-capacity"
  | "player-capacity"
  | "not-found"
  | "unauthorized"
  | "no-safe-spawn";

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
  (): Promise<{
    match: AuthoritativeMatch;
    loadedGeometryCount: number;
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
  mapNodeCount: number;
  maxPlayers: number;
  expiresAfterMs: number;
}

export interface JoinedMatchSession {
  matchId: string;
  playerId: string;
  accessToken: string;
  snapshot: AuthoritativeWorldSnapshot;
}

interface SessionPlayer {
  accessTokenDigest: string;
}

interface MatchSessionRecord {
  matchId: string;
  match: AuthoritativeMatch;
  mapNodeCount: number;
  createdAtNs: bigint;
  lastActivityAtNs: bigint;
  tickAccumulator: FixedStepAccumulator;
  players: Map<string, SessionPlayer>;
  playerByTokenDigest: Map<string, string>;
  lastOverloadWarningAtNs: bigint;
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
    bootstrap: MatchBootstrap = () => createNodAuthoritativeMatch(),
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

  async createSession(): Promise<CreatedMatchSession> {
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
      const { match, loadedGeometryCount } = await this.bootstrap();
      const createdAtNs = this.readClock();
      const matchId = randomUUID();
      const session: MatchSessionRecord = {
        matchId,
        match,
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
        mapNodeCount: loadedGeometryCount,
        maxPlayers: this.maxPlayersPerSession,
        expiresAfterMs: Number(this.maxSessionLifetimeNs / NANOSECONDS_PER_MILLISECOND),
      };
    } finally {
      this.pendingCreates -= 1;
    }
  }

  joinSession(matchId: string): JoinedMatchSession {
    const nowNs = this.readClock();
    const session = this.getLiveSession(matchId, nowNs);
    if (session.players.size >= this.maxPlayersPerSession) {
      throw new MatchSessionError(
        "player-capacity",
        "This match has no open player slots.",
      );
    }

    const playerId = randomUUID();
    const accessToken = randomBytes(32).toString("base64url");
    const accessTokenDigest = digestAccessToken(accessToken);
    this.registerAtServerSelectedSpawn(session, playerId);
    session.players.set(playerId, { accessTokenDigest });
    session.playerByTokenDigest.set(accessTokenDigest, playerId);
    session.lastActivityAtNs = nowNs;

    return {
      matchId,
      playerId,
      accessToken,
      snapshot: session.match.getSnapshot(),
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
  ): { matchId: string; snapshot: AuthoritativeWorldSnapshot } {
    const nowNs = this.readClock();
    const session = this.getLiveSession(matchId, nowNs);
    this.resolvePlayer(session, accessToken);
    session.lastActivityAtNs = nowNs;
    return { matchId, snapshot: session.match.getSnapshot() };
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
            session.match.tick(stepSeconds, serverNowMs);
          },
        );
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

  private registerAtServerSelectedSpawn(
    session: MatchSessionRecord,
    playerId: string,
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
        session.match.registerPlayer(playerId, spawn);
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
  const center = DEFAULT_MATCH_CONFIG.safeZoneCenter;
  const angleOffset =
    (randomBytes(4).readUInt32BE(0) / 0x1_0000_0000) * Math.PI * 2;
  const outerRadius = Math.max(
    0,
    DEFAULT_MATCH_CONFIG.initialZoneRadius - 80,
  );

  for (let radius = outerRadius; radius >= 0; radius -= 180) {
    const pointCount = Math.max(12, Math.ceil((Math.PI * 2 * radius) / 180));
    for (let point = 0; point < pointCount; point += 1) {
      const angle = angleOffset + (point / pointCount) * Math.PI * 2;
      candidates.push({
        x: Number((center.x + Math.cos(angle) * radius).toFixed(2)),
        y: 0,
        z: Number((center.z + Math.sin(angle) * radius).toFixed(2)),
      });
    }
  }
  return candidates;
}
