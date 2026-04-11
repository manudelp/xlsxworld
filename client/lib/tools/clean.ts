import { api } from "../api";

export interface CleanTargetOptions {
  sheet?: string;
  allSheets?: boolean;
  columns?: string[];
}

function appendTargetOptions(fd: FormData, options: CleanTargetOptions): void {
  fd.append("sheet", options.sheet ?? "");
  fd.append("all_sheets", options.allSheets ? "true" : "false");
  if (options.columns && options.columns.length > 0) {
    fd.append("columns", options.columns.join(","));
  }
}

export async function removeDuplicates(
  file: File,
  options: CleanTargetOptions,
  keep: "first" | "last" = "first",
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("keep", keep);
  appendTargetOptions(fd, options);
  return api.postForm<ArrayBuffer>("/api/v1/tools/clean/remove-duplicates", fd);
}

export async function trimSpaces(
  file: File,
  options: CleanTargetOptions,
  collapseInternalSpaces = false,
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("collapse_internal_spaces", collapseInternalSpaces ? "true" : "false");
  appendTargetOptions(fd, options);
  return api.postForm<ArrayBuffer>("/api/v1/tools/clean/trim-spaces", fd);
}

export async function normalizeCase(
  file: File,
  options: CleanTargetOptions,
  mode: "lower" | "upper" | "title",
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("mode", mode);
  appendTargetOptions(fd, options);
  return api.postForm<ArrayBuffer>("/api/v1/tools/clean/normalize-case", fd);
}

export async function findReplace(
  file: File,
  options: CleanTargetOptions,
  config: {
    findText: string;
    replaceText: string;
    useRegex: boolean;
    matchCase: boolean;
  },
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("find_text", config.findText);
  fd.append("replace_text", config.replaceText);
  fd.append("use_regex", config.useRegex ? "true" : "false");
  fd.append("match_case", config.matchCase ? "true" : "false");
  appendTargetOptions(fd, options);
  return api.postForm<ArrayBuffer>("/api/v1/tools/clean/find-replace", fd);
}

import { buildUrl } from "../api";

async function postFormWithHeaders(
  path: string,
  form: FormData,
): Promise<{ buffer: ArrayBuffer; headers: Headers }> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch { /* use statusText */ }
    throw new Error(detail);
  }
  const buffer = await res.arrayBuffer();
  return { buffer, headers: res.headers };
}

export interface RemoveEmptyRowsResult {
  buffer: ArrayBuffer;
  rowsRemoved: number;
}

export async function removeEmptyRows(
  file: File,
  sheets: string,
): Promise<RemoveEmptyRowsResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sheets", sheets);
  const { buffer, headers } = await postFormWithHeaders("/api/v1/tools/clean/remove-empty-rows", fd);
  return {
    buffer,
    rowsRemoved: parseInt(headers.get("X-Rows-Removed") || "0", 10),
  };
}
