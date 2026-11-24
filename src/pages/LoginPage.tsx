import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, ShieldAlert, UserCheck, Wrench } from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export function LoginPage() {
  const { login, loginDemo, configStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoRole = async (role: 'citizen' | 'officer' | 'admin') => {
    setError('');
    setSubmitting(true);
    try {
      await loginDemo(role);
      const dest =
        role === 'officer' ? '/officer' : role === 'admin' ? '/admin' : redirectTo;
      navigate(dest, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Demo sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotMessage('');
    try {
      const res = await api.forgotPassword(email);
      setForgotMessage(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password reset request failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PublicNavbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#14213D]">
              {showForgot ? 'Reset Your Password' : 'Sign In to Janta Check'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {showForgot
                ? 'Enter your registered email address to request a reset verification.'
                : 'Access your civic reports, community verifications, or authorized officer workspace.'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {forgotMessage && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{forgotMessage}</span>
            </div>
          )}

          {!showForgot ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(true);
                      setError('');
                    }}
                    className="text-xs font-medium text-[#14213D] hover:text-[#10B981]"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#14213D] hover:bg-[#1e3159] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 mb-1">
                  Registered Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#14213D]"
                >
                  Send Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 border border-slate-300"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          <p className="text-sm text-slate-600 pt-2 border-t border-slate-200">
            New to Janta Check?{' '}
            <Link to="/register" className="font-semibold text-[#10B981] hover:underline">
              Create a Citizen Account
            </Link>
          </p>
        </div>

        {/* Setup Info & Optional Demo Mode */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#14213D]">
                Demonstration Mode Access
              </h2>
              <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                Demo Environment
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {configStatus?.supabaseConfigured
                ? 'Supabase PostgreSQL is connected. You may also launch an isolated demonstration session below.'
                : 'Supabase credentials are not configured in environment variables yet. You can explore every feature immediately using our clearly labelled demonstration accounts:'}
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                aria-label="Sign in as Demo Citizen"
                disabled={submitting}
                onClick={() => handleDemoRole('citizen')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-[#10B981] hover:bg-emerald-50/40 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-[#10B981]" />
                  <div>
                    <p className="text-sm font-semibold text-[#14213D]">Demo Citizen</p>
                    <p className="text-xs text-slate-500">Report issues, upvote, verify resolutions, earn points</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                aria-label="Sign in as Demo Field Officer"
                disabled={submitting}
                onClick={() => handleDemoRole('officer')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-[#38BDF8] hover:bg-sky-50/40 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-[#0284C7]" />
                  <div>
                    <p className="text-sm font-semibold text-[#14213D]">Demo Field Officer</p>
                    <p className="text-xs text-slate-500">Acknowledge assigned complaints, update status &amp; upload proof</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                aria-label="Sign in as Demo Administrator"
                disabled={submitting}
                onClick={() => handleDemoRole('admin')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-[#14213D] hover:bg-slate-50 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-[#14213D]" />
                  <div>
                    <p className="text-sm font-semibold text-[#14213D]">Demo Administrator</p>
                    <p className="text-xs text-slate-500">Assign officers, manage roles, moderate &amp; configure rules</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {!configStatus?.supabaseConfigured && (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 space-y-2">
              <h3 className="font-display text-sm font-bold text-white">
                Connecting Production Supabase PostgreSQL
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                To switch from Demonstration Mode to live Supabase PostgreSQL &amp; Storage, run{' '}
                <code className="font-mono text-[#38BDF8]">supabase/migrations/001_initial_schema.sql</code>{' '}
                and set <code className="font-mono text-[#38BDF8]">VITE_SUPABASE_URL</code>,{' '}
                <code className="font-mono text-[#38BDF8]">VITE_SUPABASE_ANON_KEY</code>, and{' '}
                <code className="font-mono text-[#38BDF8]">SUPABASE_SERVICE_ROLE_KEY</code> in Secrets.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
