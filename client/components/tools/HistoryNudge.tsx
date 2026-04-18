"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuth } from "@/components/auth/AuthProvider";
import { Link } from "@/i18n/navigation";

const DISMISS_KEY = "xlsxworld:historyNudge:dismissed";

export default function HistoryNudge() {
  const { isAuthenticated, isLoading } = useAuth();
  const t = useTranslations("tools");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;

    function handleSuccess() {
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
      } catch {
        // ignore storage errors
      }
      setVisible(true);
    }

    window.addEventListener("xlsx-tool:success", handleSuccess);
    return () => window.removeEventListener("xlsx-tool:success", handleSuccess);
  }, [isAuthenticated, isLoading]);

  if (!visible || isAuthenticated) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border p-4 shadow-lg"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-2)",
        color: "var(--foreground)",
      }}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 text-sm">
          <p className="font-semibold mb-1">{t("historyCtaTitle")}</p>
          <p style={{ color: "var(--muted)" }}>{t("historyCtaBody")}</p>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              onClick={dismiss}
            >
              {t("historyCtaAction")}
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-sm hover:underline"
              style={{ color: "var(--muted)" }}
            >
              {t("historyCtaDismiss")}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded p-1 hover:bg-black/5"
          aria-label={t("historyCtaDismiss")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
