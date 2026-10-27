import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useLang, zoneLabel, type Lang } from "@/lib/i18n";
import type { ReservationStatus } from "@/lib/reservations";
import { fetchHistory, cancelBooking, safePeople, sheetDate, type GasBooking } from "@/lib/gasBooking";
import { bookingRange } from "@/lib/booking-time";

type Reservation = {
  id: string; customer_name: string; phone: string; reservation_date: string; time_slot: string;
  party_size: number | null; table_id: string; zone: string; status: ReservationStatus;
  created_at: string; updated_at: string;
};

function toStatus(v: string): ReservationStatus {
  const s = (v || "").toLowerCase();
  if (s.includes("cancel") || s.includes("ยกเลิก")) return "cancelled";
  if (s.includes("complete") || s.includes("เสร็จ")) return "completed";
  if (s.includes("pending") || s.includes("รอ")) return "pending";
  return "confirmed";
}

function fromGas(b: GasBooking): Reservation {
  return {
    id: String(b.booking_id), customer_name: b.name, phone: String(b.phone ?? ""),
    reservation_date: sheetDate(String(b.date)), time_slot: bookingRange(b.time),
    party_size: safePeople(b.people), table_id: String(b.table_id ?? ""), zone: String(b.zone ?? ""),
    status: toStatus(b.booking_status), created_at: String(b.created_at ?? ""), updated_at: String(b.updated_at ?? ""),
  };
}

function fmt(v: string, pattern: string) {
  const d = new Date(v);
  return v && !isNaN(d.getTime()) ? format(d, pattern) : (v || "—");
}
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "ประวัติการจอง · My Bookings — Riverside Kitchen" },
      { name: "description", content: "View your Riverside Kitchen reservation history, details and status." },
      { property: "og:title", content: "My Bookings — Riverside Kitchen" },
      { property: "og:description", content: "View your reservation history, details and status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

const STATUS_LABEL: Record<ReservationStatus, { th: string; en: string; cls: string }> = {
  pending: { th: "รอยืนยัน", en: "Pending", cls: "bg-gold/20 text-gold-foreground border-gold/50" },
  confirmed: { th: "ยืนยันแล้ว", en: "Confirmed", cls: "bg-success/15 text-success border-success/40" },
  cancelled: { th: "ยกเลิกแล้ว", en: "Cancelled", cls: "bg-destructive/10 text-destructive border-destructive/40" },
  completed: { th: "เสร็จสิ้น", en: "Completed", cls: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({ status, lang }: { status: ReservationStatus; lang: Lang }) {
  const s = STATUS_LABEL[status];
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", s.cls)}>
      {lang === "th" ? s.th : s.en}
    </span>
  );
}

function HistoryPage() {
  const { lang } = useLang();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [pendingCancel, setPendingCancel] = useState<Reservation | null>(null);
  const [busy, setBusy] = useState(false);

  const myQ = useQuery({
    queryKey: ["myReservations", user?.id],
    queryFn: async () => (await fetchHistory(user!.id)).map(fromGas),
    enabled: !!user,
  });

  const doCancel = async () => {
    if (!pendingCancel) return;
    setBusy(true);
    const r = await cancelBooking(user?.id ?? "", pendingCancel.id);
    setBusy(false);
    if (r.ok) {
      toast.success(r.data.message || (lang === "th" ? "ยกเลิกการจองแล้ว" : "Reservation cancelled"));
      qc.invalidateQueries({ queryKey: ["myReservations"] });
      qc.invalidateQueries({ queryKey: ["reservations"] });
      setDetail(null);
    } else {
      toast.error(r.message);
    }
    setPendingCancel(null);
  };

  const rows = myQ.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
        <Button
          asChild
          variant="outline"
          className="h-11 gap-2 rounded-full border-border/70 bg-card/70 px-4 text-sm font-medium hover:border-gold hover:bg-card hover:text-primary"
        >
          <Link to="/home">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {lang === "th" ? "กลับหน้าหลัก" : "Back home"}
          </Link>
        </Button>

        <h1 className="mt-6 font-display text-4xl">{lang === "th" ? "ประวัติการจอง" : "Booking History"}</h1>
        <div className="mt-3 h-px w-24 gold-divider" />

        {loading ? (
          <Card className="mt-8 p-8 space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
          </Card>
        ) : !user ? (
          <Card className="mt-8 p-10 text-center space-y-4">
            <p className="text-muted-foreground">
              {lang === "th"
                ? "กรุณาเข้าสู่ระบบเพื่อดูประวัติการจองของคุณ"
                : "Please sign in to view your booking history."}
            </p>
            <Button asChild className="bg-gradient-gold text-primary border-0 shadow-gold">
              <Link to="/login">{lang === "th" ? "เข้าสู่ระบบ" : "Sign in"}</Link>
            </Button>
          </Card>
        ) : myQ.isLoading ? (
          <Card className="mt-8 p-8 space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
          </Card>
        ) : myQ.isError ? (
          <Card className="mt-8 p-10 text-center space-y-3">
            <p className="text-destructive">{lang === "th" ? "โหลดข้อมูลไม่สำเร็จ" : "Failed to load bookings."}</p>
            <Button variant="outline" onClick={() => myQ.refetch()}>
              {lang === "th" ? "ลองอีกครั้ง" : "Try again"}
            </Button>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="mt-8 p-12 text-center space-y-4">
            <p className="text-muted-foreground">
              {lang === "th" ? "ยังไม่มีประวัติการจอง" : "No bookings yet."}
            </p>
            <Button asChild className="bg-gradient-gold text-primary border-0 shadow-gold">
              <Link to="/home">{lang === "th" ? "จองโต๊ะ" : "Book a table"}</Link>
            </Button>
          </Card>
        ) : (
          <div className="mt-8 space-y-3">
            {rows.map((r) => (
              <Card key={r.id} className="p-5 flex flex-wrap items-center justify-between gap-4 hover:shadow-elegant transition-shadow">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-xl">
                      {lang === "th" ? "โต๊ะ" : "Table"} {r.table_id}
                    </span>
                    <StatusBadge status={r.status} lang={lang} />
                  </div>
                  <div className="mt-1 font-sans text-sm text-muted-foreground tabular-nums">
                    {fmt(r.reservation_date, "EEE, d MMM yyyy")} · {r.time_slot} · {r.party_size ?? "—"}{" "}
                    {lang === "th" ? "ท่าน" : "guests"}
                    {r.zone ? ` · ${(/^[A-Za-z]/.test(r.zone) ? zoneLabel(r.zone, lang) : r.zone)}` : ""}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setDetail(r)}>
                  {lang === "th" ? "ดูรายละเอียด" : "View details"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {lang === "th" ? "รายละเอียดการจอง" : "Reservation Details"}
            </DialogTitle>
            <DialogDescription>
              {lang === "th" ? "ข้อมูลการจองของคุณทั้งหมด" : "Full details of your reservation."}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Row label={lang === "th" ? "รหัสการจอง" : "Booking ID"} value={detail.id} />
              <Row label={lang === "th" ? "สถานะ" : "Status"} value={<StatusBadge status={detail.status} lang={lang} />} />
              <Row label={lang === "th" ? "ชื่อผู้จอง" : "Name"} value={detail.customer_name} />
              <Row label={lang === "th" ? "เบอร์โทร" : "Phone"} value={detail.phone} />
              <Row label={lang === "th" ? "วันที่" : "Date"} value={fmt(detail.reservation_date, "d MMM yyyy")} />
              <Row label={lang === "th" ? "เวลา" : "Time"} value={detail.time_slot} />
              <Row label={lang === "th" ? "จำนวนผู้เข้าร่วม" : "Guests"} value={detail.party_size != null ? String(detail.party_size) : "—"} />
              <Row
                label={lang === "th" ? "โต๊ะ" : "Table"}
                value={detail.table_id || "—"}
              />
              <Row
                label={lang === "th" ? "โซน" : "Zone"}
                value={detail.zone ? (/^[A-Za-z]/.test(detail.zone) ? zoneLabel(detail.zone, lang) : detail.zone) : "—"}
              />
              <Row label={lang === "th" ? "วันที่สร้าง" : "Created"} value={fmt(detail.created_at, "d MMM yyyy HH:mm")} />
              <Row label={lang === "th" ? "แก้ไขล่าสุด" : "Last updated"} value={fmt(detail.updated_at, "d MMM yyyy HH:mm")} />
            </div>
          )}

          <DialogFooter className="gap-2">
            {detail && (detail.status === "pending" || detail.status === "confirmed") && (
              <Button variant="destructive" onClick={() => setPendingCancel(detail)}>
                {lang === "th" ? "ยกเลิกการจอง" : "Cancel booking"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDetail(null)}>
              {lang === "th" ? "ปิด" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingCancel} onOpenChange={(o) => !o && setPendingCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "th" ? "ยืนยันการยกเลิก?" : "Cancel this reservation?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "th"
                ? "โต๊ะจะกลับมาว่างสำหรับผู้อื่น แต่รายการนี้จะยังอยู่ในประวัติการจอง"
                : "The table becomes available again, but this booking stays in your history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{lang === "th" ? "ไม่" : "No"}</AlertDialogCancel>
            <AlertDialogAction onClick={doCancel} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {lang === "th" ? "ยืนยันยกเลิก" : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-sans font-medium tabular-nums">{value}</div>
    </div>
  );
}
