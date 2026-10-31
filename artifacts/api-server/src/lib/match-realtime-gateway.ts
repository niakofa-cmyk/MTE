import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import { getSession, SESSION_COOKIE } from "./auth.ts";
import { logger } from "./logger.ts";
import {
  MatchSessionError,
  type MatchSessionManager,
  type MatchSessionSnapshot,
} from "./match-session-manager.ts";

const MATCH_PATH =
  /^\/api\/matches\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/realtime$/i;
const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MAX_FRAME_BYTES = 4_096;
const MAX_BUFFERED_BYTES = 128 * 1_024;

type GatewayMessage =
  | {
      type: "ready";
      protocolVersion: 1;
      matchId: string;
      playerId: string;
      snapshot: MatchSessionSnapshot;
    }
  | {
      type: "snapshot";
      matchId: string;
      serverTimeMs: number;
      snapshot: MatchSessionSnapshot;
    }
  | { type: "input-accepted"; sequenceNumber: number }
  | { type: "input-rejected"; sequenceNumber: number; reason: string }
  | { type: "pong"; nonce: string | number | null }
  | { type: "error"; code: string };

export interface MatchRealtimeGatewayOptions {
  updateIntervalMs?: number;
  heartbeatIntervalMs?: number;
  authTimeoutMs?: number;
  authenticateUser?: (request: IncomingMessage) => Promise<string | null>;
  nowMs?: () => number;
}

interface Peer {
  socket: WebSocket;
  matchId: string;
  userId: string;
  accessToken: string | null;
  playerId: string | null;
  connectionId: number | null;
  isAlive: boolean;
  invalidFrames: number;
  authTimer: ReturnType<typeof setTimeout>;
}

export class MatchRealtimeGateway {
  private readonly websocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_FRAME_BYTES,
    perMessageDeflate: false,
  });
  private readonly peers = new Set<Peer>();
  private readonly byMatch = new Map<string, Set<Peer>>();
  private readonly attempts = new Map<
    string,
    { startedAtMs: number; count: number }
  >();
  private readonly updateIntervalMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly authTimeoutMs: number;
  private readonly authenticateUser: (request: IncomingMessage) => Promise<string | null>;
  private readonly nowMs: () => number;
  private readonly manager: MatchSessionManager;
  private updateTimer: ReturnType<typeof setInterval> | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private attachedServer: Server | null = null;
  private connectionSequence = 0;

  constructor(
    manager: MatchSessionManager,
    options: MatchRealtimeGatewayOptions = {},
  ) {
    this.manager = manager;
    this.updateIntervalMs = options.updateIntervalMs ?? 50;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 10_000;
    this.authTimeoutMs = options.authTimeoutMs ?? 5_000;
    this.authenticateUser = options.authenticateUser ?? authenticateSessionCookie;
    this.nowMs = options.nowMs ?? Date.now;
    if (
      !Number.isInteger(this.updateIntervalMs) ||
      this.updateIntervalMs < 16 ||
      !Number.isInteger(this.heartbeatIntervalMs) ||
      this.heartbeatIntervalMs < 1_000 ||
      !Number.isInteger(this.authTimeoutMs) ||
      this.authTimeoutMs < 500
    ) {
      throw new Error("The real-time gateway timing configuration is invalid.");
    }
  }

  attach(server: Server): void {
    if (this.attachedServer) throw new Error("The real-time gateway is already attached.");
    this.attachedServer = server;
    server.on("upgrade", this.onUpgrade);
    this.updateTimer = setInterval(() => this.broadcastSnapshots(), this.updateIntervalMs);
    this.heartbeatTimer = setInterval(() => this.heartbeat(), this.heartbeatIntervalMs);
    this.updateTimer.unref?.();
    this.heartbeatTimer.unref?.();
  }

  close(): void {
    if (this.attachedServer) {
      this.attachedServer.off("upgrade", this.onUpgrade);
      this.attachedServer = null;
    }
    if (this.updateTimer) clearInterval(this.updateTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.updateTimer = undefined;
    this.heartbeatTimer = undefined;
    for (const peer of this.peers) {
      clearTimeout(peer.authTimer);
      peer.socket.close(1001, "server-shutdown");
    }
    this.peers.clear();
    this.byMatch.clear();
    this.websocketServer.close();
  }

  private readonly onUpgrade = (
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ): void => {
    const parsedUrl = new URL(request.url ?? "/", "http://localhost");
    const pathMatch = MATCH_PATH.exec(parsedUrl.pathname);
    if (!pathMatch) {
      rejectUpgrade(socket, 404, "Not Found");
      return;
    }
    const matchId = pathMatch[1];
    if (!matchId || !hasSameOrigin(request)) {
      rejectUpgrade(socket, 403, "Forbidden");
      return;
    }
    if (this.isRateLimited(`ip:${request.socket.remoteAddress ?? "unknown"}`, 300)) {
      rejectUpgrade(socket, 429, "Too Many Requests");
      return;
    }
    void this.authenticateUser(request)
      .then((userId) => {
        if (!userId) {
          rejectUpgrade(socket, 401, "Unauthorized");
          return;
        }
        if (this.isRateLimited(`account:${userId}`)) {
          rejectUpgrade(socket, 429, "Too Many Requests");
          return;
        }
        this.websocketServer.handleUpgrade(request, socket, head, (websocket) => {
          this.bindPeer(websocket, matchId, userId);
        });
      })
      .catch((error: unknown) => {
        logger.warn({ err: error }, "Rejected a real-time match authentication attempt.");
        rejectUpgrade(socket, 401, "Unauthorized");
      });
  };

  private bindPeer(socket: WebSocket, matchId: string, userId: string): void {
    const peer: Peer = {
      socket,
      matchId,
      userId,
      accessToken: null,
      playerId: null,
      connectionId: null,
      isAlive: true,
      invalidFrames: 0,
      authTimer: setTimeout(() => {
        send(peer, { type: "error", code: "authentication-timeout" });
        socket.close(4001, "authentication-timeout");
      }, this.authTimeoutMs),
    };
    peer.authTimer.unref?.();
    this.peers.add(peer);
    socket.on("pong", () => {
      peer.isAlive = true;
    });
    socket.on("message", (data, isBinary) => {
      void this.handleMessage(peer, data, isBinary).catch((error: unknown) => {
        const code =
          error instanceof MatchSessionError ? error.code : "match-session-failed";
        logger.warn({ err: error, matchId }, "Closing a failed real-time match connection.");
        send(peer, { type: "error", code });
        socket.close(
          code === "unauthorized" ? 4003 : code === "not-found" ? 4004 : 1011,
          code,
        );
      });
    });
    socket.on("close", () => this.removePeer(peer));
    socket.on("error", (error) => {
      logger.debug({ err: error, matchId }, "Real-time match socket error.");
      this.removePeer(peer);
    });
  }

  private async handleMessage(
    peer: Peer,
    data: Buffer | ArrayBuffer | Buffer[],
    isBinary: boolean,
  ): Promise<void> {
    if (isBinary) {
      this.rejectFrame(peer, "binary-frame-not-supported");
      return;
    }
    const frame = Buffer.isBuffer(data)
      ? data
      : Array.isArray(data)
        ? Buffer.concat(data)
        : Buffer.from(data);
    if (frame.byteLength > MAX_FRAME_BYTES) {
      peer.socket.close(1009, "frame-too-large");
      return;
    }
    let value: unknown;
    try {
      value = JSON.parse(frame.toString("utf8"));
    } catch {
      this.rejectFrame(peer, "invalid-json");
      return;
    }
    if (!isRecord(value) || typeof value.type !== "string") {
      this.rejectFrame(peer, "invalid-message");
      return;
    }
    if (!peer.accessToken) {
      await this.authenticatePeer(peer, value);
      return;
    }
    if (value.type === "ping") {
      const nonce = typeof value.nonce === "string" || typeof value.nonce === "number"
        ? value.nonce
        : null;
      send(peer, { type: "pong", nonce });
      return;
    }
    if (value.type !== "input" || !isInputMessage(value)) {
      this.rejectFrame(peer, "invalid-message");
      return;
    }
    const result = this.manager.submitInput(peer.matchId, peer.accessToken, {
      sequenceNumber: value.sequenceNumber,
      inputFlags: value.inputFlags,
      yaw: value.yaw,
      pitch: value.pitch,
      movementVector: value.movementVector,
    });
    if (result.accepted) {
      send(peer, { type: "input-accepted", sequenceNumber: value.sequenceNumber });
    } else {
      send(peer, {
        type: "input-rejected",
        sequenceNumber: value.sequenceNumber,
        reason: result.reason,
      });
    }
  }

  private async authenticatePeer(peer: Peer, value: Record<string, unknown>): Promise<void> {
    if (
      value.type !== "authenticate" ||
      Object.keys(value).length !== 2 ||
      typeof value.accessToken !== "string" ||
      !ACCESS_TOKEN_PATTERN.test(value.accessToken)
    ) {
      this.rejectFrame(peer, "invalid-authentication");
      return;
    }
    const realtime = this.manager.getRealtimeState(
      peer.matchId,
      value.accessToken,
      peer.userId,
    );
    const connectionId = this.allocateConnectionId();
    this.manager.setRealtimePresence(
      peer.matchId,
      value.accessToken,
      peer.userId,
      connectionId,
      true,
    );
    clearTimeout(peer.authTimer);
    peer.accessToken = value.accessToken;
    peer.playerId = realtime.playerId;
    peer.connectionId = connectionId;
    let room = this.byMatch.get(peer.matchId);
    if (!room) {
      room = new Set();
      this.byMatch.set(peer.matchId, room);
    }
    for (const existing of room) {
      if (existing.playerId === peer.playerId) {
        existing.socket.close(4002, "replaced-by-reconnected-session");
      }
    }
    room.add(peer);
    send(peer, {
      type: "ready",
      protocolVersion: 1,
      matchId: peer.matchId,
      playerId: realtime.playerId,
      snapshot: realtime.snapshot,
    });
  }

  private broadcastSnapshots(): void {
    for (const [matchId, room] of this.byMatch) {
      for (const peer of room) {
        if (
          peer.socket.readyState !== WebSocket.OPEN ||
          !peer.accessToken ||
          peer.socket.bufferedAmount > MAX_BUFFERED_BYTES
        ) {
          if (peer.socket.bufferedAmount > MAX_BUFFERED_BYTES) {
            peer.socket.close(1013, "client-too-slow");
          }
          continue;
        }
        try {
          const result = this.manager.getRealtimeState(
            matchId,
            peer.accessToken,
            peer.userId,
            false,
          );
          send(peer, {
            type: "snapshot",
            matchId,
            serverTimeMs: this.nowMs(),
            snapshot: result.snapshot,
          });
        } catch (error) {
          const code = error instanceof MatchSessionError ? error.code : "match-session-failed";
          send(peer, { type: "error", code });
          peer.socket.close(code === "unauthorized" ? 4003 : 4004, code);
        }
      }
    }
  }

  private heartbeat(): void {
    for (const peer of this.peers) {
      if (peer.socket.readyState !== WebSocket.OPEN) continue;
      if (!peer.isAlive) {
        peer.socket.terminate();
        continue;
      }
      peer.isAlive = false;
      peer.socket.ping();
    }
  }

  private rejectFrame(peer: Peer, code: string): void {
    peer.invalidFrames += 1;
    send(peer, { type: "error", code });
    if (peer.invalidFrames >= 3) peer.socket.close(1008, "invalid-frames");
  }

  private removePeer(peer: Peer): void {
    clearTimeout(peer.authTimer);
    if (peer.accessToken && peer.connectionId !== null) {
      try {
        this.manager.setRealtimePresence(
          peer.matchId,
          peer.accessToken,
          peer.userId,
          peer.connectionId,
          false,
        );
      } catch {
        // Expired or already-removed sessions need no further presence update.
      }
    }
    this.peers.delete(peer);
    const room = this.byMatch.get(peer.matchId);
    room?.delete(peer);
    if (room?.size === 0) this.byMatch.delete(peer.matchId);
  }

  private isRateLimited(key: string, limit = 30): boolean {
    const now = this.nowMs();
    let entry = this.attempts.get(key);
    if (!entry || now - entry.startedAtMs >= 60_000) {
      if (!entry && this.attempts.size >= 2_048) {
        for (const [candidate, window] of this.attempts) {
          if (now - window.startedAtMs >= 60_000) this.attempts.delete(candidate);
        }
        if (this.attempts.size >= 2_048) return true;
      }
      entry = { startedAtMs: now, count: 0 };
      this.attempts.set(key, entry);
    }
    if (entry.count >= limit) return true;
    entry.count += 1;
    return false;
  }

  private allocateConnectionId(): number {
    this.connectionSequence =
      this.connectionSequence >= Number.MAX_SAFE_INTEGER ? 1 : this.connectionSequence + 1;
    return this.connectionSequence;
  }
}

function send(peer: Peer, message: GatewayMessage): void {
  if (peer.socket.readyState === WebSocket.OPEN) {
    peer.socket.send(JSON.stringify(message));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInputMessage(
  value: Record<string, unknown>,
): value is Record<string, unknown> & {
  sequenceNumber: number;
  inputFlags: number;
  yaw: number;
  pitch: number;
  movementVector: { forward: number; strafe: number };
} {
  const movement = value.movementVector;
  return (
    Object.keys(value).length === 6 &&
    Number.isSafeInteger(value.sequenceNumber) &&
    Number.isInteger(value.inputFlags) &&
    isFiniteNumber(value.yaw) &&
    isFiniteNumber(value.pitch) &&
    isRecord(movement) &&
    Object.keys(movement).length === 2 &&
    isFiniteNumber(movement.forward) &&
    isFiniteNumber(movement.strafe)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function authenticateSessionCookie(request: IncomingMessage): Promise<string | null> {
  const sid = readCookie(request.headers.cookie, SESSION_COOKIE);
  if (!sid || !/^[0-9a-f]{64}$/i.test(sid)) return null;
  const session = await getSession(sid);
  return typeof session?.user?.id === "string" && session.user.id.length > 0
    ? session.user.id
    : null;
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim() || null;
  }
  return null;
}

function hasSameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  const forwardedHost = request.headers["x-forwarded-host"];
  const expectedHost = (
    Array.isArray(forwardedHost)
      ? forwardedHost[0]
      : forwardedHost?.split(",")[0]
  )?.trim() ?? request.headers.host;
  if (!origin || !expectedHost) return false;
  try {
    return new URL(origin).host.toLowerCase() === expectedHost.toLowerCase();
  } catch {
    return false;
  }
}

function rejectUpgrade(socket: Duplex, status: number, reason: string): void {
  if (socket.destroyed) return;
  socket.write(
    `HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
  socket.destroy();
}
