import { asc, desc, sql } from "drizzle-orm";
import { db, entitiesTable } from "@workspace/db";

type PersonRecord = {
  id: string;
  name: string;
  schemaType: string;
  aliases: string[];
  datasets: string[];
  properties: Record<string, string[]>;
  sources: Array<{ title: string; url: string; publisher?: string | null }>;
  createdAt: Date;
};

type DiscoveryFilters = {
  q?: string;
  country?: string;
  organization?: string;
  industry?: string;
  dataset?: string;
  program?: string;
  sort?: "recent" | "name";
  limit: number;
};

const propertyKeys = {
  countries: ["country", "nationality", "jurisdiction", "citizenship"],
  organizations: ["organization", "organisation", "employer", "memberOf", "affiliation"],
  industries: ["industry", "sector", "businessSector"],
  programs: ["sanctionsProgram", "program"],
  roles: ["position", "title", "occupation", "role"],
};

function valuesFor(properties: Record<string, string[]>, keys: string[]): string[] {
  return Array.from(new Set(keys.flatMap((key) => properties[key] ?? []).map((value) => value.trim()).filter(Boolean)));
}

function normalizePerson(row: PersonRecord) {
  return {
    id: row.id,
    name: row.name,
    schemaType: row.schemaType,
    aliases: row.aliases,
    datasets: row.datasets,
    countries: valuesFor(row.properties, propertyKeys.countries),
    organizations: valuesFor(row.properties, propertyKeys.organizations),
    industries: valuesFor(row.properties, propertyKeys.industries),
    programs: valuesFor(row.properties, propertyKeys.programs),
    roles: valuesFor(row.properties, propertyKeys.roles),
    birthDate: row.properties.birthDate?.[0] ?? null,
    addedAt: row.createdAt.toISOString(),
    sourceUrl: row.sources[0]?.url ?? null,
  };
}

function facet(values: string[][]) {
  const counts = new Map<string, number>();
  for (const group of values) {
    for (const value of group) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts, ([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, 100);
}

function includes(value: string | undefined, candidates: string[]): boolean {
  if (!value) return true;
  const target = value.toLocaleLowerCase();
  return candidates.some((candidate) => candidate.toLocaleLowerCase() === target);
}

export async function discoverPeople(filters: DiscoveryFilters) {
  const rows = await db.select({
    id: entitiesTable.id,
    name: entitiesTable.name,
    schemaType: entitiesTable.schemaType,
    aliases: entitiesTable.aliases,
    datasets: entitiesTable.datasets,
    properties: entitiesTable.properties,
    sources: entitiesTable.sources,
    createdAt: entitiesTable.createdAt,
  }).from(entitiesTable)
    .where(sql`lower(${entitiesTable.schemaType}) in ('individual', 'person')`)
    .orderBy(filters.sort === "name" ? asc(entitiesTable.name) : desc(entitiesTable.createdAt));

  const people = rows.map(normalizePerson);
  const query = filters.q?.trim().toLocaleLowerCase();
  const filtered = people.filter((person) => {
    const text = [
      person.name,
      ...person.aliases,
      ...person.countries,
      ...person.organizations,
      ...person.industries,
      ...person.programs,
      ...person.roles,
    ].join(" ").toLocaleLowerCase();
    return (!query || text.includes(query))
      && includes(filters.country, person.countries)
      && includes(filters.organization, person.organizations)
      && includes(filters.industry, person.industries)
      && includes(filters.dataset, person.datasets)
      && includes(filters.program, person.programs);
  });

  return {
    items: filtered.slice(0, filters.limit),
    total: filtered.length,
    generatedAt: new Date().toISOString(),
    facets: {
      countries: facet(people.map((person) => person.countries)),
      organizations: facet(people.map((person) => person.organizations)),
      industries: facet(people.map((person) => person.industries)),
      datasets: facet(people.map((person) => person.datasets)),
      programs: facet(people.map((person) => person.programs)),
      roles: facet(people.map((person) => person.roles)),
    },
  };
}