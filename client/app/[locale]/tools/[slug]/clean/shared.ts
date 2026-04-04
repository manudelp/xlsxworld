import type { WorkbookPreview } from "@/lib/tools/inspect";

export const EXCEL_ACCEPT =
  ".xls,.xlsx,.xlsm,.xlsb,.xltx,.xltm,.xlam,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.binary.macroEnabled.12,application/vnd.ms-excel.sheet.macroEnabled.12";

export function downloadXlsx(buffer: ArrayBuffer, fileName: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function getSheetColumnNames(preview: WorkbookPreview | null, sheetIndex: number): string[] {
  if (!preview) return [];
  const headers = preview.sheets[sheetIndex]?.headers ?? [];
  const used = new Set<string>();

  return headers
    .map((header) => String(header ?? "").trim())
    .filter((name) => name.length > 0)
    .filter((name) => {
      if (used.has(name)) return false;
      used.add(name);
      return true;
    });
}
