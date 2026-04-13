"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useMemo, useState } from "react";
import { uploadForPreview, WorkbookPreview } from "@/lib/tools/inspect";
import { xlsxToPdf } from "@/lib/tools/convert";
import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import SheetPillsWithPreview from "@/components/common/SheetPillsWithPreview";

type ColumnMode = "ellipsis" | "wrap" | "fit";
type FontSize = "small" | "medium" | "large";
type HeaderStyle = "colored" | "gray" | "plain";
type PageSize = "A4" | "Letter" | "A3";

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  children,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <label className="block text-sm" style={{ color: "var(--muted)" }}>
        {label}
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="cursor-pointer rounded-md border px-3 py-1.5 text-sm"
            style={{
              borderColor: "var(--tag-border)",
              backgroundColor:
                value === o.value ? "var(--tag-selected-bg)" : "var(--tag-bg)",
              color:
                value === o.value
                  ? "var(--tag-selected-text)"
                  : "var(--tag-text)",
            }}
          >
            {o.label}
          </button>
        ))}
        {children}
      </div>
    </div>
  );
}

export default function ConvertXlsxToPdf() {
  const t = useTranslations("common");
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const [columnMode, setColumnMode] = useState<ColumnMode>("ellipsis");
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [headerStyle, setHeaderStyle] = useState<HeaderStyle>("colored");
  const [headerColor, setHeaderColor] = useState("#2E7D32");
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(
    async (nextFile: File) => {
      setError(null);
      setPreview(null);
      setSelectedSheets([]);
      setFile(nextFile);
      setLoading(true);
      setActiveSheet(0);
      try {
        const p = await uploadForPreview(nextFile, 25);
        setPreview(p);
        const firstSheet = p.sheets[0]?.name;
        setSelectedSheets(firstSheet ? [firstSheet] : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("uploadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const selectedSet = useMemo(() => new Set(selectedSheets), [selectedSheets]);
  const selectedSheet = preview?.sheets[activeSheet] ?? null;
  const canConvert = !!file && selectedSheets.length > 0 && !loading;

  const previewSheet = useCallback((idx: number) => {
    setActiveSheet(idx);
  }, []);

  const toggleSheet = useCallback((name: string) => {
    setSelectedSheets((cur) =>
      cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name],
    );
  }, []);

  const selectAll = useCallback(() => {
    if (preview) setSelectedSheets(preview.sheets.map((s) => s.name));
  }, [preview]);

  const clearSelection = useCallback(() => setSelectedSheets([]), []);

  const download = useCallback(async () => {
    if (!file || selectedSheets.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const buf = await xlsxToPdf(
        file,
        selectedSheets,
        orientation,
        columnMode,
        fontSize,
        headerStyle,
        pageSize,
        headerStyle === "colored" ? headerColor : undefined,
      );
      const blob = new Blob([buf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      a.download = `${baseName || "workbook"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("exportFailed"));
    } finally {
      setLoading(false);
    }
  }, [file, selectedSheets, orientation, columnMode, fontSize, headerStyle, headerColor, pageSize, t]);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".xls,.xlsx,.xlsm,.xlsb,.xltx,.xltm,.xlam,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.binary.macroEnabled.12,application/vnd.ms-excel.sheet.macroEnabled.12,application/octet-stream"
        message={t("dropExcelConvertPdf")}
        hasError={!!error}
        onFiles={(files) => {
          const f = files[0];
          if (f) void onFile(f);
        }}
      />

      {loading && !preview && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-2)" }}>
          <span className="tool-spinner" />
          {t("uploadingScanning")}
        </div>
      )}
      {error && <div className="tool-error">{error}</div>}

      {preview && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          {/* Sheet selection */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-medium">{t("selectSheetsToExportPdf")}</h3>
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                {t("sheetCount", { count: preview.sheet_count })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="cursor-pointer rounded-md border px-3 py-1.5 text-sm"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: "var(--tag-bg)",
                  color: "var(--tag-text)",
                }}
              >
                {t("selectAll")}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="cursor-pointer rounded-md border px-3 py-1.5 text-sm"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: "var(--tag-bg)",
                  color: "var(--tag-text)",
                }}
              >
                {t("clear")}
              </button>
            </div>
          </div>

          <SheetPillsWithPreview
            sheets={preview.sheets}
            selectedSet={selectedSet}
            activeSheetIdx={activeSheet}
            onPreview={previewSheet}
            onToggle={toggleSheet}
          />

          {/* Text overflow */}
          <OptionGroup<ColumnMode>
            label={t("textOverflow")}
            value={columnMode}
            onChange={setColumnMode}
            options={[
              { value: "ellipsis", label: t("ellipsisColumns") },
              { value: "wrap", label: t("wrapText") },
              { value: "fit", label: t("fitColumns") },
            ]}
          />

          {/* Page orientation */}
          <OptionGroup<"portrait" | "landscape">
            label={t("pageOrientation")}
            value={orientation}
            onChange={setOrientation}
            options={[
              { value: "landscape", label: t("landscape") },
              { value: "portrait", label: t("portrait") },
            ]}
          />

          {/* Page size */}
          <OptionGroup<PageSize>
            label={t("pdfPageSize")}
            value={pageSize}
            onChange={setPageSize}
            options={[
              { value: "A4", label: "A4" },
              { value: "Letter", label: "Letter" },
              { value: "A3", label: "A3" },
            ]}
          />

          {/* Font size */}
          <OptionGroup<FontSize>
            label={t("pdfFontSize")}
            value={fontSize}
            onChange={setFontSize}
            options={[
              { value: "small", label: t("fontSizeSmall") },
              { value: "medium", label: t("fontSizeMedium") },
              { value: "large", label: t("fontSizeLarge") },
            ]}
          />

          {/* Header style + optional color picker */}
          <OptionGroup<HeaderStyle>
            label={t("headerStyle")}
            value={headerStyle}
            onChange={setHeaderStyle}
            options={[
              { value: "colored", label: t("headerStyleColored") },
              { value: "gray", label: t("headerStyleGray") },
              { value: "plain", label: t("headerStylePlain") },
            ]}
          >
            {headerStyle === "colored" && (
              <label
                className="flex items-center gap-1.5 cursor-pointer"
                title={t("headerColor")}
              >
                <span
                  className="h-7 w-7 rounded border"
                  style={{
                    backgroundColor: headerColor,
                    borderColor: "var(--tag-border)",
                  }}
                />
                <input
                  type="color"
                  value={headerColor}
                  onChange={(e) => setHeaderColor(e.target.value)}
                  className="sr-only"
                />
              </label>
            )}
          </OptionGroup>
        </div>
      )}

      {preview && selectedSheet && (
        <div
          className="scrollbar-themed overflow-x-auto border rounded"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <table className="min-w-full text-left text-sm">
            <thead style={{ backgroundColor: "var(--surface-2)" }}>
              <tr>
                {selectedSheet.headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-2 py-1 border"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  >
                    {h ?? "-"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedSheet.sample.map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) => (
                    <td
                      key={ci}
                      className="px-2 py-1 border"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                    >
                      {c ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div className="flex justify-end">
          <button
            onClick={() => void download()}
            disabled={!canConvert}
            className="tool-primary-action inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <span className="tool-spinner" />}
            {loading ? t("exporting") : t("downloadPdf")}
          </button>
        </div>
      )}
    </div>
  );
}
