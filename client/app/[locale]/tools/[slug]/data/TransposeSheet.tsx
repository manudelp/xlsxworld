"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";
import { transposeSheet } from "@/lib/tools/data";
import { EXCEL_ACCEPT, downloadXlsx } from "../clean/shared";

export default function TransposeSheet() {
  const t = useTranslations("common");
  const td = useTranslations("toolData.transpose-sheet");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(async (selected: File) => {
    setError(null);
    setFile(selected);
    setLoading(true);
    try {
      setPreview(await uploadForPreview(selected, 5));
      setActiveSheet(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("couldNotInspect"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  async function handleProcess() {
    if (!file || !preview) return;
    const sheetName = preview.sheets[activeSheet]?.name;
    if (!sheetName) return;
    setError(null);
    setLoading(true);
    try {
      const buffer = await transposeSheet(file, sheetName);
      downloadXlsx(buffer, "transposed.xlsx");
    } catch (e) {
      setError(e instanceof Error ? e.message : td("processFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <FileUploadDropzone accept={EXCEL_ACCEPT} message={td("dropMessage")} hasError={!!error}
        onFiles={(files) => { if (files[0]) void onFile(files[0]); }} />

      {error && <div className="tool-error">{error}</div>}

      {preview && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <h3 className="font-medium">{td("selectSheet")}</h3>
          <div className="flex flex-wrap gap-2">
            {preview.sheets.map((s, i) => (
              <button key={s.name} type="button" onClick={() => setActiveSheet(i)}
                className="cursor-pointer rounded-full border px-3 py-1 text-sm"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: i === activeSheet ? "var(--tag-selected-bg)" : "var(--tag-bg)",
                  color: i === activeSheet ? "var(--tag-selected-text)" : "var(--tag-text)",
                }}>
                {s.name}
              </button>
            ))}
          </div>
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
