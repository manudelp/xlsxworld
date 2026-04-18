"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { api, ApiRequestError } from "@/lib/api";

export default function FooterLaunchSignup() {
  const t = useTranslations("footer");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [feedback, setFeedback] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setStatus("error");
      setFeedback(t("launchSignupInvalid"));
      return;
    }

    setStatus("submitting");
    setFeedback("");

    try {
      const payload = await api.postJson<{ detail?: string; ok?: boolean }>(
        "/api/v1/launch-updates",
        { email: normalizedEmail },
      );
      if (payload?.ok === false) {
        throw new Error(payload.detail || t("launchSignupError"));
      }

      setStatus("success");
      setFeedback(payload?.detail || t("launchSignupSuccess"));
      setEmail("");
    } catch (error) {
      setStatus("error");
      if (error instanceof ApiRequestError || error instanceof Error) {
        setFeedback(error.message);
      } else {
        setFeedback(t("launchSignupError"));
      }
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-white">
        {t("launchSignupTitle")}
      </h3>

      <form onSubmit={handleSubmit} className="mt-2.5 flex gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={status === "submitting"}
          placeholder={t("launchSignupPlaceholder")}
          aria-label={t("launchSignupPlaceholder")}
          className="w-full rounded-md border border-white/20 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-500 outline-none focus:border-white focus:ring-2 focus:ring-white/35 disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="shrink-0 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-[#1e1e24] transition-colors hover:bg-white/90 disabled:opacity-70"
        >
          {status === "submitting"
            ? t("launchSignupSubmitting")
            : t("launchSignupAction")}
        </button>
      </form>

      {(status === "success" || status === "error") && (
        <p
          className={`mt-1.5 text-xs ${status === "success" ? "text-emerald-300" : "text-rose-300"}`}
          role="status"
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
