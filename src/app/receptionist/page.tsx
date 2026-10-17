'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Application, OrganizationSettings, PaymentMode, FeeReceipt, Institute } from '@/types/database';
import { TrustLetterhead } from '@/components/TrustLetterhead';
import { RoleGuard } from '@/components/RoleGuard';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { numberToWordsINR } from '@/lib/numberToWords';
import { toTitleCase, toSmartTitleCase, toCleanEmail, toCleanPAN } from '@/lib/stringUtils';
import { matchesApplicationNumberSearch, parseApplicationNumber } from '@/lib/applicationNumberService';
import { forwardApplicationToInstitute, mergeApplicationOverrides, grantManagementApproval, pushDossierDownstream } from '@/lib/workflowService';
import {
  UserCheck,
  Search,
  CheckCircle,
  Clock,
  Printer,
  FileText,
  CreditCard,
  ArrowLeft,
  Eye,
  Shield,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  Lock,
  Layers,
  Scissors,
  Edit3,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Receipt,
  Plus,
  GraduationCap,
  Briefcase,
  User,
  Building2,
  Image as ImageIcon,
  IndianRupee,
  MoreVertical,
  Send,
  Calendar,
  MapPin,
  Mail,
  PauseCircle,
  Award,
  ShieldCheck
} from 'lucide-react';

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
  'General / Administrative / Other'
];

const defaultStreamCourses: Record<string, string[]> = {
  'Engineering & Technology': [
    'B.Tech / B.E. Computer Science & Engineering',
    'B.Tech / B.E. Artificial Intelligence & Data Science',
    'B.Tech / B.E. Mechanical Engineering',
    'B.Tech / B.E. Civil Engineering',
    'B.Tech / B.E. Electrical Engineering',
    'B.Tech / B.E. Electronics & Telecommunication',
    'M.Tech Computer Science & Engineering',
    'M.Tech Mechanical Engineering',
    'Diploma in Computer Engineering',
    'Diploma in Mechanical Engineering',
    'Diploma in Civil Engineering',
    'Diploma in Electrical Engineering',
  ],
  'Management (MBA / MMS)': [
    'MBA (Master of Business Administration)',
    'MMS (Master of Management Studies)',
    'BBA (Bachelor of Business Administration)',
    'BMS (Bachelor of Management Studies)',
  ],
  'Computer Applications (MCA)': [
    'MCA (Master of Computer Applications)',
    'BCA (Bachelor of Computer Applications)',
    'B.Sc. Computer Science',
  ],
  'Pharmacy': [
    'B.Pharm (Bachelor of Pharmacy)',
    'M.Pharm (Pharmaceutics)',
    'M.Pharm (Pharmacology)',
    'M.Pharm (Pharmaceutical Chemistry)',
    'M.Pharm (Quality Assurance)',
    'D.Pharm (Diploma in Pharmacy)',
    'Pharm.D (Doctor of Pharmacy)',
  ],
  'BAMS (Ayurveda)': [
    'BAMS (Bachelor of Ayurvedic Medicine & Surgery)',
    'MD / MS (Ayurveda)',
  ],
  'BHMS (Homeopathy)': [
    'BHMS (Bachelor of Homeopathic Medicine & Surgery)',
    'MD (Homeopathy)',
  ],
  'Nursing & Health Sciences': [
    'B.Sc. Nursing',
    'Post Basic B.Sc. Nursing',
    'GNM (General Nursing & Midwifery)',
    'ANM (Auxiliary Nursing & Midwifery)',
    'M.Sc. Nursing',
    'B.P.Th. (Physiotherapy)',
  ],
  'Education (B.Ed / D.Ed / M.Ed)': [
    'B.Ed (Bachelor of Education)',
    'D.El.Ed / D.Ed (Diploma in Elementary Education)',
    'M.Ed (Master of Education)',
    'B.P.Ed (Physical Education)',
  ],
  'Industrial Training Institute (ITI / Vocational)': [
    'ITI Electrician',
    'ITI Fitter',
    'ITI Welder',
    'ITI Wireman',
    'ITI Turner',
    'ITI Machinist',
    'ITI COPA (Computer Operator)',
    'ITI Motor Mechanic Vehicle',
  ],
  'Arts, Commerce & Science (General Degree)': [
    'B.A. (Bachelor of Arts)',
    'B.Com (Bachelor of Commerce)',
    'B.Sc. (Bachelor of Science)',
    'M.A. (Master of Arts)',
    'M.Com (Master of Commerce)',
    'M.Sc. (Master of Science)',
  ],
  'Junior College / Higher Secondary': [
    '11th-12th Science',
    '11th-12th Commerce',
    '11th-12th Arts',
    '11th-12th Vocational (HSC Voc)',
  ],
  'School Education (CBSE / State)': [
    'Secondary School (Std 5th to 10th)',
    'Primary School (Std 1st to 4th)',
    'Pre-Primary / Kindergarten (KG / Nursery)',
  ],
  'General / Administrative / Other': [
    'Administrative / Office / Central HR Support',
    'Accountancy & Finance Department',
    'Library & Information Science',
    'Laboratory Support / Workshop',
    'Estate, Security & Housekeeping',
  ]
};

export default function ReceptionistDashboard() {
  const { role } = useAuth();
  const isAdminHR = role === 'admin_head_hr';

  const [applications, setApplications] = useState<Application[]>([]);
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [staffCategories, setStaffCategories] = useState<any[]>([]);
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilters, setLocationFilters] = useState({ village_city: '', taluka: '', district: '', state: '', pin_code: '' });
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'submitted' | 'verified_approved' | 'fee_paid' | 'forwarded_to_institute' | 'ready_for_physical_interview' | 'selected_recommended' | 'management_approved' | 'hold' | 'rejected' | 'multiple_submissions'
  >('all');
  const [streamFilter, setStreamFilter] = useState<string>('all');

  // Forward to Institute Head Modal State
  const [forwardModalApp, setForwardModalApp] = useState<Application | null>(null);
  const [forwardTargetInstId, setForwardTargetInstId] = useState<string>('');
  const [forwardHeadName, setForwardHeadName] = useState<string>('');
  const [forwardHeadEmail, setForwardHeadEmail] = useState<string>('');
  const [forwardHeadDesignation, setForwardHeadDesignation] = useState<string>('Principal');
  const [forwardCentralRemarks, setForwardCentralRemarks] = useState<string>('');
  const [isForwarding, setIsForwarding] = useState<boolean>(false);
  const [forwardSuccessToast, setForwardSuccessToast] = useState<{ show: boolean; msg: string; emailTo: string } | null>(null);

  // Selected Application for Verification Modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationRemarks, setVerificationRemarks] = useState('');

  // Duplicate Comparison Modal State
  const [duplicateModalApp, setDuplicateModalApp] = useState<Application | null>(null);

  // Document Viewer Lightbox Modal State
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  // Edit Candidate Application State
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [isSavingAppEdit, setIsSavingAppEdit] = useState(false);
  const [editForm, setEditForm] = useState<{
    candidate_name: string;
    contact_no: string;
    email_id: string;
    address: string;
    dob: string;
    age: string;
    is_married: boolean;
    aadhaar_input: string;
    pan_input: string;
    photo_url: string;
    aadhaar_doc_url: string;
    pan_doc_url: string;
    resume_url: string;
    signature_url: string;
    category_id: string;
    post_id: string;
    custom_post_title: string;
    preferred_institute_id: string;
    program_stream: string;
    course_name: string;
    specialization: string;
    salary_expectation: string;
    verification_remarks: string;
    education: Array<{
      level: string;
      degree_name: string;
      board_university?: string;
      passing_year?: string;
      status_remark?: string;
      percentage: string;
      marking_system: 'percentage' | 'cgpa';
      cgpa: string;
      cgpa_scale: string;
      doc_url?: string;
    }>;
    experience: Array<{
      is_fresher: boolean;
      organization_name: string;
      designation: string;
      years_experience: string;
      previous_salary: string;
    }>;
  }>({
    candidate_name: '',
    contact_no: '',
    email_id: '',
    address: '',
    dob: '',
    age: '',
    is_married: false,
    aadhaar_input: '',
    pan_input: '',
    photo_url: '',
    aadhaar_doc_url: '',
    pan_doc_url: '',
    resume_url: '',
    signature_url: '',
    category_id: '',
    post_id: '',
    custom_post_title: '',
    preferred_institute_id: '',
    program_stream: 'Engineering & Technology',
    course_name: '',
    specialization: '',
    salary_expectation: '',
    verification_remarks: '',
    education: [],
    experience: [],
  });

  // Fee Payment Modal State
  const [payApp, setPayApp] = useState<Application | null>(null);
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('Cash');
  const [paymentRefNo, setPaymentRefNo] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Edit Receipt Modal State
  const [editingReceipt, setEditingReceipt] = useState<{
    receipt: FeeReceipt;
    app: Application;
    amount: number;
    payment_mode: string;
    reference_no: string;
  } | null>(null);
  const [isUpdatingReceipt, setIsUpdatingReceipt] = useState(false);

  // Delete Receipt Modal State
  const [deletingReceipt, setDeletingReceipt] = useState<{
    receipt: FeeReceipt;
    app: Application;
    cancellationReason: string;
    selectedQuickReason: string;
  } | null>(null);
  const [isDeletingReceipt, setIsDeletingReceipt] = useState(false);

  // Printable Receipt State
  const [printedReceipt, setPrintedReceipt] = useState<{
    receipt_no: string;
    app: Application;
    amount: number;
    amount_in_words: string;
    payment_mode: string;
    reference_no?: string;
    date: string;
  } | null>(null);

  // Printable Candidate Form State
  const [printFormApp, setPrintFormApp] = useState<Application | null>(null);

  // Row Actions Popover Menu State
  const [menuAnchor, setMenuAnchor] = useState<{
    app: Application;
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setMenuAnchor(null);
    window.addEventListener('scroll', handleCloseMenu, true);
    window.addEventListener('resize', handleCloseMenu);
    return () => {
      window.removeEventListener('scroll', handleCloseMenu, true);
      window.removeEventListener('resize', handleCloseMenu);
    };
  }, []);

  const handleToggleRowMenu = (e: React.MouseEvent, app: Application) => {
    e.stopPropagation();
    if (menuAnchor?.app.id === app.id) {
      setMenuAnchor(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuEstimatedHeight = 280;
    const openUpward = spaceBelow < menuEstimatedHeight;

    setMenuAnchor({
      app,
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? window.innerHeight - rect.top + 6 : undefined,
      right: Math.max(16, window.innerWidth - rect.right),
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: orgData } = await supabase
        .from('organization_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      if (orgData) setOrg(orgData);

      const { data: pmData } = await supabase.from('payment_modes').select('*').eq('is_active', true);
      if (pmData) setPaymentModes(pmData);

      const { data: catData } = await supabase.from('staff_categories').select('*').order('name');
      if (catData) setStaffCategories(catData);

      const { data: postData } = await supabase.from('posts').select('*, staff_categories(*)').order('title');
      if (postData) setPosts(postData);

      const { data: instData } = await supabase.from('institutes').select('*, institute_courses(*)').order('official_name');
      if (instData) setInstitutes(instData);

      const { data: appData } = await supabase
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

      if (appData) {
        setApplications(mergeApplicationOverrides(appData as Application[]));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper: Normalize 10-digit mobile number
  const cleanPhone = (phone?: string | null) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  };

  // Helper: Normalize email
  const cleanEmail = (email?: string | null) => {
    if (!email) return '';
    const trimmed = email.trim().toLowerCase();
    return trimmed.includes('@') ? trimmed : '';
  };

  // Multiple Submissions / Duplicate Candidate Detection Map
  const duplicateAppMap = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        allApps: Application[];
        otherApps: Application[];
        matchedBy: { mobile: boolean; email: boolean };
        matchedDescriptions: string[];
      }
    >();

    if (!applications || applications.length === 0) return map;

    // Build index by phone and email
    const byPhone = new Map<string, Application[]>();
    const byEmail = new Map<string, Application[]>();

    applications.forEach((app) => {
      const p = cleanPhone(app.contact_no);
      if (p && p.length === 10) {
        const list = byPhone.get(p) || [];
        list.push(app);
        byPhone.set(p, list);
      }

      const em = cleanEmail(app.email_id);
      if (em) {
        const list = byEmail.get(em) || [];
        list.push(app);
        byEmail.set(em, list);
      }
    });

    applications.forEach((app) => {
      const p = cleanPhone(app.contact_no);
      const em = cleanEmail(app.email_id);

      const relatedSet = new Map<string, Application>();
      let matchedPhone = false;
      let matchedEmail = false;

      if (p && (byPhone.get(p)?.length || 0) > 1) {
        matchedPhone = true;
        byPhone.get(p)?.forEach((other) => {
          relatedSet.set(other.id, other);
        });
      }

      if (em && (byEmail.get(em)?.length || 0) > 1) {
        matchedEmail = true;
        byEmail.get(em)?.forEach((other) => {
          relatedSet.set(other.id, other);
        });
      }

      if (relatedSet.size > 1) {
        const allApps = Array.from(relatedSet.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const otherApps = allApps.filter((o) => o.id !== app.id);
        const matchedDescriptions: string[] = [];
        if (matchedPhone && p) matchedDescriptions.push(`Mobile: ${p}`);
        if (matchedEmail && em) matchedDescriptions.push(`Email: ${em}`);

        map.set(app.id, {
          count: allApps.length,
          allApps,
          otherApps,
          matchedBy: {
            mobile: matchedPhone,
            email: matchedEmail,
          },
          matchedDescriptions,
        });
      }
    });

    return map;
  }, [applications]);

  // Total application forms that belong to a multiple submission set
  const multipleSubmissionsCount = useMemo(() => {
    return Array.from(duplicateAppMap.keys()).length;
  }, [duplicateAppMap]);

  // Filter Logic
  const filteredApplications = applications.filter((app) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'multiple_submissions'
        ? duplicateAppMap.has(app.id)
        : statusFilter === 'ready_for_physical_interview'
        ? app.status === 'ready_for_physical_interview' || !!app.interview_requested
        : statusFilter === 'selected_recommended'
        ? app.status === 'selected_recommended' || app.institute_recommendation === 'selected' || app.institute_recommendation === 'recommended'
        : statusFilter === 'management_approved'
        ? app.status === 'management_approved'
        : app.status === statusFilter;
    const matchesStream = streamFilter === 'all' || (app.program_stream || 'Engineering & Technology') === streamFilter;
    const matchesLocation = Object.entries(locationFilters).every(([field, query]) => {
      if (!query.trim()) return true;
      return String(app[field as keyof Application] || '').toLowerCase().includes(query.trim().toLowerCase());
    });
    const matchesSearch =
      app.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      matchesApplicationNumberSearch(app.application_no, searchTerm) ||
      app.application_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.contact_no.includes(searchTerm) ||
      (app.email_id && app.email_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.specialization && app.specialization.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.program_stream && app.program_stream.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.fee_receipts && app.fee_receipts.some(r => r.receipt_no.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesStatus && matchesStream && matchesLocation && matchesSearch;
  });

  // Handle Approve Action
  const handleApproveApplication = async (appId: string) => {
    setIsVerifying(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'verified_approved',
          verified_at: new Date().toISOString(),
          verification_remarks: verificationRemarks.trim() || 'Verified original credentials and certificates.',
        })
        .eq('id', appId);

      if (error) throw error;
      setSelectedApp(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error approving application');
    } finally {
      setIsVerifying(false);
    }
  };

  // Rich State & Handlers for Central HR Management Approval & Downstream Propagation
  const [mgmtApprovalModalApp, setMgmtApprovalModalApp] = useState<Application | null>(null);
  const [mgmtConfirmedDesignation, setMgmtConfirmedDesignation] = useState('');
  const [mgmtJoiningDate, setMgmtJoiningDate] = useState('');
  const [mgmtAgreedTotalSalary, setMgmtAgreedTotalSalary] = useState('');
  const [mgmtPayScale, setMgmtPayScale] = useState('');
  const [mgmtBasicPay, setMgmtBasicPay] = useState('');
  const [mgmtMandatoryBond, setMgmtMandatoryBond] = useState('');
  const [mgmtInstructions, setMgmtInstructions] = useState('');
  const [mgmtApprovalRemarks, setMgmtApprovalRemarks] = useState('');
  const [mgmtPushInstitute, setMgmtPushInstitute] = useState(true);
  const [mgmtPushAppointmentSection, setMgmtPushAppointmentSection] = useState(true);
  const [mgmtSalaryError, setMgmtSalaryError] = useState<string | null>(null);
  const [isSubmittingMgmtApproval, setIsSubmittingMgmtApproval] = useState(false);
  const [mgmtSuccessToast, setMgmtSuccessToast] = useState<{ show: boolean; msg: string; candidateName: string } | null>(null);

  // State for Re-syncing Dossier Downstream
  const [isPushingDownstream, setIsPushingDownstream] = useState(false);

  const openManagementApprovalModal = (app: Application) => {
    setMgmtApprovalModalApp(app);
    setMgmtSalaryError(null);
    setMgmtConfirmedDesignation(
      app.confirmed_designation ||
      app.posts?.title ||
      app.custom_post_title ||
      'Assistant Professor'
    );
    setMgmtJoiningDate(app.joining_date || '');
    setMgmtAgreedTotalSalary(app.agreed_total_salary ? String(app.agreed_total_salary) : app.salary_expectation ? String(app.salary_expectation) : '');
    setMgmtPayScale(app.pay_scale || 'Level 10 (57,700 - 1,82,400) / 7th Pay Commission');
    setMgmtBasicPay(app.basic_pay ? String(app.basic_pay) : '57700');
    setMgmtMandatoryBond(app.mandatory_bond_details || '2-Year Mandatory Service Bond & Original Certificate Submission');
    setMgmtInstructions(
      app.appointment_instructions ||
      'Candidate must report to the Principal Office with all original certificates, relieving order from previous employer, and medical fitness clearance.'
    );
    setMgmtApprovalRemarks(
      app.management_approval_remarks ||
      'Formal Management & Central HR Appointment Approval Granted.'
    );
    setMgmtPushInstitute(true);
    setMgmtPushAppointmentSection(true);
  };

  const handleConfirmManagementApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mgmtApprovalModalApp) return;

    // Validate Agreed Total Salary (COMPULSORY)
    const rawSalary = mgmtAgreedTotalSalary.trim();
    const parsedSalary = Number(rawSalary);
    if (!rawSalary || isNaN(parsedSalary) || parsedSalary <= 0) {
      setMgmtSalaryError('Agreed Total Salary Amount is compulsory and must be a valid amount greater than 0.');
      return;
    }
    setMgmtSalaryError(null);

    const app = mgmtApprovalModalApp;
    const targetInst = institutes.find((i) => i.id === (app.forwarded_to_institute_id || app.preferred_institute_id || app.posts?.institute_id));

    setIsSubmittingMgmtApproval(true);
    try {
      const res = await grantManagementApproval({
        applicationId: app.id,
        applicationNo: app.application_no,
        candidateName: app.candidate_name,
        targetInstituteId: app.forwarded_to_institute_id || targetInst?.id,
        targetInstituteName: targetInst?.official_name || targetInst?.name,
        headName: app.forwarded_to_head_name || targetInst?.head_name || 'Principal',
        headEmail: app.forwarded_to_head_email || targetInst?.head_email || targetInst?.official_email,
        approvedBy: 'Central HR Management',
        approvalRemarks: mgmtApprovalRemarks.trim() || 'Formal Management & Central HR Appointment Approval Granted.',
        joiningDate: mgmtJoiningDate.trim() || undefined,
        mandatoryBondDetails: mgmtMandatoryBond.trim() || undefined,
        confirmedDesignation: mgmtConfirmedDesignation.trim() || 'Confirmed Faculty / Staff',
        payScale: mgmtPayScale.trim() || undefined,
        basicPay: mgmtBasicPay.trim() ? Number(mgmtBasicPay.trim()) : undefined,
        agreedTotalSalary: parsedSalary,
        appointmentInstructions: mgmtInstructions.trim() || undefined,
        pushToInstitutePortal: mgmtPushInstitute,
        pushToAppointmentSection: mgmtPushAppointmentSection,
        callerRole: role,
      });

      if (res.success) {
        const nowIso = new Date().toISOString();
        const updatedFields: Partial<Application> = {
          status: 'management_approved',
          management_approved_at: nowIso,
          management_approved_by: 'Central HR Management',
          management_approval_remarks: mgmtApprovalRemarks.trim() || 'Formal Management & Central HR Appointment Approval Granted.',
          confirmed_designation: mgmtConfirmedDesignation.trim() || 'Confirmed Faculty / Staff',
          joining_date: mgmtJoiningDate.trim() || null,
          agreed_total_salary: parsedSalary,
          pay_scale: mgmtPayScale.trim() || null,
          basic_pay: mgmtBasicPay.trim() ? Number(mgmtBasicPay.trim()) : null,
          mandatory_bond_details: mgmtMandatoryBond.trim() || null,
          appointment_instructions: mgmtInstructions.trim() || null,
          appointment_order_workflow_initiated: mgmtPushAppointmentSection,
          appointment_order_status: 'initiated',
          pushed_to_institute_portal: mgmtPushInstitute,
          pushed_to_appointment_section: mgmtPushAppointmentSection,
          downstream_pushed_at: nowIso,
          downstream_pushed_by: 'Central HR Management',
        };

        if (selectedApp && selectedApp.id === app.id) {
          setSelectedApp((prev) => prev ? { ...prev, ...updatedFields } : null);
        }

        setMgmtSuccessToast({
          show: true,
          msg: `Formal Management Approval Granted & Propagated Downstream for #${app.application_no}!`,
          candidateName: app.candidate_name,
        });

        setMgmtApprovalModalApp(null);
        await fetchData();
        setTimeout(() => setMgmtSuccessToast(null), 8000);
      } else {
        setMgmtSalaryError(res.error || 'Failed to grant management approval');
      }
    } catch (err: any) {
      setMgmtSalaryError(err.message || 'Error granting management approval');
    } finally {
      setIsSubmittingMgmtApproval(false);
    }
  };

  const handlePushDossierDownstream = async (app: Application) => {
    setIsPushingDownstream(true);
    try {
      const targetInst = institutes.find((i) => i.id === (app.forwarded_to_institute_id || app.preferred_institute_id));
      const res = await pushDossierDownstream({
        application: app,
        pushedBy: 'Central HR Admin',
        targetInstituteName: targetInst?.official_name || targetInst?.name,
        headName: app.forwarded_to_head_name || targetInst?.head_name,
        headEmail: app.forwarded_to_head_email || targetInst?.head_email || targetInst?.official_email,
      });

      if (res.success) {
        const nowIso = new Date().toISOString();
        const updatedFields: Partial<Application> = {
          pushed_to_institute_portal: true,
          pushed_to_appointment_section: true,
          appointment_order_workflow_initiated: true,
          appointment_order_status: 'initiated',
          downstream_pushed_at: nowIso,
          downstream_pushed_by: 'Central HR Admin',
        };
        if (selectedApp && selectedApp.id === app.id) {
          setSelectedApp((prev) => prev ? { ...prev, ...updatedFields } : null);
        }
        setMgmtSuccessToast({
          show: true,
          msg: `Status and complete dossier successfully pushed to Institute Portal & Appointment Section!`,
          candidateName: app.candidate_name,
        });
        await fetchData();
        setTimeout(() => setMgmtSuccessToast(null), 7000);
      } else {
        alert(res.error || 'Failed to push downstream.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to push downstream.');
    } finally {
      setIsPushingDownstream(false);
    }
  };

  // Open Forward to Institute Head Modal
  const openForwardModal = (app: Application) => {
    // ── RBAC gate: Forward to Institute Head is restricted to Central HR only ──
    if (!isAdminHR) {
      console.warn('[RBAC] openForwardModal: blocked — caller is not admin_head_hr');
      return;
    }
    setForwardModalApp(app);
    const defaultInstId = app.preferred_institute_id || app.posts?.institute_id || (institutes[0]?.id || '');
    setForwardTargetInstId(defaultInstId);

    const inst = institutes.find((i) => i.id === defaultInstId);
    if (inst) {
      setForwardHeadName(inst.head_name || 'Principal');
      setForwardHeadEmail(inst.head_email || inst.official_email || 'principal@college.edu');
      setForwardHeadDesignation(inst.head_designation || 'Principal / Director');
    } else {
      setForwardHeadName('Principal');
      setForwardHeadEmail('principal@college.edu');
      setForwardHeadDesignation('Principal');
    }

    setForwardCentralRemarks(
      app.verification_remarks ||
        `Verified credentials at Central HR Front Desk. Forwarding for Principal review, departmental expertise evaluation, and physical interview recommendation.`
    );
  };

  const handleInstituteSelectChange = (instId: string) => {
    setForwardTargetInstId(instId);
    const inst = institutes.find((i) => i.id === instId);
    if (inst) {
      setForwardHeadName(inst.head_name || 'Principal');
      setForwardHeadEmail(inst.head_email || inst.official_email || 'principal@college.edu');
      setForwardHeadDesignation(inst.head_designation || 'Principal / Director');
    }
  };

  const handleConfirmForward = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── RBAC hard gate: reject non-Central-HR form submission at handler level ──
    if (!isAdminHR) {
      alert('Access Denied: Only Central HR (admin_head_hr) can forward applications to the Institute Head.');
      setForwardModalApp(null);
      return;
    }

    if (!forwardModalApp || !forwardTargetInstId) return;

    const targetInst = institutes.find((i) => i.id === forwardTargetInstId);
    if (!targetInst) return;

    setIsForwarding(true);
    try {
      const res = await forwardApplicationToInstitute({
        applicationId: forwardModalApp.id,
        applicationNo: forwardModalApp.application_no,
        candidateName: forwardModalApp.candidate_name,
        targetInstitute: targetInst,
        headName: forwardHeadName || targetInst.head_name || 'Principal',
        headEmail: forwardHeadEmail || targetInst.head_email || targetInst.official_email || 'principal@college.edu',
        headDesignation: forwardHeadDesignation || targetInst.head_designation || 'Principal',
        centralHrRemarks: forwardCentralRemarks,
        forwardedBy: 'Central HR Admin',
        callerRole: role,
      });

      if (res.success) {
        const nowIso = new Date().toISOString();
        if (selectedApp && selectedApp.id === forwardModalApp.id) {
          setSelectedApp((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'forwarded_to_institute',
                  forwarded_at: nowIso,
                  forwarded_by: 'Central HR Admin',
                  forwarded_to_institute_id: targetInst.id,
                  forwarded_to_head_name: forwardHeadName || targetInst.head_name || 'Principal',
                  forwarded_to_head_email: forwardHeadEmail || targetInst.head_email || targetInst.official_email || 'principal@college.edu',
                  forwarded_to_head_designation: forwardHeadDesignation || targetInst.head_designation || 'Principal',
                  central_hr_remarks: forwardCentralRemarks,
                }
              : null
          );
        }
        setForwardSuccessToast({
          show: true,
          msg: `Application #${forwardModalApp.application_no} (${forwardModalApp.candidate_name}) forwarded to ${targetInst.official_name || targetInst.name}!`,
          emailTo: forwardHeadEmail || targetInst.head_email || targetInst.official_email || 'principal@college.edu',
        });
        setForwardModalApp(null);
        await fetchData();
        setTimeout(() => setForwardSuccessToast(null), 7000);
      } else if (res.error) {
        alert(res.error);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to forward application.');
    } finally {
      setIsForwarding(false);
    }
  };

  // Open Edit Candidate Form Modal
  const openEditAppModal = (app: Application) => {
    const aadhaarVal = app.aadhaar_full || app.aadhaar_masked || '';
    const panVal = app.pan_full || app.pan_masked || '';

    const eduItems = (app.application_education && app.application_education.length > 0)
      ? app.application_education.map((e) => ({
          level: e.level || 'UG',
          degree_name: e.degree_name || '',
          board_university: e.board_university || '',
          passing_year: e.passing_year || '',
          status_remark: e.status_remark || '',
          percentage: e.percentage !== undefined && e.percentage !== null ? e.percentage.toString() : '',
          marking_system: e.marking_system || 'percentage',
          cgpa: e.cgpa != null ? String(e.cgpa) : '',
          cgpa_scale: e.cgpa_scale != null ? String(e.cgpa_scale) : '10',
          doc_url: e.doc_url || '',
        }))
      : [
          { level: 'Below 10th / SSC (१०वी पेक्षा कमी)', degree_name: '', board_university: '', passing_year: '', status_remark: '', percentage: '', marking_system: 'percentage' as const, cgpa: '', cgpa_scale: '10', doc_url: '' },
          { level: 'S.S.C. (10th) / १०वी', degree_name: 'SSC', board_university: '', passing_year: '', status_remark: '', percentage: '', marking_system: 'percentage' as const, cgpa: '', cgpa_scale: '10', doc_url: '' },
          { level: 'H.S.C. (12th) / १२वी', degree_name: 'HSC', board_university: '', passing_year: '', status_remark: '', percentage: '', marking_system: 'percentage' as const, cgpa: '', cgpa_scale: '10', doc_url: '' },
          { level: 'Diploma / पदविका', degree_name: '', board_university: '', passing_year: '', status_remark: '', percentage: '', marking_system: 'percentage' as const, cgpa: '', cgpa_scale: '10', doc_url: '' },
          { level: 'Graduation (UG) / पदवी', degree_name: '', board_university: '', passing_year: '', status_remark: '', percentage: '', marking_system: 'percentage' as const, cgpa: '', cgpa_scale: '10', doc_url: '' },
          { level: 'Post Graduation (PG) / पदव्युत्तर', degree_name: '', board_university: '', passing_year: '', status_remark: '', percentage: '', marking_system: 'percentage' as const, cgpa: '', cgpa_scale: '10', doc_url: '' },
          { level: 'Ph.D. / Doctorate / विद्यावाचस्पती', degree_name: '', board_university: '', passing_year: '', status_remark: 'Awarded', percentage: '', marking_system: 'percentage' as const, cgpa: '', cgpa_scale: '10', doc_url: '' },
          { level: 'Other / NET / SET / ITI / इतर', degree_name: '', board_university: '', passing_year: '', status_remark: 'Qualified', percentage: '', marking_system: 'percentage' as const, cgpa: '', cgpa_scale: '10', doc_url: '' },
        ];

    const expItems = (app.application_experience && app.application_experience.length > 0)
      ? app.application_experience.map((ex) => ({
          is_fresher: !!ex.is_fresher,
          organization_name: ex.organization_name || '',
          designation: ex.designation || '',
          years_experience: ex.years_experience !== undefined && ex.years_experience !== null ? ex.years_experience.toString() : '',
          previous_salary: ex.previous_salary !== undefined && ex.previous_salary !== null ? ex.previous_salary.toString() : '',
        }))
      : [
          { is_fresher: false, organization_name: '', designation: '', years_experience: '', previous_salary: '' },
        ];

    setEditForm({
      candidate_name: app.candidate_name || '',
      contact_no: app.contact_no || '',
      email_id: app.email_id || '',
      address: app.address || '',
      dob: app.dob || '',
      age: app.age ? app.age.toString() : '',
      is_married: !!app.is_married,
      aadhaar_input: aadhaarVal,
      pan_input: panVal,
      photo_url: app.photo_url || '',
      aadhaar_doc_url: app.aadhaar_doc_url || '',
      pan_doc_url: app.pan_doc_url || '',
      resume_url: app.resume_url || '',
      signature_url: app.signature_url || '',
      category_id: app.category_id || '',
      post_id: app.post_id || '',
      custom_post_title: app.custom_post_title || '',
      preferred_institute_id: app.preferred_institute_id || '',
      program_stream: app.program_stream || 'Engineering & Technology',
      course_name: app.course_name || '',
      specialization: app.specialization || '',
      salary_expectation: app.salary_expectation ? app.salary_expectation.toString() : '',
      verification_remarks: app.verification_remarks || '',
      education: eduItems,
      experience: expItems,
    });

    setEditingApp(app);
  };

  // Helper to calculate age from DOB
  const handleEditDobChange = (dobStr: string) => {
    let calculatedAge = editForm.age;
    if (dobStr) {
      const birthDate = new Date(dobStr);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age > 0 && age < 120) {
        calculatedAge = age.toString();
      }
    }
    setEditForm({ ...editForm, dob: dobStr, age: calculatedAge });
  };

  // Save Candidate Form Corrections
  const handleSaveAppEdit = async (andApprove: boolean) => {
    if (!editingApp) return;
    if (!editForm.candidate_name.trim()) {
      alert('Please enter candidate name.');
      return;
    }
    if (!editForm.contact_no.trim() || editForm.contact_no.trim().length < 10) {
      alert('Please enter valid 10-digit contact number.');
      return;
    }

    setIsSavingAppEdit(true);

    try {
      const cleanAadhaar = editForm.aadhaar_input.replace(/\s+/g, '').replace(/-/g, '');
      let maskedAadhaar = editForm.aadhaar_input;
      if (cleanAadhaar.length === 12) {
        maskedAadhaar = `XXXX-XXXX-${cleanAadhaar.slice(8)}`;
      }

      const cleanPan = toCleanPAN(editForm.pan_input);
      let maskedPan = cleanPan;
      if (cleanPan.length === 10) {
        maskedPan = `XXXXX${cleanPan.slice(5, 9)}${cleanPan.slice(9)}`;
      }

      const updatePayload: any = {
        candidate_name: toTitleCase(editForm.candidate_name),
        contact_no: editForm.contact_no.trim(),
        email_id: toCleanEmail(editForm.email_id) || null,
        address: toTitleCase(editForm.address),
        dob: editForm.dob || null,
        age: editForm.age ? parseInt(editForm.age, 10) : null,
        is_married: editForm.is_married,
        aadhaar_masked: maskedAadhaar,
        aadhaar_full: cleanAadhaar.length === 12 ? cleanAadhaar : (editingApp.aadhaar_full || null),
        pan_masked: maskedPan,
        pan_full: cleanPan.length === 10 ? cleanPan : (editingApp.pan_full || null),
        photo_url: editForm.photo_url || editingApp.photo_url || null,
        aadhaar_doc_url: editForm.aadhaar_doc_url || editingApp.aadhaar_doc_url || null,
        pan_doc_url: editForm.pan_doc_url || editingApp.pan_doc_url || null,
        resume_url: editForm.resume_url || editingApp.resume_url || null,
        signature_url: editForm.signature_url || editingApp.signature_url || null,
        category_id: editForm.category_id || null,
        post_id: editForm.post_id || null,
        custom_post_title: editForm.custom_post_title ? toTitleCase(editForm.custom_post_title) : null,
        preferred_institute_id: editForm.preferred_institute_id || null,
        program_stream: editForm.program_stream || 'Engineering & Technology',
        course_name: editForm.course_name ? toSmartTitleCase(editForm.course_name) : null,
        specialization: editForm.specialization ? toSmartTitleCase(editForm.specialization) : null,
        salary_expectation: editForm.salary_expectation ? parseFloat(editForm.salary_expectation) : null,
        verification_remarks: editForm.verification_remarks.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (andApprove) {
        updatePayload.status = 'verified_approved';
        updatePayload.verified_at = new Date().toISOString();
        if (!updatePayload.verification_remarks) {
          updatePayload.verification_remarks = 'Form verified, corrected and approved at front desk counter.';
        }
      }

      const { error: appErr } = await supabase
        .from('applications')
        .update(updatePayload)
        .eq('id', editingApp.id);

      if (appErr) throw appErr;

      // Update Education Rows (Preserving doc_url)
      await supabase.from('application_education').delete().eq('application_id', editingApp.id);
      
      const validEdu = editForm.education
        .filter((e) => e.degree_name.trim() || e.percentage.trim() || e.cgpa.trim() || e.board_university?.trim() || e.passing_year?.trim() || e.status_remark?.trim() || e.doc_url)
        .map((e) => ({
          application_id: editingApp.id,
          level: e.level,
          degree_name: toSmartTitleCase(e.degree_name) || e.level,
          board_university: toSmartTitleCase(e.board_university || '') || null,
          passing_year: e.passing_year?.trim() || null,
          status_remark: e.status_remark || null,
          percentage: e.marking_system === 'percentage' && e.percentage ? parseFloat(e.percentage) : null,
          marking_system: e.marking_system,
          cgpa: e.marking_system === 'cgpa' && e.cgpa ? parseFloat(e.cgpa) : null,
          cgpa_scale: e.marking_system === 'cgpa' && e.cgpa_scale ? parseFloat(e.cgpa_scale) : null,
          doc_url: e.doc_url || null,
        }));

      if (validEdu.length > 0) {
        const { error: eduErr } = await supabase.from('application_education').insert(validEdu);
        if (eduErr) console.error('Education update error:', eduErr);
      }

      // Update Experience Rows
      await supabase.from('application_experience').delete().eq('application_id', editingApp.id);

      const validExp = editForm.experience
        .filter((ex) => ex.is_fresher || ex.organization_name.trim() || ex.designation.trim())
        .map((ex) => ({
          application_id: editingApp.id,
          is_fresher: ex.is_fresher,
          organization_name: ex.is_fresher ? 'Fresher' : toSmartTitleCase(ex.organization_name),
          designation: ex.is_fresher ? 'N/A' : toTitleCase(ex.designation) || null,
          years_experience: ex.is_fresher ? 0 : (ex.years_experience ? parseFloat(ex.years_experience) : null),
          previous_salary: ex.is_fresher ? null : (ex.previous_salary ? parseFloat(ex.previous_salary) : null),
        }));

      if (validExp.length > 0) {
        const { error: expErr } = await supabase.from('application_experience').insert(validExp);
        if (expErr) console.error('Experience update error:', expErr);
      }

      setEditingApp(null);
      await fetchData();
      alert(andApprove ? 'Application corrected and approved successfully! You can now collect the fee.' : 'Application corrections saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update application');
    } finally {
      setIsSavingAppEdit(false);
    }
  };

  // Open Payment Modal
  const openPaymentModal = (app: Application) => {
    setPayApp(app);
    const fee = app.staff_categories?.application_fee ?? 50;
    setFeeAmount(fee);
    setSelectedPaymentMode(paymentModes[0]?.name || 'Cash');
    setPaymentRefNo('');
  };

  // Confirm Fee Payment & Generate Receipt
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payApp) return;
    setIsProcessingPayment(true);

    try {
      // 1. Generate Atomic Unique Fee Receipt Number from Database Sequence
      let generatedReceiptNo = '';
      try {
        const { data: seqData, error: seqError } = await supabase.rpc('get_next_sequence_number', {
          p_series_type: 'fee_receipt'
        });
        if (!seqError && seqData) {
          generatedReceiptNo = seqData;
        }
      } catch (err) {
        console.warn('Fallback sequence generation:', err);
      }

      // Safe Fallback if RPC is not yet executed in database
      if (!generatedReceiptNo) {
        const currentYear = new Date().getFullYear();
        const prefix = org?.fee_receipt_prefix || 'FR';
        const randomSeq = Math.floor(10000 + Math.random() * 90000);
        generatedReceiptNo = `${prefix}-${currentYear}-${randomSeq}`;
      }

      const amountWords = numberToWordsINR(feeAmount);

      const { error: recError } = await supabase.from('fee_receipts').insert({
        receipt_no: generatedReceiptNo,
        application_id: payApp.id,
        amount: feeAmount,
        amount_in_words: amountWords,
        payment_mode: selectedPaymentMode,
        reference_no: paymentRefNo.trim() || null,
        is_cancelled: false,
      });

      if (recError) throw recError;

      const { error: updateAppError } = await supabase
        .from('applications')
        .update({ status: 'fee_paid' })
        .eq('id', payApp.id);

      if (updateAppError) throw updateAppError;

      setPrintedReceipt({
        receipt_no: generatedReceiptNo,
        app: payApp,
        amount: feeAmount,
        amount_in_words: amountWords,
        payment_mode: selectedPaymentMode,
        reference_no: paymentRefNo,
        date: new Date().toLocaleDateString('en-GB'),
      });

      setPayApp(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error processing fee receipt');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Open Edit Receipt Modal
  const openEditReceiptModal = (app: Application) => {
    const latestReceipt = app.fee_receipts && app.fee_receipts[0];
    if (!latestReceipt) {
      alert('No fee receipt found for this application.');
      return;
    }
    setEditingReceipt({
      receipt: latestReceipt,
      app: app,
      amount: latestReceipt.amount,
      payment_mode: latestReceipt.payment_mode || 'Cash',
      reference_no: latestReceipt.reference_no || '',
    });
  };

  // Save Edited Receipt
  const handleSaveEditedReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;
    setIsUpdatingReceipt(true);

    try {
      const amountWords = numberToWordsINR(editingReceipt.amount);

      const { error: updateRecErr } = await supabase
        .from('fee_receipts')
        .update({
          amount: editingReceipt.amount,
          amount_in_words: amountWords,
          payment_mode: editingReceipt.payment_mode,
          reference_no: editingReceipt.reference_no.trim() || null,
        })
        .eq('id', editingReceipt.receipt.id);

      if (updateRecErr) throw updateRecErr;

      // Update printed receipt view with updated details
      setPrintedReceipt({
        receipt_no: editingReceipt.receipt.receipt_no,
        app: editingReceipt.app,
        amount: editingReceipt.amount,
        amount_in_words: amountWords,
        payment_mode: editingReceipt.payment_mode,
        reference_no: editingReceipt.reference_no,
        date: new Date(editingReceipt.receipt.issued_at || Date.now()).toLocaleDateString('en-GB'),
      });

      setEditingReceipt(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update fee receipt.');
    } finally {
      setIsUpdatingReceipt(false);
    }
  };

  // Open Delete / Cancel Receipt Modal
  const openDeleteReceiptModal = (app: Application) => {
    const latestReceipt = app.fee_receipts && app.fee_receipts[0];
    if (!latestReceipt) {
      alert('No fee receipt found to delete.');
      return;
    }
    setDeletingReceipt({
      receipt: latestReceipt,
      app: app,
      selectedQuickReason: 'Wrong candidate selected / Entered by mistake',
      cancellationReason: '',
    });
  };

  // Confirm Cancel Receipt with Reason (Never permanently deletes, marks CANCELLED)
  const handleConfirmDeleteReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingReceipt) return;
    setIsDeletingReceipt(true);

    const fullReason = deletingReceipt.cancellationReason.trim()
      ? `${deletingReceipt.selectedQuickReason} — ${deletingReceipt.cancellationReason.trim()}`
      : deletingReceipt.selectedQuickReason;

    try {
      // 1. Mark receipt as CANCELLED with audit reason (Preserves numbering series integrity)
      const { error: cancelError } = await supabase
        .from('fee_receipts')
        .update({
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: fullReason,
        })
        .eq('id', deletingReceipt.receipt.id);

      if (cancelError) throw cancelError;

      // 2. Reset application status back to verified_approved so counter officer can collect if needed
      const { error: updateAppErr } = await supabase
        .from('applications')
        .update({
          status: 'verified_approved',
          verification_remarks: `Receipt #${deletingReceipt.receipt.receipt_no} CANCELLED (${fullReason}). Ready for fresh fee collection.`,
        })
        .eq('id', deletingReceipt.app.id);

      if (updateAppErr) throw updateAppErr;

      setDeletingReceipt(null);
      await fetchData();
      alert(`Fee Receipt #${deletingReceipt.receipt.receipt_no} has been officially marked as CANCELLED.`);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel fee receipt.');
    } finally {
      setIsDeletingReceipt(false);
    }
  };

  // Quick Open Print Receipt
  const handlePrintExistingReceipt = (app: Application) => {
    const latestReceipt = app.fee_receipts && app.fee_receipts[0];
    if (!latestReceipt) {
      alert('No receipt found for this application.');
      return;
    }

    setPrintedReceipt({
      receipt_no: latestReceipt.receipt_no,
      app: app,
      amount: latestReceipt.amount,
      amount_in_words: latestReceipt.amount_in_words || numberToWordsINR(latestReceipt.amount),
      payment_mode: latestReceipt.payment_mode || 'Cash',
      reference_no: latestReceipt.reference_no || '',
      date: new Date(latestReceipt.issued_at || Date.now()).toLocaleDateString('en-GB'),
    });
  };

  return (
    <RoleGuard
      allowedRoles={['admin_head_hr', 'receptionist']}
      title="Front Desk / HR Admin Access Required"
      description="Only Front Desk Officers and Head Central HR Administrators have permission to access the Front Desk & Verification."
    >
      <div className="min-h-screen bg-slate-100 text-slate-900 pb-12 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20 shadow-sm no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              title="Back to Home Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <TrustLetterhead org={org} variant="compact" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/apply"
              target="_blank"
              className="px-3.5 py-2 border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              title="Open Walk-in Candidate Application Form in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Walk-in Form
            </Link>
            <Link
              href="/setup"
              className="px-3.5 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-sm"
              title="Trust Settings & Logo"
            >
              Trust Settings
            </Link>
            <Link
              href="/admin/posts"
              className="px-3.5 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Designations Master
            </Link>
            <Link
              href="/institute-portal"
              className="px-3.5 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              title="Open Institute Principal Portal"
            >
              <Building2 className="w-3.5 h-3.5 text-sky-600" /> Institute Portal
            </Link>
            <Link
              href="/receptionist/fee-register"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
            >
              <IndianRupee className="w-4 h-4" /> Fee Register
            </Link>
            <Link
              href="/qr"
              target="_blank"
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> QR Standee
            </Link>
            <NotificationBell
              role="receptionist"
              onSelectApplication={(appId) => {
                const a = applications.find((x) => x.id === appId);
                if (a) setSelectedApp(a);
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6 no-print">
        
        {/* Forwarding Success Banner with Automated Email Alert Notice */}
        {forwardSuccessToast && (
          <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-0.5">
                <div className="font-black text-sm">{forwardSuccessToast.msg}</div>
                <div className="text-xs text-indigo-100 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Automated in-app alert & email alert dispatched to: <strong>{forwardSuccessToast.emailTo}</strong></span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setForwardSuccessToast(null)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-slate-500 text-[11px] font-semibold block">Total Applications</span>
            <span className="text-2xl font-black text-slate-900 mt-0.5 block">{applications.length}</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-amber-700 text-[11px] font-semibold block">Pending Verification</span>
            <span className="text-2xl font-black text-amber-900 mt-0.5 block">
              {applications.filter(a => a.status === 'submitted').length}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-sky-700 text-[11px] font-semibold block">Ready for Fee</span>
            <span className="text-2xl font-black text-sky-900 mt-0.5 block">
              {applications.filter(a => a.status === 'verified_approved').length}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-emerald-700 text-[11px] font-semibold block">Receipts Issued</span>
            <span className="text-2xl font-black text-emerald-900 mt-0.5 block">
              {applications.filter(a => a.status === 'fee_paid').length}
            </span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'forwarded_to_institute' ? 'all' : 'forwarded_to_institute')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              statusFilter === 'forwarded_to_institute'
                ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-500 shadow-md'
                : 'bg-white hover:bg-indigo-50/50 border-slate-200 shadow-sm'
            }`}
          >
            <span className="text-indigo-700 text-[11px] font-semibold block">Forwarded to Inst.</span>
            <span className="text-2xl font-black text-indigo-900 mt-0.5 block">
              {applications.filter(a => a.status === 'forwarded_to_institute').length}
            </span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'ready_for_physical_interview' ? 'all' : 'ready_for_physical_interview')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              statusFilter === 'ready_for_physical_interview'
                ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-500 shadow-md'
                : 'bg-white hover:bg-purple-50/50 border-slate-200 shadow-sm'
            }`}
          >
            <span className="text-purple-700 text-[11px] font-semibold block">Interview Req.</span>
            <span className="text-2xl font-black text-purple-900 mt-0.5 block">
              {applications.filter(a => a.status === 'ready_for_physical_interview' || !!a.interview_requested).length}
            </span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'selected_recommended' ? 'all' : 'selected_recommended')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer ${
              statusFilter === 'selected_recommended'
                ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-500 shadow-md'
                : 'bg-white hover:bg-emerald-50/50 border-slate-200 shadow-sm'
            }`}
          >
            <span className="text-emerald-700 text-[11px] font-semibold block">Selected / Rec.</span>
            <span className="text-2xl font-black text-emerald-900 mt-0.5 block">
              {applications.filter(a => a.status === 'selected_recommended' || a.institute_recommendation === 'selected' || a.institute_recommendation === 'recommended').length}
            </span>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-1">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search Candidate, Phone, Email, App No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>

            {/* Discipline / Stream Filter Dropdown */}
            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            >
              <option value="all">All Disciplines / Streams</option>
              {programStreamOptions.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({applications.length})
            </button>
            <button
              onClick={() => setStatusFilter('submitted')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                statusFilter === 'submitted'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pending ({applications.filter(a => a.status === 'submitted').length})
            </button>
            <button
              onClick={() => setStatusFilter('verified_approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                statusFilter === 'verified_approved'
                  ? 'bg-sky-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Fee Due ({applications.filter(a => a.status === 'verified_approved').length})
            </button>
            <button
              onClick={() => setStatusFilter('fee_paid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                statusFilter === 'fee_paid'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Fee Paid ({applications.filter(a => a.status === 'fee_paid').length})
            </button>
            <button
              onClick={() => setStatusFilter('forwarded_to_institute')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                statusFilter === 'forwarded_to_institute'
                  ? 'bg-indigo-700 text-white shadow-sm'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
              }`}
            >
              <Send className="w-3 h-3" />
              Forwarded ({applications.filter(a => a.status === 'forwarded_to_institute').length})
            </button>
            <button
              onClick={() => setStatusFilter('ready_for_physical_interview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                statusFilter === 'ready_for_physical_interview'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              <Calendar className="w-3 h-3" />
              Interview Req. ({applications.filter(a => a.status === 'ready_for_physical_interview' || !!a.interview_requested).length})
            </button>
            <button
              onClick={() => setStatusFilter('selected_recommended')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                statusFilter === 'selected_recommended'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              Selected / Rec. ({applications.filter(a => a.status === 'selected_recommended' || a.institute_recommendation === 'selected' || a.institute_recommendation === 'recommended').length})
            </button>
            <button
              onClick={() => setStatusFilter('management_approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                statusFilter === 'management_approved'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              <Award className="w-3 h-3" />
              Mgmt Approved ({applications.filter(a => a.status === 'management_approved').length})
            </button>
            <button
              onClick={() => setStatusFilter('multiple_submissions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                statusFilter === 'multiple_submissions'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : multipleSubmissionsCount > 0
                  ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Multi-Submissions ({multipleSubmissionsCount})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
          {([
            ['village_city', 'Village / City'],
            ['taluka', 'Taluka'],
            ['district', 'District'],
            ['state', 'State'],
            ['pin_code', 'PIN Code'],
          ] as const).map(([field, label]) => (
            <label key={field} className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {label}
              <input type="search" value={locationFilters[field]} onChange={(event) => setLocationFilters((previous) => ({ ...previous, [field]: event.target.value }))} placeholder={`Filter by ${label}`} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-normal normal-case bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </label>
          ))}
        </div>

        {/* Applications & Receipts Table */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-500 text-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-700 border-t-transparent mx-auto mb-3"></div>
              Loading candidate applications...
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-sm">
              No applications match your filter criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-4 px-5">App No & Date</th>
                  <th className="py-4 px-5">Candidate Information</th>
                  <th className="py-4 px-5">Job Designation & Stream</th>
                  <th className="py-4 px-5">Fee & Receipt Details</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.map((app) => {
                  const receipt = app.fee_receipts && app.fee_receipts[0];
                  const dupInfo = duplicateAppMap.get(app.id);
                  const hasDuplicates = !!dupInfo;

                  return (
                    <tr
                      key={app.id}
                      className={`transition ${
                        hasDuplicates
                          ? 'bg-amber-50/40 hover:bg-amber-100/50 border-l-4 border-l-amber-500'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-4 px-5 font-mono">
                        {(() => {
                          const parsedApp = parseApplicationNumber(app.application_no);
                          return (
                            <button
                              type="button"
                              onClick={() => setSelectedApp(app)}
                              className="font-bold text-sky-800 block text-sm hover:underline hover:text-sky-950 transition text-left"
                              title="Click to view candidate credentials"
                            >
                              {parsedApp.isStandard ? (
                                <span className="inline-flex items-center tracking-tight">
                                  <span className="text-slate-500 font-medium">{parsedApp.year}-{parsedApp.month}-</span>
                                  <span className="text-sky-800 font-extrabold">{parsedApp.sequence}</span>
                                </span>
                              ) : (
                                <span>{app.application_no}</span>
                              )}
                            </button>
                          );
                        })()}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-400 font-sans">
                            {new Date(app.created_at).toLocaleDateString('en-GB')}
                          </span>
                          {hasDuplicates && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200/90 text-amber-900 border border-amber-300 font-sans">
                              #{dupInfo.allApps.findIndex(a => a.id === app.id) + 1} of {dupInfo.count}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedApp(app)}
                            className="font-bold text-slate-900 block text-sm hover:text-sky-700 hover:underline transition text-left"
                            title="Click to view candidate credentials"
                          >
                            {app.candidate_name}
                          </button>
                          {hasDuplicates && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDuplicateModalApp(app);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-xs transition"
                              title={`Found ${dupInfo.count} applications with matching ${dupInfo.matchedDescriptions.join(' or ')}. Click to compare all.`}
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse" />
                              <span>{dupInfo.count}x Multi-Submissions</span>
                            </button>
                          )}
                        </div>
                        <span className="text-slate-600 block mt-0.5">📞 {app.contact_no}</span>
                        {app.email_id && (
                          <span className="text-[11px] text-slate-500 block truncate max-w-[220px]" title={app.email_id}>
                            ✉️ {app.email_id}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-mono block">
                          Aadhaar: {app.aadhaar_masked}
                        </span>
                      </td>

                      <td className="py-4 px-5">
                        <span className="font-bold text-slate-800 block">
                          {app.posts?.title || app.custom_post_title || 'Unassigned'}
                        </span>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-100">
                            {app.program_stream || 'Engineering & Technology'}
                          </span>
                          {app.course_name && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px] border border-indigo-100">
                              {app.course_name}
                            </span>
                          )}
                          {app.specialization && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold text-[10px] border border-sky-100">
                              {app.specialization}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            • {app.staff_categories?.name || 'General'}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        {receipt ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono font-bold text-xs block ${
                                receipt.is_cancelled ? 'line-through text-rose-600' : 'text-slate-900'
                              }`}>
                                {receipt.receipt_no}
                              </span>
                              {receipt.is_cancelled && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                                  CANCELLED
                                </span>
                              )}
                            </div>
                            <span className={receipt.is_cancelled ? 'text-slate-400 text-xs' : 'text-emerald-700 font-extrabold text-xs'}>
                              ₹ {receipt.amount}.00 ({receipt.payment_mode})
                            </span>
                            {receipt.is_cancelled && receipt.cancellation_reason && (
                              <span className="text-[10px] text-rose-600 block italic leading-tight">
                                Reason: {receipt.cancellation_reason}
                              </span>
                            )}
                            {!receipt.is_cancelled && receipt.reference_no && (
                              <span className="text-[10px] text-slate-400 block font-mono">
                                Ref: {receipt.reference_no}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-700 text-xs">
                              Fee: ₹ {app.staff_categories?.application_fee ?? 50}
                            </span>
                            <span className="text-[11px] text-slate-400 block">Not collected yet</span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-5 text-center">
                        {app.status === 'submitted' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pending Verification
                          </span>
                        )}
                        {app.status === 'verified_approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                            <CreditCard className="w-3 h-3" /> Approved (Collect Fee)
                          </span>
                        )}
                        {app.status === 'fee_paid' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Fee Paid
                          </span>
                        )}
                        {app.status === 'forwarded_to_institute' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs">
                              <Building2 className="w-3 h-3 text-indigo-600" /> Forwarded to Institute
                            </span>
                            {app.forwarded_to_head_name && (
                              <span className="text-[10px] text-indigo-600 font-medium mt-0.5 truncate max-w-[140px]">
                                {app.forwarded_to_head_name}
                              </span>
                            )}
                          </div>
                        )}
                        {(app.status === 'selected_recommended' || app.institute_recommendation === 'selected' || app.institute_recommendation === 'recommended') && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                              <CheckCircle className="w-3 h-3 text-emerald-700" /> Selected / Recommended
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              {typeof app.interview_score === 'number' && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                  Score: {app.interview_score}/100
                                </span>
                              )}
                              {app.physical_docs_status === 'verified_all_clear' && (
                                <span className="text-[10px] text-emerald-700 font-bold" title="Original certificates verified">
                                  ✓ Docs Clear
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {app.status === 'management_approved' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs">
                              <Award className="w-3 h-3 text-blue-700" /> Management Approved
                            </span>
                            <span className="text-[10px] text-blue-700 font-bold mt-0.5">
                              Appointment Authorized
                            </span>
                          </div>
                        )}
                        {(app.status === 'ready_for_physical_interview' || (app.interview_requested && !['selected_recommended', 'management_approved', 'hold', 'rejected'].includes(app.status))) && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs animate-pulse">
                              <Calendar className="w-3 h-3 text-purple-700" /> Physical Interview Requested
                            </span>
                            {app.interview_suggested_date && (
                              <span className="text-[10px] text-purple-700 font-bold mt-0.5">
                                {new Date(app.interview_suggested_date).toLocaleDateString('en-GB')}
                              </span>
                            )}
                          </div>
                        )}
                        {app.status === 'hold' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                            <PauseCircle className="w-3 h-3 text-amber-700" /> On Hold by Institute
                          </span>
                        )}
                        {app.status === 'institute_reviewed' && !app.interview_requested && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            <CheckCircle2 className="w-3 h-3 text-teal-600" /> Institute Review Completed
                          </span>
                        )}
                        {app.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <X className="w-3 h-3 text-rose-600" /> Rejected
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Case A: Pending Verification */}
                          {app.status === 'submitted' && (
                            <button
                              type="button"
                              onClick={() => setSelectedApp(app)}
                              className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold border border-sky-200 transition inline-flex items-center gap-1.5 text-xs shadow-sm hover:shadow"
                              title="Verify Candidate Credentials"
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-700" />
                              <span>Verify</span>
                            </button>
                          )}

                          {/* Case B: Approved (Ready for Fee Payment) */}
                          {app.status === 'verified_approved' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedApp(app)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 transition inline-flex items-center gap-1 text-xs"
                                title="View Candidate Credentials"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                                <span>View</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openPaymentModal(app)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm hover:shadow transition inline-flex items-center gap-1.5 text-xs"
                                title="Collect Application Fee"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Collect Fee</span>
                              </button>
                            </>
                          )}

                          {/* Case C: Fee Paid */}
                          {app.status === 'fee_paid' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedApp(app)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 transition inline-flex items-center gap-1 text-xs"
                                title="View Candidate Credentials"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                                <span>View</span>
                              </button>

                              {receipt && (
                                <button
                                  type="button"
                                  onClick={() => handlePrintExistingReceipt(app)}
                                  className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold border border-sky-300 transition inline-flex items-center gap-1.5 text-xs shadow-sm hover:shadow"
                                  title="Print Fee Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5 text-sky-700" />
                                  <span>Receipt</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* Case D: Forwarded or Interview Requested / Reviewed */}
                          {['forwarded_to_institute', 'ready_for_physical_interview', 'hold', 'institute_reviewed', 'selected_recommended', 'management_approved'].includes(app.status) && (
                            <button
                              type="button"
                              onClick={() => setSelectedApp(app)}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold border border-indigo-200 transition inline-flex items-center gap-1 text-xs"
                              title="Inspect Forwarded Dossier, Interview Feedback & Evaluation"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-700" />
                              <span>Dossier</span>
                            </button>
                          )}

                          {/* Quick Forward Button — Central HR (admin_head_hr) only */}
                          {isAdminHR && ['submitted', 'verified_approved', 'fee_paid'].includes(app.status) && !app.forwarded_at && (
                            <button
                              type="button"
                              onClick={() => openForwardModal(app)}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition inline-flex items-center gap-1 text-xs shadow-xs"
                              title="Forward candidate to Institute Head (Central HR only)"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Forward</span>
                            </button>
                          )}

                          {/* Unified More Actions Dropdown Button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleRowMenu(e, app)}
                            className={`p-1.5 rounded-xl border transition inline-flex items-center justify-center ${
                              menuAnchor?.app.id === app.id
                                ? 'bg-sky-100 text-sky-800 border-sky-300 shadow-inner'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
                            }`}
                            title="More actions (Edit form, print summary, receipt options)"
                            aria-label="More actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* FLOATING ROW ACTIONS MENU */}
      {menuAnchor && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40 bg-black/5"
            onClick={() => setMenuAnchor(null)}
          />

          {/* Menu Card */}
          <div
            className="fixed z-50 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1 text-left font-sans animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
            style={{
              top: menuAnchor.top,
              bottom: menuAnchor.bottom,
              right: menuAnchor.right,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Summary */}
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block font-mono">
                {menuAnchor.app.application_no}
              </span>
              <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">
                {menuAnchor.app.candidate_name}
              </span>
            </div>

            {/* Candidate Actions */}
            <div className="p-1.5 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2.5 py-1">
                Candidate Application
              </span>

              {/* View / Verify Details */}
              <button
                type="button"
                onClick={() => {
                  const app = menuAnchor.app;
                  setMenuAnchor(null);
                  setSelectedApp(app);
                }}
                className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-sky-700 hover:bg-sky-50 transition flex items-center gap-2.5 text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Eye className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">
                    {menuAnchor.app.status === 'submitted' ? 'Verify Candidate' : 'View Full Details'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Inspect credentials & documents
                  </div>
                </div>
              </button>

              {/* Edit Candidate Form
                  - admin_head_hr: can edit at ANY status (full override)
                  - receptionist: can edit ONLY at 'submitted' or 'verified_approved' (before fee receipt is issued)
                  - Once fee_paid or beyond: form is LOCKED for front desk to preserve receipt integrity */}
              {(() => {
                const POST_FEE_STATUSES = [
                  'fee_paid', 'forwarded_to_institute', 'ready_for_physical_interview',
                  'interview_scheduled', 'selected_recommended', 'management_approved',
                  'institute_reviewed', 'hold', 'rejected', 'cancelled',
                ];
                const isFeeLocked = POST_FEE_STATUSES.includes(menuAnchor.app.status);
                const canEdit = isAdminHR || (!isFeeLocked);

                return canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    const app = menuAnchor.app;
                    setMenuAnchor(null);
                    openEditAppModal(app);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-amber-800 hover:bg-amber-50 transition flex items-center gap-2.5 text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Edit3 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">Edit Application Form</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Correct personal, stream or post
                    </div>
                  </div>
                </button>
                ) : (
                /* Locked state — shown to receptionist when fee is already paid */
                <div className="w-full px-2.5 py-2 rounded-xl text-xs flex items-center gap-2.5 opacity-50 cursor-not-allowed select-none">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-500">Edit Form (Locked)</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Fee receipt issued — contact Admin HR to edit
                    </div>
                  </div>
                </div>
                );
              })()}


              {/* Print 1-Page Candidate Form */}
              <button
                type="button"
                onClick={() => {
                  const app = menuAnchor.app;
                  setMenuAnchor(null);
                  setPrintFormApp(app);
                }}
                className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 transition flex items-center gap-2.5 text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">Print Candidate Form</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    1-page summary sheet for panel
                  </div>
                </div>
              </button>

              {/* Forward to Institute Head — Central HR (admin_head_hr) only */}
              {isAdminHR && (
                menuAnchor.app.forwarded_at ? (
                  <div
                    className="w-full px-2.5 py-2 rounded-xl text-xs flex items-center gap-2.5 opacity-70 cursor-not-allowed select-none border-t border-slate-100 mt-0.5 bg-slate-50"
                    title={`Application dossier was already forwarded on ${new Date(menuAnchor.app.forwarded_at).toLocaleString('en-IN')}`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-700">Already Forwarded</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(menuAnchor.app.forwarded_at).toLocaleDateString('en-GB')} {new Date(menuAnchor.app.forwarded_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const app = menuAnchor.app;
                      setMenuAnchor(null);
                      openForwardModal(app);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 transition flex items-center gap-2.5 text-left border-t border-slate-100 mt-0.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-indigo-900">Forward to Institute Head</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Route dossier for Principal review & interview
                      </div>
                    </div>
                  </button>
                )
              )}

              {/* Compare Multiple Applications if candidate has submitted more than once */}
              {duplicateAppMap.has(menuAnchor.app.id) && (
                <button
                  type="button"
                  onClick={() => {
                    const app = menuAnchor.app;
                    setMenuAnchor(null);
                    setDuplicateModalApp(app);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-amber-800 hover:text-amber-900 hover:bg-amber-50 transition flex items-center gap-2.5 text-left border-t border-slate-100 mt-0.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                  <div>
                    <div className="font-bold text-amber-900">Compare Multiple Forms</div>
                    <div className="text-[10px] text-amber-700 font-normal">
                      {duplicateAppMap.get(menuAnchor.app.id)?.count} submissions on record
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Fee & Receipt Section */}
            {menuAnchor.app.status === 'verified_approved' && (
              <div className="p-1.5 pt-0 border-t border-slate-100 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2.5 py-1 mt-1">
                  Fee Collection
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const app = menuAnchor.app;
                    setMenuAnchor(null);
                    openPaymentModal(app);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition flex items-center gap-2.5 text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-800">Collect Fee</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Issue new receipt
                    </div>
                  </div>
                </button>
              </div>
            )}

            {menuAnchor.app.status === 'fee_paid' && menuAnchor.app.fee_receipts?.[0] && (() => {
              const receipt = menuAnchor.app.fee_receipts[0];
              return (
                <div className="p-1.5 pt-0 border-t border-slate-100 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2.5 py-1 mt-1">
                    Receipt #{receipt.receipt_no}
                  </span>

                  {/* Print Duplicate Receipt */}
                  <button
                    type="button"
                    onClick={() => {
                      const app = menuAnchor.app;
                      setMenuAnchor(null);
                      handlePrintExistingReceipt(app);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-sky-700 hover:bg-sky-50 transition flex items-center gap-2.5 text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                      <Printer className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">Print Duplicate Receipt</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        ₹ {receipt.amount} ({receipt.payment_mode})
                      </div>
                    </div>
                  </button>

                  {/* Edit Receipt — Central HR (admin_head_hr) only; receipts are non-editable by front desk */}
                  {isAdminHR && !receipt.is_cancelled && (
                    <button
                      type="button"
                      onClick={() => {
                        const app = menuAnchor.app;
                        setMenuAnchor(null);
                        openEditReceiptModal(app);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-2.5 text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <Edit3 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">Edit Receipt Details</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Payment mode or reference no
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Cancel / Void Receipt — Central HR (admin_head_hr) only */}
                  {isAdminHR && !receipt.is_cancelled && (
                    <button
                      type="button"
                      onClick={() => {
                        const app = menuAnchor.app;
                        setMenuAnchor(null);
                        openDeleteReceiptModal(app);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 transition flex items-center gap-2.5 text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-rose-700">Cancel / Void Receipt</div>
                        <div className="text-[10px] text-rose-400 font-normal">
                          Mark cancelled with audit reason
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* 1. DOCUMENT VERIFICATION MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                  {selectedApp.application_no}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Candidate Credential Verification
                </h3>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Multiple Submissions Alert Banner */}
            {(() => {
              const dupInfo = duplicateAppMap.get(selectedApp.id);
              if (!dupInfo) return null;

              return (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 animate-pulse" />
                      <h4 className="font-black text-amber-950 text-xs sm:text-sm uppercase tracking-wider">
                        ⚠️ Notice: Multiple Submissions Detected ({dupInfo.count} Forms)
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 border border-amber-300 self-start sm:self-auto">
                      Matched by {dupInfo.matchedDescriptions.join(' & ')}
                    </span>
                  </div>

                  <p className="text-xs text-amber-900 leading-relaxed">
                    This candidate has submitted <strong>{dupInfo.count} application forms</strong> with matching phone ({selectedApp.contact_no}) {selectedApp.email_id ? `or email (${selectedApp.email_id})` : ''}.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {dupInfo.otherApps.map((other) => {
                      const hasFeePaid = other.status === 'fee_paid';
                      return (
                        <div
                          key={other.id}
                          className="p-3 rounded-xl border border-amber-300 bg-white shadow-2xs space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sky-900">{other.application_no}</span>
                            {hasFeePaid ? (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Fee Paid
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                {other.status === 'submitted' ? 'Verification Pending' : 'Approved'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-700 font-semibold truncate">
                            {other.posts?.title || other.custom_post_title || 'General'}
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                            <span className="text-slate-400">
                              {new Date(other.created_at).toLocaleDateString('en-GB')}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedApp(other)}
                              className="font-bold text-sky-700 hover:text-sky-900 hover:underline inline-flex items-center gap-0.5"
                            >
                              Switch to this form ➔
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Profile Header */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="w-16 h-20 bg-slate-200 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-300">
                {selectedApp.photo_url ? (
                  <img src={selectedApp.photo_url} alt="Photo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-slate-400">No Photo</span>
                )}
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-900">{selectedApp.candidate_name}</h4>
                <p className="text-xs text-sky-800 font-bold">
                  Applying for: {selectedApp.posts?.title || selectedApp.custom_post_title || 'General'}
                </p>
                <p className="text-xs text-purple-800 font-semibold mt-0.5">
                  Discipline: {selectedApp.program_stream || 'Engineering & Technology'}
                  {selectedApp.course_name ? ` • Course: ${selectedApp.course_name}` : ''}
                  {selectedApp.specialization ? ` (${selectedApp.specialization})` : ''}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">📞 {selectedApp.contact_no} | ✉️ {selectedApp.email_id || 'N/A'}</p>
                <p className="text-xs text-slate-500">📍 {[selectedApp.village_city, selectedApp.taluka && `Taluka ${selectedApp.taluka}`, selectedApp.district && `District ${selectedApp.district}`, selectedApp.state, selectedApp.pin_code && `PIN ${selectedApp.pin_code}`].filter(Boolean).join(', ') || selectedApp.address}</p>
              </div>
            </div>

            {/* Identity Document Scans & Signature */}
            <div className="space-y-2">
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700">Identity & Resume Documents</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Aadhaar */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-600 block uppercase">Aadhaar Card</span>
                  <span className="font-mono text-[11px] font-bold text-slate-900 block">{selectedApp.aadhaar_masked}</span>
                  {selectedApp.aadhaar_doc_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: `Aadhaar Card Scan (${selectedApp.aadhaar_masked})`, url: selectedApp.aadhaar_doc_url! })}
                      className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-bold rounded-lg border border-sky-200 inline-flex items-center gap-1 shadow-sm"
                    >
                      <Eye className="w-3 h-3" /> View Scan
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 block">No Scan</span>
                  )}
                </div>

                {/* PAN Card */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-600 block uppercase">PAN Card</span>
                  <span className="font-mono text-[11px] font-bold text-slate-900 block">{selectedApp.pan_masked}</span>
                  {selectedApp.pan_doc_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: `PAN Card Scan (${selectedApp.pan_masked})`, url: selectedApp.pan_doc_url! })}
                      className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-bold rounded-lg border border-sky-200 inline-flex items-center gap-1 shadow-sm"
                    >
                      <Eye className="w-3 h-3" /> View Scan
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 block">No Scan</span>
                  )}
                </div>

                {/* Resume / CV */}
                <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-200 text-center space-y-1.5">
                  <span className="text-[10px] font-bold text-purple-900 block uppercase">Resume / CV</span>
                  <span className="font-bold text-[11px] text-purple-950 block">
                    {selectedApp.resume_url ? 'Attached' : 'Not Uploaded'}
                  </span>
                  {selectedApp.resume_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: `Candidate Resume / CV (${selectedApp.candidate_name})`, url: selectedApp.resume_url! })}
                      className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold rounded-lg inline-flex items-center gap-1 shadow-sm"
                    >
                      <FileText className="w-3 h-3" /> View Resume
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 block">—</span>
                  )}
                </div>

                {/* Signature */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-600 block uppercase">Signature</span>
                  <div className="h-6 flex items-center justify-center">
                    {selectedApp.signature_url ? (
                      selectedApp.signature_url.startsWith('typed:') ? (
                        <span className="font-serif italic text-xs text-slate-800 truncate max-w-[120px]">
                          {selectedApp.signature_url.replace('typed:', '')}
                        </span>
                      ) : (
                        <img src={selectedApp.signature_url} alt="Sig" className="max-h-6 max-w-[100px] object-contain" />
                      )
                    ) : (
                      <span className="text-[10px] text-slate-400">No Signature</span>
                    )}
                  </div>
                  {selectedApp.signature_url && !selectedApp.signature_url.startsWith('typed:') ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: 'Candidate Signature', url: selectedApp.signature_url! })}
                      className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-bold rounded-lg border border-sky-200 inline-flex items-center gap-1 shadow-sm"
                    >
                      <Eye className="w-3 h-3" /> View Signature
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 block">
                      {selectedApp.signature_url?.startsWith('typed:') ? 'Digital Typed' : 'Not Uploaded'}
                    </span>
                  )}
                </div>

                {/* Caste / Category Certificate */}
                {selectedApp.caste_cert_url && (
                  <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-900 block uppercase">Caste Certificate</span>
                    <span className="font-bold text-[11px] text-amber-950 block">{selectedApp.reservation_category || 'Attached'}</span>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: `Caste Certificate (${selectedApp.candidate_name})`, url: selectedApp.caste_cert_url! })}
                      className="px-2 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold rounded-lg inline-flex items-center gap-1 shadow-sm"
                    >
                      <Eye className="w-3 h-3" /> View Certificate
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Educational Qualifications Table (With University, Year, Ph.D. status & Scan link) */}
            <div className="space-y-2">
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700">Educational Qualifications & Documents</h5>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Level / Degree</th>
                      <th className="py-2.5 px-3">Board / University</th>
                      <th className="py-2.5 px-3">Year</th>
                      <th className="py-2.5 px-3">Status / % Marks</th>
                      <th className="py-2.5 px-3 text-right">Certificate Scan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedApp.application_education?.map((edu, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {edu.level} — <span className="text-slate-600 font-normal">{edu.degree_name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-800">{edu.board_university || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-800">{edu.passing_year || '—'}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {edu.status_remark ? (
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-sky-100 text-sky-900 border border-sky-200">
                              {edu.status_remark}
                            </span>
                          ) : edu.marking_system === 'cgpa' && edu.cgpa != null ? (
                            `${edu.cgpa} / ${edu.cgpa_scale || 10} CGPA`
                          ) : edu.percentage ? (
                            `${edu.percentage}%`
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {edu.doc_url ? (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({ title: `${edu.level} (${edu.degree_name || 'Certificate'}) - ${selectedApp.candidate_name}`, url: edu.doc_url! })}
                                className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 text-[11px] font-bold inline-flex items-center gap-1 shadow-sm"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Preview</span>
                              </button>
                              <a
                                href={edu.doc_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-slate-700 p-0.5"
                                title="Open full size tab"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400">Not Uploaded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Experience Summary */}
            <div className="space-y-2">
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700">Experience History</h5>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Organization</th>
                      <th className="py-2.5 px-3">Designation</th>
                      <th className="py-2.5 px-3">Experience</th>
                      <th className="py-2.5 px-3">Last Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedApp.application_experience?.map((exp, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-semibold">{exp.is_fresher ? 'Fresher (No Prior Exp)' : exp.organization_name}</td>
                        <td className="py-2.5 px-3">{exp.designation || '—'}</td>
                        <td className="py-2.5 px-3">{exp.years_experience ? `${exp.years_experience} Yrs` : '—'}</td>
                        <td className="py-2.5 px-3">{exp.previous_salary ? `₹ ${exp.previous_salary}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Institutional Recruitment & Review Dossier (Multi-Tier Workflow) */}
            {selectedApp.forwarded_at && (
              <div className="bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-700" />
                    <h5 className="font-black text-xs uppercase tracking-wider text-indigo-950">
                      Institute Head Forwarding & Review Dossier
                    </h5>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                    Forwarded: {new Date(selectedApp.forwarded_at).toLocaleString('en-GB')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Forwarded To:</span>
                    <span className="font-bold text-slate-900 block">
                      {selectedApp.forwarded_to_head_name || 'Principal'} ({selectedApp.forwarded_to_head_designation || 'Head'})
                    </span>
                    <span className="text-[11px] font-mono text-slate-600">{selectedApp.forwarded_to_head_email}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Central HR Initial Remarks:</span>
                    <p className="text-slate-800 italic bg-white p-2 rounded-lg border border-indigo-100 text-[11px] leading-snug">
                      "{selectedApp.central_hr_remarks || 'Forwarded for evaluation'}"
                    </p>
                  </div>
                </div>

                {/* Institute Head Feedback & Physical Interview Dossier */}
                {selectedApp.reviewed_at ? (
                  <div className="bg-white p-4 rounded-xl border border-indigo-200 space-y-3.5 mt-2 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-xs text-slate-900">
                          Physical Interview Evaluated by {selectedApp.reviewed_by_head_name || 'Institute Head / Principal'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(selectedApp.reviewed_at).toLocaleString('en-GB')}
                      </span>
                    </div>

                    {/* Definitive Recommendation Badge */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[10.5px] font-bold uppercase text-slate-500">Definitive Outcome:</span>
                      {(selectedApp.institute_recommendation === 'selected' || selectedApp.institute_recommendation === 'recommended') && (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                          SELECTED / RECOMMENDED FOR APPOINTMENT
                        </span>
                      )}
                      {selectedApp.institute_recommendation === 'hold' && (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                          <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
                          PLACED ON HOLD / WAITLIST
                        </span>
                      )}
                      {selectedApp.institute_recommendation === 'rejected' && (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1.5 shadow-2xs">
                          <X className="w-3.5 h-3.5 text-rose-700" />
                          REJECTED / NOT RECOMMENDED
                        </span>
                      )}
                    </div>

                    {/* Physical Interview Specifics & Scores Grid */}
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Interview Date & Time</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-sky-600" />
                          {selectedApp.interview_conducted_date
                            ? new Date(selectedApp.interview_conducted_date).toLocaleString('en-IN')
                            : selectedApp.interview_suggested_date
                            ? new Date(selectedApp.interview_suggested_date).toLocaleString('en-IN')
                            : 'Conducted on Campus'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Campus Venue</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-sky-600" />
                          {selectedApp.interview_venue || 'Institute Campus'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Evaluation Scores</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {typeof selectedApp.interview_score === 'number' && (
                            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-black text-slate-900 text-[11px]">
                              Score: {selectedApp.interview_score}/100
                            </span>
                          )}
                          {typeof selectedApp.interview_teaching_demo_score === 'number' && (
                            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-700 text-[11px]">
                              Demo: {selectedApp.interview_teaching_demo_score}/100
                            </span>
                          )}
                          {typeof selectedApp.interview_score !== 'number' && typeof selectedApp.interview_teaching_demo_score !== 'number' && (
                            <span className="text-slate-400 italic text-[11px]">Evaluated</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Interview Panel Committee Members */}
                    {selectedApp.interview_panel_members && (
                      <div className="text-xs">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Interview Committee / Panel Members:</span>
                        <span className="text-slate-800 font-semibold">{selectedApp.interview_panel_members}</span>
                      </div>
                    )}

                    {/* Original Document Verification Status Checked During Physical Interview */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Original Certificates Verification (Physical):</span>
                      {selectedApp.physical_docs_status === 'verified_all_clear' && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <div>
                            <strong>Original Documents 100% Verified & Authenticated:</strong> All original certificates, marksheets, degrees, and identity records checked during the physical interview were verified and clear.
                          </div>
                        </div>
                      )}
                      {selectedApp.physical_docs_status === 'discrepancy_observed' && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <div>
                            <strong>Discrepancy Observed:</strong> {selectedApp.physical_docs_remarks || 'Discrepancy noted during on-campus physical verification.'}
                          </div>
                        </div>
                      )}
                      {selectedApp.physical_docs_status === 'provisional_pending_docs' && (
                        <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center gap-2">
                          <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" />
                          <div>
                            <strong>Provisional Clearance:</strong> {selectedApp.physical_docs_remarks || 'Subject to submission of pending original documents.'}
                          </div>
                        </div>
                      )}
                      {!selectedApp.physical_docs_status && selectedApp.physical_docs_verified && (
                        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Original Certificates Verified by Institute Panel.</span>
                        </div>
                      )}
                    </div>

                    {/* Interview Panel Performance Notes */}
                    {selectedApp.interview_panel_remarks && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Interview Panel Performance Observations:</span>
                        <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 leading-relaxed font-medium">
                          "{selectedApp.interview_panel_remarks}"
                        </p>
                      </div>
                    )}

                    {/* Institute Head Justification / Remarks */}
                    {selectedApp.institute_remarks && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Institute Head / Principal Justification:</span>
                        <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 leading-relaxed font-medium">
                          "{selectedApp.institute_remarks}"
                        </p>
                      </div>
                    )}

                    {/* Central HR Management Approval Status / Authorization Section */}
                    {selectedApp.status === 'management_approved' ? (
                      <div className="p-4 bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 border-2 border-blue-400 rounded-2xl text-blue-950 text-xs space-y-3.5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-blue-200 pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                              <Award className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-black text-xs uppercase tracking-wider block text-blue-950">
                                Formal Management & Central HR Appointment Approval Granted
                              </span>
                              <span className="text-[11px] text-slate-600">
                                Authorized by <strong>{selectedApp.management_approved_by || 'Central HR Management'}</strong> on {new Date(selectedApp.management_approved_at || Date.now()).toLocaleString('en-GB')}.
                              </span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
                            ✓ Cleared for Appointment
                          </span>
                        </div>

                        {/* Structured Administrative Terms & Instructions Display */}
                        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-xs space-y-2.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block">
                            Confirmed Administrative Appointment Terms
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">Confirmed Designation</span>
                              <span className="font-black text-slate-900 block mt-0.5">
                                {selectedApp.confirmed_designation || selectedApp.posts?.title || 'Faculty / Staff'}
                              </span>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">Candidate Date of Joining</span>
                              <span className="font-black text-slate-900 block mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                                {selectedApp.joining_date ? new Date(selectedApp.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'As per official order'}
                              </span>
                            </div>

                            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-300">
                              <span className="text-[10px] font-black text-emerald-800 uppercase block">Agreed Total Salary (Compulsory)</span>
                              <span className="font-black text-emerald-950 block mt-0.5 text-sm">
                                ₹ {Number(selectedApp.agreed_total_salary || 0).toLocaleString('en-IN')}
                              </span>
                              {selectedApp.agreed_total_salary ? (
                                <span className="text-[9.5px] text-emerald-800 font-semibold block leading-tight mt-0.5">
                                  {numberToWordsINR(Number(selectedApp.agreed_total_salary))}
                                </span>
                              ) : null}
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">Pay Scale & Basic Pay</span>
                              <span className="font-bold text-slate-800 block mt-0.5">
                                {selectedApp.pay_scale || 'Standard Scale'}
                              </span>
                              {selectedApp.basic_pay ? (
                                <span className="text-[10px] text-slate-600 font-medium block">
                                  Basic Pay: ₹ {Number(selectedApp.basic_pay).toLocaleString('en-IN')}
                                </span>
                              ) : null}
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 sm:col-span-2">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">Mandatory Bond / Compliance</span>
                              <span className="font-bold text-slate-800 block mt-0.5">
                                {selectedApp.mandatory_bond_details || 'Standard Sanstha Service Terms & Compliance'}
                              </span>
                            </div>
                          </div>

                          {(selectedApp.appointment_instructions || selectedApp.management_approval_remarks) && (
                            <div className="pt-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                Additional Customized Administrative Instructions:
                              </span>
                              <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic font-medium leading-relaxed text-[11px]">
                                "{selectedApp.appointment_instructions || selectedApp.management_approval_remarks}"
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Downstream Modules Reflection & Initiation Status */}
                        <div className="bg-white/80 p-3 rounded-xl border border-blue-200 space-y-2 text-xs">
                          <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                            Downstream Modules Data Propagation
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-indigo-950 block">Institute Portal Reflection:</strong>
                                <span className="text-indigo-800">
                                  Candidate marked as "Formal Management & Central HR Appointment Approval Granted" for {selectedApp.forwarded_to_head_name || 'Principal'} ({selectedApp.forwarded_institutes?.short_name || 'College Admin'}).
                                </span>
                              </div>
                            </div>

                            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-emerald-950 block">Appointment & Recruitment Section:</strong>
                                <span className="text-emerald-800">
                                  Record flagged to initiate official appointment order generation workflow.
                                </span>
                              </div>
                            </div>
                          </div>

                          {selectedApp.downstream_pushed_at && (
                            <div className="text-[10px] text-slate-500 font-mono text-right">
                              Synchronized Downstream: {new Date(selectedApp.downstream_pushed_at).toLocaleString('en-GB')}
                            </div>
                          )}
                        </div>

                        {/* Active Interface Actions in Dossier */}
                        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openManagementApprovalModal(selectedApp)}
                            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-blue-300 text-blue-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-2xs"
                            title="Edit administrative instructions, joining date, or salary details"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                            <span>Edit Instructions & Terms</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePushDossierDownstream(selectedApp)}
                            disabled={isPushingDownstream}
                            className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs"
                            title="Securely push / re-sync this complete status and dossier update to downstream modules"
                          >
                            <Send className={`w-3.5 h-3.5 ${isPushingDownstream ? 'animate-spin' : ''}`} />
                            <span>{isPushingDownstream ? 'Pushing Downstream...' : 'Push / Sync to Downstream Modules'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (selectedApp.status === 'selected_recommended' || selectedApp.institute_recommendation === 'selected' || selectedApp.institute_recommendation === 'recommended') ? (
                      <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border-2 border-emerald-300 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                            <Award className="w-4 h-4 text-emerald-700" />
                            <span>Final Central HR & Management Authorization Stage</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Interview Cleared
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          The Institute Head has completed the physical interview evaluation with positive recommendation <strong>SELECTED / RECOMMENDED FOR APPOINTMENT</strong>. Central HR can now record critical administrative instructions (joining date, bond details, designation, compulsory agreed salary) and grant formal management approval with downstream propagation.
                        </p>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => openManagementApprovalModal(selectedApp)}
                            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                          >
                            <Award className="w-4 h-4" />
                            <span>Grant Management Approval & Enter Appointment Instructions</span>
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="bg-white/80 p-3 rounded-xl border border-dashed border-indigo-200 text-xs text-indigo-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span>Awaiting Institute Head review and recommendation...</span>
                  </div>
                )}
              </div>
            )}

            {/* Verification Remarks */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Verification Remarks / Counter Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. All original marksheets and Ph.D. credentials physically inspected and verified."
                value={verificationRemarks}
                onChange={(e) => setVerificationRemarks(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-2xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const toEdit = selectedApp;
                    setSelectedApp(null);
                    openEditAppModal(toEdit);
                  }}
                  className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-300 transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Edit3 className="w-4 h-4 text-amber-700" /> Edit / Correct Form
                </button>

                {/* Dynamic Button State Management for "Forwarded to Institute" (Requirement 1) */}
                {isAdminHR && (
                  selectedApp.forwarded_at ? (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2.5 bg-slate-100 text-slate-500 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-not-allowed opacity-90 shadow-none"
                      title={`Application dossier was already forwarded to ${selectedApp.forwarded_to_head_name || 'Institute Head'} on ${new Date(selectedApp.forwarded_at).toLocaleString('en-IN')}`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        Already Forwarded ({new Date(selectedApp.forwarded_at).toLocaleDateString('en-GB')}{' '}{new Date(selectedApp.forwarded_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const toForward = selectedApp;
                        openForwardModal(toForward);
                      }}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
                      title="Forward application file to Institute Head for review (Central HR only)"
                    >
                      <Send className="w-4 h-4" /> Forward to Institute Head
                    </button>
                  )
                )}

                {selectedApp.status === 'submitted' && (
                  <button
                    onClick={() => handleApproveApplication(selectedApp.id)}
                    disabled={isVerifying}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow transition inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve & Enable Fee Payment
                  </button>
                )}

                {(selectedApp.status === 'selected_recommended' || selectedApp.institute_recommendation === 'selected' || selectedApp.institute_recommendation === 'recommended') && selectedApp.status !== 'management_approved' && (
                  <button
                    type="button"
                    onClick={() => openManagementApprovalModal(selectedApp)}
                    disabled={isSubmittingMgmtApproval}
                    className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
                    title="Grant Central HR & Management Approval with Administrative Instructions"
                  >
                    <Award className="w-4 h-4" /> Grant Management Approval
                  </button>
                )}

                {selectedApp.status === 'management_approved' && (
                  <button
                    type="button"
                    onClick={() => handlePushDossierDownstream(selectedApp)}
                    disabled={isPushingDownstream}
                    className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
                    title="Re-push / Synchronize dossier update with Institute Portal and Appointment Order section"
                  >
                    <Send className={`w-4 h-4 text-blue-700 ${isPushingDownstream ? 'animate-spin' : ''}`} />
                    <span>{isPushingDownstream ? 'Syncing...' : 'Push to Downstream Modules'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1.25. MULTIPLE SUBMISSIONS COMPARISON MODAL */}
      {duplicateModalApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 no-print overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5 text-slate-900 border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Multiple Applications by Same Candidate
                  </h3>
                  <p className="text-xs text-slate-500">
                    Candidate: <strong className="text-slate-800">{duplicateModalApp.candidate_name}</strong> • 📞 {duplicateModalApp.contact_no} {duplicateModalApp.email_id ? `• ✉️ ${duplicateModalApp.email_id}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDuplicateModalApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const info = duplicateAppMap.get(duplicateModalApp.id);
              const allList = info?.allApps || [duplicateModalApp];

              return (
                <div className="space-y-4">
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                    <span className="text-lg leading-none">💡</span>
                    <div className="leading-relaxed">
                      <strong>Verification Note:</strong> We identified <strong>{allList.length} application forms</strong> submitted by this candidate matched by <strong>{info?.matchedDescriptions.join(' & ') || 'Contact Details'}</strong>. Please verify if the candidate applied for different posts, or submitted redundant duplicate copies.
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      All Registered Forms ({allList.length} Total Submissions)
                    </h4>

                    <div className="space-y-3">
                      {allList.map((item, idx) => {
                        const isCurrent = item.id === duplicateModalApp.id;
                        const itemReceipt = item.fee_receipts && item.fee_receipts[0];

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-2xl border transition ${
                              isCurrent
                                ? 'border-sky-300 bg-sky-50/40 ring-1 ring-sky-400 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sky-900 text-sm">
                                  {item.application_no}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                  Form #{idx + 1}
                                </span>
                                {isCurrent && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                                    Current Selection
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-mono">
                                  📅 {new Date(item.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {item.status === 'submitted' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                    Pending Verification
                                  </span>
                                )}
                                {item.status === 'verified_approved' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                                    Approved (Fee Due)
                                  </span>
                                )}
                                {item.status === 'fee_paid' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    ✅ Fee Paid
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs">
                              <div>
                                <span className="text-[10.5px] text-slate-500 block uppercase font-bold">Applied Designation</span>
                                <span className="font-bold text-slate-900 block text-sm">
                                  {item.posts?.title || item.custom_post_title || 'General / Unassigned'}
                                </span>
                                <span className="text-[11px] text-purple-700 block mt-0.5 font-medium">
                                  {item.program_stream || 'General'} {item.course_name ? `• ${item.course_name}` : ''}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10.5px] text-slate-500 block uppercase font-bold">Fee Status</span>
                                {itemReceipt ? (
                                  <span className="text-emerald-700 font-bold block">
                                    Receipt: {itemReceipt.receipt_no} (₹{itemReceipt.amount} via {itemReceipt.payment_mode})
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-semibold block">
                                    Fee: ₹{item.staff_categories?.application_fee ?? 50} — Not collected
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-500 block mt-0.5">
                                  Highest Qual: {item.qualification_summary || 'Not provided'}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setDuplicateModalApp(null);
                                  setSelectedApp(item);
                                }}
                                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold border border-sky-200 transition inline-flex items-center gap-1 shadow-xs"
                              >
                                <Eye className="w-3.5 h-3.5" /> View & Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDuplicateModalApp(null);
                                  openEditAppModal(item);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition inline-flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit Form
                              </button>
                              {item.status === 'verified_approved' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDuplicateModalApp(null);
                                    openPaymentModal(item);
                                  }}
                                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1 shadow-xs"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Collect Fee
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setDuplicateModalApp(null);
                                  setPrintFormApp(item);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition inline-flex items-center gap-1"
                              >
                                <Printer className="w-3.5 h-3.5" /> Print Form
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDuplicateModalApp(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1.5. EDIT / CORRECT CANDIDATE APPLICATION MODAL */}
      {editingApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 no-print overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6 text-slate-900 border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      Edit & Correct Candidate Form
                    </h3>
                    <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                      {editingApp.application_no}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Update personal details, designations, course/stream, academic marks, and experience.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingApp(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Uploaded Documents & Image Scans Showcase */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-sky-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Candidate Uploaded Documents & Identity Scans
                  </h4>
                </div>
                <span className="text-[10.5px] text-slate-500 font-medium">Click any document to inspect full preview</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. Candidate Photo */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-between text-center space-y-2">
                  <span className="text-[11px] font-bold text-slate-700">Candidate Photo</span>
                  <div className="w-20 h-24 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300">
                    {editForm.photo_url ? (
                      <img
                        src={editForm.photo_url}
                        alt="Photo"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                        onClick={() => setPreviewDoc({ title: 'Candidate Photograph', url: editForm.photo_url })}
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">No Photo</span>
                    )}
                  </div>
                  {editForm.photo_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: 'Candidate Photograph', url: editForm.photo_url })}
                      className="text-[11px] font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View Photo
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">Not Uploaded</span>
                  )}
                </div>

                {/* 2. Aadhaar Card Scan */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-between text-center space-y-2">
                  <span className="text-[11px] font-bold text-slate-700">Aadhaar Card Scan</span>
                  <div className="w-20 h-24 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300">
                    {editForm.aadhaar_doc_url ? (
                      <img
                        src={editForm.aadhaar_doc_url}
                        alt="Aadhaar"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                        onClick={() => setPreviewDoc({ title: 'Aadhaar Card Document', url: editForm.aadhaar_doc_url })}
                      />
                    ) : (
                      <FileText className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  {editForm.aadhaar_doc_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: 'Aadhaar Card Document', url: editForm.aadhaar_doc_url })}
                      className="text-[11px] font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View Aadhaar
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">Not Uploaded</span>
                  )}
                </div>

                {/* 3. PAN Card Scan */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-between text-center space-y-2">
                  <span className="text-[11px] font-bold text-slate-700">PAN Card Scan</span>
                  <div className="w-20 h-24 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300">
                    {editForm.pan_doc_url ? (
                      <img
                        src={editForm.pan_doc_url}
                        alt="PAN"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                        onClick={() => setPreviewDoc({ title: 'PAN Card Document', url: editForm.pan_doc_url })}
                      />
                    ) : (
                      <FileText className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  {editForm.pan_doc_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: 'PAN Card Document', url: editForm.pan_doc_url })}
                      className="text-[11px] font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View PAN
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">Not Uploaded</span>
                  )}
                </div>

                {/* 4. Signature Scan */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-between text-center space-y-2">
                  <span className="text-[11px] font-bold text-slate-700">Signature Scan</span>
                  <div className="w-20 h-24 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300 p-1">
                    {editForm.signature_url ? (
                      editForm.signature_url.startsWith('typed:') ? (
                        <span className="text-xs font-serif italic text-slate-800 break-all leading-tight">
                          {editForm.signature_url.replace('typed:', '')}
                        </span>
                      ) : (
                        <img
                          src={editForm.signature_url}
                          alt="Signature"
                          className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition"
                          onClick={() => setPreviewDoc({ title: 'Candidate Signature', url: editForm.signature_url })}
                        />
                      )
                    ) : (
                      <span className="text-[10px] text-slate-400">No Signature</span>
                    )}
                  </div>
                  {editForm.signature_url && !editForm.signature_url.startsWith('typed:') ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: 'Candidate Signature', url: editForm.signature_url })}
                      className="text-[11px] font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View Signature
                    </button>
                  ) : editForm.signature_url?.startsWith('typed:') ? (
                    <span className="text-[10px] text-slate-600 font-medium font-serif italic">Digital Typed</span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Not Uploaded</span>
                  )}
                </div>

                {/* 5. Resume / CV Attachment */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-between text-center space-y-2">
                  <span className="text-[11px] font-bold text-slate-700">Resume / CV (PDF/Img)</span>
                  <div className="w-20 h-24 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300">
                    {editForm.resume_url ? (
                      <div
                        onClick={() => setPreviewDoc({ title: `Resume / CV - ${editForm.candidate_name}`, url: editForm.resume_url })}
                        className="w-full h-full flex flex-col items-center justify-center p-1 cursor-pointer hover:bg-slate-200 transition text-sky-700"
                      >
                        <FileText className="w-8 h-8 mb-1" />
                        <span className="text-[9px] font-bold uppercase">Resume Attached</span>
                      </div>
                    ) : (
                      <FileText className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  {editForm.resume_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: `Resume / CV - ${editForm.candidate_name}`, url: editForm.resume_url })}
                      className="text-[11px] font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View Resume
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">Not Uploaded</span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 1: Personal & Contact Information */}
            <div className="space-y-3 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <User className="w-4 h-4 text-sky-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. Personal & Contact Details
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.candidate_name}
                    onChange={(e) => setEditForm({ ...editForm, candidate_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Contact / Mobile No. *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={editForm.contact_no}
                    onChange={(e) => setEditForm({ ...editForm, contact_no: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-mono font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editForm.email_id}
                    onChange={(e) => setEditForm({ ...editForm, email_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Residential Address
                </label>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => handleEditDobChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Marital Status
                  </label>
                  <select
                    value={editForm.is_married ? 'true' : 'false'}
                    onChange={(e) => setEditForm({ ...editForm, is_married: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="false">Unmarried / Single</option>
                    <option value="true">Married</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Salary Expectation (₹/m)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 35000"
                    value={editForm.salary_expectation}
                    onChange={(e) => setEditForm({ ...editForm, salary_expectation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Aadhaar & PAN Card Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Aadhaar Number (12 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="12-digit Aadhaar Number"
                    value={editForm.aadhaar_input}
                    onChange={(e) => setEditForm({ ...editForm, aadhaar_input: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    PAN Card Number (10 Characters)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={editForm.pan_input}
                    onChange={(e) => setEditForm({ ...editForm, pan_input: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-mono uppercase focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Job Position, Academic Stream & Discipline */}
            <div className="space-y-3 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Briefcase className="w-4 h-4 text-sky-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Job Designation, Academic Stream & Course
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Staff Category
                  </label>
                  <select
                    value={editForm.category_id}
                    onChange={(e) => {
                      const catId = e.target.value;
                      setEditForm({ ...editForm, category_id: catId });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                  >
                    <option value="">-- Select Category --</option>
                    {staffCategories.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name} (Fee: ₹{sc.application_fee})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Post / Designation
                  </label>
                  <select
                    value={editForm.post_id}
                    onChange={(e) => {
                      const pId = e.target.value;
                      const selectedP = posts.find((p) => p.id === pId);
                      setEditForm({
                        ...editForm,
                        post_id: pId,
                        category_id: selectedP?.category_id || editForm.category_id,
                        custom_post_title: '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-semibold text-sky-900"
                  >
                    <option value="">-- Select Designation --</option>
                    {posts
                      .filter((p) => !editForm.category_id || p.category_id === editForm.category_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} — [{p.staff_categories?.name || 'General'}]
                          {p.program_stream && p.program_stream !== 'All Programs / General' ? ` • (${p.program_stream})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Preferred Institute
                  </label>
                  <select
                    value={editForm.preferred_institute_id}
                    onChange={(e) => setEditForm({ ...editForm, preferred_institute_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="">-- Any / Central Sanstha Office --</option>
                    {institutes.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.official_name || inst.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Academic Stream, Course & Specialization Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                    * Academic Program Stream
                  </label>
                  <select
                    value={editForm.program_stream}
                    onChange={(e) => {
                      const newStream = e.target.value;
                      const streamCourses = defaultStreamCourses[newStream] || [];
                      setEditForm({
                        ...editForm,
                        program_stream: newStream,
                        course_name: streamCourses[0] || '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-purple-300 rounded-xl text-xs bg-white font-semibold text-purple-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {programStreamOptions.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                    Course / Programme Name
                  </label>
                  <input
                    type="text"
                    list="receptionist-course-suggestions"
                    placeholder="e.g. B.Tech Mechanical Engineering, MBA, B.Pharm"
                    value={editForm.course_name}
                    onChange={(e) => setEditForm({ ...editForm, course_name: e.target.value })}
                    className="w-full px-3 py-2 border border-indigo-300 rounded-xl text-xs bg-white font-semibold text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <datalist id="receptionist-course-suggestions">
                    {(defaultStreamCourses[editForm.program_stream] || []).map((cn, idx) => (
                      <option key={idx} value={cn} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-sky-900 mb-1">
                    Subject / Specialization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AI & ML, Finance, Organic Chemistry"
                    value={editForm.specialization}
                    onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-sky-300 rounded-xl text-xs bg-white font-semibold text-sky-950 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Educational Qualifications */}
            <div className="space-y-3 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-sky-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    3. Educational Qualifications (SSC to Ph.D.)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditForm({
                      ...editForm,
                      education: [
                        ...editForm.education,
                        { level: 'Graduation (UG)', degree_name: '', percentage: '', marking_system: 'percentage', cgpa: '', cgpa_scale: '10' },
                      ],
                    });
                  }}
                  className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-bold rounded-lg border border-sky-200 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Degree / Exam
                </button>
              </div>

              <div className="space-y-2.5">
                {editForm.education.map((edu, idx) => {
                  const isPhd = edu.level.includes('Ph.D');
                  const isNetSet = edu.level.includes('NET');

                  return (
                    <div key={idx} className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-3">
                          <select
                            value={edu.level}
                            onChange={(e) => {
                              const updated = [...editForm.education];
                              updated[idx].level = e.target.value;
                              setEditForm({ ...editForm, education: updated });
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 font-bold text-slate-800 focus:outline-none"
                          >
                            <option value="Below 10th / SSC (१०वी पेक्षा कमी)">Below 10th / SSC (१०वी पेक्षा कमी)</option>
                            <option value="S.S.C. (10th) / १०वी">S.S.C. (10th) / १०वी</option>
                            <option value="H.S.C. (12th) / १२वी">H.S.C. (12th) / १२वी</option>
                            <option value="Diploma / पदविका">Diploma / पदविका</option>
                            <option value="Graduation (UG) / पदवी">Graduation (UG) / पदवी</option>
                            <option value="Post Graduation (PG) / पदव्युत्तर">Post Graduation (PG) / पदव्युत्तर</option>
                            <option value="Ph.D. / Doctorate / विद्यावाचस्पती">Ph.D. / Doctorate / विद्यावाचस्पती</option>
                            <option value="Other / NET / SET / ITI / इतर">Other / NET / SET / ITI / इतर</option>
                            <option value="Other Certification">Other Certification</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            placeholder="Degree / Course / Topic"
                            value={edu.degree_name}
                            onChange={(e) => {
                              const updated = [...editForm.education];
                              updated[idx].degree_name = e.target.value;
                              setEditForm({ ...editForm, education: updated });
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            placeholder="Board / University"
                            value={edu.board_university || ''}
                            onChange={(e) => {
                              const updated = [...editForm.education];
                              updated[idx].board_university = e.target.value;
                              setEditForm({ ...editForm, education: updated });
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="Year"
                            value={edu.passing_year || ''}
                            onChange={(e) => {
                              const updated = [...editForm.education];
                              updated[idx].passing_year = e.target.value.replace(/\D/g, '');
                              setEditForm({ ...editForm, education: updated });
                            }}
                            className="w-full px-1.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-center bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-center gap-1">
                          {isPhd ? (
                            <select
                              value={edu.status_remark || 'Awarded'}
                              onChange={(e) => {
                                const updated = [...editForm.education];
                                updated[idx].status_remark = e.target.value;
                                setEditForm({ ...editForm, education: updated });
                              }}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-none"
                            >
                              <option value="Awarded">Awarded</option>
                              <option value="Scholar / Pursuing">Scholar</option>
                            </select>
                          ) : isNetSet ? (
                            <select
                              value={edu.status_remark || 'Qualified'}
                              onChange={(e) => {
                                const updated = [...editForm.education];
                                updated[idx].status_remark = e.target.value;
                                setEditForm({ ...editForm, education: updated });
                              }}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:outline-none"
                            >
                              <option value="Qualified">Qualified</option>
                              <option value="Not Qualified / Appeared">Not Qualified</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="% / CGPA"
                              value={edu.percentage}
                              onChange={(e) => {
                                const updated = [...editForm.education];
                                updated[idx].percentage = e.target.value;
                                setEditForm({ ...editForm, education: updated });
                              }}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-900 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const updated = editForm.education.filter((_, i) => i !== idx);
                              setEditForm({ ...editForm, education: updated });
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Remove Row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 4: Experience History */}
            <div className="space-y-3 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-sky-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    4. Experience History
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditForm({
                      ...editForm,
                      experience: [
                        ...editForm.experience,
                        { is_fresher: false, organization_name: '', designation: '', years_experience: '', previous_salary: '' },
                      ],
                    });
                  }}
                  className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-bold rounded-lg border border-sky-200 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Experience Row
                </button>
              </div>

              <div className="space-y-2">
                {editForm.experience.map((exp, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="w-full sm:flex-1">
                      <input
                        type="text"
                        placeholder="Institute / Organization Name (or 'Fresher')"
                        value={exp.organization_name}
                        onChange={(e) => {
                          const updated = [...editForm.experience];
                          updated[idx].organization_name = e.target.value;
                          setEditForm({ ...editForm, experience: updated });
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>

                    <div className="w-full sm:w-44">
                      <input
                        type="text"
                        placeholder="Designation Held"
                        value={exp.designation}
                        onChange={(e) => {
                          const updated = [...editForm.experience];
                          updated[idx].designation = e.target.value;
                          setEditForm({ ...editForm, experience: updated });
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>

                    <div className="w-full sm:w-24">
                      <input
                        type="number"
                        placeholder="Years Exp"
                        value={exp.years_experience}
                        onChange={(e) => {
                          const updated = [...editForm.experience];
                          updated[idx].years_experience = e.target.value;
                          setEditForm({ ...editForm, experience: updated });
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>

                    <div className="w-full sm:w-28">
                      <input
                        type="number"
                        placeholder="Last Salary ₹"
                        value={exp.previous_salary}
                        onChange={(e) => {
                          const updated = [...editForm.experience];
                          updated[idx].previous_salary = e.target.value;
                          setEditForm({ ...editForm, experience: updated });
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = editForm.experience.filter((_, i) => i !== idx);
                        setEditForm({ ...editForm, experience: updated });
                      }}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      title="Remove Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 5: Counter Notes & Verification Remarks */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Verification Remarks & Counter Correction Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Candidate submitted original certificates. Corrected post designation and academic percentages after in-person review."
                value={editForm.verification_remarks}
                onChange={(e) => setEditForm({ ...editForm, verification_remarks: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-2xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isSavingAppEdit}
                  onClick={() => handleSaveAppEdit(false)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Edit3 className="w-4 h-4" />
                  {isSavingAppEdit ? 'Saving...' : 'Save Corrections (Keep Status)'}
                </button>

                <button
                  type="button"
                  disabled={isSavingAppEdit}
                  onClick={() => handleSaveAppEdit(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSavingAppEdit ? 'Saving...' : 'Save & Approve Immediately'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FEE PAYMENT MODAL */}
      {payApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Collect Application Form Fee
              </h3>
              <button onClick={() => setPayApp(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200">
                <p className="text-xs text-slate-600">
                  Candidate: <strong className="text-slate-900">{payApp.candidate_name}</strong>
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Designation: <strong className="text-sky-800">{payApp.posts?.title || payApp.custom_post_title}</strong>
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Fee Head: <strong className="text-slate-800">Application Form Fee</strong>
                </p>
                <div className="mt-3 flex items-baseline justify-between border-t border-sky-200 pt-3">
                  <span className="text-xs font-bold text-sky-900 uppercase tracking-wider">Application Form Fee:</span>
                  <span className="text-2xl font-black text-slate-950">₹ {feeAmount}.00</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Payment Mode *
                </label>
                <select
                  value={selectedPaymentMode}
                  onChange={(e) => setSelectedPaymentMode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {paymentModes.map((pm) => (
                    <option key={pm.id} value={pm.name}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Transaction / Reference ID (Optional for Cash)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cheque No / CASH"
                  value={paymentRefNo}
                  onChange={(e) => setPaymentRefNo(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayApp(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  {isProcessingPayment ? 'Issuing...' : 'Collect Fee & Print Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT FEE RECEIPT MODAL */}
      {editingReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-sky-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Edit Fee Receipt Details
                </h3>
              </div>
              <button onClick={() => setEditingReceipt(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedReceipt} className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <p><strong>Receipt No:</strong> <span className="font-mono font-bold text-sky-900">{editingReceipt.receipt.receipt_no}</span></p>
                <p><strong>Candidate:</strong> {editingReceipt.app.candidate_name}</p>
                <p><strong>App No:</strong> <span className="font-mono">{editingReceipt.app.application_no}</span></p>
                <p><strong>Fee Head:</strong> Application Form Fee</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Fee Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editingReceipt.amount}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 italic mt-0.5 block">
                  Words: {numberToWordsINR(editingReceipt.amount)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Payment Mode
                </label>
                <select
                  value={editingReceipt.payment_mode}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, payment_mode: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {paymentModes.map((pm) => (
                    <option key={pm.id} value={pm.name}>
                      {pm.name}
                    </option>
                  ))}
                  <option value="Cash">Cash</option>
                  <option value="UPI / QR">UPI / QR</option>
                  <option value="Net Banking / NEFT">Net Banking / NEFT</option>
                  <option value="DD / Cheque">DD / Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Reference / Transaction No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cheque No / CASH"
                  value={editingReceipt.reference_no}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, reference_no: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingReceipt(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingReceipt}
                  className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Edit3 className="w-4 h-4" />
                  {isUpdatingReceipt ? 'Saving...' : 'Save & Update Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DELETE / CANCEL RECEIPT MODAL WITH REASON */}
      {deletingReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  Delete / Cancel Fee Receipt
                </h3>
              </div>
              <button onClick={() => setDeletingReceipt(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteReceipt} className="space-y-4">
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1">
                <p><strong>Receipt to Cancel:</strong> <span className="font-mono font-bold">{deletingReceipt.receipt.receipt_no}</span></p>
                <p><strong>Candidate:</strong> {deletingReceipt.app.candidate_name}</p>
                <p><strong>Amount:</strong> ₹ {deletingReceipt.receipt.amount}.00 ({deletingReceipt.receipt.payment_mode})</p>
                <p className="text-[11px] text-rose-700 font-semibold pt-1 border-t border-rose-200/60">
                  ⚠️ Deleting this receipt will reset candidate status back to "Approved (Ready for Fee)", allowing you to re-issue if needed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Primary Reason for Cancellation
                </label>
                <select
                  value={deletingReceipt.selectedQuickReason}
                  onChange={(e) => setDeletingReceipt({ ...deletingReceipt, selectedQuickReason: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Wrong candidate selected / Entered by mistake">Wrong candidate selected / Entered by mistake</option>
                  <option value="Amount entered incorrectly / Duplicate entry">Amount entered incorrectly / Duplicate entry</option>
                  <option value="Candidate cancelled application / Fee refund">Candidate cancelled application / Fee refund</option>
                  <option value="Payment transaction failed / Cheque bounced">Payment transaction failed / Cheque bounced</option>
                  <option value="Other reason">Other administrative reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Specific Remarks / Reason Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Cash was not received, candidate changed mind."
                  value={deletingReceipt.cancellationReason}
                  onChange={(e) => setDeletingReceipt({ ...deletingReceipt, cancellationReason: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingReceipt(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Keep Receipt
                </button>
                <button
                  type="submit"
                  disabled={isDeletingReceipt}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeletingReceipt ? 'Deleting...' : 'Confirm Delete & Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. SIDE-BY-SIDE PRINTABLE DUPLICATE FEE RECEIPT (A4 LANDSCAPE) */}
      {printedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto print:fixed print:inset-0 print:bg-white print:p-0 print:m-0 print:z-[9999] print:block print:overflow-visible">
          <style>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 5mm;
              }
              html, body {
                background: #ffffff !important;
                background-color: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            }
          `}</style>

          <div className="bg-white text-slate-950 rounded-3xl max-w-7xl w-full p-4 sm:p-6 shadow-2xl space-y-4 print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full print:space-y-0 print:bg-white">
            {/* Top Toolbar - Screen Only */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 no-print">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-sky-700" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Official Duplicate Fee Receipt (A4 Landscape Layout)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Side-by-side: Office Copy (Left) & Candidate Copy (Right) • Vertically balanced
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-sky-800 hover:bg-sky-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print Duplicate (A4 Landscape)
                </button>
                <button
                  onClick={() => setPrintedReceipt(null)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Done
                </button>
              </div>
            </div>

            {/* FULL A4 LANDSCAPE CONTAINER (Vertically Justified & Centered) */}
            <div className="w-full min-h-[580px] print:min-h-[190mm] print:h-[190mm] flex flex-col md:flex-row print:flex-row items-stretch justify-between gap-0 relative print:gap-0">
              
              {/* ================= LEFT HALF: OFFICE COPY ================= */}
              <div className="flex-1 border border-slate-400 p-5 sm:p-6 rounded-2xl relative text-xs flex flex-col justify-between print:rounded-none bg-white mr-0 md:mr-2 print:mr-1 print:border-slate-400">
                {/* 1. Top Institutional Letterhead */}
                <div>
                  <TrustLetterhead 
                    org={org} 
                    variant="receipt" 
                    titleBadge={org?.receipt_header_text || 'CENTRAL HR DEPARTMENT • APPLICATION FORM FEE RECEIPT'} 
                    copyBadge="OFFICE COPY" 
                    className="mb-3"
                  />

                  {/* 2. Structured Metadata Grid */}
                  <div className="space-y-2 text-[11.5px] bg-slate-50/50 p-3 rounded-xl border border-slate-200 print:bg-transparent">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Receipt Number</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">{printedReceipt.receipt_no}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Receipt Date</span>
                        <span className="font-semibold text-slate-900">{printedReceipt.date}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-1.5">
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Candidate Name</span>
                        <span className="font-bold text-slate-900 text-xs">{printedReceipt.app.candidate_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Application ID</span>
                        <span className="font-mono font-semibold text-slate-900">{printedReceipt.app.application_no}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-1.5">
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Designation Applied</span>
                        <span className="font-semibold text-slate-900">
                          {printedReceipt.app.posts?.title || printedReceipt.app.custom_post_title || 'General'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Course & Discipline</span>
                        <span className="font-medium text-slate-800">
                          {printedReceipt.app.course_name || printedReceipt.app.program_stream || 'General'}
                          {printedReceipt.app.specialization ? ` (${printedReceipt.app.specialization})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-1.5">
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Payment Mode</span>
                        <span className="font-semibold text-slate-900">{printedReceipt.payment_mode}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Transaction / Ref No</span>
                        <span className="font-mono text-slate-800">{printedReceipt.reference_no || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Account Particulars & Amount Box */}
                  <div className="border border-slate-400 p-3 my-3 bg-white rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-500 block">Account Head / Particulars</span>
                      <span className="font-bold text-xs text-slate-900">Application Form Fee</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-slate-900 block">₹ {printedReceipt.amount}.00</span>
                      <span className="italic text-[10px] font-medium text-slate-600 block">
                        ({printedReceipt.amount_in_words})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Bottom Signatures & Seal (Vertically pinned at bottom) */}
                <div className="pt-4 border-t border-slate-200 mt-4 flex items-end justify-between">
                  <div className="text-left space-y-1">
                    <p className="text-[9px] text-slate-500 max-w-[200px] leading-tight font-normal">
                      {org?.receipt_footer_text || 'This is a computer-generated fee receipt. Please preserve it for the interview.'}
                    </p>
                    <p className="text-[8.5px] text-slate-400 font-mono">
                      Issued by Central HR Recruitment Cell
                    </p>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="w-32 border-b border-slate-600 mx-auto"></div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider block text-slate-900">Authorized Signatory</span>
                    <span className="text-[8.5px] text-slate-500 block">Central HR Sanstha Office</span>
                  </div>
                </div>
              </div>

              {/* ================= CENTER CUTTING MARK ================= */}
              <div className="hidden md:flex print:flex flex-col items-center justify-between py-3 px-1 text-slate-400 select-none z-10">
                <span className="text-xs font-bold leading-none">✂️</span>
                <div className="w-0 border-r border-dashed border-slate-400 h-full my-1"></div>
                <div className="py-2">
                  <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-slate-500 bg-white px-1 py-0.5 border border-dashed border-slate-300 rounded rotate-90 inline-block whitespace-nowrap">
                    ✂ CUT HERE ✂
                  </span>
                </div>
                <div className="w-0 border-r border-dashed border-slate-400 h-full my-1"></div>
                <span className="text-xs font-bold leading-none">✂️</span>
              </div>

              {/* ================= RIGHT HALF: CANDIDATE COPY ================= */}
              <div className="flex-1 border border-slate-400 p-5 sm:p-6 rounded-2xl relative text-xs flex flex-col justify-between print:rounded-none bg-white ml-0 md:ml-2 print:ml-1 print:border-slate-400">
                {/* 1. Top Institutional Letterhead */}
                <div>
                  <TrustLetterhead 
                    org={org} 
                    variant="receipt" 
                    titleBadge={org?.receipt_header_text || 'CENTRAL HR DEPARTMENT • APPLICATION FORM FEE RECEIPT'} 
                    copyBadge="CANDIDATE COPY" 
                    className="mb-3"
                  />

                  {/* 2. Structured Metadata Grid */}
                  <div className="space-y-2 text-[11.5px] bg-slate-50/50 p-3 rounded-xl border border-slate-200 print:bg-transparent">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Receipt Number</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">{printedReceipt.receipt_no}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Receipt Date</span>
                        <span className="font-semibold text-slate-900">{printedReceipt.date}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-1.5">
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Candidate Name</span>
                        <span className="font-bold text-slate-900 text-xs">{printedReceipt.app.candidate_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Application ID</span>
                        <span className="font-mono font-semibold text-slate-900">{printedReceipt.app.application_no}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-1.5">
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Designation Applied</span>
                        <span className="font-semibold text-slate-900">
                          {printedReceipt.app.posts?.title || printedReceipt.app.custom_post_title || 'General'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Course & Discipline</span>
                        <span className="font-medium text-slate-800">
                          {printedReceipt.app.course_name || printedReceipt.app.program_stream || 'General'}
                          {printedReceipt.app.specialization ? ` (${printedReceipt.app.specialization})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-1.5">
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Payment Mode</span>
                        <span className="font-semibold text-slate-900">{printedReceipt.payment_mode}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 font-medium block text-[10px] uppercase">Transaction / Ref No</span>
                        <span className="font-mono text-slate-800">{printedReceipt.reference_no || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Account Particulars & Amount Box */}
                  <div className="border border-slate-400 p-3 my-3 bg-white rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-500 block">Account Head / Particulars</span>
                      <span className="font-bold text-xs text-slate-900">Application Form Fee</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-slate-900 block">₹ {printedReceipt.amount}.00</span>
                      <span className="italic text-[10px] font-medium text-slate-600 block">
                        ({printedReceipt.amount_in_words})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Bottom Signatures & Seal (Vertically pinned at bottom) */}
                <div className="pt-4 border-t border-slate-200 mt-4 flex items-end justify-between">
                  <div className="text-left space-y-1">
                    <p className="text-[9px] text-slate-500 max-w-[200px] leading-tight font-normal">
                      {org?.receipt_footer_text || 'This is a computer-generated fee receipt. Please preserve it for the interview.'}
                    </p>
                    <p className="text-[8.5px] text-slate-400 font-mono">
                      Issued by Central HR Recruitment Cell
                    </p>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="w-32 border-b border-slate-600 mx-auto"></div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider block text-slate-900">Authorized Signatory</span>
                    <span className="text-[8.5px] text-slate-500 block">Central HR Sanstha Office</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Print Note - Screen Only */}
            <div className="text-center text-[11px] text-slate-500 border-t border-slate-200 pt-2 no-print flex items-center justify-center gap-2">
              <Scissors className="w-4 h-4 text-slate-400" />
              <span>Standard A4 Landscape print format with vertical center cutting line.</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. PRINTABLE 1-PAGE CANDIDATE FORM (A4 PORTRAIT WITH FEE & HEAD HR REMARKS) */}
      {printFormApp && (() => {
        const receipt = printFormApp.fee_receipts && printFormApp.fee_receipts[0];
        const isFeePaid = printFormApp.status === 'fee_paid' || !!receipt;
        const feeAmountVal = receipt?.amount ?? (printFormApp.staff_categories?.application_fee ?? 50);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto print:fixed print:inset-0 print:bg-white print:p-0 print:m-0 print:z-[9999] print:block print:overflow-visible">
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 8mm;
                }
                html, body {
                  background: #ffffff !important;
                  background-color: #ffffff !important;
                  color: #000000 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                body > *:not(.print-candidate-modal-root) {
                  /* Ensure surrounding page content is hidden */
                }
              }
            `}</style>

            <div className="bg-white text-slate-950 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl space-y-4 print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full print:space-y-0 print:bg-white">
              {/* Screen-Only Toolbar */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 no-print">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-700" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Candidate Information & HR Evaluation Form (A4 Portrait)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Official candidate profile with Fee payment status and Head Central HR remarks section.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2.5 bg-sky-800 hover:bg-sky-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Print Form (A4 Portrait)
                  </button>
                  <button
                    onClick={() => setPrintFormApp(null)}
                    className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* ================= OFFICIAL A4 PORTRAIT SHEET CONTAINER ================= */}
              <div className="border border-slate-300 p-5 sm:p-6 text-xs space-y-3 font-sans bg-white print:border print:border-slate-400 print:p-3 print:space-y-2.5">
                
                {/* 1. Header: Sanstha Branding & Letterhead */}
                <TrustLetterhead 
                  org={org} 
                  variant="print" 
                  titleBadge="CANDIDATE INFORMATION & RECRUITMENT EVALUATION FORM" 
                />

                {/* 2. Top Application Metadata Grid */}
                <div className="border border-slate-300 bg-slate-50/50 p-2.5 rounded text-[11px] space-y-1.5 print:bg-transparent print:border-slate-300">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-slate-500 font-medium block text-[9.5px] uppercase">Application ID</span>
                      <strong className="font-mono text-xs text-slate-900">{printFormApp.application_no}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[9.5px] uppercase">Submission Date</span>
                      <strong className="text-slate-800">{new Date(printFormApp.created_at).toLocaleDateString('en-GB')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[9.5px] uppercase">Designation Applied</span>
                      <strong className="text-slate-900">{printFormApp.posts?.title || printFormApp.custom_post_title || 'General'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[9.5px] uppercase">Staff Category</span>
                      <strong className="text-slate-800">{printFormApp.staff_categories?.name || 'General'}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-slate-200 pt-1.5">
                    <div>
                      <span className="text-slate-500 font-medium block text-[9.5px] uppercase">Program / Discipline</span>
                      <strong className="text-slate-900">{printFormApp.program_stream || 'Engineering & Technology'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[9.5px] uppercase">Course / Programme</span>
                      <strong className="text-slate-900">{printFormApp.course_name || 'General Degree'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[9.5px] uppercase">Subject / Specialization</span>
                      <strong className="text-slate-900">{printFormApp.specialization || 'General'}</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Candidate Personal Details & Photo */}
                <div className="grid grid-cols-12 gap-3 border border-slate-300 p-3 rounded bg-white">
                  <div className="col-span-9 space-y-1 text-[11px]">
                    <p>
                      <strong className="text-slate-900 font-semibold">Candidate Full Name:</strong>{' '}
                      <span className="font-bold text-xs uppercase text-slate-900">{printFormApp.candidate_name}</span>
                    </p>
                    <p>
                      <strong className="text-slate-700 font-semibold">Residential Address:</strong>{' '}
                      <span className="text-slate-800">{printFormApp.address}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <p>
                        <strong className="text-slate-700 font-semibold">Contact Number:</strong>{' '}
                        <span className="font-mono font-bold text-slate-900">{printFormApp.contact_no}</span>
                      </p>
                      <p>
                        <strong className="text-slate-700 font-semibold">Email Address:</strong>{' '}
                        <span className="text-slate-800">{printFormApp.email_id || 'N/A'}</span>
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <p>
                        <strong className="text-slate-700 font-semibold">DOB & Age:</strong>{' '}
                        <span>{printFormApp.dob || '—'} ({printFormApp.age ? `${printFormApp.age} Yrs` : '—'})</span>
                      </p>
                      <p>
                        <strong className="text-slate-700 font-semibold">Marital Status:</strong>{' '}
                        <span>{printFormApp.is_married ? 'Married' : 'Unmarried / Single'}</span>
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-0.5 border-t border-slate-200">
                      <p>
                        <strong className="text-slate-700 font-semibold">Aadhaar Card:</strong>{' '}
                        <span className="font-mono font-semibold text-slate-900">{printFormApp.aadhaar_masked}</span>
                      </p>
                      <p>
                        <strong className="text-slate-700 font-semibold">PAN Card:</strong>{' '}
                        <span className="font-mono font-semibold text-slate-900">{printFormApp.pan_masked}</span>
                      </p>
                      <p>
                        <strong className="text-slate-700 font-semibold">Resume / CV Attached:</strong>{' '}
                        <span className="font-bold text-slate-900">
                          {printFormApp.resume_url ? '✅ Yes (Attached)' : '—'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Passport Photo Box */}
                  <div className="col-span-3 flex flex-col items-center justify-center border border-slate-400 rounded p-1 bg-slate-50 min-h-[120px] print:bg-transparent">
                    {printFormApp.photo_url ? (
                      <img
                        src={printFormApp.photo_url}
                        alt="Candidate Photo"
                        className="w-full h-full max-h-[125px] object-cover rounded"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <span className="text-[10px] block font-semibold uppercase">Passport Size</span>
                        <span className="text-[9px] block">Photograph</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Educational Qualifications Table */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold uppercase text-[10.5px] tracking-wider text-slate-900">
                      Educational Qualifications (SSC to Ph.D. / Doctorate & NET / SET)
                    </h4>
                  </div>
                  <table className="w-full border-collapse border border-slate-300 text-[10px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 print:bg-transparent">
                        <th className="border border-slate-300 p-1 text-left w-32 font-bold">Exam / Level</th>
                        <th className="border border-slate-300 p-1 text-left font-bold">Degree / Branch / Subject</th>
                        <th className="border border-slate-300 p-1 text-left font-bold">Board / University / College</th>
                        <th className="border border-slate-300 p-1 text-center w-16 font-bold">Year</th>
                        <th className="border border-slate-300 p-1 text-right w-24 font-bold">Status / %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printFormApp.application_education && printFormApp.application_education.length > 0 ? (
                        printFormApp.application_education.map((edu, idx) => (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="border border-slate-300 p-1 font-semibold text-slate-900">{edu.level}</td>
                            <td className="border border-slate-300 p-1 text-slate-800">{edu.degree_name || '—'}</td>
                            <td className="border border-slate-300 p-1 text-slate-800">{edu.board_university || '—'}</td>
                            <td className="border border-slate-300 p-1 text-center font-mono text-slate-800">{edu.passing_year || '—'}</td>
                            <td className="border border-slate-300 p-1 text-right font-semibold text-slate-900">
                              {edu.status_remark ? (
                                <span className="font-bold text-[9.5px] text-slate-900">{edu.status_remark}</span>
                              ) : edu.marking_system === 'cgpa' && edu.cgpa != null ? (
                                `${edu.cgpa} / ${edu.cgpa_scale || 10} CGPA`
                              ) : edu.percentage ? (
                                `${edu.percentage}%`
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="border border-slate-300 p-1.5 text-center text-slate-400">
                            No educational qualifications listed
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 5. Experience Details Table */}
                <div>
                  <h4 className="font-bold uppercase text-[10.5px] tracking-wider text-slate-900 mb-1">
                    Work & Professional Experience
                  </h4>
                  <table className="w-full border-collapse border border-slate-300 text-[10.5px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 print:bg-transparent">
                        <th className="border border-slate-300 p-1 text-left font-bold">Organization / Institute</th>
                        <th className="border border-slate-300 p-1 text-left w-44 font-bold">Designation</th>
                        <th className="border border-slate-300 p-1 text-right w-24 font-bold">Experience</th>
                        <th className="border border-slate-300 p-1 text-right w-28 font-bold">Last Drawn Salary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printFormApp.application_experience && printFormApp.application_experience.length > 0 ? (
                        printFormApp.application_experience.map((exp, idx) => (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="border border-slate-300 p-1 font-medium text-slate-900">
                              {exp.is_fresher ? 'Fresher (No Prior Experience)' : exp.organization_name}
                            </td>
                            <td className="border border-slate-300 p-1 text-slate-800">{exp.designation || '—'}</td>
                            <td className="border border-slate-300 p-1 text-right font-mono text-slate-900">
                              {exp.years_experience ? `${exp.years_experience} Yrs` : '—'}
                            </td>
                            <td className="border border-slate-300 p-1 text-right font-mono text-slate-900">
                              {exp.previous_salary ? `₹ ${exp.previous_salary}` : '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="border border-slate-300 p-1.5 text-center text-slate-400">
                            Fresher / No prior experience recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 6. Official Application Fee Status Box (PAID / NOT PAID) */}
                <div className="border border-slate-300 p-2.5 rounded text-[11px] flex items-center justify-between bg-white print:border-slate-300">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[10px] uppercase text-slate-600">Application Form Fee Status:</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-xs tracking-wider uppercase border ${
                        isFeePaid 
                          ? 'border-emerald-600 text-emerald-800 bg-emerald-50 print:bg-transparent print:border-slate-800 print:text-slate-900' 
                          : 'border-amber-600 text-amber-800 bg-amber-50 print:bg-transparent print:border-slate-600 print:text-slate-800'
                      }`}>
                        {isFeePaid ? 'PAID (RECEIPT ISSUED)' : 'NOT PAID (PENDING)'}
                      </span>
                    </div>
                    {isFeePaid && receipt ? (
                      <p className="text-[10px] text-slate-700 pt-0.5">
                        <strong>Receipt No:</strong> <span className="font-mono font-bold text-slate-900">{receipt.receipt_no}</span> |{' '}
                        <strong>Date:</strong> {new Date(receipt.issued_at || printFormApp.created_at).toLocaleDateString('en-GB')} |{' '}
                        <strong>Payment Mode:</strong> {receipt.payment_mode || 'Cash'}{' '}
                        {receipt.reference_no ? `(Ref: ${receipt.reference_no})` : ''}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-600 pt-0.5">
                        Fee amount to be collected at Central HR Counter: <strong>₹ {feeAmountVal}.00</strong>
                      </p>
                    )}
                  </div>
                  <div className="text-right pl-3 border-l border-slate-200">
                    <span className="text-[9.5px] uppercase font-medium text-slate-500 block">Fee Amount</span>
                    <span className="font-bold text-sm sm:text-base text-slate-900 block">₹ {feeAmountVal}.00</span>
                  </div>
                </div>

                {/* 7. Official Remarks & Evaluation by Head Central HR Department */}
                <div className="border border-slate-300 p-2.5 rounded bg-white space-y-1.5 print:border-slate-300">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <span className="font-bold uppercase text-[10px] tracking-wider text-slate-900">
                      FOR OFFICIAL USE ONLY — REMARKS & EVALUATION BY HEAD, CENTRAL HR DEPARTMENT
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">Official Evaluation Section</span>
                  </div>

                  {/* Screening Checkboxes */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-medium text-slate-800 pt-0.5">
                    <span className="border border-slate-300 px-2 py-0.5 rounded bg-slate-50 print:bg-transparent">
                      [ &nbsp; ] Eligible & Shortlisted
                    </span>
                    <span className="border border-slate-300 px-2 py-0.5 rounded bg-slate-50 print:bg-transparent">
                      [ &nbsp; ] Document Query / Pending
                    </span>
                    <span className="border border-slate-300 px-2 py-0.5 rounded bg-slate-50 print:bg-transparent">
                      [ &nbsp; ] Standby / Reserve Pool
                    </span>
                    <span className="border border-slate-300 px-2 py-0.5 rounded bg-slate-50 print:bg-transparent">
                      [ &nbsp; ] Not Eligible / Rejected
                    </span>
                  </div>

                  {/* Ruled Lines for Head HR Evaluation Notes */}
                  <div className="pt-1 space-y-1 text-[10px] text-slate-700">
                    <div className="flex items-end gap-2">
                      <span className="font-semibold whitespace-nowrap text-slate-800">Assigned Panel / Institute:</span>
                      <div className="flex-1 border-b border-dashed border-slate-400 h-4"></div>
                      <span className="font-semibold whitespace-nowrap text-slate-800">Recommended Post/Scale:</span>
                      <div className="w-36 border-b border-dashed border-slate-400 h-4"></div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="font-semibold whitespace-nowrap text-slate-800">Head HR Remarks:</span>
                      <div className="flex-1 border-b border-dashed border-slate-400 h-4">
                        {printFormApp.verification_remarks ? (
                          <span className="text-[9.5px] italic text-slate-800">{printFormApp.verification_remarks}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="border-b border-dashed border-slate-400 h-3.5 w-full"></div>
                  </div>
                </div>

                {/* 8. Official Signatures (3 Authorized Signatories) */}
                <div className="pt-4 grid grid-cols-3 gap-4 text-center text-[10.5px] border-t border-slate-200 mt-2">
                  <div>
                    <div className="h-6 flex items-center justify-center mb-1">
                      {printFormApp.signature_url && !printFormApp.signature_url.startsWith('typed:') ? (
                        <img src={printFormApp.signature_url} alt="Candidate Signature" className="max-h-6 object-contain mx-auto" />
                      ) : printFormApp.signature_url?.startsWith('typed:') ? (
                        <span className="font-serif italic text-xs text-slate-800">
                          {printFormApp.signature_url.replace('typed:', '')}
                        </span>
                      ) : null}
                    </div>
                    <div className="w-32 border-b border-slate-600 mx-auto mb-1"></div>
                    <strong className="block text-slate-900 font-semibold">Candidate Signature</strong>
                    <span className="text-[9px] text-slate-500">Applicant Declaration</span>
                  </div>

                  <div>
                    <div className="h-6 mb-1"></div>
                    <div className="w-32 border-b border-slate-600 mx-auto mb-1"></div>
                    <strong className="block text-slate-900 font-semibold">Front Desk Officer</strong>
                    <span className="text-[9px] text-slate-500">Credentials & Fee Verified</span>
                  </div>

                  <div>
                    <div className="h-6 mb-1"></div>
                    <div className="w-32 border-b border-slate-600 mx-auto mb-1"></div>
                    <strong className="block text-slate-900 font-semibold">Head, Central HR Department</strong>
                    <span className="text-[9px] text-slate-500">Sanstha Central Office</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* 7. DOCUMENT / IMAGE LIGHTBOX PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50 no-print">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] text-slate-900 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-sky-700" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  {previewDoc.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition inline-flex items-center gap-1 border border-slate-300"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Full Size Tab
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-950/5 p-2 rounded-2xl border border-slate-200 min-h-[300px]">
              {previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewDoc.url} className="w-full h-[65vh] rounded-xl" title={previewDoc.title} />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-sm"
                />
              )}
            </div>

            <div className="text-center pt-3 text-[11px] text-slate-500">
              Original uploaded candidate document preview.
            </div>
          </div>
        </div>
      )}

      {/* ================= FORWARD TO INSTITUTE HEAD MODAL (Central HR only) ================= */}
      {isAdminHR && forwardModalApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 text-slate-900 border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Forward to Institute Head
                  </h3>
                  <p className="text-xs text-slate-500">
                    Candidate: <strong className="text-slate-800">{forwardModalApp.candidate_name}</strong> • #{forwardModalApp.application_no}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForwardModalApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Institute & Head Selection */}
            <form onSubmit={handleConfirmForward} className="space-y-4">
              {/* Target Institute Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Target Institute / College <span className="text-rose-600">*</span>
                </label>
                <select
                  value={forwardTargetInstId}
                  onChange={(e) => handleInstituteSelectChange(e.target.value)}
                  required
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="">-- Select Target Institute --</option>
                  {institutes.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.official_name || inst.name} {inst.short_name ? `(${inst.short_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Institute Head Details */}
              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-3">
                <span className="text-[10.5px] font-bold text-indigo-900 uppercase tracking-wider block">
                  Recipient Institute Head Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                      Head / Principal Name
                    </label>
                    <input
                      type="text"
                      value={forwardHeadName}
                      onChange={(e) => setForwardHeadName(e.target.value)}
                      required
                      placeholder="e.g. Dr. A. P. Sharma"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={forwardHeadDesignation}
                      onChange={(e) => setForwardHeadDesignation(e.target.value)}
                      required
                      placeholder="e.g. Principal / Director"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                    Official Email Alert Recipient
                  </label>
                  <input
                    type="email"
                    value={forwardHeadEmail}
                    onChange={(e) => setForwardHeadEmail(e.target.value)}
                    required
                    placeholder="e.g. principal@college.edu"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-indigo-600" /> Automated in-app notification & email alert will be dispatched upon forwarding.
                  </p>
                </div>
              </div>

              {/* Central HR Initial Remarks / Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Central HR Pre-screening Remarks & Instructions <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={forwardCentralRemarks}
                  onChange={(e) => setForwardCentralRemarks(e.target.value)}
                  required
                  placeholder="e.g. Candidate holds M.Tech + Ph.D. in Computer Engg. Physically verified original marksheets and publications. Forwarding for Principal review, department interview, and recommendation."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setForwardModalApp(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isForwarding}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  {isForwarding ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Forwarding...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm & Forward Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ================= FORMAL MANAGEMENT APPROVAL & ADMINISTRATIVE INSTRUCTIONS MODAL ================= */}
      {isAdminHR && mgmtApprovalModalApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-[55] no-print overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 text-slate-900 border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Formal Management & Central HR Appointment Approval
                  </h3>
                  <p className="text-xs text-slate-500">
                    Candidate: <strong className="text-slate-800">{mgmtApprovalModalApp.candidate_name}</strong> • #{mgmtApprovalModalApp.application_no}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMgmtApprovalModalApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate & Interview Evaluation Highlights */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Applied Post</span>
                <span className="font-bold text-slate-800 truncate block">
                  {mgmtApprovalModalApp.posts?.title || mgmtApprovalModalApp.custom_post_title || 'General Post'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Interview Score</span>
                <span className="font-black text-emerald-700 block">
                  {typeof mgmtApprovalModalApp.interview_score === 'number' ? `${mgmtApprovalModalApp.interview_score}/100` : 'Evaluated'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Institute</span>
                <span className="font-bold text-slate-800 truncate block">
                  {mgmtApprovalModalApp.forwarded_to_head_name || 'Principal'}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmManagementApproval} className="space-y-4">
              {/* 1. Confirmed Designation */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  1. Confirmed Designation Recommendation <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={mgmtConfirmedDesignation}
                  onChange={(e) => setMgmtConfirmedDesignation(e.target.value)}
                  placeholder="e.g. Assistant Professor in Computer Engineering"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Quick presets:</span>
                  {['Assistant Professor', 'Associate Professor', 'Professor', 'Lecturer', 'System Administrator', 'Lab Assistant'].map((desig) => (
                    <button
                      key={desig}
                      type="button"
                      onClick={() => setMgmtConfirmedDesignation(desig)}
                      className="px-2 py-0.5 rounded-md text-[10.5px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                    >
                      {desig}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Date of Joining & Compulsory Agreed Salary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Joining Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    2. Candidate Date of Joining
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={mgmtJoiningDate}
                      onChange={(e) => setMgmtJoiningDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Anticipated candidate reporting date</span>
                </div>

                {/* Agreed Total Salary Amount (COMPULSORY!) */}
                <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-300">
                  <label className="block text-xs font-black uppercase tracking-wider text-emerald-950 mb-1 flex items-center justify-between">
                    <span>3. Agreed Total Salary Amount <span className="text-rose-600">* (Compulsory)</span></span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xs">₹</span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={mgmtAgreedTotalSalary}
                      onChange={(e) => {
                        setMgmtAgreedTotalSalary(e.target.value);
                        if (mgmtSalaryError) setMgmtSalaryError(null);
                      }}
                      placeholder="e.g. 65000"
                      className="w-full pl-7 pr-3 py-2 border-2 border-emerald-400 rounded-xl text-xs bg-white font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
                    />
                  </div>
                  {mgmtAgreedTotalSalary && !isNaN(Number(mgmtAgreedTotalSalary)) && Number(mgmtAgreedTotalSalary) > 0 ? (
                    <span className="text-[10px] text-emerald-800 font-bold block mt-1 truncate">
                      {numberToWordsINR(Number(mgmtAgreedTotalSalary))}
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-700 italic block mt-1">
                      Agreed gross monthly / CTC amount
                    </span>
                  )}
                  {mgmtSalaryError && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {mgmtSalaryError}
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Pay Scale & Basic Pay */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    4. Pay Scale / Band Details
                  </label>
                  <input
                    type="text"
                    value={mgmtPayScale}
                    onChange={(e) => setMgmtPayScale(e.target.value)}
                    placeholder="e.g. Level 10 (57,700 - 1,82,400) / 7th CPC"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Basic Pay (₹)
                  </label>
                  <input
                    type="number"
                    value={mgmtBasicPay}
                    onChange={(e) => setMgmtBasicPay(e.target.value)}
                    placeholder="e.g. 57700"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. Mandatory Bond Submissions or Compliance Requirements */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  5. Mandatory Bond Submissions & Compliance Requirements
                </label>
                <input
                  type="text"
                  value={mgmtMandatoryBond}
                  onChange={(e) => setMgmtMandatoryBond(e.target.value)}
                  placeholder="e.g. 2-Year Mandatory Service Bond & Original Certificate Submission"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                  {[
                    '2-Year Service Bond & Original Cert Retention',
                    '1-Year Service Bond + Police Verification',
                    '3-Year Service Bond for PG/Ph.D.',
                    'No Bond Required (1-Yr Probation)',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMgmtMandatoryBond(preset)}
                      className="px-2 py-0.5 rounded-md text-[10.5px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Additional Customized Important Instructions or Remarks */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  6. Additional Customized Important Instructions / Counter Terms
                </label>
                <textarea
                  rows={2}
                  value={mgmtInstructions}
                  onChange={(e) => setMgmtInstructions(e.target.value)}
                  placeholder="e.g. Candidate must submit Medical Fitness Certificate from Civil Surgeon, 4 passport photos, and relieving letter from previous organization at the time of joining."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* 6. Cross-Module Data Propagation Options */}
              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2.5">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-blue-950 block">
                  Cross-Module Data Propagation & Downstream Triggers
                </span>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mgmtPushInstitute}
                      onChange={(e) => setMgmtPushInstitute(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded mt-0.5"
                    />
                    <div className="text-xs">
                      <strong className="text-slate-900 block">Institute Portal Propagation</strong>
                      <span className="text-slate-600 text-[11px]">
                        Automatically reflect status as "Formal Management & Central HR Appointment Approval Granted" for the respective college/branch administration with complete instructions.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mgmtPushAppointmentSection}
                      onChange={(e) => setMgmtPushAppointmentSection(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                    />
                    <div className="text-xs">
                      <strong className="text-slate-900 block">Appointment & Recruitment Section Workflow</strong>
                      <span className="text-slate-600 text-[11px]">
                        Automatically flag candidate record to initiate the official appointment order generation and dispatch workflow.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMgmtApprovalModalApp(null)}
                  className="px-4 py-2.5 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMgmtApproval}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingMgmtApproval ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authorizing & Propagating...</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-4 h-4" />
                      <span>Authorize Approval & Dispatch Downstream</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Success Toast for Management Approval / Downstream Push */}
      {mgmtSuccessToast && (
        <div className="fixed bottom-6 right-6 z-[70] bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom duration-200 max-w-md">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-0.5">
            <span className="font-black text-emerald-400 block">Cross-Module Action Executed</span>
            <span className="text-slate-200 block">{mgmtSuccessToast.msg}</span>
          </div>
          <button
            onClick={() => setMgmtSuccessToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
