import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ThumbsUp } from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { DashboardLayout } from '../components/DashboardLayout';
import {
  EscalationIndicator,
  PriorityIndicator,
  ResilientImage,
  StatusIndicator,
} from '../components/CivicBadges';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../lib/api';
import { ALL_REPORT_STATUSES } from '../lib/civicLogic';
import type { CivicReport, IssueCategory } from '../types/civic';

export function ExploreIssuesPage({ mineOnly = false }: { mineOnly?: boolean }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();

  const [reports, setReports] = useState<CivicReport[]>([]);
  const [total, setTotal] = useState(0);
  const [isDemoDataset, setIsDemoDataset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(searchParams.get('category') || 'all');
  const [status, setStatus] = useState<string>(searchParams.get('status') || 'all');
  const [priority, setPriority] = useState<string>(searchParams.get('priority') || 'all');
  const [page, setPage] = useState(1);
  const limit = 12;

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getReports({
        category,
        status,
        priority,
        search,
        userId: mineOnly ? user?.id : undefined,
        page,
        limit,
      });
      setReports(res.reports);
      setTotal(res.total);
      setIsDemoDataset(res.isDemoDataset);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, status, priority, page, mineOnly, user?.id]);

  const handleUpvote = async (e: React.MouseEvent, reportId: string) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to upvote civic reports.');
      return;
    }
    try {
      const res = await api.toggleVote(reportId);
      setReports((prev) => prev.map((r) => (r.id === reportId ? res.report : r)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Vote failed.');
    }
  };

  const content = (
    <div className="space-y-6">
      {isDemoDataset && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <strong>Demonstration Data:</strong> Records labelled with <span className="font-mono">JC-DEMO-*</span> represent sample locations and scenarios for platform evaluation.
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Quick Priority & Scope Tabs */}
      {!mineOnly && (
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => {
              setPriority('all');
              setStatus('all');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              priority === 'all' && status === 'all'
                ? 'bg-white text-[#14213D] shadow-sm'
                : 'text-slate-600 hover:text-[#14213D]'
            }`}
          >
            All Public Issues
          </button>
          <button
            type="button"
            onClick={() => {
              setPriority('Critical,High');
              setStatus('all');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              priority === 'Critical,High'
                ? 'bg-white text-red-700 shadow-sm'
                : 'text-slate-600 hover:text-[#14213D]'
            }`}
          >
            High &amp; Critical Priority
          </button>
          <button
            type="button"
            onClick={() => {
              setPriority('all');
              setStatus('Resolved - Awaiting Verification');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              status === 'Resolved - Awaiting Verification'
                ? 'bg-white text-[#10B981] shadow-sm'
                : 'text-slate-600 hover:text-[#14213D]'
            }`}
          >
            Needs Verification
          </button>
          {user && (
            <Link
              to="/my-reports"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#14213D] whitespace-nowrap"
            >
              My Posted Issues →
            </Link>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid md:grid-cols-12 gap-3">
        <div className="md:col-span-5 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                fetchReports();
              }
            }}
            placeholder="Search by title, locality, or report ID..."
            aria-label="Search reports"
            className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setPage(1);
              fetchReports();
            }}
            className="px-3.5 py-2 rounded-lg bg-[#14213D] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>

        <div className="md:col-span-2">
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="all">All Categories</option>
            {(Object.keys(t.categories) as IssueCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {t.categories[cat]}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="all">All Statuses</option>
            {ALL_REPORT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            aria-label="Filter by priority"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-xl bg-slate-200/70 animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <p className="text-base font-semibold text-[#14213D]">
            {mineOnly ? 'You have not submitted any reports matching these filters.' : 'No civic issues matched your filters.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCategory('all');
                setStatus('all');
                setPriority('all');
                setSearch('');
              }}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-slate-300 text-slate-700"
            >
              Reset Filters
            </button>
            <Link
              to="/report"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#10B981] text-white"
            >
              Report an Issue
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map((report) => {
            const upvoted = user ? report.upvoter_ids.includes(user.id) : false;
            return (
              <Link
                key={report.id}
                to={`/report/${report.id}`}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors flex flex-col"
              >
                <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                  <ResilientImage
                    src={report.image_url}
                    alt={report.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{report.id}</span> · {t.categories[report.category]} ·{' '}
                      {report.locality}
                    </p>
                    <h3 className="font-display font-bold text-base text-[#14213D] line-clamp-2">
                      {report.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{report.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <StatusIndicator status={report.status} />
                      <button
                        type="button"
                        onClick={(e) => handleUpvote(e, report.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          upvoted
                            ? 'bg-[#14213D] text-white border-[#14213D]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="tabular-nums">{report.upvote_count}</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <PriorityIndicator
                        label={report.priority_label}
                        score={report.priority_score}
                      />
                      <EscalationIndicator escalation={report.escalation} />
                      <span className="text-xs text-slate-400">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500 tabular-nums">
            Showing {reports.length} of {total} complaints
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (mineOnly || user) {
    return (
      <DashboardLayout
        title={mineOnly ? 'My Submitted Reports' : 'Explore Public Issues'}
        subtitle={
          mineOnly
            ? 'Track the status and priority of complaints you filed'
            : 'Filter, inspect, and support public infrastructure reports across neighborhoods'
        }
      >
        {content}
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PublicNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#14213D]">
            Explore Public Issues
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Browse unresolved and completed infrastructure reports ordered by priority score.
          </p>
        </div>
        {content}
      </div>
    </div>
  );
}
