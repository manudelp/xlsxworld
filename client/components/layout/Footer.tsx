"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";

type HealthStatus = "checking" | "online" | "offline";

export default function Footer() {
  const t = useTranslations("footer");
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("checking");

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        const response = await api.get<{ status: string }>("/api/proxy/health");
        if (!isMounted) return;
        if (response?.status === "ok") {
          setHealthStatus("online");
          return;
        }
      } catch {
        // Fall through to offline state.
      }

      if (!isMounted) return;
      setHealthStatus("offline");
    }

    checkHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  const healthLabel =
    healthStatus === "online"
      ? t("apiOnline")
      : healthStatus === "offline"
        ? t("apiOffline")
        : t("checkingApi");

  const healthDotClass =
    healthStatus === "online"
      ? "bg-emerald-400"
      : healthStatus === "offline"
        ? "bg-rose-400"
        : "bg-amber-400";

  const healthTooltip =
    healthStatus === "online"
      ? t("apiOnlineTooltip")
      : healthStatus === "offline"
        ? t("apiOfflineTooltip")
        : t("checkingApiTooltip");

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const arrowRef = useRef<HTMLSpanElement | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    const arrow = arrowRef.current;
    if (!trigger || !tooltip || !arrow) return;

    const gap = 8;
    const pad = 8;
    const tr = trigger.getBoundingClientRect();
    const tt = tooltip.getBoundingClientRect();

    const above = tr.top - gap - tt.height >= 0;
    tooltip.style.top = above
      ? `${-(tt.height + gap)}px`
      : `${tr.height + gap}px`;

    const centerX = tr.width / 2 - tt.width / 2;
    const absLeft = tr.left + centerX;
    const absRight = absLeft + tt.width;
    let shiftX = centerX;
    if (absLeft < pad) shiftX = -tr.left + pad;
    else if (absRight > window.innerWidth - pad)
      shiftX = window.innerWidth - pad - tt.width - tr.left;
    tooltip.style.left = `${shiftX}px`;

    const arrowX = tr.width / 2 - shiftX - 4;
    arrow.style.left = `${arrowX}px`;

    if (above) {
      arrow.style.top = "";
      arrow.style.bottom = "-4px";
      arrow.className =
        "absolute h-2 w-2 rotate-45 border-r border-b";
    } else {
      arrow.style.bottom = "";
      arrow.style.top = "-4px";
      arrow.className =
        "absolute h-2 w-2 rotate-45 border-l border-t";
    }
  }, []);

  return (
    <footer className="w-full bg-[#292931] text-white py-6 px-4">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm overflow-visible">
        <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2">
          <Link href="/" className="hover:underline">
            {t("home")}
          </Link>
          <Link href="/faq" className="hover:underline">
            {t("faq")}
          </Link>
          <Link href="/contact" className="hover:underline">
            {t("contact")}
          </Link>
          <Link href="/privacy" className="hover:underline">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="hover:underline">
            {t("terms")}
          </Link>
        </div>
        <div className="text-center md:text-right flex flex-col items-center md:items-end gap-1 overflow-visible">
          <div
            ref={triggerRef}
            onMouseEnter={updatePosition}
            className="relative group inline-flex cursor-default items-center gap-2 text-xs text-white/90"
          >
            <span
              className={`h-2 w-2 rounded-full ${healthDotClass}`}
              aria-hidden="true"
            />
            <span>{healthLabel}</span>
            <span
              ref={tooltipRef}
              role="tooltip"
              className="pointer-events-none absolute z-10 w-max max-w-[min(16rem,calc(100vw-1rem))] rounded border px-2 py-1 text-left text-[11px] leading-snug opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
                color: "var(--foreground)",
              }}
            >
              <span
                ref={arrowRef}
                aria-hidden="true"
                className="absolute h-2 w-2 rotate-45 border-r border-b"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                }}
              />
              {healthTooltip}
            </span>
          </div>
          <div>{t("copyright", { year: new Date().getFullYear() })}</div>
          <div className="text-xs text-white/60">{t("tagline")}</div>
        </div>
      </div>
    </footer>
  );
}
