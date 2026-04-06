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
import MergeSheets from "./merge/MergeSheets";
import SplitSheet from "./split/SplitSheet";
import AppendWorkbooks from "./merge/AppendWorkbooks";
import SplitWorkbook from "./split/SplitWorkbook";
import RemoveDuplicates from "./clean/RemoveDuplicates";
import TrimSpaces from "./clean/TrimSpaces";
import NormalizeCase from "./clean/NormalizeCase";
import FindReplace from "./clean/FindReplace";

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
  "merge-sheets": <MergeSheets />,
  "append-workbooks": <AppendWorkbooks />,
  "split-sheet": <SplitSheet />,
  "split-workbook": <SplitWorkbook />,
  "remove-duplicates": <RemoveDuplicates />,
  "trim-spaces": <TrimSpaces />,
  "normalize-case": <NormalizeCase />,
  "find-replace": <FindReplace />,
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

  const howToJsonLd = seo
    ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: `How to use ${td("heading")}`,
        step: seo.howItWorks.map((text, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          text,
        })),
      }
    : null;

  const faqJsonLd = seo
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: seo.faq.map((item) => ({
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold mb-2 flex items-center gap-3">
              <span className="text-4xl" aria-hidden>
                {tool.icon}
              </span>{" "}
              {td("heading")}
            </h1>
            <p className="mb-8 max-w-2xl" style={{ color: "var(--muted)" }}>
              {td("description")}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm mb-6 transition-all group"
            style={{ color: "var(--muted)" }}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 group-hover:text-world-300 group-hover:animate-pulse" />
            <span className="group-hover:underline">{t("backToTools")}</span>
          </Link>
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

        {seo && (
          <div
            className="border-t mt-12 pt-10 space-y-10"
            style={{ borderTopColor: "var(--border)" }}
          >
            <section>
              <h2 className="text-xl font-semibold mb-4">How it works</h2>
              <ol
                className="list-decimal list-inside space-y-2 text-[15px]"
                style={{ color: "var(--muted)" }}
              >
                {seo.howItWorks.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Why use this tool</h2>
              <p
                className="text-[15px] max-w-3xl"
                style={{ color: "var(--muted)" }}
              >
                {seo.whyUse}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">FAQ</h2>
              <div className="space-y-4">
                {seo.faq.map((item, i) => (
                  <details
                    key={i}
                    className="group rounded-xl border p-3 sm:p-5 [&_summary::-webkit-details-marker]:hidden"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--primary-soft)",
                    }}
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-1.5 font-medium outline-none">
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
                      className="mt-3 text-[15px] leading-relaxed"
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
      </div>
    </>
  );
}
