import { api } from '../api';

export interface SplitSheetNamingOptions {
  baseName?: string;
  separator?: string;
  numberingStyle?:
    | "numeric"
    | "numeric-padded"
    | "alpha-upper"
    | "alpha-lower"
    | "roman-upper"
    | "roman-lower"
    | "custom";
  customSequence?: string[];
}

export async function splitSheet(
  file: File,
  sheet: string,
  chunkSize = 1000,
  naming: SplitSheetNamingOptions = {},
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sheet", sheet);
  fd.append("chunk_size", String(chunkSize));
  fd.append("part_base", naming.baseName ?? "part");
  fd.append("part_separator", naming.separator ?? "_");
  fd.append("numbering_style", naming.numberingStyle ?? "numeric");
  if ((naming.customSequence ?? []).length > 0) {
    fd.append("custom_sequence", (naming.customSequence ?? []).join("\n"));
  }
  return api.postForm<ArrayBuffer>('/api/v1/tools/split-sheet', fd);
}

export async function splitWorkbook(
  file: File,
  sheetNames: string[] = [],
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  if (sheetNames.length > 0) {
    fd.append("sheet_names", sheetNames.join(","));
  }
  return api.postForm<ArrayBuffer>('/api/v1/tools/split-workbook', fd);
}
