import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Copy, ShieldCheck } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { EscalationIndicator } from '../components/CivicBadges';
import { api } from '../lib/api';
import { BADGE_DEFINITIONS, CATEGORY_LABELS } from '../lib/civicLogic';
import type {
  AdminAuditLog,
  CivicReport,
  DuplicateLinkView,
  IssueCategory,
  PlatformSettings,
  UserProfile,
  UserRole,
} from '../types/civic';

export function AdminDashboardPage() {
  const [users, setUsers] = useState<Array<UserProfile & { is_active: boolean }>>([]);
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<
    Array<{
      id: string;
      report_id: string;
      report_title: string;
      author_name: string;
      content: string;
      flag_reason?: string;
    }>
  >([]);
  const [duplicateLinks, setDuplicateLinks] = useState<DuplicateLinkView[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [aiStats, setAiStats] = useState({
    total_requests: 0,
    successful_classifications: 0,
    manual_fallbacks: 0,
  });

  const [projectForm, setProjectForm] = useState({
    name: '',
    department: '',
    locality: '',
    description: '',
    estimated_cost: '',
    status: 'Ongoing',
    official_source: 'Municipal Works Gazette',
  });

  const [tab, setTab] = useState<
    'users' | 'assignments' | 'duplicates' | 'moderation' | 'projects' | 'settings' | 'audit'
  >('users');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadAll = async () => {
    try {
      const [overview, repRes] = await Promise.all([
        api.getAdminOverview(),
        api.getReports({ limit: 50 }),
      ]);
      setUsers(overview.users);
      setFlaggedComments(overview.flaggedComments);
      setDuplicateLinks(overview.duplicateLinks || []);
      setAuditLogs(overview.auditLogs);
      setSettings(overview.settings);
      setAiStats(overview.aiStats);
      setReports(repRes.reports);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load admin console.');
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setError('');
    setNotice('');
    try {
      await api.updateUserRole(userId, { role });
      setNotice('User role updated and logged in audit trail.');
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Role update failed.');
    }
  };

  const handleAssignOfficer = async (reportId: string, officerId: string) => {
    if (!officerId) return;
    setError('');
    setNotice('');
    try {
      await api.assignOfficer(reportId, officerId);
      setNotice(`Assigned officer to ${reportId}.`);
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Officer assignment failed.');
    }
  };

  const handleReviewDuplicate = async (linkId: string, reviewStatus: 'confirmed' | 'dismissed') => {
    setError('');
    setNotice('');
    try {
      await api.reviewDuplicate(linkId, reviewStatus);
      setNotice(`Duplicate link marked as ${reviewStatus}.`);
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to review duplicate link.');
    }
  };

  const handleModerate = async (reportId: string, commentId: string, action: 'hide' | 'dismiss') => {
    try {
      await api.moderateComment(reportId, commentId, action);
      setNotice(`Comment moderation (${action}) recorded.`);
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Moderation failed.');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await api.createProject(projectForm);
      setNotice('Verified public project published to Know Your Development.');
      setProjectForm({
        name: '',
        department: '',
        locality: '',
        description: '',
        estimated_cost: '',
        status: 'Ongoing',
        official_source: 'Municipal Works Gazette',
      });
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add project.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setError('');
    setNotice('');
    try {
      await api.updateSettings(settings);
      setNotice('Platform duplicate, verification, and escalation targets updated.');
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update settings.');
    }
  };

  const officers = users.filter((u) => u.role === 'officer' || u.role === 'admin');

  return (
    <DashboardLayout
      title="Administrator Governance Console"
      subtitle="Role assignment, officer dispatch, duplicate review, moderation, projects, and audit logs"
    >
      <div className="space-y-6">
        {notice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* AI & Platform KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Registered Accounts</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#14213D] tabular-nums">
              {users.length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">AI Image Requests</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#14213D] tabular-nums">
              {aiStats.total_requests}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">AI Classifications Succeeded</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#10B981] tabular-nums">
              {aiStats.successful_classifications}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Duplicate Links · Flagged</p>
            <p className="mt-1 font-display text-2xl font-bold text-amber-600 tabular-nums">
              {duplicateLinks.length} / {flaggedComments.length}
            </p>
          </div>
        </div>

        {/* Segmented Tab Controls */}
        <div className="flex flex-wrap gap-1 p-1 bg-slate-200/70 rounded-xl w-fit">
          {(
            [
              ['users', 'Users & Roles'],
              ['assignments', 'Officer Dispatch'],
              ['duplicates', 'Duplicate Links'],
              ['moderation', 'Moderation'],
              ['projects', 'Add Project'],
              ['settings', 'Thresholds & Rules'],
              ['audit', 'Audit Logs'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === key
                  ? 'bg-white text-[#14213D] shadow-sm'
                  : 'text-slate-600 hover:text-[#14213D]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab 1: Users & Roles */}
        {tab === 'users' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Locality</th>
                  <th className="py-3 px-4">Points</th>
                  <th className="py-3 px-4">Role Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#14213D]">{u.full_name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{u.locality}</td>
                    <td className="py-3 px-4 font-mono text-xs tabular-nums">{u.civic_points}</td>
                    <td className="py-3 px-4">
                      <select
                        aria-label={`Change role for ${u.full_name}`}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="citizen">Citizen</option>
                        <option value="officer">Officer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Officer Dispatch */}
        {tab === 'assignments' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th className="py-3 px-4">Report</th>
                  <th className="py-3 px-4">Status &amp; Escalation</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assigned Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-4">
                      <Link to={`/report/${r.id}`} className="font-semibold text-[#14213D] hover:underline">
                        {r.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{r.id}</span> · {r.locality}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs space-y-1">
                      <div>{r.status}</div>
                      <EscalationIndicator escalation={r.escalation} />
                    </td>
                    <td className="py-3 px-4 font-mono text-xs tabular-nums">{r.priority_score}/100</td>
                    <td className="py-3 px-4">
                      <select
                        aria-label={`Assign officer for ${r.id}`}
                        value={r.assigned_officer_id || ''}
                        onChange={(e) => handleAssignOfficer(r.id, e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="">Unassigned</option>
                        {officers.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.full_name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Duplicate Links Review */}
        {tab === 'duplicates' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-[#14213D]" />
              <h2 className="font-display text-base font-bold text-[#14213D]">
                Duplicate Complaint Support Links
              </h2>
            </div>
            {duplicateLinks.length === 0 ? (
              <p className="text-sm text-slate-500">
                No duplicate complaint links recorded yet. Citizens who confirm an existing nearby issue during Step 5 appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {duplicateLinks.map((link) => {
                  const reporterName =
                    users.find((u) => u.id === link.reported_by)?.full_name || link.reported_by;
                  return (
                    <div
                      key={link.id}
                      className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500">
                          <Link
                            to={`/report/${link.primary_report_id}`}
                            className="font-mono font-semibold text-[#14213D] hover:underline"
                          >
                            {link.primary_report_id}
                          </Link>{' '}
                          · Action: {link.resolution_action} · Distance{' '}
                          <span className="font-mono tabular-nums">{link.distance_meters}m</span> ·
                          Similarity{' '}
                          <span className="font-mono tabular-nums">
                            {Math.round(link.similarity_score * 100)}%
                          </span>
                        </p>
                        <p className="text-sm font-semibold text-[#14213D]">
                          {link.primary_title || link.primary_report_id}
                        </p>
                        <p className="text-xs text-slate-600">
                          Confirmed by {reporterName} · Review Status:{' '}
                          <strong className="capitalize">{link.review_status}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReviewDuplicate(link.id, 'confirmed')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10B981] text-white"
                        >
                          Confirm Link
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewDuplicate(link.id, 'dismissed')}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Comment Moderation */}
        {tab === 'moderation' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#14213D]">
              Flagged Community Comments
            </h2>
            {flaggedComments.length === 0 ? (
              <p className="text-sm text-slate-500">No flagged comments pending review.</p>
            ) : (
              <div className="space-y-3">
                {flaggedComments.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs text-slate-500">
                      On <strong>{c.report_title}</strong> by {c.author_name} · Reason:{' '}
                      {c.flag_reason}
                    </p>
                    <p className="text-sm text-slate-800">{c.content}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleModerate(c.report_id, c.id, 'hide')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white"
                      >
                        Hide Comment
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModerate(c.report_id, c.id, 'dismiss')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700"
                      >
                        Dismiss Flag
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Add Verified Infrastructure Project */}
        {tab === 'projects' && (
          <form
            onSubmit={handleCreateProject}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 max-w-2xl"
          >
            <h2 className="font-display text-base font-bold text-[#14213D]">
              Publish Verified Infrastructure Project
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                type="text"
                required
                placeholder="Project Name"
                value={projectForm.name}
                onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Department"
                value={projectForm.department}
                onChange={(e) => setProjectForm((p) => ({ ...p, department: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Locality"
                value={projectForm.locality}
                onChange={(e) => setProjectForm((p) => ({ ...p, locality: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
              <input
                type="text"
                placeholder="Estimated Cost (if officially verified)"
                value={projectForm.estimated_cost}
                onChange={(e) => setProjectForm((p) => ({ ...p, estimated_cost: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Current Status"
                value={projectForm.status}
                onChange={(e) => setProjectForm((p) => ({ ...p, status: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Official Source"
                value={projectForm.official_source}
                onChange={(e) => setProjectForm((p) => ({ ...p, official_source: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <textarea
              required
              rows={3}
              placeholder="Verified Project Scope & Description"
              value={projectForm.description}
              onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#14213D]"
            >
              Publish Project Record
            </button>
          </form>
        )}

        {/* Tab 6: Platform Settings & Rules */}
        {tab === 'settings' && settings && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleSaveSettings}
              className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <h2 className="font-display text-base font-bold text-[#14213D]">
                Configurable Duplicate, Verification &amp; Escalation Thresholds
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="set-radius" className="block text-xs font-medium text-slate-700 mb-1">
                    Duplicate Radius (metres)
                  </label>
                  <input
                    id="set-radius"
                    type="number"
                    min={10}
                    max={500}
                    value={settings.duplicate_radius_meters}
                    onChange={(e) =>
                      setSettings({ ...settings, duplicate_radius_meters: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="set-sim" className="block text-xs font-medium text-slate-700 mb-1">
                    Similarity Threshold (0.1 - 0.95)
                  </label>
                  <input
                    id="set-sim"
                    type="number"
                    step="0.05"
                    min={0.1}
                    max={0.95}
                    value={settings.duplicate_similarity_threshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        duplicate_similarity_threshold: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="set-confirm" className="block text-xs font-medium text-slate-700 mb-1">
                    Confirmations to Close
                  </label>
                  <input
                    id="set-confirm"
                    type="number"
                    min={1}
                    max={20}
                    value={settings.verification_confirm_threshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        verification_confirm_threshold: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="set-reopen" className="block text-xs font-medium text-slate-700 mb-1">
                    Negative Votes to Reopen
                  </label>
                  <input
                    id="set-reopen"
                    type="number"
                    min={1}
                    max={20}
                    value={settings.verification_reopen_threshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        verification_reopen_threshold: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="set-ack-hours" className="block text-xs font-medium text-slate-700 mb-1">
                    Review Escalation Target (hours)
                  </label>
                  <input
                    id="set-ack-hours"
                    type="number"
                    min={4}
                    max={168}
                    value={settings.target_acknowledge_hours ?? 24}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        target_acknowledge_hours: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="set-resolve-hours" className="block text-xs font-medium text-slate-700 mb-1">
                    Resolution Escalation Target (hours)
                  </label>
                  <input
                    id="set-resolve-hours"
                    type="number"
                    min={12}
                    max={720}
                    value={settings.target_resolve_hours ?? 96}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        target_resolve_hours: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Project-defined triage and escalation targets for internal workflow prioritization.
              </p>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#14213D]"
              >
                Save Thresholds
              </button>
            </form>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div>
                <h3 className="font-display text-sm font-bold text-[#14213D]">
                  Active Issue Categories (6)
                </h3>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {(Object.keys(CATEGORY_LABELS) as IssueCategory[]).map((cat) => (
                    <li key={cat}>
                      <span className="font-mono text-slate-500">{cat}</span> · {CATEGORY_LABELS[cat]}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-3 border-t border-slate-200">
                <h3 className="font-display text-sm font-bold text-[#14213D]">
                  Civic Points &amp; Badge Tiers
                </h3>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {BADGE_DEFINITIONS.map((b) => (
                    <li key={b.slug} className="flex justify-between gap-2">
                      <span>{b.name}</span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {b.threshold_points} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Immutable Admin Audit Logs */}
        {tab === 'audit' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#14213D]" />
              <h2 className="font-display text-base font-bold text-[#14213D]">
                Administrator Audit Trail
              </h2>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-mono font-semibold text-[#14213D]">{log.action}</span>
                    <span className="font-mono text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600">{log.details}</p>
                  <p className="text-[11px] text-slate-500">Actor: {log.admin_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

