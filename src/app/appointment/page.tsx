'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Application, Institute, OrganizationSettings, Post, StaffCategory } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/RoleGuard';
import { NotificationBell } from '@/components/NotificationBell';
import { TrustLetterhead } from '@/components/TrustLetterhead';
import { numberToWordsINR } from '@/lib/numberToWords';
import {
  mergeApplicationOverrides,
  grantManagementApproval,
  generateAppointmentOrderNumber,
  updateAppointmentOrderStatus,
} from '@/lib/workflowService';
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  LayoutDashboard,
  Printer,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
  AlertCircle,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Check,
  Ban,
  Scissors
} from 'lucide-react';

export default function AppointmentRecruitmentPage() {
  const router = useRouter();
  const { role, session } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [activeSection, setActiveSection] = useState<'pipeline' | 'orders'>('pipeline');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'selected' | 'management_approved' | 'hold' | 'rejected'>('all');
  const [selectedInstituteId, setSelectedInstituteId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderTargetApp, setOrderTargetApp] = useState<Application | null>(null);

  // Central Management Decision Form State
  const [confirmedDesignation, setConfirmedDesignation] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [agreedSalary, setAgreedSalary] = useState<number | ''>(45000);
  const [payScale, setPayScale] = useState('6th Pay Commission / Sanstha Scale');
  const [basicPay, setBasicPay] = useState<number | ''>(21600);
  const [bondDetails, setBondDetails] = useState('Minimum 2 Years Service Bond with submission of 1 original certificate.');
  const [appointmentInstructions, setAppointmentInstructions] = useState('Report to Principal with original qualification dossiers and fee receipts.');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Order Updating State
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false);

  // Sync with URL query parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'orders') {
      setActiveSection('orders');
    }

    const filterParam = params.get('filter');
    if (
      filterParam === 'pending' ||
      filterParam === 'selected' ||
      filterParam === 'management_approved' ||
      filterParam === 'hold' ||
      filterParam === 'rejected' ||
      filterParam === 'all'
    ) {
      setStatusFilter(filterParam);
    }
  }, []);

  // Load Initial Central Recruitment Data across ALL institutes
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Load Org Settings
      const { data: orgData } = await supabase.from('organization_settings').select('*').limit(1).maybeSingle();
      if (orgData) setOrg(orgData);

      // 2. Load All Institutes
      const { data: instData } = await supabase
        .from('institutes')
        .select('*')
        .order('official_name', { ascending: true });
      if (instData) setInstitutes(instData);

      // 3. Load Posts
      const { data: postData } = await supabase.from('posts').select('*').eq('is_active', true);
      if (postData) setPosts(postData);

      // 4. Load All Applications with Education & Experience
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*, application_education(*), application_experience(*), posts(*), staff_categories(*)')
        .order('created_at', { ascending: false });

      if (appError) {
        console.warn('Supabase fetch applications warning:', appError.message);
      }

      if (appData) {
        // Merge with local overrides for instant responsive workflow updates
        const merged = mergeApplicationOverrides(appData);
        setApplications(merged);
      }
    } catch (err) {
      console.error('Error loading central recruitment data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Pipeline Filtering Logic
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Institute Filter
      if (selectedInstituteId !== 'all') {
        const matchesForwarded = app.forwarded_to_institute_id === selectedInstituteId;
        const matchesPreferred = app.preferred_institute_id === selectedInstituteId;
        if (!matchesForwarded && !matchesPreferred) return false;
      }

      // Status Filter
      if (statusFilter === 'pending') {
        const isPending =
          app.status === 'forwarded_to_institute' ||
          app.status === 'ready_for_physical_interview' ||
          app.status === 'interview_scheduled' ||
          (!app.institute_recommendation && !app.management_approved_at && app.status !== 'rejected');
        if (!isPending) return false;
      } else if (statusFilter === 'selected') {
        const isSelected =
          app.institute_recommendation === 'selected' ||
          app.institute_recommendation === 'recommended' ||
          app.status === 'selected_recommended';
        if (!isSelected) return false;
      } else if (statusFilter === 'management_approved') {
        const isApproved = app.status === 'management_approved' || !!app.management_approved_at;
        if (!isApproved) return false;
      } else if (statusFilter === 'hold') {
        const isHold = app.status === 'hold' || app.institute_recommendation === 'hold';
        if (!isHold) return false;
      } else if (statusFilter === 'rejected') {
        const isRejected = app.status === 'rejected' || app.institute_recommendation === 'rejected';
        if (!isRejected) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.candidate_name.toLowerCase().includes(q);
        const matchAppNo = app.application_no.toLowerCase().includes(q);
        const matchContact = (app.contact_no || '').toLowerCase().includes(q);
        const matchEmail = (app.email_id || '').toLowerCase().includes(q);
        const matchPost = (app.posts?.title || app.custom_post_title || '').toLowerCase().includes(q);
        if (!matchName && !matchAppNo && !matchContact && !matchEmail && !matchPost) return false;
      }

      return true;
    });
  }, [applications, selectedInstituteId, statusFilter, searchQuery]);

  // Management Approved Candidates for Appointment Orders Tab
  const approvedCandidates = useMemo(() => {
    return applications.filter((app) => {
      const isApproved = app.status === 'management_approved' || !!app.management_approved_at;
      if (!isApproved) return false;

      if (selectedInstituteId !== 'all') {
        const matchesForwarded = app.forwarded_to_institute_id === selectedInstituteId;
        const matchesPreferred = app.preferred_institute_id === selectedInstituteId;
        if (!matchesForwarded && !matchesPreferred) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.candidate_name.toLowerCase().includes(q);
        const matchAppNo = app.application_no.toLowerCase().includes(q);
        if (!matchName && !matchAppNo) return false;
      }

      return true;
    });
  }, [applications, selectedInstituteId, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter(
      (a) => a.status === 'forwarded_to_institute' || a.status === 'ready_for_physical_interview'
    ).length;
    const recommended = applications.filter(
      (a) => a.institute_recommendation === 'selected' || a.institute_recommendation === 'recommended'
    ).length;
    const approved = applications.filter(
      (a) => a.status === 'management_approved' || !!a.management_approved_at
    ).length;
    const ordersGenerated = applications.filter(
      (a) => a.appointment_order_status === 'order_generated' || a.appointment_order_status === 'joined'
    ).length;

    return { total, pending, recommended, approved, ordersGenerated };
  }, [applications]);

  // Open Approval Modal
  const handleOpenApprovalModal = (app: Application) => {
    setSelectedApp(app);
    setConfirmedDesignation(app.confirmed_designation || app.posts?.title || app.custom_post_title || '');
    setJoiningDate(app.joining_date || new Date().toISOString().split('T')[0]);
    setAgreedSalary(app.agreed_total_salary || 45000);
    setPayScale(app.pay_scale || '6th Pay Commission / Sanstha Scale');
    setBasicPay(app.basic_pay || 21600);
    setBondDetails(app.mandatory_bond_details || 'Minimum 2 Years Service Bond with submission of 1 original certificate.');
    setAppointmentInstructions(app.appointment_instructions || 'Report to Principal with original qualification dossiers and fee receipts.');
    setDecisionFeedback(null);
    setShowApprovalModal(true);
  };

  // Submit Management Approval directly from Central HR
  const handleSubmitManagementApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    if (!agreedSalary || Number(agreedSalary) <= 0) {
      setDecisionFeedback({ type: 'error', text: 'Agreed Total Salary Amount is compulsory and must be greater than 0.' });
      return;
    }

    setIsSubmittingApproval(true);
    setDecisionFeedback(null);

    try {
      const targetInst = institutes.find((i) => i.id === selectedApp.forwarded_to_institute_id || i.id === selectedApp.preferred_institute_id);

      const res = await grantManagementApproval({
        applicationId: selectedApp.id,
        applicationNo: selectedApp.application_no,
        candidateName: selectedApp.candidate_name,
        targetInstituteId: selectedApp.forwarded_to_institute_id || targetInst?.id,
        targetInstituteName: targetInst?.official_name || targetInst?.name,
        headName: selectedApp.forwarded_to_head_name || targetInst?.head_name || 'Principal',
        headEmail: selectedApp.forwarded_to_head_email || targetInst?.head_email || targetInst?.official_email,
        approvedBy: session?.full_name || 'Central HR Management',
        approvalRemarks: 'Formal Management & Central HR Appointment Approval Granted.',
        joiningDate: joiningDate || undefined,
        mandatoryBondDetails: bondDetails || undefined,
        confirmedDesignation: confirmedDesignation || undefined,
        payScale: payScale || undefined,
        basicPay: basicPay !== '' ? Number(basicPay) : undefined,
        agreedTotalSalary: Number(agreedSalary),
        appointmentInstructions: appointmentInstructions || undefined,
        pushToInstitutePortal: true,
        pushToAppointmentSection: true,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to submit management approval.');
      }

      setDecisionFeedback({
        type: 'success',
        text: `Management Approval granted for ${selectedApp.candidate_name}! Appointment order workflow initiated.`,
      });

      // Refresh applications state
      await loadData();

      setTimeout(() => {
        setShowApprovalModal(false);
      }, 1200);
    } catch (err: any) {
      setDecisionFeedback({ type: 'error', text: err.message || 'Error granting management approval.' });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Open Appointment Order Printable Modal
  const handleOpenOrderModal = (app: Application) => {
    setOrderTargetApp(app);
    setShowOrderModal(true);
  };

  // Update Appointment Order Status (e.g. Mark as Order Generated / Joined)
  const handleUpdateOrderStatus = async (
    status: 'order_generated' | 'order_dispatched' | 'joined'
  ) => {
    if (!orderTargetApp) return;
    setUpdatingOrderStatus(true);
    try {
      const orderNo = generateAppointmentOrderNumber(orderTargetApp.application_no);
      await updateAppointmentOrderStatus({
        applicationId: orderTargetApp.id,
        applicationNo: orderTargetApp.application_no,
        candidateName: orderTargetApp.candidate_name,
        status,
        appointmentOrderNo: orderNo,
        actorName: session?.full_name || 'Central Appointment Section',
        actorRole: role,
        remarks: `Official Appointment Order updated to status: ${status}. Reference No: ${orderNo}`,
      });

      // Refresh local copy
      setOrderTargetApp((prev) => (prev ? { ...prev, appointment_order_status: status } : null));
      await loadData();
    } catch (err) {
      console.warn('Order status update error:', err);
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  return (
    <RoleGuard
      allowedRoles={['admin_head_hr', 'appointment_officer']}
      title="Appointment & Recruitment Module Restricted"
      description="Access to the independent Central Appointment & Recruitment Section is strictly limited to Head Central HR and Appointment Officers."
    >
      <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5 text-amber-700" />
                Central HR Independent Section • Trust-Wide Recruitment
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Appointment &amp; Recruitment Section
              </h1>
              <p className="text-xs text-slate-500">
                Independent centralized candidate evaluation, management approvals, and appointment order generation across all colleges.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 shadow-2xs"
                title="Refresh recruitment registers"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
                <span>Refresh</span>
              </button>

              <div className="no-print">
                <NotificationBell role={role} />
              </div>
            </div>
          </div>

          {/* Section Navigation Tabs & Multi-Institute Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveSection('pipeline')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeSection === 'pipeline'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-amber-600" />
                <span>Recruitment Pipeline</span>
                <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {stats.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('orders')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeSection === 'orders'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Appointment Orders</span>
                <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                  {stats.approved}
                </span>
              </button>
            </div>

            {/* Central Institute Selector (Decoupled across ALL colleges) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs">
                <Building2 className="w-4 h-4 text-purple-700 flex-shrink-0" />
                <span className="font-bold text-slate-700 hidden sm:inline">Institute Scope:</span>
                <select
                  value={selectedInstituteId}
                  onChange={(e) => setSelectedInstituteId(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[220px] truncate"
                >
                  <option value="all">All Sanstha Institutes ({institutes.length})</option>
                  {institutes.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.official_name || inst.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Recruitment Pipeline KPIs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Pipeline</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.total}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Candidates across Sanstha</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">In Review / Queue</span>
            <span className="text-2xl font-black text-amber-800 mt-1 block">{stats.pending}</span>
            <span className="text-[10px] text-amber-600 mt-0.5 block">Awaiting Interview / Scores</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Recommended</span>
            <span className="text-2xl font-black text-emerald-800 mt-1 block">{stats.recommended}</span>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">By College Principals</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Management Approved</span>
            <span className="text-2xl font-black text-indigo-800 mt-1 block">{stats.approved}</span>
            <span className="text-[10px] text-indigo-600 mt-0.5 block">Central Approval Granted</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Official Orders</span>
            <span className="text-2xl font-black text-purple-900 mt-1 block">{stats.ordersGenerated}</span>
            <span className="text-[10px] text-purple-600 mt-0.5 block">Generated / Dispatched</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 1: RECRUITMENT PIPELINE & EVALUATION QUEUE
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === 'pipeline' && (
          <div className="space-y-4">
            {/* Filter Pills & Search */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({applications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                    statusFilter === 'pending'
                      ? 'bg-amber-700 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  Awaiting Review ({stats.pending})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('selected')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                    statusFilter === 'selected'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  Institute Recommended ({stats.recommended})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('management_approved')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                    statusFilter === 'management_approved'
                      ? 'bg-indigo-700 text-white'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  Management Approved ({stats.approved})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('hold')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                    statusFilter === 'hold'
                      ? 'bg-rose-700 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  On Hold
                </button>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, app no, role..."
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>

            {/* Candidate Pipeline Cards / Table */}
            {filteredApplications.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No Applications Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No candidate applications match your current status or institute filter criteria in the Central Recruitment pipeline.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredApplications.map((app) => {
                  const targetInst = institutes.find((i) => i.id === app.forwarded_to_institute_id || i.id === app.preferred_institute_id);
                  const isApproved = app.status === 'management_approved' || !!app.management_approved_at;
                  const isRecommended = app.institute_recommendation === 'selected' || app.institute_recommendation === 'recommended';
                  const isHold = app.status === 'hold' || app.institute_recommendation === 'hold';

                  return (
                    <div
                      key={app.id}
                      className="bg-white rounded-3xl border border-slate-200 hover:border-amber-400 shadow-2xs hover:shadow-md transition p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
                    >
                      {/* Left: Candidate Summary */}
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {app.photo_url ? (
                            <img src={app.photo_url} alt={app.candidate_name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-slate-400" />
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                              #{app.application_no}
                            </span>
                            <h3 className="text-sm font-black text-slate-900 truncate">
                              {app.candidate_name}
                            </h3>
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Management Approved
                              </span>
                            )}
                            {isRecommended && !isApproved && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                <Award className="w-3 h-3 text-sky-600" /> Institute Recommended
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-600 font-medium">
                            <span className="flex items-center gap-1 font-bold text-slate-800">
                              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                              {app.confirmed_designation || app.posts?.title || app.custom_post_title || 'General Post'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-purple-800">
                              <Building2 className="w-3.5 h-3.5 text-purple-600" />
                              {targetInst?.official_name || targetInst?.name || 'Sanstha Central HR'}
                            </span>
                          </div>

                          {/* Interview & Score Highlights */}
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                            {app.interview_score != null && (
                              <span className="font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                Interview Score: <strong className="text-slate-900">{app.interview_score}/100</strong>
                              </span>
                            )}
                            {app.interview_teaching_demo_score != null && (
                              <span className="font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                Demo Score: <strong className="text-slate-900">{app.interview_teaching_demo_score}/100</strong>
                              </span>
                            )}
                            {app.agreed_total_salary ? (
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Agreed Salary: ₹{Number(app.agreed_total_salary).toLocaleString('en-IN')}/mo
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                        {/* View Dossier Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedApp(app)}
                          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" /> Dossier
                        </button>

                        {/* Grant Management Approval Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenApprovalModal(app)}
                          className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black transition shadow-sm flex items-center gap-1.5"
                        >
                          <Award className="w-3.5 h-3.5" />
                          {isApproved ? 'Edit Approval Terms' : 'Grant Central Approval'}
                        </button>

                        {/* Print / View Appointment Order */}
                        {isApproved && (
                          <button
                            type="button"
                            onClick={() => handleOpenOrderModal(app)}
                            className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Printer className="w-3.5 h-3.5" /> Appointment Order
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2: OFFICIAL APPOINTMENT ORDERS TAB
        ══════════════════════════════════════════════════════════════ */}
        {activeSection === 'orders' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-purple-700" />
                    Official Appointment Orders Issuance Register
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate and print formal Appointment Orders on Sanstha Letterhead with official terms, serial number, and authorized signatures.
                  </p>
                </div>
                <div className="text-xs font-bold text-purple-900 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                  {approvedCandidates.length} Approved Candidates Ready
                </div>
              </div>
            </div>

            {approvedCandidates.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center mx-auto">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No Approved Candidates Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Candidates must first receive Formal Management Approval in the Recruitment Pipeline before their official Appointment Order can be generated.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Order Ref &amp; Candidate</th>
                        <th className="py-3 px-4">Confirmed Role &amp; Campus</th>
                        <th className="py-3 px-4">Agreed Salary Terms</th>
                        <th className="py-3 px-4">Joining Date</th>
                        <th className="py-3 px-4">Workflow Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {approvedCandidates.map((app) => {
                        const targetInst = institutes.find((i) => i.id === app.forwarded_to_institute_id || i.id === app.preferred_institute_id);
                        const orderNo = generateAppointmentOrderNumber(app.application_no);

                        return (
                          <tr key={app.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-purple-900 block text-xs">
                                {orderNo}
                              </span>
                              <span className="font-bold text-slate-900 block mt-0.5">
                                {app.candidate_name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                App #{app.application_no}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-800 block">
                                {app.confirmed_designation || app.posts?.title || app.custom_post_title}
                              </span>
                              <span className="text-[11px] text-purple-800 font-medium block">
                                {targetInst?.official_name || targetInst?.name}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-black text-emerald-900 block text-xs">
                                ₹{Number(app.agreed_total_salary || 0).toLocaleString('en-IN')}/mo
                              </span>
                              {app.pay_scale && (
                                <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                                  {app.pay_scale}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-slate-700 block">
                                {app.joining_date
                                  ? new Date(app.joining_date).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'Immediate'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  app.appointment_order_status === 'order_generated'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : app.appointment_order_status === 'joined'
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {app.appointment_order_status === 'order_generated'
                                  ? 'Order Generated'
                                  : app.appointment_order_status === 'joined'
                                  ? 'Joined Sanstha'
                                  : 'Initiated'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenOrderModal(app)}
                                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
                              >
                                <Printer className="w-3.5 h-3.5" /> Print Order
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL 1: CANDIDATE DOSSIER MODAL
        ══════════════════════════════════════════════════════════════ */}
        {selectedApp && !showApprovalModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 shadow-2xl">
              <div className="p-5 border-b flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                    #{selectedApp.application_no}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{selectedApp.candidate_name}</h3>
                  <p className="text-xs text-slate-500">Candidate Recruitment Dossier &amp; Evaluation Marks</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-5 flex-1 text-xs">
                {/* Physical Interview & Evaluation Findings */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                  <span className="text-[11px] font-black uppercase text-amber-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-700" /> Institute Physical Interview Assessment
                  </span>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-500 block">Interview Score:</span>
                      <strong className="text-slate-900 text-sm">
                        {selectedApp.interview_score != null ? `${selectedApp.interview_score} / 100` : 'Not recorded'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Teaching Demo Score:</span>
                      <strong className="text-slate-900 text-sm">
                        {selectedApp.interview_teaching_demo_score != null ? `${selectedApp.interview_teaching_demo_score} / 100` : 'Not recorded'}
                      </strong>
                    </div>
                  </div>
                  {selectedApp.interview_panel_remarks && (
                    <div className="pt-2 border-t border-amber-200 text-slate-700 italic">
                      "{selectedApp.interview_panel_remarks}"
                    </div>
                  )}
                </div>

                {/* Contact & Personal */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Email ID</span>
                    <span className="font-bold text-slate-800">{selectedApp.email_id || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedApp.contact_no || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Applied Designation</span>
                    <span className="font-bold text-slate-800">{selectedApp.posts?.title || selectedApp.custom_post_title}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Academic Stream</span>
                    <span className="font-bold text-slate-800">{selectedApp.program_stream || 'General'}</span>
                  </div>
                </div>

                {/* Management Approval Status */}
                {selectedApp.management_approved_at && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5">
                    <span className="text-[11px] font-black uppercase text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Formal Management Approval Active
                    </span>
                    <p className="text-slate-700">
                      Confirmed Designation: <strong>{selectedApp.confirmed_designation}</strong> • Total Salary: <strong>₹{Number(selectedApp.agreed_total_salary || 0).toLocaleString('en-IN')}</strong> • Date of Joining: <strong>{selectedApp.joining_date || 'Scheduled'}</strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t flex items-center justify-end gap-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenApprovalModal(selectedApp)}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Manage Approval &amp; Terms
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL 2: CENTRAL MANAGEMENT APPROVAL TERMS MODAL
        ══════════════════════════════════════════════════════════════ */}
        {showApprovalModal && selectedApp && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-700" />
                    Formal Management &amp; Central HR Approval
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Candidate: <strong>{selectedApp.candidate_name}</strong> (#{selectedApp.application_no})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {decisionFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    decisionFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  {decisionFeedback.text}
                </div>
              )}

              <form onSubmit={handleSubmitManagementApproval} className="space-y-4 text-xs">
                {/* 1. Confirmed Designation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirmed Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmedDesignation}
                    onChange={(e) => setConfirmedDesignation(e.target.value)}
                    placeholder="e.g. Assistant Professor in Computer Science & Engineering"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* 2. Date of Joining */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Candidate Date of Joining
                  </label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                {/* 3. Agreed Total Salary Amount (Compulsory) */}
                <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-emerald-950 uppercase tracking-wider">
                      Agreed Total Salary Amount (Monthly INR) *
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold">Compulsory Mandate</span>
                  </div>
                  <input
                    type="number"
                    required
                    min={1}
                    value={agreedSalary}
                    onChange={(e) => setAgreedSalary(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white border border-emerald-300 rounded-xl text-sm font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                  {agreedSalary && Number(agreedSalary) > 0 && (
                    <span className="text-[11px] text-emerald-800 font-semibold italic block pt-0.5">
                      Amount in words: {numberToWordsINR(Number(agreedSalary))}
                    </span>
                  )}
                </div>

                {/* 4. Pay Scale & Basic Pay */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Pay Scale
                    </label>
                    <input
                      type="text"
                      value={payScale}
                      onChange={(e) => setPayScale(e.target.value)}
                      placeholder="e.g. AICTE / Sanstha Scale"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Basic Pay (₹)
                    </label>
                    <input
                      type="number"
                      value={basicPay}
                      onChange={(e) => setBasicPay(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="21600"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* 5. Mandatory Bond Details */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mandatory Bond Submissions &amp; Compliance
                  </label>
                  <input
                    type="text"
                    value={bondDetails}
                    onChange={(e) => setBondDetails(e.target.value)}
                    placeholder="e.g. 2 Years Service Bond with 1 original certificate"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* 6. Administrative Instructions */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Administrative Directives &amp; Joining Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={appointmentInstructions}
                    onChange={(e) => setAppointmentInstructions(e.target.value)}
                    placeholder="e.g. Submit original testimonials and fee receipt to Principal upon reporting."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowApprovalModal(false)}
                    className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingApproval}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSubmittingApproval ? 'Granting Approval...' : 'Confirm Management Approval'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL 3: OFFICIAL APPOINTMENT ORDER PRINTABLE LETTER
        ══════════════════════════════════════════════════════════════ */}
        {showOrderModal && orderTargetApp && (
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-300 shadow-2xl p-6 sm:p-8 space-y-6 my-auto print:shadow-none print:border-none print:p-0 print:m-0">
              
              {/* Modal Top Actions (no-print) */}
              <div className="flex items-center justify-between border-b pb-4 no-print">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Official Appointment Order Letter</h3>
                    <p className="text-[11px] text-slate-500">Shri Balasaheb Mane Shikshan Prasarak Mandal, Ambap</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-4 h-4" /> Print / Export PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ── PRINTABLE APPOINTMENT ORDER LETTERHEAD & CONTENT ── */}
              <div className="space-y-6 text-slate-900 font-sans print:text-black">
                {/* Official Trust Letterhead */}
                {org && <TrustLetterhead org={org} />}

                {/* Reference Number & Date Bar */}
                <div className="flex items-center justify-between text-xs font-mono font-bold border-b border-slate-300 pb-2">
                  <span>Ref No: {generateAppointmentOrderNumber(orderTargetApp.application_no)}</span>
                  <span>Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>

                {/* To Addressee */}
                <div className="text-xs space-y-0.5">
                  <span className="font-bold block">To,</span>
                  <span className="font-black text-sm block">{orderTargetApp.candidate_name}</span>
                  <span className="block text-slate-600">{orderTargetApp.address || 'Address on record'}</span>
                  <span className="block text-slate-600 font-mono">Mobile: {orderTargetApp.contact_no} • Email: {orderTargetApp.email_id}</span>
                </div>

                {/* Subject Line */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center text-xs font-black uppercase tracking-tight text-slate-900">
                  SUBJECT: APPOINTMENT ORDER FOR THE POST OF{' '}
                  <span className="text-purple-900 underline">
                    {orderTargetApp.confirmed_designation || orderTargetApp.posts?.title || 'FACULTY / STAFF'}
                  </span>
                </div>

                {/* Body Text */}
                <div className="text-xs text-slate-800 leading-relaxed space-y-3">
                  <p>Dear <strong>{orderTargetApp.candidate_name}</strong>,</p>
                  
                  <p>
                    With reference to your interview evaluation conducted before the Sanstha Selection Committee, the Management of <strong>Shri Balasaheb Mane Shikshan Prasarak Mandal, Ambap</strong> is pleased to appoint you to the post of{' '}
                    <strong>{orderTargetApp.confirmed_designation || orderTargetApp.posts?.title}</strong> with effect from your joining date.
                  </p>

                  <p className="font-semibold text-slate-900">
                    The terms and conditions governing your appointment are as under:
                  </p>

                  {/* Employment Terms Table */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="py-2 px-3 bg-slate-50 font-bold w-1/3">1. Confirmed Designation</td>
                          <td className="py-2 px-3 font-semibold">{orderTargetApp.confirmed_designation || orderTargetApp.posts?.title}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 bg-slate-50 font-bold">2. Institute / Campus</td>
                          <td className="py-2 px-3 font-semibold">
                            {institutes.find((i) => i.id === orderTargetApp.forwarded_to_institute_id || i.id === orderTargetApp.preferred_institute_id)?.official_name || 'Sanstha Unit'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 bg-slate-50 font-bold">3. Total Agreed Salary</td>
                          <td className="py-2 px-3 font-black text-emerald-900">
                            ₹{Number(orderTargetApp.agreed_total_salary || 0).toLocaleString('en-IN')} /- per month
                            <span className="block text-[10.5px] font-normal text-slate-600">
                              ({numberToWordsINR(Number(orderTargetApp.agreed_total_salary || 0))})
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 bg-slate-50 font-bold">4. Pay Scale &amp; Basic Pay</td>
                          <td className="py-2 px-3">
                            {orderTargetApp.pay_scale || 'Sanstha Norms'}
                            {orderTargetApp.basic_pay ? ` (Basic Pay: ₹${Number(orderTargetApp.basic_pay).toLocaleString('en-IN')})` : ''}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 bg-slate-50 font-bold">5. Scheduled Date of Joining</td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {orderTargetApp.joining_date
                              ? new Date(orderTargetApp.joining_date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric',
                                })
                              : 'Immediate / As per Sanstha Directive'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 bg-slate-50 font-bold">6. Mandatory Bond Terms</td>
                          <td className="py-2 px-3">{orderTargetApp.mandatory_bond_details || 'Standard Sanstha Service Agreement.'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 bg-slate-50 font-bold">7. Special Instructions</td>
                          <td className="py-2 px-3 italic">{orderTargetApp.appointment_instructions || 'Report to the Principal on your joining date.'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p>
                    Please sign the duplicate copy of this appointment order as a token of your acceptance and submit it to the Central HR Office on or before your date of reporting.
                  </p>
                </div>

                {/* Signatures Row */}
                <div className="pt-10 flex items-end justify-between text-xs text-center border-t border-slate-200">
                  <div className="space-y-1">
                    <div className="w-32 border-b border-slate-400 mx-auto" />
                    <span className="font-bold block text-slate-800">Candidate Signature</span>
                    <span className="text-[10px] text-slate-400">Date: ____________</span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-36 border-b border-slate-400 mx-auto" />
                    <span className="font-bold block text-slate-800">Head Central HR</span>
                    <span className="text-[10px] text-slate-500">Mrs. Priyanka M. Sutar</span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-40 border-b border-slate-400 mx-auto" />
                    <span className="font-bold block text-slate-900">President / Secretary</span>
                    <span className="text-[10px] text-slate-500">Shri Vijaysinh Ashokrao Mane</span>
                  </div>
                </div>
              </div>

              {/* Status Actions Bottom Bar (no-print) */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 no-print">
                <span className="text-xs text-slate-500">
                  Order Status: <strong className="text-purple-900 uppercase font-mono">{orderTargetApp.appointment_order_status || 'initiated'}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={updatingOrderStatus}
                    onClick={() => handleUpdateOrderStatus('order_generated')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    Mark as Order Generated
                  </button>

                  <button
                    type="button"
                    disabled={updatingOrderStatus}
                    onClick={() => handleUpdateOrderStatus('joined')}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    Mark Candidate Joined
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
