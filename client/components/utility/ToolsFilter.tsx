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
          className={`tag h-[34px] text-[16px] leading-[26px] font-medium px-4 py-1 flex items-center cursor-pointer border rounded-full transition-all duration-200 ease-in-out  ${
            selected === cat
              ? "bg-[#292931] text-white border-[#d6d6df] hover:border-[#d6d6df]"
              : "bg-white border-[#d6d6df] hover:border-black"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
