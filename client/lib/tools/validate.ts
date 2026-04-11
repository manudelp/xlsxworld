import { buildUrl } from "../api";

async function postFormWithHeaders(
  path: string,
  form: FormData,
): Promise<{ buffer: ArrayBuffer; headers: Headers }> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch { /* use statusText */ }
    throw new Error(detail);
  }
  const buffer = await res.arrayBuffer();
  return { buffer, headers: res.headers };
}

export interface EmailValidationResult {
  buffer: ArrayBuffer;
  validCount: number;
  invalidCount: number;
  emptyCount: number;
}

export async function validateEmails(
  file: File,
  sheet: string,
  column: string,
): Promise<EmailValidationResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sheet", sheet);
  fd.append("column", column);
  const { buffer, headers } = await postFormWithHeaders("/api/v1/tools/validate/validate-emails", fd);
  return {
    buffer,
    validCount: parseInt(headers.get("X-Valid-Count") || "0", 10),
    invalidCount: parseInt(headers.get("X-Invalid-Count") || "0", 10),
    emptyCount: parseInt(headers.get("X-Empty-Count") || "0", 10),
  };
}

export interface DetectBlanksResult {
  buffer: ArrayBuffer;
  totalBlanks: number;
  sheetsAffected: number;
}

export async function detectBlanks(file: File): Promise<DetectBlanksResult> {
  const fd = new FormData();
  fd.append("file", file);
  const { buffer, headers } = await postFormWithHeaders("/api/v1/tools/validate/detect-blanks", fd);
  return {
    buffer,
    totalBlanks: parseInt(headers.get("X-Total-Blanks") || "0", 10),
    sheetsAffected: parseInt(headers.get("X-Sheets-Affected") || "0", 10),
  };
}
