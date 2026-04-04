import { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function FAQPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FAQContent />;
}

function FAQContent() {
  const t = useTranslations("faq");

  const faqs = [
    {
      category: t("generalInfo"),
      questions: [
        { q: t("q1"), a: t("a1") },
        { q: t("q2"), a: t("a2") },
        { q: t("q3"), a: t("a3") },
      ],
    },
    {
      category: t("dataPrivacy"),
      questions: [
        { q: t("q4"), a: t("a4") },
        { q: t("q5"), a: t("a5") },
      ],
    },
    {
      category: t("technicalFeatures"),
      questions: [
        { q: t("q6"), a: t("a6") },
        { q: t("q7"), a: t("a7") },
        { q: t("q8"), a: t("a8") },
      ],
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.flatMap((category) =>
      category.questions.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <h1 className="text-4xl font-semibold mb-4 text-foreground text-center">
          {t("heading")}
        </h1>
        <p className="mb-10 text-lg leading-relaxed text-muted text-center">
          {t("subheading")}
        </p>

        <div className="space-y-12">
          {faqs.map((group, index) => (
            <section key={index}>
              <h2 className="text-2xl font-medium mb-6 text-foreground border-b border-border pb-2">
                {group.category}
              </h2>
              <div className="space-y-4">
                {group.questions.map((item, itemIdx) => (
                  <details
                    key={itemIdx}
                    className="group rounded-xl border border-border bg-primary-soft p-3 sm:p-5 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-foreground font-medium outline-none">
                      <span className="text-lg">{item.q}</span>
                      <span className="shrink-0 transition duration-300 group-open:-rotate-180">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-muted hover:text-foreground transition-colors"
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

                    <p className="mt-4 leading-relaxed text-muted text-base">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-16 text-center rounded-xl border border-border bg-primary-soft p-8">
          <h2 className="text-xl font-medium text-foreground mb-3">
            {t("stillHaveQuestions")}
          </h2>
          <p className="text-muted mb-6">
            {t("stillHaveQuestionsDescription")}
          </p>
          <Link
            href="/contact"
            className="inline-flex justify-center items-center rounded-md bg-foreground text-background px-6 py-2.5 text-sm font-medium transition-all hover:bg-muted focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2"
          >
            {t("contactSupport")}
          </Link>
        </section>
      </main>
    </>
  );
}
