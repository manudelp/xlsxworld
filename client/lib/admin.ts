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
  duration_ms: string | null;
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

export function fetchAdminKpiTrends() {
  return api.auth.get<KpiTrends>("/api/v1/admin/overview/kpi-trends");
}

export function fetchAdminTools() {
  return api.auth.get<AdminToolStat[]>("/api/v1/admin/tools");
}

export function fetchAdminUsers() {
  return api.auth.get<AdminUsers>("/api/v1/admin/users");
}

export function fetchAdminUsersList(page = 1, pageSize = 20) {
  return api.auth.get<AdminUsersList>("/api/v1/admin/users/list", {
    page,
    page_size: pageSize,
  });
}

export function fetchAdminActivity() {
  return api.auth.get<AdminActivityItem[]>("/api/v1/admin/activity");
}

export function fetchAdminPerformance() {
  return api.auth.get<AdminPerformanceStat[]>("/api/v1/admin/performance");
}
