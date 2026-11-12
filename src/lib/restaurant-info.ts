import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RestaurantInfo = {
  name_th: string; name_en: string;
  description_th: string | null; description_en: string | null;
  phone: string | null; open_time: string | null; close_time: string | null;
  total_tables: number | null;
  zone_info_th: string | null; zone_info_en: string | null;
  seating_info_th: string | null; seating_info_en: string | null;
};

async function fetchRestaurantInfo(): Promise<RestaurantInfo | null> {
  const { data, error } = await supabase
    .from("restaurant_info").select("*").order("created_at").limit(1).maybeSingle();
  if (error) throw error;
  return (data as RestaurantInfo | null) ?? null;
}

/** Public restaurant details saved by the admin. Same key the admin page invalidates. */
export function useRestaurantInfo() {
  return useQuery({ queryKey: ["restaurantInfo"], queryFn: fetchRestaurantInfo, staleTime: 30_000 });
}

/** Pick the language field, falling back to the built-in text when empty. */
export function pick(th: string | null | undefined, en: string | null | undefined, lang: string, fallback: string) {
  const v = (lang === "th" ? th : en)?.trim();
  return v || fallback;
}
