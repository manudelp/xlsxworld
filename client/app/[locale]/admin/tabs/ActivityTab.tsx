"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

import type { AdminActivityItem } from "@/lib/admin";

function timeAgo(iso: string | null, t: (key: string, values?: Record<string, number>) => string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return t("justNow");
  const mins = Math.floor(secs / 60);
  if (mins < 60) return t("minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t("daysAgo", { count: days });
}

export default function ActivityTab({
  data,
  onRefresh,
}: {
  data: AdminActivityItem[];
  onRefresh: () => Promise<void>;
}) {
  const t = useTranslations("admin.activity");
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            {t("title")}
          </h3>
          <p className="text-xs" style={{ color: "var(--muted-2)" }}>
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-opacity disabled:opacity-50 sm:px-3 sm:text-sm"
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
          <span className="hidden sm:inline">{t("refresh")}</span>
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
          {t("noData")}
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
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.success ? (
                      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "#22c55e" }} />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0" style={{ color: "#ef4444" }} />
                    )}
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {item.tool_name || item.tool_slug || t("unknownTool")}
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

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span
                      className="max-w-full truncate"
                      style={{ color: "var(--muted-2)" }}
                      title={item.user_email ?? undefined}
                    >
                      {item.user_email || t("anonymous")}
                    </span>
                    <span style={{ color: "var(--muted-2)" }}>
                      {item.duration_ms != null
                        ? `${Math.round(item.duration_ms)} ms`
                        : "—"}
                    </span>
                    {item.error_type && (
                      <span style={{ color: "#ef4444" }}>
                        {item.error_type}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className="shrink-0 text-xs sm:text-right"
                  style={{ color: "var(--muted-2)" }}
                >
                  {timeAgo(item.occurred_at, t)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
