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
}
export default function Tool({
  href,
  title,
  icon,
  heading,
  description,
  category = "organize",
  commingSoon = false,
}: ToolProps) {
  return (
    <div
      className="bg-white border border-[#d6d6df] hover:border-black rounded-[16px] m-0 relative overflow-hidden z-[1] transition duration-500 scale-100"
      data-category={category}
    >
      <Link
        href={commingSoon ? "#" : href}
        title={title}
        className={`block p-4 ${
          commingSoon ? "pointer-events-none opacity-60" : ""
        }`}
        tabIndex={commingSoon ? -1 : undefined}
        aria-disabled={commingSoon ? "true" : undefined}
      >
        <div className="mb-2 text-5xl" aria-hidden={typeof icon === "string"}>
          {typeof icon === "string" ? <span>{icon}</span> : icon}
        </div>
        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
          {heading}
          {commingSoon && (
            <span className="bg-blue-200 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
              Coming soon
            </span>
          )}
        </h3>
        <div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </Link>
    </div>
  );
}
