-- ============================================================
-- 413 FIELD LOG - schema rebuild
-- Derived from the actual application code (field-log/index.html),
-- not reconstructed from memory.
-- Safe to re-run.
-- ============================================================

drop view if exists fl_trip_summary;
drop table if exists fl_receipts cascade;
drop table if exists fl_trip_days cascade;
drop table if exists fl_trips cascade;
drop table if exists fl_profiles cascade;

-- ------------------------------------------------------------
-- PROFILES
-- app reads: id, full_name, day_rate, role ('admin' unlocks review app)
-- ------------------------------------------------------------
create table fl_profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  day_rate numeric not null default 500,
  role text not null default 'contractor',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- TRIPS
-- statuses used by the app: draft, submitted, returned, approved, paid
-- ------------------------------------------------------------
create table fl_trips (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references auth.users on delete cascade,
  name text default '',
  start_date date,
  end_date date,
  day_rate numeric not null default 500,
  stores_completed integer,
  status text not null default 'draft'
    check (status in ('draft','submitted','returned','approved','paid')),
  admin_note text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on fl_trips (contractor_id);

-- keep updated_at current (trip list sorts on it)
create or replace function fl_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger fl_trips_touch before update on fl_trips
  for each row execute function fl_touch();

-- ------------------------------------------------------------
-- TRIP DAYS  (one row per day worked)
-- ------------------------------------------------------------
create table fl_trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references fl_trips on delete cascade,
  work_date date not null,
  created_at timestamptz not null default now(),
  unique (trip_id, work_date)
);
create index on fl_trip_days (trip_id);

-- ------------------------------------------------------------
-- RECEIPTS
-- ------------------------------------------------------------
create table fl_receipts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references fl_trips on delete cascade,
  vendor text default '',
  receipt_date date,
  amount numeric not null default 0,
  category text not null default 'Misc'
    check (category in ('Air fare','Rental car','Gas','Misc transportation','Hotel','Misc')),
  paid_with text not null default '413 card'
    check (paid_with in ('413 card','Personal')),
  storage_path text,
  note text,
  created_at timestamptz not null default now()
);
create index on fl_receipts (trip_id);

-- ------------------------------------------------------------
-- TRIP SUMMARY VIEW
-- The trip list reads this directly. Columns the app uses:
-- id, status, name, start_date, end_date, days_worked,
-- receipt_count, amount_due, admin_note, updated_at, contractor_id
-- amount_due = (days worked * day rate) + out-of-pocket receipts
-- (413 card spend is NOT reimbursed, matching the app's own math)
-- ------------------------------------------------------------
create view fl_trip_summary
with (security_invoker = true) as
select
  t.id,
  t.contractor_id,
  t.name,
  t.start_date,
  t.end_date,
  t.status,
  t.day_rate,
  t.stores_completed,
  t.admin_note,
  t.submitted_at,
  t.updated_at,
  coalesce(d.days_worked, 0)                                as days_worked,
  coalesce(r.receipt_count, 0)                              as receipt_count,
  coalesce(r.out_of_pocket, 0)                              as out_of_pocket,
  coalesce(r.card_total, 0)                                 as card_total,
  coalesce(d.days_worked, 0) * t.day_rate                   as day_pay,
  (coalesce(d.days_worked, 0) * t.day_rate)
    + coalesce(r.out_of_pocket, 0)                          as amount_due
from fl_trips t
left join (
  select trip_id, count(*)::int as days_worked
  from fl_trip_days group by trip_id
) d on d.trip_id = t.id
left join (
  select trip_id,
         count(*)::int as receipt_count,
         sum(case when paid_with = 'Personal' then amount else 0 end) as out_of_pocket,
         sum(case when paid_with = '413 card' then amount else 0 end) as card_total
  from fl_receipts group by trip_id
) r on r.trip_id = t.id;

-- ============================================================
-- ROW LEVEL SECURITY
-- Contractors see only their own trips. Admins see everything.
-- ============================================================
create or replace function fl_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from fl_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table fl_profiles  enable row level security;
alter table fl_trips     enable row level security;
alter table fl_trip_days enable row level security;
alter table fl_receipts  enable row level security;

-- profiles
create policy p_read on fl_profiles for select to authenticated
  using (id = auth.uid() or fl_is_admin());
create policy p_ins on fl_profiles for insert to authenticated
  with check (id = auth.uid());
create policy p_upd on fl_profiles for update to authenticated
  using (id = auth.uid() or fl_is_admin());

-- trips
create policy t_read on fl_trips for select to authenticated
  using (contractor_id = auth.uid() or fl_is_admin());
create policy t_ins on fl_trips for insert to authenticated
  with check (contractor_id = auth.uid());
create policy t_upd on fl_trips for update to authenticated
  using (
    (contractor_id = auth.uid() and status in ('draft','returned'))
    or fl_is_admin()
  );
create policy t_del on fl_trips for delete to authenticated
  using ((contractor_id = auth.uid() and status = 'draft') or fl_is_admin());

-- trip days
create policy d_read on fl_trip_days for select to authenticated
  using (exists (select 1 from fl_trips t where t.id = trip_id
                 and (t.contractor_id = auth.uid() or fl_is_admin())));
create policy d_ins on fl_trip_days for insert to authenticated
  with check (exists (select 1 from fl_trips t where t.id = trip_id
                      and t.contractor_id = auth.uid()
                      and t.status in ('draft','returned')));
create policy d_del on fl_trip_days for delete to authenticated
  using (exists (select 1 from fl_trips t where t.id = trip_id
                 and t.contractor_id = auth.uid()
                 and t.status in ('draft','returned')));

-- receipts
create policy r_read on fl_receipts for select to authenticated
  using (exists (select 1 from fl_trips t where t.id = trip_id
                 and (t.contractor_id = auth.uid() or fl_is_admin())));
create policy r_ins on fl_receipts for insert to authenticated
  with check (exists (select 1 from fl_trips t where t.id = trip_id
                      and t.contractor_id = auth.uid()
                      and t.status in ('draft','returned')));
create policy r_upd on fl_receipts for update to authenticated
  using (exists (select 1 from fl_trips t where t.id = trip_id
                 and ((t.contractor_id = auth.uid() and t.status in ('draft','returned'))
                      or fl_is_admin())));
create policy r_del on fl_receipts for delete to authenticated
  using (exists (select 1 from fl_trips t where t.id = trip_id
                 and t.contractor_id = auth.uid()
                 and t.status in ('draft','returned')));

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- so a newly added user can sign in without a manual profile row
-- ============================================================
create or replace function fl_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into fl_profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists fl_on_new_user on auth.users;
create trigger fl_on_new_user after insert on auth.users
  for each row execute function fl_new_user();

-- backfill profiles for users that already exist
insert into fl_profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', email)
from auth.users
on conflict (id) do nothing;

-- ============================================================
-- STORAGE BUCKET  fl-receipts  (private)
-- Path convention used by the app: {user_id}/{trip_id}/{uuid}.{ext}
-- so the first path segment is the owning user's id.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('fl-receipts', 'fl-receipts', false)
on conflict (id) do nothing;

drop policy if exists s_read on storage.objects;
drop policy if exists s_ins  on storage.objects;
drop policy if exists s_del  on storage.objects;

create policy s_read on storage.objects for select to authenticated
  using (bucket_id = 'fl-receipts'
         and ((storage.foldername(name))[1] = auth.uid()::text or fl_is_admin()));
create policy s_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'fl-receipts'
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy s_del on storage.objects for delete to authenticated
  using (bucket_id = 'fl-receipts'
         and ((storage.foldername(name))[1] = auth.uid()::text or fl_is_admin()));
