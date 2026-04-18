"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import ToolsFilter from "@/components/tools/ToolsFilter";
import Tool from "@/components/tools/Tool";
import { FEATURED_TOOL_SLUGS, toolItems } from "@/components/tools/toolsData";
import { api } from "@/lib/api";

const POPULAR = "Popular";

export default function Tools() {
  const t = useTranslations("tools");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [popularSlugs, setPopularSlugs] = useState<string[]>(FEATURED_TOOL_SLUGS);
  const [loadingPopular, setLoadingPopular] = useState(true);

  useEffect(() => {
    api
      .get<string[]>("/api/v1/tools/popular", { limit: 15 })
      .then((slugs) => {
        if (slugs.length === 0) return;
        const merged = [...slugs];
        for (const s of FEATURED_TOOL_SLUGS) {
          if (merged.length >= 15) break;
          if (!merged.includes(s)) merged.push(s);
        }
        setPopularSlugs(merged);
      })
      .catch(() => {})
      .finally(() => setLoadingPopular(false));
  }, []);

  const categories = useMemo(
    () => [
      POPULAR,
      "All",
      ...Array.from(new Set(toolItems.map((t) => t.category))),
    ],
    [],
  );

  const filteredTools = useMemo(() => {
    const scopedTools =
      selectedCategory === POPULAR
        ? popularSlugs
            .map((slug) => toolItems.find((t) => t.slug === slug))
            .filter(
              (t): t is (typeof toolItems)[number] => !!t && !t.commingSoon,
            )
        : selectedCategory === "All"
          ? toolItems
          : toolItems.filter((t) => t.category === selectedCategory);

    const available = scopedTools.filter((tool) => !tool.commingSoon);
    const comingSoon = scopedTools.filter((tool) => tool.commingSoon);

    return [...available, ...comingSoon];
  }, [selectedCategory, popularSlugs]);

  return (
    <div className="flex flex-col items-center relative px-4 sm:px-[48px] pb-8 mx-auto flex-wrap min-h-[200px]">
      <ToolsFilter
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <div className="grid items-start grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 min-h-[200px] w-full relative">
        {loadingPopular && selectedCategory === POPULAR
          ? Array.from({ length: 15 }, (_, i) => (
              <div
                key={i}
                className="h-[166px] sm:h-[174px] rounded-[16px] p-4 animate-pulse"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="w-10 h-10 rounded-lg mb-2" style={{ backgroundColor: "var(--border)" }} />
                <div className="h-5 rounded w-3/5 mb-2" style={{ backgroundColor: "var(--border)" }} />
                <div className="h-3 rounded w-full mb-1.5" style={{ backgroundColor: "var(--border)", opacity: 0.6 }} />
                <div className="h-3 rounded w-4/5" style={{ backgroundColor: "var(--border)", opacity: 0.6 }} />
              </div>
            ))
          : filteredTools.map((tool) => (
              <Tool key={tool.slug} {...tool} />
            ))}
        {!loadingPopular && filteredTools.length === 0 && (
          <div
            className="col-span-full text-center text-sm py-8"
            style={{ color: "var(--muted)" }}
          >
            {t("noTools")}
          </div>
        )}
      </div>
    </div>
  );
}
