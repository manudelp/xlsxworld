"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter as useNavigationRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Settings,
  ShieldUser,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useAuth } from "@/components/auth/AuthProvider";
import { Theme, useTheme } from "@/components/theme/ThemeProvider";
import {
  Link,
  usePathname,
  useRouter as useI18nRouter,
} from "@/i18n/navigation";

const locales = [
  { code: "en" as const, label: "English", flag: "gb" },
  { code: "es" as const, label: "Español", flag: "ar" },
  { code: "fr" as const, label: "Français", flag: "fr" },
  { code: "pt" as const, label: "Português", flag: "br" },
] as const;

const themeOptions: { value: Theme; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

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

export default function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const t = useTranslations();
  const tTheme = useTranslations("theme");
  const navigationRouter = useNavigationRouter();
  const i18nRouter = useI18nRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentLocale =
    locales.find((entry) => entry.code === locale) ?? locales[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setSettingsOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    setMobileMenuOpen(false);
    await logout();
    navigationRouter.push("/");
    navigationRouter.refresh();
  }

  function handleLocaleChange(code: LocaleCode) {
    i18nRouter.replace(pathname, { locale: code });
    setSettingsOpen(false);
    setMobileMenuOpen(false);
  }

  const label =
    user?.display_name?.trim() || user?.email || t("account.myAccount");

  return (
    <header
      className="h-[60px] z-50 fixed right-0 left-0 top-0 px-2 sm:px-6 flex items-center justify-between gap-4"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <Link href="/" className="flex items-center gap-2 h-[30px]">
        <h2 className="text-xl font-semibold flex items-center gap-1">
          XLSX
          <Image
            src="/icon.svg"
            alt="XLSX World"
            width={32}
            height={32}
            style={{ display: "inline", verticalAlign: "middle" }}
          />
          World
        </h2>
      </Link>

      {/* Desktop controls */}
      <div className="hidden md:flex items-center gap-2">
        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            onClick={() => {
              setSettingsOpen((value) => !value);
              setMenuOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--foreground)",
            }}
            aria-haspopup="menu"
            aria-expanded={settingsOpen}
          >
            <Settings className="h-4 w-4" />
            <span>{t("header.settings")}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-150 ease-out ${
                settingsOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>

          <div
            className={`absolute right-0 mt-2 w-64 origin-top-right rounded-md border p-2 shadow-lg transition-all duration-150 ease-out ${
              settingsOpen
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-1 scale-95 opacity-0"
            }`}
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-2)",
            }}
            role="menu"
            aria-hidden={!settingsOpen}
          >
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)]/70">
              {t("header.language")}
            </div>
            {locales.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                role="menuitem"
                tabIndex={settingsOpen ? 0 : -1}
                onClick={() => handleLocaleChange(code)}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm"
                style={{
                  color: "var(--foreground)",
                  backgroundColor:
                    currentLocale.code === code ? "var(--primary-soft)" : "",
                }}
              >
                <LocaleFlag
                  code={code}
                  className="h-3.5 w-5 shrink-0 rounded-[2px]"
                />
                {label}
              </button>
            ))}

            <div className="my-2 h-px bg-[color:var(--border)]" />

            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)]/70">
              {t("header.theme")}
            </div>
            {themeOptions.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="menuitem"
                tabIndex={settingsOpen ? 0 : -1}
                onClick={() => {
                  setTheme(value);
                  setSettingsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm"
                style={{
                  color: "var(--foreground)",
                  backgroundColor: theme === value ? "var(--primary-soft)" : "",
                }}
              >
                <Icon className="h-4 w-4" />
                {tTheme(value)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <span className="inline-flex items-center rounded-md bg-muted px-3 py-2 text-sm font-medium text-primary-foreground opacity-50 cursor-wait">
            <span className="animate-pulse">{t("header.login")}</span>
          </span>
        ) : isAuthenticated ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen((value) => !value);
                setSettingsOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--foreground)",
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <UserRound className="h-4 w-4" />
              <span className="max-w-[180px] truncate">{label}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-150 ease-out ${
                  menuOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            <div
              className={`absolute right-0 mt-2 w-48 origin-top-right rounded-md border p-1 shadow-lg transition-all duration-150 ease-out ${
                menuOpen
                  ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none -translate-y-1 scale-95 opacity-0"
              }`}
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
              }}
              role="menu"
              aria-hidden={!menuOpen}
            >
              <Link
                href="/my-account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-black/5"
                style={{ color: "var(--foreground)" }}
                tabIndex={menuOpen ? 0 : -1}
              >
                <UserRound className="h-4 w-4" />
                {t("account.myAccount")}
              </Link>
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-black/5"
                  style={{ color: "var(--foreground)" }}
                  tabIndex={menuOpen ? 0 : -1}
                >
                  <ShieldUser className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-black/5"
                style={{ color: "var(--foreground)" }}
                role="menuitem"
                tabIndex={menuOpen ? 0 : -1}
              >
                <LogOut className="h-4 w-4" />
                {t("account.logout")}
              </button>
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("header.login")}
          </Link>
        )}
      </div>

      {/* Mobile hamburger */}
      <div className="md:hidden relative" ref={mobileMenuRef}>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-md border p-2"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
          aria-haspopup="menu"
          aria-expanded={mobileMenuOpen}
          aria-label="Open menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        <div
          className={`absolute right-0 mt-2 w-72 origin-top-right rounded-md border p-2 shadow-lg transition-all duration-150 ease-out ${
            mobileMenuOpen
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-1 scale-95 opacity-0"
          }`}
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
          }}
          role="menu"
          aria-hidden={!mobileMenuOpen}
        >
          {/* Account section */}
          {isLoading ? null : isAuthenticated ? (
            <>
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)]/70">
                {t("account.myAccount")}
              </div>
              <Link
                href="/my-account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-black/5"
                style={{ color: "var(--foreground)" }}
                tabIndex={mobileMenuOpen ? 0 : -1}
              >
                <UserRound className="h-4 w-4" />
                <span className="truncate">{label}</span>
              </Link>
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-black/5"
                  style={{ color: "var(--foreground)" }}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                >
                  <ShieldUser className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-black/5"
                style={{ color: "var(--foreground)" }}
                role="menuitem"
                tabIndex={mobileMenuOpen ? 0 : -1}
              >
                <LogOut className="h-4 w-4" />
                {t("account.logout")}
              </button>
              <div className="my-2 h-px bg-[color:var(--border)]" />
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium"
                style={{
                  color: "var(--primary)",
                }}
                tabIndex={mobileMenuOpen ? 0 : -1}
              >
                <UserRound className="h-4 w-4" />
                {t("header.login")}
              </Link>
              <div className="my-2 h-px bg-[color:var(--border)]" />
            </>
          )}

          {/* Language section */}
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)]/70">
            {t("header.language")}
          </div>
          {locales.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              role="menuitem"
              tabIndex={mobileMenuOpen ? 0 : -1}
              onClick={() => handleLocaleChange(code)}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm"
              style={{
                color: "var(--foreground)",
                backgroundColor:
                  currentLocale.code === code ? "var(--primary-soft)" : "",
              }}
            >
              <LocaleFlag
                code={code}
                className="h-3.5 w-5 shrink-0 rounded-[2px]"
              />
              {label}
            </button>
          ))}

          <div className="my-2 h-px bg-[color:var(--border)]" />

          {/* Theme section */}
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)]/70">
            {t("header.theme")}
          </div>
          {themeOptions.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              tabIndex={mobileMenuOpen ? 0 : -1}
              onClick={() => {
                setTheme(value);
                setMobileMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm"
              style={{
                color: "var(--foreground)",
                backgroundColor: theme === value ? "var(--primary-soft)" : "",
              }}
            >
              <Icon className="h-4 w-4" />
              {tTheme(value)}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
