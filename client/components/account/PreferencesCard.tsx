"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Theme, useTheme } from "@/components/theme/ThemeProvider";
import { useRouter, usePathname } from "@/i18n/navigation";

const LOCALES = [
  { code: "en", label: "English", flag: "gb" },
  { code: "es", label: "Español", flag: "ar" },
  { code: "fr", label: "Français", flag: "fr" },
  { code: "pt", label: "Português", flag: "br" },
] as const;

type LocaleCode = (typeof LOCALES)[number]["code"];

export default function PreferencesCard() {
  const t = useTranslations("account.preferences");
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const themeOptions: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: t("themeLight"), Icon: Sun },
    { value: "dark", label: t("themeDark"), Icon: Moon },
    { value: "system", label: t("themeSystem"), Icon: Monitor },
  ];

  function onLocaleChange(code: LocaleCode) {
    router.replace(pathname, { locale: code });
  }

  return (
    <section
      className="rounded-2xl border p-6 shadow-sm"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-2)",
      }}
    >
      <h2
        className="text-sm font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--muted)" }}
      >
        {t("title")}
      </h2>
      <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
        {t("description")}
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <label
            htmlFor="pref-language"
            className="block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            {t("language")}
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`fi fi-${
                LOCALES.find((l) => l.code === currentLocale)?.flag ?? "gb"
              } h-3.5 w-5 shrink-0 rounded-[2px]`}
            />
            <select
              id="pref-language"
              value={currentLocale}
              onChange={(e) => onLocaleChange(e.target.value as LocaleCode)}
              className="flex-1 rounded-md border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--foreground)",
              }}
            >
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span
            className="block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            {t("theme")}
          </span>
          <div
            role="radiogroup"
            aria-label={t("theme")}
            className="mt-2 grid grid-cols-3 gap-1 rounded-md border p-1"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
            }}
          >
            {themeOptions.map(({ value, label, Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(value)}
                  className="inline-flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition"
                  style={{
                    backgroundColor: active
                      ? "var(--primary-soft)"
                      : "transparent",
                    color: active ? "var(--primary)" : "var(--foreground)",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
