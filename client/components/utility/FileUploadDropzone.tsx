"use client";

import type { CSSProperties } from "react";

type FileUploadDropzoneProps = {
  accept: string;
  message: string;
  onFiles: (files: FileList) => void;
  multiple?: boolean;
  className?: string;
  style?: CSSProperties;
};

export default function FileUploadDropzone({
  accept,
  message,
  onFiles,
  multiple = false,
  className,
  style,
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
          "flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition"
        }
        style={{
          backgroundColor: "var(--background)",
          borderColor: "var(--border)",
          ...style,
        }}
      >
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
