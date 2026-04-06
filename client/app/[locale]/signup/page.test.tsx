import SignupPage from "@/app/[locale]/signup/page";

const redirectMock = jest.fn();

jest.mock("@/i18n/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

jest.mock("next-intl", () => ({
  useLocale: () => "en",
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

describe("SignupPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to login with mode=register", () => {
    try {
      SignupPage();
    } catch {
      // redirect throws in test env
    }
    expect(redirectMock).toHaveBeenCalledWith({
      href: "/login?mode=register",
      locale: "en",
    });
  });
});
