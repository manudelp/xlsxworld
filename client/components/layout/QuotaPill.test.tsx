import { render, screen, waitFor } from "@testing-library/react";

import QuotaPill from "./QuotaPill";

jest.mock("@/lib/usage", () => ({
  fetchUsage: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values
      ? `${key}:${JSON.stringify(values)}`
      : key,
}));

const { fetchUsage } = jest.requireMock("@/lib/usage");

describe("QuotaPill", () => {
  beforeEach(() => {
    fetchUsage.mockReset();
  });

  it("renders nothing under 80%", async () => {
    fetchUsage.mockResolvedValue({
      plan: "free",
      jobs_today: 100,
      jobs_today_limit: 200,
      jobs_percent: 50,
      max_upload_bytes: 26214400,
    });
    const { container } = render(<QuotaPill />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders the pill at or above 80%", async () => {
    fetchUsage.mockResolvedValue({
      plan: "free",
      jobs_today: 180,
      jobs_today_limit: 200,
      jobs_percent: 90,
      max_upload_bytes: 26214400,
    });
    render(<QuotaPill />);
    await waitFor(() => {
      expect(screen.getByRole("link")).toBeInTheDocument();
    });
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/my-account",
    );
  });

  it("renders nothing on fetch failure", async () => {
    fetchUsage.mockRejectedValue(new Error("boom"));
    const { container } = render(<QuotaPill />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
