import { NextResponse, NextRequest } from "next/server";

const BACKEND =
  process.env.API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

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
    headers[key] = value;
  });

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    // body: only pass body for non-GET/HEAD
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    redirect: "follow",
    duplex: "half",
  };

  const res = await fetch(dest, init);

  // Build response headers to return to client
  const resHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    resHeaders[k] = v;
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: resHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
export const OPTIONS = proxy;
