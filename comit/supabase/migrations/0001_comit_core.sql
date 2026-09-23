create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','manager','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  website text,
  industry text,
  location text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  name text not null,
  email text,
  phone text,
  source text,
  stage text not null default 'new' check (stage in ('new','researching','qualified','contacted','replied','meeting','won','lost','dormant')),
  score integer not null default 0 check (score between 0 and 100),
  owner_id uuid references auth.users(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  due_at timestamptz,
  assignee_id uuid references auth.users(id) on delete set null,
  prospect_id uuid references prospects(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  key text not null,
  status text not null default 'draft' check (status in ('draft','review','approved','running','paused','failed','completed')),
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

create table if not exists workflow_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  automation_id uuid references automations(id) on delete set null,
  idempotency_key text not null,
  status text not null default 'queued' check (status in ('queued','processing','awaiting_approval','completed','failed')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_type text not null,
  aggregate_type text,
  aggregate_id uuid,
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_prospects_org_stage on prospects(organization_id, stage);
create index if not exists idx_prospects_owner on prospects(owner_id);
create index if not exists idx_tasks_org_status_due on tasks(organization_id, status, due_at);
create index if not exists idx_executions_org_status on workflow_executions(organization_id, status);
create index if not exists idx_notifications_user_read on notifications(user_id, read_at);
create index if not exists idx_events_org_created on events(organization_id, created_at desc);

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table companies enable row level security;
alter table prospects enable row level security;
alter table tasks enable row level security;
alter table automations enable row level security;
alter table workflow_executions enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;
alter table events enable row level security;

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from organization_members m
  where m.organization_id = target_org and m.user_id = auth.uid()
); $$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from organization_members m
  where m.organization_id = target_org
    and m.user_id = auth.uid()
    and m.role in ('owner','admin','manager')
); $$;

create policy "members can read organizations" on organizations for select using (public.is_org_member(id));
create policy "members can read membership" on organization_members for select using (public.is_org_member(organization_id));
create policy "members can read companies" on companies for select using (public.is_org_member(organization_id));
create policy "members can manage companies" on companies for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy "members can read prospects" on prospects for select using (public.is_org_member(organization_id));
create policy "members can manage prospects" on prospects for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members can read tasks" on tasks for select using (public.is_org_member(organization_id));
create policy "members can manage tasks" on tasks for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members can read automations" on automations for select using (public.is_org_member(organization_id));
create policy "admins can manage automations" on automations for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy "members can read executions" on workflow_executions for select using (public.is_org_member(organization_id));
create policy "admins can manage executions" on workflow_executions for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy "users can read own notifications" on notifications for select using (public.is_org_member(organization_id) and (user_id = auth.uid() or user_id is null));
create policy "users can update own notifications" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members can read audit logs" on audit_logs for select using (public.is_org_member(organization_id));
create policy "members can read events" on events for select using (public.is_org_member(organization_id));
