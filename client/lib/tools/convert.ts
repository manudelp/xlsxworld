import { api, buildUrlWithArrayParams } from "../api";

export async function csvToXlsx(
  file: File,
  sheetName = "Sheet1",
  delimiter = ",",
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sheet_name", sheetName);
  fd.append("delimiter", delimiter);
  return api.postForm<ArrayBuffer>("/api/v1/tools/convert/csv-to-xlsx", fd);
}

export async function xlsxToCsv(
  file: File,
  sheet: string,
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  return api.postForm<ArrayBuffer>("/api/v1/tools/convert/xlsx-to-csv", fd, {
    sheet,
  });
}

export async function xlsxToCsvZip(
  file: File,
  sheets?: string[],
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  const path =
    sheets && sheets.length > 0
      ? buildUrlWithArrayParams("/api/v1/tools/convert/xlsx-to-csv-zip", {
          sheets,
        })
      : "/api/v1/tools/convert/xlsx-to-csv-zip";
  return api.postForm<ArrayBuffer>(path, fd);
}

export async function xlsxToJson(
  file: File,
  sheets?: string[],
): Promise<unknown> {
  const fd = new FormData();
  fd.append("file", file);
  const path =
    sheets && sheets.length > 0
      ? buildUrlWithArrayParams("/api/v1/tools/convert/xlsx-to-json", {
          sheets,
        })
      : "/api/v1/tools/convert/xlsx-to-json";
  return api.postForm<unknown>(path, fd);
}

export async function jsonToXlsx(
  file: File,
  includeHeaders = true,
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("include_headers", String(includeHeaders));
  return api.postForm<ArrayBuffer>("/api/v1/tools/convert/json-to-xlsx", fd);
}
