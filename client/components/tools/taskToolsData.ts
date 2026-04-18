import type { ToolItem } from "@/components/tools/toolsData";
import { toolItems } from "@/components/tools/toolsData";

export interface TaskTool {
  slug: string;
  tool: ToolItem;
}

export interface TaskCategory {
  id: string;
  slugs: string[];
}

function findTool(slug: string): ToolItem | undefined {
  return toolItems.find((t) => t.slug === slug);
}

export function getTaskTools(category: TaskCategory): TaskTool[] {
  return category.slugs
    .map((slug) => {
      const tool = findTool(slug);
      return tool ? { slug, tool } : null;
    })
    .filter((t): t is TaskTool => t !== null);
}

export const taskCategories: TaskCategory[] = [
  {
    id: "organizeStructure",
    slugs: [
      "transpose-sheet",
      "split-column",
      "sort-rows",
      "auto-size-columns",
      "freeze-header",
      "format-dates",
    ],
  },
  {
    id: "cleanFix",
    slugs: [
      "remove-duplicates",
      "trim-spaces",
      "normalize-case",
      "find-replace",
      "remove-empty-rows",
      "detect-blanks",
      "scan-formula-errors",
      "validate-emails",
    ],
  },
  {
    id: "mergeCombine",
    slugs: ["merge-sheets", "append-workbooks"],
  },
  {
    id: "splitExtract",
    slugs: ["split-sheet", "split-workbook"],
  },
  {
    id: "analyze",
    slugs: ["inspect-sheets", "summary-stats", "compare-workbooks"],
  },
  {
    id: "security",
    slugs: ["password-protect", "remove-password"],
  },
  {
    id: "convert",
    slugs: [
      "xlsx-to-csv",
      "csv-to-xlsx",
      "xlsx-to-json",
      "json-to-xlsx",
      "xlsx-to-pdf",
      "pdf-to-xlsx",
      "xlsx-to-sql",
      "sql-to-xlsx",
      "xlsx-to-xml",
      "xml-to-xlsx",
    ],
  },
];
