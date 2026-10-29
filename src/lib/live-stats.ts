/**
 * Live counters for the customer page and the admin dashboard, computed from
 * the real Google Sheets rows (website + LINE). Pure helpers — no I/O.
 */
import { BOOKING_DURATION_MIN, BOOKING_TZ, CLOSING_MIN, startMinutesOf, type BangkokNow } from "@/lib/booking-time";
import type { SheetBooking } from "@/lib/sheet-bookings";

/** The restaurant has 50 tables in total. */
export const TOTAL_TABLES = 50;
/** Opening time 11:00 (closing time 21:00 lives in booking-time.ts). */
export const OPENING_MIN = 11 * 60;

/** True between 11:00 and 21:00 Bangkok time. */
export function isOpenAt(now: BangkokNow) {
  return now.minutes >= OPENING_MIN && now.minutes < CLOSING_MIN;
}

type Row = Pick<SheetBooking, "date" | "time_raw" | "table_id" | "status">;

const BAD_CELL = /<<|^#/;

/**
 * Tables in use right now: an active (pending/confirmed) booking for today whose
 * 2-hour period has started and not ended yet. Cancelled, completed and
 * unreadable rows never hold a table.
 */
export function tablesInUseNow(rows: Row[], now: BangkokNow): Set<string> {
  const used = new Set<string>();
  for (const r of rows) {
    if (r.date !== now.dateKey) continue;
    if (r.status !== "pending" && r.status !== "confirmed") continue;
    const table = String(r.table_id ?? "").trim().toUpperCase();
    if (!table || BAD_CELL.test(table)) continue;
    const start = startMinutesOf(r.time_raw);
    if (start === null) continue;
    if (start <= now.minutes && now.minutes < start + BOOKING_DURATION_MIN) used.add(table);
  }
  return used;
}

export function availableTablesNow(rows: Row[], now: BangkokNow, total = TOTAL_TABLES) {
  return Math.max(total - tablesInUseNow(rows, now).size, 0);
}

const bkkDate = new Intl.DateTimeFormat("en-CA", { timeZone: BOOKING_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * Bangkok calendar day of a timestamp that carries its own time zone
 * (e.g. "2026-10-28T07:19:05.910Z"). Anything else is unknown → null.
 */
export function bangkokDayOf(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(s)) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : bkkDate.format(d);
}

/**
 * Day the booking was cancelled, from the sheet's updated_at (written when the
 * status changes). Never taken from the booking date. Unknown when the row is
 * not cancelled, has no readable updated_at, or updated_at was never changed
 * after the booking was created.
 */
export function cancelledDay(r: Pick<SheetBooking, "status" | "created_at" | "updated_at">): string | null {
  if (r.status !== "cancelled") return null;
  const updated = String(r.updated_at ?? "").trim();
  if (!updated || updated === String(r.created_at ?? "").trim()) return null;
  return bangkokDayOf(updated);
}

export type AdminTodayCounts = {
  /** Bookings dated today that are not cancelled. */
  bookingsToday: number;
  /** Bookings cancelled today (by real cancellation date). */
  cancelledToday: number;
  /** Cancelled rows whose cancellation date is unknown — not counted anywhere. */
  cancelledNoDate: number;
  /** Rows dated today whose status cannot be read — not counted. */
  unknownStatusToday: number;
};

export function adminTodayCounts(
  rows: Pick<SheetBooking, "date" | "status" | "created_at" | "updated_at">[],
  todayKey: string,
): AdminTodayCounts {
  const out: AdminTodayCounts = { bookingsToday: 0, cancelledToday: 0, cancelledNoDate: 0, unknownStatusToday: 0 };
  for (const r of rows) {
    if (r.date === todayKey) {
      if (r.status === "unknown") out.unknownStatusToday++;
      else if (r.status !== "cancelled") out.bookingsToday++;
    }
    if (r.status === "cancelled") {
      const day = cancelledDay(r);
      if (day === null) out.cancelledNoDate++;
      else if (day === todayKey) out.cancelledToday++;
    }
  }
  return out;
}
