import { api } from "../api";

export async function passwordProtect(
  file: File,
  password: string,
  sheets: string,
  protectStructure: boolean,
  protectContent: boolean,
  protectFormatting: boolean,
): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("password", password);
  fd.append("sheets", sheets);
  fd.append("protect_structure", protectStructure ? "true" : "false");
  fd.append("protect_content", protectContent ? "true" : "false");
  fd.append("protect_formatting", protectFormatting ? "true" : "false");
  return api.postForm<ArrayBuffer>("/api/v1/tools/security/password-protect", fd);
}

export async function removePassword(file: File): Promise<ArrayBuffer> {
  const fd = new FormData();
  fd.append("file", file);
  return api.postForm<ArrayBuffer>("/api/v1/tools/security/remove-password", fd);
}
