import { Router, type IRouter } from "express";
import {
  FindEntityPathQueryParams,
  GetDashboardSummaryResponse,
  GetEntityNetworkParams,
  GetEntityNetworkQueryParams,
  GetEntityParams,
  GetEntityResponse,
  GetEntityNetworkResponse,
  SearchEntitiesQueryParams,
  SearchEntitiesResponse,
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
import { getFreeFeedCatalog } from "../lib/free-feeds";

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

router.get("/sources", async (req, res): Promise<void> => {
  try {
    res.json(await getFreeFeedCatalog());
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
    const results = (await searchSanctions(parsed.data.q, parsed.data.limit)).map((entity) => ({
      id: entity.id,
      name: entity.name,
      schemaType: entity.schemaType,
      score: entity.name.toLocaleLowerCase() === parsed.data.q.toLocaleLowerCase()
        ? 1
        : entity.name.toLocaleLowerCase().startsWith(parsed.data.q.toLocaleLowerCase())
          ? 0.97
          : 0.86,
      datasets: entity.datasets,
      country: entity.properties.country?.[0] ?? entity.properties.nationality?.[0] ?? null,
      birthDate: entity.properties.birthDate?.[0] ?? null,
      sourceUrl: entity.sources[0]?.url ?? null,
    }));
    res.json(SearchEntitiesResponse.parse(results));
  } catch (error) {
    handleError(req, res, error);
  }
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

export default router;