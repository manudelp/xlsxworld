import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { BASE_URL, buildAlternates } from "@/lib/seo";

type GuideCopy = {
  metaTitle: string;
  metaDescription: string;
  label: string;
  heading: string;
  intro: string;
  s1Title: string;
  s1Body: string;
  s1i1: string;
  s1i2: string;
  s1i3: string;
  s2Title: string;
  s2Body1: string;
  s2Body2: string;
  s3Title: string;
  s3Body: string;
  s3i1: string;
  s3i2: string;
  s3i3: string;
  s4Title: string;
  s4Body: string;
  toolTitle: string;
  toolBody: string;
  toolAction: string;
  closing: string;
  back: string;
};

const GUIDE_COPY: Record<string, GuideCopy> = {
  en: {
    metaTitle: "How to Clean CSV Imports in Excel",
    metaDescription:
      "Fix separators, encoding issues, and broken structure in CSV files before importing them into Excel.",
    label: "Excel Guide",
    heading: "How to clean CSV imports in Excel",
    intro:
      "A CSV that looks fine in a text editor can turn into a single-column mess in Excel. Separators, encoding, and quoting issues are the usual culprits. This guide walks you through diagnosing and fixing them before they corrupt your analysis.",
    s1Title: "1) Check the delimiter before opening",
    s1Body:
      "Excel assumes comma-separated by default, but many exports use semicolons, tabs, or pipes. Opening with the wrong delimiter jams everything into column A.",
    s1i1: "Open the CSV in a plain text editor first and look at what separates values.",
    s1i2: "European systems often export with semicolons because commas are used as decimal separators.",
    s1i3: "Tab-separated files sometimes use .csv extension — the content matters, not the name.",
    s2Title: "2) Fix encoding problems",
    s2Body1:
      "Characters like accented letters, currency symbols, or CJK text break when the encoding is wrong. The most common issue is a UTF-8 file opened as Latin-1, or vice versa.",
    s2Body2:
      "If you see garbled characters after import, the file was decoded with the wrong charset. Re-import specifying UTF-8 explicitly, or convert the file encoding before opening.",
    s3Title: "3) Handle quoting and escaping",
    s3Body:
      "Fields that contain the delimiter character must be quoted. When quoting is inconsistent, columns shift and rows break:",
    s3i1: "A comma inside an address field splits it into two columns if the field is not quoted.",
    s3i2: "Embedded newlines inside quoted fields can create phantom rows.",
    s3i3: "Double-quotes used as escape characters must be paired — a missing quote corrupts every row after it.",
    s4Title: "4) Convert to XLSX for a clean working copy",
    s4Body:
      "Once the CSV is clean, convert it to XLSX to lock in the structure. XLSX preserves column types, avoids re-parsing issues, and is safer to share with colleagues who might open it in different locale settings.",
    toolTitle: "Use this tool",
    toolBody:
      "XLSX World's CSV to XLSX converter handles delimiter detection, encoding, and structure automatically.",
    toolAction: "Open CSV to XLSX Tool",
    closing:
      "Want more practical walkthroughs? Browse all guides for step-by-step fixes to common spreadsheet problems.",
    back: "Back to all guides",
  },
  es: {
    metaTitle: "Cómo limpiar importaciones CSV en Excel",
    metaDescription:
      "Corrige separadores, problemas de codificación y estructura rota en archivos CSV antes de importarlos a Excel.",
    label: "Guía de Excel",
    heading: "Cómo limpiar importaciones CSV en Excel",
    intro:
      "Un CSV que se ve bien en un editor de texto puede convertirse en un desastre de una sola columna en Excel. Separadores, codificación y comillas son los culpables habituales. Esta guía te ayuda a diagnosticarlos y corregirlos antes de que arruinen tu análisis.",
    s1Title: "1) Verifica el delimitador antes de abrir",
    s1Body:
      "Excel asume comas por defecto, pero muchas exportaciones usan punto y coma, tabulaciones o pipes. Abrir con el delimitador incorrecto mete todo en la columna A.",
    s1i1: "Abre el CSV en un editor de texto plano y observa qué separa los valores.",
    s1i2: "Los sistemas europeos suelen exportar con punto y coma porque la coma se usa como separador decimal.",
    s1i3: "Los archivos separados por tabulaciones a veces usan extensión .csv — lo que importa es el contenido, no el nombre.",
    s2Title: "2) Corrige problemas de codificación",
    s2Body1:
      "Caracteres como letras acentuadas, símbolos de moneda o texto CJK se rompen cuando la codificación es incorrecta. El problema más común es un archivo UTF-8 abierto como Latin-1, o viceversa.",
    s2Body2:
      "Si ves caracteres ilegibles después de importar, el archivo se decodificó con el charset incorrecto. Reimporta especificando UTF-8 explícitamente o convierte la codificación antes de abrir.",
    s3Title: "3) Maneja comillas y escape",
    s3Body:
      "Los campos que contienen el carácter delimitador deben estar entre comillas. Cuando las comillas son inconsistentes, las columnas se desplazan y las filas se rompen:",
    s3i1: "Una coma dentro de un campo de dirección lo divide en dos columnas si no está entre comillas.",
    s3i2: "Los saltos de línea dentro de campos entrecomillados pueden crear filas fantasma.",
    s3i3: "Las comillas dobles usadas como escape deben estar emparejadas — una comilla faltante corrompe todas las filas siguientes.",
    s4Title: "4) Convierte a XLSX para una copia de trabajo limpia",
    s4Body:
      "Una vez que el CSV está limpio, conviértelo a XLSX para fijar la estructura. XLSX preserva tipos de columna, evita problemas de re-análisis y es más seguro para compartir.",
    toolTitle: "Usa esta herramienta",
    toolBody:
      "El conversor CSV a XLSX de XLSX World maneja detección de delimitadores, codificación y estructura automáticamente.",
    toolAction: "Abrir conversor CSV a XLSX",
    closing:
      "¿Quieres más guías prácticas? Explora todas las guías para resolver problemas comunes paso a paso.",
    back: "Volver a todas las guías",
  },
  fr: {
    metaTitle: "Comment nettoyer les imports CSV dans Excel",
    metaDescription:
      "Corrigez les séparateurs, l'encodage et la structure cassée des fichiers CSV avant de les importer dans Excel.",
    label: "Guide Excel",
    heading: "Comment nettoyer les imports CSV dans Excel",
    intro:
      "Un CSV qui semble correct dans un éditeur de texte peut devenir un désordre à une seule colonne dans Excel. Séparateurs, encodage et guillemets sont les coupables habituels. Ce guide vous aide à les diagnostiquer et les corriger avant qu'ils ne corrompent votre analyse.",
    s1Title: "1) Vérifiez le délimiteur avant d'ouvrir",
    s1Body:
      "Excel suppose des virgules par défaut, mais beaucoup d'exports utilisent des points-virgules, des tabulations ou des pipes. Ouvrir avec le mauvais délimiteur entasse tout dans la colonne A.",
    s1i1: "Ouvrez le CSV dans un éditeur de texte brut et regardez ce qui sépare les valeurs.",
    s1i2: "Les systèmes européens exportent souvent avec des points-virgules car la virgule sert de séparateur décimal.",
    s1i3: "Les fichiers séparés par tabulations utilisent parfois l'extension .csv — c'est le contenu qui compte, pas le nom.",
    s2Title: "2) Corrigez les problèmes d'encodage",
    s2Body1:
      "Les caractères accentués, symboles monétaires ou texte CJK se cassent quand l'encodage est incorrect. Le problème le plus courant est un fichier UTF-8 ouvert en Latin-1, ou inversement.",
    s2Body2:
      "Si vous voyez des caractères illisibles après l'import, le fichier a été décodé avec le mauvais charset. Réimportez en spécifiant UTF-8 explicitement ou convertissez l'encodage avant d'ouvrir.",
    s3Title: "3) Gérez les guillemets et l'échappement",
    s3Body:
      "Les champs contenant le caractère délimiteur doivent être entre guillemets. Quand les guillemets sont incohérents, les colonnes se décalent et les lignes se cassent :",
    s3i1: "Une virgule dans un champ d'adresse le divise en deux colonnes s'il n'est pas entre guillemets.",
    s3i2: "Les sauts de ligne dans les champs entre guillemets peuvent créer des lignes fantômes.",
    s3i3: "Les guillemets doubles utilisés comme échappement doivent être appariés — un guillemet manquant corrompt toutes les lignes suivantes.",
    s4Title: "4) Convertissez en XLSX pour une copie de travail propre",
    s4Body:
      "Une fois le CSV propre, convertissez-le en XLSX pour figer la structure. XLSX préserve les types de colonnes, évite les problèmes de ré-analyse et est plus sûr à partager.",
    toolTitle: "Utilisez cet outil",
    toolBody:
      "Le convertisseur CSV vers XLSX de XLSX World gère la détection des délimiteurs, l'encodage et la structure automatiquement.",
    toolAction: "Ouvrir le convertisseur CSV vers XLSX",
    closing:
      "Vous voulez plus de guides pratiques ? Parcourez tous les guides pour résoudre les problèmes courants de tableur.",
    back: "Retour à tous les guides",
  },
  pt: {
    metaTitle: "Como limpar importações CSV no Excel",
    metaDescription:
      "Corrija separadores, problemas de codificação e estrutura quebrada em arquivos CSV antes de importá-los no Excel.",
    label: "Guia de Excel",
    heading: "Como limpar importações CSV no Excel",
    intro:
      "Um CSV que parece correto em um editor de texto pode virar uma bagunça de coluna única no Excel. Separadores, codificação e aspas são os culpados habituais. Este guia ajuda você a diagnosticá-los e corrigi-los antes que corrompam sua análise.",
    s1Title: "1) Verifique o delimitador antes de abrir",
    s1Body:
      "O Excel assume vírgulas por padrão, mas muitas exportações usam ponto e vírgula, tabulações ou pipes. Abrir com o delimitador errado joga tudo na coluna A.",
    s1i1: "Abra o CSV em um editor de texto simples e veja o que separa os valores.",
    s1i2: "Sistemas europeus costumam exportar com ponto e vírgula porque a vírgula é usada como separador decimal.",
    s1i3: "Arquivos separados por tabulação às vezes usam extensão .csv — o que importa é o conteúdo, não o nome.",
    s2Title: "2) Corrija problemas de codificação",
    s2Body1:
      "Caracteres acentuados, símbolos de moeda ou texto CJK quebram quando a codificação está errada. O problema mais comum é um arquivo UTF-8 aberto como Latin-1, ou vice-versa.",
    s2Body2:
      "Se você vê caracteres ilegíveis após a importação, o arquivo foi decodificado com o charset errado. Reimporte especificando UTF-8 explicitamente ou converta a codificação antes de abrir.",
    s3Title: "3) Trate aspas e escape",
    s3Body:
      "Campos que contêm o caractere delimitador devem estar entre aspas. Quando as aspas são inconsistentes, colunas se deslocam e linhas quebram:",
    s3i1: "Uma vírgula dentro de um campo de endereço o divide em duas colunas se não estiver entre aspas.",
    s3i2: "Quebras de linha dentro de campos entre aspas podem criar linhas fantasma.",
    s3i3: "Aspas duplas usadas como escape devem estar emparelhadas — uma aspa faltando corrompe todas as linhas seguintes.",
    s4Title: "4) Converta para XLSX para uma cópia de trabalho limpa",
    s4Body:
      "Depois que o CSV estiver limpo, converta para XLSX para travar a estrutura. XLSX preserva tipos de coluna, evita problemas de re-análise e é mais seguro para compartilhar.",
    toolTitle: "Use esta ferramenta",
    toolBody:
      "O conversor CSV para XLSX do XLSX World lida com detecção de delimitadores, codificação e estrutura automaticamente.",
    toolAction: "Abrir conversor CSV para XLSX",
    closing:
      "Quer mais guias práticos? Veja todos os guias para resolver problemas comuns de planilhas passo a passo.",
    back: "Voltar para todos os guias",
  },
};

const SLUG = "/learn/how-to-clean-csv-imports";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const copy = GUIDE_COPY[locale] ?? GUIDE_COPY.en;

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: buildAlternates(SLUG),
  };
}

export default async function CleanCsvGuide({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = GUIDE_COPY[locale] ?? GUIDE_COPY.en;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: copy.metaTitle,
    description: copy.metaDescription,
    author: { "@type": "Organization", name: "XLSX World" },
    publisher: { "@type": "Organization", name: "XLSX World" },
    mainEntityOfPage: `${BASE_URL}/${locale}${SLUG}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <article
          className="rounded-2xl border border-border px-5 py-6 sm:px-8 sm:py-9"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--surface) 92%, var(--background) 8%)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.18)",
          }}
        >
          <p className="text-sm font-medium text-primary">{copy.label}</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-foreground">
            {copy.heading}
          </h1>
          <p className="mt-3 text-lg text-muted">{copy.intro}</p>

          <section className="mt-8 space-y-5 text-[16px] leading-7 text-foreground">
            <h2 className="text-2xl font-semibold">{copy.s1Title}</h2>
            <p>{copy.s1Body}</p>
            <ul className="list-disc pl-6 space-y-2 text-muted">
              <li>{copy.s1i1}</li>
              <li>{copy.s1i2}</li>
              <li>{copy.s1i3}</li>
            </ul>
          </section>

          <section className="mt-8 space-y-5 text-[16px] leading-7 text-foreground">
            <h2 className="text-2xl font-semibold">{copy.s2Title}</h2>
            <p>{copy.s2Body1}</p>
            <p>{copy.s2Body2}</p>
          </section>

          <section className="mt-8 space-y-5 text-[16px] leading-7 text-foreground">
            <h2 className="text-2xl font-semibold">{copy.s3Title}</h2>
            <p>{copy.s3Body}</p>
            <ul className="list-disc pl-6 space-y-2 text-muted">
              <li>{copy.s3i1}</li>
              <li>{copy.s3i2}</li>
              <li>{copy.s3i3}</li>
            </ul>
          </section>

          <section className="mt-8 space-y-5 text-[16px] leading-7 text-foreground">
            <h2 className="text-2xl font-semibold">{copy.s4Title}</h2>
            <p>{copy.s4Body}</p>
            <div
              className="rounded-xl border border-border p-5"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--background) 90%, var(--primary) 10%)",
              }}
            >
              <h3 className="text-lg font-semibold text-foreground">
                {copy.toolTitle}
              </h3>
              <p className="mt-2 text-sm text-muted">{copy.toolBody}</p>
              <Link
                href="/tools/csv-to-xlsx"
                className="mt-3 inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
              >
                {copy.toolAction}
              </Link>
            </div>
          </section>

          <section className="mt-10 border-t border-border pt-6">
            <p className="text-sm text-muted">{copy.closing}</p>
            <Link
              href="/learn"
              className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
            >
              {copy.back}
            </Link>
          </section>
        </article>
      </main>
    </>
  );
}
