import { afterEach, describe, expect, mock, test } from "bun:test";

const getUser = mock();
const rpc = mock();
const owner = { id: "staff-user", email: "phonpimon.y@ku.th", email_confirmed_at: "2026-10-17T00:00:00Z" };
mock.module("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser }, rpc } }));
const { verifyAdminAccess } = await import("./admin-auth");

afterEach(() => { getUser.mockReset(); rpc.mockReset(); });

describe("administrator access", () => {
  test("signed-out visitors cannot enter admin", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await verifyAdminAccess()).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  test("regular authenticated users cannot enter admin", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "regular-user" } }, error: null });
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await verifyAdminAccess()).toBe(false);
  });
  test("verified administrators may enter admin", async () => {
    getUser.mockResolvedValue({ data: { user: owner }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await verifyAdminAccess()).toBe(true);
    expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "staff-user", _role: "admin" });
  });
  test("role lookup failure denies access even if data is present", async () => {
    getUser.mockResolvedValue({ data: { user: owner }, error: null });
    rpc.mockResolvedValue({ data: true, error: { message: "unavailable" } });
    expect(await verifyAdminAccess()).toBe(false);
  });
  test("another email cannot enter even if a stale role says admin", async () => {
    getUser.mockResolvedValue({ data: { user: { ...owner, email: "other@ku.th" } }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await verifyAdminAccess()).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  test("the owner email must be verified", async () => {
    getUser.mockResolvedValue({ data: { user: { ...owner, email_confirmed_at: null } }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await verifyAdminAccess()).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});