"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("error");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold mb-4">{t("title")}</h1>
      <p className="text-xl mb-6">{t("description")}</p>
      <p className="text-sm text-muted mb-8 max-w-md">{t("detail")}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#292931] text-white rounded-lg hover:opacity-90 transition"
        >
          {t("tryAgain")}
        </button>
        <Link
          href="/contact"
          className="px-6 py-3 border border-border rounded-lg hover:bg-surface-2 transition"
        >
          {t("reportIssue")}
        </Link>
      </div>
    </div>
  );
}
