import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { CivicNotification } from '../types/civic';

export function NotificationsPage() {
  const { refreshNotifications } = useAuth();
  const [notifications, setNotifications] = useState<CivicNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      await refreshNotifications();
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkAll = async () => {
    await api.markAllNotificationsRead();
    await load();
  };

  const handleMarkOne = async (id: string) => {
    await api.markNotificationRead(id);
    await load();
  };

  return (
    <DashboardLayout
      title="Notifications"
      subtitle="Real-time alerts when complaints are acknowledged, updated, commented on, or awaiting verification"
    >
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 tabular-nums">
            {notifications.filter((n) => !n.is_read).length} unread notifications
          </p>
          <button
            type="button"
            onClick={handleMarkAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-[#14213D] hover:bg-slate-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-200/70 animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
            <Bell className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-[#14213D]">You are all caught up</p>
            <p className="text-xs text-slate-500">
              Status changes, officer notes, and community replies will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  n.is_read ? 'bg-white border-slate-200' : 'bg-sky-50/60 border-sky-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#14213D]">{n.title}</p>
                    {!n.is_read && (
                      <span className="text-[11px] font-semibold text-sky-700">Unread</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{n.message}</p>
                  <p className="text-[11px] font-mono text-slate-400">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {n.report_id && (
                    <Link
                      to={`/report/${n.report_id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#14213D] text-white"
                    >
                      Open Report
                    </Link>
                  )}
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkOne(n.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-700"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
