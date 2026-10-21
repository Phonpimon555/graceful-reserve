/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { canArchive, splitByArchive } from "./reservation-archive";

describe("hiding and deleting old reservations", () => {
  test("completed reservations can be hidden or deleted", () => {
    expect(canArchive("completed")).toBe(true);
  });
  test("cancelled reservations can be hidden or deleted", () => {
    expect(canArchive("cancelled")).toBe(true);
  });
  test("confirmed reservations cannot be hidden or deleted", () => {
    expect(canArchive("confirmed")).toBe(false);
  });
  test("pending reservations cannot be hidden or deleted", () => {
    expect(canArchive("pending")).toBe(false);
  });
  test("hidden rows leave the main table and appear only in the hidden tab", () => {
    const { visible, hidden } = splitByArchive([
      { id: "a", is_archived: false },
      { id: "b", is_archived: true },
      { id: "c" },
    ]);
    expect(visible.map((r) => r.id)).toEqual(["a", "c"]);
    expect(hidden.map((r) => r.id)).toEqual(["b"]);
  });
});
