import { getTranslations } from "next-intl/server";
import { toolItems } from "@/components/tools/toolsData";
import { Link } from "@/i18n/navigation";

type RelatedToolsProps = {
  slug: string;
  locale: string;
};

export default async function RelatedTools({ slug, locale }: RelatedToolsProps) {
  const current = toolItems.find((t) => t.slug === slug);
  if (!current?.related?.length) return null;

  const relatedItems = current.related
    .map((relatedSlug) => toolItems.find((t) => t.slug === relatedSlug))
    .filter((t): t is (typeof toolItems)[number] => !!t && !t.commingSoon)
    .slice(0, 3);

  if (relatedItems.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "tools" });

  const entries = await Promise.all(
    relatedItems.map(async (item) => {
      const td = await getTranslations({
        locale,
        namespace: `toolData.${item.slug}`,
      });
      return {
        slug: item.slug,
        href: item.href,
        icon: item.icon,
        heading: td("heading"),
        description: td("description"),
      };
    }),
  );

  return (
    <section
      className="border-t mt-12 pt-10"
      style={{ borderTopColor: "var(--border)" }}
    >
      <h2 className="text-xl font-semibold mb-4">{t("relatedHeading")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map((entry) => (
          <Link
            key={entry.slug}
            href={entry.href as "/"}
            className="tool-card tool-card-interactive rounded-[16px] p-4 block"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            <div className="text-3xl mb-2" aria-hidden>
              {entry.icon}
            </div>
            <h3 className="text-base font-semibold mb-1">{entry.heading}</h3>
            <p
              className="text-sm"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                color: "var(--muted)",
              }}
            >
              {entry.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
