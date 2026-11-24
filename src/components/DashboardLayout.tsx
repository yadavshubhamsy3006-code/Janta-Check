import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Building2,
  Compass,
  FilePlus2,
  FolderKanban,
  Globe,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  ShieldCheck,
  UserCircle,
  Users,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { LANGUAGE_LABELS } from '../lib/i18n';
import type { SupportedLanguage } from '../types/civic';

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function DashboardLayout({ title, subtitle, children }: DashboardLayoutProps) {
  const { user, unreadNotifications, isDemoSession, logout, loginDemo } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const navItems = [
    { label: t.nav.overview, to: '/dashboard', icon: LayoutDashboard },
    { label: t.nav.reportIssue, to: '/report', icon: FilePlus2 },
    { label: t.nav.myReports, to: '/my-reports', icon: FolderKanban },
    { label: t.nav.explore, to: '/explore', icon: Compass },
    { label: t.nav.liveMap, to: '/map', icon: MapPin },
    { label: t.nav.analytics, to: '/analytics', icon: BarChart3 },
    { label: t.nav.community, to: '/community', icon: Users },
    { label: t.nav.projects, to: '/projects', icon: Building2 },
    {
      label:
        unreadNotifications > 0
          ? `${t.nav.notifications} (${unreadNotifications})`
          : t.nav.notifications,
      to: '/notifications',
      icon: Bell,
    },
    { label: t.nav.profile, to: '/profile', icon: UserCircle },
  ];

  const roleItems = [
    ...(user?.role === 'officer' || user?.role === 'admin'
      ? [{ label: t.nav.officerPortal, to: '/officer', icon: Wrench }]
      : []),
    ...(user?.role === 'admin'
      ? [{ label: t.nav.adminPortal, to: '/admin', icon: ShieldCheck }]
      : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderLinks = () => (
    <div className="flex flex-col h-full justify-between py-5 px-3">
      <div className="space-y-6">
        <div className="px-3 flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-bold tracking-tight text-white">
            Janta Check
          </Link>
        </div>

        <nav aria-label="Workspace Navigation" className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#10B981] text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {roleItems.length > 0 && (
          <div className="pt-4 border-t border-white/10 space-y-1">
            <p className="px-3 text-xs font-medium text-slate-400">Authorized Portals</p>
            {roleItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#38BDF8] text-[#14213D]'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {user && (
        <div className="pt-4 border-t border-white/10 space-y-3 px-2">
          <div className="text-xs text-slate-300 space-y-0.5">
            <p className="font-semibold text-white truncate">{user.full_name}</p>
            <p className="text-slate-400 capitalize">
              {user.role} · <span className="tabular-nums">{user.civic_points} pts</span>
            </p>
          </div>
          {isDemoSession && (
            <div className="space-y-1">
              <p className="text-[11px] text-slate-400">Demo Role Switcher</p>
              <div className="grid grid-cols-3 gap-1">
                {(['citizen', 'officer', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={async () => {
                      await loginDemo(r);
                      navigate(r === 'officer' ? '/officer' : r === 'admin' ? '/admin' : '/dashboard');
                    }}
                    className={`px-1.5 py-1 text-[11px] rounded font-medium capitalize transition-colors ${
                      user.role === r
                        ? 'bg-[#38BDF8] text-[#14213D]'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.nav.signOut}</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <aside className="hidden lg:block w-64 shrink-0 bg-[#14213D] border-r border-slate-800 sticky top-0 h-screen overflow-y-auto">
        {renderLinks()}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#14213D] h-full overflow-y-auto z-10">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            {renderLinks()}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation sidebar"
              className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold text-[#14213D] truncate">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {!isOnline && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </span>
            )}
            {isDemoSession && (
              <span className="hidden md:inline-block text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                Demonstration Mode
              </span>
            )}
            <div className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
              <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
              <select
                aria-label="Select workspace language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="text-xs font-medium text-[#14213D] bg-transparent focus:outline-none cursor-pointer"
              >
                {(['en', 'hi', 'kn'] as SupportedLanguage[]).map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang]}
                  </option>
                ))}
              </select>
            </div>
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadNotifications}
                </span>
              )}
            </Link>
            <Link
              to="/report"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.reportIssue}
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
