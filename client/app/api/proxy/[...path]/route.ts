import { NextResponse, NextRequest } from "next/server";

import { AUTH_ACCESS_COOKIE } from "@/lib/auth/constants";

const BACKEND =
  process.env.API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:8000";

const ALLOWED_PREFIXES = [
  "api/v1/tools/",
  "api/v1/contact",
  "api/v1/launch-updates",
  "api/v1/analytics",
  "api/v1/admin/",
  "api/v1/usage",
  "api/v1/me/",
  "auth/",
  "health",
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolved = await params;
  const path = (resolved?.path || []).join("/");

  if (!isAllowedPath(path)) {
    return NextResponse.json(
      { detail: "Not found", error_code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const url = new URL(req.url);
  const query = url.search;
  const dest = `${BACKEND?.replace(/\/$/, "")}/${path}${query}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() === "host") return;
    if (key.toLowerCase() === "accept-encoding") return;
    headers[key] = value;
  });

  headers["accept-encoding"] = "identity";

  if (!headers.authorization) {
    const accessToken = req.cookies.get(AUTH_ACCESS_COOKIE)?.value;
    if (accessToken) {
      headers.authorization = `Bearer ${accessToken}`;
    }
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    redirect: "follow",
    duplex: "half",
  };

  const res = await fetch(dest, init);

  const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
  const isBinaryResponse =
    contentType.includes(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ) ||
    contentType.startsWith("text/csv") ||
    contentType.startsWith("application/zip") ||
    contentType.startsWith("application/octet-stream");

  const resHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    if (
      [
        "connection",
        "keep-alive",
        "transfer-encoding",
        "upgrade",
        "te",
      ].includes(lowerKey)
    ) {
      return;
    }

    if (
      !isBinaryResponse &&
      ["content-encoding", "content-length"].includes(lowerKey)
    ) {
      return;
    }

    resHeaders.set(key, value);
  });

  const response = new NextResponse(res.body, {
    status: res.status,
    headers: resHeaders,
  });

  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
export const OPTIONS = proxy;
