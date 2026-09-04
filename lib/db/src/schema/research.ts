import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const coverageTable = pgTable("entity_coverage", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entityId: text("entity_id").notNull(),
  feed: text("feed").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  publisher: text("publisher").notNull(),
  summary: text("summary"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  query: text("query").notNull(),
  verification: text("verification").notNull().default("unverified_context"),
});

export const watchlistsTable = pgTable("watchlists", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const watchlistEntitiesTable = pgTable("watchlist_entities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  watchlistId: integer("watchlist_id").notNull(),
  entityId: text("entity_id").notNull(),
  lastFingerprint: text("last_fingerprint"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const watchEventsTable = pgTable("watch_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  watchlistEntityId: integer("watchlist_entity_id").notNull(),
  entityId: text("entity_id").notNull(),
  eventType: text("event_type").notNull(),
  summary: text("summary").notNull(),
  before: jsonb("before").$type<Record<string, unknown> | null>(),
  after: jsonb("after").$type<Record<string, unknown> | null>(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export const casesTable = pgTable("research_cases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const caseEntitiesTable = pgTable("case_entities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  caseId: integer("case_id").notNull(),
  entityId: text("entity_id").notNull(),
  note: text("note"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const caseNotesTable = pgTable("case_notes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  caseId: integer("case_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CoverageItem = typeof coverageTable.$inferSelect;
export type Watchlist = typeof watchlistsTable.$inferSelect;
export type WatchlistEntity = typeof watchlistEntitiesTable.$inferSelect;
export type WatchEvent = typeof watchEventsTable.$inferSelect;
export type ResearchCase = typeof casesTable.$inferSelect;
export type CaseEntity = typeof caseEntitiesTable.$inferSelect;
export type CaseNote = typeof caseNotesTable.$inferSelect;