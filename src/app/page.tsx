'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { OrganizationSettings } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/RoleGuard';
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
  Globe,
  Search,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
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
  const router = useRouter();
  const { role, session, isLoading } = useAuth();
  const [org, setOrg] = useState<OrganizationSettings>(defaultOrg);
  const [stats, setStats] = useState({
    totalApplications: 0,
    verifiedApplications: 0,
    feePaidApplications: 0,
    totalInstitutes: 0,
    totalPosts: 0,
    remotePreRegistrations: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [remoteCandidates, setRemoteCandidates] = useState<any[]>([]);
  const [remoteSearch, setRemoteSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Authentication & Role Routing Guard
  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      router.replace('/login');
      return;
    }

    if (session.role === 'appointment_officer') {
      router.replace('/appointment');
      return;
    }
    if (session.role === 'receptionist') {
      router.replace('/receptionist');
      return;
    }
    if (session.role === 'institute_head') {
      router.replace('/institute-portal');
      return;
    }
  }, [session, isLoading, router]);

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

        // Fetch Remote Candidate Pre-Registrations (Visible exclusively to Central HR)
        let remotePendingCount = 0;
        try {
          const { data: remoteData, count: rCount } = await supabase
            .from('applications')
            .select(`
              id,
              application_no,
              temp_id,
              candidate_name,
              contact_no,
              email_id,
              program_stream,
              course_name,
              specialization,
              source_type,
              registration_status,
              created_at,
              posts (title),
              staff_categories (name, application_fee),
              institutes:preferred_institute_id (official_name)
            `, { count: 'exact' })
            .eq('source_type', 'ONLINE_REMOTE')
            .eq('registration_status', 'DRAFT_PENDING_FEE')
            .order('created_at', { ascending: false });

          if (remoteData) {
            setRemoteCandidates(remoteData);
            remotePendingCount = rCount || remoteData.length;
          }
        } catch (rErr) {
          console.warn('Remote candidate query notice:', rErr);
        }

        setStats({
          totalApplications: appCount || 0,
          verifiedApplications: verifiedCount || 0,
          feePaidApplications: feeCount || 0,
          totalInstitutes: instCount || 0,
          totalPosts: postCount || 0,
          remotePreRegistrations: remotePendingCount,
        });
      } catch (err) {
        console.warn('Stats fetch error:', err);
      } finally {
        setLoadingStats(false);
      }
    }

    loadData();
  }, []);

  if (isLoading || !session || session.role !== 'admin_head_hr') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-700">Connecting to SmartHR Portal…</p>
        <p className="text-xs text-slate-400">Verifying authorized Central HR session</p>
      </div>
    );
  }

  return (
    <RoleGuard
      allowedRoles={['admin_head_hr']}
      title="Central HR Executive Dashboard"
      description="Full administrative access to Central HR operations is restricted to Head Central HR."
    >
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
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

        {/* 6th KPI Card: Remote Pre-Registrations (Pending Desk Fee) */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 p-5 rounded-3xl border-2 border-amber-300 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Remote Pre-Reg</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-inner">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-900">{stats.remotePreRegistrations}</div>
            <div className="text-[10px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pending Desk Fee
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CENTRAL HR EXCLUSIVE MODULE: REMOTE CANDIDATE ONLINE PRE-REGISTRATIONS
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  Remote Online Pre-Registrations
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-extrabold uppercase">
                  Central HR Only • {remoteCandidates.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Candidates registered online prior to walk-in visit. Awaiting physical document verification and fee settlement at Front Desk.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Temp ID, Name, Mobile..."
                value={remoteSearch}
                onChange={(e) => setRemoteSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 w-52 sm:w-64"
              />
            </div>
            <Link
              href="/apply/online"
              target="_blank"
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-sky-200"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Public Link
            </Link>
          </div>
        </div>

        {remoteCandidates.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-1">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-60" />
            <p className="font-bold text-slate-600">No Pending Remote Pre-Registrations</p>
            <p className="text-[11px]">All remote candidate entries have either completed desk fee settlement or none are currently queued.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Temporary ID</th>
                  <th className="py-3 px-4">Candidate Details</th>
                  <th className="py-3 px-4">Applied Designation & Stream</th>
                  <th className="py-3 px-4">Pre-Reg Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Desk Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {remoteCandidates
                  .filter((c) => {
                    if (!remoteSearch.trim()) return true;
                    const q = remoteSearch.toLowerCase();
                    return (
                      (c.temp_id && c.temp_id.toLowerCase().includes(q)) ||
                      (c.candidate_name && c.candidate_name.toLowerCase().includes(q)) ||
                      (c.contact_no && c.contact_no.includes(q)) ||
                      (c.application_no && c.application_no.toLowerCase().includes(q))
                    );
                  })
                  .map((cand) => (
                    <tr key={cand.id} className="hover:bg-amber-50/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-sky-800">
                        <div className="flex items-center gap-1.5">
                          <span>{cand.temp_id || 'TEMP-PENDING'}</span>
                          {cand.temp_id && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(cand.temp_id);
                                setCopiedId(cand.temp_id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="text-slate-400 hover:text-sky-600 transition"
                              title="Copy Temporary ID"
                            >
                              {copiedId === cand.temp_id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal block font-sans">
                          {cand.application_no}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{cand.candidate_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          +91 {cand.contact_no} {cand.email_id ? `• ${cand.email_id}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {cand.posts?.title || 'Applied Post'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {cand.program_stream} {cand.course_name ? `• ${cand.course_name}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {new Date(cand.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending Desk Fee (₹{cand.staff_categories?.application_fee ?? 200})
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/receptionist?lookup=${encodeURIComponent(cand.temp_id || cand.contact_no)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Settle Fee
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
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
            href="/apply/online"
            target="_blank"
            className="p-4 rounded-2xl border-2 border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-100/50 transition flex items-start gap-3 group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-600 group-hover:text-white transition">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-900">Remote Pre-Registration</h4>
                <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[9px] font-black uppercase">Public</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">Public link for remote candidates to pre-register before visiting desk</p>
            </div>
          </Link>

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
  </RoleGuard>
  );
}
