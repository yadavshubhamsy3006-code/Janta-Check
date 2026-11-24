import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { api, type AnalyticsResponse } from '../lib/api';
import type { IssueCategory } from '../types/civic';

const CHART_COLORS = ['#14213D', '#10B981', '#38BDF8', '#D97706', '#DC2626', '#64748B'];

export function AnalyticsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [category, setCategory] = useState('all');
  const [locality, setLocality] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await api.getAnalytics({ category, locality, dateRange });
        if (mounted) setData(res);
      } catch {
        // Ignore transient failure
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [category, locality, dateRange]);

  const body = (
    <div className="space-y-6">
      {data?.isDemoDataset && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <strong>Demonstration Dataset Notice:</strong> Statistics below are computed dynamically from stored demonstration database records rather than live municipal feeds.
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid sm:grid-cols-3 gap-3">
        <select
          aria-label="Filter analytics by date range"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
        >
          <option value="all">All Time</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>

        <select
          aria-label="Filter analytics by locality"
          value={locality}
          onChange={(e) => setLocality(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
        >
          <option value="all">All Localities</option>
          {(data?.localities || []).map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter analytics by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
        >
          <option value="all">All Categories</option>
          {(Object.keys(t.categories) as IssueCategory[]).map((cat) => (
            <option key={cat} value={cat}>
              {t.categories[cat]}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Civic Issues</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#14213D] tabular-nums">
            {loading ? '—' : data?.summary.total ?? 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="mt-1 font-display text-2xl font-bold text-amber-600 tabular-nums">
            {loading ? '—' : data?.summary.pending ?? 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">In Progress</p>
          <p className="mt-1 font-display text-2xl font-bold text-sky-600 tabular-nums">
            {loading ? '—' : data?.summary.inProgress ?? 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Resolved</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#10B981] tabular-nums">
            {loading ? '—' : data?.summary.resolved ?? 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-slate-500">Resolution Percentage</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#14213D] tabular-nums">
            {loading ? '—' : `${data?.summary.resolutionRate ?? 0}%`}
          </p>
        </div>
      </div>

      {/* Civic Trend Insights (Data-Backed Only) */}
      {data?.trendInsights && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-[#14213D] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#10B981]" />
              <span>Civic Insights &amp; Recurring Patterns</span>
            </h2>
            {data.trendInsights.mostCommonCategory && (
              <span className="text-xs text-slate-600">
                Most Reported:{' '}
                <strong className="text-[#14213D]">
                  {t.categories[data.trendInsights.mostCommonCategory]}
                </strong>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{data.trendInsights.note}</p>
          {data.trendInsights.sufficientData && data.trendInsights.insights.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              {data.trendInsights.insights.map((ins) => (
                <div
                  key={ins.id}
                  className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700"
                >
                  <p className="font-semibold text-[#14213D]">
                    {ins.locality} · {t.categories[ins.category]} ({ins.count} reports)
                  </p>
                  <p className="mt-1">{ins.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-[#14213D]">
            1. Issue Category Distribution
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.categoryDistribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {(data?.categoryDistribution || []).map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-[#14213D]">
            2. Monthly Reporting Trends
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.monthlyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="reported" name="Reported" stroke="#14213D" strokeWidth={2.5} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10B981" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-[#14213D]">
            3 &amp; 4. Locality-wise Resolved vs Pending
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.localityComparison || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="locality" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#10B981" />
                <Bar dataKey="pending" name="Open / Pending" stackId="a" fill="#D97706" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-[#14213D]">
            5. Priority Distribution (Decision-Support Score)
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.priorityDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Reports" fill="#38BDF8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ward / Locality Statistics Breakdown */}
      {data?.wardStats && data.wardStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <div className="p-5 border-b border-slate-200">
            <h2 className="font-display text-base font-bold text-[#14213D]">
              Ward / Locality Performance Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Grouped strictly from user-confirmed locality labels and stored coordinates.
            </p>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4">Locality / Ward</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Pending</th>
                <th className="py-3 px-4">In Progress</th>
                <th className="py-3 px-4">Resolved</th>
                <th className="py-3 px-4">Resolution %</th>
                <th className="py-3 px-4">Top Issue</th>
                <th className="py-3 px-4">Delayed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.wardStats.map((w) => (
                <tr key={w.locality}>
                  <td className="py-3 px-4 font-semibold text-[#14213D]">{w.locality}</td>
                  <td className="py-3 px-4 font-mono tabular-nums">{w.total}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-amber-700">{w.pending}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-sky-700">{w.inProgress}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[#10B981]">{w.resolved}</td>
                  <td className="py-3 px-4 font-mono tabular-nums font-semibold">{w.resolutionRate}%</td>
                  <td className="py-3 px-4">{t.categories[w.topCategory]}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-red-700">{w.delayedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (user) {
    return (
      <DashboardLayout
        title="Public Analytics Dashboard"
        subtitle="Real-time metrics, ward breakdown, and data-backed civic insights"
      >
        {body}
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PublicNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#14213D]">
            Public Civic Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Transparent breakdown of infrastructure complaints, resolution percentages, and ward insights.
          </p>
        </div>
        {body}
      </div>
    </div>
  );
}
