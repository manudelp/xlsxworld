"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

const locales = [
  { code: "en" as const, label: "English", flag: "us" },
  { code: "es" as const, label: "Español", flag: "ar" },
  { code: "fr" as const, label: "Français", flag: "fr" },
  { code: "pt" as const, label: "Português", flag: "br" },
] as const;

type LocaleCode = (typeof locales)[number]["code"];

function LocaleFlag({
  code,
  className,
}: {
  code: LocaleCode;
  className?: string;
}) {
  const locale = locales.find((entry) => entry.code === code);

  if (!locale) return null;

  return (
    <span
      aria-hidden="true"
      className={`fi fi-${locale.flag} ${className ?? ""}`.trim()}
    />
  );
}

export default function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLocale =
    locales.find((entry) => entry.code === locale) ?? locales[0];

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
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
          color: "var(--foreground)",
        }}
        aria-label={`Change language to ${currentLocale.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" />
        <LocaleFlag
          code={currentLocale.code}
          className="h-3.5 w-5 shrink-0 rounded-[2px]"
        />
      </button>

      <div
        className={`absolute right-0 mt-2 w-36 rounded-md border p-1 shadow-lg transition-all duration-150 ease-out origin-top-right ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface-2)",
        }}
        role="menu"
        aria-hidden={!open}
      >
        {locales.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            role="menuitem"
            tabIndex={open ? 0 : -1}
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
            <LocaleFlag
              code={code}
              className="h-3.5 w-5 shrink-0 rounded-[2px]"
            />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
