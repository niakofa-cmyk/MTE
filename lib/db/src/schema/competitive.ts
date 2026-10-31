import { usersTable } from "./auth.ts";
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export type CompetitiveParticipantRating = {
  userId: string;
  team: "accord" | "eon-dusk";
  ratingBefore: number;
  ratingAfter: number;
  outcome: "win" | "loss" | "draw";
};

export type CompetitiveMatchSessionParticipant = {
  userId: string;
  team: "accord" | "eon-dusk";
};

export const competitiveRatingsTable = pgTable("competitive_ratings", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull().default(1000),
  gamesPlayed: integer("games_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const competitiveMatchResultsTable = pgTable("competitive_match_results", {
  matchId: varchar("match_id").primaryKey(),
  winner: varchar("winner").notNull(),
  participants: jsonb("participants")
    .$type<CompetitiveParticipantRating[]>()
    .notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const competitiveMatchSessionsTable = pgTable(
  "competitive_match_sessions",
  {
    matchId: varchar("match_id").primaryKey(),
    modeId: varchar("mode_id").notNull(),
    regionId: varchar("region_id").notNull().default("default"),
    mapId: varchar("map_id").notNull(),
    status: varchar("status").notNull().default("active"),
    participants: jsonb("participants")
      .$type<CompetitiveMatchSessionParticipant[]>()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    index("competitive_match_sessions_status_started_idx").on(table.status, table.startedAt),
  ],
);

export const competitiveQueueEntriesTable = pgTable(
  "competitive_queue_entries",
  {
    userId: varchar("user_id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    modeId: varchar("mode_id").notNull().default("cinder-row-relay-4v4"),
    regionId: varchar("region_id").notNull().default("default"),
    operatorId: varchar("operator_id").notNull(),
    rating: integer("rating").notNull(),
    queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
    claimId: varchar("claim_id"),
    claimExpiresAt: timestamp("claim_expires_at", { withTimezone: true }),
  },
  (table) => [
    index("competitive_queue_mode_region_time_idx").on(
      table.modeId,
      table.regionId,
      table.queuedAt,
    ),
    index("competitive_queue_claim_expiry_idx").on(table.claimExpiresAt),
  ],
);
