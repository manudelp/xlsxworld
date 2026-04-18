"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import FooterLaunchSignup from "@/components/layout/FooterLaunchSignup";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer
      className="w-full text-white"
      style={{ backgroundColor: "#1e1e24" }}
    >
      <div className="container mx-auto px-4 pt-10 pb-6">
        {/* 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr_2fr_1.2fr] gap-10 lg:gap-12">
          {/* Left: Brand + positioning */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-lg font-semibold flex items-center gap-1">
                XLSX
                <Image
                  src="/icon.svg"
                  alt="XLSX World"
                  width={26}
                  height={26}
                  style={{ display: "inline", verticalAlign: "middle" }}
                />
                World
              </span>
            </Link>
            <p className="text-sm text-white/70 leading-relaxed">
              {t("valueStatement")}
            </p>
            <p className="text-xs text-white/45">{t("trustSignal")}</p>
          </div>

          {/* Middle: Grouped navigation */}
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                {t("navProduct")}
              </span>
              <Link href="/" className="text-white/70 hover:text-white">
                {t("home")}
              </Link>
              <Link href="/tools" className="text-white/70 hover:text-white">
                {t("allTools")}
              </Link>
              <Link
                href="/contact?topic=suggest"
                className="text-white/70 hover:text-white"
              >
                {t("suggestTool")}
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                {t("navResources")}
              </span>
              <Link href="/learn" className="text-white/70 hover:text-white">
                {t("learn")}
              </Link>
              <Link href="/faq" className="text-white/70 hover:text-white">
                {t("faq")}
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                {t("navCompany")}
              </span>
              <Link href="/contact" className="text-white/70 hover:text-white">
                {t("contact")}
              </Link>
              <Link href="/privacy" className="text-white/70 hover:text-white">
                {t("privacy")}
              </Link>
              <Link href="/terms" className="text-white/70 hover:text-white">
                {t("terms")}
              </Link>
            </div>
          </div>

          {/* Right: Newsletter (compressed) */}
          <div>
            <FooterLaunchSignup />
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-8 pt-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="text-white/60">
            {t("copyright", { year: new Date().getFullYear() })}
          </span>
          <span className="text-white/35">{t("tagline")}</span>
        </div>
      </div>
    </footer>
  );
}
