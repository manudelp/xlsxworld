"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, RefreshCw } from "lucide-react";

import {
  fetchAdminOverview,
  fetchAdminKpiTrends,
  fetchAdminTools,
  fetchAdminUsers,
  fetchAdminPerformance,
} from "@/lib/admin";
import type {
  AdminOverview,
  AdminToolStat,
  AdminUsers,
  AdminPerformanceStat,
  KpiTrendDay,
} from "@/lib/admin";

import OverviewTab from "./tabs/OverviewTab";
import ToolsTab from "./tabs/ToolsTab";
import UsersTab from "./tabs/UsersTab";
import PerformanceTab from "./tabs/PerformanceTab";
import ActivityTab from "./tabs/ActivityTab";

type Tab = "overview" | "tools" | "users" | "performance" | "activity";

const TAB_KEYS: Tab[] = ["overview", "tools", "users", "performance", "activity"];

function parseTabParam(raw: string | null): Tab {
  return TAB_KEYS.includes(raw as Tab) ? (raw as Tab) : "overview";
}

function useRelativeTime(timestamp: number | null, t: (k: string, values?: Record<string, number>) => string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (timestamp == null) return;
    const interval = window.setInterval(() => setTick((v) => v + 1), 15_000);
    return () => window.clearInterval(interval);
  }, [timestamp]);

  if (timestamp == null) return null;
  const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diff < 5) return t("justNow");
  if (diff < 60) return t("secondsAgo", { count: diff });
  const mins = Math.floor(diff / 60);
  if (mins < 60) return t("minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  return t("hoursAgo", { count: hours });
}

export default function AdminDashboard() {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = parseTabParam(searchParams.get("tab"));
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const visibleTab = pendingTab ?? activeTab;

  // Clear pending state once the URL catches up
  useEffect(() => {
    if (pendingTab && activeTab === pendingTab) {
      setPendingTab(null);
    }
  }, [activeTab, pendingTab]);

  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    overview: null,
    tools: null,
    users: null,
    performance: null,
    activity: null,
  });

  const setActiveTab = useCallback(
    (next: Tab) => {
      if (next === visibleTab) return;
      setPendingTab(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [visibleTab, pathname, router, searchParams],
  );

  const [overviewData, setOverviewData] = useState<AdminOverview | null>(null);
  const [kpiTrends, setKpiTrends] = useState<KpiTrendDay[] | null>(null);
  const [periodDays, setPeriodDays] = useState(30);
  const periodDaysRef = useRef(periodDays);
  periodDaysRef.current = periodDays;
  const [toolsData, setToolsData] = useState<AdminToolStat[] | null>(null);
  const [usersData, setUsersData] = useState<AdminUsers | null>(null);
  const [perfData, setPerfData] = useState<AdminPerformanceStat[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Record<Tab, number | null>>({
    overview: null,
    tools: null,
    users: null,
    performance: null,
    activity: null,
  });
  const [refreshTokens, setRefreshTokens] = useState<Record<Tab, number>>({
    overview: 0,
    tools: 0,
    users: 0,
    performance: 0,
    activity: 0,
  });

  const markTabUpdated = useCallback((tab: Tab) => {
    setLastUpdated((prev) => ({ ...prev, [tab]: Date.now() }));
  }, []);

  const loadTab = useCallback(
    async (tab: Tab, options: { background?: boolean } = {}) => {
      if (tab === "activity") {
        setLoading(false);
        setError(null);
        setRefreshTokens((prev) => ({ ...prev, activity: prev.activity + 1 }));
        return;
      }
      if (options.background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        switch (tab) {
          case "overview": {
            const [overview, kpi] = await Promise.all([
              fetchAdminOverview(),
              fetchAdminKpiTrends(periodDaysRef.current),
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
            setRefreshTokens((prev) => ({ ...prev, users: prev.users + 1 }));
            break;
          }
          case "performance": {
            setPerfData(await fetchAdminPerformance());
            break;
          }
        }
        setLastUpdated((prev) => ({ ...prev, [tab]: Date.now() }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  const handlePeriodChange = useCallback(async (days: number) => {
    setPeriodDays(days);
    setRefreshing(true);
    try {
      const res = await fetchAdminKpiTrends(days);
      setKpiTrends(res.series);
      setLastUpdated((prev) => ({ ...prev, overview: Date.now() }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const relativeUpdated = useRelativeTime(
    lastUpdated[activeTab],
    t as unknown as (k: string, values?: Record<string, number>) => string,
  );

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = TAB_KEYS.indexOf(visibleTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TAB_KEYS.length;
    else if (event.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + TAB_KEYS.length) % TAB_KEYS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TAB_KEYS.length - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    const nextTab = TAB_KEYS[nextIndex];
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6">
        <div className="min-w-0 flex-1">
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            {t("title")}
          </h1>
          {relativeUpdated && !loading && !error && (
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--muted-2)" }}
              aria-live="polite"
            >
              {t("lastUpdated", { time: relativeUpdated })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => loadTab(activeTab, { background: true })}
          disabled={loading || refreshing}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50 sm:px-3 sm:text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
          aria-label={t("refresh")}
        >
          {refreshing || loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{t("refresh")}</span>
        </button>
      </div>

      <div
        className="admin-tab-scroll mb-6 flex gap-1 overflow-x-auto rounded-lg border p-1"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
          scrollbarWidth: "none",
        }}
        role="tablist"
      >
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            ref={(el) => {
              tabRefs.current[key] = el;
            }}
            type="button"
            role="tab"
            aria-selected={visibleTab === key}
            tabIndex={visibleTab === key ? 0 : -1}
            onClick={() => setActiveTab(key)}
            onKeyDown={handleTabKeyDown}
            className="shrink-0 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm"
            style={{
              backgroundColor:
                visibleTab === key
                  ? "var(--tag-selected-bg)"
                  : "transparent",
              color:
                visibleTab === key
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
        <LoadingSkeleton tab={visibleTab} />
      ) : (
        <div style={{ opacity: refreshing ? 0.6 : 1, transition: "opacity 150ms" }}>
          {visibleTab === "overview" && overviewData && (
            <OverviewTab
              data={overviewData}
              kpiTrends={kpiTrends ?? []}
              periodDays={periodDays}
              onPeriodChange={handlePeriodChange}
            />
          )}
          {visibleTab === "tools" && toolsData && (
            <ToolsTab data={toolsData} />
          )}
          {visibleTab === "users" && usersData && (
            <UsersTab
              data={usersData}
              refreshToken={refreshTokens.users}
              onListLoaded={() => markTabUpdated("users")}
            />
          )}
          {visibleTab === "performance" && perfData && (
            <PerformanceTab data={perfData} />
          )}
          {visibleTab === "activity" && (
            <ActivityTab
              refreshToken={refreshTokens.activity}
              onLoaded={() => markTabUpdated("activity")}
            />
          )}
        </div>
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
