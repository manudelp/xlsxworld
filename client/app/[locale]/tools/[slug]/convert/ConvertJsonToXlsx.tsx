"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useState } from "react";
import { jsonToXlsx } from "@/lib/tools/convert";
import FileUploadDropzone from "@/components/common/FileUploadDropzone";

export default function ConvertJsonToXlsx() {
  const t = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [includeHeaders, setIncludeHeaders] = useState(true);

  const onFile = useCallback((selected: File) => {
    setError(null);
    setSuccess(false);
    setFile(selected);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) {
      setError(t("selectJsonFirst"));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const arrayBuffer = await jsonToXlsx(file, includeHeaders);
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
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("conversionFailed"));
    } finally {
      setLoading(false);
    }
  }, [file, includeHeaders, t]);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".json,application/json,text/json"
        message={t("dropJsonConvertXlsx")}
        hasError={!!error}
        onFiles={(files) => {
          const selected = files[0];
          if (selected) onFile(selected);
        }}
      />

      {file && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <h3 className="mb-2 font-medium">{t("acceptedJsonStructures")}</h3>
          <ul className="space-y-1 text-sm" style={{ color: "var(--muted)" }}>
            <li>{t("jsonArrayObjectsStructure")}</li>
            <li>{t("jsonArrayArraysStructure")}</li>
            <li>{t("jsonObjectArraysStructure")}</li>
          </ul>

          <label
            className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm"
            style={{ color: "var(--foreground)" }}
          >
            <input
              type="checkbox"
              checked={includeHeaders}
              onChange={(e) => setIncludeHeaders(e.target.checked)}
            />
            {t("includeColumnHeadersOutput")}
          </label>
        </div>
      )}

      {error && <div className="tool-error">{error}</div>}
      {success && <div className="tool-success">✓ {t("conversionComplete") ?? "File converted successfully"}</div>}

      {file && (
        <button
          onClick={() => void handleConvert()}
          disabled={!file || loading}
          className="tool-primary-action inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:ml-auto sm:flex"
        >
          {loading && <span className="tool-spinner" />}
          {loading ? t("converting") : t("convertToXlsx")}
        </button>
      )}
    </div>
  );
}
