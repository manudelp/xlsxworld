"use client";
import React, { useCallback, useState } from "react";
import {
  uploadForPreview,
  exportCsvUrl,
  WorkbookPreview,
} from "@/lib/tools/inspect";
import FileUploadDropzone from "@/components/utility/FileUploadDropzone";

export default function ConvertXlsxToCsv() {
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [activeSheet, setActiveSheet] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setPreview(null);
    setLoading(true);
    setActiveSheet(0);

    try {
      const p = await uploadForPreview(file, 25);
      setPreview(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const sheetName = preview?.sheets?.[activeSheet]?.name;
  const downloadLink =
    preview && sheetName ? exportCsvUrl(preview.token, sheetName) : "";

  return (
    <div className="space-y-6">
      <FileUploadDropzone
        accept=".xls,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        message="Drop or select an XLSX file to convert to CSV"
        onFiles={(files) => {
          const file = files[0];
          if (file) onFile(file);
        }}
      />

      {loading && (
        <div className="text-sm" style={{ color: "var(--muted-2)" }}>
          Uploading and scanning workbook...
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {preview.sheets.map((sheet, idx) => (
              <button
                key={sheet.name}
                onClick={() => setActiveSheet(idx)}
                className={`px-3 py-1 rounded-full text-sm border transition`}
                style={{
                  backgroundColor:
                    idx === activeSheet
                      ? "var(--tag-selected-bg)"
                      : "var(--tag-bg)",
                  color:
                    idx === activeSheet
                      ? "var(--tag-selected-text)"
                      : "var(--tag-text)",
                  borderColor: "var(--tag-border)",
                }}
              >
                {sheet.name}{" "}
                <span
                  className="text-[10px]"
                  style={{ color: "var(--muted-2)" }}
                >
                  ({sheet.total_rows} rows)
                </span>
              </button>
            ))}
          </div>

          <div className="text-sm" style={{ color: "var(--foreground)" }}>
            Selected sheet: <strong>{sheetName}</strong>
          </div>

          <div className="flex gap-2 flex-wrap">
            {downloadLink ? (
              <a
                href={downloadLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Download CSV
              </a>
            ) : (
              <button
                disabled
                className="px-4 py-2 rounded"
                style={{
                  backgroundColor: "var(--tag-bg)",
                  color: "var(--muted)",
                  border: "1px solid var(--tag-border)",
                }}
              >
                No sheet selected
              </button>
            )}
            <span className="text-xs" style={{ color: "var(--muted-2)" }}>
              Token expires after 15 minutes.
            </span>
          </div>

          <div
            className="overflow-x-auto border rounded"
            style={{ borderColor: "var(--border)" }}
          >
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {preview.sheets[activeSheet]?.headers?.map((h, i) => (
                    <th
                      key={i}
                      className="px-2 py-1 border"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {h ?? ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sheets[activeSheet]?.sample?.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((c, ci) => (
                      <td
                        key={ci}
                        className="px-2 py-1 border"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {c ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs" style={{ color: "var(--muted-2)" }}>
            Preview shows first 25 rows. CSV will include the full sheet.
          </div>
        </div>
      )}
    </div>
  );
}
