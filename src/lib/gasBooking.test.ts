/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { sheetSlot } from "./gasBooking";

describe("sheetSlot", () => {
  it("reads a start time saved by the booking sheet as the one-hour slot", () => {
    expect(sheetSlot("20:00")).toBe("20:00-21:00");
  });
  it("reads a dotted start time from LINE as the same slot", () => {
    expect(sheetSlot("9.00")).toBe("09:00-10:00");
  });
  it("keeps a full slot unchanged", () => {
    expect(sheetSlot("11:00-12:00")).toBe("11:00-12:00");
  });
});
