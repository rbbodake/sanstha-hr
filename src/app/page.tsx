'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { OrganizationSettings } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  UserCheck,
  QrCode,
  FileText,
  Settings,
  ShieldCheck,
  ArrowRight,
  Briefcase,
  Award,
  Lock,
  ChevronRight,
  GraduationCap,
  Users,
  Receipt,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  UserCog
} from 'lucide-react';
import { TrustLetterhead } from '@/components/TrustLetterhead';

const defaultOrg: OrganizationSettings = {
  id: 'default',
  name: 'Shri Balasaheb Mane Shikshan Prasarak Mandal, Ambap',
  address: 'Tal. Hatkanangale, Dist. Kolhapur, Pin 416112, Maharashtra State (A/p. Ambap)',
  registration_no: 'Regd. under B.P.T. Act 1950, No. F-1727-Kolhapur',
  registration_date: '02/02/1981',
  tagline: 'Education as a Service • Central HR Department',
  president_name: 'Shri Vijaysinh Ashokrao Mane',
  hr_head_name: 'Mrs. Priyanka M. Sutar',
  receipt_prefix: 'REC/2026-27/',
  receipt_starting_no: 1001,
  receipt_copies_count: 2,
  currency_symbol: '₹',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default function HomePage() {
  const { role, session } = useAuth();
  const [org, setOrg] = useState<OrganizationSettings>(defaultOrg);
  const [stats, setStats] = useState({
    totalApplications: 0,
    verifiedApplications: 0,
    feePaidApplications: 0,
    totalInstitutes: 0,
    totalPosts: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: orgData } = await supabase
          .from('organization_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (orgData) setOrg(orgData);

        // Fetch quick summary stats
        const { count: appCount } = await supabase.from('applications').select('*', { count: 'exact', head: true });
        const { count: verifiedCount } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'verified_approved');
        const { count: feeCount } = await supabase.from('fee_receipts').select('*', { count: 'exact', head: true }).eq('is_cancelled', false);
        const { count: instCount } = await supabase.from('institutes').select('*', { count: 'exact', head: true }).eq('is_active', true);
        const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_active', true);

        setStats({
          totalApplications: appCount || 0,
          verifiedApplications: verifiedCount || 0,
          feePaidApplications: feeCount || 0,
          totalInstitutes: instCount || 0,
          totalPosts: postCount || 0,
        });
      } catch (err) {
        console.warn('Stats fetch error:', err);
      } finally {
        setLoadingStats(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            Central HR ERP • Sanstha Management System
          </div>
          
          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome, {session?.full_name || 'Staff Member'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
              {org.name} — Unified Recruitment & Credential Verification Portal for Engineering, Pharmacy, Management, Agriculture, and Sanstha Campuses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/receptionist"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" /> Front Desk
            </Link>
            <Link
              href="/receptionist/fee-register"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition border border-slate-700 flex items-center gap-1.5"
            >
              <Receipt className="w-4 h-4 text-sky-400" /> Fee Register
            </Link>
            <Link
              href="/qr"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition border border-slate-700 flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4 text-purple-400" /> Office QR Standee
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Candidates</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{stats.totalApplications}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Walk-in & Online</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Verified & Approved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">{stats.verifiedApplications}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Documents verified</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Receipts Issued</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700">{stats.feePaidApplications}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Fees collected</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Active Institutes</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-800">{stats.totalInstitutes}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Colleges & Schools</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Job Positions</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-indigo-700">{stats.totalPosts}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Designation roles</div>
          </div>
        </div>
      </div>

      {/* Main Action Workspaces */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">
          Core Department Workspaces
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Front Desk */}
          <Link
            href="/receptionist"
            className="group p-6 bg-white hover:bg-sky-50/50 border-2 border-slate-200 hover:border-sky-600 rounded-3xl shadow-sm hover:shadow-xl transition duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-sky-600 group-hover:text-white transition duration-200 shadow-sm">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                Front Desk & Verification
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Candidate search, document checklist verification, status approval, and duplicate official fee receipt printing.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-700 group-hover:text-sky-800">
              <span>Open Front Desk</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition" />
            </div>
          </Link>

          {/* Card 2: Fee Register & Collections */}
          <Link
            href="/receptionist/fee-register"
            className="group p-6 bg-white hover:bg-emerald-50/50 border-2 border-slate-200 hover:border-emerald-600 rounded-3xl shadow-sm hover:shadow-xl transition duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition duration-200 shadow-sm">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                Fee Register & Collections Log
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Auditable daily fee collection registry, stream-wise summaries, payment mode breakdowns, and accounting logs.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
              <span>View Fee Register</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition" />
            </div>
          </Link>

          {/* Card 3: Institute Master */}
          <Link
            href="/admin/institutes"
            className="group p-6 bg-white hover:bg-purple-50/50 border-2 border-slate-200 hover:border-purple-600 rounded-3xl shadow-sm hover:shadow-xl transition duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition duration-200 shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                Institute & College Master
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Manage colleges, schools, approved official names, regulatory bodies (AICTE/UGC/PCI/DTE), and Principal assignments.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:text-purple-800">
              <span>Manage Institutes</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition" />
            </div>
          </Link>

          {/* Card 4: Job Designations Master */}
          <Link
            href="/admin/posts"
            className="group p-6 bg-white hover:bg-indigo-50/50 border-2 border-slate-200 hover:border-indigo-600 rounded-3xl shadow-sm hover:shadow-xl transition duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition duration-200 shadow-sm">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                Job Designations & Roles Master
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Teaching & non-teaching positions, eligibility qualifications, stream mappings, and category application fee rules.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700 group-hover:text-indigo-800">
              <span>Manage Designations</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition" />
            </div>
          </Link>

          {/* Card 5: Institute Head Portal */}
          <Link
            href="/institute-portal"
            className="group p-6 bg-white hover:bg-indigo-50/50 border-2 border-slate-200 hover:border-indigo-600 rounded-3xl shadow-sm hover:shadow-xl transition duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition duration-200 shadow-sm">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                Principal &amp; Institute Head Portal
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dedicated college portal for Principals to view candidate submissions, physical interview evaluation scores, and sanctioned staff matrix.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700 group-hover:text-indigo-800">
              <span>Open Principal Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition" />
            </div>
          </Link>

          {/* Card 6: Standalone Appointment & Recruitment Section */}
          <Link
            href="/appointment"
            className="group p-6 bg-white hover:bg-amber-50/50 border-2 border-slate-200 hover:border-amber-600 rounded-3xl shadow-sm hover:shadow-xl transition duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition duration-200 shadow-sm">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                Appointment &amp; Recruitment Section
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Central HR top-level module: interview evaluation queue, management approval terms, and official appointment orders across all institutes.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-800">
              <span>Manage Appointments</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition" />
            </div>
          </Link>

          {/* Card 7: User Management & RBAC Settings */}
          <Link
            href="/setup?tab=users"
            className="group p-6 bg-white hover:bg-purple-50/50 border-2 border-slate-200 hover:border-purple-600 rounded-3xl shadow-sm hover:shadow-xl transition duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition duration-200 shadow-sm">
                <UserCog className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                User Management &amp; RBAC
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Provision staff users, assign Role-Based Access Control (Front Desk, Central HR, Institute Head, Appointment Officer), and disable accounts.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:text-purple-800">
              <span>Manage Users</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition" />
            </div>
          </Link>

          {/* Card 8: Staff Login & Auth Portal */}
          <Link
            href="/login"
            className="group p-6 bg-white hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-800 rounded-3xl shadow-sm hover:shadow-xl transition duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-slate-800 group-hover:text-white transition duration-200 shadow-sm">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                Staff Login &amp; Switcher
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Secure sign-in for Head Central HR, Appointment Officer, Principals, and Front Desk staff with 1-click test credentials.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-slate-950">
              <span>Login Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition" />
            </div>
          </Link>
        </div>
      </div>

      {/* Candidate Gateways & Quick Tools */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Candidate Gateways & QR System
          </h3>
          <span className="text-xs text-slate-500 font-medium">Public & Front Desk Tools</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/apply"
            className="p-4 rounded-2xl border border-slate-200 hover:border-sky-500 hover:bg-sky-50/40 transition flex items-start gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-600 group-hover:text-white transition">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Walk-in Candidate Form</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Candidate direct entry with scan upload & signature</p>
            </div>
          </Link>

          <Link
            href="/qr"
            className="p-4 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/40 transition flex items-start gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white transition">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Office QR Standee</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">High-resolution printable standee for HR lobby</p>
            </div>
          </Link>

          <Link
            href="/admin/posts"
            className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 transition flex items-start gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Job Designations Master</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Faculty, Staff & Technical designations and fee matrix</p>
            </div>
          </Link>

          <Link
            href="/setup"
            className="p-4 rounded-2xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 transition flex items-start gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-600 group-hover:text-white transition">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Trust & Branding Setup</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Receipt numbering, logos, header text & trust info</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
