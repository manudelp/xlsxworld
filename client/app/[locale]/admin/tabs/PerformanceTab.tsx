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

  const errorRateColor = (rate: number) =>
    rate > 5 ? "#ef4444" : rate > 1 ? "#eab308" : "#22c55e";

  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {filtered.map((row) => {
          const isWarning =
            row.error_rate > 5 || row.avg_response_time_ms > 2000;
          return (
            <div
              key={`${row.method}-${row.path}-card`}
              className="rounded-lg border p-3"
              style={{
                borderColor: "var(--border)",
                backgroundColor: isWarning
                  ? "rgba(239, 68, 68, 0.08)"
                  : "var(--surface)",
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="rounded px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    color: "var(--foreground)",
                  }}
                >
                  {row.method}
                </span>
                <span
                  className="truncate font-mono text-xs"
                  style={{ color: "var(--foreground)" }}
                  title={row.path}
                >
                  {row.path}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <dt style={{ color: "var(--muted-2)" }}>{t("totalRequests")}</dt>
                <dd className="text-right" style={{ color: "var(--foreground)" }}>
                  {row.total_requests.toLocaleString()}
                </dd>
                <dt style={{ color: "var(--muted-2)" }}>{t("avgResponse")}</dt>
                <dd className="text-right" style={{ color: "var(--foreground)" }}>
                  {row.avg_response_time_ms} ms
                </dd>
                <dt style={{ color: "var(--muted-2)" }}>{t("p95")}</dt>
                <dd className="text-right" style={{ color: "var(--foreground)" }}>
                  {row.p95_response_time_ms} ms
                </dd>
                <dt style={{ color: "var(--muted-2)" }}>{t("errorRate")}</dt>
                <dd
                  className="text-right"
                  style={{ color: errorRateColor(row.error_rate) }}
                >
                  {row.error_rate}%
                </dd>
                <dt style={{ color: "var(--muted-2)" }}>{t("last24h")}</dt>
                <dd className="text-right" style={{ color: "var(--foreground)" }}>
                  {row.requests_last_24h.toLocaleString()}
                </dd>
              </dl>
            </div>
          );
        })}
      </div>

      {/* Desktop/tablet table */}
      <div
        className="hidden overflow-x-auto rounded-lg border sm:block"
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
                    <span style={{ color: errorRateColor(row.error_rate) }}>
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
    </>
  );
}
