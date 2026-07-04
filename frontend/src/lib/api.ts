const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export interface HealthResponse {
  status: string;
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
}

export interface NumericStats {
  mean: number | null;
  median: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
  skew: number | null;
}

export interface CategoryCount {
  value: string;
  count: number;
}

export interface ColumnSummary {
  name: string;
  dtype: string;
  measure: string;
  null_count: number;
  numeric: NumericStats | null;
  top_values: CategoryCount[] | null;
}

export interface AnalyzeResponse {
  filename: string;
  row_count: number;
  column_count: number;
  columns: ColumnSummary[];
}

export async function analyzeDataset(file: File): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/v1/datasets/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Analyze failed with status ${response.status}`);
  }

  return (await response.json()) as AnalyzeResponse;
}
