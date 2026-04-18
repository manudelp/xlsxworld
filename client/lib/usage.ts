/**
 * Typed client for `GET /api/v1/usage` (read-only limits + today's count).
 *
 * Works for anonymous visitors (IP-keyed quota) and signed-in users
 * (account-keyed). Uses `api.get` so unauthenticated sessions do not
 * trigger auth refresh / redirect.
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
  return api.get<Usage>("/api/v1/usage");
}
