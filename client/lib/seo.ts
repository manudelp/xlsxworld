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
  howItWorks: [string, string, string];
  whyUse: string;
  faq: [
    { q: string; a: string },
    { q: string; a: string },
    { q: string; a: string },
  ];
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
    howItWorks: [
      "Upload your Excel file (.xlsx, .xls, or .xlsb) using the file picker or drag-and-drop.",
      "The tool reads every sheet and displays row counts, column headers, data types, and quality stats.",
      "Browse sheets, filter rows, sort columns, and spot issues before running other tools.",
    ],
    whyUse:
      "Quickly audit an unfamiliar spreadsheet before processing it. See blank rows, duplicate counts, and column types at a glance — no need to open Excel or install anything.",
    faq: [
      {
        q: "What file formats can I inspect?",
        a: "You can inspect .xlsx, .xls, and .xlsb files up to 20 MB.",
      },
      {
        q: "Does inspecting modify my file?",
        a: "No. Inspection is read-only — your original file is never changed.",
      },
      {
        q: "Can I inspect password-protected files?",
        a: "No. Password-protected workbooks must be unlocked before inspection.",
      },
    ],
  },
  "merge-sheets": {
    metaTitle: "Merge Excel Sheets Online Free",
    metaDescription:
      "Merge multiple sheets from one Excel workbook into a single sheet. Combine data with a shared header row — free online tool, no signup needed.",
    howItWorks: [
      "Upload an Excel workbook that contains the sheets you want to merge.",
      "Select which sheets to include and arrange their merge order.",
      "Click Merge to download a new workbook with all selected data in one sheet.",
    ],
    whyUse:
      "When your data is split across tabs in the same workbook, merging them into one sheet makes analysis, pivot tables, and reporting much easier.",
    faq: [
      {
        q: "Do all sheets need the same columns?",
        a: "Ideally yes. The tool uses the first selected sheet's header as the shared header row.",
      },
      {
        q: "Is there a limit on how many sheets I can merge?",
        a: "No hard limit — you can merge all sheets in the workbook as long as the file is under 20 MB.",
      },
      {
        q: "Will formulas be preserved?",
        a: "Data values are preserved. Formulas, styles, and advanced formatting are not carried over.",
      },
    ],
  },
  "append-workbooks": {
    metaTitle: "Append Excel Workbooks Online Free",
    metaDescription:
      "Combine rows from multiple Excel workbooks into one file. Upload several XLSX files and append them in order — free, no installation required.",
    howItWorks: [
      "Upload two or more Excel workbooks using the file picker.",
      "Arrange the file order and choose an output sheet name.",
      "Click Append to download a single workbook with all rows combined.",
    ],
    whyUse:
      "Perfect for consolidating monthly reports, survey batches, or data exports from different systems into one unified spreadsheet.",
    faq: [
      {
        q: "Do the workbooks need identical columns?",
        a: "They should share the same column structure for best results. Mismatched columns may cause alignment issues.",
      },
      {
        q: "How many files can I append at once?",
        a: "There is no fixed limit on file count, but total combined size should stay under 20 MB.",
      },
      {
        q: "Can I control which sheet is used from each workbook?",
        a: "The tool appends all source sheets. Use the merge tool first if you need to pick specific sheets.",
      },
    ],
  },
  "split-sheet": {
    metaTitle: "Split Excel Sheet by Rows Online Free",
    metaDescription:
      "Split a large Excel sheet into smaller chunks by row count. Customize output names and numbering — free online tool, no signup required.",
    howItWorks: [
      "Upload an Excel file and select the sheet you want to split.",
      "Set the number of rows per chunk and customize the output naming style.",
      "Click Split to download a workbook with each chunk as a separate sheet.",
    ],
    whyUse:
      "Break oversized sheets into manageable pieces for import limits, email attachments, or batch processing without losing your header row.",
    faq: [
      {
        q: "Is the header row included in every chunk?",
        a: "Yes. The header row from the original sheet is automatically repeated in each output chunk.",
      },
      {
        q: "Can I split by a column value instead of row count?",
        a: "Currently the tool splits by fixed row count only. Column-based splitting is planned.",
      },
      {
        q: "What naming styles are available?",
        a: "You can use numeric (01, 02), alphabetic (A, B), or custom token sequences.",
      },
    ],
  },
  "split-workbook": {
    metaTitle: "Split Excel Workbook Into Separate Files Online Free",
    metaDescription:
      "Split a multi-sheet Excel workbook into individual XLSX files — one per sheet. Download as a ZIP archive, free and instant.",
    howItWorks: [
      "Upload an Excel workbook with multiple sheets.",
      "Select which sheets to include in the output.",
      "Click Split to download a ZIP file containing one XLSX per sheet.",
    ],
    whyUse:
      "Distribute individual sheets to different teams or systems that only accept single-sheet files, without manually saving each tab.",
    faq: [
      {
        q: "Are sheet names preserved in the output files?",
        a: "Yes. Each output file is named after its source sheet.",
      },
      {
        q: "Can I split only some sheets?",
        a: "Yes. You can select exactly which sheets to include in the ZIP output.",
      },
      {
        q: "What format is the download?",
        a: "You get a .zip archive containing one .xlsx file per selected sheet.",
      },
    ],
  },
  "xlsx-to-csv": {
    metaTitle: "Convert XLSX to CSV Online Free",
    metaDescription:
      "Convert Excel XLSX files to CSV format instantly. Export one sheet or all sheets as a ZIP of CSVs — free online, no signup required.",
    howItWorks: [
      "Upload your Excel file (.xlsx, .xls, or .xlsb).",
      "Select one sheet for a single CSV or multiple sheets for a ZIP of CSVs.",
      "Click Download to get your CSV file instantly.",
    ],
    whyUse:
      "CSV is the universal data exchange format. Convert your Excel files to CSV for database imports, data pipelines, or any system that doesn't support XLSX.",
    faq: [
      {
        q: "Can I convert all sheets at once?",
        a: "Yes. Select multiple sheets and download them as a ZIP archive of CSV files.",
      },
      {
        q: "What encoding is used?",
        a: "CSV files are exported in UTF-8 encoding for maximum compatibility.",
      },
      {
        q: "Are formulas converted?",
        a: "Only the computed values are exported. Formulas themselves are not included in CSV output.",
      },
    ],
  },
  "csv-to-xlsx": {
    metaTitle: "Convert CSV to Excel XLSX Online Free",
    metaDescription:
      "Convert CSV files to Excel XLSX format instantly. Configure delimiter and sheet name — free online tool, no signup or installation needed.",
    howItWorks: [
      "Upload your CSV file using the file picker or drag-and-drop.",
      "Set the delimiter (comma, semicolon, tab, or custom) and output sheet name.",
      "Click Convert to download your new XLSX workbook.",
    ],
    whyUse:
      "Turn plain CSV data into a proper Excel workbook for formatting, formulas, charts, and sharing with colleagues who prefer XLSX.",
    faq: [
      {
        q: "What delimiters are supported?",
        a: "Comma, semicolon, tab, and custom single-character delimiters.",
      },
      {
        q: "Will my data types be preserved?",
        a: "Yes. Numbers, dates, and text are detected and stored with appropriate Excel types.",
      },
      {
        q: "Is there a row limit?",
        a: "The tool handles files up to 20 MB, which typically covers hundreds of thousands of rows.",
      },
    ],
  },
  "xlsx-to-json": {
    metaTitle: "Convert Excel to JSON Online Free",
    metaDescription:
      "Convert Excel XLSX sheets to JSON format for APIs and workflows. Export one or multiple sheets — free online, no signup required.",
    howItWorks: [
      "Upload your Excel file and select the sheets to export.",
      "The first row is used as JSON keys; each subsequent row becomes an object.",
      "Click Download JSON to get your structured data file.",
    ],
    whyUse:
      "JSON is the standard format for web APIs and modern data pipelines. Convert spreadsheets to JSON for direct use in applications, scripts, or databases.",
    faq: [
      {
        q: "What JSON structure is produced?",
        a: "An array of objects where each object represents a row, with column headers as keys.",
      },
      {
        q: "How are nested values handled?",
        a: "Nested objects and arrays in cells are serialized as JSON text strings.",
      },
      {
        q: "Can I export multiple sheets?",
        a: "Yes. Select multiple sheets and they are included as separate arrays in the output.",
      },
    ],
  },
  "json-to-xlsx": {
    metaTitle: "Convert JSON to Excel XLSX Online Free",
    metaDescription:
      "Convert JSON arrays or objects to Excel XLSX workbooks instantly. Free online tool — upload your JSON and download a formatted spreadsheet.",
    howItWorks: [
      "Upload a JSON file containing an array of objects, array of arrays, or an object of arrays.",
      "The tool auto-detects the structure and maps it to rows and columns.",
      "Click Convert to download your XLSX workbook.",
    ],
    whyUse:
      "Turn API responses, config files, or exported data into Excel spreadsheets for analysis, reporting, or sharing with non-technical stakeholders.",
    faq: [
      {
        q: "What JSON structures are supported?",
        a: "Array of objects, array of arrays, and object of arrays (one sheet per key).",
      },
      {
        q: "Are nested objects flattened?",
        a: "Nested objects are serialized as JSON text in cells. Deep flattening is not applied.",
      },
      {
        q: "Can I include column headers?",
        a: "Yes. There is an option to include or exclude column headers in the output.",
      },
    ],
  },
  "xlsx-to-sql": {
    metaTitle: "Convert Excel to SQL Online Free",
    metaDescription:
      "Generate SQL CREATE TABLE and INSERT statements from Excel files. Free online XLSX to SQL converter — no signup, instant download.",
    howItWorks: [
      "Upload your Excel file and select the sheets to export.",
      "The tool infers column types and generates CREATE TABLE statements.",
      "Download a .sql file with CREATE and INSERT statements for every row.",
    ],
    whyUse:
      "Quickly seed a database from spreadsheet data. Generate ready-to-run SQL scripts for MySQL, PostgreSQL, SQLite, or any SQL-compatible database.",
    faq: [
      {
        q: "What SQL types are inferred?",
        a: "The tool detects BOOLEAN, INTEGER, REAL, DATE, and TEXT based on cell values.",
      },
      {
        q: "Can I add a table name prefix?",
        a: "Yes. You can set an optional prefix that is prepended to each table name.",
      },
      {
        q: "Which databases are compatible?",
        a: "The generated SQL uses standard syntax compatible with MySQL, PostgreSQL, SQLite, and most SQL databases.",
      },
    ],
  },
  "sql-to-xlsx": {
    metaTitle: "Convert SQL to Excel XLSX Online Free",
    metaDescription:
      "Parse SQL INSERT statements into an Excel workbook. One sheet per table, columns auto-detected — free online tool, no signup needed.",
    howItWorks: [
      "Upload a .sql file containing INSERT INTO statements.",
      "The tool extracts table names, columns, and row data automatically.",
      "Download an XLSX workbook with one sheet per table.",
    ],
    whyUse:
      "Visualize SQL dump data in Excel for quick review, auditing, or sharing with team members who don't have database access.",
    faq: [
      {
        q: "What SQL statements are supported?",
        a: "Only INSERT INTO statements are parsed. CREATE TABLE, SELECT, and other statements are ignored.",
      },
      {
        q: "Are multiple tables supported?",
        a: "Yes. Each table found in the SQL file becomes a separate sheet in the output workbook.",
      },
      {
        q: "What if my SQL file has no INSERT statements?",
        a: "The tool will produce an empty workbook. Ensure your file contains valid INSERT statements.",
      },
    ],
  },
  "xlsx-to-xml": {
    metaTitle: "Convert Excel to XML Online Free",
    metaDescription:
      "Transform Excel spreadsheet rows into XML documents. Customize root and row tags — free online XLSX to XML converter, no signup required.",
    howItWorks: [
      "Upload your Excel file and select the sheets to export.",
      "Set the root element tag and row element tag names.",
      "Download an XML file where each row becomes an XML element.",
    ],
    whyUse:
      "Generate XML feeds, configuration files, or data interchange documents directly from spreadsheet data without writing code.",
    faq: [
      {
        q: "Can I customize the XML tag names?",
        a: "Yes. You can set both the root element and row element tag names.",
      },
      {
        q: "How are column headers used?",
        a: "The first row is used as element names. Each data row becomes a child element of the root.",
      },
      {
        q: "Is the output valid XML?",
        a: "Yes. The tool generates well-formed XML with proper encoding declarations.",
      },
    ],
  },
  "xml-to-xlsx": {
    metaTitle: "Convert XML to Excel XLSX Online Free",
    metaDescription:
      "Import XML files into Excel workbooks. Map XML nodes to rows and columns automatically — free online tool, no signup or installation.",
    howItWorks: [
      "Upload an XML file with a tabular or repeating-element structure.",
      "The tool auto-detects row elements and maps sub-elements to columns.",
      "Download an XLSX workbook with your XML data in spreadsheet format.",
    ],
    whyUse:
      "Convert XML feeds, API responses, or configuration exports into Excel for filtering, sorting, and analysis without manual data entry.",
    faq: [
      {
        q: "What XML structures are supported?",
        a: "Tabular XML with repeating child elements works best. Deeply nested XML may not convert as expected.",
      },
      {
        q: "Are attributes included?",
        a: "Element text content is mapped to cells. Attributes on elements are included where detected.",
      },
      {
        q: "Can I get multiple sheets from one XML file?",
        a: "Yes. Grouped elements or named sections become separate sheets automatically.",
      },
    ],
  },
  "remove-duplicates": {
    metaTitle: "Remove Duplicate Rows from Excel Online Free",
    metaDescription:
      "Find and remove duplicate rows in Excel files based on selected columns. Keep first or last occurrence — free online tool, instant download.",
    howItWorks: [
      "Upload your Excel file and select the sheet to clean.",
      "Choose which columns define a duplicate row using the column picker.",
      "Review the duplicate count, choose to keep first or last occurrence, and download the cleaned file.",
    ],
    whyUse:
      "Clean up messy data exports, mailing lists, or imported datasets by removing exact or partial duplicates based on the columns that matter.",
    faq: [
      {
        q: "Can I choose which columns to check for duplicates?",
        a: "Yes. You select exactly which columns define a duplicate — it doesn't have to be all columns.",
      },
      {
        q: "Can I keep the last occurrence instead of the first?",
        a: "Yes. You can choose to keep either the first or last occurrence of each duplicate group.",
      },
      {
        q: "Does it work on large files?",
        a: "Yes. The tool handles files up to 20 MB, which covers most typical spreadsheets.",
      },
    ],
  },
  "trim-spaces": {
    metaTitle: "Trim Spaces in Excel Online Free",
    metaDescription:
      "Remove leading, trailing, and extra spaces from Excel cells. Clean one sheet or all sheets at once — free online tool, no signup needed.",
    howItWorks: [
      "Upload your Excel file and choose to clean all sheets or a specific one.",
      "Optionally enable collapsing of repeated internal spaces.",
      "Download the cleaned workbook with all extra whitespace removed.",
    ],
    whyUse:
      "Hidden spaces cause failed lookups, broken VLOOKUPs, and sorting issues. Trim them all in seconds instead of fixing cells one by one.",
    faq: [
      {
        q: "Does it remove spaces inside text too?",
        a: "By default it trims leading and trailing spaces. You can optionally collapse repeated internal spaces.",
      },
      {
        q: "Can I clean only specific columns?",
        a: "Yes. You can select specific columns to clean or leave it on all columns.",
      },
      {
        q: "Will it affect numbers or dates?",
        a: "No. Only text cells are trimmed. Numbers and dates remain unchanged.",
      },
    ],
  },
  "normalize-case": {
    metaTitle: "Normalize Text Case in Excel Online Free",
    metaDescription:
      "Convert Excel text to uppercase, lowercase, or title case across sheets and columns. Free online tool — no signup, instant download.",
    howItWorks: [
      "Upload your Excel file and choose the target case (upper, lower, or title).",
      "Select which sheets and columns to normalize.",
      "Download the workbook with all selected text converted to your chosen case.",
    ],
    whyUse:
      "Standardize inconsistent text casing in names, addresses, product titles, or any column where uniform formatting matters for reports or data matching.",
    faq: [
      {
        q: "What case options are available?",
        a: "Lowercase, UPPERCASE, and Title Case.",
      },
      {
        q: "Can I apply different cases to different columns?",
        a: "Currently one case is applied per operation. Run the tool again for a different case on other columns.",
      },
      {
        q: "Does it affect non-text cells?",
        a: "No. Only text cells are modified. Numbers, dates, and formulas are left unchanged.",
      },
    ],
  },
  "find-replace": {
    metaTitle: "Find and Replace in Excel Online Free",
    metaDescription:
      "Search and replace text or regex patterns across Excel sheets and columns. Free online find-and-replace tool — no signup, instant results.",
    howItWorks: [
      "Upload your Excel file and enter the text or regex pattern to find.",
      "Enter the replacement text and choose scope (all sheets or specific columns).",
      "Download the updated workbook with all matches replaced.",
    ],
    whyUse:
      "Bulk-edit spreadsheet data without opening Excel. Fix typos, update codes, standardize values, or apply regex transformations across thousands of cells instantly.",
    faq: [
      {
        q: "Does it support regular expressions?",
        a: "Yes. Toggle the regex option to use full regular expression patterns for advanced matching.",
      },
      {
        q: "Is the search case-sensitive?",
        a: "By default no, but you can enable case-sensitive matching with the toggle.",
      },
      {
        q: "Can I replace across all sheets at once?",
        a: "Yes. You can apply the replacement to all sheets or limit it to specific ones.",
      },
    ],
  },
};
