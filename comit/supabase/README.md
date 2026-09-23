# COMIT Supabase

Supabase is the canonical source of truth.

Implementation requirements:
- Auth through Supabase Auth.
- Organization membership tables.
- RLS on every organization-owned table.
- UUID primary keys.
- created_at and updated_at on mutable entities.
- Audit events for privileged mutations.
- Idempotency keys for external side effects.
- Database migrations are versioned and reviewed before production.

The first migration will establish organizations, organization_members, prospects, companies, contacts, tasks, automations, workflow_executions, notifications, audit_logs, and events.