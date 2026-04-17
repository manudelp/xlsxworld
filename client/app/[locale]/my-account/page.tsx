"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { useTranslations } from "next-intl";

import { useRequireAuth } from "@/components/auth/useRequireAuth";
import { Link } from "@/i18n/navigation";
import { updateDisplayName } from "@/lib/auth/client";

export default function MyAccountPage() {
  const { user, refresh, logout, isLoading } = useRequireAuth();
  const t = useTranslations("account");
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDisplayName(user?.display_name ?? "");
  }, [user?.display_name]);

  const memberSince = useMemo(() => {
    if (!user?.created_at) {
      return "-";
    }

    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(user.created_at));
  }, [user?.created_at]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      await updateDisplayName({ displayName });
      await refresh();
      setMessage(t("displayNameUpdated"));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your profile right now.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
    router.refresh();
  }

  if (isLoading || !user) {
    return (
      <div
        className="mx-auto max-w-3xl px-4 py-16 text-sm"
        style={{ color: "var(--muted)" }}
      >
        {t("loadingAccount")}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div>
          <p
            className="text-xs uppercase tracking-[0.16em]"
            style={{ color: "var(--muted)" }}
          >
            {t("label")}
          </p>
          <h1
            className="mt-2 text-3xl font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {t("myAccount")}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            {t("keepProfileUpdated")}
          </p>
        </div>

        <section
          className="rounded-2xl border p-6 shadow-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div
                className="text-xs uppercase tracking-[0.12em]"
                style={{ color: "var(--muted)" }}
              >
                {t("email")}
              </div>
              <div
                className="mt-1 text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {user.email}
              </div>
            </div>
            <div>
              <div
                className="text-xs uppercase tracking-[0.12em]"
                style={{ color: "var(--muted)" }}
              >
                {t("memberSince")}
              </div>
              <div
                className="mt-1 text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {memberSince}
              </div>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="display-name"
                style={{ color: "var(--foreground)" }}
              >
                {t("displayName")}
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--foreground)",
                }}
                placeholder={t("displayNamePlaceholder")}
              />
            </div>

            {message && (
              <p
                className="text-sm"
                style={{
                  color: message === t("displayNameUpdated")
                    ? "var(--success)"
                    : "var(--danger)",
                }}
              >
                {message}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {isSaving ? t("saving") : t("saveChanges")}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-black/5"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--foreground)",
                }}
              >
                {t("logout")}
              </button>
            </div>
          </form>
        </section>

        <Link
          href="/my-account/history"
          className="flex items-start gap-4 rounded-2xl border p-6 shadow-sm transition hover:opacity-90"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
          }}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
            style={{
              backgroundColor: "var(--surface)",
              color: "var(--foreground)",
            }}
            aria-hidden="true"
          >
            <History className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span
              className="block text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {t("viewHistory")}
            </span>
            <span
              className="mt-1 block text-xs"
              style={{ color: "var(--muted)" }}
            >
              {t("viewHistorySubtitle")}
            </span>
          </span>
        </Link>
      </div>
    </main>
  );
}
