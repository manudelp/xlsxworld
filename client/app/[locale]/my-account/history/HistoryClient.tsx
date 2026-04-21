"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { useRequireAuth } from "@/components/auth/useRequireAuth";
import {
  deleteJob,
  fetchJobs,
  getJobDownloadUrl,
  type JobItem,
} from "@/lib/jobs";

type StatusFilter = "all" | "success" | "error";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, exp);
  const formatted = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${units[exp]}`;
}

export default function HistoryClient() {
  const t = useTranslations("account.history");
  const format = useFormatter();
  const { isLoading: authLoading, isAuthenticated } = useRequireAuth();

  const [items, setItems] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(handle);
  }, [search]);

  const load = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      if (background) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await fetchJobs({
          limit: PAGE_SIZE,
          offset: 0,
          search: debouncedSearch || undefined,
          success: status === "all" ? undefined : status === "success",
        });
        setItems(result.items);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, status],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    load();
  }, [authLoading, isAuthenticated, load]);

  async function handleDownload(jobId: string, filename: string) {
    setDownloadingId(jobId);
    setError(null);
    try {
      const buffer = await getJobDownloadUrl(jobId);
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(jobId: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    setPendingDeleteId(jobId);
    setError(null);
    try {
      await deleteJob(jobId);
      setItems((prev) => prev.filter((job) => job.id !== jobId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingDeleteId(null);
    }
  }

  const formattedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        sizeLabel: formatBytes(item.output_size_bytes),
        whenLabel: format.dateTime(new Date(item.created_at), {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      })),
    [items, format],
  );

  if (authLoading || !isAuthenticated) return null;

  return (
    <main className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-10">
      <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <h1
            className="text-xl font-semibold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            {t("title")}
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted)" }}
          >
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load({ background: true })}
          disabled={loading || refreshing}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50 sm:px-3 sm:text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
          aria-label={t("refresh")}
        >
          {refreshing || loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{t("refresh")}</span>
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="flex-1 rounded-md border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
          aria-label={t("statusFilter")}
          className="rounded-md border px-3 py-2 text-sm outline-none transition sm:w-44"
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
      </div>

      {error && (
        <p
          className="mb-3 rounded-md border p-3 text-center text-sm"
          role="alert"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--danger, #dc2626)",
          }}
        >
          {error}
        </p>
      )}

      {loading ? (
        <div
          className="flex items-center justify-center rounded-lg border py-16"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : formattedItems.length === 0 ? (
        <div
          className="rounded-lg border p-10 text-center"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {t("empty")}
          </p>
        </div>
      ) : (
        <ul
          className="space-y-2"
          aria-live="polite"
          style={{
            opacity: refreshing ? 0.6 : 1,
            transition: "opacity 150ms",
          }}
        >
          {formattedItems.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border p-3 sm:p-4"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                borderLeft: `4px solid ${
                  item.success ? "#22c55e" : "#ef4444"
                }`,
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                    title={item.tool_name}
                  >
                    {item.tool_name}
                  </p>
                  <p
                    className="mt-0.5 truncate text-xs"
                    style={{ color: "var(--muted)" }}
                    title={item.original_filename ?? undefined}
                  >
                    {item.original_filename ?? "—"}
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    {item.sizeLabel} · {item.whenLabel}
                    {item.duration_ms != null && (
                      <> · {Math.round(item.duration_ms)} ms</>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {item.success ? (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: "rgba(34,197,94,0.12)",
                        color: "#16a34a",
                      }}
                    >
                      {t("statusSuccess")}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: "rgba(239,68,68,0.12)",
                        color: "#dc2626",
                      }}
                      title={item.error_type ?? undefined}
                    >
                      {t("statusError")}
                    </span>
                  )}
                  {!item.success ? null : item.expired ? (
                    <span
                      className="inline-flex items-center rounded-md border px-2 py-1 text-xs"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--muted)",
                      }}
                    >
                      {t("expired")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDownload(item.id, item.output_filename)}
                      disabled={downloadingId === item.id}
                      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--surface-2)",
                        color: "var(--foreground)",
                      }}
                    >
                      {downloadingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      {t("download")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={pendingDeleteId === item.id}
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--surface-2)",
                      color: "var(--foreground)",
                    }}
                    aria-label={t("delete")}
                  >
                    {pendingDeleteId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
