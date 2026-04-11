"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";
import { passwordProtect } from "@/lib/tools/security";
import { EXCEL_ACCEPT, downloadXlsx } from "../clean/shared";

export default function PasswordProtect() {
  const t = useTranslations("common");
  const td = useTranslations("toolData.password-protect");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [protectStructure, setProtectStructure] = useState(true);
  const [protectContent, setProtectContent] = useState(true);
  const [protectFormatting, setProtectFormatting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(async (selected: File) => {
    setError(null);
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
    if (!file || !password) return;
    setError(null);
    setLoading(true);
    try {
      const sheets = Array.from(selectedSheets).join(",");
      const buffer = await passwordProtect(file, password, sheets, protectStructure, protectContent, protectFormatting);
      downloadXlsx(buffer, "protected.xlsx");
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

      <div className="rounded-md border p-3 text-xs" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)", color: "var(--muted)" }}>
        ⚠️ {td("limitation")}
      </div>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      {preview && (
        <div className="space-y-4 rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={td("passwordPlaceholder")}
              className="w-full rounded border px-3 py-2 pr-16 text-sm"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)", color: "var(--foreground)" }} />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--muted)" }}>
              {showPassword ? td("hide") : td("show")}
            </button>
          </div>

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

          <div className="space-y-1 text-sm" style={{ color: "var(--muted)" }}>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={protectStructure} onChange={(e) => setProtectStructure(e.target.checked)} />
              {td("protectStructure")}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={protectContent} onChange={(e) => setProtectContent(e.target.checked)} />
              {td("protectContent")}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={protectFormatting} onChange={(e) => setProtectFormatting(e.target.checked)} />
              {td("protectFormatting")}
            </label>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={handleProcess} disabled={loading || !password}
              className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
              {loading ? t("processing") : td("process")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
