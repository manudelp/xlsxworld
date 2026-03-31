import { api } from '../api';

export async function mergeSheets(
  file: File,
  sheetNames: string[],
  outputSheet = "Merged",
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sheet_names", sheetNames.join(","));
  fd.append("output_sheet", outputSheet);
  return api.postForm<ArrayBuffer>('/api/v1/tools/merge-sheets', fd);
}

export async function appendWorkbooks(files: File[]): Promise<ArrayBuffer> {
  const fd = new FormData();
  files.forEach((file) => fd.append("files", file));
  return api.postForm<ArrayBuffer>('/api/v1/tools/append-workbooks', fd);
}
