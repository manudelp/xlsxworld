"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "./AuthProvider";

export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    if (auth.isAuthenticated) {
      return;
    }

    const query = searchParams.toString();
    const next = query ? `${pathname}?${query}` : pathname;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [auth.isAuthenticated, auth.isLoading, pathname, router, searchParams]);

  return auth;
}
