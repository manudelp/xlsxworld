"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, LogOut, Pencil, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { AuthProfile } from "@/lib/auth/types";
import { updateDisplayName } from "@/lib/auth/client";

interface ProfileHeaderProps {
  user: AuthProfile;
  onRefresh: () => Promise<unknown> | void;
  onLogout: () => Promise<void> | void;
}

function initialsFrom(name: string | null, email: string): string {
  const source = (name ?? email).trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source[0].toUpperCase();
}

export default function ProfileHeader({
  user,
  onRefresh,
  onLogout,
}: ProfileHeaderProps) {
  const t = useTranslations("account");
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) setDraft(user.display_name ?? "");
  }, [user.display_name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const memberSince = useMemo(() => {
    if (!user.created_at) return "—";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(user.created_at));
  }, [user.created_at, locale]);

  const displayed = user.display_name?.trim() || user.email;
  const initials = initialsFrom(user.display_name, user.email);

  async function commit() {
    const next = draft.trim();
    if (next === (user.display_name ?? "").trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateDisplayName({ displayName: next });
      await onRefresh();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("displayNameUpdated"));
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(user.display_name ?? "");
    setEditing(false);
    setError("");
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
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
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-contrast, #ffffff)",
          }}
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => void commit()}
                onKeyDown={handleKey}
                disabled={saving}
                placeholder={t("displayNamePlaceholder")}
                aria-label={t("displayName")}
                className="min-w-0 flex-1 rounded-md border px-3 py-2 text-lg font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--foreground)",
                }}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void commit()}
                disabled={saving}
                aria-label={t("saveNameLabel")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-contrast, #ffffff)",
                }}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={cancel}
                disabled={saving}
                aria-label={t("cancel")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--foreground)",
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1
                className="truncate text-2xl font-semibold sm:text-3xl"
                style={{ color: "var(--foreground)" }}
                title={displayed}
              >
                {displayed}
              </h1>
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label={t("editName")}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition hover:opacity-80"
                style={{
                  color: "var(--muted)",
                }}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}

          <p
            className="mt-1 truncate text-sm"
            style={{ color: "var(--muted)" }}
            title={user.email}
          >
            {user.email}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            {t("memberSince")} {memberSince}
          </p>

          {error && (
            <p
              className="mt-2 text-xs"
              style={{ color: "var(--danger)" }}
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void onLogout()}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:opacity-80"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </button>
      </div>
    </section>
  );
}
