import { NextRequest, NextResponse } from "next/server";

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
  const remember = body?.remember !== false;
  const { response, payload, detail } =
    await backendJsonWithError<BackendSession>(backendPath, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    });

  if (!response.ok || !payload) {
    return jsonError(response.status, detail || "Authentication failed");
  }

  return buildSessionResponse(payload, remember);
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
  const rawBody =
    method === "PATCH" ? await request.text().catch(() => null) : null;

  async function callBackend(token: string | null) {
    return backendJson("/auth/me", {
      method,
      accessToken: token,
      body: method === "PATCH" && rawBody ? rawBody : undefined,
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
    case "forgot-password":
      if (request.method !== "POST") {
        return jsonError(405, "Method not allowed");
      }
      return handleForgotPassword(request);
    case "reset-password":
      if (request.method !== "POST") {
        return jsonError(405, "Method not allowed");
      }
      return handleResetPassword(request);
    case "verify-recovery":
      if (request.method !== "POST") {
        return jsonError(405, "Method not allowed");
      }
      return handleVerifyRecovery(request);
    case "google":
      return handleGoogleRedirect(request);
    case "google-callback":
      return handleGoogleCallback(request);
    default:
      return jsonError(404, "Not found");
  }
}

export const GET = route;
export const POST = route;
export const PATCH = route;

function isSafeRedirect(path: string): boolean {
  if (!path || !path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  try {
    const url = new URL(path, "http://localhost");
    return url.pathname === path || url.pathname + url.search === path;
  } catch {
    return false;
  }
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const GOOGLE_REDIRECT_URI =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") +
  "/api/auth/google-callback";

function handleGoogleRedirect(request: NextRequest) {
  const rawNext = request.nextUrl.searchParams.get("next") || "/";
  const next = isSafeRedirect(rawNext) ? rawNext : "/";
  const state = encodeURIComponent(next);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });
  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  );
}

async function handleGoogleCallback(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const rawNext = state ? decodeURIComponent(state) : "/";
  const next = isSafeRedirect(rawNext) ? rawNext : "/";
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=google_denied`);
  }

  // Validate the authorization code format before sending to Google
  if (!/^[a-zA-Z0-9/_-]+$/.test(code) || code.length > 512) {
    return NextResponse.redirect(`${origin}/login?error=google_failed`);
  }

  // Exchange code for Google tokens — URL is hardcoded to Google's endpoint
  const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token" as const;
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/login?error=google_failed`);
  }

  const tokens = (await tokenRes.json()) as {
    id_token?: string;
    access_token?: string;
  };

  // Send the Google token to our backend for login/signup
  const { response, payload } = await backendJsonWithError<BackendSession>(
    "/auth/google",
    {
      method: "POST",
      body: JSON.stringify({
        id_token: tokens.id_token,
        access_token: tokens.access_token,
      }),
    },
  );

  if (!response.ok || !payload) {
    return NextResponse.redirect(`${origin}/login?error=google_failed`);
  }

  const sessionResponse = NextResponse.redirect(`${origin}${next}`);
  setSessionCookies(sessionResponse, payload);
  return sessionResponse;
}

async function handleForgotPassword(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { response, detail } = await backendJsonWithError<{ detail: string }>(
    "/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    },
  );

  if (!response.ok) {
    return jsonError(response.status, detail || "Unable to process request");
  }

  return NextResponse.json({ detail: "ok" });
}

async function handleResetPassword(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { response, detail } = await backendJsonWithError<{ detail: string }>(
    "/auth/reset-password",
    {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    },
  );

  if (!response.ok) {
    return jsonError(response.status, detail || "Unable to reset password");
  }

  return NextResponse.json({ detail: "ok" });
}

async function handleVerifyRecovery(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { response, payload, detail } = await backendJsonWithError<{
    access_token: string;
  }>("/auth/verify-recovery", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });

  if (!response.ok || !payload) {
    return jsonError(
      response.status,
      detail || "Invalid or expired recovery link",
    );
  }

  return NextResponse.json({ access_token: payload.access_token });
}
