"use client";

import { useTranslations } from "next-intl";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  BarChart3,
  CaseSensitive,
  Eye,
  EyeOff,
  Hash,
  Highlighter,
  ListFilter,
  Maximize2,
  Minimize2,
  PanelTopClose,
  PanelTopOpen,
  Rows2,
  SearchX,
  Table2,
  Rows3,
  RotateCcw,
} from "lucide-react";
import {
  fetchSheetPage,
  uploadForPreview,
  type Cell,
  type Row,
  type WorkbookPreview,
} from "@/lib/tools/inspect";
import BackToTopButton from "@/components/common/BackToTopButton";
import FileUploadDropzone from "@/components/common/FileUploadDropzone";

type SortDirection = "asc" | "desc";
type TableRow = {
  sourceIndex: number;
  cells: (string | number | boolean | null)[];
};

const PAGE_SIZE = 25;
const DEFAULT_COLUMN_WIDTH = 180;
const MIN_COLUMN_WIDTH = 72;
const MAX_COLUMN_WIDTH = 640;
const DEFAULT_ROW_HEIGHT = 44;
const COMPACT_ROW_HEIGHT = 30;
const MIN_ROW_HEIGHT = 28;
const MAX_ROW_HEIGHT = 240;

type ResizeState =
  | {
      kind: "column";
      index: number;
      pointerId: number;
      startPointer: number;
      startSize: number;
    }
  | {
      kind: "row";
      index: number;
      pointerId: number;
      startPointer: number;
      startSize: number;
    }
  | null;

export default function InspectSheets() {
  const t = useTranslations("common");
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalQuery, setGlobalQuery] = useState("");
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showStatsMenu, setShowStatsMenu] = useState(false);
  const [pagedRows, setPagedRows] = useState<Row[]>([]);
  const [pagedHeader, setPagedHeader] = useState<Cell[] | null>(null);
  const [pagedDone, setPagedDone] = useState(false);
  const [pagedTotalRows, setPagedTotalRows] = useState<number | null>(null);
  const [pagingLoading, setPagingLoading] = useState(false);
  const [loadingAllRows, setLoadingAllRows] = useState(false);
  const [hasLoadedPageData, setHasLoadedPageData] = useState(false);
  const [isPanningTable, setIsPanningTable] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [columnWidthMode, setColumnWidthMode] = useState<"fixed" | "expanded">(
    "fixed",
  );
  const [rowDensity, setRowDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [baseRowHeight, setBaseRowHeight] = useState(DEFAULT_ROW_HEIGHT);
  const [stickyHeader, setStickyHeader] = useState(false);
  const [showRowNumbers, setShowRowNumbers] = useState(true);
  const [caseSensitiveSearch, setCaseSensitiveSearch] = useState(false);
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  const [highlightEmptyCells, setHighlightEmptyCells] = useState(false);
  const [zebraRows, setZebraRows] = useState(false);
  const [fullWidthPreview, setFullWidthPreview] = useState(false);
  const [decimalPlaces, setDecimalPlaces] = useState<number | null>(null);
  const [showDecimalMenu, setShowDecimalMenu] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const statsMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const decimalMenuRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const tableElementRef = useRef<HTMLTableElement | null>(null);
  const resizeStateRef = useRef<ResizeState>(null);
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
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

  const isEmptyCell = (value: unknown) =>
    value === null || value === undefined || value === "";

  const displayCell = (value: unknown) => {
    if (decimalPlaces !== null && typeof value === "number") {
      return value.toFixed(decimalPlaces);
    }
    return formatCell(value);
  };

  const renderCell = (value: unknown) => {
    const formatted = displayCell(value);
    return formatted === "" ? "\u00A0" : formatted;
  };

  const activeSheet = preview?.sheets[activeSheetIndex] ?? null;
  const token = preview?.token ?? null;

  useEffect(() => {
    setGlobalQuery("");
    setSortColumnIndex(null);
    setSortDirection("desc");
    setShowStatsMenu(false);
    setShowDecimalMenu(false);
    setPagedRows([]);
    setPagedHeader(null);
    setPagedDone(false);
    setPagedTotalRows(null);
    setPagingLoading(false);
    setLoadingAllRows(false);
    setHasLoadedPageData(false);
    resizeStateRef.current = null;
    setIsResizing(false);
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

      const clickedInsideStats =
        statsMenuContainerRef.current?.contains(target) ?? false;

      if (!clickedInsideStats) {
        setShowStatsMenu(false);
      }

      const clickedInsideDecimal =
        decimalMenuRef.current?.contains(target) ?? false;
      if (!clickedInsideDecimal) {
        setShowDecimalMenu(false);
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
    if (isResizing) return;
    if (event.pointerType !== "mouse") return;
    if (event.button !== 0 || !event.altKey) return;

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
    if (isResizing) return;
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

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const getExcelColumnLabel = (index: number) => {
    let value = index + 1;
    let label = "";

    while (value > 0) {
      const remainder = (value - 1) % 26;
      label = String.fromCharCode(65 + remainder) + label;
      value = Math.floor((value - 1) / 26);
    }

    return label;
  };

  const getColumnWidth = (index: number) =>
    columnWidths[index] ?? DEFAULT_COLUMN_WIDTH;

  const getRowHeight = (index: number) => rowHeights[index] ?? baseRowHeight;

  const getMeasureContext = () => {
    if (!measureCanvasRef.current) {
      measureCanvasRef.current = document.createElement("canvas");
    }
    return measureCanvasRef.current.getContext("2d");
  };

  const autofitColumnWidth = (index: number, headerLabel: string) => {
    const context = getMeasureContext();
    if (!context) return;

    // Match table text styles closely enough for practical Excel-like auto-fit.
    context.font = "500 14px system-ui";

    let widest = context.measureText(headerLabel).width;
    const sampleRows = tableModel.rows.slice(0, 300);
    for (const row of sampleRows) {
      const width = context.measureText(displayCell(row.cells[index])).width;
      if (width > widest) widest = width;
    }

    const paddedWidth = widest + 28;
    const nextWidth = clamp(
      Math.ceil(paddedWidth),
      MIN_COLUMN_WIDTH,
      MAX_COLUMN_WIDTH,
    );

    setColumnWidths((prev) => ({ ...prev, [index]: nextWidth }));
  };

  const autofitAllColumns = () => {
    if (tableModel.totalColumns === 0) return;

    const context = getMeasureContext();
    if (!context) return;
    context.font = "500 14px system-ui";

    const nextWidths: Record<number, number> = {};
    for (let colIndex = 0; colIndex < tableModel.totalColumns; colIndex += 1) {
      const header = tableModel.headers[colIndex] ?? `Column ${colIndex + 1}`;
      let widest = context.measureText(header).width;
      const sampleRows = tableModel.rows.slice(0, 300);
      for (const row of sampleRows) {
        const width = context.measureText(
          displayCell(row.cells[colIndex]),
        ).width;
        if (width > widest) widest = width;
      }

      nextWidths[colIndex] = clamp(
        Math.ceil(widest + 28),
        MIN_COLUMN_WIDTH,
        MAX_COLUMN_WIDTH,
      );
    }
    setColumnWidths(nextWidths);
  };

  const resetColumnWidths = () => {
    const nextWidths: Record<number, number> = {};
    for (let colIndex = 0; colIndex < tableModel.totalColumns; colIndex += 1) {
      nextWidths[colIndex] = DEFAULT_COLUMN_WIDTH;
    }
    setColumnWidths(nextWidths);
  };

  const toggleColumnWidthMode = () => {
    if (columnWidthMode === "fixed") {
      autofitAllColumns();
      setColumnWidthMode("expanded");
      return;
    }

    resetColumnWidths();
    setColumnWidthMode("fixed");
  };

  const toggleRowDensity = () => {
    if (rowDensity === "comfortable") {
      setRowDensity("compact");
      setBaseRowHeight(COMPACT_ROW_HEIGHT);
      return;
    }
    setRowDensity("comfortable");
    setBaseRowHeight(DEFAULT_ROW_HEIGHT);
  };

  const rowNumberPaddingClass = rowDensity === "comfortable" ? "py-2" : "py-1";
  const cellPaddingClass = rowDensity === "comfortable" ? "py-3" : "py-1.5";

  const hasSizedColumns = Object.keys(columnWidths).length > 0;
  const hasSizedRows = Object.keys(rowHeights).length > 0;
  const hasActiveSort = sortColumnIndex !== null;
  const isViewDirty =
    globalQuery.trim().length > 0 ||
    hasActiveSort ||
    hasSizedColumns ||
    hasSizedRows ||
    columnWidthMode !== "fixed" ||
    rowDensity !== "comfortable" ||
    baseRowHeight !== DEFAULT_ROW_HEIGHT ||
    stickyHeader ||
    !showRowNumbers ||
    caseSensitiveSearch ||
    hideEmptyRows ||
    highlightEmptyCells ||
    zebraRows ||
    fullWidthPreview ||
    decimalPlaces !== null;

  const resetView = () => {
    setGlobalQuery("");
    setSortColumnIndex(null);
    setSortDirection("desc");
    setColumnWidths({});
    setRowHeights({});
    setColumnWidthMode("fixed");
    setRowDensity("comfortable");
    setBaseRowHeight(DEFAULT_ROW_HEIGHT);
    setStickyHeader(false);
    setShowRowNumbers(true);
    setCaseSensitiveSearch(false);
    setHideEmptyRows(false);
    setHighlightEmptyCells(false);
    setZebraRows(false);
    setFullWidthPreview(false);
    setDecimalPlaces(null);
    tableScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  const clearQuickSearch = () => {
    setGlobalQuery("");
  };

  const clearSorting = () => {
    setSortColumnIndex(null);
    setSortDirection("desc");
  };

  const startColumnResize = (
    index: number,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;

    stopTablePan();
    resizeStateRef.current = {
      kind: "column",
      index,
      pointerId: event.pointerId,
      startPointer: event.clientX,
      startSize: getColumnWidth(index),
    };
    setIsResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const startRowResize = (
    index: number,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;

    stopTablePan();
    resizeStateRef.current = {
      kind: "row",
      index,
      pointerId: event.pointerId,
      startPointer: event.clientY,
      startSize: getRowHeight(index),
    };
    setIsResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    if (!isResizing) return;

    const onPointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId) return;

      if (resizeState.kind === "column") {
        const delta = event.clientX - resizeState.startPointer;
        const next = clamp(
          Math.round(resizeState.startSize + delta),
          MIN_COLUMN_WIDTH,
          MAX_COLUMN_WIDTH,
        );
        setColumnWidths((prev) => ({ ...prev, [resizeState.index]: next }));
      } else {
        const delta = event.clientY - resizeState.startPointer;
        const next = clamp(
          Math.round(resizeState.startSize + delta),
          MIN_ROW_HEIGHT,
          MAX_ROW_HEIGHT,
        );
        setRowHeights((prev) => ({ ...prev, [resizeState.index]: next }));
      }
    };

    const endResize = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId) return;
      resizeStateRef.current = null;
      setIsResizing(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endResize);
    window.addEventListener("pointercancel", endResize);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endResize);
      window.removeEventListener("pointercancel", endResize);
    };
  }, [isResizing]);

  const tableModel = useMemo(() => {
    if (!activeSheet) {
      return {
        headers: [] as string[],
        rows: [] as TableRow[],
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

    const headers = Array.from({ length: totalColumns }, (_, i) =>
      getExcelColumnLabel(i),
    );

    const rowsForGrid =
      sourceHeader.length > 0 ? [sourceHeader, ...sourceRows] : sourceRows;

    const indexedRows: TableRow[] = rowsForGrid.map((row, sourceIndex) => ({
      sourceIndex,
      cells: Array.from(
        { length: totalColumns },
        (_, colIdx) => row[colIdx] ?? null,
      ),
    }));

    const query = caseSensitiveSearch
      ? globalQuery.trim()
      : globalQuery.trim().toLowerCase();

    let filteredRows = indexedRows.filter((row) => {
      const globalMatch =
        query.length === 0 ||
        row.cells.some((cell) => {
          const cellText = formatCell(cell);
          const comparable = caseSensitiveSearch
            ? cellText
            : cellText.toLowerCase();
          return comparable.includes(query);
        });

      return globalMatch;
    });

    if (hideEmptyRows) {
      filteredRows = filteredRows.filter(
        (row) => !row.cells.every((cell) => isEmptyCell(cell)),
      );
    }

    if (sortColumnIndex !== null) {
      filteredRows = [...filteredRows].sort((a, b) => {
        const left = a.cells[sortColumnIndex];
        const right = b.cells[sortColumnIndex];

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

    const sampleSize = indexedRows.length;

    const nullRates = Array.from({ length: totalColumns }, (_, colIdx) => {
      if (sampleSize === 0) return 0;
      let emptyCount = 0;
      for (const row of indexedRows) {
        const cell = row.cells[colIdx];
        if (cell === null || cell === undefined || cell === "") emptyCount += 1;
      }
      return (emptyCount / sampleSize) * 100;
    });

    const inferredTypes = Array.from({ length: totalColumns }, (_, colIdx) => {
      const found = new Set<string>();
      for (const row of indexedRows) {
        const cell = row.cells[colIdx];
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
    for (const row of indexedRows) {
      const key = JSON.stringify(row.cells);
      if (seen.has(key)) duplicateRows += 1;
      else seen.add(key);
    }

    let emptyRows = 0;
    for (const row of indexedRows) {
      const allEmpty = row.cells.every(
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
    caseSensitiveSearch,
    globalQuery,
    hasLoadedPageData,
    hideEmptyRows,
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
        message={t("dropExcelInspect")}
        hasError={!!error}
        onFiles={(files) => {
          const file = files[0];
          if (file) onFile(file);
        }}
      />

      {loading && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-2)" }}>
          <span className="tool-spinner" />
          {t("uploadingParsing")}
        </div>
      )}

      {error && <div className="tool-error">{error}</div>}

      {preview && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">{t("workbookPreview")}</h3>
            <p className="text-sm" style={{ color: "var(--muted-2)" }}>
              {fileName || t("uploadedWorkbook")} • {preview.sheet_count} sheet
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
              <h4 className="font-medium">{t("sheets")}</h4>
              <div className="text-xs" style={{ color: "var(--muted-2)" }}>
                {t("selectTabToPreview")}
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

                    <div className="relative" ref={statsMenuContainerRef}>
                      <button
                        type="button"
                        aria-label="Toggle statistics menu"
                        onClick={() => {
                          setShowStatsMenu((prev) => !prev);
                        }}
                        className="cursor-pointer rounded-md border px-2 py-1 text-sm"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: "var(--tag-bg)",
                          color: "var(--tag-text)",
                        }}
                        title={t("statistics")}
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
                            {t("previewInsights")}
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
                                  <div>{t("sampleRows")}</div>
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
                                  <div>{t("filteredRows")}</div>
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
                                  <div>{t("columns")}</div>
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
                                  <div>{t("sortedBy")}</div>
                                  <div
                                    className="text-sm font-medium"
                                    style={{ color: "var(--foreground)" }}
                                  >
                                    {sortColumnIndex === null
                                      ? t("none")
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
                                {t("qualityChecks")}
                              </div>
                              <div
                                className="space-y-1 text-xs"
                                style={{ color: "var(--muted-2)" }}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{t("duplicateRows")}</span>
                                  <span style={{ color: "var(--foreground)" }}>
                                    {tableModel.duplicateRows}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>{t("completelyEmptyRows")}</span>
                                  <span style={{ color: "var(--foreground)" }}>
                                    {tableModel.emptyRows}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>{t("highNullColumns")}</span>
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
                                {t("columnBreakdown")}
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
                  className="mb-2 rounded-md border px-3 py-2"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface-2)",
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={globalQuery}
                      onChange={(e) => setGlobalQuery(e.target.value)}
                      placeholder={t("quickSearch")}
                      className="w-full min-w-[14rem] flex-1 rounded-md border px-3 py-2 text-sm md:w-auto md:flex-none"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--surface)",
                        color: "var(--foreground)",
                      }}
                    />

                    <div className="group relative">
                      <button
                        type="button"
                        onClick={clearQuickSearch}
                        aria-label="Clear quick search"
                        className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: "var(--tag-bg)",
                          color: "var(--tag-text)",
                        }}
                      >
                        <SearchX size={16} aria-hidden="true" />
                      </button>
                      <span
                        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Clear Search
                      </span>
                    </div>

                    <div className="group relative">
                      <button
                        type="button"
                        onClick={clearSorting}
                        aria-label="Clear sorting"
                        className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor:
                            sortColumnIndex !== null
                              ? "var(--tag-selected-bg)"
                              : "var(--tag-bg)",
                          color:
                            sortColumnIndex !== null
                              ? "var(--tag-selected-text)"
                              : "var(--tag-text)",
                        }}
                      >
                        <ArrowDownUp size={16} aria-hidden="true" />
                      </button>
                      <span
                        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Clear Sort
                      </span>
                    </div>

                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => setCaseSensitiveSearch((prev) => !prev)}
                        aria-label="Toggle case sensitive search"
                        className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: caseSensitiveSearch
                            ? "var(--tag-selected-bg)"
                            : "var(--tag-bg)",
                          color: caseSensitiveSearch
                            ? "var(--tag-selected-text)"
                            : "var(--tag-text)",
                        }}
                      >
                        <CaseSensitive size={16} aria-hidden="true" />
                      </button>
                      <span
                        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Case Sensitive
                      </span>
                    </div>

                    <div
                      aria-hidden="true"
                      className="mx-1 h-6 w-px"
                      style={{ backgroundColor: "var(--border)" }}
                    />

                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => setHideEmptyRows((prev) => !prev)}
                        aria-label="Toggle hide empty rows"
                        className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: hideEmptyRows
                            ? "var(--tag-selected-bg)"
                            : "var(--tag-bg)",
                          color: hideEmptyRows
                            ? "var(--tag-selected-text)"
                            : "var(--tag-text)",
                        }}
                      >
                        <ListFilter size={16} aria-hidden="true" />
                      </button>
                      <span
                        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Hide Empty Rows
                      </span>
                    </div>

                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => setHighlightEmptyCells((prev) => !prev)}
                        aria-label="Toggle highlight empty cells"
                        className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: highlightEmptyCells
                            ? "var(--tag-selected-bg)"
                            : "var(--tag-bg)",
                          color: highlightEmptyCells
                            ? "var(--tag-selected-text)"
                            : "var(--tag-text)",
                        }}
                      >
                        <Highlighter size={16} aria-hidden="true" />
                      </button>
                      <span
                        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Highlight Empty Cells
                      </span>
                    </div>

                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => setZebraRows((prev) => !prev)}
                        aria-label="Toggle zebra rows"
                        className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: zebraRows
                            ? "var(--tag-selected-bg)"
                            : "var(--tag-bg)",
                          color: zebraRows
                            ? "var(--tag-selected-text)"
                            : "var(--tag-text)",
                        }}
                      >
                        <Table2 size={16} aria-hidden="true" />
                      </button>
                      <span
                        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Zebra Rows
                      </span>
                    </div>

                    <div className="group relative">
                      <button
                        type="button"
                        onClick={toggleColumnWidthMode}
                        aria-label={
                          columnWidthMode === "fixed"
                            ? t("fitAllColumnsToContent")
                            : t("setFixedColumnWidths")
                        }
                        className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: "var(--tag-bg)",
                          color: "var(--tag-text)",
                        }}
                      >
                        {columnWidthMode === "fixed" ? (
                          <Maximize2 size={16} aria-hidden="true" />
                        ) : (
                          <Minimize2 size={16} aria-hidden="true" />
                        )}
                      </button>
                      <span
                        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {columnWidthMode === "fixed"
                          ? t("fitWidth")
                          : t("fixedWidth")}
                      </span>
                    </div>

                    <div className="group relative">
                      <button
                        type="button"
                        onClick={toggleRowDensity}
                        aria-label="Toggle compact row density"
                        className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor:
                            rowDensity === "compact"
                              ? "var(--tag-selected-bg)"
                              : "var(--tag-bg)",
                          color:
                            rowDensity === "compact"
                              ? "var(--tag-selected-text)"
                              : "var(--tag-text)",
                        }}
                      >
                        {rowDensity === "comfortable" ? (
                          <Rows2 size={16} aria-hidden="true" />
                        ) : (
                          <Rows3 size={16} aria-hidden="true" />
                        )}
                      </button>
                      <span
                        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rowDensity === "comfortable"
                          ? t("compactRows")
                          : t("comfortableRows")}
                      </span>
                    </div>

                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => setStickyHeader((prev) => !prev)}
                        aria-label="Toggle sticky header"
                        className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: stickyHeader
                            ? "var(--tag-selected-bg)"
                            : "var(--tag-bg)",
                          color: stickyHeader
                            ? "var(--tag-selected-text)"
                            : "var(--tag-text)",
                        }}
                      >
                        {stickyHeader ? (
                          <PanelTopClose size={16} aria-hidden="true" />
                        ) : (
                          <PanelTopOpen size={16} aria-hidden="true" />
                        )}
                      </button>
                      <span
                        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Sticky Header
                      </span>
                    </div>

                    <div className="group relative">
                      <button
                        type="button"
                        onClick={() => setShowRowNumbers((prev) => !prev)}
                        aria-label={
                          showRowNumbers
                            ? t("hideRowNumbers")
                            : t("showRowNumbers")
                        }
                        className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: !showRowNumbers
                            ? "var(--tag-selected-bg)"
                            : "var(--tag-bg)",
                          color: !showRowNumbers
                            ? "var(--tag-selected-text)"
                            : "var(--tag-text)",
                        }}
                      >
                        {showRowNumbers ? (
                          <EyeOff size={16} aria-hidden="true" />
                        ) : (
                          <Eye size={16} aria-hidden="true" />
                        )}
                      </button>
                      <span
                        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {showRowNumbers
                          ? t("hideRowNumbers")
                          : t("showRowNumbers")}
                      </span>
                    </div>

                    <div className="relative" ref={decimalMenuRef}>
                      <div className="group relative">
                        <button
                          type="button"
                          onClick={() => setShowDecimalMenu((prev) => !prev)}
                          aria-label="Format number decimals"
                          className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                          style={{
                            borderColor: "var(--tag-border)",
                            backgroundColor:
                              decimalPlaces !== null
                                ? "var(--tag-selected-bg)"
                                : "var(--tag-bg)",
                            color:
                              decimalPlaces !== null
                                ? "var(--tag-selected-text)"
                                : "var(--tag-text)",
                          }}
                        >
                          <Hash size={16} aria-hidden="true" />
                        </button>
                        <span
                          className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--surface)",
                            color: "var(--foreground)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Decimal Places{decimalPlaces !== null ? ` (${decimalPlaces})` : ""}
                        </span>
                      </div>

                      {showDecimalMenu && (
                        <div
                          className="absolute right-0 z-20 mt-2 rounded-lg border p-3"
                          style={{
                            borderColor: "var(--border)",
                            backgroundColor: "var(--surface-2)",
                            minWidth: "11rem",
                          }}
                        >
                          <div
                            className="mb-2 text-xs font-medium"
                            style={{ color: "var(--muted)" }}
                          >
                            Decimal places{decimalPlaces !== null ? `: ${decimalPlaces}` : ""}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDecimalPlaces((prev) =>
                                  prev === null ? 0 : prev <= 0 ? null : prev - 1,
                                )
                              }
                              aria-label="Decrease decimal places"
                              className="cursor-pointer rounded-md border px-3 py-1.5 text-sm inline-flex items-center gap-1.5"
                              style={{
                                borderColor: "var(--tag-border)",
                                backgroundColor: "var(--tag-bg)",
                                color: "var(--tag-text)",
                              }}
                            >
                              <span className="text-xs font-semibold leading-none">.00→.0</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDecimalPlaces((prev) =>
                                  prev === null ? 1 : Math.min(prev + 1, 10),
                                )
                              }
                              aria-label="Increase decimal places"
                              className="cursor-pointer rounded-md border px-3 py-1.5 text-sm inline-flex items-center gap-1.5"
                              style={{
                                borderColor: "var(--tag-border)",
                                backgroundColor: "var(--tag-bg)",
                                color: "var(--tag-text)",
                              }}
                            >
                              <span className="text-xs font-semibold leading-none">.0→.00</span>
                            </button>
                          </div>
                          {decimalPlaces !== null && (
                            <button
                              type="button"
                              onClick={() => {
                                setDecimalPlaces(null);
                                setShowDecimalMenu(false);
                              }}
                              className="mt-2 w-full cursor-pointer rounded-md border px-2 py-1 text-xs"
                              style={{
                                borderColor: "var(--tag-border)",
                                backgroundColor: "var(--tag-bg)",
                                color: "var(--tag-text)",
                              }}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="group relative ml-auto">
                      <button
                        type="button"
                        onClick={() => setFullWidthPreview((prev) => !prev)}
                        aria-label={
                          fullWidthPreview
                            ? t("restorePreviewWidth")
                            : t("expandPreviewWidth")
                        }
                        className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: fullWidthPreview
                            ? "var(--tag-selected-bg)"
                            : "var(--tag-bg)",
                          color: fullWidthPreview
                            ? "var(--tag-selected-text)"
                            : "var(--tag-text)",
                        }}
                      >
                        {fullWidthPreview ? (
                          <Minimize2 size={16} aria-hidden="true" />
                        ) : (
                          <Maximize2 size={16} aria-hidden="true" />
                        )}
                      </button>
                      <span
                        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fullWidthPreview
                          ? t("restorePreviewWidth")
                          : t("expandPreviewWidth")}
                      </span>
                    </div>

                    <div className="group relative">
                      <button
                        type="button"
                        onClick={resetView}
                        aria-label="Reset view settings"
                        className="cursor-pointer rounded-md border p-2.5 text-sm inline-flex items-center justify-center"
                        style={{
                          borderColor: "var(--tag-border)",
                          backgroundColor: isViewDirty
                            ? "var(--tag-selected-bg)"
                            : "var(--tag-bg)",
                          color: isViewDirty
                            ? "var(--tag-selected-text)"
                            : "var(--tag-text)",
                        }}
                      >
                        <RotateCcw size={16} aria-hidden="true" />
                      </button>
                      <span
                        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 rounded border px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: "var(--surface)",
                          color: "var(--foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Reset View
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={`relative left-1/2 -translate-x-1/2 will-change-[width] transition-[width] duration-300 ease-out ${
                    fullWidthPreview ? "w-[calc(100vw-2rem)]" : "w-full"
                  }`}
                >
                  <div
                    ref={tableScrollRef}
                    onPointerDown={onTablePointerDown}
                    onPointerMove={onTablePointerMove}
                    onPointerUp={stopTablePan}
                    onPointerCancel={stopTablePan}
                    onPointerLeave={stopTablePan}
                    className={`inspect-scrollbar-themed overflow-x-auto overflow-y-auto rounded-lg border ${
                      isResizing
                        ? "cursor-col-resize select-none"
                        : isPanningTable
                          ? "cursor-grabbing select-none"
                          : "cursor-default"
                    }`}
                    style={{
                      borderColor: "var(--border)",
                      touchAction: "pan-x pan-y",
                      maxHeight: stickyHeader ? "65vh" : "none",
                    }}
                  >
                    <table
                      ref={tableElementRef}
                      className="w-max min-w-full table-fixed text-left text-sm"
                    >
                      <colgroup>
                        {showRowNumbers && <col style={{ width: "56px" }} />}
                        {Array.from(
                          { length: tableModel.totalColumns },
                          (_, colIndex) => colIndex,
                        ).map((colIndex) => (
                          <col
                            key={`col-${colIndex}`}
                            style={{ width: `${getColumnWidth(colIndex)}px` }}
                          />
                        ))}
                      </colgroup>
                      <thead style={{ backgroundColor: "var(--surface-2)" }}>
                        <tr>
                          {showRowNumbers && (
                            <th
                              className={`${stickyHeader ? "sticky top-0 z-20" : ""} border-r px-2 py-2 text-center text-xs font-medium`}
                              style={{
                                color: "var(--muted)",
                                borderColor: "var(--border)",
                                backgroundColor: "var(--surface-2)",
                              }}
                            >
                              #
                            </th>
                          )}
                          {tableModel.totalColumns > 0 ? (
                            tableModel.headers.map((header, headerIndex) => (
                              <th
                                key={headerIndex}
                                className={`${stickyHeader ? "sticky top-0 z-20" : ""} relative border-r px-3 py-3 align-middle font-medium whitespace-nowrap`}
                                style={{
                                  color: "var(--muted)",
                                  borderColor: "var(--border)",
                                  width: `${getColumnWidth(headerIndex)}px`,
                                  maxWidth: `${getColumnWidth(headerIndex)}px`,
                                  backgroundColor: "var(--surface-2)",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleSort(headerIndex)}
                                  className="block w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-left"
                                  style={{ color: "inherit" }}
                                >
                                  {header}
                                  {sortColumnIndex === headerIndex &&
                                    (sortDirection === "asc" ? " ↑" : " ↓")}
                                </button>
                                <div
                                  role="separator"
                                  aria-label={`Resize column ${header}`}
                                  onPointerDown={(event) =>
                                    startColumnResize(headerIndex, event)
                                  }
                                  onDoubleClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    autofitColumnWidth(headerIndex, header);
                                  }}
                                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                                  style={{ touchAction: "none" }}
                                />
                              </th>
                            ))
                          ) : (
                            <th
                              className="px-3 py-2 font-medium"
                              style={{ color: "var(--muted)" }}
                            >
                              {t("noHeaderDetected")}
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {tableModel.rows.length > 0 ? (
                          tableModel.rows.map((row, rowIndex) => (
                            <tr
                              key={row.sourceIndex}
                              className="border-t"
                              style={{
                                borderColor: "var(--border)",
                                height: `${getRowHeight(rowIndex)}px`,
                              }}
                            >
                              {showRowNumbers && (
                                <td
                                  className={`relative border-r px-2 ${rowNumberPaddingClass} text-right text-xs`}
                                  style={{
                                    borderColor: "var(--border)",
                                    color: "var(--muted-2)",
                                    backgroundColor: "var(--surface-2)",
                                    userSelect: "none",
                                  }}
                                >
                                  {hideEmptyRows
                                    ? row.sourceIndex + 1
                                    : rowIndex + 1}
                                  <div
                                    role="separator"
                                    aria-label={`Resize row ${rowIndex + 1}`}
                                    onPointerDown={(event) =>
                                      startRowResize(rowIndex, event)
                                    }
                                    className="absolute bottom-0 left-0 h-2 w-full cursor-row-resize"
                                    style={{ touchAction: "none" }}
                                  />
                                </td>
                              )}
                              {Array.from(
                                { length: tableModel.totalColumns },
                                (_, colIndex) => colIndex,
                              ).map((colIndex) => (
                                <td
                                  key={colIndex}
                                  className={`border-r px-3 ${cellPaddingClass} align-middle overflow-hidden whitespace-nowrap`}
                                  style={{
                                    borderColor: "var(--border)",
                                    width: `${getColumnWidth(colIndex)}px`,
                                    maxWidth: `${getColumnWidth(colIndex)}px`,
                                    backgroundColor:
                                      highlightEmptyCells &&
                                      isEmptyCell(row.cells[colIndex])
                                        ? "var(--primary-soft)"
                                        : zebraRows && rowIndex % 2 === 1
                                          ? "var(--surface-2)"
                                          : "var(--surface)",
                                  }}
                                >
                                  <span
                                    className="block w-full overflow-hidden text-ellipsis whitespace-nowrap"
                                    title={
                                      displayCell(row.cells[colIndex]) ||
                                      undefined
                                    }
                                  >
                                    {renderCell(row.cells[colIndex])}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={
                                tableModel.totalColumns +
                                (showRowNumbers ? 1 : 0)
                              }
                              className="px-3 py-3 text-sm"
                              style={{ color: "var(--muted-2)" }}
                            >
                              {t("noRowsMatch")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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
                      ? t("loadingMore")
                      : pagedDone
                        ? t("allRowsLoaded")
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
                    {loadingAllRows ? t("loadingAll") : t("loadAllRows")}
                  </button>

                  <span className="text-xs" style={{ color: "var(--muted-2)" }}>
                    Showing {loadedRowsCount}
                    {totalDataRows !== null ? ` of ${totalDataRows}` : ""} rows
                    in this sheet.
                  </span>
                </div>

                <p className="mt-2 text-xs" style={{ color: "var(--muted-2)" }}>
                  Tip: Shift + scroll for horizontal, Alt + drag to pan.
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                {t("noSheetsAvailable")}
              </p>
            )}
          </div>
        </div>
      )}

      <BackToTopButton />
    </div>
  );
}
