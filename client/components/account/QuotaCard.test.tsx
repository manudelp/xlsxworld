import { render, screen, waitFor } from "@testing-library/react";

import QuotaCard from "./QuotaCard";

jest.mock("@/lib/usage", () => ({
  fetchUsage: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const { fetchUsage } = jest.requireMock("@/lib/usage");

describe("QuotaCard", () => {
  beforeEach(() => {
    fetchUsage.mockReset();
  });

  it("renders count and limit from the server", async () => {
    fetchUsage.mockResolvedValue({
      plan: "free",
      jobs_today: 17,
      jobs_today_limit: 200,
      jobs_percent: 8.5,
      max_upload_bytes: 26214400,
    });

    render(<QuotaCard />);

    await waitFor(() => {
      expect(screen.getByText(/17/)).toBeInTheDocument();
      expect(screen.getByText(/200/)).toBeInTheDocument();
    });
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "8.5");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("renders nothing when the fetch fails (silently)", async () => {
    fetchUsage.mockRejectedValue(new Error("boom"));
    const { container } = render(<QuotaCard />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
