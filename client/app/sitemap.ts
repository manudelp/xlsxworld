import type { MetadataRoute } from "next";
import { ACTIVE_TOOL_SLUGS, BASE_URL, LOCALES } from "@/lib/seo";

function localeAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${BASE_URL}/${locale}${path}`;
  }
  return { languages };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2025-06-01");

  const staticPages = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/learn", priority: 0.8, changeFrequency: "weekly" as const },
    {
      path: "/learn/how-to-find-and-fix-broken-excel-formulas",
      priority: 0.8,
      changeFrequency: "monthly" as const,
    },
    { path: "/faq", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  const entries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${BASE_URL}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    alternates: localeAlternates(page.path),
  }));

  for (const slug of ACTIVE_TOOL_SLUGS) {
    entries.push({
      url: `${BASE_URL}/tools/${slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: localeAlternates(`/tools/${slug}`),
    });
  }

  return entries;
}
