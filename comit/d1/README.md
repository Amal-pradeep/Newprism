# COMIT shared workspace

`schema.sql` and `seed.sql` describe the Cloudflare D1 database named `comit-team`. They are safe to apply again. The production database was created on the Workers Free plan; no paid plan or overage authorization is required. D1 stops requests at the Free plan's daily limits.

The owner row is reserved for Amal with no access code. The owner must set their own access code hash in the Cloudflare D1 console before anyone can sign in. Never store a plaintext code, session token, or Supabase service key in GitHub or D1. After signing in, Amal can issue individual codes to the four known teammates from the Access tab. Issuing a new code signs that teammate out of existing sessions.

The workspace stores shared prospects, draft text, team check-ins, and HTTPS creative references. It does not send email or upload video files. Earlier local browser drafts and legacy Supabase records are not automatically copied into D1.

