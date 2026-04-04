import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";

import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import type { AuthProfile } from "@/lib/auth/types";

jest.mock("@/lib/auth/client", () => ({
  getCurrentUser: jest.fn(),
  login: jest.fn(),
  signup: jest.fn(),
  logout: jest.fn(),
}));

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
} from "@/lib/auth/client";

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockedLogin = loginRequest as jest.MockedFunction<typeof loginRequest>;
const mockedSignup = signupRequest as jest.MockedFunction<typeof signupRequest>;
const mockedLogout = logoutRequest as jest.MockedFunction<typeof logoutRequest>;

const profile: AuthProfile = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "auth@example.com",
  display_name: "Auth User",
  avatar_url: null,
  role: "member",
  status: "active",
  metadata_json: {},
  last_seen_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("restores session on mount", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(profile);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("auth@example.com");
  });

  it("supports login, signup, and logout", async () => {
    mockedGetCurrentUser.mockRejectedValueOnce(new Error("unauthenticated"));
    mockedLogin.mockResolvedValueOnce(profile);
    mockedSignup.mockResolvedValueOnce({ ...profile, email: "signup@example.com" });
    mockedLogout.mockResolvedValueOnce();

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);

    await act(async () => {
      await result.current.login({ email: " auth@example.com ", password: "password123" });
    });
    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.signup({ email: "signup@example.com", password: "password123" });
    });
    expect(result.current.user?.email).toBe("signup@example.com");

    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockedLogout).toHaveBeenCalledTimes(1);
  });

  it("refreshes after an initial unauthorized restore", async () => {
    mockedGetCurrentUser
      .mockRejectedValueOnce(new Error("401"))
      .mockResolvedValueOnce(profile);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("auth@example.com");
    expect(mockedGetCurrentUser).toHaveBeenCalledTimes(2);
  });
});
