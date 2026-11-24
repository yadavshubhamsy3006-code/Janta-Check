import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ImagePlus, Upload, Wrench } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import {
  EscalationIndicator,
  PriorityIndicator,
  ResilientImage,
  StatusIndicator,
} from '../components/CivicBadges';
import { LeafletMapView } from '../components/LeafletMapView';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../lib/api';
import { ALL_REPORT_STATUSES } from '../lib/civicLogic';
import type { CivicReport, IssueCategory, ReportStatus } from '../types/civic';

const SAMPLE_REPAIR_PROOF = '/src/assets/images/hero_smart_city_1795516922199.jpg';

export function OfficerDashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState('all');
  const [locality, setLocality] = useState('');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [selected, setSelected] = useState<CivicReport | null>(null);

  const [nextStatus, setNextStatus] = useState<ReportStatus>('In Progress');
  const [note, setNote] = useState('');
  const [resolutionImg, setResolutionImg] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const loadAssigned = async () => {
    try {
      const res = await api.getReports({
        officerId: user?.role === 'officer' ? user.id : undefined,
        category,
        priority,
        locality: locality || undefined,
        limit: 50,
      });
      setReports(res.reports);
      if (selected) {
        const refreshed = res.reports.find((r) => r.id === selected.id) || null;
        setSelected(refreshed);
      }
    } catch {
      // Ignore transient load error
    }
  };

  useEffect(() => {
    loadAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, priority, locality, user?.id]);

  const handleResolutionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const uploaded = await api.uploadImage(file);
      setResolutionImg(uploaded.imageUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Resolution photo upload failed.');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const effectiveResolutionImg = resolutionImg || selected.resolution_image_url || '';
    if (nextStatus === 'Resolved - Awaiting Verification' && !effectiveResolutionImg) {
      setError(
        'A resolution inspection photograph is required before marking a complaint as Resolved - Awaiting Verification.'
      );
      return;
    }

    setSaving(true);
    setError('');
    setFeedback('');
    try {
      const res = await api.updateOfficerStatus(selected.id, {
        status: nextStatus,
        note,
        resolution_image_url: effectiveResolutionImg || undefined,
      });
      setSelected(res.report);
      setNote('');
      setResolutionImg('');
      setFeedback(`Updated ${res.report.id} to "${res.report.status}".`);
      await loadAssigned();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setSaving(false);
    }
  };

  const overdueReports = reports.filter((r) => r.escalation?.is_overdue);
  const awaitingVerificationCount = reports.filter(
    (r) => r.status === 'Resolved - Awaiting Verification'
  ).length;
  const displayedReports = attentionOnly ? overdueReports : reports;
  const requiresResolutionPhoto = nextStatus === 'Resolved - Awaiting Verification';

  return (
    <DashboardLayout
      title="Officer Operations Workbench"
      subtitle="Manage assigned civic complaints, prioritize overdue reports, log progress, and upload repair proof"
    >
      <div className="space-y-6">
        {feedback && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Queue Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Assigned Complaints</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#14213D] tabular-nums">
              {reports.length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Overdue / Escalated</p>
              <p className="mt-1 font-display text-2xl font-bold text-red-600 tabular-nums">
                {overdueReports.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAttentionOnly((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap ${
                attentionOnly
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {attentionOnly ? 'Showing Overdue' : 'Filter Overdue'}
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Awaiting Citizen Verification</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#10B981] tabular-nums">
              {awaitingVerificationCount}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 grid sm:grid-cols-3 gap-3">
          <select
            aria-label="Filter assigned reports by category"
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

          <select
            aria-label="Filter assigned reports by priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <input
            type="text"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            placeholder="Filter by locality..."
            aria-label="Filter by locality"
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Assigned Complaints List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            {displayedReports.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 space-y-2">
                <p>No assigned complaints matched the current filters.</p>
                {attentionOnly && (
                  <button
                    type="button"
                    onClick={() => setAttentionOnly(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700"
                  >
                    Show All Assigned Complaints
                  </button>
                )}
              </div>
            ) : (
              displayedReports.map((r) => (
                <div
                  key={r.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    selected?.id === r.id ? 'bg-sky-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <ResilientImage
                      src={r.image_url}
                      alt={r.title}
                      className="w-16 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{r.id}</span> · {t.categories[r.category]} ·{' '}
                        {r.locality}
                      </p>
                      <p className="text-sm font-bold text-[#14213D] truncate">{r.title}</p>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <StatusIndicator status={r.status} />
                        <PriorityIndicator label={r.priority_label} score={r.priority_score} />
                        <EscalationIndicator escalation={r.escalation} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r);
                        setNextStatus(r.status === 'Submitted' ? 'Acknowledged' : r.status);
                        setResolutionImg(r.resolution_image_url || '');
                        setError('');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#14213D] text-white whitespace-nowrap"
                    >
                      Manage
                    </button>
                    <Link
                      to={`/report/${r.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 whitespace-nowrap"
                    >
                      Dossier
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            {!selected ? (
              <div className="py-10 text-center space-y-2">
                <Wrench className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-[#14213D]">
                  Select a complaint to update
                </p>
                <p className="text-xs text-slate-500">
                  Inspect exact coordinates, acknowledge reports, log field notes, and upload repair
                  photographs before resolution.
                </p>
              </div>
            ) : (
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div className="border-b border-slate-200 pb-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs text-slate-500">{selected.id}</p>
                    <EscalationIndicator escalation={selected.escalation} />
                  </div>
                  <h2 className="font-display text-base font-bold text-[#14213D]">
                    {selected.title}
                  </h2>
                  <p className="text-xs text-slate-600">{selected.description}</p>
                </div>

                {/* Inline Mini Location Map */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-700">Field Location Preview</p>
                  <LeafletMapView
                    reports={[selected]}
                    center={[selected.latitude, selected.longitude]}
                    zoom={15}
                    heightClass="h-40"
                    clusterNearby={false}
                  />
                  <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)} ·{' '}
                    {selected.locality}
                  </p>
                </div>

                <div>
                  <label htmlFor="officer-status" className="block text-xs font-medium text-slate-700 mb-1">
                    New Status
                  </label>
                  <select
                    id="officer-status"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as ReportStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    {ALL_REPORT_STATUSES.filter((s) => s !== 'Closed').map((st) => (
                      <option key={st} value={st}>
                        {t.statuses[st] || st}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Marking &quot;Resolved - Awaiting Verification&quot; opens community verification before closing.
                  </p>
                </div>

                <div>
                  <label htmlFor="officer-note" className="block text-xs font-medium text-slate-700 mb-1">
                    Progress / Field Inspection Note
                  </label>
                  <textarea
                    id="officer-note"
                    required
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Record crew dispatch, materials used, or on-site findings..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="officer-proof"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {requiresResolutionPhoto
                          ? 'Upload Resolution Photo (Required)'
                          : 'Upload Resolution Photo (Optional)'}
                      </span>
                      <input
                        id="officer-proof"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleResolutionUpload}
                        className="sr-only"
                      />
                    </label>
                    {!resolutionImg && (
                      <button
                        type="button"
                        onClick={() => setResolutionImg(SAMPLE_REPAIR_PROOF)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span>Attach Demo Inspection Photo</span>
                      </button>
                    )}
                  </div>
                  {requiresResolutionPhoto && !resolutionImg && !selected.resolution_image_url && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>
                        Resolution photo is mandatory so citizens can compare before/after repairs.
                      </span>
                    </p>
                  )}
                  {(resolutionImg || selected.resolution_image_url) && (
                    <ResilientImage
                      src={resolutionImg || selected.resolution_image_url || ''}
                      alt="Uploaded resolution preview"
                      className="mt-2 w-full h-32 object-cover rounded-lg border border-slate-200"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] disabled:opacity-60"
                >
                  {saving ? 'Recording Update...' : 'Save Status Update'}
                </button>

                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <p className="text-xs font-semibold text-[#14213D]">Status History</p>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {selected.status_history.map((h) => (
                      <div key={h.id} className="text-[11px] bg-slate-50 p-2 rounded border border-slate-200">
                        <strong>{h.new_status}</strong> · {h.note}
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

