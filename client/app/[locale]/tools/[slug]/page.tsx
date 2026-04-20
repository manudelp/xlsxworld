import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toolItems } from "@/components/tools/toolsData";
import { Link } from "@/i18n/navigation";
import {
  ACTIVE_TOOL_SLUGS,
  TOOL_SEO,
  toolPageMetadata,
  BASE_URL,
} from "@/lib/seo";
import { routing } from "@/i18n/routing";
import InspectSheets from "@/app/[locale]/tools/[slug]/inspect/InspectSheets";
import ConvertXlsxToCsv from "./convert/ConvertXlsxToCsv";
import ConvertCsvToXlsx from "./convert/ConvertCsvToXlsx";
import ConvertXlsxToJson from "./convert/ConvertXlsxToJson";
import ConvertJsonToXlsx from "./convert/ConvertJsonToXlsx";
import ConvertXlsxToSql from "./convert/ConvertXlsxToSql";
import ConvertSqlToXlsx from "./convert/ConvertSqlToXlsx";
import ConvertXlsxToXml from "./convert/ConvertXlsxToXml";
import ConvertXmlToXlsx from "./convert/ConvertXmlToXlsx";
import ConvertXlsxToPdf from "./convert/ConvertXlsxToPdf";
import MergeSheets from "./merge/MergeSheets";
import SplitSheet from "./split/SplitSheet";
import AppendWorkbooks from "./merge/AppendWorkbooks";
import SplitWorkbook from "./split/SplitWorkbook";
import RemoveDuplicates from "./clean/RemoveDuplicates";
import TrimSpaces from "./clean/TrimSpaces";
import NormalizeCase from "./clean/NormalizeCase";
import FindReplace from "./clean/FindReplace";
import RemoveEmptyRows from "./clean/RemoveEmptyRows";
import ScanFormulaErrors from "./analyze/ScanFormulaErrors";
import CompareWorkbooks from "./analyze/CompareWorkbooks";
import SummaryStats from "./analyze/SummaryStats";
import FreezeHeader from "./format/FreezeHeader";
import AutoSizeColumns from "./format/AutoSizeColumns";
import SortRows from "./data/SortRows";
import TransposeSheet from "./data/TransposeSheet";
import SplitColumn from "./data/SplitColumn";
import ValidateEmails from "./validate/ValidateEmails";
import DetectBlanks from "./validate/DetectBlanks";
import PasswordProtect from "./security/PasswordProtect";
import RemovePassword from "./security/RemovePassword";
import RelatedTools from "@/components/tools/RelatedTools";
import HistoryNudge from "@/components/tools/HistoryNudge";

const specialComponents: Record<string, React.ReactNode> = {
  "inspect-sheets": <InspectSheets />,
  "xlsx-to-csv": <ConvertXlsxToCsv />,
  "csv-to-xlsx": <ConvertCsvToXlsx />,
  "xlsx-to-json": <ConvertXlsxToJson />,
  "json-to-xlsx": <ConvertJsonToXlsx />,
  "xlsx-to-sql": <ConvertXlsxToSql />,
  "sql-to-xlsx": <ConvertSqlToXlsx />,
  "xlsx-to-xml": <ConvertXlsxToXml />,
  "xml-to-xlsx": <ConvertXmlToXlsx />,
  "xlsx-to-pdf": <ConvertXlsxToPdf />,
  "merge-sheets": <MergeSheets />,
  "append-workbooks": <AppendWorkbooks />,
  "split-sheet": <SplitSheet />,
  "split-workbook": <SplitWorkbook />,
  "remove-duplicates": <RemoveDuplicates />,
  "trim-spaces": <TrimSpaces />,
  "normalize-case": <NormalizeCase />,
  "find-replace": <FindReplace />,
  "remove-empty-rows": <RemoveEmptyRows />,
  "scan-formula-errors": <ScanFormulaErrors />,
  "compare-workbooks": <CompareWorkbooks />,
  "summary-stats": <SummaryStats />,
  "freeze-header": <FreezeHeader />,
  "auto-size-columns": <AutoSizeColumns />,
  "sort-rows": <SortRows />,
  "transpose-sheet": <TransposeSheet />,
  "split-column": <SplitColumn />,
  "validate-emails": <ValidateEmails />,
  "detect-blanks": <DetectBlanks />,
  "password-protect": <PasswordProtect />,
  "remove-password": <RemovePassword />,
};

export function generateStaticParams() {
  return ACTIVE_TOOL_SLUGS.flatMap((slug) =>
    routing.locales.map((locale) => ({ slug, locale })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  return toolPageMetadata(slug, locale) ?? {};
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const tool = toolItems.find((t) => t.slug === slug);
  if (!tool) return notFound();

  const t = await getTranslations({ locale, namespace: "tools" });
  const td = await getTranslations({ locale, namespace: `toolData.${slug}` });

  const seo = TOOL_SEO[slug];
  const hasSeoKeys = seo && td.has("seoHowItWorks1");

  const howSteps = hasSeoKeys
    ? [td("seoHowItWorks1"), td("seoHowItWorks2"), td("seoHowItWorks3")]
    : [];
  const faqItems = hasSeoKeys
    ? [
        { q: td("seoFaq1Q"), a: td("seoFaq1A") },
        { q: td("seoFaq2Q"), a: td("seoFaq2A") },
        { q: td("seoFaq3Q"), a: td("seoFaq3A") },
      ]
    : [];

  const softwareJsonLd = seo
    ? {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: td("heading"),
        url: `${BASE_URL}/${locale}/tools/${slug}`,
        applicationCategory: "Utility",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: seo.metaDescription,
      }
    : null;

  const howToJsonLd = hasSeoKeys
    ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: `${td("seoHowItWorksTitle")} — ${td("heading")}`,
        step: howSteps.map((text, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          text,
        })),
      }
    : null;

  const faqJsonLd = hasSeoKeys
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      }
    : null;

  return (
    <>
      {softwareJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
      )}
      {howToJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
        />
      )}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
          <Link
            href="/"
            className="order-1 sm:order-2 inline-flex items-center gap-2 text-sm sm:mt-1 transition-all group shrink-0"
            style={{ color: "var(--muted)" }}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 group-hover:text-world-300 group-hover:animate-pulse" />
            <span className="group-hover:underline">{t("backToTools")}</span>
          </Link>
          <div className="order-2 sm:order-1">
            <h1 className="text-2xl sm:text-3xl font-semibold mb-2 flex items-center gap-3">
              <tool.icon className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" aria-hidden style={{ color: "var(--primary)" }} />
              {td("heading")}
            </h1>
            <p className="mb-8 max-w-2xl" style={{ color: "var(--muted)" }}>
              {td("description")}
            </p>
          </div>
        </div>
        <div
          className="border-t pt-8"
          style={{ borderTopColor: "var(--border)" }}
        >
          <div>
            {specialComponents[tool.slug] || (
              <div className="text-sm" style={{ color: "var(--muted-2)" }}>
                {t("toolUiComingSoon")}
              </div>
            )}
          </div>
        </div>

        {hasSeoKeys && (
          <div
            className="border-t mt-12 pt-10 space-y-10"
            style={{ borderTopColor: "var(--border)" }}
          >
            <section>
              <h2 className="text-xl font-semibold mb-4">
                {td("seoHowItWorksTitle")}
              </h2>
              <ol
                className="list-decimal list-inside space-y-2 text-[15px]"
                style={{ color: "var(--muted)" }}
              >
                {howSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">
                {td("seoWhyUseTitle")}
              </h2>
              <p
                className="text-[15px] max-w-3xl"
                style={{ color: "var(--muted)" }}
              >
                {td("seoWhyUse")}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">
                {td("seoFaqTitle")}
              </h2>
              <div className="space-y-4">
                {faqItems.map((item, i) => (
                  <details
                    key={i}
                    name="tool-faq-accordion"
                    className="group rounded-xl border border-border [&_summary::-webkit-details-marker]:hidden [interpolate-size:allow-keywords] [&::details-content]:h-0 [&::details-content]:opacity-0 [&::details-content]:overflow-hidden [&::details-content]:transition-[height,opacity,content-visibility] [&::details-content]:duration-300 [&::details-content]:ease-out [&::details-content]:[transition-behavior:allow-discrete] [&[open]::details-content]:h-auto [&[open]::details-content]:opacity-100"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--background) 88%, var(--primary) 12%)",
                    }}
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-1.5 p-3 sm:p-5 font-medium outline-none">
                      <span className="text-[15px]">{item.q}</span>
                      <span className="shrink-0 transition duration-300 group-open:-rotate-180">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          style={{ color: "var(--muted)" }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>
                    </summary>
                    <p
                      className="px-3 pb-3 sm:px-5 sm:pb-5 text-[15px] leading-relaxed"
                      style={{ color: "var(--muted)" }}
                    >
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        )}

        <RelatedTools slug={slug} locale={locale} />
      </div>
      <HistoryNudge />
    </>
  );
}
