import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "th";

type Dict = Record<string, { en: string; th: string }>;

export const dict = {
  brand: { en: "Riverside Kitchen", th: "ริเวอร์ไซด์ คิทเช่น" },
  tagline: { en: "Modern Thai · Riverfront Dining", th: "อาหารไทยร่วมสมัย ริมน้ำ" },
  navBook: { en: "Reserve", th: "จองโต๊ะ" },
  navMenu: { en: "Menu", th: "เมนู" },
  navAdmin: { en: "Admin", th: "ผู้ดูแล" },
  navCancel: { en: "Cancel booking", th: "ยกเลิกการจอง" },
  heroTitle: { en: "Reserve Your Perfect Table", th: "จองโต๊ะที่ใช่สำหรับคุณ" },
  heroSubtitle: {
    en: "Real-time reservation system with live table availability.",
    th: "ระบบจองโต๊ะแบบเรียลไทม์ พร้อมสถานะโต๊ะอัปเดตทันที",
  },
  ctaReserve: { en: "Reserve a Table", th: "จองโต๊ะ" },
  ctaMenu: { en: "View Menu", th: "ดูเมนู" },
  live: { en: "Live", th: "ไลฟ์" },
  step1: { en: "Select Date", th: "เลือกวันที่" },
  step2: { en: "Select Time", th: "เลือกเวลา" },
  step3: { en: "Choose Table", th: "เลือกโต๊ะ" },
  full: { en: "FULL", th: "เต็ม" },
  zoneRiverside: { en: "Riverside", th: "ริมน้ำ" },
  zoneAir: { en: "Air Conditioned", th: "ห้องแอร์" },
  zoneVip: { en: "VIP", th: "วีไอพี" },
  available: { en: "Available", th: "ว่าง" },
  reserved: { en: "Reserved", th: "ถูกจอง" },
  selected: { en: "Selected", th: "เลือกอยู่" },
  seats: { en: "seats", th: "ที่นั่ง" },
  table: { en: "Table", th: "โต๊ะ" },
  dashAvailable: { en: "Available Tables", th: "โต๊ะว่าง" },
  dashReserved: { en: "Reserved Tables", th: "โต๊ะที่ถูกจอง" },
  dashOccupancy: { en: "Occupancy", th: "อัตราการจอง" },
  customerName: { en: "Full Name", th: "ชื่อ-นามสกุล" },
  customerPhone: { en: "Phone Number", th: "เบอร์โทรศัพท์" },
  confirm: { en: "Confirm Reservation", th: "ยืนยันการจอง" },
  cancel: { en: "Cancel", th: "ยกเลิก" },
  confirmCancelTitle: { en: "Cancel this reservation?", th: "ยืนยันยกเลิกการจองนี้?" },
  confirmCancelBody: {
    en: "This will release the table for other guests. This action cannot be undone.",
    th: "การยกเลิกจะคืนโต๊ะให้ผู้อื่นจอง ไม่สามารถย้อนกลับได้",
  },
  yesCancel: { en: "Yes, Cancel", th: "ใช่, ยกเลิก" },
  bookingSuccess: { en: "Table reserved successfully", th: "จองโต๊ะสำเร็จ" },
  bookingFail: { en: "Table is no longer available", th: "โต๊ะนี้ไม่ว่างแล้ว" },
  cancelSuccess: { en: "Reservation cancelled", th: "ยกเลิกการจองแล้ว" },
  phoneMismatch: { en: "Phone number does not match the reservation", th: "เบอร์โทรไม่ตรงกับการจอง" },
  pickDate: { en: "Pick a date first", th: "กรุณาเลือกวันที่ก่อน" },
  pickSlot: { en: "Pick a time slot", th: "กรุณาเลือกช่วงเวลา" },
  menuTitle: { en: "Our Menu", th: "เมนูของเรา" },
  menuSubtitle: { en: "Seasonal Thai cuisine, crafted with care.", th: "อาหารไทยตามฤดูกาล ปรุงด้วยความใส่ใจ" },
  adminTitle: { en: "Reservation Management", th: "จัดการการจอง" },
  search: { en: "Search name or phone", th: "ค้นหาชื่อหรือเบอร์โทร" },
  allZones: { en: "All zones", th: "ทุกโซน" },
  allSlots: { en: "All times", th: "ทุกช่วงเวลา" },
  export: { en: "Export CSV", th: "ส่งออก CSV" },
  totalRes: { en: "Total Reservations", th: "การจองทั้งหมด" },
  noResults: { en: "No reservations found", th: "ไม่พบการจอง" },
  cancelByPhone: { en: "Enter your phone to cancel", th: "กรอกเบอร์โทรเพื่อยกเลิก" },
  findBooking: { en: "Find my bookings", th: "ค้นหาการจองของฉัน" },
  bookingsFor: { en: "Bookings for", th: "การจองสำหรับ" },
  noBookings: { en: "No bookings found for this number.", th: "ไม่พบการจองสำหรับเบอร์นี้" },
} satisfies Dict;

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof dict) => string;
};

const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("lang") as Lang | null) : null;
    if (stored === "en" || stored === "th") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (key: keyof typeof dict) => dict[key][lang];

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

export const TIME_SLOTS = [
  "11:00-12:00","12:00-13:00","13:00-14:00","14:00-15:00","15:00-16:00",
  "16:00-17:00","17:00-18:00","18:00-19:00","19:00-20:00","20:00-21:00",
] as const;

export const ZONES = ["Riverside", "AirConditioned", "VIP"] as const;
export type Zone = (typeof ZONES)[number];

export function zoneLabel(z: string, lang: Lang) {
  if (z === "Riverside") return lang === "th" ? "ริมน้ำ" : "Riverside";
  if (z === "AirConditioned") return lang === "th" ? "ห้องแอร์" : "Air Conditioned";
  return lang === "th" ? "วีไอพี" : "VIP";
}

/** Max simultaneous reservations per slot before slot is marked FULL. = total tables */
export const SLOT_CAPACITY = 50;
