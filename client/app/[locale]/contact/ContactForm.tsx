"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";

import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { Link } from "@/i18n/navigation";

export default function ContactForm() {
  const { user } = useAuth();
  const t = useTranslations("contact");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setName(user.display_name || "");
    }
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setStatus("error");
      setStatusMessage(t("fieldsRequired"));
      return;
    }

    if (!turnstileToken) {
      setStatus("error");
      setStatusMessage(t("captchaRequired"));
      return;
    }

    setStatus("sending");
    setStatusMessage("");

    try {
      const payload = await api.postJson<{ detail?: string; ok?: boolean }>(
        "/api/v1/contact",
        {
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
          cf_turnstile_response: turnstileToken,
        },
      );

      if (payload?.ok === false) {
        throw new Error(payload?.detail || t("error"));
      }

      setStatus("sent");
      setStatusMessage(payload?.detail || t("sent"));
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : t("error"));
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="text-3xl font-semibold mb-3 flex items-center gap-2 text-foreground">
        <span>{t("title")}</span>
        <Image
          src="/icon.svg"
          alt="XLSX World"
          width={32}
          height={32}
          className="inline-block"
        />
        <span>{t("titleSuffix")}</span>
      </h1>
      <p className="mb-7 text-base leading-relaxed text-muted">
        {t("subtitle")}
      </p>

      <div className="bg-surface-2 border border-border rounded-xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 right-0 top-0 h-1 bg-primary/30" />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium text-foreground"
              >
                {t("name")}
              </label>
              <input
                id="contact-name"
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                disabled={status === "sending" || !!user?.display_name}
                className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted shadow-sm transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium text-foreground"
              >
                {t("email")}
              </label>
              <input
                id="contact-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                disabled={status === "sending" || !!user}
                className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted shadow-sm transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none disabled:opacity-60"
              />
              <p className="mt-1 text-xs text-primary">{t("emailNote")}</p>
            </div>
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-sm font-medium text-foreground"
            >
              {t("message")}
            </label>
            <textarea
              id="contact-message"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              maxLength={2000}
              placeholder={t("messagePlaceholder")}
              disabled={status === "sending"}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted shadow-sm transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Turnstile
              siteKey={
                process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
                "1x00000000000000000000AA"
              }
              onSuccess={(token) => setTurnstileToken(token)}
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:!bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-2 focus:ring-offset-background hover:cursor-pointer"
            >
              {status === "sending" ? t("sending") : t("send")}
            </button>

            <div>
              {status === "sent" && (
                <p className="text-sm text-success">
                  {statusMessage || t("sent")}
                </p>
              )}
              {status === "error" && (
                <p className="text-sm text-danger">
                  {statusMessage || t("error")}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      <section className="mt-10 grid gap-5 sm:grid-cols-2">
        <div
          className="rounded-xl border border-border p-5"
          style={{ backgroundColor: "color-mix(in srgb, var(--background) 88%, var(--primary) 12%)" }}
        >
          <h2 className="text-lg font-medium text-foreground">
            {t("faqTitle")}
          </h2>
          <p className="text-sm text-muted mt-1">
            {t.rich("faqDescription", {
              link: (chunks) => (
                <Link
                  href="/faq"
                  className="text-primary hover:underline font-medium"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>

        <div
          className="rounded-xl border border-border p-5"
          style={{ backgroundColor: "color-mix(in srgb, var(--background) 88%, var(--primary) 12%)" }}
        >
          <h2 className="text-lg font-medium text-foreground">
            {t("communityTitle")}
          </h2>
          <p className="text-sm text-muted mt-1">{t("communityDescription")}</p>
        </div>
      </section>
    </main>
  );
}
