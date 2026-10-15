/**
 * Booking calls to the deployed Google Apps Script API.
 * Actions verified against the live deployment: availability, booking, history, cancel_booking.
 * Requests use text/plain so the browser sends a "simple" POST (no CORS preflight);
 * fetch follows Apps Script's 302 redirect to script.googleusercontent.com automatically.
 */
import { GAS_API_URL } from "@/lib/auth/gasAuth";

export type GasResult<T> = { ok: true; data: T } | { ok: false; message: string };

const NET_ERR = "ไม่สามารถเชื่อมต่อระบบได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";

async function call<T>(body: Record<string, unknown>, fallback: string): Promise<GasResult<T>> {
  try {
    const res = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { return { ok: false, message: "ระบบตอบกลับไม่ถูกต้อง กรุณาลองใหม่ภายหลัง" }; }
    if (data?.status === "success") return { ok: true, data: data as T };
    return { ok: false, message: String(data?.message || fallback) };
  } catch {
    return { ok: false, message: NET_ERR };
  }
}

/** Zone names exactly as written in the Data_Table sheet's "zone" column. */
export function sheetZone(z: string): string {
  if (z === "Riverside") return "ริมบึง";
  if (z === "AirConditioned") return "สวน";
  return "VIP";
}

export type AvailabilityResult = {
  table_id: string; zone: string; capacity: number; date: string; time: string; people: number; message?: string;
};

export type BookingQuery = { date: string; time: string; people: number; zone: string };

export const checkAvailability = (q: BookingQuery) =>
  call<AvailabilityResult>({ action: "availability", ...q }, "ไม่มีโต๊ะว่างในช่วงเวลาที่เลือก กรุณาเลือกเวลาหรือโซนใหม่");

export type BookingResult = {
  booking_id: string; name?: string; phone?: string; table_id?: string; zone?: string;
  people?: number; booking_status?: string; date?: string; time?: string; message?: string;
};

export const createBooking = (member_id: string, q: BookingQuery) =>
  call<BookingResult>({ action: "booking", member_id, ...q }, "จองไม่สำเร็จ กรุณาลองใหม่");

export type GasBooking = {
  booking_id: string; name: string; phone: string; date: string; time: string; people: number;
  table_id: string; zone: string; booking_status: string; created_at: string; updated_at: string;
};

export async function fetchHistory(member_id: string) {
  const r = await call<{ bookings: GasBooking[] }>({ action: "history", member_id }, "โหลดประวัติการจองไม่สำเร็จ");
  if (!r.ok) throw new Error(r.message);
  return r.data.bookings ?? [];
}

export const cancelBooking = (member_id: string, booking_id: string) =>
  call<{ message?: string }>({ action: "cancel_booking", member_id, booking_id }, "ยกเลิกการจองไม่สำเร็จ");

/** Sheet cells formatted as dates can come back as huge/negative numbers — show those as unknown. */
export function safePeople(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 && v < 100 ? v : null;
}

/** Sheet date cells may arrive as ISO timestamps; keep just yyyy-MM-dd in Bangkok. */
export function sheetDate(v: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}
