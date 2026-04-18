import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { buildAlternates } from "@/lib/seo";
import LearnContent from "./LearnContent";

const META: Record<string, { title: string; description: string }> = {
  en: {
    title: "Excel Guides",
    description:
      "Actionable Excel tutorials for accountants, analysts, and spreadsheet-heavy teams.",
  },
  es: {
    title: "Guías de Excel",
    description:
      "Tutoriales prácticos de Excel para contadores, analistas y equipos que trabajan con hojas de cálculo.",
  },
  fr: {
    title: "Guides Excel",
    description:
      "Des tutoriels Excel concrets pour les comptables, analystes et équipes tableur.",
  },
  pt: {
    title: "Guias de Excel",
    description:
      "Tutoriais práticos de Excel para contadores, analistas e equipes que vivem em planilhas.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const m = META[locale] ?? META.en;
  return {
    title: m.title,
    description: m.description,
    alternates: buildAlternates("/learn"),
  };
}

export default async function LearnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LearnContent />;
}
