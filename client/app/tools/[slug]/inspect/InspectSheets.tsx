"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  uploadForPreview,
  fetchSheetPage,
  exportCsvUrl,
  exportJsonUrl,
  WorkbookPreview,
  SheetPage,
} from "@/lib/tools/inspect";

export default function InspectSheets() {
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [page, setPage] = useState<SheetPage | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const limitOptions = [25, 50, 100, 250, 500];
  // Enhanced sizing options
  const [sizingMode, setSizingMode] = useState<"compact" | "comfortable">(
    "comfortable"
  );
  const [columnWidth, setColumnWidth] = useState(120);
  const [wrapText, setWrapText] = useState(false);

  // persist preferences in localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("inspect_prefs");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.columnWidth)
          setColumnWidth(Number(parsed.columnWidth) || 120);
        if (parsed?.sizingMode) setSizingMode(parsed.sizingMode);
        if (typeof parsed?.wrapText === "boolean") setWrapText(parsed.wrapText);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "inspect_prefs",
        JSON.stringify({ columnWidth, sizingMode, wrapText })
      );
    } catch {
      // ignore
    }
  }, [columnWidth, sizingMode, wrapText]);

  // Sizing configurations
  const sizingConfig = {
    compact: { colWidth: 80, rowHeight: 28, padding: "px-2 py-1" },
    comfortable: { colWidth: 120, rowHeight: 36, padding: "px-3 py-2" },
    // removed auto-fit mode
  };

  const currentConfig = sizingConfig[sizingMode];
  // no drag-to-resize behavior — badge displays current width only

  const headerRow = page?.header ?? [];
  const dataRows = page?.rows ?? [];

  // (Removed atFar state and scroll edge detection per user request)

  const currentSheetName = preview?.sheets[activeSheetIdx]?.name;
  const token = preview?.token;

  const loadPage = useCallback(
    async (tok: string, sheet: string, newOffset: number, newLimit: number) => {
      setPageLoading(true);
      try {
        const p = await fetchSheetPage(tok, sheet, newOffset, newLimit);
        setPage(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch page");
      } finally {
        setPageLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (token && currentSheetName) {
      loadPage(token, currentSheetName, offset, limit);
    }
  }, [token, currentSheetName, offset, limit, loadPage]);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setPreview(null);
    setPage(null);
    setLoading(true);
    setOffset(0);
    try {
      const p = await uploadForPreview(file, 25);
      setPreview(p);
      setActiveSheetIdx(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // moved earlier
  const totalRows = page?.total_rows ?? 0;
  const showingFrom = Math.min(offset + 1, totalRows || 0);
  const showingTo = Math.min(offset + dataRows.length, totalRows || 0);

  return (
    <div className="space-y-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
      >
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
          <input
            type="file"
            accept=".xls,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
          />
          <span className="text-sm text-gray-600">
            Drop or select an XLSX file to inspect
          </span>
        </label>
      </div>
      {loading && (
        <div className="text-sm text-gray-500">
          Uploading & parsing workbook...
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {preview && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {preview.sheets.map((s, i) => (
              <button
                key={s.name + i}
                onClick={() => {
                  setActiveSheetIdx(i);
                  setOffset(0);
                }}
                className={`px-3 py-1 rounded-full text-sm border transition shadow-sm ${
                  i === activeSheetIdx
                    ? "bg-[#292931] text-white border-[#292931]"
                    : "bg-white border-gray-300 hover:border-[#292931]"
                }`}
              >
                {s.name}
                <span className="ml-1 text-[10px] text-gray-500">
                  {s.total_rows}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Limit:</span>
              <div className="flex gap-1">
                {limitOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setLimit(opt);
                      setOffset(0);
                    }}
                    className={`cursor-pointer px-2 py-1 rounded border text-xs ${
                      limit === opt
                        ? "bg-[#292931] text-white border-[#292931]"
                        : "bg-white border-gray-300 hover:border-[#292931]"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Table density:</span>
              <div className="flex gap-1">
                {(["compact", "comfortable"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSizingMode(mode)}
                    className={`cursor-pointer px-3 py-1 rounded border text-xs transition shadow-sm ${
                      sizingMode === mode
                        ? "bg-[#292931] text-white border-[#292931]"
                        : "bg-white border-gray-300 hover:border-[#292931]"
                    }`}
                    title={
                      mode === "compact"
                        ? "Compact view - smaller cells"
                        : "Comfortable view - medium cells"
                    }
                  >
                    {mode === "compact" ? "Compact" : "Comfortable"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Column width:</span>
              <div className="flex gap-1">
                {[60, 80, 100, 120, 150, 200, 250].map((width) => (
                  <button
                    key={width}
                    onClick={() => setColumnWidth(width)}
                    className={`cursor-pointer px-2 py-1 rounded border text-xs ${
                      columnWidth === width
                        ? "bg-[#292931] text-white border-[#292931]"
                        : "bg-white border-gray-300 hover:border-[#292931]"
                    }`}
                  >
                    {width}px
                  </button>
                ))}
                <input
                  type="number"
                  aria-label="Column width"
                  min={10}
                  value={columnWidth}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    // clamp to sensible minimum
                    setColumnWidth(
                      Number.isFinite(v) ? Math.max(10, Math.round(v)) : 10
                    );
                  }}
                  className="w-20 px-2 py-1 border rounded text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Text display:</span>
              <button
                onClick={() => setWrapText(!wrapText)}
                className={`cursor-pointer px-3 py-1 rounded border text-xs transition shadow-sm ${
                  wrapText
                    ? "bg-[#292931] text-white border-[#292931]"
                    : "bg-white border-gray-300 hover:border-[#292931]"
                }`}
                title={
                  wrapText
                    ? "Text wraps to fit cell width"
                    : "Text truncated with ellipsis"
                }
              >
                {wrapText ? "Wrap text" : "Ellipsis"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!token || !currentSheetName}
                onClick={() =>
                  token &&
                  currentSheetName &&
                  window.open(exportCsvUrl(token, currentSheetName), "_blank")
                }
                className="cursor-pointer px-3 py-1 rounded border bg-white hover:bg-gray-50 text-xs disabled:opacity-40"
              >
                Export CSV
              </button>
              <button
                disabled={!token || !currentSheetName}
                onClick={() =>
                  token &&
                  currentSheetName &&
                  window.open(exportJsonUrl(token, currentSheetName), "_blank")
                }
                className="cursor-pointer px-3 py-1 rounded border bg-white hover:bg-gray-50 text-xs disabled:opacity-40"
              >
                Export JSON
              </button>
            </div>
            {page && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  disabled={offset === 0 || pageLoading}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  className="cursor-pointer px-2 py-1 border rounded disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={page.done || pageLoading}
                  onClick={() => setOffset(offset + limit)}
                  className="cursor-pointer px-2 py-1 border rounded disabled:opacity-40"
                >
                  Next
                </button>
                <span className="text-gray-500">
                  {showingFrom}-{showingTo} of {totalRows}
                </span>
              </div>
            )}
          </div>
          <div className="overflow-hidden relative rounded-lg border border-gray-200 shadow-lg">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 font-semibold flex justify-between items-center text-sm border-b border-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-gray-700">{currentSheetName}</span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  title={`Column width: ${columnWidth}px`}
                  className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full select-none"
                >
                  {columnWidth}px
                </div>
                <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full">
                  {totalRows.toLocaleString()} rows
                </span>
              </div>
            </div>
            <div
              ref={scrollRef}
              className="overflow-auto max-h-[560px] relative"
            >
              {pageLoading && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center text-xs text-gray-600">
                  Loading rows...
                </div>
              )}
              <div className="relative min-w-0">
                <table
                  className={`border-collapse text-xs md:text-sm bg-white rounded-lg shadow-lg border border-gray-200 ${
                    wrapText ? "" : "table-fixed"
                  }`}
                  style={{
                    borderSpacing: 0,
                    // When using fixed column widths (ellipsis or fixed density), make the table width
                    // fit its columns so the <col> pixel widths are honored and horizontal scrolling appears.
                    width: wrapText ? undefined : "max-content",
                    // allow the surrounding container to still constrain height/scroll
                    maxWidth: "100%",
                  }}
                >
                  {/* Set column widths when using fixed sizing */}
                  <colgroup>
                    {/* Row-number column */}
                    <col style={{ width: 56 }} />
                    {/* Data columns */}
                    {headerRow.map((_, i) => {
                      // Calculate column width based on mode and settings
                      // Always return a concrete pixel width on the <col> so browsers (Chrome) honor it.
                      const getColumnWidth = () => {
                        // When using fixed sizing modes, use the explicit `columnWidth` value
                        // for the pixel width. In 'auto' density we still honor the user's
                        // selected explicit column width as the exact width to use.
                        const w = columnWidth;
                        return { width: `${w}px` };
                      };

                      return <col key={i} style={getColumnWidth()} />;
                    })}
                  </colgroup>
                  <thead className="sticky top-0 z-40 bg-gradient-to-b from-gray-50 to-gray-100 border-b-2 border-gray-300">
                    <tr className="bg-gradient-to-r from-emerald-600 to-emerald-700">
                      {/* Top-left empty cell for row/col headers */}
                      <th
                        className="px-3 py-2 bg-gradient-to-br from-emerald-600 to-emerald-700 font-bold text-white text-center sticky left-0 z-50 border-r border-emerald-800 shadow-lg"
                        style={{
                          width: 56,
                          height: currentConfig.rowHeight,
                        }}
                      ></th>
                      {/* Column headers: A, B, ..., Z, AA, AB, ... styled like Excel */}
                      {headerRow.map((_, i) => {
                        // Excel-style column name (A, B, ..., Z, AA, AB, ...)
                        const toColName = (n: number) => {
                          let s = "";
                          n++;
                          while (n > 0) {
                            const mod = (n - 1) % 26;
                            s = String.fromCharCode(65 + mod) + s;
                            n = Math.floor((n - 1) / 26);
                          }
                          return s;
                        };
                        return (
                          <th
                            key={i}
                            className="px-3 py-2 bg-gradient-to-br from-emerald-600 to-emerald-700 font-bold text-white text-center z-40 border-r border-emerald-500/30 hover:bg-emerald-500 transition-colors"
                            style={{
                              minWidth: wrapText
                                ? `${columnWidth}px`
                                : undefined,
                              width: !wrapText ? `${columnWidth}px` : undefined,
                              height: currentConfig.rowHeight,
                            }}
                          >
                            {toColName(i)}
                          </th>
                        );
                      })}
                    </tr>
                    {headerRow.length > 0 && (
                      <tr className="bg-white border-b border-gray-300">
                        <th
                          className={`${currentConfig.padding} bg-gradient-to-br from-emerald-600 to-emerald-700 text-center font-bold text-white sticky left-0 z-50 border-r border-emerald-800 shadow-sm`}
                          style={{
                            height: currentConfig.rowHeight,
                            minHeight: wrapText ? 32 : undefined,
                          }}
                        >
                          1
                        </th>
                        {headerRow.map((cell, i) => (
                          <th
                            key={i}
                            className={`border-r border-gray-200 ${currentConfig.padding} bg-gradient-to-b from-gray-50 to-white text-center font-semibold text-gray-800 hover:bg-gray-100 transition-colors`}
                            style={{
                              height: wrapText
                                ? "auto"
                                : currentConfig.rowHeight,
                              minHeight: wrapText ? 32 : undefined,
                            }}
                          >
                            {cell === null ||
                            cell === undefined ||
                            cell === "" ? (
                              <span className="text-gray-400 italic">
                                Empty
                              </span>
                            ) : (
                              // inner wrapper: block-level with constrained width so truncate works in Chrome
                              <div
                                className={
                                  wrapText
                                    ? "whitespace-normal break-words"
                                    : "block truncate"
                                }
                                style={
                                  !wrapText
                                    ? {
                                        maxWidth: `${columnWidth}px`,
                                        display: "block",
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                        textOverflow: "ellipsis",
                                      }
                                    : {
                                        display: "block",
                                        maxWidth: `${columnWidth}px`,
                                      }
                                }
                                title={!wrapText ? String(cell) : undefined}
                              >
                                {String(cell)}
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {dataRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={`border-b border-gray-200 transition-colors hover:bg-blue-50 ${
                          rIdx % 2 ? "bg-white" : "bg-gray-50/30"
                        }`}
                      >
                        {/* Row header: 1, 2, 3, ... styled like Excel (count header as 1) */}
                        <td
                          className={`${currentConfig.padding} align-top font-bold text-white bg-gradient-to-br from-emerald-600 to-emerald-700 text-center sticky left-0 z-10 border-r border-emerald-800 shadow-sm hover:from-emerald-500 hover:to-emerald-600 transition-colors`}
                          style={{
                            width: 56,
                            height: currentConfig.rowHeight,
                            minHeight: wrapText ? 32 : undefined,
                          }}
                        >
                          {rIdx + 2 + offset}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`${currentConfig.padding} align-top font-mono text-[11px] md:text-xs text-gray-700 border-r border-gray-200 hover:bg-blue-100 transition-colors`}
                            style={{
                              height: wrapText
                                ? "auto"
                                : currentConfig.rowHeight,
                              minHeight: wrapText ? 28 : undefined,
                            }}
                          >
                            {cell === null ||
                            cell === undefined ||
                            cell === "" ? (
                              <span className="text-gray-400 italic">
                                Empty
                              </span>
                            ) : (
                              <div
                                className={
                                  wrapText
                                    ? "whitespace-normal break-words"
                                    : "block truncate select-text"
                                }
                                style={
                                  !wrapText
                                    ? {
                                        maxWidth: `${columnWidth}px`,
                                        display: "block",
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                        textOverflow: "ellipsis",
                                      }
                                    : {
                                        display: "block",
                                        maxWidth: `${columnWidth}px`,
                                      }
                                }
                                title={!wrapText ? String(cell) : undefined}
                              >
                                {String(cell)}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Removed gradient overlays */}
          </div>
        </div>
      )}
    </div>
  );
}

// scroll state updater & effects
