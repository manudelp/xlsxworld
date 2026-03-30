const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

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
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sheet", sheet);
  formData.append("chunk_size", String(chunkSize));
  formData.append("part_base", naming.baseName ?? "part");
  formData.append("part_separator", naming.separator ?? "_");
  formData.append("numbering_style", naming.numberingStyle ?? "numeric");
  if ((naming.customSequence ?? []).length > 0) {
    formData.append("custom_sequence", (naming.customSequence ?? []).join("\n"));
  }

  const response = await fetch(`${API_BASE}/api/tools/split-sheet`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const payload = await response.json();
      if (payload?.detail) detail = payload.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return response.arrayBuffer();
}

export async function splitWorkbook(file: File): Promise<ArrayBuffer> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/tools/split-workbook`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const payload = await response.json();
      if (payload?.detail) detail = payload.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return response.arrayBuffer();
}
