-- Private COMIT media library for video shoots, edits and AI creative references.
alter table public.team_profiles add column if not exists phone text;

insert into public.team_profiles
  (organization_id,name,email,phone,role,focus,initials,logo_key,color_token,daily_target,automation_lane)
values
  ('acda1757-1698-405a-8451-5674316ceeaf','Shahid (Shahdi)','shahidruiz01@gmail.com','+971 56 230 2610',
   'Video Production · Creative Production',
   'Video shoots, production, edits, spot edits and related creative-production work',
   'SH','video','blue','Capture, produce and deliver priority video assets','video')
on conflict (organization_id,email) do update set
  name=excluded.name,phone=excluded.phone,role=excluded.role,focus=excluded.focus,
  initials=excluded.initials,logo_key=excluded.logo_key,color_token=excluded.color_token,
  daily_target=excluded.daily_target,automation_lane=excluded.automation_lane,updated_at=now();

create table if not exists public.creative_library_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  category text not null check (category in ('shoot-footage','production','edit','spot-edit','ai-reference','final-delivery','other')),
  object_path text not null,
  mime_type text not null,
  file_size bigint not null check(file_size > 0),
  notes text not null default '',
  tags text[] not null default '{}',
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists creative_library_org_created_idx
  on public.creative_library_items(organization_id,created_at desc);
alter table public.creative_library_items enable row level security;
drop policy if exists "members can read creative library" on public.creative_library_items;
create policy "members can read creative library" on public.creative_library_items
  for select using (public.comit_is_org_member(organization_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('comit-creative-library','comit-creative-library',false,524288000,
  array['video/mp4','video/quicktime','video/webm','image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
