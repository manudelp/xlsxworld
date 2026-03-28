"use client";
import React, { useCallback, useState } from "react";
import { mergeSheets } from "@/lib/tools/merge";
import FileUploadDropzone from "@/components/utility/FileUploadDropzone";

export default function MergeSheets() {
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string>("");
  const [outputSheet, setOutputSheet] = useState("Merged");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFile = useCallback((selected: File) => {
    setError(null);
    setFile(selected);
  }, []);

  const handleMerge = useCallback(async () => {
    if (!file) {
      setError("Please select an XLSX file first.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const buffer = await mergeSheets(
        file,
        sheetNames
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        outputSheet,
      );
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
      setError(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setLoading(false);
    }
  }, [file, sheetNames, outputSheet]);

  return (
    <div className="space-y-6">
      <FileUploadDropzone
        accept=".xlsx"
        message="Drop or select an Excel file to merge its sheets"
        onFiles={(files) => {
          const selected = files[0];
          if (selected) onFile(selected);
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm text-gray-700">
          Sheet names to merge (comma-separated; leave empty for all):
          <input
            className="mt-1 w-full border rounded px-2 py-1"
            value={sheetNames}
            onChange={(e) => setSheetNames(e.target.value)}
            placeholder="Sheet1, Sheet2"
          />
        </label>

        <label className="text-sm text-gray-700">
          Output sheet name:
          <input
            className="mt-1 w-full border rounded px-2 py-1"
            value={outputSheet}
            onChange={(e) => setOutputSheet(e.target.value)}
          />
        </label>
      </div>

      <button
        onClick={handleMerge}
        disabled={!file || loading}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Merging..." : "Merge Sheets"}
      </button>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="text-xs text-gray-500">
        Tip: If the sheet name list is empty, all sheets are combined in
        workbook order.
      </div>
    </div>
  );
}
