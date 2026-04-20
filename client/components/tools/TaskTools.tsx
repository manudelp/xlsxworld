"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  taskCategories,
  getTaskTools,
  type TaskTool,
} from "@/components/tools/taskToolsData";

export default function TaskTools() {
  const t = useTranslations("taskTools");
  const tTool = useTranslations("tools");
  const [query, setQuery] = useState("");

  const lowerQuery = query.toLowerCase().trim();

  const sections = useMemo(
    () =>
      taskCategories.map((cat) => ({
        id: cat.id,
        tools: getTaskTools(cat),
      })),
    [],
  );

  const filtered = useMemo(() => {
    if (!lowerQuery) return sections;
    return sections
      .map((section) => ({
        ...section,
        tools: section.tools.filter((tt) => {
          const title = t(`tools.${tt.slug}.title`).toLowerCase();
          const outcome = t(`tools.${tt.slug}.outcome`).toLowerCase();
          return title.includes(lowerQuery) || outcome.includes(lowerQuery);
        }),
      }))
      .filter((section) => section.tools.length > 0);
  }, [lowerQuery, sections, t]);

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-8">
      {/* Title */}
      <h1 className="text-center text-2xl font-semibold sm:text-[34px] sm:leading-[42px]">
        {t("heading")}
      </h1>

      {/* Search */}
      <div className="mx-auto mt-5 max-w-[420px]">
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <Search
            size={16}
            aria-hidden="true"
            style={{ color: "var(--muted)", flexShrink: 0 }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="mt-10 space-y-12">
        {filtered.map((section) => (
          <section key={section.id}>
            <h2 className="text-lg font-semibold sm:text-xl">
              {t(`categories.${section.id}.title`)}
            </h2>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--muted)" }}
            >
              {t(`categories.${section.id}.description`)}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.tools.map((tt) => (
                <TaskToolCard
                  key={tt.slug}
                  tt={tt}
                  t={t}
                  tTool={tTool}
                />
              ))}
            </div>
          </section>
        ))}

        {filtered.length === 0 && (
          <p
            className="py-12 text-center text-sm"
            style={{ color: "var(--muted)" }}
          >
            {t("noResults")}
          </p>
        )}
      </div>
    </div>
  );
}

function TaskToolCard({
  tt,
  t,
  tTool,
}: {
  tt: TaskTool;
  t: ReturnType<typeof useTranslations>;
  tTool: ReturnType<typeof useTranslations>;
}) {
  const isComingSoon = tt.tool.commingSoon;
  const isNew = tt.tool.isNew;

  const steps = [
    t(`tools.${tt.slug}.step1`),
    t(`tools.${tt.slug}.step2`),
    t(`tools.${tt.slug}.step3`),
  ];

  return (
    <div
      className={`task-tool-card rounded-2xl border relative overflow-hidden ${
        isComingSoon ? "opacity-50" : ""
      }`}
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
      }}
    >
      <Link
        href={isComingSoon ? "#" : (tt.tool.href as "/")}
        className={`block p-5 h-full ${isComingSoon ? "cursor-not-allowed" : ""}`}
        tabIndex={isComingSoon ? -1 : undefined}
        aria-disabled={isComingSoon ? "true" : undefined}
      >
        {/* Icon + Title row */}
        <div className="flex items-start gap-3">
          <tt.tool.icon className="h-6 w-6 shrink-0" aria-hidden="true" style={{ color: "var(--primary)" }} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-snug">
              {t(`tools.${tt.slug}.title`)}
            </h3>
            <p
              className="mt-0.5 text-[13px] leading-relaxed"
              style={{ color: "var(--muted)" }}
            >
              {t(`tools.${tt.slug}.outcome`)}
            </p>
          </div>
        </div>

        {/* 3-step instructions */}
        <ol className="mt-3 space-y-1">
          {steps.map((step, i) => (
            <li
              key={i}
              className="flex items-baseline gap-2 text-[12px]"
              style={{ color: "var(--muted)" }}
            >
              <span
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                style={{
                  backgroundColor: "var(--primary-soft)",
                  color: "var(--primary)",
                }}
              >
                {i + 1}
              </span>
              <span className="leading-snug">{step}</span>
            </li>
          ))}
        </ol>

        {/* Badges */}
        {isNew && (
          <span
            className="absolute right-3 top-3 rounded px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: "var(--tag-selected-bg)",
              color: "var(--tag-selected-text)",
            }}
          >
            {tTool("new")}
          </span>
        )}
        {isComingSoon && (
          <span
            className="absolute right-3 top-3 rounded border px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: "var(--tag-bg)",
              color: "var(--tag-text)",
              borderColor: "var(--tag-border)",
            }}
          >
            {tTool("comingSoon")}
          </span>
        )}
      </Link>
    </div>
  );
}
