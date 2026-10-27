/**
 * Booking date/time rules — always evaluated against the real current
 * date and time in Asia/Bangkok. Nothing here is hardcoded.
 */
import { useEffect, useState } from "react";

export const BOOKING_TZ = "Asia/Bangkok";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOOKING_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export type BangkokNow = { dateKey: string; minutes: number };

/** Current Bangkok date (yyyy-MM-dd) and minutes since midnight. */
export function bangkokNow(at: Date = new Date()): BangkokNow {
  const parts = partsFormatter.formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(hour) * 60 + Number(get("minute")),
  };
}

/** yyyy-MM-dd for a calendar Date, using its local calendar fields. */
export function toDateKey(date: Date) {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** A Date object positioned on today's Bangkok calendar day (for the picker). */
export function bangkokToday(now: BangkokNow = bangkokNow()) {
  const [y, m, d] = now.dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isPastDateKey(dateKey: string, now: BangkokNow = bangkokNow()) {
  return dateKey < now.dateKey;
}

/** Start minute of a "HH:MM-HH:MM" slot. */
export function slotStartMinutes(slot: string) {
  const [h, m] = slot.split("-")[0].split(":").map(Number);
  return h * 60 + m;
}

/**
 * A slot is bookable when its date is in the future, or when it is today
 * and the slot has not started yet.
 */
export function isSlotBookable(
  dateKey: string,
  slot: string,
  now: BangkokNow = bangkokNow(),
) {
  if (!dateKey) return false;
  if (dateKey < now.dateKey) return false;
  if (dateKey > now.dateKey) return true;
  return slotStartMinutes(slot) > now.minutes;
}

/** Re-renders every 30s so passed slots disable themselves on an open page. */
export function useBangkokNow(intervalMs = 30_000): BangkokNow {
  const [now, setNow] = useState<BangkokNow>(() => bangkokNow());
  useEffect(() => {
    const id = setInterval(() => setNow(bangkokNow()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ---------------------------------------------------------------------------
// Two-hour bookings. The sheet stores only the start time; every booking
// (website or LINE) is treated as lasting BOOKING_DURATION_MIN from that start.
// ---------------------------------------------------------------------------

/** Each booking holds its table for 2 hours (e.g. 18:00 → 20:00). */
export const BOOKING_DURATION_MIN = 120;
/** Granularity used to look for other bookings that start inside the 2-hour window. */
export const OVERLAP_STEP_MIN = 30;

const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtMinutes = (m: number) => `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`;

/**
 * Start minute of any time value we may see: a website slot ("18:00-19:00"),
 * a sheet/LINE start time ("18:00", "18.00", "9.00"). Null when unreadable.
 */
export function startMinutesOf(v: unknown): number | null {
  const m = String(v ?? "").trim().match(/^(\d{1,2})[.:](\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** "HH:MM" start time sent to the API (the API's `time` is always the start). */
export function slotStart(v: unknown): string {
  const m = startMinutesOf(v);
  return m === null ? String(v ?? "").trim() : fmtMinutes(m);
}

/** Customer-facing booking period, e.g. "18:00" → "18:00-20:00". */
export function bookingRange(v: unknown): string {
  const m = startMinutesOf(v);
  if (m === null) return String(v ?? "").trim();
  return `${fmtMinutes(m)}-${fmtMinutes(m + BOOKING_DURATION_MIN)}`;
}

/** Two 2-hour bookings overlap when their starts are less than 2 hours apart. */
export function bookingsOverlap(a: unknown, b: unknown): boolean {
  const x = startMinutesOf(a);
  const y = startMinutesOf(b);
  if (x === null || y === null) return false;
  return Math.abs(x - y) < BOOKING_DURATION_MIN;
}

/**
 * Every start time whose 2-hour booking would overlap a booking starting at `start`
 * (the start itself first), e.g. 18:00 → 18:00, 16:30, 17:00, 17:30, 18:30, 19:00, 19:30.
 */
export function overlappingStartTimes(start: unknown): string[] {
  const s = startMinutesOf(start);
  if (s === null) return [];
  const out = [fmtMinutes(s)];
  for (let d = OVERLAP_STEP_MIN; d < BOOKING_DURATION_MIN; d += OVERLAP_STEP_MIN) {
    if (s - d >= 0) out.push(fmtMinutes(s - d));
    if (s + d < 24 * 60) out.push(fmtMinutes(s + d));
  }
  return out.sort((a, b) => (a === out[0] ? -1 : b === out[0] ? 1 : a.localeCompare(b)));
}
