"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useMemo, useState } from "react";
import { uploadForPreview, WorkbookPreview } from "@/lib/tools/inspect";
import { xlsxToJson } from "@/lib/tools/convert";
import FileUploadDropzone from "@/components/common/FileUploadDropzone";

export default function ConvertXlsxToJson() {
  const t = useTranslations("common");
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(
    async (nextFile: File) => {
      setError(null);
      setPreview(null);
      setSelectedSheets([]);
      setFile(nextFile);
      setLoading(true);
      setActiveSheet(0);

      try {
        const p = await uploadForPreview(nextFile, 25);
        setPreview(p);
        const firstSheet = p.sheets[0]?.name;
        setSelectedSheets(firstSheet ? [firstSheet] : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("uploadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const selectedSet = useMemo(() => new Set(selectedSheets), [selectedSheets]);
  const selectedSheet = preview?.sheets[activeSheet] ?? null;
  const canConvert = !!file && selectedSheets.length > 0 && !loading;

  const toggleSheet = useCallback((sheetName: string, idx: number) => {
    setActiveSheet(idx);
    setSelectedSheets((current) => {
      if (current.includes(sheetName)) {
        return current.filter((name) => name !== sheetName);
      }
      return [...current, sheetName];
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!preview) return;
    setSelectedSheets(preview.sheets.map((sheet) => sheet.name));
  }, [preview]);

  const clearSelection = useCallback(() => {
    setSelectedSheets([]);
  }, []);

  const downloadJson = useCallback(async () => {
    if (!file || selectedSheets.length === 0) {
      setError(t("selectAtLeastOneSheet"));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = await xlsxToJson(file, selectedSheets);
      const jsonText = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        selectedSheets.length === 1
          ? `${selectedSheets[0]}.json`
          : "workbook.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("exportFailed"));
    } finally {
      setLoading(false);
    }
  }, [file, selectedSheets, t]);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".xls,.xlsx,.xlsm,.xlsb,.xltx,.xltm,.xlam,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.binary.macroEnabled.12,application/vnd.ms-excel.sheet.macroEnabled.12"
        message={t("dropExcelConvertJson")}
        hasError={!!error}
        onFiles={(files) => {
          const nextFile = files[0];
          if (nextFile) void onFile(nextFile);
        }}
      />

      {loading && (
        <div className="text-sm" style={{ color: "var(--muted-2)" }}>
          {t("uploadingScanning")}
        </div>
      )}
      {error && (
        <div className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}

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
              <h3 className="font-medium">{t("selectSheetsToExportJson")}</h3>
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                {t("sheetCount", { count: preview.sheet_count })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAll}
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
                  backgroundColor: selectedSet.has(sheet.name)
                    ? "var(--tag-selected-bg)"
                    : "var(--tag-bg)",
                  color: selectedSet.has(sheet.name)
                    ? "var(--tag-selected-text)"
                    : "var(--tag-text)",
                  borderColor: "var(--tag-border)",
                }}
                aria-pressed={selectedSet.has(sheet.name)}
              >
                {sheet.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {preview && selectedSheet && (
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
                {selectedSheet.headers.map((h, i) => (
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
              {selectedSheet.sample.map((row, ri) => (
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
      )}

      {preview && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "var(--muted-2)" }}>
            {t("jsonExportUsesFirstRowKeys")}
          </p>
          <button
            onClick={() => void downloadJson()}
            disabled={!canConvert}
            className="tool-primary-action cursor-pointer rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t("exporting") : t("downloadJson")}
          </button>
        </div>
      )}
    </div>
  );
}
