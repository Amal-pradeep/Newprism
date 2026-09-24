-- COMIT Team OS: durable role profiles, individual work lanes and morning playbooks.
create table if not exists public.team_profiles (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, email text not null, role text not null, focus text not null, initials text not null,
  logo_key text not null default 'prism', color_token text not null default 'neutral', daily_target text,
  automation_lane text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, email)
);
create table if not exists public.team_task_templates (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  team_profile_id uuid not null references public.team_profiles(id) on delete cascade, title text not null, description text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')), due_hour smallint not null default 10 check (due_hour between 0 and 23),
  workflow_key text, enabled boolean not null default true, created_at timestamptz not null default now()
);
alter table public.tasks add column if not exists assignee_email text;
alter table public.tasks add column if not exists automation_key text;
alter table public.tasks add column if not exists source text default 'manual';
create index if not exists idx_team_profiles_org_active on public.team_profiles(organization_id, active);
create index if not exists idx_team_task_templates_org_enabled on public.team_task_templates(organization_id, enabled);
create index if not exists idx_tasks_assignee_email on public.tasks(organization_id, assignee_email, status);
alter table public.team_profiles enable row level security;
alter table public.team_task_templates enable row level security;
drop policy if exists "members can read team profiles" on public.team_profiles;
drop policy if exists "admins can manage team profiles" on public.team_profiles;
drop policy if exists "members can read task templates" on public.team_task_templates;
drop policy if exists "admins can manage task templates" on public.team_task_templates;
create policy "members can read team profiles" on public.team_profiles for select using (public.comit_is_org_member(organization_id));
create policy "admins can manage team profiles" on public.team_profiles for all using (public.comit_is_org_admin(organization_id)) with check (public.comit_is_org_admin(organization_id));
create policy "members can read task templates" on public.team_task_templates for select using (public.comit_is_org_member(organization_id));
create policy "admins can manage task templates" on public.team_task_templates for all using (public.comit_is_org_admin(organization_id)) with check (public.comit_is_org_admin(organization_id));
insert into public.team_profiles (organization_id,name,email,role,focus,initials,logo_key,color_token,daily_target,automation_lane) values
('acda1757-1698-405a-8451-5674316ceeaf','Amal','amalpradeep25@gmail.com','Founder · Command','Revenue, approvals, strategy','AP','prism','amber','3 high-value decisions','command'),
('acda1757-1698-405a-8451-5674316ceeaf','Aadil','aadil.sudhir279@gmail.com','Sales · Outreach','Prospecting, qualification, follow-ups','AS','sales','blue','20 qualified prospects + follow-ups','sales'),
('acda1757-1698-405a-8451-5674316ceeaf','Aneesh','msaneeshnath@gmail.com','Creative · Growth','Posters, carousels, reels, client creative growth','AN','creative','violet','3 revenue-focused creatives','creative'),
('acda1757-1698-405a-8451-5674316ceeaf','Jishnu','jishnu@prismofstories.com','Operations · Client Growth','Delivery, client growth, systems and QA','JI','operations','emerald','5 delivery/retention actions','operations')
on conflict (organization_id,email) do update set role=excluded.role,focus=excluded.focus,initials=excluded.initials,logo_key=excluded.logo_key,color_token=excluded.color_token,daily_target=excluded.daily_target,automation_lane=excluded.automation_lane,updated_at=now();
insert into public.team_task_templates (organization_id,team_profile_id,title,description,priority,due_hour,workflow_key)
select 'acda1757-1698-405a-8451-5674316ceeaf',p.id,'Morning revenue review','Review pipeline, replies, meetings and blockers; choose the 3 decisions that unlock revenue today.','urgent',9,'morning.command' from public.team_profiles p where p.email='amalpradeep25@gmail.com' and not exists (select 1 from public.team_task_templates t where t.organization_id=p.organization_id and t.team_profile_id=p.id and t.workflow_key='morning.command');
insert into public.team_task_templates (organization_id,team_profile_id,title,description,priority,due_hour,workflow_key)
select 'acda1757-1698-405a-8451-5674316ceeaf',p.id,'Prospect and follow-up sprint','Work the highest-scoring new prospects, reconcile replies and advance qualified conversations.','high',10,'morning.sales' from public.team_profiles p where p.email='aadil.sudhir279@gmail.com' and not exists (select 1 from public.team_task_templates t where t.organization_id=p.organization_id and t.team_profile_id=p.id and t.workflow_key='morning.sales');
insert into public.team_task_templates (organization_id,team_profile_id,title,description,priority,due_hour,workflow_key)
select 'acda1757-1698-405a-8451-5674316ceeaf',p.id,'Creative growth batch','Produce the 3 highest-priority client/prospect creatives identified by COMIT and attach each to a revenue objective.','high',11,'morning.creative' from public.team_profiles p where p.email='msaneeshnath@gmail.com' and not exists (select 1 from public.team_task_templates t where t.organization_id=p.organization_id and t.team_profile_id=p.id and t.workflow_key='morning.creative');
insert into public.team_task_templates (organization_id,team_profile_id,title,description,priority,due_hour,workflow_key)
select 'acda1757-1698-405a-8451-5674316ceeaf',p.id,'Delivery and client-growth QA','Check active client deliverables, overdue work, retention risks and next commercial opportunity.','high',10,'morning.operations' from public.team_profiles p where p.email='jishnu@prismofstories.com' and not exists (select 1 from public.team_task_templates t where t.organization_id=p.organization_id and t.team_profile_id=p.id and t.workflow_key='morning.operations');
