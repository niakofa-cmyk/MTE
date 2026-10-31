import { eq, inArray, sql } from "drizzle-orm";
import {
  competitiveMatchResultsTable,
  competitiveRatingsTable,
  db,
  type CompetitiveParticipantRating,
} from "@workspace/db";
import {
  CINDER_ROW_MAP_ID,
  CINDER_ROW_RELAY_4V4_PROFILE,
} from "./cinder-row-arena.ts";
import { logger } from "./logger.ts";
import { SERVER_OPERATOR_PROFILES } from "./authoritative-combat-systems.ts";
import {
  PostgresCompetitiveQueueStore,
  type CompetitiveQueueStore,
  type RankedQueueStatus,
} from "./competitive-queue-store.ts";
import type { MatchSessionManager } from "./match-session-manager.ts";
import type { ServerOperatorId } from "./authoritative-combat-systems.ts";

export type CompetitiveStatus =
  | { state: "idle" }
  | { state: "queued"; position: number; rating: number; queuedPlayers: number }
  | {
      state: "matched";
      rating: number;
      match: {
        matchId: string;
        mapId: typeof CINDER_ROW_MAP_ID;
        playerId: string;
        accessToken: string;
        team: "accord" | "eon-dusk";
        operatorId: string;
      };
    };

export type CompetitiveMatchWinner = "accord" | "eon-dusk" | "draw";

interface QueueEntry {
  userId: string;
  operatorId: ServerOperatorId;
  rating: number;
  queuedAt: number;
}

interface MatchTicket {
  rating: number;
  matchId: string;
  playerId: string;
  accessToken: string;
  team: "accord" | "eon-dusk";
  operatorId: ServerOperatorId;
}

export interface CompetitiveMatchServiceOptions {
  matchSize?: number;
  nowMs?: () => number;
  queueStore?: CompetitiveQueueStore;
  readRating?: (userId: string) => Promise<number>;
  readFinishedResult?: (
    matchId: string,
  ) => ReturnType<MatchSessionManager["getFinishedArenaResult"]>;
  persistResult?: (
    result: NonNullable<ReturnType<MatchSessionManager["getFinishedArenaResult"]>>,
  ) => Promise<void>;
}

export class CompetitiveMatchService {
  private readonly tickets = new Map<string, MatchTicket>();
  private readonly rankedMatchIds = new Set<string>();
  private readonly matchSize: number;
  private readonly nowMs: () => number;
  private readonly readRating: (userId: string) => Promise<number>;
  private readonly readFinishedResult: NonNullable<
    CompetitiveMatchServiceOptions["readFinishedResult"]
  >;
  private readonly persistResult: NonNullable<
    CompetitiveMatchServiceOptions["persistResult"]
  >;
  private readonly manager: MatchSessionManager;
  private readonly queueStore: CompetitiveQueueStore;
  private operation = Promise.resolve();
  private resultTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    manager: MatchSessionManager,
    options: CompetitiveMatchServiceOptions = {},
  ) {
    this.manager = manager;
    this.matchSize = options.matchSize ?? CINDER_ROW_RELAY_4V4_PROFILE.maxPlayers;
    this.nowMs = options.nowMs ?? Date.now;
    this.queueStore = options.queueStore ?? new PostgresCompetitiveQueueStore();
    this.readRating = options.readRating ?? getCompetitiveRating;
    this.readFinishedResult = options.readFinishedResult ??
      ((matchId) => manager.getFinishedArenaResult(matchId));
    this.persistResult = options.persistResult ?? persistCompetitiveResult;
    if (
      !Number.isInteger(this.matchSize) ||
      this.matchSize < 2 ||
      this.matchSize > CINDER_ROW_RELAY_4V4_PROFILE.maxPlayers ||
      this.matchSize % 2 !== 0
    ) {
      throw new Error(
        `Ranked match size must be an even number between two and ${CINDER_ROW_RELAY_4V4_PROFILE.maxPlayers}.`,
      );
    }
  }

  start(): void {
    if (this.resultTimer) return;
    this.resultTimer = setInterval(() => {
      void this.runMaintenance().catch((error: unknown) => {
        logger.error({ err: error }, "Ranked matchmaking maintenance tick failed.");
      });
    }, 1_000);
    this.resultTimer.unref?.();
  }

  stop(): void {
    if (this.resultTimer) clearInterval(this.resultTimer);
    this.resultTimer = undefined;
  }

  runMaintenance(): Promise<void> {
    return this.exclusive(async () => {
      await this.formMatches();
      await this.recordFinishedMatches();
    });
  }

  enqueue(userId: string, operatorId: ServerOperatorId): Promise<CompetitiveStatus> {
    return this.exclusive(async () => {
      const existingTicket = this.tickets.get(userId);
      if (existingTicket) return this.toMatchedStatus(existingTicket);
      const existing = await this.queueStore.status(userId);
      if (existing) return this.toQueuedStatus(existing);
      const rating = await this.readRating(userId);
      await this.queueStore.enqueue({
        userId,
        operatorId: String(operatorId),
        rating,
        queuedAt: this.nowMs(),
      });
      await this.formMatches();
      return this.status(userId);
    });
  }

  cancel(userId: string): Promise<CompetitiveStatus> {
    return this.exclusive(async () => {
      if (this.tickets.has(userId)) return this.status(userId);
      await this.queueStore.cancel(userId);
      return this.status(userId);
    });
  }

  async status(userId: string): Promise<CompetitiveStatus> {
    const ticket = this.tickets.get(userId);
    if (ticket) return this.toMatchedStatus(ticket);
    const queued = await this.queueStore.status(userId);
    if (!queued) return { state: "idle" };
    return this.toQueuedStatus(queued);
  }

  private async formMatches(): Promise<void> {
    while (true) {
      const claim = await this.queueStore.claimNextBatch(this.matchSize, this.nowMs());
      if (!claim) return;
      const batch: QueueEntry[] = claim.entries.map((entry) => {
        if (!Object.hasOwn(SERVER_OPERATOR_PROFILES, entry.operatorId)) {
          throw new Error("Ranked queue contains an unavailable operator.");
        }
        return {
          ...entry,
          operatorId: entry.operatorId as ServerOperatorId,
        };
      });
      let createdMatchId: string | null = null;
      try {
        const created = await this.manager.createSession(CINDER_ROW_MAP_ID);
        createdMatchId = created.matchId;
        const ordered = balancedTeamJoinOrder(batch);
        const pendingTickets = new Map<string, MatchTicket>();
        for (const entry of ordered) {
          const joined = this.manager.joinSession(
            created.matchId,
            entry.operatorId,
            entry.userId,
          );
          const player = joined.snapshot.players.find(
            (candidate) => candidate.playerId === joined.playerId,
          );
          if (!player?.team) throw new Error("The match server did not assign a team.");
          pendingTickets.set(entry.userId, {
            rating: entry.rating,
            matchId: created.matchId,
            playerId: joined.playerId,
            accessToken: joined.accessToken,
            team: player.team,
            operatorId: entry.operatorId,
          });
        }
        await this.queueStore.completeClaim(claim.claimId);
        for (const [userId, ticket] of pendingTickets) this.tickets.set(userId, ticket);
        this.rankedMatchIds.add(created.matchId);
      } catch (error) {
        if (createdMatchId) {
          for (const entry of batch) this.tickets.delete(entry.userId);
        }
        await this.queueStore.releaseClaim(claim.claimId);
        logger.error({ err: error }, "Could not form a ranked Cinder Row match.");
        throw error;
      }
    }
  }

  private toQueuedStatus(status: RankedQueueStatus): CompetitiveStatus {
    return {
      state: "queued",
      position: status.position,
      rating: status.entry.rating,
      queuedPlayers: status.queuedPlayers,
    };
  }

  private toMatchedStatus(ticket: MatchTicket): CompetitiveStatus {
    return {
      state: "matched",
      rating: ticket.rating,
      match: {
        matchId: ticket.matchId,
        mapId: CINDER_ROW_MAP_ID,
        playerId: ticket.playerId,
        accessToken: ticket.accessToken,
        team: ticket.team,
        operatorId: ticket.operatorId,
      },
    };
  }

  private async recordFinishedMatches(): Promise<void> {
    for (const matchId of this.rankedMatchIds) {
      const result = this.readFinishedResult(matchId);
      if (!result) continue;
      try {
        await this.persistResult(result);
        this.rankedMatchIds.delete(matchId);
        for (const player of result.players) this.tickets.delete(player.userId);
      } catch (error) {
        logger.error({ err: error, matchId }, "Could not save ranked match results.");
      }
    }
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operation.then(operation, operation);
    this.operation = result.then(() => undefined, () => undefined);
    return result;
  }
}

export async function getCompetitiveRating(userId: string): Promise<number> {
  await db
    .insert(competitiveRatingsTable)
    .values({ userId })
    .onConflictDoNothing({ target: competitiveRatingsTable.userId });
  const [row] = await db
    .select({ rating: competitiveRatingsTable.rating })
    .from(competitiveRatingsTable)
    .where(eq(competitiveRatingsTable.userId, userId))
    .limit(1);
  return row?.rating ?? 1_000;
}

export async function persistCompetitiveResult(
  result: NonNullable<ReturnType<MatchSessionManager["getFinishedArenaResult"]>>,
): Promise<void> {
  const uniqueUserIds = [...new Set(result.players.map((player) => player.userId))].sort();
  if (uniqueUserIds.length !== result.players.length) {
    throw new Error("Ranked result contains duplicate account identities.");
  }
  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(competitiveMatchResultsTable)
      .values({
        matchId: result.matchId,
        winner: result.winner,
        participants: [],
      })
      .onConflictDoNothing({ target: competitiveMatchResultsTable.matchId })
      .returning({ matchId: competitiveMatchResultsTable.matchId });
    if (!inserted) return;

    for (const userId of uniqueUserIds) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    }
    const existingRows = await tx
      .select()
      .from(competitiveRatingsTable)
      .where(inArray(competitiveRatingsTable.userId, uniqueUserIds));
    const byUserId = new Map(existingRows.map((row) => [row.userId, row]));
    const oldRatings = new Map(
      uniqueUserIds.map((userId) => [userId, byUserId.get(userId)?.rating ?? 1_000]),
    );
    const teamMembers = {
      accord: result.players.filter((player) => player.team === "accord"),
      "eon-dusk": result.players.filter((player) => player.team === "eon-dusk"),
    };
    const teamAverage = (team: "accord" | "eon-dusk") => {
      const members = teamMembers[team];
      return members.reduce((sum, player) => sum + (oldRatings.get(player.userId) ?? 1_000), 0) /
        Math.max(1, members.length);
    };
    const winner = result.winner;
    const expectedAccord = 1 /
      (1 + 10 ** ((teamAverage("eon-dusk") - teamAverage("accord")) / 400));
    const participants: CompetitiveParticipantRating[] = [];
    for (const player of result.players) {
      const ratingBefore = oldRatings.get(player.userId) ?? 1_000;
      const expected = player.team === "accord" ? expectedAccord : 1 - expectedAccord;
      const won = winner !== "draw" && player.team === winner;
      const lost = winner !== "draw" && player.team !== winner;
      const score = winner === "draw" ? 0.5 : won ? 1 : 0;
      const ratingAfter = Math.max(
        100,
        Math.round(ratingBefore + 32 * (score - expected)),
      );
      participants.push({
        userId: player.userId,
        team: player.team,
        ratingBefore,
        ratingAfter,
        outcome: winner === "draw" ? "draw" : won ? "win" : "loss",
      });
      await tx
        .insert(competitiveRatingsTable)
        .values({
          userId: player.userId,
          rating: ratingAfter,
          gamesPlayed: 1,
          wins: won ? 1 : 0,
          losses: lost ? 1 : 0,
          draws: winner === "draw" ? 1 : 0,
        })
        .onConflictDoUpdate({
          target: competitiveRatingsTable.userId,
          set: {
            rating: ratingAfter,
            gamesPlayed: sql`${competitiveRatingsTable.gamesPlayed} + 1`,
            wins: sql`${competitiveRatingsTable.wins} + ${won ? 1 : 0}`,
            losses: sql`${competitiveRatingsTable.losses} + ${lost ? 1 : 0}`,
            draws: sql`${competitiveRatingsTable.draws} + ${winner === "draw" ? 1 : 0}`,
            updatedAt: new Date(),
          },
        });
    }
    await tx
      .update(competitiveMatchResultsTable)
      .set({ participants })
      .where(eq(competitiveMatchResultsTable.matchId, result.matchId));
  });
}

export function balancedTeamJoinOrder<T extends { rating: number }>(players: T[]): T[] {
  const sorted = [...players].sort((left, right) => right.rating - left.rating);
  if (sorted.length < 2 || sorted.length % 2 !== 0) {
    throw new Error("Competitive teams require an even player count of at least two.");
  }
  if (sorted.some((player) => !Number.isSafeInteger(player.rating) || player.rating < 0)) {
    throw new Error("Competitive ratings must be non-negative safe integers.");
  }

  const teamSize = sorted.length / 2;
  const teamA: T[] = [];
  const teamB: T[] = [];
  let ratingA = 0;
  let ratingB = 0;
  for (const player of sorted) {
    if (teamA.length === teamSize) {
      teamB.push(player);
      ratingB += player.rating;
    } else if (teamB.length === teamSize) {
      teamA.push(player);
      ratingA += player.rating;
    } else if (ratingA <= ratingB) {
      teamA.push(player);
      ratingA += player.rating;
    } else {
      teamB.push(player);
      ratingB += player.rating;
    }
  }
  return teamA.flatMap((player, index) => [player, teamB[index]!]);
}
