import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  extractionSettlementsTable,
  playerInventoryTable,
  playerProfilesTable,
  type PersistedInventoryItem,
} from "@workspace/db";
import type { GrantedGameplayItem } from "./authoritative-gameplay-state.ts";

export interface PlayerProfile {
  credits: number;
  extractions: number;
  inventory: PersistedInventoryItem[];
}

export async function getPlayerProfile(userId: string): Promise<PlayerProfile> {
  const [profile] = await db
    .select()
    .from(playerProfilesTable)
    .where(eq(playerProfilesTable.userId, userId))
    .limit(1);
  const inventoryRows = await db
    .select({ item: playerInventoryTable.item })
    .from(playerInventoryTable)
    .where(eq(playerInventoryTable.userId, userId))
    .orderBy(desc(playerInventoryTable.createdAt))
    .limit(100);
  return {
    credits: profile?.credits ?? 0,
    extractions: profile?.extractions ?? 0,
    inventory: inventoryRows.map((row) => row.item),
  };
}

export async function settleServerExtraction(
  userId: string,
  matchId: string,
  grants: GrantedGameplayItem[],
): Promise<{
  alreadySettled: boolean;
  creditsAwarded: number;
  inventory: PersistedInventoryItem[];
  profile: PlayerProfile;
}> {
  const acquiredAt = new Date().toISOString();
  const inventory = grants.slice(0, 100).map((grant) => ({
    ...grant,
    matchId,
    acquiredAt,
  }));
  const creditsAwarded = Math.min(
    500,
    inventory.reduce((sum, item) => sum + Math.max(0, Math.trunc(item.scrap)), 0),
  );

  return db.transaction(async (tx) => {
    const [settlement] = await tx
      .insert(extractionSettlementsTable)
      .values({
        userId,
        matchId,
        creditsAwarded,
        itemCount: inventory.length,
      })
      .onConflictDoNothing({
        target: [extractionSettlementsTable.matchId, extractionSettlementsTable.userId],
      })
      .returning();

    if (!settlement) {
      const [existing] = await tx
        .select()
        .from(extractionSettlementsTable)
        .where(
          and(
            eq(extractionSettlementsTable.matchId, matchId),
            eq(extractionSettlementsTable.userId, userId),
          ),
        )
        .limit(1);
      const savedRows = await tx
        .select({ item: playerInventoryTable.item })
        .from(playerInventoryTable)
        .where(
          and(
            eq(playerInventoryTable.matchId, matchId),
            eq(playerInventoryTable.userId, userId),
          ),
        )
        .orderBy(playerInventoryTable.itemIndex);
      const [profile] = await tx
        .select()
        .from(playerProfilesTable)
        .where(eq(playerProfilesTable.userId, userId))
        .limit(1);
      return {
        alreadySettled: true,
        creditsAwarded: existing?.creditsAwarded ?? 0,
        inventory: savedRows.map((row) => row.item),
        profile: await profileInTransaction(tx, userId, profile),
      };
    }

    await tx
      .insert(playerProfilesTable)
      .values({ userId, credits: creditsAwarded, extractions: 1 })
      .onConflictDoUpdate({
        target: playerProfilesTable.userId,
        set: {
          credits: sql`${playerProfilesTable.credits} + ${creditsAwarded}`,
          extractions: sql`${playerProfilesTable.extractions} + 1`,
          updatedAt: new Date(),
        },
      });

    if (inventory.length > 0) {
      await tx.insert(playerInventoryTable).values(
        inventory.map((item, itemIndex) => ({
          userId,
          matchId,
          itemIndex,
          item: item as PersistedInventoryItem,
        })),
      );
    }

    const [profile] = await tx
      .select()
      .from(playerProfilesTable)
      .where(eq(playerProfilesTable.userId, userId))
      .limit(1);
    return {
      alreadySettled: false,
      creditsAwarded,
      inventory,
      profile: await profileInTransaction(tx, userId, profile),
    };
  });
}

async function profileInTransaction(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  profile?: { credits: number; extractions: number },
): Promise<PlayerProfile> {
  const rows = await tx
    .select({ item: playerInventoryTable.item })
    .from(playerInventoryTable)
    .where(eq(playerInventoryTable.userId, userId))
    .orderBy(desc(playerInventoryTable.createdAt))
    .limit(100);
  return {
    credits: profile?.credits ?? 0,
    extractions: profile?.extractions ?? 0,
    inventory: rows.map((row) => row.item),
  };
}
