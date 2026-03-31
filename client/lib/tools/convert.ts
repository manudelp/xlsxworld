import { api } from '../api';

export async function csvToXlsx(
  file: File,
  sheetName = "Sheet1",
  delimiter = ",",
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sheet_name", sheetName);
  fd.append("delimiter", delimiter);
  return api.postForm<ArrayBuffer>('/api/v1/tools/convert/csv-to-xlsx', fd);
}

export async function xlsxToCsv(file: File, sheet: string): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  return api.postForm<ArrayBuffer>('/api/v1/tools/convert/xlsx-to-csv', fd, { sheet });
}

export async function xlsxToCsvZip(file: File, sheets?: string[]): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  const qs: Record<string, string> = {};
  if (sheets && sheets.length > 0) {
    qs.sheets = sheets.join(",");
  }
  return api.postForm<ArrayBuffer>('/api/v1/tools/convert/xlsx-to-csv-zip', fd, qs);
}
