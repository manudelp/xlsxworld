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
  "xlsx-to-pdf",
  "pdf-to-xlsx",
  "remove-duplicates",
  "trim-spaces",
  "normalize-case",
  "find-replace",
  "scan-formula-errors",
  "compare-workbooks",
  "remove-empty-rows",
  "summary-stats",
  "freeze-header",
  "auto-size-columns",
  "sort-rows",
  "transpose-sheet",
  "split-column",
  "validate-emails",
  "detect-blanks",
  "password-protect",
  "remove-password",
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
  "xlsx-to-pdf": {
    metaTitle: "Convert Excel to PDF Online Free",
    metaDescription:
      "Export Excel spreadsheets to formatted PDF documents. Select sheets and page orientation — free online XLSX to PDF converter, no signup required.",
  },
  "pdf-to-xlsx": {
    metaTitle: "Convert PDF to Excel XLSX Online Free",
    metaDescription:
      "Extract tables from PDF files into editable Excel workbooks. Automatic table detection — free online tool, no signup or installation needed.",
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
  "scan-formula-errors": {
    metaTitle: "Scan Formula Errors in Excel Online Free",
    metaDescription:
      "Find broken formulas in Excel files instantly. Detect #REF!, #VALUE!, #DIV/0!, #N/A, #NAME?, #NULL!, and #NUM! errors across all sheets — free Excel formula error checker.",
  },
  "compare-workbooks": {
    metaTitle: "Compare Two Excel Files Online Free",
    metaDescription:
      "Compare two Excel workbooks cell by cell. Detect added, removed, and modified cells across sheets — free Excel workbook diff tool, no signup required.",
  },
  "remove-empty-rows": {
    metaTitle: "Remove Empty Rows from Excel Online Free",
    metaDescription:
      "Delete blank rows from Excel files instantly. Clean all sheets or selected sheets — free online tool, no signup or installation needed.",
  },
  "summary-stats": {
    metaTitle: "Excel Column Statistics Summary Online Free",
    metaDescription:
      "Get count, min, max, mean, median, standard deviation, and sum for every numeric column. Download a formatted XLSX stats report — free online.",
  },
  "freeze-header": {
    metaTitle: "Freeze Header Row in Excel Online Free",
    metaDescription:
      "Freeze the first row or multiple rows so headers stay visible when scrolling. Free online tool — upload, set rows, download instantly.",
  },
  "auto-size-columns": {
    metaTitle: "Auto Fit Column Width in Excel Online Free",
    metaDescription:
      "Auto-size all column widths based on cell content across every sheet. Free online tool — upload your file and download with fitted columns.",
  },
  "sort-rows": {
    metaTitle: "Sort Excel Rows by Column Online Free",
    metaDescription:
      "Sort rows in an Excel sheet by one or more columns. Choose ascending or descending order — free online tool, no signup required.",
  },
  "transpose-sheet": {
    metaTitle: "Transpose Excel Sheet Rows to Columns Online Free",
    metaDescription:
      "Swap rows and columns in an Excel sheet instantly. Select a sheet, transpose, and download — free online tool, no installation needed.",
  },
  "split-column": {
    metaTitle: "Split Column in Excel by Delimiter Online Free",
    metaDescription:
      "Split a single Excel column into multiple columns by comma, space, dash, or custom delimiter. Free online tool — no signup required.",
  },
  "validate-emails": {
    metaTitle: "Validate Email Addresses in Excel Online Free",
    metaDescription:
      "Scan Excel columns for email addresses and validate their format. Get a color-coded report with Valid, Invalid, and Empty status — free online.",
  },
  "detect-blanks": {
    metaTitle: "Find Blank Cells in Excel Online Free",
    metaDescription:
      "Scan all sheets for blank cells and get a detailed report with summary and cell references. Free online blank cell detector — instant download.",
  },
  "password-protect": {
    metaTitle: "Protect Excel Sheet with Password Online Free",
    metaDescription:
      "Lock Excel sheets from editing with a password. Protect structure, content, and formatting to prevent accidental changes — free online tool.",
  },
  "remove-password": {
    metaTitle: "Remove Excel Sheet Protection Online Free",
    metaDescription:
      "Remove editing protection from all sheets in your Excel file instantly. Free online tool — no password needed, upload and download.",
  },
};
