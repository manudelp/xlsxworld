"use client";
import React, { useCallback, useState } from "react";
import { splitWorkbook } from "@/lib/tools/split";
import FileUploadDropzone from "@/components/utility/FileUploadDropzone";

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
      <FileUploadDropzone
        accept=".xlsx"
        message="Drop or select an Excel file to split its sheets into separate workbooks"
        onFiles={(files) => {
          const selected = files[0];
          if (selected) onFile(selected);
        }}
      />

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
