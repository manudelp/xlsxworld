"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { freezeHeader } from "@/lib/tools/format";
import { EXCEL_ACCEPT, downloadXlsx } from "../clean/shared";

export default function FreezeHeader() {
  const t = useTranslations("common");
  const td = useTranslations("toolData.freeze-header");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleProcess() {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const buffer = await freezeHeader(file, rows);
      downloadXlsx(buffer, "frozen.xlsx");
    } catch (e) {
      setError(e instanceof Error ? e.message : td("processFailed"));
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
        onFiles={(files) => { if (files[0]) { setFile(files[0]); setError(null); } }}
      />

      {error && <div className="tool-error">{error}</div>}

      {file && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <label className="block text-sm" style={{ color: "var(--muted)" }}>
            {td("rowsToFreeze")}
            <input type="number" min={1} max={100} value={rows} onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-1 w-24 rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)", color: "var(--foreground)" }} />
          </label>
          <div className="flex justify-end">
            <button type="button" onClick={handleProcess} disabled={loading}
              className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
              {loading ? t("processing") : td("process")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
