-- COMIT production hardening: keep this migration in source control to match Supabase.
create index if not exists idx_comit_audit_actor on public.audit_logs(actor_id);
create index if not exists idx_comit_audit_org on public.audit_logs(organization_id);
create index if not exists idx_comit_companies_org on public.companies(organization_id);
create index if not exists idx_comit_notifications_org on public.notifications(organization_id);
create index if not exists idx_comit_members_user on public.organization_members(user_id);
create index if not exists idx_comit_prospects_company on public.prospects(company_id);
create index if not exists idx_comit_prospects_owner on public.prospects(owner_id);
create index if not exists idx_comit_tasks_assignee on public.tasks(assignee_id);
create index if not exists idx_comit_tasks_prospect on public.tasks(prospect_id);
create index if not exists idx_comit_executions_automation on public.workflow_executions(automation_id);

revoke execute on function public.comit_is_org_member(uuid) from anon, authenticated;
revoke execute on function public.comit_is_org_admin(uuid) from anon, authenticated;

drop policy if exists "comit admins manage automations" on public.automations;
drop policy if exists "comit members read automations" on public.automations;
drop policy if exists "comit admins manage companies" on public.companies;
drop policy if exists "comit members read companies" on public.companies;
drop policy if exists "comit members manage prospects" on public.prospects;
drop policy if exists "comit members read prospects" on public.prospects;
drop policy if exists "comit members manage tasks" on public.tasks;
drop policy if exists "comit members read tasks" on public.tasks;
drop policy if exists "comit admins manage executions" on public.workflow_executions;
drop policy if exists "comit members read executions" on public.workflow_executions;
drop policy if exists "comit users read notifications" on public.notifications;
drop policy if exists "comit users update notifications" on public.notifications;

create policy "comit members read automations" on public.automations for select to authenticated using (public.comit_is_org_member(organization_id));
create policy "comit admins write automations" on public.automations for insert to authenticated with check (public.comit_is_org_admin(organization_id));
create policy "comit admins update automations" on public.automations for update to authenticated using (public.comit_is_org_admin(organization_id)) with check (public.comit_is_org_admin(organization_id));
create policy "comit admins delete automations" on public.automations for delete to authenticated using (public.comit_is_org_admin(organization_id));

create policy "comit members read companies" on public.companies for select to authenticated using (public.comit_is_org_member(organization_id));
create policy "comit admins write companies" on public.companies for insert to authenticated with check (public.comit_is_org_admin(organization_id));
create policy "comit admins update companies" on public.companies for update to authenticated using (public.comit_is_org_admin(organization_id)) with check (public.comit_is_org_admin(organization_id));
create policy "comit admins delete companies" on public.companies for delete to authenticated using (public.comit_is_org_admin(organization_id));

create policy "comit members read prospects" on public.prospects for select to authenticated using (public.comit_is_org_member(organization_id));
create policy "comit members write prospects" on public.prospects for insert to authenticated with check (public.comit_is_org_member(organization_id));
create policy "comit members update prospects" on public.prospects for update to authenticated using (public.comit_is_org_member(organization_id)) with check (public.comit_is_org_member(organization_id));
create policy "comit members delete prospects" on public.prospects for delete to authenticated using (public.comit_is_org_member(organization_id));

create policy "comit members read tasks" on public.tasks for select to authenticated using (public.comit_is_org_member(organization_id));
create policy "comit members write tasks" on public.tasks for insert to authenticated with check (public.comit_is_org_member(organization_id));
create policy "comit members update tasks" on public.tasks for update to authenticated using (public.comit_is_org_member(organization_id)) with check (public.comit_is_org_member(organization_id));
create policy "comit members delete tasks" on public.tasks for delete to authenticated using (public.comit_is_org_member(organization_id));

create policy "comit members read executions" on public.workflow_executions for select to authenticated using (public.comit_is_org_member(organization_id));
create policy "comit admins write executions" on public.workflow_executions for insert to authenticated with check (public.comit_is_org_admin(organization_id));
create policy "comit admins update executions" on public.workflow_executions for update to authenticated using (public.comit_is_org_admin(organization_id)) with check (public.comit_is_org_admin(organization_id));
create policy "comit admins delete executions" on public.workflow_executions for delete to authenticated using (public.comit_is_org_admin(organization_id));

create policy "comit users read notifications" on public.notifications for select to authenticated using (public.comit_is_org_member(organization_id) and (user_id = (select auth.uid()) or user_id is null));
create policy "comit users update notifications" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));