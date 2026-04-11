import { api } from "../api";

export async function freezeHeader(file: File, rows: number = 1): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("rows", String(rows));
  return api.postForm<ArrayBuffer>("/api/v1/tools/format/freeze-header", fd);
}

export async function autoSizeColumns(file: File): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  return api.postForm<ArrayBuffer>("/api/v1/tools/format/auto-size-columns", fd);
}
