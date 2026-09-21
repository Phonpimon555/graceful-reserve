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
