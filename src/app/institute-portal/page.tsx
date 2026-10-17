'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Institute,
  InstituteApproval,
  InstituteCourse,
  OrganizationSettings,
  Post,
  InstituteStaffStrength,
  StaffCategory,
  Application
} from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/RoleGuard';
import { NotificationBell } from '@/components/NotificationBell';
import {
  fetchStaffStrength,
  saveStaffStrength,
  deleteStaffStrength,
  calculateStaffVariance
} from '@/lib/staffStrengthService';
import { submitInstituteHeadReview, mergeApplicationOverrides } from '@/lib/workflowService';
import {
  Building2,
  GraduationCap,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  LogOut,
  User,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Plus,
  Search,
  Edit3,
  Trash2,
  Printer,
  TrendingDown,
  TrendingUp,
  Check,
  X,
  Filter,
  Briefcase,
  Scale,
  RefreshCw,
  Sparkles,
  Info,
  Send,
  Calendar,
  Eye,
  PauseCircle,
  CheckCircle,
  MessageSquare
} from 'lucide-react';

export default function InstitutePortalPage() {
  const router = useRouter();
  const { role, session: authSession } = useAuth();
  const [allInstitutes, setAllInstitutes] = useState<Institute[]>([]);
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [courses, setCourses] = useState<InstituteCourse[]>([]);
  const [approvals, setApprovals] = useState<InstituteApproval[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<StaffCategory[]>([]);
  const [staffStrengths, setStaffStrengths] = useState<InstituteStaffStrength[]>([]);
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create New Job Designation Modal State for Institute Head
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostCategoryId, setNewPostCategoryId] = useState('');
  const [newPostStream, setNewPostStream] = useState('All Programs / General');
  const [newPostQual, setNewPostQual] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);
  const [createPostError, setCreatePostError] = useState<string | null>(null);

  // Filter & Search State for Matrix
  const [activeTab, setActiveTab] = useState<'all' | 'teaching' | 'non_teaching'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InstituteStaffStrength | null>(null);
  const [formPostId, setFormPostId] = useState('');
  const [formPostType, setFormPostType] = useState<'Teaching' | 'Non-Teaching'>('Teaching');
  const [formCourseId, setFormCourseId] = useState('');
  const [formProgramStream, setFormProgramStream] = useState('');
  const [formRegulatoryBody, setFormRegulatoryBody] = useState('AICTE / Regulatory Body');
  const [formSanctioned, setFormSanctioned] = useState<number | ''>(1);
  const [formAvailable, setFormAvailable] = useState<number | ''>(0);
  const [formRemarks, setFormRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Workflow Review & Candidate Dossier State (Feature 2)
  const [portalSection, setPortalSection] = useState<'review' | 'matrix'>('review');
  const [forwardedApplications, setForwardedApplications] = useState<Application[]>([]);
  const [selectedReviewApp, setSelectedReviewApp] = useState<Application | null>(null);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | 'pending' | 'selected' | 'hold' | 'rejected'>('all');
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);
  const [evaluationFiles, setEvaluationFiles] = useState<Record<string, { report?: File; signature?: File }>>({});

  // Physical Interview & Evaluation State (Requirement 1 & 2)
  const [reviewRecommendation, setReviewRecommendation] = useState<'selected' | 'recommended' | 'hold' | 'rejected'>('selected');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [interviewConductedDate, setInterviewConductedDate] = useState('');
  const [interviewVenue, setInterviewVenue] = useState('');
  const [interviewPanelMembers, setInterviewPanelMembers] = useState('');
  const [interviewPanelRemarks, setInterviewPanelRemarks] = useState('');
  const [interviewScore, setInterviewScore] = useState<number | ''>(85);
  const [interviewTeachingDemoScore, setInterviewTeachingDemoScore] = useState<number | ''>(88);
  const [physicalDocsStatus, setPhysicalDocsStatus] = useState<'verified_all_clear' | 'discrepancy_observed' | 'provisional_pending_docs'>('verified_all_clear');
  const [physicalDocsRemarks, setPhysicalDocsRemarks] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessToast, setReviewSuccessToast] = useState<{ show: boolean; msg: string; emailTo: string } | null>(null);

  // Authorized roles check
  const isAuthorized = role === 'admin_head_hr' || role === 'institute_head';

  // Sync portalSection and reviewStatusFilter with URL query params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'matrix') {
      setPortalSection('matrix');
    } else if (tabParam === 'review') {
      setPortalSection('review');
    }

    const filterParam = params.get('filter');
    if (
      filterParam === 'pending' ||
      filterParam === 'selected' ||
      filterParam === 'hold' ||
      filterParam === 'rejected' ||
      filterParam === 'all'
    ) {
      setReviewStatusFilter(filterParam);
      if (tabParam !== 'matrix') {
        setPortalSection('review');
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    loadInitialData();
  }, [isAuthorized, authSession?.linked_institute_id]);

  async function loadInitialData(targetInstituteId?: string) {
    setLoading(true);
    try {
      // 1. Load Org Settings & Categories
      const { data: orgData } = await supabase.from('organization_settings').select('*').limit(1).maybeSingle();
      if (orgData) setOrg(orgData);

      const { data: catData } = await supabase.from('staff_categories').select('*').eq('is_active', true).order('name');
      if (catData) setCategories(catData);

      // 2. Fetch all active institutes
      const { data: instList } = await supabase
        .from('institutes')
        .select('*')
        .order('official_name', { ascending: true });
      if (instList) setAllInstitutes(instList);

      // 3. Determine active institute
      let selectedInst: Institute | null = null;
      const desiredId = targetInstituteId || authSession?.linked_institute_id;

      if (desiredId && instList) {
        selectedInst = instList.find((i) => i.id === desiredId) || null;
      }

      if (!selectedInst && instList && instList.length > 0) {
        selectedInst = instList[0];
      }

      if (selectedInst) {
        setInstitute(selectedInst);
        await loadInstituteDetails(selectedInst.id);
      }
    } catch (err) {
      console.error('Portal load err:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadInstituteDetails(instituteId: string) {
    try {
      // Fetch Courses
      const { data: crsData } = await supabase
        .from('institute_courses')
        .select('*')
        .eq('institute_id', instituteId)
        .order('level', { ascending: true });
      const currentCourses = crsData || [];
      setCourses(currentCourses);

      // Fetch Approvals
      const { data: appData } = await supabase
        .from('institute_approvals')
        .select('*')
        .eq('institute_id', instituteId);
      setApprovals(appData || []);

      // Fetch Global Posts Master
      const { data: postData } = await supabase
        .from('posts')
        .select('*, staff_categories(*)')
        .eq('is_active', true)
        .order('title');
      const currentPosts = postData || [];
      setPosts(currentPosts);

      // Fetch Staff Strength for this institute
      const strengthList = await fetchStaffStrength(instituteId, currentPosts, currentCourses);
      setStaffStrengths(strengthList);

      // Fetch Forwarded Applications for this institute (Feature 2)
      const { data: rawApps } = await supabase
        .from('applications')
        .select(`
          *,
          posts (*),
          staff_categories (*),
          fee_receipts (*),
          application_education (*),
          application_experience (*)
        `)
        .order('created_at', { ascending: false });

      const allApps = mergeApplicationOverrides((rawApps as Application[]) || []);
      const instForwarded = allApps.filter(
        (a) =>
          a.forwarded_to_institute_id === instituteId ||
          (a.preferred_institute_id === instituteId && a.status === 'forwarded_to_institute')
      );
      setForwardedApplications(instForwarded);
    } catch (err) {
      console.error('Error loading institute details:', err);
    }
  }

  // Open Candidate Review Modal for Institute Head
  const openReviewModal = (app: Application) => {
    setSelectedReviewApp(app);
    setReviewRecommendation(
      app.institute_recommendation === 'recommended'
        ? 'selected'
        : (app.institute_recommendation || 'selected')
    );
    setReviewRemarks(app.institute_remarks || '');
    setInterviewConductedDate(
      app.interview_conducted_date
        ? app.interview_conducted_date.slice(0, 16)
        : app.interview_suggested_date
        ? app.interview_suggested_date.slice(0, 16)
        : new Date().toISOString().slice(0, 16)
    );
    setInterviewVenue(
      app.interview_venue ||
        `${institute?.official_name || institute?.name} — Principal Board Room / Conference Hall`
    );
    setInterviewPanelMembers(
      app.interview_panel_members ||
        `${institute?.head_name || 'Principal'}, HOD (${app.program_stream || 'Academic Dept'}), Subject Expert Evaluator`
    );
    setInterviewPanelRemarks(
      app.interview_panel_remarks ||
        app.institute_remarks ||
        'Candidate demonstrated strong domain knowledge and effective chalk-and-talk classroom demonstration. Good research publications and communication skills.'
    );
    setInterviewScore(app.interview_score ?? 85);
    setInterviewTeachingDemoScore(app.interview_teaching_demo_score ?? 88);
    setPhysicalDocsStatus(app.physical_docs_status || 'verified_all_clear');
    setPhysicalDocsRemarks(
      app.physical_docs_remarks ||
        'Original marksheets, degree certificates, experience relieving letters, and identity cards physically verified on campus and found authentic.'
    );
  };

  // Submit Institute Head Review & Alert Central HR
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewApp || !institute) return;

    if (!reviewRemarks.trim()) {
      alert('Mandatory Requirement: Please enter detailed justification/remarks for your final recommendation decision.');
      return;
    }

    if (!interviewPanelRemarks.trim()) {
      alert('Mandatory Requirement: Please enter interview panel remarks / performance notes.');
      return;
    }

    const selectedFiles = evaluationFiles[selectedReviewApp.id] || {};
    if ((!selectedFiles.report && !selectedReviewApp.interview_evaluation_report_url) ||
        (!selectedFiles.signature && !selectedReviewApp.head_signature_url)) {
      alert('Upload the signed Interview Evaluation Report and the Head of Institute signature file before submitting.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const uploadEvaluationFile = async (file: File, kind: 'report' | 'signature') => {
        const safeExtension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
        const path = `${selectedReviewApp.application_no}_interview_${kind}_${Date.now()}.${safeExtension}`;
        const { error } = await supabase.storage.from('candidate-documents').upload(path, file, { upsert: false });
        if (error) throw error;
        return supabase.storage.from('candidate-documents').getPublicUrl(path).data.publicUrl;
      };
      const reportUrl = selectedFiles.report
        ? await uploadEvaluationFile(selectedFiles.report, 'report')
        : selectedReviewApp.interview_evaluation_report_url!;
      const signatureUrl = selectedFiles.signature
        ? await uploadEvaluationFile(selectedFiles.signature, 'signature')
        : selectedReviewApp.head_signature_url!;

      const res = await submitInstituteHeadReview({
        applicationId: selectedReviewApp.id,
        applicationNo: selectedReviewApp.application_no,
        candidateName: selectedReviewApp.candidate_name,
        instituteName: institute.official_name || institute.name || 'Institute',
        recommendation: reviewRecommendation,
        instituteRemarks: reviewRemarks.trim(),
        interviewConductedDate,
        interviewVenue: interviewVenue.trim() || `${institute.short_name || institute.name} Campus`,
        interviewPanelMembers: interviewPanelMembers.trim(),
        interviewPanelRemarks: interviewPanelRemarks.trim(),
        interviewScore: typeof interviewScore === 'number' ? interviewScore : undefined,
        interviewTeachingDemoScore: typeof interviewTeachingDemoScore === 'number' ? interviewTeachingDemoScore : undefined,
        physicalDocsStatus,
        physicalDocsRemarks: physicalDocsRemarks.trim(),
        reviewedBy: institute.head_name || authSession?.full_name || 'Principal',
        interviewEvaluationReportUrl: reportUrl,
        headSignatureUrl: signatureUrl,
      });

      if (res.success) {
        const recBadgeText =
          reviewRecommendation === 'selected' || reviewRecommendation === 'recommended'
            ? 'SELECTED / RECOMMENDED'
            : reviewRecommendation === 'hold'
            ? 'HOLD / WAITLIST'
            : 'REJECTED';

        setReviewSuccessToast({
          show: true,
          msg: `Physical interview evaluation completed for #${selectedReviewApp.application_no} (${selectedReviewApp.candidate_name})! Final Outcome: ${recBadgeText}. Formal dossier and automated notifications routed to Central HR.`,
          emailTo: 'Central HR Department (hr@mandaltrust.org)',
        });
        setSelectedReviewApp(null);
        await loadInstituteDetails(institute.id);
        setTimeout(() => setReviewSuccessToast(null), 7000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleInstituteChange = async (newId: string) => {
    const selected = allInstitutes.find((i) => i.id === newId);
    if (selected) {
      setInstitute(selected);
      setRefreshing(true);
      await loadInstituteDetails(selected.id);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!institute) return;
    setRefreshing(true);
    await loadInstituteDetails(institute.id);
    setRefreshing(false);
  };

  const handleLogout = () => router.push('/login');

  // Open Modal for Create
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormPostId(posts[0]?.id || '');
    setFormPostType('Teaching');
    setFormCourseId(courses[0]?.id || '');
    setFormProgramStream(courses[0]?.program_stream || 'Engineering & Technology');
    setFormRegulatoryBody('AICTE / Regulatory Body');
    setFormSanctioned(1);
    setFormAvailable(0);
    setFormRemarks('');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: InstituteStaffStrength) => {
    setEditingItem(item);
    setFormPostId(item.post_id);
    setFormPostType(item.post_type);
    setFormCourseId(item.course_id || '');
    setFormProgramStream(item.program_stream || '');
    setFormRegulatoryBody(item.regulatory_body || 'AICTE / Regulatory Body');
    setFormSanctioned(item.sanctioned_posts);
    setFormAvailable(item.available_strength);
    setFormRemarks(item.remarks || '');
    setFeedbackMsg(null);
    setShowModal(true);
  };

  // Handle Post Selection in Modal
  const handlePostChange = (postId: string) => {
    setFormPostId(postId);
    const selectedPost = posts.find((p) => p.id === postId);
    if (selectedPost) {
      const isNonTeaching =
        selectedPost.staff_categories?.name?.toLowerCase().includes('non') ||
        selectedPost.staff_categories?.name?.toLowerCase().includes('house');
      const newType = isNonTeaching ? 'Non-Teaching' : 'Teaching';
      setFormPostType(newType);

      if (newType === 'Teaching') {
        if (selectedPost.program_stream && selectedPost.program_stream !== 'All Programs / General') {
          setFormProgramStream(selectedPost.program_stream);
        } else if (courses.length > 0) {
          setFormProgramStream(courses[0].program_stream || 'Engineering & Technology');
        }
      } else {
        setFormProgramStream('General / Administrative (Common Pool)');
        setFormCourseId('');
      }
    }
  };

  const programStreamOptions = [
    'All Programs / General',
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

  // Handle Create New Post by Institute Head
  const handleCreateNewPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostCategoryId) {
      setCreatePostError('Please enter designation title and select a category.');
      return;
    }
    setCreatingPost(true);
    setCreatePostError(null);
    try {
      const { data: createdPost, error } = await supabase
        .from('posts')
        .insert({
          title: newPostTitle.trim(),
          category_id: newPostCategoryId,
          program_stream: newPostStream || 'All Programs / General',
          qualification_requirement: newPostQual.trim(),
          institute_id: institute?.id || null,
          is_active: true,
        })
        .select('*, staff_categories(*)')
        .single();

      if (error) throw error;

      if (createdPost) {
        const updatedPosts = [...posts, createdPost as Post].sort((a, b) => a.title.localeCompare(b.title));
        setPosts(updatedPosts);
        setFormPostId(createdPost.id);
        handlePostChange(createdPost.id);
      }

      setNewPostTitle('');
      setNewPostQual('');
      setShowCreatePostModal(false);
    } catch (err: any) {
      setCreatePostError(err.message || 'Error creating designation');
    } finally {
      setCreatingPost(false);
    }
  };

  // Handle Form Submission
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institute) return;

    if (!formPostId) {
      setFeedbackMsg({ type: 'error', text: 'Please select a Job Designation.' });
      return;
    }

    setSaving(true);
    setFeedbackMsg(null);

    try {
      const selectedPost = posts.find((p) => p.id === formPostId);
      const selectedCourse = courses.find((c) => c.id === formCourseId);

      const res = await saveStaffStrength({
        id: editingItem?.id,
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

      if (res.success) {
        await loadInstituteDetails(institute.id);
        setShowModal(false);
      } else {
        setFeedbackMsg({ type: 'error', text: 'Failed to save staff mapping.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error saving staff mapping.' });
    } finally {
      setSaving(false);
    }
  };

  // Delete Mapping
  const handleDeleteMapping = async (id: string, postTitle?: string) => {
    if (!institute) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to remove designation mapping: "${postTitle || 'this post'}"?`
    );
    if (!confirmDelete) return;

    await deleteStaffStrength(id, institute.id);
    await loadInstituteDetails(institute.id);
  };

  // Print Matrix Sheet
  const handlePrintSheet = () => {
    window.print();
  };

  // Calculate High-Level Staff Strength Metrics
  const totalSanctioned = staffStrengths.reduce((sum, item) => sum + (Number(item.sanctioned_posts) || 0), 0);
  const totalAvailable = staffStrengths.reduce((sum, item) => sum + (Number(item.available_strength) || 0), 0);
  const netVariance = calculateStaffVariance(totalAvailable, totalSanctioned);

  const teachingItems = staffStrengths.filter((s) => s.post_type === 'Teaching');
  const nonTeachingItems = staffStrengths.filter((s) => s.post_type === 'Non-Teaching');

  const teachingSanctioned = teachingItems.reduce((sum, item) => sum + (Number(item.sanctioned_posts) || 0), 0);
  const teachingAvailable = teachingItems.reduce((sum, item) => sum + (Number(item.available_strength) || 0), 0);
  const teachingVariance = calculateStaffVariance(teachingAvailable, teachingSanctioned);

  const nonTeachingSanctioned = nonTeachingItems.reduce((sum, item) => sum + (Number(item.sanctioned_posts) || 0), 0);
  const nonTeachingAvailable = nonTeachingItems.reduce((sum, item) => sum + (Number(item.available_strength) || 0), 0);
  const nonTeachingVariance = calculateStaffVariance(nonTeachingAvailable, nonTeachingSanctioned);

  const deficitPostCount = staffStrengths.filter((s) => (Number(s.variance) || 0) < 0).length;
  const surplusPostCount = staffStrengths.filter((s) => (Number(s.variance) || 0) > 0).length;

  // Filtered List for Table
  const filteredStaffStrengths = staffStrengths.filter((item) => {
    // Tab filter
    if (activeTab === 'teaching' && item.post_type !== 'Teaching') return false;
    if (activeTab === 'non_teaching' && item.post_type !== 'Non-Teaching') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (item.posts?.title || '').toLowerCase().includes(q);
      const streamMatch = (item.program_stream || '').toLowerCase().includes(q);
      const courseMatch = (item.institute_courses?.course_name || '').toLowerCase().includes(q);
      const regMatch = (item.regulatory_body || '').toLowerCase().includes(q);
      const remarkMatch = (item.remarks || '').toLowerCase().includes(q);
      if (!titleMatch && !streamMatch && !courseMatch && !regMatch && !remarkMatch) return false;
    }
    return true;
  });

  // Filtered List for Forwarded Candidate Applications (Feature 2)
  const filteredCandidates = forwardedApplications.filter((app) => {
    // 1. Status filter
    if (reviewStatusFilter === 'pending' && app.status !== 'forwarded_to_institute') return false;
    if (
      reviewStatusFilter === 'selected' &&
      app.status !== 'selected_recommended' &&
      app.status !== 'ready_for_physical_interview' &&
      app.institute_recommendation !== 'selected' &&
      app.institute_recommendation !== 'recommended'
    )
      return false;
    if (
      reviewStatusFilter === 'hold' &&
      app.status !== 'hold' &&
      app.institute_recommendation !== 'hold'
    )
      return false;
    if (
      reviewStatusFilter === 'rejected' &&
      app.status !== 'rejected' &&
      app.institute_recommendation !== 'rejected'
    )
      return false;

    // 2. Search query
    if (candidateSearchQuery.trim()) {
      const q = candidateSearchQuery.toLowerCase();
      const matchName = app.candidate_name.toLowerCase().includes(q);
      const matchAppNo = app.application_no.toLowerCase().includes(q);
      const matchPhone = app.contact_no.includes(q);
      const matchEmail = (app.email_id || '').toLowerCase().includes(q);
      const matchPost = (app.posts?.title || app.custom_post_title || '').toLowerCase().includes(q);
      const matchStream = (app.program_stream || '').toLowerCase().includes(q);
      if (!matchName && !matchAppNo && !matchPhone && !matchEmail && !matchPost && !matchStream) return false;
    }

    return true;
  });

  if (!isAuthorized) {
    return (
      <RoleGuard
        allowedRoles={['admin_head_hr', 'institute_head']}
        title="Institute Head Access Required"
        description="Only designated Principals and Head Central HR Administrators have permission to view this Institute Head Portal."
      >
        <></>
      </RoleGuard>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Loading Institute Head Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard
      allowedRoles={['admin_head_hr', 'institute_head']}
      title="Institute Head Access Required"
      description="Only designated Principals and Head Central HR Administrators have permission to view this Institute Head Portal."
    >
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans print:bg-white print:pb-0">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-600 rounded-2xl text-white flex items-center justify-center shadow-md flex-shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                    {institute?.official_name || institute?.name || 'Institute Head Portal'}
                  </h1>
                  {institute?.code && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                      DTE: {institute.code}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {org?.name ? `${org.name} • ` : ''}Principal / Director Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Institute Switcher for Central HR Admins */}
              {role === 'admin_head_hr' && allInstitutes.length > 1 && (
                <div className="hidden md:flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-bold">Switch:</span>
                  <select
                    value={institute?.id || ''}
                    onChange={(e) => handleInstituteChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                  >
                    {allInstitutes.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.short_name || inst.official_name || inst.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800">
                  {institute?.head_name || authSession?.full_name || 'Principal'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {institute?.head_designation || 'Head of Institute'}
                </span>
              </div>

              <Link
                href="/receptionist"
                className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                title="Go to Central HR Front Desk"
              >
                <Users className="w-4 h-4 text-sky-600" />
                <span className="hidden sm:inline">Front Desk</span>
              </Link>

              <NotificationBell
                role="institute_head"
                instituteId={institute?.id}
                onSelectApplication={(appId) => {
                  const a = forwardedApplications.find((x) => x.id === appId);
                  if (a) openReviewModal(a);
                }}
              />

              <button
                onClick={handleLogout}
                className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-rose-600 text-xs font-bold transition flex items-center gap-1.5"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 print:p-0">

          {/* PRINT-ONLY HEADER FOR AUDIT COMPLIANCE */}
          <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
            <div className="text-center space-y-1">
              <h1 className="text-lg font-black uppercase text-slate-900 tracking-wide">
                {org?.name || 'CENTRAL HR DEPARTMENT & MANDAL SANSTHA'}
              </h1>
              <h2 className="text-base font-extrabold text-slate-800">
                {institute?.official_name || institute?.name}
              </h2>
              <p className="text-xs text-slate-600">
                {institute?.address_line || institute?.address}, Tal. {institute?.taluka}, Dist. {institute?.district} — DTE Code: {institute?.code || 'N/A'}
              </p>
              <h3 className="text-sm font-black text-slate-900 pt-2 uppercase tracking-wider underline">
                Staff Strength & Apex Body Sanctioned Posts Audit Matrix
              </h3>
              <p className="text-[10px] text-slate-500">
                Generated Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} | Regulatory Intake & Cadre Variance Report
              </p>
            </div>
          </div>

          {/* Review Action Success Toast Banner */}
          {reviewSuccessToast && (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-3xl shadow-lg flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 print:hidden">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-100" />
                </div>
                <div>
                  <p className="font-black text-sm">{reviewSuccessToast.msg}</p>
                  <p className="text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5" /> Automated alert dispatched to: <strong>{reviewSuccessToast.emailTo}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewSuccessToast(null)}
                className="p-2 rounded-xl hover:bg-white/20 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Top-Level Portal Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2.5 rounded-3xl border border-slate-200 shadow-sm print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setPortalSection('review');
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('tab');
                    window.history.replaceState(null, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
                    window.dispatchEvent(new Event('popstate'));
                  }
                }}
                className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2.5 ${
                  portalSection === 'review'
                    ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Candidate Dossier Review & Physical Interview</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    portalSection === 'review' ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {forwardedApplications.length}
                </span>
                {forwardedApplications.filter((a) => a.status === 'forwarded_to_institute').length > 0 && (
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"
                    title="Action Required: Review Pending"
                  />
                )}
              </button>

              <button
                onClick={() => {
                  setPortalSection('matrix');
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', 'matrix');
                    window.history.replaceState(null, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
                    window.dispatchEvent(new Event('popstate'));
                  }
                }}
                className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-2.5 ${
                  portalSection === 'matrix'
                    ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>Staff Strength & Sanctioned Matrix</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    portalSection === 'matrix' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {staffStrengths.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 pr-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>Unit:</span>
              <span className="px-2.5 py-1 bg-slate-100 rounded-xl text-slate-800">
                {institute?.short_name || institute?.name}
              </span>
            </div>
          </div>

          {/* SECTION: CANDIDATE DOSSIER REVIEW & PHYSICAL INTERVIEW WORKFLOW */}
          {portalSection === 'review' && (
            <section className="space-y-6 print:hidden">
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Forwarded */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Forwarded
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      {forwardedApplications.length}
                    </span>
                    <p className="text-[10px] text-slate-400">Applications assigned to your unit</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>

                {/* 2. Pending Physical Interview & Review */}
                <div className="bg-white rounded-3xl p-5 border border-amber-200/80 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-amber-50/30">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                      Pending Interview
                    </span>
                    <span className="text-2xl font-black text-amber-900">
                      {forwardedApplications.filter((a) => a.status === 'forwarded_to_institute').length}
                    </span>
                    <p className="text-[10px] text-amber-600 font-medium">Awaiting on-campus interview</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>

                {/* 3. Selected / Recommended */}
                <div className="bg-white rounded-3xl p-5 border border-emerald-200/80 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-emerald-50/30">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                      Selected / Recommended
                    </span>
                    <span className="text-2xl font-black text-emerald-900">
                      {
                        forwardedApplications.filter(
                          (a) =>
                            a.status === 'selected_recommended' ||
                            a.status === 'ready_for_physical_interview' ||
                            a.institute_recommendation === 'selected' ||
                            a.institute_recommendation === 'recommended'
                        ).length
                      }
                    </span>
                    <p className="text-[10px] text-emerald-600 font-medium">Positive selection logged</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>

                {/* 4. On Hold / Rejected */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Hold / Rejected
                    </span>
                    <span className="text-2xl font-black text-slate-800">
                      {
                        forwardedApplications.filter(
                          (a) =>
                            a.status === 'hold' ||
                            a.status === 'rejected' ||
                            a.institute_recommendation === 'hold' ||
                            a.institute_recommendation === 'rejected'
                        ).length
                      }
                    </span>
                    <p className="text-[10px] text-slate-400">Waitlist or disqualified</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Status Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Filter:
                  </span>
                  <button
                    onClick={() => {
                      setReviewStatusFilter('all');
                      if (typeof window !== 'undefined') {
                        const url = new URL(window.location.href);
                        url.searchParams.delete('filter');
                        window.history.replaceState(null, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
                        window.dispatchEvent(new Event('popstate'));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      reviewStatusFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({forwardedApplications.length})
                  </button>
                  <button
                    onClick={() => {
                      setReviewStatusFilter('pending');
                      if (typeof window !== 'undefined') {
                        const url = new URL(window.location.href);
                        url.searchParams.set('filter', 'pending');
                        window.history.replaceState(null, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
                        window.dispatchEvent(new Event('popstate'));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      reviewStatusFilter === 'pending'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Pending Interview</span>
                    <span className="px-1.5 py-0.2 bg-amber-700/20 rounded-md text-[10px]">
                      {forwardedApplications.filter((a) => a.status === 'forwarded_to_institute').length}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setReviewStatusFilter('selected');
                      if (typeof window !== 'undefined') {
                        const url = new URL(window.location.href);
                        url.searchParams.set('filter', 'selected');
                        window.history.replaceState(null, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
                        window.dispatchEvent(new Event('popstate'));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      reviewStatusFilter === 'selected'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Selected / Recommended</span>
                    <span className="px-1.5 py-0.2 bg-emerald-700/20 rounded-md text-[10px]">
                      {
                        forwardedApplications.filter(
                          (a) =>
                            a.status === 'selected_recommended' ||
                            a.status === 'ready_for_physical_interview' ||
                            a.institute_recommendation === 'selected' ||
                            a.institute_recommendation === 'recommended'
                        ).length
                      }
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setReviewStatusFilter('hold');
                      if (typeof window !== 'undefined') {
                        const url = new URL(window.location.href);
                        url.searchParams.set('filter', 'hold');
                        window.history.replaceState(null, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
                        window.dispatchEvent(new Event('popstate'));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      reviewStatusFilter === 'hold'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
                    }`}
                  >
                    Hold / Waitlist ({
                      forwardedApplications.filter(
                        (a) => a.status === 'hold' || a.institute_recommendation === 'hold'
                      ).length
                    })
                  </button>
                  <button
                    onClick={() => {
                      setReviewStatusFilter('rejected');
                      if (typeof window !== 'undefined') {
                        const url = new URL(window.location.href);
                        url.searchParams.set('filter', 'rejected');
                        window.history.replaceState(null, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
                        window.dispatchEvent(new Event('popstate'));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      reviewStatusFilter === 'rejected'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                    }`}
                  >
                    Rejected ({
                      forwardedApplications.filter(
                        (a) => a.status === 'rejected' || a.institute_recommendation === 'rejected'
                      ).length
                    })
                  </button>
                </div>

                {/* Live Search Input */}
                <div className="relative min-w-[260px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={candidateSearchQuery}
                    onChange={(e) => setCandidateSearchQuery(e.target.value)}
                    placeholder="Search name, App ID, mobile, post..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  {candidateSearchQuery && (
                    <button
                      onClick={() => setCandidateSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Candidate Applications Cards / Table */}
              {filteredCandidates.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-slate-800">
                    No Applications Found in this Filter
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {candidateSearchQuery || reviewStatusFilter !== 'all'
                      ? 'Try adjusting your search criteria or filter pills above.'
                      : 'When Central HR verifies candidate walk-in profiles and clicks "Forward to Institute Head", they will appear here instantly for on-campus physical interview and evaluation.'}
                  </p>
                  {(candidateSearchQuery || reviewStatusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setReviewStatusFilter('all');
                        setCandidateSearchQuery('');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCandidates.map((app) => {
                    const isPendingReview = app.status === 'forwarded_to_institute';
                    const isSelected =
                      app.status === 'selected_recommended' ||
                      app.status === 'ready_for_physical_interview' ||
                      app.institute_recommendation === 'selected' ||
                      app.institute_recommendation === 'recommended';
                    const isHold = app.status === 'hold' || app.institute_recommendation === 'hold';
                    const isRejected = app.status === 'rejected' || app.institute_recommendation === 'rejected';

                    return (
                      <div
                        key={app.id}
                        className={`bg-white rounded-3xl p-5 sm:p-6 border transition shadow-sm hover:shadow-md ${
                          isPendingReview
                            ? 'border-amber-300 ring-1 ring-amber-200/50'
                            : isSelected
                            ? 'border-emerald-300 ring-1 ring-emerald-100'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Candidate Primary Identity */}
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center text-lg font-black flex-shrink-0 shadow-md">
                              {app.candidate_name ? app.candidate_name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-black text-slate-900">
                                  {app.candidate_name}
                                </h3>
                                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                  #{app.application_no}
                                </span>
                                {isPendingReview && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                                    <Clock className="w-3 h-3" /> Action Required: Conduct Interview & Evaluate
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-xs">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Selected / Recommended
                                  </span>
                                )}
                                {isHold && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-300 flex items-center gap-1">
                                    <PauseCircle className="w-3 h-3 text-orange-700" /> On Hold / Waitlist
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                    <X className="w-3 h-3 text-rose-700" /> Rejected
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                <span className="font-bold text-indigo-700 flex items-center gap-1">
                                  <Briefcase className="w-3.5 h-3.5" />
                                  {app.posts?.title || app.custom_post_title || 'General Post'}
                                </span>
                                {app.program_stream && (
                                  <span className="text-slate-500 font-medium">
                                    • {app.program_stream}
                                  </span>
                                )}
                                {app.contact_no && (
                                  <span className="flex items-center gap-1 font-mono text-slate-600">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {app.contact_no}
                                  </span>
                                )}
                                {app.email_id && (
                                  <span className="flex items-center gap-1 text-slate-600">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    {app.email_id}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Actions */}
                          <div className="flex items-center gap-2.5 flex-shrink-0 self-start lg:self-center">
                            <button
                              onClick={() => openReviewModal(app)}
                              className={`px-5 py-2.5 rounded-2xl text-xs font-black shadow-md transition flex items-center gap-2 ${
                                isPendingReview
                                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white'
                                  : isSelected
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>{isPendingReview ? 'Conduct Interview & Evaluate' : 'Update Interview & Evaluation'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Central HR Remarks & Institute Evaluation Callout */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Central HR Section */}
                          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-1.5">
                            <div className="flex items-center justify-between text-[10.5px] font-bold text-indigo-900 uppercase tracking-wider">
                              <span className="flex items-center gap-1">
                                <Send className="w-3 h-3" /> Forwarded by Central HR
                              </span>
                              <span className="text-indigo-600 font-medium">
                                {app.forwarded_at
                                  ? new Date(app.forwarded_at).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'Recently'}
                              </span>
                            </div>
                            <p className="text-slate-700 font-medium italic">
                              "{app.central_hr_remarks || 'Pre-screened candidate profile forwarded for physical interview and evaluation.'}"
                            </p>
                            {app.forwarded_by && (
                              <span className="text-[10px] text-slate-500 block">
                                Forwarded By: <strong>{app.forwarded_by}</strong> (Central Desk)
                              </span>
                            )}
                          </div>

                          {/* Institute Head Physical Interview Evaluation Card */}
                          <div
                            className={`p-3.5 rounded-2xl border space-y-2 ${
                              isSelected
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                : isHold
                                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                : isRejected
                                ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                                : 'bg-slate-50 border-slate-200/80 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider">
                              <span className="flex items-center gap-1 font-black">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Physical Interview & Panel Outcome
                              </span>
                              {app.reviewed_at && (
                                <span className="text-slate-500 font-medium text-[10px]">
                                  {new Date(app.reviewed_at).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>

                            {app.interview_conducted_date || app.interview_venue ? (
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                                <span className="flex items-center gap-1 text-slate-700">
                                  <Calendar className="w-3 h-3 text-sky-600" />
                                  {app.interview_conducted_date
                                    ? new Date(app.interview_conducted_date).toLocaleString('en-IN', {
                                        dateStyle: 'short',
                                        timeStyle: 'short',
                                      })
                                    : 'Conducted'}
                                </span>
                                {app.interview_venue && (
                                  <span className="flex items-center gap-1 text-slate-700">
                                    <MapPin className="w-3 h-3 text-sky-600" />
                                    {app.interview_venue}
                                  </span>
                                )}
                                {typeof app.interview_score === 'number' && (
                                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-900 font-bold">
                                    Score: {app.interview_score}/100
                                  </span>
                                )}
                              </div>
                            ) : null}

                            {/* Document Verification Status Pill */}
                            {app.physical_docs_status && (
                              <div className="text-[10.5px] font-bold flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Original Documents:</span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] ${
                                    app.physical_docs_status === 'verified_all_clear'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : app.physical_docs_status === 'discrepancy_observed'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-sky-100 text-sky-800'
                                  }`}
                                >
                                  {app.physical_docs_status === 'verified_all_clear'
                                    ? '100% Verified & Authenticated'
                                    : app.physical_docs_status === 'discrepancy_observed'
                                    ? 'Discrepancy Observed'
                                    : 'Provisional'}
                                </span>
                              </div>
                            )}

                            {/* Panel Remarks */}
                            {app.interview_panel_remarks ? (
                              <p className="text-slate-800 font-medium text-[11.5px] leading-snug">
                                <strong>Panel Remarks:</strong> "{app.interview_panel_remarks}"
                              </p>
                            ) : app.institute_remarks ? (
                              <p className="text-slate-800 font-medium text-[11.5px] leading-snug">
                                <strong>Remarks:</strong> "{app.institute_remarks}"
                              </p>
                            ) : (
                              <p className="text-slate-400 italic">
                                Physical interview evaluation pending by Principal / Selection Panel.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* SECTION: STAFF STRENGTH & APEX BODY SANCTIONED POSTS MATRIX (FEATURE A) */}
          <div className={portalSection === 'matrix' ? 'space-y-8' : 'hidden print:block space-y-8'}>
            {institute ? (
            <>
              {/* SECTION: STAFF STRENGTH & APEX BODY SANCTIONED POSTS MATRIX (FEATURE A) */}
              <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 print:border-none print:shadow-none print:p-0">
                
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-sky-600" />
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        Staff Strength & Apex Body Sanctioned Posts Matrix
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500">
                      Map teaching & non-teaching designations to compare apex body approved posts with active strength and compute real-time variances.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 print:hidden">
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
                      title="Refresh Staff Matrix"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>

                    <button
                      onClick={handlePrintSheet}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      title="Print Audit Matrix"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                      <span>Print Audit Sheet</span>
                    </button>

                    <button
                      onClick={() => {
                        setNewPostTitle('');
                        setNewPostCategoryId(categories[0]?.id || '');
                        setNewPostStream(courses[0]?.program_stream || 'All Programs / General');
                        setNewPostQual('');
                        setCreatePostError(null);
                        setShowCreatePostModal(true);
                      }}
                      className="px-3.5 py-2 border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
                      title="Create New Job Designation"
                    >
                      <Briefcase className="w-4 h-4 text-sky-600" />
                      <span>+ New Designation</span>
                    </button>

                    <button
                      onClick={handleOpenAddModal}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Map Designation / Post</span>
                    </button>
                  </div>
                </div>

                {/* KPI Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
                  {/* Card 1: Total Sanctioned */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                      Sanctioned Posts
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-slate-900">{totalSanctioned}</span>
                      <span className="text-[11px] text-slate-400 font-semibold">Apex Body</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium pt-0.5">Approved Regulatory Intake</p>
                  </div>

                  {/* Card 2: Total Available */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                      Available Strength
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-slate-900">{totalAvailable}</span>
                      <span className="text-[11px] text-slate-400 font-semibold">Active Staff</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium pt-0.5">Currently On-Roll & Working</p>
                  </div>

                  {/* Card 3: Net Variance */}
                  <div className={`p-4 rounded-2xl border space-y-1 ${
                    netVariance < 0
                      ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                      : netVariance > 0
                      ? 'bg-sky-50/80 border-sky-200 text-sky-900'
                      : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  }`}>
                    <span className="text-[10.5px] font-bold uppercase tracking-wider block opacity-80">
                      Net Variance
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black">
                        {netVariance > 0 ? `+${netVariance}` : netVariance}
                      </span>
                      <span className="text-[11px] font-bold">
                        {netVariance < 0 ? 'Deficit' : netVariance > 0 ? 'Surplus' : 'Balanced'}
                      </span>
                    </div>
                    <p className="text-[10.5px] font-bold pt-0.5 flex items-center gap-1">
                      {netVariance < 0 ? (
                        <>
                          <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                          <span>{Math.abs(netVariance)} Total Vacancies</span>
                        </>
                      ) : netVariance > 0 ? (
                        <>
                          <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                          <span>{netVariance} Excess Staff</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Full Strength Filled</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Card 4: Teaching Posts Breakdown */}
                  <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-1">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-800 block">
                      Teaching Cadre
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-black text-purple-950">
                        {teachingAvailable} / {teachingSanctioned}
                      </span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        teachingVariance < 0
                          ? 'bg-rose-100 text-rose-700'
                          : teachingVariance > 0
                          ? 'bg-purple-200 text-purple-800'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {teachingVariance > 0 ? `+${teachingVariance}` : teachingVariance} Var
                      </span>
                    </div>
                    <p className="text-[10px] text-purple-700 font-medium pt-0.5">
                      {teachingItems.length} Mapped Teaching Posts
                    </p>
                  </div>

                  {/* Card 5: Non-Teaching Common Pool Breakdown */}
                  <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-teal-800 block">
                      Non-Teaching Pool
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-black text-teal-950">
                        {nonTeachingAvailable} / {nonTeachingSanctioned}
                      </span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        nonTeachingVariance < 0
                          ? 'bg-rose-100 text-rose-700'
                          : nonTeachingVariance > 0
                          ? 'bg-teal-200 text-teal-800'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {nonTeachingVariance > 0 ? `+${nonTeachingVariance}` : nonTeachingVariance} Var
                      </span>
                    </div>
                    <p className="text-[10px] text-teal-700 font-medium pt-0.5">
                      Central Pool across Trust
                    </p>
                  </div>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 print:hidden">
                  {/* Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'all'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <span>All Designations</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                        {staffStrengths.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('teaching')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'teaching'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Teaching (Program-Wise)</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        activeTab === 'teaching' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {teachingItems.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('non_teaching')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'non_teaching'
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Non-Teaching (Common Pool)</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        activeTab === 'non_teaching' ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {nonTeachingItems.length}
                      </span>
                    </button>
                  </div>

                  {/* Search Filter */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search designation, course, regulatory body..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-72 pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Staff Strength Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10.5px]">
                        <th className="py-3 px-3.5">Cadre & Designation</th>
                        <th className="py-3 px-3.5">Program / Course Mapping</th>
                        <th className="py-3 px-3.5">Apex Regulatory Body</th>
                        <th className="py-3 px-3 text-center">Sanctioned Posts</th>
                        <th className="py-3 px-3 text-center">Available Strength</th>
                        <th className="py-3 px-3 text-center">Variance (Avail - Sanc)</th>
                        <th className="py-3 px-3.5">Remarks / Cadre Norm</th>
                        <th className="py-3 px-3 text-right print:hidden">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStaffStrengths.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                            No designations found matching the filter. Click "Map Designation / Post" above to add.
                          </td>
                        </tr>
                      ) : (
                        filteredStaffStrengths.map((item) => {
                          const varianceVal = calculateStaffVariance(item.available_strength, item.sanctioned_posts);
                          const isDeficit = varianceVal < 0;
                          const isSurplus = varianceVal > 0;
                          const isBalanced = varianceVal === 0;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Designation & Post Type */}
                              <td className="py-3 px-3.5">
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-slate-900 block text-xs">
                                    {item.posts?.title || 'Custom Post Requirement'}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                                      item.post_type === 'Teaching'
                                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                        : 'bg-teal-100 text-teal-800 border border-teal-200'
                                    }`}>
                                      {item.post_type}
                                    </span>
                                    {item.posts?.staff_categories?.name && (
                                      <span className="text-[10px] text-slate-400">
                                        ({item.posts.staff_categories.name})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Program / Course Mapping */}
                              <td className="py-3 px-3.5">
                                {item.post_type === 'Teaching' ? (
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-slate-800 block text-xs">
                                      {item.institute_courses?.course_name || item.program_stream || 'General Academic'}
                                    </span>
                                    <span className="text-[10.5px] text-purple-700 font-semibold block">
                                      {item.program_stream || 'Stream specific'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-slate-700 block text-xs">
                                      {item.program_stream || 'General / Administrative'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                                      🏛️ Central Common Pool
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Regulatory Body */}
                              <td className="py-3 px-3.5 text-slate-700 font-medium">
                                <span className="px-2 py-1 rounded-lg bg-slate-100 font-semibold text-slate-800 text-[11px]">
                                  {item.regulatory_body || 'AICTE / Apex Body'}
                                </span>
                              </td>

                              {/* Sanctioned Posts */}
                              <td className="py-3 px-3 text-center">
                                <span className="text-sm font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                                  {item.sanctioned_posts}
                                </span>
                              </td>

                              {/* Available Strength */}
                              <td className="py-3 px-3 text-center">
                                <span className="text-sm font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                                  {item.available_strength}
                                </span>
                              </td>

                              {/* Variance Badge */}
                              <td className="py-3 px-3 text-center">
                                {isDeficit ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-extrabold text-xs border border-rose-200">
                                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                                    <span>{varianceVal} Deficit</span>
                                  </span>
                                ) : isSurplus ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-extrabold text-xs border border-sky-200">
                                    <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                                    <span>+{varianceVal} Surplus</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-200">
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Balanced (0)</span>
                                  </span>
                                )}
                              </td>

                              {/* Remarks */}
                              <td className="py-3 px-3.5 text-slate-600 text-[11px] max-w-xs truncate">
                                {item.remarks || '—'}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3 text-right print:hidden">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenEditModal(item)}
                                    className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                                    title="Edit Post Mapping"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMapping(item.id, item.posts?.title)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="Delete Mapping"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 font-bold text-slate-900">
                      <tr>
                        <td colSpan={3} className="py-3 px-3.5 uppercase tracking-wider text-[11px]">
                          Total Consolidated Strength
                        </td>
                        <td className="py-3 px-3 text-center text-sm font-black">
                          {filteredStaffStrengths.reduce((acc, c) => acc + (Number(c.sanctioned_posts) || 0), 0)}
                        </td>
                        <td className="py-3 px-3 text-center text-sm font-black">
                          {filteredStaffStrengths.reduce((acc, c) => acc + (Number(c.available_strength) || 0), 0)}
                        </td>
                        <td className="py-3 px-3 text-center text-sm font-black">
                          {(() => {
                            const filteredSanc = filteredStaffStrengths.reduce((acc, c) => acc + (Number(c.sanctioned_posts) || 0), 0);
                            const filteredAvail = filteredStaffStrengths.reduce((acc, c) => acc + (Number(c.available_strength) || 0), 0);
                            const fVar = calculateStaffVariance(filteredAvail, filteredSanc);
                            return (
                              <span className={fVar < 0 ? 'text-rose-600' : fVar > 0 ? 'text-sky-600' : 'text-emerald-600'}>
                                {fVar > 0 ? `+${fVar}` : fVar}
                              </span>
                            );
                          })()}
                        </td>
                        <td colSpan={2} className="py-3 px-3.5 text-[11px] text-slate-500 font-normal">
                          Formula: Variance = Available Strength - Sanctioned Posts
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* PRINT-ONLY SIGNATURE BLOCK */}
                <div className="hidden print:grid grid-cols-3 gap-8 pt-16 text-center text-xs">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold text-slate-900">Prepared By</p>
                    <p className="text-[10px] text-slate-500">Institute HR / Establishment Clerk</p>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold text-slate-900">
                      {institute?.head_name || 'Principal / Director'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Head of Institute ({institute?.head_designation || 'Principal'})
                    </p>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold text-slate-900">Head of Central HR</p>
                    <p className="text-[10px] text-slate-500">Central HR Department, Sanstha</p>
                  </div>
                </div>

              </section>

              {/* SECTION: INSTITUTE PROFILE & COURSES OVERVIEW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">

                {/* Left Col (2): Institute Identity & Programmes */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Unit Info Card */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-sky-600" />
                        <h3 className="text-base font-bold text-slate-900">Institute Master Profile</h3>
                      </div>
                      <span className="px-3 py-1 bg-sky-50 text-sky-800 text-xs font-bold rounded-full border border-sky-200">
                        {institute.institute_type}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1 text-xs">
                      <div className="p-3 bg-slate-50 rounded-2xl">
                        <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Short Name</span>
                        <span className="font-bold text-slate-800 text-sm">{institute.short_name || '—'}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl">
                        <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Institute / DTE Code</span>
                        <span className="font-bold text-slate-800 text-sm">{institute.code || '—'}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl">
                        <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Established</span>
                        <span className="font-bold text-slate-800 text-sm">{institute.establishment_year || '—'}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 pt-2 space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{institute.address_line || institute.address}, Tal. {institute.taluka}, Dist. {institute.district} - {institute.pincode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-sky-600 flex-shrink-0" />
                        <span>{institute.official_email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Courses Card */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-purple-600" />
                        <h3 className="text-base font-bold text-slate-900">Academic Programmes & Sanctioned Intake</h3>
                      </div>
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                        {courses.length} Programmes
                      </span>
                    </div>

                    {courses.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">No courses registered yet under this unit.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                              <th className="py-2 px-3">Discipline</th>
                              <th className="py-2 px-3">Programme</th>
                              <th className="py-2 px-3">Level</th>
                              <th className="py-2 px-3">Duration</th>
                              <th className="py-2 px-3 text-right">Intake</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {courses.map((crs, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-100">
                                    {crs.program_stream || 'Engineering & Technology'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-800">{crs.course_name}</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                    {crs.level}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">{crs.duration_years || '—'}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">{crs.sanctioned_intake || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Col (1): Head Details & Approvals */}
                <div className="space-y-6">

                  {/* Head / Principal Card */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <User className="w-5 h-5 text-sky-600" />
                      <h3 className="text-base font-bold text-slate-900">Head of Institute</h3>
                    </div>

                    <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
                          {institute.head_designation || 'Principal'}
                        </span>
                        <span className="text-base font-extrabold text-slate-900">
                          {institute.head_name || 'Not Designated'}
                        </span>
                      </div>

                      {institute.head_mobile && (
                        <div className="flex items-center gap-2 text-slate-700 pt-1">
                          <Phone className="w-3.5 h-3.5 text-sky-600" />
                          <span>+91 {institute.head_mobile}</span>
                        </div>
                      )}

                      {institute.head_email && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-sky-600" />
                          <span className="break-all">{institute.head_email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Apex Approvals Summary */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-base font-bold text-slate-900">Recognitions & Approvals</h3>
                    </div>

                    <div className="space-y-2.5">
                      {approvals.map((app, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                          <span className="font-bold text-slate-800 block">{app.body_name}</span>
                          {app.reference_no && (
                            <span className="text-slate-500 text-[11px] block mt-0.5">Ref: {app.reference_no}</span>
                          )}
                        </div>
                      ))}
                      {approvals.length === 0 && (
                        <p className="text-xs text-slate-500 italic">No approvals listed.</p>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Institutes Created Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Please ask the Central HR Admin to create an institute under the Trust via the Institute Master screen.
              </p>
            </div>
          )}
          </div>

        </main>

        {/* MODAL: MAP DESIGNATION & SANCTIONED POST MATRIX */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in duration-150">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-sky-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    {editingItem ? 'Edit Staff Strength Mapping' : 'Map Designation & Sanctioned Posts'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {feedbackMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  feedbackMsg.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {feedbackMsg.text}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
                
                {/* 1. Select Designation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      * Job Designation (From Admin Master)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPostTitle('');
                        setNewPostCategoryId(categories[0]?.id || '');
                        setNewPostStream(courses[0]?.program_stream || 'All Programs / General');
                        setNewPostQual('');
                        setCreatePostError(null);
                        setShowCreatePostModal(true);
                      }}
                      className="text-sky-600 hover:text-sky-800 font-bold text-[11px] flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> + New Designation
                    </button>
                  </div>
                  <select
                    required
                    value={formPostId}
                    onChange={(e) => {
                      if (e.target.value === '__create_new__') {
                        setNewPostTitle('');
                        setNewPostCategoryId(categories[0]?.id || '');
                        setNewPostStream(courses[0]?.program_stream || 'All Programs / General');
                        setNewPostQual('');
                        setCreatePostError(null);
                        setShowCreatePostModal(true);
                      } else {
                        handlePostChange(e.target.value);
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
                    <option value="__create_new__">➕ + Add New Job Designation (नवीन पद तयार करा)...</option>
                  </select>
                </div>

                {/* 2. Cadre Type Radio (Teaching vs Non-Teaching) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 cursor-pointer transition ${
                    formPostType === 'Teaching'
                      ? 'border-purple-600 bg-purple-50/50 text-purple-950 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="cadreType"
                      value="Teaching"
                      checked={formPostType === 'Teaching'}
                      onChange={() => {
                        setFormPostType('Teaching');
                        if (courses.length > 0) {
                          setFormProgramStream(courses[0].program_stream || 'Engineering & Technology');
                        }
                      }}
                      className="sr-only"
                    />
                    <GraduationCap className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <div>
                      <span className="block text-xs">Teaching Cadre</span>
                      <span className="text-[10px] text-purple-700 font-normal">Program-Wise Mapping</span>
                    </div>
                  </label>

                  <label className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 cursor-pointer transition ${
                    formPostType === 'Non-Teaching'
                      ? 'border-teal-600 bg-teal-50/50 text-teal-950 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="cadreType"
                      value="Non-Teaching"
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

                {/* 3. Program Mapping (if Teaching) or Common Pool Badge (if Non-Teaching) */}
                {formPostType === 'Teaching' ? (
                  <div className="space-y-3 p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100">
                    <div>
                      <label className="block font-bold text-purple-900 uppercase tracking-wider text-[10.5px] mb-1">
                        * Academic Course / Programme (Run by {institute?.short_name || 'Institute'})
                      </label>
                      <select
                        value={formCourseId}
                        onChange={(e) => {
                          setFormCourseId(e.target.value);
                          const crs = courses.find((c) => c.id === e.target.value);
                          if (crs && crs.program_stream) {
                            setFormProgramStream(crs.program_stream);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="">-- Institute General Academic Faculty --</option>
                        {courses.map((crs) => (
                          <option key={crs.id} value={crs.id}>
                            {crs.course_name} ({crs.level}) — Intake: {crs.sanctioned_intake}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-purple-900 uppercase tracking-wider text-[10.5px] mb-1">
                        Discipline / Program Stream
                      </label>
                      <input
                        type="text"
                        value={formProgramStream}
                        onChange={(e) => setFormProgramStream(e.target.value)}
                        placeholder="e.g. Engineering & Technology, Pharmacy, Management"
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200 text-teal-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Central Common Pool Designation</span>
                    </div>
                    <p className="text-[11px] text-teal-700">
                      Non-teaching personnel (administrative, lab assistants, security, housekeeping) are pooled centrally across all institutes within the Trust/Mandal for flexible deployment.
                    </p>
                  </div>
                )}

                {/* 4. Regulatory Apex Body */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Apex Regulatory Body / Approving Authority
                  </label>
                  <select
                    value={formRegulatoryBody}
                    onChange={(e) => setFormRegulatoryBody(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="AICTE / Regulatory Body">AICTE (All India Council for Technical Education)</option>
                    <option value="UGC / Apex Body">UGC (University Grants Commission)</option>
                    <option value="PCI / Apex Body">PCI (Pharmacy Council of India)</option>
                    <option value="MSBTE / Apex Body">MSBTE (Maharashtra State Board of Technical Education)</option>
                    <option value="Affiliating University">Affiliating University Norms</option>
                    <option value="DTE Maharashtra">DTE Maharashtra</option>
                    <option value="Sanstha Internal Trust Norms">Sanstha / Trust Approved Cadre Norms</option>
                  </select>
                </div>

                {/* 5. Sanctioned Posts & Available Strength Inputs */}
                <div className="grid grid-cols-2 gap-3.5 pt-1">
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
                      placeholder="e.g. 12"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-base focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Approved by Apex Body</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      * Available Staff Strength
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formAvailable}
                      onChange={(e) => setFormAvailable(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                      placeholder="e.g. 9"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-base focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Currently active on-roll</span>
                  </div>
                </div>

                {/* 6. AUTOMATED REAL-TIME VARIANCE PREVIEW CARD */}
                {(() => {
                  const previewVariance = calculateStaffVariance(Number(formAvailable) || 0, Number(formSanctioned) || 0);
                  const isNeg = previewVariance < 0;
                  const isPos = previewVariance > 0;

                  return (
                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      isNeg
                        ? 'bg-rose-50 border-rose-200 text-rose-950'
                        : isPos
                        ? 'bg-sky-50 border-sky-200 text-sky-950'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    }`}>
                      <div>
                        <span className="font-extrabold uppercase tracking-wider text-[10px] block opacity-80">
                          Automated Real-Time Variance
                        </span>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {isNeg ? (
                            <>
                              <TrendingDown className="w-4 h-4 text-rose-600" />
                              <span className="text-sm font-black text-rose-800">
                                {previewVariance} Deficit ({Math.abs(previewVariance)} Vacant Posts to Recruit)
                              </span>
                            </>
                          ) : isPos ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-sky-600" />
                              <span className="text-sm font-black text-sky-800">
                                +{previewVariance} Surplus ({previewVariance} Excess Staff Deployed)
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-black text-emerald-800">
                                Balanced (0) — 100% Strength Filled
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-[10.5px] font-bold text-slate-500">
                        Formula: {formAvailable || 0} - {formSanctioned || 0}
                      </div>
                    </div>
                  );
                })()}

                {/* 7. Remarks */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Regulatory Remarks / Cadre Ratio Norms (Optional)
                  </label>
                  <input
                    type="text"
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    placeholder="e.g. Cadre ratio 1:2:6 norm, AICTE Approval Letter dated 2026"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition shadow-md active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingItem ? 'Update Mapping' : 'Save & Map Designation'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* MODAL: CREATE NEW JOB DESIGNATION (BY INSTITUTE HEAD) */}
        {showCreatePostModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-sky-600" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Create New Job Designation
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Institute Head • Define new teaching or non-teaching role
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreatePostModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {createPostError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                  {createPostError}
                </div>
              )}

              <form onSubmit={handleCreateNewPost} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-1">
                    * Designation Title / Name (पदाचे नाव)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Assistant Professor (Robotics & AI) / Senior Lab Instructor"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-1">
                      * Staff Category (संवर्ग)
                    </label>
                    <select
                      required
                      value={newPostCategoryId}
                      onChange={(e) => setNewPostCategoryId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-1">
                      Discipline / Program Stream
                    </label>
                    <select
                      value={newPostStream}
                      onChange={(e) => setNewPostStream(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    >
                      {programStreamOptions.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-1">
                    Minimum Qualification Requirement (पर्यायी)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. M.Tech / Ph.D in relevant branch as per AICTE norms"
                    value={newPostQual}
                    onChange={(e) => setNewPostQual(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreatePostModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingPost}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {creatingPost ? 'Creating...' : <><Plus className="w-4 h-4" /> Save Designation</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: CANDIDATE DOSSIER REVIEW & PHYSICAL INTERVIEW (FEATURE 2) ================= */}
        {selectedReviewApp && (
          <div className="candidate-print-root fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full my-auto overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md">
                    {selectedReviewApp.candidate_name ? selectedReviewApp.candidate_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        {selectedReviewApp.candidate_name}
                      </h3>
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">
                        #{selectedReviewApp.application_no}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>Applied for: <strong>{selectedReviewApp.posts?.title || selectedReviewApp.custom_post_title || 'General Post'}</strong></span>
                      {selectedReviewApp.program_stream && <span>• {selectedReviewApp.program_stream}</span>}
                      <span>• Unit: <strong>{institute?.short_name || institute?.name}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 no-print">
                <button type="button" onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5">
                  <Printer className="w-4 h-4" /> Print Application / Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReviewApp(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
                </div>
              </div>

              {/* Modal Body: 2-Column Grid */}
              <div className="overflow-y-auto p-5 sm:p-6 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* LEFT COLUMN: CANDIDATE DOSSIER & VERIFIED CREDENTIALS (7 COLS) */}
                  <div className="lg:col-span-7 print:col-span-12 space-y-5">
                    
                    {/* 1. Central HR Pre-screening Dossier Callout */}
                    <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-indigo-600" /> Pre-screening Remarks by Central HR
                        </span>
                        <span className="text-indigo-600 font-medium">
                          {selectedReviewApp.forwarded_at
                            ? new Date(selectedReviewApp.forwarded_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Central HR'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed italic">
                        "{selectedReviewApp.central_hr_remarks || 'Candidate has been pre-screened and forwarded for Institute Head evaluation and physical interview recommendation.'}"
                      </p>
                      {selectedReviewApp.forwarded_by && (
                        <p className="text-[10.5px] text-slate-500 font-medium pt-0.5">
                          Forwarded by: <strong>{selectedReviewApp.forwarded_by}</strong> (Recruitment Desk)
                        </p>
                      )}
                    </div>

                    {/* 2. Candidate Personal & Contact Profile */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Candidate Personal Details & Contact
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Mobile</span>
                          <span className="font-mono font-bold text-slate-900">{selectedReviewApp.contact_no}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Email ID</span>
                          <span className="text-slate-800 truncate block">{selectedReviewApp.email_id || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Age / DOB</span>
                          <span className="text-slate-800">
                            {selectedReviewApp.dob ? selectedReviewApp.dob : '—'}{' '}
                            {selectedReviewApp.age ? `(${selectedReviewApp.age} Yrs)` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                          <span className="font-semibold text-slate-800">
                            {selectedReviewApp.staff_categories?.name || 'General'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Marital Status</span>
                          <span className="text-slate-800">{selectedReviewApp.is_married ? 'Married' : 'Single'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Residential Address</span>
                          <span className="text-slate-800 block" title={selectedReviewApp.address}>
                            {[selectedReviewApp.village_city, selectedReviewApp.taluka && `Taluka ${selectedReviewApp.taluka}`, selectedReviewApp.district && `District ${selectedReviewApp.district}`, selectedReviewApp.state, selectedReviewApp.pin_code && `PIN ${selectedReviewApp.pin_code}`].filter(Boolean).join(', ') || selectedReviewApp.address || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Academic Qualifications & Degrees */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Academic Qualifications & Degrees
                        </span>
                        {selectedReviewApp.qualification_summary && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            {selectedReviewApp.qualification_summary}
                          </span>
                        )}
                      </div>

                      {selectedReviewApp.application_education && selectedReviewApp.application_education.length > 0 ? (
                        <div className="space-y-1.5">
                          {selectedReviewApp.application_education.map((edu, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {edu.level}: {edu.degree_name || 'Degree'}
                                </span>
                                <span className="text-slate-500 text-[11px]">
                                  {edu.board_university} {edu.passing_year ? `• Year ${edu.passing_year}` : ''}
                                </span>
                              </div>
                              <div className="text-right">
                                {edu.marking_system === 'cgpa' && edu.cgpa != null ? (
                                  <span className="font-black text-indigo-700 block">{edu.cgpa} / {edu.cgpa_scale || 10} CGPA</span>
                                ) : edu.percentage ? (
                                  <span className="font-black text-indigo-700 block">{edu.percentage}%</span>
                                ) : null}
                                {edu.status_remark && (
                                  <span className="text-[10px] text-slate-500">{edu.status_remark}</span>
                                )}
                                {edu.doc_url && <a href={edu.doc_url} target="_blank" rel="noreferrer" className="block mt-1 text-[10px] font-bold text-sky-700 underline">View certificate</a>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          Summary: {selectedReviewApp.qualification_summary || 'Graduation / Post Graduation on record.'}
                        </p>
                      )}
                    </div>

                    {/* 4. Experience Details */}
                    {selectedReviewApp.application_experience && selectedReviewApp.application_experience.length > 0 && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Work Experience
                        </span>
                        <div className="space-y-1.5">
                          {selectedReviewApp.application_experience.map((exp, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {exp.is_fresher ? 'Fresher' : exp.organization_name}
                                </span>
                                {!exp.is_fresher && exp.designation && (
                                  <span className="text-slate-500 text-[11px]">{exp.designation}</span>
                                )}
                              </div>
                              {!exp.is_fresher && exp.years_experience && (
                                <span className="font-bold text-slate-800">{exp.years_experience} Years</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 5. Verified Uploaded Documents & Credentials */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Verified Documents & Attachments
                      </span>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {selectedReviewApp.resume_url ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                title: `${selectedReviewApp.candidate_name} - Resume / CV`,
                                url: selectedReviewApp.resume_url!,
                              })
                            }
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 text-indigo-700 font-bold flex items-center gap-1.5 transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Resume / CV</span>
                            <Eye className="w-3 h-3 text-slate-400" />
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-slate-400 font-medium">
                            Resume: Hard Copy
                          </span>
                        )}

                        {selectedReviewApp.aadhaar_doc_url && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                title: `${selectedReviewApp.candidate_name} - Aadhaar Card`,
                                url: selectedReviewApp.aadhaar_doc_url!,
                              })
                            }
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl hover:bg-sky-50 hover:border-sky-300 text-sky-700 font-bold flex items-center gap-1.5 transition"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Aadhaar Card</span>
                            <Eye className="w-3 h-3 text-slate-400" />
                          </button>
                        )}

                        {selectedReviewApp.pan_doc_url && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                title: `${selectedReviewApp.candidate_name} - PAN Card`,
                                url: selectedReviewApp.pan_doc_url!,
                              })
                            }
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl hover:bg-sky-50 hover:border-sky-300 text-sky-700 font-bold flex items-center gap-1.5 transition"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>PAN Card</span>
                            <Eye className="w-3 h-3 text-slate-400" />
                          </button>
                        )}

                        {selectedReviewApp.caste_cert_url && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                title: `${selectedReviewApp.candidate_name} - Caste Certificate`,
                                url: selectedReviewApp.caste_cert_url!,
                              })
                            }
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl hover:bg-amber-50 hover:border-amber-300 text-amber-700 font-bold flex items-center gap-1.5 transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Caste Certificate</span>
                            <Eye className="w-3 h-3 text-slate-400" />
                          </button>
                        )}

                        {selectedReviewApp.fee_receipts && selectedReviewApp.fee_receipts.length > 0 && (
                          <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Fee Receipt: #{selectedReviewApp.fee_receipts[0].receipt_no}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="hidden print:block border border-slate-300 rounded-xl p-3 text-xs space-y-1.5">
                      <h4 className="font-black uppercase">Institute Interview Evaluation Record</h4>
                      <p><strong>Recommendation:</strong> {selectedReviewApp.institute_recommendation || reviewRecommendation}</p>
                      <p><strong>Interview date / venue:</strong> {selectedReviewApp.interview_conducted_date || interviewConductedDate || '—'} / {selectedReviewApp.interview_venue || interviewVenue || '—'}</p>
                      <p><strong>Panel members:</strong> {selectedReviewApp.interview_panel_members || interviewPanelMembers || '—'}</p>
                      <p><strong>Panel performance notes:</strong> {selectedReviewApp.interview_panel_remarks || interviewPanelRemarks || '—'}</p>
                      <p><strong>Institute remarks:</strong> {selectedReviewApp.institute_remarks || reviewRemarks || '—'}</p>
                      <p><strong>Original document check:</strong> {selectedReviewApp.physical_docs_remarks || physicalDocsRemarks || '—'}</p>
                      {selectedReviewApp.interview_evaluation_report_url && <p><strong>Signed evaluation report:</strong> {selectedReviewApp.interview_evaluation_report_url}</p>}
                      {selectedReviewApp.head_signature_url && <p><strong>Head signature record:</strong> {selectedReviewApp.head_signature_url}</p>}
                    </div>

                  </div>

                  {/* RIGHT COLUMN: INSTITUTE HEAD PHYSICAL INTERVIEW & EVALUATION FORM (5 COLS) */}
                  <div className="lg:col-span-5 space-y-4 no-print">
                    <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-sky-600" />
                          Campus Physical Interview & Evaluation
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Record interview performance, verify original certificates, and assign final recommendation.
                        </p>
                      </div>

                      <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
                        
                        {/* 1. PHYSICAL INTERVIEW DATE, TIME & VENUE NOTES */}
                        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2.5">
                          <span className="font-black text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-sky-800">
                            <Calendar className="w-3.5 h-3.5 text-sky-600" />
                            1. Physical Interview Date & Venue Details
                          </span>

                          <div className="space-y-2">
                            <div>
                              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-0.5">
                                Physical Interview Date & Time <span className="text-rose-600">*</span>
                              </label>
                              <input
                                type="datetime-local"
                                required
                                value={interviewConductedDate}
                                onChange={(e) => setInterviewConductedDate(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-sky-500"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-0.5">
                                Campus Venue / Room / Location Notes <span className="text-rose-600">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={interviewVenue}
                                onChange={(e) => setInterviewVenue(e.target.value)}
                                placeholder="e.g. Principal Boardroom / Conference Hall, Admin Wing"
                                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-sky-500"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-0.5">
                                Selection Panel Committee Members
                              </label>
                              <input
                                type="text"
                                value={interviewPanelMembers}
                                onChange={(e) => setInterviewPanelMembers(e.target.value)}
                                placeholder="e.g. Dr. A. P. Patil (Principal), Prof. R. Joshi (HOD), Dr. S. Rao (Subject Expert)"
                                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-sky-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 2. INTERVIEW PANEL REMARKS & PERFORMANCE NOTES */}
                        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2.5">
                          <span className="font-black text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-indigo-800">
                            <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                            2. Interview Panel Remarks & Performance Notes
                          </span>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[9.5px] mb-0.5">
                                Domain / Interview Score (/100)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={interviewScore}
                                onChange={(e) => setInterviewScore(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="e.g. 85"
                                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[9.5px] mb-0.5">
                                Teaching Demo / Viva (/100)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={interviewTeachingDemoScore}
                                onChange={(e) => setInterviewTeachingDemoScore(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="e.g. 88"
                                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-0.5">
                              * Interview Panel Remarks & Performance Notes <span className="text-rose-600">*</span>
                            </label>
                            <textarea
                              rows={3}
                              required
                              value={interviewPanelRemarks}
                              onChange={(e) => setInterviewPanelRemarks(e.target.value)}
                              placeholder="e.g. Candidate demonstrated deep conceptual clarity in the subject matter. Lecture demonstration on blackboard was engaging, structured, and technically sound. Good communication skills and impressive research portfolio."
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed text-xs"
                            />
                          </div>
                        </div>

                        {/* 3. DOCUMENT VERIFICATION STATUS OF ORIGINAL CERTIFICATES */}
                        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2.5">
                          <span className="font-black text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5 text-teal-800">
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                            3. Physical Document Verification of Original Certificates
                          </span>

                          <div className="space-y-1.5">
                            <label
                              className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                                physicalDocsStatus === 'verified_all_clear'
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="radio"
                                name="docVerif"
                                value="verified_all_clear"
                                checked={physicalDocsStatus === 'verified_all_clear'}
                                onChange={() => setPhysicalDocsStatus('verified_all_clear')}
                                className="sr-only"
                              />
                              <CheckCircle2 className={`w-4 h-4 ${physicalDocsStatus === 'verified_all_clear' ? 'text-emerald-600' : 'text-slate-400'}`} />
                              <div className="text-[11px]">
                                <span className="block font-bold">All Originals Verified & Authenticated (100% Clear)</span>
                                <span className="text-[10px] text-slate-500 font-normal">Original marksheets, degrees, and experience letters matched copies.</span>
                              </div>
                            </label>

                            <label
                              className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                                physicalDocsStatus === 'discrepancy_observed'
                                  ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="radio"
                                name="docVerif"
                                value="discrepancy_observed"
                                checked={physicalDocsStatus === 'discrepancy_observed'}
                                onChange={() => setPhysicalDocsStatus('discrepancy_observed')}
                                className="sr-only"
                              />
                              <AlertCircle className={`w-4 h-4 ${physicalDocsStatus === 'discrepancy_observed' ? 'text-amber-600' : 'text-slate-400'}`} />
                              <div className="text-[11px]">
                                <span className="block font-bold">Discrepancy / Incomplete Documents Observed</span>
                                <span className="text-[10px] text-slate-500 font-normal">Document discrepancy found during physical inspection.</span>
                              </div>
                            </label>

                            <label
                              className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                                physicalDocsStatus === 'provisional_pending_docs'
                                  ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="radio"
                                name="docVerif"
                                value="provisional_pending_docs"
                                checked={physicalDocsStatus === 'provisional_pending_docs'}
                                onChange={() => setPhysicalDocsStatus('provisional_pending_docs')}
                                className="sr-only"
                              />
                              <Clock className={`w-4 h-4 ${physicalDocsStatus === 'provisional_pending_docs' ? 'text-sky-600' : 'text-slate-400'}`} />
                              <div className="text-[11px]">
                                <span className="block font-bold">Provisional Clearance (Pending Submission of Original)</span>
                                <span className="text-[10px] text-slate-500 font-normal">Cleared conditionally; candidate must submit missing certificate.</span>
                              </div>
                            </label>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-0.5">
                              Original Certificates Verified Notes
                            </label>
                            <input
                              type="text"
                              value={physicalDocsRemarks}
                              onChange={(e) => setPhysicalDocsRemarks(e.target.value)}
                              placeholder="e.g. Scrutinized original Ph.D. degree notification, M.Tech marksheet, relieving letters, and Aadhaar card."
                              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        </div>

                        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                          <div>
                            <span className="font-black text-amber-950 uppercase tracking-wider text-[10px]">Signed Institute Evaluation Documents</span>
                            <p className="text-[10px] text-amber-800 mt-1">Attach the signed performance report and the Head of Institute signature file. PDF or image, up to 10 MB each.</p>
                          </div>
                          {selectedReviewApp.interview_evaluation_report_url && (
                            <a href={selectedReviewApp.interview_evaluation_report_url} target="_blank" rel="noreferrer" className="block text-[11px] font-bold text-sky-800 underline">View saved Interview Evaluation Report</a>
                          )}
                          <label className="block text-[10px] font-bold text-slate-700">Interview Evaluation Report / Performance Sheet <span className="text-rose-600">*</span>
                            <input type="file" accept="application/pdf,image/*" required={!selectedReviewApp.interview_evaluation_report_url && !evaluationFiles[selectedReviewApp.id]?.report} onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 10 * 1024 * 1024) { alert('File size exceeds 10 MB.'); event.target.value = ''; return; } setEvaluationFiles((previous) => ({ ...previous, [selectedReviewApp.id]: { ...previous[selectedReviewApp.id], report: file || undefined } })); }} className="mt-1 block w-full text-xs" />
                          </label>
                          {selectedReviewApp.head_signature_url && (
                            <a href={selectedReviewApp.head_signature_url} target="_blank" rel="noreferrer" className="block text-[11px] font-bold text-sky-800 underline">View saved Head of Institute signature</a>
                          )}
                          <label className="block text-[10px] font-bold text-slate-700">Head of Institute Signature (digital or scanned physical signature) <span className="text-rose-600">*</span>
                            <input type="file" accept="application/pdf,image/*" required={!selectedReviewApp.head_signature_url && !evaluationFiles[selectedReviewApp.id]?.signature} onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 10 * 1024 * 1024) { alert('File size exceeds 10 MB.'); event.target.value = ''; return; } setEvaluationFiles((previous) => ({ ...previous, [selectedReviewApp.id]: { ...previous[selectedReviewApp.id], signature: file || undefined } })); }} className="mt-1 block w-full text-xs" />
                          </label>
                        </div>

                        {/* 4. STRUCTURED FINAL RECOMMENDATION ACTIONS (DEFINITIVE OUTCOME) */}
                        <div className="space-y-2">
                          <label className="block font-black text-slate-800 uppercase tracking-wider text-[10.5px]">
                            * 4. Definitive Recommendation Outcome <span className="text-rose-600">*</span>
                          </label>

                          <div className="space-y-2">
                            {/* 1. Selected / Recommended */}
                            <label
                              className={`p-3 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition ${
                                reviewRecommendation === 'selected' || reviewRecommendation === 'recommended'
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="instituteRec"
                                value="selected"
                                checked={reviewRecommendation === 'selected' || reviewRecommendation === 'recommended'}
                                onChange={() => setReviewRecommendation('selected')}
                                className="sr-only"
                              />
                              <CheckCircle2
                                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                  reviewRecommendation === 'selected' || reviewRecommendation === 'recommended'
                                    ? 'text-emerald-600'
                                    : 'text-slate-400'
                                }`}
                              />
                              <div>
                                <span className="block font-black text-xs text-emerald-900">Selected / Recommended</span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  Forward with positive recommendation for final institutional processing & appointment.
                                </span>
                              </div>
                            </label>

                            {/* 2. Hold / Waitlist */}
                            <label
                              className={`p-3 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition ${
                                reviewRecommendation === 'hold'
                                  ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="instituteRec"
                                value="hold"
                                checked={reviewRecommendation === 'hold'}
                                onChange={() => setReviewRecommendation('hold')}
                                className="sr-only"
                              />
                              <PauseCircle
                                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                  reviewRecommendation === 'hold' ? 'text-amber-600' : 'text-slate-400'
                                }`}
                              />
                              <div>
                                <span className="block font-black text-xs text-amber-900">Hold / Waitlist</span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  Keep candidate application under review in reserve pool.
                                </span>
                              </div>
                            </label>

                            {/* 3. Rejected */}
                            <label
                              className={`p-3 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition ${
                                reviewRecommendation === 'rejected'
                                  ? 'border-rose-600 bg-rose-50 text-rose-950 font-bold shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="instituteRec"
                                value="rejected"
                                checked={reviewRecommendation === 'rejected'}
                                onChange={() => setReviewRecommendation('rejected')}
                                className="sr-only"
                              />
                              <X
                                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                  reviewRecommendation === 'rejected' ? 'text-rose-600' : 'text-slate-400'
                                }`}
                              />
                              <div>
                                <span className="block font-black text-xs text-rose-900">Rejected / Disqualified</span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  Disqualify candidate from recruitment pipeline.
                                </span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* 5. MANDATORY JUSTIFICATION REMARKS */}
                        <div>
                          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                            * Principal Remarks / Final Justification <span className="text-rose-600">*</span>
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={reviewRemarks}
                            onChange={(e) => setReviewRemarks(e.target.value)}
                            placeholder="e.g. Highly suitable candidate fulfilling all AICTE qualifications for the sanctioned post. Strongly recommended for issue of appointment order."
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed text-xs"
                          />
                        </div>

                        {/* Workflow Notification Progression Notice */}
                        <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-sky-900 text-[11px] space-y-1">
                          <p className="font-bold flex items-center gap-1">
                            <Send className="w-3.5 h-3.5 text-sky-600" /> Automated Central HR Notification Alert
                          </p>
                          <p className="text-slate-600 leading-tight">
                            Submitting this evaluation immediately records the final physical interview outcome, updates the Central HR ledger, and triggers real-time in-app and email notifications to Central HR (<strong>hr@mandaltrust.org</strong>).
                          </p>
                        </div>

                        {/* Submit Action Buttons */}
                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => setSelectedReviewApp(null)}
                            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmittingReview}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isSubmittingReview ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Submitting Final Evaluation...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Submit Final Evaluation to Central HR</span>
                              </>
                            )}
                          </button>
                        </div>

                      </form>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: SECURE DOCUMENT LIGHTBOX PREVIEW ================= */}
        {previewDoc && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-sm text-slate-900 truncate max-w-md">{previewDoc.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in New Window
                  </a>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-auto bg-slate-100 flex items-center justify-center min-h-[400px]">
                {previewDoc.url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.title}
                    className="max-h-[75vh] max-w-full object-contain rounded-xl shadow"
                  />
                ) : (
                  <iframe
                    src={previewDoc.url}
                    title={previewDoc.title}
                    className="w-full h-[75vh] rounded-xl border border-slate-300 bg-white"
                  />
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </RoleGuard>
  );
}
