"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useAuth } from "@/components/auth/AuthProvider";
import { Link } from "@/i18n/navigation";

function resolveNextPath(nextParam: string | null): string {
  if (nextParam && nextParam.startsWith("/")) {
    return nextParam;
  }
  return "/";
}

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const t = useTranslations("login");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  const nextPath = resolveNextPath(searchParams.get("next"));

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isSubmitting) {
      router.replace(nextPath);
    }
  }, [isAuthenticated, isLoading, isSubmitting, nextPath, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await login({ email: email.trim(), password });
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unable to log in right now.";
      const lower = msg.toLowerCase();
      const isInvalidCredentials =
        lower.includes("invalid email") ||
        lower.includes("invalid credentials") ||
        lower.includes("invalid password") ||
        lower.includes("not found") ||
        lower.includes("authentication failed");
      setShowSignupPrompt(isInvalidCredentials);
      setErrorMessage(
        isInvalidCredentials ? t("invalidCredentials") : msg,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || isAuthenticated) {
    return (
      <div
        className="mx-auto max-w-md px-4 py-16 text-sm"
        style={{ color: "var(--muted)" }}
      >
        {t("loading")}
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-60px)] max-w-md items-center px-4 py-10">
      <div
        className="w-full rounded-2xl border p-6 shadow-sm sm:p-8"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface-2)",
        }}
      >
        <div className="mb-6 space-y-2">
          <p
            className="text-xs uppercase tracking-[0.16em]"
            style={{ color: "var(--muted)" }}
          >
            {t("title")}
          </p>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {t("title")}
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {t("subtitle")}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="login-email"
              style={{ color: "var(--foreground)" }}
            >
              {t("email")}
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="login-password"
              style={{ color: "var(--foreground)" }}
            >
              {t("password")}
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {errorMessage && (
            <div className="space-y-2">
              <p className="text-sm" style={{ color: "var(--danger)" }}>
                {errorMessage}
              </p>
              {showSignupPrompt && (
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {t("dontHaveAccount")}{" "}
                  <Link
                    href={`/signup${email ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {t("createOneNow")}
                  </Link>
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </button>
        </form>

        <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
          {t("noAccount")}{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            {t("signUp")}
          </Link>
        </p>
      </div>
    </main>
  );
}
