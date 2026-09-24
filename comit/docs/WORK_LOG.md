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

**Deployment status:** At the time of this foundation change, no Cloudflare Worker existed and runtime credentials/settings had not been configured.

## 2026-09-24 — Live Cloudflare Workers deployment

**Request:** Publish COMIT from `cloudflare-migration` and verify a public link without changing `main`.

**What changed:**
- Deployed commit `68da33d` to the Cloudflare Worker `comit`.
- Cloudflare assigned the public `workers.dev` URL recorded in the README. No custom domain was configured.
- The first deploy attempt hit a Windows permission error while clearing a pre-existing generated build directory. Retried successfully from a clean detached checkout; the existing checkout and `main` were left untouched.

**Verification:**
- A clean `npm ci` completed and `npm run cf:deploy` completed successfully. Next.js production build, TypeScript validation during build, OpenNext packaging, asset upload, and Worker deployment all passed.
- Live GET requests returned HTTP 200 for `/`, `/login`, and `/api/health`; the health response reported `ok: true` and service `COMIT`.
- Dependency installation reported two audit findings (one moderate and one high); they were not changed as part of this deployment.

**Deployment status and limits:** The Worker is live at the public `workers.dev` URL, version `fc76a43c-b4d6-487d-a2a2-04c8cda95e6e`. No COMIT integration settings/secrets were present or added, so Supabase, n8n, Gmail, and session-backed workflows are not configured on this deployment. This confirms the live app shell and health endpoint only; it does not complete the production readiness checklist. The documented Vercel production target and `main` remain unchanged.
