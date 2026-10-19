'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  Upload,
  ChevronRight,
  Sparkles,
  Receipt as ReceiptIcon,
  Building2,
  GraduationCap,
  Send,
} from 'lucide-react';

// ─── Status Config ─────────────────────────────────────────────────────────────
type AppStatus =
  | 'draft'
  | 'submitted'
  | 'verified_approved'
  | 'fee_paid'
  | 'forwarded_to_institute'
  | 'ready_for_physical_interview'
  | 'interview_scheduled'
  | 'selected_recommended'
  | 'management_approved'
  | 'hold'
  | 'institute_reviewed'
  | 'rejected'
  | 'cancelled';

type StatusConfig = {
  label: string;
  labelMr: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;        // text + bg token
  border: string;
  step: number;         // 1-6 pipeline position (0 = terminal)
  description: string;
  descriptionMr: string;
};

const STATUS_CONFIG: Record<AppStatus, StatusConfig> = {
  draft: {
    label: 'Draft — Pending Submission',
    labelMr: 'ड्राफ्ट — अंतिम सादरीकरण बाकी',
    icon: FileText,
    color: 'text-amber-700 bg-amber-50',
    border: 'border-amber-300',
    step: 0,
    description: 'Your application is saved as a draft. Upload documents and click "Verify & Submit Application" on the Upload page to finalize.',
    descriptionMr: 'आपला अर्ज ड्राफ्ट म्हणून जतन आहे. दस्तऐवज अपलोड करून "Verify & Submit Application" बटणावर क्लिक करा.',
  },
  submitted: {
    label: 'Submitted',
    labelMr: 'सादर झाला',
    icon: CheckCircle2,
    color: 'text-sky-700 bg-sky-50',
    border: 'border-sky-300',
    step: 1,
    description: 'Your application has been received. Please visit the Front Desk with original documents.',
    descriptionMr: 'आपला अर्ज प्राप्त झाला आहे. मूळ कागदपत्रांसह Front Desk काउंटरला भेट द्या.',
  },
  verified_approved: {
    label: 'Verified & Approved',
    labelMr: 'सत्यापित व मंजूर',
    icon: ShieldCheck,
    color: 'text-emerald-700 bg-emerald-50',
    border: 'border-emerald-300',
    step: 2,
    description: 'Documents verified by the HR team. Your application is approved for the next stage.',
    descriptionMr: 'HR टीमने कागदपत्रे सत्यापित केली आहेत. आपला अर्ज पुढील टप्प्यासाठी मंजूर झाला आहे.',
  },
  fee_paid: {
    label: 'Fee Paid',
    labelMr: 'शुल्क भरले',
    icon: ReceiptIcon,
    color: 'text-teal-700 bg-teal-50',
    border: 'border-teal-300',
    step: 3,
    description: 'Application fee collected. Official receipt issued.',
    descriptionMr: 'अर्ज शुल्क स्वीकारले. अधिकृत पावती दिली गेली.',
  },
  forwarded_to_institute: {
    label: 'Forwarded to Institute',
    labelMr: 'संस्थेकडे पाठवला',
    icon: Send,
    color: 'text-blue-700 bg-blue-50',
    border: 'border-blue-300',
    step: 4,
    description: 'Your application has been forwarded to the preferred institute/college for review.',
    descriptionMr: 'आपला अर्ज प्राधान्य संस्था/महाविद्यालयाकडे पुनरावलोकनासाठी पाठवला गेला आहे.',
  },
  ready_for_physical_interview: {
    label: 'Ready for Interview',
    labelMr: 'मुलाखतीसाठी तयार',
    icon: Calendar,
    color: 'text-purple-700 bg-purple-50',
    border: 'border-purple-300',
    step: 5,
    description: 'You have been shortlisted for a physical interview. Await official communication.',
    descriptionMr: 'आपला प्रत्यक्ष मुलाखतीसाठी शॉर्टलिस्ट झाला आहे. अधिकृत सूचनेची प्रतीक्षा करा.',
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    labelMr: 'मुलाखत निश्चित',
    icon: Calendar,
    color: 'text-indigo-700 bg-indigo-50',
    border: 'border-indigo-300',
    step: 5,
    description: 'Interview date and venue have been scheduled. Check your contact details for communication.',
    descriptionMr: 'मुलाखतीची तारीख व ठिकाण निश्चित केले आहे. संपर्काद्वारे माहिती मिळेल.',
  },
  selected_recommended: {
    label: 'Selected / Recommended',
    labelMr: 'निवड / शिफारस',
    icon: Sparkles,
    color: 'text-amber-700 bg-amber-50',
    border: 'border-amber-300',
    step: 6,
    description: 'The institute has recommended your selection. Pending final management approval.',
    descriptionMr: 'संस्थेने आपल्या निवडीची शिफारस केली आहे. व्यवस्थापन मंजुरी प्रतीक्षेत.',
  },
  management_approved: {
    label: 'Management Approved',
    labelMr: 'व्यवस्थापन मंजूर',
    icon: CheckCircle2,
    color: 'text-emerald-800 bg-emerald-100',
    border: 'border-emerald-400',
    step: 6,
    description: 'Congratulations! Your selection has been approved by management. Appointment process will begin.',
    descriptionMr: 'अभिनंदन! आपल्या निवडीस व्यवस्थापनाने मंजुरी दिली आहे. नियुक्ती प्रक्रिया सुरू होईल.',
  },
  institute_reviewed: {
    label: 'Institute Reviewed',
    labelMr: 'संस्थेने पुनरावलोकन केले',
    icon: GraduationCap,
    color: 'text-blue-700 bg-blue-50',
    border: 'border-blue-300',
    step: 5,
    description: 'Your application has been reviewed by the institute head.',
    descriptionMr: 'आपल्या अर्जाचे संस्था प्रमुखाने पुनरावलोकन केले आहे.',
  },
  hold: {
    label: 'On Hold',
    labelMr: 'प्रतीक्षेत / थांबवला',
    icon: Clock,
    color: 'text-amber-600 bg-amber-50',
    border: 'border-amber-200',
    step: 0,
    description: 'Your application is temporarily on hold. Please contact HR for more information.',
    descriptionMr: 'आपला अर्ज तात्पुरता थांबवला गेला आहे. अधिक माहितीसाठी HR शी संपर्क करा.',
  },
  rejected: {
    label: 'Not Selected',
    labelMr: 'अपात्र / निवड झाली नाही',
    icon: XCircle,
    color: 'text-rose-700 bg-rose-50',
    border: 'border-rose-300',
    step: 0,
    description: 'Your application was not selected at this time. We encourage you to apply for future openings.',
    descriptionMr: 'आपला अर्ज यावेळी निवडला गेला नाही. भविष्यातील रिक्त पदांसाठी अर्ज करण्यास प्रोत्साहन आहे.',
  },
  cancelled: {
    label: 'Cancelled',
    labelMr: 'रद्द केला',
    icon: XCircle,
    color: 'text-slate-600 bg-slate-100',
    border: 'border-slate-300',
    step: 0,
    description: 'This application has been cancelled. Contact HR for further details.',
    descriptionMr: 'हा अर्ज रद्द करण्यात आला आहे. अधिक माहितीसाठी HR शी संपर्क करा.',
  },
};

// ─── Pipeline Steps ─────────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { step: 1, label: 'Submitted', labelMr: 'सादर' },
  { step: 2, label: 'Verified', labelMr: 'सत्यापित' },
  { step: 3, label: 'Fee Paid', labelMr: 'शुल्क' },
  { step: 4, label: 'Forwarded', labelMr: 'पाठवला' },
  { step: 5, label: 'Interview', labelMr: 'मुलाखत' },
  { step: 6, label: 'Approved', labelMr: 'मंजूर' },
];

// ─── Application data shape ────────────────────────────────────────────────────
type AppData = {
  id: string;
  application_no: string;
  candidate_name: string;
  contact_no: string;
  email_id?: string;
  address?: string;
  dob?: string;
  status: AppStatus;
  submission_channel: string;
  created_at: string;
  updated_at: string;
  verified_at?: string;
  verified_by?: string;
  verification_remarks?: string;
  forwarded_at?: string;
  forwarded_to_head_name?: string;
  central_hr_remarks?: string;
  interview_conducted_date?: string;
  interview_venue?: string;
  institute_recommendation?: string;
  management_approved_at?: string;
  management_approval_remarks?: string;
  cancellation_reason?: string;
  temp_id?: string;
  source_type?: string;
  registration_status?: string;
  posts?: { title: string } | null;
  custom_post_title?: string;
  staff_categories?: { name: string } | null;
  institutes?: { official_name: string } | null;
  fee_receipts?: { receipt_no: string; amount: number; issued_at: string }[];
};

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Page Component ───────────────────────────────────────────────────────────
export default function ApplicationStatusPage() {
  const [lang, setLang] = useState<'en' | 'mr'>('en');
  const [appNoInput, setAppNoInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [app, setApp] = useState<AppData | null>(null);

  // ── Two-step mobile verification ──────────────────────────────────────────
  // Step 1: user enters application number → we find the record (masked data only)
  // Step 2: user enters last 4 digits of their mobile → if it matches, reveal full data
  const [pendingApp, setPendingApp] = useState<AppData | null>(null); // found but not yet verified
  const [mobileInput, setMobileInput] = useState('');
  const [mobileError, setMobileError] = useState<string | null>(null);

  // Step 1: Look up by application number — returns masked info only
  const handleSearch = async () => {
    const clean = appNoInput.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setApp(null);
    setPendingApp(null);
    setMobileInput('');
    setMobileError(null);

    try {
      const queryBuilder = supabase
        .from('applications')
        .select(`
          id, application_no, candidate_name, contact_no, email_id, address, dob,
          status, submission_channel, created_at, updated_at,
          temp_id, source_type, registration_status,
          verified_at, verified_by, verification_remarks,
          forwarded_at, forwarded_to_head_name, central_hr_remarks,
          interview_conducted_date, interview_venue,
          institute_recommendation, management_approved_at, management_approval_remarks,
          cancellation_reason, custom_post_title,
          posts(title),
          staff_categories(name),
          institutes:preferred_institute_id(official_name),
          fee_receipts(receipt_no, amount, issued_at)
        `);

      let res = await (clean.includes('TMP') || clean.includes('TEMP')
        ? queryBuilder.or(`temp_id.ilike.%${clean}%,application_no.ilike.%${clean}%`).maybeSingle()
        : queryBuilder.or(`application_no.eq.${clean},temp_id.ilike.%${clean}%`).maybeSingle());

      if (res.error && res.error.message.includes('temp_id')) {
        res = await supabase
          .from('applications')
          .select(`
            id, application_no, candidate_name, contact_no, email_id, address, dob,
            status, submission_channel, created_at, updated_at,
            verified_at, verified_by, verification_remarks,
            forwarded_at, forwarded_to_head_name, central_hr_remarks,
            interview_conducted_date, interview_venue,
            institute_recommendation, management_approved_at, management_approval_remarks,
            cancellation_reason, custom_post_title,
            posts(title),
            staff_categories(name),
            institutes:preferred_institute_id(official_name),
            fee_receipts(receipt_no, amount, issued_at)
          `)
          .eq('application_no', clean)
          .maybeSingle();
      }

      const { data, error: dbErr } = res;

      if (dbErr) throw dbErr;
      if (!data) {
        setError(
          lang === 'mr'
            ? 'हा अर्ज क्रमांक सापडला नाही. कृपया पुन्हा तपासा.'
            : 'Application not found. Please verify the number and try again.'
        );
        return;
      }
      // Hold the record in pending state — require mobile verification before full reveal
      setPendingApp(data as unknown as AppData);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch status.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify last 4 digits of registered mobile number
  const handleMobileVerify = () => {
    if (!pendingApp) return;
    const last4 = pendingApp.contact_no?.replace(/\D/g, '').slice(-4);
    const entered = mobileInput.trim().replace(/\D/g, '');
    if (entered.length !== 4) {
      setMobileError(
        lang === 'mr'
          ? 'कृपया फक्त 4 अंक प्रविष्ट करा.'
          : 'Please enter exactly 4 digits.'
      );
      return;
    }
    if (entered !== last4) {
      setMobileError(
        lang === 'mr'
          ? 'मोबाईल क्रमांकाचे शेवटचे 4 अंक जुळत नाहीत. कृपया पुन्हा प्रयत्न करा.'
          : 'Last 4 digits do not match the registered mobile number. Please try again.'
      );
      return;
    }
    // Verification passed — reveal full data
    setApp(pendingApp);
    setPendingApp(null);
    setMobileError(null);
  };

  const statusCfg = app ? STATUS_CONFIG[app.status] ?? STATUS_CONFIG['submitted'] : null;
  const StatusIcon = statusCfg?.icon ?? CheckCircle2;
  const currentStep = statusCfg?.step ?? 1;
  const isTerminal = currentStep === 0; // hold / rejected / cancelled

  return (
    <div className="min-h-screen bg-slate-100 pb-20 font-sans">
      {/* Header */}
      <header className="px-3 sm:px-4 py-2.5 sm:py-3.5 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
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

      <main className="max-w-3xl mx-auto px-3 sm:px-4 pt-5 space-y-5">

        {/* Page Title Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900">
                {lang === 'mr' ? 'अर्ज स्थिती तपासा' : 'Application Status Tracker'}
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'mr'
                  ? 'आपला अर्ज क्रमांक (उदा. 2026-OCT-00001) किंवा तात्पुरता आयडी (उदा. TMP-2026-00001) प्रविष्ट करा.'
                  : 'Enter your Application Number (e.g. 2026-OCT-00001) or Temporary ID (e.g. TMP-2026-00001) to check status.'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder={lang === 'mr' ? 'उदा. 2026-OCT-00001 किंवा TMP-2026-00001' : 'e.g. 2026-OCT-00001 or TMP-2026-00001'}
              value={appNoInput}
              onChange={(e) => { setAppNoInput(e.target.value.toUpperCase()); setError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono font-semibold tracking-widest uppercase bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading || !appNoInput.trim()}
              className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {lang === 'mr' ? 'तपासा' : 'Check Status'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* ── Step 2: Mobile Verification Card ─────────────────────────────── */}
        {pendingApp && !app && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border-2 border-sky-200 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  {lang === 'mr' ? 'ओळख सत्यापन' : 'Identity Verification'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'mr'
                    ? `अर्ज सापडला — "${pendingApp.candidate_name.split(' ')[0]}". खाली आपल्या नोंदणीकृत मोबाईल क्रमांकाचे शेवटचे 4 अंक प्रविष्ट करा.`
                    : `Application found for "${pendingApp.candidate_name.split(' ')[0]}". Enter the last 4 digits of your registered mobile number to verify your identity.`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {lang === 'mr' ? 'मोबाईल क्रमांकाचे शेवटचे 4 अंक' : 'Last 4 digits of mobile number'}
                </label>
                <input
                  type="tel"
                  maxLength={4}
                  placeholder="XXXX"
                  value={mobileInput}
                  onChange={(e) => { setMobileInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setMobileError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleMobileVerify()}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-base font-mono font-bold tracking-widest text-center bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm"
                />
                {mobileError && (
                  <p className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" /> {mobileError}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleMobileVerify}
                disabled={mobileInput.length !== 4}
                className="mt-5 px-4 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4" />
                {lang === 'mr' ? 'सत्यापित करा' : 'Verify & View'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              {lang === 'mr'
                ? '🔒 आपला डेटा सुरक्षित आहे. ओळख सत्यापनाशिवाय कोणतीही माहिती उघड केली जाणार नाही.'
                : '🔒 Your data is protected. No information is revealed without identity verification.'}
            </p>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {app && statusCfg && (
          <>
            {/* Status Hero Card */}
            <div className={`bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border-2 ${statusCfg.border} space-y-4 animate-in fade-in duration-300`}>
              {/* Top row: status badge + app no */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {lang === 'mr' ? 'अर्ज क्रमांक' : 'Application No.'}
                  </p>
                  <p className="text-xl font-black font-mono text-slate-900 tracking-widest">{app.application_no}</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">{app.candidate_name}</p>
                  <p className="text-xs text-slate-500">
                    {app.posts?.title ?? app.custom_post_title ?? '—'}
                    {app.staff_categories ? ` · ${app.staff_categories.name}` : ''}
                  </p>
                </div>
                {/* Status Badge */}
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl ${statusCfg.color} border ${statusCfg.border} self-start sm:self-center flex-shrink-0`}>
                  <StatusIcon className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-black">{lang === 'mr' ? statusCfg.labelMr : statusCfg.label}</p>
                    <p className="text-[10px] font-medium opacity-70">
                      {lang === 'mr' ? 'सध्याची स्थिती' : 'Current Status'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Description */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                {lang === 'mr' ? statusCfg.descriptionMr : statusCfg.description}
              </div>

              {/* ── Pipeline Progress Bar ─────────────────────────────────── */}
              {!isTerminal && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                    {lang === 'mr' ? 'अर्ज प्रक्रियेची स्थिती' : 'Application Pipeline Progress'}
                  </p>
                  <div className="flex items-center gap-0">
                    {PIPELINE_STEPS.map((s, i) => {
                      const isCompleted = currentStep >= s.step;
                      const isCurrent = currentStep === s.step;
                      return (
                        <React.Fragment key={s.step}>
                          <div className="flex flex-col items-center flex-1 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition ${
                              isCompleted
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-300 text-slate-400'
                            } ${isCurrent ? 'ring-2 ring-emerald-300 ring-offset-1' : ''}`}>
                              {isCompleted ? '✓' : s.step}
                            </div>
                            <span className={`text-[8px] font-bold mt-1 text-center leading-tight ${isCompleted ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {lang === 'mr' ? s.labelMr : s.label}
                            </span>
                          </div>
                          {i < PIPELINE_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-0.5 mb-3 ${currentStep > s.step ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Terminal status notice */}
              {isTerminal && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  {lang === 'mr'
                    ? 'अर्जाची प्रक्रिया थांबली आहे. अधिक माहितीसाठी HR Office शी संपर्क साधा.'
                    : 'Application processing has stopped. Please contact HR Office for further information.'}
                </div>
              )}

              {/* Remote Pre-Registration Pending Desk Fee Callout */}
              {app.registration_status === 'DRAFT_PENDING_FEE' && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-950 space-y-1">
                    <strong className="font-bold">
                      {lang === 'mr' ? 'ऑनलाइन पूर्व-नोंदणी: फ्रंट डेस्क शुल्क भरणे बाकी' : 'Online Pre-Registration: Front Desk Settlement Pending'}
                    </strong>
                    <p className="text-amber-900 leading-relaxed text-[11px]">
                      {lang === 'mr'
                        ? `आपली पूर्व-नोंदणी (तात्पुरता आयडी: ${app.temp_id || app.application_no}) प्रणालीत नोंदवली गेली आहे. कृपया मूळ प्रमाणपत्रांसह श्री बाळासाहेब माने शिक्षण प्रसारक मंडळ, आंबाप येथील Central HR Front Desk ला भेट द्या. तेथे विहित शुल्क भरून अधिकृत पावती घ्या व अर्ज सक्रिय करा.`
                        : `Your online pre-registration (Temporary ID: ${app.temp_id || app.application_no}) is recorded. Please visit the Central HR Front Desk at Ambap Campus with your original credentials. Front desk staff will collect the application fee, issue your official receipt, and activate your application for interview scheduling.`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                {lang === 'mr' ? '📅 महत्त्वाच्या तारखा' : '📅 Key Dates & Timeline'}
              </h3>

              <div className="space-y-2">
                {/* Submitted */}
                <TimelineRow
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label={lang === 'mr' ? 'अर्ज सादर केला' : 'Application Submitted'}
                  value={fmtDateTime(app.created_at)}
                  color="sky"
                />

                {/* Verified */}
                {app.verified_at && (
                  <TimelineRow
                    icon={<ShieldCheck className="w-3.5 h-3.5" />}
                    label={lang === 'mr' ? `${app.verified_by ? app.verified_by + ' यांनी ' : ''}सत्यापित` : `Verified${app.verified_by ? ` by ${app.verified_by}` : ''}`}
                    value={fmtDateTime(app.verified_at)}
                    color="emerald"
                    remark={app.verification_remarks}
                  />
                )}

                {/* Fee Receipts */}
                {app.fee_receipts && app.fee_receipts.length > 0 && (
                  app.fee_receipts.map((r, i) => (
                    <TimelineRow
                      key={i}
                      icon={<ReceiptIcon className="w-3.5 h-3.5" />}
                      label={`${lang === 'mr' ? 'पावती क्र.' : 'Fee Receipt'} ${r.receipt_no}`}
                      value={`₹ ${r.amount.toLocaleString('en-IN')} · ${fmtDate(r.issued_at)}`}
                      color="teal"
                    />
                  ))
                )}

                {/* Forwarded */}
                {app.forwarded_at && (
                  <TimelineRow
                    icon={<Send className="w-3.5 h-3.5" />}
                    label={lang === 'mr'
                      ? `${app.forwarded_to_head_name ? app.forwarded_to_head_name + ' यांना ' : ''}पाठवला`
                      : `Forwarded${app.forwarded_to_head_name ? ` to ${app.forwarded_to_head_name}` : ''}`}
                    value={fmtDateTime(app.forwarded_at)}
                    color="blue"
                    remark={app.central_hr_remarks}
                  />
                )}

                {/* Interview */}
                {app.interview_conducted_date && (
                  <TimelineRow
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    label={lang === 'mr' ? 'मुलाखत' : 'Interview'}
                    value={`${fmtDate(app.interview_conducted_date)}${app.interview_venue ? ` · ${app.interview_venue}` : ''}`}
                    color="purple"
                  />
                )}

                {/* Institute Recommendation */}
                {app.institute_recommendation && (
                  <TimelineRow
                    icon={<GraduationCap className="w-3.5 h-3.5" />}
                    label={lang === 'mr' ? 'संस्थेची शिफारस' : 'Institute Recommendation'}
                    value={app.institute_recommendation.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    color="amber"
                  />
                )}

                {/* Management Approval */}
                {app.management_approved_at && (
                  <TimelineRow
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    label={lang === 'mr' ? 'व्यवस्थापन मंजुरी' : 'Management Approval'}
                    value={fmtDateTime(app.management_approved_at)}
                    color="emerald"
                    remark={app.management_approval_remarks}
                  />
                )}

                {/* Cancellation */}
                {app.cancellation_reason && (
                  <TimelineRow
                    icon={<XCircle className="w-3.5 h-3.5" />}
                    label={lang === 'mr' ? 'रद्द कारण' : 'Cancellation Reason'}
                    value={app.cancellation_reason}
                    color="rose"
                  />
                )}
              </div>
            </div>

            {/* Contact Details Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                {lang === 'mr' ? '👤 उमेदवार माहिती' : '👤 Candidate Details'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoItem icon={<User className="w-3.5 h-3.5" />} label={lang === 'mr' ? 'नाव' : 'Name'} value={app.candidate_name} />
                <InfoItem icon={<Phone className="w-3.5 h-3.5" />} label={lang === 'mr' ? 'मोबाईल' : 'Mobile'} value={app.contact_no} mono />
                <InfoItem icon={<Mail className="w-3.5 h-3.5" />} label={lang === 'mr' ? 'ईमेल' : 'Email'} value={app.email_id} mono />
                <InfoItem icon={<FileText className="w-3.5 h-3.5" />} label={lang === 'mr' ? 'अर्ज केलेले पद' : 'Post Applied'} value={app.posts?.title ?? app.custom_post_title} />
                <InfoItem icon={<Building2 className="w-3.5 h-3.5" />} label={lang === 'mr' ? 'प्रकार' : 'Category'} value={app.staff_categories?.name} />
                <InfoItem icon={<Calendar className="w-3.5 h-3.5" />} label={lang === 'mr' ? 'सादर तारीख' : 'Filed On'} value={fmtDate(app.created_at)} />
              </div>
            </div>

            {/* Quick Actions — Upload only (Download restricted to admin roles) */}
            <div className="w-full">
              <Link
                href="/apply/upload"
                className="flex items-center gap-2.5 p-4 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-2xl text-sm font-bold text-slate-800 hover:text-teal-800 transition shadow-sm group"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-600 group-hover:text-white transition">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">{lang === 'mr' ? 'दस्तऐवज अपलोड' : 'Upload Documents'}</p>
                  <p className="text-[10px] text-slate-500">{lang === 'mr' ? 'प्रमाणपत्रे अपलोड करा' : 'Upload Certificates & Submit'}</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto text-slate-400 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </>
        )}

        {/* Empty state */}
        {!app && !loading && !error && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-8 shadow-sm border border-slate-200 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-700">
              {lang === 'mr' ? 'अर्ज क्रमांक प्रविष्ट करा' : 'Enter your Application Number above'}
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {lang === 'mr'
                ? 'अर्ज यशस्वीरीत्या सादर केल्यानंतर मिळालेल्या Success Screen वरील क्रमांक वापरा.'
                : 'Use the number shown on your Success Screen after you submitted your application, or visit the Front Desk counter.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function TimelineRow({
  icon, label, value, color, remark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'sky' | 'emerald' | 'teal' | 'blue' | 'purple' | 'amber' | 'rose';
  remark?: string;
}) {
  const colorMap: Record<string, string> = {
    sky: 'bg-sky-100 text-sky-700 border-sky-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    teal: 'bg-teal-100 text-teal-700 border-teal-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    rose: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-xs font-semibold text-slate-800 mt-0.5">{value}</p>
        {remark && <p className="text-[10px] text-slate-500 mt-0.5 italic">{remark}</p>}
      </div>
    </div>
  );
}

function InfoItem({
  icon, label, value, mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <p className={`text-xs font-semibold text-slate-800 truncate ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}


