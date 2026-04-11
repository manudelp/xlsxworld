"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useState } from "react";
import { pdfToXlsx } from "@/lib/tools/convert";
import FileUploadDropzone from "@/components/common/FileUploadDropzone";

export default function ConvertPdfToXlsx() {
  const t = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [oneSheetPerPage, setOneSheetPerPage] = useState(false);

  const onFile = useCallback((selected: File) => {
    setError(null);
    setFile(selected);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const buf = await pdfToXlsx(file, includeHeaders, oneSheetPerPage);
      const blob = new Blob([buf], {
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
      setError(e instanceof Error ? e.message : t("conversionFailed"));
    } finally {
      setLoading(false);
    }
  }, [file, includeHeaders, oneSheetPerPage, t]);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".pdf,application/pdf"
        message={t("dropPdfConvertXlsx")}
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
          {t("selectedFile")} <strong>{file.name}</strong> (
          {(file.size / 1024).toFixed(1)} KB)
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
          <h3 className="mb-2 font-medium">{t("pdfToXlsxInfo")}</h3>
          <ul className="space-y-1 text-sm" style={{ color: "var(--muted)" }}>
            <li>{t("pdfTablesExtracted")}</li>
            <li>{t("pdfComplexLayoutsNote")}</li>
          </ul>

          <div className="mt-4 flex flex-col gap-2">
            <label
              className="inline-flex cursor-pointer items-center gap-2 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              <input
                type="checkbox"
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
              />
              {t("includeColumnHeadersOutput")}
            </label>
            <label
              className="inline-flex cursor-pointer items-center gap-2 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              <input
                type="checkbox"
                checked={oneSheetPerPage}
                onChange={(e) => setOneSheetPerPage(e.target.checked)}
              />
              {t("oneSheetPerPage")}
            </label>
          </div>
        </div>
      )}

      {file && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "var(--muted-2)" }}>
            {t("pdfToXlsxNote")}
          </p>
          <button
            onClick={() => void handleConvert()}
            disabled={!file || loading}
            className="tool-primary-action cursor-pointer rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t("converting") : t("convertToXlsx")}
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
