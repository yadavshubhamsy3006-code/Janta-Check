import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Bell, CheckCircle2, Globe, Trash2 } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../lib/api';
import { LANGUAGE_LABELS } from '../lib/i18n';
import type { NotificationPreferences, SupportedLanguage, TextSizePreference } from '../types/civic';

export function ProfilePage() {
  const { user, refreshUser, logout, configStatus } = useAuth();
  const { language, setLanguage, textSize, setTextSize, t } = useI18n();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [locality, setLocality] = useState(user?.locality || '');
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    user?.notification_preferences || {
      status_updates: true,
      community_replies: true,
      nearby_alerts: true,
    }
  );
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isBuiltInDemoAccount = Boolean(user?.email.endsWith('.local'));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved('');
    setError('');
    try {
      await api.updateProfile({ full_name: fullName, locality });
      await refreshUser();
      setSaved('Profile updated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    setLanguage(lang);
    setError('');
    try {
      await api.updatePreferences({ preferred_language: lang });
      await refreshUser();
      setSaved(`Preferred language updated to ${LANGUAGE_LABELS[lang]}.`);
    } catch {
      // Local language preference still applies immediately
    }
  };

  const handleSaveNotifications = async () => {
    setSavingPrefs(true);
    setError('');
    setSaved('');
    try {
      await api.updatePreferences({
        preferred_language: language,
        notification_preferences: notifPrefs,
      });
      await refreshUser();
      setSaved('Language and notification preferences saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.deleteAccount();
      logout();
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to delete account.');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout
      title={t.nav.profile}
      subtitle="Manage your identity, language, accessibility text size, notifications, and Civic Points"
    >
      <div className="max-w-4xl space-y-6">
        {saved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saved}</span>
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-12 gap-6 items-start">
          {/* Account Information */}
          <form
            onSubmit={handleSave}
            className="md:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h2 className="font-display text-base font-bold text-[#14213D]">Account Information</h2>

            <div>
              <label htmlFor="prof-name" className="block text-xs font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                required
                minLength={2}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="prof-email" className="block text-xs font-medium text-slate-700 mb-1">
                Email Address (Read-only)
              </label>
              <input
                id="prof-email"
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500"
              />
            </div>

            <div>
              <label htmlFor="prof-locality" className="block text-xs font-medium text-slate-700 mb-1">
                Primary Locality / Ward
              </label>
              <input
                id="prof-locality"
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
              <div>
                <span className="text-slate-500 block">Assigned Role</span>
                <span className="font-semibold text-[#14213D] capitalize">{user?.role}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Data Backend</span>
                <span className="font-semibold text-[#14213D]">
                  {configStatus?.supabaseConfigured ? 'Supabase PostgreSQL' : 'Demonstration Store'}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#14213D] hover:bg-[#1e3159]"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>

          {/* Civic Standing */}
          <div className="md:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#14213D]">Civic Standing</h2>
              <Award className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Civic Points</p>
              <p className="font-display text-3xl font-bold text-[#10B981] tabular-nums">
                {user?.civic_points ?? 0}
              </p>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <p className="text-xs font-semibold text-[#14213D]">Unlocked Badges</p>
              {(user?.badges || []).length === 0 ? (
                <p className="text-xs text-slate-500">
                  Submit or verify a civic report to earn your first badge.
                </p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-700">
                  {user?.badges.map((b) => (
                    <li key={b} className="font-medium">
                      · {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Language, Accessibility & Notification Preferences */}
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#14213D]" />
              <h2 className="font-display text-base font-bold text-[#14213D]">
                Language &amp; Accessibility
              </h2>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-700 mb-2">{t.profile.languageLabel}</p>
              <div className="flex flex-wrap gap-2">
                {(['en', 'hi', 'kn'] as SupportedLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleLanguageChange(lang)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold border whitespace-nowrap ${
                      language === lang
                        ? 'bg-[#14213D] text-white border-[#14213D]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {LANGUAGE_LABELS[lang]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-700 mb-2">{t.profile.textSizeLabel}</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['normal', t.profile.normal],
                    ['large', t.profile.large],
                    ['xlarge', t.profile.extraLarge],
                  ] as Array<[TextSizePreference, string]>
                ).map(([sizeKey, sizeLabel]) => (
                  <button
                    key={sizeKey}
                    type="button"
                    onClick={() => setTextSize(sizeKey)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold border whitespace-nowrap ${
                      textSize === sizeKey
                        ? 'bg-[#10B981] text-white border-[#10B981]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {sizeLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#14213D]" />
              <h2 className="font-display text-base font-bold text-[#14213D]">
                {t.profile.notificationsTitle}
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-slate-700 font-medium">Complaint status updates</span>
                <input
                  type="checkbox"
                  checked={notifPrefs.status_updates}
                  onChange={(e) =>
                    setNotifPrefs((p) => ({ ...p, status_updates: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[#10B981]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-slate-700 font-medium">Community comments &amp; replies</span>
                <input
                  type="checkbox"
                  checked={notifPrefs.community_replies}
                  onChange={(e) =>
                    setNotifPrefs((p) => ({ ...p, community_replies: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[#10B981]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-slate-700 font-medium">Nearby infrastructure alerts</span>
                <input
                  type="checkbox"
                  checked={notifPrefs.nearby_alerts}
                  onChange={(e) =>
                    setNotifPrefs((p) => ({ ...p, nearby_alerts: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[#10B981]"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={savingPrefs}
              onClick={handleSaveNotifications}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#14213D] hover:bg-[#1e3159]"
            >
              {savingPrefs ? 'Saving...' : 'Save Notification Preferences'}
            </button>
          </div>
        </div>

        {/* Account & Personal Data Removal */}
        <div className="bg-white border border-red-200 rounded-xl p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-base font-bold text-red-700 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>{t.profile.deleteAccount}</span>
              </h2>
              <p className="text-xs text-slate-600">
                Permanently removes your account profile and anonymizes your name on public civic
                reports while preserving municipal audit records.
              </p>
              {isBuiltInDemoAccount && (
                <p className="text-[11px] text-amber-800">
                  Built-in demonstration accounts (<span className="font-mono">.local</span>) remain
                  active for evaluation. Register a personal account to test full account deletion.
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={isBuiltInDemoAccount}
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Delete Account
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
              <p className="text-xs font-semibold text-red-900">
                Confirm permanent account deletion? You will be signed out immediately and cannot
                recover this login.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

