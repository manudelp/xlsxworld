import { Suspense } from "react";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/auth/constants";
import type { AuthProfile } from "@/lib/auth/types";
import AdminDashboard from "./AdminDashboard";

const BACKEND_BASE =
  process.env.API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:8000";

async function getServerUser(): Promise<AuthProfile | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(AUTH_REFRESH_COOKIE)?.value;
  if (!accessToken && !refreshToken) return null;

  const token = accessToken || refreshToken;
  try {
    const res = await fetch(`${BACKEND_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthProfile;
  } catch {
    return null;
  }
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getServerUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (user.role !== "admin") {
    redirect(`/${locale}`);
  }

  return (
    <Suspense fallback={null}>
      <AdminDashboard />
    </Suspense>
  );
}
