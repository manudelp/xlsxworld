"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  SearchCheck,
  FileSpreadsheet,
  GitMerge,
  Clock,
  ArrowRight,
  Search,
  Wrench,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

type Category = "all" | "formulas" | "csv" | "merging";

interface Guide {
  titleKey: string;
  outcomeKey: string;
  timeKey: string;
  href: string;
  toolHref: string;
  toolKey: string;
  category: Category;
  icon: typeof SearchCheck;
}

const GUIDES: Guide[] = [
  {
    titleKey: "g1Title",
    outcomeKey: "g1Outcome",
    timeKey: "g1Time",
    href: "/learn/how-to-find-and-fix-broken-excel-formulas",
    toolHref: "/tools/scan-formula-errors",
    toolKey: "g1Tool",
    category: "formulas",
    icon: SearchCheck,
  },
  {
    titleKey: "g2Title",
    outcomeKey: "g2Outcome",
    timeKey: "g2Time",
    href: "/learn/how-to-clean-csv-imports",
    toolHref: "/tools/csv-to-xlsx",
    toolKey: "g2Tool",
    category: "csv",
    icon: FileSpreadsheet,
  },
  {
    titleKey: "g3Title",
    outcomeKey: "g3Outcome",
    timeKey: "g3Time",
    href: "/learn/how-to-merge-excel-files",
    toolHref: "/tools/append-workbooks",
    toolKey: "g3Tool",
    category: "merging",
    icon: GitMerge,
  },
];

const CATEGORIES: Category[] = ["all", "formulas", "csv", "merging"];

export default function LearnContent() {
  const t = useTranslations("learn");
  const [active, setActive] = useState<Category>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = GUIDES;
    if (active !== "all") list = list.filter((g) => g.category === active);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (g) =>
          t(g.titleKey).toLowerCase().includes(q) ||
          t(g.outcomeKey).toLowerCase().includes(q),
      );
    }
    return list;
  }, [active, query, t]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Compact header + search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
            {t("heading")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {t("subheading")}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted)" }}
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="mt-5 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
            style={{
              borderColor:
                active === cat
                  ? "var(--primary)"
                  : "var(--border)",
              backgroundColor:
                active === cat
                  ? "var(--primary)"
                  : "var(--background)",
              color:
                active === cat
                  ? "var(--background)"
                  : "var(--foreground)",
            }}
          >
            {t(`cat_${cat}`)}
          </button>
        ))}
      </div>

      {/* Fast paths */}
      {active === "all" && !query && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {GUIDES.map((g) => {
            const Icon = g.icon;
            return (
              <button
                key={g.category}
                onClick={() => setActive(g.category)}
                className="group flex items-center gap-3 rounded-xl border p-3.5 text-left transition-shadow hover:shadow-md"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor:
                    "color-mix(in srgb, var(--background) 92%, var(--primary) 8%)",
                }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "var(--primary-soft)" }}
                >
                  <Icon
                    size={18}
                    aria-hidden="true"
                    style={{ color: "var(--primary)" }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {t(`fp_${g.category}`)}
                  </p>
                  <p
                    className="mt-0.5 truncate text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    {t(`fp_${g.category}_sub`)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Guide grid */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((g) => {
          const Icon = g.icon;
          return (
            <div
              key={g.href}
              className="group flex flex-col rounded-xl border transition-shadow hover:shadow-md"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
              }}
            >
              <Link href={g.href} className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2">
                  <Icon
                    size={14}
                    aria-hidden="true"
                    style={{ color: "var(--primary)" }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--muted)" }}
                  >
                    {t(`cat_${g.category}`)}
                  </span>
                </div>
                <h2 className="mt-2 text-sm font-semibold text-foreground leading-snug">
                  {t(g.titleKey)}
                </h2>
                <p
                  className="mt-1 flex-1 text-xs leading-relaxed"
                  style={{ color: "var(--muted)" }}
                >
                  {t(g.outcomeKey)}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    <Clock size={11} aria-hidden="true" />
                    {t(g.timeKey)}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium transition-transform group-hover:translate-x-0.5"
                    style={{ color: "var(--primary)" }}
                  >
                    {t("open")} <ArrowRight size={11} aria-hidden="true" />
                  </span>
                </div>
              </Link>

              {/* Tool bridge */}
              <Link
                href={g.toolHref}
                className="flex items-center gap-2 border-t px-4 py-2.5 text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--primary)",
                }}
              >
                <Wrench size={11} aria-hidden="true" />
                {t(g.toolKey)}
              </Link>
            </div>
          );
        })}
      </section>

      {/* Empty state */}
      {filtered.length === 0 && (
        <p
          className="mt-10 text-center text-sm"
          style={{ color: "var(--muted)" }}
        >
          {t("noResults")}
        </p>
      )}
    </main>
  );
}
