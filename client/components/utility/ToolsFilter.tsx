"use client";
import React from "react";

interface ToolsFilterProps {
  categories: string[]; // optional; will fallback to []
  selected: string;
  onSelect: (category: string) => void;
}

export default function ToolsFilter({
  categories = [],
  selected,
  onSelect,
}: ToolsFilterProps) {
  // Ensure "All" is present as the first element if categories provided but missing it
  const normalized = React.useMemo(() => {
    if (categories.length === 0) return ["All"]; // still show All (no tools yet)
    return categories[0] === "All"
      ? categories
      : ["All", ...categories.filter((c) => c !== "All")];
  }, [categories]);

  return (
    <div className="flex flex-wrap justify-center gap-4 mb-8">
      {normalized.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`tag h-[34px] text-[16px] leading-[26px] font-medium px-4 py-1 flex items-center cursor-pointer border rounded-full transition-all duration-200 ease-in-out hover:opacity-95`}
          style={{
            backgroundColor:
              selected === cat ? "var(--tag-selected-bg)" : "var(--tag-bg)",
            color:
              selected === cat ? "var(--tag-selected-text)" : "var(--tag-text)",
            borderColor: "var(--tag-border)",
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
