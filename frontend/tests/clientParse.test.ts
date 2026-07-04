import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { parseFile } from "../src/lib/clientParse";

describe("parseFile", () => {
  it("parses CSV files", async () => {
    const file = new File(["age,segment\n25,A\n30,B\n"], "survey.csv", { type: "text/csv" });
    const result = await parseFile(file);
    expect(result.columns).toEqual(["age", "segment"]);
    expect(result.rows).toEqual([
      [25, "A"],
      [30, "B"],
    ]);
  });

  it("parses TSV files", async () => {
    const file = new File(["age\tsegment\n25\tA\n"], "survey.tsv", { type: "text/tab-separated-values" });
    const result = await parseFile(file);
    expect(result.columns).toEqual(["age", "segment"]);
    expect(result.rows).toEqual([[25, "A"]]);
  });

  it("treats blank cells as null", async () => {
    const file = new File(["age,segment\n25,A\n,B\n"], "survey.csv", { type: "text/csv" });
    const result = await parseFile(file);
    expect(result.rows).toEqual([
      [25, "A"],
      [null, "B"],
    ]);
  });

  it("round-trips an XLSX file written by the xlsx package itself", async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["age", "segment"],
      [25, "A"],
      [30, "B"],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const file = new File([buffer], "survey.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseFile(file);
    expect(result.columns).toEqual(["age", "segment"]);
    expect(result.rows).toEqual([
      [25, "A"],
      [30, "B"],
    ]);
  });

  it("parses a real legacy .xls binary", async () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const fixturePath = join(currentDir, "fixtures", "legacy.xls");
    const buffer = readFileSync(fixturePath);
    const file = new File([buffer], "legacy.xls", { type: "application/vnd.ms-excel" });

    const result = await parseFile(file);
    expect(result.columns).toEqual(["age", "segment"]);
    expect(result.rows).toEqual([
      [25, "A"],
      [30, "B"],
      [35, "A"],
    ]);
  });

  it("rejects unsupported extensions", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await expect(parseFile(file)).rejects.toThrow("Unsupported file type");
  });
});
