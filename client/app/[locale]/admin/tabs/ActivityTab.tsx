"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

import type { AdminActivityItem } from "@/lib/admin";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function ActivityTab({
  data,
  onRefresh,
}: {
  data: AdminActivityItem[];
  onRefresh: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Live Activity Feed
          </h3>
          <p className="text-xs" style={{ color: "var(--muted-2)" }}>
            Last 50 tool uses — refresh to update
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-opacity disabled:opacity-50"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {data.length === 0 ? (
        <div
          className="rounded-lg border p-8 text-center"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--muted-2)",
          }}
        >
          No tool activity yet.
        </div>
      ) : (
        <div
          className="space-y-2"
          style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
          {data.map((item, i) => (
            <div
              key={`${item.occurred_at}-${i}`}
              className="rounded-lg border p-4"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                borderLeft: `4px solid ${item.success ? "#22c55e" : "#ef4444"}`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {item.success ? (
                      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "#22c55e" }} />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0" style={{ color: "#ef4444" }} />
                    )}
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {item.tool_name || item.tool_slug || "Unknown tool"}
                    </span>
                    {item.tool_slug && (
                      <span
                        className="rounded px-1.5 py-0.5 text-xs"
                        style={{
                          backgroundColor: "var(--surface-2)",
                          color: "var(--muted-2)",
                        }}
                      >
                        {item.tool_slug}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                    <span style={{ color: "var(--muted-2)" }}>
                      {item.user_email || "Anonymous"}
                    </span>
                    <span style={{ color: "var(--muted-2)" }}>
                      {item.duration_ms ? `${item.duration_ms} ms` : "—"}
                    </span>
                    {item.error_type && (
                      <span style={{ color: "#ef4444" }}>
                        {item.error_type}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className="shrink-0 text-xs"
                  style={{ color: "var(--muted-2)" }}
                >
                  {timeAgo(item.occurred_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
