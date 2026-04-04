import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import SignupPage from "@/app/[locale]/signup/page";

const replaceMock = jest.fn();
const refreshMock = jest.fn();
const signupMock = jest.fn();
let authState = {
  signup: signupMock,
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
}));

describe("SignupPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState = {
      signup: signupMock,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  it("prevents submit when passwords do not match", async () => {
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "signup@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });
    expect(signupMock).not.toHaveBeenCalled();
  });

  it("submits valid signup and redirects", async () => {
    signupMock.mockResolvedValueOnce({});

    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Tester" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: " signup@example.com " },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(signupMock).toHaveBeenCalledWith({
        email: "signup@example.com",
        password: "password123",
        displayName: "Tester",
      });
    });

    expect(replaceMock).toHaveBeenCalledWith("/?welcome=1");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("redirects immediately when already authenticated", async () => {
    authState.isAuthenticated = true;

    render(<SignupPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });
});
