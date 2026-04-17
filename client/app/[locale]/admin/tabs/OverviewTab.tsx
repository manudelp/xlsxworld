"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

import type { AdminOverview, KpiTrendDay } from "@/lib/admin";

type KpiKey =
  | "new_users"
  | "tool_uses"
  | "success_rate"
  | "avg_duration_ms"
  | "total_users"
  | "tool_uses_today"
  | "error_count"
  | "file_uploads";

interface KpiConfig {
  key: KpiKey;
  trendKey: keyof KpiTrendDay;
  labelKey: string;
  value: string | number;
  subtext: string;
  color: string;
  valueColor?: string;
}

const KPI_TREND_KEYS: Record<KpiKey, keyof KpiTrendDay> = {
  total_users: "new_users",
  new_users: "new_users",
  tool_uses: "tool_uses",
  tool_uses_today: "tool_uses",
  success_rate: "success_rate",
  avg_duration_ms: "avg_duration_ms",
  error_count: "error_count",
  file_uploads: "file_uploads",
};

function rateColor(rate: number) {
  if (rate >= 95) return "#22c55e";
  if (rate >= 85) return "#eab308";
  return "#ef4444";
}

function durationColor(ms: number) {
  if (ms < 500) return "#22c55e";
  if (ms < 1500) return "#eab308";
  return "#ef4444";
}

function errorColor(count: number) {
  if (count === 0) return "#22c55e";
  if (count < 10) return "#eab308";
  return "#ef4444";
}

function Sparkline({
  data,
  dataKey,
  color,
  active,
}: {
  data: { value: number | null }[];
  dataKey: string;
  color: string;
  active: boolean;
}) {
  return (
    <div className="mt-3 h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={active ? 0.3 : 0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${dataKey})`}
            dot={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SparkCard({
  label,
  value,
  subtext,
  sparkData,
  sparkKey,
  color,
  valueColor,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  subtext: string;
  sparkData: { value: number | null }[];
  sparkKey: string;
  color: string;
  valueColor?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-lg border p-3 text-left transition-all sm:p-5"
      style={{
        borderColor: active ? color : "var(--border)",
        backgroundColor: "var(--surface)",
        boxShadow: active ? `0 0 0 1px ${color}33` : "none",
      }}
    >
      <p
        className="mb-1 text-[10px] font-medium uppercase tracking-wide sm:text-xs"
        style={{ color: "var(--muted-2)" }}
      >
        {label}
      </p>
      <p
        className="text-xl font-bold sm:text-2xl"
        style={{ color: valueColor ?? "var(--foreground)" }}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] sm:text-xs" style={{ color: "var(--muted-2)" }}>
        {subtext}
      </p>
      {sparkData.length > 1 && (
        <Sparkline data={sparkData} dataKey={sparkKey} color={color} active={active} />
      )}
    </button>
  );
}

const PERIOD_OPTIONS: number[] = [7, 14, 30];

export default function OverviewTab({
  data,
  kpiTrends,
  periodDays,
  onPeriodChange,
}: {
  data: AdminOverview;
  kpiTrends: KpiTrendDay[];
  periodDays: number;
  onPeriodChange: (days: number) => void;
}) {
  const t = useTranslations("admin.overview");
  const format = useFormatter();
  const formatNumber = (n: number) => format.number(n);
  const [activeKpi, setActiveKpi] = useState<KpiKey>("tool_uses");

  const kpis: KpiConfig[] = [
    {
      key: "total_users",
      trendKey: "new_users",
      labelKey: "totalUsers",
      value: formatNumber(data.total_users),
      subtext: t("thisWeek", { count: data.new_users_this_week }),
      color: "#6366f1",
    },
    {
      key: "new_users",
      trendKey: "new_users",
      labelKey: "newUsersThisMonth",
      value: formatNumber(data.new_users_this_month),
      subtext: t("today", { count: data.new_users_today }),
      color: "#8b5cf6",
    },
    {
      key: "tool_uses",
      trendKey: "tool_uses",
      labelKey: "totalToolUses",
      value: formatNumber(data.total_tool_uses),
      subtext: t("thisWeek", { count: data.tool_uses_this_week }),
      color: "#3b82f6",
    },
    {
      key: "tool_uses_today",
      trendKey: "tool_uses",
      labelKey: "toolUsesToday",
      value: formatNumber(data.tool_uses_today),
      subtext: t("thisMonth", { count: formatNumber(data.tool_uses_this_month) }),
      color: "#06b6d4",
    },
    {
      key: "success_rate",
      trendKey: "success_rate",
      labelKey: "successRate",
      value: `${data.overall_success_rate}%`,
      subtext: t("acrossAllToolUsage"),
      color: rateColor(data.overall_success_rate),
      valueColor: rateColor(data.overall_success_rate),
    },
    {
      key: "avg_duration_ms",
      trendKey: "avg_duration_ms",
      labelKey: "avgResponseTime",
      value: `${data.avg_response_time_ms} ms`,
      subtext: t("acrossAllToolUsage"),
      color: durationColor(data.avg_response_time_ms),
      valueColor: durationColor(data.avg_response_time_ms),
    },
    {
      key: "error_count",
      trendKey: "error_count",
      labelKey: "errorCount",
      value: formatNumber(data.total_errors),
      subtext: t("errorsToday", { count: data.errors_today }),
      color: errorColor(data.total_errors),
      valueColor: errorColor(data.total_errors),
    },
    {
      key: "file_uploads",
      trendKey: "file_uploads",
      labelKey: "fileUploads",
      value: formatNumber(data.total_file_uploads),
      subtext: t("thisWeek", { count: data.file_uploads_this_week }),
      color: "#f59e0b",
    },
  ];

  const sparkDataMap = useMemo(() => {
    const map: Record<KpiKey, { value: number | null }[]> = {
      total_users: [],
      new_users: [],
      tool_uses: [],
      tool_uses_today: [],
      success_rate: [],
      avg_duration_ms: [],
      error_count: [],
      file_uploads: [],
    };
    (Object.keys(KPI_TREND_KEYS) as KpiKey[]).forEach((key) => {
      const trendKey = KPI_TREND_KEYS[key];
      map[key] = kpiTrends.map((d) => ({
        value: d[trendKey] as number | null,
      }));
    });
    return map;
  }, [kpiTrends]);

  const activeConfig = kpis.find((k) => k.key === activeKpi)!;

  const detailChartData = useMemo(
    () =>
      kpiTrends.map((d) => ({
        label: format.dateTime(new Date(d.date), {
          month: "short",
          day: "numeric",
        }),
        date: d.date,
        value: d[activeConfig.trendKey],
      })),
    [kpiTrends, activeConfig.trendKey, format],
  );

  const chartLabel = t(activeConfig.labelKey);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.slice(0, 4).map((kpi) => (
          <SparkCard
            key={kpi.key}
            label={t(kpi.labelKey)}
            value={kpi.value}
            subtext={kpi.subtext}
            sparkData={sparkDataMap[kpi.key] ?? []}
            sparkKey={kpi.key}
            color={kpi.color}
            valueColor={kpi.valueColor}
            active={activeKpi === kpi.key}
            onClick={() => setActiveKpi(kpi.key)}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.slice(4).map((kpi) => (
          <SparkCard
            key={kpi.key}
            label={t(kpi.labelKey)}
            value={kpi.value}
            subtext={kpi.subtext}
            sparkData={sparkDataMap[kpi.key] ?? []}
            sparkKey={kpi.key}
            color={kpi.color}
            valueColor={kpi.valueColor}
            active={activeKpi === kpi.key}
            onClick={() => setActiveKpi(kpi.key)}
          />
        ))}
      </div>

      <div
        className="rounded-lg border p-4 sm:p-6"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3
            className="text-sm font-medium"
            style={{ color: "var(--muted-2)" }}
          >
            {chartLabel} — {t("chartTitle", { days: periodDays })}
          </h3>
          <div
            className="inline-flex overflow-hidden rounded-md border"
            style={{ borderColor: "var(--border)" }}
            role="group"
            aria-label={t("periodSelectorLabel")}
          >
            {PERIOD_OPTIONS.map((option, index) => {
              const isActive = option === periodDays;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onPeriodChange(option)}
                  className="px-2.5 py-1 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: isActive
                      ? "var(--tag-selected-bg)"
                      : "var(--surface-2)",
                    color: isActive
                      ? "var(--tag-selected-text)"
                      : "var(--muted-2)",
                    borderLeft:
                      index === 0 ? undefined : "1px solid var(--border)",
                  }}
                  aria-pressed={isActive}
                >
                  {t("daysShort", { count: option })}
                </button>
              );
            })}
          </div>
        </div>
        {detailChartData.length === 0 ? (
          <p
            className="py-8 text-center text-sm"
            style={{ color: "var(--muted-2)" }}
          >
            {t("noToolUsageData")}
          </p>
        ) : (
          <div className="h-[220px] w-full sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={detailChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-2)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-2)" }}
                allowDecimals={activeKpi === "success_rate" || activeKpi === "avg_duration_ms"}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelFormatter={(_, payload) => {
                  if (payload?.[0]?.payload?.date) return payload[0].payload.date;
                  return "";
                }}
                formatter={(val) => {
                  if (val == null) return ["", ""];
                  if (activeKpi === "success_rate") return [`${val}%`, chartLabel];
                  if (activeKpi === "avg_duration_ms") return [`${val} ms`, chartLabel];
                  return [val, chartLabel];
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={chartLabel}
                stroke={activeConfig.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: activeConfig.color }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
