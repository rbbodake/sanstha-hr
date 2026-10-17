'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Lock, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await login(email, password);
      router.replace('/');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to sign in. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 bg-sky-700 rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Staff Login</h1>
        <p className="mt-1.5 text-xs text-slate-500 font-medium">Central HR Department · Recruitment &amp; Sanstha Management Portal</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200 space-y-6">
          <p className="text-sm text-slate-600 leading-relaxed">
            Sign in with your account credentials. Active staff roles open their assigned workspace; other accounts receive limited access.
          </p>
          <p className="text-xs text-sky-800 bg-sky-50 border border-sky-100 rounded-xl p-3 leading-relaxed">
            To access Central HR, your account must be assigned the <code className="font-bold">admin_head_hr</code> role by your system administrator. Portal roles are not selected on this page.
          </p>
          {errorMsg && <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{errorMsg}</div>}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Email</label>
              <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm" />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock aria-hidden="true" className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl shadow text-xs font-bold uppercase tracking-wider text-white bg-sky-700 hover:bg-sky-800 transition disabled:opacity-50">
              {loading ? 'Signing in…' : 'Sign In'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-sky-700 flex items-center gap-1 transition"><ArrowLeft className="w-3.5 h-3.5" /> Home Portal</Link>
            <Link href="/setup" className="hover:text-sky-700 transition">Setup Wizard</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
