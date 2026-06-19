import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/NavBar";
import { Card } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";
import { useMemo } from "react";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — Riverside Kitchen" },
      { name: "description", content: "Seasonal modern Thai cuisine at Riverside Kitchen." },
    ],
  }),
  component: MenuPage,
});

type Item = {
  id: string; category: string;
  name_en: string; name_th: string;
  description_en: string | null; description_th: string | null;
  price: number; image_url: string | null;
};

const CATEGORIES = ["Appetizers", "Main Courses", "Seafood", "Desserts", "Drinks"] as const;

function MenuPage() {
  const { t, lang } = useLang();
  const { data } = useQuery({
    queryKey: ["menu"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").order("sort_order");
      if (error) throw error;
      return data as Item[];
    },
  });

  const grouped = useMemo(() => {
    const m: Record<string, Item[]> = {};
    for (const it of data ?? []) (m[it.category] ??= []).push(it);
    return m;
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">{t("brand")}</div>
          <h1 className="font-display text-5xl sm:text-6xl">{t("menuTitle")}</h1>
          <p className="mt-3 text-muted-foreground">{t("menuSubtitle")}</p>
        </div>

        <div className="space-y-14">
          {CATEGORIES.map((cat) => {
            const items = grouped[cat] ?? [];
            if (!items.length) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="font-display text-2xl sm:text-3xl">{cat}</h2>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {items.map((it) => (
                    <Card key={it.id} className="p-5 hover:shadow-elegant transition-shadow border-border/60">
                      <div className="flex items-baseline justify-between gap-3 mb-1.5">
                        <h3 className="font-display text-xl truncate">
                          {lang === "th" ? it.name_th : it.name_en}
                        </h3>
                        <span className="font-display text-lg text-primary shrink-0">฿{it.price}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {lang === "th" ? it.description_th : it.description_en}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
