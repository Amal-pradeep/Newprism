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


## 2026-09-24 — No-billing hard stop

**Request:** Enforce the rule that COMIT must not generate bills on any platform.

**Decision:** Free/no-charge tiers only. Do not enable paid plans, paid integrations, usage-based overages, or platform resources without a verified no-cost hard cap. A quota that can roll into a charge is not acceptable; automations must stop or degrade when a free quota is exhausted.

**Cloudflare check:** The Cloudflare account used for the Worker deployment was authenticated for deployment, but its token did not grant Billing Read access. The Cloudflare account’s active Workers billing plan could not be verified in this review. Cloudflare’s current public pricing documentation says Workers Free is the default and is quota-limited, while Workers Paid starts at $5/month and can incur usage charges. No plan-change, payment-method, or other billing setting was changed. Until account billing status is verified, a zero-billing guarantee for the existing live Worker is unconfirmed.

**Implementation policy:** Keep external or usage-metered automation integrations disabled unless their no-charge behavior and limits are verified. Prefer local deterministic workflows and free-tier services that reject over-quota requests without billing. Record all future COMIT changes and cost checks here. Source: [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
