"use client";
import React, { useCallback, useState } from "react";
import { csvToXlsx } from "@/lib/tools/convert";

export default function ConvertCsvToXlsx() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [delimiter, setDelimiter] = useState(",");
  const [sheetName, setSheetName] = useState("Sheet1");

  const onFile = useCallback((selected: File) => {
    setError(null);
    setFile(selected);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const arrayBuffer = await csvToXlsx(file, sheetName, delimiter);
      const blob = new Blob([arrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      a.download = `${baseName || "converted"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setLoading(false);
    }
  }, [file, sheetName, delimiter]);

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const selected = e.dataTransfer.files?.[0];
          if (selected) onFile(selected);
        }}
      >
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) onFile(selected);
            }}
          />
          <span className="text-sm text-gray-600">Drop or select a CSV file to convert to XLSX</span>
        </label>
      </div>

      {file && (
        <div className="text-sm text-gray-700">
          Selected file: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-gray-600 flex items-center gap-2">
          Sheet name
          <input
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </label>

        <label className="text-sm text-gray-600 flex items-center gap-2">
          Delimiter
          <input
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-16"
          />
        </label>

        <button
          onClick={handleConvert}
          disabled={!file || loading}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Converting..." : "Convert to XLSX"}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="text-xs text-gray-500">
        Note: converted file includes data only; formatting and formulas are not preserved.
      </div>
    </div>
  );
}
