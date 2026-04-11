"use client";

import { useMemo, useState } from "react";

import type { AdminToolStat } from "@/lib/admin";

type SortKey = "tool_name" | "total_uses" | "success_rate" | "avg_duration_ms" | "last_used_at";

function rateColor(rate: number) {
  if (rate >= 95) return "#22c55e";
  if (rate >= 85) return "#eab308";
  return "#ef4444";
}

function formatDate(iso: string | null) {
  if (!iso) return "Never used";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ToolsTab({ data }: { data: AdminToolStat[] }) {
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
        No tool usage data yet.
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border"
      style={{ borderColor: "var(--border)" }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: "var(--surface)" }}>
            {(
              [
                ["tool_name", "Tool Name"],
                ["total_uses", "Total Uses"],
                ["success_rate", "Success Rate"],
                ["avg_duration_ms", "Avg Duration"],
                ["last_used_at", "Last Used"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
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
          {sorted.map((tool) => (
            <tr
              key={tool.tool_slug}
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
                {formatDate(tool.last_used_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
