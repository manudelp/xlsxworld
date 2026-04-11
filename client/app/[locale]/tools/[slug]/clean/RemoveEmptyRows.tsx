"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";
import { removeEmptyRows, type RemoveEmptyRowsResult } from "@/lib/tools/clean";
import { EXCEL_ACCEPT, downloadXlsx } from "../clean/shared";

export default function RemoveEmptyRows() {
  const t = useTranslations("common");
  const td = useTranslations("toolData.remove-empty-rows");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RemoveEmptyRowsResult | null>(null);

  const onFile = useCallback(async (selected: File) => {
    setError(null);
    setResult(null);
    setFile(selected);
    setLoading(true);
    try {
      const wb = await uploadForPreview(selected, 5);
      setPreview(wb);
      setSelectedSheets(new Set(wb.sheets.map((s) => s.name)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("couldNotInspect"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const toggleSheet = (name: string) => {
    setSelectedSheets((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  async function handleProcess() {
    if (!file) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const sheets = Array.from(selectedSheets).join(",");
      setResult(await removeEmptyRows(file, sheets));
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
        onFiles={(files) => { if (files[0]) void onFile(files[0]); }}
      />

      {loading && !result && <p className="text-sm" style={{ color: "var(--muted-2)" }}>{t("processing")}</p>}
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      {preview && !result && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <h3 className="font-medium">{td("selectSheets")}</h3>
          <div className="flex flex-wrap gap-2">
            {preview.sheets.map((s) => (
              <button key={s.name} type="button" onClick={() => toggleSheet(s.name)}
                className="cursor-pointer rounded-full border px-3 py-1 text-sm"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: selectedSheets.has(s.name) ? "var(--tag-selected-bg)" : "var(--tag-bg)",
                  color: selectedSheets.has(s.name) ? "var(--tag-selected-text)" : "var(--tag-text)",
                }}>
                {s.name}
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleProcess} disabled={loading || selectedSheets.size === 0}
              className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
              {loading ? t("processing") : td("process")}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <h3 className="font-medium">{td("resultsTitle")}</h3>
          <div className="rounded-md border p-3 text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)", color: "var(--muted)" }}>
            <p><strong>{td("rowsRemoved")}:</strong> {result.rowsRemoved}</p>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => downloadXlsx(result.buffer, "cleaned.xlsx")}
              className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium">
              {t("downloadCleanWorkbook")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
