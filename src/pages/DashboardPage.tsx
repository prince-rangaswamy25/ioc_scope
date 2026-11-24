import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Calendar, Database, FileSearch, ShieldAlert } from "lucide-react";
import { useApp } from "../context/AppContext";
import { IOC_TYPE_META, IOC_TYPE_ORDER } from "../lib/iocMeta";
import { IOCTypeBadge, RiskLevelText } from "../components/IOCBadge";
import { IOCType } from "../types/ioc";

type DateRangeFilter = "all" | "7d" | "30d";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { history, loadFromHistory, seedSampleHistory, theme } = useApp();
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");

  const filteredHistory = useMemo(() => {
    if (dateRange === "all") return history;
    const days = dateRange === "7d" ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return history.filter((item) => new Date(item.createdAt).getTime() >= cutoff);
  }, [history, dateRange]);

  const metrics = useMemo(() => {
    const totalReports = filteredHistory.length;
    let totalIOCs = 0;
    let riskSum = 0;
    let criticalOrHigh = 0;

    const byTypeCounts: Record<IOCType, number> = {
      ip: 0,
      domain: 0,
      url: 0,
      email: 0,
      hash: 0,
      cve: 0,
      filepath: 0,
      registry: 0,
      wallet: 0,
    };

    const recurringMap = new Map<string, { value: string; type: IOCType; count: number }>();

    for (const entry of filteredHistory) {
      totalIOCs += entry.result.summary.uniqueCount;
      riskSum += entry.result.summary.riskScore;
      if (
        entry.result.summary.riskLevel === "Critical" ||
        entry.result.summary.riskLevel === "High"
      ) {
        criticalOrHigh += 1;
      }

      for (const ioc of entry.result.iocs) {
        if (ioc.isFalsePositive) continue;
        byTypeCounts[ioc.type] += 1;
        const key = `${ioc.type}::${ioc.value.toLowerCase()}`;
        const existing = recurringMap.get(key);
        if (!existing) {
          recurringMap.set(key, { value: ioc.value, type: ioc.type, count: ioc.occurrences });
        } else {
          existing.count += ioc.occurrences;
        }
      }
    }

    const typeDistribution = IOC_TYPE_ORDER.map((type) => ({
      name: IOC_TYPE_META[type].shortLabel,
      value: byTypeCounts[type],
      color: IOC_TYPE_META[type].chartColor,
    })).filter((d) => d.value > 0);

    const chronological = [...filteredHistory]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((entry) => ({
        date: new Date(entry.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        title: entry.title.slice(0, 24),
        iocs: entry.result.summary.uniqueCount,
        risk: entry.result.summary.riskScore,
      }));

    const topRecurring = Array.from(recurringMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 7)
      .map((item) => ({
        label: item.value.length > 26 ? `${item.value.slice(0, 23)}...` : item.value,
        fullValue: item.value,
        count: item.count,
        color: IOC_TYPE_META[item.type].chartColor,
      }));

    return {
      totalReports,
      totalIOCs,
      avgRisk: totalReports > 0 ? Math.round(riskSum / totalReports) : 0,
      criticalOrHigh,
      typeDistribution,
      chronological,
      topRecurring,
    };
  }, [filteredHistory]);

  const axisColor = theme === "dark" ? "#94A3B8" : "#64748B";
  const gridColor = theme === "dark" ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.15)";

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-[#10182E] p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          No saved analyses in your SOC dashboard yet
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
          Extract indicators in the Analyzer and click "Save to History", or populate the dashboard with the 4 bundled incident scenarios to explore trends.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={seedSampleHistory}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-semibold"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Load 4 Sample Reports into History</span>
          </button>
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>Open Analyzer</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Threat Intelligence Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Aggregated across your locally persisted incident case history
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-[#10182E] border border-slate-200 dark:border-slate-800 self-start">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" aria-hidden="true" />
          {(
            [
              { id: "all", label: "All Time" },
              { id: "30d", label: "30 Days" },
              { id: "7d", label: "7 Days" },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setDateRange(r.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                dateRange === r.id
                  ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Reports Analyzed</div>
          <div className="font-display text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {metrics.totalReports}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Unique IOCs</div>
          <div className="font-display text-2xl font-bold font-mono tabular-nums text-cyan-700 dark:text-cyan-400 mt-1">
            {metrics.totalIOCs}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Average Risk Score</div>
          <div className="font-display text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {metrics.avgRisk}
            <span className="text-xs text-slate-400 font-normal">/100</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">High / Critical Cases</div>
          <div className="font-display text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {metrics.criticalOrHigh}
          </div>
        </div>
      </section>

      {/* Charts Grid Row 1 */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart: IOC Type Distribution */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-5">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-4">
            IOC Type Distribution
          </h3>
          {metrics.typeDistribution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              No indicators in selected date range.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.typeDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {metrics.typeDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "#0F172A" : "#FFFFFF",
                      borderColor: theme === "dark" ? "#334155" : "#E2E8F0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
            {metrics.typeDistribution.map((d) => (
              <div key={d.name} className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span>{d.name}</span>
                <span className="font-mono tabular-nums text-slate-400">({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Line / Area Chart: IOCs Over Time */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-5">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Extracted IOCs Over Time
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.chronological}>
                <defs>
                  <linearGradient id="iocAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#0F172A" : "#FFFFFF",
                    borderColor: theme === "dark" ? "#334155" : "#E2E8F0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="iocs"
                  name="Unique IOCs"
                  stroke="#22D3EE"
                  strokeWidth={2}
                  fill="url(#iocAreaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Charts Grid Row 2 */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Recurring Indicators */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-5">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Top Recurring Indicators
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.topRecurring} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fill: axisColor, fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={150}
                  tick={{ fill: axisColor, fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#0F172A" : "#FFFFFF",
                    borderColor: theme === "dark" ? "#334155" : "#E2E8F0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" name="Occurrences" radius={[0, 4, 4, 0]}>
                  {metrics.topRecurring.map((item) => (
                    <Cell key={item.fullValue} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Score Trend */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-5">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Risk Score Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.chronological}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: axisColor, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#0F172A" : "#FFFFFF",
                    borderColor: theme === "dark" ? "#334155" : "#E2E8F0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="risk"
                  name="Risk Score"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#8B5CF6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Recent Activity Feed */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Recent Triage Activity
          </h3>
          <Link
            to="/history"
            className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline"
          >
            View all history
          </Link>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {filteredHistory.slice(0, 6).map((item) => {
            const topTypes = IOC_TYPE_ORDER.filter(
              (t) => item.result.summary.byType[t] > 0
            ).slice(0, 3);
            return (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      loadFromHistory(item.id);
                      navigate("/analyze");
                    }}
                    className="text-sm font-semibold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 text-left truncate block max-w-xl"
                  >
                    {item.title}
                  </button>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.result.summary.uniqueCount} IOCs</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Risk {item.result.summary.riskScore}/100 (
                      <RiskLevelText level={item.result.summary.riskLevel} />)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {topTypes.map((t) => (
                    <IOCTypeBadge key={t} type={t} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
