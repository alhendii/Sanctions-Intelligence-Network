import { sql } from "drizzle-orm";
import { db, entitiesTable, type SourceCitation } from "@workspace/db";

type CachedSearchEntity = {
  id: string;
  name: string;
  schemaType: string;
  aliases: string[];
  datasets: string[];
  properties: Record<string, string[]>;
  sources: SourceCitation[];
  sourceUpdatedAt: Date | null;
  matchScore: number;
  matchReasons: Array<{ label: string; detail: string }>;
};

let indexPromise: Promise<void> | null = null;
const searchCache = new Map<string, { expiresAt: number; value: CachedSearchEntity[] }>();

export function ensureSearchIndex(): Promise<void> {
  if (!indexPromise) {
    indexPromise = (async () => {
      try {
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS entities_name_trgm_idx ON entities USING gin (lower(name) gin_trgm_ops)`);
      } catch {
        // Search remains functional with the database's normal indexes if extension
        // creation is unavailable in a managed environment.
      }
    })();
  }
  return indexPromise;
}

function buildReasons(row: { name: string; aliases: string[]; score: number }, query: string) {
  const q = query.trim().toLocaleLowerCase();
  const name = row.name.toLocaleLowerCase();
  const aliases = row.aliases.map((alias) => alias.toLocaleLowerCase());
  const reasons: Array<{ label: string; detail: string }> = [];
  if (name === q) reasons.push({ label: "Exact name", detail: "The query exactly matches the canonical source name." });
  else if (name.startsWith(q)) reasons.push({ label: "Name prefix", detail: "The canonical source name starts with the query." });
  else if (name.includes(q)) reasons.push({ label: "Name contains query", detail: "The query appears within the canonical source name." });
  if (aliases.some((alias) => alias === q)) reasons.push({ label: "Exact alias", detail: "The query exactly matches a source-provided alias." });
  else if (aliases.some((alias) => alias.includes(q))) reasons.push({ label: "Alias match", detail: "The query appears in a source-provided alias." });
  reasons.push({ label: "Trigram similarity", detail: `${Math.round(row.score * 100)}% character similarity from PostgreSQL pg_trgm.` });
  return reasons;
}

export async function searchCachedEntities(query: string, limit: number): Promise<CachedSearchEntity[]> {
  await ensureSearchIndex();
  const cacheKey = `${query.trim().toLocaleLowerCase()}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const result = await db.execute(sql`
    SELECT
      id,
      name,
      schema_type AS "schemaType",
      aliases,
      datasets,
      properties,
      sources,
      source_updated_at AS "sourceUpdatedAt",
      GREATEST(
        similarity(lower(name), lower(${query})),
        COALESCE((SELECT max(similarity(lower(alias), lower(${query}))) FROM unnest(aliases) AS alias), 0)
      )::float AS score
    FROM entities
    WHERE
      lower(name) % lower(${query})
      OR EXISTS (SELECT 1 FROM unnest(aliases) AS alias WHERE lower(alias) % lower(${query}))
      OR lower(name) LIKE lower('%' || ${query} || '%')
      OR EXISTS (SELECT 1 FROM unnest(aliases) AS alias WHERE lower(alias) LIKE lower('%' || ${query} || '%'))
    ORDER BY score DESC, name ASC
    LIMIT ${limit}
  `) as unknown as { rows?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
  const rows = Array.isArray(result) ? result : result.rows ?? [];

  const results = rows.map((row) => {
    const score = Number(row.score ?? 0);
    const entity = {
      id: String(row.id),
      name: String(row.name),
      schemaType: String(row.schemaType),
      aliases: Array.isArray(row.aliases) ? row.aliases.map(String) : [],
      datasets: Array.isArray(row.datasets) ? row.datasets.map(String) : [],
      properties: (row.properties ?? {}) as Record<string, string[]>,
      sources: Array.isArray(row.sources) ? row.sources.map((source) => {
        const item = source as Partial<SourceCitation>;
        return {
          ...item,
          title: item.title ?? "Source record",
          url: item.url ?? "",
          publisher: item.publisher ?? "Public source",
        };
      }) : [],
      sourceUpdatedAt: row.sourceUpdatedAt instanceof Date ? row.sourceUpdatedAt : null,
      matchScore: score,
      matchReasons: buildReasons({ name: String(row.name), aliases: Array.isArray(row.aliases) ? row.aliases.map(String) : [], score }, query),
    };
    return entity;
  });
  searchCache.set(cacheKey, { expiresAt: Date.now() + 60_000, value: results });
  return results;
}