"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import type { AdminPerformanceStat } from "@/lib/admin";

const HEALTH_PATHS = ["/health", "/api/health"];

type PerfSortKey =
  | "path"
  | "total_requests"
  | "avg_response_time_ms"
  | "p95_response_time_ms"
  | "error_rate"
  | "requests_last_24h";

export default function PerformanceTab({
  data,
}: {
  data: AdminPerformanceStat[];
}) {
  const t = useTranslations("admin.performance");
  const format = useFormatter();
  const formatNumber = (n: number) => format.number(n);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<PerfSortKey>("total_requests");
  const [sortAsc, setSortAsc] = useState(false);

  const baseData = useMemo(
    () => data.filter((r) => !HEALTH_PATHS.includes(r.path)),
    [data],
  );

  const methodOptions = useMemo(() => {
    const set = new Set<string>();
    baseData.forEach((r) => set.add(r.method));
    return Array.from(set).sort();
  }, [baseData]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let rows = baseData;
    if (needle) {
      rows = rows.filter((r) => r.path.toLowerCase().includes(needle));
    }
    if (methodFilter) {
      rows = rows.filter((r) => r.method === methodFilter);
    }
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av ?? "").localeCompare(String(bv ?? ""))
        : String(bv ?? "").localeCompare(String(av ?? ""));
    });
    return copy;
  }, [baseData, search, methodFilter, sortKey, sortAsc]);

  function handleSort(key: PerfSortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }
  const arrow = (key: PerfSortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  if (baseData.length === 0) {
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
    <div className="space-y-3">
      {/* Filter controls */}
      <div className="flex flex-col gap-2 sm:flex-row">
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
          }}
        />
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          aria-label={t("method")}
          className="rounded-md border px-3 py-2 text-sm sm:w-40"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <option value="">{t("allMethods")}</option>
          {methodOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-lg border p-8 text-center text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--muted-2)",
          }}
        >
          {t("noResults")}
        </div>
      ) : (
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
                  {formatNumber(row.total_requests)}
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
                  {formatNumber(row.requests_last_24h)}
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
              {(
                [
                  { key: null, label: t("method") },
                  { key: "path" as PerfSortKey, label: t("path") },
                  { key: "total_requests" as PerfSortKey, label: t("totalRequests") },
                  { key: "avg_response_time_ms" as PerfSortKey, label: t("avgResponse") },
                  { key: "p95_response_time_ms" as PerfSortKey, label: t("p95") },
                  { key: "error_rate" as PerfSortKey, label: t("errorRate") },
                  { key: "requests_last_24h" as PerfSortKey, label: t("last24h") },
                ] as Array<{ key: PerfSortKey | null; label: string }>
              ).map((col) => (
                <th
                  key={col.label}
                  className="px-4 py-3 text-left font-medium"
                  style={{
                    color: "var(--muted-2)",
                    borderBottom: "1px solid var(--border)",
                  }}
                  aria-sort={
                    col.key && sortKey === col.key
                      ? sortAsc
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {col.key ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key as PerfSortKey)}
                      className="font-medium hover:underline"
                      style={{ color: "var(--muted-2)" }}
                    >
                      {col.label}
                      {arrow(col.key)}
                    </button>
                  ) : (
                    col.label
                  )}
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
                    {formatNumber(row.total_requests)}
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
                    {formatNumber(row.requests_last_24h)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
}
