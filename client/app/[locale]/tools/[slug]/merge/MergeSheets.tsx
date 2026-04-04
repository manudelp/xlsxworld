"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { mergeSheets } from "@/lib/tools/merge";
import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";

export default function MergeSheets() {
  const t = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [outputSheet, setOutputSheet] = useState("Merged");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<string | null>(null);
  const [highlightedSheet, setHighlightedSheet] = useState<string | null>(null);
  const [draggedSheet, setDraggedSheet] = useState<string | null>(null);
  const [dragOverSheet, setDragOverSheet] = useState<string | null>(null);
  const [isMergeOrderExpanded, setIsMergeOrderExpanded] = useState(true);
  const summaryRowRef = useRef<HTMLDivElement | null>(null);
  const [summaryVisibleCount, setSummaryVisibleCount] = useState(0);

  const onFile = useCallback(async (selected: File) => {
    setError(null);
    setFile(selected);
    setFileName(selected.name);
    setPreview(null);
    setSelectedSheets([]);
    setPreviewLoading(true);

    try {
      const workbook = await uploadForPreview(selected, 1);
      setPreview(workbook);
      setSelectedSheets(workbook.sheets.map((sheet) => sheet.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("couldNotInspect"));
    } finally {
      setPreviewLoading(false);
    }
  }, [t]);

  const toggleSheet = useCallback((name: string) => {
    setSelectedSheets((current) => {
      if (current.includes(name)) {
        return current.filter((sheetName) => sheetName !== name);
      }
      return [...current, name];
    });
  }, []);

  const moveSheet = useCallback((name: string, direction: "up" | "down") => {
    setSelectedSheets((current) => {
      const index = current.indexOf(name);
      if (index === -1) return current;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

      setHighlightedSheet(name);
      setOrderFeedback(
        `Moved ${name} ${direction}. Position ${targetIndex + 1} of ${next.length}.`,
      );

      return next;
    });
  }, []);

  const dropSheetAt = useCallback((sourceName: string, targetName: string) => {
    if (sourceName === targetName) {
      setDragOverSheet(null);
      return;
    }

    setSelectedSheets((current) => {
      const fromIndex = current.indexOf(sourceName);
      const toIndex = current.indexOf(targetName);
      if (fromIndex === -1 || toIndex === -1) return current;

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      setHighlightedSheet(moved);
      setOrderFeedback(
        `Moved ${moved} to position ${toIndex + 1} of ${next.length}.`,
      );
      return next;
    });

    setDragOverSheet(null);
    setDraggedSheet(null);
  }, []);

  const orderSheetsAsc = useCallback(() => {
    setSelectedSheets((current) => {
      const next = [...current].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      );
      setOrderFeedback("Ordered sheets A to Z.");
      setHighlightedSheet(null);
      return next;
    });
  }, []);

  const orderSheetsDesc = useCallback(() => {
    setSelectedSheets((current) => {
      const next = [...current].sort((a, b) =>
        b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }),
      );
      setOrderFeedback("Ordered sheets Z to A.");
      setHighlightedSheet(null);
      return next;
    });
  }, []);

  const clearCustomOrder = useCallback(() => {
    if (!preview) return;

    setSelectedSheets((current) => {
      const currentSet = new Set(current);
      const next = preview.sheets
        .map((sheet) => sheet.name)
        .filter((name) => currentSet.has(name));
      setOrderFeedback("Order reset to workbook order.");
      setHighlightedSheet(null);
      return next;
    });
  }, [preview]);

  useEffect(() => {
    if (!orderFeedback) return;

    const timeoutId = window.setTimeout(() => {
      setOrderFeedback(null);
      setHighlightedSheet(null);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [orderFeedback]);

  const hasSelectedSheets = selectedSheets.length > 0;
  const isReadyToMerge = !!file && !previewLoading && hasSelectedSheets;
  const totalSheets = preview?.sheet_count ?? 0;
  const unselectedSheets = Math.max(0, totalSheets - selectedSheets.length);
  const selectionCoverage =
    totalSheets > 0 ? Math.round((selectedSheets.length / totalSheets) * 100) : 0;

  const workbookOrderedSelection = useMemo(() => {
    if (!preview) return selectedSheets;
    const selectedSet = new Set(selectedSheets);
    return preview.sheets
      .map((sheet) => sheet.name)
      .filter((sheetName) => selectedSet.has(sheetName));
  }, [preview, selectedSheets]);

  const isWorkbookOrder =
    workbookOrderedSelection.length === selectedSheets.length &&
    workbookOrderedSelection.every(
      (sheetName, index) => sheetName === selectedSheets[index],
    );

  const summaryPreviewSheets = useMemo(
    () => selectedSheets.slice(0, summaryVisibleCount),
    [selectedSheets, summaryVisibleCount],
  );
  const hiddenSummaryCount = selectedSheets.length - summaryPreviewSheets.length;

  useEffect(() => {
    const row = summaryRowRef.current;
    if (!row) return;

    const chipPaddingAndBorder = 18; // px-2 + border
    const chipGap = 6; // gap-1.5

    const measureChipWidth = (text: string) => {
      const probe = document.createElement("span");
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.whiteSpace = "nowrap";
      probe.style.font = window.getComputedStyle(row).font;
      probe.textContent = text;
      document.body.appendChild(probe);
      const width = Math.ceil(probe.getBoundingClientRect().width);
      document.body.removeChild(probe);
      return width + chipPaddingAndBorder;
    };

    const recalculate = () => {
      const availableWidth = row.clientWidth;
      if (availableWidth <= 0 || selectedSheets.length === 0) {
        setSummaryVisibleCount(0);
        return;
      }

      const chipWidths = selectedSheets.map((sheetName, index) =>
        measureChipWidth(`${index + 1}. ${sheetName}`),
      );

      let bestCount = 0;

      for (let count = 0; count <= selectedSheets.length; count += 1) {
        const hidden = selectedSheets.length - count;

        const shownWidth = chipWidths
          .slice(0, count)
          .reduce((sum, chipWidth) => sum + chipWidth, 0);
        const shownGaps = count > 1 ? (count - 1) * chipGap : 0;

        let totalWidth = shownWidth + shownGaps;

        if (hidden > 0) {
          const overflowWidth = measureChipWidth(`+${hidden} more`);
          totalWidth += overflowWidth + (count > 0 ? chipGap : 0);
        }

        if (totalWidth <= availableWidth) {
          bestCount = count;
        } else {
          break;
        }
      }

      setSummaryVisibleCount(bestCount);
    };

    recalculate();

    const resizeObserver = new ResizeObserver(() => {
      recalculate();
    });
    resizeObserver.observe(row);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedSheets]);

  const handleMerge = useCallback(async () => {
    if (!file) {
      setError(t("selectExcelFirst"));
      return;
    }

    if (!hasSelectedSheets) {
      setError(t("selectAtLeastOneSheet"));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const buffer = await mergeSheets(file, selectedSheets, outputSheet);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      a.download = `${baseName || "merged"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mergeFailed"));
    } finally {
      setLoading(false);
    }
  }, [file, hasSelectedSheets, outputSheet, selectedSheets, t]);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".xls,.xlsx,.xlsm,.xlsb,.xltx,.xltm,.xlam,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.binary.macroEnabled.12,application/vnd.ms-excel.sheet.macroEnabled.12"
        message={t("dropExcelMerge")}
        hasError={!!error}
        onFiles={(files) => {
          const selected = files[0];
          if (selected) void onFile(selected);
        }}
      />

      {previewLoading && (
        <div className="text-sm" style={{ color: "var(--muted-2)" }}>
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
              <h3 className="font-medium">{t("selectSheets")}</h3>
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                {fileName || t("uploadedWorkbook")} - {preview.sheet_count} sheet
                {preview.sheet_count === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const allSheets = preview.sheets.map((sheet) => sheet.name);
                  setSelectedSheets(allSheets);
                  setOrderFeedback(`Selected all ${allSheets.length} sheets.`);
                  setHighlightedSheet(null);
                }}
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
                onClick={() => {
                  setSelectedSheets([]);
                  setOrderFeedback("Selection cleared.");
                  setHighlightedSheet(null);
                }}
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

          <div className="mb-4 flex flex-wrap gap-2">
            {preview.sheets.map((sheet) => {
              const isSelected = selectedSheets.includes(sheet.name);
              return (
                <button
                  key={sheet.name}
                  type="button"
                  onClick={() => toggleSheet(sheet.name)}
                  className="cursor-pointer rounded-full border px-3 py-1 text-sm transition"
                  style={{
                    borderColor: "var(--tag-border)",
                    backgroundColor: isSelected
                      ? "var(--tag-selected-bg)"
                      : "var(--tag-bg)",
                    color: isSelected
                      ? "var(--tag-selected-text)"
                      : "var(--tag-text)",
                  }}
                  aria-pressed={isSelected}
                >
                  {sheet.name}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <label
              className="block text-sm"
              style={{ color: "var(--muted)" }}
            >
              Output sheet name
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                  color: "var(--foreground)",
                }}
                value={outputSheet}
                onChange={(e) => setOutputSheet(e.target.value)}
              />
            </label>

            <div
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
                color: "var(--muted-2)",
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium" style={{ color: "var(--foreground)" }}>
                  Merge summary
                </div>
                <span
                  className="rounded-full border px-2 py-0.5 text-xs"
                  style={{
                    borderColor: "var(--tag-border)",
                    backgroundColor: "var(--tag-bg)",
                    color: "var(--tag-text)",
                  }}
                >
                  {selectionCoverage}% selected
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <div
                  className="rounded border px-2 py-1"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface)",
                    color: "var(--muted-2)",
                  }}
                >
                  <div>{t("selected")}</div>
                  <div className="font-medium" style={{ color: "var(--foreground)" }}>
                    {selectedSheets.length}
                  </div>
                </div>
                <div
                  className="rounded border px-2 py-1"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface)",
                    color: "var(--muted-2)",
                  }}
                >
                  <div>{t("notSelected")}</div>
                  <div className="font-medium" style={{ color: "var(--foreground)" }}>
                    {unselectedSheets}
                  </div>
                </div>
                <div
                  className="rounded border px-2 py-1"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface)",
                    color: "var(--muted-2)",
                  }}
                >
                  <div>{t("orderMode")}</div>
                  <div className="font-medium" style={{ color: "var(--foreground)" }}>
                    {isWorkbookOrder ? t("workbookOrder") : t("customOrder")}
                  </div>
                </div>
                <div
                  className="rounded border px-2 py-1"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface)",
                    color: "var(--muted-2)",
                  }}
                >
                  <div>{t("result")}</div>
                  <div
                    className="truncate font-medium"
                    style={{ color: "var(--foreground)" }}
                    title={outputSheet || "Merged"}
                  >
                    {outputSheet || "Merged"}
                  </div>
                </div>
              </div>

              <div className="mt-2 text-xs" style={{ color: "var(--muted-2)" }}>
                Merge order preview
              </div>
              <div
                ref={summaryRowRef}
                className="mt-1 flex flex-nowrap items-center gap-1.5 overflow-hidden text-xs"
              >
                {summaryPreviewSheets.map((sheetName, index) => (
                  <span
                    key={`summary-${sheetName}`}
                    className="max-w-[11rem] truncate rounded-full border px-2 py-0.5"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--surface)",
                      color: "var(--foreground)",
                    }}
                    title={sheetName}
                  >
                    {index + 1}. {sheetName}
                  </span>
                ))}

                {hiddenSummaryCount > 0 && (
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5"
                    style={{
                      borderColor: "var(--tag-border)",
                      backgroundColor: "var(--tag-bg)",
                      color: "var(--tag-text)",
                    }}
                  >
                    +{hiddenSummaryCount} more
                  </span>
                )}

                {!hasSelectedSheets && (
                  <span style={{ color: "var(--muted-2)" }}>
                    No sheets selected.
                  </span>
                )}
              </div>
            </div>
          </div>

          {hasSelectedSheets && (
            <div
              className="mt-4 rounded-md border p-3"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
              }}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium">{t("mergeOrder")}</div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={orderSheetsAsc}
                      className="cursor-pointer rounded border px-2 py-1 text-xs"
                      style={{
                        borderColor: "var(--tag-border)",
                        backgroundColor: "var(--tag-bg)",
                        color: "var(--tag-text)",
                      }}
                    >
                      Order ASC
                    </button>
                    <button
                      type="button"
                      onClick={orderSheetsDesc}
                      className="cursor-pointer rounded border px-2 py-1 text-xs"
                      style={{
                        borderColor: "var(--tag-border)",
                        backgroundColor: "var(--tag-bg)",
                        color: "var(--tag-text)",
                      }}
                    >
                      Order DESC
                    </button>
                    <button
                      type="button"
                      onClick={clearCustomOrder}
                      className="cursor-pointer rounded border px-2 py-1 text-xs"
                      style={{
                        borderColor: "var(--tag-border)",
                        backgroundColor: "var(--tag-bg)",
                        color: "var(--tag-text)",
                      }}
                    >
                      Clear order
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMergeOrderExpanded((current) => !current)}
                    className="cursor-pointer rounded border px-2 py-1 text-xs"
                    style={{
                      borderColor: "var(--tag-border)",
                      backgroundColor: "var(--tag-bg)",
                      color: "var(--tag-text)",
                    }}
                    aria-label={
                      isMergeOrderExpanded
                        ? t("collapseOrder")
                        : t("expandOrder")
                    }
                  >
                    <span className="inline-flex items-center gap-1.5 leading-none">
                      {isMergeOrderExpanded ? t("collapse") : t("expand")}
                      {isMergeOrderExpanded ? (
                        <ChevronUp size={14} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={14} aria-hidden="true" />
                      )}
                    </span>
                  </button>
                </div>
              </div>
              {isMergeOrderExpanded ? (
                <>
                  <div
                    className="mb-2 text-xs transition-all duration-300"
                    style={{
                      color: orderFeedback ? "var(--foreground)" : "var(--muted-2)",
                      opacity: orderFeedback ? 1 : 0.82,
                    }}
                    role="status"
                    aria-live="polite"
                  >
                    {orderFeedback ||
                      "Drag and drop rows or use Up and Down to set exact merge order."}
                  </div>
                  <div className="space-y-2">
                    {selectedSheets.map((sheetName, index) => (
                      <div
                        key={sheetName}
                        className="flex items-center justify-between rounded border px-2 py-1.5 transition-all duration-300"
                        draggable
                        onDragStart={(event) => {
                          setDraggedSheet(sheetName);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          if (dragOverSheet !== sheetName) {
                            setDragOverSheet(sheetName);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverSheet === sheetName) {
                            setDragOverSheet(null);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (!draggedSheet) return;
                          dropSheetAt(draggedSheet, sheetName);
                        }}
                        onDragEnd={() => {
                          setDraggedSheet(null);
                          setDragOverSheet(null);
                        }}
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor:
                            highlightedSheet === sheetName
                              ? "var(--reorder-highlight-bg)"
                              : "var(--surface)",
                          boxShadow:
                            dragOverSheet === sheetName && draggedSheet !== sheetName
                              ? "0 0 0 2px var(--tag-border)"
                              : highlightedSheet === sheetName
                              ? "0 0 0 1px var(--reorder-highlight-border)"
                              : "none",
                          transform:
                            draggedSheet === sheetName
                              ? "scale(0.995)"
                              : highlightedSheet === sheetName
                              ? "translateX(2px)"
                              : "translateX(0)",
                          opacity: draggedSheet === sheetName ? 0.75 : 1,
                          cursor: "grab",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical
                            size={16}
                            aria-hidden="true"
                            style={{ color: "var(--muted-2)" }}
                          />
                          <span
                            className="text-sm"
                            style={{ color: "var(--foreground)" }}
                          >
                            {index + 1}. {sheetName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveSheet(sheetName, "up")}
                            disabled={index === 0}
                            aria-label={`Move ${sheetName} up`}
                            className="cursor-pointer rounded border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                            style={{
                              borderColor: "var(--tag-border)",
                              backgroundColor: "var(--tag-bg)",
                              color: "var(--tag-text)",
                            }}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSheet(sheetName, "down")}
                            disabled={index === selectedSheets.length - 1}
                            aria-label={`Move ${sheetName} down`}
                            className="cursor-pointer rounded border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                            style={{
                              borderColor: "var(--tag-border)",
                              backgroundColor: "var(--tag-bg)",
                              color: "var(--tag-text)",
                            }}
                          >
                            Down
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-xs" style={{ color: "var(--muted-2)" }}>
                  {selectedSheets.length} sheet(s) selected. Expand to reorder manually.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {file && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs" style={{ color: "var(--muted-2)" }}>
            Tip: Selected sheets are merged using the order shown above.
          </div>
          <button
            type="button"
            onClick={handleMerge}
            disabled={!isReadyToMerge || loading}
            className="tool-primary-action cursor-pointer rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t("merging") : t("merge")}
          </button>
        </div>
      )}
    </div>
  );
}
