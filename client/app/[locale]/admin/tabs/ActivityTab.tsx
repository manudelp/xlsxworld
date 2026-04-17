"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

import type { AdminActivityItem } from "@/lib/admin";
import { fetchAdminActivity } from "@/lib/admin";

type StatusFilter = "all" | "success" | "error";
const PAGE_SIZE = 50;
const AUTO_REFRESH_INTERVAL_MS = 15_000;

function timeAgo(
  iso: string | null,
  t: (key: string, values?: Record<string, number>) => string,
): string {
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
  refreshToken,
  onLoaded,
}: {
  refreshToken: number;
  onLoaded?: () => void;
}) {
  const t = useTranslations("admin.activity");

  const [status, setStatus] = useState<StatusFilter>("all");
  const [toolSlug, setToolSlug] = useState<string>("");
  const [emailSearch, setEmailSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [items, setItems] = useState<AdminActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const load = useCallback(
    async ({ offset = 0, background = false }: { offset?: number; background?: boolean } = {}) => {
      if (offset === 0) {
        if (!background) setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const result = await fetchAdminActivity({
          limit: PAGE_SIZE,
          offset,
          success: status === "all" ? undefined : status === "success",
          tool_slug: toolSlug || undefined,
        });
        setHasMore(result.length === PAGE_SIZE);
        setItems((prev) => (offset === 0 ? result : [...prev, ...result]));
        if (offset === 0) onLoadedRef.current?.();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [status, toolSlug],
  );

  useEffect(() => {
    load({ offset: 0, background: false });
  }, [load, refreshToken]);

  useEffect(() => {
    if (!autoRefresh) return;
    const handle = window.setInterval(() => {
      load({ offset: 0, background: true });
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [autoRefresh, load]);

  const toolOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((it) => {
      if (it.tool_slug) map.set(it.tool_slug, it.tool_name ?? it.tool_slug);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  const visible = useMemo(() => {
    const needle = emailSearch.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) =>
      (i.user_email ?? "").toLowerCase().includes(needle),
    );
  }, [items, emailSearch]);

  return (
    <div className="space-y-4">
      <div>
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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          value={emailSearch}
          onChange={(e) => setEmailSearch(e.target.value)}
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
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          aria-label={t("statusFilter")}
          className="rounded-md border px-3 py-2 text-sm sm:w-40"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <option value="all">{t("statusAll")}</option>
          <option value="success">{t("statusSuccess")}</option>
          <option value="error">{t("statusError")}</option>
        </select>
        <select
          value={toolSlug}
          onChange={(e) => setToolSlug(e.target.value)}
          aria-label={t("toolFilter")}
          className="rounded-md border px-3 py-2 text-sm sm:w-48"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <option value="">{t("allTools")}</option>
          {toolOptions.map(([slug, name]) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
        </select>
        <label
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <span>{t("autoRefresh")}</span>
        </label>
      </div>

      {loading ? (
        <div
          className="rounded-lg border p-8 text-center text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--muted-2)",
          }}
        >
          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
        </div>
      ) : error ? (
        <div
          className="rounded-lg border p-6 text-center text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--muted-2)",
          }}
        >
          {error}
        </div>
      ) : visible.length === 0 ? (
        <div
          className="rounded-lg border p-8 text-center"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--muted-2)",
          }}
        >
          {items.length === 0 ? t("noData") : t("noResults")}
        </div>
      ) : (
        <>
          <div
            className="space-y-2"
            style={{ maxHeight: "70vh", overflowY: "auto" }}
          >
            {visible.map((item, i) => (
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
          {hasMore && !emailSearch && (
            <div className="flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => load({ offset: items.length })}
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:opacity-80 disabled:opacity-50"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--foreground)",
                }}
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {t("loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
