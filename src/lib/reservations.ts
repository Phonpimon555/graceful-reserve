import { supabase } from "@/integrations/supabase/client";

export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type TableRow = {
  id: string;
  table_number: number;
  zone: "Riverside" | "AirConditioned" | "VIP";
  capacity: number;
  status: string;
};

export type Reservation = {
  id: string;
  table_id: string;
  customer_name: string;
  phone: string;
  contact_email?: string | null;
  reservation_date: string;
  time_slot: string;
  created_at: string;
  updated_at: string;
  user_id?: string | null;
  status: ReservationStatus;
  party_size: number;
};

/** Public availability row (no personal data). */
export type BookedSlot = { table_id: string; time_slot: string };

export async function fetchTables() {
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .order("zone")
    .order("table_number");
  if (error) throw error;
  return (data ?? []) as TableRow[];
}

/** Bookable tables only (admin can disable a table). */
export async function fetchActiveTables() {
  const all = await fetchTables();
  return all.filter((t) => t.status !== "disabled");
}

/** Availability for a date — readable by guests, returns no personal data. */
export async function fetchReservationsForDate(date: string) {
  const { data, error } = await supabase.rpc("booked_slots", { _date: date });
  if (error) throw error;
  return (data ?? []) as BookedSlot[];
}

/** Admin: every reservation with full detail. */
export async function fetchAllReservations() {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("reservation_date", { ascending: false })
    .order("time_slot");
  if (error) throw error;
  return (data ?? []) as Reservation[];
}

/** Signed-in customer: own reservation history (RLS scoped). */
export async function fetchMyReservations() {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("reservation_date", { ascending: false })
    .order("time_slot");
  if (error) throw error;
  return (data ?? []) as Reservation[];
}

/**
 * Member history / cancel — scoped by the contact details of the signed-in
 * mock account (phone or email). Swap for user-scoped queries when the
 * membership system moves to a real backend.
 */
export async function fetchReservationsByContact(phone: string, email: string) {
  const { data, error } = await supabase.rpc("reservations_by_contact", {
    _phone: phone ?? "",
    _email: email ?? "",
  });
  if (error) throw error;
  return (data ?? []) as Reservation[];
}

export async function cancelReservationByContact(id: string, phone: string, email: string) {
  const { data, error } = await supabase.rpc("cancel_reservation_by_contact", {
    _id: id,
    _phone: phone ?? "",
    _email: email ?? "",
  });
  if (error) return { ok: false as const, reason: error.message };
  if (data !== true) return { ok: false as const, reason: "not_found" as const };
  return { ok: true as const };
}

export async function createReservation(input: {
  table_id: string;
  customer_name: string;
  phone: string;
  contact_email?: string | null;
  reservation_date: string;
  time_slot: string;
  party_size: number;
  user_id?: string | null;
}) {
  const { data, error } = await supabase
    .from("reservations")
    .insert({ ...input, status: "confirmed" as const })
    .select()
    .single();
  if (error) {
    if (error.code === "23505" || error.code === "23514") {
      return { ok: false as const, reason: "taken" as const };
    }
    return { ok: false as const, reason: error.message };
  }
  return { ok: true as const, reservation: data as Reservation };
}

export async function setReservationStatus(id: string, status: ReservationStatus) {
  const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

/** Admin edit — checks the target table is free for that date + slot first. */
export async function updateReservation(
  id: string,
  patch: {
    table_id: string;
    reservation_date: string;
    time_slot: string;
    party_size: number;
    customer_name: string;
    phone: string;
  },
) {
  const { data: clash, error: clashErr } = await supabase
    .from("reservations")
    .select("id")
    .eq("table_id", patch.table_id)
    .eq("reservation_date", patch.reservation_date)
    .eq("time_slot", patch.time_slot)
    .neq("status", "cancelled")
    .neq("id", id);
  if (clashErr) return { ok: false as const, reason: clashErr.message };
  if ((clash ?? []).length > 0) return { ok: false as const, reason: "taken" as const };

  const { error } = await supabase.from("reservations").update(patch).eq("id", id);
  if (error) {
    if (error.code === "23505") return { ok: false as const, reason: "taken" as const };
    return { ok: false as const, reason: error.message };
  }
  return { ok: true as const };
}

/** Signed-in customer cancels one of their own reservations. */
export async function cancelMyReservation(id: string) {
  const { error } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}
