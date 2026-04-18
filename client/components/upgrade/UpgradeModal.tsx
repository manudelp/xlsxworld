"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { useUpgradeModal } from "./useUpgradeModal";

export default function UpgradeModal() {
  const t = useTranslations("upgradeModal");
  const { request, close } = useUpgradeModal();

  if (!request) return null;

  const titleKey =
    request.reason === "ANON_FILE_TOO_LARGE" ? "sizeTitle" : "title";
  const bodyKey =
    request.reason === "ANON_FILE_TOO_LARGE" ? "sizeBody" : "body";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-lg"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <h2
          id="upgrade-modal-title"
          className="text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {t(titleKey)}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          {t(bodyKey)}
        </p>
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={close}
            aria-label={t("dismiss")}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:opacity-80"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-2)",
              color: "var(--foreground)",
            }}
          >
            {t("dismiss")}
          </button>
          <Link
            href="/signup"
            onClick={close}
            className="rounded-md px-3 py-1.5 text-sm font-semibold"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {t("signUp")}
          </Link>
        </div>
      </div>
    </div>
  );
}
