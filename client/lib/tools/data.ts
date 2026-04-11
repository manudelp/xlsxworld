import { postFormForFile, type ToolFileResult } from "../api";

export interface SortKey {
  column: string;
  direction: "asc" | "desc";
}

export async function sortRows(
  file: File,
  sheet: string,
  sortKeys: SortKey[],
  hasHeader: boolean = true,
): Promise<ToolFileResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sheet", sheet);
  fd.append("sort_keys", JSON.stringify(sortKeys));
  fd.append("has_header", hasHeader ? "true" : "false");
  return postFormForFile("/api/v1/tools/data/sort-rows", fd);
}

export async function transposeSheet(file: File, sheet: string): Promise<ToolFileResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sheet", sheet);
  return postFormForFile("/api/v1/tools/data/transpose-sheet", fd);
}

export async function splitColumn(
  file: File,
  sheet: string,
  column: string,
  delimiter: string,
  keepOriginal: boolean,
): Promise<ToolFileResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sheet", sheet);
  fd.append("column", column);
  fd.append("delimiter", delimiter);
  fd.append("keep_original", keepOriginal ? "true" : "false");
  return postFormForFile("/api/v1/tools/data/split-column", fd);
}
