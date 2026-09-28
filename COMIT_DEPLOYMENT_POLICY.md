# COMIT Git-First / No-Billing Policy

1. GitHub is the source of truth.
2. All changes must be made on a feature branch and reviewed before merging.
3. A merge to main is not permission to deploy.
4. Production deployment requires a separate explicit approval.
5. Cloudflare deployment is disabled for COMIT.
6. Automatic CI on push/pull request is disabled; verification is manual-only.
7. External email sending, publishing, paid APIs, paid AI and metered services remain off unless explicitly approved after a no-charge review.
8. Shared workspace authentication is verified-email only. Password login and password invites are disabled.
9. Supabase is the intended shared-record backend; apply `comit/supabase/workspace.sql` manually to a project you control.
10. Before any production push: run local typecheck, regression tests and production build, review the diff, then obtain explicit production approval.
