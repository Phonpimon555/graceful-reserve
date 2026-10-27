/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { bookingRange, bookingsOverlap, endsByClosing, isSlotBookable, overlappingStartTimes, slotStart } from "./booking-time";
import { bookingQuery, mergeOverlapOccupancy } from "./gasBooking";

describe("2-hour bookings", () => {
  it("a booking picked at 18:00 runs until 20:00", () => {
    expect(bookingRange("18:00-19:00")).toBe("18:00-20:00");
    expect(bookingRange("18:00")).toBe("18:00-20:00");
    expect(bookingRange("9.00")).toBe("09:00-11:00");
  });

  it("the API still receives only the start time", () => {
    expect(slotStart("18:00-19:00")).toBe("18:00");
    expect(bookingQuery("2026-11-01", "18:00-19:00", 4, "VIP")).toEqual({
      date: "2026-11-01", time: "18:00", people: 4, zone: "VIP",
    });
  });

  it("bookings starting less than 2 hours apart overlap", () => {
    expect(bookingsOverlap("18:00", "19:00")).toBe(true);
    expect(bookingsOverlap("18:00", "17:00")).toBe(true);
    expect(bookingsOverlap("18:00", "16:30")).toBe(true);
    expect(bookingsOverlap("18:00", "18:00")).toBe(true);
  });

  it("bookings starting 2 hours or more apart do not overlap", () => {
    expect(bookingsOverlap("18:00", "20:00")).toBe(false);
    expect(bookingsOverlap("18:00", "16:00")).toBe(false);
  });

  it("checks every start time that could overlap 18:00", () => {
    expect(overlappingStartTimes("18:00-19:00")).toEqual([
      "18:00", "16:30", "17:00", "17:30", "18:30", "19:00", "19:30",
    ]);
  });

  it("marks a table taken when an overlapping booking uses it", () => {
    const row = (table_id: string, occupied: boolean) => ({ table_id, zone: "VIP", capacity: 4, occupied });
    const merged = mergeOverlapOccupancy(
      { tables: [row("R01", false), row("R02", false), row("R03", true)] },
      [{ tables: [row("R01", true), row("R02", false), row("R03", false)] }],
    );
    expect(merged.tables.map((t) => [t.table_id, t.occupied])).toEqual([
      ["R01", true], ["R02", false], ["R03", true],
    ]);
  });

  it("the last booking starts at 19:00 so it ends by the 21:00 closing", () => {
    expect(endsByClosing("19:00-20:00")).toBe(true);
    expect(endsByClosing("20:00-21:00")).toBe(false);
    expect(isSlotBookable("2026-12-01", "20:00-21:00", { dateKey: "2026-11-01", minutes: 600 })).toBe(false);
    expect(isSlotBookable("2026-12-01", "19:00-20:00", { dateKey: "2026-11-01", minutes: 600 })).toBe(true);
  });
});
