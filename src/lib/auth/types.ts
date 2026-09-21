/**
 * Authentication contract — UI depends only on this.
 * Swap `authClient` in ./index.ts for a real backend implementation later.
 */

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
};

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: "email_taken" | "invalid_credentials" | "not_signed_in" | "unknown" };

export type SignUpInput = {
  full_name: string;
  phone: string;
  email: string;
  password: string;
};

export interface AuthClient {
  /** Current signed-in user, restored from persisted session. */
  getUser(): AuthUser | null;
  signUp(input: SignUpInput): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  updateUser(patch: { full_name?: string; phone?: string }): Promise<AuthResult>;
  /** Subscribe to session changes; returns an unsubscribe function. */
  subscribe(listener: (user: AuthUser | null) => void): () => void;
}
