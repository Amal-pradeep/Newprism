-- COMIT outreach follow-up engine: persistent cadence + approval-gated follow-up messages.
alter table public.outreach_approvals
  add column if not exists message_type text not null default 'initial';

alter table public.outreach_approvals
  add column if not exists followup_id uuid;

alter table public.outreach_approvals
  add column if not exists gmail_thread_id text;

alter table public.outreach_approvals
  drop constraint if exists outreach_approvals_message_type_check;

alter table public.outreach_approvals
  add constraint outreach_approvals_message_type_check
  check (message_type in ('initial','followup'));

create table if not exists public.outreach_followups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  source_approval_id uuid references public.outreach_approvals(id) on delete set null,
  sequence_no integer not null check (sequence_no between 1 and 4),
  label text not null,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','prepared','sent','completed','skipped')),
  prepared_approval_id uuid,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_approval_id, sequence_no)
);

create index if not exists idx_outreach_followups_org_due
  on public.outreach_followups(organization_id, status, due_at);
create index if not exists idx_outreach_followups_prospect
  on public.outreach_followups(prospect_id, sequence_no);
create index if not exists idx_outreach_approvals_type_status
  on public.outreach_approvals(organization_id, message_type, status, created_at desc);

alter table public.outreach_followups enable row level security;

drop policy if exists "comit members access outreach followups" on public.outreach_followups;
create policy "comit members access outreach followups"
  on public.outreach_followups for all
  using (public.comit_is_org_member(organization_id))
  with check (public.comit_is_org_member(organization_id));

insert into public.outreach_followups (
  organization_id, prospect_id, source_approval_id, sequence_no, label, due_at
)
select
  a.organization_id,
  a.prospect_id,
  a.id,
  c.sequence_no,
  c.label,
  coalesce(a.approved_at, a.updated_at, a.created_at) + make_interval(days => c.days_after)
from public.outreach_approvals a
cross join (values
  (1, 'Mini-audit', 3),
  (2, 'Proof / example', 7),
  (3, 'Decision-process check', 12),
  (4, 'Respectful close', 21)
) as c(sequence_no, label, days_after)
where a.status = 'sent'
  and coalesce(a.message_type, 'initial') = 'initial'
  and not exists (
    select 1 from public.outreach_followups f
    where f.source_approval_id = a.id and f.sequence_no = c.sequence_no
  );
