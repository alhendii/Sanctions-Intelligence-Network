import { like } from "drizzle-orm";
import { db, entitiesTable } from "@workspace/db";
import { searchCachedEntities } from "./search-index";
import { searchCorporateRegistry } from "./corporate";

type FeedSource = {
  id: string;
  name: string;
  publisher: string;
  format: string;
  url: string;
  mode: string;
  status: string;
  category: "sanctions" | "pep" | "adverse_media" | "corporate_registry" | "investigative_database";
  description: string;
};

export const freeFeedCatalog: FeedSource[] = [
  {
    id: "ofac_sdn",
    name: "OFAC Specially Designated Nationals",
    publisher: "U.S. Treasury / OFAC",
    format: "XML + CSV",
    url: "https://sanctionslistservice.ofac.treas.gov/api/publicationpreview/exports/sdn.xml",
    mode: "automatic",
    status: "available",
    category: "sanctions",
    description: "Primary U.S. Treasury SDN publication with names, programs, aliases, and identifiers.",
  },
  {
    id: "ofac_consolidated",
    name: "OFAC Consolidated Sanctions",
    publisher: "U.S. Treasury / OFAC",
    format: "XML + CSV",
    url: "https://sanctionslistservice.ofac.treas.gov/api/publicationpreview/exports/consolidated.xml",
    mode: "automatic",
    status: "available",
    category: "sanctions",
    description: "U.S. Treasury consolidated non-SDN and other sanctions list records.",
  },
  {
    id: "eu_consolidated",
    name: "EU Financial Sanctions Files",
    publisher: "European Commission",
    format: "XML",
    url: "https://finance.ec.europa.eu/eu-and-world/sanctions-restrictive-measures/overview-sanctions-and-related-information_en",
    mode: "discovery",
    status: "available",
    category: "sanctions",
    description: "Official EU financial sanctions publication and downloadable consolidated files.",
  },
  {
    id: "un_consolidated",
    name: "UN Security Council Consolidated List",
    publisher: "United Nations Security Council",
    format: "XML + PDF",
    url: "https://main.un.org/securitycouncil/en/content/un-sc-consolidated-list",
    mode: "discovery",
    status: "available",
    category: "sanctions",
    description: "Official UN consolidated list, linked directly to the Security Council publication page.",
  },
  {
    id: "uk_ofsi",
    name: "UK Sanctions List",
    publisher: "UK Office of Financial Sanctions Implementation",
    format: "CSV + XML",
    url: "https://www.gov.uk/government/publications/the-uk-sanctions-list",
    mode: "discovery",
    status: "available",
    category: "sanctions",
    description: "UK government's current sanctions list and official download instructions.",
  },
  {
    id: "icij_offshore_leaks",
    name: "Offshore Leaks Database",
    publisher: "International Consortium of Investigative Journalists",
    format: "Web + bulk data",
    url: "https://offshoreleaks.icij.org/",
    mode: "discovery",
    status: "available",
    category: "investigative_database",
    description: "Searchable Panama Papers, Paradise Papers, Pandora Papers, Bahamas Leaks, and Offshore Leaks records.",
  },
  {
    id: "occrp_aleph",
    name: "OCCRP Aleph",
    publisher: "Organized Crime and Corruption Reporting Project",
    format: "Web + API",
    url: "https://aleph.occrp.org/",
    mode: "discovery",
    status: "available",
    category: "investigative_database",
    description: "Journalism research platform for leaked documents, company registries, sanctions, and related records.",
  },
  {
    id: "state_registries",
    name: "U.S. State Corporate Registries",
    publisher: "State Secretaries of State",
    format: "Fragmented web sources",
    url: "https://www.nass.org/canadian-and-us-state-corporate-registration-information",
    mode: "discovery",
    status: "fragmented",
    category: "corporate_registry",
    description: "Directory of state-level corporate registries; no single unified API is claimed.",
  },
  {
    id: "gleif_lei",
    name: "GLEIF Legal Entity Identifier Search",
    publisher: "Global Legal Entity Identifier Foundation",
    format: "JSON API",
    url: "https://www.gleif.org/en/lei-data/gleif-concatenated-file",
    mode: "automatic",
    status: "available",
    category: "corporate_registry",
    description: "Validated public legal-entity registry used for cited direct- and ultimate-parent relationships when available.",
  },
  {
    id: "pep_reference",
    name: "PEP reference datasets",
    publisher: "OpenSanctions",
    format: "Dataset/API",
    url: "https://www.opensanctions.org/datasets/",
    mode: "discovery",
    status: "setup_required",
    category: "pep",
    description: "Politically exposed person datasets are a separate research category; Cited Ledger does not silently merge PEP status with sanctions status.",
  },
  {
    id: "adverse_media_context",
    name: "GDELT and Google News related coverage",
    publisher: "GDELT / Google News",
    format: "JSON API + RSS",
    url: "https://www.gdeltproject.org/",
    mode: "automatic",
    status: "available",
    category: "adverse_media",
    description: "Unverified media context shown separately from sanctions and PEP records; coverage is not an adverse-media determination.",
  },
];

function xmlValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim() ?? "";
}

function allXmlValues(block: string, tag: string): string[] {
  return Array.from(block.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "gi")))
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function parseOfacXml(xml: string, feedId: string, sourceUrl: string) {
  return Array.from(xml.matchAll(/<sdnEntry\b[\s\S]*?<\/sdnEntry>/gi)).map((match) => {
    const block = match[0];
    const uid = xmlValue(block, "uid");
    const firstName = xmlValue(block, "firstName");
    const lastName = xmlValue(block, "lastName");
    const name = [firstName, lastName].filter(Boolean).join(" ") || xmlValue(block, "name") || uid;
    const aliases = Array.from(block.matchAll(/<aka\b[\s\S]*?<\/aka>/gi))
      .map((aka) => [xmlValue(aka[0], "firstName"), xmlValue(aka[0], "lastName")].filter(Boolean).join(" "))
      .filter(Boolean);
    const programs = allXmlValues(block, "program");
    const countries = allXmlValues(block, "country");
    const properties: Record<string, string[]> = {
      ...(programs.length ? { sanctionsProgram: programs } : {}),
      ...(countries.length ? { country: Array.from(new Set(countries)) } : {}),
      ...(xmlValue(block, "sdnType") ? { entityType: [xmlValue(block, "sdnType")] } : {}),
      ...(xmlValue(block, "remarks") ? { remarks: [xmlValue(block, "remarks")] } : {}),
      ...(xmlValue(block, "dateOfBirth") ? { birthDate: [xmlValue(block, "dateOfBirth")] } : {}),
    };
    return {
      id: `${feedId}:${uid}`,
      name,
      schemaType: xmlValue(block, "sdnType") || "Thing",
      aliases: Array.from(new Set(aliases.filter((alias) => alias !== name))),
      datasets: [feedId],
      properties,
      sources: [{ title: `${feedId === "ofac_sdn" ? "OFAC SDN" : "OFAC consolidated"} record`, url: sourceUrl, publisher: "U.S. Treasury / OFAC" }],
      sourceUpdatedAt: null as Date | null,
    };
  }).filter((entity) => entity.id.split(":")[1]);
}

async function fetchFeed(url: string): Promise<string> {
  const response = await fetch(url, { headers: { Accept: "application/xml,text/xml" } });
  if (!response.ok) throw new Error(`Free feed returned ${response.status}`);
  return response.text();
}

export async function syncFreeFeeds(feedIds = ["ofac_sdn", "ofac_consolidated"]) {
  let entityCount = 0;
  for (const feedId of feedIds) {
    const feed = freeFeedCatalog.find((candidate) => candidate.id === feedId);
    if (!feed || feed.mode !== "automatic") continue;
    const xml = await fetchFeed(feed.url);
    const entities = parseOfacXml(xml, feed.id, feed.url);
    for (let offset = 0; offset < entities.length; offset += 500) {
      const batch = entities.slice(offset, offset + 500);
      await db.insert(entitiesTable).values(batch).onConflictDoUpdate({
        target: entitiesTable.id,
        set: {
          name: entitiesTable.name,
          schemaType: entitiesTable.schemaType,
          aliases: entitiesTable.aliases,
          datasets: entitiesTable.datasets,
          properties: entitiesTable.properties,
          sources: entitiesTable.sources,
          updatedAt: new Date(),
        },
      });
    }
    entityCount += entities.length;
  }
  return { entityCount, feedIds };
}

export async function searchFreeFeedEntities(query: string, limit: number) {
  let cached = await searchCachedEntities(query, limit);
  if (!cached.length) {
    await syncFreeFeeds();
    cached = await searchCachedEntities(query, limit);
  }
  if (cached.length < limit) {
    try {
      await searchCorporateRegistry(query, Math.max(1, limit - cached.length));
      cached = await searchCachedEntities(query, limit);
    } catch {
      // GLEIF is additive coverage; an unavailable registry never blocks sanctions search.
    }
  }
  return cached;
}

export async function getFreeFeedCatalog(): Promise<FeedSource[]> {
  const indexed = await db
    .select({ datasets: entitiesTable.datasets })
    .from(entitiesTable)
    .where(like(entitiesTable.id, "ofac_%"));
  const indexedIds = new Set(indexed.flatMap((row) => row.datasets));
  return freeFeedCatalog.map((feed) => ({
    ...feed,
    status: indexedIds.has(feed.id) ? "indexed" : feed.status,
  }));
}
