/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { adminTodayCounts, availableTablesNow, cancelledDay, isOpenAt, tablesInUseNow } from "./live-stats";

const at = (dateKey: string, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return { dateKey, minutes: h * 60 + m };
};
const b = (date: string, time: string, table: string, status: "confirmed" | "cancelled" | "completed" | "pending" | "unknown" = "confirmed") =>
  ({ date, time_raw: time, table_id: table, status });

describe("tables available now", () => {
  const rows = [
    b("2026-10-29", "15:00", "V01"),
    b("2026-10-29", "15:00", "V02"),
    b("2026-10-29", "11:00", "V03"),
    b("2026-10-29", "17:00", "V04"),
    b("2026-10-29", "15:00", "A01", "cancelled"),
    b("2026-10-28", "15:00", "A02"),
  ];
  test("a 15:00 booking holds its table at 15:19", () => expect(tablesInUseNow(rows, at("2026-10-29", "15:19")).has("V01")).toBe(true));
  test("48 of 50 free at 15:19", () => expect(availableTablesNow(rows, at("2026-10-29", "15:19"))).toBe(48));
  test("an 11:00 booking frees its table at 13:00", () => expect(tablesInUseNow(rows, at("2026-10-29", "13:00")).has("V03")).toBe(false));
  test("a 17:00 booking does not hold its table at 16:59", () => expect(tablesInUseNow(rows, at("2026-10-29", "16:59")).has("V04")).toBe(false));
  test("cancelled bookings never hold a table", () => expect(tablesInUseNow(rows, at("2026-10-29", "15:30")).has("A01")).toBe(false));
  test("yesterday's booking does not count today", () => expect(tablesInUseNow(rows, at("2026-10-29", "15:30")).has("A02")).toBe(false));
  test("LINE time 15.00 counts like 15:00", () => expect(availableTablesNow([b("2026-10-29", "15.00", "R01")], at("2026-10-29", "16:00"))).toBe(49));
});

describe("opening hours 11:00–21:00", () => {
  test("closed at 10:59", () => expect(isOpenAt(at("2026-10-29", "10:59"))).toBe(false));
  test("open at 11:00", () => expect(isOpenAt(at("2026-10-29", "11:00"))).toBe(true));
  test("open at 20:59", () => expect(isOpenAt(at("2026-10-29", "20:59"))).toBe(true));
  test("closed at 21:00", () => expect(isOpenAt(at("2026-10-29", "21:00"))).toBe(false));
});

describe("admin today counts", () => {
  const c = (date: string, status: "confirmed" | "cancelled" | "unknown", created: string, updated: string) =>
    ({ date, status, created_at: created, updated_at: updated });
  test("cancellation day comes from updated_at in Bangkok time", () =>
    expect(cancelledDay(c("2026-11-05", "cancelled", "2026-10-27T08:00:00.000Z", "2026-10-28T18:30:00.000Z"))).toBe("2026-10-29"));
  test("no cancellation date when updated_at was never changed", () =>
    expect(cancelledDay(c("2026-10-29", "cancelled", "2026-10-29T03:00:00.000Z", "2026-10-29T03:00:00.000Z"))).toBe(null));
  test("no cancellation date when updated_at is empty", () =>
    expect(cancelledDay(c("2026-10-29", "cancelled", "2026-10-29T03:00:00.000Z", ""))).toBe(null));

  const rows = [
    c("2026-10-29", "confirmed", "2026-10-28T10:00:00.000Z", "2026-10-28T10:00:00.000Z"),
    c("2026-10-29", "confirmed", "2026-10-28T10:00:00.000Z", "2026-10-28T10:00:00.000Z"),
    c("2026-10-29", "cancelled", "2026-10-28T10:00:00.000Z", "2026-10-28T11:00:00.000Z"),
    c("2026-11-02", "cancelled", "2026-10-28T10:00:00.000Z", "2026-10-29T02:00:00.000Z"),
    c("2026-10-29", "cancelled", "2026-10-29T02:00:00.000Z", "2026-10-29T02:00:00.000Z"),
  ];
  const counts = adminTodayCounts(rows, "2026-10-29");
  test("bookings today excludes cancelled", () => expect(counts.bookingsToday).toBe(2));
  test("cancellations today use the cancel date, not the booking date", () => expect(counts.cancelledToday).toBe(1));
  test("cancellations without a date are not guessed", () => expect(counts.cancelledNoDate).toBe(1));
});
