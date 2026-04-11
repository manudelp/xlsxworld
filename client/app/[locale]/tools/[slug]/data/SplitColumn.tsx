"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";
import { splitColumn } from "@/lib/tools/data";
import { EXCEL_ACCEPT, downloadXlsx, getSheetColumnNames } from "../clean/shared";

const DELIMITERS = [
  { value: "comma", label: "Comma (,)" },
  { value: "space", label: "Space" },
  { value: "dash", label: "Dash (-)" },
  { value: "semicolon", label: "Semicolon (;)" },
  { value: "pipe", label: "Pipe (|)" },
];

export default function SplitColumn() {
  const t = useTranslations("common");
  const td = useTranslations("toolData.split-column");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [column, setColumn] = useState("");
  const [delimiter, setDelimiter] = useState("comma");
  const [customDelimiter, setCustomDelimiter] = useState("");
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(async (selected: File) => {
    setError(null);
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
    setLoading(true);
    try {
      const delim = delimiter === "custom" ? customDelimiter : delimiter;
      const buffer = await splitColumn(file, sheetName, column, delim, keepOriginal);
      downloadXlsx(buffer, "split-column.xlsx");
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

          <div className="flex flex-wrap items-center gap-2">
            <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}
              className="rounded border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)", color: "var(--foreground)" }}>
              {DELIMITERS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              <option value="custom">{t("custom")}</option>
            </select>
            {delimiter === "custom" && (
              <input value={customDelimiter} onChange={(e) => setCustomDelimiter(e.target.value)} placeholder={td("customDelimiter")}
                className="rounded border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)", color: "var(--foreground)" }} />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
            <input type="checkbox" checked={keepOriginal} onChange={(e) => setKeepOriginal(e.target.checked)} />
            {td("keepOriginal")}
          </label>

          <div className="flex justify-end">
            <button type="button" onClick={handleProcess} disabled={loading || !column}
              className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
              {loading ? t("processing") : td("process")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
