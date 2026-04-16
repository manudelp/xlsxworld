import type { ToolFileResult } from "@/lib/api";
import type { WorkbookPreview } from "@/lib/tools/inspect";

// Excel file accept list.
//
// IMPORTANT: validation is by extension first (see FileUploadDropzone). MIME
// types are inconsistent across browsers and OS versions for Excel files, so
// we accept a broad list (including the empty string for files where the
// browser couldn't detect a type).
export const EXCEL_ACCEPT = [
  ".xlsx",
  ".xls",
  ".xlsb",
  ".xlsm",
  ".xltx",
  ".xltm",
  ".xlam",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "application/vnd.ms-excel.template.macroEnabled.12",
  "application/octet-stream",
  "",
].join(",");

export const VISUAL_ELEMENTS_WARNING =
  "Charts, images, and other visual elements were removed from the output. Only cell data was preserved.";

export function downloadBlob(buffer: ArrayBuffer, fileName: string, mimeType: string): void {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadXlsx(buffer: ArrayBuffer, fileName: string): void {
  downloadBlob(
    buffer,
    fileName,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}

export function downloadToolResult(
  result: ToolFileResult,
  fileName: string,
  mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
): boolean {
  downloadBlob(result.buffer, fileName, mimeType);
  return result.visualElementsRemoved;
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
