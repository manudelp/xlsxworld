"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";

type HealthStatus = "checking" | "online" | "offline";

export default function Footer() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("checking");

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        const response = await api.get<{ status: string }>("/api/proxy/health");
        if (!isMounted) {
          return;
        }
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
    const intervalId = window.setInterval(checkHealth, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const healthLabel =
    healthStatus === "online"
      ? "API Online"
      : healthStatus === "offline"
        ? "API Offline"
        : "Checking API...";

  const healthDotClass =
    healthStatus === "online"
      ? "bg-emerald-400"
      : healthStatus === "offline"
        ? "bg-rose-400"
        : "bg-amber-400";

  const healthTooltip =
    healthStatus === "online"
      ? "The API is responding normally. Your requests should work as expected."
      : healthStatus === "offline"
        ? "We could not reach the API right now. Some features may be temporarily unavailable."
        : "We are checking the API connection in the background.";

  return (
    <footer className="w-full bg-[#292931] text-white py-6 px-4">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
        <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="/faq" className="hover:underline">
            FAQ
          </Link>
          <Link
            href="https://link.clashroyale.com/invite/clan/es/?platform=android&tag=RUPQ8RQR&token=x8e92r9f"
            className="hover:underline"
          >
            GameDesk
          </Link>
          <Link href="/contact" className="hover:underline">
            Contact
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
        </div>
        <div className="text-center md:text-right flex flex-col items-center md:items-end gap-1">
          <div className="relative group inline-flex cursor-default items-center gap-2 text-xs text-white/90">
            <span
              className={`h-2 w-2 rounded-full ${healthDotClass}`}
              aria-hidden="true"
            />
            <span>{healthLabel}</span>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 w-max max-w-[16rem] -translate-x-1/2 rounded border px-2 py-1 text-left text-[11px] leading-snug opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
                color: "var(--foreground)",
              }}
            >
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                }}
              />
              {healthTooltip}
            </span>
          </div>
          <div>© XLSX World {new Date().getFullYear()}</div>
          <div className="text-xs text-white/60">
            Simplifying spreadsheets, one file at a time.
          </div>
        </div>
      </div>
    </footer>
  );
}
