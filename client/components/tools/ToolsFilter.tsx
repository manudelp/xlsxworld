"use client";
import React from "react";
import { useTranslations } from "next-intl";

interface ToolsFilterProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export default function ToolsFilter({
  categories = [],
  selected,
  onSelect,
}: ToolsFilterProps) {
  const t = useTranslations("tools");
  const tc = useTranslations("categories");

  const normalized = React.useMemo(() => {
    if (categories.length === 0) return ["All"];
    return categories[0] === "All"
      ? categories
      : ["All", ...categories.filter((c) => c !== "All")];
  }, [categories]);

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8">
      {normalized.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`tag h-[30px] sm:h-[34px] text-[14px] sm:text-[16px] leading-[22px] sm:leading-[26px] font-medium px-3 sm:px-4 py-1 flex items-center cursor-pointer border rounded-full transition-all duration-200 ease-in-out hover:opacity-95`}
          style={{
            backgroundColor:
              selected === cat ? "var(--tag-selected-bg)" : "var(--tag-bg)",
            color:
              selected === cat ? "var(--tag-selected-text)" : "var(--tag-text)",
            borderColor: "var(--tag-border)",
          }}
        >
          {cat === "All" ? t("all") : tc(cat)}
        </button>
      ))}
    </div>
  );
}
