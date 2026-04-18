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
  s1i4: string;
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
    metaTitle: "How to Find and Fix Broken Excel Formulas",
    metaDescription:
      "Learn a practical process to diagnose #REF!, #VALUE!, and #N/A errors, then validate your fixes quickly.",
    label: "Excel Guide",
    heading: "How to find and fix broken Excel formulas",
    intro:
      "Broken formulas are expensive because they hide quietly until a report is already wrong. This checklist helps you find issues quickly, fix root causes, and verify that your workbook is safe to share.",
    s1Title: "1) Start with the exact error type",
    s1Body:
      "Do not treat every formula error the same. The code usually points to the cause:",
    s1i1: "#REF! often means a referenced row, column, or sheet was deleted.",
    s1i2: "#VALUE! usually means a type mismatch, like text where a number is expected.",
    s1i3: "#N/A often means a lookup did not find a match.",
    s1i4: "#DIV/0! means the denominator can be zero or blank.",
    s2Title: "2) Trace dependencies before editing",
    s2Body1:
      "Pick one failing cell and map what it depends on. In most workbooks, many errors are copies of one upstream problem. Fixing the source cell first prevents repetitive manual edits.",
    s2Body2:
      "If your model uses lookups, confirm key columns are normalized first: same casing, no leading/trailing spaces, and matching data types.",
    s3Title: "3) Add guardrails around risky formulas",
    s3Body:
      "Use defensive patterns so one bad row does not cascade through the workbook:",
    s3i1: "Wrap divisions with IF checks to avoid #DIV/0!.",
    s3i2: "Use IFERROR where a temporary fallback is acceptable.",
    s3i3: "Use explicit data cleaning steps before lookup formulas.",
    s4Title: "4) Scan the full workbook before shipping",
    s4Body:
      "Manual spot checks miss hidden sheets and edge ranges. Before sending a workbook to a client or stakeholder, run a full scan and verify there are no remaining formula errors.",
    toolTitle: "Use this tool",
    toolBody:
      "XLSX World's scan tool checks every sheet for formula errors and gives you a clean report in seconds.",
    toolAction: "Open Scan Formula Errors Tool",
    closing:
      "Want more practical walkthroughs? Browse all guides for step-by-step fixes to common spreadsheet problems.",
    back: "Back to all guides",
  },
  es: {
    metaTitle: "Como encontrar y corregir formulas rotas en Excel",
    metaDescription:
      "Aprende un proceso practico para diagnosticar errores #REF!, #VALUE! y #N/A, y validar tus correcciones rapidamente.",
    label: "Guia de Excel",
    heading: "Como encontrar y corregir formulas rotas en Excel",
    intro:
      "Las formulas rotas son costosas porque suelen pasar desapercibidas hasta que el reporte ya esta mal. Esta guia te ayuda a detectar problemas rapido, corregir la causa raiz y validar que tu archivo sea confiable.",
    s1Title: "1) Empieza por el tipo exacto de error",
    s1Body:
      "No trates todos los errores de formula igual. El codigo casi siempre apunta a la causa:",
    s1i1: "#REF! suele indicar que se elimino una fila, columna u hoja referenciada.",
    s1i2: "#VALUE! suele significar incompatibilidad de tipo, por ejemplo texto donde se esperaba un numero.",
    s1i3: "#N/A suele indicar que una busqueda no encontro coincidencia.",
    s1i4: "#DIV/0! significa que el denominador es cero o esta vacio.",
    s2Title: "2) Traza dependencias antes de editar",
    s2Body1:
      "Elige una celda con error y mapea de que depende. En muchos libros, varios errores vienen de un solo problema aguas arriba.",
    s2Body2:
      "Si tu modelo usa busquedas, normaliza columnas clave primero: mismo uso de mayusculas, sin espacios al inicio/final y tipos de dato consistentes.",
    s3Title: "3) Agrega protecciones en formulas riesgosas",
    s3Body:
      "Usa patrones defensivos para evitar que una fila defectuosa afecte todo el archivo:",
    s3i1: "Envuelve divisiones con IF para evitar #DIV/0!.",
    s3i2: "Usa IFERROR cuando una salida temporal sea aceptable.",
    s3i3: "Aplica limpieza explicita de datos antes de formulas de busqueda.",
    s4Title: "4) Escanea todo el libro antes de enviarlo",
    s4Body:
      "Las revisiones manuales suelen omitir hojas ocultas o rangos extremos. Antes de compartir, ejecuta un escaneo completo y confirma que no quedan errores.",
    toolTitle: "Usa esta herramienta",
    toolBody:
      "La herramienta de escaneo de XLSX World revisa todas las hojas y te entrega un reporte limpio en segundos.",
    toolAction: "Abrir escaneo de formulas",
    closing:
      "Quieres mas guias practicas? Explora todas las guias para resolver problemas comunes de hoja de calculo paso a paso.",
    back: "Volver a todas las guias",
  },
  fr: {
    metaTitle: "Comment trouver et corriger des formules cassees dans Excel",
    metaDescription:
      "Apprenez une methode pratique pour diagnostiquer les erreurs #REF!, #VALUE! et #N/A, puis valider vos corrections rapidement.",
    label: "Guide Excel",
    heading: "Comment trouver et corriger des formules cassees dans Excel",
    intro:
      "Les formules cassees coutent cher car elles restent invisibles jusqu'a ce qu'un rapport soit deja faux. Cette methode vous aide a detecter rapidement les problemes et corriger la cause.",
    s1Title: "1) Commencez par le type exact d'erreur",
    s1Body:
      "Ne traitez pas toutes les erreurs de formule de la meme facon. Le code indique generalement la cause :",
    s1i1: "#REF! signifie souvent qu'une ligne, colonne ou feuille referencee a ete supprimee.",
    s1i2: "#VALUE! indique souvent un probleme de type, par exemple du texte au lieu d'un nombre.",
    s1i3: "#N/A signifie souvent qu'une recherche n'a trouve aucune correspondance.",
    s1i4: "#DIV/0! signifie que le denominateur est nul ou vide.",
    s2Title: "2) Tracez les dependances avant de modifier",
    s2Body1:
      "Choisissez une cellule en erreur et cartographiez ses dependances. Dans beaucoup de classeurs, plusieurs erreurs viennent d'un seul probleme amont.",
    s2Body2:
      "Si vous utilisez des recherches, normalisez d'abord les colonnes cles : meme casse, pas d'espaces de debut/fin et types de donnees coherents.",
    s3Title: "3) Ajoutez des garde-fous aux formules sensibles",
    s3Body:
      "Utilisez des modeles defensifs pour qu'une seule ligne invalide ne se propage pas dans le classeur :",
    s3i1: "Encadrez les divisions avec IF pour eviter #DIV/0!.",
    s3i2: "Utilisez IFERROR lorsqu'une valeur de secours temporaire est acceptable.",
    s3i3: "Ajoutez un nettoyage explicite des donnees avant les formules de recherche.",
    s4Title: "4) Analysez tout le classeur avant envoi",
    s4Body:
      "Les controles manuels ratent souvent des feuilles cachees ou des zones limites. Avant de partager un fichier, lancez une analyse complete.",
    toolTitle: "Utilisez cet outil",
    toolBody:
      "L'outil d'analyse XLSX World verifie toutes les feuilles et produit un rapport clair en quelques secondes.",
    toolAction: "Ouvrir l'outil d'analyse des formules",
    closing:
      "Vous voulez plus de guides pratiques ? Parcourez tous les guides pour resoudre les problemes courants de tableur.",
    back: "Retour a tous les guides",
  },
  pt: {
    metaTitle: "Como encontrar e corrigir formulas quebradas no Excel",
    metaDescription:
      "Aprenda um processo pratico para diagnosticar erros #REF!, #VALUE! e #N/A e validar suas correcoes rapidamente.",
    label: "Guia de Excel",
    heading: "Como encontrar e corrigir formulas quebradas no Excel",
    intro:
      "Formulas quebradas custam caro porque ficam escondidas ate que o relatorio ja esteja errado. Este guia ajuda voce a detectar problemas rapidamente e corrigir a causa.",
    s1Title: "1) Comece pelo tipo exato de erro",
    s1Body:
      "Nao trate todo erro de formula da mesma forma. O codigo normalmente aponta a causa:",
    s1i1: "#REF! geralmente significa que uma linha, coluna ou aba referenciada foi excluida.",
    s1i2: "#VALUE! normalmente indica incompatibilidade de tipo, como texto onde se esperava numero.",
    s1i3: "#N/A normalmente significa que uma busca nao encontrou correspondencia.",
    s1i4: "#DIV/0! significa que o denominador esta zero ou vazio.",
    s2Title: "2) Rastreie dependencias antes de editar",
    s2Body1:
      "Escolha uma celula com erro e mapeie do que ela depende. Em muitas planilhas, varios erros surgem de um unico problema de origem.",
    s2Body2:
      "Se o modelo usa buscas, normalize colunas-chave primeiro: mesma capitalizacao, sem espacos no inicio/fim e tipos de dados consistentes.",
    s3Title: "3) Adicione protecoes em formulas de risco",
    s3Body:
      "Use padroes defensivos para que uma linha invalida nao se espalhe por toda a planilha:",
    s3i1: "Envolva divisoes com IF para evitar #DIV/0!.",
    s3i2: "Use IFERROR quando um valor de contingencia for aceitavel.",
    s3i3: "Aplique limpeza explicita de dados antes de formulas de busca.",
    s4Title: "4) Escaneie toda a planilha antes de enviar",
    s4Body:
      "Verificacoes manuais costumam perder abas ocultas e faixas de borda. Antes de compartilhar, rode uma verificacao completa.",
    toolTitle: "Use esta ferramenta",
    toolBody:
      "A ferramenta do XLSX World verifica todas as abas e entrega um relatorio limpo em segundos.",
    toolAction: "Abrir escaneamento de formulas",
    closing:
      "Quer mais guias praticos? Veja todos os guias para resolver problemas comuns de planilhas passo a passo.",
    back: "Voltar para todos os guias",
  },
};

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
    alternates: buildAlternates(
      "/learn/how-to-find-and-fix-broken-excel-formulas",
    ),
  };
}

export default async function BrokenFormulasGuidePage({
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
    author: {
      "@type": "Organization",
      name: "XLSX World",
    },
    publisher: {
      "@type": "Organization",
      name: "XLSX World",
    },
    mainEntityOfPage: `${BASE_URL}/${locale}/learn/how-to-find-and-fix-broken-excel-formulas`,
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
              <li>{copy.s1i4}</li>
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
                href="/tools/scan-formula-errors"
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
