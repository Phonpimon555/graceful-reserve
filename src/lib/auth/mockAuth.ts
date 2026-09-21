/**
 * Mock authentication client — accounts and session live in localStorage.
 * No hardcoded demo accounts: users must register before they can sign in.
 */
import type { AuthClient, AuthResult, AuthUser, SignUpInput } from "./types";

const USERS_KEY = "rk.auth.users";
const SESSION_KEY = "rk.auth.session";

type StoredUser = AuthUser & { password: string };

const hasWindow = () => typeof window !== "undefined";

/** Not real security — only keeps plain passwords out of storage for this mock. */
function obfuscate(password: string) {
  let out = "";
  for (let i = 0; i < password.length; i++) {
    out += String.fromCharCode(password.charCodeAt(i) ^ 42);
  }
  return btoa(unescape(encodeURIComponent(out)));
}

function readUsers(): StoredUser[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function publicUser(u: StoredUser): AuthUser {
  const { password: _password, ...rest } = u;
  return rest;
}

export function createMockAuthClient(): AuthClient {
  const listeners = new Set<(u: AuthUser | null) => void>();

  const emit = () => {
    const u = client.getUser();
    listeners.forEach((l) => l(u));
  };

  const setSession = (userId: string | null) => {
    if (!hasWindow()) return;
    if (userId) window.localStorage.setItem(SESSION_KEY, userId);
    else window.localStorage.removeItem(SESSION_KEY);
    emit();
  };

  const client: AuthClient = {
    getUser() {
      if (!hasWindow()) return null;
      const id = window.localStorage.getItem(SESSION_KEY);
      if (!id) return null;
      const found = readUsers().find((u) => u.id === id);
      return found ? publicUser(found) : null;
    },

    async signUp(input: SignUpInput): Promise<AuthResult> {
      const email = input.email.trim().toLowerCase();
      const users = readUsers();
      if (users.some((u) => u.email === email)) {
        return { ok: false, error: "email_taken" };
      }
      const user: StoredUser = {
        id: (hasWindow() && window.crypto?.randomUUID?.()) || `u_${Date.now()}`,
        email,
        full_name: input.full_name.trim(),
        phone: input.phone.trim(),
        created_at: new Date().toISOString(),
        password: obfuscate(input.password),
      };
      writeUsers([...users, user]);
      return { ok: true, user: publicUser(user) };
    },

    async signIn(email, password): Promise<AuthResult> {
      const target = email.trim().toLowerCase();
      const found = readUsers().find(
        (u) => u.email === target && u.password === obfuscate(password),
      );
      if (!found) return { ok: false, error: "invalid_credentials" };
      setSession(found.id);
      return { ok: true, user: publicUser(found) };
    },

    async signOut() {
      setSession(null);
    },

    async updateUser(patch): Promise<AuthResult> {
      const current = client.getUser();
      if (!current) return { ok: false, error: "not_signed_in" };
      const users = readUsers();
      const idx = users.findIndex((u) => u.id === current.id);
      if (idx < 0) return { ok: false, error: "not_signed_in" };
      const next: StoredUser = {
        ...users[idx],
        full_name: patch.full_name?.trim() ?? users[idx].full_name,
        phone: patch.phone?.trim() ?? users[idx].phone,
      };
      users[idx] = next;
      writeUsers(users);
      emit();
      return { ok: true, user: publicUser(next) };
    },

    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key === SESSION_KEY || e.key === USERS_KEY) emit();
      };
      if (hasWindow()) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (hasWindow()) window.removeEventListener("storage", onStorage);
      };
    },
  };

  return client;
}
