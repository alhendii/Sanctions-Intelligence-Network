import { db, entitiesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const GLEIF_API = "https://api.gleif.org/api/v1";

type GleifRecord = {
  id: string;
  attributes?: {
    entity?: {
      legalName?: { name?: string };
      otherNames?: Array<{ name?: string }>;
      legalAddress?: { country?: string; city?: string };
      headquartersAddress?: { country?: string; city?: string };
      category?: string;
      registrationAuthority?: { registrationAuthorityID?: string; registrationAuthorityEntityID?: string };
    };
  };
  relationships?: Record<string, { links?: { related?: string } }>;
};

function normalize(record: GleifRecord) {
  const entity = record.attributes?.entity ?? {};
  const name = entity.legalName?.name || record.id;
  const aliases = (entity.otherNames ?? []).map((item) => item.name).filter((value): value is string => Boolean(value));
  const country = entity.legalAddress?.country || entity.headquartersAddress?.country;
  return {
    id: `gleif:${record.id}`,
    name,
    schemaType: "Organization",
    aliases: Array.from(new Set(aliases.filter((alias) => alias !== name))),
    datasets: ["gleif_lei_registry"],
    properties: {
      lei: [record.id],
      ...(country ? { country: [country] } : {}),
      ...(entity.category ? { category: [entity.category] } : {}),
      ...(entity.legalAddress?.city ? { legalCity: [entity.legalAddress.city] } : {}),
      ...(entity.registrationAuthority?.registrationAuthorityID ? { registrationAuthority: [entity.registrationAuthority.registrationAuthorityID] } : {}),
      ...(entity.registrationAuthority?.registrationAuthorityEntityID ? { registrationEntityId: [entity.registrationAuthority.registrationAuthorityEntityID] } : {}),
    },
    sources: [{
      title: "GLEIF LEI record",
      url: `https://search.gleif.org/#/record/${record.id}`,
      publisher: "Global Legal Entity Identifier Foundation",
    }],
    sourceUpdatedAt: null as Date | null,
  };
}

async function fetchRecord(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/vnd.api+json, application/json" } });
  if (!response.ok) throw new Error(`GLEIF returned ${response.status}`);
  return response.json() as Promise<{ data?: GleifRecord | GleifRecord[] }>;
}

export async function searchCorporateRegistry(query: string, limit: number) {
  const url = new URL(`${GLEIF_API}/lei-records`);
  url.searchParams.set("filter[entity.legalName]", query);
  url.searchParams.set("page[size]", String(Math.min(limit, 10)));
  const response = await fetchRecord(url.toString());
  const records = Array.isArray(response.data) ? response.data : [];
  const entities = records.map(normalize);
  for (const entity of entities) {
    await db.insert(entitiesTable).values(entity).onConflictDoUpdate({
      target: entitiesTable.id,
      set: { name: entity.name, aliases: entity.aliases, datasets: entity.datasets, properties: entity.properties, sources: entity.sources, updatedAt: new Date() },
    });
  }
  return entities;
}

export async function getCorporateNetwork(entityId: string) {
  const lei = entityId.replace(/^gleif:/, "");
  const recordResponse = await fetchRecord(`${GLEIF_API}/lei-records/${encodeURIComponent(lei)}`);
  const record = Array.isArray(recordResponse.data) ? recordResponse.data[0] : recordResponse.data;
  if (!record) return { nodes: [], edges: [] };
  const root = normalize(record);
  const nodes = [{ id: root.id, label: root.name, schemaType: root.schemaType, depth: 0, datasets: root.datasets }];
  const edges: Array<{ source: string; target: string; relationshipType: string; confidence: string; citation: { title: string; url: string; publisher: string } }> = [];
  const relationshipNames = [
    ["direct-parent", "direct parent"],
    ["ultimate-parent", "ultimate parent"],
  ] as const;
  for (const [key, label] of relationshipNames) {
    const relatedUrl = record.relationships?.[key]?.links?.related;
    if (!relatedUrl) continue;
    try {
      const relatedResponse = await fetchRecord(relatedUrl);
      const relatedRecord = Array.isArray(relatedResponse.data) ? relatedResponse.data[0] : relatedResponse.data;
      if (!relatedRecord) continue;
      const related = normalize(relatedRecord);
      nodes.push({ id: related.id, label: related.name, schemaType: related.schemaType, depth: 1, datasets: related.datasets });
      edges.push({
        source: root.id,
        target: related.id,
        relationshipType: label,
        confidence: "confirmed",
        citation: { title: `GLEIF ${label} relationship`, url: `https://search.gleif.org/#/record/${lei}`, publisher: "Global Legal Entity Identifier Foundation" },
      });
      await db.insert(entitiesTable).values(related).onConflictDoUpdate({
        target: entitiesTable.id,
        set: { name: related.name, aliases: related.aliases, datasets: related.datasets, properties: related.properties, sources: related.sources, updatedAt: new Date() },
      });
    } catch {
      // An unavailable parent record is omitted, never replaced with a guessed relationship.
    }
  }
  return { nodes, edges };
}