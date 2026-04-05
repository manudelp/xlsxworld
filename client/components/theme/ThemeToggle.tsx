"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { Theme, useTheme } from "@/components/theme/ThemeProvider";

const options: { value: Theme; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
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

  const ActiveIcon = options.find((o) => o.value === theme)!.icon;

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
        aria-label={t("toggleTheme")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ActiveIcon className="h-4 w-4" />
      </button>

      <div
        className={`absolute right-0 mt-2 w-36 origin-top-right rounded-md border p-1 shadow-lg transition-all duration-150 ease-out ${
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
        {options.map(({ value, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="menuitem"
            onClick={() => {
              setTheme(value);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm"
            style={{
              color: "var(--foreground)",
              backgroundColor:
                theme === value ? "var(--primary-soft)" : "transparent",
            }}
            tabIndex={open ? 0 : -1}
          >
            <Icon className="h-4 w-4" />
            {t(value)}
          </button>
        ))}
      </div>
    </div>
  );
}
