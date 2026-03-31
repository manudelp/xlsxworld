"use client";
import React, { useCallback, useMemo, useState } from "react";
import {
  uploadForPreview,
  WorkbookPreview,
} from "@/lib/tools/inspect";
import {
  xlsxToCsv,
  xlsxToCsvZip,
} from "@/lib/tools/convert";
import FileUploadDropzone from "@/components/common/FileUploadDropzone";

export default function ConvertXlsxToCsv() {
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [activeSheet, setActiveSheet] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setPreview(null);
    setSelectedSheets([]);
    setFile(file);
    setFileName(file.name);
    setLoading(true);
    setActiveSheet(0);

    try {
      const p = await uploadForPreview(file, 25);
      setPreview(p);
      const firstSheet = p.sheets[0]?.name;
      setSelectedSheets(firstSheet ? [firstSheet] : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const sheetName = preview?.sheets?.[activeSheet]?.name;
  const selectedSheet = preview?.sheets?.[activeSheet] ?? null;
  const selectedDataRows = Math.max(0, (selectedSheet?.total_rows ?? 0) - 1);
  const canDownloadAllSheets = (preview?.sheet_count ?? 0) > 1;
  const selectedCount = selectedSheets.length;
  const selectedSheetSet = useMemo(() => new Set(selectedSheets), [selectedSheets]);

  const toggleSheet = useCallback((sheet: string, idx: number) => {
    setActiveSheet(idx);
    setSelectedSheets((current) => {
      if (current.includes(sheet)) {
        return current.filter((name) => name !== sheet);
      }
      return [...current, sheet];
    });
  }, []);

  const selectAllSheets = useCallback(() => {
    if (!preview) return;
    setSelectedSheets(preview.sheets.map((sheet) => sheet.name));
  }, [preview]);

  const clearSelection = useCallback(() => {
    setSelectedSheets([]);
  }, []);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".xls,.xlsx,.xlsm,.xlsb,.xltx,.xltm,.xlam,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.binary.macroEnabled.12,application/vnd.ms-excel.sheet.macroEnabled.12"
        message="Drop or select an Excel file (.xlsx, .xls, .xlsb, etc.) to convert to CSV"
        hasError={!!error}
        onFiles={(files) => {
          const file = files[0];
          if (file) void onFile(file);
        }}
      />

      {loading && (
        <div className="text-sm" style={{ color: "var(--muted-2)" }}>
          Uploading and scanning workbook...
        </div>
      )}
      {error && <div className="text-sm" style={{ color: "var(--danger)" }}>{error}</div>}

      {preview && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-medium">Select sheet to export</h3>
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                {fileName || "Uploaded workbook"} - {preview.sheet_count} sheet
                {preview.sheet_count === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllSheets}
                className="cursor-pointer rounded-md border px-3 py-1.5 text-sm"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: "var(--tag-bg)",
                  color: "var(--tag-text)",
                }}
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="cursor-pointer rounded-md border px-3 py-1.5 text-sm"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: "var(--tag-bg)",
                  color: "var(--tag-text)",
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {preview.sheets.map((sheet, idx) => (
              <button
                key={sheet.name}
                onClick={() => toggleSheet(sheet.name, idx)}
                className="cursor-pointer rounded-full border px-3 py-1 text-sm transition"
                style={{
                  backgroundColor: selectedSheetSet.has(sheet.name)
                    ? "var(--tag-selected-bg)"
                    : "var(--tag-bg)",
                  color: selectedSheetSet.has(sheet.name)
                    ? "var(--tag-selected-text)"
                    : "var(--tag-text)",
                  borderColor: "var(--tag-border)",
                }}
                aria-pressed={selectedSheetSet.has(sheet.name)}
              >
                {sheet.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {preview && selectedSheet && (
        <div
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
            color: "var(--muted-2)",
          }}
        >
          <div className="mb-2 font-medium" style={{ color: "var(--foreground)" }}>
            Export summary
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              Previewing: {selectedSheet.name}
            </span>
            <span
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              {selectedDataRows.toLocaleString()} data rows
            </span>
            <span
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              {selectedCount.toLocaleString()} selected for export
            </span>
            <span
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              Preview uses first 25 rows
            </span>
            {canDownloadAllSheets ? (
              <span
                className="rounded-full border px-2 py-0.5 text-xs"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: "var(--tag-bg)",
                  color: "var(--tag-text)",
                }}
              >
                Also available: all sheets as CSV ZIP
              </span>
            ) : null}
          </div>
        </div>
      )}

      {preview && (
        <>
          <div
            className="overflow-x-auto border rounded"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
            }}
          >
            <table className="min-w-full text-left text-sm">
              <thead style={{ backgroundColor: "var(--surface-2)" }}>
                <tr>
                  {preview.sheets[activeSheet]?.headers?.map((h, i) => (
                    <th
                      key={i}
                      className="px-2 py-1 border"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                    >
                      {h ?? "-"}
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
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--foreground)",
                        }}
                      >
                        {c ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs" style={{ color: "var(--muted-2)" }}>
              Token expires after 15 minutes. CSV export includes the full selected sheet.
            </p>

            <div className="flex flex-wrap justify-end gap-2">
              {selectedCount === 0 ? (
                <button
                  disabled
                  className="rounded-md border px-4 py-2 text-sm"
                  style={{
                    borderColor: "var(--tag-border)",
                    backgroundColor: "var(--tag-bg)",
                    color: "var(--muted)",
                  }}
                >
                  No sheets selected
                </button>
              ) : null}

              {selectedCount === 1 && file ? (
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const buf = await xlsxToCsv(file, selectedSheets[0]);
                      const blob = new Blob([buf], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${selectedSheets[0]}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Export failed");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {loading ? "Exporting..." : "Download Selected CSV"}
                </button>
              ) : null}

              {selectedCount > 1 && file ? (
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const buf = await xlsxToCsvZip(file, selectedSheets);
                      const blob = new Blob([buf], { type: "application/zip" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "selected-sheets-csv.zip";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Export failed");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {loading ? "Exporting..." : "Download Selected CSVs (ZIP)"}
                </button>
              ) : null}

              {canDownloadAllSheets && file ? (
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const buf = await xlsxToCsvZip(file);
                      const blob = new Blob([buf], { type: "application/zip" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "all-sheets-csv.zip";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Export failed");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition disabled:opacity-50"
                  style={{
                    borderColor: "var(--tag-border)",
                    backgroundColor: "var(--tag-bg)",
                    color: "var(--tag-text)",
                  }}
                >
                  {loading ? "Exporting..." : "Download All CSVs (ZIP)"}
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
