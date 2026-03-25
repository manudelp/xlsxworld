"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("error");
      return;
    }

    // Here you can hook a backend API endpoint, e.g. /api/contact, if/when available.
    setStatus("sent");
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="text-3xl font-semibold mb-3 flex items-center gap-2">
        <span>Contact XLSX</span>
        <Image src="/icon.svg" alt="XLSX World" width={32} height={32} className="inline-block" />
        <span>World</span>
      </h1>
      <p className="mb-7 text-gray-700 text-base leading-relaxed">
        We&apos;d love to hear from you. Send us feedback, ask a question, or
        report a bug.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 right-0 top-0 h-1 bg-indigo-600/20" />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium text-gray-700"
              >
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
              <p className="mt-1 text-xs text-indigo-600">
                We will only use this to reply to you.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-sm font-medium text-gray-700"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="What can we help with?"
              className="mt-1 block w-full min-h-[140px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-indigo-700 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:cursor-pointer"
            >
              Send Message
            </button>

            <div>
              {status === "sent" && (
                <p className="text-sm text-green-600">
                  Thanks! Your message has been queued for review.
                </p>
              )}
              {status === "error" && (
                <p className="text-sm text-red-600">
                  Please complete all fields before submitting.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      <section className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
          <h2 className="text-lg font-medium text-indigo-700">Support</h2>
          <p className="text-sm text-indigo-700/90 mt-1">
            Email us at{" "}
            <a
              className="text-indigo-800 hover:underline font-medium"
              href="mailto:support@xlsxworld.com"
            >
              support@xlsxworld.com
            </a>
          </p>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
          <h2 className="text-lg font-medium text-indigo-700">
            Join the community
          </h2>
          <p className="text-sm text-indigo-700/90 mt-1">
            Share feedback or feature requests in the app&apos;s issue tracker in the repository.
          </p>
        </div>
      </section>
    </main>
  );
}
