import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import type { EscalationInfo, PriorityLabel, ReportStatus } from '../types/civic';
import { useI18n } from '../context/I18nContext';

export function StatusIndicator({ status }: { status: ReportStatus }) {
  const { t } = useI18n();
  const config: Record<ReportStatus, { color: string; icon: React.ReactNode }> = {
    Submitted: {
      color: 'text-slate-700',
      icon: <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
    },
    'Under Review': {
      color: 'text-sky-700',
      icon: <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />,
    },
    Acknowledged: {
      color: 'text-sky-800',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />,
    },
    'In Progress': {
      color: 'text-amber-700',
      icon: <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    },
    'Resolved - Awaiting Verification': {
      color: 'text-emerald-700',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
    },
    Reopened: {
      color: 'text-red-700',
      icon: <RefreshCw className="w-3.5 h-3.5 text-red-600 shrink-0" />,
    },
    Closed: {
      color: 'text-emerald-800',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />,
    },
  };

  const entry = config[status] || config.Submitted;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${entry.color}`}>
      {entry.icon}
      <span>{t.statuses[status] || status}</span>
    </span>
  );
}

export function EscalationIndicator({ escalation }: { escalation?: EscalationInfo }) {
  if (!escalation || escalation.level === 'Resolved') return null;
  const colorMap: Record<string, string> = {
    'Requires Attention': 'text-red-700 bg-red-50 border-red-200',
    Delayed: 'text-amber-800 bg-amber-50 border-amber-200',
    'Waiting for Review': 'text-slate-700 bg-slate-100 border-slate-200',
    'Recently Submitted': 'text-sky-700 bg-sky-50 border-sky-200',
    'On Track': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  };
  return (
    <span
      title={escalation.reason}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${
        colorMap[escalation.level] || colorMap['Waiting for Review']
      }`}
    >
      {escalation.level}
    </span>
  );
}

export function PriorityIndicator({
  label,
  score,
}: {
  label: PriorityLabel;
  score: number;
}) {
  const styles: Record<PriorityLabel, { text: string; bar: string; icon: React.ReactNode }> = {
    Critical: {
      text: 'text-red-700',
      bar: 'bg-red-600',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />,
    },
    High: {
      text: 'text-amber-700',
      bar: 'bg-amber-500',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    },
    Medium: {
      text: 'text-sky-700',
      bar: 'bg-sky-500',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-sky-600 shrink-0" />,
    },
    Low: {
      text: 'text-slate-600',
      bar: 'bg-slate-400',
      icon: <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
    },
  };

  const s = styles[label] || styles.Medium;
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${s.text}`}>
        {s.icon}
        <span>{label}</span>
      </span>
      <span className="text-xs font-mono tabular-nums text-slate-500">{score}/100</span>
    </div>
  );
}

export function ResilientImage({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);

  if (failed || !src) {
    return (
      <div
        className={`bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-500 p-4 text-center ${className}`}
      >
        <AlertTriangle className="w-6 h-6 mb-1.5 text-slate-400" />
        <span className="text-xs font-medium text-slate-600 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
