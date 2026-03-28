"use client";
import React, { useCallback, useState } from "react";
import { appendWorkbooks } from "@/lib/tools/merge";
import FileUploadDropzone from "@/components/utility/FileUploadDropzone";

export default function AppendWorkbooks() {
  const [files, setFiles] = useState<File[]>([]);
  const [outputSheet, setOutputSheet] = useState("Appended");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    setError(null);
    setFiles(Array.from(selectedFiles));
  }, []);

  const handleAppend = useCallback(async () => {
    if (files.length < 2) {
      setError("Select at least two XLSX files to append.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const buffer = await appendWorkbooks(files, outputSheet);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "appended-workbooks.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Append failed");
    } finally {
      setLoading(false);
    }
  }, [files, outputSheet]);

  return (
    <div className="space-y-6">
      <FileUploadDropzone
        accept=".xlsx"
        multiple
        message="Drop or select XLSX files to append"
        onFiles={onFiles}
      />

      {files.length > 0 && (
        <div className="text-sm text-gray-600">
          Selected: {files.length} file{files.length === 1 ? "" : "s"}
        </div>
      )}

      <label className="block text-sm text-gray-700">
        Output sheet name:
        <input
          value={outputSheet}
          onChange={(e) => setOutputSheet(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1"
        />
      </label>

      <button
        onClick={handleAppend}
        disabled={files.length < 2 || loading}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Appending..." : "Append Workbooks"}
      </button>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="text-xs text-gray-500">
        All selected workbooks are appended vertically in the output sheet,
        headers consolidated.
      </div>
    </div>
  );
}
