# COMIT deployment

Production is deployed from the `main` branch of this repository to the Cloudflare Worker named `comit`.

- Root directory: `/comit`
- Build command: `npm ci && npm run cf:build`
- Deploy command: `npx wrangler deploy`
- Public URL: https://comit.amalpradeep25-53c.workers.dev/

The prospect list, team check-ins, and creative references work in each browser without paid services. These local edits stay in that browser. Shared Supabase-backed workflows require runtime configuration and are not enabled by the deployment alone. Never add credentials to this repository.
