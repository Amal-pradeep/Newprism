-- COMIT Creative Operations for Aneesh.
-- Extends the shared tasks table with design/creative workflow details.

create table if not exists public.creative_task_details (
  task_id uuid primary key references public.tasks(id) on delete cascade,
  organization_id uuid not null,
  client_name text,
  deliverable_type text,
  platform text,
  objective text,
  audience text,
  offer text,
  brief text,
  output_spec text,
  approval_state text not null default 'not_started'
    check (approval_state in ('not_started','internal_review','client_review','revision','approved')),
  revision_count integer not null default 0 check (revision_count >= 0),
  asset_links jsonb not null default '[]'::jsonb,
  client_feedback text,
  handoff_to text,
  handoff_note text,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creative_task_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  task_id uuid not null references public.tasks(id) on delete cascade,
  update_type text not null
    check (update_type in ('note','revision','review','approval','handoff','blocker','completion')),
  note text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists creative_task_details_org_idx
  on public.creative_task_details (organization_id,approval_state,updated_at desc);
create index if not exists creative_task_updates_task_idx
  on public.creative_task_updates (task_id,created_at desc);

alter table public.creative_task_details enable row level security;
alter table public.creative_task_updates enable row level security;

revoke all on public.creative_task_details from anon, authenticated, public;
revoke all on public.creative_task_updates from anon, authenticated, public;

grant select, insert, update, delete on public.creative_task_details to service_role;
grant select, insert, update, delete on public.creative_task_updates to service_role;

drop policy if exists "deny_direct_browser_access" on public.creative_task_details;
create policy "deny_direct_browser_access" on public.creative_task_details
as restrictive for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_direct_browser_access" on public.creative_task_updates;
create policy "deny_direct_browser_access" on public.creative_task_updates
as restrictive for all to anon, authenticated using (false) with check (false);

comment on table public.creative_task_details is 'Creative workflow details layered on COMIT tasks for Aneesh/design operations.';
comment on table public.creative_task_updates is 'Creative task revision/review/handoff history.';
