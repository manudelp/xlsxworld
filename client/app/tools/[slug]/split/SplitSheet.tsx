"use client";
import React, { useCallback, useState } from "react";
import { splitSheet } from "@/lib/tools/split";
import FileUploadDropzone from "@/components/utility/FileUploadDropzone";

export default function SplitSheet() {
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [chunkSize, setChunkSize] = useState(1000);
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

    if (!sheetName.trim()) {
      setError("Sheet name is required");
      return;
    }

    if (chunkSize < 2) {
      setError("Chunk size must be at least 2");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const buffer = await splitSheet(file, sheetName.trim(), chunkSize);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      a.download = `${baseName || "split"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split failed");
    } finally {
      setLoading(false);
    }
  }, [file, sheetName, chunkSize]);

  return (
    <div className="space-y-6">
      <FileUploadDropzone
        accept=".xlsx"
        message="Drop or select an Excel file to split a sheet into chunks"
        onFiles={(files) => {
          const selected = files[0];
          if (selected) onFile(selected);
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm text-gray-700">
          Sheet to split:
          <input
            className="mt-1 w-full border rounded px-2 py-1"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Sheet1"
          />
        </label>

        <label className="text-sm text-gray-700">
          Rows per chunk (including header):
          <input
            type="number"
            min={2}
            className="mt-1 w-full border rounded px-2 py-1"
            value={chunkSize}
            onChange={(e) => setChunkSize(Number(e.target.value))}
          />
        </label>
      </div>

      <button
        onClick={handleSplit}
        disabled={!file || loading}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Splitting..." : "Split Sheet"}
      </button>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="text-xs text-gray-500">
        Output workbook contains split chunks as separate sheets named `part_1`,
        `part_2`, etc.
      </div>
    </div>
  );
}
