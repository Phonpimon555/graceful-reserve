import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  tableId: z.string().trim().min(1).max(10),
  zone: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/),
});

const cancelSchema = z.object({
  phone: z.string().trim().min(7).max(20),
  reservationId: z.string().min(1),
});

export const Route = createFileRoute("/api/reservations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null);
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
        const sb = publicClient();
        const { error } = await sb.from("reservations").insert({
          table_id: parsed.data.tableId,
          customer_name: parsed.data.name,
          phone: parsed.data.phone,
          reservation_date: parsed.data.date,
          time_slot: parsed.data.timeSlot,
        });
        if (error) {
          if (error.code === "23505") return Response.json({ success: false, message: "Table unavailable" }, { status: 409 });
          return Response.json({ success: false, message: error.message }, { status: 500 });
        }
        return Response.json({ success: true, message: "Reservation successful" });
      },

      DELETE: async ({ request }) => {
        const body = await request.json().catch(() => null);
        const parsed = cancelSchema.safeParse(body);
        if (!parsed.success) return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
        const sb = publicClient();
        const { data: existing, error: eFetch } = await sb
          .from("reservations").select("*").eq("id", parsed.data.reservationId).maybeSingle();
        if (eFetch) return Response.json({ success: false, message: eFetch.message }, { status: 500 });
        if (!existing) return Response.json({ success: false, message: "Reservation not found" }, { status: 404 });
        const normalize = (p: string) => p.replace(/\D/g, "");
        if (normalize(existing.phone) !== normalize(parsed.data.phone)) {
          return Response.json({ success: false, message: "Phone does not match" }, { status: 403 });
        }
        const { error } = await sb.from("reservations").delete().eq("id", parsed.data.reservationId);
        if (error) return Response.json({ success: false, message: error.message }, { status: 500 });
        return Response.json({ success: true, message: "Reservation cancelled" });
      },
    },
  },
});
