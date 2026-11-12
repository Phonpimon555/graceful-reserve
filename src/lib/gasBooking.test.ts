/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { countFreeTables, mergeAdminTablesWithSheetStatus, sheetSlot, type TableStatusRow } from "./gasBooking";

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

// Same mix as the live Data_Table: 20 riverside (4), 14 garden (2), 6 garden (6), 10 VIP (8).
const tbl = (id: string, zone: string, capacity: number, occupied = false): TableStatusRow => ({ table_id: id, zone, capacity, occupied });
const live: TableStatusRow[] = [
  ...Array.from({ length: 20 }, (_, i) => tbl(`R${i + 1}`, "ริมบึง", 4, i === 0)),
  ...Array.from({ length: 14 }, (_, i) => tbl(`A${i + 1}`, "สวน", 2)),
  ...Array.from({ length: 6 }, (_, i) => tbl(`G${i + 1}`, "สวน", 6)),
  ...Array.from({ length: 10 }, (_, i) => tbl(`V${i + 1}`, "VIP", 8)),
];

describe("free tables for the selected period", () => {
  it("one overlapping booking out of 50 tables shows 49/50", () => {
    expect(countFreeTables(live, { zone: "all", people: 2 })).toEqual({ free: 49, total: 50 });
  });
  it("only counts tables big enough for the guests", () => {
    expect(countFreeTables(live, { zone: "all", people: 5 })).toEqual({ free: 16, total: 16 });
  });
  it("only counts tables in the chosen zone", () => {
    expect(countFreeTables(live, { zone: "Riverside", people: 2 })).toEqual({ free: 19, total: 20 });
  });
  it("a table the script marks occupied is never counted as free", () => {
    expect(countFreeTables([tbl("V01", "VIP", 8, true)], { zone: "VIP", people: 2 })).toEqual({ free: 0, total: 1 });
  });
});
