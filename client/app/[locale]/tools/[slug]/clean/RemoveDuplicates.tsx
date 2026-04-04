"use client";

import { useTranslations } from "next-intl";

import { useCallback, useEffect, useMemo, useState } from "react";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import {
  fetchSheetPage,
  uploadForPreview,
  type WorkbookPreview,
} from "@/lib/tools/inspect";
import { removeDuplicates } from "@/lib/tools/clean";

import { downloadXlsx, EXCEL_ACCEPT, getSheetColumnNames } from "./shared";

const DUPLICATE_COUNT_PAGE_SIZE = 1000;

type PreviewCell = string | number | boolean | null;

type PreviewRow = PreviewCell[];

function baseNameFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").trim() || "spreadsheet";
}

export default function RemoveDuplicates() {
  const t = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [activeSheet, setActiveSheet] = useState(0);
  const [outputFileName, setOutputFileName] = useState("deduplicated");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [keep, setKeep] = useState<"first" | "last">("first");
  const [loading, setLoading] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<PreviewCell[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [countingDuplicates, setCountingDuplicates] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(async (selected: File) => {
    setError(null);
    setFile(selected);
    setFileName(selected.name);
    setOutputFileName(`${baseNameFromFileName(selected.name)}_deduplicated`);
    setPreview(null);
    setSelectedColumns([]);
    setCurrentStep(1);
    setActiveSheet(0);
    setPreviewRows([]);
    setPreviewHeaders([]);
    setPreviewError(null);
    setDuplicateCount(null);
    setLoading(true);

    try {
      const workbook = await uploadForPreview(selected, 25);
      setPreview(workbook);
      setSelectedColumns(getSheetColumnNames(workbook, 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("couldNotInspect"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const activeSheetName = preview?.sheets[activeSheet]?.name ?? "";
  const activeSheetPreview = preview?.sheets[activeSheet] ?? null;

  const previewHeaderCells = useMemo(
    () => (previewHeaders.length > 0 ? previewHeaders : activeSheetPreview?.headers ?? []),
    [previewHeaders, activeSheetPreview],
  );

  const selectableColumnNames = useMemo(() => {
    const seen = new Set<string>();

    return previewHeaderCells
      .map((header) => String(header ?? "").trim())
      .filter((name) => name.length > 0)
      .filter((name) => {
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      });
  }, [previewHeaderCells]);

  useEffect(() => {
    if (!preview || !activeSheetName) {
      setPreviewRows([]);
      setPreviewHeaders([]);
      setPreviewError(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const page = await fetchSheetPage(preview.token, activeSheetName, 0, 25);
        if (!cancelled) {
          setPreviewHeaders(page.header ?? []);
          setPreviewRows(page.rows);
        }
      } catch (e) {
        if (!cancelled) {
          setPreviewHeaders([]);
          setPreviewRows([]);
          setPreviewError(e instanceof Error ? e.message : t("couldNotLoadPreview"));
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [preview, activeSheetName, t]);

  const selectedColumnIndexes = useMemo(() => {
    const headers = previewHeaderCells.map((header) => String(header ?? "").trim());

    if (selectedColumns.length === 0) {
      return [];
    }

    const indexes = selectedColumns
      .map((columnName) => headers.indexOf(columnName))
      .filter((index) => index >= 0);

    return Array.from(new Set(indexes));
  }, [previewHeaderCells, selectedColumns]);

  useEffect(() => {
    if (!preview || !activeSheetName) {
      setDuplicateCount(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setCountingDuplicates(true);

      try {
        let offset = 0;
        let done = false;
        let duplicates = 0;
        const seen = new Set<string>();

        while (!done) {
          const page = await fetchSheetPage(
            preview.token,
            activeSheetName,
            offset,
            DUPLICATE_COUNT_PAGE_SIZE,
          );

          for (const row of page.rows) {
            const keyValues =
              selectedColumnIndexes.length > 0
                ? selectedColumnIndexes.map((index) => (index < row.length ? row[index] : null))
                : row;
            const key = JSON.stringify(keyValues);

            if (seen.has(key)) {
              duplicates += 1;
            } else {
              seen.add(key);
            }
          }

          offset += page.rows.length;
          done = page.done || page.rows.length === 0;
        }

        if (!cancelled) {
          setDuplicateCount(duplicates);
        }
      } catch {
        if (!cancelled) {
          setDuplicateCount(null);
        }
      } finally {
        if (!cancelled) {
          setCountingDuplicates(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [preview, activeSheetName, selectedColumnIndexes]);

  const toggleColumn = useCallback((columnName: string) => {
    setSelectedColumns((current) => {
      if (current.includes(columnName)) {
        return current.filter((column) => column !== columnName);
      }
      return [...current, columnName];
    });
  }, []);

  const canRun = !!file && !!preview && !loading;
  const resolvedOutputName = (
    outputFileName.trim() || `${baseNameFromFileName(fileName)}_deduplicated`
  ).replace(/\.xlsx$/i, "");
  const selectedColumnsCount = selectedColumns.length;
  const canProcess = canRun && selectedColumnsCount > 0;
  const canContinueToStep2 = !!preview && !!activeSheetPreview;
  const canContinueToStep3 = selectedColumnsCount > 0;

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept={EXCEL_ACCEPT}
        message={t("dropExcelRemoveDuplicates")}
        hasError={!!error}
        onFiles={(files) => {
          const selected = files[0];
          if (selected) void onFile(selected);
        }}
      />

      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted-2)" }}>
          Uploading and preparing workbook...
        </p>
      ) : null}

      {error ? <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p> : null}

      {preview ? (
        <div
          className="space-y-4 rounded-lg border p-4"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-medium">{t("targetRows")}</h3>
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                {fileName} - {t("sheetCount", { count: preview.sheet_count })}
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
              Select one sheet and matching columns
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              [1, "1. Sheet"],
              [2, "2. Columns"],
              [3, "3. Review"],
            ] as const).map(([step, label]) => (
              <button
                key={step}
                type="button"
                onClick={() => {
                  if (step === 1) {
                    setCurrentStep(1);
                    return;
                  }
                  if (step === 2 && canContinueToStep2) {
                    setCurrentStep(2);
                    return;
                  }
                  if (step === 3 && canContinueToStep3) {
                    setCurrentStep(3);
                  }
                }}
                className="cursor-pointer rounded-md border px-3 py-1.5 text-xs"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor:
                    currentStep === step ? "var(--tag-selected-bg)" : "var(--tag-bg)",
                  color:
                    currentStep === step ? "var(--tag-selected-text)" : "var(--tag-text)",
                  opacity:
                    step === 1 || (step === 2 && canContinueToStep2) || (step === 3 && canContinueToStep3)
                      ? 1
                      : 0.6,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {currentStep === 1 ? (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Choose the sheet you want to clean.
              </p>
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!canContinueToStep2}
                  className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Continue to Columns
                </button>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-3">
              <div
                className="sticky top-2 z-10 rounded-md border px-3 py-2 text-xs"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--muted)",
                }}
              >
                Sheet: <strong>{activeSheetPreview?.name}</strong> | Columns selected: <strong>{selectedColumnsCount}</strong>
              </div>

              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                  Pick columns that define a duplicate row
                </p>
                <span className="text-xs" style={{ color: "var(--muted-2)" }}>
                  Sheet: {activeSheetPreview?.name}
                </span>
              </div>

              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs" style={{ color: "var(--muted-2)" }}>
                  Use headers/checkboxes to toggle columns.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedColumns(selectableColumnNames)}
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

              <div
                className="scrollbar-themed overflow-x-auto rounded border"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                }}
              >
                <table className="min-w-full text-left text-sm">
                  <thead style={{ backgroundColor: "var(--surface)" }}>
                    <tr>
                      {previewHeaderCells.map((header, index) => {
                        const headerName = String(header ?? "").trim();
                        const isSelectable = headerName.length > 0;
                        const isSelected =
                          isSelectable && selectedColumns.includes(headerName);

                        return (
                          <th
                            key={`${String(header)}-${index}`}
                            className={`border px-2 py-1 whitespace-nowrap ${isSelectable ? "cursor-pointer" : "cursor-default opacity-70"}`}
                            style={{
                              borderColor: "var(--border)",
                              color: isSelected ? "var(--tag-selected-text)" : "var(--foreground)",
                              backgroundColor: isSelected
                                ? "var(--tag-selected-bg)"
                                : "var(--surface)",
                            }}
                            onClick={() => {
                              if (!isSelectable) return;
                              toggleColumn(headerName);
                            }}
                            title={
                              !isSelectable
                                ? t("unnamedHeader")
                                : t("clickToToggle")
                            }
                          >
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isSelectable}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!isSelectable) return;
                                  toggleColumn(headerName);
                                }}
                                onChange={() => {
                                  // Checkbox state is controlled by selectedColumns.
                                }}
                              />
                              <span>{String(header ?? "") || `Column ${index + 1}`}</span>
                            </label>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {previewLoading ? (
                      <tr>
                        <td
                          colSpan={Math.max(1, previewHeaderCells.length)}
                          className="border px-2 py-2 text-xs"
                          style={{ borderColor: "var(--border)", color: "var(--muted-2)" }}
                        >
                          Loading preview rows...
                        </td>
                      </tr>
                    ) : previewError ? (
                      <tr>
                        <td
                          colSpan={Math.max(1, previewHeaderCells.length)}
                          className="border px-2 py-2 text-xs"
                          style={{ borderColor: "var(--border)", color: "var(--danger)" }}
                        >
                          {previewError}
                        </td>
                      </tr>
                    ) : previewRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={Math.max(1, previewHeaderCells.length)}
                          className="border px-2 py-2 text-xs"
                          style={{ borderColor: "var(--border)", color: "var(--muted-2)" }}
                        >
                          No data rows found in this sheet.
                        </td>
                      </tr>
                    ) : (
                      previewRows.map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`}>
                          {previewHeaderCells.map((_header, colIndex) => (
                            <td
                              key={`cell-${rowIndex}-${colIndex}`}
                              className="border px-2 py-1 whitespace-nowrap"
                              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                            >
                              {String(row[colIndex] ?? "") || "-"}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="cursor-pointer rounded-md border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--tag-border)",
                    backgroundColor: "var(--tag-bg)",
                    color: "var(--tag-text)",
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={!canContinueToStep3}
                  className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Continue to Review
                </button>
              </div>

            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-4">
              <div
                className="rounded-md border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                  color: "var(--muted-2)",
                }}
              >
                <div className="mb-1 text-xs" style={{ color: "var(--muted)" }}>
                  Review
                </div>
                <div>
                  Sheet: <strong>{activeSheetPreview?.name}</strong> | Columns: <strong>{selectedColumnsCount}</strong>
                </div>
                <div>
                  Duplicates: <strong>{countingDuplicates ? t("counting") : (duplicateCount?.toLocaleString() ?? "0")}</strong>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
                  Keep duplicate row
                </p>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["first", t("firstOccurrence")],
                    ["last", t("lastOccurrence")],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setKeep(value)}
                      className="cursor-pointer rounded-md border px-3 py-1.5 text-sm"
                      style={{
                        borderColor: "var(--tag-border)",
                        backgroundColor:
                          keep === value ? "var(--tag-selected-bg)" : "var(--tag-bg)",
                        color: keep === value ? "var(--tag-selected-text)" : "var(--tag-text)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-sm" style={{ color: "var(--muted)" }}>
                Output file name
                <input
                  value={outputFileName}
                  onChange={(event) => setOutputFileName(event.target.value)}
                  placeholder={`${baseNameFromFileName(fileName)}_deduplicated`}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface-2)",
                    color: "var(--foreground)",
                  }}
                />
                <span className="mt-1 block text-xs" style={{ color: "var(--muted-2)" }}>
                  Final file: {resolvedOutputName}.xlsx
                </span>
              </label>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="cursor-pointer rounded-md border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--tag-border)",
                    backgroundColor: "var(--tag-bg)",
                    color: "var(--tag-text)",
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canProcess}
                  onClick={async () => {
                    if (!file || !preview) return;
                    setError(null);
                    setLoading(true);
                    try {
                      const sheetName = preview.sheets[activeSheet]?.name ?? "";
                      const buffer = await removeDuplicates(
                        file,
                        {
                          allSheets: false,
                          sheet: sheetName,
                          columns: selectedColumns,
                        },
                        keep,
                      );
                      downloadXlsx(buffer, `${resolvedOutputName}.xlsx`);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : t("couldNotRemoveDuplicates"));
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
      ) : null}
    </div>
  );
}
