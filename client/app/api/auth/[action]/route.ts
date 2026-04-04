import { NextRequest, NextResponse } from "next/server";

import type { AuthProfileUpdateInput } from "@/lib/auth/types";

import {
  backendJson,
  backendJsonWithError,
  buildSessionResponse,
  clearSessionCookies,
  getSessionTokens,
  setSessionCookies,
  type BackendSession,
} from "../_session";

type RouteContext = {
  params: Promise<{ action: string }>;
};

function jsonError(status: number, detail: string) {
  return NextResponse.json({ detail }, { status });
}

async function handleSessionLogin(request: NextRequest, backendPath: string) {
  const body = await request.json().catch(() => null);
  const { response, payload, detail } =
    await backendJsonWithError<BackendSession>(backendPath, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    });

  if (!response.ok || !payload) {
    return jsonError(response.status, detail || "Authentication failed");
  }

  return buildSessionResponse(payload);
}

async function handleRefresh(request: NextRequest) {
  const { refreshToken } = getSessionTokens(request);
  if (!refreshToken) {
    const response = jsonError(401, "Missing refresh token");
    clearSessionCookies(response);
    return response;
  }

  const { response, payload, detail } =
    await backendJsonWithError<BackendSession>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

  if (!response.ok || !payload) {
    const failure = jsonError(
      response.status,
      detail || "Unable to refresh the session",
    );
    clearSessionCookies(failure);
    return failure;
  }

  return buildSessionResponse(payload);
}

async function handleMe(request: NextRequest, method: "GET" | "PATCH") {
  const { accessToken, refreshToken } = getSessionTokens(request);
  const body =
    method === "PATCH"
      ? ((await request
          .json()
          .catch(() => null)) as AuthProfileUpdateInput | null)
      : null;

  async function callBackend(token: string | null) {
    return backendJson("/auth/me", {
      method,
      accessToken: token,
      body:
        method === "PATCH"
          ? JSON.stringify({ display_name: body?.displayName?.trim() || null })
          : undefined,
    });
  }

  let response = await callBackend(accessToken);
  if (response.status === 401 && refreshToken) {
    const refreshResponse = await backendJsonWithError<BackendSession>(
      "/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    );

    if (!refreshResponse.response.ok || !refreshResponse.payload) {
      const failure = jsonError(
        401,
        refreshResponse.detail || "Unable to restore the session",
      );
      clearSessionCookies(failure);
      return failure;
    }

    buildSessionResponse(refreshResponse.payload);
    response = await callBackend(refreshResponse.payload.access_token);
    if (response.status === 401) {
      const failure = jsonError(401, "Session expired");
      clearSessionCookies(failure);
      return failure;
    }
    if (!response.ok) {
      const failure = jsonError(response.status, await response.text());
      clearSessionCookies(failure);
      return failure;
    }
    const profile = await response.json();
    const profileResponse = NextResponse.json(profile);
    setSessionCookies(profileResponse, refreshResponse.payload);
    return profileResponse;
  }

  if (!response.ok) {
    const failure = jsonError(response.status, await response.text());
    if (response.status === 401) {
      clearSessionCookies(failure);
    }
    return failure;
  }

  const profile = await response.json();
  return NextResponse.json(profile);
}

async function handleLogout(request: NextRequest) {
  const { accessToken } = getSessionTokens(request);
  if (accessToken) {
    await backendJson("/auth/logout", {
      method: "POST",
      accessToken,
    }).catch(() => null);
  }

  const response = NextResponse.json({ detail: "Signed out" });
  clearSessionCookies(response);
  return response;
}

async function route(request: NextRequest, context: RouteContext) {
  const { action } = await context.params;

  switch (action) {
    case "login":
      if (request.method !== "POST") {
        return jsonError(405, "Method not allowed");
      }
      return handleSessionLogin(request, "/auth/login");
    case "signup":
      if (request.method !== "POST") {
        return jsonError(405, "Method not allowed");
      }
      return handleSessionLogin(request, "/auth/signup");
    case "refresh":
      if (request.method !== "POST") {
        return jsonError(405, "Method not allowed");
      }
      return handleRefresh(request);
    case "logout":
      if (request.method !== "POST") {
        return jsonError(405, "Method not allowed");
      }
      return handleLogout(request);
    case "me":
      if (request.method === "GET" || request.method === "PATCH") {
        return handleMe(request, request.method);
      }
      return jsonError(405, "Method not allowed");
    default:
      return jsonError(404, "Not found");
  }
}

export const GET = route;
export const POST = route;
export const PATCH = route;
