import { NextResponse, NextRequest } from "next/server";

import { AUTH_ACCESS_COOKIE } from "@/lib/auth/constants";

const BACKEND =
  process.env.API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:8000";

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolved = await params;
  const path = (resolved?.path || []).join("/");
  const url = new URL(req.url);
  const query = url.search; // includes leading '?', or ''
  const dest = `${BACKEND?.replace(/\/$/, "")}/${path}${query}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() === "host") return;
    if (key.toLowerCase() === "accept-encoding") return;
    headers[key] = value;
  });

  // Force identity to avoid upstream compression that can be transparently
  // decoded by fetch while still carrying a Content-Encoding header.
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
    // body: only pass body for non-GET/HEAD
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

  // Build response headers to return to client
  // Use NextResponse's Headers to properly handle header values
  const resHeaders = new Headers();
  res.headers.forEach((value, key) => {
    // Skip headers that should not be forwarded from backend to client
    // or that will cause issues with response proxying
    const lowerKey = key.toLowerCase();

    // Skip proxy and server-specific headers
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

    // For non-binary payloads, avoid forwarding encoding/length metadata
    // that may no longer match if runtime decoding/rechunking happened.
    if (
      !isBinaryResponse &&
      ["content-encoding", "content-length"].includes(lowerKey)
    ) {
      return;
    }

    // Forward all other headers (including Content-Encoding, Content-Type, Content-Disposition, etc.)
    resHeaders.set(key, value);
  });

  // Create response with proper streaming support for binary data
  // Pass res.body directly to stream the response without buffering
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
