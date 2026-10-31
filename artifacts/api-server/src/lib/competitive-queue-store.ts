import { and, asc, count, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import {
  competitiveQueueEntriesTable,
  db,
} from "@workspace/db";
import { randomUUID } from "node:crypto";

const MAX_QUEUED_PLAYERS = 512;
const CLAIM_TTL_MS = 30_000;

export interface RankedQueueEntry {
  userId: string;
  operatorId: string;
  rating: number;
  queuedAt: number;
}

export interface RankedQueueStatus {
  entry: RankedQueueEntry;
  position: number;
  queuedPlayers: number;
}

export interface RankedQueueClaim {
  claimId: string;
  entries: RankedQueueEntry[];
}

export interface CompetitiveQueueStore {
  enqueue(entry: RankedQueueEntry): Promise<void>;
  status(userId: string): Promise<RankedQueueStatus | null>;
  cancel(userId: string): Promise<boolean>;
  claimNextBatch(matchSize: number, nowMs: number): Promise<RankedQueueClaim | null>;
  completeClaim(claimId: string): Promise<void>;
  releaseClaim(claimId: string): Promise<void>;
}

export class PostgresCompetitiveQueueStore implements CompetitiveQueueStore {
  constructor(
    private readonly modeId = "cinder-row-relay-4v4",
    private readonly regionId = "default",
  ) {}

  async enqueue(entry: RankedQueueEntry): Promise<void> {
    await db.transaction(async (tx) => {
      await this.lockMode(tx);
      const [existing] = await tx
        .select({ userId: competitiveQueueEntriesTable.userId })
        .from(competitiveQueueEntriesTable)
        .where(eq(competitiveQueueEntriesTable.userId, entry.userId))
        .limit(1);
      if (existing) return;

      const [total] = await tx
        .select({ total: count() })
        .from(competitiveQueueEntriesTable)
        .where(this.modeRegionPredicate());
      if (Number(total?.total ?? 0) >= MAX_QUEUED_PLAYERS) {
        throw new Error("Ranked matchmaking is at capacity.");
      }
      await tx.insert(competitiveQueueEntriesTable).values({
        userId: entry.userId,
        modeId: this.modeId,
        regionId: this.regionId,
        operatorId: entry.operatorId,
        rating: entry.rating,
        queuedAt: new Date(entry.queuedAt),
      }).onConflictDoNothing({ target: competitiveQueueEntriesTable.userId });
    });
  }

  async status(userId: string): Promise<RankedQueueStatus | null> {
    const rows = await db
      .select()
      .from(competitiveQueueEntriesTable)
      .where(this.modeRegionPredicate())
      .orderBy(
        asc(competitiveQueueEntriesTable.queuedAt),
        asc(competitiveQueueEntriesTable.userId),
      )
      .limit(MAX_QUEUED_PLAYERS + 1);
    const index = rows.findIndex((row) => row.userId === userId);
    const row = rows[index];
    if (!row) return null;
    return {
      entry: {
        userId: row.userId,
        operatorId: row.operatorId,
        rating: row.rating,
        queuedAt: row.queuedAt.getTime(),
      },
      position: index + 1,
      queuedPlayers: rows.length,
    };
  }

  async cancel(userId: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      await this.lockMode(tx);
      const [entry] = await tx
        .select({
          userId: competitiveQueueEntriesTable.userId,
          claimId: competitiveQueueEntriesTable.claimId,
        })
        .from(competitiveQueueEntriesTable)
        .where(and(
          eq(competitiveQueueEntriesTable.userId, userId),
          this.modeRegionPredicate(),
        ))
        .for("update")
        .limit(1);
      if (!entry || entry.claimId) return false;
      await tx.delete(competitiveQueueEntriesTable)
        .where(eq(competitiveQueueEntriesTable.userId, userId));
      return true;
    });
  }

  async claimNextBatch(
    matchSize: number,
    nowMs: number,
  ): Promise<RankedQueueClaim | null> {
    return db.transaction(async (tx) => {
      await this.lockMode(tx);
      await tx.update(competitiveQueueEntriesTable)
        .set({ claimId: null, claimExpiresAt: null })
        .where(and(
          this.modeRegionPredicate(),
          isNotNull(competitiveQueueEntriesTable.claimId),
          lte(competitiveQueueEntriesTable.claimExpiresAt, new Date(nowMs)),
        ));

      const rows = await tx
        .select()
        .from(competitiveQueueEntriesTable)
        .where(and(
          this.modeRegionPredicate(),
          isNull(competitiveQueueEntriesTable.claimId),
        ))
        .orderBy(
          asc(competitiveQueueEntriesTable.queuedAt),
          asc(competitiveQueueEntriesTable.userId),
        )
        .limit(MAX_QUEUED_PLAYERS)
        .for("update");
      const entries = rows.map((row) => ({
        userId: row.userId,
        operatorId: row.operatorId,
        rating: row.rating,
        queuedAt: row.queuedAt.getTime(),
      }));
      const batch = selectRankedBatch(entries, matchSize, nowMs);
      if (batch.length !== matchSize) return null;

      const claimId = randomUUID();
      await tx.update(competitiveQueueEntriesTable)
        .set({
          claimId,
          claimExpiresAt: new Date(nowMs + CLAIM_TTL_MS),
        })
        .where(inArray(
          competitiveQueueEntriesTable.userId,
          batch.map((entry) => entry.userId),
        ));
      return { claimId, entries: batch };
    });
  }

  async completeClaim(claimId: string): Promise<void> {
    await db.delete(competitiveQueueEntriesTable)
      .where(eq(competitiveQueueEntriesTable.claimId, claimId));
  }

  async releaseClaim(claimId: string): Promise<void> {
    await db.update(competitiveQueueEntriesTable)
      .set({ claimId: null, claimExpiresAt: null })
      .where(eq(competitiveQueueEntriesTable.claimId, claimId));
  }

  private async lockMode(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ): Promise<void> {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`mte:${this.modeId}:${this.regionId}`}))`);
  }

  private modeRegionPredicate() {
    return and(
      eq(competitiveQueueEntriesTable.modeId, this.modeId),
      eq(competitiveQueueEntriesTable.regionId, this.regionId),
    );
  }
}

function selectRankedBatch(
  entries: RankedQueueEntry[],
  matchSize: number,
  nowMs: number,
): RankedQueueEntry[] {
  const oldest = entries[0];
  if (!oldest || entries.length < matchSize) return [];
  const waitMs = Math.max(0, nowMs - oldest.queuedAt);
  const maxRatingGap = Math.min(1_000, 150 + Math.floor(waitMs / 10_000) * 100);
  const candidates = entries
    .filter((entry) => Math.abs(entry.rating - oldest.rating) <= maxRatingGap)
    .sort((left, right) =>
      Math.abs(left.rating - oldest.rating) - Math.abs(right.rating - oldest.rating) ||
      left.queuedAt - right.queuedAt ||
      left.userId.localeCompare(right.userId),
    )
    .slice(0, matchSize);
  if (candidates.length >= matchSize) return candidates;
  return waitMs >= 90_000 ? entries.slice(0, matchSize) : [];
}
