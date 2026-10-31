import { createHash } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  MatchSessionError,
  type MatchMapId,
  type MatchSessionManager,
} from "../lib/match-session-manager.ts";
import { GameplayStateError } from "../lib/authoritative-gameplay-state.ts";
import { CINDER_ROW_MAP_ID } from "../lib/cinder-row-arena.ts";
import {
  SERVER_OPERATOR_IDS,
  type ServerOperatorId,
} from "../lib/authoritative-combat-systems.ts";

const MATCH_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const LOOT_ID_PATTERN = /^map-loot-\d{4}$/;
const TERMINAL_ID_PATTERN = /^terminal-\d{2}$/;

class FixedWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly maxTrackedKeys: number;
  private readonly windows = new Map<
    string,
    { startedAtMs: number; requestCount: number }
  >();

  constructor(
    maxRequests: number,
    windowMs: number,
    maxTrackedKeys = 2_048,
  ) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.maxTrackedKeys = maxTrackedKeys;
  }

  consume(key: string, nowMs = Date.now()): number | null {
    let window = this.windows.get(key);
    if (!window || nowMs - window.startedAtMs >= this.windowMs) {
      if (!window && this.windows.size >= this.maxTrackedKeys) {
        this.removeExpiredWindows(nowMs);
        if (this.windows.size >= this.maxTrackedKeys) {
          return Math.ceil(this.windowMs / 1_000);
        }
      }
      window = { startedAtMs: nowMs, requestCount: 0 };
      this.windows.set(key, window);
    }
    if (window.requestCount >= this.maxRequests) {
      return Math.max(
        1,
        Math.ceil((window.startedAtMs + this.windowMs - nowMs) / 1_000),
      );
    }
    window.requestCount += 1;
    return null;
  }

  private removeExpiredWindows(nowMs: number): void {
    for (const [key, window] of this.windows) {
      if (nowMs - window.startedAtMs >= this.windowMs) this.windows.delete(key);
    }
  }
}

export function createMatchSessionsRouter(
  manager: MatchSessionManager,
): IRouter {
  const router: IRouter = Router();
  const createLimiter = new FixedWindowRateLimiter(3, 60_000);
  const joinLimiter = new FixedWindowRateLimiter(12, 60_000);
  const snapshotLimiter = new FixedWindowRateLimiter(600, 60_000);
  const gameplayLimiter = new FixedWindowRateLimiter(120, 60_000);
  const lootClaimLimiter = new FixedWindowRateLimiter(30, 60_000);
  const terminalLimiter = new FixedWindowRateLimiter(20, 60_000);

  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.post("/matches", async (req, res) => {
    const mapId = parseMatchMapId(req.body);
    if (mapId === null) {
      res.status(400).json({ error: "invalid-match-map" });
      return;
    }
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "sign-in-required-for-competitive-match" });
      return;
    }
    if (rejectIfLimited(createLimiter, req, res)) return;

    try {
      const created = await manager.createSession(mapId);
      res.status(201).json(created);
    } catch (error) {
      sendSessionError(res, error);
    }
  });

  router.post("/matches/:matchId/players", (req, res) => {
    if (!isMatchId(req.params.matchId)) {
      res.status(404).json({ error: "match-not-found" });
      return;
    }
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "sign-in-required-for-competitive-match" });
      return;
    }
    const operatorId = parseOperatorSelection(req.body);
    if (!operatorId) {
      res.status(400).json({ error: "invalid-operator-selection" });
      return;
    }
    if (rejectIfLimited(joinLimiter, req, res)) return;

    try {
      const joined = manager.joinSession(
        req.params.matchId,
        operatorId,
        typeof req.isAuthenticated === "function" && req.isAuthenticated()
          ? req.user.id
          : null,
      );
      res.status(201).json(joined);
    } catch (error) {
      sendSessionError(res, error);
    }
  });

  router.post("/matches/:matchId/input", (req, res) => {
    if (!isMatchId(req.params.matchId)) {
      res.status(404).json({ error: "match-not-found" });
      return;
    }
    const accessToken = readAccessToken(req, res);
    if (!accessToken) return;

    try {
      const result = manager.submitInput(
        req.params.matchId,
        accessToken,
        req.body,
      );
      if (result.accepted) {
        res.status(202).json({ accepted: true });
        return;
      }
      const statusCode =
        result.reason === "invalid-packet"
          ? 400
          : result.reason === "input-rate-limit" ||
              result.reason === "input-queue-full"
            ? 429
            : result.reason === "out-of-order-sequence"
              ? 409
              : 500;
      res.status(statusCode).json({
        accepted: false,
        reason: result.reason,
      });
    } catch (error) {
      sendSessionError(res, error);
    }
  });

  router.get("/matches/:matchId/snapshot", (req, res) => {
    if (!isMatchId(req.params.matchId)) {
      res.status(404).json({ error: "match-not-found" });
      return;
    }
    const accessToken = readAccessToken(req, res);
    if (!accessToken) return;
    const retryAfter = snapshotLimiter.consume(
      digestToken(accessToken),
    );
    if (retryAfter !== null) {
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "snapshot-rate-limit" });
      return;
    }

    try {
      res.json(manager.getSnapshot(req.params.matchId, accessToken));
    } catch (error) {
      sendSessionError(res, error);
    }
  });

  router.get("/matches/:matchId/world-state", (req, res) => {
    if (!isMatchId(req.params.matchId)) {
      res.status(404).json({ error: "match-not-found" });
      return;
    }
    const accessToken = readAccessToken(req, res);
    if (!accessToken) return;
    const retryAfter = gameplayLimiter.consume(digestToken(accessToken));
    if (retryAfter !== null) {
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "gameplay-state-rate-limit" });
      return;
    }

    try {
      res.json(manager.getGameplaySnapshot(req.params.matchId, accessToken));
    } catch (error) {
      sendSessionError(res, error);
    }
  });

  router.post("/matches/:matchId/loot/:lootId/claim", (req, res) => {
    if (!isMatchId(req.params.matchId)) {
      res.status(404).json({ error: "match-not-found" });
      return;
    }
    if (!LOOT_ID_PATTERN.test(req.params.lootId ?? "")) {
      res.status(404).json({ error: "loot-not-found" });
      return;
    }
    if (hasUnexpectedBody(req)) {
      res.status(400).json({ error: "server-selects-loot-and-player-position" });
      return;
    }
    const accessToken = readAccessToken(req, res);
    if (!accessToken) return;
    const retryAfter = lootClaimLimiter.consume(digestToken(accessToken));
    if (retryAfter !== null) {
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "loot-claim-rate-limit" });
      return;
    }

    try {
      res.json(manager.claimLoot(req.params.matchId, accessToken, req.params.lootId));
    } catch (error) {
      if (error instanceof GameplayStateError) {
        const statusCode =
          error.code === "loot-not-found"
            ? 404
            : error.code === "loot-out-of-range"
              ? 422
              : 409;
        res.status(statusCode).json({ error: error.code });
        return;
      }
      sendSessionError(res, error);
    }
  });

  router.post("/matches/:matchId/terminals/:terminalId/open", (req, res) => {
    if (!isMatchId(req.params.matchId)) {
      res.status(404).json({ error: "match-not-found" });
      return;
    }
    if (!TERMINAL_ID_PATTERN.test(req.params.terminalId ?? "")) {
      res.status(404).json({ error: "terminal-not-found" });
      return;
    }
    if (hasUnexpectedBody(req)) {
      res.status(400).json({ error: "server-selects-terminal-drops-and-player-position" });
      return;
    }
    const accessToken = readAccessToken(req, res);
    if (!accessToken) return;
    const retryAfter = terminalLimiter.consume(digestToken(accessToken));
    if (retryAfter !== null) {
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "terminal-interaction-rate-limit" });
      return;
    }

    try {
      res.json(
        manager.openTerminal(
          req.params.matchId,
          accessToken,
          req.params.terminalId,
        ),
      );
    } catch (error) {
      if (error instanceof GameplayStateError) {
        const statusCode =
          error.code === "terminal-not-found"
            ? 404
            : error.code === "terminal-out-of-range"
              ? 422
              : 409;
        res.status(statusCode).json({ error: error.code });
        return;
      }
      sendSessionError(res, error);
    }
  });

  router.delete("/matches/:matchId/player", (req, res) => {
    if (!isMatchId(req.params.matchId)) {
      res.status(404).json({ error: "match-not-found" });
      return;
    }
    const accessToken = readAccessToken(req, res);
    if (!accessToken) return;

    try {
      manager.leaveSession(req.params.matchId, accessToken);
      res.status(204).end();
    } catch (error) {
      sendSessionError(res, error);
    }
  });

  return router;
}

function isMatchId(value: string | undefined): value is string {
  return typeof value === "string" && MATCH_ID_PATTERN.test(value);
}

function parseOperatorSelection(value: unknown): ServerOperatorId | null {
  if (value === undefined || value === null) return "jaya";
  if (
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) return "jaya";
  if (
    keys.length !== 1 ||
    keys[0] !== "operatorId" ||
    typeof record.operatorId !== "string" ||
    !SERVER_OPERATOR_IDS.includes(record.operatorId as ServerOperatorId)
  ) {
    return null;
  }
  return record.operatorId as ServerOperatorId;
}

function hasUnexpectedBody(req: Request): boolean {
  const body: unknown = req.body;
  if (body === undefined || body === null) return false;
  if (typeof body !== "object" || Array.isArray(body)) return true;
  return Object.keys(body).length > 0;
}

function parseMatchMapId(body: unknown): MatchMapId | null {
  if (body === undefined || body === null) return "nod";
  if (typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "mapId")) return null;
  if (record.mapId === undefined || record.mapId === "nod") return "nod";
  return record.mapId === CINDER_ROW_MAP_ID ? CINDER_ROW_MAP_ID : null;
}

function rejectIfLimited(
  limiter: FixedWindowRateLimiter,
  req: Request,
  res: Response,
): boolean {
  const clientKey = req.ip || req.socket.remoteAddress || "unknown";
  const retryAfter = limiter.consume(clientKey);
  if (retryAfter === null) return false;
  res.setHeader("Retry-After", String(retryAfter));
  res.status(429).json({ error: "request-rate-limit" });
  return true;
}

function readAccessToken(req: Request, res: Response): string | null {
  const authorization = req.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
  if (!match || !ACCESS_TOKEN_PATTERN.test(match[1] ?? "")) {
    res.status(401).json({ error: "player-authorization-required" });
    return null;
  }
  return match[1]!;
}

function digestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function sendSessionError(res: Response, error: unknown): void {
  if (!(error instanceof MatchSessionError)) {
    res.status(500).json({ error: "match-session-failed" });
    return;
  }

  const statusCode =
    error.code === "not-found"
      ? 404
      : error.code === "invalid-operator"
        ? 400
      : error.code === "unauthorized"
        ? 401
        : error.code === "server-capacity"
          ? 503
          : error.code === "player-capacity" ||
              error.code === "no-safe-spawn" ||
              error.code === "player-position-unavailable" ||
              error.code === "round-finished"
            ? 409
            : 500;
  res.status(statusCode).json({ error: error.code });
}
