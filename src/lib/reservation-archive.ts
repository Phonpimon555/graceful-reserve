import type { ReservationStatus } from "@/lib/reservations";

/** Statuses that no longer hold a table — the only ones an admin may hide or delete. */
export const ARCHIVABLE_STATUSES: ReservationStatus[] = ["cancelled", "completed"];

export function canArchive(status: ReservationStatus) {
  return ARCHIVABLE_STATUSES.includes(status);
}

/** Split rows into the main table and the hidden tab. */
export function splitByArchive<T extends { is_archived?: boolean | null }>(rows: T[]) {
  const visible: T[] = [];
  const hidden: T[] = [];
  for (const r of rows) (r.is_archived ? hidden : visible).push(r);
  return { visible, hidden };
}
