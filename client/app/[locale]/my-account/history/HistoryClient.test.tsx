import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HistoryClient from "./HistoryClient";

jest.mock("@/components/auth/useRequireAuth", () => ({
  useRequireAuth: () => ({
    user: { id: "u1", email: "u@x.com" },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

jest.mock("@/lib/jobs", () => ({
  fetchJobs: jest.fn(),
  deleteJob: jest.fn(),
  getJobDownloadUrl: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({
    dateTime: (d: Date) => d.toISOString(),
    number: (n: number) => String(n),
  }),
  useLocale: () => "en",
}));

const { fetchJobs, deleteJob, getJobDownloadUrl } = jest.requireMock(
  "@/lib/jobs",
) as {
  fetchJobs: jest.Mock;
  deleteJob: jest.Mock;
  getJobDownloadUrl: jest.Mock;
};

function buildJob(overrides: Record<string, unknown> = {}) {
  return {
    id: "j1",
    tool_slug: "trim-spaces",
    tool_name: "Trim Spaces",
    original_filename: "in.xlsx",
    output_filename: "trim-spaces.xlsx",
    mime_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    output_size_bytes: 1024,
    success: true,
    error_type: null,
    duration_ms: 10,
    expires_at: new Date(Date.now() + 1e9).toISOString(),
    created_at: new Date().toISOString(),
    expired: false,
    ...overrides,
  };
}

describe("HistoryClient", () => {
  beforeEach(() => {
    fetchJobs.mockReset();
    deleteJob.mockReset();
    getJobDownloadUrl.mockReset();
  });

  it("renders empty state when there are no jobs", async () => {
    fetchJobs.mockResolvedValue({ items: [] });

    render(<HistoryClient />);

    await waitFor(() =>
      expect(screen.getByText("empty")).toBeInTheDocument(),
    );
    expect(fetchJobs).toHaveBeenCalled();
  });

  it("re-downloads via signed url", async () => {
    const user = userEvent.setup();
    fetchJobs.mockResolvedValue({ items: [buildJob()] });
    getJobDownloadUrl.mockResolvedValue({
      url: "https://x",
      expires_in_seconds: 900,
    });
    const open = jest.spyOn(window, "open").mockImplementation(() => null);

    render(<HistoryClient />);

    const button = await screen.findByRole("button", { name: /download/i });
    await user.click(button);

    expect(getJobDownloadUrl).toHaveBeenCalledWith("j1");
    expect(open).toHaveBeenCalledWith("https://x", "_blank", "noopener");
    open.mockRestore();
  });

  it("shows the Expired label for expired jobs instead of Download", async () => {
    fetchJobs.mockResolvedValue({
      items: [buildJob({ id: "j2", expired: true })],
    });

    render(<HistoryClient />);

    await waitFor(() =>
      expect(screen.getByText("expired")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /download/i }),
    ).not.toBeInTheDocument();
  });

  it("deletes a job after confirmation and removes it from the list", async () => {
    const user = userEvent.setup();
    fetchJobs.mockResolvedValue({ items: [buildJob()] });
    deleteJob.mockResolvedValue(undefined);
    const confirm = jest
      .spyOn(window, "confirm")
      .mockImplementation(() => true);

    render(<HistoryClient />);

    const delButton = await screen.findByRole("button", { name: "delete" });
    await user.click(delButton);

    await waitFor(() => expect(deleteJob).toHaveBeenCalledWith("j1"));
    await waitFor(() =>
      expect(screen.getByText("empty")).toBeInTheDocument(),
    );
    confirm.mockRestore();
  });
});
