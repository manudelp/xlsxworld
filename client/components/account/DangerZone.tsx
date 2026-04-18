"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { AuthProfile } from "@/lib/auth/types";

interface DangerZoneProps {
  user: AuthProfile;
}

export default function DangerZone({ user }: DangerZoneProps) {
  const t = useTranslations("account.dangerZone");
  const tAccount = useTranslations("account");
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [attempted, setAttempted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openModal() {
    setTyped("");
    setAttempted(false);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const emailMatches = typed.trim().toLowerCase() === user.email.toLowerCase();

  function handleConfirm() {
    setAttempted(true);
    if (!emailMatches) return;
    // No delete endpoint — route user to support to complete deletion.
    // Modal stays open showing the support message.
  }

  return (
    <>
      <section
        className="rounded-2xl border p-6 shadow-sm"
        style={{
          borderColor: "var(--danger)",
          backgroundColor: "var(--surface-2)",
        }}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
            style={{
              backgroundColor: "var(--danger-soft)",
              color: "var(--danger)",
            }}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              className="text-sm font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--danger)" }}
            >
              {t("title")}
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              {t("description")}
            </p>
            <button
              type="button"
              onClick={openModal}
              className="mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:opacity-80"
              style={{
                borderColor: "var(--danger)",
                backgroundColor: "transparent",
                color: "var(--danger)",
              }}
            >
              {t("deleteAccount")}
            </button>
          </div>
        </div>
      </section>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-xl"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-2)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <h3
                id="delete-account-title"
                className="text-lg font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {t("modalTitle")}
              </h3>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("modalTitle")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md"
                style={{ color: "var(--muted)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              {t("modalBody")}
            </p>

            <label
              htmlFor="delete-email-confirm"
              className="mt-4 block text-xs font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {t("confirmLabel")}
            </label>
            <input
              ref={inputRef}
              id="delete-email-confirm"
              type="email"
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setAttempted(false);
              }}
              placeholder={t("confirmPlaceholder")}
              autoComplete="off"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                borderColor:
                  attempted && !emailMatches
                    ? "var(--danger)"
                    : "var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--foreground)",
              }}
            />
            {attempted && !emailMatches && (
              <p
                className="mt-1 text-xs"
                role="alert"
                style={{ color: "var(--danger)" }}
              >
                {t("emailMismatch")}
              </p>
            )}

            {attempted && emailMatches && (
              <div
                className="mt-4 rounded-lg border p-3 text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--danger-soft)",
                  color: "var(--foreground)",
                }}
              >
                {t("needsSupport")}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition hover:opacity-80"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--foreground)",
                }}
              >
                {tAccount("cancel")}
              </button>
              {attempted && emailMatches ? (
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold transition hover:opacity-90"
                  style={{
                    backgroundColor: "var(--danger)",
                    color: "#ffffff",
                  }}
                >
                  {t("contactUs")}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!typed.trim()}
                  className="inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--danger)",
                    color: "#ffffff",
                  }}
                >
                  {t("confirmButton")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
