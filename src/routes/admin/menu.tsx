import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { NavBar } from "@/components/NavBar";
import { AdminGuard, AdminTabs } from "@/components/AdminGuard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/admin/menu")({
  head: () => ({
    meta: [
      { title: "Menu · Admin · Riverside Kitchen" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGuard>
      <AdminMenuPage />
    </AdminGuard>
  ),
});

const CATEGORIES = ["Appetizers", "Main Courses", "Seafood", "Drinks", "Desserts"] as const;

type MenuItem = {
  id: string;
  category: string;
  name_th: string;
  name_en: string;
  description_th: string | null;
  description_en: string | null;
  ingredients_th: string | null;
  ingredients_en: string | null;
  price: number;
  image_url: string | null;
  sort_order: number | null;
  is_visible: boolean;
};

async function fetchMenu(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, category, name_th, name_en, description_th, description_en, ingredients_th, ingredients_en, price, image_url, sort_order, is_visible")
    .order("category")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as MenuItem[];
}

const emptyDraft = {
  category: "Main Courses",
  name_th: "",
  name_en: "",
  description_th: "",
  description_en: "",
  ingredients_th: "",
  ingredients_en: "",
  price: "",
  image_url: "",
};

function AdminMenuPage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const menuQ = useQuery({ queryKey: ["adminMenu"], queryFn: fetchMenu });

  const [draft, setDraft] = useState({ ...emptyDraft });
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<Record<string, Partial<MenuItem>>>({});
  const [toDelete, setToDelete] = useState<MenuItem | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["adminMenu"] });
    qc.invalidateQueries({ queryKey: ["menu"] });
    qc.invalidateQueries({ queryKey: ["menuItems"] });
  };

  const addItem = async () => {
    const price = Number(draft.price);
    if (!draft.name_th.trim() || !draft.name_en.trim() || !price || price <= 0) {
      toast.error(lang === "th" ? "กรุณากรอกชื่อเมนูและราคา" : "Please enter the dish names and a price");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("menu_items").insert({
      category: draft.category,
      name_th: draft.name_th.trim(),
      name_en: draft.name_en.trim(),
      description_th: draft.description_th.trim() || null,
      description_en: draft.description_en.trim() || null,
      ingredients_th: draft.ingredients_th.trim() || null,
      ingredients_en: draft.ingredients_en.trim() || null,
      price,
      image_url: draft.image_url.trim() || null,
      is_visible: true,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "th" ? "เพิ่มเมนูแล้ว" : "Dish added");
    setDraft({ ...emptyDraft, category: draft.category });
    refresh();
  };

  const patch = async (id: string, values: Partial<MenuItem>) => {
    const { error } = await supabase.from("menu_items").update(values).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const saveRow = async (item: MenuItem) => {
    const local = edits[item.id];
    if (!local) return;
    const price = local.price !== undefined ? Number(local.price) : item.price;
    if (!price || price <= 0) {
      toast.error(lang === "th" ? "ราคาไม่ถูกต้อง" : "Invalid price");
      return;
    }
    await patch(item.id, { ...local, price });
    setEdits((e) => {
      const next = { ...e };
      delete next[item.id];
      return next;
    });
    toast.success(lang === "th" ? "บันทึกแล้ว" : "Saved");
  };

  const removeItem = async () => {
    if (!toDelete) return;
    const id = toDelete.id;
    setToDelete(null);
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(lang === "th" ? "ลบเมนูแล้ว" : "Dish deleted");
      refresh();
    }
  };

  const field = (item: MenuItem, key: keyof MenuItem) =>
    (edits[item.id]?.[key] ?? item[key] ?? "") as string | number;

  const setField = (id: string, key: keyof MenuItem, value: string) =>
    setEdits((e) => ({ ...e, [id]: { ...e[id], [key]: value } }));

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</div>
          <h1 className="font-display text-4xl">{lang === "th" ? "จัดการเมนูอาหาร" : "Menu Management"}</h1>
        </div>

        <AdminTabs />

        <Card className="p-5 border-border/60 shadow-soft">
          <h2 className="font-display text-xl text-primary mb-4">
            {lang === "th" ? "เพิ่มเมนูใหม่" : "Add a dish"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{lang === "th" ? "หมวด" : "Category"}</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft((d) => ({ ...d, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{lang === "th" ? "ราคา (บาท)" : "Price (THB)"}</Label>
              <Input type="number" min={1} className="font-sans tabular-nums" value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{lang === "th" ? "ชื่อ (ไทย)" : "Name (Thai)"}</Label>
              <Input value={draft.name_th} onChange={(e) => setDraft((d) => ({ ...d, name_th: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{lang === "th" ? "ชื่อ (อังกฤษ)" : "Name (English)"}</Label>
              <Input value={draft.name_en} onChange={(e) => setDraft((d) => ({ ...d, name_en: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{lang === "th" ? "รายละเอียด (ไทย)" : "Description (Thai)"}</Label>
              <Textarea rows={2} value={draft.description_th}
                onChange={(e) => setDraft((d) => ({ ...d, description_th: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{lang === "th" ? "รายละเอียด (อังกฤษ)" : "Description (English)"}</Label>
              <Textarea rows={2} value={draft.description_en}
                onChange={(e) => setDraft((d) => ({ ...d, description_en: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{lang === "th" ? "ส่วนประกอบหลัก (ไทย)" : "Main ingredients (Thai)"}</Label>
              <Textarea rows={2} value={draft.ingredients_th}
                onChange={(e) => setDraft((d) => ({ ...d, ingredients_th: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{lang === "th" ? "ส่วนประกอบหลัก (อังกฤษ)" : "Main ingredients (English)"}</Label>
              <Textarea rows={2} value={draft.ingredients_en}
                onChange={(e) => setDraft((d) => ({ ...d, ingredients_en: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{lang === "th" ? "ลิงก์รูปภาพ (ไม่บังคับ)" : "Image URL (optional)"}</Label>
              <Input value={draft.image_url} placeholder="https://..."
                onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))} />
            </div>
          </div>
          <Button onClick={addItem} disabled={busy} className="mt-4 rounded-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {lang === "th" ? "เพิ่มเมนู" : "Add dish"}
          </Button>
        </Card>

        {menuQ.isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : menuQ.error ? (
          <Card className="p-12 text-center text-destructive border-border/60">
            {lang === "th" ? "โหลดเมนูไม่สำเร็จ" : "Failed to load the menu"}
          </Card>
        ) : (menuQ.data ?? []).length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-border/60">
            {lang === "th" ? "ยังไม่มีเมนูอาหาร" : "No dishes yet"}
          </Card>
        ) : (
          <div className="space-y-4">
            {(menuQ.data ?? []).map((item) => (
              <Card key={item.id} className="p-5 border-border/60 shadow-soft space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.category}</div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {lang === "th" ? "แสดงบนเว็บ" : "Visible"}
                      <Switch checked={item.is_visible}
                        onCheckedChange={(on) => patch(item.id, { is_visible: on })} />
                    </div>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => saveRow(item)}
                      disabled={!edits[item.id]}>
                      <Save className="mr-2 h-4 w-4" />
                      {lang === "th" ? "บันทึก" : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                      onClick={() => setToDelete(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{lang === "th" ? "หมวด" : "Category"}</Label>
                    <Select value={String(field(item, "category"))}
                      onValueChange={(v) => setField(item.id, "category", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === "th" ? "ราคา (บาท)" : "Price (THB)"}</Label>
                    <Input type="number" min={1} className="font-sans tabular-nums"
                      value={String(field(item, "price"))}
                      onChange={(e) => setField(item.id, "price", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === "th" ? "ชื่อ (ไทย)" : "Name (Thai)"}</Label>
                    <Input value={String(field(item, "name_th"))}
                      onChange={(e) => setField(item.id, "name_th", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === "th" ? "ชื่อ (อังกฤษ)" : "Name (English)"}</Label>
                    <Input value={String(field(item, "name_en"))}
                      onChange={(e) => setField(item.id, "name_en", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === "th" ? "รายละเอียด (ไทย)" : "Description (Thai)"}</Label>
                    <Textarea rows={2} value={String(field(item, "description_th"))}
                      onChange={(e) => setField(item.id, "description_th", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === "th" ? "รายละเอียด (อังกฤษ)" : "Description (English)"}</Label>
                    <Textarea rows={2} value={String(field(item, "description_en"))}
                      onChange={(e) => setField(item.id, "description_en", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === "th" ? "ส่วนประกอบหลัก (ไทย)" : "Main ingredients (Thai)"}</Label>
                    <Textarea rows={2} value={String(field(item, "ingredients_th"))}
                      onChange={(e) => setField(item.id, "ingredients_th", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === "th" ? "ส่วนประกอบหลัก (อังกฤษ)" : "Main ingredients (English)"}</Label>
                    <Textarea rows={2} value={String(field(item, "ingredients_en"))}
                      onChange={(e) => setField(item.id, "ingredients_en", e.target.value)} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{lang === "th" ? "ลิงก์รูปภาพ" : "Image URL"}</Label>
                    <Input value={String(field(item, "image_url"))} placeholder="https://..."
                      onChange={(e) => setField(item.id, "image_url", e.target.value)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "th" ? "ลบเมนูนี้?" : "Delete this dish?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "th"
                ? "การลบไม่สามารถย้อนกลับได้ หากต้องการซ่อนชั่วคราวให้ปิด \"แสดงบนเว็บ\" แทน"
                : "This cannot be undone. To hide it temporarily, switch off \"Visible\" instead."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "th" ? "ยกเลิก" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={removeItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {lang === "th" ? "ลบ" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
