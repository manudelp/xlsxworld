"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useAuth } from "@/components/auth/AuthProvider";
import { Link } from "@/i18n/navigation";

export default function SignupPage() {
  const { signup, isAuthenticated, isLoading } = useAuth();
  const t = useTranslations("signup");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isSubmitting) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, isSubmitting, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage(t("passwordsMismatch"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await signup({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });
      router.replace("/?welcome=1");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("genericError"),
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
              htmlFor="signup-display-name"
              style={{ color: "var(--foreground)" }}
            >
              {t("displayName")}
            </label>
            <input
              id="signup-display-name"
              type="text"
              autoComplete="nickname"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
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
              htmlFor="signup-email"
              style={{ color: "var(--foreground)" }}
            >
              {t("email")}
            </label>
            <input
              id="signup-email"
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
              htmlFor="signup-password"
              style={{ color: "var(--foreground)" }}
            >
              {t("password")}
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
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

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="signup-confirm-password"
              style={{ color: "var(--foreground)" }}
            >
              {t("confirmPassword")}
            </label>
            <input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {errorMessage && (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {errorMessage}
            </p>
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
          {t("alreadyHaveAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            {t("logIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
