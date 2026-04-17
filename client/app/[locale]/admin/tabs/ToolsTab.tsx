"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { AdminToolStat } from "@/lib/admin";

type SortKey = "tool_name" | "total_uses" | "success_rate" | "avg_duration_ms" | "last_used_at";

function rateColor(rate: number) {
  if (rate >= 95) return "#22c55e";
  if (rate >= 85) return "#eab308";
  return "#ef4444";
}

function formatDate(iso: string | null, neverUsedLabel: string) {
  if (!iso) return neverUsedLabel;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ToolsTab({ data }: { data: AdminToolStat[] }) {
  const t = useTranslations("admin.tools");
  const [sortKey, setSortKey] = useState<SortKey>("total_uses");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      let av: number | string = a[sortKey] ?? "";
      let bv: number | string = b[sortKey] ?? "";
      if (sortKey === "last_used_at") {
        av = a.last_used_at ?? "";
        bv = b.last_used_at ?? "";
      }
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [data, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  if (data.length === 0) {
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

  const columns: [SortKey, string][] = [
    ["tool_name", t("toolName")],
    ["total_uses", t("totalUses")],
    ["success_rate", t("successRate")],
    ["avg_duration_ms", t("avgDuration")],
    ["last_used_at", t("lastUsed")],
  ];

  return (
    <>
      {/* Mobile sort selector + cards */}
      <div className="space-y-2 sm:hidden">
        <div className="flex items-center gap-2">
          <label
            className="text-xs font-medium"
            style={{ color: "var(--muted-2)" }}
          >
            {t("sortBy")}
          </label>
          <select
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value as SortKey);
              setSortAsc(false);
            }}
            className="flex-1 rounded-md border px-2 py-1.5 text-xs"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--foreground)",
            }}
          >
            {columns.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortAsc((v) => !v)}
            className="rounded-md border px-2 py-1.5 text-xs"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--foreground)",
            }}
            aria-label={sortAsc ? t("ariaSortAsc") : t("ariaSortDesc")}
          >
            {sortAsc ? "↑" : "↓"}
          </button>
        </div>
        {sorted.map((tool, idx) => (
          <div
            key={`${tool.tool_slug}-${idx}-card`}
            className="rounded-lg border p-3"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
            }}
          >
            <p
              className="mb-2 text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {tool.tool_name}
            </p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <dt style={{ color: "var(--muted-2)" }}>{t("totalUses")}</dt>
              <dd
                className="text-right"
                style={{ color: "var(--foreground)" }}
              >
                {tool.total_uses.toLocaleString()}
              </dd>
              <dt style={{ color: "var(--muted-2)" }}>{t("successRate")}</dt>
              <dd
                className="text-right"
                style={{ color: rateColor(tool.success_rate) }}
              >
                {tool.success_rate}%
              </dd>
              <dt style={{ color: "var(--muted-2)" }}>{t("avgDuration")}</dt>
              <dd
                className="text-right"
                style={{ color: "var(--foreground)" }}
              >
                {tool.avg_duration_ms} ms
              </dd>
              <dt style={{ color: "var(--muted-2)" }}>{t("lastUsed")}</dt>
              <dd
                className="text-right"
                style={{ color: "var(--muted-2)" }}
              >
                {formatDate(tool.last_used_at, t("neverUsed"))}
              </dd>
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop/tablet table */}
      <div
        className="hidden overflow-x-auto rounded-lg border sm:block"
        style={{ borderColor: "var(--border)" }}
      >
        <table className="w-full text-sm" style={{ backgroundColor: "var(--surface-2)" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--surface)" }}>
              {columns.map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="cursor-pointer px-4 py-3 text-left font-medium"
                  style={{ color: "var(--muted-2)", borderBottom: "1px solid var(--border)" }}
                >
                  {label}
                  {arrow(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((tool, idx) => (
              <tr
                key={`${tool.tool_slug}-${idx}`}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                  {tool.tool_name}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                  {tool.total_uses.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span style={{ color: rateColor(tool.success_rate) }}>
                    {tool.success_rate}%
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>
                  {tool.avg_duration_ms} ms
                </td>
                <td className="px-4 py-3" style={{ color: "var(--muted-2)" }}>
                  {formatDate(tool.last_used_at, t("neverUsed"))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
