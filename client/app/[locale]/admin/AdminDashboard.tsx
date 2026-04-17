"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  fetchAdminOverview,
  fetchAdminKpiTrends,
  fetchAdminTools,
  fetchAdminUsers,
  fetchAdminPerformance,
  fetchAdminActivity,
} from "@/lib/admin";
import type {
  AdminOverview,
  AdminToolStat,
  AdminUsers,
  AdminPerformanceStat,
  AdminActivityItem,
  KpiTrendDay,
} from "@/lib/admin";

import OverviewTab from "./tabs/OverviewTab";
import ToolsTab from "./tabs/ToolsTab";
import UsersTab from "./tabs/UsersTab";
import PerformanceTab from "./tabs/PerformanceTab";
import ActivityTab from "./tabs/ActivityTab";

type Tab = "overview" | "tools" | "users" | "performance" | "activity";

const TAB_KEYS: Tab[] = ["overview", "tools", "users", "performance", "activity"];

export default function AdminDashboard() {
  const t = useTranslations("admin");
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [overviewData, setOverviewData] = useState<AdminOverview | null>(null);
  const [kpiTrends, setKpiTrends] = useState<KpiTrendDay[] | null>(null);
  const [toolsData, setToolsData] = useState<AdminToolStat[] | null>(null);
  const [usersData, setUsersData] = useState<AdminUsers | null>(null);
  const [perfData, setPerfData] = useState<AdminPerformanceStat[] | null>(null);
  const [activityData, setActivityData] = useState<AdminActivityItem[] | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTab = useCallback(async (tab: Tab) => {
    setLoading(true);
    setError(null);
    try {
      switch (tab) {
        case "overview": {
          const [overview, kpi] = await Promise.all([
            fetchAdminOverview(),
            fetchAdminKpiTrends(),
          ]);
          setOverviewData(overview);
          setKpiTrends(kpi.series);
          break;
        }
        case "tools": {
          setToolsData(await fetchAdminTools());
          break;
        }
        case "users": {
          setUsersData(await fetchAdminUsers());
          break;
        }
        case "performance": {
          setPerfData(await fetchAdminPerformance());
          break;
        }
        case "activity": {
          setActivityData(await fetchAdminActivity());
          break;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1
        className="mb-6 text-2xl font-bold"
        style={{ color: "var(--foreground)" }}
      >
        {t("title")}
      </h1>

      <div
        className="mb-6 flex gap-1 rounded-lg border p-1"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === key
                  ? "var(--tag-selected-bg)"
                  : "transparent",
              color:
                activeTab === key
                  ? "var(--tag-selected-text)"
                  : "var(--muted-2)",
            }}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {error ? (
        <div
          className="rounded-lg border p-6 text-center"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <p className="mb-4 text-sm" style={{ color: "var(--muted-2)" }}>
            {t("failedToLoad", { error })}
          </p>
          <button
            type="button"
            onClick={() => loadTab(activeTab)}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-2)",
              color: "var(--foreground)",
            }}
          >
            {t("retry")}
          </button>
        </div>
      ) : loading ? (
        <LoadingSkeleton tab={activeTab} />
      ) : (
        <>
          {activeTab === "overview" && overviewData && (
            <OverviewTab data={overviewData} kpiTrends={kpiTrends ?? []} />
          )}
          {activeTab === "tools" && toolsData && (
            <ToolsTab data={toolsData} />
          )}
          {activeTab === "users" && usersData && (
            <UsersTab data={usersData} />
          )}
          {activeTab === "performance" && perfData && (
            <PerformanceTab data={perfData} />
          )}
          {activeTab === "activity" && activityData && (
            <ActivityTab
              data={activityData}
              onRefresh={async () => {
                setActivityData(await fetchAdminActivity());
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`rounded ${className}`}
      style={{ backgroundColor: "var(--border)" }}
    />
  );
}

function SkeletonCard({ hasSparkline = false }: { hasSparkline?: boolean }) {
  return (
    <div
      className="animate-pulse rounded-lg border p-5"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
      }}
    >
      <SkeletonBlock className="mb-2 h-3 w-20" />
      <SkeletonBlock className="mb-1 h-7 w-16" />
      <SkeletonBlock className="h-3 w-24" />
      {hasSparkline && <SkeletonBlock className="mt-3 h-10 w-full" />}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div
      className="animate-pulse rounded-lg border p-6"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
      }}
    >
      <SkeletonBlock className="mb-4 h-4 w-48" />
      <SkeletonBlock className="h-[280px] w-full" />
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <div
      className="flex gap-4 px-4 py-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <SkeletonBlock className="h-4 w-28" />
      <SkeletonBlock className="h-4 w-16" />
      <SkeletonBlock className="h-4 w-16" />
      <SkeletonBlock className="h-4 w-20" />
      <SkeletonBlock className="h-4 w-24" />
    </div>
  );
}

function SkeletonFeedItem() {
  return (
    <div
      className="animate-pulse rounded-lg border p-4"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
        borderLeft: "4px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-4 w-4 rounded-full" />
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-4 w-20" />
      </div>
      <div className="mt-2 flex gap-3">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-3 w-14" />
      </div>
    </div>
  );
}

function LoadingSkeleton({ tab }: { tab: Tab }) {
  switch (tab) {
    case "overview":
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} hasSparkline />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} hasSparkline />
            ))}
          </div>
          <SkeletonChart />
        </div>
      );

    case "tools":
    case "performance":
      return (
        <div
          className="animate-pulse rounded-lg border"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div
            className="flex gap-4 px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-4 w-20" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonTableRow key={i} />
          ))}
        </div>
      );

    case "users":
      return (
        <div className="space-y-6">
          <SkeletonCard />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SkeletonChart />
            <SkeletonChart />
          </div>
          <div
            className="animate-pulse rounded-lg border"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </div>
        </div>
      );

    case "activity":
      return (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonFeedItem key={i} />
          ))}
        </div>
      );
  }
}
