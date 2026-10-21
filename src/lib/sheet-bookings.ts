/**
 * Admin view of the Google Sheets "Data_Booking" rows (website + LINE).
 * Pure helpers only — safe for both browser and server.
 * Nothing here changes sheet data: malformed rows are flagged, never repaired.
 */
import { sheetSlot } from "@/lib/gasBooking";

export type SheetStatus = "pending" | "confirmed" | "cancelled" | "completed" | "unknown";
export type SheetZone = "Riverside" | "AirConditioned" | "VIP";

/** One row as returned by the Apps Script `get_bookings` action. */
export type RawSheetBooking = {
  row?: unknown;
  booking_id?: unknown; member_id?: unknown; name?: unknown; phone?: unknown;
  date?: unknown; time?: unknown; people?: unknown; table_id?: unknown; zone?: unknown;
  booking_status?: unknown; created_at?: unknown; updated_at?: unknown;
};

export type SheetWarning =
  | "placeholder" | "error_value" | "missing_id" | "invalid_id" | "duplicate_id"
  | "invalid_date" | "invalid_time" | "invalid_people" | "unknown_status";

export type SheetBooking = {
  key: string;
  row: number | null;
  booking_id: string;
  member_id: string;
  channel: "web" | "line";
  name: string;
  phone: string;
  date: string | null;
  date_raw: string;
  time_slot: string | null;
  time_raw: string;
  people: number | null;
  table_id: string;
  zone: SheetZone | null;
  zone_raw: string;
  status: SheetStatus;
  status_raw: string;
  created_at: string;
  updated_at: string;
  warnings: SheetWarning[];
  /** True only when the booking ID is valid and appears exactly once in the sheet. */
  identifiable: boolean;
};

const text = (v: unknown) => (v === null || v === undefined ? "" : String(v)).trim();
const PLACEHOLDER = /<<[^>]*>>/;
const ERROR_VALUE = /^#(NUM|REF|VALUE|N\/A|DIV\/0|NAME|NULL|ERROR)[!?]?/i;
const VALID_ID = /^BK[0-9A-Z]+$/i;

/** Map every status spelling used by the website, LINE and the sheet. */
export function normalizeSheetStatus(v: unknown): SheetStatus {
  const s = text(v).toLowerCase();
  if (!s) return "unknown";
  if (s.includes("cancel") || s.includes("ยกเลิก")) return "cancelled";
  if (s.includes("complete") || s.includes("เสร็จ")) return "completed";
  if (s.includes("pending") || s.includes("รอ")) return "pending";
  if (s.includes("confirm") || s === "ยืนยัน" || s === "ยืนยันแล้ว") return "confirmed";
  return "unknown";
}

export function sheetZoneKey(v: unknown): SheetZone | null {
  const s = text(v).toLowerCase();
  if (s === "ริมบึง" || s === "riverside") return "Riverside";
  if (s === "สวน" || s === "airconditioned" || s === "garden") return "AirConditioned";
  if (s === "vip") return "VIP";
  return null;
}

function validDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Stable fingerprint for rows that cannot be identified by booking ID. */
function fingerprint(parts: string[]) {
  let h = 0x811c9dc5;
  for (const ch of parts.join("\u241f")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function normalizeSheetBookings(raw: RawSheetBooking[]): SheetBooking[] {
  const idCount = new Map<string, number>();
  for (const r of raw) {
    const id = text(r.booking_id).toUpperCase();
    if (id) idCount.set(id, (idCount.get(id) ?? 0) + 1);
  }

  return raw.map((r) => {
    const booking_id = text(r.booking_id);
    const fields = {
      member_id: text(r.member_id), name: text(r.name), phone: text(r.phone),
      date_raw: text(r.date), time_raw: text(r.time), table_id: text(r.table_id),
      zone_raw: text(r.zone), status_raw: text(r.booking_status),
      created_at: text(r.created_at), updated_at: text(r.updated_at),
    };
    const warnings: SheetWarning[] = [];
    const all = [booking_id, ...Object.values(fields), text(r.people)];
    if (all.some((v) => PLACEHOLDER.test(v))) warnings.push("placeholder");
    if (all.some((v) => ERROR_VALUE.test(v))) warnings.push("error_value");

    const idUpper = booking_id.toUpperCase();
    if (!booking_id) warnings.push("missing_id");
    else if (!VALID_ID.test(booking_id)) warnings.push("invalid_id");
    else if ((idCount.get(idUpper) ?? 0) > 1) warnings.push("duplicate_id");
    const identifiable = !!booking_id && VALID_ID.test(booking_id) && idCount.get(idUpper) === 1;

    const date = validDate(fields.date_raw) ? fields.date_raw : null;
    if (!date) warnings.push("invalid_date");
    const slot = sheetSlot(fields.time_raw);
    const time_slot = /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(slot) ? slot : null;
    if (!time_slot) warnings.push("invalid_time");
    const n = typeof r.people === "number" ? r.people : Number(text(r.people));
    const people = Number.isInteger(n) && n > 0 && n < 100 ? n : null;
    if (people === null) warnings.push("invalid_people");
    const status = normalizeSheetStatus(fields.status_raw);
    if (status === "unknown") warnings.push("unknown_status");

    const rowNum = Number(r.row);
    const key = identifiable
      ? `id:${idUpper}`
      : `fp:${fingerprint([booking_id, fields.member_id, fields.name, fields.phone, fields.date_raw,
        fields.time_raw, text(r.people), fields.table_id, fields.zone_raw, fields.created_at])}`;

    return {
      key,
      row: Number.isInteger(rowNum) && rowNum > 1 ? rowNum : null,
      booking_id,
      channel: /^MEM/i.test(fields.member_id) ? "web" : "line",
      ...fields,
      date,
      time_slot,
      people,
      zone: sheetZoneKey(fields.zone_raw),
      status,
      warnings,
      identifiable,
    } satisfies SheetBooking;
  });
}

/** Status changes an admin may make. Finished bookings are never reopened. */
export function allowedNextStatuses(current: SheetStatus): SheetStatus[] {
  if (current === "pending") return ["confirmed", "cancelled"];
  if (current === "confirmed") return ["completed", "cancelled"];
  return [];
}

export function canChangeStatus(b: Pick<SheetBooking, "identifiable" | "status">, next: SheetStatus) {
  return b.identifiable && allowedNextStatuses(b.status).includes(next);
}

/**
 * Value written to the sheet. Rows already using Thai statuses (LINE) keep Thai;
 * others use the English values the website writes.
 */
export function sheetStatusValue(next: SheetStatus, currentRaw: string): string {
  const thai = /[\u0E00-\u0E7F]/.test(currentRaw);
  const map: Record<Exclude<SheetStatus, "unknown">, [string, string]> = {
    pending: ["Pending", "รอยืนยัน"],
    confirmed: ["Confirmed", "ยืนยันแล้ว"],
    cancelled: ["Cancelled", "ยกเลิกแล้ว"],
    completed: ["Completed", "เสร็จสิ้นแล้ว"],
  };
  if (next === "unknown") throw new Error("invalid status");
  return map[next][thai ? 1 : 0];
}

/**
 * Hiding only removes a row from the admin table (the sheet is untouched).
 * Allowed for finished bookings, and for rows that cannot be identified safely.
 */
export function canHideSheetBooking(b: Pick<SheetBooking, "identifiable" | "status">) {
  return !b.identifiable || b.status === "cancelled" || b.status === "completed";
}
