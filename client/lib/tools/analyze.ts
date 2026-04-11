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

export interface ScanResult {
  buffer: ArrayBuffer;
  totalErrors: number;
  breakdown: Record<string, number>;
}

export async function scanFormulaErrors(file: File): Promise<ScanResult> {
  const fd = new FormData();
  fd.append("file", file);
  const { buffer, headers } = await postFormWithHeaders("/api/v1/tools/analyze/scan-formula-errors", fd);
  const totalErrors = parseInt(headers.get("X-Total-Errors") || "0", 10);
  let breakdown: Record<string, number> = {};
  try { breakdown = JSON.parse(headers.get("X-Error-Breakdown") || "{}"); } catch { /* empty */ }
  return { buffer, totalErrors, breakdown };
}

export interface CompareResult {
  buffer: ArrayBuffer;
  sheetsAdded: number;
  sheetsRemoved: number;
  sheetsModified: number;
  totalChangedCells: number;
}

export async function compareWorkbooks(fileA: File, fileB: File): Promise<CompareResult> {
  const fd = new FormData();
  fd.append("file_a", fileA);
  fd.append("file_b", fileB);
  const { buffer, headers } = await postFormWithHeaders("/api/v1/tools/analyze/compare-workbooks", fd);
  return {
    buffer,
    sheetsAdded: parseInt(headers.get("X-Sheets-Added") || "0", 10),
    sheetsRemoved: parseInt(headers.get("X-Sheets-Removed") || "0", 10),
    sheetsModified: parseInt(headers.get("X-Sheets-Modified") || "0", 10),
    totalChangedCells: parseInt(headers.get("X-Total-Changed") || "0", 10),
  };
}

export interface SummaryStatsResult {
  buffer: ArrayBuffer;
  sheetsAnalyzed: number;
  columnsFound: number;
}

export async function summaryStats(file: File): Promise<SummaryStatsResult> {
  const fd = new FormData();
  fd.append("file", file);
  const { buffer, headers } = await postFormWithHeaders("/api/v1/tools/analyze/summary-stats", fd);
  return {
    buffer,
    sheetsAnalyzed: parseInt(headers.get("X-Sheets-Analyzed") || "0", 10),
    columnsFound: parseInt(headers.get("X-Columns-Found") || "0", 10),
  };
}
