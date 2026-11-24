import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Cpu,
  Flag,
  MessageSquare,
  Share2,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { DashboardLayout } from '../components/DashboardLayout';
import {
  EscalationIndicator,
  PriorityIndicator,
  ResilientImage,
  StatusIndicator,
} from '../components/CivicBadges';
import { BeforeAfterSlider } from '../components/BeforeAfterSlider';
import { LeafletMapView } from '../components/LeafletMapView';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../lib/api';
import type { CivicReport } from '../types/civic';

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const { t } = useI18n();

  const [report, setReport] = useState<CivicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [commentText, setCommentText] = useState('');
  const [verifyComment, setVerifyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReport = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getReportById(id);
      setReport(res.report);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleVote = async () => {
    if (!report) return;
    setError('');
    try {
      const res = await api.toggleVote(report.id);
      setReport(res.report);
      await refreshUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in required to upvote.');
    }
  };

  const handleFollow = async () => {
    if (!report) return;
    setError('');
    try {
      const res = await api.toggleFollow(report.id);
      setNotice(res.following ? 'Following updates for this issue.' : 'Unfollowed issue updates.');
      await loadReport();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in required to follow updates.');
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setNotice('Report link copied to clipboard.');
      }
    } catch {
      setNotice('Copy the URL from your browser address bar to share.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !commentText.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.addComment(report.id, commentText.trim());
      setReport(res.report);
      setCommentText('');
      await refreshUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlagComment = async (commentId: string) => {
    if (!report) return;
    try {
      const res = await api.flagComment(report.id, commentId, 'Reported by community member');
      setNotice(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in required to report comments.');
    }
  };

  const handleVerify = async (confirmed: boolean) => {
    if (!report) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.verifyResolution(report.id, {
        confirmed,
        comment: verifyComment.trim() || undefined,
      });
      setReport(res.report);
      setVerifyComment('');
      setNotice(
        confirmed
          ? 'Thank you! Your resolution confirmation has been recorded (+15 Civic Points).'
          : 'Feedback recorded: marked as still unresolved.'
      );
      await refreshUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to submit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const body = loading ? (
    <div className="h-96 rounded-xl bg-slate-200/70 animate-pulse" />
  ) : !report ? (
    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
      <p className="text-base font-semibold text-[#14213D]">{error || 'Report not found.'}</p>
      <Link to="/explore" className="text-sm font-semibold text-[#10B981]">
        Return to Explore Issues
      </Link>
    </div>
  ) : (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Main Dossier */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="aspect-[16/9] bg-slate-100">
              <ResilientImage
                src={report.image_url}
                alt={report.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  <span className="font-mono font-semibold">{report.id}</span> ·{' '}
                  {t.categories[report.category]} · {report.locality} ·{' '}
                  {new Date(report.created_at).toLocaleString()}
                </p>
                {report.is_demo && (
                  <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    Demonstration Record
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl font-bold text-[#14213D]">{report.title}</h1>
              <p className="text-sm text-slate-700 leading-relaxed">{report.description}</p>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusIndicator status={report.status} />
                  <EscalationIndicator escalation={report.escalation} />
                  <PriorityIndicator label={report.priority_label} score={report.priority_score} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleVote}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 ${
                      user && report.upvoter_ids.includes(user.id)
                        ? 'bg-[#14213D] text-white border-[#14213D]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span className="tabular-nums">Upvote ({report.upvote_count})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFollow}
                    className="px-3 py-2 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>
                      {user && report.follower_ids.includes(user.id) ? 'Following' : 'Follow Updates'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="px-3 py-2 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
              {report.escalation && report.escalation.level !== 'Resolved' && (
                <p className="text-[11px] text-slate-500">
                  Response Tracking: {report.escalation.reason}
                </p>
              )}
            </div>
          </div>

          {/* Interactive Before & After Visual Comparison (whenever resolution photo exists) */}
          {report.resolution_image_url && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <BeforeAfterSlider
                beforeUrl={report.image_url}
                afterUrl={report.resolution_image_url}
              />
              {report.completed_at && (
                <p className="text-xs text-slate-500 font-mono">
                  Resolution Completed On: {new Date(report.completed_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Community Resolution Verification Panel */}
          {report.status === 'Resolved - Awaiting Verification' && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="font-display text-lg font-bold text-[#14213D]">
                  Community Resolution Verification Open
                </h2>
                <p className="text-xs text-slate-700">
                  The assigned officer marked this issue resolved. Citizens near {report.locality} can confirm whether the fix is complete on-site or reopen for further action.
                </p>
              </div>

              <div className="text-xs text-slate-700 flex flex-wrap gap-4 tabular-nums">
                <span>
                  Confirmed fixed:{' '}
                  <strong>{report.verifications.filter((v) => v.confirmed).length}</strong>
                </span>
                <span>
                  Still unresolved:{' '}
                  <strong>{report.verifications.filter((v) => !v.confirmed).length}</strong>
                </span>
              </div>

              {user ? (
                report.verifications.some((v) => v.user_id === user.id) ? (
                  <p className="text-xs font-semibold text-emerald-800">
                    Your verification vote has already been recorded.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={verifyComment}
                      onChange={(e) => setVerifyComment(e.target.value)}
                      placeholder="Optional on-site observation..."
                      className="w-full px-3.5 py-2 rounded-lg border border-emerald-300 bg-white text-sm"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleVerify(true)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Resolution</span>
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleVerify(false)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 inline-flex items-center gap-1.5"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        <span>Issue Remains Unresolved</span>
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <Link
                  to="/login"
                  className="inline-block text-xs font-semibold text-[#14213D] underline"
                >
                  Sign in to verify this resolution
                </Link>
              )}
            </div>
          )}

          {/* Status History Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#14213D]">
              Transparent Status History
            </h2>
            <div className="space-y-3">
              {report.status_history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#14213D]">
                      {entry.previous_status ? `${entry.previous_status} → ` : ''}
                      {entry.new_status}
                    </span>
                    <span className="font-mono text-slate-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{entry.note}</p>
                  <p className="text-[11px] text-slate-500">
                    Updated by {entry.changed_by_name} ({entry.changed_by_role})
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Community Discussion */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#14213D]" />
              <h2 className="font-display text-base font-bold text-[#14213D]">
                Community Discussion ({report.comments.length})
              </h2>
            </div>

            {user ? (
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  required
                  minLength={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share an update or safety observation..."
                  aria-label="Add comment"
                  className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#14213D]"
                >
                  Post
                </button>
              </form>
            ) : (
              <p className="text-xs text-slate-500">
                <Link to="/login" className="font-semibold text-[#14213D] underline">
                  Sign in
                </Link>{' '}
                to participate in the discussion.
              </p>
            )}

            <div className="space-y-3">
              {report.comments.length === 0 ? (
                <p className="text-xs text-slate-500">No comments posted yet.</p>
              ) : (
                report.comments.map((c) => (
                  <div key={c.id} className="p-3.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#14213D]">
                        {c.author_name} · <span className="capitalize text-slate-500">{c.author_role}</span>
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-400">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleFlagComment(c.id)}
                          aria-label="Report abusive comment"
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Priority Math, AI Triage, Location */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-[#14213D]">
              Priority Score Breakdown
            </h2>
            <PriorityIndicator label={report.priority_label} score={report.priority_score} />
            <div className="space-y-2 pt-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">AI / Observed Severity (30%)</span>
                <span className="font-mono tabular-nums">{report.priority_breakdown.severity_points} / 30</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Community Support (30%)</span>
                <span className="font-mono tabular-nums">{report.priority_breakdown.support_points} / 30</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Repeated Reports (20%)</span>
                <span className="font-mono tabular-nums">{report.priority_breakdown.duplicate_points} / 20</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Waiting Time (20%)</span>
                <span className="font-mono tabular-nums">{report.priority_breakdown.waiting_points} / 20</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
              Project-defined decision-support score for triage transparency, not an official municipal assessment.
            </p>
          </div>

          {report.ai_description && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#14213D]">
                <Cpu className="w-4 h-4 text-[#10B981]" />
                <span>AI Triage Suggestion</span>
              </div>
              <p className="text-xs text-slate-600">{report.ai_description}</p>
              {report.ai_reason && <p className="text-xs text-slate-500">Reason: {report.ai_reason}</p>}
              {report.ai_confidence !== undefined && (
                <p className="text-xs font-mono text-slate-500 tabular-nums">
                  Model Confidence: {Math.round(report.ai_confidence * 100)}%
                </p>
              )}
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-[#14213D]">Location Map</h2>
            <LeafletMapView
              reports={[report]}
              center={[report.latitude, report.longitude]}
              zoom={15}
              heightClass="h-56"
              clusterNearby={false}
            />
            <p className="text-xs font-mono text-slate-500 tabular-nums">
              {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)} · {report.locality}
            </p>
            {report.assigned_officer_name && (
              <p className="text-xs text-slate-600 pt-2 border-t border-slate-200">
                Assigned Officer: <strong>{report.assigned_officer_name}</strong>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (user) {
    return (
      <DashboardLayout title={`Complaint ${report?.id || ''}`} subtitle={report?.locality}>
        {body}
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PublicNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{body}</div>
    </div>
  );
}
