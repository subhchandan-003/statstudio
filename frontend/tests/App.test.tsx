import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../src/App";

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows ok status when the health check succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok" }),
      })
    );

    render(<App />);

    await waitFor(() => expect(screen.getByTestId("health-status")).toHaveTextContent("ok"));
  });

  it("shows error status when the health check fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      })
    );

    render(<App />);

    await waitFor(() => expect(screen.getByTestId("health-status")).toHaveTextContent("error"));
  });
});
