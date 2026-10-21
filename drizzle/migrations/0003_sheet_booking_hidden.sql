-- Admin-only list of Google Sheets bookings hidden from the admin table.
-- Booking data itself stays in Google Sheets; this only stores which rows the admin chose not to display.
CREATE TABLE public.sheet_booking_hidden (
  key text PRIMARY KEY,
  booking_id text NOT NULL DEFAULT '',
  hidden_by uuid NOT NULL,
  hidden_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.sheet_booking_hidden TO authenticated;
GRANT ALL ON public.sheet_booking_hidden TO service_role;

ALTER TABLE public.sheet_booking_hidden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read hidden sheet bookings"
  ON public.sheet_booking_hidden FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins hide sheet bookings"
  ON public.sheet_booking_hidden FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND hidden_by = auth.uid());

CREATE POLICY "Admins restore sheet bookings"
  ON public.sheet_booking_hidden FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));