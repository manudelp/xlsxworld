/**
 * Typed client for the `/api/v1/me/usage` endpoint (Phase 2 limits).
 *
 * The request goes through `api.auth.*` so the refresh-on-401 flow kicks
 * in automatically if a stale access token is used.
 */

import { api } from "@/lib/api";

export interface Usage {
  plan: "anon" | "free" | "pro";
  jobs_today: number;
  jobs_today_limit: number;
  jobs_percent: number;
  max_upload_bytes: number;
}

export function fetchUsage(): Promise<Usage> {
  return api.auth.get<Usage>("/api/v1/me/usage");
}
