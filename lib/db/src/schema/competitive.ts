import { usersTable } from "./auth.ts";
import { jsonb, pgTable, timestamp, varchar, integer } from "drizzle-orm/pg-core";

export type CompetitiveParticipantRating = {
  userId: string;
  team: "accord" | "eon-dusk";
  ratingBefore: number;
  ratingAfter: number;
};

export const competitiveRatingsTable = pgTable("competitive_ratings", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull().default(1000),
  gamesPlayed: integer("games_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
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
