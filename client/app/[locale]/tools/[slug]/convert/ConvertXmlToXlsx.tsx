"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { xmlToXlsx } from "@/lib/tools/convert";
import FileUploadDropzone from "@/components/common/FileUploadDropzone";

export default function ConvertXmlToXlsx() {
  const t = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [includeHeaders, setIncludeHeaders] = useState(true);

  const onFile = useCallback((selected: File) => {
    setError(null);
    setFile(selected);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const buf = await xmlToXlsx(file, includeHeaders);
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
      toast.success(t("conversionComplete"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("conversionFailed"));
    } finally {
      setLoading(false);
    }
  }, [file, includeHeaders, t]);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".xml,application/xml,text/xml"
        message={t("dropXmlConvertXlsx")}
        hasError={!!error}
        onFiles={(files) => {
          const selected = files[0];
          if (selected) onFile(selected);
        }}
      />

      {file && (
        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
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
        </div>
      )}

      {error && <div className="tool-error">{error}</div>}

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
