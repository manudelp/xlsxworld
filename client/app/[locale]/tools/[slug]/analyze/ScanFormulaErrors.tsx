"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { scanFormulaErrors, type ScanResult } from "@/lib/tools/analyze";
import { EXCEL_ACCEPT, downloadXlsx } from "../clean/shared";

export default function ScanFormulaErrors() {
  const t = useTranslations("common");
  const td = useTranslations("toolData.scan-formula-errors");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      setResult(await scanFormulaErrors(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : td("scanFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept={EXCEL_ACCEPT}
        message={td("dropMessage")}
        hasError={!!error}
        onFiles={(files) => { if (files[0]) void handleFile(files[0]); }}
      />

      {loading && <p className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-2)" }}><span className="tool-spinner" />{t("uploadingScanning")}</p>}
      {error && <div className="tool-error">{error}</div>}

      {result && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <h3 className="font-medium">{td("resultsTitle")}</h3>
          <div className="rounded-md border p-3 text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)", color: "var(--muted)" }}>
            <p><strong>{td("totalErrors")}:</strong> {result.totalErrors}</p>
            {Object.keys(result.breakdown).length > 0 && (
              <ul className="mt-2 space-y-1">
                {Object.entries(result.breakdown).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                  <li key={type}>{type}: {count}</li>
                ))}
              </ul>
            )}
            {result.totalErrors === 0 && <p className="mt-1">{td("noErrorsFound")}</p>}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => downloadXlsx(result.buffer, "formula-errors-report.xlsx")}
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
