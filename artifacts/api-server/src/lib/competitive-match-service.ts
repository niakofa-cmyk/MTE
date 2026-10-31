import { eq, inArray, sql } from "drizzle-orm";
import {
  competitiveMatchResultsTable,
  competitiveRatingsTable,
  db,
  type CompetitiveParticipantRating,
} from "@workspace/db";
import { CINDER_ROW_MAP_ID } from "./cinder-row-arena.ts";
import { logger } from "./logger.ts";
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
  readRating?: (userId: string) => Promise<number>;
  persistResult?: (
    result: NonNullable<ReturnType<MatchSessionManager["getFinishedArenaResult"]>>,
  ) => Promise<void>;
}

export class CompetitiveMatchService {
  private readonly queue: QueueEntry[] = [];
  private readonly tickets = new Map<string, MatchTicket>();
  private readonly rankedMatchIds = new Set<string>();
  private readonly matchSize: number;
  private readonly nowMs: () => number;
  private readonly readRating: (userId: string) => Promise<number>;
  private readonly persistResult: NonNullable<
    CompetitiveMatchServiceOptions["persistResult"]
  >;
  private readonly manager: MatchSessionManager;
  private operation = Promise.resolve();
  private resultTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    manager: MatchSessionManager,
    options: CompetitiveMatchServiceOptions = {},
  ) {
    this.manager = manager;
    this.matchSize = options.matchSize ?? 8;
    this.nowMs = options.nowMs ?? Date.now;
    this.readRating = options.readRating ?? getCompetitiveRating;
    this.persistResult = options.persistResult ?? persistCompetitiveResult;
    if (
      !Number.isInteger(this.matchSize) ||
      this.matchSize < 2 ||
      this.matchSize > 8 ||
      this.matchSize % 2 !== 0
    ) {
      throw new Error("Ranked match size must be an even number between two and eight.");
    }
  }

  start(): void {
    if (this.resultTimer) return;
    this.resultTimer = setInterval(() => {
      void this.exclusive(async () => {
        await this.formMatches();
        await this.recordFinishedMatches();
      }).catch((error: unknown) => {
        logger.error({ err: error }, "Ranked matchmaking maintenance tick failed.");
      });
    }, 1_000);
    this.resultTimer.unref?.();
  }

  stop(): void {
    if (this.resultTimer) clearInterval(this.resultTimer);
    this.resultTimer = undefined;
  }

  enqueue(userId: string, operatorId: ServerOperatorId): Promise<CompetitiveStatus> {
    return this.exclusive(async () => {
      const existingTicket = this.tickets.get(userId);
      if (existingTicket) return this.toMatchedStatus(existingTicket);
      const existing = this.queue.find((entry) => entry.userId === userId);
      if (existing) return this.toQueuedStatus(existing);
      if (this.queue.length >= 512) {
        throw new Error("Ranked matchmaking is at capacity.");
      }
      const rating = await this.readRating(userId);
      const entry: QueueEntry = {
        userId,
        operatorId,
        rating,
        queuedAt: this.nowMs(),
      };
      this.queue.push(entry);
      await this.formMatches();
      return this.status(userId);
    });
  }

  cancel(userId: string): Promise<CompetitiveStatus> {
    return this.exclusive(async () => {
      const index = this.queue.findIndex((entry) => entry.userId === userId);
      if (index >= 0) this.queue.splice(index, 1);
      return this.status(userId);
    });
  }

  status(userId: string): CompetitiveStatus {
    const ticket = this.tickets.get(userId);
    if (ticket) return this.toMatchedStatus(ticket);
    const entry = this.queue.find((candidate) => candidate.userId === userId);
    if (!entry) return { state: "idle" };
    return this.toQueuedStatus(entry);
  }

  private async formMatches(): Promise<void> {
    while (this.queue.length >= this.matchSize) {
      const batch = this.selectClosestBatch();
      for (const entry of batch) {
        const index = this.queue.findIndex((candidate) => candidate.userId === entry.userId);
        if (index >= 0) this.queue.splice(index, 1);
      }
      try {
        const created = await this.manager.createSession(CINDER_ROW_MAP_ID);
        const ordered = balancedTeamJoinOrder(batch);
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
          this.tickets.set(entry.userId, {
            rating: entry.rating,
            matchId: created.matchId,
            playerId: joined.playerId,
            accessToken: joined.accessToken,
            team: player.team,
            operatorId: entry.operatorId,
          });
        }
        this.rankedMatchIds.add(created.matchId);
      } catch (error) {
        for (const entry of batch) this.tickets.delete(entry.userId);
        this.queue.unshift(...batch);
        logger.error({ err: error }, "Could not form a ranked Cinder Row match.");
        throw error;
      }
    }
  }

  private selectClosestBatch(): QueueEntry[] {
    const oldest = this.queue[0];
    if (!oldest) return [];
    const maxRatingGap = Math.min(
      1_000,
      150 + Math.floor(Math.max(0, this.nowMs() - oldest.queuedAt) / 10_000) * 100,
    );
    const candidates = this.queue
      .filter((entry) => Math.abs(entry.rating - oldest.rating) <= maxRatingGap)
      .sort((left, right) =>
        Math.abs(left.rating - oldest.rating) - Math.abs(right.rating - oldest.rating) ||
        left.queuedAt - right.queuedAt,
      )
      .slice(0, this.matchSize);
    if (candidates.length < this.matchSize && this.nowMs() - oldest.queuedAt < 90_000) {
      return [];
    }
    return candidates.length >= this.matchSize
      ? candidates
      : this.queue.slice(0, this.matchSize);
  }

  private toQueuedStatus(entry: QueueEntry): CompetitiveStatus {
    const index = this.queue.findIndex((candidate) => candidate.userId === entry.userId);
    return {
      state: "queued",
      position: index + 1,
      rating: entry.rating,
      queuedPlayers: this.queue.length,
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
      const result = this.manager.getFinishedArenaResult(matchId);
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
    const loser = winner === "accord" ? "eon-dusk" : "accord";
    const expectedWinner = 1 / (1 + 10 ** ((teamAverage(loser) - teamAverage(winner)) / 400));
    const participants: CompetitiveParticipantRating[] = [];
    for (const player of result.players) {
      const ratingBefore = oldRatings.get(player.userId) ?? 1_000;
      const expected = player.team === winner ? expectedWinner : 1 - expectedWinner;
      const ratingAfter = Math.max(
        100,
        Math.round(ratingBefore + 32 * ((player.team === winner ? 1 : 0) - expected)),
      );
      const won = player.team === winner;
      participants.push({
        userId: player.userId,
        team: player.team,
        ratingBefore,
        ratingAfter,
      });
      await tx
        .insert(competitiveRatingsTable)
        .values({
          userId: player.userId,
          rating: ratingAfter,
          gamesPlayed: 1,
          wins: won ? 1 : 0,
          losses: won ? 0 : 1,
        })
        .onConflictDoUpdate({
          target: competitiveRatingsTable.userId,
          set: {
            rating: ratingAfter,
            gamesPlayed: sql`${competitiveRatingsTable.gamesPlayed} + 1`,
            wins: sql`${competitiveRatingsTable.wins} + ${won ? 1 : 0}`,
            losses: sql`${competitiveRatingsTable.losses} + ${won ? 0 : 1}`,
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
  const teamSize = Math.floor(sorted.length / 2);
  let bestTeamA: number[] = [];
  let bestDifference = Number.POSITIVE_INFINITY;
  const combinations = 1 << sorted.length;
  for (let mask = 0; mask < combinations; mask += 1) {
    const indices: number[] = [];
    let ratingTotal = 0;
    for (let index = 0; index < sorted.length; index += 1) {
      if ((mask & (1 << index)) === 0) continue;
      indices.push(index);
      ratingTotal += sorted[index]!.rating;
    }
    if (indices.length !== teamSize) continue;
    const totalRating = sorted.reduce((sum, player) => sum + player.rating, 0);
    const difference = Math.abs(totalRating - 2 * ratingTotal);
    if (difference < bestDifference) {
      bestDifference = difference;
      bestTeamA = indices;
    }
  }
  const teamASet = new Set(bestTeamA);
  const teamA = sorted.filter((_, index) => teamASet.has(index));
  const teamB = sorted.filter((_, index) => !teamASet.has(index));
  return teamA.flatMap((player, index) => [player, teamB[index]!]);
}
