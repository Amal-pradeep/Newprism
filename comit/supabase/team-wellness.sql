-- COMIT private teammate wellness layer.
-- Self-tracking only. No team leaderboard or manager access is exposed by the application.

create table if not exists public.team_wellness_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_email text not null,
  water_target_ml integer,
  water_reminders boolean not null default true,
  break_reminders boolean not null default true,
  movement_reminders boolean not null default true,
  reminder_interval_minutes integer not null default 90 check (reminder_interval_minutes between 30 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,user_email),
  check (water_target_ml is null or water_target_ml between 250 and 10000)
);

create table if not exists public.team_wellness_checkins (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_email text not null,
  kind text not null check (kind in ('water','screen_break','movement','meal','energy','day_checkin')),
  amount_ml integer,
  energy_level integer,
  note text,
  created_at timestamptz not null default now(),
  check (amount_ml is null or amount_ml between 50 and 1500),
  check (energy_level is null or energy_level between 1 and 5)
);

create index if not exists team_wellness_checkins_user_time_idx
  on public.team_wellness_checkins (organization_id,user_email,created_at desc);

alter table public.team_wellness_preferences enable row level security;
alter table public.team_wellness_checkins enable row level security;

revoke all on public.team_wellness_preferences from anon, authenticated, public;
revoke all on public.team_wellness_checkins from anon, authenticated, public;
grant select, insert, update, delete on public.team_wellness_preferences to service_role;
grant select, insert, update, delete on public.team_wellness_checkins to service_role;

drop policy if exists "deny_direct_browser_access" on public.team_wellness_preferences;
create policy "deny_direct_browser_access"
on public.team_wellness_preferences
as restrictive for all to anon, authenticated
using (false) with check (false);

drop policy if exists "deny_direct_browser_access" on public.team_wellness_checkins;
create policy "deny_direct_browser_access"
on public.team_wellness_checkins
as restrictive for all to anon, authenticated
using (false) with check (false);

comment on table public.team_wellness_preferences is 'Private self-tracking preferences for the signed-in COMIT teammate.';
comment on table public.team_wellness_checkins is 'Private non-medical wellbeing check-ins. Application API only returns the current user records.';
