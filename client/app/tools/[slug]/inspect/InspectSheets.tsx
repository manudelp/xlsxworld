"use client";
import React, { useCallback, useState } from "react";

interface ParsedSheet {
  name: string;
  rows: (string | number | boolean | null)[][];
}

interface XLSXModuleLike {
  read(
    data: ArrayBuffer,
    opts: { type: string }
  ): { SheetNames: string[]; Sheets: Record<string, unknown> };
  utils: {
    sheet_to_json(
      sheet: unknown,
      opts: { header: number; raw: boolean }
    ): unknown[];
  };
}

export default function InspectSheets() {
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSheet, setActiveSheet] = useState(0);
  const [limit, setLimit] = useState<number>(25); // -1 means all
  const limitOptions = [25, 50, 100, -1];

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setSheets([]);
    setLoading(true);
    try {
      // Dynamic import with simple ESM/CJS interop handling.
      const imported = (await import("xlsx")) as unknown;
      function isWrapped(m: unknown): m is { default: XLSXModuleLike } {
        if (typeof m !== "object" || m === null) return false;
        return Object.prototype.hasOwnProperty.call(m, "default");
      }
      const XLSX: XLSXModuleLike = isWrapped(imported)
        ? imported.default
        : (imported as XLSXModuleLike);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const parsed: ParsedSheet[] = workbook.SheetNames.map((name: string) => {
        const sheet = workbook.Sheets[name];
        const json = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: true,
        }) as (string | number | boolean | null)[][];
        return { name, rows: json };
      });
      setSheets(parsed);
      setActiveSheet(0);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to parse file";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const currentSheet = sheets[activeSheet];

  function visibleRows(): (string | number | boolean | null)[][] {
    if (!currentSheet) return [];
    if (limit === -1) return currentSheet.rows;
    return currentSheet.rows.slice(0, limit);
  }

  function headerRow(): (string | number | boolean | null)[] | undefined {
    return currentSheet?.rows[0];
  }

  function dataRows(): (string | number | boolean | null)[][] {
    const all = visibleRows();
    if (all.length <= 1) return [];
    return all.slice(1);
  }

  function exportJSON() {
    if (!currentSheet) return;
    const blob = new Blob([JSON.stringify(currentSheet.rows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentSheet.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    if (!currentSheet) return;
    const csv = currentSheet.rows
      .map((row) =>
        row
          .map((cell) => {
            if (cell === null || cell === undefined) return "";
            const s = String(cell);
            if (/[",\n]/.test(s)) {
              return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentSheet.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
            accept=".xls,.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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
        <div className="text-sm text-gray-500">Parsing workbook...</div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {sheets.length > 0 && currentSheet && (
        <div className="space-y-6">
          {/* Sheet Tabs */}
          <div className="flex flex-wrap gap-2">
            {sheets.map((s, i) => (
              <button
                key={s.name + i}
                onClick={() => setActiveSheet(i)}
                className={`px-3 py-1 rounded-full text-sm border transition shadow-sm ${
                  i === activeSheet
                    ? "bg-[#292931] text-white border-[#292931]"
                    : "bg-white border-gray-300 hover:border-[#292931]"
                }`}
              >
                {s.name}
                <span className="ml-1 text-[10px] text-gray-500">
                  {s.rows.length}
                </span>
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Rows:</span>
              <div className="flex gap-1">
                {limitOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setLimit(opt)}
                    className={`px-2 py-1 rounded border text-xs ${
                      limit === opt
                        ? "bg-[#292931] text-white border-[#292931]"
                        : "bg-white border-gray-300 hover:border-[#292931]"
                    }`}
                    title={opt === -1 ? "Show all rows" : `Show first ${opt}`}
                  >
                    {opt === -1 ? "All" : opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportCSV}
                className="px-3 py-1 rounded border bg-white hover:bg-gray-50 text-xs"
              >
                Export CSV
              </button>
              <button
                onClick={exportJSON}
                className="px-3 py-1 rounded border bg-white hover:bg-gray-50 text-xs"
              >
                Export JSON
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Showing{" "}
              {limit === -1 ||
                (currentSheet.rows.length < limit
                  ? currentSheet.rows.length
                  : limit)}{" "}
              of {currentSheet.rows.length} rows
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 font-medium flex justify-between items-center text-sm">
              <span>{currentSheet.name}</span>
              <span className="text-xs text-gray-500">
                {currentSheet.rows.length} total rows
              </span>
            </div>
            <div className="overflow-auto max-h-[560px]">
              <table className="text-xs md:text-sm min-w-full border-collapse relative">
                {headerRow() && (
                  <thead className="bg-[#f5f5f7] text-gray-700 sticky top-0 z-10">
                    <tr>
                      {headerRow()!.map((cell, i) => (
                        <th
                          key={i}
                          className="border px-2 py-1 text-left font-semibold whitespace-pre bg-[#f5f5f7]"
                        >
                          {cell === null ||
                          cell === undefined ||
                          cell === "" ? (
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
                  {dataRows().map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 ? "bg-white" : "bg-gray-50"}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="border px-2 py-1 align-top max-w-[260px] whitespace-pre-wrap font-mono text-[11px] md:text-xs"
                        >
                          {cell === null ||
                          cell === undefined ||
                          cell === "" ? (
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
