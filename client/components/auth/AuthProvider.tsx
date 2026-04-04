"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
} from "@/lib/auth/client";
import type {
  AuthProfile,
  AuthLoginInput,
  AuthSignupInput,
} from "@/lib/auth/types";

type AuthContextValue = {
  user: AuthProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: AuthLoginInput) => Promise<AuthProfile>;
  signup: (input: AuthSignupInput) => Promise<AuthProfile>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthProfile | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function syncSession(): Promise<AuthProfile | null> {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!mounted) {
          return;
        }
        setUser(currentUser);
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login: async (input) => {
        const nextUser = await loginRequest(input);
        setUser(nextUser);
        return nextUser;
      },
      signup: async (input) => {
        const nextUser = await signupRequest(input);
        setUser(nextUser);
        return nextUser;
      },
      logout: async () => {
        await logoutRequest();
        setUser(null);
      },
      refresh: async () => {
        setIsLoading(true);
        try {
          const currentUser = await syncSession();
          return currentUser;
        } finally {
          setIsLoading(false);
        }
      },
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
