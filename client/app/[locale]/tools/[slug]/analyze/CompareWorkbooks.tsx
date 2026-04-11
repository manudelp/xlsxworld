"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { compareWorkbooks, type CompareResult } from "@/lib/tools/analyze";
import { EXCEL_ACCEPT, downloadXlsx } from "../clean/shared";

export default function CompareWorkbooks() {
  const t = useTranslations("common");
  const td = useTranslations("toolData.compare-workbooks");
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  async function handleCompare() {
    if (!fileA || !fileB) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      setResult(await compareWorkbooks(fileA, fileB));
    } catch (e) {
      setError(e instanceof Error ? e.message : td("compareFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>{td("original")}</p>
          <FileUploadDropzone
            accept={EXCEL_ACCEPT}
            message={td("dropOriginal")}
            hasError={!!error}
            onFiles={(files) => { if (files[0]) { setFileA(files[0]); setResult(null); } }}
          />
          {fileA && <p className="text-xs" style={{ color: "var(--muted-2)" }}>{fileA.name}</p>}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>{td("modified")}</p>
          <FileUploadDropzone
            accept={EXCEL_ACCEPT}
            message={td("dropModified")}
            hasError={!!error}
            onFiles={(files) => { if (files[0]) { setFileB(files[0]); setResult(null); } }}
          />
          {fileB && <p className="text-xs" style={{ color: "var(--muted-2)" }}>{fileB.name}</p>}
        </div>
      </div>

      {fileA && fileB && !result && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleCompare()}
            className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? t("processing") : td("compare")}
          </button>
        </div>
      )}

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      {result && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <h3 className="font-medium">{td("resultsTitle")}</h3>
          <div className="rounded-md border p-3 text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)", color: "var(--muted)" }}>
            <p><strong>{td("sheetsAdded")}:</strong> {result.sheetsAdded}</p>
            <p><strong>{td("sheetsRemoved")}:</strong> {result.sheetsRemoved}</p>
            <p><strong>{td("sheetsModified")}:</strong> {result.sheetsModified}</p>
            <p><strong>{td("totalChangedCells")}:</strong> {result.totalChangedCells}</p>
            {result.totalChangedCells === 0 && result.sheetsAdded === 0 && result.sheetsRemoved === 0 && (
              <p className="mt-1">{td("noDifferences")}</p>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => downloadXlsx(result.buffer, "workbook-comparison.xlsx")}
              className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
            >
              {td("downloadReport")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
