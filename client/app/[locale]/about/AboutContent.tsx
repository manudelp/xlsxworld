"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Globe, Zap, Shield, Heart } from "lucide-react";

const FuturisticGlobe = dynamic(() => import("./FuturisticGlobe"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] w-[280px] sm:h-[320px] sm:w-[320px] flex items-center justify-center">
      <div
        className="h-32 w-32 rounded-full animate-pulse"
        style={{ backgroundColor: "var(--primary-soft)" }}
      />
    </div>
  ),
});

export default function AboutContent() {
  const t = useTranslations("about");

  return (
    <main className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="text-center mb-20 animate-fade-in-up">
        <div className="relative inline-flex items-center justify-center mb-6">
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-20 animate-pulse-slow"
            style={{ backgroundColor: "var(--primary)" }}
          />
          <FuturisticGlobe />
        </div>
        <h1
          className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 animate-fade-in-up"
          style={{ color: "var(--foreground)", animationDelay: "200ms" }}
        >
          {t("heading")}
        </h1>
        <p
          className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
          style={{ color: "var(--muted)", animationDelay: "400ms" }}
        >
          {t("tagline")}
        </p>
      </section>

      {/* Vision & Mission */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
        <div
          className="relative rounded-2xl border p-8 overflow-hidden animate-fade-in-up hover:scale-[1.02] transition-transform duration-300"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            animationDelay: "500ms",
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: "var(--primary)" }}
          />
          <div
            className="inline-flex items-center justify-center h-10 w-10 rounded-lg mb-4"
            style={{ backgroundColor: "var(--primary-soft)" }}
          >
            <Globe className="h-5 w-5" style={{ color: "var(--primary)" }} />
          </div>
          <h2
            className="text-xl font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            {t("visionTitle")}
          </h2>
          <p className="leading-relaxed" style={{ color: "var(--muted)" }}>
            {t("visionText")}
          </p>
        </div>

        <div
          className="relative rounded-2xl border p-8 overflow-hidden animate-fade-in-up hover:scale-[1.02] transition-transform duration-300"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            animationDelay: "650ms",
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: "var(--primary)" }}
          />
          <div
            className="inline-flex items-center justify-center h-10 w-10 rounded-lg mb-4"
            style={{ backgroundColor: "var(--primary-soft)" }}
          >
            <Zap className="h-5 w-5" style={{ color: "var(--primary)" }} />
          </div>
          <h2
            className="text-xl font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            {t("missionTitle")}
          </h2>
          <p className="leading-relaxed" style={{ color: "var(--muted)" }}>
            {t("missionText")}
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="mb-20">
        <h2
          className="text-2xl font-semibold text-center mb-10 animate-fade-in-up"
          style={{ color: "var(--foreground)", animationDelay: "800ms" }}
        >
          {t("valuesTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Zap, key: "speed" },
            { icon: Shield, key: "privacy" },
            { icon: Heart, key: "simplicity" },
          ].map(({ icon: Icon, key }, i) => (
            <div
              key={key}
              className="text-center rounded-xl border p-6 animate-fade-in-up hover:scale-[1.03] transition-transform duration-300"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                animationDelay: `${900 + i * 150}ms`,
              }}
            >
              <div
                className="inline-flex items-center justify-center h-12 w-12 rounded-full mb-4"
                style={{ backgroundColor: "var(--primary-soft)" }}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: "var(--primary)" }}
                />
              </div>
              <h3
                className="font-semibold mb-2"
                style={{ color: "var(--foreground)" }}
              >
                {t(`values.${key}.title`)}
              </h3>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {t(`values.${key}.text`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section
        className="rounded-2xl border p-8 sm:p-10 text-center animate-fade-in-up"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
          animationDelay: "1300ms",
        }}
      >
        <h2
          className="text-2xl font-semibold mb-4"
          style={{ color: "var(--foreground)" }}
        >
          {t("storyTitle")}
        </h2>
        <p
          className="max-w-2xl mx-auto leading-relaxed"
          style={{ color: "var(--muted)" }}
        >
          {t("storyText")}
        </p>
      </section>
    </main>
  );
}
