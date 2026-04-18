"use client";
import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import ToolsFilter from "@/components/tools/ToolsFilter";
import Tool from "@/components/tools/Tool";
import { FEATURED_TOOL_SLUGS, toolItems } from "@/components/tools/toolsData";

export default function Tools() {
  const t = useTranslations("tools");
  const tHome = useTranslations("home");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(toolItems.map((t) => t.category)))],
    [],
  );

  const featuredTools = useMemo(
    () =>
      FEATURED_TOOL_SLUGS.map((slug) =>
        toolItems.find((t) => t.slug === slug),
      ).filter((t): t is (typeof toolItems)[number] => !!t && !t.commingSoon),
    [],
  );

  const filteredTools = useMemo(
    () => {
      const scopedTools =
        selectedCategory === "All"
          ? toolItems
          : toolItems.filter((t) => t.category === selectedCategory);

      const available = scopedTools.filter((tool) => !tool.commingSoon);
      const comingSoon = scopedTools.filter((tool) => tool.commingSoon);

      return [...available, ...comingSoon];
    },
    [selectedCategory],
  );

  return (
    <div className="flex flex-col items-center relative px-4 sm:px-[48px] pb-8 mx-auto flex-wrap min-h-[200px]">
      {/* Start here — featured row */}
      <section className="w-full mb-6">
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h2 className="text-lg sm:text-xl font-semibold">
            {tHome("startHereHeading")}
          </h2>
          <span
            className="text-xs sm:text-sm"
            style={{ color: "var(--muted)" }}
          >
            {tHome("startHereSubheading")}
          </span>
        </div>
        <div className="grid items-start grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {featuredTools.map((tool) => (
            <Tool key={`featured-${tool.slug}`} {...tool} />
          ))}
        </div>
      </section>

      <ToolsFilter
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* TOOLS */}
      <div className="grid items-start grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 min-h-[200px] w-full relative">
        {filteredTools.map((tool) => (
          <Tool key={tool.slug} {...tool} />
        ))}
        {filteredTools.length === 0 && (
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
