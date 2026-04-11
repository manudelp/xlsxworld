import { postFormForFile, type ToolFileResult } from "../api";

export async function mergeSheets(
  file: File,
  sheetNames: string[],
  outputSheet = "Merged",
): Promise<ToolFileResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sheet_names", sheetNames.join(","));
  fd.append("output_sheet", outputSheet);
  return postFormForFile("/api/v1/tools/merge-sheets", fd);
}

export async function appendWorkbooks(files: File[]): Promise<ToolFileResult> {
  const fd = new FormData();
  files.forEach((file) => fd.append("files", file));
  return postFormForFile("/api/v1/tools/append-workbooks", fd);
}
