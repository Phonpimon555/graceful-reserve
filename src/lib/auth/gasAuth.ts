/**
 * Google Apps Script auth client. Credentials are verified by the API only;
 * localStorage holds just the signed-in member's session details.
 */
import type { AuthClient, AuthResult, AuthUser } from "./types";

export const GAS_API_URL =
  "https://script.google.com/macros/s/AKfycbxubbiKANW6WNhifrw00j2CW_lQ3ZtIxYLqNFVOn4AT15b8J7xsjQR7ewkreBqKPUR9gg/exec";

const SESSION_KEY = "rk.member.session";
const hasWindow = () => typeof window !== "undefined";

function readSession(): AuthUser | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function createGasAuthClient(): AuthClient {
  const listeners = new Set<(u: AuthUser | null) => void>();
  const setSession = (u: AuthUser | null) => {
    if (!hasWindow()) return;
    if (u) window.localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    else window.localStorage.removeItem(SESSION_KEY);
    listeners.forEach((l) => l(u));
  };

  return {
    getUser: readSession,

    async signUp(): Promise<AuthResult> {
      return { ok: false, error: "unknown" };
    },

    async signIn(email, password): Promise<AuthResult> {
      try {
        const res = await fetch(GAS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "login", email: email.trim(), password }),
        });
        const data = await res.json();
        if (data?.status !== "success" || !data.member_id) {
          return { ok: false, error: "invalid_credentials", message: data?.message };
        }
        const user: AuthUser = {
          id: String(data.member_id),
          email: String(data.email ?? email.trim()),
          full_name: String(data.name ?? ""),
          phone: String(data.phone ?? ""),
          created_at: new Date().toISOString(),
        };
        setSession(user);
        return { ok: true, user, message: data.message };
      } catch {
        return { ok: false, error: "unknown", message: "ไม่สามารถเชื่อมต่อระบบเข้าสู่ระบบได้ กรุณาลองใหม่" };
      }
    },

    async signOut() {
      setSession(null);
    },

    async updateUser(patch): Promise<AuthResult> {
      const cur = readSession();
      if (!cur) return { ok: false, error: "not_signed_in" };
      const next = { ...cur, full_name: patch.full_name?.trim() ?? cur.full_name, phone: patch.phone?.trim() ?? cur.phone };
      setSession(next);
      return { ok: true, user: next };
    },

    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => { if (e.key === SESSION_KEY) listener(readSession()); };
      if (hasWindow()) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (hasWindow()) window.removeEventListener("storage", onStorage);
      };
    },
  };
}
