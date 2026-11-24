import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { LANGUAGE_LABELS } from '../lib/i18n';
import type { SupportedLanguage } from '../types/civic';

export function PublicNavbar() {
  const { user } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: t.nav.home, to: '/' },
    { label: t.nav.explore, to: '/explore' },
    { label: t.nav.liveMap, to: '/map' },
    { label: t.nav.analytics, to: '/analytics' },
    { label: t.nav.projects, to: '/projects' },
  ];

  const isActive = (to: string) => location.pathname === to;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <Link
          to="/"
          className="font-display text-lg font-bold tracking-tight text-[#14213D] whitespace-nowrap shrink-0"
        >
          Janta Check
        </Link>

        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600"
        >
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                isActive(item.to)
                  ? 'text-[#14213D] border-[#10B981]'
                  : 'border-transparent hover:text-[#14213D] hover:border-slate-300'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {location.pathname === '/' && (
            <>
              <a
                href="#how-it-works"
                className="whitespace-nowrap shrink-0 hover:text-[#14213D] transition-colors py-1"
              >
                {t.nav.howItWorks}
              </a>
              <a
                href="#about-us"
                className="whitespace-nowrap shrink-0 hover:text-[#14213D] transition-colors py-1"
              >
                {t.nav.aboutUs}
              </a>
            </>
          )}
          <Link
            to={user ? '/dashboard' : '/login'}
            className="whitespace-nowrap shrink-0 hover:text-[#14213D] transition-colors py-1"
          >
            {user ? t.nav.dashboard : t.nav.login}
          </Link>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
            <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
            <select
              aria-label="Select platform language"
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
            to="/report"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#14213D] hover:bg-[#1e3159] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {t.nav.reportIssue}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to={user ? '/dashboard' : '/login'}
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {user ? t.nav.dashboard : t.nav.login}
          </Link>
          <Link
            to="/report"
            onClick={() => setMobileOpen(false)}
            className="block w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#14213D]"
          >
            {t.nav.reportIssue}
          </Link>
        </div>
      )}
    </header>
  );
}
