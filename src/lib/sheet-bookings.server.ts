/** Server-only: talks to the Apps Script admin actions with the secret ADMIN_API_KEY. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { GAS_API_URL } from "@/lib/auth/gasAuth";
import { classifyGasAdminReply, type GasAdminResponse, type GasAdminResult } from "@/lib/sheet-bookings";

const OWNER_EMAIL = "phonpimon.y@ku.th";

/** Same rule as the admin pages: the verified owner email plus the protected admin role. */
export async function assertAdmin(ctx: {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims: Record<string, unknown>;
}) {
  const email = String(ctx.claims["email"] ?? "").toLowerCase();
  if (email !== OWNER_EMAIL) throw new Error("Forbidden");
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || data !== true) throw new Error("Forbidden");
}

export type { GasAdminResponse, GasAdminResult } from "@/lib/sheet-bookings";

/** POST one admin action. The key is added here and never returned to the browser. */
export async function callGasAdmin(body: Record<string, unknown>): Promise<GasAdminResult> {
  const key = process.env["ADMIN_API_KEY"];
  if (!key) return { ok: false, code: "not_configured", message: "ADMIN_API_KEY is not set on the website server" };
  let res: Response;
  try {
    res = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...body, admin_key: key }),
      redirect: "follow",
    });
  } catch (err) {
    console.error("Apps Script request failed", err);
    return { ok: false, code: "network", message: "Could not reach Apps Script" };
  }
  const textBody = await res.text();
  let data: GasAdminResponse;
  try { data = JSON.parse(textBody); } catch {
    console.error(`Apps Script returned non-JSON [${res.status}]: ${textBody.slice(0, 300)}`);
    return { ok: false, code: "bad_response", message: `Apps Script returned an unexpected response (${res.status})` };
  }
  return classifyGasAdminReply(data);
}
