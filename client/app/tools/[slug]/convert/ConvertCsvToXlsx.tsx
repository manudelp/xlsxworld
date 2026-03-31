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

  const canConvert =
    !!file && !loading && !!sheetName.trim() && delimiter.length > 0;

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
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".csv,text/csv"
        message="Drop or select a CSV file to convert to XLSX"
        hasError={!!error}
        onFiles={(files) => {
          const selected = files[0];
          if (selected) onFile(selected);
        }}
      />

      {file && (
        <div
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
            color: "var(--foreground)",
          }}
        >
          Selected file: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
        </div>
      )}

      {file && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">Conversion settings</h3>
            <span
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              CSV to XLSX
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-sm" style={{ color: "var(--muted)" }}>
              Output sheet name
              <input
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                  color: "var(--foreground)",
                }}
              />
            </label>

            <div className="block text-sm" style={{ color: "var(--muted)" }}>
              Delimiter
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  className="min-w-[120px] flex-1 rounded border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--surface-2)",
                    color: "var(--foreground)",
                  }}
                />

                <div className="flex flex-wrap gap-2">
                  {[",", ";", "\t", "|"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDelimiter(value)}
                      className="cursor-pointer rounded-md border px-2.5 py-1 text-xs"
                      style={{
                        borderColor: "var(--tag-border)",
                        backgroundColor:
                          delimiter === value
                            ? "var(--tag-selected-bg)"
                            : "var(--tag-bg)",
                        color:
                          delimiter === value
                            ? "var(--tag-selected-text)"
                            : "var(--tag-text)",
                      }}
                    >
                      {value === "\t" ? "Tab" : value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {file && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "var(--muted-2)" }}>
            Data is preserved; formulas, styles, and advanced Excel formatting are not.
          </p>

          <button
            onClick={handleConvert}
            disabled={!canConvert}
            className="cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {loading ? "Converting..." : "Convert to XLSX"}
          </button>
        </div>
      )}

      {error && <div className="text-sm" style={{ color: "var(--danger)" }}>{error}</div>}
    </div>
  );
}
