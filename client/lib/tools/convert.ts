import { api, buildUrl, buildUrlWithArrayParams } from "../api";

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

export async function xlsxToSql(
  file: File,
  sheets?: string[],
  tablePrefix = "",
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  const qs: Record<string, string> = {};
  if (tablePrefix) qs.table_prefix = tablePrefix;
  const path =
    sheets && sheets.length > 0
      ? buildUrlWithArrayParams("/api/v1/tools/convert/xlsx-to-sql", {
          sheets,
          ...qs,
        })
      : buildUrl("/api/v1/tools/convert/xlsx-to-sql", qs);
  return api.postForm<ArrayBuffer>(path, fd);
}

export async function sqlToXlsx(
  file: File,
  includeHeaders = true,
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("include_headers", String(includeHeaders));
  return api.postForm<ArrayBuffer>("/api/v1/tools/convert/sql-to-xlsx", fd);
}

export async function xlsxToXml(
  file: File,
  sheets?: string[],
  rootTag = "workbook",
  rowTag = "row",
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  const qs: Record<string, string> = {};
  if (rootTag !== "workbook") qs.root_tag = rootTag;
  if (rowTag !== "row") qs.row_tag = rowTag;
  const path =
    sheets && sheets.length > 0
      ? buildUrlWithArrayParams("/api/v1/tools/convert/xlsx-to-xml", {
          sheets,
          ...qs,
        })
      : buildUrl("/api/v1/tools/convert/xlsx-to-xml", qs);
  return api.postForm<ArrayBuffer>(path, fd);
}

export async function xmlToXlsx(
  file: File,
  includeHeaders = true,
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("include_headers", String(includeHeaders));
  return api.postForm<ArrayBuffer>("/api/v1/tools/convert/xml-to-xlsx", fd);
}

export async function xlsxToPdf(
  file: File,
  sheets?: string[],
  orientation: "portrait" | "landscape" = "landscape",
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  const qs: Record<string, string> = { orientation };
  const path =
    sheets && sheets.length > 0
      ? buildUrlWithArrayParams("/api/v1/tools/convert/xlsx-to-pdf", {
          sheets,
          ...qs,
        })
      : buildUrl("/api/v1/tools/convert/xlsx-to-pdf", qs);
  return api.postForm<ArrayBuffer>(path, fd);
}
