import { useEffect, useState } from "react";

import AnalyzePanel from "./components/AnalyzePanel";
import { getHealth } from "./lib/api";

type Status = "loading" | "ok" | "error";

export default function App(): JSX.Element {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    getHealth()
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 py-10">
      <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">StatStudio</h1>
        <p className="mt-2 text-sm text-slate-600">
          Backend status: <span data-testid="health-status">{status}</span>
        </p>
      </div>
      <AnalyzePanel />
    </main>
  );
}
