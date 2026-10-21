import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  canChangeStatus, canHideSheetBooking, interpretStatusUpdateReply, normalizeSheetBookings, sheetStatusValue,
  type RawSheetBooking, type SheetBooking, type StatusUpdateOutcome,
} from "@/lib/sheet-bookings";
import { assertAdmin, callGasAdmin } from "@/lib/sheet-bookings.server";

export type SheetBookingsResult =
  | { ok: true; rows: SheetBooking[]; hiddenKeys: string[]; canUpdateStatus: boolean; fetchedAt: string }
  | { ok: false; code: string; message: string };

async function loadRows() {
  const r = await callGasAdmin({ action: "get_bookings" });
  if (!r.ok) return r;
  const list = Array.isArray(r.data["bookings"]) ? (r.data["bookings"] as RawSheetBooking[]) : [];
  return {
    ok: true as const,
    rows: normalizeSheetBookings(list),
    canUpdateStatus: r.data["can_update_status"] === true,
  };
}

/** Admin: every Data_Booking row (website + LINE), flagged but never modified. */
export const listSheetBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SheetBookingsResult> => {
    await assertAdmin(context);
    const loaded = await loadRows();
    if (!loaded.ok) return { ok: false, code: loaded.code, message: loaded.message };
    const { data: hidden, error } = await context.supabase.from("sheet_booking_hidden").select("key");
    if (error) return { ok: false, code: "hidden_list", message: error.message };
    return {
      ok: true,
      rows: loaded.rows,
      hiddenKeys: (hidden ?? []).map((h) => h.key),
      canUpdateStatus: loaded.canUpdateStatus,
      fetchedAt: new Date().toISOString(),
    };
  });

/** Admin: hide/restore a sheet row in the admin table only. Google Sheets is not touched. */
export const setSheetBookingHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.string().min(3).max(200), hidden: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.hidden) {
      const { error } = await context.supabase.from("sheet_booking_hidden").delete().eq("key", data.key);
      return error ? { ok: false as const, message: error.message } : { ok: true as const };
    }
    const loaded = await loadRows();
    if (!loaded.ok) return { ok: false as const, message: loaded.message };
    const row = loaded.rows.find((r) => r.key === data.key);
    if (!row) return { ok: false as const, message: "not_found" };
    if (!canHideSheetBooking(row)) return { ok: false as const, message: "active" };
    const { error } = await context.supabase.from("sheet_booking_hidden")
      .upsert({ key: row.key, booking_id: row.booking_id, hidden_by: context.userId }, { onConflict: "key" });
    return error ? { ok: false as const, message: error.message } : { ok: true as const };
  });

/**
 * Admin: change booking_status (and updated_at) of exactly one sheet row via Apps Script.
 * Re-reads the sheet first and refuses unidentifiable, duplicated or stale rows.
 */
export const updateSheetBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    booking_id: z.string().regex(/^BK[0-9A-Z]+$/i).max(40),
    next: z.enum(["confirmed", "cancelled", "completed"]),
    expected_status: z.string().max(100),
  }).parse(d))
  .handler(async ({ data, context }): Promise<StatusUpdateOutcome> => {
    await assertAdmin(context);
    const loaded = await loadRows();
    if (!loaded.ok) return { ok: false, code: loaded.code, message: loaded.message };
    if (!loaded.canUpdateStatus) {
      return { ok: false, code: "script_outdated", message: "The deployed Apps Script does not support admin status changes yet" };
    }
    const matches = loaded.rows.filter((r) => r.booking_id.toUpperCase() === data.booking_id.toUpperCase());
    const row = matches[0];
    if (matches.length !== 1 || !row) return { ok: false, code: "not_unique", message: "Booking ID not found or not unique" };
    if (row.status_raw !== data.expected_status) {
      return { ok: false, code: "stale", message: "The status in the sheet changed. Please refresh." };
    }
    if (!canChangeStatus(row, data.next)) return { ok: false, code: "not_allowed", message: "This status change is not allowed" };
    const value = sheetStatusValue(data.next, row.status_raw);
    const r = await callGasAdmin({
      action: "admin_update_status",
      booking_id: row.booking_id,
      new_status: value,
      expected_status: row.status_raw,
      expected_row: row.row,
    });
    return interpretStatusUpdateReply(r, row.booking_id, value);
  });
