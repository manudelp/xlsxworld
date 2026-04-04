"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

const locales = [
  { code: "en" as const, label: "English" },
  { code: "es" as const, label: "Español" },
  { code: "fr" as const, label: "Français" },
  { code: "pt" as const, label: "Português" },
];

export default function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-md border p-2"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
          color: "var(--foreground)",
        }}
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-36 rounded-md border p-1 shadow-lg"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
          }}
          role="menu"
        >
          {locales.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              role="menuitem"
              onClick={() => {
                router.replace(pathname, { locale: code });
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm"
              style={{
                color: "var(--foreground)",
                backgroundColor:
                  locale === code ? "var(--primary-soft)" : "transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
