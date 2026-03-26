export interface ApiError { detail: string }

// For production on Vercel the client calls the Next.js server-side proxy at `/api`.
// For local development you can set `NEXT_PUBLIC_API_BASE` to your local backend.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api/';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try { const data = await res.json(); if (data?.detail) detail = data.detail; } catch {}
    throw new Error(detail);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  // @ts-expect-error - caller must know non-json
  return res.arrayBuffer();
}

export const api = {
  async postForm<T>(path: string, form: FormData, qs?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(path, API_BASE);
    if (qs) Object.entries(qs).forEach(([k,v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, String(v)); });
    const res = await fetch(url.toString(), { method: 'POST', body: form });
    return handle<T>(res);
  },
  async get<T>(path: string, qs?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(path, API_BASE);
    if (qs) Object.entries(qs).forEach(([k,v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, String(v)); });
    const res = await fetch(url.toString());
    return handle<T>(res);
  }
};
