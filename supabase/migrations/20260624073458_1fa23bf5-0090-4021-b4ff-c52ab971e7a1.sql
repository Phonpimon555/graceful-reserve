
DROP POLICY IF EXISTS res_insert_all ON public.reservations;
DROP POLICY IF EXISTS res_delete_all ON public.reservations;

CREATE POLICY res_insert_valid ON public.reservations
  FOR INSERT
  TO public
  WITH CHECK (
    reservation_date >= CURRENT_DATE
    AND char_length(btrim(customer_name)) >= 2
    AND char_length(regexp_replace(phone, '\D', '', 'g')) >= 7
    AND char_length(table_id) BETWEEN 1 AND 10
    AND time_slot ~ '^\d{2}:\d{2}-\d{2}:\d{2}$'
  );

CREATE POLICY res_delete_future ON public.reservations
  FOR DELETE
  TO public
  USING (reservation_date >= CURRENT_DATE);
