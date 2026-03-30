"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { appendWorkbooks } from "@/lib/tools/merge";
import FileUploadDropzone from "@/components/utility/FileUploadDropzone";

export default function AppendWorkbooks() {
  const [files, setFiles] = useState<File[]>([]);
  const [originalOrder, setOriginalOrder] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<string | null>(null);
  const [highlightedFile, setHighlightedFile] = useState<string | null>(null);
  const [draggedFileKey, setDraggedFileKey] = useState<string | null>(null);
  const [dragOverFileKey, setDragOverFileKey] = useState<string | null>(null);
  const [isOrderExpanded, setIsOrderExpanded] = useState(true);
  const summaryRowRef = useRef<HTMLDivElement | null>(null);
  const [summaryVisibleCount, setSummaryVisibleCount] = useState(0);

  const fileKey = useCallback(
    (file: File) => `${file.name}::${file.size}::${file.lastModified}`,
    [],
  );

  const onFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const picked = Array.from(selectedFiles);
    const existingKeys = new Set(files.map((file) => fileKey(file)));
    const newUniqueFiles = picked.filter(
      (file) => !existingKeys.has(fileKey(file)),
    );

    if (newUniqueFiles.length === 0) {
      setOrderFeedback("No new files added.");
      if (files.length < 2) {
        setError("Add at least two Excel files to append.");
      }
      return;
    }

    const nextFiles = [...files, ...newUniqueFiles];
    setFiles(nextFiles);

    const originalKeys = new Set(originalOrder.map((file) => fileKey(file)));
    const nextOriginalOrder = [
      ...originalOrder,
      ...newUniqueFiles.filter((file) => !originalKeys.has(fileKey(file))),
    ];
    setOriginalOrder(nextOriginalOrder);

    setOrderFeedback(
      `Added ${newUniqueFiles.length} file${newUniqueFiles.length === 1 ? "" : "s"}. ${nextFiles.length} total.`,
    );
    if (nextFiles.length < 2) {
      setError("Add at least two Excel files to append.");
    } else {
      setError(null);
    }
    setHighlightedFile(null);
  }, [fileKey, files, originalOrder]);

  const moveFile = useCallback(
    (key: string, direction: "up" | "down") => {
      setFiles((current) => {
        const index = current.findIndex((file) => fileKey(file) === key);
        if (index === -1) return current;

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= current.length) return current;

        const next = [...current];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

        setHighlightedFile(key);
        setOrderFeedback(
          `Moved ${next[targetIndex].name} ${direction}. Position ${targetIndex + 1} of ${next.length}.`,
        );

        return next;
      });
    },
    [fileKey],
  );

  const dropFileAt = useCallback(
    (sourceKey: string, targetKey: string) => {
      if (sourceKey === targetKey) {
        setDragOverFileKey(null);
        return;
      }

      setFiles((current) => {
        const fromIndex = current.findIndex((file) => fileKey(file) === sourceKey);
        const toIndex = current.findIndex((file) => fileKey(file) === targetKey);
        if (fromIndex === -1 || toIndex === -1) return current;

        const next = [...current];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);

        setHighlightedFile(fileKey(moved));
        setOrderFeedback(
          `Moved ${moved.name} to position ${toIndex + 1} of ${next.length}.`,
        );
        return next;
      });

      setDragOverFileKey(null);
      setDraggedFileKey(null);
    },
    [fileKey],
  );

  const orderFilesAsc = useCallback(() => {
    setFiles((current) => {
      const next = [...current].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
      setOrderFeedback("Ordered files A to Z.");
      setHighlightedFile(null);
      return next;
    });
  }, []);

  const orderFilesDesc = useCallback(() => {
    setFiles((current) => {
      const next = [...current].sort((a, b) =>
        b.name.localeCompare(a.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
      setOrderFeedback("Ordered files Z to A.");
      setHighlightedFile(null);
      return next;
    });
  }, []);

  const clearCustomOrder = useCallback(() => {
    if (originalOrder.length === 0) return;

    setFiles((current) => {
      const currentKeys = new Set(current.map((file) => fileKey(file)));
      const next = originalOrder.filter((file) => currentKeys.has(fileKey(file)));
      setOrderFeedback("Order reset to upload order.");
      setHighlightedFile(null);
      return next;
    });
  }, [fileKey, originalOrder]);

  useEffect(() => {
    if (!orderFeedback) return;

    const timeoutId = window.setTimeout(() => {
      setOrderFeedback(null);
      setHighlightedFile(null);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [orderFeedback]);

  const uploadOrderedKeys = useMemo(
    () => originalOrder.map((file) => fileKey(file)),
    [fileKey, originalOrder],
  );
  const currentOrderedKeys = useMemo(
    () => files.map((file) => fileKey(file)),
    [fileKey, files],
  );
  const isUploadOrder =
    uploadOrderedKeys.length === currentOrderedKeys.length &&
    uploadOrderedKeys.every((key, index) => key === currentOrderedKeys[index]);

  const totalSizeBytes = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );
  const totalSizeLabel = useMemo(() => {
    const mb = totalSizeBytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  }, [totalSizeBytes]);

  const summaryPreviewFiles = useMemo(
    () => files.slice(0, summaryVisibleCount),
    [files, summaryVisibleCount],
  );
  const hiddenSummaryCount = files.length - summaryPreviewFiles.length;

  useEffect(() => {
    const row = summaryRowRef.current;
    if (!row) return;

    const chipPaddingAndBorder = 18;
    const chipGap = 6;

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
      if (availableWidth <= 0 || files.length === 0) {
        setSummaryVisibleCount(0);
        return;
      }

      const chipWidths = files.map((file, index) =>
        measureChipWidth(`${index + 1}. ${file.name}`),
      );

      let bestCount = 0;

      for (let count = 0; count <= files.length; count += 1) {
        const hidden = files.length - count;

        const shownWidth = chipWidths
          .slice(0, count)
          .reduce((sum, width) => sum + width, 0);
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
  }, [files]);

  const handleAppend = useCallback(async () => {
    if (files.length < 2) {
      setError("Select at least two XLSX files to append.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const buffer = await appendWorkbooks(files);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "appended-workbooks.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Append failed");
    } finally {
      setLoading(false);
    }
  }, [files]);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".xls,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        multiple
        message="Drop or select at least 2 Excel files to append"
        className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition"
        style={{
          borderColor: error ? "var(--danger)" : "var(--border)",
          backgroundColor: error ? "var(--danger-soft)" : "var(--background)",
        }}
        onFiles={onFiles}
      />

      {files.length > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-medium">Append Files</h3>
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                {files.length} file{files.length === 1 ? "" : "s"} ready
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setOriginalOrder([]);
                  setOrderFeedback("Selection cleared.");
                  setHighlightedFile(null);
                  setError(null);
                }}
                className="cursor-pointer rounded-md border px-3 py-1.5 text-sm"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: "var(--tag-bg)",
                  color: "var(--tag-text)",
                }}
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
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
                  Append summary
                </div>
                <span
                  className="rounded-full border px-2 py-0.5 text-xs"
                  style={{
                    borderColor: "var(--tag-border)",
                    backgroundColor: "var(--tag-bg)",
                    color: "var(--tag-text)",
                  }}
                >
                  {files.length} files
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
                  <div>Files</div>
                  <div className="font-medium" style={{ color: "var(--foreground)" }}>
                    {files.length}
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
                  <div>Total size</div>
                  <div className="font-medium" style={{ color: "var(--foreground)" }}>
                    {totalSizeLabel}
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
                  <div>Order mode</div>
                  <div className="font-medium" style={{ color: "var(--foreground)" }}>
                    {isUploadOrder ? "Upload" : "Custom"}
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
                  <div>Result</div>
                  <div
                    className="truncate font-medium"
                    style={{ color: "var(--foreground)" }}
                    title="Single workbook with all sheets"
                  >
                    All source sheets preserved
                  </div>
                </div>
              </div>

              <div className="mt-2 text-xs" style={{ color: "var(--muted-2)" }}>
                File order preview
              </div>
              <div
                ref={summaryRowRef}
                className="mt-1 flex flex-nowrap items-center gap-1.5 overflow-hidden text-xs"
              >
                {summaryPreviewFiles.map((file, index) => (
                  <span
                    key={`summary-${fileKey(file)}`}
                    className="max-w-[11rem] truncate rounded-full border px-2 py-0.5"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--surface)",
                      color: "var(--foreground)",
                    }}
                    title={file.name}
                  >
                    {index + 1}. {file.name}
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
              </div>
            </div>
          </div>

          <div
            className="mt-4 rounded-md border p-3"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-2)",
            }}
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Append order</div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={orderFilesAsc}
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
                    onClick={orderFilesDesc}
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
                  onClick={() => setIsOrderExpanded((current) => !current)}
                  className="cursor-pointer rounded border px-2 py-1 text-xs"
                  style={{
                    borderColor: "var(--tag-border)",
                    backgroundColor: "var(--tag-bg)",
                    color: "var(--tag-text)",
                  }}
                  aria-label={isOrderExpanded ? "Collapse append order" : "Expand append order"}
                >
                  <span className="inline-flex items-center gap-1.5 leading-none">
                    {isOrderExpanded ? "Collapse" : "Expand"}
                    {isOrderExpanded ? (
                      <ChevronUp size={14} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={14} aria-hidden="true" />
                    )}
                  </span>
                </button>
              </div>
            </div>

            {isOrderExpanded ? (
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
                    "Drag and drop rows or use Up and Down to define append order."}
                </div>

                <div className="space-y-2">
                  {files.map((file, index) => {
                    const key = fileKey(file);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded border px-2 py-1.5 transition-all duration-300"
                        draggable
                        onDragStart={(event) => {
                          setDraggedFileKey(key);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          if (dragOverFileKey !== key) {
                            setDragOverFileKey(key);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverFileKey === key) {
                            setDragOverFileKey(null);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (!draggedFileKey) return;
                          dropFileAt(draggedFileKey, key);
                        }}
                        onDragEnd={() => {
                          setDraggedFileKey(null);
                          setDragOverFileKey(null);
                        }}
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor:
                            highlightedFile === key
                              ? "var(--reorder-highlight-bg)"
                              : "var(--surface)",
                          boxShadow:
                            dragOverFileKey === key && draggedFileKey !== key
                              ? "0 0 0 2px var(--tag-border)"
                              : highlightedFile === key
                              ? "0 0 0 1px var(--reorder-highlight-border)"
                              : "none",
                          transform:
                            draggedFileKey === key
                              ? "scale(0.995)"
                              : highlightedFile === key
                              ? "translateX(2px)"
                              : "translateX(0)",
                          opacity: draggedFileKey === key ? 0.75 : 1,
                          cursor: "grab",
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <GripVertical
                            size={16}
                            aria-hidden="true"
                            style={{ color: "var(--muted-2)" }}
                          />
                          <span className="truncate text-sm" style={{ color: "var(--foreground)" }}>
                            {index + 1}. {file.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveFile(key, "up")}
                            disabled={index === 0}
                            aria-label={`Move ${file.name} up`}
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
                            onClick={() => moveFile(key, "down")}
                            disabled={index === files.length - 1}
                            aria-label={`Move ${file.name} down`}
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
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-xs" style={{ color: "var(--muted-2)" }}>
                {files.length} file(s) selected. Expand to reorder manually.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs" style={{ color: "var(--muted-2)" }}>
          Combines all workbook sheets into one output workbook, preserving sheet structure.
        </div>
        <button
          type="button"
          onClick={handleAppend}
          disabled={files.length < 2 || loading}
          className="cursor-pointer rounded-md border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            borderColor: "var(--tag-border)",
            backgroundColor: "var(--tag-bg)",
            color: "var(--tag-text)",
          }}
        >
          {loading ? "Appending..." : "Append Workbooks"}
        </button>
      </div>
    </div>
  );
}
