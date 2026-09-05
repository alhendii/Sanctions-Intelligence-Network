---
name: OpenSanctions and generated validation
description: Live source authentication and the workspace's current OpenAPI/Zod generator compatibility constraints.
---

OpenSanctions API requests require an `Authorization: ApiKey ...` header. Official XML feeds are the safe no-key fallback for entity search, while relationship expansion remains OpenSanctions-backed. Canadian item numbers are not globally unique, so include a stable name discriminator in cached IDs.

**Why:** The public documentation endpoint responds with an authentication error even though the service and documentation are public. Several other sources have official pages but unstable, fragmented, or format-specific downloads, so they should not be scraped as if they were one unified feed.

**How to apply:** Keep the key server-side as `OPEN_SANCTIONS_API_KEY`, route upstream calls through the API server, use official XML for no-key search fallback, and label discovery-only sources clearly. When ingesting Canada, do not key records by item number alone. After OpenAPI codegen, confirm the generated Zod barrel still avoids duplicate parameter exports under the workspace's Zod 3 dependency; serialize Drizzle dates to ISO strings before parsing generated response schemas.