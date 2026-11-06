-- ============================================================
-- 413 Platform: hardening from the Supabase security advisor.
-- ============================================================
-- Pin search_path on the touch trigger function.
create or replace function public.profiles_touch() returns trigger
language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;

-- Trigger function: never callable over the REST RPC endpoint.
revoke execute on function public.platform_new_user() from public, anon, authenticated;

-- is_admin() is only needed by signed-in users (RLS policies), not anon.
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;
