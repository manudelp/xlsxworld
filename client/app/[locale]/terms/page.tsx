import { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return {
    title: "Terms of Service",
    description: t("metaDescription"),
    alternates: buildAlternates("/terms"),
  };
}

const LAST_UPDATED = "April 5, 2025";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TermsContent />;
}

function TermsContent() {
  const t = useTranslations("terms");

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="text-4xl font-semibold mb-4 text-foreground text-center">
        {t("title")}
      </h1>
      <p className="mb-10 text-lg leading-relaxed text-muted text-center">
        {t("lastUpdated", { date: LAST_UPDATED })}
      </p>

      <div className="space-y-8 text-base leading-relaxed text-muted">
        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("acceptanceTitle")}
          </h2>
          <p>{t("acceptanceText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("serviceTitle")}
          </h2>
          <p>{t("serviceText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("accountsTitle")}
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>{t("accounts1")}</li>
            <li>{t("accounts2")}</li>
            <li>{t("accounts3")}</li>
            <li>{t("accounts4")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("acceptableUseTitle")}
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>{t("acceptableUse1")}</li>
            <li>{t("acceptableUse2")}</li>
            <li>{t("acceptableUse3")}</li>
            <li>{t("acceptableUse4")}</li>
            <li>{t("acceptableUse5")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("yourFilesTitle")}
          </h2>
          <p>{t("yourFilesText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("ipTitle")}
          </h2>
          <p>{t("ipText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("thirdPartyTitle")}
          </h2>
          <p>{t("thirdPartyText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("disclaimerTitle")}
          </h2>
          <p>{t("disclaimerText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("liabilityTitle")}
          </h2>
          <p>{t("liabilityText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("indemnificationTitle")}
          </h2>
          <p>{t("indemnificationText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("terminationTitle")}
          </h2>
          <p>{t("terminationText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("contactTitle")}
          </h2>
          <p>
            {t.rich("contactText", {
              contactLink: (chunks) => (
                <Link href="/contact" className="text-primary hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("changesTitle")}
          </h2>
          <p>{t("changesText")}</p>
        </section>
      </div>
    </main>
  );
}
