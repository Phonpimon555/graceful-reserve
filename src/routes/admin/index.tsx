import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Download, Eye, Loader2, Pencil, XCircle } from "lucide-react";
import { toast } from "sonner";

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
  fetchAllReservations, fetchTables, setReservationStatus, updateReservation,
  type Reservation, type ReservationStatus, type TableRow,
} from "@/lib/reservations";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin · Riverside Kitchen" },
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

function AdminReservations() {
  const { lang } = useLang();
  const qc = useQueryClient();

  const tablesQ = useQuery({ queryKey: ["tables"], queryFn: fetchTables });
  const resQ = useQuery({ queryKey: ["allReservations"], queryFn: fetchAllReservations });

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
  const [editing, setEditing] = useState<Reservation | null>(null);

  const tableMap = useMemo(() => {
    const m: Record<string, TableRow> = {};
    for (const t of tablesQ.data ?? []) m[t.id] = t;
    return m;
  }, [tablesQ.data]);

  const filtered = useMemo(() => {
    return (resQ.data ?? []).filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.customer_name.toLowerCase().includes(q) && !r.phone.includes(search)) return false;
      }
      if (date !== "all" && r.reservation_date !== date) return false;
      if (slot !== "all" && r.time_slot !== slot) return false;
      if (zone !== "all" && tableMap[r.table_id]?.zone !== zone) return false;
      if (status !== "all" && r.status !== status) return false;
      return true;
    });
  }, [resQ.data, search, date, slot, zone, status, tableMap]);

  const dates = useMemo(
    () => Array.from(new Set((resQ.data ?? []).map((r) => r.reservation_date))).sort().reverse(),
    [resQ.data],
  );

  const today = format(new Date(), "yyyy-MM-dd");
  const active = (resQ.data ?? []).filter((r) => r.status !== "cancelled");
  const todayRes = active.filter((r) => r.reservation_date === today);
  const totalTables = tablesQ.data?.filter((t) => t.status !== "disabled").length ?? 0;
  const occupancy = totalTables > 0 ? Math.round((todayRes.length / totalTables) * 100) : 0;

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

  const exportCsv = () => {
    const rows = [
      ["ID", "Name", "Phone", "Table", "Zone", "Date", "Time", "Party", "Status", "Created", "Updated"],
      ...filtered.map((r) => [
        r.id, r.customer_name, r.phone, r.table_id, tableMap[r.table_id]?.zone ?? "",
        r.reservation_date, r.time_slot, r.party_size, r.status, r.created_at, r.updated_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `reservations-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

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
          <Button onClick={exportCsv} variant="outline" className="rounded-full">
            <Download className="h-4 w-4 mr-2" /> {lang === "th" ? "ส่งออก CSV" : "Export CSV"}
          </Button>
        </div>

        <AdminTabs />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStat label={lang === "th" ? "การจองทั้งหมด" : "Total reservations"} value={resQ.data?.length ?? 0} />
          <AdminStat label={lang === "th" ? "จองแล้ววันนี้" : "Reserved today"} value={`${todayRes.length}/${totalTables}`} />
          <AdminStat label={lang === "th" ? "ว่างวันนี้" : "Available today"} value={`${Math.max(totalTables - todayRes.length, 0)}/${totalTables}`} />
          <AdminStat label={lang === "th" ? "อัตราการใช้โต๊ะ" : "Occupancy"} value={`${occupancy}%`} />
        </div>

        <Card className="p-4 shadow-soft border-border/60">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              placeholder={lang === "th" ? "ค้นหาชื่อ / เบอร์โทร" : "Search name / phone"}
              value={search} onChange={(e) => setSearch(e.target.value)} className="font-sans"
            />
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "th" ? "ทุกวันที่" : "All dates"}</SelectItem>
                {dates.map((d) => (
                  <SelectItem key={d} value={d}>{format(new Date(d), "EEE, MMM d, yyyy")}</SelectItem>
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
                {resQ.isLoading ? (
                  <tr><td colSpan={9} className="py-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </td></tr>
                ) : resQ.error ? (
                  <tr><td colSpan={9} className="py-12 text-center text-destructive">
                    {lang === "th" ? "โหลดข้อมูลไม่สำเร็จ" : "Failed to load reservations"}
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">
                    {lang === "th" ? "ยังไม่มีรายการจอง" : "No reservations yet"}
                  </td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3 whitespace-nowrap font-sans tabular-nums">
                      {format(new Date(r.reservation_date), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-sans tabular-nums font-medium">{r.time_slot}</td>
                    <td className="px-4 py-3 font-display text-base">{r.table_id}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                        tableMap[r.table_id]?.zone === "VIP" ? "bg-gold/30 text-gold-foreground"
                        : tableMap[r.table_id]?.zone === "Riverside" ? "bg-success/15 text-success"
                        : "bg-accent text-accent-foreground",
                      )}>
                        {tableMap[r.table_id] ? zoneLabel(tableMap[r.table_id].zone, lang) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans tabular-nums">{r.party_size}</td>
                    <td className="px-4 py-3">{r.customer_name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-sans tabular-nums">{r.phone}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", statusClass(r.status))}>
                        {statusLabel(r.status, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {r.status === "pending" || r.status === "confirmed" ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {r.status === "pending" ? (
                              <Button size="sm" variant="ghost" className="text-success hover:bg-success/10"
                                onClick={() => setPendingAction({ res: r, next: "confirmed" })}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-success hover:bg-success/10"
                                onClick={() => setPendingAction({ res: r, next: "completed" })}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                              onClick={() => setPendingAction({ res: r, next: "cancelled" })}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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

      <DetailDialog res={detail} onClose={() => setDetail(null)} tableMap={tableMap} />

      <EditDialog
        res={editing}
        tables={tablesQ.data ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["allReservations"] }); }}
      />
    </div>
  );
}

function AdminStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5 border-border/60 shadow-soft">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-sans text-3xl font-semibold tabular-nums text-primary">{value}</div>
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
