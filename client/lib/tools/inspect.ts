import { api } from '../api';

// A single worksheet cell value as returned by the API
export type Cell = string | number | boolean | null;
export type Row = Cell[];

export interface SheetPreview {
  name: string;
  headers: Cell[];
  sample: Row[]; // sample rows excluding header
  total_rows: number; // includes header if present
}

export interface WorkbookPreview {
  token: string;
  sheets: SheetPreview[];
  sheet_count: number;
}

export interface SheetPage {
  sheet: string;
  header: Cell[] | null;
  rows: Row[];
  offset: number;
  limit: number;
  total_rows: number;
  done: boolean;
}

export async function uploadForPreview(file: File, sampleRows = 25): Promise<WorkbookPreview> {
  const fd = new FormData();
  fd.append('file', file);
  return api.postForm<WorkbookPreview>('/api/inspect/preview', fd, { sample_rows: sampleRows });
}

export async function fetchSheetPage(token: string, sheet: string, offset: number, limit: number): Promise<SheetPage> {
  return api.get<SheetPage>('/api/inspect/sheet', { token, sheet, offset, limit });
}

export function exportCsvUrl(token: string, sheet: string): string {
  return `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/inspect/export/csv?token=${encodeURIComponent(token)}&sheet=${encodeURIComponent(sheet)}`;
}

export function exportJsonUrl(token: string, sheet: string): string {
  return `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/inspect/export/json?token=${encodeURIComponent(token)}&sheet=${encodeURIComponent(sheet)}`;
}
