'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { OrganizationSettings } from '@/types/database';
import { TrustLetterhead } from '@/components/TrustLetterhead';
import {
  User,
  Phone,
  FileText,
  Upload,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  Languages,
  Printer,
  Clock,
  MapPin,
  AlertTriangle,
  Building2,
  DollarSign
} from 'lucide-react';

const designationOptions = [
  { value: 'ACCOUNTANT', label: 'ACCOUNTANT (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'ASSISTANT PROFESSOR', label: 'ASSISTANT PROFESSOR (Teaching)', category: 'Teaching' },
  { value: 'ASSOCIATE PROFESSOR', label: 'ASSOCIATE PROFESSOR (Teaching)', category: 'Teaching' },
  { value: 'PROFESSOR', label: 'PROFESSOR (Teaching)', category: 'Teaching' },
  { value: 'DIRECTOR', label: 'DIRECTOR (Teaching)', category: 'Teaching' },
  { value: 'LIBRARIAN', label: 'LIBRARIAN (Teaching)', category: 'Teaching' },
  { value: 'PHYSICAL DIRECTOR', label: 'PHYSICAL DIRECTOR (Teaching)', category: 'Teaching' },
  { value: 'REGISTRAR', label: 'REGISTRAR (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'JR. CLERK', label: 'JR. CLERK (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'SR. CLERK', label: 'SR. CLERK (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'LAB ASSISTANT', label: 'LAB ASSISTANT (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'LAB ATTENDANT', label: 'LAB ATTENDANT (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'LAB INSTRUCTOR', label: 'LAB INSTRUCTOR (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'NETWORK ADMIN', label: 'NETWORK ADMIN (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'STORE INCHARGE', label: 'STORE INCHARGE (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'STENOGRAPHER', label: 'STENOGRAPHER (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'HOUSEKEEPING SUPERVISOR', label: 'HOUSEKEEPING SUPERVISOR (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'DRIVER', label: 'DRIVER (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'SECURITY', label: 'SECURITY (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'PEON', label: 'PEON (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'PLUMBER/PEON', label: 'PLUMBER/PEON (Non-Teaching)', category: 'Non-Teaching' },
  { value: 'GARDENER', label: 'GARDENER (Non-Teaching)', category: 'Non-Teaching' },
];

const programStreamOptions = [
  'Engineering & Technology',
  'Management (MBA / MMS)',
  'Computer Applications (MCA)',
  'Pharmacy',
  'BAMS (Ayurveda)',
  'BHMS (Homeopathy)',
  'Nursing & Health Sciences',
  'Education (B.Ed / D.Ed / M.Ed)',
  'Industrial Training Institute (ITI)',
  'Arts, Commerce & Science',
  'Junior College / Higher Secondary',
  'School Education (CBSE / State)',
  'General / Administrative / Other',
];

interface SubmittedCandidateInfo {
  temp_id: string;
  application_no: string;
  candidate_name: string;
  post_title: string;
  program_stream: string;
  contact_no: string;
  prescribed_fee: number;
  created_at: string;
}

function OnlinePreRegistrationContent() {
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<'en' | 'mr'>('en');
  const [org, setOrg] = useState<OrganizationSettings | null>(null);

  // Section 1: Designation & Academic Stream
  const [designation, setDesignation] = useState('');
  const [stream, setStream] = useState('Engineering & Technology');
  const [course, setCourse] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [preferredCampus, setPreferredCampus] = useState('Any Sanstha Campus');

  // Section 2: Personal Information & Identification
  const [salutation, setSalutation] = useState('Mr.');
  const [fullName, setFullName] = useState('');
  const [parentSpouseName, setParentSpouseName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [bloodGroup, setBloodGroup] = useState('');
  const [category, setCategory] = useState('OPEN');
  const [religionCaste, setReligionCaste] = useState('');
  const [isPwd, setIsPwd] = useState('No');
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [panNo, setPanNo] = useState('');

  // Section 3: Contact Information & Address
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressTaluka, setAddressTaluka] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('Kolhapur');
  const [pincode, setPincode] = useState('');

  // Section 4: Educational Qualifications Table
  const [eduSsc, setEduSsc] = useState({
    board: '',
    year: '',
    eval: 'Percentage',
    score: '',
    percentage: '',
  });
  const [eduHsc, setEduHsc] = useState({
    degree: '',
    board: '',
    year: '',
    eval: 'Percentage',
    score: '',
    percentage: '',
  });
  const [eduUg, setEduUg] = useState({
    degree: '',
    board: '',
    year: '',
    eval: 'CGPA',
    score: '',
    percentage: '',
  });
  const [eduPg, setEduPg] = useState({
    degree: '',
    board: '',
    year: '',
    eval: 'CGPA',
    score: '',
    percentage: '',
  });

  // Section 5: Experience & Uploads
  const [isFresher, setIsFresher] = useState(false);
  const [totalExpYears, setTotalExpYears] = useState('');
  const [totalExpMonths, setTotalExpMonths] = useState('');
  const [lastOrganization, setLastOrganization] = useState('');
  const [lastDesignation, setLastDesignation] = useState('');
  const [lastSalary, setLastSalary] = useState('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [declaration, setDeclaration] = useState(false);
  const [digitalSignature, setDigitalSignature] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedCandidate, setSubmittedCandidate] = useState<SubmittedCandidateInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // Load Organization Settings & Check URL for success redirect
  useEffect(() => {
    async function loadOrg() {
      try {
        const { data: orgData } = await supabase.from('organization_settings').select('*').limit(1).maybeSingle();
        if (orgData) setOrg(orgData);
      } catch (err) {
        console.warn('Failed to load organization settings:', err);
      }
    }
    loadOrg();

    // Check if user was redirected from HTML Form POST
    const successParam = searchParams.get('success');
    const tempIdParam = searchParams.get('temp_id');
    if (successParam === '1' && tempIdParam) {
      setSubmittedCandidate({
        temp_id: tempIdParam,
        application_no: searchParams.get('app_no') || 'APP-2026-ONLINE',
        candidate_name: searchParams.get('name') || 'Registered Candidate',
        post_title: searchParams.get('post') || 'Applied Designation',
        program_stream: searchParams.get('stream') || 'Engineering & Technology',
        contact_no: searchParams.get('mobile') || '',
        prescribed_fee: parseInt(searchParams.get('fee') || '50', 10),
        created_at: new Date().toISOString(),
      });
    }
  }, [searchParams]);

  // Calculate age when DOB changes
  useEffect(() => {
    if (!dob) {
      setAge('');
      return;
    }
    const birth = new Date(dob);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    setAge(calculatedAge >= 0 ? calculatedAge : '');
  }, [dob]);

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(lang === 'mr' ? 'फोटो २ MB पेक्षा कमी असावा.' : 'Photo size must be less than 2 MB.');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Submit via fetch to POST /api/apply/online
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    if (!designation) {
      alert(lang === 'mr' ? 'कृपया पद निवडा.' : 'Please select a job designation.');
      return;
    }
    if (!fullName.trim()) {
      alert(lang === 'mr' ? 'कृपया आधार कार्डनुसार पूर्ण नाव प्रविष्ट करा.' : 'Please enter full candidate name as per Aadhaar.');
      return;
    }
    if (!mobile || !/^\d{10}$/.test(mobile.trim())) {
      alert(lang === 'mr' ? 'कृपया १० अंकी वैध मोबाईल नंबर प्रविष्ट करा.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!aadhaarNo || !/^\d{12}$/.test(aadhaarNo.replace(/\s+/g, ''))) {
      alert(lang === 'mr' ? 'कृपया १२ अंकी वैध आधार नंबर प्रविष्ट करा.' : 'Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (!declaration) {
      alert(lang === 'mr' ? 'कृपया प्रतिज्ञापत्रास सहमती द्या.' : 'Please accept the declaration before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      // Build FormData to send to /api/apply/online
      const formData = new FormData();
      formData.append('designation', designation);
      formData.append('stream', stream);
      formData.append('course', course);
      formData.append('specialization', specialization);
      formData.append('preferred_campus', preferredCampus);
      formData.append('salutation', salutation);
      formData.append('full_name', fullName);
      formData.append('parent_spouse_name', parentSpouseName);
      formData.append('gender', gender);
      formData.append('dob', dob);
      formData.append('marital_status', maritalStatus);
      formData.append('blood_group', bloodGroup);
      formData.append('category', category);
      formData.append('religion_caste', religionCaste);
      formData.append('is_pwd', isPwd);
      formData.append('aadhaar_no', aadhaarNo);
      formData.append('pan_no', panNo);
      formData.append('mobile', mobile);
      formData.append('email', email);
      formData.append('address_city', addressCity);
      formData.append('address_taluka', addressTaluka);
      formData.append('address_district', addressDistrict);
      formData.append('pincode', pincode);

      // Education fields
      formData.append('edu_degree_ssc', 'SSC');
      formData.append('edu_board_ssc', eduSsc.board);
      formData.append('edu_year_ssc', eduSsc.year);
      formData.append('edu_eval_ssc', eduSsc.eval);
      formData.append('edu_score_ssc', eduSsc.score);
      formData.append('edu_percentage_ssc', eduSsc.percentage);

      formData.append('edu_degree_hsc', eduHsc.degree);
      formData.append('edu_board_hsc', eduHsc.board);
      formData.append('edu_year_hsc', eduHsc.year);
      formData.append('edu_eval_hsc', eduHsc.eval);
      formData.append('edu_score_hsc', eduHsc.score);
      formData.append('edu_percentage_hsc', eduHsc.percentage);

      formData.append('edu_degree_ug', eduUg.degree);
      formData.append('edu_board_ug', eduUg.board);
      formData.append('edu_year_ug', eduUg.year);
      formData.append('edu_eval_ug', eduUg.eval);
      formData.append('edu_score_ug', eduUg.score);
      formData.append('edu_percentage_ug', eduUg.percentage);

      formData.append('edu_degree_pg', eduPg.degree);
      formData.append('edu_board_pg', eduPg.board);
      formData.append('edu_year_pg', eduPg.year);
      formData.append('edu_eval_pg', eduPg.eval);
      formData.append('edu_score_pg', eduPg.score);
      formData.append('edu_percentage_pg', eduPg.percentage);

      // Experience
      formData.append('is_fresher', isFresher ? 'Yes' : 'No');
      formData.append('total_exp_years', totalExpYears);
      formData.append('total_exp_months', totalExpMonths);
      formData.append('last_organization', lastOrganization);
      formData.append('last_designation', lastDesignation);
      formData.append('last_salary', lastSalary);

      // Files
      if (photoFile) formData.append('photo', photoFile);
      if (resumeFile) formData.append('resume', resumeFile);

      // Declaration & Signature
      formData.append('declaration', 'on');
      formData.append('digital_signature', digitalSignature || `${salutation} ${fullName}`);

      const response = await fetch('/api/apply/online', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit pre-registration. Please review all fields.');
      }

      setSubmittedCandidate({
        temp_id: result.temp_id,
        application_no: result.application_no,
        candidate_name: result.candidate_name,
        post_title: result.designation || designation,
        program_stream: result.program_stream || stream,
        contact_no: result.contact_no || mobile,
        prescribed_fee: result.fee || 50,
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(err?.message || 'Failed to submit application. Please check your network and input fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyTempId = () => {
    if (!submittedCandidate?.temp_id) return;
    navigator.clipboard.writeText(submittedCandidate.temp_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SUCCESS VIEW: Rendered upon submission or direct confirmation URL
  // ─────────────────────────────────────────────────────────────────────────────
  if (submittedCandidate) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50/60 via-slate-50 to-indigo-50/40 p-4 sm:p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-10 space-y-8 animate-in fade-in duration-300">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Pre-Registration Recorded • Pending Front Desk Fee Settlement
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Online Pre-Registration Successful!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
              Your details have been saved as <strong className="text-slate-800">Draft (Pending Fee)</strong>. No online payment was required.
            </p>
          </div>

          {/* Prominent Temporary ID Box */}
          <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 rounded-3xl p-6 text-white text-center shadow-lg relative overflow-hidden border border-slate-800">
            <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-sky-500/15 to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-300">
                Temporary Application ID (Keep Safe)
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-white select-all">
                {submittedCandidate.temp_id}
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={copyTempId}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied to Clipboard!' : 'Copy Temporary ID'}
                </button>
              </div>
              <p className="text-[11px] text-slate-300 pt-1">
                Standard Sanstha Reference: <span className="font-mono font-bold text-sky-200">{submittedCandidate.application_no}</span>
              </p>
            </div>
          </div>

          {/* Summary & QR Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl items-center">
            <div className="sm:col-span-2 space-y-2 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Candidate:</span>{' '}
                <span className="font-bold text-slate-900">{submittedCandidate.candidate_name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Designation:</span>{' '}
                <span className="font-bold text-slate-900">{submittedCandidate.post_title}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Program Stream:</span>{' '}
                <span className="font-bold text-slate-900">{submittedCandidate.program_stream}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Primary Mobile:</span>{' '}
                <span className="font-bold font-mono text-slate-900">{submittedCandidate.contact_no}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Application Fee:</span>{' '}
                <span className="font-bold text-emerald-700">₹{submittedCandidate.prescribed_fee} (Payable upon physical arrival)</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <QRCodeSVG
                value={`SBMSPM:TEMP:${submittedCandidate.temp_id}:${submittedCandidate.contact_no}`}
                size={88}
                level="M"
              />
              <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Desk Scan QR</span>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-600" />
              Next Steps for Front Desk Walk-In Settlement:
            </h3>
            <ol className="space-y-3 text-xs text-slate-700">
              <li className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <strong className="text-slate-900">Note or Screenshot your Temporary ID:</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Save <span className="font-mono font-bold text-sky-700">{submittedCandidate.temp_id}</span> on your mobile or print this slip.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <strong className="text-slate-900">Visit Central HR Front Desk:</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Visit Shri Balasaheb Mane Shikshan Prasarak Mandal Head Office, Ambap Campus (Tal. Hatkanangale, Dist. Kolhapur) with your educational certificates.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <strong className="text-slate-900">Desk Staff Fee Collection (₹{submittedCandidate.prescribed_fee}) & Verification:</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Front Desk staff will look up your record using your Temporary ID or Mobile Number, accept the application fee of ₹{submittedCandidate.prescribed_fee} (Cash, UPI, or DD), verify your credentials, and issue your official stamped receipt.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full sm:w-1/2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
            >
              <Printer className="w-4 h-4" />
              Print Registration Slip
            </button>
            <Link
              href={`/apply/status`}
              className="w-full sm:w-1/2 py-3 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 text-center"
            >
              Check Application Status
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FORM VIEW: Matches the public candidate pre-registration portal
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Top Banner Navigation */}
      <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-300 hover:text-white font-bold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'mr' ? 'मुख्य पृष्ठावर परत' : 'Back to Home'}
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'mr' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-[11px]"
            >
              <Languages className="w-3.5 h-3.5 text-sky-400" />
              {lang === 'en' ? 'मराठी आवृत्ती' : 'English View'}
            </button>
            <Link
              href="/apply/status"
              className="text-sky-400 hover:text-sky-300 font-bold transition text-[11px]"
            >
              {lang === 'mr' ? 'अर्जाची स्थिती तपासा' : 'Track Status'}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Trust Official Letterhead */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <TrustLetterhead org={org} />
        </div>

        {/* Portal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              PUBLIC REMOTE CANDIDATE PRE-REGISTRATION PORTAL
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              SHRI BALASAHEB MANE SHIKSHAN PRASARAK MANDAL, AMBAP
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              <strong>Note:</strong> Online payment is NOT required. Your submission will be saved as{' '}
              <em>Draft (Pending Fee)</em>. Application fee (₹50) will be collected upon physical arrival at the Central HR Front Desk.
            </p>
          </div>
        </div>

        {/* Important Alert Notice */}
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 space-y-1">
            <strong className="font-bold">No Online Fee Payment Required:</strong>
            <p className="text-amber-900 leading-relaxed">
              Your submission will be saved as <span className="font-bold text-amber-950">Draft (Pending Fee)</span>.
              The application fee (₹50) will be collected upon physical arrival at the Central HR Front Desk.
            </p>
          </div>
        </div>

        {submitError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            {submitError}
          </div>
        )}

        {/* THE MAIN PRE-REGISTRATION FORM */}
        <form
          id="remotePreRegistrationForm"
          action="/api/apply/online"
          method="POST"
          encType="multipart/form-data"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* SECTION 1: DESIGNATION & ACADEMIC STREAM SELECTION */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                  1. Designation & Academic Stream Selection (पद व विभाग निवड)
                </h2>
                <p className="text-[11px] text-slate-500">Select the post and branch you wish to apply for</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="designation" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Job Designation (पद) <span className="text-rose-500">*</span>
                </label>
                <select
                  id="designation"
                  name="designation"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                >
                  <option value="">-- Select Job Designation --</option>
                  {designationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                  Application Fee: <strong className="text-emerald-700 font-mono">₹50</strong> (Payable upon arrival at Front Desk)
                </span>
              </div>

              <div>
                <label htmlFor="stream" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Academic Program Stream (विभाग) <span className="text-rose-500">*</span>
                </label>
                <select
                  id="stream"
                  name="stream"
                  required
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                >
                  <option value="">-- Select Stream --</option>
                  {programStreamOptions.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="course" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Course / Program (अभ्यासक्रम)
                </label>
                <input
                  type="text"
                  id="course"
                  name="course"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science, MBA, B.Pharm"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>

              <div>
                <label htmlFor="specialization" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Subject / Specialization (विषय / विशेषीकरण)
                </label>
                <input
                  type="text"
                  id="specialization"
                  name="specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Artificial Intelligence, Finance, Pharmaceutics"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="preferred_campus" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Preferred Campus / Institute (ऐच्छिक महाविद्यालय)
                </label>
                <select
                  id="preferred_campus"
                  name="preferred_campus"
                  value={preferredCampus}
                  onChange={(e) => setPreferredCampus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                >
                  <option value="Any Sanstha Campus">Any Sanstha Campus / Central Trust Choice</option>
                  <option value="AMGOI Ambap">
                    SHRI BALASAHEB MANE SHIKSHAN PRASARAK MANDALS ASHOKRAO MANE GROUP OF INSTITUTIONS
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: PERSONAL INFORMATION & IDENTIFICATION */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                  2. Personal Information & Identification (वैयक्तिक माहिती)
                </h2>
                <p className="text-[11px] text-slate-500">Provide official identity details as per government Aadhaar card</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label htmlFor="salutation" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Salutation <span className="text-rose-500">*</span>
                </label>
                <select
                  id="salutation"
                  name="salutation"
                  required
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="Mr.">Mr. (श्री)</option>
                  <option value="Mrs.">Mrs. (सौ.)</option>
                  <option value="Ms.">Ms. (कु.)</option>
                  <option value="Dr.">Dr. (डॉ.)</option>
                  <option value="Prof.">Prof. (प्रा.)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="full_name" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name as per Aadhaar (पूर्ण नाव) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="First Middle Last Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="parent_spouse_name" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Father&apos;s / Husband&apos;s Full Name (वडील/पतीचे नाव)
                </label>
                <input
                  type="text"
                  id="parent_spouse_name"
                  name="parent_spouse_name"
                  value={parentSpouseName}
                  onChange={(e) => setParentSpouseName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Gender (लिंग) <span className="text-rose-500">*</span>
                </label>
                <select
                  id="gender"
                  name="gender"
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="Male">Male (पुरुष)</option>
                  <option value="Female">Female (स्त्री)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="dob" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Date of Birth (जन्म तारीख) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="marital_status" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Marital Status (वैवाहिक स्थिती)
                </label>
                <select
                  id="marital_status"
                  name="marital_status"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="Single">Unmarried / Single</option>
                  <option value="Married">Married</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="blood_group" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Blood Group (रक्तगट)
                </label>
                <select
                  id="blood_group"
                  name="blood_group"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="">-- Select --</option>
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="category" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reservation Category (प्रवर्ग) <span className="text-rose-500">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  {['OPEN', 'OBC', 'EWS', 'SC', 'ST', 'VJ/NT-A', 'NT-B', 'NT-C', 'NT-D', 'SBC'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="religion_caste" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Religion &amp; Caste / Sub-Caste (धर्म व जात)
                </label>
                <input
                  type="text"
                  id="religion_caste"
                  name="religion_caste"
                  value={religionCaste}
                  onChange={(e) => setReligionCaste(e.target.value)}
                  placeholder="e.g. Hindu - Maratha / Hindu - Mali"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Person with Disability (PwD)?
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <label htmlFor="pwd_no" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      id="pwd_no"
                      name="is_pwd"
                      value="No"
                      checked={isPwd === 'No'}
                      onChange={() => setIsPwd('No')}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    No
                  </label>
                  <label htmlFor="pwd_yes" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      id="pwd_yes"
                      name="is_pwd"
                      value="Yes"
                      checked={isPwd === 'Yes'}
                      onChange={() => setIsPwd('Yes')}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    Yes
                  </label>
                </div>
              </div>
            </div>

            {/* National IDs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label htmlFor="aadhaar_no" className="block text-xs font-bold text-slate-700 mb-1.5">
                  12-digit Aadhaar Number (आधार नंबर) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="aadhaar_no"
                  name="aadhaar_no"
                  pattern="[0-9]{12}"
                  maxLength={12}
                  required
                  value={aadhaarNo}
                  onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, ''))}
                  placeholder="12 digit Aadhaar number"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label htmlFor="pan_no" className="block text-xs font-bold text-slate-700 mb-1.5">
                  PAN Card Number (पॅन नंबर)
                </label>
                <input
                  type="text"
                  id="pan_no"
                  name="pan_no"
                  pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                  maxLength={10}
                  value={panNo}
                  onChange={(e) => setPanNo(e.target.value.toUpperCase())}
                  placeholder="E.G. ABCDE1234F"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 uppercase"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: CONTACT INFORMATION & RESIDENTIAL ADDRESS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                  3. Contact Information &amp; Residential Address (संपर्क व पत्ता)
                </h2>
                <p className="text-[11px] text-slate-500">Provide active mobile number for Front Desk lookup</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="mobile" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Primary Mobile Number (मोबाईल नंबर) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-xs font-bold">
                    +91
                  </div>
                  <input
                    type="tel"
                    id="mobile"
                    name="mobile"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
                  ★ Front Desk staff will look up your registration using this mobile number
                </span>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address (ईमेल आयडी) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label htmlFor="address_city" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Village / City (गाव / शहर) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="address_city"
                  name="address_city"
                  required
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="e.g. Kolhapur / Ambap"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="address_taluka" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Taluka (तालुका) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="address_taluka"
                  name="address_taluka"
                  required
                  value={addressTaluka}
                  onChange={(e) => setAddressTaluka(e.target.value)}
                  placeholder="e.g. Hatkanangale"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="address_district" className="block text-xs font-bold text-slate-700 mb-1.5">
                  District (जिल्हा) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="address_district"
                  name="address_district"
                  required
                  value={addressDistrict}
                  onChange={(e) => setAddressDistrict(e.target.value)}
                  placeholder="Kolhapur"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="pincode" className="block text-xs font-bold text-slate-700 mb-1.5">
                  PIN Code (पिन कोड) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="pincode"
                  name="pincode"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="416112"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: EDUCATIONAL QUALIFICATIONS (UPDATED CGPA + MARKS SCHEMA) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                  4. Educational Qualifications (शैक्षणिक पात्रता)
                </h2>
                <p className="text-[11px] text-slate-500">Add your degrees, passing years, CGPA/Marks, and Percentage</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider">
                  <tr>
                    <th className="p-2.5 border border-slate-200">Level</th>
                    <th className="p-2.5 border border-slate-200">Degree / Course</th>
                    <th className="p-2.5 border border-slate-200">Board / University</th>
                    <th className="p-2.5 border border-slate-200">Passing Year</th>
                    <th className="p-2.5 border border-slate-200">Evaluation System</th>
                    <th className="p-2.5 border border-slate-200">CGPA / Score / Marks</th>
                    <th className="p-2.5 border border-slate-200">Percentage %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {/* SSC */}
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 border border-slate-200 whitespace-nowrap">
                      SSC (10th)
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        name="edu_degree_ssc"
                        value="SSC"
                        readOnly
                        className="w-full px-2 py-1.5 bg-slate-100 border border-slate-300 rounded font-bold text-slate-700"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        name="edu_board_ssc"
                        placeholder="e.g. Maharashtra State Board"
                        value={eduSsc.board}
                        onChange={(e) => setEduSsc({ ...eduSsc, board: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="number"
                        name="edu_year_ssc"
                        placeholder="YYYY"
                        min="1970"
                        max="2026"
                        value={eduSsc.year}
                        onChange={(e) => setEduSsc({ ...eduSsc, year: e.target.value })}
                        className="w-20 px-2 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <select
                        name="edu_eval_ssc"
                        value={eduSsc.eval}
                        onChange={(e) => setEduSsc({ ...eduSsc, eval: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded font-bold"
                      >
                        <option value="Percentage">Percentage</option>
                        <option value="CGPA">CGPA / Grade</option>
                      </select>
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        name="edu_score_ssc"
                        placeholder="Obtained / Total"
                        value={eduSsc.score}
                        onChange={(e) => setEduSsc({ ...eduSsc, score: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="number"
                        step="0.01"
                        name="edu_percentage_ssc"
                        placeholder="74.5"
                        value={eduSsc.percentage}
                        onChange={(e) => setEduSsc({ ...eduSsc, percentage: e.target.value })}
                        className="w-20 px-2 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </td>
                  </tr>

                  {/* HSC */}
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 border border-slate-200 whitespace-nowrap">
                      HSC (12th) / Diploma
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        name="edu_degree_hsc"
                        placeholder="HSC / Diploma in..."
                        value={eduHsc.degree}
                        onChange={(e) => setEduHsc({ ...eduHsc, degree: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded font-medium"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        name="edu_board_hsc"
                        placeholder="e.g. MSBTE / State Board"
                        value={eduHsc.board}
                        onChange={(e) => setEduHsc({ ...eduHsc, board: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="number"
                        name="edu_year_hsc"
                        placeholder="YYYY"
                        min="1970"
                        max="2026"
                        value={eduHsc.year}
                        onChange={(e) => setEduHsc({ ...eduHsc, year: e.target.value })}
                        className="w-20 px-2 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <select
                        name="edu_eval_hsc"
                        value={eduHsc.eval}
                        onChange={(e) => setEduHsc({ ...eduHsc, eval: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded font-bold"
                      >
                        <option value="Percentage">Percentage</option>
                        <option value="CGPA">CGPA / Grade</option>
                      </select>
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        name="edu_score_hsc"
                        placeholder="Obtained / Total"
                        value={eduHsc.score}
                        onChange={(e) => setEduHsc({ ...eduHsc, score: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="number"
                        step="0.01"
                        name="edu_percentage_hsc"
                        placeholder="74.5"
                        value={eduHsc.percentage}
                        onChange={(e) => setEduHsc({ ...eduHsc, percentage: e.target.value })}
                        className="w-20 px-2 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </td>
                  </tr>

                  {/* UG */}
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 border border-slate-200 whitespace-nowrap">
                      Graduation / UG
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        name="edu_degree_ug"
                        placeholder="e.g. B.Tech / B.Sc / B.A."
                        value={eduUg.degree}
                        onChange={(e) => setEduUg({ ...eduUg, degree: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded font-medium"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        name="edu_board_ug"
                        placeholder="e.g. Shivaji University"
                        value={eduUg.board}
                        onChange={(e) => setEduUg({ ...eduUg, board: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="number"
                        name="edu_year_ug"
                        placeholder="YYYY"
                        min="1970"
                        max="2026"
                        value={eduUg.year}
                        onChange={(e) => setEduUg({ ...eduUg, year: e.target.value })}
                        className="w-20 px-2 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <select
                        name="edu_eval_ug"
                        value={eduUg.eval}
                        onChange={(e) => setEduUg({ ...eduUg, eval: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded font-bold"
                      >
                        <option value="CGPA">CGPA / Grade</option>
                        <option value="Percentage">Percentage</option>
                      </select>
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        name="edu_score_ug"
                        placeholder="e.g. 8.2 / 10.0"
                        value={eduUg.score}
                        onChange={(e) => setEduUg({ ...eduUg, score: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="number"
                        step="0.01"
                        name="edu_percentage_ug"
                        placeholder="78.0"
                        value={eduUg.percentage}
                        onChange={(e) => setEduUg({ ...eduUg, percentage: e.target.value })}
                        className="w-20 px-2 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </td>
                  </tr>

                  {/* PG */}
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 border border-slate-200 whitespace-nowrap">
                      Post-Graduation / PG
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        name="edu_degree_pg"
                        placeholder="e.g. M.Tech / M.Sc / MBA"
                        value={eduPg.degree}
                        onChange={(e) => setEduPg({ ...eduPg, degree: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded font-medium"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        name="edu_board_pg"
                        placeholder="e.g. Shivaji University"
                        value={eduPg.board}
                        onChange={(e) => setEduPg({ ...eduPg, board: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="number"
                        name="edu_year_pg"
                        placeholder="YYYY"
                        min="1970"
                        max="2026"
                        value={eduPg.year}
                        onChange={(e) => setEduPg({ ...eduPg, year: e.target.value })}
                        className="w-20 px-2 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <select
                        name="edu_eval_pg"
                        value={eduPg.eval}
                        onChange={(e) => setEduPg({ ...eduPg, eval: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded font-bold"
                      >
                        <option value="CGPA">CGPA / Grade</option>
                        <option value="Percentage">Percentage</option>
                      </select>
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="text"
                        name="edu_score_pg"
                        placeholder="e.g. 8.8 / 10.0"
                        value={eduPg.score}
                        onChange={(e) => setEduPg({ ...eduPg, score: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2 border border-slate-200">
                      <input
                        type="number"
                        step="0.01"
                        name="edu_percentage_pg"
                        placeholder="83.5"
                        value={eduPg.percentage}
                        onChange={(e) => setEduPg({ ...eduPg, percentage: e.target.value })}
                        className="w-20 px-2 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 5: WORK EXPERIENCE & UPLOADS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                  5. Professional Experience &amp; Document Uploads (अनुभव व कागदपत्रे)
                </h2>
                <p className="text-[11px] text-slate-500">Provide work history if applicable</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  id="is_fresher"
                  name="is_fresher"
                  value="Yes"
                  checked={isFresher}
                  onChange={(e) => setIsFresher(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <strong>I am a Fresher (No prior teaching / industrial work experience)</strong>
              </label>

              {/* Dynamic Experience Fields */}
              {!isFresher && (
                <div id="experience_details_container" className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in">
                  <div>
                    <label htmlFor="total_exp_years" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Total Experience (Teaching / Industry)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        id="total_exp_years"
                        name="total_exp_years"
                        placeholder="Years"
                        min="0"
                        max="50"
                        value={totalExpYears}
                        onChange={(e) => setTotalExpYears(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                      />
                      <input
                        type="number"
                        id="total_exp_months"
                        name="total_exp_months"
                        placeholder="Months"
                        min="0"
                        max="11"
                        value={totalExpMonths}
                        onChange={(e) => setTotalExpMonths(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="last_organization" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Current / Last Institute or Organization Name
                    </label>
                    <input
                      type="text"
                      id="last_organization"
                      name="last_organization"
                      placeholder="Name of Institute / Company"
                      value={lastOrganization}
                      onChange={(e) => setLastOrganization(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label htmlFor="last_designation" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Designation Held
                    </label>
                    <input
                      type="text"
                      id="last_designation"
                      name="last_designation"
                      placeholder="e.g. Assistant Professor / Accountant"
                      value={lastDesignation}
                      onChange={(e) => setLastDesignation(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label htmlFor="last_salary" className="block text-xs font-bold text-slate-700 mb-1.5">
                      Last Drawn Gross Monthly Salary (₹)
                    </label>
                    <input
                      type="number"
                      id="last_salary"
                      name="last_salary"
                      placeholder="Monthly Gross Amount"
                      value={lastSalary}
                      onChange={(e) => setLastSalary(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              )}

              <hr className="border-slate-200" />

              {/* Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="photo" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Candidate Photo (छायाचित्र) - Optional
                  </label>
                  <input
                    type="file"
                    id="photo"
                    name="photo"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                  />
                  {photoPreview && (
                    <div className="mt-2 w-16 h-16 rounded-xl overflow-hidden border border-slate-300 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="resume" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Resume / CV (बायोडाटा) - Optional
                  </label>
                  <input
                    type="file"
                    id="resume"
                    name="resume"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                  />
                </div>
              </div>

              {/* Declaration & Signature */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 pt-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="declaration"
                    required
                    checked={declaration}
                    onChange={(e) => setDeclaration(e.target.checked)}
                    className="mt-1 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    I hereby declare that all information furnished in this pre-registration form is true, complete, and accurate to the best of my knowledge. I understand that my pre-registration will be finalized upon physical document verification and payment of the application fee at the Central HR Front Desk.
                  </span>
                </label>

                <div className="pt-2">
                  <label htmlFor="digital_signature" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Digital Signature (Type Full Name as Signature) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="digital_signature"
                    name="digital_signature"
                    required
                    value={digitalSignature}
                    onChange={(e) => setDigitalSignature(e.target.value)}
                    placeholder={fullName ? `${salutation} ${fullName}` : 'Enter your full name'}
                    className="w-full max-w-md px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SUBMIT ACTION */}
          <div className="form-actions bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600">
              Application Fee: <strong className="text-emerald-700 text-sm font-mono font-bold">₹50</strong>{' '}
              <span className="text-slate-500">(Payable upon arrival at Front Desk)</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-submit w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting Pre-Registration...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  Submit Online Pre-Registration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OnlinePreRegistrationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-pulse text-sm font-bold text-slate-600">
            Loading Pre-Registration Portal...
          </div>
        </div>
      }
    >
      <OnlinePreRegistrationContent />
    </Suspense>
  );
}
