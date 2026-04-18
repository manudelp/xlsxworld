"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { fetchUsage, type Usage } from "@/lib/usage";

const NEAR_LIMIT_THRESHOLD = 80;

export default function QuotaPill() {
  const t = useTranslations("quotaPill");
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchUsage()
      .then((u) => {
        if (!cancelled) setUsage(u);
      })
      .catch(() => {
        // Silent: pill is purely advisory.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!usage || usage.jobs_percent < NEAR_LIMIT_THRESHOLD) return null;

  return (
    <Link
      href="/my-account"
      title={t("tooltip", {
        n: usage.jobs_today,
        limit: usage.jobs_today_limit,
      })}
      className="rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        borderColor: "var(--danger)",
        color: "var(--danger)",
        backgroundColor: "var(--surface-2)",
      }}
    >
      {t("label", {
        n: usage.jobs_today,
        limit: usage.jobs_today_limit,
      })}
    </Link>
  );
}
