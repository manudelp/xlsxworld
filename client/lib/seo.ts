import type { Metadata } from "next";

export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://xlsx.world";

export const LOCALES = ["en", "es", "fr", "pt"] as const;

export function buildAlternates(path: string) {
  const canonical = `${BASE_URL}${path}`;
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${BASE_URL}/${locale}${path}`;
  }
  languages["x-default"] = canonical;
  return { canonical, languages };
}

export function toolPageMetadata(
  slug: string,
  locale: string,
): Metadata | null {
  const seo = TOOL_SEO[slug];
  if (!seo) return null;
  const alternates = buildAlternates(`/tools/${slug}`);
  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    alternates,
    openGraph: {
      title: `${seo.metaTitle} | XLSX World`,
      description: seo.metaDescription,
      url: `${BASE_URL}/${locale}/tools/${slug}`,
      siteName: "XLSX World",
      locale: locale === "en" ? "en_US" : locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${seo.metaTitle} | XLSX World`,
      description: seo.metaDescription,
    },
  };
}

export interface ToolSeo {
  metaTitle: string;
  metaDescription: string;
}

export const ACTIVE_TOOL_SLUGS = [
  "inspect-sheets",
  "merge-sheets",
  "append-workbooks",
  "split-sheet",
  "split-workbook",
  "xlsx-to-csv",
  "csv-to-xlsx",
  "xlsx-to-json",
  "json-to-xlsx",
  "xlsx-to-sql",
  "sql-to-xlsx",
  "xlsx-to-xml",
  "xml-to-xlsx",
  "remove-duplicates",
  "trim-spaces",
  "normalize-case",
  "find-replace",
] as const;

export const TOOL_SEO: Record<string, ToolSeo> = {
  "inspect-sheets": {
    metaTitle: "Inspect Excel Sheets Online Free",
    metaDescription:
      "Inspect your Excel workbook structure instantly. View sheet names, row counts, column stats, and data quality checks — free, no signup required.",
  },
  "merge-sheets": {
    metaTitle: "Merge Excel Sheets Online Free",
    metaDescription:
      "Merge multiple sheets from one Excel workbook into a single sheet. Combine data with a shared header row — free online tool, no signup needed.",
  },
  "append-workbooks": {
    metaTitle: "Append Excel Workbooks Online Free",
    metaDescription:
      "Combine rows from multiple Excel workbooks into one file. Upload several XLSX files and append them in order — free, no installation required.",
  },
  "split-sheet": {
    metaTitle: "Split Excel Sheet by Rows Online Free",
    metaDescription:
      "Split a large Excel sheet into smaller chunks by row count. Customize output names and numbering — free online tool, no signup required.",
  },
  "split-workbook": {
    metaTitle: "Split Excel Workbook Into Separate Files Online Free",
    metaDescription:
      "Split a multi-sheet Excel workbook into individual XLSX files — one per sheet. Download as a ZIP archive, free and instant.",
  },
  "xlsx-to-csv": {
    metaTitle: "Convert XLSX to CSV Online Free",
    metaDescription:
      "Convert Excel XLSX files to CSV format instantly. Export one sheet or all sheets as a ZIP of CSVs — free online, no signup required.",
  },
  "csv-to-xlsx": {
    metaTitle: "Convert CSV to Excel XLSX Online Free",
    metaDescription:
      "Convert CSV files to Excel XLSX format instantly. Configure delimiter and sheet name — free online tool, no signup or installation needed.",
  },
  "xlsx-to-json": {
    metaTitle: "Convert Excel to JSON Online Free",
    metaDescription:
      "Convert Excel XLSX sheets to JSON format for APIs and workflows. Export one or multiple sheets — free online, no signup required.",
  },
  "json-to-xlsx": {
    metaTitle: "Convert JSON to Excel XLSX Online Free",
    metaDescription:
      "Convert JSON arrays or objects to Excel XLSX workbooks instantly. Free online tool — upload your JSON and download a formatted spreadsheet.",
  },
  "xlsx-to-sql": {
    metaTitle: "Convert Excel to SQL Online Free",
    metaDescription:
      "Generate SQL CREATE TABLE and INSERT statements from Excel files. Free online XLSX to SQL converter — no signup, instant download.",
  },
  "sql-to-xlsx": {
    metaTitle: "Convert SQL to Excel XLSX Online Free",
    metaDescription:
      "Parse SQL INSERT statements into an Excel workbook. One sheet per table, columns auto-detected — free online tool, no signup needed.",
  },
  "xlsx-to-xml": {
    metaTitle: "Convert Excel to XML Online Free",
    metaDescription:
      "Transform Excel spreadsheet rows into XML documents. Customize root and row tags — free online XLSX to XML converter, no signup required.",
  },
  "xml-to-xlsx": {
    metaTitle: "Convert XML to Excel XLSX Online Free",
    metaDescription:
      "Import XML files into Excel workbooks. Map XML nodes to rows and columns automatically — free online tool, no signup or installation.",
  },
  "remove-duplicates": {
    metaTitle: "Remove Duplicate Rows from Excel Online Free",
    metaDescription:
      "Find and remove duplicate rows in Excel files based on selected columns. Keep first or last occurrence — free online tool, instant download.",
  },
  "trim-spaces": {
    metaTitle: "Trim Spaces in Excel Online Free",
    metaDescription:
      "Remove leading, trailing, and extra spaces from Excel cells. Clean one sheet or all sheets at once — free online tool, no signup needed.",
  },
  "normalize-case": {
    metaTitle: "Normalize Text Case in Excel Online Free",
    metaDescription:
      "Convert Excel text to uppercase, lowercase, or title case across sheets and columns. Free online tool — no signup, instant download.",
  },
  "find-replace": {
    metaTitle: "Find and Replace in Excel Online Free",
    metaDescription:
      "Search and replace text or regex patterns across Excel sheets and columns. Free online find-and-replace tool — no signup, instant results.",
  },
};
