import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import LoginPage from "@/app/[locale]/login/page";

const replaceMock = jest.fn();
const refreshMock = jest.fn();
const loginMock = jest.fn();
let authState = {
  login: loginMock,
  isAuthenticated: false,
  isLoading: false,
};

jest.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => authState,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "next" ? "/my-account" : null),
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState = {
      login: loginMock,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  it("submits login form and redirects to next path", async () => {
    loginMock.mockResolvedValueOnce({});

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "  member@example.com " },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: "member@example.com",
        password: "password123",
      });
    });

    expect(replaceMock).toHaveBeenCalledWith("/my-account");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("redirects immediately when already authenticated", async () => {
    authState.isAuthenticated = true;
    render(<LoginPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/my-account");
    });
  });
});
