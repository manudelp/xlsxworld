const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function splitSheet(
  file: File,
  sheet: string,
  chunkSize = 1000,
): Promise<ArrayBuffer> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sheet", sheet);
  formData.append("chunk_size", String(chunkSize));

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
