# Cited Ledger — Sanctions Intelligence Network

Cited Ledger is a source-first OSINT workspace for searching sanctioned entities and tracing cited relationships.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/sanctions-intelligence/src/App.tsx` — responsive research workspace and routes
- `artifacts/api-server/src/lib/opensanctions.ts` — OpenSanctions adapter, normalization, and Postgres cache
- `artifacts/api-server/src/lib/free-feeds.ts` — public feed catalog plus automatic OFAC XML ingestion/fallback search
- `artifacts/api-server/src/routes/intelligence.ts` — dashboard, search, dossier, network, and path endpoints
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/sanctions.ts` — `entities` and `edges` cache tables
- `artifacts/sanctions-intelligence/src/index.css` — Ledgerline visual tokens and global styles

## Architecture decisions

- OpenSanctions is the preferred relationship source, while official OFAC SDN and Consolidated XML feeds provide a free fallback for entity search.
- The API key stays server-side in `OPEN_SANCTIONS_API_KEY`; the browser only talks to the shared API server.
- Official sanctions lists, dated sanctions notices, international court indexes, investigations, corporate registries, ICIJ, OCCRP, GDELT, and Google News remain source-labeled and separate when formats or legal status differ.
- Search results and relationship records are cached in Postgres to reduce repeated upstream requests and preserve a local research trail.
- Relationship confidence is represented explicitly and citations are returned with every graph edge.

## Product

Cited Ledger provides a dashboard overview, fuzzy name search, source-backed entity dossiers, an official source registry, expandable relationship context, international justice reference links, and shortest-path tracing between two entities.

## User preferences

- Do not fabricate placeholder sanctions data when the OpenSanctions source is unavailable.

## Gotchas

- Search automatically falls back to public OFAC XML feeds when `OPEN_SANCTIONS_API_KEY` is absent; relationship expansion still requires an OpenSanctions key.
- The generated Zod package currently uses Zod 3; after codegen, keep the Zod barrel exporting generated API schemas only to avoid a generated parameter-name collision.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
