import { render, waitFor } from "@testing-library/react";
import React from "react";

import { useRequireAuth } from "@/components/auth/useRequireAuth";

const replaceMock = jest.fn();

let authState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: jest.fn(),
  signup: jest.fn(),
  logout: jest.fn(),
  refresh: jest.fn(),
};

jest.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => authState,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => "/my-account",
  useSearchParams: () => ({
    toString: () => "tab=security",
  }),
}));

function HookProbe() {
  useRequireAuth();
  return <div>probe</div>;
}

describe("useRequireAuth", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    authState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      refresh: jest.fn(),
    };
  });

  it("redirects unauthenticated users to login", async () => {
    render(<HookProbe />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/login?next=%2Fmy-account%3Ftab%3Dsecurity",
      );
    });
  });

  it("does not redirect authenticated users", async () => {
    authState.isAuthenticated = true;
    authState.user = {
      id: "u1",
      email: "member@example.com",
      display_name: null,
      avatar_url: null,
      role: "member",
      status: "active",
      metadata_json: {},
      last_seen_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(<HookProbe />);

    await waitFor(() => {
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });
});
