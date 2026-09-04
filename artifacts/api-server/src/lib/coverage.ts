import { and, desc, eq } from "drizzle-orm";
import { coverageTable, db } from "@workspace/db";
import { getSanctionsEntity } from "./opensanctions";

type CoverageStatus = { feed: string; status: string; message: string | null };

function decode(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").trim();
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decode(match[1]) : "";
}

async function gdelt(query: string) {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", `"${query}"`);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "12");
  url.searchParams.set("sort", "HybridRel");
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`GDELT returned ${response.status}`);
  const payload = await response.json() as { articles?: Array<Record<string, string>> };
  return (payload.articles ?? []).map((article) => ({
    feed: "gdelt",
    title: article.title || "Untitled GDELT result",
    url: article.url,
    publisher: article.domain || "GDELT",
    summary: article.seendate ? `Seen by GDELT on ${article.seendate}.` : null,
    publishedAt: article.seendate ? new Date(article.seendate.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}).*$/, "$1-$2-$3T$4:$5:$6Z")) : null,
  })).filter((article) => Boolean(article.url)).slice(0, 12);
}

async function googleNews(query: string) {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
  const response = await fetch(url, { headers: { Accept: "application/rss+xml, application/xml" } });
  if (!response.ok) throw new Error(`Google News returned ${response.status}`);
  const xml = await response.text();
  return Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map((match) => {
    const block = match[0];
    const published = tag(block, "pubDate");
    return {
      feed: "google_news",
      title: tag(block, "title"),
      url: tag(block, "link"),
      publisher: tag(block, "source") || "Google News",
      summary: null,
      publishedAt: published ? new Date(published) : null,
    };
  }).filter((article) => Boolean(article.title && article.url)).slice(0, 12);
}

async function loadFeed(feed: "gdelt" | "google_news", query: string) {
  return feed === "gdelt" ? gdelt(query) : googleNews(query);
}

function serializeCoverage(row: typeof coverageTable.$inferSelect) {
  const date = (value: Date | null) => value && !Number.isNaN(value.getTime()) ? value.toISOString() : null;
  return {
    ...row,
    publishedAt: date(row.publishedAt),
    fetchedAt: row.fetchedAt.toISOString(),
  };
}

export async function getEntityCoverage(entityId: string, refresh = false) {
  const entity = await getSanctionsEntity(entityId);
  const existing = await db.select().from(coverageTable).where(eq(coverageTable.entityId, entityId)).orderBy(desc(coverageTable.fetchedAt));
  const fresh = existing[0]?.fetchedAt && Date.now() - existing[0].fetchedAt.getTime() < 15 * 60_000;
  if (existing.length && fresh && !refresh) {
    return {
      items: existing.map(serializeCoverage),
      feeds: [{ feed: "gdelt", status: "cached", message: null }, { feed: "google_news", status: "cached", message: null }],
    };
  }

  const query = entity.name;
  const results = await Promise.allSettled((["gdelt", "google_news"] as const).map((feed) => loadFeed(feed, query)));
  const feeds: CoverageStatus[] = [];
  const items = [];
  for (let index = 0; index < results.length; index += 1) {
    const feed = index === 0 ? "gdelt" : "google_news";
    const result = results[index];
    if (result.status === "fulfilled") {
      await db.delete(coverageTable).where(and(eq(coverageTable.entityId, entityId), eq(coverageTable.feed, feed)));
      const rows = result.value.map((item) => ({ ...item, entityId, query, verification: "unverified_context" as const }));
      if (rows.length) await db.insert(coverageTable).values(rows);
      const stored = await db.select().from(coverageTable)
        .where(and(eq(coverageTable.entityId, entityId), eq(coverageTable.feed, feed)))
        .orderBy(desc(coverageTable.fetchedAt));
      items.push(...stored.map(serializeCoverage));
      feeds.push({ feed, status: "available", message: null });
    } else {
      feeds.push({ feed, status: "unavailable", message: result.reason instanceof Error ? result.reason.message : "Feed unavailable." });
    }
  }
  return { items, feeds };
}