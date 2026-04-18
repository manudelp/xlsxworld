"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="w-full bg-[#292931] text-white py-6 px-4">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
        <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2">
          <Link href="/" className="hover:underline">
            {t("home")}
          </Link>
          <Link href="/faq" className="hover:underline">
            {t("faq")}
          </Link>
          <Link href="/contact" className="hover:underline">
            {t("contact")}
          </Link>
          <Link href="/privacy" className="hover:underline">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="hover:underline">
            {t("terms")}
          </Link>
          <Link href="/contact?topic=suggest" className="hover:underline">
            {t("suggestTool")}
          </Link>
        </div>
        <div className="text-center md:text-right flex flex-col items-center md:items-end gap-1">
          <div>{t("copyright", { year: new Date().getFullYear() })}</div>
          <div className="text-xs text-white/60">{t("tagline")}</div>
        </div>
      </div>
    </footer>
  );
}
