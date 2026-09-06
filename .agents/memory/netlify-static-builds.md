---
name: Netlify static builds
description: Deployment constraints for the Cited Ledger Vite frontend when hosted as a Netlify static site.
---

For Netlify static hosting, the frontend build must not require Replit-only runtime variables. Use safe build defaults for the Vite port and root base path, publish the app's actual `dist/public` directory, and include an SPA fallback for client-side routes.

**Why:** Netlify runs the Vite build without Replit's workflow `PORT` and `BASE_PATH` variables; otherwise the build fails before producing deployable files.

**How to apply:** Keep the static frontend deployment separate from the Express API. Proxy `/api/*` to a production API or configure a public API base URL before expecting live search and dossier requests to work on Netlify.