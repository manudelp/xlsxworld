export interface ToolItem {
  href: string;
  slug: string;
  icon: string;
  category: string;
  commingSoon?: boolean;
  isNew?: boolean;
}

export const toolItems: ToolItem[] = [
  {
    href: "/tools/inspect-sheets",
    slug: "inspect-sheets",
    icon: "👀",
    category: "Inspect",
  },
  {
    href: "/tools/merge-sheets",
    slug: "merge-sheets",
    icon: "🔗",
    category: "Merge",
  },
  {
    href: "/tools/append-workbooks",
    slug: "append-workbooks",
    icon: "🧩",
    category: "Merge",
  },
  {
    href: "/tools/split-sheet",
    slug: "split-sheet",
    icon: "✂️",
    category: "Split",
  },
  {
    href: "/tools/split-workbook",
    slug: "split-workbook",
    icon: "🍱",
    category: "Split",
  },
  {
    href: "/tools/xlsx-to-csv",
    slug: "xlsx-to-csv",
    icon: "🔁",
    category: "Convert",
  },
  {
    href: "/tools/csv-to-xlsx",
    slug: "csv-to-xlsx",
    icon: "📄",
    category: "Convert",
  },
  {
    href: "/tools/xlsx-to-pdf",
    slug: "xlsx-to-pdf",
    icon: "🖨️",
    category: "Convert",
    isNew: true,
  },
  {
    href: "/tools/pdf-to-xlsx",
    slug: "pdf-to-xlsx",
    icon: "📥",
    category: "Convert",
    isNew: true,
  },
  {
    href: "/tools/xlsx-to-json",
    slug: "xlsx-to-json",
    icon: "🧾",
    category: "Convert",
  },
  {
    href: "/tools/json-to-xlsx",
    slug: "json-to-xlsx",
    icon: "🗂️",
    category: "Convert",
  },
  {
    href: "/tools/xlsx-to-sql",
    slug: "xlsx-to-sql",
    icon: "💾",
    category: "Convert",
    isNew: true,
  },
  {
    href: "/tools/sql-to-xlsx",
    slug: "sql-to-xlsx",
    icon: "🛢️",
    category: "Convert",
    isNew: true,
  },
  {
    href: "/tools/xlsx-to-xml",
    slug: "xlsx-to-xml",
    icon: "🧬",
    category: "Convert",
    isNew: true,
  },
  {
    href: "/tools/xml-to-xlsx",
    slug: "xml-to-xlsx",
    icon: "📦",
    category: "Convert",
    isNew: true,
  },
  {
    href: "/tools/remove-empty-rows",
    slug: "remove-empty-rows",
    icon: "🚫",
    category: "Clean",
    isNew: true,
  },
  {
    href: "/tools/remove-duplicates",
    slug: "remove-duplicates",
    icon: "🧹",
    category: "Clean",
  },
  {
    href: "/tools/trim-spaces",
    slug: "trim-spaces",
    icon: "🧼",
    category: "Clean",
  },
  {
    href: "/tools/normalize-case",
    slug: "normalize-case",
    icon: "🔤",
    category: "Clean",
  },
  {
    href: "/tools/find-replace",
    slug: "find-replace",
    icon: "🪄",
    category: "Clean",
  },
  {
    href: "/tools/summary-stats",
    slug: "summary-stats",
    icon: "📊",
    category: "Analyze",
    isNew: true,
  },
  {
    href: "/tools/scan-formula-errors",
    slug: "scan-formula-errors",
    icon: "🔍",
    category: "Analyze",
  },
  {
    href: "/tools/compare-workbooks",
    slug: "compare-workbooks",
    icon: "⚖️",
    category: "Analyze",
  },
  {
    href: "/tools/freeze-header",
    slug: "freeze-header",
    icon: "📌",
    category: "Format",
    isNew: true,
  },
  {
    href: "/tools/auto-size-columns",
    slug: "auto-size-columns",
    icon: "📏",
    category: "Format",
    isNew: true,
  },
  {
    href: "/tools/format-dates",
    slug: "format-dates",
    icon: "📅",
    category: "Format",
    commingSoon: true,
  },
  {
    href: "/tools/sort-rows",
    slug: "sort-rows",
    icon: "🔃",
    category: "Data",
    isNew: true,
  },
  {
    href: "/tools/transpose-sheet",
    slug: "transpose-sheet",
    icon: "🔄",
    category: "Data",
    isNew: true,
  },
  {
    href: "/tools/split-column",
    slug: "split-column",
    icon: "🪓",
    category: "Data",
    isNew: true,
  },
  {
    href: "/tools/validate-emails",
    slug: "validate-emails",
    icon: "✉️",
    category: "Validate",
    isNew: true,
  },
  {
    href: "/tools/detect-blanks",
    slug: "detect-blanks",
    icon: "⚠️",
    category: "Validate",
    isNew: true,
  },
  {
    href: "/tools/password-protect",
    slug: "password-protect",
    icon: "🔒",
    category: "Security",
    isNew: true,
  },
  {
    href: "/tools/remove-password",
    slug: "remove-password",
    icon: "🔓",
    category: "Security",
    isNew: true,
  },
];

// Hidden list for future consideration (not shown in the grid)
export const FUTURE_TOOLS = [
  { slug: "pivot-builder", category: "Analyze", note: "Create pivot-style aggregations" },
];
