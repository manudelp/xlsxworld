"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setStatus("error");
      setStatusMessage("Please complete all fields before submitting.");
      return;
    }

    if (!turnstileToken) {
      setStatus("error");
      setStatusMessage("Please complete the CAPTCHA.");
      return;
    }

    setStatus("sending");
    setStatusMessage("");

    try {
      const response = await fetch("/api/proxy/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
          cf_turnstile_response: turnstileToken,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { detail?: string; ok?: boolean }
        | null;

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.detail || "Unable to send your message right now.");
      }

      setStatus("sent");
      setStatusMessage(payload?.detail || "Thanks! Your message has been sent.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to send your message right now.",
      );
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="text-3xl font-semibold mb-3 flex items-center gap-2 text-foreground">
        <span>Contact XLSX</span>
        <Image
          src="/icon.svg"
          alt="XLSX World"
          width={32}
          height={32}
          className="inline-block"
        />
        <span>World</span>
      </h1>
      <p className="mb-7 text-base leading-relaxed text-muted">
        We&apos;d love to hear from you. Send us feedback, ask a question, or
        report a bug.
      </p>

      <div className="bg-surface-2 border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 right-0 top-0 h-1 bg-primary/30" />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium text-foreground"
              >
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={status === "sending"}
                className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted shadow-sm transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={status === "sending"}
                className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted shadow-sm transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none"
              />
              <p className="mt-1 text-xs text-primary">
                We will only use this to reply to you.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-sm font-medium text-foreground"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="What can we help with?"
              disabled={status === "sending"}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted shadow-sm transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
              onSuccess={(token) => setTurnstileToken(token)}
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:!bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-offset-2 focus:ring-offset-background hover:cursor-pointer"
            >
              {status === "sending" ? "Sending..." : "Send Message"}
            </button>

            <div>
              {status === "sent" && (
                <p className="text-sm text-success">
                  {statusMessage || "Thanks! Your message has been sent."}
                </p>
              )}
              {status === "error" && (
                <p className="text-sm text-danger">
                  {statusMessage || "Unable to send your message right now."}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      <section className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-primary-soft p-5">
          <h2 className="text-lg font-medium text-foreground">FAQ</h2>
          <p className="text-sm text-muted mt-1">
            Browse our{" "}
            <Link
              href="/faq"
              className="text-primary hover:underline font-medium"
            >
              frequently asked questions
            </Link>{" "}
            to find quick answers to common issues.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-primary-soft p-5">
          <h2 className="text-lg font-medium text-foreground">
            Join the community
          </h2>
          <p className="text-sm text-muted mt-1">
            Share feedback or feature requests in the app&apos;s issue tracker
            in the repository.
          </p>
        </div>
      </section>
    </main>
  );
}
