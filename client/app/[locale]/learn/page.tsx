import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { buildAlternates } from "@/lib/seo";

type LearnCopy = {
  metaTitle: string;
  metaDescription: string;
  badge: string;
  heading: string;
  intro: string;
  articleTitle: string;
  articleDescription: string;
  readTime: string;
  readGuide: string;
};

const LEARN_COPY: Record<string, LearnCopy> = {
  en: {
    metaTitle: "Excel Guides",
    metaDescription:
      "Actionable Excel tutorials for accountants, analysts, and spreadsheet-heavy teams.",
    badge: "Excel content hub",
    heading: "Practical guides for real spreadsheet problems",
    intro:
      "If your day starts with a messy export and ends with one broken formula, this is for you. We publish concise, tactical walkthroughs that pair each pain point with a matching XLSX World tool.",
    articleTitle: "How to Find and Fix Broken Excel Formulas",
    articleDescription:
      "A practical checklist for tracing #REF!, #VALUE!, and #N/A issues, plus a faster way to scan an entire workbook.",
    readTime: "7 min read",
    readGuide: "Read guide",
  },
  es: {
    metaTitle: "Guias de Excel",
    metaDescription:
      "Tutoriales practicos de Excel para contadores, analistas y equipos que trabajan con hojas de calculo.",
    badge: "Centro de contenido de Excel",
    heading: "Guias practicas para problemas reales de hojas de calculo",
    intro:
      "Si tu dia empieza con una exportacion desordenada y termina con una formula rota, esto es para ti. Publicamos guias concretas que conectan cada problema con una herramienta de XLSX World.",
    articleTitle: "Como encontrar y corregir formulas rotas en Excel",
    articleDescription:
      "Una lista practica para detectar errores #REF!, #VALUE! y #N/A, y revisar un libro completo mas rapido.",
    readTime: "7 min de lectura",
    readGuide: "Leer guia",
  },
  fr: {
    metaTitle: "Guides Excel",
    metaDescription:
      "Des tutoriels Excel concrets pour les comptables, analystes et equipes qui travaillent chaque jour sur des feuilles de calcul.",
    badge: "Hub de contenu Excel",
    heading: "Des guides pratiques pour de vrais problemes de tableur",
    intro:
      "Si votre journee commence avec une exportation desordonnee et se termine avec une formule casse, cette section est pour vous. Nous publions des guides courts qui relient chaque probleme a un outil XLSX World.",
    articleTitle: "Comment trouver et corriger des formules cassees dans Excel",
    articleDescription:
      "Une check-list pratique pour reperer les erreurs #REF!, #VALUE! et #N/A, puis verifier rapidement tout le classeur.",
    readTime: "7 min de lecture",
    readGuide: "Lire le guide",
  },
  pt: {
    metaTitle: "Guias de Excel",
    metaDescription:
      "Tutoriais praticos de Excel para contadores, analistas e equipes que vivem em planilhas.",
    badge: "Hub de conteudo Excel",
    heading: "Guias praticos para problemas reais de planilha",
    intro:
      "Se o seu dia comeca com uma exportacao baguncada e termina com uma formula quebrada, esta pagina e para voce. Publicamos guias objetivos que conectam cada problema a uma ferramenta do XLSX World.",
    articleTitle: "Como encontrar e corrigir formulas quebradas no Excel",
    articleDescription:
      "Um checklist pratico para rastrear erros #REF!, #VALUE! e #N/A e revisar toda a planilha com mais rapidez.",
    readTime: "7 min de leitura",
    readGuide: "Ler guia",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const copy = LEARN_COPY[locale] ?? LEARN_COPY.en;

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
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

  const copy = LEARN_COPY[locale] ?? LEARN_COPY.en;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <section
        className="rounded-2xl border border-border p-6 sm:p-8"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--background) 88%, var(--primary) 12%)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {copy.badge}
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-foreground">
          {copy.heading}
        </h1>
        <p className="mt-3 text-base sm:text-lg text-muted max-w-3xl">
          {copy.intro}
        </p>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4">
        <article
          className="rounded-xl border border-border p-5 sm:p-6"
          style={{ backgroundColor: "var(--surface)" }}
        >
          <p className="text-xs uppercase tracking-wide text-primary">
            {copy.readTime}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            {copy.articleTitle}
          </h2>
          <p className="mt-2 text-muted">{copy.articleDescription}</p>
          <Link
            href="/learn/how-to-find-and-fix-broken-excel-formulas"
            className="mt-4 inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            {copy.readGuide}
          </Link>
        </article>
      </section>
    </main>
  );
}
