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
      className={`rounded-[16px] m-0 relative overflow-hidden z-[1] transition duration-500 scale-100 ${
        commingSoon ? "opacity-50" : "hover:shadow-lg hover:scale-[1.02]"
      }`}
      data-category={category}
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--foreground)",
      }}
    >
      <Link
        href={commingSoon ? "#" : href}
        title={title}
        className={`block p-4 ${commingSoon ? "cursor-not-allowed" : ""}`}
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
          <p
            className="text-sm"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              color: "var(--muted)",
            }}
          >
            {description}
          </p>
        </div>
        {isNew && (
          <span
            className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded"
            style={{
              backgroundColor: "var(--tag-selected-bg)",
              color: "var(--tag-selected-text)",
            }}
          >
            New
          </span>
        )}
        {commingSoon && (
          <span
            className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded"
            style={{
              backgroundColor: "var(--tag-bg)",
              color: "var(--tag-text)",
              border: "1px solid var(--tag-border)",
            }}
          >
            Coming soon
          </span>
        )}
      </Link>
    </div>
  );
}
