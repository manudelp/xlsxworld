"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useMemo, useState } from "react";
import { Layers3, Scissors } from "lucide-react";
import { splitSheet } from "@/lib/tools/split";
import FileUploadDropzone from "@/components/common/FileUploadDropzone";
import { uploadForPreview, type WorkbookPreview } from "@/lib/tools/inspect";

type NumberingStyle =
  | "numeric"
  | "numeric-padded"
  | "alpha-upper"
  | "alpha-lower"
  | "roman-upper"
  | "roman-lower"
  | "custom";

function alphaToken(index: number, lowercase = false): string {
  let n = Math.max(1, index);
  let out = "";
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return lowercase ? out.toLowerCase() : out;
}

function romanToken(index: number, lowercase = false): string {
  let n = Math.max(1, index);
  const table: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  for (const [value, symbol] of table) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return lowercase ? out.toLowerCase() : out;
}

function tokenForStyle(
  index: number,
  style: NumberingStyle,
  customTokens: string[],
): string {
  switch (style) {
    case "numeric":
      return String(index);
    case "numeric-padded":
      return String(index).padStart(2, "0");
    case "alpha-upper":
      return alphaToken(index, false);
    case "alpha-lower":
      return alphaToken(index, true);
    case "roman-upper":
      return romanToken(index, false);
    case "roman-lower":
      return romanToken(index, true);
    case "custom":
      return customTokens[index - 1] ?? String(index);
    default:
      return String(index);
  }
}

export default function SplitSheet() {
  const t = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [fileName, setFileName] = useState("");
  const [chunkSize, setChunkSize] = useState(1000);
  const [partBase, setPartBase] = useState("part");
  const [partSeparator, setPartSeparator] = useState("_");
  const [numberingStyle, setNumberingStyle] = useState<NumberingStyle>("numeric");
  const [customSequenceInput, setCustomSequenceInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const onFile = useCallback(async (selected: File) => {
    setError(null);
    setFile(selected);
    setPreview(null);
    setSheetName("");
    setPartBase("part");
    setPartSeparator("_");
    setNumberingStyle("numeric");
    setCustomSequenceInput("");
    setFileName(selected.name);
    setPreviewLoading(true);

    try {
      const workbook = await uploadForPreview(selected, 1);
      setPreview(workbook);
      const firstSheet = workbook.sheets[0]?.name ?? "";
      setSheetName(firstSheet);

      if (!firstSheet) {
        setError(t("noSheetsDetected"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("couldNotInspect"));
    } finally {
      setPreviewLoading(false);
    }
  }, [t]);

  const selectedSheet = useMemo(
    () => preview?.sheets.find((sheet) => sheet.name === sheetName) ?? null,
    [preview, sheetName],
  );

  const dataRows = Math.max(0, (selectedSheet?.total_rows ?? 0) - 1);
  const rowsPerPart = Math.max(1, chunkSize - 1);
  const estimatedParts = dataRows === 0 ? 1 : Math.ceil(dataRows / rowsPerPart);
  const customTokens = useMemo(
    () =>
      customSequenceInput
        .split(/\r?\n/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0),
    [customSequenceInput],
  );
  const ignoredCustomTokens = Math.max(0, customTokens.length - estimatedParts);
  const isCustomMissingTokens = numberingStyle === "custom" && customTokens.length === 0;
  const namingPreview = useMemo(() => {
    return [1, 2, 3]
      .map((index) => {
        const token = tokenForStyle(index, numberingStyle, customTokens);
        return `${partBase}${partSeparator}${token}`;
      })
      .join(", ");
  }, [customTokens, numberingStyle, partBase, partSeparator]);
  const canSplit =
    !!file &&
    !!sheetName.trim() &&
    chunkSize >= 2 &&
    !isCustomMissingTokens &&
    !loading &&
    !previewLoading;

  const handleSplit = useCallback(async () => {
    if (!file) {
      setError(t("selectExcelFirst"));
      return;
    }

    if (!sheetName.trim()) {
      setError(t("sheetNameRequired"));
      return;
    }

    if (chunkSize < 2) {
      setError(t("chunkSizeMin"));
      return;
    }

    if (numberingStyle === "custom" && customTokens.length === 0) {
      setError(t("addCustomToken"));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const buffer = await splitSheet(
        file,
        sheetName.trim(),
        chunkSize,
        {
          baseName: partBase,
          separator: partSeparator,
          numberingStyle,
          customSequence: customTokens,
        },
      );
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      a.download = `${baseName || "split"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("splitFailed"));
    } finally {
      setLoading(false);
    }
  }, [
    chunkSize,
    customTokens,
    file,
    numberingStyle,
    partBase,
    partSeparator,
    sheetName,
    t,
  ]);

  return (
    <div className="space-y-4">
      <FileUploadDropzone
        accept=".xls,.xlsx,.xlsm,.xlsb,.xltx,.xltm,.xlam,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.binary.macroEnabled.12,application/vnd.ms-excel.sheet.macroEnabled.12"
        message={t("dropExcelSplitSheet")}
        hasError={!!error}
        onFiles={(files) => {
          const selected = files[0];
          if (selected) void onFile(selected);
        }}
      />

      {previewLoading && (
        <div className="text-sm" style={{ color: "var(--muted-2)" }}>
          Reading workbook structure...
        </div>
      )}

      {preview && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-medium">{t("selectSheet")}</h3>
              <p className="text-sm" style={{ color: "var(--muted-2)" }}>
                {fileName || t("uploadedWorkbook")} - {preview.sheet_count} sheet
                {preview.sheet_count === 1 ? "" : "s"}
              </p>
            </div>
            <span
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              1 sheet output per split chunk
            </span>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {preview.sheets.map((sheet) => {
              const isSelected = sheet.name === sheetName;
              return (
                <button
                  key={sheet.name}
                  type="button"
                  onClick={() => setSheetName(sheet.name)}
                  className="cursor-pointer rounded-full border px-3 py-1 text-sm transition"
                  style={{
                    borderColor: "var(--tag-border)",
                    backgroundColor: isSelected
                      ? "var(--tag-selected-bg)"
                      : "var(--tag-bg)",
                    color: isSelected
                      ? "var(--tag-selected-text)"
                      : "var(--tag-text)",
                  }}
                  aria-pressed={isSelected}
                >
                  {sheet.name}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-sm" style={{ color: "var(--muted)" }}>
              Rows per chunk (including header)
              <input
                type="number"
                min={2}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                  color: "var(--foreground)",
                }}
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
              />
            </label>

            <div className="pt-0.5">
              <p className="mb-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
                Chunk presets
              </p>
              <div className="flex flex-wrap gap-2">
                {[250, 500, 1000, 5000].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setChunkSize(size)}
                    className="cursor-pointer rounded-md border px-2.5 py-1 text-xs"
                    style={{
                      borderColor: "var(--tag-border)",
                      backgroundColor:
                        chunkSize === size
                          ? "var(--tag-selected-bg)"
                          : "var(--tag-bg)",
                      color:
                        chunkSize === size
                          ? "var(--tag-selected-text)"
                          : "var(--tag-text)",
                    }}
                  >
                    {size.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-sm" style={{ color: "var(--muted)" }}>
              Base name
              <input
                value={partBase}
                onChange={(e) => setPartBase(e.target.value)}
                placeholder="part"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                  color: "var(--foreground)",
                }}
              />
            </label>

            <label className="block text-sm" style={{ color: "var(--muted)" }}>
              Separator
              <input
                value={partSeparator}
                onChange={(e) => setPartSeparator(e.target.value)}
                placeholder="_"
                maxLength={4}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                  color: "var(--foreground)",
                }}
              />
            </label>

            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
                Numbering style
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["numeric", "1, 2, 3"],
                  ["numeric-padded", "01, 02, 03"],
                  ["alpha-upper", "A, B, C"],
                  ["alpha-lower", "a, b, c"],
                  ["roman-upper", "I, II, III"],
                  ["roman-lower", "i, ii, iii"],
                  ["custom", t("custom")],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNumberingStyle(value as NumberingStyle)}
                    className="cursor-pointer rounded-md border px-2.5 py-1 text-xs"
                    style={{
                      borderColor: "var(--tag-border)",
                      backgroundColor:
                        numberingStyle === value
                          ? "var(--tag-selected-bg)"
                          : "var(--tag-bg)",
                      color:
                        numberingStyle === value
                          ? "var(--tag-selected-text)"
                          : "var(--tag-text)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {numberingStyle === "custom" ? (
              <label
                className="block text-sm md:col-span-2"
                style={{ color: "var(--muted)" }}
              >
                Custom token sequence (one per line)
                <textarea
                  value={customSequenceInput}
                  onChange={(e) => setCustomSequenceInput(e.target.value)}
                  placeholder={["01", "A", "B"].join("\n")}
                  className="mt-1 min-h-24 w-full rounded border px-3 py-2 text-sm"
                  style={{
                    borderColor: isCustomMissingTokens ? "var(--danger)" : "var(--border)",
                    backgroundColor: "var(--surface-2)",
                    color: "var(--foreground)",
                  }}
                />
                <span className="mt-1 block text-xs" style={{ color: "var(--muted-2)" }}>
                  Token 1 maps to part 1, token 2 to part 2. Missing tokens fall back to numeric values.
                </span>
              </label>
            ) : null}

            <div
              className="rounded-md border px-3 py-2 text-xs md:col-span-2"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-2)",
                color: "var(--muted-2)",
              }}
            >
              Name preview: {namingPreview}
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
            color: "var(--muted-2)",
          }}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium" style={{ color: "var(--foreground)" }}>
              Split summary
            </div>
            {selectedSheet ? (
              <span
                className="rounded-full border px-2 py-0.5 text-xs"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: "var(--tag-bg)",
                  color: "var(--tag-text)",
                }}
              >
                {selectedSheet.name}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5 overflow-hidden whitespace-nowrap">
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              <Layers3 size={14} />
              {dataRows.toLocaleString()} data rows
            </span>

            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              <Scissors size={14} />
              ~{estimatedParts.toLocaleString()} split sheet
              {estimatedParts === 1 ? "" : "s"}
            </span>

            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: "var(--tag-border)",
                backgroundColor: "var(--tag-bg)",
                color: "var(--tag-text)",
              }}
            >
              {rowsPerPart.toLocaleString()} rows per chunk part
            </span>

            {numberingStyle === "custom" ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: "var(--tag-bg)",
                  color: "var(--tag-text)",
                }}
              >
                {Math.min(customTokens.length, estimatedParts).toLocaleString()} custom token
                {Math.min(customTokens.length, estimatedParts) === 1 ? "" : "s"}
              </span>
            ) : null}

            {numberingStyle === "custom" && ignoredCustomTokens > 0 ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                style={{
                  borderColor: "var(--tag-border)",
                  backgroundColor: "var(--tag-bg)",
                  color: "var(--tag-text)",
                }}
              >
                {ignoredCustomTokens.toLocaleString()} extra token
                {ignoredCustomTokens === 1 ? "" : "s"} ignored
              </span>
            ) : null}
          </div>
        </div>
      )}

      {file && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "var(--muted-2)" }}>
            Output names follow your base name and numbering style, like sheet_01 or chunk_A.
          </p>

          <button
            onClick={handleSplit}
            disabled={!canSplit}
            className="tool-primary-action cursor-pointer rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t("splitting") : t("split")}
          </button>
        </div>
      )}

      {error && <div className="text-sm" style={{ color: "var(--danger)" }}>{error}</div>}
    </div>
  );
}
