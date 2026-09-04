import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  caseEntitiesTable,
  caseNotesTable,
  casesTable,
  db,
  entitiesTable,
  watchEventsTable,
  watchlistEntitiesTable,
  watchlistsTable,
} from "@workspace/db";
import { getSanctionsEntity } from "./opensanctions";

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function serializeWatchlist(row: typeof watchlistsTable.$inferSelect, entities: number) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), entities };
}

export async function listWatchlists() {
  const rows = await db.select().from(watchlistsTable).orderBy(desc(watchlistsTable.updatedAt));
  return Promise.all(rows.map(async (row) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(watchlistEntitiesTable).where(eq(watchlistEntitiesTable.watchlistId, row.id));
    return serializeWatchlist(row, Number(count));
  }));
}

export async function createWatchlist(name: string) {
  const [row] = await db.insert(watchlistsTable).values({ name: name.trim() }).returning();
  return serializeWatchlist(row, 0);
}

export async function addWatchlistEntity(watchlistId: number, entityId: string) {
  const exists = await db.select().from(watchlistEntitiesTable).where(and(eq(watchlistEntitiesTable.watchlistId, watchlistId), eq(watchlistEntitiesTable.entityId, entityId))).limit(1);
  if (exists[0]) return { ...exists[0], addedAt: exists[0].addedAt.toISOString(), lastCheckedAt: iso(exists[0].lastCheckedAt) };
  const [row] = await db.insert(watchlistEntitiesTable).values({ watchlistId, entityId }).returning();
  return { ...row, addedAt: row.addedAt.toISOString(), lastCheckedAt: iso(row.lastCheckedAt) };
}

export async function getWatchlistEvents(watchlistId: number) {
  const rows = await db.select().from(watchEventsTable)
    .innerJoin(watchlistEntitiesTable, eq(watchEventsTable.watchlistEntityId, watchlistEntitiesTable.id))
    .where(eq(watchlistEntitiesTable.watchlistId, watchlistId))
    .orderBy(desc(watchEventsTable.detectedAt));
  return rows.map((row) => ({
    ...row.watch_events,
    detectedAt: row.watch_events.detectedAt.toISOString(),
    readAt: iso(row.watch_events.readAt),
  }));
}

function fingerprint(entity: Awaited<ReturnType<typeof getSanctionsEntity>>) {
  return JSON.stringify({
    id: entity.id,
    name: entity.name,
    aliases: [...entity.aliases].sort(),
    datasets: [...entity.datasets].sort(),
    properties: entity.properties,
  });
}

export async function checkWatchlist(watchlistId: number) {
  const watched = await db.select().from(watchlistEntitiesTable).where(eq(watchlistEntitiesTable.watchlistId, watchlistId));
  let changes = 0;
  for (const item of watched) {
    try {
      const entity = await getSanctionsEntity(item.entityId);
      const nextFingerprint = fingerprint(entity);
      const before = item.lastFingerprint ? JSON.parse(item.lastFingerprint) as Record<string, unknown> : null;
      const after = JSON.parse(nextFingerprint) as Record<string, unknown>;
      if (before && item.lastFingerprint !== nextFingerprint) {
        changes += 1;
        await db.insert(watchEventsTable).values({
          watchlistEntityId: item.id,
          entityId: item.entityId,
          eventType: "source_record_changed",
          summary: `${entity.name} changed in a watched source record.`,
          before,
          after,
        });
      }
      await db.update(watchlistEntitiesTable).set({ lastFingerprint: nextFingerprint, lastCheckedAt: new Date() }).where(eq(watchlistEntitiesTable.id, item.id));
    } catch {
      await db.update(watchlistEntitiesTable).set({ lastCheckedAt: new Date() }).where(eq(watchlistEntitiesTable.id, item.id));
    }
  }
  await db.update(watchlistsTable).set({ updatedAt: new Date() }).where(eq(watchlistsTable.id, watchlistId));
  return { checked: watched.length, changes };
}

export async function listCases() {
  const rows = await db.select().from(casesTable).orderBy(desc(casesTable.updatedAt));
  return Promise.all(rows.map(async (row) => {
    const [{ entityCount }] = await db.select({ entityCount: sql<number>`count(*)` }).from(caseEntitiesTable).where(eq(caseEntitiesTable.caseId, row.id));
    const [{ noteCount }] = await db.select({ noteCount: sql<number>`count(*)` }).from(caseNotesTable).where(eq(caseNotesTable.caseId, row.id));
    return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), entityCount: Number(entityCount), noteCount: Number(noteCount) };
  }));
}

export async function createCase(name: string, description?: string | null) {
  const [row] = await db.insert(casesTable).values({ name: name.trim(), description: description?.trim() || null }).returning();
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), entityCount: 0, noteCount: 0 };
}

export async function getCase(caseId: number) {
  const [row] = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!row) return null;
  const entities = await db.select().from(caseEntitiesTable).where(eq(caseEntitiesTable.caseId, caseId)).orderBy(asc(caseEntitiesTable.addedAt));
  const notes = await db.select().from(caseNotesTable).where(eq(caseNotesTable.caseId, caseId)).orderBy(desc(caseNotesTable.createdAt));
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    entityCount: entities.length,
    noteCount: notes.length,
    entities: entities.map((entity) => ({ ...entity, addedAt: entity.addedAt.toISOString() })),
    notes: notes.map((note) => ({ ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() })),
  };
}

export async function addCaseEntity(caseId: number, entityId: string, note?: string | null) {
  const [row] = await db.insert(caseEntitiesTable).values({ caseId, entityId, note: note?.trim() || null }).returning();
  await db.update(casesTable).set({ updatedAt: new Date() }).where(eq(casesTable.id, caseId));
  return { ...row, addedAt: row.addedAt.toISOString() };
}

export async function addCaseNote(caseId: number, body: string) {
  const [row] = await db.insert(caseNotesTable).values({ caseId, body: body.trim() }).returning();
  await db.update(casesTable).set({ updatedAt: new Date() }).where(eq(casesTable.id, caseId));
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export async function getEntityForExport(entityId: string) {
  return getSanctionsEntity(entityId);
}
