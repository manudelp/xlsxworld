import { notFound } from "next/navigation";
import Link from "next/link";
import { toolItems } from "@/components/tools/toolsData";
import InspectSheets from "@/app/tools/[slug]/inspect/InspectSheets";
import ConvertXlsxToCsv from "./convert/ConvertXlsxToCsv";
import ConvertCsvToXlsx from "./convert/ConvertCsvToXlsx";
import MergeSheets from "./merge/MergeSheets";
import SplitSheet from "./split/SplitSheet";
import AppendWorkbooks from "./merge/AppendWorkbooks";
import SplitWorkbook from "./split/SplitWorkbook";
import RemoveDuplicates from "./clean/RemoveDuplicates";
import TrimSpaces from "./clean/TrimSpaces";
import NormalizeCase from "./clean/NormalizeCase";
import FindReplace from "./clean/FindReplace";
import { ArrowLeft } from "lucide-react";

// Map certain slugs to special components
const specialComponents: Record<string, React.ReactNode> = {
  "inspect-sheets": <InspectSheets />,
  "xlsx-to-csv": <ConvertXlsxToCsv />,
  "csv-to-xlsx": <ConvertCsvToXlsx />,
  "merge-sheets": <MergeSheets />,
  "append-workbooks": <AppendWorkbooks />,
  "split-sheet": <SplitSheet />,
  "split-workbook": <SplitWorkbook />,
  "remove-duplicates": <RemoveDuplicates />,
  "trim-spaces": <TrimSpaces />,
  "normalize-case": <NormalizeCase />,
  "find-replace": <FindReplace />,
};

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = toolItems.find((t) => t.slug === slug);
  if (!tool) return notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold mb-2 flex items-center gap-3">
            <span className="text-4xl" aria-hidden>
              {tool.icon}
            </span>{" "}
            {tool.heading}
          </h1>
          <p className="mb-8 max-w-2xl" style={{ color: "var(--muted)" }}>
            {tool.description}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-6 transition-all group"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 group-hover:text-world-300 group-hover:animate-pulse" />
          <span className="group-hover:underline">Back to Tools</span>
        </Link>
      </div>
      <div
        className="border-t pt-8"
        style={{ borderTopColor: "var(--border)" }}
      >
        <div>
          {specialComponents[tool.slug] || (
            <div className="text-sm" style={{ color: "var(--muted-2)" }}>
              Tool UI coming soon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
