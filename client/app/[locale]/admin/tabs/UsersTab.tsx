"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import type { AdminUsers, AdminUsersList, AdminUserRow } from "@/lib/admin";
import { fetchAdminUsersList, resetQuota } from "@/lib/admin";

function ChartCard({
  title,
  data,
  noDataLabel,
  locale,
}: {
  title: string;
  data: { date: string; count: number }[];
  noDataLabel: string;
  locale: string;
}) {
  if (data.length === 0) {
    return (
      <div
        className="rounded-lg border p-6"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <h3
          className="mb-4 text-sm font-medium"
          style={{ color: "var(--muted-2)" }}
        >
          {title}
        </h3>
        <p
          className="py-8 text-center text-sm"
          style={{ color: "var(--muted-2)" }}
        >
          {noDataLabel}
        </p>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div
      className="rounded-lg border p-4 sm:p-6"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
      }}
    >
      <h3
        className="mb-4 text-sm font-medium"
        style={{ color: "var(--muted-2)" }}
      >
        {title}
      </h3>
      <div className="h-[220px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-2)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-2)" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

function timeAgo(iso: string | null, t: (key: string, values?: Record<string, string | number>) => string): string {
  if (!iso) return t("never");
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return t("minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t("daysAgo", { count: days });
}

const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
  admin: { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
  member: { bg: "rgba(156,163,175,0.15)", text: "#9ca3af" },
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
  suspended: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
  pending: { bg: "rgba(234,179,8,0.15)", text: "#eab308" },
  deleted: { bg: "rgba(156,163,175,0.15)", text: "#9ca3af" },
};

function Badge({
  label,
  style,
}: {
  label: string;
  style: { bg: string; text: string };
}) {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {label}
    </span>
  );
}

function ResetQuotaButton({
  user,
  t,
}: {
  user: AdminUserRow;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const [busy, setBusy] = useState(false);

  const handleReset = async () => {
    setBusy(true);
    try {
      const result = await resetQuota(`user:${user.id}`);
      toast.success(t("quotaResetSuccess", { email: user.email, count: result.previous_count }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || t("quotaResetFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleReset}
      className="cursor-pointer rounded-md border px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderColor: "var(--tag-border)",
        backgroundColor: "var(--tag-bg)",
        color: "var(--tag-text)",
      }}
    >
      {busy ? t("resettingQuota") : t("resetQuota")}
    </button>
  );
}

function UserTable({
  users,
  page,
  pageSize,
  total,
  onPageChange,
  t,
  formatNumber,
  formatJoinedDate,
}: {
  users: AdminUserRow[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  formatNumber: (n: number) => string;
  formatJoinedDate: (iso: string | null) => string;
}) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div
      className="rounded-lg border"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          {t("registeredUsers")}
        </h3>
        <span className="text-xs" style={{ color: "var(--muted-2)" }}>
          {t("total", { count: formatNumber(total) })}
        </span>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden">
        {users.map((u) => (
          <div
            key={`${u.id}-card`}
            className="px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p
                className="truncate text-sm font-medium"
                style={{ color: "var(--foreground)" }}
                title={u.email}
              >
                {u.email}
              </p>
              <div className="flex shrink-0 gap-1">
                <Badge
                  label={u.role}
                  style={ROLE_STYLE[u.role] ?? ROLE_STYLE.member}
                />
                <Badge
                  label={u.status}
                  style={STATUS_STYLE[u.status] ?? STATUS_STYLE.active}
                />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {u.display_name && (
                <>
                  <dt style={{ color: "var(--muted-2)" }}>{t("displayName")}</dt>
                  <dd className="truncate text-right" style={{ color: "var(--foreground)" }}>
                    {u.display_name}
                  </dd>
                </>
              )}
              <dt style={{ color: "var(--muted-2)" }}>{t("joined")}</dt>
              <dd className="text-right" style={{ color: "var(--muted-2)" }}>
                {formatJoinedDate(u.created_at)}
              </dd>
              <dt style={{ color: "var(--muted-2)" }}>{t("lastSeen")}</dt>
              <dd className="text-right" style={{ color: "var(--muted-2)" }}>
                {timeAgo(u.last_seen_at, t)}
              </dd>
              <dt style={{ color: "var(--muted-2)" }}>{t("toolUses")}</dt>
              <dd className="text-right" style={{ color: "var(--foreground)" }}>
                {u.total_tool_uses > 0 ? u.total_tool_uses : "—"}
              </dd>
            </dl>
            <div className="mt-2">
              <ResetQuotaButton user={u} t={t} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop/tablet table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm" style={{ backgroundColor: "var(--surface-2)" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--surface)" }}>
              {[
                t("email"),
                t("displayName"),
                t("role"),
                t("status"),
                t("joined"),
                t("lastSeen"),
                t("toolUses"),
                t("actions"),
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-medium"
                  style={{
                    color: "var(--muted-2)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--foreground)" }}
                >
                  {u.email}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--muted-2)" }}>
                  {u.display_name || "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={u.role}
                    style={ROLE_STYLE[u.role] ?? ROLE_STYLE.member}
                  />
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={u.status}
                    style={STATUS_STYLE[u.status] ?? STATUS_STYLE.active}
                  />
                </td>
                <td className="px-4 py-3" style={{ color: "var(--muted-2)" }}>
                  {formatJoinedDate(u.created_at)}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--muted-2)" }}>
                  {timeAgo(u.last_seen_at, t)}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--foreground)" }}
                >
                  {u.total_tool_uses > 0 ? u.total_tool_uses : "—"}
                </td>
                <td className="px-4 py-3">
                  <ResetQuotaButton user={u} t={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4"
          style={{
            borderTop: "1px solid var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            style={{
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            {t("previous")}
          </button>
          <span
            className="flex-1 truncate text-center text-xs"
            style={{ color: "var(--muted-2)" }}
          >
            {t("pageOf", { page, total: totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            style={{
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            {t("next")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function UsersTab({
  data,
  refreshToken = 0,
  onListLoaded,
}: {
  data: AdminUsers;
  refreshToken?: number;
  onListLoaded?: () => void;
}) {
  const t = useTranslations("admin.users");
  const format = useFormatter();
  const locale = useLocale();
  const formatNumber = useMemo(() => (n: number) => format.number(n), [format]);
  const formatJoinedDate = useMemo(
    () => (iso: string | null) => {
      if (!iso) return "—";
      return format.dateTime(new Date(iso), {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
    [format],
  );

  const [usersList, setUsersList] = useState<AdminUsersList | null>(null);
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const onListLoadedRef = useRef(onListLoaded);
  onListLoadedRef.current = onListLoaded;

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const loadPage = useCallback(
    async (p: number) => {
      setListLoading(true);
      try {
        const result = await fetchAdminUsersList(p, 20, {
          search: debouncedSearch || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
        });
        setUsersList(result);
        setPage(p);
        onListLoadedRef.current?.();
      } catch {
        // keep previous data on error
      } finally {
        setListLoading(false);
      }
    },
    [debouncedSearch, roleFilter, statusFilter],
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage, refreshToken]);

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg border p-5"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--muted-2)" }}
        >
          {t("totalUsers")}
        </p>
        <p
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          {formatNumber(data.total_users)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title={t("signupsPerDay")}
          data={data.signups_per_day}
          noDataLabel={t("noDataAvailable")}
          locale={locale}
        />
        <ChartCard
          title={t("dauPerDay")}
          data={data.dau_per_day}
          noDataLabel={t("noDataAvailable")}
          locale={locale}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
            minWidth: 0,
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label={t("role")}
          className="rounded-md border px-3 py-2 text-sm sm:w-40"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <option value="">{t("allRoles")}</option>
          <option value="admin">admin</option>
          <option value="member">member</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label={t("status")}
          className="rounded-md border px-3 py-2 text-sm sm:w-40"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <option value="">{t("allStatuses")}</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
          <option value="pending">pending</option>
          <option value="deleted">deleted</option>
        </select>
      </div>

      {listLoading && !usersList ? (
        <div
          className="animate-pulse rounded-lg border p-8"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div
            className="mx-auto h-4 w-32 rounded"
            style={{ backgroundColor: "var(--border)" }}
          />
        </div>
      ) : usersList && usersList.users.length === 0 ? (
        <div
          className="rounded-lg border p-8 text-center text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--muted-2)",
          }}
        >
          {debouncedSearch || roleFilter || statusFilter
            ? t("noResults")
            : t("noDataAvailable")}
        </div>
      ) : usersList ? (
        <div style={{ opacity: listLoading ? 0.5 : 1 }}>
          <UserTable
            users={usersList.users}
            page={page}
            pageSize={usersList.page_size}
            total={usersList.total}
            onPageChange={loadPage}
            t={t}
            formatNumber={formatNumber}
            formatJoinedDate={formatJoinedDate}
          />
        </div>
      ) : null}
    </div>
  );
}
