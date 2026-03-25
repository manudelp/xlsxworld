"use client";
import React, { useCallback, useState } from "react";
import { splitWorkbook } from "@/lib/tools/split";

export default function SplitWorkbook() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFile = useCallback((selected: File) => {
    setError(null);
    setFile(selected);
  }, []);

  const handleSplit = useCallback(async () => {
    if (!file) {
      setError("Please select an XLSX file first.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const buffer = await splitWorkbook(file);
      const blob = new Blob([buffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "split-workbook.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split failed");
    } finally {
      setLoading(false);
    }
  }, [file]);

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
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) onFile(selected);
            }}
          />
          <span className="text-sm text-gray-600">Drop or select an XLSX file to inspect</span>
        </label>
      </div>

      <button
        onClick={handleSplit}
        disabled={!file || loading}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Splitting..." : "Split Workbook"}
      </button>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="text-xs text-gray-500">
        Output is a ZIP archive containing one XLSX per source sheet.
      </div>
    </div>
  );
}
