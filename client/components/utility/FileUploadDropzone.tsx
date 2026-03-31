"use client";

import type { CSSProperties } from "react";

type FileUploadDropzoneProps = {
  accept: string;
  message: string;
  onFiles: (files: FileList) => void;
  multiple?: boolean;
  className?: string;
  style?: CSSProperties;
  hasError?: boolean;
};

export default function FileUploadDropzone({
  accept,
  message,
  onFiles,
  multiple = false,
  className,
  style,
  hasError = false,
}: FileUploadDropzoneProps) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const dropped = e.dataTransfer.files;
        if (dropped.length > 0) onFiles(dropped);
      }}
    >
      <label
        className={
          className ||
          `group flex min-h-[160px] h-40 w-full cursor-pointer flex-col items-center justify-center p-6 text-center rounded-xl border-2 border-dashed transition-all duration-200 
          ${hasError 
            ? "border-[var(--danger)] bg-[var(--danger-soft)]" 
            : "border-[var(--border)] bg-[var(--background)] hover:border-primary hover:bg-primary-soft"
          }`
        }
        style={style}
      >
        <div className={`mb-3 rounded-full p-3 transition-colors ${hasError ? 'bg-[var(--danger)] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary group-hover:text-white'}`}>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            if (files && files.length > 0) onFiles(files);
          }}
        />
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          {message}
        </span>
      </label>
    </div>
  );
}
