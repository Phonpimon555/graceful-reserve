import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useBangkokNow } from "@/lib/booking-time";
import { adminTodayCounts } from "@/lib/live-stats";
import {
  AlertTriangle, Archive, CheckCircle2, Download, Eye, EyeOff, Loader2, Pencil, RefreshCw, RotateCcw, Trash2, XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { verifyAdminAccess } from "@/lib/admin-auth";
import { NavBar } from "@/components/NavBar";
import { AdminGuard, AdminTabs } from "@/components/AdminGuard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { TIME_SLOTS, useLang, zoneLabel, ZONES, type Zone } from "@/lib/i18n";
import {
  deleteReservation, fetchAllReservations, fetchTables, setReservationArchived,
  setReservationStatus, updateReservation,
  type Reservation, type ReservationStatus, type TableRow,
} from "@/lib/reservations";
import { canArchive } from "@/lib/reservation-archive";
import { supabase } from "@/integrations/supabase/client";
import {
  allowedNextStatuses, canHideSheetBooking, canRequestStatusChange, statusUpdateWarnings,
  type SheetBooking, type SheetWarning,
} from "@/lib/sheet-bookings";
import {
  listSheetBookings, setSheetBookingHidden, updateSheetBookingStatus,
} from "@/lib/sheet-bookings.functions";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  beforeLoad: async () => {
    if (!(await verifyAdminAccess())) throw redirect({ to: "/admin/login", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Admin · Riverside Kitchen" },
      { name: "description", content: "Reservation management for Riverside Kitchen administrators." },
      { property: "og:title", content: "Admin · Riverside Kitchen" },
      { property: "og:description", content: "Reservation management for Riverside Kitchen administrators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGuard>
      <AdminReservations />
    </AdminGuard>
  ),
});

const STATUSES: ReservationStatus[] = ["pending", "confirmed", "cancelled", "completed"];

function statusLabel(s: ReservationStatus, lang: "en" | "th") {
  if (lang !== "th") return s.charAt(0).toUpperCase() + s.slice(1);
  return s === "pending" ? "รอยืนยัน"
    : s === "confirmed" ? "ยืนยันแล้ว"
    : s === "cancelled" ? "ยกเลิกแล้ว"
    : "เสร็จสิ้น";
}

function statusClass(s: ReservationStatus) {
  return s === "confirmed" ? "bg-success/15 text-success"
    : s === "pending" ? "bg-gold/30 text-gold-foreground"
    : s === "cancelled" ? "bg-destructive/10 text-destructive"
    : "bg-accent text-accent-foreground";
}

type PendingAction = { res: Reservation; next: ReservationStatus } | null;
type SheetStatusAction = { sb: SheetBooking; next: "confirmed" | "cancelled" | "completed" } | null;
type SheetHideAction = { sb: SheetBooking; hide: boolean } | null;

type RowStatus = ReservationStatus | "unknown";
type RowCommon = {
  key: string;
  date: string | null; dateRaw: string;
  slot: string | null; slotRaw: string;
  tableId: string; zone: Zone | null; zoneRaw: string;
  party: number | null; name: string; phone: string;
  status: RowStatus; statusRaw: string; hidden: boolean;
};
type AdminRow = (RowCommon & { source: "db"; res: Reservation }) | (RowCommon & { source: "sheet"; sb: SheetBooking });

const WARNING_LABEL: Record<SheetWarning, { th: string; en: string }> = {
  placeholder: { th: "มีข้อความแม่แบบ เช่น <<name>>", en: "Contains template text such as <<name>>" },
  error_value: { th: "มีค่าผิดพลาดจากชีต เช่น #NUM!", en: "Contains a sheet error such as #NUM!" },
  missing_id: { th: "ไม่มีรหัสการจอง", en: "Missing booking ID" },
  invalid_id: { th: "รหัสการจองไม่ถูกต้อง", en: "Invalid booking ID" },
  duplicate_id: { th: "รหัสการจองซ้ำกับแถวอื่น", en: "Booking ID used by another row" },
  invalid_date: { th: "วันที่ผิดรูปแบบ", en: "Invalid date" },
  invalid_time: { th: "เวลาผิดรูปแบบ", en: "Invalid time" },
  invalid_people: { th: "จำนวนคนผิดรูปแบบ", en: "Invalid party size" },
  unknown_status: { th: "สถานะไม่รู้จัก", en: "Unknown status" },
};

const SHEET_ERROR: Record<string, { th: string; en: string }> = {
  not_configured: { th: "ยังไม่ได้ตั้งค่า ADMIN_API_KEY บนเว็บไซต์", en: "ADMIN_API_KEY is not set on the website" },
  script_key_missing: { th: "ยังไม่ได้ตั้งค่า ADMIN_API_KEY ใน Script Properties ของ Apps Script", en: "ADMIN_API_KEY is not set in the Apps Script properties" },
  denied: { th: "คีย์ใน Script Properties ไม่ตรงกับคีย์ของเว็บไซต์", en: "The Apps Script key does not match the website key" },
  network: { th: "เชื่อมต่อ Apps Script ไม่ได้", en: "Could not reach Apps Script" },
  script_outdated: {
    th: "Apps Script ที่ใช้งานอยู่ยังไม่รองรับการเปลี่ยนสถานะ — ต้อง Deploy ไฟล์ร่าง v3.4 ก่อน (ยังไม่ได้ Deploy)",
    en: "The live Apps Script does not support status changes yet — draft v3.4 must be deployed first (not deployed yet)",
  },
  no_row: {
    th: "Apps Script ไม่ได้ส่งเลขแถวที่ถูกต้องของรายการนี้มา — ไม่ได้แก้ไขข้อมูล",
    en: "Apps Script did not return a valid sheet row for this booking — nothing changed",
  },
  not_unique: { th: "ไม่พบรหัสการจองนี้ หรือมีรหัสซ้ำ — ไม่ได้แก้ไขข้อมูล", en: "Booking ID not found or duplicated — nothing changed" },
  stale: { th: "สถานะในชีตเปลี่ยนไปแล้ว กรุณารีเฟรช — ไม่ได้แก้ไขข้อมูล", en: "The sheet changed. Please refresh — nothing changed" },
  not_allowed: { th: "เปลี่ยนสถานะนี้ไม่ได้", en: "This status change is not allowed" },
  mismatch: { th: "Apps Script ไม่ได้ยืนยันการเปลี่ยนสถานะ กรุณารีเฟรชตรวจสอบ", en: "Apps Script did not confirm the change. Please refresh" },
};

function sheetError(code: string, message: string, lang: "en" | "th") {
  const known = SHEET_ERROR[code];
  return known ? known[lang] : message;
}

function safeDate(d: string | null, raw: string, pattern: string) {
  if (!d) return raw || "—";
  const v = new Date(d);
  return isNaN(v.getTime()) ? raw || d : format(v, pattern);
}
type ArchiveKind = "hide" | "restore" | "delete";
type ArchiveAction = { res: Reservation; kind: ArchiveKind } | null;

const ARCHIVE_COPY: Record<ArchiveKind, {
  th: { title: string; body: string; confirm: string; done: string };
  en: { title: string; body: string; confirm: string; done: string };
}> = {
  hide: {
    th: {
      title: "ยืนยันการซ่อนรายการจอง",
      body: "ต้องการซ่อนรายการจองนี้ใช่หรือไม่? รายการจะไม่แสดงในหน้าจัดการการจองหลัก แต่ยังสามารถดูและกู้คืนได้จากแท็บ “รายการที่ซ่อน”",
      confirm: "ยืนยันการซ่อน",
      done: "ซ่อนรายการจองเรียบร้อยแล้ว",
    },
    en: {
      title: "Hide this reservation?",
      body: "It will no longer appear in the main reservation table, but you can still view and restore it from the “Hidden” tab.",
      confirm: "Hide reservation",
      done: "Reservation hidden",
    },
  },
  restore: {
    th: {
      title: "ยืนยันการกู้คืนรายการจอง",
      body: "ต้องการนำรายการจองนี้กลับมาแสดงในหน้าจัดการการจองหลักใช่หรือไม่?",
      confirm: "ยืนยันการกู้คืน",
      done: "กู้คืนรายการจองเรียบร้อยแล้ว",
    },
    en: {
      title: "Restore this reservation?",
      body: "Bring this reservation back to the main reservation table?",
      confirm: "Restore",
      done: "Reservation restored",
    },
  },
  delete: {
    th: {
      title: "ยืนยันการลบรายการจอง",
      body: "คุณกำลังจะลบรายการจองนี้ออกจากฐานข้อมูลอย่างถาวร การดำเนินการนี้อาจไม่สามารถย้อนกลับได้ กรุณาตรวจสอบข้อมูลก่อนยืนยัน",
      confirm: "ยืนยันการลบ",
      done: "ลบรายการจองเรียบร้อยแล้ว",
    },
    en: {
      title: "Delete this reservation?",
      body: "This permanently removes the reservation from the database and may not be undone. Please check the details before confirming.",
      confirm: "Delete permanently",
      done: "Reservation deleted",
    },
  },
};

function AdminReservations() {
  const { lang } = useLang();
  const qc = useQueryClient();

  const tablesQ = useQuery({ queryKey: ["tables"], queryFn: fetchTables });
  const resQ = useQuery({ queryKey: ["allReservations"], queryFn: fetchAllReservations });
  const listSheet = useServerFn(listSheetBookings);
  const hideSheet = useServerFn(setSheetBookingHidden);
  const updateSheet = useServerFn(updateSheetBookingStatus);
  // Sheets is quota-limited: reload once a minute (plus the refresh button) so
  // today's counts and new website/LINE bookings appear without reloading the page.
  const sheetQ = useQuery({
    queryKey: ["sheetBookings"],
    queryFn: () => listSheet(),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    const ch = supabase.channel("admin-res")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
        qc.invalidateQueries({ queryKey: ["allReservations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const [search, setSearch] = useState("");
  const [date, setDate] = useState("all");
  const [slot, setSlot] = useState("all");
  const [zone, setZone] = useState<Zone | "all">("all");
  const [status, setStatus] = useState<ReservationStatus | "all">("all");

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [sheetDetail, setSheetDetail] = useState<SheetBooking | null>(null);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [view, setView] = useState<"main" | "hidden">("main");
  const [archiveAction, setArchiveAction] = useState<ArchiveAction>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [sheetAction, setSheetAction] = useState<SheetStatusAction>(null);
  const [sheetHide, setSheetHide] = useState<SheetHideAction>(null);
  const [sheetBusy, setSheetBusy] = useState(false);

  const tableMap = useMemo(() => {
    const m: Record<string, TableRow> = {};
    for (const t of tablesQ.data ?? []) m[t.id] = t;
    return m;
  }, [tablesQ.data]);

  const sheetData = sheetQ.data?.ok ? sheetQ.data : null;
  const sheetFailure = sheetQ.data && !sheetQ.data.ok ? sheetQ.data : null;
  const canUpdateSheet = sheetData?.canUpdateStatus === true;

  const allRows = useMemo<AdminRow[]>(() => {
    const out: AdminRow[] = (resQ.data ?? []).map((r) => ({
      source: "db" as const, res: r, key: `db:${r.id}`,
      date: r.reservation_date, dateRaw: r.reservation_date,
      slot: r.time_slot, slotRaw: r.time_slot,
      tableId: r.table_id, zone: tableMap[r.table_id]?.zone ?? null, zoneRaw: "",
      party: r.party_size, name: r.customer_name, phone: r.phone,
      status: r.status, statusRaw: r.status, hidden: !!r.is_archived,
    }));
    if (sheetData) {
      const hiddenKeys = new Set(sheetData.hiddenKeys);
      for (const sb of sheetData.rows) {
        out.push({
          source: "sheet", sb, key: `sheet:${sb.key}`,
          date: sb.date, dateRaw: sb.date_raw, slot: sb.time_slot, slotRaw: sb.time_raw,
          tableId: sb.table_id, zone: sb.zone, zoneRaw: sb.zone_raw,
          party: sb.people, name: sb.name, phone: sb.phone,
          status: sb.status, statusRaw: sb.status_raw, hidden: hiddenKeys.has(sb.key),
        });
      }
    }
    return out.sort((a, b) => {
      if (a.date !== b.date) {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date < b.date ? 1 : -1;
      }
      return (a.slot ?? "").localeCompare(b.slot ?? "");
    });
  }, [resQ.data, sheetData, tableMap]);

  const visible = useMemo(() => allRows.filter((r) => !r.hidden), [allRows]);
  const hidden = useMemo(() => allRows.filter((r) => r.hidden), [allRows]);
  const viewRows = view === "hidden" ? hidden : visible;
  const flagged = useMemo(
    () => visible.flatMap((r) => (r.source === "sheet" && r.sb.warnings.length > 0 ? [r.sb] : [])),
    [visible],
  );

  const filtered = useMemo(() => {
    return viewRows.filter((r) => {
      if (search) {
        const q = search.trim().toLowerCase();
        if (
          !r.name.toLowerCase().includes(q)
          && !r.phone.includes(q)
          && !r.tableId.toLowerCase().includes(q)
          && !(r.source === "sheet" && r.sb.booking_id.toLowerCase().includes(q))
        ) return false;
      }
      if (date !== "all" && r.date !== date) return false;
      if (slot !== "all" && r.slot !== slot) return false;
      if (zone !== "all" && r.zone !== zone) return false;
      if (status !== "all" && r.status !== status) return false;
      return true;
    });
  }, [viewRows, search, date, slot, zone, status]);

  const dates = useMemo(
    () => Array.from(new Set(viewRows.flatMap((r) => (r.date ? [r.date] : [])))).sort().reverse(),
    [viewRows],
  );

  // Today's counts from the Google Sheets rows (website + LINE), on the Bangkok calendar.
  // Hidden rows still count: hiding only removes them from the table view.
  const bkkNow = useBangkokNow();
  const todayCounts = useMemo(
    () => (sheetData ? adminTodayCounts(sheetData.rows, bkkNow.dateKey) : null),
    [sheetData, bkkNow.dateKey],
  );

  const switchView = (next: "main" | "hidden") => {
    if (next === view) return;
    setView(next);
    setDate("all");
    setStatus("all");
  };

  const applyAction = async () => {
    if (!pendingAction) return;
    const { res, next } = pendingAction;
    setPendingAction(null);
    const out = await setReservationStatus(res.id, next);
    if (!out.ok) toast.error(out.reason);
    else {
      toast.success(
        lang === "th"
          ? `อัปเดตสถานะเป็น "${statusLabel(next, "th")}" แล้ว`
          : `Status updated to "${statusLabel(next, "en")}"`,
      );
      qc.invalidateQueries({ queryKey: ["allReservations"] });
    }
  };

  const applySheetAction = async () => {
    if (!sheetAction || sheetBusy) return;
    const { sb, next } = sheetAction;
    setSheetBusy(true);
    try {
      const out = await updateSheet({ data: { booking_id: sb.booking_id, next, expected_status: sb.status_raw } });
      if (!out.ok) {
        toast.error(sheetError(out.code, out.message, lang === "th" ? "th" : "en"));
      } else {
        toast.success(lang === "th"
          ? `อัปเดตสถานะ ${out.booking_id} ในชีตเป็น "${out.booking_status}" แล้ว`
          : `${out.booking_id} is now "${out.booking_status}" in the sheet`);
        const th = lang === "th";
        for (const warn of statusUpdateWarnings(out)) {
          const title = warn === "table"
            ? (th ? "สถานะการจองเปลี่ยนแล้ว แต่สถานะโต๊ะยังไม่ได้อัปเดต" : "Booking status changed, but the table status was not updated")
            : out.updated_at_written === true
              ? (th
                  ? "สถานะการจองเปลี่ยนแล้ว — ช่อง updated_at ถูกเขียนแล้ว แต่ยืนยันเวลาที่แน่นอนไม่ได้ กรุณาตรวจในชีต"
                  : "Booking status changed — updated_at was written, but its exact time could not be confirmed. Please check the sheet")
              : (th
                  ? "สถานะการจองเปลี่ยนแล้ว แต่ยืนยันไม่ได้ว่าบันทึก updated_at แล้ว กรุณาตรวจในชีต"
                  : "Booking status changed, but updated_at could not be confirmed. Please check the sheet");
          toast.warning(title, { description: out.script_message || undefined, duration: 15000 });
        }
        setSheetAction(null);
      }
    } catch {
      toast.error(lang === "th" ? "เปลี่ยนสถานะไม่สำเร็จ" : "Could not change the status");
    } finally {
      setSheetBusy(false);
      qc.invalidateQueries({ queryKey: ["sheetBookings"] });
    }
  };

  const applySheetHide = async () => {
    if (!sheetHide || sheetBusy) return;
    const { sb, hide } = sheetHide;
    setSheetBusy(true);
    try {
      const out = await hideSheet({ data: { key: sb.key, hidden: hide } });
      if (!out.ok) {
        toast.error(out.message === "active"
          ? (lang === "th" ? "ซ่อนได้เฉพาะรายการที่เสร็จสิ้นหรือยกเลิกแล้ว" : "Only completed or cancelled bookings can be hidden")
          : out.message === "not_found"
            ? (lang === "th" ? "ไม่พบรายการนี้ในชีตแล้ว กรุณารีเฟรช" : "This row is no longer in the sheet. Please refresh")
            : out.message);
      } else {
        toast.success(hide
          ? (lang === "th" ? "นำรายการออกจากตารางแอดมินแล้ว (ข้อมูลในชีตยังอยู่)" : "Removed from the admin table (sheet unchanged)")
          : (lang === "th" ? "กู้คืนรายการแล้ว" : "Booking restored"));
        setSheetHide(null);
      }
    } catch {
      toast.error(lang === "th" ? "ดำเนินการไม่สำเร็จ" : "Action failed");
    } finally {
      setSheetBusy(false);
      qc.invalidateQueries({ queryKey: ["sheetBookings"] });
    }
  };

  const applyArchive = async () => {
    if (!archiveAction || archiveBusy) return;
    const { res, kind } = archiveAction;
    if (!canArchive(res.status)) {
      toast.error(lang === "th"
        ? "ซ่อนหรือลบได้เฉพาะรายการที่เสร็จสิ้นหรือยกเลิกแล้ว"
        : "Only completed or cancelled reservations can be hidden or deleted");
      setArchiveAction(null);
      return;
    }
    setArchiveBusy(true);
    const out = kind === "delete"
      ? await deleteReservation(res.id)
      : await setReservationArchived(res.id, kind === "hide");
    setArchiveBusy(false);
    if (!out.ok) {
      const failed = lang === "th"
        ? (kind === "delete" ? "ลบรายการไม่สำเร็จ" : kind === "hide" ? "ซ่อนรายการไม่สำเร็จ" : "กู้คืนรายการไม่สำเร็จ")
        : (kind === "delete" ? "Could not delete" : kind === "hide" ? "Could not hide" : "Could not restore");
      const why = out.reason === "not_found"
        ? (lang === "th" ? "ไม่พบรายการนี้ หรือสถานะเปลี่ยนไปแล้ว" : "Reservation not found or its status changed")
        : out.reason;
      toast.error(`${failed}: ${why}`);
      qc.invalidateQueries({ queryKey: ["allReservations"] });
      return;
    }
    qc.setQueryData<Reservation[]>(["allReservations"], (rows) => {
      if (!rows) return rows;
      if (kind === "delete") return rows.filter((r) => r.id !== res.id);
      return rows.map((r) => (r.id === res.id
        ? { ...r, is_archived: kind === "hide", archived_at: kind === "hide" ? new Date().toISOString() : null }
        : r));
    });
    setArchiveAction(null);
    toast.success(ARCHIVE_COPY[kind][lang === "th" ? "th" : "en"].done);
    qc.invalidateQueries({ queryKey: ["allReservations"] });
  };

  const exportCsv = () => {
    const rows = [
      ["Source", "ID", "Name", "Phone", "Table", "Zone", "Date", "Time", "Party", "Status", "Created", "Updated", "Warnings"],
      ...filtered.map((r) => r.source === "db"
        ? ["database", r.res.id, r.name, r.phone, r.tableId, r.zone ?? "", r.dateRaw, r.slotRaw, r.party ?? "",
          r.statusRaw, r.res.created_at, r.res.updated_at, ""]
        : [r.sb.channel === "web" ? "sheet:web" : "sheet:line", r.sb.booking_id, r.name, r.phone, r.tableId,
          r.zoneRaw, r.dateRaw, r.slotRaw, r.party ?? "", r.statusRaw, r.sb.created_at, r.sb.updated_at,
          r.sb.warnings.join(" ")]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `reservations-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const loading = resQ.isLoading || sheetQ.isLoading;
  const t = (th: string, en: string) => (lang === "th" ? th : en);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</div>
            <h1 className="font-display text-4xl">
              {lang === "th" ? "จัดการการจอง" : "Reservation Management"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline" className="rounded-full"
              disabled={sheetQ.isFetching}
              onClick={() => { void sheetQ.refetch(); }}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", sheetQ.isFetching && "animate-spin")} />
              {t("รีเฟรชข้อมูลจากชีต", "Refresh from Sheets")}
            </Button>
            <Button onClick={exportCsv} variant="outline" className="rounded-full">
              <Download className="h-4 w-4 mr-2" /> {lang === "th" ? "ส่งออก CSV" : "Export CSV"}
            </Button>
          </div>
        </div>

        <AdminTabs />

        <div className="grid grid-cols-2 gap-3 lg:max-w-2xl">
          <AdminStat
            label={lang === "th" ? "การจองวันนี้" : "Bookings today"}
            value={todayCounts ? todayCounts.bookingsToday : "—"}
            hint={todayCounts && todayCounts.unknownStatusToday > 0
              ? (lang === "th"
                ? `ไม่นับ ${todayCounts.unknownStatusToday} รายการที่อ่านสถานะไม่ได้`
                : `${todayCounts.unknownStatusToday} with unreadable status not counted`)
              : undefined}
          />
          <AdminStat
            label={lang === "th" ? "การยกเลิกวันนี้" : "Cancellations today"}
            value={todayCounts ? todayCounts.cancelledToday : "—"}
            hint={todayCounts && todayCounts.cancelledNoDate > 0
              ? (lang === "th"
                ? `ไม่นับ ${todayCounts.cancelledNoDate} รายการที่ไม่มีวันที่ยกเลิก`
                : `${todayCounts.cancelledNoDate} without a cancellation date not counted`)
              : undefined}
          />
        </div>

        {(sheetFailure || sheetQ.error) && (
          <Card role="alert" className="p-4 border-destructive/40 bg-destructive/5 shadow-soft text-sm font-sans">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              <div className="space-y-1">
                <div className="font-medium text-destructive">
                  {t("ยังโหลดรายการจองจาก Google Sheets ไม่ได้", "Could not load bookings from Google Sheets")}
                </div>
                <div className="text-muted-foreground">
                  {sheetFailure
                    ? sheetError(sheetFailure.code, sheetFailure.message, lang === "th" ? "th" : "en")
                    : t("ตรวจสอบสิทธิ์ผู้ดูแลไม่ผ่าน หรือเชื่อมต่อไม่ได้", "Admin check failed or the connection failed")}
                  {" · "}
                  {t("ตารางด้านล่างแสดงเฉพาะรายการในฐานข้อมูลเดิม", "The table below only shows the older database records")}
                </div>
              </div>
            </div>
          </Card>
        )}

        {sheetData && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-sans text-muted-foreground">
            <span>
              {t("Google Sheets (Data_Booking)", "Google Sheets (Data_Booking)")}: {sheetData.rows.length} {t("แถว", "rows")}
              {" · "}{t("อัปเดตเมื่อ", "loaded")} {format(new Date(sheetData.fetchedAt), "HH:mm:ss")}
            </span>
            {!canUpdateSheet && (
              <span className="text-gold-foreground">
                {t(
                  "Apps Script ที่ใช้งานอยู่ยังไม่รองรับการเปลี่ยนสถานะ — เปลี่ยนสถานะจากหน้านี้ได้หลัง Deploy ไฟล์ร่าง v3.4",
                  "The live Apps Script does not support status changes yet — they unlock after draft v3.4 is deployed",
                )}
              </span>
            )}
          </div>
        )}

        {view === "main" && flagged.length > 0 && (
          <Card className="p-4 border-gold/60 bg-gold/10 shadow-soft text-sm font-sans">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-gold-foreground" />
              <div className="space-y-2 min-w-0">
                <div className="font-medium">
                  {t(
                    `พบ ${flagged.length} รายการในชีตที่ข้อมูลไม่ครบหรือผิดรูปแบบ`,
                    `${flagged.length} sheet rows have missing or malformed data`,
                  )}
                </div>
                <div className="text-muted-foreground">
                  {t(
                    "ระบบไม่ได้แก้ไขข้อมูลจริงให้อัตโนมัติ กรุณาตรวจสอบในชีต Data_Booking รายการที่ระบุรหัสการจองไม่ได้แน่นอนจะเปลี่ยนสถานะไม่ได้",
                    "Nothing was changed automatically. Please check Data_Booking. Rows without a single unique booking ID cannot have their status changed.",
                  )}
                </div>
                <ul className="space-y-1">
                  {flagged.slice(0, 8).map((sb) => (
                    <li key={sb.key} className="flex flex-wrap gap-x-2 text-xs">
                      <button type="button" className="underline underline-offset-2 hover:text-primary"
                        onClick={() => setSheetDetail(sb)}>
                        {sb.row ? `${t("แถว", "Row")} ${sb.row} · ` : ""}{sb.booking_id || t("(ไม่มีรหัส)", "(no ID)")}
                      </button>
                      <span className="text-muted-foreground">
                        {sb.warnings.map((w) => WARNING_LABEL[w][lang === "th" ? "th" : "en"]).join(" · ")}
                      </span>
                    </li>
                  ))}
                  {flagged.length > 8 && (
                    <li className="text-xs text-muted-foreground">
                      {t(`และอีก ${flagged.length - 8} รายการ`, `and ${flagged.length - 8} more`)}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        )}

        <div role="tablist" aria-label={lang === "th" ? "มุมมองรายการจอง" : "Reservation view"}
          className="inline-flex rounded-full border border-border/70 bg-card p-1 shadow-soft">
          {([
            { key: "main", th: "รายการจอง", en: "Reservations", count: visible.length, Icon: Eye },
            { key: "hidden", th: "รายการที่ซ่อน", en: "Hidden", count: hidden.length, Icon: Archive },
          ] as const).map(({ key, th, en, count, Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => switchView(key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-sans transition",
                view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
              {lang === "th" ? th : en}
              <span className={cn(
                "rounded-full px-2 text-[11px] tabular-nums",
                view === key ? "bg-primary-foreground/20" : "bg-muted",
              )}>{count}</span>
            </button>
          ))}
        </div>

        <Card className="p-4 shadow-soft border-border/60">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              placeholder={lang === "th" ? "ค้นหาชื่อ / เบอร์โทร / โต๊ะ / รหัสจอง" : "Search name / phone / table / booking ID"}
              value={search} onChange={(e) => setSearch(e.target.value)} className="font-sans"
            />
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "th" ? "ทุกวันที่" : "All dates"}</SelectItem>
                {dates.map((d) => (
                  <SelectItem key={d} value={d}>{safeDate(d, d, "EEE, MMM d, yyyy")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={slot} onValueChange={setSlot}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "th" ? "ทุกช่วงเวลา" : "All time slots"}</SelectItem>
                {TIME_SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={zone} onValueChange={(v) => setZone(v as Zone | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "th" ? "ทุกโซน" : "All zones"}</SelectItem>
                {ZONES.map((z) => <SelectItem key={z} value={z}>{zoneLabel(z, lang)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as ReservationStatus | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "th" ? "ทุกสถานะ" : "All statuses"}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{statusLabel(s, lang)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{lang === "th" ? "วันที่" : "Date"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "เวลา" : "Time"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "โต๊ะ" : "Table"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "โซน" : "Zone"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "คน" : "Party"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "ชื่อผู้จอง" : "Customer"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "เบอร์โทร" : "Phone"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "สถานะ" : "Status"}</th>
                  <th className="px-4 py-3 text-right">{lang === "th" ? "การจัดการ" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={9} className="py-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </td></tr>
                ) : resQ.error && !sheetData ? (
                  <tr><td colSpan={9} className="py-12 text-center text-destructive">
                    {lang === "th" ? "โหลดข้อมูลไม่สำเร็จ" : "Failed to load reservations"}
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-14 text-center text-muted-foreground">
                    {view === "hidden" ? (
                      <div className="flex flex-col items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Archive className="h-5 w-5" />
                        </span>
                        <span>
                          {hidden.length === 0
                            ? (lang === "th" ? "ยังไม่มีรายการจองที่ซ่อนอยู่" : "No hidden reservations yet")
                            : (lang === "th" ? "ไม่พบรายการที่ตรงกับการค้นหา" : "No hidden reservations match your filters")}
                        </span>
                      </div>
                    ) : viewRows.length > 0
                      ? (lang === "th" ? "ไม่พบรายการที่ตรงกับการค้นหา" : "No reservations match your filters")
                      : (lang === "th" ? "ยังไม่มีรายการจอง" : "No reservations yet")}
                  </td></tr>
                ) : filtered.map((r) => {
                  const warn = r.source === "sheet" && r.sb.warnings.length > 0;
                  const sourceLabel = r.source === "db"
                    ? t("ฐานข้อมูลเดิม", "Database")
                    : r.sb.channel === "web" ? t("เว็บไซต์ · ชีต", "Website · Sheet") : t("LINE · ชีต", "LINE · Sheet");
                  return (
                  <tr key={r.key} className={cn("hover:bg-muted/30 transition", warn && "bg-gold/5")}>
                    <td className="px-4 py-3 whitespace-nowrap font-sans tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        {warn && (
                          <AlertTriangle className="h-3.5 w-3.5 text-gold-foreground"
                            aria-label={t("ข้อมูลผิดรูปแบบ", "Malformed data")} />
                        )}
                        <span className={cn(!r.date && "text-muted-foreground")}>{safeDate(r.date, r.dateRaw, "MMM d, yyyy")}</span>
                      </span>
                    </td>
                    <td className={cn("px-4 py-3 whitespace-nowrap font-sans tabular-nums font-medium", !r.slot && "text-muted-foreground font-normal")}>
                      {r.slot ?? (r.slotRaw || "—")}
                    </td>
                    <td className="px-4 py-3 font-display text-base">{r.tableId || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                        r.zone === "VIP" ? "bg-gold/30 text-gold-foreground"
                        : r.zone === "Riverside" ? "bg-success/15 text-success"
                        : "bg-accent text-accent-foreground",
                      )}>
                        {r.zone ? zoneLabel(r.zone, lang) : (r.zoneRaw || "—")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans tabular-nums">{r.party ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div>{r.name || "—"}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">
                        {sourceLabel}{r.source === "sheet" && r.sb.booking_id ? ` · ${r.sb.booking_id}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-sans tabular-nums">{r.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                        r.status === "unknown" ? "bg-muted text-muted-foreground" : statusClass(r.status),
                      )}>
                        {r.status === "unknown" ? (r.statusRaw || "—") : statusLabel(r.status, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.source === "sheet" ? (
                        <SheetActions
                          sb={r.sb} hidden={r.hidden} canUpdate={canUpdateSheet}
                          onDetail={() => setSheetDetail(r.sb)}
                          onStatus={(next) => setSheetAction({ sb: r.sb, next })}
                          onHide={(hide) => setSheetHide({ sb: r.sb, hide })}
                        />
                      ) : (
                      <div className="flex justify-end gap-1">
                        {r.res.status === "pending" || r.res.status === "confirmed" ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(r.res)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {r.res.status === "pending" ? (
                              <Button size="sm" variant="ghost" className="text-success hover:bg-success/10"
                                onClick={() => setPendingAction({ res: r.res, next: "confirmed" })}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-success hover:bg-success/10"
                                onClick={() => setPendingAction({ res: r.res, next: "completed" })}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                              onClick={() => setPendingAction({ res: r.res, next: "cancelled" })}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setDetail(r.res)}
                              title={lang === "th" ? "ดูรายละเอียด" : "View details"}
                              aria-label={lang === "th" ? "ดูรายละเอียด" : "View details"}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canArchive(r.res.status) && (view === "hidden" ? (
                              <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10"
                                title={lang === "th" ? "กู้คืน" : "Restore"}
                                aria-label={lang === "th" ? "กู้คืน" : "Restore"}
                                onClick={() => setArchiveAction({ res: r.res, kind: "restore" })}>
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-primary"
                                title={lang === "th" ? "ซ่อนรายการ" : "Hide"}
                                aria-label={lang === "th" ? "ซ่อนรายการ" : "Hide"}
                                onClick={() => setArchiveAction({ res: r.res, kind: "hide" })}>
                                <EyeOff className="h-4 w-4" />
                              </Button>
                            ))}
                            {canArchive(r.res.status) && (
                              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                                title={lang === "th" ? "ลบถาวร" : "Delete permanently"}
                                aria-label={lang === "th" ? "ลบถาวร" : "Delete permanently"}
                                onClick={() => setArchiveAction({ res: r.res, kind: "delete" })}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <AlertDialog open={!!pendingAction} onOpenChange={(o) => !o && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "th" ? "ยืนยันการดำเนินการ" : "Confirm action"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction && (lang === "th"
                ? `เปลี่ยนสถานะการจองของ ${pendingAction.res.customer_name} เป็น "${statusLabel(pendingAction.next, "th")}" ใช่หรือไม่`
                : `Change ${pendingAction.res.customer_name}'s reservation to "${statusLabel(pendingAction.next, "en")}"?`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "th" ? "ยกเลิก" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={applyAction}>
              {lang === "th" ? "ยืนยัน" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!sheetAction} onOpenChange={(o) => { if (!o && !sheetBusy) setSheetAction(null); }}>
        <AlertDialogContent>
          {sheetAction && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("ยืนยันการเปลี่ยนสถานะในชีต", "Change status in the sheet?")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t(
                    `เปลี่ยนสถานะของ ${sheetAction.sb.booking_id} เป็น "${statusLabel(sheetAction.next, "th")}" ระบบจะแก้เฉพาะคอลัมน์ booking_status และ updated_at ของรายการนี้ในชีต Data_Booking`,
                    `Set ${sheetAction.sb.booking_id} to "${statusLabel(sheetAction.next, "en")}". Only booking_status and updated_at of this row in Data_Booking will change.`,
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <SheetSummary sb={sheetAction.sb} />
              <AlertDialogFooter>
                <AlertDialogCancel disabled={sheetBusy}>{t("ยกเลิก", "Cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={sheetBusy}
                  onClick={(e) => { e.preventDefault(); void applySheetAction(); }}
                  className={cn(sheetAction.next === "cancelled" && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                >
                  {sheetBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("ยืนยัน", "Confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!sheetHide} onOpenChange={(o) => { if (!o && !sheetBusy) setSheetHide(null); }}>
        <AlertDialogContent>
          {sheetHide && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {sheetHide.hide
                    ? t("นำรายการออกจากตารางแอดมิน", "Remove from the admin table?")
                    : t("ยืนยันการกู้คืนรายการจอง", "Restore this booking?")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {sheetHide.hide
                    ? t(
                      "รายการจะหายไปจากตารางแอดมินเท่านั้น ข้อมูลใน Google Sheets ยังอยู่เหมือนเดิม และกู้คืนได้จากแท็บ “รายการที่ซ่อน”",
                      "It disappears from the admin table only. The Google Sheets row stays as it is, and you can restore it from the “Hidden” tab.",
                    )
                    : t("ต้องการนำรายการนี้กลับมาแสดงในตารางแอดมินใช่หรือไม่?", "Show this booking in the admin table again?")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <SheetSummary sb={sheetHide.sb} />
              <AlertDialogFooter>
                <AlertDialogCancel disabled={sheetBusy}>{t("ยกเลิก", "Cancel")}</AlertDialogCancel>
                <AlertDialogAction disabled={sheetBusy} onClick={(e) => { e.preventDefault(); void applySheetHide(); }}>
                  {sheetBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {sheetHide.hide ? t("ยืนยันการนำออก", "Remove") : t("ยืนยันการกู้คืน", "Restore")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!archiveAction}
        onOpenChange={(o) => { if (!o && !archiveBusy) setArchiveAction(null); }}
      >
        <AlertDialogContent>
          {archiveAction && (() => {
            const copy = ARCHIVE_COPY[archiveAction.kind][lang === "th" ? "th" : "en"];
            const r = archiveAction.res;
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>{copy.title}</AlertDialogTitle>
                  <AlertDialogDescription>{copy.body}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm font-sans space-y-1">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{lang === "th" ? "รหัสการจอง" : "Booking ID"}</span>
                    <span className="tabular-nums text-xs break-all text-right">{r.id}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{lang === "th" ? "ลูกค้า" : "Customer"}</span>
                    <span>{r.customer_name} · {r.phone}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{lang === "th" ? "วันเวลา / โต๊ะ" : "Date / table"}</span>
                    <span className="tabular-nums">
                      {format(new Date(r.reservation_date), "MMM d, yyyy")} · {r.time_slot} · {r.table_id}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{lang === "th" ? "สถานะ" : "Status"}</span>
                    <span>{statusLabel(r.status, lang)}</span>
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={archiveBusy}>
                    {lang === "th" ? "ยกเลิก" : "Cancel"}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={archiveBusy}
                    onClick={(e) => { e.preventDefault(); void applyArchive(); }}
                    className={cn(archiveAction.kind === "delete" && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                  >
                    {archiveBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {copy.confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      <DetailDialog res={detail} onClose={() => setDetail(null)} tableMap={tableMap} />
      <SheetDetailDialog sb={sheetDetail} onClose={() => setSheetDetail(null)} />

      <EditDialog
        res={editing}
        tables={tablesQ.data ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["allReservations"] }); }}
      />
    </div>
  );
}

function SheetActions({
  sb, hidden, canUpdate, onDetail, onStatus, onHide,
}: {
  sb: SheetBooking;
  hidden: boolean;
  canUpdate: boolean;
  onDetail: () => void;
  onStatus: (next: "confirmed" | "cancelled" | "completed") => void;
  onHide: (hide: boolean) => void;
}) {
  const { lang } = useLang();
  // Buttons appear only when the script declared can_update_status AND this row has a valid row number.
  const next = allowedNextStatuses(sb.status).filter((s) => canRequestStatusChange(sb, s, canUpdate));
  const forward = next.find((s) => s === "confirmed" || s === "completed") as "confirmed" | "completed" | undefined;
  return (
    <div className="flex justify-end gap-1">
      {canUpdate && !hidden && forward && (
        <Button size="sm" variant="ghost" className="text-success hover:bg-success/10"
          title={statusLabel(forward, lang)} aria-label={statusLabel(forward, lang)}
          onClick={() => onStatus(forward)}>
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      )}
      {canUpdate && !hidden && next.includes("cancelled") && (
        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
          title={statusLabel("cancelled", lang)} aria-label={statusLabel("cancelled", lang)}
          onClick={() => onStatus("cancelled")}>
          <XCircle className="h-4 w-4" />
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onDetail}
        title={lang === "th" ? "ดูรายละเอียด" : "View details"}
        aria-label={lang === "th" ? "ดูรายละเอียด" : "View details"}>
        <Eye className="h-4 w-4" />
      </Button>
      {hidden ? (
        <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10"
          title={lang === "th" ? "กู้คืน" : "Restore"} aria-label={lang === "th" ? "กู้คืน" : "Restore"}
          onClick={() => onHide(false)}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      ) : canHideSheetBooking(sb) && (
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-primary"
          title={lang === "th" ? "นำออกจากตารางแอดมิน" : "Remove from admin table"}
          aria-label={lang === "th" ? "นำออกจากตารางแอดมิน" : "Remove from admin table"}
          onClick={() => onHide(true)}>
          <EyeOff className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function SheetSummary({ sb }: { sb: SheetBooking }) {
  const { lang } = useLang();
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm font-sans space-y-1">
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">{lang === "th" ? "รหัสการจอง" : "Booking ID"}</span>
        <span className="tabular-nums text-xs break-all text-right">
          {sb.booking_id || "—"}{sb.row ? ` · ${lang === "th" ? "แถว" : "row"} ${sb.row}` : ""}
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">{lang === "th" ? "ลูกค้า" : "Customer"}</span>
        <span className="text-right">{sb.name || "—"} · {sb.phone || "—"}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">{lang === "th" ? "วันเวลา / โต๊ะ" : "Date / table"}</span>
        <span className="tabular-nums text-right">
          {safeDate(sb.date, sb.date_raw, "MMM d, yyyy")} · {sb.time_slot ?? (sb.time_raw || "—")} · {sb.table_id || "—"}
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">{lang === "th" ? "สถานะในชีต" : "Sheet status"}</span>
        <span>{sb.status_raw || "—"}</span>
      </div>
      {sb.warnings.length > 0 && (
        <div className="pt-1 text-xs text-gold-foreground flex gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{sb.warnings.map((w) => WARNING_LABEL[w][lang === "th" ? "th" : "en"]).join(" · ")}</span>
        </div>
      )}
    </div>
  );
}

function SheetDetailDialog({ sb, onClose }: { sb: SheetBooking | null; onClose: () => void }) {
  const { lang } = useLang();
  const th = lang === "th";
  return (
    <Dialog open={!!sb} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">
            {th ? "รายละเอียดการจอง (Google Sheets)" : "Booking detail (Google Sheets)"}
          </DialogTitle>
        </DialogHeader>
        {sb && (
          <dl className="space-y-2 text-sm">
            <Row k={th ? "รหัสการจอง" : "Booking ID"} v={sb.booking_id || "—"} />
            <Row k={th ? "แถวในชีต" : "Sheet row"} v={sb.row ? String(sb.row) : "—"} />
            <Row k={th ? "ช่องทาง" : "Channel"} v={sb.channel === "web" ? (th ? "เว็บไซต์" : "Website") : "LINE"} />
            <Row k={th ? "รหัสสมาชิก" : "Member ID"} v={sb.member_id || "—"} />
            <Row k={th ? "ชื่อผู้จอง" : "Name"} v={sb.name || "—"} />
            <Row k={th ? "เบอร์โทร" : "Phone"} v={sb.phone || "—"} />
            <Row k={th ? "วันที่" : "Date"} v={safeDate(sb.date, sb.date_raw, "EEE, MMM d, yyyy")} />
            <Row k={th ? "เวลา" : "Time"} v={sb.time_slot ?? (sb.time_raw || "—")} />
            <Row k={th ? "จำนวนผู้เข้าร่วม" : "Party size"} v={sb.people !== null ? String(sb.people) : "—"} />
            <Row k={th ? "โต๊ะ" : "Table"} v={sb.table_id || "—"} />
            <Row k={th ? "โซน" : "Zone"} v={sb.zone ? zoneLabel(sb.zone, lang) : (sb.zone_raw || "—")} />
            <Row k={th ? "สถานะในชีต" : "Sheet status"} v={sb.status_raw || "—"} />
            <Row k={th ? "สร้างเมื่อ" : "Created"} v={sb.created_at || "—"} />
            <Row k={th ? "แก้ไขล่าสุด" : "Last updated"} v={sb.updated_at || "—"} />
            {sb.warnings.length > 0 && (
              <div className="rounded-xl border border-gold/60 bg-gold/10 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {th ? "ข้อมูลที่ต้องตรวจสอบในชีต (ระบบไม่ได้แก้ให้)" : "Check in the sheet (not changed automatically)"}
                </div>
                <ul className="list-disc pl-5">
                  {sb.warnings.map((w) => <li key={w}>{WARNING_LABEL[w][th ? "th" : "en"]}</li>)}
                </ul>
              </div>
            )}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AdminStat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-5 border-border/60 shadow-soft">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-sans text-3xl font-semibold tabular-nums text-primary">{value}</div>
      {hint && <div className="mt-1 text-xs font-sans tabular-nums text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function DetailDialog({
  res, onClose, tableMap,
}: { res: Reservation | null; onClose: () => void; tableMap: Record<string, TableRow> }) {
  const { lang } = useLang();
  return (
    <Dialog open={!!res} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">
            {lang === "th" ? "รายละเอียดการจอง" : "Reservation detail"}
          </DialogTitle>
        </DialogHeader>
        {res && (
          <dl className="space-y-2 text-sm">
            <Row k={lang === "th" ? "รหัสการจอง" : "Booking ID"} v={res.id} />
            <Row k={lang === "th" ? "ชื่อผู้จอง" : "Name"} v={res.customer_name} />
            <Row k={lang === "th" ? "เบอร์โทร" : "Phone"} v={res.phone} />
            <Row k={lang === "th" ? "วันที่" : "Date"} v={format(new Date(res.reservation_date), "EEE, MMM d, yyyy")} />
            <Row k={lang === "th" ? "เวลา" : "Time"} v={res.time_slot} />
            <Row k={lang === "th" ? "จำนวนผู้เข้าร่วม" : "Party size"} v={String(res.party_size)} />
            <Row k={lang === "th" ? "โต๊ะ" : "Table"} v={res.table_id} />
            <Row k={lang === "th" ? "โซน" : "Zone"} v={tableMap[res.table_id] ? zoneLabel(tableMap[res.table_id].zone, lang) : "—"} />
            <Row k={lang === "th" ? "สถานะ" : "Status"} v={statusLabel(res.status, lang)} />
            <Row k={lang === "th" ? "สร้างเมื่อ" : "Created"} v={format(new Date(res.created_at), "MMM d, yyyy HH:mm")} />
            <Row k={lang === "th" ? "แก้ไขล่าสุด" : "Last updated"} v={format(new Date(res.updated_at), "MMM d, yyyy HH:mm")} />
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-sans">{v}</dd>
    </div>
  );
}

function EditDialog({
  res, tables, onClose, onSaved,
}: {
  res: Reservation | null;
  tables: TableRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLang();
  const [form, setForm] = useState({
    reservation_date: "", time_slot: "", party_size: 2,
    zone: "Riverside" as Zone, table_id: "", customer_name: "", phone: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!res) return;
    const zone = tables.find((t) => t.id === res.table_id)?.zone ?? "Riverside";
    setForm({
      reservation_date: res.reservation_date,
      time_slot: res.time_slot,
      party_size: res.party_size,
      zone,
      table_id: res.table_id,
      customer_name: res.customer_name,
      phone: res.phone,
    });
  }, [res, tables]);

  const options = tables.filter(
    (t) => t.status !== "disabled" && t.zone === form.zone && t.capacity >= form.party_size,
  );

  const save = async () => {
    if (!res) return;
    setBusy(true);
    const out = await updateReservation(res.id, {
      table_id: form.table_id,
      reservation_date: form.reservation_date,
      time_slot: form.time_slot,
      party_size: form.party_size,
      customer_name: form.customer_name.trim(),
      phone: form.phone.trim(),
    });
    setBusy(false);
    if (!out.ok) {
      toast.error(
        out.reason === "taken"
          ? (lang === "th"
              ? "โต๊ะนี้ไม่ว่างในช่วงเวลาที่เลือก กรุณาเลือกโต๊ะหรือเวลาอื่น"
              : "That table is not available for the selected time. Please choose another table or time.")
          : out.reason,
      );
      return;
    }
    toast.success(lang === "th" ? "บันทึกการแก้ไขแล้ว" : "Reservation updated");
    onSaved();
  };

  return (
    <Dialog open={!!res} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">
            {lang === "th" ? "แก้ไขการจอง" : "Edit reservation"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{lang === "th" ? "วันที่" : "Date"}</Label>
            <Input type="date" value={form.reservation_date} className="font-sans"
              onChange={(e) => setForm((f) => ({ ...f, reservation_date: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>{lang === "th" ? "เวลา" : "Time slot"}</Label>
            <Select value={form.time_slot} onValueChange={(v) => setForm((f) => ({ ...f, time_slot: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{lang === "th" ? "จำนวนผู้เข้าร่วม" : "Party size"}</Label>
            <Input type="number" min={1} max={20} value={form.party_size} className="font-sans tabular-nums"
              onChange={(e) => setForm((f) => ({ ...f, party_size: Math.max(1, Number(e.target.value) || 1) }))} />
          </div>
          <div className="space-y-2">
            <Label>{lang === "th" ? "โซน" : "Zone"}</Label>
            <Select value={form.zone} onValueChange={(v) => setForm((f) => ({ ...f, zone: v as Zone, table_id: "" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ZONES.map((z) => <SelectItem key={z} value={z}>{zoneLabel(z, lang)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{lang === "th" ? "โต๊ะ" : "Table"}</Label>
            <Select value={form.table_id} onValueChange={(v) => setForm((f) => ({ ...f, table_id: v }))}>
              <SelectTrigger><SelectValue placeholder={lang === "th" ? "เลือกโต๊ะ" : "Select a table"} /></SelectTrigger>
              <SelectContent>
                {options.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.id} · {t.capacity} {lang === "th" ? "ที่นั่ง" : "seats"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{lang === "th" ? "ชื่อผู้จอง" : "Customer name"}</Label>
            <Input value={form.customer_name}
              onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{lang === "th" ? "เบอร์โทร" : "Phone"}</Label>
            <Input value={form.phone} className="font-sans tabular-nums"
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-full">
            {lang === "th" ? "ยกเลิก" : "Cancel"}
          </Button>
          <Button onClick={save} disabled={busy || !form.table_id} className="rounded-full">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {lang === "th" ? "บันทึก" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
