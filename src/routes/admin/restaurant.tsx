import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { NavBar } from "@/components/NavBar";
import { AdminGuard, AdminTabs } from "@/components/AdminGuard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/admin/restaurant")({
  head: () => ({
    meta: [
      { title: "Restaurant Info · Admin · Riverside Kitchen" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGuard>
      <AdminRestaurantPage />
    </AdminGuard>
  ),
});

type Info = {
  id: string;
  name_th: string;
  name_en: string;
  description_th: string | null;
  description_en: string | null;
  phone: string | null;
  open_time: string | null;
  close_time: string | null;
  total_tables: number | null;
  zone_info_th: string | null;
  zone_info_en: string | null;
  seating_info_th: string | null;
  seating_info_en: string | null;
};

async function fetchInfo(): Promise<Info | null> {
  const { data, error } = await supabase
    .from("restaurant_info")
    .select("*")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Info | null) ?? null;
}

function AdminRestaurantPage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const infoQ = useQuery({ queryKey: ["restaurantInfoAdmin"], queryFn: fetchInfo });

  const [form, setForm] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (infoQ.data) setForm(infoQ.data);
  }, [infoQ.data]);

  const set = (key: keyof Info, value: string) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!form) return;
    if (!form.name_th.trim() || !form.name_en.trim()) {
      toast.error(lang === "th" ? "กรุณากรอกชื่อร้าน" : "Please enter the restaurant name");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("restaurant_info")
      .update({
        name_th: form.name_th.trim(),
        name_en: form.name_en.trim(),
        description_th: form.description_th?.trim() || null,
        description_en: form.description_en?.trim() || null,
        phone: form.phone?.trim() || null,
        open_time: form.open_time?.trim() || null,
        close_time: form.close_time?.trim() || null,
        total_tables: Number(form.total_tables) || null,
        zone_info_th: form.zone_info_th?.trim() || null,
        zone_info_en: form.zone_info_en?.trim() || null,
        seating_info_th: form.seating_info_th?.trim() || null,
        seating_info_en: form.seating_info_en?.trim() || null,
      })
      .eq("id", form.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "th" ? "บันทึกข้อมูลร้านแล้ว" : "Restaurant info saved");
    qc.invalidateQueries({ queryKey: ["restaurantInfoAdmin"] });
    qc.invalidateQueries({ queryKey: ["restaurantInfo"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</div>
          <h1 className="font-display text-4xl">
            {lang === "th" ? "ข้อมูลร้านอาหาร" : "Restaurant Information"}
          </h1>
        </div>

        <AdminTabs />

        {infoQ.isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : infoQ.error ? (
          <Card className="p-12 text-center text-destructive border-border/60">
            {lang === "th" ? "โหลดข้อมูลไม่สำเร็จ" : "Failed to load restaurant info"}
          </Card>
        ) : !form ? (
          <Card className="p-12 text-center text-muted-foreground border-border/60">
            {lang === "th" ? "ยังไม่มีข้อมูลร้าน" : "No restaurant info yet"}
          </Card>
        ) : (
          <Card className="p-6 border-border/60 shadow-soft space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{lang === "th" ? "ชื่อร้าน (ไทย)" : "Name (Thai)"}</Label>
                <Input value={form.name_th} onChange={(e) => set("name_th", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{lang === "th" ? "ชื่อร้าน (อังกฤษ)" : "Name (English)"}</Label>
                <Input value={form.name_en} onChange={(e) => set("name_en", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{lang === "th" ? "เบอร์โทร" : "Phone"}</Label>
                <Input className="font-sans tabular-nums" value={form.phone ?? ""}
                  onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{lang === "th" ? "จำนวนโต๊ะทั้งหมด" : "Total tables"}</Label>
                <Input type="number" min={1} className="font-sans tabular-nums"
                  value={form.total_tables ?? ""} onChange={(e) => set("total_tables", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{lang === "th" ? "เวลาเปิด" : "Open time"}</Label>
                <Input className="font-sans tabular-nums" placeholder="11:00" value={form.open_time ?? ""}
                  onChange={(e) => set("open_time", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{lang === "th" ? "เวลาปิด" : "Close time"}</Label>
                <Input className="font-sans tabular-nums" placeholder="22:00" value={form.close_time ?? ""}
                  onChange={(e) => set("close_time", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{lang === "th" ? "รายละเอียดร้าน (ไทย)" : "Description (Thai)"}</Label>
                <Textarea rows={3} value={form.description_th ?? ""}
                  onChange={(e) => set("description_th", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{lang === "th" ? "รายละเอียดร้าน (อังกฤษ)" : "Description (English)"}</Label>
                <Textarea rows={3} value={form.description_en ?? ""}
                  onChange={(e) => set("description_en", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{lang === "th" ? "ข้อมูลโซน (ไทย)" : "Zone info (Thai)"}</Label>
                <Textarea rows={2} value={form.zone_info_th ?? ""}
                  onChange={(e) => set("zone_info_th", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{lang === "th" ? "ข้อมูลโซน (อังกฤษ)" : "Zone info (English)"}</Label>
                <Textarea rows={2} value={form.zone_info_en ?? ""}
                  onChange={(e) => set("zone_info_en", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{lang === "th" ? "ข้อมูลที่นั่ง (ไทย)" : "Seating info (Thai)"}</Label>
                <Textarea rows={2} value={form.seating_info_th ?? ""}
                  onChange={(e) => set("seating_info_th", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{lang === "th" ? "ข้อมูลที่นั่ง (อังกฤษ)" : "Seating info (English)"}</Label>
                <Textarea rows={2} value={form.seating_info_en ?? ""}
                  onChange={(e) => set("seating_info_en", e.target.value)} />
              </div>
            </div>

            <Button onClick={save} disabled={busy} className="rounded-full">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {lang === "th" ? "บันทึกข้อมูล" : "Save changes"}
            </Button>
          </Card>
        )}
      </section>
    </div>
  );
}
