ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS contact_email text;

CREATE OR REPLACE FUNCTION public.reservations_by_contact(_phone text, _email text)
RETURNS TABLE (
  id uuid,
  table_id text,
  customer_name text,
  phone text,
  contact_email text,
  reservation_date date,
  time_slot text,
  party_size integer,
  status public.reservation_status,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.table_id, r.customer_name, r.phone, r.contact_email,
         r.reservation_date, r.time_slot, r.party_size, r.status,
         r.created_at, r.updated_at
  FROM public.reservations r
  WHERE (
      (_email IS NOT NULL AND _email <> '' AND lower(r.contact_email) = lower(_email))
      OR (_phone IS NOT NULL AND _phone <> '' AND regexp_replace(r.phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g'))
    )
  ORDER BY r.reservation_date DESC, r.time_slot;
$$;

CREATE OR REPLACE FUNCTION public.cancel_reservation_by_contact(_id uuid, _phone text, _email text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.reservations r
  SET status = 'cancelled', updated_at = now()
  WHERE r.id = _id
    AND r.status IN ('pending','confirmed')
    AND (
      (_email IS NOT NULL AND _email <> '' AND lower(r.contact_email) = lower(_email))
      OR (_phone IS NOT NULL AND _phone <> '' AND regexp_replace(r.phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g'))
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.reservations_by_contact(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_reservation_by_contact(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reservations_by_contact(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_reservation_by_contact(uuid, text, text) TO anon, authenticated, service_role;