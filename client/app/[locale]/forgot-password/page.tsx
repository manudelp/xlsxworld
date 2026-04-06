"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { forgotPassword } from "@/lib/auth/client";
import { Link } from "@/i18n/navigation";

export default function ForgotPasswordPage() {
  const t = useTranslations("forgotPassword");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("genericError"),
      );
    } finally {
      setIsSubmitting(false);
    }
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

        {sent ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--success)" }}>
              {t("sent")}
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
                htmlFor="forgot-email"
                style={{ color: "var(--foreground)" }}
              >
                {t("email")}
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                placeholder={t("placeholderEmail")}
                onChange={(e) => setEmail(e.target.value)}
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? t("sending") : t("send")}
            </button>

            <Link
              href="/login"
              className="mt-1 text-center text-sm text-primary hover:underline"
            >
              {t("backToLogin")}
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
