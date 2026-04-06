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
    remember: input.remember ?? true,
  });
  return response.user;
}

export async function signup(input: AuthSignupInput): Promise<AuthProfile> {
  const response = await api.postJson<AuthSessionResponse>("/api/auth/signup", {
    email: input.email,
    password: input.password,
    display_name: input.displayName?.trim() || null,
    remember: input.remember ?? true,
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

export async function forgotPassword(email: string): Promise<void> {
  await api.postJson<{ detail: string }>("/api/auth/forgot-password", {
    email,
  });
}

export async function resetPassword(
  accessToken: string,
  newPassword: string,
): Promise<void> {
  await api.postJson<{ detail: string }>("/api/auth/reset-password", {
    access_token: accessToken,
    new_password: newPassword,
  });
}

export async function logout(): Promise<void> {
  await api.postJson<{ detail: string }>("/api/auth/logout", {});
}
