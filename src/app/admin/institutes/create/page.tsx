'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { InstituteApproval, InstituteCourse } from '@/types/database';
import { RoleGuard } from '@/components/RoleGuard';
import {
  Building2,
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  User,
  FileText,
  Lock,
  Sparkles
} from 'lucide-react';

const defaultInstituteTypes = [
  'Engineering College',
  'Engineering & MBA College',
  'Pharmacy College',
  'Polytechnic / Diploma',
  'Management & Computer Institute (MBA/MCA)',
  'Senior Arts, Commerce & Science College',
  'Junior College',
  'B.Ed / D.Ed College',
  'Industrial Training Institute (ITI)',
  'English Medium School (CBSE / State)',
  'Marathi Medium School',
  'Other Educational Unit'
];

const approvalBodyOptions = [
  'AICTE (All India Council for Technical Education)',
  'UGC (University Grants Commission)',
  'State DTE (Directorate of Technical Education, Maharashtra)',
  'PCI (Pharmacy Council of India)',
  'NCTE (National Council for Teacher Education)',
  'MSBTE (Maharashtra State Board of Technical Education)',
  'Affiliating University (e.g. Shivaji University / DBATU / SPPU)',
  'State Secondary & Higher Secondary Education Board',
  'CBSE (Central Board of Secondary Education)',
  'Other Apex / Regulatory Authority'
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
  'Industrial Training Institute (ITI / Vocational)',
  'Arts, Commerce & Science (General Degree)',
  'Junior College / Higher Secondary',
  'School Education (CBSE / State)',
  'Other'
];

const courseLevelOptions = [
  'Diploma',
  'UG (Bachelor Degree)',
  'PG (Master Degree)',
  'Doctorate (Ph.D.)',
  'Junior College (11th-12th)',
  'Secondary School (1st-10th)',
  'ITI Certificate',
  'Other'
];

export default function CreateInstitutePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // SECTION 1: Basic Identity
  const [officialName, setOfficialName] = useState('');
  const [shortName, setShortName] = useState('');
  const [instituteType, setInstituteType] = useState(defaultInstituteTypes[0]);
  const [customType, setCustomType] = useState('');
  const [instituteCode, setInstituteCode] = useState('');
  const [establishmentYear, setEstablishmentYear] = useState<string>('');

  // SECTION 2: Multi-Body Approvals
  const [approvals, setApprovals] = useState<InstituteApproval[]>([
    { body_name: approvalBodyOptions[0], reference_no: '', approval_date: '', valid_upto_date: '', letter_file: undefined }
  ]);

  // SECTION 3: Postal Address & Contacts
  const [addressLine, setAddressLine] = useState('');
  const [taluka, setTaluka] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [website, setWebsite] = useState('');

  // SECTION 4: Head of Institute & Login
  const [headName, setHeadName] = useState('');
  const [headDesignation, setHeadDesignation] = useState('Principal');
  const [headMobile, setHeadMobile] = useState('');
  const [headEmail, setHeadEmail] = useState('');

  // Optional Second Contact Person
  const [secondContactName, setSecondContactName] = useState('');
  const [secondContactDesignation, setSecondContactDesignation] = useState('Registrar / Office Superintendent');
  const [secondContactMobile, setSecondContactMobile] = useState('');
  const [secondContactEmail, setSecondContactEmail] = useState('');

  // SECTION 5: Courses & Programmes Run
  const [courses, setCourses] = useState<InstituteCourse[]>([
    { program_stream: 'Engineering & Technology', course_name: '', level: 'UG (Bachelor Degree)', duration_years: '4 Years', sanctioned_intake: 60, approving_authority: '', is_active: true }
  ]);

  // Approval row helpers
  const addApprovalRow = () => {
    setApprovals([...approvals, { body_name: approvalBodyOptions[0], reference_no: '', approval_date: '', valid_upto_date: '' }]);
  };
  const removeApprovalRow = (idx: number) => {
    setApprovals(approvals.filter((_, i) => i !== idx));
  };

  // Course row helpers
  const addCourseRow = () => {
    setCourses([...courses, { program_stream: 'Engineering & Technology', course_name: '', level: 'UG (Bachelor Degree)', duration_years: '4 Years', sanctioned_intake: 60, approving_authority: '', is_active: true }]);
  };
  const removeCourseRow = (idx: number) => {
    setCourses(courses.filter((_, i) => i !== idx));
  };

  // Helper to upload letter to private storage bucket
  const uploadDoc = async (file: File, prefix: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('institute-documents').upload(fileName, file);
    if (error) {
      console.warn('Storage upload note:', error.message);
      return '';
    }
    const { data: publicData } = supabase.storage.from('institute-documents').getPublicUrl(fileName);
    return publicData?.publicUrl || fileName;
  };

  const handleSaveInstitute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!officialName.trim()) {
      alert('Please enter the Official Name of the Institute.');
      return;
    }
    if (!officialEmail.trim()) {
      alert('Please enter the Official Email Address of the Institute.');
      return;
    }
    if (pincode && !/^\d{6}$/.test(pincode.trim())) {
      alert('PIN Code must be a 6-digit number.');
      return;
    }
    if (headMobile && !/^\d{10}$/.test(headMobile.trim())) {
      alert('Head mobile number must be 10 digits.');
      return;
    }

    setSaving(true);

    try {
      const finalType = instituteType === 'Other' ? (customType.trim() || 'Other Educational Unit') : instituteType;

      // 1. Insert Institute Record
      const { data: newInst, error: instError } = await supabase
        .from('institutes')
        .insert({
          name: officialName.trim(), // legacy sync
          official_name: officialName.trim(),
          short_name: shortName.trim() || officialName.trim(),
          institute_type: finalType,
          code: instituteCode.trim() || null,
          establishment_year: establishmentYear ? parseInt(establishmentYear) : null,
          address_line: addressLine.trim(),
          address: `${addressLine.trim()}, ${taluka.trim()}, ${district.trim()} - ${pincode.trim()}`, // legacy sync
          taluka: taluka.trim(),
          district: district.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          office_phone: officePhone.trim() || null,
          official_email: officialEmail.trim(),
          website: website.trim() || null,
          head_name: headName.trim(),
          head_designation: headDesignation.trim(),
          head_mobile: headMobile.trim(),
          head_phone: headMobile.trim(), // legacy sync
          head_email: headEmail.trim() || null,
          second_contact_name: secondContactName.trim() || null,
          second_contact_designation: secondContactDesignation.trim() || null,
          second_contact_mobile: secondContactMobile.trim() || null,
          second_contact_email: secondContactEmail.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (instError) throw instError;
      const instituteId = newInst.id;

      // 2. Insert Approvals
      for (const app of approvals) {
        if (app.body_name.trim()) {
          let letterUrl = '';
          if (app.letter_file) {
            letterUrl = await uploadDoc(app.letter_file, 'approval');
          }
          await supabase.from('institute_approvals').insert({
            institute_id: instituteId,
            body_name: app.body_name.trim(),
            reference_no: app.reference_no?.trim() || null,
            approval_date: app.approval_date || null,
            valid_upto_date: app.valid_upto_date || null,
            letter_doc_url: letterUrl || null,
          });
        }
      }

      // 3. Insert Courses
      for (const crs of courses) {
        if (crs.course_name.trim()) {
          await supabase.from('institute_courses').insert({
            institute_id: instituteId,
            program_stream: crs.program_stream || 'Engineering & Technology',
            course_name: crs.course_name.trim(),
            level: crs.level,
            duration_years: crs.duration_years || '4 Years',
            sanctioned_intake: crs.sanctioned_intake ? parseInt(String(crs.sanctioned_intake)) : null,
            approving_authority: crs.approving_authority?.trim() || null,
            is_active: true,
          });
        }
      }

      // Staff accounts are provisioned separately through Supabase Auth.

      router.push('/admin/institutes');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving institute');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard
      allowedRoles={['admin_head_hr']}
      title="Head Central HR Access Required"
      description="Only Head Central HR Administrators have permission to register new Institutes or Colleges under the Trust."
    >
      <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/institutes"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-700" /> Add New Institute / College
              </h1>
              <p className="text-[11px] text-slate-500">
                Configure official approved name, regulatory recognitions, postal contacts, principal & courses
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Form */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSaveInstitute} className="space-y-8">
          {/* SECTION 1: Basic Identity */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Official Institute Identity & Classification</h3>
                <p className="text-xs text-slate-500">Official name as approved by apex body (used on appointment orders)</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                * Official Full Name of Institute (Exact Approved Spelling)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Nanasaheb Mahadik College of Engineering, Peth"
                value={officialName}
                onChange={(e) => setOfficialName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Short Name / Common Name (For Dropdowns & Badges)
                </label>
                <input
                  type="text"
                  placeholder="e.g. NMCE Peth"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Type of Institute
                </label>
                <select
                  value={instituteType}
                  onChange={(e) => setInstituteType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  {defaultInstituteTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="Other">➕ Other Custom Type</option>
                </select>
              </div>
            </div>

            {instituteType === 'Other' && (
              <div>
                <label className="block text-xs font-bold text-sky-900 mb-1">
                  * Type Custom Institute Category
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Education Research Centre"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="w-full px-4 py-2 border border-sky-300 rounded-xl text-xs bg-sky-50 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Institute Code (DTE / U-DISE / College Code)
                </label>
                <input
                  type="text"
                  placeholder="e.g. EN-6284 / U-DISE 27280..."
                  value={instituteCode}
                  onChange={(e) => setInstituteCode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Year of Establishment
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2008"
                  value={establishmentYear}
                  onChange={(e) => setEstablishmentYear(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Multi-Body Approvals */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Regulatory Approvals & Affiliations</h3>
                  <p className="text-xs text-slate-500">AICTE, UGC, DTE, PCI, NCTE, MSBTE, University & Board Recognitions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={addApprovalRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Approving Body
              </button>
            </div>

            <div className="space-y-3">
              {approvals.map((app, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-3">
                  {approvals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeApprovalRow(idx)}
                      className="absolute top-3 right-3 text-rose-500 hover:text-rose-700 p-1 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Approving Body #{idx + 1}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        * Body / Authority Name
                      </label>
                      <select
                        value={app.body_name}
                        onChange={(e) => {
                          const updated = [...approvals];
                          updated[idx].body_name = e.target.value;
                          setApprovals(updated);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500"
                      >
                        {approvalBodyOptions.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Approval / Recognition Reference No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. F.No. Western/1-36.../2026/EOA"
                        value={app.reference_no}
                        onChange={(e) => {
                          const updated = [...approvals];
                          updated[idx].reference_no = e.target.value;
                          setApprovals(updated);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-mono focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Approval Letter Date
                      </label>
                      <input
                        type="date"
                        value={app.approval_date}
                        onChange={(e) => {
                          const updated = [...approvals];
                          updated[idx].approval_date = e.target.value;
                          setApprovals(updated);
                        }}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Valid Upto Date
                      </label>
                      <input
                        type="date"
                        value={app.valid_upto_date}
                        onChange={(e) => {
                          const updated = [...approvals];
                          updated[idx].valid_upto_date = e.target.value;
                          setApprovals(updated);
                        }}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Upload Approval PDF Letter
                      </label>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const updated = [...approvals];
                          updated[idx].letter_file = e.target.files?.[0] || undefined;
                          setApprovals(updated);
                        }}
                        className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 hover:file:bg-slate-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: Address & Contacts */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Postal Address & Official Contact Details</h3>
                <p className="text-xs text-slate-500">Official college campus address and communication details</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                * Campus Postal Address Line (Plot / Gat No., Road)
              </label>
              <textarea
                rows={2}
                required
                placeholder="A/p. Peth, Near Toll Plaza, NH-4, Tal. Walwa"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-2xl text-xs bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Taluka
                </label>
                <input
                  type="text"
                  placeholder="Walwa / Hatkanangale"
                  value={taluka}
                  onChange={(e) => setTaluka(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  District
                </label>
                <input
                  type="text"
                  placeholder="Kolhapur / Sangli"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * PIN Code (6 Digits)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="415409"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Official Institute Email ID
                </label>
                <input
                  type="email"
                  required
                  placeholder="principal@college.org"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Office Landline / Phone
                </label>
                <input
                  type="tel"
                  placeholder="02342-252100"
                  value={officePhone}
                  onChange={(e) => setOfficePhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Official Website
                </label>
                <input
                  type="url"
                  placeholder="https://www.college.org"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Head of Institute & Login Account */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Head of Institute & Login Credentials</h3>
                <p className="text-xs text-slate-500">Principal / Director details for appointment orders, interview routing & login</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Head of Institute Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. A. B. Patil"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Designation
                </label>
                <input
                  type="text"
                  required
                  placeholder="Principal / Director / Headmaster"
                  value={headDesignation}
                  onChange={(e) => setHeadDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Mobile Number (10 Digits)
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  value={headMobile}
                  onChange={(e) => setHeadMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono bg-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Official Email ID (Used for Login)
                </label>
                <input
                  type="email"
                  required
                  placeholder="head.nmce@sbmsmspm.org"
                  value={headEmail}
                  onChange={(e) => setHeadEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Optional Second Contact Person */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Optional Secondary Contact (Registrar / Office Superintendent)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Contact Person Name"
                  value={secondContactName}
                  onChange={(e) => setSecondContactName(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
                <input
                  type="text"
                  placeholder="Designation"
                  value={secondContactDesignation}
                  onChange={(e) => setSecondContactDesignation(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Mobile (10 digits)"
                  value={secondContactMobile}
                  onChange={(e) => setSecondContactMobile(e.target.value.replace(/\D/g, ''))}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-mono"
                />
                <input
                  type="email"
                  placeholder="Email ID"
                  value={secondContactEmail}
                  onChange={(e) => setSecondContactEmail(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Courses & Programmes Run */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                  5
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Courses & Programmes Run by Institute</h3>
                  <p className="text-xs text-slate-500">Degree, Diploma, PG, School programmes and sanctioned student intakes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={addCourseRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-xl hover:bg-sky-100 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Course
              </button>
            </div>

            <div className="space-y-3">
              {courses.map((crs, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-3">
                  {courses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCourseRow(idx)}
                      className="absolute top-3 right-3 text-rose-500 hover:text-rose-700 p-1 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Course / Branch #{idx + 1}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        * Program Discipline / Stream
                      </label>
                      <select
                        value={crs.program_stream || 'Engineering & Technology'}
                        onChange={(e) => {
                          const updated = [...courses];
                          updated[idx].program_stream = e.target.value;
                          setCourses(updated);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-sky-500"
                      >
                        {programStreamOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        * Course / Branch Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. B.Tech Computer Science & Engineering"
                        value={crs.course_name}
                        onChange={(e) => {
                          const updated = [...courses];
                          updated[idx].course_name = e.target.value;
                          setCourses(updated);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-semibold focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Level
                      </label>
                      <select
                        value={crs.level}
                        onChange={(e) => {
                          const updated = [...courses];
                          updated[idx].level = e.target.value;
                          setCourses(updated);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500"
                      >
                        {courseLevelOptions.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Sanctioned Intake
                      </label>
                      <input
                        type="number"
                        placeholder="60"
                        value={crs.sanctioned_intake || ''}
                        onChange={(e) => {
                          const updated = [...courses];
                          updated[idx].sanctioned_intake = parseInt(e.target.value) || 0;
                          setCourses(updated);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-mono focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/admin/institutes"
              className="px-5 py-3 border border-slate-300 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 bg-sky-700 hover:bg-sky-800 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving Institute...' : 'Save & Register Institute'} <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </form>
      </main>
    </div>
    </RoleGuard>
  );
}
