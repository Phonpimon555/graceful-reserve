import { createServerFn } from "@tanstack/react-start";
import { bangkokNow } from "@/lib/booking-time";
import { availableTablesNow, isOpenAt, TOTAL_TABLES } from "@/lib/live-stats";
import { normalizeSheetBookings, type RawSheetBooking, type SheetBooking } from "@/lib/sheet-bookings";
import { callGasAdmin } from "@/lib/sheet-bookings.server";

export type TablesNowResult =
  | { ok: true; open: boolean; available: number | null; total: number; asOf: string }
  | { ok: false; message: string };

// Short server-side cache so many visitors don't each hit Apps Script.
let cache: { at: number; rows: SheetBooking[] } | null = null;
const CACHE_MS = 20_000;

/**
 * Public: how many of the 50 tables are free right now (Bangkok time).
 * Returns counts only — never any booking or customer details.
 */
export const getTablesAvailableNow = createServerFn({ method: "GET" }).handler(async (): Promise<TablesNowResult> => {
  const now = bangkokNow();
  const asOf = new Date().toISOString();
  if (!isOpenAt(now)) return { ok: true, open: false, available: null, total: TOTAL_TABLES, asOf };

  if (!cache || Date.now() - cache.at > CACHE_MS) {
    const r = await callGasAdmin({ action: "get_bookings" });
    if (!r.ok) {
      console.error(`tables-now: Apps Script read failed [${r.code}]: ${r.message}`);
      return { ok: false, message: "unavailable" };
    }
    const list = Array.isArray(r.data["bookings"]) ? (r.data["bookings"] as RawSheetBooking[]) : [];
    cache = { at: Date.now(), rows: normalizeSheetBookings(list) };
  }
  return { ok: true, open: true, available: availableTablesNow(cache.rows, now), total: TOTAL_TABLES, asOf };
});
