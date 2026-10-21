/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  allowedNextStatuses, canChangeStatus, canHideSheetBooking, normalizeSheetBookings,
  normalizeSheetStatus, sheetStatusValue,
} from "./sheet-bookings";

// Rows shaped like the live Apps Script `get_bookings` output.
const rows = normalizeSheetBookings([
  { booking_id: "BK7978CCC0", member_id: "-", name: "ครีม", phone: "9999999", date: "2026-10-20", time: "15:00", people: -2208964000000, zone: "สวน", booking_status: "ยืนยันแล้ว" },
  { booking_id: "<<booking_id>>", member_id: "-", name: "<<name>>", phone: "<<phone>>", date: "<<date>>", time: "<<time>>", people: null, table_id: "<<API_หาโต๊ะว่าง.table_id>>", zone: "<<zone>>", booking_status: "<<booking_status>>", created_at: "2026-10-20 17:49:59" },
  { booking_id: "<<booking_id>>", member_id: "-", name: "<<name>>", phone: "<<phone>>", date: "<<date>>", time: "<<time>>", people: null, created_at: "2026-10-20 18:44:27" },
  { booking_id: "BK7984", member_id: "MEM0001", name: "Cream", phone: "0934793743", date: "2026-10-20", time: "20:00", people: 2, table_id: "A04", zone: "สวน", booking_status: "Confirmed" },
  { booking_id: "BK9001", date: "2026-10-22", time: "13:00", people: 2, booking_status: "Confirmed" },
  { booking_id: "BK9001", date: "2026-10-22", time: "14:00", people: 2, booking_status: "Confirmed" },
]);

describe("sheet booking statuses", () => {
  test("ยกเลิกแล้ว counts as cancelled", () => expect(normalizeSheetStatus("ยกเลิกแล้ว")).toBe("cancelled"));
  test("Cancelled counts as cancelled", () => expect(normalizeSheetStatus("Cancelled")).toBe("cancelled"));
  test("ยืนยันแล้ว counts as confirmed", () => expect(normalizeSheetStatus("ยืนยันแล้ว")).toBe("confirmed"));
  test("a placeholder status is unknown", () => expect(normalizeSheetStatus("<<booking_status>>")).toBe("unknown"));
});

describe("malformed rows are flagged, not repaired", () => {
  test("placeholder row is flagged and cannot be identified", () => {
    expect(rows[1].warnings).toContain("placeholder");
    expect(rows[1].identifiable).toBe(false);
    expect(rows[1].name).toBe("<<name>>");
  });
  test("a date-formatted guest count is invalid", () => expect(rows[0].people).toBeNull());
  test("two placeholder rows keep separate keys", () => expect(rows[1].key).not.toBe(rows[2].key));
  test("a duplicated booking ID cannot be updated", () => {
    expect(rows[4].warnings).toContain("duplicate_id");
    expect(canChangeStatus(rows[4], "cancelled")).toBe(false);
  });
  test("a valid unique booking can be cancelled", () => expect(canChangeStatus(rows[3], "cancelled")).toBe(true));
  test("website bookings are labelled web, others LINE", () => {
    expect(rows[3].channel).toBe("web");
    expect(rows[0].channel).toBe("line");
  });
  test("start time is shown as the one-hour slot", () => expect(rows[3].time_slot).toBe("20:00-21:00"));
});

describe("admin status rules", () => {
  test("cancelled bookings are never reopened", () => expect(allowedNextStatuses("cancelled")).toEqual([]));
  test("Thai rows keep Thai status text", () => expect(sheetStatusValue("cancelled", "ยืนยันแล้ว")).toBe("ยกเลิกแล้ว"));
  test("English rows keep English status text", () => expect(sheetStatusValue("completed", "Confirmed")).toBe("Completed"));
  test("an active identifiable booking cannot be hidden", () => expect(canHideSheetBooking(rows[3])).toBe(false));
  test("an unidentifiable row can be hidden from the admin table", () => expect(canHideSheetBooking(rows[1])).toBe(true));
});
