import { afterEach, describe, expect, mock, test } from "bun:test";

const getUser = mock();
const rpc = mock();
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
    getUser.mockResolvedValue({ data: { user: { id: "staff-user" } }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await verifyAdminAccess()).toBe(true);
    expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "staff-user", _role: "admin" });
  });
  test("role lookup failure denies access even if data is present", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "staff-user" } }, error: null });
    rpc.mockResolvedValue({ data: true, error: { message: "unavailable" } });
    expect(await verifyAdminAccess()).toBe(false);
  });
});