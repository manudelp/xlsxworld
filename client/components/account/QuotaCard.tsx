"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { fetchUsage, type Usage } from "@/lib/usage";

export default function QuotaCard() {
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

  return (
    <section
      className="rounded-2xl border p-6 shadow-sm"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-2)",
      }}
    >
      <div className="flex items-baseline justify-between">
        <div
          className="text-xs uppercase tracking-[0.16em]"
          style={{ color: "var(--muted)" }}
        >
          {t("title")}
        </div>
        <div
          className="text-xs"
          style={{ color: "var(--muted)" }}
        >
          {t("planLabel", { plan: usage.plan })}
        </div>
      </div>

      <div
        className="mt-2 text-2xl font-semibold"
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
            width: `${Math.min(usage.jobs_percent, 100)}%`,
            backgroundColor:
              usage.jobs_percent >= 80
                ? "var(--danger)"
                : "var(--primary)",
          }}
        />
      </div>

      <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
        {t("sizeCap", {
          mb: Math.round(usage.max_upload_bytes / (1024 * 1024)),
        })}
      </p>
    </section>
  );
}
