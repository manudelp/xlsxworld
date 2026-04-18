import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FileSpreadsheet, SearchCheck, GitMerge, ArrowRight, Clock } from "lucide-react";
import Tools from "@/components/tools/Tools";
import { Link } from "@/i18n/navigation";

type HomeProps = {
  searchParams?: Promise<{
    welcome?: string;
  }>;
  params: Promise<{ locale: string }>;
};

export default async function Home({ searchParams, params }: HomeProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const resolvedSearchParams = await searchParams;
  const showWelcomeBanner = resolvedSearchParams?.welcome === "1";

  return <HomeContent showWelcomeBanner={showWelcomeBanner} />;
}

function HomeContent({ showWelcomeBanner }: { showWelcomeBanner: boolean }) {
  const t = useTranslations("home");

  return (
    <>
      {showWelcomeBanner && (
        <div className="mx-auto mt-4 max-w-[1200px] px-4 sm:px-[45px]">
          <div
            className="rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--primary-soft)",
              color: "var(--foreground)",
            }}
          >
            {t("welcomeBanner")}
          </div>
        </div>
      )}
      <div className="relative p-[24px_16px] sm:p-[30px_45px] text-center">
        <h1 className="font-semibold text-[28px] leading-[36px] sm:text-[42px] sm:leading-[52px] text-center mx-auto mb-[4px] max-w-full sm:max-w-[1200px]">
          {t("heading")}
        </h1>
        <p className="text-[16px] sm:text-[22px] max-w-[980px] mx-auto">
          {t("subheading")}
        </p>
        <p
          className="text-[13px] sm:text-[14px] mt-3 mx-auto"
          style={{ color: "var(--muted)" }}
        >
          {t("trustLine")}
        </p>
      </div>
      <Tools />
      <section
        className="mt-4 border-t"
        style={{
          borderColor: "var(--border)",
          backgroundColor:
            "color-mix(in srgb, var(--surface) 60%, var(--background) 40%)",
        }}
      >
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-[48px] sm:py-14">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
            {t("guidesHeading")}
          </h2>

          <ul className="mt-4 space-y-2 text-sm sm:text-base" style={{ color: "var(--muted)" }}>
            <li className="flex items-center gap-2">
              <SearchCheck size={16} aria-hidden="true" style={{ color: "var(--primary)", flexShrink: 0 }} />
              {t("guidesBullet1")}
            </li>
            <li className="flex items-center gap-2">
              <FileSpreadsheet size={16} aria-hidden="true" style={{ color: "var(--primary)", flexShrink: 0 }} />
              {t("guidesBullet2")}
            </li>
            <li className="flex items-center gap-2">
              <GitMerge size={16} aria-hidden="true" style={{ color: "var(--primary)", flexShrink: 0 }} />
              {t("guidesBullet3")}
            </li>
          </ul>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { title: t("guideCard1Title"), desc: t("guideCard1Desc"), time: t("guideCard1Time"), href: "/learn/how-to-find-and-fix-broken-excel-formulas" as const },
              { title: t("guideCard2Title"), desc: t("guideCard2Desc"), time: t("guideCard2Time"), href: "/learn/how-to-clean-csv-imports" as const },
              { title: t("guideCard3Title"), desc: t("guideCard3Desc"), time: t("guideCard3Time"), href: "/learn/how-to-merge-excel-files" as const },
            ].map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-xl border p-4 sm:p-5 transition-shadow hover:shadow-md"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--background)",
                }}
              >
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  <Clock size={12} aria-hidden="true" />
                  {card.time}
                </span>
                <p className="mt-2 text-sm sm:text-base font-semibold text-foreground">
                  {card.title}
                </p>
                <p className="mt-1 text-xs sm:text-sm" style={{ color: "var(--muted)" }}>
                  {card.desc}
                </p>
                <span
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium transition-transform group-hover:translate-x-0.5"
                  style={{ color: "var(--primary)" }}
                >
                  {t("guidesReadMore")} <ArrowRight size={12} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: "var(--foreground)",
                color: "var(--background)",
              }}
            >
              {t("guidesCta")} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
