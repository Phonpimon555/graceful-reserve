import { createGasAuthClient } from "./gasAuth";
import type { AuthClient } from "./types";

/** Single swap point for the auth backend (Google Apps Script). */
export const authClient: AuthClient = createGasAuthClient();

export type { AuthClient, AuthUser, AuthResult, SignUpInput } from "./types";
