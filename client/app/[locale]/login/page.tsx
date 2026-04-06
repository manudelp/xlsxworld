"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toolItems } from "@/components/tools/toolsData";
import { Link } from "@/i18n/navigation";

function resolveNextPath(nextParam: string | null): string {
  if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
    return nextParam;
  }
  return "/";
}

type Mode = "login" | "register";

export default function AuthPage() {
  const { login, signup, isAuthenticated, isLoading } = useAuth();
  const t = useTranslations("auth");
  const tTools = useTranslations("toolData");
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode: Mode =
    searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<Mode>(initialMode);

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [highlightedSlugs] = useState(() => {
    const shuffled = [...toolItems].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10).map((t) => t.slug);
  });
  const remainingTools = toolItems.length - highlightedSlugs.length;

  const emailSuggestions = getEmailSuggestions(email);

  const nextPath = resolveNextPath(searchParams.get("next"));

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isSubmitting) {
      router.replace(nextPath);
    }
  }, [isAuthenticated, isLoading, isSubmitting, nextPath, router]);

  function switchMode(next: Mode) {
    setMode(next);
    setErrorMessage("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (mode === "register" && password !== confirmPassword) {
      setErrorMessage(t("passwordsMismatch"));
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login({ email: email.trim(), password, remember: rememberMe });
        router.replace(nextPath);
      } else {
        await signup({
          email: email.trim(),
          password,
          displayName: displayName.trim() || undefined,
          remember: rememberMe,
        });
        router.replace("/?welcome=1");
      }
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : t("genericError");
      if (mode === "login") {
        const lower = msg.toLowerCase();
        const isInvalid =
          lower.includes("invalid") ||
          lower.includes("not found") ||
          lower.includes("authentication failed");
        setErrorMessage(isInvalid ? t("invalidCredentials") : msg);
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin"
          style={{ color: "var(--primary)" }}
        />
      </div>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-60px)] items-center lg:mx-auto lg:max-w-5xl lg:px-4 lg:py-8">
      <div
        className="flex w-full min-h-[calc(100vh-60px)] lg:min-h-0 lg:h-[680px] lg:overflow-hidden lg:rounded-2xl lg:border lg:shadow-sm"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface-2)",
        }}
      >
        {/* Left branding panel */}
        <div
          className="hidden w-[45%] flex-col justify-between p-8 lg:flex"
          style={{
            background:
              "linear-gradient(160deg, var(--world-900) 0%, var(--world-700) 100%)",
            color: "#fff",
          }}
        >
          <div>
            <div className="mb-6 flex items-center gap-2">
              <span className="text-2xl font-bold">XLSX</span>
              <Image src="/icon.svg" alt="XLSX World" width={40} height={40} />
              <span className="text-2xl font-bold">World</span>
            </div>
            <h2 className="mb-2 text-xl font-semibold leading-snug">
              {t("brandHeading")}
            </h2>
            <p className="text-sm opacity-80">{t("brandSubheading")}</p>
          </div>

          <div className="mt-8 space-y-5">
            <p className="text-sm font-medium opacity-90">
              {t("brandValueProp")}
            </p>

            <div className="flex flex-wrap gap-2">
              {highlightedSlugs.map((slug) => {
                const tool = toolItems.find((item) => item.slug === slug);
                if (!tool) return null;
                return (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.12)",
                      color: "#fff",
                    }}
                  >
                    <span>{tool.icon}</span>
                    {tTools(`${slug}.title`)}
                  </span>
                );
              })}
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: "rgba(255,255,255,0.22)",
                  color: "#fff",
                }}
              >
                +{remainingTools} {t("moreTools")}
              </span>
            </div>

            <p className="text-xs opacity-60">{t("brandPrivacy")}</p>
          </div>

          <div
            className="mt-6 rounded-lg px-4 py-3"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            <p className="text-sm font-semibold">{t("pricingTitle")}</p>
            <p className="mt-1 text-xs opacity-75">{t("pricingDescription")}</p>
          </div>

          <p className="mt-6 text-xs opacity-60">{t("brandFooter")}</p>
        </div>

        {/* Right form panel */}
        <div className="flex w-full flex-col px-5 py-8 sm:px-8 sm:py-10 lg:w-[55%] lg:overflow-y-auto lg:p-10 lg:scrollbar-themed">
          <div className="my-auto">
            {/* Mobile logo */}
            <div className="mb-6 flex items-center gap-2 lg:hidden">
              <Image src="/icon.svg" alt="XLSX World" width={32} height={32} />
              <span
                className="text-lg font-bold"
                style={{ color: "var(--foreground)" }}
              >
                XLSX World
              </span>
            </div>

            {/* Mode tabs */}
            <div
              className="mb-5 flex rounded-lg border p-1"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
              }}
            >
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className="flex-1 rounded-md px-4 py-2 text-sm font-medium transition"
                  style={{
                    backgroundColor:
                      mode === m ? "var(--primary)" : "transparent",
                    color:
                      mode === m ? "var(--primary-contrast)" : "var(--muted)",
                  }}
                >
                  {t(m === "login" ? "tabLogin" : "tabRegister")}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <h1
                className="text-xl font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {mode === "login" ? t("loginTitle") : t("registerTitle")}
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                {mode === "login" ? t("loginSubtitle") : t("registerSubtitle")}
              </p>
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              {/* Google sign-in */}
              <a
                href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition hover:opacity-90"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--foreground)",
                }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t("continueWithGoogle")}
              </a>

              <div
                className="flex items-center gap-3"
                style={{ color: "var(--muted)" }}
              >
                <div
                  className="h-px flex-1"
                  style={{ backgroundColor: "var(--border)" }}
                />
                <span className="text-xs">{t("orDivider")}</span>
                <div
                  className="h-px flex-1"
                  style={{ backgroundColor: "var(--border)" }}
                />
              </div>
              <div
                className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                style={{
                  gridTemplateRows: mode === "register" ? "1fr" : "0fr",
                }}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-1.5 px-0.5 pb-0.5">
                    <label
                      className="text-sm font-medium"
                      htmlFor="auth-display-name"
                      style={{ color: "var(--foreground)" }}
                    >
                      {t("displayName")}
                    </label>
                    <input
                      id="auth-display-name"
                      type="text"
                      autoComplete="nickname"
                      tabIndex={mode === "register" ? 0 : -1}
                      value={displayName}
                      placeholder={t("placeholderDisplayName")}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--surface)",
                        color: "var(--foreground)",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="relative flex flex-col gap-1.5">
                <label
                  className="text-sm font-medium"
                  htmlFor="auth-email"
                  style={{ color: "var(--foreground)" }}
                >
                  {t("email")}
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  placeholder={t("placeholderEmail")}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setTimeout(() => setEmailFocused(false), 150)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface)",
                    color: "var(--foreground)",
                  }}
                />
                {emailFocused && emailSuggestions.length > 0 && (
                  <ul
                    className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-md border shadow-md"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--surface-2)",
                    }}
                  >
                    {emailSuggestions.map((suggestion) => (
                      <li key={suggestion}>
                        <button
                          type="button"
                          className="w-full px-3 py-1.5 text-left text-sm transition-colors"
                          style={{ color: "var(--foreground)" }}
                          onMouseDown={() => setEmail(suggestion)}
                        >
                          {suggestion}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-sm font-medium"
                  htmlFor="auth-password"
                  style={{ color: "var(--foreground)" }}
                >
                  {t("password")}
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    value={password}
                    placeholder={t("placeholderPassword")}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--surface)",
                      color: "var(--foreground)",
                    }}
                  />
                  {password.length > 0 && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5"
                      style={{ color: "var(--muted)" }}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Password strength — register only */}
              <div
                className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                style={{
                  gridTemplateRows:
                    mode === "register" && password.length > 0 ? "1fr" : "0fr",
                }}
              >
                <div className="overflow-hidden">
                  <PasswordStrength password={password} t={t} />
                </div>
              </div>

              <div
                className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                style={{
                  gridTemplateRows: mode === "register" ? "1fr" : "0fr",
                }}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-1.5 px-0.5 pb-0.5">
                    <label
                      className="text-sm font-medium"
                      htmlFor="auth-confirm-password"
                      style={{ color: "var(--foreground)" }}
                    >
                      {t("confirmPassword")}
                    </label>
                    <div className="relative">
                      <input
                        id="auth-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required={mode === "register"}
                        tabIndex={mode === "register" ? 0 : -1}
                        minLength={8}
                        value={confirmPassword}
                        placeholder={t("placeholderConfirmPassword")}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                        }}
                      />
                      {confirmPassword.length > 0 && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5"
                          style={{ color: "var(--muted)" }}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                    {confirmPassword.length > 0 && (
                      <p
                        className="text-xs"
                        style={{
                          color:
                            password === confirmPassword
                              ? "var(--success)"
                              : "var(--danger)",
                        }}
                      >
                        {password === confirmPassword
                          ? t("passwordsMatch")
                          : t("passwordsMismatch")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Remember me & forgot password */}
              <div className="flex items-center justify-between">
                <label
                  className="flex items-center gap-2 text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border accent-primary"
                    style={{ borderColor: "var(--border)" }}
                  />
                  {t("rememberMe")}
                </label>
                {mode === "login" && (
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    {t("forgotPassword")}
                  </Link>
                )}
              </div>

              {errorMessage && (
                <p className="text-sm" style={{ color: "var(--danger)" }}>
                  {errorMessage}
                </p>
              )}

              <p
                className="text-center text-xs leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                {mode === "register" ? t("consentRegister") : t("consentLogin")}{" "}
                <Link href="/terms" className="underline hover:text-primary">
                  {t("termsLink")}
                </Link>{" "}
                {t("consentAnd")}{" "}
                <Link href="/privacy" className="underline hover:text-primary">
                  {t("privacyLink")}
                </Link>
                {mode === "register" ? ". " + t("ageRequirement") : "."}
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting
                  ? t(mode === "login" ? "loggingIn" : "creatingAccount")
                  : t(mode === "login" ? "logIn" : "createAccount")}
              </button>

              <p
                className="text-center text-xs"
                style={{ color: "var(--muted)" }}
              >
                {t("pricingInline")}
              </p>
            </form>

            <p
              className="mt-3 text-center text-sm"
              style={{ color: "var(--muted)" }}
            >
              {mode === "login" ? t("noAccount") : t("hasAccount")}{" "}
              <button
                type="button"
                onClick={() =>
                  switchMode(mode === "login" ? "register" : "login")
                }
                className="font-medium text-primary hover:underline"
              >
                {mode === "login" ? t("tabRegister") : t("tabLogin")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

const EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "yahoo.com",
  "hotmail.com",
  "icloud.com",
  "protonmail.com",
];

function getEmailSuggestions(email: string): string[] {
  if (!email.includes("@")) return [];
  const [local, partial] = email.split("@");
  if (!local || !partial)
    return partial === "" ? EMAIL_DOMAINS.map((d) => `${local}@${d}`) : [];
  // If they already typed a full valid-looking domain, no suggestions
  if (partial.includes(".") && partial.length > 3) return [];
  return EMAIL_DOMAINS.filter(
    (d) => d.startsWith(partial) && d !== partial,
  ).map((d) => `${local}@${d}`);
}

type PasswordRule = { key: string; test: (p: string) => boolean };

const PASSWORD_RULES: PasswordRule[] = [
  { key: "ruleLength", test: (p) => p.length >= 8 },
  { key: "ruleLowercase", test: (p) => /[a-z]/.test(p) },
  { key: "ruleUppercase", test: (p) => /[A-Z]/.test(p) },
  { key: "ruleNumber", test: (p) => /\d/.test(p) },
  { key: "ruleSpecial", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

function PasswordStrength({
  password,
  t,
}: {
  password: string;
  t: (key: string) => string;
}) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const ratio = passed / PASSWORD_RULES.length;

  const barColor =
    ratio <= 0.4
      ? "var(--danger)"
      : ratio <= 0.7
        ? "var(--warning)"
        : "var(--success)";

  return (
    <div className="flex flex-col gap-2 pb-1">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${ratio * 100}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <span
              key={rule.key}
              className="inline-flex items-center gap-1 text-xs transition-colors duration-150"
              style={{ color: ok ? "var(--success)" : "var(--muted)" }}
            >
              <span
                className="inline-block text-[10px] leading-none transition-transform duration-150"
                style={{ transform: ok ? "scale(1.1)" : "scale(1)" }}
              >
                {ok ? "✓" : "○"}
              </span>
              {t(rule.key)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
