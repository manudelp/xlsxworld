const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function mergeSheets(
  file: File,
  sheetNames: string[],
  outputSheet = "Merged",
): Promise<ArrayBuffer> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sheet_names", sheetNames.join(","));
  formData.append("output_sheet", outputSheet);

  const response = await fetch(`${API_BASE}/api/tools/merge-sheets`, {
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

export async function appendWorkbooks(
  files: File[],
): Promise<ArrayBuffer> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE}/api/tools/append-workbooks`, {
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
