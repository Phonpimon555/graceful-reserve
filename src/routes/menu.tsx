import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/NavBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import dishSpringroll from "@/assets/dish-springroll.jpg";
import dishCrab from "@/assets/dish-crab.jpg";
import dishMassaman from "@/assets/dish-massaman.jpg";
import dishGaiyang from "@/assets/dish-gaiyang.jpg";
import dishPrawn from "@/assets/dish-prawn.jpg";
import dishSeabass from "@/assets/dish-seabass.jpg";
import dishMango from "@/assets/dish-mango.jpg";
import dishBrulee from "@/assets/dish-brulee.jpg";
import dishButterfly from "@/assets/dish-butterfly.jpg";
import dishThaitea from "@/assets/dish-thaitea.jpg";
import dishFallback from "@/assets/dish-friedrice.jpg";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — ครัวริมบึง · Riverside Kitchen" },
      { name: "description", content: "Seasonal modern Thai cuisine at Riverside Kitchen — fresh seafood, signature curries, and house-crafted drinks." },
      { property: "og:title", content: "Menu — Riverside Kitchen" },
      { property: "og:description", content: "Explore signature Thai dishes from our lakeside kitchen." },
    ],
  }),
  component: MenuPage,
});

type Item = {
  id: string; category: string;
  name_en: string; name_th: string;
  description_en: string | null; description_th: string | null;
  ingredients_en: string | null; ingredients_th: string | null;
  price: number; image_url: string | null;
  is_visible: boolean;
};

/** Map menu names → real photography. Falls back to a category default. */
const IMAGE_MAP: Record<string, string> = {
  "ปอเปี๊ยะต้มยำกรอบ": dishSpringroll,
  "ยำส้มโอปูม้า": dishCrab,
  "มัสมั่นเนื้อวากิว": dishMassaman,
  "ไก่ย่างถ่าน": dishGaiyang,
  "กุ้งแม่น้ำผัดฉ่า": dishPrawn,
  "ปลากะพงนึ่งมะนาว": dishSeabass,
  "ข้าวเหนียวมะม่วง": dishMango,
  "ครีมบรูเล่กะทิ": dishBrulee,
  "น้ำอัญชันมะนาว": dishButterfly,
  "ชาเย็น": dishThaitea,
};
const POPULAR = new Set([
  "มัสมั่นเนื้อวากิว", "ปลากะพงนึ่งมะนาว", "กุ้งแม่น้ำผัดฉ่า", "ข้าวเหนียวมะม่วง",
]);

function imageFor(item: Item) {
  return IMAGE_MAP[item.name_th] ?? dishFallback;
}

type CatKey = "all" | "popular" | "thai" | "seafood" | "drinks" | "desserts";

function matchCategory(item: Item, cat: CatKey) {
  if (cat === "all") return true;
  if (cat === "popular") return POPULAR.has(item.name_th);
  if (cat === "thai") return item.category === "Appetizers" || item.category === "Main Courses";
  if (cat === "seafood") return item.category === "Seafood";
  if (cat === "drinks") return item.category === "Drinks";
  if (cat === "desserts") return item.category === "Desserts";
  return true;
}

function categoryLabel(cat: string, lang: "en" | "th") {
  if (lang === "th") {
    if (cat === "Appetizers") return "อาหารเรียกน้ำย่อย";
    if (cat === "Main Courses") return "อาหารจานหลัก";
    if (cat === "Seafood") return "อาหารทะเล";
    if (cat === "Desserts") return "ของหวาน";
    if (cat === "Drinks") return "เครื่องดื่ม";
  }
  return cat;
}

function MenuPage() {
  const { t, lang } = useLang();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CatKey>("all");
  const [selected, setSelected] = useState<Item | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["menu"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_visible", true)
        .order("sort_order");
      if (error) throw error;
      return data as Item[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((it) => {
      if (!matchCategory(it, cat)) return false;
      if (!q) return true;
      return (
        it.name_en.toLowerCase().includes(q) ||
        it.name_th.toLowerCase().includes(q) ||
        (it.description_en ?? "").toLowerCase().includes(q) ||
        (it.description_th ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, query, cat]);

  const tabs: { key: CatKey; label: string }[] = [
    { key: "all", label: t("catAll") },
    { key: "popular", label: t("catPopular") },
    { key: "thai", label: t("catThai") },
    { key: "seafood", label: t("catSeafood") },
    { key: "drinks", label: t("catDrinks") },
    { key: "desserts", label: t("catDesserts") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      {/* Page header */}
      <section className="border-b border-border/60 bg-gradient-to-b from-secondary/40 to-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
            {t("brand")}
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-primary">
            {t("menuTitle")}
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            {t("menuSubtitle")}
          </p>
        </div>
      </section>

      {/* Controls */}
      <section className="sticky top-16 z-30 bg-background/85 backdrop-blur-md border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("menuSearch")}
              className="pl-9 h-10 font-sans"
              aria-label={t("menuSearch")}
            />
          </div>

          <Tabs value={cat} onValueChange={(v) => setCat(v as CatKey)} className="w-full lg:w-auto">
            <TabsList className="h-auto w-full lg:w-auto flex-wrap justify-start gap-1 bg-secondary/60 p-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="font-sans text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-baseline justify-between mb-6">
          <p className="text-sm text-muted-foreground font-sans">
            <span className="font-semibold tabular-nums text-foreground">{filtered.length}</span>{" "}
            {t("itemsCount")}
          </p>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/60 overflow-hidden">
                <div className="aspect-[4/3] bg-muted animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded animate-pulse w-2/3" />
                  <div className="h-4 bg-muted rounded animate-pulse w-full" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 text-destructive">
            {lang === "th" ? "โหลดเมนูไม่สำเร็จ กรุณาลองใหม่" : "Could not load the menu. Please try again."}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {t("menuEmpty")}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((it) => {
              const isPopular = POPULAR.has(it.name_th);
              return (
                <Card
                  key={it.id}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-2xl border-border/60 bg-card",
                    "shadow-sm hover:shadow-elegant transition-all duration-300 hover:-translate-y-1",
                  )}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={imageFor(it)}
                      alt={lang === "th" ? it.name_th : it.name_en}
                      loading="lazy"
                      width={1024}
                      height={768}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge variant="secondary" className="bg-white/95 text-primary border-0 backdrop-blur-sm font-sans text-[11px] tracking-wide">
                        {categoryLabel(it.category, lang)}
                      </Badge>
                      {isPopular && (
                        <Badge className="bg-gold text-primary border-0 font-sans text-[11px] tracking-wide gap-1">
                          <Sparkles className="h-3 w-3" />
                          {t("popular")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-display text-xl leading-tight text-primary">
                        {lang === "th" ? it.name_th : it.name_en}
                      </h3>
                      <span className="shrink-0 font-sans font-bold tabular-nums tracking-tight text-lg text-primary">
                        ฿{Number(it.price).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                      {(lang === "th" ? it.description_th : it.description_en) ||
                        (lang === "th" ? "ยังไม่มีรายละเอียดเมนูนี้" : "No description yet")}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setSelected(it)}
                      className="mt-4 w-full rounded-full border-gold/70 bg-background text-primary hover:bg-gold hover:text-primary font-sans"
                    >
                      {lang === "th" ? "ดูรายละเอียด" : "View Details"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {selected && (
            <>
              <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                <img
                  src={imageFor(selected)}
                  alt={lang === "th" ? selected.name_th : selected.name_en}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-6">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="font-display text-2xl text-primary">
                    {lang === "th" ? selected.name_th : selected.name_en}
                  </DialogTitle>
                  <DialogDescription className="font-sans">
                    {lang === "th" ? selected.name_en : selected.name_th} ·{" "}
                    {categoryLabel(selected.category, lang)}
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-3 font-sans text-xl font-bold tabular-nums text-primary">
                  ฿{Number(selected.price).toLocaleString()}
                </div>

                <div className="mt-5 space-y-4 text-sm">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                      {lang === "th" ? "รายละเอียด" : "Description"}
                    </div>
                    <p className="text-foreground/90 leading-relaxed">
                      {(lang === "th" ? selected.description_th : selected.description_en) ||
                        (lang === "th" ? "ยังไม่มีข้อมูล" : "Not available yet")}
                    </p>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                      {lang === "th" ? "ส่วนประกอบหลัก" : "Main Ingredients"}
                    </div>
                    <p className="text-foreground/90 leading-relaxed">
                      {(lang === "th" ? selected.ingredients_th : selected.ingredients_en) ||
                        (lang === "th" ? "ยังไม่มีข้อมูล" : "Not available yet")}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
