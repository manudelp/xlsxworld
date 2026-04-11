"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchAdminOverview,
  fetchAdminOverviewTrend,
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
  DayCount,
} from "@/lib/admin";

import OverviewTab from "./tabs/OverviewTab";
import ToolsTab from "./tabs/ToolsTab";
import UsersTab from "./tabs/UsersTab";
import PerformanceTab from "./tabs/PerformanceTab";
import ActivityTab from "./tabs/ActivityTab";

type Tab = "overview" | "tools" | "users" | "performance" | "activity";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "tools", label: "Tools" },
  { key: "users", label: "Users" },
  { key: "performance", label: "Performance" },
  { key: "activity", label: "Activity" },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [overviewData, setOverviewData] = useState<AdminOverview | null>(null);
  const [trendData, setTrendData] = useState<DayCount[] | null>(null);
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
          const [overview, trend] = await Promise.all([
            fetchAdminOverview(),
            fetchAdminOverviewTrend(),
          ]);
          setOverviewData(overview);
          setTrendData(trend);
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
        Admin Dashboard
      </h1>

      <div
        className="mb-6 flex gap-1 rounded-lg border p-1"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === tab.key
                  ? "var(--tag-selected-bg)"
                  : "transparent",
              color:
                activeTab === tab.key
                  ? "var(--tag-selected-text)"
                  : "var(--muted-2)",
            }}
          >
            {tab.label}
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
          <p className="text-sm" style={{ color: "var(--muted-2)" }}>
            Failed to load data: {error}
          </p>
        </div>
      ) : loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {activeTab === "overview" && overviewData && (
            <OverviewTab data={overviewData} trend={trendData ?? []} />
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

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border p-6"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div
            className="mb-3 h-4 w-24 rounded"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div
            className="h-8 w-16 rounded"
            style={{ backgroundColor: "var(--border)" }}
          />
        </div>
      ))}
    </div>
  );
}
