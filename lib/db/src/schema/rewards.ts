import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth.ts";

export interface PersistedInventoryItem {
  lootId: string;
  kind: string;
  label: string;
  scrap: number;
  weaponId?: string;
  modId?: string;
  matchId: string;
  acquiredAt: string;
}

export const playerProfilesTable = pgTable("player_profiles", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  credits: integer("credits").notNull().default(0),
  extractions: integer("extractions").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const extractionSettlementsTable = pgTable(
  "extraction_settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id").notNull(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    creditsAwarded: integer("credits_awarded").notNull(),
    itemCount: integer("item_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("extraction_settlement_match_user").on(table.matchId, table.userId),
    index("extraction_settlement_user_created").on(table.userId, table.createdAt),
  ],
);

export const extractionReceiptsTable = pgTable(
  "extraction_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id").notNull(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    requiredSeconds: real("required_seconds").notNull(),
    inventory: jsonb("inventory").notNull().$type<PersistedInventoryItem[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("extraction_receipt_match_user").on(table.matchId, table.userId),
    index("extraction_receipt_user_created").on(table.userId, table.createdAt),
  ],
);

export const playerInventoryTable = pgTable(
  "player_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").notNull(),
    itemIndex: integer("item_index").notNull(),
    item: jsonb("item").notNull().$type<PersistedInventoryItem>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("player_inventory_match_item").on(
      table.userId,
      table.matchId,
      table.itemIndex,
    ),
    index("player_inventory_user_created").on(table.userId, table.createdAt),
  ],
);

export const emptyInventoryJson = sql`'[]'::jsonb`;
