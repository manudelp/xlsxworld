"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";
import { validateEmails, type EmailValidationResult } from "@/lib/tools/validate";
import { EXCEL_ACCEPT, downloadXlsx, getSheetColumnNames } from "../clean/shared";

export default function ValidateEmails() {
  const t = useTranslations("common");
  const td = useTranslations("toolData.validate-emails");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [column, setColumn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EmailValidationResult | null>(null);

  const onFile = useCallback(async (selected: File) => {
    setError(null);
    setResult(null);
    setFile(selected);
    setLoading(true);
    try {
      const wb = await uploadForPreview(selected, 5);
      setPreview(wb);
      setActiveSheet(0);
      setColumn("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("couldNotInspect"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const columns = preview ? getSheetColumnNames(preview, activeSheet) : [];
  const sheetName = preview?.sheets[activeSheet]?.name ?? "";

  async function handleProcess() {
    if (!file || !sheetName || !column) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      setResult(await validateEmails(file, sheetName, column));
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

      {preview && !result && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <div className="flex flex-wrap gap-2">
            {preview.sheets.map((s, i) => (
              <button key={s.name} type="button" onClick={() => { setActiveSheet(i); setColumn(""); }}
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
          <select value={column} onChange={(e) => setColumn(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)", color: "var(--foreground)" }}>
            <option value="">{td("selectColumn")}</option>
            {columns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex justify-end">
            <button type="button" onClick={handleProcess} disabled={loading || !column}
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
            <p>✅ <strong>{td("valid")}:</strong> {result.validCount}</p>
            <p>❌ <strong>{td("invalid")}:</strong> {result.invalidCount}</p>
            <p>⬜ <strong>{td("empty")}:</strong> {result.emptyCount}</p>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => downloadXlsx(result.buffer, "email-validation.xlsx")}
              className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium">
              {td("downloadReport")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
