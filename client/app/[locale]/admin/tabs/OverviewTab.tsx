"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import type { AdminOverview, DayCount } from "@/lib/admin";

function rateColor(
  rate: number,
  greenThreshold: number,
  yellowThreshold: number,
) {
  if (rate >= greenThreshold) return "#22c55e";
  if (rate >= yellowThreshold) return "#eab308";
  return "#ef4444";
}

function durationColor(ms: number) {
  if (ms < 500) return "#22c55e";
  if (ms < 1500) return "#eab308";
  return "#ef4444";
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtext: string;
  valueColor?: string;
}

function StatCard({ label, value, subtext, valueColor }: StatCardProps) {
  return (
    <div
      className="rounded-lg border p-5"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
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
    </div>
  );
}

export default function OverviewTab({
  data,
  trend,
}: {
  data: AdminOverview;
  trend: DayCount[];
}) {
  const formatted = trend.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Users"
          value={data.total_users.toLocaleString()}
          subtext={`+${data.new_users_this_week} this week`}
        />
        <StatCard
          label="New Users This Month"
          value={data.new_users_this_month.toLocaleString()}
          subtext={`+${data.new_users_today} today`}
        />
        <StatCard
          label="Total Tool Uses"
          value={data.total_tool_uses.toLocaleString()}
          subtext={`+${data.tool_uses_this_week} this week`}
        />
        <StatCard
          label="Tool Uses Today"
          value={data.tool_uses_today.toLocaleString()}
          subtext={`${data.tool_uses_this_month.toLocaleString()} this month`}
        />
        <StatCard
          label="Success Rate"
          value={`${data.overall_success_rate}%`}
          subtext="Across all tool usage"
          valueColor={rateColor(data.overall_success_rate, 95, 85)}
        />
        <StatCard
          label="Avg Response Time"
          value={`${data.avg_response_time_ms} ms`}
          subtext="Across all tool usage"
          valueColor={durationColor(data.avg_response_time_ms)}
        />
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
          Tool Usage — Last 30 Days
        </h3>
        {formatted.length === 0 ? (
          <p
            className="py-8 text-center text-sm"
            style={{ color: "var(--muted-2)" }}
          >
            No tool usage data yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-2)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-2)" }}
                allowDecimals={false}
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
              />
              <Line
                type="monotone"
                dataKey="count"
                name="Tool Uses"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
