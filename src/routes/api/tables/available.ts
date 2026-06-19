import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const Route = createFileRoute("/api/tables/available")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const zone = url.searchParams.get("zone");
        const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
        const slot = url.searchParams.get("slot");
        const sb = publicClient();

        let tq = sb.from("tables").select("*").order("table_number");
        if (zone) tq = tq.eq("zone", zone);
        const { data: tables, error: tErr } = await tq;
        if (tErr) return Response.json({ success: false, message: tErr.message }, { status: 500 });

        let rq = sb.from("reservations").select("table_id,time_slot").eq("reservation_date", date);
        if (slot) rq = rq.eq("time_slot", slot);
        const { data: res, error: rErr } = await rq;
        if (rErr) return Response.json({ success: false, message: rErr.message }, { status: 500 });

        const reservedIds = new Set((res ?? []).map((r) => r.table_id));
        const availableTables = (tables ?? []).filter((t) => !reservedIds.has(t.id));

        return Response.json({ success: true, availableTables });
      },
    },
  },
});
