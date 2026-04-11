"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("common");
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
      setError(e instanceof Error ? e.message : t("uploadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
        accept=".xls,.xlsx,.xlsm,.xlsb,.xltx,.xltm,.xlam,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.binary.macroEnabled.12,application/vnd.ms-excel.sheet.macroEnabled.12,application/octet-stream"
        message={t("dropExcelConvertCsv")}
        hasError={!!error}
        onFiles={(files) => {
          const file = files[0];
          if (file) void onFile(file);
        }}
      />

      {loading && !preview && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-2)" }}>
          <span className="tool-spinner" />
          {t("uploadingScanning")}
        </div>
      )}
      {error && <div className="tool-error">{error}</div>}

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
              <h3 className="font-medium">{t("selectSheetToExport")}</h3>
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                {fileName || t("uploadedWorkbook")} - {preview.sheet_count} sheet
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
                {t("selectAll")}
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
                {t("clear")}
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
            {t("exportSummary")}
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
              {t("previewing", { name: selectedSheet.name })}
            </span>
            <span
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              {t("dataRows", { count: selectedDataRows })}
            </span>
            <span
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              {t("selectedForExport", { count: selectedCount })}
            </span>
            <span
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              {t("previewUsesFirst25")}
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
                {t("alsoAvailableCsvZip")}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {preview && (
        <>
          <div
            className="scrollbar-themed overflow-x-auto border rounded"
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

          <div className="flex flex-wrap items-center justify-end gap-2">
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
                  {t("noSheetsSelected")}
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
                      setError(e instanceof Error ? e.message : t("exportFailed"));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {loading ? t("exporting") : t("downloadSelectedCsv")}
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
                      setError(e instanceof Error ? e.message : t("exportFailed"));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {loading ? t("exporting") : t("downloadSelectedCsvsZip")}
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
                      setError(e instanceof Error ? e.message : t("exportFailed"));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {loading ? t("exporting") : t("downloadAllCsvsZip")}
                </button>
              ) : null}
          </div>
        </>
      )}
    </div>
  );
}
