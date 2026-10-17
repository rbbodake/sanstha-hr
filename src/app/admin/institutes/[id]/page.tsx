'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Institute,
  InstituteApproval,
  InstituteCourse,
  InstituteHeadHistory,
  OrganizationSettings,
  Post,
  InstituteStaffStrength
} from '@/types/database';
import {
  fetchStaffStrength,
  saveStaffStrength,
  deleteStaffStrength,
  calculateStaffVariance
} from '@/lib/staffStrengthService';
import {
  Building2,
  ArrowLeft,
  Edit3,
  Printer,
  MapPin,
  Phone,
  Mail,
  Globe,
  User,
  ShieldCheck,
  GraduationCap,
  Calendar,
  History,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Award,
  Scale,
  TrendingDown,
  TrendingUp,
  Plus,
  Search,
  Trash2,
  Users,
  Sparkles,
  X,
  Check
} from 'lucide-react';

interface InstituteDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function InstituteDetailPage({ params }: InstituteDetailPageProps) {
  const resolvedParams = use(params);
  const instituteId = resolvedParams.id;
  const router = useRouter();

  const [institute, setInstitute] = useState<Institute | null>(null);
  const [approvals, setApprovals] = useState<InstituteApproval[]>([]);
  const [courses, setCourses] = useState<InstituteCourse[]>([]);
  const [headHistory, setHeadHistory] = useState<InstituteHeadHistory[]>([]);
  const [staffStrengths, setStaffStrengths] = useState<InstituteStaffStrength[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeStrengthTab, setActiveStrengthTab] = useState<'all' | 'teaching' | 'non_teaching'>('all');
  const [strengthSearch, setStrengthSearch] = useState('');

  // Modal State for Central HR Admin
  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [editingStrength, setEditingStrength] = useState<InstituteStaffStrength | null>(null);
  const [formPostId, setFormPostId] = useState('');
  const [formPostType, setFormPostType] = useState<'Teaching' | 'Non-Teaching'>('Teaching');
  const [formCourseId, setFormCourseId] = useState('');
  const [formProgramStream, setFormProgramStream] = useState('');
  const [formRegulatoryBody, setFormRegulatoryBody] = useState('AICTE / Regulatory Body');
  const [formSanctioned, setFormSanctioned] = useState<number | ''>(1);
  const [formAvailable, setFormAvailable] = useState<number | ''>(0);
  const [formRemarks, setFormRemarks] = useState('');
  const [savingStrength, setSavingStrength] = useState(false);

  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load Org Settings
      const { data: orgData } = await supabase
        .from('organization_settings')
        .select('*')
        .limit(1)
        .single();
      if (orgData) setOrg(orgData);

      // Load Institute
      const { data: instData, error: instErr } = await supabase
        .from('institutes')
        .select('*')
        .eq('id', instituteId)
        .single();

      if (instErr) throw instErr;
      setInstitute(instData);

      // Load Approvals
      const { data: appData } = await supabase
        .from('institute_approvals')
        .select('*')
        .eq('institute_id', instituteId)
        .order('created_at', { ascending: true });
      if (appData) setApprovals(appData);

      // Load Courses
      const { data: crsData } = await supabase
        .from('institute_courses')
        .select('*')
        .eq('institute_id', instituteId)
        .order('level', { ascending: true });
      const currentCourses = crsData || [];
      if (crsData) setCourses(currentCourses);

      // Load Head History
      const { data: histData } = await supabase
        .from('institute_head_history')
        .select('*')
        .eq('institute_id', instituteId)
        .order('leaving_date', { ascending: false });
      if (histData) setHeadHistory(histData);

      // Load Global Posts
      const { data: postData } = await supabase
        .from('posts')
        .select('*, staff_categories(*)')
        .eq('is_active', true)
        .order('title');
      const currentPosts = postData || [];
      if (postData) setPosts(currentPosts);

      // Load Staff Strength & Variance
      const strengthData = await fetchStaffStrength(instituteId, currentPosts, currentCourses);
      setStaffStrengths(strengthData);

    } catch (err: any) {
      console.error('Error loading institute details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [instituteId]);

  const handleOpenAddStrength = () => {
    setEditingStrength(null);
    setFormPostId(posts[0]?.id || '');
    setFormPostType('Teaching');
    setFormCourseId(courses[0]?.id || '');
    setFormProgramStream(courses[0]?.program_stream || 'Engineering & Technology');
    setFormRegulatoryBody('AICTE / Regulatory Body');
    setFormSanctioned(1);
    setFormAvailable(0);
    setFormRemarks('');
    setShowStrengthModal(true);
  };

  const handleOpenEditStrength = (item: InstituteStaffStrength) => {
    setEditingStrength(item);
    setFormPostId(item.post_id);
    setFormPostType(item.post_type);
    setFormCourseId(item.course_id || '');
    setFormProgramStream(item.program_stream || '');
    setFormRegulatoryBody(item.regulatory_body || 'AICTE / Regulatory Body');
    setFormSanctioned(item.sanctioned_posts);
    setFormAvailable(item.available_strength);
    setFormRemarks(item.remarks || '');
    setShowStrengthModal(true);
  };

  const handleSaveStrength = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institute) return;
    setSavingStrength(true);
    try {
      const selectedPost = posts.find((p) => p.id === formPostId);
      const selectedCourse = courses.find((c) => c.id === formCourseId);

      await saveStaffStrength({
        id: editingStrength?.id,
        institute_id: institute.id,
        post_id: formPostId,
        course_id: formPostType === 'Teaching' ? formCourseId || null : null,
        post_type: formPostType,
        program_stream: formProgramStream || (formPostType === 'Teaching' ? 'Engineering & Technology' : 'General / Administrative (Common Pool)'),
        sanctioned_posts: Number(formSanctioned) || 0,
        available_strength: Number(formAvailable) || 0,
        regulatory_body: formRegulatoryBody,
        remarks: formRemarks,
        posts: selectedPost,
        institute_courses: selectedCourse,
      });

      const updated = await fetchStaffStrength(institute.id, posts, courses);
      setStaffStrengths(updated);
      setShowStrengthModal(false);
    } catch (err) {
      console.error('Error saving strength:', err);
    } finally {
      setSavingStrength(false);
    }
  };

  const handleDeleteStrength = async (id: string, title?: string) => {
    if (!institute) return;
    const ok = window.confirm(`Remove staff strength mapping for: "${title || 'this post'}"?`);
    if (!ok) return;

    await deleteStaffStrength(id, institute.id);
    const updated = await fetchStaffStrength(institute.id, posts, courses);
    setStaffStrengths(updated);
  };

  const totalSanctionedIntake = courses.reduce((sum, c) => sum + (c.sanctioned_intake || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Loading institute dossier...</p>
        </div>
      </div>
    );
  }

  if (!institute) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="text-center space-y-4 max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Institute Not Found</h2>
          <p className="text-xs text-slate-500">The requested institute profile could not be found or has been removed.</p>
          <Link
            href="/admin/institutes"
            className="inline-block px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold shadow hover:bg-sky-700 transition"
          >
            Return to Institutes List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans print:bg-white print:p-0 print:pb-0">
      {/* Top Header - Screen Only */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/institutes"
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              title="Back to All Institutes"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-600" />
                <h1 className="text-lg font-bold text-slate-900">Institute Profile & Dossier</h1>
              </div>
              <p className="text-xs text-slate-500">
                Central HR Sanstha Unit Master
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Profile (A4)</span>
            </button>
            <Link
              href={`/admin/institutes/${institute.id}/edit`}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow hover:shadow-md transition flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Details</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Printable / Viewable Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 print:p-0 print:max-w-none">
        
        {/* Printable Trust Letterhead (shows on print, looks great on screen too) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 mb-6 print:rounded-none print:shadow-none print:border-b-2 print:border-slate-800 print:mb-4 print:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              {org && (
                <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                  {org.name}
                </p>
              )}
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                {institute.official_name || institute.name}
              </h2>
              {institute.short_name && (
                <p className="text-sm font-semibold text-slate-500">
                  Abbreviation / Short Name: <span className="text-slate-800 font-bold">{institute.short_name}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                institute.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {institute.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {institute.is_active ? 'Active Sanstha Unit' : 'Archived Unit'}
              </span>
              <span className="px-3 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-full text-xs font-semibold">
                {institute.institute_type}
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Unit Code</span>
              <span className="text-sm font-bold text-slate-800">{institute.code || '—'}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Established</span>
              <span className="text-sm font-bold text-slate-800">{institute.establishment_year || '—'}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Total Courses</span>
              <span className="text-sm font-bold text-purple-700">{courses.length} Programmes</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Sanctioned Intake</span>
              <span className="text-sm font-bold text-emerald-700">{totalSanctionedIntake} Seats</span>
            </div>
          </div>
        </div>

        {/* 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column (2 Cols): Approvals & Programmes */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. Approvals & Affiliations */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-4 print:shadow-none print:rounded-xl print:p-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Apex Approvals & University Affiliations</h3>
              </div>

              {approvals.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No approval bodies recorded for this unit.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                        <th className="py-2.5 px-3">Approving Authority</th>
                        <th className="py-2.5 px-3">Reference / Order No</th>
                        <th className="py-2.5 px-3">Approval Date</th>
                        <th className="py-2.5 px-3">Valid Up To</th>
                        <th className="py-2.5 px-3 text-right print:hidden">Letter</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {approvals.map((app, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3 font-bold text-slate-800">{app.body_name}</td>
                          <td className="py-3 px-3 font-medium text-slate-600">{app.reference_no || '—'}</td>
                          <td className="py-3 px-3 text-slate-600">{app.approval_date || '—'}</td>
                          <td className="py-3 px-3">
                            {app.valid_upto_date ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                                {app.valid_upto_date}
                              </span>
                            ) : (
                              <span className="text-slate-400">Permanent / Annual</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right print:hidden">
                            {app.letter_doc_url ? (
                              <a
                                href={app.letter_doc_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-bold"
                              >
                                <span>Doc</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 2. Academic Programmes & Sanctioned Intake */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-4 print:shadow-none print:rounded-xl print:p-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  <h3 className="text-base font-bold text-slate-900">Academic Programmes Run</h3>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                  Total Intake: {totalSanctionedIntake}
                </span>
              </div>

              {courses.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No courses registered under this institute yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                        <th className="py-2.5 px-3">Discipline / Program</th>
                        <th className="py-2.5 px-3">Course / Degree</th>
                        <th className="py-2.5 px-3">Level</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3 text-right">Intake</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {courses.map((crs, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3 font-semibold text-purple-700">
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-100 text-purple-700 font-semibold text-[11px]">
                              {crs.program_stream || 'Engineering & Technology'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800">{crs.course_name}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              {crs.level}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{crs.duration_years || '—'}</td>
                          <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                            {crs.sanctioned_intake || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. Principal / Head Tenure History */}
            {headHistory.length > 0 && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 space-y-4 print:shadow-none print:rounded-xl print:p-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <History className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-bold text-slate-900">Principal / Head Tenure Audit History</h3>
                </div>

                <div className="space-y-3">
                  {headHistory.map((hist, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex items-start justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{hist.head_name} <span className="font-medium text-slate-500">({hist.designation})</span></p>
                        <p className="text-[11px] text-amber-800 mt-0.5 font-medium">{hist.reason_for_change || 'Tenure concluded'}</p>
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold bg-white px-2 py-1 rounded-lg border border-slate-200">
                        Until {hist.to_date || 'Past'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column (1 Col): Location & Key Personnel */}
          <div className="space-y-6">

            {/* Head of Institute */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4 print:shadow-none print:rounded-xl print:p-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <User className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">Head of Institute</h3>
              </div>

              <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 space-y-3 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
                    {institute.head_designation || 'Principal'}
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {institute.head_name || 'Not Designated'}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-sky-200/60">
                  {institute.head_mobile && (
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <Phone className="w-4 h-4 text-sky-600 flex-shrink-0" />
                      <a href={`tel:${institute.head_mobile}`} className="hover:underline">
                        +91 {institute.head_mobile}
                      </a>
                    </div>
                  )}

                  {institute.head_email && (
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <Mail className="w-4 h-4 text-sky-600 flex-shrink-0" />
                      <a href={`mailto:${institute.head_email}`} className="hover:underline break-all">
                        {institute.head_email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Second Contact Person */}
            {institute.second_contact_name && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4 print:shadow-none print:rounded-xl print:p-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="w-5 h-5 text-slate-500" />
                  <h3 className="text-base font-bold text-slate-900">Administrative Contact</h3>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      {institute.second_contact_designation || 'Registrar'}
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {institute.second_contact_name}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    {institute.second_contact_mobile && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>+91 {institute.second_contact_mobile}</span>
                      </div>
                    )}
                    {institute.second_contact_email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span className="break-all">{institute.second_contact_email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Location & Official Contacts */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4 print:shadow-none print:rounded-xl print:p-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Campus Location & Contacts</h3>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Campus Address</span>
                  <p className="font-medium text-slate-800 leading-relaxed">
                    {institute.address_line || institute.address}<br />
                    Tal. {institute.taluka}, Dist. {institute.district} - {institute.pincode}<br />
                    {institute.state || 'Maharashtra'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  {institute.official_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <a href={`mailto:${institute.official_email}`} className="text-slate-800 font-medium hover:underline break-all">
                        {institute.official_email}
                      </a>
                    </div>
                  )}

                  {institute.office_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-slate-800 font-medium">{institute.office_phone}</span>
                    </div>
                  )}

                  {institute.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <a
                        href={institute.website.startsWith('http') ? institute.website : `https://${institute.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 font-medium hover:underline flex items-center gap-1 break-all"
                      >
                        <span>{institute.website}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 4. Staff Strength & Apex Body Sanctioned Posts Matrix (Full Width) */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 mt-6 print:shadow-none print:rounded-xl print:p-4 print:border-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-sky-600" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Staff Strength & Apex Body Sanctioned Posts Matrix
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Apex body sanctioned intake vs active faculty & non-teaching staff with automated variance calculation.
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handleOpenAddStrength}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Map Post Requirement</span>
              </button>
            </div>
          </div>

          {/* KPI Stat Cards */}
          {(() => {
            const totSanc = staffStrengths.reduce((s, i) => s + (Number(i.sanctioned_posts) || 0), 0);
            const totAvail = staffStrengths.reduce((s, i) => s + (Number(i.available_strength) || 0), 0);
            const nVar = calculateStaffVariance(totAvail, totSanc);

            const teachItems = staffStrengths.filter((s) => s.post_type === 'Teaching');
            const nonTeachItems = staffStrengths.filter((s) => s.post_type === 'Non-Teaching');

            const tSanc = teachItems.reduce((s, i) => s + (Number(i.sanctioned_posts) || 0), 0);
            const tAvail = teachItems.reduce((s, i) => s + (Number(i.available_strength) || 0), 0);
            const tVar = calculateStaffVariance(tAvail, tSanc);

            const ntSanc = nonTeachItems.reduce((s, i) => s + (Number(i.sanctioned_posts) || 0), 0);
            const ntAvail = nonTeachItems.reduce((s, i) => s + (Number(i.available_strength) || 0), 0);
            const ntVar = calculateStaffVariance(ntAvail, ntSanc);

            return (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">Sanctioned Posts</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900">{totSanc}</span>
                    <span className="text-[11px] text-slate-400 font-semibold">Apex Body</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">Regulatory Norms</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">Available Strength</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900">{totAvail}</span>
                    <span className="text-[11px] text-slate-400 font-semibold">Active Staff</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">Currently Deployed</p>
                </div>

                <div className={`p-4 rounded-2xl border space-y-1 ${
                  nVar < 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : nVar > 0 ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider block opacity-80">Net Sanstha Variance</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black">{nVar > 0 ? `+${nVar}` : nVar}</span>
                    <span className="text-[11px] font-bold">{nVar < 0 ? 'Deficit' : nVar > 0 ? 'Surplus' : 'Balanced'}</span>
                  </div>
                  <p className="text-[10px] font-semibold flex items-center gap-1">
                    {nVar < 0 ? <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{nVar < 0 ? `${Math.abs(nVar)} Deficit Vacancies` : nVar > 0 ? `${nVar} Surplus Staff` : '100% Filled'}</span>
                  </p>
                </div>

                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-800 block">Teaching Cadre</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-purple-950">{tAvail} / {tSanc}</span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${tVar < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {tVar > 0 ? `+${tVar}` : tVar} Var
                    </span>
                  </div>
                  <p className="text-[10px] text-purple-700 font-medium">{teachItems.length} Program-Wise Posts</p>
                </div>

                <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-teal-800 block">Non-Teaching Pool</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-teal-950">{ntAvail} / {ntSanc}</span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${ntVar < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {ntVar > 0 ? `+${ntVar}` : ntVar} Var
                    </span>
                  </div>
                  <p className="text-[10px] text-teal-700 font-medium">Central Shared Pool</p>
                </div>
              </div>
            );
          })()}

          {/* Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 print:hidden">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveStrengthTab('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${activeStrengthTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                All Posts ({staffStrengths.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveStrengthTab('teaching')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${activeStrengthTab === 'teaching' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Teaching ({staffStrengths.filter((s) => s.post_type === 'Teaching').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStrengthTab('non_teaching')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 ${activeStrengthTab === 'non_teaching' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Non-Teaching ({staffStrengths.filter((s) => s.post_type === 'Non-Teaching').length})</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search post, stream, apex body..."
                value={strengthSearch}
                onChange={(e) => setStrengthSearch(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10.5px]">
                  <th className="py-2.5 px-3">Designation / Role</th>
                  <th className="py-2.5 px-3">Programme Mapping</th>
                  <th className="py-2.5 px-3">Regulatory Body</th>
                  <th className="py-2.5 px-3 text-center">Sanctioned</th>
                  <th className="py-2.5 px-3 text-center">Available</th>
                  <th className="py-2.5 px-3 text-center">Variance</th>
                  <th className="py-2.5 px-3">Remarks</th>
                  <th className="py-2.5 px-3 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffStrengths
                  .filter((item) => {
                    if (activeStrengthTab === 'teaching' && item.post_type !== 'Teaching') return false;
                    if (activeStrengthTab === 'non_teaching' && item.post_type !== 'Non-Teaching') return false;
                    if (strengthSearch.trim()) {
                      const q = strengthSearch.toLowerCase();
                      const t = (item.posts?.title || '').toLowerCase().includes(q);
                      const s = (item.program_stream || '').toLowerCase().includes(q);
                      const c = (item.institute_courses?.course_name || '').toLowerCase().includes(q);
                      const r = (item.regulatory_body || '').toLowerCase().includes(q);
                      if (!t && !s && !c && !r) return false;
                    }
                    return true;
                  })
                  .map((item) => {
                    const varianceVal = calculateStaffVariance(item.available_strength, item.sanctioned_posts);
                    const isDeficit = varianceVal < 0;
                    const isSurplus = varianceVal > 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{item.posts?.title || 'Custom Post'}</span>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                            item.post_type === 'Teaching' ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800'
                          }`}>
                            {item.post_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {item.post_type === 'Teaching' ? (
                            <div>
                              <span className="font-semibold block">{item.institute_courses?.course_name || item.program_stream || 'General Academic'}</span>
                              <span className="text-[10px] text-purple-700">{item.program_stream}</span>
                            </div>
                          ) : (
                            <span className="text-teal-700 font-semibold text-[11px]">🏛️ Central Common Pool</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          {item.regulatory_body || 'AICTE / Apex Body'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                          {item.sanctioned_posts}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                          {item.available_strength}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isDeficit ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold text-[11px] inline-flex items-center gap-1">
                              <TrendingDown className="w-3 h-3 text-rose-600" />
                              <span>{varianceVal} Deficit</span>
                            </span>
                          ) : isSurplus ? (
                            <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-extrabold text-[11px] inline-flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-sky-600" />
                              <span>+{varianceVal} Surplus</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                              Balanced (0)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                          {item.remarks || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right print:hidden">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditStrength(item)}
                              className="p-1 text-slate-600 hover:text-sky-600 rounded transition"
                              title="Edit Mapping"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStrength(item.id, item.posts?.title)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Delete Mapping"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Print Footer Note */}
        <div className="hidden print:block text-center mt-6 pt-4 border-t border-slate-300 text-[10px] text-slate-500">
          Generated via SmartHR Central Recruitment & Sanstha Management System on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>

        {/* MODAL: MAP POST REQUIREMENT (CENTRAL HR) */}
        {showStrengthModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-sky-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    {editingStrength ? 'Edit Staff Strength Mapping' : 'Map Designation & Sanctioned Posts'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStrengthModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStrength} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    * Job Designation (From Admin Master)
                  </label>
                  <select
                    required
                    value={formPostId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setFormPostId(selId);
                      const selP = posts.find((p) => p.id === selId);
                      if (selP) {
                        const isNonTeach = selP.staff_categories?.name?.toLowerCase().includes('non') || selP.staff_categories?.name?.toLowerCase().includes('house');
                        const newType = isNonTeach ? 'Non-Teaching' : 'Teaching';
                        setFormPostType(newType);
                        if (newType === 'Teaching') {
                          if (selP.program_stream && selP.program_stream !== 'All Programs / General') {
                            setFormProgramStream(selP.program_stream);
                          } else if (courses.length > 0) {
                            setFormProgramStream(courses[0].program_stream || 'Engineering & Technology');
                          }
                        } else {
                          setFormProgramStream('General / Administrative (Common Pool)');
                          setFormCourseId('');
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="">-- Choose Designation --</option>
                    {posts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} [{p.staff_categories?.name || 'General'}]
                        {p.program_stream && p.program_stream !== 'All Programs / General' ? ` • ${p.program_stream}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded-2xl border-2 flex items-center gap-2 cursor-pointer ${
                    formPostType === 'Teaching' ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold' : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="postType"
                      checked={formPostType === 'Teaching'}
                      onChange={() => setFormPostType('Teaching')}
                      className="sr-only"
                    />
                    <GraduationCap className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <div>
                      <span className="block text-xs">Teaching Cadre</span>
                      <span className="text-[10px] text-purple-700 font-normal">Program-Wise</span>
                    </div>
                  </label>

                  <label className={`p-3 rounded-2xl border-2 flex items-center gap-2 cursor-pointer ${
                    formPostType === 'Non-Teaching' ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold' : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="postType"
                      checked={formPostType === 'Non-Teaching'}
                      onChange={() => {
                        setFormPostType('Non-Teaching');
                        setFormCourseId('');
                        setFormProgramStream('General / Administrative (Common Pool)');
                      }}
                      className="sr-only"
                    />
                    <Users className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <div>
                      <span className="block text-xs">Non-Teaching</span>
                      <span className="text-[10px] text-teal-700 font-normal">Central Common Pool</span>
                    </div>
                  </label>
                </div>

                {formPostType === 'Teaching' ? (
                  <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
                    <div>
                      <label className="block font-bold text-purple-900 text-[10.5px] mb-1">
                        * Academic Course Run by this Institute
                      </label>
                      <select
                        value={formCourseId}
                        onChange={(e) => {
                          setFormCourseId(e.target.value);
                          const crs = courses.find((c) => c.id === e.target.value);
                          if (crs && crs.program_stream) setFormProgramStream(crs.program_stream);
                        }}
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-medium"
                      >
                        <option value="">-- Institute Academic Programme --</option>
                        {courses.map((crs) => (
                          <option key={crs.id} value={crs.id}>
                            {crs.course_name} ({crs.level}) — Intake: {crs.sanctioned_intake}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-purple-900 text-[10.5px] mb-1">
                        Discipline / Stream
                      </label>
                      <input
                        type="text"
                        value={formProgramStream}
                        onChange={(e) => setFormProgramStream(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-medium"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-200 text-teal-900 text-[11px]">
                    🏛️ Central Common Pool: Shared deployment across all institutes in the Sanstha.
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Apex Regulatory Body
                  </label>
                  <select
                    value={formRegulatoryBody}
                    onChange={(e) => setFormRegulatoryBody(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="AICTE / Regulatory Body">AICTE</option>
                    <option value="UGC / Apex Body">UGC</option>
                    <option value="PCI / Apex Body">PCI</option>
                    <option value="MSBTE / Apex Body">MSBTE</option>
                    <option value="Affiliating University">Affiliating University</option>
                    <option value="DTE Maharashtra">DTE Maharashtra</option>
                    <option value="Sanstha Trust Norms">Sanstha Trust Norms</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      * Sanctioned Posts
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formSanctioned}
                      onChange={(e) => setFormSanctioned(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-base"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      * Available Strength
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formAvailable}
                      onChange={(e) => setFormAvailable(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-base"
                    />
                  </div>
                </div>

                {/* Live Real-time Variance preview in Admin modal */}
                {(() => {
                  const pVar = calculateStaffVariance(Number(formAvailable) || 0, Number(formSanctioned) || 0);
                  return (
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${
                      pVar < 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : pVar > 0 ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <span className="font-extrabold">
                        {pVar < 0 ? `${pVar} Deficit (${Math.abs(pVar)} Vacant)` : pVar > 0 ? `+${pVar} Surplus` : 'Balanced (0)'}
                      </span>
                      <span className="text-[10.5px] opacity-80">
                        Available ({formAvailable || 0}) - Sanctioned ({formSanctioned || 0})
                      </span>
                    </div>
                  );
                })()}

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Regulatory Remarks / Cadre Ratio
                  </label>
                  <input
                    type="text"
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    placeholder="e.g. Cadre ratio 1:2:6 norm"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowStrengthModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingStrength}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md"
                  >
                    {savingStrength ? 'Saving...' : 'Save Mapping'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
