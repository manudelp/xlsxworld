import React from "react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface ToolProps {
  href: string;
  slug: string;
  icon: LucideIcon;
  category?: string;
  commingSoon?: boolean;
  isNew?: boolean;
}

export default function Tool({
  href,
  slug,
  icon: Icon,
  category = "organize",
  commingSoon = false,
  isNew = false,
}: ToolProps) {
  const t = useTranslations("tools");
  const td = useTranslations(`toolData.${slug}`);

  const title = td("title");
  const heading = td("heading");
  const description = td("description");

  return (
    <div
      className={`tool-card h-[166px] sm:h-[174px] rounded-[16px] m-0 relative overflow-hidden z-[1] ${
        commingSoon ? "opacity-50" : "tool-card-interactive"
      }`}
      data-category={category}
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--foreground)",
      }}
    >
      <Link
        href={commingSoon ? "#" : (href as "/")}
        title={title}
        className={`tool-card-link block h-full p-4 ${commingSoon ? "cursor-not-allowed" : ""}`}
        tabIndex={commingSoon ? -1 : undefined}
        aria-disabled={commingSoon ? "true" : undefined}
      >
        <Icon className="h-9 w-9 mb-2" aria-hidden style={{ color: "var(--primary)" }} />
        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
          {heading}
        </h3>
        <div>
          <p
            className="text-sm"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
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
            {t("new")}
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
            {t("comingSoon")}
          </span>
        )}
      </Link>
    </div>
  );
}
