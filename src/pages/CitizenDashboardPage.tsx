import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, FilePlus2, ShieldAlert, ThumbsUp } from 'lucide-react';
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
import { BADGE_DEFINITIONS } from '../lib/civicLogic';
import type { CivicReport } from '../types/civic';

export function CitizenDashboardPage() {
  const { user, refreshUser } = useAuth();
  const { t } = useI18n();
  const [myReports, setMyReports] = useState<CivicReport[]>([]);
  const [highPriorityReports, setHighPriorityReports] = useState<CivicReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshUser();
        const [mine, urgent] = await Promise.all([
          api.getReports({ userId: user?.id, limit: 25 }),
          api.getReports({ priority: 'Critical,High', limit: 8 }),
        ]);
        if (mounted) {
          setMyReports(mine.reports);
          setHighPriorityReports(urgent.reports);
        }
      } catch {
        // Handled gracefully
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id, refreshUser]);

  const handleUpvoteUrgent = async (e: React.MouseEvent, reportId: string) => {
    e.preventDefault();
    try {
      const res = await api.toggleVote(reportId);
      setHighPriorityReports((prev) => prev.map((r) => (r.id === reportId ? res.report : r)));
      setMyReports((prev) => prev.map((r) => (r.id === reportId ? res.report : r)));
      await refreshUser();
    } catch {
      // Ignore if transient
    }
  };

  const totalSubmitted = myReports.length;
  const pendingCount = myReports.filter(
    (r) => r.status === 'Submitted' || r.status === 'Under Review' || r.status === 'Reopened'
  ).length;
  const inProgressCount = myReports.filter(
    (r) => r.status === 'Acknowledged' || r.status === 'In Progress'
  ).length;
  const resolvedCount = myReports.filter(
    (r) => r.status === 'Resolved - Awaiting Verification' || r.status === 'Closed'
  ).length;
  const totalUpvotesReceived = myReports.reduce((acc, r) => acc + r.upvote_count, 0);

  return (
    <DashboardLayout
      title={`Welcome, ${user?.full_name || 'Citizen'}`}
      subtitle={`${user?.locality || 'Central Ward'} · Role: ${user?.role || 'citizen'}`}
    >
      <div className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Total Submitted</p>
            <p className="mt-1.5 font-display text-2xl font-bold text-[#14213D] tabular-nums">
              {loading ? '—' : totalSubmitted}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Pending</p>
            <p className="mt-1.5 font-display text-2xl font-bold text-amber-600 tabular-nums">
              {loading ? '—' : pendingCount}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">In Progress</p>
            <p className="mt-1.5 font-display text-2xl font-bold text-sky-600 tabular-nums">
              {loading ? '—' : inProgressCount}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Resolved</p>
            <p className="mt-1.5 font-display text-2xl font-bold text-[#10B981] tabular-nums">
              {loading ? '—' : resolvedCount}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Upvotes Received</p>
            <p className="mt-1.5 font-display text-2xl font-bold text-[#14213D] tabular-nums flex items-center gap-1.5">
              <ThumbsUp className="w-4 h-4 text-[#38BDF8]" />
              <span>{loading ? '—' : totalUpvotesReceived}</span>
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Civic Points</p>
            <p className="mt-1.5 font-display text-2xl font-bold text-[#10B981] tabular-nums">
              {user?.civic_points ?? 0}
            </p>
          </div>
        </div>

        {/* My Posted Issues & Civic Achievements */}
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#14213D]">My Posted Issues</h2>
                <p className="text-xs text-slate-500">
                  Track every complaint you reported, its AI category, and officer progress
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/my-reports"
                  className="text-xs font-semibold text-[#14213D] hover:text-[#10B981] whitespace-nowrap"
                >
                  View All
                </Link>
                <Link
                  to="/report"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-[#14213D] hover:bg-[#1e3159] whitespace-nowrap"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>Report New Issue</span>
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : myReports.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl space-y-3">
                <p className="text-sm font-medium text-slate-700">
                  You have not posted any civic issues yet.
                </p>
                <p className="text-xs text-slate-500">
                  Click or upload a photograph to auto-detect the problem and earn +20 Civic Points.
                </p>
                <Link
                  to="/report"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#10B981]"
                >
                  <span>Submit First Report</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {myReports.slice(0, 6).map((r) => (
                  <Link
                    key={r.id}
                    to={`/report/${r.id}`}
                    className="py-3.5 flex items-center gap-4 hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
                  >
                    <ResilientImage
                      src={r.image_url}
                      alt={r.title}
                      className="w-16 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#14213D] truncate">{r.title}</p>
                      <p className="text-xs text-slate-500 truncate">
                        <span className="font-mono">{r.id}</span> · {t.categories[r.category]} ·{' '}
                        {r.locality} · {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <StatusIndicator status={r.status} />
                      <div className="flex items-center justify-end gap-2">
                        <EscalationIndicator escalation={r.escalation} />
                        <PriorityIndicator label={r.priority_label} score={r.priority_score} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#14213D]">Civic Achievements</h2>
              <Award className="w-5 h-5 text-[#10B981]" />
            </div>
            <div className="space-y-3">
              {BADGE_DEFINITIONS.map((badge) => {
                const unlocked = (user?.badges || []).includes(badge.name);
                return (
                  <div
                    key={badge.slug}
                    className={`p-3 rounded-lg border ${
                      unlocked
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#14213D]">{badge.name}</p>
                      <span className="text-xs font-mono tabular-nums text-slate-600">
                        {unlocked ? 'Earned' : `${badge.threshold_points} pts`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{badge.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* High & Critical Priority Issues Across City */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-lg font-bold text-[#14213D]">
                  High &amp; Critical Priority Issues (Community &amp; City-Wide)
                </h2>
                <p className="text-xs text-slate-500">
                  Urgent problems posted by citizens across neighborhoods, ranked by severity, support, duplicates, and waiting time.
                </p>
              </div>
            </div>
            <Link
              to="/explore?priority=Critical,High"
              className="text-xs font-semibold text-[#14213D] hover:text-[#10B981] whitespace-nowrap"
            >
              View All High Priority →
            </Link>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : highPriorityReports.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">
              No High or Critical priority issues reported currently.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {highPriorityReports.map((r) => {
                const upvoted = user ? r.upvoter_ids.includes(user.id) : false;
                return (
                  <Link
                    key={r.id}
                    to={`/report/${r.id}`}
                    className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-slate-500">{r.id}</span>
                        <PriorityIndicator label={r.priority_label} score={r.priority_score} />
                      </div>
                      <p className="text-sm font-bold text-[#14213D] line-clamp-2">{r.title}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {t.categories[r.category]} · {r.locality}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <StatusIndicator status={r.status} />
                      <button
                        type="button"
                        onClick={(e) => handleUpvoteUrgent(e, r.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border ${
                          upvoted
                            ? 'bg-[#14213D] text-white border-[#14213D]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span className="tabular-nums">{r.upvote_count}</span>
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
