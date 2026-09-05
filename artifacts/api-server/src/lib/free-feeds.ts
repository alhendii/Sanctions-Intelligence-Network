import { like } from "drizzle-orm";
import { db, entitiesTable, type SourceCategory, type SourceCitation } from "@workspace/db";
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
  category: SourceCategory;
  jurisdiction: string;
  sourceStatus: "official" | "normalized" | "journalistic" | "unverified_context";
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
    jurisdiction: "United States",
    sourceStatus: "official",
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
    jurisdiction: "United States",
    sourceStatus: "official",
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
    jurisdiction: "European Union",
    sourceStatus: "official",
    description: "Official EU financial sanctions publication and downloadable consolidated files.",
  },
  {
    id: "un_consolidated",
    name: "UN Security Council Consolidated List",
    publisher: "United Nations Security Council",
    format: "XML + PDF",
    url: "https://scsanctions.un.org/resources/xml/en/consolidated.xml",
    mode: "automatic",
    status: "available",
    category: "sanctions",
    jurisdiction: "United Nations",
    sourceStatus: "official",
    description: "Official UN consolidated list, linked directly to the Security Council publication page.",
  },
  {
    id: "au_dfat_consolidated",
    name: "Australia Sanctions Consolidated List",
    publisher: "Australian Sanctions Office / DFAT",
    format: "XLSX",
    url: "https://www.dfat.gov.au/sites/default/files/Australian_Sanctions_Consolidated_List.xlsx",
    mode: "discovery",
    status: "available",
    category: "sanctions",
    jurisdiction: "Australia",
    sourceStatus: "official",
    description: "Australian list of individuals, entities, and vessels subject to targeted sanctions, travel bans, and related measures.",
  },
  {
    id: "ca_autonomous_consolidated",
    name: "Canadian Autonomous Sanctions List",
    publisher: "Global Affairs Canada",
    format: "XML + PDF",
    url: "https://www.international.gc.ca/world-monde/assets/office_docs/international_relations-relations_internationales/sanctions/sema-lmes.xml",
    mode: "automatic",
    status: "available",
    category: "sanctions",
    jurisdiction: "Canada",
    sourceStatus: "official",
    description: "Canadian consolidated list under SEMA and JVCFOA. The official page warns that the consolidated list is administrative and the underlying regulations control.",
  },
  {
    id: "ch_seco_sanctions",
    name: "Swiss Sanctions and Embargoes",
    publisher: "Swiss State Secretariat for Economic Affairs / SECO",
    format: "Web + data files",
    url: "https://www.seco.admin.ch/seco/en/home/Aussenwirtschaftspolitik_Wirtschaftliche_Zusammenarbeit/Wirtschaftsbeziehungen/exportkontrollen-und-sanktionen/sanktionen-embargos.html",
    mode: "discovery",
    status: "available",
    category: "sanctions",
    jurisdiction: "Switzerland",
    sourceStatus: "official",
    description: "Swiss sanctions and embargoes, including official measures and target information.",
  },
  {
    id: "jp_mofa_sanctions",
    name: "Japan Sanctions and Export Controls",
    publisher: "Japan Ministry of Foreign Affairs",
    format: "Web notices",
    url: "https://www.mofa.go.jp/policy/economy/sanction/index.html",
    mode: "discovery",
    status: "available",
    category: "sanctions",
    jurisdiction: "Japan",
    sourceStatus: "official",
    description: "Japanese sanctions and export-control notices, retained as official notices until a stable consolidated feed is validated.",
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
    jurisdiction: "United Kingdom",
    sourceStatus: "official",
    description: "UK government's current sanctions list and official download instructions.",
  },
  {
    id: "ru_mfa_notices",
    name: "Russian MFA Personal Sanctions Notices",
    publisher: "Russian Ministry of Foreign Affairs",
    format: "Web notices",
    url: "https://mid.ru/en/foreign_policy/international_safety/sanctions/",
    mode: "discovery",
    status: "available",
    category: "sanctions_notice",
    jurisdiction: "Russia",
    sourceStatus: "official",
    description: "Dated Russian MFA personal-sanctions and entry-ban notices. Cited Ledger does not represent these fragmented notices as one consolidated national list.",
  },
  {
    id: "cn_mofcom_unreliable_entities",
    name: "China Unreliable Entity List Notices",
    publisher: "China Ministry of Commerce",
    format: "Web notices",
    url: "https://english.mofcom.gov.cn/Policies/AnnouncementsOrders/art/2020/art_26e3c471536d443c944d60c91bacaf9.html",
    mode: "discovery",
    status: "available",
    category: "sanctions_notice",
    jurisdiction: "China",
    sourceStatus: "official",
    description: "Official MOFCOM rules and notices concerning China's Unreliable Entity List, retained with notice dates and original wording.",
  },
  {
    id: "cn_mfa_countermeasures",
    name: "China MFA Countermeasure Notices",
    publisher: "China Ministry of Foreign Affairs",
    format: "Web notices",
    url: "https://www.mfa.gov.cn/eng/",
    mode: "discovery",
    status: "available",
    category: "sanctions_notice",
    jurisdiction: "China",
    sourceStatus: "official",
    description: "Chinese MFA announcements of countermeasures and entry restrictions, treated as dated notices rather than a consolidated list.",
  },
  {
    id: "icj_cases",
    name: "International Court of Justice Cases",
    publisher: "International Court of Justice",
    format: "Case index",
    url: "https://www.icj-cij.org/cases",
    mode: "discovery",
    status: "available",
    category: "court_proceeding",
    jurisdiction: "International",
    sourceStatus: "official",
    description: "State disputes and advisory proceedings. ICJ records concern states and international-law questions, not individual criminal convictions.",
  },
  {
    id: "icc_cases",
    name: "International Criminal Court Cases",
    publisher: "International Criminal Court",
    format: "Case index",
    url: "https://www.icc-cpi.int/cases",
    mode: "discovery",
    status: "available",
    category: "court_proceeding",
    jurisdiction: "International",
    sourceStatus: "official",
    description: "Individual ICC cases, including warrants, summonses, alleged crimes, and case status. A warrant or allegation is not a conviction.",
  },
  {
    id: "icc_case_records",
    name: "International Criminal Court Case Records",
    publisher: "International Criminal Court",
    format: "Court-record index",
    url: "https://www.icc-cpi.int/case-records",
    mode: "discovery",
    status: "available",
    category: "court_proceeding",
    jurisdiction: "International",
    sourceStatus: "official",
    description: "Official ICC decisions, responses, requests, submissions, and other court records.",
  },
  {
    id: "icc_investigations",
    name: "International Criminal Court Situations",
    publisher: "International Criminal Court",
    format: "Situation index",
    url: "https://www.icc-cpi.int/situations-under-investigations",
    mode: "discovery",
    status: "available",
    category: "investigation",
    jurisdiction: "International",
    sourceStatus: "official",
    description: "Official ICC investigation and situation pages. The prosecutor's mandate includes examining incriminating and exonerating circumstances.",
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
    jurisdiction: "International",
    sourceStatus: "journalistic",
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
    jurisdiction: "International",
    sourceStatus: "journalistic",
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
    jurisdiction: "United States",
    sourceStatus: "official",
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
    jurisdiction: "International",
    sourceStatus: "official",
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
    jurisdiction: "International",
    sourceStatus: "normalized",
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
    jurisdiction: "International",
    sourceStatus: "unverified_context",
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

function nestedXmlValues(block: string, container: string, tag: string): string[] {
  return Array.from(block.matchAll(new RegExp(`<${container}\\b[\\s\\S]*?</${container}>`, "gi")))
    .flatMap((match) => allXmlValues(match[0], tag));
}

function dateValue(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function citationFor(feed: FeedSource, details: Partial<SourceCitation> = {}): SourceCitation {
  return {
    title: feed.name,
    url: feed.url,
    publisher: feed.publisher,
    category: feed.category,
    jurisdiction: feed.jurisdiction,
    sourceStatus: feed.sourceStatus,
    ...details,
  };
}

function parseOfacXml(xml: string, feedId: string, sourceUrl: string) {
  const feed = freeFeedCatalog.find((candidate) => candidate.id === feedId);
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
      sources: [citationFor(feed ?? {
        id: feedId,
        name: feedId === "ofac_sdn" ? "OFAC SDN" : "OFAC consolidated",
        publisher: "U.S. Treasury / OFAC",
        format: "XML",
        url: sourceUrl,
        mode: "automatic",
        status: "available",
        category: "sanctions",
        jurisdiction: "United States",
        sourceStatus: "official",
        description: "Official U.S. Treasury source record.",
      }, {
        title: `${feedId === "ofac_sdn" ? "OFAC SDN" : "OFAC consolidated"} record`,
        url: sourceUrl,
        measureType: "sanctions designation",
      })],
      sourceUpdatedAt: null as Date | null,
    };
  }).filter((entity) => entity.id.split(":")[1]);
}

function parseUnXml(xml: string, feed: FeedSource) {
  const generatedAt = dateValue(xml.match(/dateGenerated="([^"]+)"/i)?.[1]);
  const blocks = [
    ...Array.from(xml.matchAll(/<INDIVIDUAL\b[\s\S]*?<\/INDIVIDUAL>/gi)).map((match) => ({ block: match[0], schemaType: "Individual" })),
    ...Array.from(xml.matchAll(/<ENTITY\b[\s\S]*?<\/ENTITY>/gi)).map((match) => ({ block: match[0], schemaType: "Organization" })),
  ];
  return blocks.map(({ block, schemaType }) => {
    const dataId = xmlValue(block, "DATAID");
    const name = [
      xmlValue(block, "FIRST_NAME"),
      xmlValue(block, "SECOND_NAME"),
      xmlValue(block, "THIRD_NAME"),
      xmlValue(block, "FOURTH_NAME"),
    ].filter(Boolean).join(" ") || xmlValue(block, "NAME_ORIGINAL_SCRIPT") || dataId;
    const aliases = Array.from(new Set([
      ...allXmlValues(block, "ALIAS_NAME"),
      ...allXmlValues(block, "NAME_ORIGINAL_SCRIPT"),
    ].filter((alias) => alias && alias !== name)));
    const countries = nestedXmlValues(block, "NATIONALITY", "VALUE");
    const addresses = nestedXmlValues(block, "INDIVIDUAL_ADDRESS", "COUNTRY");
    const programs = [xmlValue(block, "UN_LIST_TYPE")].filter(Boolean);
    const listedOn = dateValue(xmlValue(block, "LISTED_ON"));
    const lastUpdated = dateValue(nestedXmlValues(block, "LAST_DAY_UPDATED", "VALUE")[0]);
    const source = citationFor(feed, {
      publishedAt: listedOn,
      updatedAt: lastUpdated || generatedAt,
      measureType: "UN Security Council sanctions designation",
      legalStatus: "designated",
    });
    return {
      id: `${feed.id}:${dataId}`,
      name,
      schemaType,
      aliases,
      datasets: [feed.id],
      properties: {
        ...(countries.length ? { country: Array.from(new Set(countries)) } : {}),
        ...(addresses.length ? { addressCountry: Array.from(new Set(addresses)) } : {}),
        ...(programs.length ? { sanctionsProgram: programs } : {}),
        ...(xmlValue(block, "REFERENCE_NUMBER") ? { referenceNumber: [xmlValue(block, "REFERENCE_NUMBER")] } : {}),
        ...(listedOn ? { listedOn: [listedOn] } : {}),
        ...(lastUpdated ? { sourceUpdatedAt: [lastUpdated] } : {}),
        ...(allXmlValues(block, "DESIGNATION").length ? { designation: allXmlValues(block, "DESIGNATION") } : {}),
        ...(xmlValue(block, "COMMENTS1") ? { remarks: [xmlValue(block, "COMMENTS1")] } : {}),
        legalStatus: ["designated"],
      },
      sources: [source],
      sourceUpdatedAt: lastUpdated ? new Date(lastUpdated) : generatedAt ? new Date(generatedAt) : null,
    };
  }).filter((entity) => entity.id.split(":")[1]);
}

function parseCanadaXml(xml: string, feed: FeedSource) {
  return Array.from(xml.matchAll(/<record\b[\s\S]*?<\/record>/gi)).map((match) => {
    const block = match[0];
    const lastName = xmlValue(block, "LastName-NomDeFamille");
    const givenName = xmlValue(block, "GivenName-Prenom");
    const entityOrShip = xmlValue(block, "EntityOrShip-EntiteOuNavire");
    const name = [givenName, lastName].filter(Boolean).join(" ") || entityOrShip || xmlValue(block, "Item-NumeroDarticle");
    const listedOn = dateValue(xmlValue(block, "DateOfListing-DateDinscription"));
    const birthDate = xmlValue(block, "DateOfBirthOrShipBuildDate-DateDeNaissanceOuDateDeConstructionDuNavire");
    const country = xmlValue(block, "Country-Pays").split("/")[0]?.trim();
    const item = xmlValue(block, "Item-NumeroDarticle");
    const schemaType = givenName || lastName ? "Individual" : "Organization";
    return {
      id: `${feed.id}:${item || name}:${encodeURIComponent(name)}`,
      name,
      schemaType,
      aliases: Array.from(new Set(allXmlValues(block, "Aliases-Alias").filter((alias) => alias !== name))),
      datasets: [feed.id],
      properties: {
        ...(country ? { country: [country] } : {}),
        ...(listedOn ? { listedOn: [listedOn] } : {}),
        ...(birthDate ? { birthDate: [birthDate] } : {}),
        ...(xmlValue(block, "Schedule-Annexe") ? { schedule: [xmlValue(block, "Schedule-Annexe")] } : {}),
        ...(xmlValue(block, "ShipIMONumber-NumeroOMIDuNavire") ? { imoNumber: [xmlValue(block, "ShipIMONumber-NumeroOMIDuNavire")] } : {}),
        legalStatus: ["designated"],
      },
      sources: [citationFor(feed, {
        publishedAt: listedOn,
        measureType: "Canadian sanctions designation",
        legalStatus: "designated",
      })],
      sourceUpdatedAt: listedOn ? new Date(listedOn) : null,
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
    const entities = feed.id === "un_consolidated"
      ? parseUnXml(xml, feed)
      : feed.id === "ca_autonomous_consolidated"
        ? parseCanadaXml(xml, feed)
        : parseOfacXml(xml, feed.id, feed.url);
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
    .where(like(entitiesTable.id, "%:%"));
  const indexedIds = new Set(indexed.flatMap((row) => row.datasets));
  return freeFeedCatalog.map((feed) => ({
    ...feed,
    status: indexedIds.has(feed.id) ? "indexed" : feed.status,
  }));
}
