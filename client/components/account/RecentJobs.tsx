"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Download, FileText, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import {
  fetchJobs,
  getJobDownloadUrl,
  type JobItem,
} from "@/lib/jobs";

const RECENT_LIMIT = 3;

export default function RecentJobs() {
  const t = useTranslations("account.recentJobs");
  const format = useFormatter();

  const [items, setItems] = useState<JobItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJobs({ limit: RECENT_LIMIT, offset: 0, success: true })
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return null;

  async function handleDownload(jobId: string) {
    setDownloadingId(jobId);
    try {
      const { url } = await getJobDownloadUrl(jobId);
      window.open(url, "_blank", "noopener");
    } catch {
      // silent — user can retry from the full history page
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <section
      className="rounded-2xl border p-6 shadow-sm"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-2)",
      }}
    >
      <div className="flex items-center justify-between">
        <h2
          className="text-sm font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--muted)" }}
        >
          {t("title")}
        </h2>
        <Link
          href="/my-account/history"
          className="inline-flex items-center gap-1 text-xs font-medium transition hover:opacity-80"
          style={{ color: "var(--primary)" }}
        >
          {t("viewAll")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {items === null ? (
        <div className="mt-4 flex items-center justify-center py-8">
          <Loader2
            className="h-4 w-4 animate-spin"
            style={{ color: "var(--muted)" }}
          />
        </div>
      ) : items.length === 0 ? (
        <p
          className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm"
          style={{
            borderColor: "var(--border)",
            color: "var(--muted)",
          }}
        >
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((job) => {
            const when = format.relativeTime(new Date(job.created_at));
            return (
              <li
                key={job.id}
                className="flex items-center gap-3 rounded-lg border p-3"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: "var(--primary-soft)",
                    color: "var(--primary)",
                  }}
                  aria-hidden="true"
                >
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                    title={job.tool_name}
                  >
                    {job.tool_name}
                  </p>
                  <p
                    className="truncate text-xs"
                    style={{ color: "var(--muted)" }}
                    title={job.original_filename ?? undefined}
                  >
                    {job.original_filename ?? "—"} · {when}
                  </p>
                </div>
                {job.expired ? (
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
                    onClick={() => void handleDownload(job.id)}
                    disabled={downloadingId === job.id}
                    aria-label={t("download")}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition hover:opacity-80 disabled:opacity-50"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--surface-2)",
                      color: "var(--foreground)",
                    }}
                  >
                    {downloadingId === job.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
