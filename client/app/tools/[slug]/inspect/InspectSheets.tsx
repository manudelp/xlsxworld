"use client";
import React, { useCallback, useEffect, useState } from "react";
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
  const limitOptions = [25, 50, 100, 250, 500];

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

  const headerRow = page?.header ?? [];
  const dataRows = page?.rows ?? [];
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
        <div className="text-sm text-gray-500">Uploading & parsing workbook...</div>
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
                    className={`px-2 py-1 rounded border text-xs ${
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
              <button
                disabled={!token || !currentSheetName}
                onClick={() =>
                  token && currentSheetName && window.open(exportCsvUrl(token, currentSheetName), "_blank")
                }
                className="px-3 py-1 rounded border bg-white hover:bg-gray-50 text-xs disabled:opacity-40"
              >
                Export CSV
              </button>
              <button
                disabled={!token || !currentSheetName}
                onClick={() =>
                  token && currentSheetName && window.open(exportJsonUrl(token, currentSheetName), "_blank")
                }
                className="px-3 py-1 rounded border bg-white hover:bg-gray-50 text-xs disabled:opacity-40"
              >
                Export JSON
              </button>
            </div>
            {page && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  disabled={offset === 0 || pageLoading}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  className="px-2 py-1 border rounded disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={page.done || pageLoading}
                  onClick={() => setOffset(offset + limit)}
                  className="px-2 py-1 border rounded disabled:opacity-40"
                >
                  Next
                </button>
                <span className="text-gray-500">
                  {showingFrom}-{showingTo} of {totalRows}
                </span>
              </div>
            )}
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 font-medium flex justify-between items-center text-sm">
              <span>{currentSheetName}</span>
              <span className="text-xs text-gray-500">{totalRows} total rows</span>
            </div>
            <div className="overflow-auto max-h-[560px] relative">
              {pageLoading && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center text-xs text-gray-600">
                  Loading rows...
                </div>
              )}
              <table className="text-xs md:text-sm min-w-full border-collapse relative">
                {headerRow.length > 0 && (
                  <thead className="bg-[#f5f5f7] text-gray-700 sticky top-0 z-10">
                    <tr>
                      {headerRow.map((cell, i) => (
                        <th
                          key={i}
                          className="border px-2 py-1 text-left font-semibold whitespace-pre bg-[#f5f5f7]"
                        >
                          {cell === null || cell === undefined || cell === "" ? (
                            <span className="text-gray-300">·</span>
                          ) : (
                            String(cell)
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {dataRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 ? "bg-white" : "bg-gray-50"}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="border px-2 py-1 align-top max-w-[260px] whitespace-pre-wrap font-mono text-[11px] md:text-xs"
                        >
                          {cell === null || cell === undefined || cell === "" ? (
                            <span className="text-gray-300">·</span>
                          ) : (
                            String(cell)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
