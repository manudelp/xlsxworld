export interface ApiError { detail: string }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api/';

export function buildUrl(path: string, qs?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, API_BASE);
  if (qs) Object.entries(qs).forEach(([k,v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, String(v)); });
  return url.toString();
}

export function buildUrlWithArrayParams(path: string, params: Record<string, string | string[]>): string {
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      v.forEach((item) => url.searchParams.append(k, item));
    } else {
      url.searchParams.set(k, v);
    }
  });
  return url.toString();
}

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
    const res = await fetch(buildUrl(path, qs), { method: 'POST', body: form });
    return handle<T>(res);
  },
  async get<T>(path: string, qs?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const res = await fetch(buildUrl(path, qs));
    return handle<T>(res);
  }
};
