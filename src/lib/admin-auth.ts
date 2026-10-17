import { supabase } from "@/integrations/supabase/client";

/** Validate the identity with Auth, then check the protected role RPC. */
export async function verifyAdminAccess(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return false;
    if (data.user.email?.toLowerCase() !== "phonpimon.y@ku.th" || !data.user.email_confirmed_at) return false;
    const role = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    return !role.error && role.data === true;
  } catch {
    return false;
  }
}