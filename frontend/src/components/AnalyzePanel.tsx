import { useState } from "react";

import { analyzeDataset, type AnalyzeResponse, type ColumnSummary } from "../lib/api";

type Status = "idle" | "loading" | "error" | "success";

function formatNumber(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

function ColumnRow({ column }: { column: ColumnSummary }): JSX.Element {
  return (
    <tr className="border-t border-slate-200">
      <td className="px-3 py-2 font-medium text-slate-900">{column.name}</td>
      <td className="px-3 py-2 text-slate-600">{column.dtype}</td>
      <td className="px-3 py-2 text-slate-600">{column.measure}</td>
      <td className="px-3 py-2 text-slate-600">{column.null_count}</td>
      <td className="px-3 py-2 text-slate-600">
        {column.numeric ? (
          <span>
            mean {formatNumber(column.numeric.mean)}, median{" "}
            {formatNumber(column.numeric.median)}, sd {formatNumber(column.numeric.std)}, min{" "}
            {formatNumber(column.numeric.min)}, max {formatNumber(column.numeric.max)}
          </span>
        ) : (
          <span>
            {column.top_values?.map((c) => `${c.value} (${c.count})`).join(", ") ?? "—"}
          </span>
        )}
      </td>
    </tr>
  );
}

export default function AnalyzePanel(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAnalyze = async (): Promise<void> => {
    if (!file) return;
    setStatus("loading");
    setErrorMessage(null);
    try {
      const response = await analyzeDataset(file);
      setResult(response);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Analyze failed");
      setStatus("error");
    }
  };

  return (
    <div className="mt-6 w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Analyze a dataset</h2>
      <p className="mt-1 text-sm text-slate-600">
        Upload a CSV, TSV, XLSX, XLS or Parquet file. It is parsed in memory
        and never stored.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <input
          type="file"
          accept=".csv,.tsv,.xlsx,.xls,.parquet"
          aria-label="Choose dataset file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-slate-700"
        />
        <button
          type="button"
          onClick={() => void handleAnalyze()}
          disabled={!file || status === "loading"}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {status === "loading" ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {status === "error" && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      {status === "success" && result && (
        <div className="mt-4">
          <p className="text-sm text-slate-600">
            {result.filename}: {result.row_count} rows, {result.column_count} columns
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-3 py-2">Column</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Measure</th>
                  <th className="px-3 py-2">Nulls</th>
                  <th className="px-3 py-2">Stats</th>
                </tr>
              </thead>
              <tbody>
                {result.columns.map((column) => (
                  <ColumnRow key={column.name} column={column} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
