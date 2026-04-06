"use client";

import { useSearchParams } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export default function SignupPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const params = new URLSearchParams({ mode: "register" });
  if (email) params.set("email", email);
  redirect({ href: `/login?${params.toString()}`, locale });
}
