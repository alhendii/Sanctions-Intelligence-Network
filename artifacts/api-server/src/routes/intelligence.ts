import { Router, type IRouter } from "express";
import {
  FindEntityPathQueryParams,
  GetDashboardSummaryResponse,
  GetEntityNetworkParams,
  GetEntityNetworkQueryParams,
  GetEntityParams,
  GetEntityResponse,
  GetEntityNetworkResponse,
  GetEntityCoverageParams,
  GetEntityCoverageQueryParams,
  GetEntityCoverageResponse,
  BatchScreenBody,
  BatchScreenResponse,
  ListWatchlistsResponse,
  CreateWatchlistBody,
  CreateWatchlistResponse,
  AddWatchlistEntityParams,
  AddWatchlistEntityBody,
  AddWatchlistEntityResponse,
  GetWatchlistEventsParams,
  GetWatchlistEventsResponse,
  CheckWatchlistParams,
  CheckWatchlistResponse,
  ListCasesResponse,
  CreateCaseBody,
  CreateCaseResponse,
  GetCaseParams,
  GetCaseResponse,
  AddCaseEntityParams,
  AddCaseEntityBody,
  AddCaseEntityResponse,
  AddCaseNoteParams,
  AddCaseNoteBody,
  AddCaseNoteResponse,
  SearchEntitiesQueryParams,
  SearchEntitiesResponse,
  DiscoverPeopleQueryParams,
  DiscoverPeopleResponse,
  SyncSourcesResponse,
} from "@workspace/api-zod";
import {
  findPath,
  getSanctionsEntity,
  getSanctionsNetwork,
  getSummary,
  OpenSanctionsError,
  resolveEntityId,
  searchSanctions,
} from "../lib/opensanctions";
import { getFreeFeedCatalog, syncFreeFeeds } from "../lib/free-feeds";
import { getEntityCoverage } from "../lib/coverage";
import {
  addCaseEntity,
  addCaseNote,
  addWatchlistEntity,
  checkWatchlist,
  createCase,
  createWatchlist,
  getCase,
  getWatchlistEvents,
  listCases,
  listWatchlists,
} from "../lib/research";
import { exportEntityData, exportNetworkData, toCsv, toPdf } from "../lib/exports";
import { discoverPeople } from "../lib/discovery";

const router: IRouter = Router();

function handleError(req: Parameters<NonNullable<Parameters<IRouter["get"]>[1]>>[0], res: Parameters<NonNullable<Parameters<IRouter["get"]>[1]>>[1], error: unknown): void {
  if (error instanceof OpenSanctionsError) {
    req.log.warn({ status: error.status, message: error.message }, "OpenSanctions request failed");
    res.status(error.status).json({ error: error.message });
    return;
  }
  req.log.error({ err: error }, "Sanctions intelligence request failed");
  res.status(500).json({ error: "Unable to load sanctions intelligence." });
}

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  try {
    res.json(GetDashboardSummaryResponse.parse(await getSummary()));
  } catch (error) {
    handleError(req, res, error);
  }
});

router.get("/discover/people", async (req, res): Promise<void> => {
  const parsed = DiscoverPeopleQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    res.json(DiscoverPeopleResponse.parse(await discoverPeople(parsed.data)));
  } catch (error) {
    handleError(req, res, error);
  }
});

router.get("/sources", async (req, res): Promise<void> => {
  try {
    res.json(await getFreeFeedCatalog());
  } catch (error) {
    handleError(req, res, error);
  }
});

router.post("/sources/sync", async (req, res): Promise<void> => {
  try {
    const feedIds = ["ofac_sdn", "ofac_consolidated", "un_consolidated", "ca_autonomous_consolidated"];
    const result = await syncFreeFeeds(feedIds);
    res.json(SyncSourcesResponse.parse(result));
  } catch (error) {
    handleError(req, res, error);
  }
});

router.get("/entities/:id/coverage", async (req, res): Promise<void> => {
  const params = GetEntityCoverageParams.safeParse(req.params);
  const query = GetEntityCoverageQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Invalid coverage request." });
    return;
  }
  try {
    res.json(GetEntityCoverageResponse.parse(await getEntityCoverage(params.data.id, query.data.refresh)));
  } catch (error) {
    handleError(req, res, error);
  }
});

router.get("/entities/search", async (req, res): Promise<void> => {
  const parsed = SearchEntitiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const query = parsed.data.q.trim().toLocaleLowerCase();
    const results = (await searchSanctions(parsed.data.q, parsed.data.limit)).map((entity) => {
      const candidates = [entity.name, ...entity.aliases].map((value) => value.toLocaleLowerCase());
      const score = entity.matchScore ?? (
        candidates.some((value) => value === query) ? 1 :
          candidates.some((value) => value.startsWith(query)) ? 0.97 :
            candidates.some((value) => value.includes(query)) ? 0.92 : 0.7
      );
      const reasons = entity.matchReasons ?? [
        ...(entity.name.toLocaleLowerCase() === query ? [{ label: "Exact name", detail: "The query exactly matches the canonical source name." }] : []),
        ...(entity.aliases.some((alias) => alias.toLocaleLowerCase() === query) ? [{ label: "Exact alias", detail: "The query exactly matches a source-provided alias." }] : []),
        { label: "Source fuzzy match", detail: `${Math.round(score * 100)}% ranked match from the source search.` },
      ];
      return {
      id: entity.id,
      name: entity.name,
      schemaType: entity.schemaType,
      score,
      matchReasons: reasons,
      datasets: entity.datasets,
      country: entity.properties.country?.[0] ?? entity.properties.nationality?.[0] ?? null,
      birthDate: entity.properties.birthDate?.[0] ?? null,
      sourceUrl: entity.sources[0]?.url ?? null,
      };
    });
    res.json(SearchEntitiesResponse.parse(results));
  } catch (error) {
    handleError(req, res, error);
  }
});

function parseBatchNames(csv: string) {
  return csv.split(/\r?\n/).map((line) => {
    const first = line.split(",")[0]?.trim().replace(/^["']|["']$/g, "");
    return first || "";
  }).filter((value) => value && !/^(name|entity|full name)$/i.test(value));
}

router.post("/batch-screen", async (req, res): Promise<void> => {
  const parsed = BatchScreenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const names = Array.from(new Set(parseBatchNames(parsed.data.csv))).slice(0, 500);
  const items = await Promise.all(names.map(async (input) => {
    try {
      const matches = await searchSanctions(input, parsed.data.limitPerName);
      return {
        input,
        status: matches.length ? "matched" : "no_match",
        matches: matches.map((entity) => ({
          id: entity.id,
          name: entity.name,
          schemaType: entity.schemaType,
          score: entity.matchScore ?? 0,
          datasets: entity.datasets,
          sourceUrl: entity.sources[0]?.url ?? null,
          reasons: entity.matchReasons ?? [{ label: "Source match", detail: "Returned by the configured source search." }],
        })),
        message: matches.length ? null : "No documented match returned by the configured sources.",
      };
    } catch (error) {
      return { input, status: "unavailable", matches: [], message: error instanceof Error ? error.message : "Source unavailable." };
    }
  }));
  res.json(BatchScreenResponse.parse({ items, generatedAt: new Date().toISOString() }));
});

router.get("/entities/:id", async (req, res): Promise<void> => {
  const parsed = GetEntityParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    res.json(GetEntityResponse.parse(await getSanctionsEntity(parsed.data.id)));
  } catch (error) {
    handleError(req, res, error);
  }
});

router.get("/entities/:id/network", async (req, res): Promise<void> => {
  const params = GetEntityNetworkParams.safeParse(req.params);
  const query = GetEntityNetworkQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Invalid network request." });
    return;
  }
  try {
    res.json(GetEntityNetworkResponse.parse(await getSanctionsNetwork(params.data.id, query.data.depth)));
  } catch (error) {
    handleError(req, res, error);
  }
});

router.get("/paths", async (req, res): Promise<void> => {
  const parsed = FindEntityPathQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [from, to] = await Promise.all([
      resolveEntityId(parsed.data.from),
      resolveEntityId(parsed.data.to),
    ]);
    res.json(await findPath(from, to));
  } catch (error) {
    handleError(req, res, error);
  }
});

router.get("/entities/:id/export", async (req, res): Promise<void> => {
  const params = GetEntityParams.safeParse(req.params);
  const format = String(req.query.format ?? "");
  if (!params.success || !["json", "csv", "pdf"].includes(format)) {
    res.status(400).json({ error: "Format must be json, csv, or pdf." });
    return;
  }
  try {
    const exported = exportEntityData(await getSanctionsEntity(params.data.id), format);
    res.type(exported.contentType).setHeader("Content-Disposition", `attachment; filename="cited-ledger-entity.${exported.extension}"`).send(exported.body);
  } catch (error) {
    handleError(req, res, error);
  }
});

router.get("/entities/:id/network/export", async (req, res): Promise<void> => {
  const params = GetEntityParams.safeParse(req.params);
  const format = String(req.query.format ?? "");
  const depth = Math.min(2, Math.max(1, Number(req.query.depth ?? 2)));
  if (!params.success || !["json", "csv", "pdf"].includes(format)) {
    res.status(400).json({ error: "Format must be json, csv, or pdf." });
    return;
  }
  try {
    const exported = exportNetworkData(await getSanctionsNetwork(params.data.id, depth), format);
    res.type(exported.contentType).setHeader("Content-Disposition", `attachment; filename="cited-ledger-network.${exported.extension}"`).send(exported.body);
  } catch (error) {
    handleError(req, res, error);
  }
});

router.post("/batch-screen/export", async (req, res): Promise<void> => {
  const format = String(req.body?.format ?? "");
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!["json", "csv", "pdf"].includes(format)) {
    res.status(400).json({ error: "Format must be json, csv, or pdf." });
    return;
  }
  const generatedAt = new Date().toISOString();
  if (format === "json") {
    res.type("application/json").setHeader("Content-Disposition", 'attachment; filename="cited-ledger-batch.json"').send(JSON.stringify({ generatedAt, items }, null, 2));
    return;
  }
  if (format === "csv") {
    const rows = items.flatMap((item: any) => item.matches?.length ? item.matches.map((match: any) => [item.input, item.status, match.name, match.id, match.score, match.datasets?.join(" | "), match.sourceUrl]) : [[item.input, item.status, "", "", "", "", ""]]);
    res.type("text/csv").setHeader("Content-Disposition", 'attachment; filename="cited-ledger-batch.csv"').send(toCsv(["input", "status", "match_name", "match_id", "score", "datasets", "source_url"], rows));
    return;
  }
  res.type("application/pdf").setHeader("Content-Disposition", 'attachment; filename="cited-ledger-batch.pdf"').send(toPdf("Cited Ledger batch screening", [`Generated: ${generatedAt}`, ...items.flatMap((item: any) => [`${item.input} — ${item.status}`, ...(item.matches ?? []).map((match: any) => `  ${match.name} | ${match.score} | ${match.sourceUrl}`)])]));
});

router.get("/watchlists", async (req, res): Promise<void> => {
  res.json(ListWatchlistsResponse.parse(await listWatchlists()));
});

router.post("/watchlists", async (req, res): Promise<void> => {
  const parsed = CreateWatchlistBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  res.status(201).json(CreateWatchlistResponse.parse(await createWatchlist(parsed.data.name)));
});

router.post("/watchlists/:id/entities", async (req, res): Promise<void> => {
  const params = AddWatchlistEntityParams.safeParse(req.params);
  const body = AddWatchlistEntityBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid watchlist entity." }); return; }
  res.status(201).json(AddWatchlistEntityResponse.parse(await addWatchlistEntity(params.data.id, body.data.entityId)));
});

router.get("/watchlists/:id/events", async (req, res): Promise<void> => {
  const params = GetWatchlistEventsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid watchlist." }); return; }
  res.json(GetWatchlistEventsResponse.parse(await getWatchlistEvents(params.data.id)));
});

router.post("/watchlists/:id/check", async (req, res): Promise<void> => {
  const params = CheckWatchlistParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid watchlist." }); return; }
  res.json(CheckWatchlistResponse.parse(await checkWatchlist(params.data.id)));
});

router.get("/cases", async (req, res): Promise<void> => {
  res.json(ListCasesResponse.parse(await listCases()));
});

router.post("/cases", async (req, res): Promise<void> => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  res.status(201).json(CreateCaseResponse.parse(await createCase(parsed.data.name, parsed.data.description)));
});

router.get("/cases/:id", async (req, res): Promise<void> => {
  const params = GetCaseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid case." }); return; }
  const result = await getCase(params.data.id);
  if (!result) { res.status(404).json({ error: "Case not found." }); return; }
  res.json(GetCaseResponse.parse(result));
});

router.post("/cases/:id/entities", async (req, res): Promise<void> => {
  const params = AddCaseEntityParams.safeParse(req.params);
  const body = AddCaseEntityBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid case entity." }); return; }
  res.status(201).json(AddCaseEntityResponse.parse(await addCaseEntity(params.data.id, body.data.entityId, body.data.note)));
});

router.post("/cases/:id/notes", async (req, res): Promise<void> => {
  const params = AddCaseNoteParams.safeParse(req.params);
  const body = AddCaseNoteBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid case note." }); return; }
  res.status(201).json(AddCaseNoteResponse.parse(await addCaseNote(params.data.id, body.data.body)));
});

export default router;