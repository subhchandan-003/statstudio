import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import AnalyzePanel from "../src/components/AnalyzePanel";

function makeCsvFile(): File {
  return new File(["age,segment\n25,A\n30,B\n"], "survey.csv", { type: "text/csv" });
}

describe("AnalyzePanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("analyzes a CSV entirely client-side, with no network request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const user = userEvent.setup();
    render(<AnalyzePanel />);

    const input = screen.getByLabelText("Choose dataset file");
    await user.upload(input, makeCsvFile());
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => expect(screen.getByText(/survey.csv: 2 rows, 2 columns/)).toBeVisible());
    expect(screen.getByText("age")).toBeVisible();
    expect(screen.getByText("segment")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows a visible error for a completely empty file", async () => {
    const user = userEvent.setup();
    render(<AnalyzePanel />);

    const emptyFile = new File([""], "empty.csv", { type: "text/csv" });
    const input = screen.getByLabelText("Choose dataset file");
    await user.upload(input, emptyFile);
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No rows found"));
  });

  it("routes Parquet files to the backend over the network", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          filename: "survey.parquet",
          row_count: 2,
          column_count: 2,
          columns: [
            {
              name: "age",
              dtype: "int64",
              measure: "scale",
              null_count: 0,
              numeric: { mean: 27.5, median: 27.5, std: 3.54, min: 25, max: 30, skew: 0 },
              top_values: null,
            },
            {
              name: "segment",
              dtype: "object",
              measure: "nominal",
              null_count: 0,
              numeric: null,
              top_values: [
                { value: "A", count: 1 },
                { value: "B", count: 1 },
              ],
            },
          ],
        }),
      })
    );

    render(<AnalyzePanel />);
    const parquetFile = new File(["binary-ish content"], "survey.parquet", {
      type: "application/octet-stream",
    });
    const input = screen.getByLabelText("Choose dataset file");
    await user.upload(input, parquetFile);
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() =>
      expect(screen.getByText(/survey.parquet: 2 rows, 2 columns/)).toBeVisible()
    );
    const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("rejects an oversize Parquet file before making a network request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const user = userEvent.setup();
    render(<AnalyzePanel />);

    const bigContent = new Uint8Array(5 * 1024 * 1024);
    const bigFile = new File([bigContent], "big.parquet", { type: "application/octet-stream" });
    const input = screen.getByLabelText("Choose dataset file");
    await user.upload(input, bigFile);
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("too large"));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
