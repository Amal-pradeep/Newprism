-- COMIT Gmail reply reconciliation ledger.
create table if not exists public.outreach_replies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  approval_id uuid references public.outreach_approvals(id) on delete set null,
  gmail_message_id text not null unique,
  gmail_thread_id text,
  sender_email text not null,
  subject text,
  snippet text,
  body text,
  received_at timestamptz not null,
  classification text not null default 'human_reply' check (classification in ('human_reply','automated','bounce')),
  created_at timestamptz not null default now()
);

alter table public.prospects
  add column if not exists reply_count integer not null default 0;
alter table public.prospects
  add column if not exists last_reply_at timestamptz;
alter table public.prospects
  add column if not exists last_reply_subject text;
alter table public.prospects
  add column if not exists last_reply_snippet text;

create index if not exists idx_outreach_replies_org_received
  on public.outreach_replies(organization_id, received_at desc);
create index if not exists idx_outreach_replies_prospect_received
  on public.outreach_replies(prospect_id, received_at desc);
create index if not exists idx_outreach_replies_thread
  on public.outreach_replies(gmail_thread_id);

alter table public.outreach_replies enable row level security;
drop policy if exists "comit members access outreach replies" on public.outreach_replies;
create policy "comit members access outreach replies"
  on public.outreach_replies for all
  using (public.comit_is_org_member(organization_id))
  with check (public.comit_is_org_member(organization_id));
