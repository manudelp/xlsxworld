"use client";
import React, { useCallback, useMemo, useState } from "react";
import { Archive, Layers3 } from "lucide-react";
import { splitWorkbook } from "@/lib/tools/split";
import FileUploadDropzone from "@/components/utility/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";

export default function SplitWorkbook() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const onFile = useCallback(async (selected: File) => {
    setError(null);
    setFile(selected);
    setPreview(null);
    setFileName(selected.name);
    setPreviewLoading(true);

    try {
      const workbook = await uploadForPreview(selected, 1);
      setPreview(workbook);

      if (workbook.sheet_count === 0) {
        setError("No sheets were detected in this workbook.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not inspect workbook");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const sheetNames = useMemo(
    () => preview?.sheets.map((sheet) => sheet.name) ?? [],
    [preview],
  );
  const previewNames = useMemo(() => sheetNames.slice(0, 8), [sheetNames]);
  const hiddenNames = Math.max(0, sheetNames.length - previewNames.length);
  const canSplit =
    !!file && !loading && !previewLoading && (preview?.sheet_count ?? 0) > 0;

  const handleSplit = useCallback(async () => {
    if (!file) {
      setError("Please select an XLSX file first.");
      return;
    }

    if ((preview?.sheet_count ?? 0) < 1) {
      setError("Upload a workbook with at least one sheet.");
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
      const baseName = file.name.replace(/\.[^.]+$/, "");
      a.download = `${baseName || "split-workbook"}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split failed");
    } finally {
      setLoading(false);
    }
  }, [file, preview?.sheet_count]);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".xls,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        message="Drop or select an Excel file to split its sheets into separate workbooks"
        className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition"
        style={{
          borderColor: error ? "var(--danger)" : "var(--border)",
          backgroundColor: error ? "var(--danger-soft)" : "var(--background)",
        }}
        onFiles={(files) => {
          const selected = files[0];
          if (selected) void onFile(selected);
        }}
      />

      {previewLoading && (
        <div className="text-sm" style={{ color: "var(--muted-2)" }}>
          Reading workbook structure...
        </div>
      )}

      {preview && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-medium">Split Workbook</h3>
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                {fileName || "Uploaded workbook"} - {preview.sheet_count} sheet
                {preview.sheet_count === 1 ? "" : "s"}
              </p>
            </div>
            <span
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              1 output XLSX per source sheet
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {previewNames.map((sheetName) => (
              <span
                key={sheetName}
                className="rounded-full border px-2.5 py-1 text-xs"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: "var(--tag-bg)",
                  color: "var(--tag-text)",
                }}
              >
                {sheetName}
              </span>
            ))}
            {hiddenNames > 0 ? (
              <span
                className="rounded-full border px-2.5 py-1 text-xs"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: "var(--tag-bg)",
                  color: "var(--tag-text)",
                }}
              >
                +{hiddenNames} more
              </span>
            ) : null}
          </div>
        </div>
      )}

      {preview && (
        <div
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
            color: "var(--muted-2)",
          }}
        >
          <div className="mb-2 font-medium" style={{ color: "var(--foreground)" }}>
            Split summary
          </div>

          <div className="flex flex-wrap gap-1.5 overflow-hidden whitespace-nowrap">
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              <Layers3 size={14} />
              {preview.sheet_count.toLocaleString()} source sheet
              {preview.sheet_count === 1 ? "" : "s"}
            </span>

            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              <Archive size={14} />
              Sheet names preserved in output files
            </span>

            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              .zip download with one .xlsx per sheet
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSplit}
          disabled={!canSplit}
          className="cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {loading ? "Splitting..." : "Split Workbook"}
        </button>
      </div>

      {error && <div className="text-sm" style={{ color: "var(--danger)" }}>{error}</div>}
    </div>
  );
}
