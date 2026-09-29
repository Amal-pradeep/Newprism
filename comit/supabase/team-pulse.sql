-- COMIT team activity pulse.
-- Work-status collaboration only; no private wellness data belongs here.

create table if not exists public.team_daily_pulse (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_email text not null,
  status text not null check (status in ('available','focused','blocked','done')),
  focus text not null,
  blocker text,
  created_at timestamptz not null default now()
);

create index if not exists team_daily_pulse_user_time_idx
  on public.team_daily_pulse (organization_id,user_email,created_at desc);

alter table public.team_daily_pulse enable row level security;
revoke all on public.team_daily_pulse from anon, authenticated, public;
grant select, insert, update, delete on public.team_daily_pulse to service_role;

drop policy if exists "deny_direct_browser_access" on public.team_daily_pulse;
create policy "deny_direct_browser_access"
on public.team_daily_pulse
as restrictive for all to anon, authenticated
using (false) with check (false);

comment on table public.team_daily_pulse is 'Shared work-status pulse for COMIT teammates. Does not contain private wellness data.';
