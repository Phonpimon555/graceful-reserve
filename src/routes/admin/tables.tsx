import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { NavBar } from "@/components/NavBar";
import { AdminGuard, AdminTabs } from "@/components/AdminGuard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLang, zoneLabel, ZONES, type Zone } from "@/lib/i18n";
import { fetchTables, type TableRow } from "@/lib/reservations";

export const Route = createFileRoute("/admin/tables")({
  head: () => ({
    meta: [
      { title: "Tables · Admin · Riverside Kitchen" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGuard>
      <AdminTablesPage />
    </AdminGuard>
  ),
});

const CAPACITIES = [2, 4, 6, 10];

function AdminTablesPage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const tablesQ = useQuery({ queryKey: ["tables"], queryFn: fetchTables });

  const [newTable, setNewTable] = useState({ table_number: "", zone: "Riverside" as Zone, capacity: 4 });
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<TableRow | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["tables"] });

  const addTable = async () => {
    const num = Number(newTable.table_number);
    if (!num || num < 1) {
      toast.error(lang === "th" ? "กรุณากรอกหมายเลขโต๊ะ" : "Please enter a table number");
      return;
    }
    const prefix = newTable.zone === "VIP" ? "V" : newTable.zone === "Riverside" ? "R" : "G";
    setBusy(true);
    const { error } = await supabase.from("tables").insert({
      id: `${prefix}${num}`,
      table_number: num,
      zone: newTable.zone,
      capacity: newTable.capacity,
      status: "available",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "th" ? "เพิ่มโต๊ะแล้ว" : "Table added");
    setNewTable({ table_number: "", zone: newTable.zone, capacity: newTable.capacity });
    refresh();
  };

  const patchTable = async (id: string, patch: Partial<TableRow>) => {
    const { error } = await supabase.from("tables").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const removeTable = async () => {
    if (!toDelete) return;
    const id = toDelete.id;
    setToDelete(null);
    const { error } = await supabase.from("tables").delete().eq("id", id);
    if (error) {
      toast.error(
        lang === "th"
          ? "ลบไม่ได้ เนื่องจากมีการจองที่ผูกกับโต๊ะนี้ กรุณาปิดใช้งานโต๊ะแทน"
          : "Cannot delete: reservations reference this table. Disable it instead.",
      );
      return;
    }
    toast.success(lang === "th" ? "ลบโต๊ะแล้ว" : "Table deleted");
    refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</div>
          <h1 className="font-display text-4xl">{lang === "th" ? "จัดการโต๊ะ" : "Table Management"}</h1>
        </div>

        <AdminTabs />

        <Card className="p-5 border-border/60 shadow-soft">
          <h2 className="font-display text-xl text-primary mb-4">
            {lang === "th" ? "เพิ่มโต๊ะใหม่" : "Add a table"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>{lang === "th" ? "หมายเลขโต๊ะ" : "Table number"}</Label>
              <Input type="number" min={1} value={newTable.table_number} className="font-sans tabular-nums"
                onChange={(e) => setNewTable((f) => ({ ...f, table_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{lang === "th" ? "โซน" : "Zone"}</Label>
              <Select value={newTable.zone} onValueChange={(v) => setNewTable((f) => ({ ...f, zone: v as Zone }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ZONES.map((z) => <SelectItem key={z} value={z}>{zoneLabel(z, lang)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{lang === "th" ? "ความจุ" : "Capacity"}</Label>
              <Select value={String(newTable.capacity)} onValueChange={(v) => setNewTable((f) => ({ ...f, capacity: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAPACITIES.map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      {c} {lang === "th" ? "ที่นั่ง" : "seats"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addTable} disabled={busy} className="w-full rounded-full">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {lang === "th" ? "เพิ่มโต๊ะ" : "Add table"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{lang === "th" ? "โต๊ะ" : "Table"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "หมายเลข" : "Number"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "โซน" : "Zone"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "ความจุ" : "Capacity"}</th>
                  <th className="px-4 py-3">{lang === "th" ? "เปิดใช้งาน" : "Active"}</th>
                  <th className="px-4 py-3 text-right">{lang === "th" ? "ลบ" : "Delete"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tablesQ.isLoading ? (
                  <tr><td colSpan={6} className="py-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </td></tr>
                ) : tablesQ.error ? (
                  <tr><td colSpan={6} className="py-12 text-center text-destructive">
                    {lang === "th" ? "โหลดข้อมูลไม่สำเร็จ" : "Failed to load tables"}
                  </td></tr>
                ) : (tablesQ.data ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">
                    {lang === "th" ? "ยังไม่มีโต๊ะ" : "No tables yet"}
                  </td></tr>
                ) : (tablesQ.data ?? []).map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3 font-display text-base">{t.id}</td>
                    <td className="px-4 py-3 font-sans tabular-nums">{t.table_number}</td>
                    <td className="px-4 py-3">
                      <Select value={t.zone} onValueChange={(v) => patchTable(t.id, { zone: v as Zone })}>
                        <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ZONES.map((z) => <SelectItem key={z} value={z}>{zoneLabel(z, lang)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select value={String(t.capacity)} onValueChange={(v) => patchTable(t.id, { capacity: Number(v) })}>
                        <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CAPACITIES.map((c) => <SelectItem key={c} value={String(c)}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={t.status !== "disabled"}
                        onCheckedChange={(on) => patchTable(t.id, { status: on ? "available" : "disabled" })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                        onClick={() => setToDelete(t)}>
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

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "th" ? "ลบโต๊ะนี้?" : "Delete this table?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "th"
                ? "การลบไม่สามารถย้อนกลับได้ หากมีการจองอยู่แล้วให้ปิดใช้งานโต๊ะแทน"
                : "This cannot be undone. If the table has reservations, disable it instead."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "th" ? "ยกเลิก" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={removeTable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {lang === "th" ? "ลบ" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
