-- Shared, private file storage for Shahid's adaptable video + AI creative library.
alter table public.team_profiles add column if not exists phone text;

insert into public.team_profiles
  (organization_id,name,email,phone,role,focus,initials,logo_key,color_token,daily_target,automation_lane)
values
  ('acda1757-1698-405a-8451-5674316ceeaf','Shahid','shahidruiz01@gmail.com','+971562302610',
   'Video Production','Video shoots, production, editing, spot edits and creative execution',
   'SH','video','blue','Capture, produce and deliver priority video assets','video')
on conflict (organization_id,email) do update set
  name=excluded.name,phone=excluded.phone,role=excluded.role,focus=excluded.focus,
  initials=excluded.initials,logo_key=excluded.logo_key,color_token=excluded.color_token,
  daily_target=excluded.daily_target,automation_lane=excluded.automation_lane,updated_at=now();

create table if not exists public.creative_library_spaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_email text not null,name text not null,slug text not null,
  description text not null default '',asset_types text[] not null default '{}',
  ai_adaptation_enabled boolean not null default true,
  evolution_mode text not null default 'learn_from_feedback',
  monitoring_enabled boolean not null default true,metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(organization_id,slug)
);
create table if not exists public.creative_library_assets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.creative_library_spaces(id) on delete cascade,
  uploaded_by_email text not null,asset_type text not null,title text not null,
  storage_path text,source_url text,tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,feedback jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.creative_library_learning (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.creative_library_spaces(id) on delete cascade,
  signal_type text not null,signal jsonb not null default '{}'::jsonb,
  learned_rule text not null,confidence numeric,
  created_at timestamptz not null default now()
);
create index if not exists creative_library_assets_space_created_idx on public.creative_library_assets(space_id,created_at desc);
create index if not exists creative_library_learning_space_created_idx on public.creative_library_learning(space_id,created_at desc);
alter table public.creative_library_spaces enable row level security;
alter table public.creative_library_assets enable row level security;
alter table public.creative_library_learning enable row level security;
drop policy if exists "members can read creative library spaces" on public.creative_library_spaces;
create policy "members can read creative library spaces" on public.creative_library_spaces for select using (public.comit_is_org_member(organization_id));
drop policy if exists "members can read creative library assets" on public.creative_library_assets;
create policy "members can read creative library assets" on public.creative_library_assets for select using (exists(select 1 from public.creative_library_spaces s where s.id=space_id and public.comit_is_org_member(s.organization_id)));
drop policy if exists "members can read creative library learning" on public.creative_library_learning;
create policy "members can read creative library learning" on public.creative_library_learning for select using (exists(select 1 from public.creative_library_spaces s where s.id=space_id and public.comit_is_org_member(s.organization_id)));
grant select,insert,update,delete on public.creative_library_spaces,public.creative_library_assets,public.creative_library_learning to service_role;

insert into public.creative_library_spaces
  (organization_id,owner_email,name,slug,description,asset_types,ai_adaptation_enabled,evolution_mode,monitoring_enabled,metadata)
values
 ('acda1757-1698-405a-8451-5674316ceeaf','shahidruiz01@gmail.com',
  'Shahid Video Shoot & AI Creative Cloud','shahid-video-creative',
  'Dedicated creative workspace for shoots, raw footage references, edits, spot edits, creative briefs, reusable production patterns and AI-assisted learning.',
  array['raw_ideas','shoot_briefs','footage_refs','edits','spot_edits','creative_briefs','thumbnails','scripts','reference_assets'],
  true,'learn_from_feedback',true,'{"phone":"+971562302610","free_only":true,"owner_role":"Video Production"}'::jsonb)
on conflict (organization_id,slug) do update set
 name=excluded.name,owner_email=excluded.owner_email,description=excluded.description,
 asset_types=excluded.asset_types,ai_adaptation_enabled=true,evolution_mode='learn_from_feedback',
 monitoring_enabled=true,metadata=excluded.metadata,updated_at=now();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('comit-creative-library','comit-creative-library',false,524288000,
  array['video/mp4','video/quicktime','video/webm','image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
