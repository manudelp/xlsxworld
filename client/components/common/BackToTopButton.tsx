"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";

type BackToTopButtonProps = {
  threshold?: number;
  className?: string;
};

export default function BackToTopButton({
  threshold = 450,
  className = "fixed bottom-6 right-6 z-30",
}: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const t = useTranslations("backToTop");

  useEffect(() => {
    const onScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`${className} group`}>
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label={t("label")}
        className="cursor-pointer rounded-full border p-3 shadow-sm transition hover:shadow"
        style={{
          borderColor: "var(--tag-border)",
          backgroundColor: "var(--tag-selected-bg)",
          color: "var(--tag-selected-text)",
        }}
        title={t("label")}
      >
        <ArrowUp size={18} aria-hidden="true" />
      </button>

      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-[-2.25rem] whitespace-nowrap rounded border px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface-2)",
          color: "var(--foreground)",
        }}
      >
        {t("label")}
      </span>
    </div>
  );
}
