"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import { fetchAdminUsersList } from "@/lib/admin";

function ChartCard({
  title,
  data,
  noDataLabel,
}: {
  title: string;
  data: { date: string; count: number }[];
  noDataLabel: string;
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
    label: new Date(d.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }));

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
      <ResponsiveContainer width="100%" height={280}>
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

function UserTable({
  users,
  page,
  pageSize,
  total,
  onPageChange,
  t,
}: {
  users: AdminUserRow[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
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
          {t("total", { count: total.toLocaleString() })}
        </span>
      </div>

      <div className="overflow-x-auto">
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
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3"
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
          <span className="text-xs" style={{ color: "var(--muted-2)" }}>
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

export default function UsersTab({ data }: { data: AdminUsers }) {
  const t = useTranslations("admin.users");
  const [usersList, setUsersList] = useState<AdminUsersList | null>(null);
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);

  const loadPage = useCallback(async (p: number) => {
    setListLoading(true);
    try {
      const result = await fetchAdminUsersList(p);
      setUsersList(result);
      setPage(p);
    } catch {
      // keep previous data on error
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

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
          {data.total_users.toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title={t("signupsPerDay")}
          data={data.signups_per_day}
          noDataLabel={t("noDataAvailable")}
        />
        <ChartCard
          title={t("dauPerDay")}
          data={data.dau_per_day}
          noDataLabel={t("noDataAvailable")}
        />
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
      ) : usersList ? (
        <div style={{ opacity: listLoading ? 0.5 : 1 }}>
          <UserTable
            users={usersList.users}
            page={page}
            pageSize={usersList.page_size}
            total={usersList.total}
            onPageChange={loadPage}
            t={t}
          />
        </div>
      ) : null}
    </div>
  );
}
