"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { AdminPerformanceStat } from "@/lib/admin";

const HEALTH_PATHS = ["/health", "/api/health"];

export default function PerformanceTab({
  data,
}: {
  data: AdminPerformanceStat[];
}) {
  const t = useTranslations("admin.performance");
  const filtered = useMemo(
    () => data.filter((r) => !HEALTH_PATHS.includes(r.path)),
    [data],
  );

  if (filtered.length === 0) {
    return (
      <div
        className="rounded-lg border p-8 text-center"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
          color: "var(--muted-2)",
        }}
      >
        {t("noData")}
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border"
      style={{ borderColor: "var(--border)" }}
    >
      <table className="w-full text-sm" style={{ backgroundColor: "var(--surface-2)" }}>
        <thead>
          <tr style={{ backgroundColor: "var(--surface)" }}>
            {[
              t("method"),
              t("path"),
              t("totalRequests"),
              t("avgResponse"),
              t("p95"),
              t("errorRate"),
              t("last24h"),
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
          {filtered.map((row) => {
            const isWarning =
              row.error_rate > 5 || row.avg_response_time_ms > 2000;
            return (
              <tr
                key={`${row.method}-${row.path}`}
                style={{
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: isWarning
                    ? "rgba(239, 68, 68, 0.08)"
                    : undefined,
                }}
              >
                <td className="px-4 py-3">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: "var(--surface-2)",
                      color: "var(--foreground)",
                    }}
                  >
                    {row.method}
                  </span>
                </td>
                <td
                  className="px-4 py-3 font-mono text-xs"
                  style={{ color: "var(--foreground)" }}
                >
                  {row.path}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                  {row.total_requests.toLocaleString()}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                  {row.avg_response_time_ms} ms
                </td>
                <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                  {row.p95_response_time_ms} ms
                </td>
                <td className="px-4 py-3">
                  <span
                    style={{
                      color:
                        row.error_rate > 5
                          ? "#ef4444"
                          : row.error_rate > 1
                            ? "#eab308"
                            : "#22c55e",
                    }}
                  >
                    {row.error_rate}%
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                  {row.requests_last_24h.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
