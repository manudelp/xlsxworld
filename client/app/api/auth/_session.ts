import { NextResponse } from "next/server";

import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/auth/constants";
import type { AuthProfile } from "@/lib/auth/types";

export type BackendSession = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number | null;
  user: AuthProfile;
};

const BACKEND_BASE =
  process.env.API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:8000";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ACCESS_MAX_AGE_SECONDS = 60 * 60;
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function backendUrl(path: string): string {
  return `${BACKEND_BASE.replace(/\/$/, "")}${path}`;
}

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: IS_PRODUCTION,
    path: "/",
  };
}

export function setSessionCookies(
  response: NextResponse,
  session: BackendSession,
  remember = true,
): void {
  const accessAge = session.expires_in ?? ACCESS_MAX_AGE_SECONDS;
  response.cookies.set(AUTH_ACCESS_COOKIE, session.access_token, {
    ...cookieBase(),
    ...(remember ? { maxAge: accessAge } : {}),
  });
  response.cookies.set(AUTH_REFRESH_COOKIE, session.refresh_token, {
    ...cookieBase(),
    ...(remember ? { maxAge: REFRESH_MAX_AGE_SECONDS } : {}),
  });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(AUTH_ACCESS_COOKIE, "", { ...cookieBase(), maxAge: 0 });
  response.cookies.set(AUTH_REFRESH_COOKIE, "", { ...cookieBase(), maxAge: 0 });
}

export function getSessionTokens(request: Request): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const entries = cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => chunk.split("="))
    .reduce<Record<string, string>>((accumulator, [key, ...valueParts]) => {
      accumulator[key] = valueParts.join("=");
      return accumulator;
    }, {});

  return {
    accessToken: entries[AUTH_ACCESS_COOKIE] ?? null,
    refreshToken: entries[AUTH_REFRESH_COOKIE] ?? null,
  };
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      detail?: string;
      message?: string;
    };
    return payload.detail || payload.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

export function buildSessionResponse(
  session: BackendSession,
  remember = true,
): NextResponse {
  const response = NextResponse.json({ user: session.user });
  setSessionCookies(response, session, remember);
  return response;
}

export async function backendJson(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.accessToken) {
    headers.set("Authorization", `Bearer ${init.accessToken}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(backendUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function backendJsonWithError<T>(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {},
): Promise<{ response: Response; payload: T | null; detail: string | null }> {
  const response = await backendJson(path, init);
  if (!response.ok) {
    return { response, payload: null, detail: await readErrorDetail(response) };
  }

  try {
    const payload = (await response.json()) as T;
    return { response, payload, detail: null };
  } catch {
    return { response, payload: null, detail: null };
  }
}
