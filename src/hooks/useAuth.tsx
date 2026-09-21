import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { authClient } from "@/lib/auth";
import type { AuthResult, AuthUser, SignUpInput } from "@/lib/auth";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

type AuthCtx = {
  /** Customer account (mock auth layer). */
  user: AuthUser | null;
  profile: Profile | null;
  /** Admin session (staff back office) — separate from the customer account. */
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  updateProfile: (patch: { full_name?: string; phone?: string }) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Customer session (mock, persisted locally)
  useEffect(() => {
    setUser(authClient.getUser());
    setLoading(false);
    return authClient.subscribe(setUser);
  }, []);

  // Admin session (back office stays on the real auth service)
  useEffect(() => {
    let active = true;
    const check = async (userId: string | undefined) => {
      if (!userId) { if (active) setIsAdmin(false); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (active) setIsAdmin(data === true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { void check(s?.user?.id); });
    void supabase.auth.getSession().then(({ data }) => { void check(data.session?.user?.id); });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const profile = useMemo<Profile | null>(
    () => (user ? { id: user.id, full_name: user.full_name, phone: user.phone, email: user.email } : null),
    [user],
  );

  const signIn = useCallback((email: string, password: string) => authClient.signIn(email, password), []);
  const signUp = useCallback((input: SignUpInput) => authClient.signUp(input), []);
  const updateProfile = useCallback(
    (patch: { full_name?: string; phone?: string }) => authClient.updateUser(patch),
    [],
  );
  const refreshProfile = useCallback(async () => { setUser(authClient.getUser()); }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider
      value={{ user, profile, isAdmin, loading, signIn, signUp, updateProfile, refreshProfile, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
