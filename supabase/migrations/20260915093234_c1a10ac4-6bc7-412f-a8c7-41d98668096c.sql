-- ===== roles =====
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy user_roles_select_own on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy user_roles_admin_all on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ===== profiles =====
create table public.profiles (
  id uuid primary key,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = auth.uid());

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'phone',''),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, case when lower(new.email) = 'phonpimon.y@ku.th' then 'admin'::public.app_role else 'user'::public.app_role end)
  on conflict (user_id, role) do nothing;

  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== restaurant info =====
create table public.restaurant_info (
  id uuid primary key default gen_random_uuid(),
  name_th text not null,
  name_en text not null,
  description_th text,
  description_en text,
  phone text,
  open_time text,
  close_time text,
  total_tables integer,
  zone_info_th text,
  zone_info_en text,
  seating_info_th text,
  seating_info_en text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.restaurant_info to anon, authenticated;
grant insert, update, delete on public.restaurant_info to authenticated;
grant all on public.restaurant_info to service_role;
alter table public.restaurant_info enable row level security;

create policy restaurant_read_all on public.restaurant_info for select using (true);
create policy restaurant_admin_write on public.restaurant_info for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create trigger restaurant_info_updated_at before update on public.restaurant_info
  for each row execute function public.set_updated_at();

insert into public.restaurant_info (name_th, name_en, description_th, description_en, phone, open_time, close_time, total_tables, zone_info_th, zone_info_en, seating_info_th, seating_info_en)
values ('ครัวริมบึง','Riverside Kitchen',
 'ร้านอาหารไทยริมบึง บรรยากาศพระอาทิตย์ตกดิน พร้อมห้อง VIP สำหรับโอกาสพิเศษ',
 'Thai riverside dining with sunset views and private VIP rooms for special occasions.',
 '02-123-4567','11:00','22:00',50,
 'ริมบึง 20 โต๊ะ · สวน 20 โต๊ะ · VIP 10 โต๊ะ',
 'Riverside 20 tables · Garden 20 tables · VIP 10 tables',
 'โต๊ะปกติรองรับ 2-6 ท่าน · ห้อง VIP รองรับ 10 ท่าน',
 'Standard tables seat 2-6 guests · VIP rooms seat 10 guests');

-- ===== tables =====
alter table public.tables add column if not exists status text not null default 'available';
alter table public.tables add constraint tables_status_check check (status in ('available','disabled'));
grant insert, update, delete on public.tables to authenticated;
grant all on public.tables to service_role;
create policy tables_admin_write on public.tables for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ===== menu items =====
alter table public.menu_items add column if not exists ingredients_en text;
alter table public.menu_items add column if not exists ingredients_th text;
alter table public.menu_items add column if not exists is_visible boolean not null default true;
grant insert, update, delete on public.menu_items to authenticated;
grant all on public.menu_items to service_role;
create policy menu_admin_write on public.menu_items for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ===== reservations =====
create type public.reservation_status as enum ('pending','confirmed','cancelled','completed');

alter table public.reservations add column if not exists user_id uuid;
alter table public.reservations add column if not exists status public.reservation_status not null default 'confirmed';
alter table public.reservations add column if not exists party_size integer not null default 2;
alter table public.reservations add column if not exists updated_at timestamptz not null default now();

create trigger reservations_updated_at before update on public.reservations
  for each row execute function public.set_updated_at();

do $$
declare c record;
begin
  for c in select conname from pg_constraint
    where conrelid = 'public.reservations'::regclass and contype in ('u','p') and conname <> 'reservations_pkey'
  loop
    execute format('alter table public.reservations drop constraint %I', c.conname);
  end loop;
end $$;

create unique index reservations_active_slot_idx
  on public.reservations (table_id, reservation_date, time_slot)
  where status <> 'cancelled';

-- availability view without customer PII
create view public.table_availability as
  select table_id, reservation_date, time_slot
  from public.reservations
  where status <> 'cancelled';
grant select on public.table_availability to anon, authenticated;

-- tighten reservation access
drop policy if exists res_read_all on public.reservations;
drop policy if exists res_delete_future on public.reservations;
drop policy if exists res_insert_valid on public.reservations;

grant select, insert, update, delete on public.reservations to authenticated;
grant insert on public.reservations to anon;
grant all on public.reservations to service_role;

create policy res_select_own on public.reservations for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy res_insert_guest on public.reservations for insert to anon
  with check (
    user_id is null
    and reservation_date >= current_date
    and char_length(btrim(customer_name)) >= 2
    and char_length(regexp_replace(phone, '\D', '', 'g')) >= 7
    and char_length(table_id) between 1 and 10
    and time_slot ~ '^\d{2}:\d{2}-\d{2}:\d{2}$'
    and party_size between 1 and 20
    and status = 'confirmed'
  );

create policy res_insert_own on public.reservations for insert to authenticated
  with check (
    (user_id = auth.uid() or user_id is null)
    and reservation_date >= current_date
    and char_length(btrim(customer_name)) >= 2
    and char_length(regexp_replace(phone, '\D', '', 'g')) >= 7
    and char_length(table_id) between 1 and 10
    and time_slot ~ '^\d{2}:\d{2}-\d{2}:\d{2}$'
    and party_size between 1 and 20
    and status = 'confirmed'
  );

create policy res_update_own_cancel on public.reservations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy res_admin_all on public.reservations for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));