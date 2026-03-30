"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HealthStatus = "checking" | "online" | "offline";

export default function Footer() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("checking");

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      const configuredBase = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
      const candidates = configuredBase
        ? [`${configuredBase}/health`, "/api/health"]
        : ["/api/health", "/health"];

      for (const url of candidates) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if (!isMounted) return;
          if (response.ok) {
            setHealthStatus("online");
            return;
          }
        } catch {
          // Try the next candidate URL.
        }
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

  return (
    <footer className="w-full bg-[#292931] text-white py-6 px-4">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
        <div className="flex gap-6">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="/faq" className="hover:underline">
            FAQ
          </Link>
          <Link href="/contact" className="hover:underline">
            Contact
          </Link>
          <Link
            href="https://link.clashroyale.com/invite/clan/es/?platform=android&tag=RUPQ8RQR&token=x8e92r9f"
            className="hover:underline"
          >
            Clash Royale Clan
          </Link>
        </div>
        <div className="text-center md:text-right flex flex-col items-center md:items-end gap-1">
          <div className="inline-flex items-center gap-2 text-xs text-white/90">
            <span className={`h-2 w-2 rounded-full ${healthDotClass}`} aria-hidden="true" />
            <span>{healthLabel}</span>
          </div>
          <div>© XLSX World {new Date().getFullYear()}</div>
        </div>
      </div>
    </footer>
  );
}
