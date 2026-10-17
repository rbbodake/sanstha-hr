'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Institute, InstituteApproval, InstituteCourse } from '@/types/database';
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
  History,
  Lock,
  Save,
  ExternalLink
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

interface EditInstitutePageProps {
  params: Promise<{ id: string }>;
}

export default function EditInstitutePage({ params }: EditInstitutePageProps) {
  const resolvedParams = use(params);
  const instituteId = resolvedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Original Institute for Change Tracking
  const [originalHeadName, setOriginalHeadName] = useState('');
  const [originalHeadDesignation, setOriginalHeadDesignation] = useState('');

  // SECTION 1: Basic Identity
  const [officialName, setOfficialName] = useState('');
  const [shortName, setShortName] = useState('');
  const [instituteType, setInstituteType] = useState(defaultInstituteTypes[0]);
  const [customType, setCustomType] = useState('');
  const [instituteCode, setInstituteCode] = useState('');
  const [establishmentYear, setEstablishmentYear] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  // SECTION 2: Multi-Body Approvals
  const [approvals, setApprovals] = useState<InstituteApproval[]>([]);

  // SECTION 3: Postal Address & Contacts
  const [addressLine, setAddressLine] = useState('');
  const [taluka, setTaluka] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [website, setWebsite] = useState('');

  // SECTION 4: Head of Institute
  const [headName, setHeadName] = useState('');
  const [headDesignation, setHeadDesignation] = useState('Principal');
  const [headMobile, setHeadMobile] = useState('');
  const [headEmail, setHeadEmail] = useState('');
  const [tenureRemarks, setTenureRemarks] = useState('');

  // Optional Second Contact Person
  const [secondContactName, setSecondContactName] = useState('');
  const [secondContactDesignation, setSecondContactDesignation] = useState('Registrar / Office Superintendent');
  const [secondContactMobile, setSecondContactMobile] = useState('');
  const [secondContactEmail, setSecondContactEmail] = useState('');

  // SECTION 5: Courses & Programmes Run
  const [courses, setCourses] = useState<InstituteCourse[]>([]);

  useEffect(() => {
    async function loadInstituteData() {
      setLoading(true);
      try {
        const { data: inst, error: instErr } = await supabase
          .from('institutes')
          .select('*')
          .eq('id', instituteId)
          .single();

        if (instErr) throw instErr;
        if (inst) {
          setOfficialName(inst.official_name || inst.name || '');
          setShortName(inst.short_name || '');
          if (defaultInstituteTypes.includes(inst.institute_type || '')) {
            setInstituteType(inst.institute_type || defaultInstituteTypes[0]);
          } else if (inst.institute_type) {
            setInstituteType('Other');
            setCustomType(inst.institute_type);
          }
          setInstituteCode(inst.code || '');
          setEstablishmentYear(inst.establishment_year ? String(inst.establishment_year) : '');
          setIsActive(inst.is_active ?? true);

          setAddressLine(inst.address_line || inst.address || '');
          setTaluka(inst.taluka || '');
          setDistrict(inst.district || '');
          setState(inst.state || 'Maharashtra');
          setPincode(inst.pincode || '');
          setOfficePhone(inst.office_phone || '');
          setOfficialEmail(inst.official_email || '');
          setWebsite(inst.website || '');

          setHeadName(inst.head_name || '');
          setHeadDesignation(inst.head_designation || 'Principal');
          setHeadMobile(inst.head_mobile || inst.head_phone || '');
          setHeadEmail(inst.head_email || '');
          setOriginalHeadName(inst.head_name || '');
          setOriginalHeadDesignation(inst.head_designation || 'Principal');

          setSecondContactName(inst.second_contact_name || '');
          setSecondContactDesignation(inst.second_contact_designation || 'Registrar / Office Superintendent');
          setSecondContactMobile(inst.second_contact_mobile || '');
          setSecondContactEmail(inst.second_contact_email || '');
        }

        // Fetch Approvals
        const { data: appData } = await supabase
          .from('institute_approvals')
          .select('*')
          .eq('institute_id', instituteId)
          .order('created_at', { ascending: true });

        if (appData && appData.length > 0) {
          setApprovals(appData);
        } else {
          setApprovals([{ body_name: approvalBodyOptions[0], reference_no: '', approval_date: '', valid_upto_date: '' }]);
        }

        // Fetch Courses
        const { data: crsData } = await supabase
          .from('institute_courses')
          .select('*')
          .eq('institute_id', instituteId)
          .order('created_at', { ascending: true });

        if (crsData && crsData.length > 0) {
          setCourses(crsData);
        } else {
          setCourses([{ course_name: '', level: 'UG', duration_years: '4 Years', sanctioned_intake: 60, approving_authority: '', is_active: true }]);
        }
      } catch (err: any) {
        console.error('Error fetching institute:', err);
        setErrorMsg(err.message || 'Could not load institute details.');
      } finally {
        setLoading(false);
      }
    }

    loadInstituteData();
  }, [instituteId]);

  // Approval row helpers
  const addApprovalRow = () => {
    setApprovals([...approvals, { body_name: approvalBodyOptions[0], reference_no: '', approval_date: '', valid_upto_date: '' }]);
  };
  const removeApprovalRow = (idx: number) => {
    setApprovals(approvals.filter((_, i) => i !== idx));
  };

  // Course row helpers
  const addCourseRow = () => {
    setCourses([...courses, { program_stream: 'Engineering & Technology', course_name: '', level: 'UG', duration_years: '4 Years', sanctioned_intake: 60, approving_authority: '', is_active: true }]);
  };
  const removeCourseRow = (idx: number) => {
    setCourses(courses.filter((_, i) => i !== idx));
  };

  // Helper to upload letter
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

  const handleUpdateInstitute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

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

      // 1. Check if Principal / Head changed -> Record in Audit History
      if (originalHeadName && originalHeadName.trim() !== headName.trim()) {
        await supabase.from('institute_head_history').insert({
          institute_id: instituteId,
          head_name: originalHeadName.trim(),
          designation: originalHeadDesignation || 'Principal',
          to_date: new Date().toISOString().split('T')[0],
          reason_for_change: tenureRemarks.trim() || 'Head changed via Institute Master edit',
        });
      }

      // 2. Update Institute Record
      const { error: instError } = await supabase
        .from('institutes')
        .update({
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
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instituteId);

      if (instError) throw instError;

      // 3. Sync Approvals (delete old, insert updated)
      await supabase.from('institute_approvals').delete().eq('institute_id', instituteId);

      for (const app of approvals) {
        if (app.body_name.trim()) {
          let letterUrl = app.letter_doc_url || '';
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

      // 4. Sync Courses (delete old, insert updated)
      await supabase.from('institute_courses').delete().eq('institute_id', instituteId);

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
            is_active: crs.is_active ?? true,
          });
        }
      }

      // 5. Update user profile if head email exists
      if (headEmail.trim()) {
        try {
          await supabase.from('user_profiles').upsert({
            email: headEmail.trim().toLowerCase(),
            full_name: `${headName.trim()} (${headDesignation})`,
            role: 'institute_head',
            linked_institute_id: instituteId,
            is_active: isActive,
          }, { onConflict: 'email' });
        } catch (authErr) {
          console.warn('Head profile update note:', authErr);
        }
      }

      setSuccessMsg('Institute details updated successfully!');
      setTimeout(() => {
        router.push(`/admin/institutes/${instituteId}`);
      }, 1000);

    } catch (err: any) {
      console.error('Save error:', err);
      setErrorMsg(err.message || 'Failed to update institute.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Loading institute information...</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard
      allowedRoles={['admin_head_hr']}
      title="Head Central HR Access Required"
      description="Only Head Central HR Administrators have permission to edit Institute profiles, change Principal assignments, or manage regulatory approvals."
    >
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/institutes/${instituteId}`}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              title="Back to Institute Profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-600" />
                <h1 className="text-lg font-bold text-slate-900">Edit Institute / College</h1>
              </div>
              <p className="text-xs text-slate-500">
                Updating: <span className="font-semibold text-slate-700">{officialName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/institutes"
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </Link>
            <button
              onClick={handleUpdateInstitute}
              disabled={saving}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdateInstitute} className="space-y-8">

          {/* SECTION 1: Basic Identity & Classification */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-base">
                  1
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Basic Identity & Unit Classification</h2>
                  <p className="text-xs text-slate-500">Official name, short abbreviation, category, DTE/AISHE code and establishment year</p>
                </div>
              </div>

              {/* Active / Inactive Status Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Unit Status:</span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                    isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700 border border-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-slate-500'}`} />
                  {isActive ? 'Active Unit' : 'Archived / Inactive'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Official Full Name of Institute / College / School
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sanstha College of Engineering & Technology, Kolhapur"
                  value={officialName}
                  onChange={(e) => setOfficialName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Short Name / Acronym / Abbreviation
                </label>
                <input
                  type="text"
                  placeholder="e.g. SCET / SIT / SPoly"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Institute Category / Type
                </label>
                <select
                  value={instituteType}
                  onChange={(e) => setInstituteType(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                >
                  {defaultInstituteTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="Other">➕ Other / Custom Category</option>
                </select>
              </div>

              {instituteType === 'Other' && (
                <div className="md:col-span-2 p-4 bg-sky-50 rounded-2xl border border-sky-200">
                  <label className="block text-xs font-bold text-sky-900 mb-1">
                    * Specify Custom Institute Type
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Research Institute / Language Academy"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="w-full px-4 py-2.5 border border-sky-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Institute Code / DTE Code / AISHE Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. EN-6284 / C-45210"
                  value={instituteCode}
                  onChange={(e) => setInstituteCode(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Establishment Year
                </label>
                <input
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  placeholder="e.g. 2008"
                  value={establishmentYear}
                  onChange={(e) => setEstablishmentYear(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Multi-Body Approvals & Affiliations */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                  2
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Apex Approvals & Affiliations</h2>
                  <p className="text-xs text-slate-500">AICTE, UGC, DTE, PCI, NCTE, MSBTE, Affiliating University recognition details</p>
                </div>
              </div>

              <button
                type="button"
                onClick={addApprovalRow}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Approval Body
              </button>
            </div>

            <div className="space-y-4">
              {approvals.map((app, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Approving / Affiliating Body
                    </label>
                    <select
                      value={app.body_name}
                      onChange={(e) => {
                        const updated = [...approvals];
                        updated[idx].body_name = e.target.value;
                        setApprovals(updated);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {approvalBodyOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Reference / Approval Order No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. F.No. Western/1-3329/2023"
                      value={app.reference_no || ''}
                      onChange={(e) => {
                        const updated = [...approvals];
                        updated[idx].reference_no = e.target.value;
                        setApprovals(updated);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Approval Date
                    </label>
                    <input
                      type="date"
                      value={app.approval_date || ''}
                      onChange={(e) => {
                        const updated = [...approvals];
                        updated[idx].approval_date = e.target.value;
                        setApprovals(updated);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Valid Up To
                    </label>
                    <input
                      type="date"
                      value={app.valid_upto_date || ''}
                      onChange={(e) => {
                        const updated = [...approvals];
                        updated[idx].valid_upto_date = e.target.value;
                        setApprovals(updated);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-1 flex items-center justify-end">
                    {approvals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeApprovalRow(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                        title="Remove Approval"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Letter upload / link */}
                  <div className="md:col-span-12 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-semibold flex items-center gap-1 transition">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>{app.letter_file ? app.letter_file.name : (app.letter_doc_url ? 'Replace Approval Letter PDF' : 'Upload Approval Letter PDF')}</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const updated = [...approvals];
                              updated[idx].letter_file = file;
                              setApprovals(updated);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {app.letter_doc_url && !app.letter_file && (
                      <a
                        href={app.letter_doc_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Existing Uploaded Letter
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: Address & Official Contact */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                3
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Postal Address & Official Contacts</h2>
                <p className="text-xs text-slate-500">Campus location details, official email and phone for communication</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Address Line (Street / Campus / Landmark)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gat No. 242, Ambap Campus, Kolhapur-Sangli Highway"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Taluka / Tehsil
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hatkanangle / Karveer"
                  value={taluka}
                  onChange={(e) => setTaluka(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * District
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kolhapur / Sangli / Pune"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * PIN Code (6-Digit)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="e.g. 416112"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Official Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. principal@scet.ac.in"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Office Landline / Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0230-2475100"
                  value={officePhone}
                  onChange={(e) => setOfficePhone(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Official Website
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://www.scet.ac.in"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Head of Institute & Second Contact */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-base">
                4
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Head of Institute & Key Personnel</h2>
                <p className="text-xs text-slate-500">Principal / Director / Head Master details (changes will be logged in tenure history)</p>
              </div>
            </div>

            {/* Principal / Director Section */}
            <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-600" />
                  Primary Head (Principal / Director / Head Master)
                </span>
                {originalHeadName && (
                  <span className="text-[11px] text-amber-700 font-medium">
                    Current on record: <strong className="text-slate-800">{originalHeadName}</strong>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    * Full Name of Head
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ramesh S. Patil"
                    value={headName}
                    onChange={(e) => setHeadName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Designation
                  </label>
                  <select
                    value={headDesignation}
                    onChange={(e) => setHeadDesignation(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Principal">Principal</option>
                    <option value="Director">Director</option>
                    <option value="Head Master / Head Mistress">Head Master / Head Mistress</option>
                    <option value="I/C Principal">I/C Principal</option>
                    <option value="Dean">Dean</option>
                    <option value="Campus Director">Campus Director</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    * Mobile Number (10-Digit)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="e.g. 9822012345"
                    value={headMobile}
                    onChange={(e) => setHeadMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    * Email Address (Used for Portal Login)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. principal.scet@gmail.com"
                    value={headEmail}
                    onChange={(e) => setHeadEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Audit trail remark if name changed */}
                {originalHeadName && originalHeadName.trim() !== headName.trim() && (
                  <div className="md:col-span-2 p-3 bg-amber-100 rounded-xl border border-amber-300">
                    <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      Notice: Principal Name Changed. Enter Tenure Change Reason / Remark:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Ramesh Patil transferred/retired. New Principal Dr. Suresh Kadam appointed."
                      value={tenureRemarks}
                      onChange={(e) => setTenureRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-amber-400 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Optional Second Contact Person */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-500" />
                Secondary Contact (Registrar / Office Superintendent - Optional)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Shri. A. K. Jadhav"
                    value={secondContactName}
                    onChange={(e) => setSecondContactName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Registrar / Office Superintendent"
                    value={secondContactDesignation}
                    onChange={(e) => setSecondContactDesignation(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9423012345"
                    value={secondContactMobile}
                    onChange={(e) => setSecondContactMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. registrar@scet.ac.in"
                    value={secondContactEmail}
                    onChange={(e) => setSecondContactEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: Courses & Programmes Run */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
                  5
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Academic Programmes & Sanctioned Intake</h2>
                  <p className="text-xs text-slate-500">Degree, Diploma or certificate courses offered at this unit</p>
                </div>
              </div>

              <button
                type="button"
                onClick={addCourseRow}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Course / Programme
              </button>
            </div>

            <div className="space-y-4">
              {courses.map((crs, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Course / Programme #{idx + 1}
                    </span>
                    {courses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCourseRow(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-lg transition"
                        title="Remove Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-4">
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
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-purple-500"
                      >
                        {programStreamOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-4">
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
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Level
                      </label>
                      <select
                        value={crs.level}
                        onChange={(e) => {
                          const updated = [...courses];
                          updated[idx].level = e.target.value as any;
                          setCourses(updated);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-purple-500"
                      >
                        {courseLevelOptions.map((lvl) => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
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
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono bg-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between pt-4">
            <Link
              href={`/admin/institutes/${instituteId}`}
              className="px-5 py-3 rounded-2xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition shadow-sm"
            >
              Cancel & Discard
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving Institute Changes...' : 'Save & Update Institute'}
            </button>
          </div>
        </form>
      </main>
    </div>
    </RoleGuard>
  );
}
