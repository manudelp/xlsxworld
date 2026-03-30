"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Funnel } from "lucide-react";
import {
  fetchSheetPage,
  uploadForPreview,
  type Cell,
  type Row,
  type WorkbookPreview,
} from "@/lib/tools/inspect";
import BackToTopButton from "@/components/utility/BackToTopButton";
import FileUploadDropzone from "@/components/utility/FileUploadDropzone";

type SortDirection = "asc" | "desc";
const PAGE_SIZE = 25;

export default function InspectSheets() {
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalQuery, setGlobalQuery] = useState("");
  const [columnFilterIndex, setColumnFilterIndex] = useState(0);
  const [columnFilterQuery, setColumnFilterQuery] = useState("");
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [showStatsMenu, setShowStatsMenu] = useState(false);
  const [pagedRows, setPagedRows] = useState<Row[]>([]);
  const [pagedHeader, setPagedHeader] = useState<Cell[] | null>(null);
  const [pagedDone, setPagedDone] = useState(false);
  const [pagedTotalRows, setPagedTotalRows] = useState<number | null>(null);
  const [pagingLoading, setPagingLoading] = useState(false);
  const [loadingAllRows, setLoadingAllRows] = useState(false);
  const [hasLoadedPageData, setHasLoadedPageData] = useState(false);
  const [isPanningTable, setIsPanningTable] = useState(false);
  const filtersMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const statsMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const tablePanStateRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });

  const onFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    setLoading(true);

    try {
      const workbook = await uploadForPreview(file);
      setPreview(workbook);
      setActiveSheetIndex(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCell = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    return String(value);
  };

  const renderCell = (value: unknown) => {
    const formatted = formatCell(value);
    return formatted === "" ? "\u00A0" : formatted;
  };

  const activeSheet = preview?.sheets[activeSheetIndex] ?? null;
  const token = preview?.token ?? null;

  useEffect(() => {
    setGlobalQuery("");
    setColumnFilterQuery("");
    setSortColumnIndex(null);
    setSortDirection("desc");
    setColumnFilterIndex(0);
    setShowFiltersMenu(false);
    setShowStatsMenu(false);
    setPagedRows([]);
    setPagedHeader(null);
    setPagedDone(false);
    setPagedTotalRows(null);
    setPagingLoading(false);
    setLoadingAllRows(false);
    setHasLoadedPageData(false);
  }, [activeSheetIndex]);

  const loadPage = async (append: boolean) => {
    if (!token || !activeSheet || pagingLoading) return;

    setPagingLoading(true);
    try {
      const offset = append ? pagedRows.length : 0;
      const page = await fetchSheetPage(
        token,
        activeSheet.name,
        offset,
        PAGE_SIZE,
      );

      setPagedHeader(page.header ?? null);
      setPagedRows((prev) => (append ? [...prev, ...page.rows] : page.rows));
      setPagedDone(page.done);
      setPagedTotalRows(page.total_rows);
      setHasLoadedPageData(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setPagingLoading(false);
    }
  };

  const loadAllRows = async () => {
    if (!token || !activeSheet || loadingAllRows) return;

    setLoadingAllRows(true);
    try {
      let nextOffset = pagedRows.length;
      let done = pagedDone;
      let guard = 0;

      while (!done && guard < 200) {
        const page = await fetchSheetPage(
          token,
          activeSheet.name,
          nextOffset,
          PAGE_SIZE,
        );
        setPagedHeader(page.header ?? null);
        setPagedRows((prev) => [...prev, ...page.rows]);
        setPagedDone(page.done);
        setPagedTotalRows(page.total_rows);
        setHasLoadedPageData(true);

        nextOffset += page.rows.length;
        done = page.done;
        guard += 1;

        if (page.rows.length === 0) {
          break;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoadingAllRows(false);
    }
  };

  useEffect(() => {
    if (!token || !activeSheet) return;
    void loadPage(false);
    // Only refresh when sheet/token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeSheet?.name]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const clickedInsideFilters =
        filtersMenuContainerRef.current?.contains(target) ?? false;
      const clickedInsideStats =
        statsMenuContainerRef.current?.contains(target) ?? false;

      if (!clickedInsideFilters) {
        setShowFiltersMenu(false);
      }
      if (!clickedInsideStats) {
        setShowStatsMenu(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  const stopTablePan = () => {
    const container = tableScrollRef.current;
    const activePointerId = tablePanStateRef.current.pointerId;
    if (
      container &&
      activePointerId !== -1 &&
      container.hasPointerCapture(activePointerId)
    ) {
      container.releasePointerCapture(activePointerId);
    }
    tablePanStateRef.current.pointerId = -1;
    setIsPanningTable(false);
  };

  const onTablePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        "button, input, select, textarea, a, summary, [role='button']",
      )
    ) {
      return;
    }

    const container = tableScrollRef.current;
    if (!container) return;

    tablePanStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: container.scrollLeft,
      startScrollTop: container.scrollTop,
    };

    container.setPointerCapture(event.pointerId);
    setIsPanningTable(true);
    event.preventDefault();
  };

  const onTablePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = tableScrollRef.current;
    const panState = tablePanStateRef.current;
    if (!container || panState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - panState.startX;
    const deltaY = event.clientY - panState.startY;
    container.scrollLeft = panState.startScrollLeft - deltaX;
    container.scrollTop = panState.startScrollTop - deltaY;
  };

  useEffect(() => {
    return () => {
      stopTablePan();
    };
  }, []);

  const tableModel = useMemo(() => {
    if (!activeSheet) {
      return {
        headers: [] as string[],
        rows: [] as (string | number | boolean | null)[][],
        totalColumns: 0,
        sampleSize: 0,
        nullRates: [] as number[],
        inferredTypes: [] as string[],
        duplicateRows: 0,
        emptyRows: 0,
      };
    }

    const sourceRows = hasLoadedPageData ? pagedRows : activeSheet.sample;
    const sourceHeader =
      pagedHeader && pagedHeader.length > 0 ? pagedHeader : activeSheet.headers;

    const totalColumns = Math.max(
      sourceHeader.length,
      ...sourceRows.map((r) => r.length),
      0,
    );

    const headers = Array.from({ length: totalColumns }, (_, i) => {
      const raw = sourceHeader[i];
      if (raw === null || raw === undefined || raw === "") {
        return `Column ${i + 1}`;
      }
      return String(raw);
    });

    const normalizedRows = sourceRows.map((row) =>
      Array.from({ length: totalColumns }, (_, colIdx) => row[colIdx] ?? null),
    );

    const query = globalQuery.trim().toLowerCase();
    const colQuery = columnFilterQuery.trim().toLowerCase();

    let filteredRows = normalizedRows.filter((row) => {
      const globalMatch =
        query.length === 0 ||
        row.some((cell) => formatCell(cell).toLowerCase().includes(query));

      const columnMatch =
        colQuery.length === 0 ||
        formatCell(row[columnFilterIndex]).toLowerCase().includes(colQuery);

      return globalMatch && columnMatch;
    });

    if (sortColumnIndex !== null) {
      filteredRows = [...filteredRows].sort((a, b) => {
        const left = a[sortColumnIndex];
        const right = b[sortColumnIndex];

        const leftEmpty = left === null || left === undefined || left === "";
        const rightEmpty =
          right === null || right === undefined || right === "";

        if (leftEmpty && rightEmpty) return 0;
        if (leftEmpty) return 1;
        if (rightEmpty) return -1;

        let result = 0;
        if (typeof left === "number" && typeof right === "number") {
          result = left - right;
        } else {
          result = String(left).localeCompare(String(right), undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }

        return sortDirection === "asc" ? result : -result;
      });
    }

    const sampleSize = normalizedRows.length;

    const nullRates = Array.from({ length: totalColumns }, (_, colIdx) => {
      if (sampleSize === 0) return 0;
      let emptyCount = 0;
      for (const row of normalizedRows) {
        const cell = row[colIdx];
        if (cell === null || cell === undefined || cell === "") emptyCount += 1;
      }
      return (emptyCount / sampleSize) * 100;
    });

    const inferredTypes = Array.from({ length: totalColumns }, (_, colIdx) => {
      const found = new Set<string>();
      for (const row of normalizedRows) {
        const cell = row[colIdx];
        if (cell === null || cell === undefined || cell === "") continue;
        if (typeof cell === "number") {
          found.add("number");
        } else if (typeof cell === "boolean") {
          found.add("boolean");
        } else if (
          typeof cell === "string" &&
          /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.test(cell.trim())
        ) {
          found.add("date");
        } else {
          found.add("text");
        }
      }

      if (found.size === 0) return "empty";
      if (found.size === 1) return Array.from(found)[0];
      return "mixed";
    });

    let duplicateRows = 0;
    const seen = new Set<string>();
    for (const row of normalizedRows) {
      const key = JSON.stringify(row);
      if (seen.has(key)) duplicateRows += 1;
      else seen.add(key);
    }

    let emptyRows = 0;
    for (const row of normalizedRows) {
      const allEmpty = row.every(
        (cell) => cell === null || cell === undefined || cell === "",
      );
      if (allEmpty) emptyRows += 1;
    }

    return {
      headers,
      rows: filteredRows,
      totalColumns,
      sampleSize,
      nullRates,
      inferredTypes,
      duplicateRows,
      emptyRows,
    };
  }, [
    activeSheet,
    columnFilterIndex,
    columnFilterQuery,
    globalQuery,
    hasLoadedPageData,
    pagedHeader,
    pagedRows,
    sortColumnIndex,
    sortDirection,
  ]);

  const loadedRowsCount = hasLoadedPageData
    ? pagedRows.length
    : (activeSheet?.sample.length ?? 0);
  const totalDataRows =
    pagedTotalRows === null ? null : Math.max(0, pagedTotalRows - 1);

  const toggleSort = (index: number) => {
    if (sortColumnIndex !== index) {
      setSortColumnIndex(index);
      setSortDirection("desc");
      return;
    }

    if (sortDirection === "desc") {
      setSortDirection("asc");
      return;
    }

    setSortColumnIndex(null);
    setSortDirection("desc");
  };

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".xls,.xlsx,.xlsm,.xlsb,.xltx,.xltm,.xlam,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.binary.macroEnabled.12,application/vnd.ms-excel.sheet.macroEnabled.12"
        message="Drop or select an Excel file (.xlsx, .xls, .xlsb, etc.) to inspect"
        onFiles={(files) => {
          const file = files[0];
          if (file) onFile(file);
        }}
      />

      {loading && (
        <div className="text-sm" style={{ color: "var(--muted-2)" }}>
          Uploading and parsing workbook...
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      {preview && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Workbook Preview</h3>
            <p className="text-sm" style={{ color: "var(--muted-2)" }}>
              {fileName || "Uploaded workbook"} • {preview.sheet_count} sheet
              {preview.sheet_count === 1 ? "" : "s"}
            </p>
          </div>

          <div
            className="rounded-lg border p-4"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
            }}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-medium">Sheets</h4>
              <div className="text-xs" style={{ color: "var(--muted-2)" }}>
                Select a tab to preview one sheet at a time
              </div>
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {preview.sheets.map((sheet, index) => {
                  const isActive = index === activeSheetIndex;
                  return (
                    <button
                      key={`${sheet.name}-${index}`}
                      type="button"
                      onClick={() => setActiveSheetIndex(index)}
                      className="cursor-pointer rounded-full border px-3 py-1 text-sm transition"
                      style={{
                        borderColor: "var(--tag-border)",
                        backgroundColor: isActive
                          ? "var(--tag-selected-bg)"
                          : "var(--tag-bg)",
                        color: isActive
                          ? "var(--tag-selected-text)"
                          : "var(--tag-text)",
                      }}
                    >
                      {sheet.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeSheet ? (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-medium">{activeSheet.name}</h4>
                  <div className="flex items-center gap-2">
                    <div
                      className="text-xs"
                      style={{ color: "var(--muted-2)" }}
                    >
                      {activeSheet.total_rows} total rows •{" "}
                      {activeSheet.headers.length} columns
                    </div>

                    <div className="relative" ref={filtersMenuContainerRef}>
                      <button
                        type="button"
                        aria-label="Toggle filters menu"
                        onClick={() => {
                          setShowFiltersMenu((prev) => !prev);
                          setShowStatsMenu(false);
                        }}
                        className="cursor-pointer rounded-md border px-2 py-1 text-sm"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: "var(--tag-bg)",
                          color: "var(--tag-text)",
                        }}
                        title="Filters"
                      >
                        <Funnel size={16} aria-hidden="true" />
                      </button>

                      {showFiltersMenu && (
                        <div
                          className="absolute right-0 z-20 mt-2 w-72 rounded-lg border p-3"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--surface-2)",
                          }}
                        >
                          <div className="mb-2 text-sm font-medium">
                            Filters
                          </div>

                          <label
                            className="mb-2 block text-sm"
                            style={{ color: "var(--muted)" }}
                          >
                            Search in preview
                            <input
                              type="text"
                              value={globalQuery}
                              onChange={(e) => setGlobalQuery(e.target.value)}
                              placeholder="Find any value"
                              className="mt-1 w-full rounded border px-3 py-2 text-sm"
                              style={{
                                borderColor: "var(--border)",
                                backgroundColor: "var(--surface)",
                                color: "var(--foreground)",
                              }}
                            />
                          </label>

                          <label
                            className="mb-2 block text-sm"
                            style={{ color: "var(--muted)" }}
                          >
                            Filter column
                            <select
                              value={columnFilterIndex}
                              onChange={(e) =>
                                setColumnFilterIndex(Number(e.target.value))
                              }
                              className="mt-1 w-full rounded border px-3 py-2 text-sm"
                              style={{
                                borderColor: "var(--border)",
                                backgroundColor: "var(--surface)",
                                color: "var(--foreground)",
                              }}
                            >
                              {tableModel.headers.map((header, idx) => (
                                <option key={idx} value={idx}>
                                  {header}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label
                            className="block text-sm"
                            style={{ color: "var(--muted)" }}
                          >
                            Filter value
                            <input
                              type="text"
                              value={columnFilterQuery}
                              onChange={(e) =>
                                setColumnFilterQuery(e.target.value)
                              }
                              placeholder="Contains..."
                              className="mt-1 w-full rounded border px-3 py-2 text-sm"
                              style={{
                                borderColor: "var(--border)",
                                backgroundColor: "var(--surface)",
                                color: "var(--foreground)",
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="relative" ref={statsMenuContainerRef}>
                      <button
                        type="button"
                        aria-label="Toggle statistics menu"
                        onClick={() => {
                          setShowStatsMenu((prev) => !prev);
                          setShowFiltersMenu(false);
                        }}
                        className="cursor-pointer rounded-md border px-2 py-1 text-sm"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: "var(--tag-bg)",
                          color: "var(--tag-text)",
                        }}
                        title="Statistics"
                      >
                        <BarChart3 size={16} aria-hidden="true" />
                      </button>

                      {showStatsMenu && (
                        <div
                          className="absolute right-0 z-20 mt-2 w-[42rem] max-w-[calc(100vw-2rem)] rounded-lg border p-3"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--surface-2)",
                          }}
                        >
                          <div className="mb-3 text-sm font-medium">
                            Preview Insights
                          </div>

                          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div
                              className="rounded-md border p-2"
                              style={{
                                borderColor: "var(--border)",
                                backgroundColor: "var(--surface)",
                              }}
                            >
                              <div
                                className="mb-2 text-xs font-medium"
                                style={{ color: "var(--muted)" }}
                              >
                                Overview
                              </div>
                              <div
                                className="grid grid-cols-2 gap-2 text-xs"
                                style={{ color: "var(--muted-2)" }}
                              >
                                <div
                                  className="rounded border px-2 py-1"
                                  style={{
                                    borderColor: "var(--border)",
                                    backgroundColor: "var(--surface-2)",
                                  }}
                                >
                                  <div>Sample Rows</div>
                                  <div
                                    className="text-sm font-medium"
                                    style={{ color: "var(--foreground)" }}
                                  >
                                    {tableModel.sampleSize}
                                  </div>
                                </div>
                                <div
                                  className="rounded border px-2 py-1"
                                  style={{
                                    borderColor: "var(--border)",
                                    backgroundColor: "var(--surface-2)",
                                  }}
                                >
                                  <div>Filtered Rows</div>
                                  <div
                                    className="text-sm font-medium"
                                    style={{ color: "var(--foreground)" }}
                                  >
                                    {tableModel.rows.length}
                                  </div>
                                </div>
                                <div
                                  className="rounded border px-2 py-1"
                                  style={{
                                    borderColor: "var(--border)",
                                    backgroundColor: "var(--surface-2)",
                                  }}
                                >
                                  <div>Columns</div>
                                  <div
                                    className="text-sm font-medium"
                                    style={{ color: "var(--foreground)" }}
                                  >
                                    {tableModel.totalColumns}
                                  </div>
                                </div>
                                <div
                                  className="rounded border px-2 py-1"
                                  style={{
                                    borderColor: "var(--border)",
                                    backgroundColor: "var(--surface-2)",
                                  }}
                                >
                                  <div>Sorted By</div>
                                  <div
                                    className="text-sm font-medium"
                                    style={{ color: "var(--foreground)" }}
                                  >
                                    {sortColumnIndex === null
                                      ? "None"
                                      : `${tableModel.headers[sortColumnIndex]} (${sortDirection})`}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div
                              className="rounded-md border p-2"
                              style={{
                                borderColor: "var(--border)",
                                backgroundColor: "var(--surface)",
                              }}
                            >
                              <div
                                className="mb-2 text-xs font-medium"
                                style={{ color: "var(--muted)" }}
                              >
                                Quality Checks
                              </div>
                              <div
                                className="space-y-1 text-xs"
                                style={{ color: "var(--muted-2)" }}
                              >
                                <div className="flex items-center justify-between">
                                  <span>Duplicate rows</span>
                                  <span style={{ color: "var(--foreground)" }}>
                                    {tableModel.duplicateRows}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Completely empty rows</span>
                                  <span style={{ color: "var(--foreground)" }}>
                                    {tableModel.emptyRows}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>High-null columns (&gt;50%)</span>
                                  <span style={{ color: "var(--foreground)" }}>
                                    {
                                      tableModel.nullRates.filter((r) => r > 50)
                                        .length
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {tableModel.totalColumns > 0 && (
                            <div
                              className="rounded-md border p-2"
                              style={{
                                borderColor: "var(--border)",
                                backgroundColor: "var(--surface)",
                              }}
                            >
                              <div
                                className="mb-2 text-xs font-medium"
                                style={{ color: "var(--muted)" }}
                              >
                                Column Breakdown
                              </div>
                              <div
                                className="grid grid-cols-1 gap-1 text-xs md:grid-cols-2"
                                style={{ color: "var(--muted-2)" }}
                              >
                                {tableModel.headers.map((header, idx) => (
                                  <div
                                    key={`insight-${idx}`}
                                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded border px-2 py-1"
                                    style={{
                                      borderColor: "var(--border)",
                                      backgroundColor: "var(--surface-2)",
                                    }}
                                  >
                                    <span
                                      className="truncate"
                                      title={header}
                                      style={{ color: "var(--foreground)" }}
                                    >
                                      {header}
                                    </span>
                                    <span
                                      className="rounded-full border px-2 py-0.5"
                                      style={{
                                        borderColor: "var(--tag-border)",
                                        backgroundColor: "var(--tag-bg)",
                                        color: "var(--tag-text)",
                                      }}
                                    >
                                      {tableModel.inferredTypes[idx]}
                                    </span>
                                    <span>
                                      {tableModel.nullRates[idx].toFixed(0)}%
                                      null
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  ref={tableScrollRef}
                  onPointerDown={onTablePointerDown}
                  onPointerMove={onTablePointerMove}
                  onPointerUp={stopTablePan}
                  onPointerCancel={stopTablePan}
                  onPointerLeave={stopTablePan}
                  className={`overflow-auto rounded-lg border ${
                    isPanningTable ? "cursor-grabbing select-none" : "cursor-grab"
                  }`}
                  style={{ borderColor: "var(--border)", touchAction: "none" }}
                >
                  <table className="min-w-max w-full table-auto text-left text-sm">
                    <thead style={{ backgroundColor: "var(--surface-2)" }}>
                      <tr>
                        {tableModel.totalColumns > 0 ? (
                          tableModel.headers.map((header, headerIndex) => (
                            <th
                              key={headerIndex}
                              className="h-11 border-r px-3 py-3 align-middle font-medium whitespace-nowrap last:border-r-0"
                              style={{ color: "var(--muted)", borderColor: "var(--border)" }}
                            >
                              <button
                                type="button"
                                onClick={() => toggleSort(headerIndex)}
                                className="cursor-pointer w-full text-left"
                                style={{ color: "inherit" }}
                              >
                                {header}
                                {sortColumnIndex === headerIndex &&
                                  (sortDirection === "asc" ? " ↑" : " ↓")}
                              </button>
                            </th>
                          ))
                        ) : (
                          <th
                            className="px-3 py-2 font-medium"
                            style={{ color: "var(--muted)" }}
                          >
                            No header row detected
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {tableModel.rows.length > 0 ? (
                        tableModel.rows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="border-t"
                            style={{ borderColor: "var(--border)" }}
                          >
                            {Array.from(
                              { length: tableModel.totalColumns },
                              (_, colIndex) => colIndex,
                            ).map((colIndex) => (
                              <td
                                key={colIndex}
                                className="h-11 border-r px-3 py-3 align-middle last:border-r-0"
                                style={{ borderColor: "var(--border)" }}
                              >
                                {renderCell(row[colIndex])}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            className="px-3 py-3 text-sm"
                            style={{ color: "var(--muted-2)" }}
                          >
                            No rows match your current search/filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void loadPage(true)}
                    disabled={
                      pagingLoading ||
                      loadingAllRows ||
                      pagedDone ||
                      !hasLoadedPageData
                    }
                    className="cursor-pointer rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: "var(--tag-border)",
                      backgroundColor: "var(--tag-bg)",
                      color: "var(--tag-text)",
                    }}
                  >
                    {pagingLoading
                      ? "Loading..."
                      : pagedDone
                        ? "All rows loaded"
                        : `Load ${PAGE_SIZE} more`}
                  </button>

                  <button
                    type="button"
                    onClick={() => void loadAllRows()}
                    disabled={
                      pagingLoading ||
                      loadingAllRows ||
                      pagedDone ||
                      !hasLoadedPageData
                    }
                    className="cursor-pointer rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: "var(--tag-border)",
                      backgroundColor: "var(--tag-bg)",
                      color: "var(--tag-text)",
                    }}
                  >
                    {loadingAllRows ? "Loading all..." : "Load all rows"}
                  </button>

                  <span className="text-xs" style={{ color: "var(--muted-2)" }}>
                    Showing {loadedRowsCount}
                    {totalDataRows !== null ? ` of ${totalDataRows}` : ""} rows
                    in this sheet.
                  </span>
                </div>

                <p className="mt-2 text-xs" style={{ color: "var(--muted-2)" }}>
                  Search, filter, and sort apply to the currently loaded rows
                  for this sheet.
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                No sheets available in this workbook preview.
              </p>
            )}
          </div>
        </div>
      )}

      <BackToTopButton />
    </div>
  );
}
