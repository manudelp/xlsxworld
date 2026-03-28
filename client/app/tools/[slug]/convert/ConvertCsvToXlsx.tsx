"use client";
import React, { useCallback, useState } from "react";
import { csvToXlsx } from "@/lib/tools/convert";
import FileUploadDropzone from "@/components/utility/FileUploadDropzone";

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
      <FileUploadDropzone
        accept=".csv,text/csv"
        message="Drop or select a CSV file to convert to XLSX"
        onFiles={(files) => {
          const selected = files[0];
          if (selected) onFile(selected);
        }}
      />

      {file && (
        <div className="text-sm" style={{ color: "var(--foreground)" }}>
          Selected file: <strong>{file.name}</strong> (
          {(file.size / 1024).toFixed(1)} KB)
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <label
          className="text-sm flex items-center gap-2"
          style={{ color: "var(--muted)" }}
        >
          Sheet name
          <input
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </label>

        <label
          className="text-sm flex items-center gap-2"
          style={{ color: "var(--muted)" }}
        >
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

      <div className="text-xs" style={{ color: "var(--muted-2)" }}>
        Note: converted file includes data only; formatting and formulas are not
        preserved.
      </div>
    </div>
  );
}
