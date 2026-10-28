/**
 * Booking calls to the deployed Google Apps Script API.
 * Actions verified against the live deployment: availability, booking, history, cancel_booking.
 * Requests use text/plain so the browser sends a "simple" POST (no CORS preflight);
 * fetch follows Apps Script's 302 redirect to script.googleusercontent.com automatically.
 */
import { GAS_API_URL } from "@/lib/auth/gasAuth";
import { overlappingStartTimes, slotStart } from "@/lib/booking-time";

export type GasResult<T> = { ok: true; data: T } | { ok: false; message: string };

const NET_ERR = "ไม่สามารถเชื่อมต่อระบบได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";

async function parse<T>(res: Response, fallback: string): Promise<GasResult<T>> {
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { return { ok: false, message: "ระบบตอบกลับไม่ถูกต้อง กรุณาลองใหม่ภายหลัง" }; }
  if (data?.status === "success") return { ok: true, data: data as T };
  return { ok: false, message: String(data?.message || fallback) };
}

/** POST for actions that write or need member data (login, booking, history, cancel). */
async function call<T>(body: Record<string, unknown>, fallback: string): Promise<GasResult<T>> {
  try {
    const res = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    });
    return await parse<T>(res, fallback);
  } catch {
    return { ok: false, message: NET_ERR };
  }
}

/** GET (doGet) for read-only actions: availability, tables. Always fetches fresh data. */
async function get<T>(params: Record<string, string | number | undefined>, fallback: string): Promise<GasResult<T>> {
  try {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    qs.set("_ts", String(Date.now()));
    const res = await fetch(`${GAS_API_URL}?${qs.toString()}`, { method: "GET", cache: "no-store" });
    return await parse<T>(res, fallback);
  } catch {
    return { ok: false, message: NET_ERR };
  }
}

/** Zone names exactly as written in the Data_Table sheet's "zone" column. */
export function sheetZone(z: string): string {
  if (z === "Riverside") return "ริมบึง";
  if (z === "AirConditioned") return "สวน";
  return "VIP";
}

/** Reverse of sheetZone — map a sheet zone value back to the app's zone key. */
export function zoneFromSheet(z: string): string {
  const s = z.trim();
  if (s === "ริมบึง") return "Riverside";
  if (s === "สวน") return "AirConditioned";
  return "VIP";
}

export type AvailabilityResult = {
  table_id: string; zone: string; capacity: number; date: string; time: string; people: number; message?: string;
  available_tables?: { table_id: string; zone: string; capacity: number }[];
};

/** `time` is always the booking's start time ("18:00"); the booking lasts 2 hours. */
export type BookingQuery = { date: string; time: string; people: number; zone: string };

/** Build the API query from a picked slot, sending only its start time. */
export const bookingQuery = (date: string, slot: string, people: number, zone: string): BookingQuery =>
  ({ date, time: slotStart(slot), people, zone });

export const checkAvailability = (q: BookingQuery) =>
  get<AvailabilityResult>({ action: "availability", ...q }, "ไม่มีโต๊ะว่างในช่วงเวลาที่เลือก กรุณาเลือกเวลาหรือโซนใหม่");

export type BookingResult = {
  booking_id: string; name?: string; phone?: string; table_id?: string; zone?: string;
  people?: number; booking_status?: string; date?: string; time?: string; message?: string;
};

export type TableStatusRow = { table_id: string; zone: string; capacity: number; status?: string; occupied: boolean };

export type TablesStatusResult = { tables: TableStatusRow[] };

/** Per-table occupancy for a date/time (and optional zone), read live from the sheet via GET. */
export const fetchTablesStatus = (q: { date: string; time: string; zone?: string }) =>
  get<TablesStatusResult>({ action: "tables", ...q }, "โหลดสถานะโต๊ะไม่สำเร็จ");

/**
 * Merge `tables` replies for every overlapping start time into one map:
 * the table list comes from the selected start, and a table counts as taken
 * when any reply marks it occupied (another 2-hour booking overlaps).
 */
export function mergeOverlapOccupancy(main: TablesStatusResult, others: TablesStatusResult[]): TablesStatusResult {
  const taken = new Set<string>();
  for (const r of [main, ...others]) {
    for (const t of r.tables ?? []) if (t.occupied) taken.add(String(t.table_id).trim().toUpperCase());
  }
  return {
    ...main,
    tables: (main.tables ?? []).map((t) => ({
      ...t,
      occupied: taken.has(String(t.table_id).trim().toUpperCase()),
    })),
  };
}

/**
 * Table occupancy for a 2-hour booking starting at `time`. The deployed
 * `tables` action already marks a table occupied when another booking starts
 * less than 2 hours before or after `time`, so it is read exactly once with the
 * start time. Re-reading neighbouring start times would widen the window to
 * ~3.5 hours and wrongly mark e.g. 13:00 taken after an 11:00-13:00 booking.
 */
export async function fetchTablesStatusForPeriod(q: { date: string; time: string; zone?: string }): Promise<GasResult<TablesStatusResult>> {
  const start = overlappingStartTimes(q.time)[0];
  if (!start) return { ok: false, message: "เวลาไม่ถูกต้อง" };
  return fetchTablesStatus({ ...q, time: start });
}

export const createBooking = (member_id: string, q: BookingQuery, opts?: { table_id?: string; name?: string; phone?: string }) =>
  call<BookingResult>({ action: "booking", member_id, ...q, ...opts }, "จองไม่สำเร็จ กรุณาลองใหม่");

export type GasBooking = {
  booking_id: string; name: string; phone: string; date: string; time: string; people: number;
  table_id: string; zone: string; booking_status: string; created_at: string; updated_at: string;
};

export async function fetchHistory(member_id: string) {
  const r = await call<{ bookings: GasBooking[] }>({ action: "history", member_id }, "โหลดประวัติการจองไม่สำเร็จ");
  if (!r.ok) throw new Error(r.message);
  return r.data.bookings ?? [];
}

export const cancelBooking = (member_id: string, booking_id: string) =>
  call<{ message?: string }>({ action: "cancel_booking", member_id, booking_id }, "ยกเลิกการจองไม่สำเร็จ");

/** Sheet cells formatted as dates can come back as huge/negative numbers — show those as unknown. */
export function safePeople(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 && v < 100 ? v : null;
}

/** Sheet date cells may arrive as ISO timestamps; keep just yyyy-MM-dd in Bangkok. */
export function sheetDate(v: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

/**
 * The sheet stores the slot's start time ("20:00", "20.00") or the full slot
 * ("20:00-21:00"). Return the website's one-hour slot ("20:00-21:00").
 */
export function sheetSlot(v: unknown): string {
  const s = String(v ?? "").trim();
  const full = s.match(/^(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})$/);
  if (full) return `${full[1].padStart(2, "0")}:${full[2]}-${full[3].padStart(2, "0")}:${full[4]}`;
  const start = s.match(/^(\d{1,2})[.:](\d{2})$/);
  if (!start) return s;
  const h = Number(start[1]);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${start[2]}-${pad((h + 1) % 24)}:${start[2]}`;
}
