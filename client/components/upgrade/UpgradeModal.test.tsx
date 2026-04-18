import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UpgradeModal from "./UpgradeModal";
import { dispatchUpgradeRequest } from "./useUpgradeModal";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("UpgradeModal", () => {
  it("opens when an upgrade-requested event fires", () => {
    render(<UpgradeModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      dispatchUpgradeRequest({ reason: "ANON_DAILY_QUOTA" });
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(<UpgradeModal />);
    act(() => {
      dispatchUpgradeRequest({ reason: "ANON_FILE_TOO_LARGE" });
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
