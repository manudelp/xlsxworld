"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import DangerZone from "@/components/account/DangerZone";
import PreferencesCard from "@/components/account/PreferencesCard";
import ProfileHeader from "@/components/account/ProfileHeader";
import RecentJobs from "@/components/account/RecentJobs";
import SecurityCard from "@/components/account/SecurityCard";
import UsageSection from "@/components/account/UsageSection";
import { useRequireAuth } from "@/components/auth/useRequireAuth";

export default function MyAccountPage() {
  const { user, refresh, logout, isLoading } = useRequireAuth();
  const t = useTranslations("account");
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
    router.refresh();
  }

  if (isLoading || !user) {
    return (
      <div
        className="mx-auto max-w-3xl px-4 py-16 text-sm"
        style={{ color: "var(--muted)" }}
      >
        {t("loadingAccount")}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6">
        <p
          className="text-xs uppercase tracking-[0.16em]"
          style={{ color: "var(--muted)" }}
        >
          {t("label")}
        </p>
      </div>

      <ProfileHeader
        user={user}
        onRefresh={refresh}
        onLogout={handleLogout}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <RecentJobs />
          <DangerZone user={user} />
        </div>
        <div className="space-y-6">
          <UsageSection />
          <PreferencesCard />
          <SecurityCard user={user} />
        </div>
      </div>
    </main>
  );
}
