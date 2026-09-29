-- COMIT AI sales-learning schema.
-- Git-first: review this file before manually applying it to Supabase.
-- Server-side COMIT uses service_role; browser roles receive no direct table access.

create table if not exists public.agent_training_examples (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  agent_id text not null,
  business_key text,
  tags text[] not null default '{}',
  input_context jsonb not null default '{}'::jsonb,
  lesson text not null,
  outcome text not null check (outcome in ('pattern','delivery_failed','no_reply','negative_reply','positive_reply','meeting_booked','proposal_sent','won','lost')),
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  approved_for_reuse boolean not null default false,
  approved_by text,
  source_job_id uuid,
  source_prospect_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  job_id uuid not null,
  agent_id text not null,
  score integer not null check (score between 0 and 100),
  grade text not null check (grade in ('A','B','C','D')),
  passed boolean not null,
  dimensions jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  revision jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  prospect_id uuid,
  job_id uuid,
  outcome text not null check (outcome in ('delivery_failed','no_reply','negative_reply','positive_reply','meeting_booked','proposal_sent','won','lost')),
  note text not null default '',
  source text not null default 'human_review',
  recorded_by text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists agent_training_examples_lookup_idx
  on public.agent_training_examples (organization_id, agent_id, approved_for_reuse, quality_score desc, created_at desc);
create index if not exists agent_training_examples_business_idx
  on public.agent_training_examples (organization_id, business_key, created_at desc);
create index if not exists agent_evaluations_job_idx
  on public.agent_evaluations (organization_id, job_id, created_at desc);
create index if not exists sales_outcomes_prospect_idx
  on public.sales_outcomes (organization_id, prospect_id, occurred_at desc);
create index if not exists sales_outcomes_job_idx
  on public.sales_outcomes (organization_id, job_id, occurred_at desc);

alter table public.agent_training_examples enable row level security;
alter table public.agent_evaluations enable row level security;
alter table public.sales_outcomes enable row level security;

revoke all on public.agent_training_examples from anon, authenticated, public;
revoke all on public.agent_evaluations from anon, authenticated, public;
revoke all on public.sales_outcomes from anon, authenticated, public;

grant select, insert, update, delete on public.agent_training_examples to service_role;
grant select, insert, update, delete on public.agent_evaluations to service_role;
grant select, insert, update, delete on public.sales_outcomes to service_role;

comment on table public.agent_training_examples is 'Founder-reviewed lessons reused by COMIT agents. No raw private Drive documents should be copied here.';
comment on table public.agent_evaluations is 'Deterministic quality evaluations for agent outputs.';
comment on table public.sales_outcomes is 'Human-confirmed sales outcomes used to measure whether agent work creates pipeline progress.';
