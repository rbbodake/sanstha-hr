'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Lock, Shield, User, Award, GraduationCap, UserCheck, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await login(identifier, password);
      router.replace('/');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to sign in. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (u: string, p: string) => {
    setIdentifier(u);
    setPassword(p);
    setErrorMsg(null);
  };

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 bg-gradient-to-tr from-sky-800 to-indigo-700 rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">SmartHR Staff Login</h1>
        <p className="mt-1.5 text-xs text-slate-500 font-medium">Shri Balasaheb Mane Shikshan Prasarak Mandal, Ambap</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200 space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Sign in to your Workspace</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your provisioned <strong>Username</strong> or <strong>Email ID</strong> and <strong>Password</strong> to access your role-authorized workspace.
            </p>
          </div>

          {errorMsg && (
            <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold leading-relaxed animate-in fade-in">
              {errorMsg}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="identifier" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Username or Email ID
              </label>
              <div className="relative">
                <User aria-hidden="true" className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="e.g. admin or admin@mandaltrust.org"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock aria-hidden="true" className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter password (e.g. admin123)"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl shadow text-xs font-bold uppercase tracking-wider text-white bg-sky-700 hover:bg-sky-800 transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating…' : 'Sign In to Portal'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Role Credentials Selector */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-sky-600" /> Demo &amp; Default Staff Accounts
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Password: admin123</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin', 'admin123')}
                className="p-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-left transition group"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-purple-900">
                  <Shield className="w-3.5 h-3.5 text-purple-700" /> Central HR (Admin)
                </div>
                <div className="text-[10px] text-purple-700 mt-0.5 truncate">User: admin</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickCredentials('appointment', 'admin123')}
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-left transition group"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                  <Award className="w-3.5 h-3.5 text-amber-700" /> Appointment Officer
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5 truncate">User: appointment</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickCredentials('principal', 'admin123')}
                className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-left transition group"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-700" /> Institute Head
                </div>
                <div className="text-[10px] text-indigo-700 mt-0.5 truncate">User: principal</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickCredentials('frontdesk', 'admin123')}
                className="p-2.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-left transition group"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-sky-900">
                  <UserCheck className="w-3.5 h-3.5 text-sky-700" /> Front Desk Officer
                </div>
                <div className="text-[10px] text-sky-700 mt-0.5 truncate">User: frontdesk</div>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-sky-700 flex items-center gap-1 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <Link href="/setup?tab=users" className="hover:text-sky-700 transition">
              Manage Users (RBAC)
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
