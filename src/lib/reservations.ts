import { supabase } from "@/integrations/supabase/client";

export type TableRow = {
  id: string;
  table_number: number;
  zone: "Riverside" | "AirConditioned" | "VIP";
  capacity: number;
};

export type Reservation = {
  id: string;
  table_id: string;
  customer_name: string;
  phone: string;
  reservation_date: string;
  time_slot: string;
  created_at: string;
};

export async function fetchTables() {
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .order("zone")
    .order("table_number");
  if (error) throw error;
  return (data ?? []) as TableRow[];
}

export async function fetchReservationsForDate(date: string) {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("reservation_date", date);
  if (error) throw error;
  return (data ?? []) as Reservation[];
}

export async function fetchAllReservations() {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("reservation_date", { ascending: false })
    .order("time_slot");
  if (error) throw error;
  return (data ?? []) as Reservation[];
}

export async function createReservation(input: {
  table_id: string;
  customer_name: string;
  phone: string;
  reservation_date: string;
  time_slot: string;
}) {
  const { data, error } = await supabase
    .from("reservations")
    .insert(input)
    .select()
    .single();
  // Unique violation = table already booked
  if (error) {
    if (error.code === "23505") return { ok: false as const, reason: "taken" as const };
    return { ok: false as const, reason: error.message };
  }
  return { ok: true as const, reservation: data as Reservation };
}

export async function cancelReservation(reservationId: string, phone: string) {
  // Verify phone match before delete (app-level ownership check)
  const { data: existing, error: e1 } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", reservationId)
    .maybeSingle();
  if (e1) return { ok: false as const, reason: e1.message };
  if (!existing) return { ok: false as const, reason: "not_found" as const };
  if (existing.phone.replace(/\D/g, "") !== phone.replace(/\D/g, "")) {
    return { ok: false as const, reason: "phone_mismatch" as const };
  }
  const { error } = await supabase.from("reservations").delete().eq("id", reservationId);
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

export async function findReservationsByPhone(phone: string) {
  const normalized = phone.replace(/\D/g, "");
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .gte("reservation_date", new Date().toISOString().slice(0, 10))
    .order("reservation_date")
    .order("time_slot");
  if (error) throw error;
  return ((data ?? []) as Reservation[]).filter(
    (r) => r.phone.replace(/\D/g, "") === normalized,
  );
}
