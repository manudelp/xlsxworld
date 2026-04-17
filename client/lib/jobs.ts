/**
 * Typed client for the `/api/v1/me/jobs` endpoints (Phase 1 history).
 *
 * All requests go through `api.auth.*` so the existing refresh-on-401
 * flow kicks in automatically if a stale access token is used.
 */

import { api } from "@/lib/api";

export interface JobItem {
  id: string;
  tool_slug: string;
  tool_name: string;
  original_filename: string | null;
  output_filename: string;
  mime_type: string;
  output_size_bytes: number;
  success: boolean;
  error_type: string | null;
  duration_ms: number | null;
  expires_at: string;
  created_at: string;
  expired: boolean;
}

export interface JobsListResponse {
  items: JobItem[];
}

export interface JobDownloadResponse {
  url: string;
  expires_in_seconds: number;
}

export interface JobsFilters {
  limit?: number;
  offset?: number;
  search?: string;
  success?: boolean;
}

type QueryParams = Record<string, string | number | boolean | undefined>;

function buildQuery(filters: JobsFilters): QueryParams {
  const qs: QueryParams = {};
  if (filters.limit != null) qs.limit = filters.limit;
  if (filters.offset != null) qs.offset = filters.offset;
  if (filters.search != null) {
    const trimmed = filters.search.trim();
    if (trimmed.length > 0) qs.search = trimmed;
  }
  if (filters.success != null) qs.success = filters.success;
  return qs;
}

export function fetchJobs(
  filters: JobsFilters = {},
): Promise<JobsListResponse> {
  return api.auth.get<JobsListResponse>("/api/v1/me/jobs", buildQuery(filters));
}

export function getJobDownloadUrl(
  jobId: string,
): Promise<JobDownloadResponse> {
  return api.auth.get<JobDownloadResponse>(
    `/api/v1/me/jobs/${encodeURIComponent(jobId)}/download`,
  );
}

export function deleteJob(jobId: string): Promise<void> {
  return api.auth.delete<void>(
    `/api/v1/me/jobs/${encodeURIComponent(jobId)}`,
  );
}
