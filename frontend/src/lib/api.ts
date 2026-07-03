const API_BASE_ROOT = (import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api/v1").replace(
  /\/api\/v1\/?$/,
  ""
);

export interface HealthResponse {
  status: string;
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_ROOT}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
}
