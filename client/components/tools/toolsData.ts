export interface ToolItem {
  href: string;
  slug: string;
  icon: string;
  category: string;
  commingSoon?: boolean;
  isNew?: boolean;
  related?: string[];
}

export const toolItems: ToolItem[] = [
  {
    href: "/tools/inspect-sheets",
    slug: "inspect-sheets",
    icon: "👀",
    category: "Inspect",
    related: ["scan-formula-errors", "compare-workbooks", "detect-blanks"],
  },
  {
    href: "/tools/merge-sheets",
    slug: "merge-sheets",
    icon: "🔗",
    category: "Merge",
    related: ["append-workbooks", "split-sheet", "inspect-sheets"],
  },
  {
    href: "/tools/append-workbooks",
    slug: "append-workbooks",
    icon: "🧩",
    category: "Merge",
    related: ["merge-sheets", "split-workbook", "inspect-sheets"],
  },
  {
    href: "/tools/split-sheet",
    slug: "split-sheet",
    icon: "✂️",
    category: "Split",
    related: ["split-workbook", "merge-sheets", "inspect-sheets"],
  },
  {
    href: "/tools/split-workbook",
    slug: "split-workbook",
    icon: "🍱",
    category: "Split",
    related: ["split-sheet", "append-workbooks", "inspect-sheets"],
  },
  {
    href: "/tools/xlsx-to-csv",
    slug: "xlsx-to-csv",
    icon: "🔁",
    category: "Convert",
    related: ["csv-to-xlsx", "xlsx-to-json", "xlsx-to-pdf"],
  },
  {
    href: "/tools/csv-to-xlsx",
    slug: "csv-to-xlsx",
    icon: "📄",
    category: "Convert",
    related: ["xlsx-to-csv", "json-to-xlsx", "remove-duplicates"],
  },
  {
    href: "/tools/xlsx-to-pdf",
    slug: "xlsx-to-pdf",
    icon: "🖨️",
    category: "Convert",
    related: ["xlsx-to-csv", "freeze-header", "auto-size-columns"],
  },
  {
    href: "/tools/pdf-to-xlsx",
    slug: "pdf-to-xlsx",
    icon: "📕",
    category: "Convert",
    commingSoon: true,
    related: ["xlsx-to-pdf", "csv-to-xlsx"],
  },
  {
    href: "/tools/xlsx-to-json",
    slug: "xlsx-to-json",
    icon: "🧾",
    category: "Convert",
    related: ["json-to-xlsx", "xlsx-to-csv", "xlsx-to-xml"],
  },
  {
    href: "/tools/json-to-xlsx",
    slug: "json-to-xlsx",
    icon: "🗂️",
    category: "Convert",
    related: ["xlsx-to-json", "csv-to-xlsx", "xml-to-xlsx"],
  },
  {
    href: "/tools/xlsx-to-sql",
    slug: "xlsx-to-sql",
    icon: "💾",
    category: "Convert",
    related: ["sql-to-xlsx", "xlsx-to-csv", "xlsx-to-json"],
  },
  {
    href: "/tools/sql-to-xlsx",
    slug: "sql-to-xlsx",
    icon: "🛢️",
    category: "Convert",
    related: ["xlsx-to-sql", "csv-to-xlsx", "json-to-xlsx"],
  },
  {
    href: "/tools/xlsx-to-xml",
    slug: "xlsx-to-xml",
    icon: "🧬",
    category: "Convert",
    related: ["xml-to-xlsx", "xlsx-to-json", "xlsx-to-csv"],
  },
  {
    href: "/tools/xml-to-xlsx",
    slug: "xml-to-xlsx",
    icon: "📦",
    category: "Convert",
    related: ["xlsx-to-xml", "json-to-xlsx", "csv-to-xlsx"],
  },
  {
    href: "/tools/remove-empty-rows",
    slug: "remove-empty-rows",
    icon: "🚫",
    category: "Clean",
    related: ["remove-duplicates", "detect-blanks", "trim-spaces"],
  },
  {
    href: "/tools/remove-duplicates",
    slug: "remove-duplicates",
    icon: "🧹",
    category: "Clean",
    related: ["trim-spaces", "normalize-case", "find-replace"],
  },
  {
    href: "/tools/trim-spaces",
    slug: "trim-spaces",
    icon: "🧼",
    category: "Clean",
    related: ["normalize-case", "find-replace", "remove-duplicates"],
  },
  {
    href: "/tools/normalize-case",
    slug: "normalize-case",
    icon: "🔤",
    category: "Clean",
    related: ["trim-spaces", "find-replace", "remove-duplicates"],
  },
  {
    href: "/tools/find-replace",
    slug: "find-replace",
    icon: "🪄",
    category: "Clean",
    related: ["trim-spaces", "normalize-case", "remove-duplicates"],
  },
  {
    href: "/tools/summary-stats",
    slug: "summary-stats",
    icon: "📊",
    category: "Analyze",
    isNew: true,
    related: ["scan-formula-errors", "compare-workbooks", "inspect-sheets"],
  },
  {
    href: "/tools/scan-formula-errors",
    slug: "scan-formula-errors",
    icon: "🔍",
    category: "Analyze",
    isNew: true,
    related: ["inspect-sheets", "compare-workbooks", "summary-stats"],
  },
  {
    href: "/tools/compare-workbooks",
    slug: "compare-workbooks",
    icon: "⚖️",
    category: "Analyze",
    isNew: true,
    related: ["inspect-sheets", "scan-formula-errors", "summary-stats"],
  },
  {
    href: "/tools/freeze-header",
    slug: "freeze-header",
    icon: "📌",
    category: "Format",
    related: ["auto-size-columns", "sort-rows", "xlsx-to-pdf"],
  },
  {
    href: "/tools/auto-size-columns",
    slug: "auto-size-columns",
    icon: "📏",
    category: "Format",
    related: ["freeze-header", "xlsx-to-pdf", "trim-spaces"],
  },
  {
    href: "/tools/format-dates",
    slug: "format-dates",
    icon: "📅",
    category: "Format",
    commingSoon: true,
    related: ["normalize-case", "find-replace"],
  },
  {
    href: "/tools/sort-rows",
    slug: "sort-rows",
    icon: "🔃",
    category: "Data",
    related: ["remove-duplicates", "split-column", "transpose-sheet"],
  },
  {
    href: "/tools/transpose-sheet",
    slug: "transpose-sheet",
    icon: "🔄",
    category: "Data",
    related: ["split-column", "sort-rows", "inspect-sheets"],
  },
  {
    href: "/tools/split-column",
    slug: "split-column",
    icon: "🪓",
    category: "Data",
    related: ["find-replace", "sort-rows", "transpose-sheet"],
  },
  {
    href: "/tools/validate-emails",
    slug: "validate-emails",
    icon: "✉️",
    category: "Validate",
    related: ["detect-blanks", "find-replace", "normalize-case"],
  },
  {
    href: "/tools/detect-blanks",
    slug: "detect-blanks",
    icon: "⚠️",
    category: "Validate",
    related: ["validate-emails", "remove-empty-rows", "inspect-sheets"],
  },
  {
    href: "/tools/password-protect",
    slug: "password-protect",
    icon: "🔒",
    category: "Security",
    related: ["remove-password", "inspect-sheets"],
  },
  {
    href: "/tools/remove-password",
    slug: "remove-password",
    icon: "🔓",
    category: "Security",
    related: ["password-protect", "inspect-sheets"],
  },
];

// Featured tools shown in the "Start here" row on the homepage.
// Order matters — these are the recommended entry points for new users.
export const FEATURED_TOOL_SLUGS = [
  "csv-to-xlsx",
  "xlsx-to-csv",
  "remove-duplicates",
  "inspect-sheets",
  "scan-formula-errors",
];

// Hidden list for future consideration (not shown in the grid)
export const FUTURE_TOOLS = [
  { slug: "pivot-builder", category: "Analyze", note: "Create pivot-style aggregations" },
];
