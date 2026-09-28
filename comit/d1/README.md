# COMIT shared workspace

`schema.sql` and `seed.sql` describe the Cloudflare D1 database named `comit-team`. They are safe to apply again. The production database was created on the Workers Free plan; no paid plan or overage authorization is required. D1 stops requests at the Free plan's daily limits.

Approved teammates sign in through COMIT's verified email link. The same signed session opens `/workspace`; the D1 member row is created on first verified access. The owner email has the owner role; disabled D1 members stay blocked. Supabase email authentication and the production callback URL must be configured. No password or manual D1 setup is needed. Legacy password hashes and workspace sessions in D1 are ignored by the new authorization path.

The workspace stores shared prospects, draft text, team check-ins, and HTTPS creative references. It does not send email or upload video files. Earlier local browser drafts and legacy Supabase records are not automatically copied into D1.


