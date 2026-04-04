import { api } from "@/lib/api";

import type {
  AuthLoginInput,
  AuthProfile,
  AuthProfileUpdateInput,
  AuthSessionResponse,
  AuthSignupInput,
} from "./types";

export async function login(input: AuthLoginInput): Promise<AuthProfile> {
  const response = await api.postJson<AuthSessionResponse>("/api/auth/login", {
    email: input.email,
    password: input.password,
  });
  return response.user;
}

export async function signup(input: AuthSignupInput): Promise<AuthProfile> {
  const response = await api.postJson<AuthSessionResponse>("/api/auth/signup", {
    email: input.email,
    password: input.password,
    display_name: input.displayName?.trim() || null,
  });
  return response.user;
}

export async function refreshSession(): Promise<AuthProfile> {
  const response = await api.postJson<AuthSessionResponse>(
    "/api/auth/refresh",
    {},
  );
  return response.user;
}

export async function getCurrentUser(): Promise<AuthProfile> {
  return api.get<AuthProfile>("/api/auth/me");
}

export async function updateDisplayName(
  input: AuthProfileUpdateInput,
): Promise<AuthProfile> {
  return api.auth.patchJson<AuthProfile>("/api/auth/me", {
    display_name: input.displayName?.trim() || null,
  });
}

export async function logout(): Promise<void> {
  await api.postJson<{ detail: string }>("/api/auth/logout", {});
}
