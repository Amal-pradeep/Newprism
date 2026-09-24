# COMIT Work Log

This log records substantive product, engineering, operations, and deployment work for COMIT. New entries are added as work proceeds. Each entry should describe the request, changes and decisions, verification results, and deployment status. Never include credentials or secret values.

## 2026-09-24 — Cloudflare Workers preview foundation

**Request:** Prepare COMIT for Cloudflare on the existing `cloudflare-migration` branch while leaving `main` unchanged.

**What changed:**
- Added the OpenNext Cloudflare adapter and Wrangler to the `comit/` app, with build, local preview, deployment, and type-generation scripts.
- Added the OpenNext configuration, Wrangler Worker and asset settings, static asset caching headers, and ignores for generated or local-only files.
- Changed the Cloudflare GitHub workflow to validate the COMIT app on the migration branch and pull requests. It has no production deployment job.
- Corrected the outreach regression guard to accept the opt-out wording already used by COMIT.

**Decisions and scope:**
- Kept the app on Next.js 15 and used OpenNext, which supports the current Next.js 15 line. No R2 cache binding or other new Cloudflare data store was added.
- Kept this work on `cloudflare-migration`; `main` remained at `f1fb23a` while this change was prepared.
- Git was installed on the connected Windows desktop, and the repository was cloned over HTTPS without entering or exposing credentials.

**Verification:**
- `npm ci`, `npm run typecheck`, `npm run regression`, `npm run build`, and `npm run cf:build` passed locally.
- The local Workers preview returned HTTP 200 for `/` and `/api/health`.
- GitHub Actions passed for COMIT CI and COMIT Cloudflare validation on commit `121b284`.

**Deployment status:** Not deployed to Cloudflare production. Cloudflare runtime credentials and bindings were not configured or verified by this change.
