import { and, desc, eq, sql } from "drizzle-orm";
import { db, edgesTable, entitiesTable, type Entity, type Edge } from "@workspace/db";
import { searchFreeFeedEntities } from "./free-feeds";

const API_BASE = "https://api.opensanctions.org";
const ENTITY_URL = "https://www.opensanctions.org/entities";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

type RawEntity = {
  id: string;
  caption?: string;
  schema?: string;
  properties?: Record<string, Array<string | RawEntity>>;
  datasets?: string[];
  last_change?: string;
  first_seen?: string;
  last_seen?: string;
};

type RawAdjacent = {
  entity?: RawEntity;
  adjacent?: Record<string, { results?: Array<string | RawEntity> }>;
};

export class OpenSanctionsError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "OpenSanctionsError";
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env.OPEN_SANCTIONS_API_KEY;
  if (!key) {
    throw new OpenSanctionsError(
      "OpenSanctions API key is not configured. Add OPEN_SANCTIONS_API_KEY to enable live intelligence.",
      503,
    );
  }
  return key;
}

function scalarValues(properties: RawEntity["properties"], keys: string[]): string[] {
  if (!properties) return [];
  for (const key of keys) {
    const values = properties[key];
    if (values?.length) {
      return values.map((value) =>
        typeof value === "string" ? value : value.caption ?? value.id,
      ).filter((value): value is string => Boolean(value));
    }
  }
  return [];
}

function sourceFor(id: string, datasets: string[], label: string) {
  return [
    {
      title: label,
      url: `${ENTITY_URL}/${encodeURIComponent(id)}/`,
      publisher: "OpenSanctions",
    },
    ...datasets.slice(0, 3).map((dataset) => ({
      title: dataset,
      url: `https://www.opensanctions.org/datasets/${encodeURIComponent(dataset)}/`,
      publisher: "OpenSanctions",
    })),
  ];
}

function normalizeEntity(raw: RawEntity): {
  id: string;
  name: string;
  schemaType: string;
  aliases: string[];
  datasets: string[];
  properties: Record<string, string[]>;
  sources: Array<{ title: string; url: string; publisher: string }>;
  sourceUpdatedAt: Date | null;
} {
  const datasets = raw.datasets ?? [];
  const name = raw.caption ?? scalarValues(raw.properties, ["name"])[0] ?? raw.id;
  const aliases = Array.from(new Set([
    ...scalarValues(raw.properties, ["alias", "aliases", "previousName"]),
  ].filter((alias) => alias !== name)));
  const properties = Object.fromEntries(
    Object.entries(raw.properties ?? {}).map(([key, values]) => [
      key,
      values.map((value) => typeof value === "string" ? value : value.caption ?? value.id).filter(
        (value): value is string => Boolean(value),
      ),
    ]),
  );
  return {
    id: raw.id,
    name,
    schemaType: raw.schema ?? "Thing",
    aliases,
    datasets,
    properties,
    sources: sourceFor(raw.id, datasets, "OpenSanctions entity record"),
    sourceUpdatedAt: raw.last_change ? new Date(raw.last_change) : null,
  };
}

async function fetchOpenSanctions<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { Authorization: `ApiKey ${apiKey()}`, Accept: "application/json" },
  });
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? "OpenSanctions rejected the API key. Check the project secret and try again."
      : `OpenSanctions returned ${response.status}.`;
    throw new OpenSanctionsError(message, response.status >= 500 ? 502 : response.status);
  }
  return response.json() as Promise<T>;
}

async function upsertEntity(entity: ReturnType<typeof normalizeEntity>): Promise<void> {
  await db.insert(entitiesTable).values(entity).onConflictDoUpdate({
    target: entitiesTable.id,
    set: {
      name: entity.name,
      schemaType: entity.schemaType,
      aliases: entity.aliases,
      datasets: entity.datasets,
      properties: entity.properties,
      sources: entity.sources,
      sourceUpdatedAt: entity.sourceUpdatedAt,
      updatedAt: new Date(),
    },
  });
}

function isFresh(entity: Entity): boolean {
  return Boolean(entity.updatedAt && Date.now() - entity.updatedAt.getTime() < CACHE_TTL_MS);
}

function matchScore(query: string, name: string, aliases: string[]): number {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const candidates = [name, ...aliases].map((candidate) => candidate.toLocaleLowerCase());
  if (candidates.some((candidate) => candidate === normalizedQuery)) return 1;
  if (candidates.some((candidate) => candidate.startsWith(normalizedQuery))) return 0.97;
  if (candidates.some((candidate) => candidate.includes(normalizedQuery))) return 0.92;
  const queryTokens = new Set(normalizedQuery.split(/\s+/).filter(Boolean));
  const bestOverlap = candidates.reduce((best, candidate) => {
    const candidateTokens = new Set(candidate.split(/\s+/).filter(Boolean));
    const overlap = Array.from(queryTokens).filter((token) => candidateTokens.has(token)).length;
    return Math.max(best, queryTokens.size ? overlap / queryTokens.size : 0);
  }, 0);
  return Math.min(0.89, 0.7 + bestOverlap * 0.18);
}

export async function searchSanctions(query: string, limit: number): Promise<ReturnType<typeof normalizeEntity>[]> {
  if (!process.env.OPEN_SANCTIONS_API_KEY) {
    return searchFreeFeedEntities(query, limit);
  }
  const raw = await fetchOpenSanctions<{ results?: RawEntity[] }>("/search/default", {
    q: query,
    limit,
    topics: "sanction",
    simple: "true",
    fuzzy: "true",
  });
  const entities = (raw.results ?? []).map(normalizeEntity);
  await Promise.all(entities.map(upsertEntity));
  return entities;
}

export async function getSanctionsEntity(id: string): Promise<ReturnType<typeof normalizeEntity>> {
  const cached = await db.select().from(entitiesTable).where(eq(entitiesTable.id, id)).limit(1);
  if (cached[0] && isFresh(cached[0])) {
    return {
      id: cached[0].id,
      name: cached[0].name,
      schemaType: cached[0].schemaType,
      aliases: cached[0].aliases,
      datasets: cached[0].datasets,
      properties: cached[0].properties,
      sources: cached[0].sources.map((source) => ({
        title: source.title,
        url: source.url,
        publisher: source.publisher ?? "OpenSanctions",
      })),
      sourceUpdatedAt: cached[0].sourceUpdatedAt,
    };
  }
  const raw = await fetchOpenSanctions<RawEntity>(`/entities/${encodeURIComponent(id)}`, {});
  const entity = normalizeEntity(raw);
  await upsertEntity(entity);
  return entity;
}

function adjacentEntity(value: string | RawEntity): RawEntity | null {
  return typeof value === "string" ? null : value;
}

export async function getSanctionsNetwork(id: string, depth: number): Promise<{ nodes: Array<{ id: string; label: string; schemaType: string; depth: number; datasets: string[] }>; edges: Array<{ source: string; target: string; relationshipType: string; confidence: string; citation: { title: string; url: string; publisher: string } }> }> {
  const root = await getSanctionsEntity(id);
  const nodes = new Map<string, { id: string; label: string; schemaType: string; depth: number; datasets: string[] }>([
    [root.id, { id: root.id, label: root.name, schemaType: root.schemaType, depth: 0, datasets: root.datasets }],
  ]);
  const edges: Array<{ source: string; target: string; relationshipType: string; confidence: string; citation: { title: string; url: string; publisher: string } }> = [];
  const seen = new Set<string>([id]);
  let frontier = [id];

  for (let currentDepth = 1; currentDepth <= depth; currentDepth += 1) {
    const next: string[] = [];
    for (const currentId of frontier) {
      const raw = await fetchOpenSanctions<RawAdjacent>(
        `/entities/${encodeURIComponent(currentId)}/adjacent`,
        { limit: 100 },
      );
      for (const [relationshipType, group] of Object.entries(raw.adjacent ?? {})) {
        for (const item of group.results ?? []) {
          const related = adjacentEntity(item);
          if (!related?.id) continue;
          const normalized = normalizeEntity(related);
          await upsertEntity(normalized);
          if (!nodes.has(related.id)) {
            nodes.set(related.id, {
              id: related.id,
              label: normalized.name,
              schemaType: normalized.schemaType,
              depth: currentDepth,
              datasets: normalized.datasets,
            });
          }
          edges.push({
            source: currentId,
            target: related.id,
            relationshipType,
            confidence: "confirmed",
            citation: {
              title: `OpenSanctions ${relationshipType} statement`,
              url: `${ENTITY_URL}/${encodeURIComponent(currentId)}/`,
              publisher: "OpenSanctions",
            },
          });
          const edgeExists = await db
            .select({ id: edgesTable.id })
            .from(edgesTable)
            .where(and(
              eq(edgesTable.sourceId, currentId),
              eq(edgesTable.targetId, related.id),
              eq(edgesTable.relationshipType, relationshipType),
            ))
            .limit(1);
          if (!edgeExists[0]) {
            await db.insert(edgesTable).values({
              sourceId: currentId,
              targetId: related.id,
              relationshipType,
              confidence: "confirmed",
              sourceCitation: {
                title: `OpenSanctions ${relationshipType} statement`,
                url: `${ENTITY_URL}/${encodeURIComponent(currentId)}/`,
                publisher: "OpenSanctions",
              },
            });
          }
          if (currentDepth < depth && !seen.has(related.id)) {
            seen.add(related.id);
            next.push(related.id);
          }
        }
      }
    }
    frontier = next;
  }
  return { nodes: Array.from(nodes.values()), edges };
}

export async function findPath(from: string, to: string) {
  const graph = await getSanctionsNetwork(from, 2);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const queue: string[] = [from];
  const previous = new Map<string, { node: string; edge: typeof graph.edges[number] }>();
  const seen = new Set(queue);
  while (queue.length) {
    const current = queue.shift()!;
    if (current === to) break;
    for (const edge of graph.edges.filter((candidate) => candidate.source === current || candidate.target === current)) {
      const next = edge.source === current ? edge.target : edge.source;
      if (!seen.has(next)) {
        seen.add(next);
        previous.set(next, { node: current, edge });
        queue.push(next);
      }
    }
  }
  if (!seen.has(to)) return { found: false, nodes: [], edges: [] };
  const pathNodes: string[] = [];
  const pathEdges: typeof graph.edges = [];
  let cursor = to;
  while (cursor !== from) {
    pathNodes.unshift(cursor);
    const step = previous.get(cursor);
    if (!step) break;
    pathEdges.unshift(step.edge);
    cursor = step.node;
  }
  pathNodes.unshift(from);
  return {
    found: true,
    nodes: pathNodes.map((node) => byId.get(node)).filter((node): node is typeof graph.nodes[number] => Boolean(node)),
    edges: pathEdges,
  };
}

export async function resolveEntityId(value: string): Promise<string> {
  const exact = await db
    .select({ id: entitiesTable.id })
    .from(entitiesTable)
    .where(eq(entitiesTable.id, value))
    .limit(1);
  if (exact[0]) return exact[0].id;
  const matches = await searchSanctions(value, 1);
  if (!matches[0]) throw new OpenSanctionsError(`No OpenSanctions entity matched “${value}”.`, 404);
  return matches[0].id;
}

export async function getSummary() {
  const [{ count: entityCount }] = await db.select({ count: sql<number>`count(*)` }).from(entitiesTable);
  const [{ count: edgeCount }] = await db.select({ count: sql<number>`count(*)` }).from(edgesTable);
  const recent = await db.select().from(entitiesTable).orderBy(desc(entitiesTable.updatedAt)).limit(5);
  const datasetRows = await db.select({ datasets: entitiesTable.datasets }).from(entitiesTable);
  const datasetCounts = new Map<string, number>();
  for (const row of datasetRows) {
    for (const dataset of row.datasets) datasetCounts.set(dataset, (datasetCounts.get(dataset) ?? 0) + 1);
  }
  return {
    totalEntities: Number(entityCount),
    totalEdges: Number(edgeCount),
    sourceStatus: process.env.OPEN_SANCTIONS_API_KEY || Number(entityCount) > 0 ? "ready" : "setup_required",
    datasets: Array.from(datasetCounts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    recentEntities: recent.map((entity) => ({
      id: entity.id,
      name: entity.name,
      schemaType: entity.schemaType,
      score: 1,
      datasets: entity.datasets,
      country: entity.properties.country?.[0] ?? entity.properties.nationality?.[0] ?? null,
      birthDate: entity.properties.birthDate?.[0] ?? null,
      sourceUrl: entity.sources[0]?.url ?? null,
    })),
    cacheUpdatedAt: recent[0]?.updatedAt?.toISOString() ?? null,
  };
}