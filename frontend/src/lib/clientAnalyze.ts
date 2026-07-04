import type { AnalyzeResponse, ColumnSummary } from "./api";
import { describeCategorical, describeNumeric } from "./clientStats";
import { parseFile } from "./clientParse";

function columnValues(rows: unknown[][], index: number): unknown[] {
  return rows.map((row) => row[index] ?? null);
}

function summarizeColumn(name: string, values: unknown[]): ColumnSummary {
  const nonNull = values.filter((v) => v !== null);
  const nullCount = values.length - nonNull.length;
  const isNumeric = nonNull.length > 0 && nonNull.every((v) => typeof v === "number");

  if (isNumeric) {
    return {
      name,
      dtype: "number",
      measure: "scale",
      null_count: nullCount,
      numeric: describeNumeric(nonNull as number[]),
      top_values: null,
    };
  }

  return {
    name,
    dtype: "string",
    measure: "nominal",
    null_count: nullCount,
    numeric: null,
    top_values: describeCategorical(nonNull.map((v) => String(v))),
  };
}

export async function analyzeFileClientSide(file: File): Promise<AnalyzeResponse> {
  const { columns, rows } = await parseFile(file);

  return {
    filename: file.name,
    row_count: rows.length,
    column_count: columns.length,
    columns: columns.map((name, index) => summarizeColumn(name, columnValues(rows, index))),
  };
}
