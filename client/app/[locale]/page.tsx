import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
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
          className="text-[13px] sm:text-[14px] mt-3 mx-auto font-medium"
          style={{ color: "var(--primary)" }}
        >
          {t("socialProof")}
        </p>
        <p
          className="text-[13px] sm:text-[14px] mt-2 mx-auto"
          style={{ color: "var(--muted)" }}
        >
          {t("trustLine")}
        </p>
      </div>
      <Tools />
      <section className="mx-auto mb-10 mt-2 w-full max-w-[1200px] px-4 sm:px-[48px]">
        <div
          className="rounded-2xl border p-4 sm:p-5"
          style={{
            borderColor: "var(--border)",
            backgroundColor:
              "color-mix(in srgb, var(--background) 92%, var(--primary) 8%)",
          }}
        >
          <p
            className="text-xs sm:text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--primary)" }}
          >
            {t("storyBadge")}
          </p>
          <h2 className="mt-2 text-lg sm:text-xl font-semibold text-foreground">
            {t("storyHeading")}
          </h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            {t("storyBody")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[t("storyPain1"), t("storyPain2"), t("storyPain3")].map((pain) => (
              <span
                key={pain}
                className="inline-flex items-center rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                }}
              >
                {pain}
              </span>
            ))}
          </div>
          <div className="mt-3">
            <Link
              href="/learn"
              className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium"
              style={{
                backgroundColor: "var(--foreground)",
                color: "var(--background)",
              }}
            >
              {t("learnCta")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
