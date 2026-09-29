-- COMIT Meta Creative Director + approval-gated publishing.
-- Server-only access. Every external Meta write must reference an approved action.

create table if not exists public.meta_creative_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_name text not null,
  brand_name text,
  objective text not null check (objective in ('awareness','traffic','leads','messages','sales','engagement')),
  channel text not null check (channel in ('instagram_organic','facebook_organic','meta_ads')),
  placement text,
  media_type text not null default 'image' check (media_type in ('image','video')),
  source_asset_url text,
  creative_package jsonb not null default '{}'::jsonb,
  selected_variant_id text,
  quality_evaluation jsonb not null default '{}'::jsonb,
  meta_payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in (
    'draft','creative_review','creative_approved','publish_review','approved','rejected',
    'processing_on_meta','paused_on_meta','published','active_on_meta','failed'
  )),
  created_by text not null,
  reviewed_by text,
  reviewed_at timestamptz,
  meta_object_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meta_action_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  creative_id uuid not null references public.meta_creative_drafts(id) on delete cascade,
  action text not null check (action in ('creative_review','publish_organic','create_paused_ad','activate_ad')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','consumed')),
  requested_by text not null,
  reviewed_by text,
  reviewed_at timestamptz,
  consumed_at timestamptz,
  proposed_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.meta_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  creative_id uuid references public.meta_creative_drafts(id) on delete set null,
  meta_object_id text,
  object_type text not null check (object_type in ('post','ad','campaign','adset')),
  window_start timestamptz,
  window_end timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  source text not null default 'meta_api',
  created_at timestamptz not null default now()
);

create index if not exists meta_creative_drafts_org_status_idx
  on public.meta_creative_drafts (organization_id,status,created_at desc);
create index if not exists meta_action_approvals_status_idx
  on public.meta_action_approvals (organization_id,status,created_at desc);
create index if not exists meta_action_approvals_creative_idx
  on public.meta_action_approvals (creative_id,created_at desc);
create index if not exists meta_performance_snapshots_object_idx
  on public.meta_performance_snapshots (organization_id,meta_object_id,created_at desc);

alter table public.meta_creative_drafts enable row level security;
alter table public.meta_action_approvals enable row level security;
alter table public.meta_performance_snapshots enable row level security;

revoke all on public.meta_creative_drafts from anon, authenticated, public;
revoke all on public.meta_action_approvals from anon, authenticated, public;
revoke all on public.meta_performance_snapshots from anon, authenticated, public;

grant select, insert, update, delete on public.meta_creative_drafts to service_role;
grant select, insert, update, delete on public.meta_action_approvals to service_role;
grant select, insert, update, delete on public.meta_performance_snapshots to service_role;

drop policy if exists "deny_direct_browser_access" on public.meta_creative_drafts;
create policy "deny_direct_browser_access"
on public.meta_creative_drafts
as restrictive for all to anon, authenticated
using (false) with check (false);

drop policy if exists "deny_direct_browser_access" on public.meta_action_approvals;
create policy "deny_direct_browser_access"
on public.meta_action_approvals
as restrictive for all to anon, authenticated
using (false) with check (false);

drop policy if exists "deny_direct_browser_access" on public.meta_performance_snapshots;
create policy "deny_direct_browser_access"
on public.meta_performance_snapshots
as restrictive for all to anon, authenticated
using (false) with check (false);

comment on table public.meta_creative_drafts is 'COMIT creative packages for Meta. Drafting is internal; publishing is approval-gated.';
comment on table public.meta_action_approvals is 'Explicit review gate for organic publish, paused ad creation, and paid-ad activation.';
comment on table public.meta_performance_snapshots is 'Meta performance snapshots used for reviewed creative learning.';
