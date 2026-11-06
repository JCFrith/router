-- ============================================================
-- 413 Platform: core schema
-- Applied to the existing 413 Solution project (xuaypaqogtjedmyvixjs).
--
-- Context: this project already held a legacy, EMPTY `profiles` table
-- (0 rows) with columns username/display_name/role/email, plus an
-- is_admin() function that read profiles.role. Nothing live used them.
-- This migration reshapes that table to the platform spec instead of
-- creating a second one, and moves admin detection to app_metadata,
-- which becomes the single source of truth for roles.
-- Safe to re-run.
-- ============================================================

-- 1. Roles live in app_metadata. Rewrite is_admin() to read it.
--    (Used by policies on admin_requests and, until below, profiles.)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('owner','admin'), false);
$$;

-- 2. Reshape profiles to the spec. Table is empty, id FK to auth.users
--    (on delete cascade) already exists and is kept, so the
--    admin_requests.reviewed_by FK stays valid.
drop policy if exists "Admins read all profiles" on public.profiles;
drop policy if exists "profiles admin read"      on public.profiles;
drop policy if exists "profiles self read"       on public.profiles;
drop policy if exists "profiles select own"      on public.profiles;
drop policy if exists "profiles update own"      on public.profiles;

-- Legacy trigger mirrored profiles.role into app_admins (empty, read by no
-- policy). It must go: after the reshape it would reference a missing
-- column and fail every new user insert.
drop trigger if exists trg_sync_app_admins on public.profiles;
drop function if exists public.sync_app_admins();

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_username_key;
alter table public.profiles drop column if exists username;
alter table public.profiles drop column if exists display_name;
alter table public.profiles drop column if exists role;
alter table public.profiles drop column if exists email;
alter table public.profiles drop column if exists created_at;

alter table public.profiles add column if not exists full_name    text;
alter table public.profiles add column if not exists phone        text;
alter table public.profiles add column if not exists address_line text;
alter table public.profiles add column if not exists city         text;
alter table public.profiles add column if not exists state        text;
alter table public.profiles add column if not exists postal_code  text;
alter table public.profiles add column if not exists updated_at   timestamptz not null default now();

alter table public.profiles enable row level security;

-- A user reads and updates only their own row. No client insert/delete:
-- rows are created by the trigger, deleted by cascade, admin writes go
-- through the service role in /api.
create policy "profiles select own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.profiles_touch() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.profiles_touch();

-- 3. Empty profile row for every new auth user. Coexists with the
--    existing fl_on_new_user trigger, which seeds fl_profiles.
create or replace function public.platform_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists platform_on_new_user on auth.users;
create trigger platform_on_new_user after insert on auth.users
  for each row execute function public.platform_new_user();

-- Backfill existing users, carrying over names already in fl_profiles.
insert into public.profiles (id, full_name)
select u.id, coalesce(nullif(f.full_name,''), nullif(u.raw_user_meta_data->>'full_name',''))
from auth.users u left join public.fl_profiles f on f.id = u.id
on conflict (id) do nothing;

-- 4. Admin audit log. No client policies: service role only.
--    No FK on actor/target, so history survives user deletion.
create table if not exists public.admin_audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  target_id  uuid,
  action     text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
