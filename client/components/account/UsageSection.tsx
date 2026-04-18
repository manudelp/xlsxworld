"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { fetchUsage, type Usage } from "@/lib/usage";

function barColor(percent: number): string {
  if (percent >= 85) return "var(--danger)";
  if (percent >= 50) return "var(--warning)";
  return "var(--primary)";
}

export default function UsageSection() {
  const t = useTranslations("account.usage");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchUsage()
      .then((u) => {
        if (!cancelled) setUsage(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || !usage) return null;

  const percent = Math.min(usage.jobs_percent, 100);
  const mb = Math.round(usage.max_upload_bytes / (1024 * 1024));

  return (
    <section
      className="rounded-2xl border p-6 shadow-sm"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-2)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          className="text-sm font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--muted)" }}
        >
          {t("title")}
        </h2>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
          style={{
            backgroundColor: "var(--primary-soft)",
            color: "var(--primary)",
          }}
        >
          {t("planLabel", { plan: usage.plan })}
        </span>
      </div>

      <div
        className="mt-3 text-3xl font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        {usage.jobs_today}
        <span
          className="ml-1 text-base font-normal"
          style={{ color: "var(--muted)" }}
        >
          / {usage.jobs_today_limit} {t("jobsToday")}
        </span>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <div
          role="progressbar"
          aria-valuenow={usage.jobs_percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("progressLabel")}
          className="h-full rounded-full transition-all"
          style={{
            width: `${percent}%`,
            backgroundColor: barColor(usage.jobs_percent),
          }}
        />
      </div>

      <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
        {t("resets")}
      </p>

      <div
        className="mt-4 border-t pt-4"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {t("sizeCap", { mb })}
        </p>
      </div>
    </section>
  );
}
