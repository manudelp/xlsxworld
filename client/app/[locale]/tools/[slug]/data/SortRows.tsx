"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";
import { sortRows, type SortKey } from "@/lib/tools/data";
import { EXCEL_ACCEPT, downloadToolResult, getSheetColumnNames, VISUAL_ELEMENTS_WARNING } from "../clean/shared";

export default function SortRows() {
  const t = useTranslations("common");
  const td = useTranslations("toolData.sort-rows");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [keys, setKeys] = useState<SortKey[]>([{ column: "", direction: "asc" }]);
  const [hasHeader, setHasHeader] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visualWarning, setVisualWarning] = useState(false);

  const onFile = useCallback(async (selected: File) => {
    setError(null);
    setFile(selected);
    setLoading(true);
    setVisualWarning(false);
    try {
      const wb = await uploadForPreview(selected, 5);
      setPreview(wb);
      setActiveSheet(0);
      setKeys([{ column: "", direction: "asc" }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("couldNotInspect"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const columns = preview ? getSheetColumnNames(preview, activeSheet) : [];
  const sheetName = preview?.sheets[activeSheet]?.name ?? "";

  function updateKey(idx: number, field: "column" | "direction", value: string) {
    setKeys((prev) => prev.map((k, i) => i === idx ? { ...k, [field]: value } : k));
  }

  async function handleProcess() {
    if (!file || !sheetName) return;
    const validKeys = keys.filter((k) => k.column);
    if (!validKeys.length) return;
    setError(null);
    setLoading(true);
    try {
      const result = await sortRows(file, sheetName, validKeys, hasHeader);
      setVisualWarning(downloadToolResult(result, "sorted.xlsx"));
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

      {visualWarning ? (
        <div className="tool-warning">{VISUAL_ELEMENTS_WARNING}</div>
      ) : null}

      {preview && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <div className="flex flex-wrap gap-2">
            {preview.sheets.map((s, i) => (
              <button key={s.name} type="button" onClick={() => { setActiveSheet(i); setKeys([{ column: "", direction: "asc" }]); }}
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

          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
            <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
            {td("firstRowIsHeader")}
          </label>

          {keys.map((k, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <select value={k.column} onChange={(e) => updateKey(idx, "column", e.target.value)}
                className="rounded border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)", color: "var(--foreground)" }}>
                <option value="">{td("selectColumn")}</option>
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={k.direction} onChange={(e) => updateKey(idx, "direction", e.target.value as "asc" | "desc")}
                className="rounded border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)", color: "var(--foreground)" }}>
                <option value="asc">{td("ascending")}</option>
                <option value="desc">{td("descending")}</option>
              </select>
              {keys.length > 1 && (
                <button type="button" onClick={() => setKeys((p) => p.filter((_, i) => i !== idx))}
                  className="text-xs" style={{ color: "var(--danger)" }}>✕</button>
              )}
            </div>
          ))}

          {keys.length < 3 && (
            <button type="button" onClick={() => setKeys((p) => [...p, { column: "", direction: "asc" }])}
              className="text-xs" style={{ color: "var(--muted)" }}>+ {td("addSortKey")}</button>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={handleProcess} disabled={loading || !keys.some((k) => k.column)}
              className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
              {loading ? t("processing") : td("process")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
