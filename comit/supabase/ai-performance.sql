-- COMIT AI/sales performance indexes.
-- Git-first: review before manually applying to Supabase.
-- These address current Supabase advisor findings without dropping existing indexes.

create index if not exists outreach_replies_approval_idx
  on public.outreach_replies (approval_id);

create index if not exists team_task_templates_profile_idx
  on public.team_task_templates (team_profile_id);

-- Do not automatically drop "unused" or duplicate indexes from production.
-- Review query plans and actual usage before removal.
