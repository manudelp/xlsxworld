import { api } from "@/lib/api";

export interface AdminOverview {
  total_users: number;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
  total_tool_uses: number;
  tool_uses_today: number;
  tool_uses_this_week: number;
  tool_uses_this_month: number;
  overall_success_rate: number;
  avg_response_time_ms: number;
  total_errors: number;
  errors_today: number;
  total_file_uploads: number;
  file_uploads_today: number;
  file_uploads_this_week: number;
}

export interface AdminToolStat {
  tool_slug: string;
  tool_name: string;
  total_uses: number;
  success_rate: number;
  avg_duration_ms: number;
  last_used_at: string | null;
}

export interface DayCount {
  date: string;
  count: number;
}

export interface KpiTrendDay {
  date: string;
  new_users: number;
  tool_uses: number;
  success_rate: number | null;
  avg_duration_ms: number | null;
  error_count: number;
  file_uploads: number;
}

export interface KpiTrends {
  series: KpiTrendDay[];
}

export interface AdminUsers {
  total_users: number;
  signups_per_day: DayCount[];
  dau_per_day: DayCount[];
}

export interface AdminPerformanceStat {
  path: string;
  method: string;
  total_requests: number;
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  error_rate: number;
  requests_last_24h: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  status: string;
  created_at: string | null;
  last_seen_at: string | null;
  total_tool_uses: number;
}

export interface AdminUsersList {
  total: number;
  page: number;
  page_size: number;
  users: AdminUserRow[];
}

export interface AdminActivityItem {
  occurred_at: string | null;
  user_id: string | null;
  tool_slug: string | null;
  tool_name: string | null;
  duration_ms: number | null;
  success: boolean;
  error_type: string | null;
  user_email: string | null;
}

export function fetchAdminOverview() {
  return api.auth.get<AdminOverview>("/api/v1/admin/overview");
}

export function fetchAdminOverviewTrend() {
  return api.auth.get<DayCount[]>("/api/v1/admin/overview/trend");
}

export function fetchAdminKpiTrends(days = 30) {
  return api.auth.get<KpiTrends>("/api/v1/admin/overview/kpi-trends", {
    days,
  });
}

export function fetchAdminTools() {
  return api.auth.get<AdminToolStat[]>("/api/v1/admin/tools");
}

export function fetchAdminUsers() {
  return api.auth.get<AdminUsers>("/api/v1/admin/users");
}

export interface UsersListFilters {
  search?: string;
  role?: string;
  status?: string;
}

export function fetchAdminUsersList(
  page = 1,
  pageSize = 20,
  filters: UsersListFilters = {},
) {
  const qs: Record<string, string | number | boolean | undefined> = {
    page,
    page_size: pageSize,
  };
  if (filters.search) qs.search = filters.search;
  if (filters.role) qs.role = filters.role;
  if (filters.status) qs.status = filters.status;
  return api.auth.get<AdminUsersList>("/api/v1/admin/users/list", qs);
}

export interface ActivityFilters {
  limit?: number;
  offset?: number;
  success?: boolean;
  tool_slug?: string;
}

export function fetchAdminActivity(filters: ActivityFilters = {}) {
  const qs: Record<string, string | number | boolean | undefined> = {};
  if (filters.limit != null) qs.limit = filters.limit;
  if (filters.offset != null) qs.offset = filters.offset;
  if (filters.success != null) qs.success = filters.success;
  if (filters.tool_slug) qs.tool_slug = filters.tool_slug;
  return api.auth.get<AdminActivityItem[]>("/api/v1/admin/activity", qs);
}

export function fetchAdminPerformance() {
  return api.auth.get<AdminPerformanceStat[]>("/api/v1/admin/performance");
}

export interface QuotaResetResult {
  key: string;
  day: string;
  previous_count: number;
  new_count: number;
}

export function resetQuota(key?: string) {
  const qs: Record<string, string> = {};
  if (key) qs.key = key;
  return api.auth.postJson<QuotaResetResult>("/api/v1/admin/quota/reset", {}, qs);
}
