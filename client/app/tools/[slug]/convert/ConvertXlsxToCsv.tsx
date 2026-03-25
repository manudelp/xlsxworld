"use client";
import React, { useCallback, useState } from "react";
import { uploadForPreview, exportCsvUrl, WorkbookPreview } from "@/lib/tools/inspect";

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
  const downloadLink = preview && sheetName ? exportCsvUrl(preview.token, sheetName) : "";

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
      >
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
          <input
            type="file"
            accept=".xls,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
          />
          <span className="text-sm text-gray-600">
            Drop or select an XLSX file to convert to CSV
          </span>
        </label>
      </div>

      {loading && <div className="text-sm text-gray-500">Uploading and scanning workbook...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {preview.sheets.map((sheet, idx) => (
              <button
                key={sheet.name}
                onClick={() => setActiveSheet(idx)}
                className={`px-3 py-1 rounded-full text-sm border transition ${
                  idx === activeSheet
                    ? "bg-[#292931] text-white border-[#292931]"
                    : "bg-white border-gray-300 hover:border-[#292931]"
                }`}
              >
                {sheet.name} <span className="text-[10px] text-gray-500">({sheet.total_rows} rows)</span>
              </button>
            ))}
          </div>

          <div className="text-sm text-gray-700">
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
                className="px-4 py-2 rounded bg-gray-300 text-gray-700"
              >
                No sheet selected
              </button>
            )}
            <span className="text-xs text-gray-500">Token expires after 15 minutes.</span>
          </div>

          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {preview.sheets[activeSheet]?.headers?.map((h, i) => (
                    <th key={i} className="px-2 py-1 border">{h ?? ""}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sheets[activeSheet]?.sample?.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((c, ci) => (
                      <td key={ci} className="px-2 py-1 border">{c ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-gray-500">
            Preview shows first 25 rows. CSV will include the full sheet.
          </div>
        </div>
      )}
    </div>
  );
}
