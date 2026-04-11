"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useMemo, useState } from "react";
import { Archive, Layers3 } from "lucide-react";
import { splitWorkbook } from "@/lib/tools/split";
import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";

export default function SplitWorkbook() {
  const t = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const onFile = useCallback(async (selected: File) => {
    setError(null);
    setFile(selected);
    setPreview(null);
    setSelectedSheets([]);
    setFileName(selected.name);
    setPreviewLoading(true);

    try {
      const workbook = await uploadForPreview(selected, 1);
      setPreview(workbook);
      setSelectedSheets(workbook.sheets.map((sheet) => sheet.name));

      if (workbook.sheet_count === 0) {
        setError(t("noSheetsDetected"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("couldNotInspect"));
    } finally {
      setPreviewLoading(false);
    }
  }, [t]);

  const sheetNames = useMemo(
    () => preview?.sheets.map((sheet) => sheet.name) ?? [],
    [preview],
  );
  const selectedSheetSet = useMemo(() => new Set(selectedSheets), [selectedSheets]);
  const selectedCount = selectedSheets.length;
  const canSplit =
    !!file && !loading && !previewLoading && selectedCount > 0;

  const toggleSheet = useCallback((sheetName: string) => {
    setSelectedSheets((current) => {
      if (current.includes(sheetName)) {
        return current.filter((name) => name !== sheetName);
      }
      return [...current, sheetName];
    });
  }, []);

  const handleSplit = useCallback(async () => {
    if (!file) {
      setError(t("selectExcelFirst"));
      return;
    }

    if (selectedCount < 1) {
      setError(t("selectAtLeastOneSheetSplit"));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const buffer = await splitWorkbook(file, selectedSheets);
      const blob = new Blob([buffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      a.download = `${baseName || "split-workbook"}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("splitFailed"));
    } finally {
      setLoading(false);
    }
  }, [file, selectedCount, selectedSheets, t]);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".xls,.xlsx,.xlsm,.xlsb,.xltx,.xltm,.xlam,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.binary.macroEnabled.12,application/vnd.ms-excel.sheet.macroEnabled.12"
        message={t("dropExcelSplitWorkbook")}
        hasError={!!error}
        onFiles={(files) => {
          const selected = files[0];
          if (selected) void onFile(selected);
        }}
      />

      {previewLoading && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-2)" }}>
          <span className="tool-spinner" />
          Reading workbook structure...
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
              <h3 className="font-medium">{t("splitWorkbook")}</h3>
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                {fileName || t("uploadedWorkbook")} - {preview.sheet_count} sheet
                {preview.sheet_count === 1 ? "" : "s"}
              </p>
            </div>
            <span
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              1 output XLSX per source sheet
            </span>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm" style={{ color: "var(--muted-2)" }}>
              Select sheets to include in the ZIP output.
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedSheets(sheetNames)}
                className="cursor-pointer rounded border px-2 py-1 text-xs"
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
                onClick={() => setSelectedSheets([])}
                className="cursor-pointer rounded border px-2 py-1 text-xs"
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
            {sheetNames.map((sheetName) => (
              <button
                key={sheetName}
                type="button"
                onClick={() => toggleSheet(sheetName)}
                className="rounded-full border px-2.5 py-1 text-xs"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: selectedSheetSet.has(sheetName)
                    ? "var(--tag-selected-bg)"
                    : "var(--tag-bg)",
                  color: selectedSheetSet.has(sheetName)
                    ? "var(--tag-selected-text)"
                    : "var(--tag-text)",
                }}
              >
                {sheetName}
              </button>
            ))}
          </div>
        </div>
      )}

      {preview && (
        <div
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
            color: "var(--muted-2)",
          }}
        >
          <div className="mb-2 font-medium" style={{ color: "var(--foreground)" }}>
            Split summary
          </div>

          <div className="flex flex-wrap gap-1.5 overflow-hidden whitespace-nowrap">
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              <Layers3 size={14} />
              {preview.sheet_count.toLocaleString()} source sheet
              {preview.sheet_count === 1 ? "" : "s"}
            </span>

            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              {selectedCount.toLocaleString()} selected
            </span>

            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              <Archive size={14} />
              Sheet names preserved in output files
            </span>

            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              .zip download with one .xlsx per sheet
            </span>
          </div>
        </div>
      )}

      {error && <div className="tool-error">{error}</div>}

      {file && (
        <div className="flex justify-end">
          <button
            onClick={handleSplit}
            disabled={!canSplit}
            className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <span className="tool-spinner" />}
            {loading ? t("splitting") : t("split")}
          </button>
        </div>
      )}
    </div>
  );
}
