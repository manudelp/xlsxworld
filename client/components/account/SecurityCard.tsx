"use client";

import { useState } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { forgotPassword } from "@/lib/auth/client";
import type { AuthProfile } from "@/lib/auth/types";

interface SecurityCardProps {
  user: AuthProfile;
}

function isGoogleLinked(user: AuthProfile): boolean {
  const meta = user.metadata_json ?? {};
  const provider = typeof meta.provider === "string" ? meta.provider : "";
  if (provider.toLowerCase() === "google") return true;
  if (typeof meta.google_id === "string" && meta.google_id.length > 0) {
    return true;
  }
  if (user.avatar_url && user.avatar_url.includes("googleusercontent.com")) {
    return true;
  }
  return false;
}

type ResetState = "idle" | "sending" | "sent" | "error";

export default function SecurityCard({ user }: SecurityCardProps) {
  const t = useTranslations("account.security");
  const [state, setState] = useState<ResetState>("idle");
  const googleLinked = isGoogleLinked(user);

  async function handleChangePassword() {
    if (state === "sending") return;
    setState("sending");
    try {
      await forgotPassword(user.email);
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <section
      className="rounded-2xl border p-6 shadow-sm"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-2)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          className="text-sm font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--muted)" }}
        >
          {t("title")}
        </h2>
        {googleLinked && (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: "var(--primary-soft)",
              color: "var(--primary)",
            }}
          >
            {t("connectedWithGoogle")}
          </span>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <div
          className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
              style={{
                backgroundColor: "var(--primary-soft)",
                color: "var(--primary)",
              }}
              aria-hidden="true"
            >
              <Mail className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p
                className="text-xs"
                style={{ color: "var(--muted)" }}
              >
                {t("emailLabel")}
              </p>
              <p
                className="truncate text-sm font-medium"
                style={{ color: "var(--foreground)" }}
                title={user.email}
              >
                {user.email}
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className="shrink-0 text-xs font-medium transition hover:opacity-80"
            style={{ color: "var(--primary)" }}
            title={t("changeEmailHint")}
          >
            {t("changeEmail")}
          </Link>
        </div>

        <div
          className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
              style={{
                backgroundColor: "var(--primary-soft)",
                color: "var(--primary)",
              }}
              aria-hidden="true"
            >
              <KeyRound className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {t("passwordLabel")}
              </p>
              <p
                className="font-mono text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {t("passwordMasked")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleChangePassword()}
            disabled={state === "sending" || state === "sent"}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-60"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-2)",
              color: "var(--foreground)",
            }}
          >
            {state === "sending" && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            {state === "sending"
              ? t("sendingReset")
              : state === "sent"
              ? t("resetSent")
              : t("changePassword")}
          </button>
        </div>

        {state === "error" && (
          <p
            className="text-xs"
            role="alert"
            style={{ color: "var(--danger)" }}
          >
            {t("resetError")}
          </p>
        )}
      </div>
    </section>
  );
}
