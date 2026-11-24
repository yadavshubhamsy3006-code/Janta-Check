import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [locality, setLocality] = useState('Indiranagar Demo Sector');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({
        full_name: fullName,
        email,
        password,
        locality,
      });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PublicNavbar />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#14213D]">
              Create Citizen Account
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Join Janta Check to report infrastructure issues, vote on priorities, and verify neighborhood fixes.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                minLength={2}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Priya Sharma"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="reg-locality" className="block text-sm font-medium text-slate-700 mb-1">
                Primary Locality / Ward
              </label>
              <input
                id="reg-locality"
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 mb-1">
                Password (min. 6 characters)
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <span>
                Public registrations create Citizen accounts only. Field Officer and Administrator
                permissions are strictly assigned by an authorized administrator.
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#14213D] hover:bg-[#1e3159] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Creating Account...' : 'Register as Citizen'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-sm text-slate-600 pt-2 border-t border-slate-200">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-[#14213D] hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
