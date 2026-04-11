"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { removePassword } from "@/lib/tools/security";
import { EXCEL_ACCEPT, downloadXlsx } from "../clean/shared";

export default function RemovePassword() {
  const t = useTranslations("common");
  const td = useTranslations("toolData.remove-password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const buffer = await removePassword(file);
      downloadXlsx(buffer, "unprotected.xlsx");
    } catch (e) {
      setError(e instanceof Error ? e.message : td("processFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <FileUploadDropzone accept={EXCEL_ACCEPT} message={td("dropMessage")} hasError={!!error}
        onFiles={(files) => { if (files[0]) void handleFile(files[0]); }} />

      <div className="rounded-md border p-3 text-xs" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)", color: "var(--muted)" }}>
        ⚠️ {td("limitation")}
      </div>

      {loading && <p className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-2)" }}><span className="tool-spinner" />{t("processing")}</p>}
      {error && <div className="tool-error">{error}</div>}
    </div>
  );
}
