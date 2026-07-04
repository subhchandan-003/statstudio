import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import AnalyzePanel from "../src/components/AnalyzePanel";

function makeFile(): File {
  return new File(["age,segment\n25,A\n30,B\n"], "survey.csv", { type: "text/csv" });
}

describe("AnalyzePanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads the selected file and renders the returned stats table", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          filename: "survey.csv",
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

    const input = screen.getByLabelText("Choose dataset file");
    await user.upload(input, makeFile());
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => expect(screen.getByText(/survey.csv: 2 rows, 2 columns/)).toBeVisible());
    expect(screen.getByText("age")).toBeVisible();
    expect(screen.getByText("segment")).toBeVisible();

    const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("shows a visible error message when the request fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 415,
        json: async () => ({ detail: "Unsupported file type: notes.txt" }),
      })
    );

    render(<AnalyzePanel />);

    const input = screen.getByLabelText("Choose dataset file");
    await user.upload(input, makeFile());
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unsupported file type"));
  });
});
