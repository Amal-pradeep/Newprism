-- COMIT Finance AI ledger for Aadil / founders.
-- Server-only tables. External emails require approval.

create table if not exists public.finance_clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  billing_email text,
  currency text not null default 'AED',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,name)
);

create table if not exists public.finance_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null references public.finance_clients(id) on delete cascade,
  external_key text not null,
  period_label text,
  amount numeric(12,2) not null check (amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  currency text not null default 'AED',
  due_date date,
  status text not null default 'pending' check (status in ('pending','partially_paid','paid','waived')),
  reminder_count integer not null default 0 check (reminder_count >= 0),
  last_reminder_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,external_key),
  check (paid_amount <= amount)
);

create table if not exists public.finance_payment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  invoice_id uuid not null references public.finance_invoices(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'AED',
  payment_method text,
  reference text,
  note text,
  recorded_by text not null,
  recorded_at timestamptz not null default now()
);

create table if not exists public.finance_email_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  invoice_id uuid not null references public.finance_invoices(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','sent','failed')),
  to_email text not null,
  subject text not null,
  body text not null,
  requested_by text not null,
  approved_by text,
  approved_at timestamptz,
  gmail_message_id text,
  gmail_thread_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_invoices_org_status_idx
  on public.finance_invoices (organization_id,status,created_at desc);
create index if not exists finance_invoices_client_idx
  on public.finance_invoices (client_id,created_at desc);
create index if not exists finance_payment_events_invoice_idx
  on public.finance_payment_events (invoice_id,recorded_at desc);
create index if not exists finance_email_approvals_invoice_idx
  on public.finance_email_approvals (invoice_id,created_at desc);

alter table public.finance_clients enable row level security;
alter table public.finance_invoices enable row level security;
alter table public.finance_payment_events enable row level security;
alter table public.finance_email_approvals enable row level security;

revoke all on public.finance_clients from anon, authenticated, public;
revoke all on public.finance_invoices from anon, authenticated, public;
revoke all on public.finance_payment_events from anon, authenticated, public;
revoke all on public.finance_email_approvals from anon, authenticated, public;

grant select, insert, update, delete on public.finance_clients to service_role;
grant select, insert, update, delete on public.finance_invoices to service_role;
grant select, insert, update, delete on public.finance_payment_events to service_role;
grant select, insert, update, delete on public.finance_email_approvals to service_role;

drop policy if exists "deny_direct_browser_access" on public.finance_clients;
create policy "deny_direct_browser_access" on public.finance_clients
as restrictive for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_direct_browser_access" on public.finance_invoices;
create policy "deny_direct_browser_access" on public.finance_invoices
as restrictive for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_direct_browser_access" on public.finance_payment_events;
create policy "deny_direct_browser_access" on public.finance_payment_events
as restrictive for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_direct_browser_access" on public.finance_email_approvals;
create policy "deny_direct_browser_access" on public.finance_email_approvals
as restrictive for all to anon, authenticated using (false) with check (false);

-- Seed the two finance facts explicitly provided by Amal.
insert into public.finance_clients (organization_id,name,currency,notes)
values
  ('acda1757-1698-405a-8451-5674316ceeaf','Al Eliza Interiors','AED','Client finance record seeded from founder-provided balance. Billing email not yet verified.'),
  ('acda1757-1698-405a-8451-5674316ceeaf','Nostaza Restaurant','AED','Client finance record seeded from founder-provided monthly payment status. Billing email not yet verified.')
on conflict (organization_id,name) do update
set updated_at=now();

insert into public.finance_invoices
(organization_id,client_id,external_key,period_label,amount,paid_amount,currency,status,notes,created_by,updated_by)
select
  'acda1757-1698-405a-8451-5674316ceeaf',
  c.id,
  'seed-al-eliza-pending-1000',
  'Outstanding balance',
  1000,
  0,
  'AED',
  'pending',
  'AED 1,000 pending. Due date not yet recorded; do not classify as delayed until Aadil sets the agreed due date.',
  'founder-seed',
  'founder-seed'
from public.finance_clients c
where c.organization_id='acda1757-1698-405a-8451-5674316ceeaf'
  and c.name='Al Eliza Interiors'
on conflict (organization_id,external_key) do nothing;

insert into public.finance_invoices
(organization_id,client_id,external_key,period_label,amount,paid_amount,currency,status,notes,created_by,updated_by)
select
  'acda1757-1698-405a-8451-5674316ceeaf',
  c.id,
  'seed-nostaza-paid-1500-one-month',
  '1 month service',
  1500,
  1500,
  'AED',
  'paid',
  'AED 1,500 marked paid for one month based on founder-provided status. Exact payment date/reference not yet recorded.',
  'founder-seed',
  'founder-seed'
from public.finance_clients c
where c.organization_id='acda1757-1698-405a-8451-5674316ceeaf'
  and c.name='Nostaza Restaurant'
on conflict (organization_id,external_key) do nothing;

comment on table public.finance_clients is 'Prism client billing profiles. Server-only.';
comment on table public.finance_invoices is 'Client invoices/balances used by COMIT Finance AI. Server-only.';
comment on table public.finance_email_approvals is 'Payment reminder drafts requiring founder/Aadil approval before Gmail send.';
