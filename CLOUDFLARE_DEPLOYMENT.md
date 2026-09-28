# COMIT Cloudflare Workers Release Guide

Prepared for: COMIT by Prism of Stories  
Target: Cloudflare Workers using the existing OpenNext adapter  
Repository root: `comit/`

## Why this path

COMIT currently runs Next.js 15.5 and already includes `@opennextjs/cloudflare` and Wrangler. Cloudflare now recommends vinext for new Next.js migrations, but still documents OpenNext as the maintained path for existing OpenNext applications. For this release, avoiding a framework migration reduces deployment risk.

## Cloudflare resource policy

Use only:
- Workers runtime
- Worker static assets

Do **not** add without separate approval:
- D1
- KV
- R2
- Workers AI
- Queues
- Workflows
- Hyperdrive
- Durable Objects
- Cron Triggers

COMIT keeps Supabase as its database/auth backend.

## Free-plan target

Keep the Cloudflare account on Workers Free for the first release.

Current Free-plan constraints that matter for COMIT:
- 100,000 requests/day
- 10 ms CPU per HTTP request
- 128 MB memory
- 50 external subrequests/request
- 20,000 static asset files/version

Server-side rendering and authenticated routes must be smoke-tested because they can be more CPU-heavy than simple static requests.

## Files already prepared

- `open-next.config.ts`
- `wrangler.jsonc`
- `package.json` scripts
- `.env.example`
- `scripts/regression-guard.mjs`

The Wrangler config intentionally contains no D1/KV/R2/Workers-AI bindings.

## Local verification gate

From `comit/`:

```bash
npm ci
npm run typecheck
npm run regression
npm run build
npm run cf:build
npm run cf:preview
```

Smoke-test the preview:

1. `/api/health`
2. email-only sign-in
3. workspace access for all authorized teammates
4. Mission Control mission creation
5. Agent Home run/review flow
6. Team Pulse
7. private wellness page
8. private wellness data must not appear in Team Pulse
9. outreach preparation quality gate
10. founder approval requirement before sending
11. CRM/outreach reconciliation
12. no D1 or Cloudflare-service binding errors

## Required Cloudflare runtime secrets / variables

Configure these as Worker variables/secrets. Do not commit secret values.

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COMIT_SESSION_SECRET`

Required for Gmail outreach/reconciliation:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ORBIT_GMAIL_REFRESH_TOKEN`
- `COMIT_OUTREACH_FROM`
- `COMIT_OUTREACH_REPLY_TO`

Team overrides:
- `COMIT_AMAL_EMAIL`
- `COMIT_AADIL_EMAIL`
- `COMIT_JISHNU_EMAIL`

Optional:
- `N8N_BASE_URL`
- `N8N_WEBHOOK_SECRET`
- `N8N_AGENT_WEBHOOK_URL`
- `N8N_AGENT_SHARED_SECRET`
- `COMIT_MODEL_PROVIDER`
- `COMIT_OLLAMA_URL`
- `COMIT_OLLAMA_MODEL`
- `COMIT_ALLOW_PRIVATE_MODEL_HOST`
- `COMIT_MCP_ALLOWLIST`

Do not configure optional model/tool variables unless the corresponding no-charge/self-hosted service has been reviewed.

## Supabase redirect configuration

Before testing magic-link login on Cloudflare, add the final Worker URL and custom-domain URL to the Supabase Auth allowed redirect URLs.

Examples:
- `https://<worker>.workers.dev/auth/callback`
- `https://<future-comit-domain>/auth/callback`

The login route builds the redirect from the incoming request origin, so each deployed origin used for login must be allowlisted in Supabase.

## Manual deployment

Only after the verification gate passes:

```bash
npm run cf:deploy
```

Do not connect Cloudflare Workers Builds to `main` until automatic deployment on push is intentionally desired. Cloudflare's Git integration deploys connected branches automatically on pushes.

## Cloudflare Workers Builds settings if enabled later

If choosing Workers Builds later:
- repository: `Amal-pradeep/Newprism`
- root directory: `comit`
- Worker name must match `wrangler.jsonc`: `comit-by-prism`
- production branch: choose only after release approval
- build command: `npm run cf:build`
- deploy command: `npx wrangler deploy`
- add the required build/runtime variables and secrets in Cloudflare
- do not enable automatic production deployment until the release has passed preview smoke tests

## Production release rule

A Git merge is not deployment approval. Production deployment remains a separate explicit action.
