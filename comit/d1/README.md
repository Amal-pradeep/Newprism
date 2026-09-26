# COMIT shared workspace

`schema.sql` and `seed.sql` describe the Cloudflare D1 database named `comit-team`. They are safe to apply again. The production database was created on the Workers Free plan; no paid plan or overage authorization is required. D1 stops requests at the Free plan's daily limits.

The owner row is reserved for Amal with no password. In `/workspace`, expand **Amal: first-time password setup**. The browser generates a strong password and a SQL statement containing only its SHA-256 hash. Amal must personally paste the SQL into the Cloudflare D1 Console and keep the password private. Never store a plaintext password, session token, or Supabase service key in GitHub or D1. After signing in, Amal can create an individual random password for each of the four known teammates from the Access tab. Creating a new password signs that teammate out of existing sessions. The database column retains its original `code_hash` name for compatibility.

The workspace stores shared prospects, draft text, team check-ins, and HTTPS creative references. It does not send email or upload video files. Earlier local browser drafts and legacy Supabase records are not automatically copied into D1.


