import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, MessageSquare, ThumbsUp, Trophy } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { PriorityIndicator, StatusIndicator } from '../components/CivicBadges';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { BADGE_DEFINITIONS, CATEGORY_LABELS } from '../lib/civicLogic';
import type { CivicReport, PointsTransaction, UserProfile } from '../types/civic';

export function CommunityPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [repRes, lbRes] = await Promise.all([
          api.getReports({ limit: 15 }),
          api.getLeaderboard(),
        ]);
        if (mounted) {
          setReports(repRes.reports);
          setLeaderboard(lbRes.leaderboard);
          setTransactions(lbRes.transactions);
        }
      } catch {
        // Ignore transient error
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleVote = async (reportId: string) => {
    setError('');
    try {
      const res = await api.toggleVote(reportId);
      setReports((prev) => prev.map((r) => (r.id === reportId ? res.report : r)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update vote.');
    }
  };

  return (
    <DashboardLayout
      title="Community & Civic Points"
      subtitle="Collaborate with neighbors, verify resolutions, and view the Civic Champion leaderboard"
    >
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-display text-base font-bold text-[#14213D]">
              Active Community Discussions &amp; Upvotes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upvote urgent reports (+5 pts) or open a dossier to verify fixes (+15 pts).
            </p>
          </div>

          {reports.map((report) => {
            const upvoted = user ? report.upvoter_ids.includes(user.id) : false;
            return (
              <div
                key={report.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{report.id}</span> · {CATEGORY_LABELS[report.category]} ·{' '}
                      {report.locality}
                    </p>
                    <Link
                      to={`/report/${report.id}`}
                      className="font-display text-base font-bold text-[#14213D] hover:text-[#10B981] block"
                    >
                      {report.title}
                    </Link>
                    <p className="text-xs text-slate-600 line-clamp-2">{report.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleVote(report.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 inline-flex items-center gap-1.5 ${
                      upvoted
                        ? 'bg-[#14213D] text-white border-[#14213D]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span className="tabular-nums">{report.upvote_count}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <StatusIndicator status={report.status} />
                  <div className="flex items-center gap-4">
                    <PriorityIndicator label={report.priority_label} score={report.priority_score} />
                    <Link
                      to={`/report/${report.id}`}
                      className="text-xs font-medium text-slate-600 hover:text-[#14213D] inline-flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="tabular-nums">{report.comments.length}</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leaderboard & Point Rules */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#14213D]">
                Civic Champion Leaderboard
              </h2>
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>

            <div className="divide-y divide-slate-200">
              {leaderboard.map((member, index) => (
                <div key={member.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-slate-500 w-5 tabular-nums">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#14213D] truncate">
                        {member.full_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {member.locality} · {member.badges.length} badges
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#10B981] tabular-nums shrink-0">
                    {member.civic_points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#14213D]">
                Points &amp; Badge Rules
              </h2>
              <Award className="w-5 h-5 text-[#14213D]" />
            </div>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex justify-between py-1 border-b border-slate-100">
                <span>First valid report</span>
                <span className="font-mono font-semibold text-[#10B981]">+20 pts</span>
              </li>
              <li className="flex justify-between py-1 border-b border-slate-100">
                <span>Supporting an existing report</span>
                <span className="font-mono font-semibold text-[#10B981]">+5 pts</span>
              </li>
              <li className="flex justify-between py-1 border-b border-slate-100">
                <span>Helpful community comment</span>
                <span className="font-mono font-semibold text-[#10B981]">+5 pts</span>
              </li>
              <li className="flex justify-between py-1">
                <span>Verified resolution feedback</span>
                <span className="font-mono font-semibold text-[#10B981]">+15 pts</span>
              </li>
            </ul>
            <div className="pt-2 space-y-1.5">
              <p className="text-xs font-semibold text-[#14213D]">Available Badges</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {BADGE_DEFINITIONS.map((b) => b.name).join(' · ')}
              </div>
            </div>
          </div>

          {transactions.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <h3 className="font-display text-sm font-bold text-[#14213D]">
                Recent Points Ledger
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {transactions.slice(0, 8).map((tx) => (
                  <div key={tx.id} className="text-xs flex items-center justify-between gap-2 py-1 border-b border-slate-100">
                    <span className="text-slate-600 truncate">{tx.action_type}</span>
                    <span className="font-mono font-semibold text-[#10B981] shrink-0">
                      +{tx.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
