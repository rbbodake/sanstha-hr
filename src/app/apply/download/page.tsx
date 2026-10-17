'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Download,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Printer,
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Shield,
  Briefcase,
  GraduationCap,
  Languages,
  ShieldAlert,
  Lock,
} from 'lucide-react';

import { getCandidateSession, isApplicationLocked } from '@/lib/candidateSession';

// ─── Types ────────────────────────────────────────────────────────────────────
type FullApplication = {
  id: string;
  application_no: string;
  candidate_name: string;
  salutation?: string;
  photo_url?: string;
  address?: string;
  permanent_address?: string;
  contact_no: string;
  email_id?: string;
  dob?: string;
  age?: number;
  is_married: boolean;
  gender?: string;
  blood_group?: string;
  reservation_category?: string;
  is_pwd?: boolean;
  pwd_type?: string;
  languages_known?: string[];
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_mobile?: string;
  aadhaar_masked?: string;
  pan_masked?: string;
  qualification_summary?: string;
  salary_expectation?: number;
  declaration_accepted: boolean;
  declaration_place?: string;
  declaration_date?: string;
  signature_url?: string;
  status: string;
  submission_channel: string;
  created_at: string;
  // total exp summary
  total_teaching_exp_years?: number;
  total_teaching_exp_months?: number;
  total_industry_exp_years?: number;
  total_industry_exp_months?: number;
  // relations
  posts?: { title: string; program_stream?: string } | null;
  custom_post_title?: string;
  staff_categories?: { name: string; application_fee: number } | null;
  institutes?: { official_name: string } | null;
  application_education?: {
    level: string;
    degree_name?: string;
    board_university?: string;
    passing_year?: string;
    percentage?: number;
    status_remark?: string;
  }[];
  application_experience?: {
    is_fresher?: boolean;
    organization_name?: string;
    designation?: string;
    years_experience?: number;
    previous_salary?: number;
  }[];
};

type OrgData = {
  name: string;
  address?: string;
  registration_no?: string;
  tagline?: string;
  logo_url?: string;
  president_name?: string;
  hr_head_name?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtStatus = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const genderLabel: Record<string, string> = {
  male: 'Male (पुरुष)',
  female: 'Female (स्त्री)',
  other: 'Transgender / Other (इतर)',
};

// ─── Print Field ──────────────────────────────────────────────────────────────
const Field = ({ label, value, mono = false, wide = false }: {
  label: string; value?: string | number | null; mono?: boolean; wide?: boolean;
}) => (
  <div className={`print-field ${wide ? 'col-span-2' : ''}`}>
    <div className="print-label">{label}</div>
    <div className={`print-value ${mono ? 'font-mono tracking-wider' : ''}`}>
      {value ?? '—'}
    </div>
  </div>
);

// ─── Download Page ─────────────────────────────────────────────────────────────
export default function DownloadApplicationPage() {
  const [lang, setLang] = useState<'en' | 'mr'>('en');
  const [appNoInput, setAppNoInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<FullApplication | null>(null);
  const [org, setOrg] = useState<OrgData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // ── Candidate session ownership check ─────────────────────────────────────
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const sess = getCandidateSession();
    if (sess) {
      setHasSession(true);
      // Auto-populate the app number input from session
      setAppNoInput(sess.appNo);
    }
    setSessionChecked(true);
  }, []);

  // ── Lookup ─────────────────────────────────────────────────────────────────
  const handleLookup = async () => {
    const clean = appNoInput.trim().toUpperCase();
    if (!clean) return;

    // Ownership check: only allow downloading if the session owns this application number
    const sess = getCandidateSession();
    if (!sess || sess.appNo !== clean) {
      setError(
        lang === 'mr'
          ? 'प्रवेश नाकारला: हा अर्ज आपल्या वर्तमान सत्राशी जुळत नाही. केवळ आपल्या स्वतःचा अर्ज डाउनलोड करता येतो.'
          : 'Access Denied: This application does not match your current session. You can only download your own application.'
      );
      return;
    }

    setLoading(true);
    setError(null);
    setApplication(null);

    try {
      // Load org settings
      const { data: orgData } = await supabase
        .from('organization_settings')
        .select('name,address,registration_no,tagline,logo_url,president_name,hr_head_name')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      if (orgData) setOrg(orgData);

      // Load full application
      const { data, error: appErr } = await supabase
        .from('applications')
        .select(`
          *,
          posts(title, program_stream),
          staff_categories(name, application_fee),
          institutes:preferred_institute_id(official_name),
          application_education(*),
          application_experience(*)
        `)
        .eq('application_no', clean)
        .maybeSingle();

      if (appErr) throw appErr;
      if (!data) {
        setError(
          lang === 'mr'
            ? 'हा अर्ज क्रमांक सापडला नाही. कृपया पुन्हा तपासा.'
            : 'Application not found. Please verify the number and try again.'
        );
        return;
      }
      setApplication(data as FullApplication);
    } catch (e: any) {
      setError(e.message || 'Failed to load application.');
    } finally {
      setLoading(false);
    }
  };

  // ── Print / Save PDF ───────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  const isFresher = application?.application_experience?.some((e) => e.is_fresher);
  const expRows = application?.application_experience?.filter((e) => !e.is_fresher) ?? [];
  const eduRows = application?.application_education ?? [];
  const filledEdu = eduRows.filter(
    (e) => e.board_university?.trim() || e.passing_year?.trim() || (e.percentage && e.percentage > 0) || e.degree_name?.trim()
  );

  // ── Unauthorized: no candidate session ───────────────────────────────────
  if (sessionChecked && !hasSession) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border-2 border-amber-300 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {lang === 'mr' ? 'डाउनलोड प्रवेश नाकारला' : 'Download Access Not Authorized'}
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
              {lang === 'mr'
                ? 'A4 अर्ज डाउनलोड करण्यासाठी आपण प्रथम Walk-in Application Form भरणे आवश्यक आहे. केवळ आपल्या स्वतःचा अर्ज डाउनलोड करता येतो.'
                : "A4 application download is only accessible directly from the Application Success Screen after submitting your own application. You cannot download another person's application."}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 text-left space-y-1.5">
            <p className="font-bold text-slate-800">{lang === 'mr' ? 'काय करावे:' : 'What to do:'}</p>
            <p>1. {lang === 'mr' ? 'आपला Walk-in Application Form भरा.' : 'Submit your Walk-in Application Form.'}</p>
            <p>2. {lang === 'mr' ? 'यशस्वी स्क्रीनवरील "Download A4 Form" बटणावर क्लिक करा.' : 'Click "Download A4 Form" on the Success Screen immediately after submission.'}</p>
          </div>
          <Link href="/apply" className="inline-flex items-center gap-2 px-6 py-3 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm">
            {lang === 'mr' ? 'Walk-in Form भरा' : 'Go to Application Form'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Print Styles (injected in head via style tag) ─────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: fixed !important;
            inset: 0 !important;
            width: 210mm !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            padding: 12mm 14mm !important;
            background: white !important;
            font-size: 8.5pt !important;
          }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 0; }
        }
        .print-section { margin-bottom: 10pt; }
        .print-section-title {
          font-size: 7.5pt;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #0f172a;
          background: #f1f5f9;
          border-left: 3px solid #0369a1;
          padding: 3pt 8pt;
          margin-bottom: 5pt;
        }
        .print-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4pt 10pt;
        }
        .print-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 4pt 8pt;
        }
        .print-field { display: flex; flex-direction: column; }
        .print-label {
          font-size: 6.5pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
          margin-bottom: 1.5pt;
        }
        .print-value {
          font-size: 8pt;
          font-weight: 600;
          color: #0f172a;
          border-bottom: 0.5pt solid #cbd5e1;
          padding-bottom: 2pt;
          min-height: 12pt;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7.5pt;
        }
        .print-table th {
          background: #f8fafc;
          border: 0.5pt solid #cbd5e1;
          padding: 3pt 5pt;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 6.5pt;
          letter-spacing: 0.05em;
          color: #334155;
        }
        .print-table td {
          border: 0.5pt solid #e2e8f0;
          padding: 3pt 5pt;
          color: #0f172a;
          vertical-align: top;
        }
        .print-table tr:nth-child(even) td { background: #f8fafc; }
        .sig-box {
          border: 0.5pt solid #94a3b8;
          height: 36pt;
          width: 100pt;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 6pt;
          color: #94a3b8;
          margin-top: 2pt;
        }
        .app-no-badge {
          display: inline-block;
          border: 1.5pt solid #0369a1;
          padding: 3pt 10pt;
          font-size: 11pt;
          font-weight: 900;
          font-family: monospace;
          letter-spacing: 0.12em;
          color: #0c4a6e;
          margin-bottom: 4pt;
        }
      `}</style>

      <div className="min-h-screen bg-slate-100 pb-20 font-sans">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="no-print px-3 sm:px-4 py-2.5 sm:py-3.5 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <Link
              href="/apply"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-sky-700 transition py-1"
            >
              <ArrowLeft className="w-4 h-4" />
              {lang === 'mr' ? 'अर्ज पृष्ठ' : 'Application Form'}
            </Link>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300 shadow-inner">
              {(['en', 'mr'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${lang === l ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {l === 'en' ? 'English' : 'मराठी'}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-3 sm:px-4 pt-5 space-y-5">

          {/* ── Step 1 Card: Lookup ─────────────────────────────────────────── */}
          <div className="no-print bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900">
                  {lang === 'mr' ? 'A4 अर्ज डाउनलोड / प्रिंट करा' : 'Download A4 Application Form'}
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'mr'
                    ? 'आपला अर्ज क्रमांक प्रविष्ट करा — संपूर्ण भरलेला अर्ज PDF म्हणून जतन करता येईल.'
                    : 'Enter your Application Number to fetch and print your completed A4 application form as PDF.'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={lang === 'mr' ? 'उदा. 2026-OCT-00001' : 'e.g. 2026-OCT-00001'}
                value={appNoInput}
                onChange={(e) => { setAppNoInput(e.target.value.toUpperCase()); setError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono font-semibold tracking-widest uppercase bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm"
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={loading || !appNoInput.trim()}
                className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {lang === 'mr' ? 'शोधा' : 'Fetch'}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            {application && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-black text-slate-900 font-mono">{application.application_no}</p>
                    <p className="text-xs text-slate-600 font-semibold">{application.candidate_name}</p>
                    <p className="text-[11px] text-slate-500">
                      {application.posts?.title ?? application.custom_post_title ?? '—'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap"
                >
                  <Printer className="w-4 h-4" />
                  {lang === 'mr' ? 'प्रिंट / PDF जतन करा' : 'Print / Save as PDF'}
                </button>
              </div>
            )}

            {!application && !error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <FileText className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {lang === 'mr'
                    ? 'अर्ज क्रमांक सादर केल्यानंतर मिळालेल्या Success Screen वर दाखवला होता. Front Desk काउंटरवरही उपलब्ध आहे.'
                    : 'Your Application Number was shown on the success screen after submission. It\'s also available at the Front Desk counter.'}
                </span>
              </div>
            )}
          </div>

          {/* ── Print-ready A4 Application Form ────────────────────────────── */}
          {application && (
            <div
              id="print-area"
              ref={printRef}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5 text-slate-900"
            >
              {/* ── Letterhead ──────────────────────────────────────────── */}
              <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {org?.logo_url ? (
                    <img src={org.logo_url} alt={org.name} className="h-16 w-16 object-contain flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 border-2 border-slate-700 flex items-center justify-center font-black text-2xl text-slate-800 flex-shrink-0 rounded">
                      {(org?.name ?? 'S').charAt(0)}
                    </div>
                  )}
                  <div>
                    <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-950 leading-tight">
                      {org?.name ?? 'Shri Balasaheb Mane Shikshan Prasarak Mandal, Ambap'}
                    </h1>
                    {org?.address && (
                      <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{org.address}</p>
                    )}
                    {org?.registration_no && (
                      <p className="text-[9px] font-mono text-slate-500 mt-0.5">{org.registration_no}</p>
                    )}
                  </div>
                </div>
                {/* Photo box */}
                <div className="flex-shrink-0 text-center">
                  <div className="w-20 h-24 border-2 border-slate-400 overflow-hidden flex items-center justify-center bg-slate-50">
                    {application.photo_url ? (
                      <img src={application.photo_url} alt="Candidate" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-[9px] text-slate-400 p-1">
                        <div className="text-xl mb-0.5">📷</div>
                        Photo
                      </div>
                    )}
                  </div>
                  <p className="text-[8px] text-slate-400 mt-0.5">Candidate Photo</p>
                </div>
              </div>

              {/* ── Form Title & App No ─────────────────────────────────── */}
              <div className="text-center space-y-1 py-1">
                <div className="inline-block border-2 border-slate-800 px-6 py-1">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-900">
                    {lang === 'mr' ? 'उमेदवार अर्ज — CANDIDATE APPLICATION FORM' : 'Candidate Application Form'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 font-mono mt-1">
                  <span className="font-black text-base text-sky-900 tracking-widest border border-sky-700 px-4 py-0.5">
                    {application.application_no}
                  </span>
                  <span>Filed: {fmtDate(application.created_at)}</span>
                  <span className="capitalize font-semibold text-slate-700">
                    Status: {fmtStatus(application.status)}
                  </span>
                </div>
              </div>

              {/* ── SECTION 1: Applied Post ─────────────────────────────── */}
              <div className="print-section">
                <div className="print-section-title flex items-center gap-1.5 text-[9px]">
                  <Briefcase className="w-3 h-3" /> 1. Applied Post & Academic Stream
                </div>
                <div className="print-grid pt-1">
                  <Field label="Post Applied For"
                    value={application.posts?.title ?? application.custom_post_title} />
                  <Field label="Staff Category"
                    value={application.staff_categories?.name} />
                  <Field label="Academic Stream / Discipline"
                    value={application.posts?.program_stream} />
                  <Field label="Preferred Institute"
                    value={(application.institutes as any)?.official_name} />
                </div>
              </div>

              {/* ── SECTION 2: Personal Details ──────────────────────────── */}
              <div className="print-section">
                <div className="print-section-title flex items-center gap-1.5 text-[9px]">
                  <User className="w-3 h-3" /> 2. Personal & Contact Details / वैयक्तिक माहिती
                </div>
                <div className="print-grid pt-1">
                  <Field label="Candidate Full Name / उमेदवाराचे संपूर्ण नाव"
                    value={application.candidate_name} wide />
                  <Field label="Date of Birth / जन्मतारीख"
                    value={fmtDate(application.dob)} />
                  <Field label="Age / वय"
                    value={application.age ? `${application.age} Years` : undefined} />
                  <Field label="Gender / लिंग"
                    value={application.gender ? (genderLabel[application.gender] ?? application.gender) : undefined} />
                  <Field label="Marital Status / वैवाहिक स्थिती"
                    value={application.is_married ? 'Married (विवाहित)' : 'Single / Unmarried (अविवाहित)'} />
                  <Field label="Blood Group / रक्तगट"
                    value={application.blood_group} />
                  <Field label="Reservation Category / प्रवर्ग"
                    value={application.reservation_category} />
                  <Field label="PwD / Differently Abled / दिव्यांगत्व"
                    value={application.is_pwd
                      ? `Yes${application.pwd_type ? ` — ${application.pwd_type}` : ''}`
                      : 'No'} />
                  <Field label="Languages Known / भाषा ज्ञान"
                    value={application.languages_known?.join(', ')} wide />
                </div>
              </div>

              {/* ── SECTION 3: Contact & Address ─────────────────────────── */}
              <div className="print-section">
                <div className="print-section-title flex items-center gap-1.5 text-[9px]">
                  <Phone className="w-3 h-3" /> 3. Contact & Address / संपर्क व पत्ता
                </div>
                <div className="print-grid pt-1">
                  <Field label="Mobile / WhatsApp / मोबाईल"
                    value={application.contact_no} mono />
                  <Field label="Email Address / ईमेल"
                    value={application.email_id} mono />
                  <Field label="Residential Address / राहण्याचा पत्ता"
                    value={application.address} wide />
                  <Field label="Permanent Address / कायमचा पत्ता"
                    value={application.permanent_address ?? application.address} wide />
                </div>

                {/* Emergency Contact */}
                {(application.emergency_contact_name || application.emergency_contact_mobile) && (
                  <div className="mt-2 p-2 border border-rose-200 bg-rose-50 rounded">
                    <p className="text-[8px] font-black uppercase text-rose-800 mb-1">🚨 Emergency Contact / आपत्कालीन संपर्क</p>
                    <div className="print-grid-3">
                      <Field label="Name" value={application.emergency_contact_name} />
                      <Field label="Relationship" value={application.emergency_contact_relation} />
                      <Field label="Mobile" value={application.emergency_contact_mobile} mono />
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECTION 4: ID Proof ──────────────────────────────────── */}
              <div className="print-section">
                <div className="print-section-title flex items-center gap-1.5 text-[9px]">
                  <Shield className="w-3 h-3" /> 4. Identity Proof / ओळखपत्र
                </div>
                <div className="print-grid pt-1">
                  <Field label="Aadhaar Number (Masked) / आधार क्रमांक"
                    value={application.aadhaar_masked} mono />
                  <Field label="PAN Number (Masked) / पॅन क्रमांक"
                    value={application.pan_masked} mono />
                </div>
              </div>

              {/* ── SECTION 5: Educational Qualifications ──────────────── */}
              {filledEdu.length > 0 && (
                <div className="print-section">
                  <div className="print-section-title flex items-center gap-1.5 text-[9px]">
                    <GraduationCap className="w-3 h-3" /> 5. Educational Qualifications / शैक्षणिक पात्रता
                  </div>
                  <table className="print-table mt-1">
                    <thead>
                      <tr>
                        <th style={{ width: '22%' }}>Exam / Level</th>
                        <th style={{ width: '22%' }}>Degree / Branch</th>
                        <th style={{ width: '28%' }}>Board / University / School</th>
                        <th style={{ width: '10%', textAlign: 'center' }}>Year</th>
                        <th style={{ width: '18%', textAlign: 'center' }}>% / Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filledEdu.map((e, i) => (
                        <tr key={i}>
                          <td className="font-semibold">{e.level}</td>
                          <td>{e.degree_name || '—'}</td>
                          <td>{e.board_university || '—'}</td>
                          <td className="text-center font-mono">{e.passing_year || '—'}</td>
                          <td className="text-center">
                            {e.percentage ? `${e.percentage}%` : e.status_remark || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-1.5">
                    <Field label="Highest Qualification Summary" value={application.qualification_summary} />
                  </div>
                </div>
              )}

              {/* ── SECTION 6: Work Experience ───────────────────────────── */}
              <div className="print-section">
                <div className="print-section-title flex items-center gap-1.5 text-[9px]">
                  <Briefcase className="w-3 h-3" /> 6. Work Experience / कामाचा अनुभव
                </div>

                {/* Experience Summary */}
                {(application.total_teaching_exp_years || application.total_industry_exp_years) ? (
                  <div className="flex gap-4 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded mb-1.5 text-[8.5pt]">
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[7pt] tracking-wider">Teaching Exp:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {application.total_teaching_exp_years ?? 0} Yrs {application.total_teaching_exp_months ?? 0} Months
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[7pt] tracking-wider">Industry/Admin Exp:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {application.total_industry_exp_years ?? 0} Yrs {application.total_industry_exp_months ?? 0} Months
                      </span>
                    </div>
                  </div>
                ) : null}

                {isFresher ? (
                  <p className="text-[9pt] text-slate-600 font-semibold px-2 py-1 bg-slate-50 border border-slate-200 rounded">
                    ✨ Fresher — No prior work experience
                  </p>
                ) : expRows.length > 0 ? (
                  <table className="print-table mt-1">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Organization / Institute</th>
                        <th>Designation Held</th>
                        <th style={{ textAlign: 'center' }}>Years Exp.</th>
                        <th style={{ textAlign: 'center' }}>Last Salary (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expRows.map((ex, i) => (
                        <tr key={i}>
                          <td className="text-center font-bold text-slate-500">{i + 1}</td>
                          <td>{ex.organization_name || '—'}</td>
                          <td>{ex.designation || '—'}</td>
                          <td className="text-center">{ex.years_experience ?? '—'}</td>
                          <td className="text-center font-mono">{ex.previous_salary ? `₹${ex.previous_salary.toLocaleString('en-IN')}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[9pt] text-slate-400 px-2 py-1">No experience entries recorded.</p>
                )}

                <div className="mt-1.5">
                  <Field label="Expected Salary (₹/month)"
                    value={application.salary_expectation ? `₹ ${application.salary_expectation.toLocaleString('en-IN')}` : undefined} />
                </div>
              </div>

              {/* ── SECTION 7: Declaration & Signature ──────────────────── */}
              <div className="print-section">
                <div className="print-section-title flex items-center gap-1.5 text-[9px]">
                  ✍️ 7. Declaration & Signature / प्रतिज्ञापत्र व स्वाक्षरी
                </div>
                <div className="pt-1 text-[8pt] text-slate-700 leading-relaxed px-1 mb-2">
                  I hereby certify that the information and documents submitted are true, complete, and correct to the best of my knowledge.
                  I agree that the Trust may process this data exclusively for recruitment and interview purposes.
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <Field label="Place / ठिकाण" value={application.declaration_place} />
                    <Field label="Date / दिनांक" value={fmtDate(application.declaration_date)} />
                  </div>
                  <div className="text-center flex-shrink-0">
                    <div className="border border-slate-400 w-28 h-16 overflow-hidden flex items-center justify-center bg-slate-50">
                      {application.signature_url?.startsWith('typed:') ? (
                        <span className="font-serif italic text-slate-700 text-[10px] px-1 text-center leading-tight">
                          {application.signature_url.replace('typed:', '')}
                        </span>
                      ) : application.signature_url ? (
                        <img
                          src={application.signature_url}
                          alt="Signature"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[8px] text-slate-400">Signature</span>
                      )}
                    </div>
                    <p className="text-[7.5pt] text-slate-500 mt-0.5">Candidate Signature</p>
                  </div>
                </div>
              </div>

              {/* ── Office Use Only strip ────────────────────────────────── */}
              <div className="border-t-2 border-slate-800 pt-3 mt-4">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 text-center">
                  ── For Office Use Only / कार्यालय उपयोगासाठी ──
                </p>
                <div className="print-grid-3 gap-y-2">
                  <Field label="Verified By" value="" />
                  <Field label="Date of Verification" value="" />
                  <Field label="Fee Receipt No." value="" />
                  <Field label="Documents Checked" value="" />
                  <Field label="HR Remarks" value="" wide />
                </div>
              </div>

              {/* ── Footer ───────────────────────────────────────────────── */}
              <div className="text-center text-[7.5pt] text-slate-400 pt-2 border-t border-slate-100 font-mono">
                {org?.name} • Central HR Department • Application No: {application.application_no} • {fmtDate(application.created_at)}
              </div>
            </div>
          )}

          {/* Print Button (screen only, below form) */}
          {application && (
            <div className="no-print flex justify-center pb-4">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-sky-800 to-sky-700 hover:from-sky-900 hover:to-sky-800 text-white rounded-2xl text-sm font-black uppercase tracking-wider shadow-xl transition"
              >
                <Printer className="w-5 h-5" />
                {lang === 'mr' ? 'प्रिंट करा / PDF म्हणून जतन करा' : 'Print / Save as PDF'}
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
