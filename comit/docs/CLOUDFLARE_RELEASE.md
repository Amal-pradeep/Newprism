# COMIT Cloudflare release requirements

The application is built from the `comit/` directory with `npm ci`, `npm run verify`, and `npm run cf:build`. The GitHub Cloudflare workflow currently validates builds only; it does not publish a Worker.

Production needs a Cloudflare account with the `comit` Worker configured and a deployment credential. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and a unique random `COMIT_SESSION_SECRET` in the deployment. Configure the two public Supabase values at build time as well. Keep the service key and session secret server-side.

Enable Supabase Auth email sign-in and add `https://<production-host>/auth/callback` to the allowed redirect URLs. The default magic-link email template must include `{{ .ConfirmationURL }}`. Approved teammates are enrolled on their first verified sign-in. Each user must open their own emailed link; entering an email address alone cannot create a session. Rotate `COMIT_SESSION_SECRET` on release to invalidate sessions issued by the former unverified login implementation.

After deployment, open `/api/health`, complete an actual emailed sign-in for every teammate, verify Shahid's creative workspace, and exercise the protected APIs. Configure Gmail OAuth and sender-domain authentication separately before enabling outreach. Build validation and a health response alone do not prove those integrations work.
