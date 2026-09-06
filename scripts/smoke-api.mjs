const baseUrl = (process.env.API_BASE_URL ?? "http://127.0.0.1:8080").replace(
  /\/+$/,
  "",
);
const query = process.env.SMOKE_QUERY ?? "Putin";

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: "application/json" },
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${body.slice(0, 300)}`);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${path} did not return JSON.`);
  }
}

const health = await getJson("/api/healthz");
if (health.status !== "ok") {
  throw new Error(`Health check returned an unexpected status: ${health.status}`);
}

const results = await getJson(
  `/api/entities/search?q=${encodeURIComponent(query)}&limit=3`,
);
if (!Array.isArray(results) || !results[0]?.id) {
  throw new Error(`Search returned no entity for "${query}".`);
}

const dossier = await getJson(
  `/api/entities/${encodeURIComponent(results[0].id)}`,
);
if (dossier.id !== results[0].id || !dossier.name) {
  throw new Error("Dossier did not match the first search result.");
}

console.log(
  JSON.stringify(
    {
      baseUrl,
      health: health.status,
      query,
      searchResults: results.length,
      dossier: { id: dossier.id, name: dossier.name },
    },
    null,
    2,
  ),
);