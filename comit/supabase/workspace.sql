-- COMIT shared workspace schema (Supabase/Postgres)
-- Apply manually in a Supabase project you control. No deployment is performed by this repository.

create table if not exists workspace_prospects (
  id uuid primary key,
  name text not null,
  email text,
  industry text,
  location text,
  source text,
  stage text not null default 'research',
  notes text not null default '',
  owner_email text,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists workspace_drafts (
  id uuid primary key,
  prospect_id uuid not null references workspace_prospects(id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'draft',
  created_by text not null,
  updated_at timestamptz not null default now()
);

create table if not exists workspace_checkins (
  id uuid primary key,
  email text not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists workspace_creative (
  id uuid primary key,
  title text not null,
  category text not null,
  source_url text not null,
  notes text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists workspace_prospects_updated_idx on workspace_prospects(updated_at desc);
create index if not exists workspace_drafts_updated_idx on workspace_drafts(updated_at desc);
create index if not exists workspace_checkins_created_idx on workspace_checkins(created_at desc);
create index if not exists workspace_creative_created_idx on workspace_creative(created_at desc);

-- COMIT uses the server-side Supabase service role for these private team tables.
-- Never expose SUPABASE_SERVICE_ROLE_KEY to browser code.
