"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useMemo, useState } from "react";
import { uploadForPreview, WorkbookPreview } from "@/lib/tools/inspect";
import { xlsxToPdf } from "@/lib/tools/convert";
import FileUploadDropzone from "@/components/common/FileUploadDropzone";

export default function ConvertXlsxToPdf() {
  const t = useTranslations("common");
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "landscape",
  );
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

  const selectedSet = useMemo(
    () => new Set(selectedSheets),
    [selectedSheets],
  );
  const selectedSheet = preview?.sheets[activeSheet] ?? null;
  const canConvert = !!file && selectedSheets.length > 0 && !loading;

  const toggleSheet = useCallback((name: string, idx: number) => {
    setActiveSheet(idx);
    setSelectedSheets((cur) =>
      cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name],
    );
  }, []);

  const selectAll = useCallback(() => {
    if (preview) setSelectedSheets(preview.sheets.map((s) => s.name));
  }, [preview]);

  const clearSelection = useCallback(() => setSelectedSheets([]), []);

  const download = useCallback(async () => {
    if (!file || selectedSheets.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const buf = await xlsxToPdf(file, selectedSheets, orientation);
      const blob = new Blob([buf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      a.download = `${baseName || "workbook"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("exportFailed"));
    } finally {
      setLoading(false);
    }
  }, [file, selectedSheets, orientation, t]);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".xls,.xlsx,.xlsm,.xlsb,.xltx,.xltm,.xlam,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.binary.macroEnabled.12,application/vnd.ms-excel.sheet.macroEnabled.12"
        message={t("dropExcelConvertPdf")}
        hasError={!!error}
        onFiles={(files) => {
          const f = files[0];
          if (f) void onFile(f);
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
              <h3 className="font-medium">{t("selectSheetsToExportPdf")}</h3>
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

          <div className="mt-4">
            <label
              className="block text-sm"
              style={{ color: "var(--muted)" }}
            >
              {t("pageOrientation")}
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {(["landscape", "portrait"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOrientation(o)}
                  className="cursor-pointer rounded-md border px-3 py-1.5 text-sm"
                  style={{
                    borderColor: "var(--tag-border)",
                    backgroundColor:
                      orientation === o
                        ? "var(--tag-selected-bg)"
                        : "var(--tag-bg)",
                    color:
                      orientation === o
                        ? "var(--tag-selected-text)"
                        : "var(--tag-text)",
                  }}
                >
                  {t(o === "landscape" ? "landscape" : "portrait")}
                </button>
              ))}
            </div>
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
        <div className="flex justify-end">
          <button
            onClick={() => void download()}
            disabled={!canConvert}
            className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <span className="tool-spinner" />}
            {loading ? t("exporting") : t("downloadPdf")}
          </button>
        </div>
      )}
    </div>
  );
}
