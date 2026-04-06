"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { resetPassword } from "@/lib/auth/client";
import { api } from "@/lib/api";
import { Link } from "@/i18n/navigation";

export default function ResetPasswordPage() {
  const t = useTranslations("resetPassword");
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    async function resolve() {
      // Option 1: token_hash in query params (custom email link, prefetch-safe)
      const tokenHash = searchParams.get("token_hash");
      if (tokenHash) {
        try {
          const res = await api.postJson<{ access_token: string }>(
            "/api/auth/verify-recovery",
            { token_hash: tokenHash, type: "recovery" },
          );
          setAccessToken(res.access_token);
        } catch {
          setAccessToken(null);
        }
        setVerifying(false);
        return;
      }

      // Option 2: access_token in hash fragment (default Supabase redirect)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const token = params.get("access_token");
      const type = params.get("type");
      if (token && type === "recovery") {
        setAccessToken(token);
      }
      setVerifying(false);
    }

    resolve();
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage(t("passwordsMismatch"));
      return;
    }

    if (!accessToken) {
      setErrorMessage(t("invalidLink"));
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(accessToken, password);
      setDone(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("genericError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (verifying) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin"
          style={{ color: "var(--primary)" }}
        />
      </div>
    );
  }

  if (!accessToken && !done) {
    return (
      <main className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4 py-10">
        <div
          className="w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
          }}
        >
          <div className="mb-6 flex items-center gap-2">
            <Image src="/icon.svg" alt="XLSX World" width={28} height={28} />
            <span
              className="text-lg font-bold"
              style={{ color: "var(--foreground)" }}
            >
              XLSX World
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {t("invalidLink")}
          </p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {t("requestNewLink")}
          </Link>
          <Link
            href="/login"
            className="mt-2 block text-center text-sm text-primary hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface-2)",
        }}
      >
        <div className="mb-6 flex items-center gap-2">
          <Image src="/icon.svg" alt="XLSX World" width={28} height={28} />
          <span
            className="text-lg font-bold"
            style={{ color: "var(--foreground)" }}
          >
            XLSX World
          </span>
        </div>

        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {t("title")}
        </h1>
        <p className="mt-1 mb-5 text-sm" style={{ color: "var(--muted)" }}>
          {t("subtitle")}
        </p>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--success)" }}>
              {t("success")}
            </p>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {t("backToLogin")}
            </Link>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                htmlFor="reset-password"
                style={{ color: "var(--foreground)" }}
              >
                {t("newPassword")}
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
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

            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                htmlFor="reset-confirm-password"
                style={{ color: "var(--foreground)" }}
              >
                {t("confirmPassword")}
              </label>
              <input
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                placeholder={t("placeholderConfirm")}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--foreground)",
                }}
              />
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

            {errorMessage && (
              <p className="text-sm" style={{ color: "var(--danger)" }}>
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? t("resetting") : t("reset")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
