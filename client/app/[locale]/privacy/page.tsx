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
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: "Privacy Policy",
    description: t("metaDescription"),
    alternates: buildAlternates("/privacy"),
  };
}

const LAST_UPDATED = "April 5, 2025";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PrivacyContent />;
}

function PrivacyContent() {
  const t = useTranslations("privacy");

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
            {t("scopeTitle")}
          </h2>
          <p>{t("scopeText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("infoCollectTitle")}
          </h2>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>{t("infoCollect1")}</li>
            <li>{t("infoCollect2")}</li>
            <li>{t("infoCollect3")}</li>
            <li>{t("infoCollect4")}</li>
            <li>{t("infoCollect5")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("fileProcessingTitle")}
          </h2>
          <p>{t("fileProcessingText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("howWeUseTitle")}
          </h2>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>{t("howWeUse1")}</li>
            <li>{t("howWeUse2")}</li>
            <li>{t("howWeUse3")}</li>
            <li>{t("howWeUse4")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("cookiesTitle")}
          </h2>
          <p>{t("cookiesText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("dataSharingTitle")}
          </h2>
          <p>{t("dataSharingText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("thirdPartyTitle")}
          </h2>
          <p>
            {t.rich("thirdPartyText", {
              cloudflareLink: (chunks) => (
                <a
                  href="https://www.cloudflare.com/privacypolicy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {chunks}
                </a>
              ),
              googleLink: (chunks) => (
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("retentionTitle")}
          </h2>
          <p>{t("retentionText")}</p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("rightsTitle")}
          </h2>
          <p>
            {t.rich("rightsText", {
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
            {t("securityTitle")}
          </h2>
          <p>{t("securityText")}</p>
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
