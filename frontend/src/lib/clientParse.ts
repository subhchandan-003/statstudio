import Papa from "papaparse";

export type Cell = number | string | null;

export interface ParsedTable {
  columns: string[];
  rows: Cell[][];
}

function coerceCell(raw: unknown): Cell {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const text = String(raw).trim();
  if (text === "") return null;
  const asNumber = Number(text);
  return Number.isFinite(asNumber) ? asNumber : text;
}

function parseDelimited(file: File, delimiter: string): Promise<ParsedTable> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      delimiter,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data.length === 0) {
          reject(new Error("No rows found in file"));
          return;
        }
        const [header, ...rows] = result.data;
        resolve({
          columns: header.map((c) => c.trim()),
          rows: rows.map((row) => row.map(coerceCell)),
        });
      },
      error: (error: Error) => reject(error),
    });
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

async function parseSpreadsheet(file: File): Promise<ParsedTable> {
  const [buffer, XLSX] = await Promise.all([readAsArrayBuffer(file), import("xlsx")]);
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Workbook has no sheets");
  }
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  if (raw.length === 0) {
    throw new Error("No rows found in file");
  }
  const [header, ...rows] = raw;
  return {
    columns: header.map((c) => String(c ?? "").trim()),
    rows: rows.map((row) => row.map(coerceCell)),
  };
}

export function parseFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseDelimited(file, ",");
  if (name.endsWith(".tsv")) return parseDelimited(file, "\t");
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseSpreadsheet(file);
  return Promise.reject(new Error(`Unsupported file type: ${file.name}`));
}
