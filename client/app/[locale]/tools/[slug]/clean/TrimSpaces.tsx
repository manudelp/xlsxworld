"use client";

import { useTranslations } from "next-intl";

import { useCallback, useMemo, useState } from "react";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";
import { trimSpaces } from "@/lib/tools/clean";

import { downloadXlsx, EXCEL_ACCEPT, getSheetColumnNames } from "./shared";

export default function TrimSpaces() {
  const t = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [activeSheet, setActiveSheet] = useState(0);
  const [allSheets, setAllSheets] = useState(false);
  const [onlySpecificColumns, setOnlySpecificColumns] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [collapseInternalSpaces, setCollapseInternalSpaces] = useState(false);
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
    setOnlySpecificColumns(false);
    setCollapseInternalSpaces(false);
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

  const selectedSheetName = preview?.sheets[activeSheet]?.name ?? "";

  const toggleColumn = useCallback((columnName: string) => {
    setSelectedColumns((current) => {
      if (current.includes(columnName)) {
        return current.filter((column) => column !== columnName);
      }
      return [...current, columnName];
    });
  }, []);

  const canRun =
    !!file &&
    !!preview &&
    !loading &&
    (!onlySpecificColumns || columnNames.length === 0 || selectedColumns.length > 0);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept={EXCEL_ACCEPT}
        message={t("dropExcelTrimSpaces")}
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
          className="space-y-5 rounded-lg border p-4"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div>
            <h3 className="font-medium">{t("trimExtraSpaces")}</h3>
            <p className="text-sm" style={{ color: "var(--muted-2)" }}>
              {fileName} - {preview.sheet_count} sheet
              {preview.sheet_count === 1 ? "" : "s"}
            </p>
          </div>

          <div className="space-y-3">
            <p
              className="text-sm font-medium"
              style={{ color: "var(--muted)" }}
            >
              1. Where should I clean spaces?
            </p>
            <div className="flex flex-wrap gap-3">
              <label
                className="flex items-center gap-2 text-sm"
                style={{ color: "var(--muted)" }}
              >
                <input
                  type="radio"
                  name="sheetScope"
                  checked={allSheets}
                  onChange={() => setAllSheets(true)}
                />
                All sheets
              </label>
              <label
                className="flex items-center gap-2 text-sm"
                style={{ color: "var(--muted)" }}
              >
                <input
                  type="radio"
                  name="sheetScope"
                  checked={!allSheets}
                  onChange={() => setAllSheets(false)}
                />
                One sheet
              </label>
            </div>

            {!allSheets ? (
              <div className="flex flex-wrap gap-2">
                {preview.sheets.map((sheet, index) => (
                  <button
                    key={sheet.name}
                    type="button"
                    onClick={() => {
                      setActiveSheet(index);
                      setSelectedColumns(getSheetColumnNames(preview, index));
                    }}
                    className="cursor-pointer rounded-full border px-3 py-1 text-sm"
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
            ) : null}
          </div>

          <div className="space-y-3">
            <p
              className="text-sm font-medium"
              style={{ color: "var(--muted)" }}
            >
              2. How strict should cleaning be?
            </p>
            <label
              className="flex items-start gap-2 text-sm"
              style={{ color: "var(--muted)" }}
            >
              <input
                className="mt-0.5"
                type="checkbox"
                checked={collapseInternalSpaces}
                onChange={(event) =>
                  setCollapseInternalSpaces(event.target.checked)
                }
              />
              <span>{t("collapseInternalSpaces")}</span>
            </label>
          </div>

          <div className="space-y-3">
            <label
              className="flex items-center gap-2 text-sm"
              style={{ color: "var(--muted)" }}
            >
              <input
                type="checkbox"
                checked={onlySpecificColumns}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setOnlySpecificColumns(enabled);
                  if (enabled && selectedColumns.length === 0) {
                    setSelectedColumns(columnNames);
                  }
                }}
              />
              3. Only clean specific columns (optional)
            </label>

            {onlySpecificColumns ? (
              <div className="flex justify-between items-center">
                {columnNames.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--muted-2)" }}>
                    This sheet has no headers. The tool will clean all columns.
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
            ) : null}
          </div>

          <div
            className="rounded-md border p-3 text-sm"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-2)",
              color: "var(--muted)",
            }}
          >
            {allSheets
              ? t("willCleanAllSheets")
              : `Will clean only \"${selectedSheetName}\"`}
            {onlySpecificColumns && columnNames.length > 0
              ? `, in ${selectedColumns.length} selected column${selectedColumns.length === 1 ? "" : "s"}.`
              : ", in all columns."}
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
                  const buffer = await trimSpaces(
                    file,
                    {
                      allSheets,
                      sheet: selectedSheetName,
                      columns: onlySpecificColumns ? selectedColumns : [],
                    },
                    collapseInternalSpaces,
                  );
                  const baseName = file.name.replace(/\.[^.]+$/, "").trim();
                  downloadXlsx(
                    buffer,
                    `${baseName || "workbook"}_trimmed.xlsx`,
                  );
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : t("couldNotTrimSpaces"),
                  );
                } finally {
                  setLoading(false);
                }
              }}
              className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
                {loading ? t("trimming") : t("trim")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
