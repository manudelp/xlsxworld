"use client";

import { useTranslations } from "next-intl";

import { useCallback, useMemo, useState } from "react";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";
import { normalizeCase } from "@/lib/tools/clean";

import { downloadXlsx, EXCEL_ACCEPT, getSheetColumnNames } from "./shared";

export default function NormalizeCase() {
  const t = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [activeSheet, setActiveSheet] = useState(0);
  const [allSheets, setAllSheets] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [mode, setMode] = useState<"lower" | "upper" | "title">("title");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(async (selected: File) => {
    setError(null);
    setFile(selected);
    setFileName(selected.name);
    setPreview(null);
    setSelectedColumns([]);
    setActiveSheet(0);
    setAllSheets(false);
    setLoading(true);

    try {
      const workbook = await uploadForPreview(selected, 5);
      setPreview(workbook);
      setSelectedColumns(getSheetColumnNames(workbook, 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("couldNotInspect"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const columnNames = useMemo(
    () => getSheetColumnNames(preview, activeSheet),
    [preview, activeSheet],
  );

  const toggleColumn = useCallback((columnName: string) => {
    setSelectedColumns((current) => {
      if (current.includes(columnName)) {
        return current.filter((column) => column !== columnName);
      }
      return [...current, columnName];
    });
  }, []);

  const canRun = !!file && !!preview && !loading;

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept={EXCEL_ACCEPT}
        message={t("dropExcelNormalizeCase")}
        hasError={!!error}
        onFiles={(files) => {
          const selected = files[0];
          if (selected) void onFile(selected);
        }}
      />

      {loading ? (
        <p className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-2)" }}>
          <span className="tool-spinner" />
          Uploading and preparing workbook...
        </p>
      ) : null}

      {error ? <div className="tool-error">{error}</div> : null}

      {preview ? (
        <div
          className="space-y-4 rounded-lg border p-4"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-medium">{t("caseNormalizationSettings")}</h3>
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                {fileName} - {t("sheetCount", { count: preview.sheet_count })}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
              <input
                type="checkbox"
                checked={allSheets}
                onChange={(event) => setAllSheets(event.target.checked)}
              />
              Apply to all sheets
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
              Target case
            </p>
            <div className="flex flex-wrap gap-2">
              {([
                ["lower", "lowercase"],
                ["upper", "UPPERCASE"],
                ["title", "Title Case"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className="cursor-pointer rounded-md border px-3 py-1.5 text-sm"
                  style={{
                    borderColor: "var(--tag-border)",
                    backgroundColor:
                      mode === value ? "var(--tag-selected-bg)" : "var(--tag-bg)",
                    color: mode === value ? "var(--tag-selected-text)" : "var(--tag-text)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
              Sheet
            </p>
            <div className="flex flex-wrap gap-2">
              {preview.sheets.map((sheet, index) => (
                <button
                  key={sheet.name}
                  type="button"
                  disabled={allSheets}
                  onClick={() => {
                    setActiveSheet(index);
                    setSelectedColumns(getSheetColumnNames(preview, index));
                  }}
                  className="cursor-pointer rounded-full border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: "var(--tag-border)",
                    backgroundColor:
                      index === activeSheet
                        ? "var(--tag-selected-bg)"
                        : "var(--tag-bg)",
                    color:
                      index === activeSheet
                        ? "var(--tag-selected-text)"
                        : "var(--tag-text)",
                  }}
                >
                  {sheet.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                Text columns (empty means all columns)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedColumns(columnNames)}
                  className="cursor-pointer rounded-md border px-2.5 py-1 text-xs"
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
                  onClick={() => setSelectedColumns([])}
                  className="cursor-pointer rounded-md border px-2.5 py-1 text-xs"
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

            {columnNames.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--muted-2)" }}>
                This sheet has no named headers. The tool will use all columns.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {columnNames.map((columnName) => {
                  const selected = selectedColumns.includes(columnName);
                  return (
                    <button
                      key={columnName}
                      type="button"
                      onClick={() => toggleColumn(columnName)}
                      className="cursor-pointer rounded-full border px-3 py-1 text-xs"
                      style={{
                        borderColor: "var(--tag-border)",
                        backgroundColor: selected
                          ? "var(--tag-selected-bg)"
                          : "var(--tag-bg)",
                        color: selected
                          ? "var(--tag-selected-text)"
                          : "var(--tag-text)",
                      }}
                    >
                      {columnName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canRun}
              onClick={async () => {
                if (!file || !preview) return;
                setError(null);
                setLoading(true);
                try {
                  const sheetName = preview.sheets[activeSheet]?.name ?? "";
                  const buffer = await normalizeCase(file, {
                    allSheets,
                    sheet: sheetName,
                    columns: selectedColumns,
                  }, mode);
                  downloadXlsx(buffer, "normalized-case.xlsx");
                } catch (e) {
                  setError(e instanceof Error ? e.message : t("couldNotNormalizeCase"));
                } finally {
                  setLoading(false);
                }
              }}
              className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {loading ? t("processing") : t("downloadCleanWorkbook")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
