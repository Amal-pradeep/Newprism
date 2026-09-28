# COMIT Git-First / Controlled Deployment Policy

1. GitHub is the source of truth.
2. All changes must be made on a feature/release branch and reviewed before merging.
3. A merge to `main` is not permission to deploy.
4. Production deployment requires a separate explicit approval.
5. Cloudflare Workers is the prepared production target for COMIT.
6. Cloudflare deployment is **manual only**. No push/PR workflow may deploy automatically.
7. COMIT must use the existing Supabase backend; do not add D1, KV, R2, Workers AI, Queues, Workflows, Hyperdrive or other Cloudflare bindings unless separately approved.
8. Keep the Cloudflare account on the Workers Free plan unless the user explicitly approves a paid plan.
9. External email sending, publishing, paid APIs and metered AI remain approval-gated.
10. Shared workspace authentication is verified-email only. Password login and password invites remain disabled.
11. Before production deployment run: `npm ci`, `npm run typecheck`, `npm run regression`, `npm run build`, and `npm run cf:build`.
12. Preview in the Workers runtime with `npm run cf:preview` and smoke-test authentication, workspace, Mission Control, Team Pulse, wellness privacy and founder-gated outreach.
13. Only after those checks and explicit approval may `npm run cf:deploy` be run.
