import { createMockAuthClient } from "./mockAuth";
import type { AuthClient } from "./types";

/** Single swap point: replace with a real API-backed client later. */
export const authClient: AuthClient = createMockAuthClient();

export type { AuthClient, AuthUser, AuthResult, SignUpInput } from "./types";
