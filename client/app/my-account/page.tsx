"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useRequireAuth } from "@/components/auth/useRequireAuth";
import { updateDisplayName } from "@/lib/auth/client";

export default function MyAccountPage() {
  const { user, refresh, logout, isLoading } = useRequireAuth();
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
      setMessage("Display name updated.");
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
        Loading account...
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
            Account
          </p>
          <h1
            className="mt-2 text-3xl font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            My account
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Keep your profile details up to date.
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
                Email
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
                Member since
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
                Display name
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
                placeholder="Add a display name"
              />
            </div>

            {message && (
              <p
                className="text-sm"
                style={{
                  color: message.includes("updated")
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
                {isSaving ? "Saving..." : "Save changes"}
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
                Logout
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
