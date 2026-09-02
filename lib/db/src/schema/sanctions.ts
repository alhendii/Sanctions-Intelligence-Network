import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const entitiesTable = pgTable("entities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  schemaType: text("schema_type").notNull(),
  aliases: text("aliases").array().notNull().default([]),
  datasets: text("datasets").array().notNull().default([]),
  properties: jsonb("properties").$type<Record<string, string[]>>().notNull().default({}),
  sources: jsonb("sources")
    .$type<Array<{ title: string; url: string; publisher?: string | null }>>()
    .notNull()
    .default([]),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const edgesTable = pgTable("edges", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sourceId: text("source_id").notNull(),
  targetId: text("target_id").notNull(),
  relationshipType: text("relationship_type").notNull(),
  confidence: text("confidence").notNull(),
  sourceCitation: jsonb("source_citation")
    .$type<{ title: string; url: string; publisher?: string | null }>()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEntitySchema = createInsertSchema(entitiesTable);
export const insertEdgeSchema = createInsertSchema(edgesTable);
export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type InsertEdge = z.infer<typeof insertEdgeSchema>;
export type Entity = typeof entitiesTable.$inferSelect;
export type Edge = typeof edgesTable.$inferSelect;