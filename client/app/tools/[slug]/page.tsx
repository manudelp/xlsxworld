import { notFound } from "next/navigation";
import { toolItems } from "@/components/tools/toolsData";
import InspectSheets from "@/app/tools/[slug]/inspect/InspectSheets";
import ConvertXlsxToCsv from "./convert/ConvertXlsxToCsv";
import ConvertCsvToXlsx from "./convert/ConvertCsvToXlsx";
import MergeSheets from "./merge/MergeSheets";
import SplitSheet from "./split/SplitSheet";
import AppendWorkbooks from "./merge/AppendWorkbooks";
import SplitWorkbook from "./split/SplitWorkbook";

// Map certain slugs to special components
const specialComponents: Record<string, React.ReactNode> = {
  "inspect-sheets": <InspectSheets />,
  "xlsx-to-csv": <ConvertXlsxToCsv />,
  "csv-to-xlsx": <ConvertCsvToXlsx />,
  "merge-sheets": <MergeSheets />,
  "append-workbooks": <AppendWorkbooks />,
  "split-sheet": <SplitSheet />,
  "split-workbook": <SplitWorkbook />,
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
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold mb-2 flex items-center gap-3">
        <span className="text-4xl" aria-hidden>
          {tool.icon}
        </span>{" "}
        {tool.heading}
      </h1>
      <p className="mb-8 max-w-2xl" style={{ color: "var(--muted)" }}>
        {tool.description}
      </p>
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
