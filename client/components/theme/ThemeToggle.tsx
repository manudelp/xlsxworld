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
      >
        <ActiveIcon className="h-4 w-4" />
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
            >
              <Icon className="h-4 w-4" />
              {t(value)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
