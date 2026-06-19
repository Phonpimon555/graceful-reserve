import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { NavBar } from "@/components/NavBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import { TIME_SLOTS, useLang, zoneLabel, ZONES, type Zone } from "@/lib/i18n";
import {
  fetchAllReservations, fetchTables, type Reservation, type TableRow,
} from "@/lib/reservations";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Riverside Kitchen" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { t, lang } = useLang();
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
  const [date, setDate] = useState<string>("all");
  const [slot, setSlot] = useState<string>("all");
  const [zone, setZone] = useState<Zone | "all">("all");
  const [pendingDelete, setPendingDelete] = useState<Reservation | null>(null);

  const tableMap = useMemo(() => {
    const m: Record<string, TableRow> = {};
    for (const t of tablesQ.data ?? []) m[t.id] = t;
    return m;
  }, [tablesQ.data]);

  const filtered = useMemo(() => {
    const list = resQ.data ?? [];
    return list.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.customer_name.toLowerCase().includes(q) && !r.phone.includes(search)) return false;
      }
      if (date !== "all" && r.reservation_date !== date) return false;
      if (slot !== "all" && r.time_slot !== slot) return false;
      if (zone !== "all" && tableMap[r.table_id]?.zone !== zone) return false;
      return true;
    });
  }, [resQ.data, search, date, slot, zone, tableMap]);

  const dates = useMemo(
    () => Array.from(new Set((resQ.data ?? []).map((r) => r.reservation_date))).sort().reverse(),
    [resQ.data],
  );

  // Today stats
  const today = format(new Date(), "yyyy-MM-dd");
  const todayRes = (resQ.data ?? []).filter((r) => r.reservation_date === today);
  const totalTables = tablesQ.data?.length ?? 50;

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("reservations").delete().eq("id", pendingDelete.id);
    if (error) toast.error(error.message);
    else toast.success(t("cancelSuccess"));
    setPendingDelete(null);
  };

  const exportCsv = () => {
    const rows = [
      ["ID","Name","Phone","Table","Zone","Date","Time","Created"],
      ...filtered.map((r) => [
        r.id, r.customer_name, r.phone, r.table_id,
        tableMap[r.table_id]?.zone ?? "", r.reservation_date, r.time_slot, r.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
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
            <h1 className="font-display text-4xl">{t("adminTitle")}</h1>
          </div>
          <Button onClick={exportCsv} variant="outline" className="rounded-full">
            <Download className="h-4 w-4 mr-2" /> {t("export")}
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStat label={t("totalRes")} value={resQ.data?.length ?? 0} />
          <AdminStat label={`${t("dashReserved")} (today)`} value={`${todayRes.length}/${totalTables}`} />
          <AdminStat label={`${t("dashAvailable")} (today)`} value={`${totalTables - todayRes.length}/${totalTables}`} />
          <AdminStat label={t("dashOccupancy")} value={`${Math.round((todayRes.length / Math.max(totalTables,1)) * 100)}%`} />
        </div>

        <Card className="p-4 shadow-soft border-border/60">
          <div className="grid sm:grid-cols-4 gap-3">
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger><SelectValue placeholder={t("step1")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "th" ? "ทุกวันที่" : "All dates"}</SelectItem>
                {dates.map((d) => <SelectItem key={d} value={d}>{format(new Date(d), "EEE, MMM d, yyyy")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={slot} onValueChange={setSlot}>
              <SelectTrigger><SelectValue placeholder={t("step2")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allSlots")}</SelectItem>
                {TIME_SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={zone} onValueChange={(v) => setZone(v as Zone | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allZones")}</SelectItem>
                {ZONES.map((z) => <SelectItem key={z} value={z}>{zoneLabel(z, lang)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("step1")}</th>
                  <th className="px-4 py-3">{t("step2")}</th>
                  <th className="px-4 py-3">{t("table")}</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">{t("customerName")}</th>
                  <th className="px-4 py-3">{t("customerPhone")}</th>
                  <th className="px-4 py-3 text-right">{t("cancel")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">{t("noResults")}</td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(r.reservation_date), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">{r.time_slot}</td>
                    <td className="px-4 py-3 font-display text-base">{r.table_id}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                        tableMap[r.table_id]?.zone === "VIP" ? "bg-gold/30 text-gold-foreground" :
                        tableMap[r.table_id]?.zone === "Riverside" ? "bg-success/15 text-success" :
                        "bg-accent text-accent-foreground",
                      )}>
                        {tableMap[r.table_id] ? zoneLabel(tableMap[r.table_id].zone, lang) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.customer_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.phone}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setPendingDelete(r)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmCancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmCancelBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("yesCancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AdminStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5 border-border/60 shadow-soft">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl">{value}</div>
    </Card>
  );
}
