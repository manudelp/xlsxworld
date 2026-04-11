"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useState } from "react";
import { csvToXlsx } from "@/lib/tools/convert";
import FileUploadDropzone from "@/components/common/FileUploadDropzone";

export default function ConvertCsvToXlsx() {
  const t = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [delimiter, setDelimiter] = useState(",");
  const [sheetName, setSheetName] = useState("Sheet1");

  const canConvert =
    !!file && !loading && !!sheetName.trim() && delimiter.length > 0;

  const onFile = useCallback((selected: File) => {
    setError(null);
    setSuccess(false);
    setFile(selected);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) {
      setError(t("selectCsvFirst"));
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
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("conversionFailed"));
    } finally {
      setLoading(false);
    }
  }, [file, sheetName, delimiter, t]);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".csv,text/csv"
        message={t("dropCsvConvert")}
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
                      {value === "\t" ? t("tab") : value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="tool-error">{error}</div>}
      {success && <div className="tool-success">✓ {t("conversionComplete") ?? "File converted successfully"}</div>}

      {file && (
        <button
          onClick={handleConvert}
          disabled={!canConvert}
          className="tool-primary-action inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:ml-auto sm:flex"
        >
          {loading && <span className="tool-spinner" />}
          {loading ? t("converting") : t("convertToXlsx")}
        </button>
      )}
    </div>
  );
}
