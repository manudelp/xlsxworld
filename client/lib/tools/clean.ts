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
