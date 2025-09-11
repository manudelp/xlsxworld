"use client";
import React, { useMemo, useState } from "react";
import ToolsFilter from "./ToolsFilter";
import Tool from "./Tool";
import { toolItems } from "./toolsData";

export default function Tools() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(toolItems.map((t) => t.category)))],
    []
  );

  const filteredTools = useMemo(
    () =>
      selectedCategory === "All"
        ? toolItems
        : toolItems.filter((t) => t.category === selectedCategory),
    [selectedCategory]
  );

  return (
    <div className="flex flex-col items-center relative px-[48px] pb-[96px] mx-auto flex-wrap min-h-[200px]">
      <ToolsFilter
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* TOOLS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 min-h-[200px] w-full relative">
        {filteredTools.map((tool) => (
          <Tool key={tool.title} {...tool} />
        ))}
        {filteredTools.length === 0 && (
          <div className="col-span-full text-center text-sm text-gray-500 py-8">
            No tools in this category.
          </div>
        )}
      </div>
    </div>
  );
}
