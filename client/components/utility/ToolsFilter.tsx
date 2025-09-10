"use client";
import React, { useState } from "react";

const filters = [
  "All",
  "Merge",
  "Split",
  "Compress",
  "Convert",
  "Rotate",
  "Unlock",
  "Watermark",
];

export default function ToolsFilter() {
  const [selected, setSelected] = useState("All");

  return (
    <div className="flex flex-wrap justify-center gap-4 mb-8">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => setSelected(filter)}
          className={`tag h-[34px] text-[16px] leading-[26px] font-medium px-4 py-1 flex items-center cursor-pointer border rounded-full transition-all duration-200 ease-in-out  
            ${
              selected === filter
                ? "bg-[#292931] text-white border-[#d6d6df] hover:border-[#d6d6df]"
                : "bg-white border-[#d6d6df] hover:border-black"
            }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
