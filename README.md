# Cited Ledger

Cited Ledger is a source-first sanctions intelligence and OSINT research workspace. It helps investigators search public records, inspect source-backed entity dossiers, trace cited relationships, compare source coverage, and preserve the difference between sourced facts, unverified context, and investigator notes.

## What it provides

- Fuzzy entity search with transparent match reasons
- Source-backed dossiers with aliases, dates, countries, programs, identifiers, and citations
- Official source registry with jurisdiction, category, and availability labels
- Cached public-feed search through PostgreSQL
- OpenSanctions-backed relationship expansion when configured
- OFAC SDN, OFAC Consolidated, UN, and Canadian XML ingestion without requiring OpenSanctions
- Batch screening, watchlists, research cases, notes, and exports
- Relationship networks and shortest-path analysis
- Separate discovery context from official sanctions and justice records
- Explicit ICJ state-proceeding versus ICC individual-proceeding explanations

## Evidence and language rules

Cited Ledger is designed to apply the same evidence rules to every country, nationality, organization, and political side.

- A sanctions designation is not a criminal conviction.
- News coverage and co-occurrence do not establish identity or relationships.
- Name similarity ranks candidates; it does not resolve identity automatically.
- Allegation, investigation, warrant or summons, charge, judgment, conviction, acquittal, and ICJ state proceeding are separate legal statuses.
- The ICJ handles disputes between states and advisory proceedings. The ICC handles individual criminal proceedings.
- A person is not labeled a “war criminal” unless an explicit final judicial conviction supports that wording.
- Official, normalized, journalistic, and unverified-context sources remain visibly distinct.

## Repository layout

```text
artifacts/
  api-server/                 Express API and source ingestion
  sanctions-intelligence/     React/Vite research workspace
  mockup-sandbox/             Component preview server
lib/
  api-spec/                   OpenAPI source of truth and Orval config
  api-client-react/           Generated React Query client
  api-zod/                    Generated server validation schemas
  db/                         Drizzle schema and PostgreSQL client
scripts/                      Workspace helper scripts
```

## Requirements

- Node.js 24
- pnpm
- PostgreSQL

Install dependencies from the repository root:

```bash
pnpm install
```

The API server requires `DATABASE_URL`. `OPEN_SANCTIONS_API_KEY` is optional:

- Without it, public OFAC, UN, and Canadian feed records can still be searched and cited.
- With it, the server can use OpenSanctions for live intelligence and relationship expansion.
- Keep the key server-side; it must never be exposed to the browser or committed to the repository.

## Running locally

The repository is configured with separate API and web workflows. Start them with:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/sanctions-intelligence run dev
```

In Replit, use the configured **API Server** and **web** workflows so the preview proxy and `PORT` environment variable are handled correctly.

### Netlify frontend and separate API

The Netlify site is static, so it cannot serve the Express routes itself. Publish
the **API Server** artifact separately, then set `VITE_API_BASE_URL` in the
Netlify site's production environment to that API's origin (without a trailing
`/api`, for example `https://api.example.com`). The generated browser client
will keep calling `/api/*` in local/Replit previews, and will prepend the
configured production origin in the Netlify bundle.

Only `VITE_*` values are exposed to the browser. Keep `DATABASE_URL`,
`SESSION_SECRET`, and `OPEN_SANCTIONS_API_KEY` configured on the API deployment
only; never add them to Netlify or rename them with a `VITE_` prefix.

The source registry exposes a controlled official-feed refresh endpoint:

```bash
curl -X POST http://localhost:8080/api/sources/sync
```

Run the same health, search, and dossier smoke check against a local or
published API by setting `API_BASE_URL`:

```bash
API_BASE_URL=https://api.example.com pnpm smoke:api
```

The exact local port may be supplied by the active workflow.

## Development commands

Run the full typecheck:

```bash
pnpm run typecheck
```

Build the workspace:

```bash
pnpm run build
```

Regenerate API clients and validation schemas after changing the OpenAPI contract:

```bash
pnpm --filter @workspace/api-spec run codegen
```

The codegen command also preserves the generated Zod barrel workaround required by the workspace’s current Zod setup. Do not manually re-export the generated type barrel from `lib/api-zod/src/index.ts`.

For development database schema changes:

```bash
pnpm --filter @workspace/db run push
```

Use this only against the development database. Production schema changes should go through the normal Replit publish flow.

## API and data model conventions

- `lib/api-spec/openapi.yaml` is the API contract source of truth.
- `lib/db/src/schema/sanctions.ts` stores cached entities, relationships, and structured citation metadata.
- `artifacts/api-server/src/lib/free-feeds.ts` owns the public source catalog and supported XML ingestion.
- `artifacts/api-server/src/lib/opensanctions.ts` owns the OpenSanctions adapter, normalization, fallback behavior, and relationship expansion.
- `artifacts/api-server/src/routes/intelligence.ts` exposes dashboard, discovery, dossier, network, source, research, and export endpoints.
- Dates from PostgreSQL are serialized to ISO strings before generated response schemas validate them.

When adding a source, preserve its publisher, jurisdiction, source category, source status, URL, publication or update date, measure or proceeding type, and legal status whenever available. If a source is unavailable or only discovery-oriented, show that state rather than silently treating it as indexed.

## License

This repository is licensed under the MIT License.