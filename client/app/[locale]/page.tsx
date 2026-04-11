import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Tools from "@/components/tools/Tools";

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
      </div>
      <Tools />
    </>
  );
}
