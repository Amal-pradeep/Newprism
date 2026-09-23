-- COMIT security hardening: org helper functions are used by RLS, not exposed as public RPC endpoints.
revoke execute on function public.comit_is_org_member(uuid) from public, anon, authenticated;
revoke execute on function public.comit_is_org_admin(uuid) from public, anon, authenticated;
