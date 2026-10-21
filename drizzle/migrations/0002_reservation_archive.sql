ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS reservations_is_archived_idx ON public.reservations (is_archived);

CREATE OR REPLACE FUNCTION public.guard_reservation_archive()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _client boolean := current_user IN ('anon', 'authenticated');
  _admin boolean := public.has_role(auth.uid(), 'admin'::public.app_role);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF _client AND NOT _admin THEN
      NEW.is_archived := false;
      NEW.archived_at := NULL;
    END IF;
  ELSIF NEW.is_archived IS DISTINCT FROM OLD.is_archived THEN
    IF _client AND NOT _admin THEN
      RAISE EXCEPTION 'only administrators can hide or restore reservations' USING ERRCODE = '42501';
    END IF;
    NEW.archived_at := CASE WHEN NEW.is_archived THEN now() ELSE NULL END;
  END IF;

  IF NEW.is_archived AND NEW.status NOT IN ('cancelled'::public.reservation_status, 'completed'::public.reservation_status) THEN
    RAISE EXCEPTION 'only cancelled or completed reservations can be hidden' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_guard_archive ON public.reservations;
CREATE TRIGGER reservations_guard_archive
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.guard_reservation_archive();

CREATE OR REPLACE FUNCTION public.guard_reservation_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status NOT IN ('cancelled'::public.reservation_status, 'completed'::public.reservation_status) THEN
    RAISE EXCEPTION 'only cancelled or completed reservations can be deleted' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS reservations_guard_delete ON public.reservations;
CREATE TRIGGER reservations_guard_delete
  BEFORE DELETE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.guard_reservation_delete();