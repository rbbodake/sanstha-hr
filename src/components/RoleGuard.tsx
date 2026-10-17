'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth, UserRole } from '@/context/AuthContext';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function RoleGuard({
  allowedRoles,
  children,
  title = 'Access Restricted',
  description = 'You do not have permission to view this section under your current role.',
}: RoleGuardProps) {
  const { role, switchRole } = useAuth();

  const isAuthorized = allowedRoles.includes(role);

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-8 text-center space-y-6 animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
            {description}
          </p>
          <div className="inline-block mt-2 px-3 py-1 bg-slate-100 rounded-full text-[11px] font-bold text-slate-700">
            Current Active Role: <span className="text-purple-700 capitalize">{role.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* Required role info */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left">
          <p className="text-[11px] font-bold text-amber-800 mb-1">Required Role(s) for this section:</p>
          <div className="flex flex-wrap gap-1.5">
            {allowedRoles.map((r) => (
              <span
                key={r}
                className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 rounded-lg text-[10px] font-bold capitalize"
              >
                {r.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-amber-700 mt-2 leading-relaxed">
            Please log in with an authorised account or contact your HR Administrator to request access.
          </p>
        </div>

        {/* Quick Role Switch Buttons */}
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-left space-y-2">
          <p className="text-[11px] font-bold text-sky-900">Switch role to access this module immediately:</p>
          <div className="flex flex-wrap gap-2">
            {allowedRoles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => switchRole(r)}
                className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Switch to {r === 'admin_head_hr' ? 'Head Central HR' : r === 'receptionist' ? 'Front Desk' : r === 'institute_head' ? 'Institute Head' : r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100">
          <Link
            href="/"
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" /> Switch User Account
          </Link>
        </div>
      </div>
    </div>
  );
}
