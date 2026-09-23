create table if not exists public.outreach_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','sent','failed')),
  requested_by text,
  approved_by text,
  approved_at timestamptz,
  to_email text not null,
  cc_emails text[] not null default array['amalpradeep25@gmail.com','aadil.sudhir279@gmail.com']::text[],
  subject text not null,
  body text not null,
  gmail_message_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospect_research (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  source_url text,
  research_summary text,
  fit_reason text,
  public_contact_verified boolean not null default false,
  researched_at timestamptz not null default now()
);

create index if not exists idx_outreach_approvals_org_status on public.outreach_approvals(organization_id,status,created_at desc);
create index if not exists idx_outreach_approvals_prospect on public.outreach_approvals(prospect_id);
create index if not exists idx_prospect_research_prospect on public.prospect_research(prospect_id);

alter table public.outreach_approvals enable row level security;
alter table public.prospect_research enable row level security;

create policy "comit members read outreach approvals" on public.outreach_approvals for select using (public.comit_is_org_member(organization_id));
create policy "comit members manage outreach approvals" on public.outreach_approvals for all using (public.comit_is_org_member(organization_id)) with check (public.comit_is_org_member(organization_id));
create policy "comit members read prospect research" on public.prospect_research for select using (public.comit_is_org_member(organization_id));
create policy "comit members manage prospect research" on public.prospect_research for all using (public.comit_is_org_member(organization_id)) with check (public.comit_is_org_member(organization_id));
