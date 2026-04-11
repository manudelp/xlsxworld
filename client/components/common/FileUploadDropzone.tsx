"use client";

import { useState, type CSSProperties } from "react";

type FileUploadDropzoneProps = {
  accept: string;
  message: string;
  onFiles: (files: FileList) => void;
  multiple?: boolean;
  className?: string;
  style?: CSSProperties;
  hasError?: boolean;
  maxSizeLabel?: string;
  unsupportedFileError?: string;
};

function extractExtensions(accept: string): string[] {
  return accept
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.startsWith("."));
}

function hasValidExtension(file: File, extensions: string[]): boolean {
  if (extensions.length === 0) return true;
  const name = file.name.toLowerCase();
  return extensions.some((ext) => name.endsWith(ext));
}

export default function FileUploadDropzone({
  accept,
  message,
  onFiles,
  multiple = false,
  className,
  style,
  hasError = false,
  maxSizeLabel,
  unsupportedFileError,
}: FileUploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [hover, setHover] = useState(false);
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const extensions = extractExtensions(accept);

  const validateAndForward = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter((f) => hasValidExtension(f, extensions));
    if (valid.length === 0 && arr.length > 0) {
      setRejectionError(
        unsupportedFileError ?? "Unsupported file type. Please upload a valid file.",
      );
      return;
    }
    setRejectionError(null);
    const dt = new DataTransfer();
    valid.forEach((f) => dt.items.add(f));
    onFiles(dt.files);
  };

  const needsTint = !hasError && (dragOver || hover);

  return (
      <label
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          const dropped = e.dataTransfer.files;
          if (dropped.length > 0) validateAndForward(dropped);
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={
          className ||
          `group flex min-h-[160px] h-40 w-full cursor-pointer flex-col items-center justify-center p-6 text-center rounded-xl border-2 border-dashed transition-all duration-200 
          ${hasError 
            ? "border-[var(--danger)] bg-[var(--danger-soft)]"
            : dragOver
              ? "border-primary scale-[1.01] shadow-md ring-2 ring-primary/25"
              : hover
                ? "border-primary"
                : "border-[var(--border)] bg-[var(--background)]"
          }`
        }
        style={{
          ...style,
          ...(needsTint && {
            backgroundColor: "color-mix(in srgb, var(--background) 88%, var(--primary) 12%)",
          }),
        }}
      >
        <div className={`mb-3 rounded-full p-3 transition-all duration-200 ${hasError ? 'bg-[var(--danger)] text-white' : dragOver ? 'bg-primary text-white scale-110' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary group-hover:text-white'}`}>
          <svg className={`h-6 w-6 transition-transform duration-200 ${dragOver ? '-translate-y-0.5' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <input
          type="file"
          accept={accept}
          className="hidden"
          multiple={multiple}
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) validateAndForward(files);
            e.target.value = "";
          }}
        />
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          {message}
        </span>
        <span className="text-xs mt-1" style={{ color: "var(--muted-2)" }}>
          {maxSizeLabel ?? "Max 20 MB per file"}
        </span>
        {rejectionError && (
          <span className="text-xs mt-1 font-medium" style={{ color: "var(--danger)" }}>
            {rejectionError}
          </span>
        )}
      </label>
  );
}
