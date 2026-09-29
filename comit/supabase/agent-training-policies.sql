-- Explicit browser-role deny policies for COMIT AI training tables.
-- service_role bypasses RLS and remains the only application access path.

drop policy if exists "deny_direct_browser_access" on public.agent_training_examples;
create policy "deny_direct_browser_access"
on public.agent_training_examples
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "deny_direct_browser_access" on public.agent_evaluations;
create policy "deny_direct_browser_access"
on public.agent_evaluations
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "deny_direct_browser_access" on public.sales_outcomes;
create policy "deny_direct_browser_access"
on public.sales_outcomes
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
