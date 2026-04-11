"use client";

import { useTranslations } from "next-intl";

import { useCallback, useMemo, useState } from "react";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";
import { findReplace } from "@/lib/tools/clean";

import { downloadXlsx, EXCEL_ACCEPT, getSheetColumnNames } from "./shared";

export default function FindReplace() {
  const t = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [activeSheet, setActiveSheet] = useState(0);
  const [allSheets, setAllSheets] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
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

  const canRun = !!file && !!preview && findText.trim().length > 0 && !loading;

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept={EXCEL_ACCEPT}
        message={t("dropExcelFindReplace")}
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
              <h3 className="font-medium">{t("findReplaceSettings")}</h3>
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-sm" style={{ color: "var(--muted)" }}>
              Find
              <input
                value={findText}
                onChange={(event) => setFindText(event.target.value)}
                placeholder={useRegex ? t("findRegexPlaceholder") : t("findPlaceholder")}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                  color: "var(--foreground)",
                }}
              />
            </label>

            <label className="block text-sm" style={{ color: "var(--muted)" }}>
              Replace with
              <input
                value={replaceText}
                onChange={(event) => setReplaceText(event.target.value)}
                placeholder={t("replacePlaceholder")}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                  color: "var(--foreground)",
                }}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(event) => setUseRegex(event.target.checked)}
              />
              Use regular expression
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(event) => setMatchCase(event.target.checked)}
              />
              Match case
            </label>
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
                  const buffer = await findReplace(file, {
                    allSheets,
                    sheet: sheetName,
                    columns: selectedColumns,
                  }, {
                    findText,
                    replaceText,
                    useRegex,
                    matchCase,
                  });
                  downloadXlsx(buffer, "find-replace.xlsx");
                } catch (e) {
                  setError(e instanceof Error ? e.message : t("couldNotFindReplace"));
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
