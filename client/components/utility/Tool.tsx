import React from "react";
import Link from "next/link";

interface ToolProps {
  href: string;
  title: string;
  icon: React.ReactNode | string;
  heading: string;
  description: string;
  category?: string;
  commingSoon?: boolean;
  isNew?: boolean;
}
export default function Tool({
  href,
  title,
  icon,
  heading,
  description,
  category = "organize",
  commingSoon = false,
  isNew = false,
}: ToolProps) {
  return (
    <div
      className="bg-white border border-[#d6d6df] hover:border-black rounded-[16px] m-0 relative overflow-hidden z-[1] transition duration-500 scale-100"
      data-category={category}
    >
      <Link
        href={href}
        title={title}
        className="block p-4"
        tabIndex={commingSoon ? -1 : undefined}
        aria-disabled={commingSoon ? "true" : undefined}
      >
        <div className="mb-2 text-5xl" aria-hidden={typeof icon === "string"}>
          {typeof icon === "string" ? <span>{icon}</span> : icon}
        </div>
        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
          {heading}
        </h3>
        <div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        {isNew && (
          <span className="absolute top-3 right-3 bg-green-200 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
            New
          </span>
        )}
        {commingSoon && (
          <span className="absolute top-3 right-3 bg-blue-200 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
            Coming soon
          </span>
        )}
      </Link>
    </div>
  );
}
