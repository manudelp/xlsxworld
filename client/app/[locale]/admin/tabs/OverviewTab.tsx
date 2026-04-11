"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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

import type { AdminOverview, DayCount, KpiTrendDay } from "@/lib/admin";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
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
      className="w-full cursor-pointer rounded-lg border p-5 text-left transition-all"
      style={{
        borderColor: active ? color : "var(--border)",
        backgroundColor: "var(--surface)",
        boxShadow: active ? `0 0 0 1px ${color}33` : "none",
      }}
    >
      <p
        className="mb-1 text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--muted-2)" }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-bold"
        style={{ color: valueColor ?? "var(--foreground)" }}
      >
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--muted-2)" }}>
        {subtext}
      </p>
      {sparkData.length > 1 && (
        <Sparkline data={sparkData} dataKey={sparkKey} color={color} active={active} />
      )}
    </button>
  );
}

export default function OverviewTab({
  data,
  trend,
  kpiTrends,
}: {
  data: AdminOverview;
  trend: DayCount[];
  kpiTrends: KpiTrendDay[];
}) {
  const t = useTranslations("admin.overview");
  const [activeKpi, setActiveKpi] = useState<KpiKey>("tool_uses");

  const kpis: KpiConfig[] = [
    {
      key: "total_users",
      trendKey: "new_users",
      labelKey: "totalUsers",
      value: data.total_users.toLocaleString(),
      subtext: t("thisWeek", { count: data.new_users_this_week }),
      color: "#6366f1",
    },
    {
      key: "new_users",
      trendKey: "new_users",
      labelKey: "newUsersThisMonth",
      value: data.new_users_this_month.toLocaleString(),
      subtext: t("today", { count: data.new_users_today }),
      color: "#8b5cf6",
    },
    {
      key: "tool_uses",
      trendKey: "tool_uses",
      labelKey: "totalToolUses",
      value: data.total_tool_uses.toLocaleString(),
      subtext: t("thisWeek", { count: data.tool_uses_this_week }),
      color: "#3b82f6",
    },
    {
      key: "tool_uses_today",
      trendKey: "tool_uses",
      labelKey: "toolUsesToday",
      value: data.tool_uses_today.toLocaleString(),
      subtext: t("thisMonth", { count: data.tool_uses_this_month.toLocaleString() }),
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
      value: data.total_errors.toLocaleString(),
      subtext: t("errorsToday", { count: data.errors_today }),
      color: errorColor(data.total_errors),
      valueColor: errorColor(data.total_errors),
    },
    {
      key: "file_uploads",
      trendKey: "file_uploads",
      labelKey: "fileUploads",
      value: data.total_file_uploads.toLocaleString(),
      subtext: t("thisWeek", { count: data.file_uploads_this_week }),
      color: "#f59e0b",
    },
  ];

  const sparkDataMap = useMemo(() => {
    const map: Record<string, { value: number | null }[]> = {};
    for (const kpi of kpis) {
      map[kpi.key] = kpiTrends.map((d) => ({
        value: d[kpi.trendKey] as number | null,
      }));
    }
    return map;
  }, [kpiTrends]);

  const activeConfig = kpis.find((k) => k.key === activeKpi)!;

  const detailChartData = useMemo(
    () =>
      kpiTrends.map((d) => ({
        label: formatDate(d.date),
        date: d.date,
        value: d[activeConfig.trendKey],
      })),
    [kpiTrends, activeConfig.trendKey],
  );

  const chartLabel = t(activeConfig.labelKey);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        className="rounded-lg border p-6"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <h3
          className="mb-4 text-sm font-medium"
          style={{ color: "var(--muted-2)" }}
        >
          {chartLabel} — {t("chartTitle")}
        </h3>
        {detailChartData.length === 0 ? (
          <p
            className="py-8 text-center text-sm"
            style={{ color: "var(--muted-2)" }}
          >
            {t("noToolUsageData")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
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
        )}
      </div>
    </div>
  );
}
