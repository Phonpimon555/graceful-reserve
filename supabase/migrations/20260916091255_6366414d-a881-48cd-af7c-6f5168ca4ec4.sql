create or replace function public.booked_slots(_date date)
returns table(table_id text, time_slot text)
language sql
stable
security definer
set search_path = public
as $$
  select r.table_id, r.time_slot
  from public.reservations r
  where r.reservation_date = _date
    and r.status <> 'cancelled'::public.reservation_status
$$;

revoke all on function public.booked_slots(date) from public;
grant execute on function public.booked_slots(date) to anon, authenticated, service_role;