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
    metaTitle: "How to Merge Multiple Excel Files Without Errors",
    metaDescription:
      "Learn how to combine multiple Excel workbooks into one without losing headers, duplicating rows, or breaking formulas.",
    label: "Excel Guide",
    heading: "How to merge multiple Excel files without errors",
    intro:
      "Merging Excel files by hand means copy-pasting between tabs, fixing shifted columns, and hoping nothing breaks. This guide covers the common pitfalls and a faster way to combine workbooks reliably.",
    s1Title: "1) Make sure headers match before merging",
    s1Body:
      "The number one cause of broken merges is mismatched columns. If one file has 'Name' and another has 'Full Name', the merge treats them as different fields.",
    s1i1: "Open each file and compare column headers — order and spelling both matter.",
    s1i2: "Watch for hidden columns that shift the layout without being visible.",
    s1i3: "Normalize headers first: same casing, no trailing spaces, consistent naming.",
    s2Title: "2) Check for duplicate rows",
    s2Body1:
      "When files overlap in time range or data source, merging creates duplicates. A report from January and a report from Q1 will share three months of rows.",
    s2Body2:
      "Decide on a deduplication key before merging — usually a unique ID column, a timestamp, or a combination of fields that identify a unique record.",
    s3Title: "3) Preserve data types across files",
    s3Body:
      "Excel files from different sources often store the same data differently. Mixing them without cleanup causes silent errors:",
    s3i1: "Dates stored as text in one file and as date serial numbers in another will not sort correctly after merge.",
    s3i2: "Numbers formatted as text (with leading zeros like ZIP codes) lose their formatting when pasted into a numeric column.",
    s3i3: "Currency columns with different decimal separators (comma vs. period) produce wrong totals.",
    s4Title: "4) Use a tool instead of copy-paste",
    s4Body:
      "Manual copy-paste across 5+ files is slow and error-prone. A dedicated merge tool reads all files, aligns columns by header, and stacks rows into a single output — no manual intervention needed.",
    toolTitle: "Use this tool",
    toolBody:
      "XLSX World's Append Workbooks tool combines multiple Excel files into one, matching headers automatically.",
    toolAction: "Open Append Workbooks Tool",
    closing:
      "Want more practical walkthroughs? Browse all guides for step-by-step fixes to common spreadsheet problems.",
    back: "Back to all guides",
  },
  es: {
    metaTitle: "Cómo combinar varios archivos Excel sin errores",
    metaDescription:
      "Aprende a combinar varios libros de Excel en uno sin perder encabezados, duplicar filas ni romper fórmulas.",
    label: "Guía de Excel",
    heading: "Cómo combinar varios archivos Excel sin errores",
    intro:
      "Combinar archivos Excel a mano significa copiar y pegar entre pestañas, corregir columnas desplazadas y esperar que nada se rompa. Esta guía cubre los errores comunes y una forma más rápida de unir libros de forma confiable.",
    s1Title: "1) Asegúrate de que los encabezados coincidan",
    s1Body:
      "La causa número uno de combinaciones fallidas son columnas que no coinciden. Si un archivo tiene 'Nombre' y otro 'Nombre completo', la combinación los trata como campos diferentes.",
    s1i1: "Abre cada archivo y compara los encabezados — el orden y la ortografía importan.",
    s1i2: "Cuidado con columnas ocultas que desplazan el diseño sin ser visibles.",
    s1i3: "Normaliza los encabezados primero: misma capitalización, sin espacios al final, nombres consistentes.",
    s2Title: "2) Revisa filas duplicadas",
    s2Body1:
      "Cuando los archivos se superponen en rango de fechas o fuente de datos, la combinación crea duplicados. Un reporte de enero y uno del Q1 comparten tres meses de filas.",
    s2Body2:
      "Define una clave de deduplicación antes de combinar — generalmente un ID único, una marca de tiempo o una combinación de campos que identifique un registro único.",
    s3Title: "3) Preserva los tipos de datos entre archivos",
    s3Body:
      "Archivos Excel de diferentes fuentes suelen almacenar los mismos datos de forma diferente. Mezclarlos sin limpieza causa errores silenciosos:",
    s3i1: "Fechas almacenadas como texto en un archivo y como números seriales en otro no se ordenarán correctamente.",
    s3i2: "Números formateados como texto (con ceros iniciales como códigos postales) pierden su formato al pegarse en una columna numérica.",
    s3i3: "Columnas de moneda con diferentes separadores decimales (coma vs. punto) producen totales incorrectos.",
    s4Title: "4) Usa una herramienta en vez de copiar y pegar",
    s4Body:
      "Copiar y pegar manualmente entre 5+ archivos es lento y propenso a errores. Una herramienta dedicada lee todos los archivos, alinea columnas por encabezado y apila las filas en una sola salida.",
    toolTitle: "Usa esta herramienta",
    toolBody:
      "La herramienta Append Workbooks de XLSX World combina varios archivos Excel en uno, alineando encabezados automáticamente.",
    toolAction: "Abrir Append Workbooks",
    closing:
      "¿Quieres más guías prácticas? Explora todas las guías para resolver problemas comunes paso a paso.",
    back: "Volver a todas las guías",
  },
  fr: {
    metaTitle: "Comment fusionner plusieurs fichiers Excel sans erreurs",
    metaDescription:
      "Apprenez à combiner plusieurs classeurs Excel en un seul sans perdre les en-têtes, dupliquer les lignes ou casser les formules.",
    label: "Guide Excel",
    heading: "Comment fusionner plusieurs fichiers Excel sans erreurs",
    intro:
      "Fusionner des fichiers Excel à la main signifie copier-coller entre onglets, corriger les colonnes décalées et espérer que rien ne casse. Ce guide couvre les pièges courants et une méthode plus rapide pour combiner des classeurs de manière fiable.",
    s1Title: "1) Vérifiez que les en-têtes correspondent",
    s1Body:
      "La cause numéro un des fusions ratées est le décalage de colonnes. Si un fichier a 'Nom' et un autre 'Nom complet', la fusion les traite comme des champs différents.",
    s1i1: "Ouvrez chaque fichier et comparez les en-têtes — l'ordre et l'orthographe comptent.",
    s1i2: "Attention aux colonnes masquées qui décalent la mise en page sans être visibles.",
    s1i3: "Normalisez les en-têtes d'abord : même casse, pas d'espaces en fin, noms cohérents.",
    s2Title: "2) Vérifiez les doublons",
    s2Body1:
      "Quand les fichiers se chevauchent en période ou source de données, la fusion crée des doublons. Un rapport de janvier et un rapport du T1 partagent trois mois de lignes.",
    s2Body2:
      "Définissez une clé de déduplication avant de fusionner — généralement un ID unique, un horodatage ou une combinaison de champs identifiant un enregistrement unique.",
    s3Title: "3) Préservez les types de données entre fichiers",
    s3Body:
      "Les fichiers Excel de sources différentes stockent souvent les mêmes données différemment. Les mélanger sans nettoyage cause des erreurs silencieuses :",
    s3i1: "Les dates stockées en texte dans un fichier et en numéros de série dans un autre ne se trieront pas correctement.",
    s3i2: "Les nombres formatés en texte (avec des zéros initiaux comme les codes postaux) perdent leur format en étant collés dans une colonne numérique.",
    s3i3: "Les colonnes de devises avec des séparateurs décimaux différents (virgule vs. point) produisent des totaux erronés.",
    s4Title: "4) Utilisez un outil au lieu du copier-coller",
    s4Body:
      "Le copier-coller manuel entre 5+ fichiers est lent et source d'erreurs. Un outil dédié lit tous les fichiers, aligne les colonnes par en-tête et empile les lignes dans une seule sortie.",
    toolTitle: "Utilisez cet outil",
    toolBody:
      "L'outil Append Workbooks de XLSX World combine plusieurs fichiers Excel en un seul, en alignant les en-têtes automatiquement.",
    toolAction: "Ouvrir Append Workbooks",
    closing:
      "Vous voulez plus de guides pratiques ? Parcourez tous les guides pour résoudre les problèmes courants de tableur.",
    back: "Retour à tous les guides",
  },
  pt: {
    metaTitle: "Como combinar vários arquivos Excel sem erros",
    metaDescription:
      "Aprenda a combinar várias planilhas Excel em uma só sem perder cabeçalhos, duplicar linhas ou quebrar fórmulas.",
    label: "Guia de Excel",
    heading: "Como combinar vários arquivos Excel sem erros",
    intro:
      "Combinar arquivos Excel manualmente significa copiar e colar entre abas, corrigir colunas deslocadas e torcer para nada quebrar. Este guia cobre os erros comuns e uma forma mais rápida de unir planilhas de forma confiável.",
    s1Title: "1) Certifique-se de que os cabeçalhos coincidam",
    s1Body:
      "A causa número um de combinações com erro são colunas que não coincidem. Se um arquivo tem 'Nome' e outro 'Nome completo', a combinação os trata como campos diferentes.",
    s1i1: "Abra cada arquivo e compare os cabeçalhos — a ordem e a ortografia importam.",
    s1i2: "Cuidado com colunas ocultas que deslocam o layout sem serem visíveis.",
    s1i3: "Normalize os cabeçalhos primeiro: mesma capitalização, sem espaços no final, nomes consistentes.",
    s2Title: "2) Verifique linhas duplicadas",
    s2Body1:
      "Quando os arquivos se sobrepõem em período ou fonte de dados, a combinação cria duplicatas. Um relatório de janeiro e um do Q1 compartilham três meses de linhas.",
    s2Body2:
      "Defina uma chave de deduplicação antes de combinar — geralmente um ID único, um timestamp ou uma combinação de campos que identifique um registro único.",
    s3Title: "3) Preserve os tipos de dados entre arquivos",
    s3Body:
      "Arquivos Excel de fontes diferentes costumam armazenar os mesmos dados de formas diferentes. Misturá-los sem limpeza causa erros silenciosos:",
    s3i1: "Datas armazenadas como texto em um arquivo e como números seriais em outro não serão ordenadas corretamente.",
    s3i2: "Números formatados como texto (com zeros à esquerda como CEPs) perdem a formatação ao serem colados em uma coluna numérica.",
    s3i3: "Colunas de moeda com separadores decimais diferentes (vírgula vs. ponto) produzem totais errados.",
    s4Title: "4) Use uma ferramenta em vez de copiar e colar",
    s4Body:
      "Copiar e colar manualmente entre 5+ arquivos é lento e propenso a erros. Uma ferramenta dedicada lê todos os arquivos, alinha colunas por cabeçalho e empilha as linhas em uma única saída.",
    toolTitle: "Use esta ferramenta",
    toolBody:
      "A ferramenta Append Workbooks do XLSX World combina vários arquivos Excel em um, alinhando cabeçalhos automaticamente.",
    toolAction: "Abrir Append Workbooks",
    closing:
      "Quer mais guias práticos? Veja todos os guias para resolver problemas comuns de planilhas passo a passo.",
    back: "Voltar para todos os guias",
  },
};

const SLUG = "/learn/how-to-merge-excel-files";

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

export default async function MergeExcelGuide({
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
                href="/tools/append-workbooks"
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
