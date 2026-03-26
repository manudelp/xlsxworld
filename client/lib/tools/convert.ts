const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function csvToXlsx(
  file: File,
  sheetName = "Sheet1",
  delimiter = ",",
): Promise<ArrayBuffer> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sheet_name", sheetName);
  formData.append("delimiter", delimiter);

  const response = await fetch(`${API_BASE}/api/convert/csv-to-xlsx`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const payload = await response.json();
      if (payload?.detail) detail = payload.detail;
    } catch {
      // ignore non-json error payload
    }
    throw new Error(detail);
  }

  return response.arrayBuffer();
}
