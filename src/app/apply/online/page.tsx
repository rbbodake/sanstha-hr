'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { Post, StaffCategory, OrganizationSettings, Institute } from '@/types/database';
import { TrustLetterhead } from '@/components/TrustLetterhead';
import { toTitleCase, toSmartTitleCase, toCleanEmail, toCleanPAN } from '@/lib/stringUtils';
import {
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  Plus,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  GraduationCap,
  ArrowLeft,
  Lock,
  Camera,
  Copy,
  Check,
  Sparkles,
  Languages,
  Clock,
  MapPin,
  AlertTriangle,
  Printer,
  Users
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [categories, setCategories] = useState<StaffCategory[]>([]);

  // ── SECTION 1: DESIGNATION & CADRE ──────────────────────────────────────────
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [cadreFilter, setCadreFilter] = useState<'all' | 'teaching' | 'non_teaching'>('all');
  const [preferredInstituteId, setPreferredInstituteId] = useState<string>('');
  const [showAllStreams, setShowAllStreams] = useState(false);
  const [programStream, setProgramStream] = useState<string>('Engineering & Technology');
  const [courseName, setCourseName] = useState<string>('');
  const [isCustomCourse, setIsCustomCourse] = useState<boolean>(false);
  const [customCourseName, setCustomCourseName] = useState<string>('');
  const [specialization, setSpecialization] = useState<string>('');

  // ── SECTION 2: PERSONAL & CONTACT ───────────────────────────────────────────
  const [salutation, setSalutation] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [parentSpouseName, setParentSpouseName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [emailId, setEmailId] = useState('');
  const [villageCity, setVillageCity] = useState('');
  const [taluka, setTaluka] = useState('');
  const [district, setDistrict] = useState('Kolhapur');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pinCode, setPinCode] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [isMarried, setIsMarried] = useState<boolean>(false);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [reservationCategory, setReservationCategory] = useState('General (Open)');
  const [religionCaste, setReligionCaste] = useState('');
  const [isPwD, setIsPwD] = useState(false);
  const [pwdType, setPwdType] = useState('');
  const [languagesKnown, setLanguagesKnown] = useState<string[]>(['Marathi / मराठी', 'English / इंग्रजी']);
  const [sameAsResidential, setSameAsResidential] = useState(false);
  const [permanentAddress, setPermanentAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyMobile, setEmergencyMobile] = useState('');

  // ── SECTION 3: IDENTIFICATION ───────────────────────────────────────────────
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [panNo, setPanNo] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);

  // ── SECTION 4: EDUCATIONAL QUALIFICATIONS ──────────────────────────────────
  const [educationList, setEducationList] = useState([
    { level: 'Below 10th / SSC (१०वी पेक्षा कमी)', degree_name: '', board_university: '', passing_year: '', status_remark: '', percentage: '', marking_system: 'percentage' as 'percentage' | 'cgpa', cgpa: '', cgpa_scale: '10', file: null as File | null },
    { level: 'S.S.C. (10th) / १०वी', degree_name: 'SSC', board_university: '', passing_year: '', status_remark: '', percentage: '', marking_system: 'percentage' as 'percentage' | 'cgpa', cgpa: '', cgpa_scale: '10', file: null as File | null },
    { level: 'H.S.C. (12th) / १२वी', degree_name: 'HSC', board_university: '', passing_year: '', status_remark: '', percentage: '', marking_system: 'percentage' as 'percentage' | 'cgpa', cgpa: '', cgpa_scale: '10', file: null as File | null },
    { level: 'Diploma / पदविका', degree_name: '', board_university: '', passing_year: '', status_remark: '', percentage: '', marking_system: 'percentage' as 'percentage' | 'cgpa', cgpa: '', cgpa_scale: '10', file: null as File | null },
    { level: 'Graduation (UG) / पदवी', degree_name: '', board_university: '', passing_year: '', status_remark: '', percentage: '', marking_system: 'percentage' as 'percentage' | 'cgpa', cgpa: '', cgpa_scale: '10', file: null as File | null },
    { level: 'Post Graduation (PG) / पदव्युत्तर', degree_name: '', board_university: '', passing_year: '', status_remark: '', percentage: '', marking_system: 'percentage' as 'percentage' | 'cgpa', cgpa: '', cgpa_scale: '10', file: null as File | null },
    { level: 'Ph.D. / Doctorate / विद्यावाचस्पती', degree_name: '', board_university: '', passing_year: '', status_remark: 'Awarded', percentage: '', marking_system: 'percentage' as 'percentage' | 'cgpa', cgpa: '', cgpa_scale: '10', file: null as File | null },
    { level: 'Other / NET / SET / ITI / इतर', degree_name: '', board_university: '', passing_year: '', status_remark: 'Qualified', percentage: '', marking_system: 'percentage' as 'percentage' | 'cgpa', cgpa: '', cgpa_scale: '10', file: null as File | null },
  ]);
  const [qualificationSummary, setQualificationSummary] = useState('');

  // ── SECTION 5: WORK EXPERIENCE ─────────────────────────────────────────────
  const [isFresher, setIsFresher] = useState(false);
  const [teachingExpYears, setTeachingExpYears] = useState('');
  const [teachingExpMonths, setTeachingExpMonths] = useState('');
  const [industryExpYears, setIndustryExpYears] = useState('');
  const [industryExpMonths, setIndustryExpMonths] = useState('');
  const [experienceList, setExperienceList] = useState([
    { organization_name: '', designation: '', years_experience: '', previous_salary: '' },
  ]);
  const [salaryExpectation, setSalaryExpectation] = useState('');

  // ── SECTION 6: RESUME ───────────────────────────────────────────────────────
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // ── SECTION 7: DECLARATION & SIGNATURE ──────────────────────────────────────
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [declarationPlace, setDeclarationPlace] = useState('Ambap');
  const [signatureData, setSignatureData] = useState<string>('');
  const [useTypedSignature, setUseTypedSignature] = useState(false);
  const [typedSignature, setTypedSignature] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Submission States
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedCandidate, setSubmittedCandidate] = useState<SubmittedCandidateInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // Load masters & check URL parameters
  useEffect(() => {
    async function loadMasters() {
      try {
        const { data: orgData } = await supabase.from('organization_settings').select('*').limit(1).maybeSingle();
        if (orgData) setOrg(orgData);

        const { data: catData } = await supabase.from('staff_categories').select('*').eq('is_active', true);
        if (catData) setCategories(catData);

        const { data: postData } = await supabase.from('posts').select('*, staff_categories(*)').eq('is_active', true).order('title');
        if (postData) {
          setPosts(postData);
          if (postData.length > 0) setSelectedPostId(postData[0].id);
        }

        const { data: instData } = await supabase.from('institutes').select('*, institute_courses(*)').eq('is_active', true).order('official_name');
        if (instData) setInstitutes(instData);
      } catch (err) {
        console.warn('Failed to load master records:', err);
      }
    }
    loadMasters();

    // Check if user arrived from HTML form redirect
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

  // Synchronize permanent address when checkbox toggled
  useEffect(() => {
    if (sameAsResidential) {
      setPermanentAddress([villageCity, taluka, district, stateName, pinCode].filter(Boolean).join(', '));
    }
  }, [sameAsResidential, villageCity, taluka, district, stateName, pinCode]);

  // Calculate age from DOB
  const handleDobChange = (val: string) => {
    setDob(val);
    if (!val) {
      setAge('');
      return;
    }
    const birth = new Date(val);
    const today = new Date();
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      a--;
    }
    setAge(a >= 0 ? a : '');
  };

  // Canvas Drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0284c7';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  // Photo Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Experience row helpers
  const addExperienceRow = () => {
    setExperienceList([...experienceList, { organization_name: '', designation: '', years_experience: '', previous_salary: '' }]);
  };

  const removeExperienceRow = (idx: number) => {
    if (experienceList.length <= 1) return;
    setExperienceList(experienceList.filter((_, i) => i !== idx));
  };

  // Selected Post helper
  const selectedPost = posts.find((p) => p.id === selectedPostId);
  const applicationFee = 50; // Remote pre-registration fee collected at front desk

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedPostId && posts.length > 0) {
      alert(lang === 'mr' ? 'कृपया पद निवडा.' : 'Please select a job designation.');
      return;
    }
    if (!candidateName.trim()) {
      alert(lang === 'mr' ? 'कृपया आधार कार्डानुसार पूर्ण नाव प्रविष्ट करा.' : 'Please enter full candidate name as per Aadhaar.');
      return;
    }
    if (!contactNo || !/^\d{10}$/.test(contactNo.trim())) {
      alert(lang === 'mr' ? 'कृपया १० अंकी वैध मोबाईल नंबर प्रविष्ट करा.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!aadhaarNo || !/^\d{12}$/.test(aadhaarNo.replace(/\s+/g, ''))) {
      alert(lang === 'mr' ? 'कृपया १२ अंकी वैध आधार नंबर प्रविष्ट करा.' : 'Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (!declarationAccepted) {
      alert(lang === 'mr' ? 'कृपया प्रतिज्ञापत्रास सहमती द्या.' : 'Please accept the declaration before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('post_id', selectedPostId);
      formData.append('designation', selectedPost?.title || 'Applied Designation');
      formData.append('program_stream', programStream);
      formData.append('course_name', isCustomCourse ? customCourseName : courseName);
      formData.append('specialization', specialization);
      formData.append('preferred_institute_id', preferredInstituteId);

      const selInst = institutes.find((i) => i.id === preferredInstituteId);
      formData.append('preferred_campus', selInst?.official_name || selInst?.name || 'Any Sanstha Campus');

      formData.append('salutation', salutation || 'Mr.');
      formData.append('full_name', candidateName);
      formData.append('parent_spouse_name', parentSpouseName);
      formData.append('contact_no', contactNo.replace(/\D/g, ''));
      formData.append('email_id', emailId);
      formData.append('village_city', villageCity);
      formData.append('taluka', taluka);
      formData.append('district', district);
      formData.append('state', stateName);
      formData.append('pin_code', pinCode.replace(/\D/g, ''));
      formData.append('dob', dob);
      formData.append('marital_status', isMarried ? 'Married' : 'Single');
      formData.append('gender', gender);
      formData.append('blood_group', bloodGroup);
      formData.append('reservation_category', reservationCategory);
      formData.append('religion_caste', religionCaste);
      formData.append('is_pwd', isPwD ? 'Yes' : 'No');
      formData.append('pwd_type', isPwD ? pwdType : '');
      formData.append('languages_known', JSON.stringify(languagesKnown));
      formData.append('permanent_address', permanentAddress || [villageCity, taluka, district, stateName, pinCode].filter(Boolean).join(', '));
      formData.append('emergency_contact_name', emergencyName);
      formData.append('emergency_contact_relation', emergencyRelation);
      formData.append('emergency_contact_mobile', emergencyMobile);

      formData.append('aadhaar_no', aadhaarNo.replace(/\D/g, ''));
      formData.append('pan_no', panNo.toUpperCase());

      // Files
      if (photoFile) formData.append('photo', photoFile);
      if (resumeFile) formData.append('resume', resumeFile);
      if (aadhaarFile) formData.append('aadhaar_file', aadhaarFile);
      if (panFile) formData.append('pan_file', panFile);

      // Education List
      const serializableEdu = educationList.map((edu) => ({
        level: edu.level,
        degree_name: edu.degree_name,
        board_university: edu.board_university,
        passing_year: edu.passing_year,
        status_remark: edu.status_remark,
        marking_system: edu.marking_system,
        percentage: edu.percentage,
        cgpa: edu.cgpa,
        cgpa_scale: edu.cgpa_scale,
      }));
      formData.append('education_list_json', JSON.stringify(serializableEdu));
      formData.append('qualification_summary', qualificationSummary);

      // Experience List
      formData.append('is_fresher', isFresher ? 'Yes' : 'No');
      formData.append('total_teaching_exp_years', teachingExpYears);
      formData.append('total_teaching_exp_months', teachingExpMonths);
      formData.append('total_industry_exp_years', industryExpYears);
      formData.append('total_industry_exp_months', industryExpMonths);
      if (!isFresher) {
        formData.append('experience_list_json', JSON.stringify(experienceList));
      }
      formData.append('salary_expectation', salaryExpectation);

      // Declaration
      formData.append('declaration', 'on');
      formData.append('declaration_place', declarationPlace);
      formData.append('signature_url', useTypedSignature ? `typed:${typedSignature || candidateName}` : (signatureData || `typed:${candidateName}`));

      const res = await fetch('/api/apply/online', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit pre-registration. Please check all fields.');
      }

      setSubmittedCandidate({
        temp_id: data.temp_id,
        application_no: data.application_no,
        candidate_name: data.candidate_name,
        post_title: data.designation || selectedPost?.title || 'Applied Designation',
        program_stream: data.program_stream || programStream,
        contact_no: data.contact_no || contactNo,
        prescribed_fee: data.fee || 50,
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(err.message || 'Failed to submit pre-registration. Please check your network and entries.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyTempId = () => {
    if (!submittedCandidate?.temp_id) return;
    navigator.clipboard.writeText(submittedCandidate.temp_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SUCCESS SCREEN: Shows Temporary ID, QR Code & Front Desk Settlement Steps
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
              href="/apply/status"
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
  // MAIN FORM: 100% Aligned with Candidate Walk-in Form Structure & Sections
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 pb-20 font-sans">
      {/* Sleek Top Bar with Language Switcher */}
      <header className="px-3 sm:px-4 py-2.5 sm:py-3.5 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-sky-700 transition py-1"
          >
            <ArrowLeft className="w-4 h-4" /> {lang === 'mr' ? 'मुख्यपृष्ठ' : 'Home'}
          </Link>

          {/* Bilingual Language Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300 shadow-inner">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                lang === 'en' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang('mr')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                lang === 'mr' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              मराठी
            </button>
          </div>

          <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider bg-sky-50 px-3 py-1 rounded-full border border-sky-200 hidden sm:flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-sky-600" /> {lang === 'mr' ? 'दूरस्थ पूर्व-नोंदणी' : 'Remote Pre-Registration'}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        {/* Trust Official Letterhead */}
        <div className="mb-4 sm:mb-6">
          <TrustLetterhead
            org={org}
            variant="standard"
            titleBadge={lang === 'mr' ? 'सार्वजनिक दूरस्थ उमेदवार पूर्व-नोंदणी पोर्टल' : 'PUBLIC REMOTE CANDIDATE PRE-REGISTRATION PORTAL'}
          />
        </div>

        {/* PROMINENT APPLICATION FEE NOTICE BANNER */}
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 space-y-1">
            <strong className="font-bold">
              {lang === 'mr' ? 'ऑनलाइन शुल्क भरण्याची आवश्यकता नाही:' : 'Online Payment is NOT Required:'}
            </strong>
            <p className="text-amber-900 leading-relaxed">
              {lang === 'mr'
                ? 'आपला अर्ज ड्राफ्ट (शुल्क बाकी) म्हणून जतन केला जाईल. विहित अर्ज शुल्क (₹५०) प्रत्यक्ष मध्यवर्ती HR फ्रंट डेस्कवर आल्यावर स्वीकारले जाईल.'
                : 'Your submission will be saved as Draft (Pending Fee). The prescribed application fee (₹50) will be collected upon physical arrival at the Central HR Front Desk.'}
            </p>
          </div>
        </div>

        {submitError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            {submitError}
          </div>
        )}

        {/* MAIN APPLICATION FORM */}
        <form
          id="remotePreRegistrationForm"
          action="/api/apply/online"
          method="POST"
          encType="multipart/form-data"
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-6"
        >
          {/* 1. Job Designation, Cadre & Academic Stream */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {lang === 'mr' ? '१. पदाचे नाव, संवर्ग व विद्याशाखा' : '1. Job Designation, Cadre & Academic Stream'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'mr' ? 'आपण अर्ज करत असलेले पद, संस्था व विद्याशाखा निवडा' : 'Select your desired role, preferred institute, and academic stream'}
                </p>
              </div>
            </div>

            {/* Cadre Filter Pills */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  {lang === 'mr' ? 'संवर्ग निवडा (फिल्टर)' : 'Cadre / Post Type'}
                </label>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setCadreFilter('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      cadreFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {lang === 'mr' ? 'सर्व पदे' : 'All Posts'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCadreFilter('teaching')}
                    className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                      cadreFilter === 'teaching' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{lang === 'mr' ? 'शैक्षणिक' : 'Teaching'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCadreFilter('non_teaching')}
                    className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                      cadreFilter === 'non_teaching' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{lang === 'mr' ? 'शिक्षकेतर (सामाईक संच)' : 'Non-Teaching (Common Pool)'}</span>
                  </button>
                </div>
              </div>

              {/* Preferred Institute Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? 'प्राधान्य संस्था / कॉलेज (पर्यायी)' : 'Preferred Institute / College (Optional)'}
                </label>
                <select
                  value={preferredInstituteId}
                  onChange={(e) => {
                    const newInstId = e.target.value;
                    setPreferredInstituteId(newInstId);
                    if (newInstId) {
                      const selInst = institutes.find((i) => i.id === newInstId);
                      if (selInst && selInst.institute_courses && selInst.institute_courses.length > 0) {
                        const firstStream = selInst.institute_courses[0].program_stream;
                        if (firstStream) setProgramStream(firstStream);
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                >
                  <option value="">
                    {lang === 'mr'
                      ? '🏛️ कोणतीही संस्था / मध्यवर्ती सामाईक संवर्ग (Central Common Pool)'
                      : '🏛️ Any Institute / Central Common Pool (Open Posting Across Sanstha)'}
                  </option>
                  {institutes.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.official_name || inst.name} {inst.code ? `[Code: ${inst.code}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Job Designation */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? '* पदाचे नाव / पद निवडा' : '* Select Job Designation / Role'}
                </label>
                <select
                  required
                  value={selectedPostId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setSelectedPostId(selId);
                    const selPost = posts.find((p) => p.id === selId);
                    if (selPost) {
                      const isNonTeach =
                        selPost.staff_categories?.name?.toLowerCase().includes('non') ||
                        selPost.staff_categories?.name?.toLowerCase().includes('house');

                      if (isNonTeach) {
                        setProgramStream('General / Administrative / Other');
                      } else if (
                        selPost.program_stream &&
                        selPost.program_stream !== 'All Programs / General' &&
                        selPost.program_stream !== 'Other'
                      ) {
                        setProgramStream(selPost.program_stream);
                        setCourseName('');
                        setIsCustomCourse(false);
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                >
                  <option value="">{lang === 'mr' ? '-- मंजूर पद निवडा --' : '-- Select Approved Designation --'}</option>

                  {/* Non-Teaching Posts */}
                  {cadreFilter !== 'teaching' && (
                    <optgroup
                      label={
                        lang === 'mr'
                          ? '🏛️ मध्यवर्ती सामाईक संवर्ग — शिक्षकेतर व प्रशासकीय पदे (सर्व संस्थांसाठी)'
                          : '🏛️ Central Common Pool — Non-Teaching & Administrative (Shared across Sanstha)'
                      }
                    >
                      {posts
                        .filter((p) => {
                          const catName = p.staff_categories?.name?.toLowerCase() || '';
                          return catName.includes('non') || catName.includes('house');
                        })
                        .map((post) => (
                          <option key={post.id} value={post.id}>
                            {post.title} — [🏛️ Central Common Pool]
                          </option>
                        ))}
                    </optgroup>
                  )}

                  {/* Teaching Posts */}
                  {cadreFilter !== 'non_teaching' && (
                    <optgroup label={lang === 'mr' ? '🎓 शैक्षणिक पदे (Teaching Faculty)' : '🎓 Academic Teaching Faculty'}>
                      {posts
                        .filter((p) => {
                          const catName = p.staff_categories?.name?.toLowerCase() || '';
                          return catName.includes('teach') && !catName.includes('non');
                        })
                        .map((post) => (
                          <option key={post.id} value={post.id}>
                            {post.title} — [{post.staff_categories?.name || 'Teaching'}] {post.program_stream ? `• (${post.program_stream})` : ''}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                  Application Fee: <strong className="text-emerald-700 font-mono">₹{applicationFee}</strong> (Settled in person at Front Desk)
                </span>
              </div>
            </div>

            {/* Academic Stream & Course Name */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Discipline / Program Stream */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    {lang === 'mr' ? '* विद्याशाखा / विभाग' : '* Academic Stream / Discipline'}
                  </label>
                  <select
                    required
                    value={programStream}
                    onChange={(e) => {
                      const newStream = e.target.value;
                      setProgramStream(newStream);
                      setCourseName('');
                      setIsCustomCourse(false);
                      setCustomCourseName('');
                    }}
                    className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                  >
                    {programStreamOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Course Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    {lang === 'mr' ? '* अभ्यासक्रम / पदवी नाव' : '* Course / Programme Name'}
                  </label>
                  <select
                    required
                    value={isCustomCourse ? 'other' : courseName}
                    onChange={(e) => {
                      if (e.target.value === 'other') {
                        setIsCustomCourse(true);
                        setCourseName('');
                      } else {
                        setIsCustomCourse(false);
                        setCourseName(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                  >
                    <option value="">{lang === 'mr' ? '-- अभ्यासक्रम निवडा --' : '-- Select Course / Programme --'}</option>
                    {(defaultStreamCourses[programStream] || []).map((cName) => (
                      <option key={cName} value={cName}>{cName}</option>
                    ))}
                    <option value="other">{lang === 'mr' ? '➕ इतर अभ्यासक्रम (स्वतः टाईप करा)' : '➕ Other Course (Type manually)'}</option>
                  </select>
                </div>
              </div>

              {isCustomCourse && (
                <div>
                  <label className="block text-xs font-bold text-sky-900 mb-1">
                    {lang === 'mr' ? '* अभ्यासक्रमाचे नाव टाईप करा' : '* Type Custom Course / Programme Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'mr' ? 'उदा. फॅशन डिझायनिंग पदविका / डेटा सायन्स' : 'e.g. Diploma in Fashion Designing / M.Sc. Data Science'}
                    value={customCourseName}
                    onChange={(e) => setCustomCourseName(e.target.value)}
                    onBlur={(e) => setCustomCourseName(toSmartTitleCase(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-sky-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? 'विषय / विशेषीकरण (पर्यायी)' : 'Subject / Specialization (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'mr' ? 'उदा. मशिन लर्निंग / ऑरगॅनिक केमिस्ट्री' : 'e.g. Machine Learning / Organic Chemistry'}
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  onBlur={(e) => setSpecialization(toSmartTitleCase(e.target.value))}
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* 2. Personal & Contact Information */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {lang === 'mr' ? '२. वैयक्तिक व संपर्क माहिती' : '2. Personal & Contact Details'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'mr' ? 'आधार कार्डानुसार आपली वैयक्तिक माहिती भरा' : 'Provide your verified identity information'}
                </p>
              </div>
            </div>

            {/* Passport Photo Box */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-20 h-24 rounded-xl bg-white border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm relative">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Candidate Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-400 p-1">
                    <Camera className="w-6 h-6 mx-auto mb-0.5 opacity-60" />
                    <span className="text-[9px] font-bold block leading-tight">
                      {lang === 'mr' ? 'पासपोर्ट फोटो' : 'Passport Photo'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <span className="text-xs font-bold text-slate-800 block">
                  {lang === 'mr' ? 'उमेदवाराचा पासपोर्ट फोटो' : 'Candidate Passport Photograph'}
                </span>
                <p className="text-[11px] text-slate-500">
                  {lang === 'mr' ? 'स्पष्ट फोटो निवडा किंवा अपलोड करा' : 'Take a selfie or upload a clear passport photo'}
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                  {photoFile ? (lang === 'mr' ? 'फोटो बदला' : 'Change Photo') : (lang === 'mr' ? 'फोटो घ्या / अपलोड करा' : 'Take / Upload Photo')}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Salutation + Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? '* संबोधन / उपाधी' : '* Salutation / Title'}
                </label>
                <select
                  required
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                >
                  <option value="">{lang === 'mr' ? '-- निवडा --' : '-- Select --'}</option>
                  <option value="Mr.">Mr. (श्री)</option>
                  <option value="Mrs.">Mrs. (सौ.)</option>
                  <option value="Ms.">Ms. (कु.)</option>
                  <option value="Dr.">Dr. (डॉ.)</option>
                  <option value="Smt.">Smt. (श्रीमती)</option>
                  <option value="Prof.">Prof. (प्रा.)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? '* उमेदवाराचे संपूर्ण नाव (आधार कार्डानुसार)' : '* Candidate Full Name (as per Aadhaar)'}
                </label>
                <div className="flex items-center gap-2">
                  {salutation && (
                    <span className="flex-shrink-0 px-2.5 py-2.5 sm:py-3 bg-sky-50 border border-sky-300 rounded-xl text-xs sm:text-sm font-black text-sky-800 whitespace-nowrap shadow-sm">
                      {salutation}
                    </span>
                  )}
                  <input
                    type="text"
                    required
                    placeholder={lang === 'mr' ? 'उदा. पवार रमेश विठ्ठल' : 'As per Aadhaar Card'}
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    onBlur={(e) => setCandidateName(toTitleCase(e.target.value))}
                    className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Father's / Husband's Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {lang === 'mr' ? 'वडील / पतीचे पूर्ण नाव' : "Father's / Husband's Full Name"}
              </label>
              <input
                type="text"
                placeholder={lang === 'mr' ? 'वडील किंवा पतीचे पूर्ण नाव' : "Father's or Husband's Full Name"}
                value={parentSpouseName}
                onChange={(e) => setParentSpouseName(e.target.value)}
                onBlur={(e) => setParentSpouseName(toTitleCase(e.target.value))}
                className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
              />
            </div>

            {/* Mobile & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? '* मोबाईल / व्हॉट्सॲप नंबर' : '* Mobile / WhatsApp No.'}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  required
                  maxLength={10}
                  placeholder={lang === 'mr' ? '१० अंकी मोबाईल नंबर' : '10-digit number'}
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-semibold bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? 'ईमेल पत्ता' : 'Email Address'}
                </label>
                <input
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  placeholder="candidate@gmail.com"
                  value={emailId}
                  onChange={(e) => setEmailId(e.target.value)}
                  onBlur={(e) => setEmailId(toCleanEmail(e.target.value))}
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                />
              </div>
            </div>

            {/* Residential Address */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {lang === 'mr' ? '* सध्याचा राहण्याचा पत्ता' : '* Residential Address'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input required value={villageCity} onChange={(e) => setVillageCity(e.target.value)} onBlur={(e) => setVillageCity(toTitleCase(e.target.value))} placeholder="Village / City" className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                <input required value={taluka} onChange={(e) => setTaluka(e.target.value)} onBlur={(e) => setTaluka(toTitleCase(e.target.value))} placeholder="Taluka" className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                <input required value={district} onChange={(e) => setDistrict(e.target.value)} onBlur={(e) => setDistrict(toTitleCase(e.target.value))} placeholder="District" className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                <input required value={stateName} onChange={(e) => setStateName(e.target.value)} onBlur={(e) => setStateName(toTitleCase(e.target.value))} placeholder="State" className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                <input required inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={pinCode} onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="PIN Code" className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none" />
              </div>
            </div>

            {/* DOB, Age, Marital Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? 'जन्मतारीख' : 'Date of Birth'}
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? 'वय (वर्षे)' : 'Calculated Age'}
                </label>
                <input
                  type="text"
                  readOnly
                  value={age !== '' ? `${age} ${lang === 'mr' ? 'वर्षे' : 'Years'}` : '—'}
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? 'वैवाहिक स्थिती' : 'Marital Status'}
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setIsMarried(false)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${!isMarried ? 'bg-sky-700 text-white border-sky-700 shadow-sm' : 'bg-white text-slate-700 border-slate-300'}`}
                  >
                    {lang === 'mr' ? 'अविवाहित' : 'Single / Unmarried'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMarried(true)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${isMarried ? 'bg-sky-700 text-white border-sky-700 shadow-sm' : 'bg-white text-slate-700 border-slate-300'}`}
                  >
                    {lang === 'mr' ? 'विवाहित' : 'Married'}
                  </button>
                </div>
              </div>
            </div>

            {/* Gender / लिंग */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {lang === 'mr' ? '* लिंग (Gender)' : '* Gender / लिंग'}
              </label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(
                  [
                    { val: 'male'   as const, en: 'Male',                mr: 'पुरुष' },
                    { val: 'female' as const, en: 'Female',              mr: 'स्त्री' },
                    { val: 'other'  as const, en: 'Transgender / Other', mr: 'इतर / तृतीयपंथी' },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setGender(opt.val)}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition ${
                      gender === opt.val
                        ? 'bg-sky-700 text-white border-sky-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'
                    }`}
                  >
                    {lang === 'mr' ? opt.mr : opt.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Blood Group + Reservation Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? 'रक्तगट (Blood Group)' : 'Blood Group / रक्तगट'}
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                >
                  <option value="">{lang === 'mr' ? '-- रक्तगट निवडा --' : '-- Select Blood Group --'}</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? 'प्रवर्ग / आरक्षण (Category)' : 'Reservation Category / प्रवर्ग'}
                </label>
                <select
                  value={reservationCategory}
                  onChange={(e) => setReservationCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
                >
                  {['General (Open)', 'SC', 'ST', 'VJ/DT(A)', 'NT(B)', 'NT(C)', 'NT(D)', 'OBC', 'SBC', 'SEBC', 'EWS'].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Religion & Caste */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {lang === 'mr' ? 'धर्म व जात / उपजात (Religion & Caste)' : 'Religion & Caste / Sub-Caste'}
              </label>
              <input
                type="text"
                placeholder={lang === 'mr' ? 'उदा. हिंदू - मराठा / हिंदू - माळी' : 'e.g. Hindu - Maratha / Hindu - Mali'}
                value={religionCaste}
                onChange={(e) => setReligionCaste(e.target.value)}
                onBlur={(e) => setReligionCaste(toSmartTitleCase(e.target.value))}
                className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm"
              />
            </div>

            {/* PwD Status */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {lang === 'mr' ? 'दिव्यांगत्व स्थिती (PwD / Differently Abled)' : 'Differently Abled / PwD Status / दिव्यांगत्व'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setIsPwD(false); setPwdType(''); }}
                  className={`py-2 px-5 rounded-xl border text-xs font-bold transition ${
                    !isPwD ? 'bg-sky-700 text-white border-sky-700 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {lang === 'mr' ? 'नाही (No)' : 'No'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPwD(true)}
                  className={`py-2 px-5 rounded-xl border text-xs font-bold transition ${
                    isPwD ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:border-rose-300'
                  }`}
                >
                  {lang === 'mr' ? 'होय (Yes)' : 'Yes'}
                </button>
              </div>
              {isPwD && (
                <div className="mt-2 space-y-0.5">
                  <input
                    type="text"
                    placeholder={lang === 'mr' ? 'उदा. अस्थिव्यंग ४०% / दृष्टिदोष ७०%' : 'e.g. Locomotor Disability 40% / Visual Impairment 70%'}
                    value={pwdType}
                    onChange={(e) => setPwdType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-rose-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-rose-400 focus:outline-none shadow-sm"
                  />
                  <span className="text-[11px] text-rose-600 font-semibold block">
                    {lang === 'mr' ? 'दिव्यांगत्वाचा प्रकार व टक्केवारी नमूद करा' : 'Specify disability type and percentage'}
                  </span>
                </div>
              )}
            </div>

            {/* Languages Known */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {lang === 'mr' ? 'भाषा ज्ञान (Languages Known)' : 'Mother Tongue / Languages Known / भाषा ज्ञान'}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['Marathi / मराठी', 'Hindi / हिंदी', 'English / इंग्रजी', 'Other / इतर']).map((langOpt) => {
                  const checked = languagesKnown.includes(langOpt);
                  return (
                    <button
                      key={langOpt}
                      type="button"
                      onClick={() =>
                        setLanguagesKnown(
                          checked
                            ? languagesKnown.filter((l) => l !== langOpt)
                            : [...languagesKnown, langOpt]
                        )
                      }
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition ${
                        checked
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      {langOpt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Permanent Address with Toggle */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  {lang === 'mr' ? 'कायमचा पत्ता (Permanent Address)' : 'Permanent Address / कायमचा पत्ता'}
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-sky-800 select-none">
                  <input
                    type="checkbox"
                    checked={sameAsResidential}
                    onChange={(e) => {
                      setSameAsResidential(e.target.checked);
                      if (e.target.checked) setPermanentAddress([villageCity, taluka, district, stateName, pinCode].filter(Boolean).join(', '));
                      else setPermanentAddress('');
                    }}
                    className="h-3.5 w-3.5 rounded border-slate-400 focus:ring-sky-500 cursor-pointer accent-sky-700"
                  />
                  {lang === 'mr' ? '✅ राहण्याच्या पत्त्यासारखाच आहे' : '✅ Same as Residential Address'}
                </label>
              </div>
              <textarea
                rows={2}
                placeholder={lang === 'mr' ? 'गाव/शहर, तालुका, जिल्हा, राज्य आणि पिन कोड' : 'Village/City, Taluka, District, State with PIN Code'}
                value={permanentAddress}
                readOnly={sameAsResidential}
                onChange={(e) => setPermanentAddress(e.target.value)}
                onBlur={(e) => { if (!sameAsResidential) setPermanentAddress(toTitleCase(e.target.value)); }}
                className={`w-full p-3 border rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm ${
                  sameAsResidential
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-white border-slate-300'
                }`}
              />
            </div>

            {/* Emergency Contact Details */}
            <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-900 block">
                🚨 {lang === 'mr' ? 'आपत्कालीन संपर्क (Emergency Contact)' : 'Emergency Contact Details'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-slate-600 mb-0.5">
                    {lang === 'mr' ? 'संपर्क व्यक्तीचे नाव' : 'Contact Person Name'}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'mr' ? 'उदा. सुनीता पाटील' : 'e.g. Sunita Patil'}
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    onBlur={(e) => setEmergencyName(toTitleCase(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-slate-600 mb-0.5">
                    {lang === 'mr' ? 'नाते / संबंध' : 'Relationship'}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'mr' ? 'उदा. आई / वडील / पती / पत्नी' : 'e.g. Father / Mother / Spouse'}
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    onBlur={(e) => setEmergencyRelation(toTitleCase(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-slate-600 mb-0.5">
                    {lang === 'mr' ? 'मोबाईल नंबर' : 'Mobile Number'}
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    maxLength={10}
                    placeholder={lang === 'mr' ? '१० अंकी नंबर' : '10-digit number'}
                    value={emergencyMobile}
                    onChange={(e) => setEmergencyMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono bg-white focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Identity Cards (Aadhaar & PAN) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-3.5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {lang === 'mr' ? '३. आधार व पॅन ओळख' : '3. Aadhaar & PAN Identification'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'mr' ? 'कागदपत्र पडताळणीसाठी सुरक्षितपणे साठवले जाते' : 'Stored safely for HR verification upon physical arrival'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Aadhaar */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {lang === 'mr' ? '* आधार कार्ड नंबर (१२ अंक)' : '* Aadhaar Number (12 Digits)'}
                  </label>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={12}
                  placeholder="1234 5678 9012"
                  value={aadhaarNo}
                  onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono tracking-widest bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                />
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'mr' ? 'आधार कार्ड प्रत (फोटो/PDF)' : 'Upload Aadhaar Scan / Photo'}
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                  />
                </div>
              </div>

              {/* PAN */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {lang === 'mr' ? 'पॅन कार्ड नंबर (१० अक्षरे/अंक)' : 'PAN Card Number (10 Characters)'}
                  </label>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  autoCapitalize="characters"
                  maxLength={10}
                  placeholder="ABCDE1234F"
                  value={panNo}
                  onChange={(e) => setPanNo(e.target.value.toUpperCase())}
                  onBlur={(e) => setPanNo(toCleanPAN(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono uppercase tracking-widest bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                />
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'mr' ? 'पॅन कार्ड प्रत (फोटो/PDF)' : 'Upload PAN Scan / Photo'}
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setPanFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Educational Qualifications */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {lang === 'mr' ? '४. शैक्षणिक पात्रता' : '4. Educational Qualifications'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'mr' ? 'आपली शैक्षणिक माहिती भरा (१०वी पेक्षा कमी ते Ph.D. पर्यंत)' : 'Fill your degrees (Below 10th / SSC to Ph.D. / Doctorate)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Non-matric guidance callout */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <span className="text-base leading-none">💡</span>
              <div className="leading-relaxed">
                {lang === 'mr' ? (
                  <span>
                    <strong>१०वी पेक्षा कमी शिक्षण असल्यास:</strong> उमेदवार (उदा. ४थी, ७वी, ८वी, ९वी पास) पहिली ओळ <em>&quot;Below 10th / SSC&quot;</em> भरू शकतात.
                  </span>
                ) : (
                  <span>
                    <strong>Candidates with less than 10th qualification:</strong> Applicants (e.g. 4th, 7th, 8th, 9th pass) can fill the first row <em>&quot;Below 10th / SSC&quot;</em> and leave 10th blank.
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-3 w-40">{lang === 'mr' ? 'परीक्षा / शिक्षण स्तर' : 'Exam / Degree Level'}</th>
                    <th className="py-3 px-3">{lang === 'mr' ? 'इयत्ता / पदवी / शाखा / विषय' : 'Degree / Branch / Subject'}</th>
                    <th className="py-3 px-3">{lang === 'mr' ? 'शाळा / मंडळ / विद्यापीठ' : 'University / Board / College'}</th>
                    <th className="py-3 px-3 w-24 text-center">{lang === 'mr' ? 'वर्ष' : 'Passing Year'}</th>
                    <th className="py-3 px-3 w-44">{lang === 'mr' ? 'स्थिती / टक्केवारी (%)' : 'Status / % Grade'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {educationList.map((edu, idx) => {
                    const isBelow10th = edu.level.includes('Below 10th');
                    const isPhd = edu.level.includes('Ph.D');
                    const isNetSet = edu.level.includes('NET');
                    const isUgPg = edu.level.includes('Graduation (UG)') || edu.level.includes('Post Graduation (PG)');

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{edu.level}</td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder={
                              isBelow10th
                                ? (lang === 'mr' ? 'उदा. ४थी / ७वी' : 'Class / Std (e.g. 7th)')
                                : isPhd
                                ? 'Topic / Discipline'
                                : isNetSet
                                ? 'Exam Name'
                                : 'Branch / Subject'
                            }
                            value={edu.degree_name}
                            onChange={(e) => {
                              const updated = [...educationList];
                              updated[idx].degree_name = e.target.value;
                              setEducationList(updated);
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Board / University"
                            value={edu.board_university}
                            onChange={(e) => {
                              const updated = [...educationList];
                              updated[idx].board_university = e.target.value;
                              setEducationList(updated);
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="YYYY"
                            value={edu.passing_year}
                            onChange={(e) => {
                              const updated = [...educationList];
                              updated[idx].passing_year = e.target.value.replace(/\D/g, '');
                              setEducationList(updated);
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-center bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          {isPhd ? (
                            <select
                              value={edu.status_remark || 'Awarded'}
                              onChange={(e) => {
                                const updated = [...educationList];
                                updated[idx].status_remark = e.target.value;
                                setEducationList(updated);
                              }}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                            >
                              <option value="Awarded">Awarded</option>
                              <option value="Scholar / Pursuing">Scholar / Pursuing</option>
                            </select>
                          ) : isNetSet ? (
                            <select
                              value={edu.status_remark || 'Qualified'}
                              onChange={(e) => {
                                const updated = [...educationList];
                                updated[idx].status_remark = e.target.value;
                                setEducationList(updated);
                              }}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                            >
                              <option value="Qualified">Qualified</option>
                              <option value="Not Qualified / Appeared">Not Qualified / Appeared</option>
                            </select>
                          ) : (
                            <div className="space-y-1">
                              {isUgPg && (
                                <select
                                  aria-label="Marking system"
                                  value={edu.marking_system}
                                  onChange={(e) => {
                                    const updated = [...educationList];
                                    updated[idx].marking_system = e.target.value as 'percentage' | 'cgpa';
                                    setEducationList(updated);
                                  }}
                                  className="w-full px-2 py-1 border border-slate-300 rounded-lg text-[11px] bg-white font-semibold"
                                >
                                  <option value="percentage">Percentage (%)</option>
                                  <option value="cgpa">CGPA / Grade</option>
                                </select>
                              )}
                              {isUgPg && edu.marking_system === 'cgpa' ? (
                                <div className="grid grid-cols-2 gap-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="CGPA"
                                    value={edu.cgpa}
                                    onChange={(e) => {
                                      const updated = [...educationList];
                                      updated[idx].cgpa = e.target.value;
                                      setEducationList(updated);
                                    }}
                                    className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs"
                                  />
                                  <input
                                    type="number"
                                    step="0.1"
                                    placeholder="Scale 10"
                                    value={edu.cgpa_scale}
                                    onChange={(e) => {
                                      const updated = [...educationList];
                                      updated[idx].cgpa_scale = e.target.value;
                                      setEducationList(updated);
                                    }}
                                    className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs"
                                  />
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Percentage %"
                                  value={edu.percentage}
                                  onChange={(e) => {
                                    const updated = [...educationList];
                                    updated[idx].percentage = e.target.value;
                                    setEducationList(updated);
                                  }}
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                                />
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {lang === 'mr' ? 'सर्वोच्च शैक्षणिक पात्रता थोडक्यात' : 'Highest Qualification Summary'}
              </label>
              <input
                type="text"
                placeholder={lang === 'mr' ? 'उदा. ७वी पास / १०वी पास / बी.ए. मराठी / एम.टेक मेकॅनिकल' : 'e.g. 7th Pass / 10th Pass / B.A. / M.Tech in Computer Science'}
                value={qualificationSummary}
                onChange={(e) => setQualificationSummary(e.target.value)}
                onBlur={(e) => setQualificationSummary(toSmartTitleCase(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm"
              />
            </div>
          </div>

          {/* 5. Work Experience */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                  5
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {lang === 'mr' ? '५. कामाचा अनुभव' : '5. Work Experience'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'mr' ? 'मागील शिकवण्याचा किंवा इतर कामाचा अनुभव' : 'Prior teaching or industry experience'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFresher(!isFresher)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  isFresher ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {isFresher
                  ? (lang === 'mr' ? '✅ मी फ्रेशर आहे (अनुभव नाही)' : '✅ I am a Fresher')
                  : (lang === 'mr' ? 'फ्रेशर आहात का?' : 'Fresher?')}
              </button>
            </div>

            {/* Total Experience Summary */}
            <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-900 block">
                {lang === 'mr' ? 'एकूण अनुभव सारांश' : 'Total Relevant Experience Summary'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-2">
                  <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                    {lang === 'mr' ? 'शैक्षणिक / अध्यापन अनुभव' : 'Total Teaching Experience'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      placeholder="Years"
                      value={teachingExpYears}
                      onChange={(e) => setTeachingExpYears(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                    />
                    <input
                      type="number"
                      min="0"
                      max="11"
                      placeholder="Months"
                      value={teachingExpMonths}
                      onChange={(e) => setTeachingExpMonths(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                    />
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-teal-200 space-y-2">
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                    {lang === 'mr' ? 'उद्योग / प्रशासकीय अनुभव' : 'Total Industry / Admin Experience'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      placeholder="Years"
                      value={industryExpYears}
                      onChange={(e) => setIndustryExpYears(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                    />
                    <input
                      type="number"
                      min="0"
                      max="11"
                      placeholder="Months"
                      value={industryExpMonths}
                      onChange={(e) => setIndustryExpMonths(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Experience Rows */}
            {!isFresher ? (
              <div className="space-y-3">
                {experienceList.map((exp, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 relative">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-xs font-bold text-slate-800">
                        {lang === 'mr' ? `अनुभव #${idx + 1}` : `Experience #${idx + 1}`}
                      </span>
                      {experienceList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExperienceRow(idx)}
                          className="text-rose-600 hover:text-rose-800 p-1 rounded-lg text-xs font-bold flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {lang === 'mr' ? 'काढून टाका' : 'Remove'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Institute / Organization Name"
                        value={exp.organization_name}
                        onChange={(e) => {
                          const updated = [...experienceList];
                          updated[idx].organization_name = e.target.value;
                          setExperienceList(updated);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Designation Held"
                        value={exp.designation}
                        onChange={(e) => {
                          const updated = [...experienceList];
                          updated[idx].designation = e.target.value;
                          setExperienceList(updated);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Total Years Exp."
                        value={exp.years_experience}
                        onChange={(e) => {
                          const updated = [...experienceList];
                          updated[idx].years_experience = e.target.value;
                          setExperienceList(updated);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono bg-white"
                      />
                      <input
                        type="number"
                        placeholder="Last Salary (₹/month)"
                        value={exp.previous_salary}
                        onChange={(e) => {
                          const updated = [...experienceList];
                          updated[idx].previous_salary = e.target.value;
                          setExperienceList(updated);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono bg-white"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExperienceRow}
                  className="w-full py-2.5 border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/50 hover:bg-sky-50 text-sky-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> {lang === 'mr' ? '+ आणखी संस्था / पद जोडा' : '+ Add Another Organization / Role'}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center text-xs text-emerald-800 font-semibold">
                {lang === 'mr' ? '✨ फ्रेशर उमेदवार. मागील कामाचा अनुभव नोंदवला जाणार नाही.' : '✨ Fresher candidate profile. No previous work experience will be recorded.'}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {lang === 'mr' ? 'अपेक्षित पगार (₹ दरमहा)' : 'Expected Salary (₹ per month)'}
              </label>
              <input
                type="number"
                placeholder={lang === 'mr' ? 'उदा. ३००००' : 'e.g. 35000'}
                value={salaryExpectation}
                onChange={(e) => setSalaryExpectation(e.target.value)}
                className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm"
              />
            </div>
          </div>

          {/* 6. Resume / CV Attachment (Optional) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  6
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {lang === 'mr' ? '६. बायोडाटा / रेझ्युमे (Resume / CV)' : '6. Resume / Curriculum Vitae'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'mr' ? 'सविस्तर बायोडाटा (PDF किंवा फोटो स्वरूपात जोडा)' : 'Attach detailed resume in PDF or clear image format (Optional)'}
                  </p>
                </div>
              </div>
              <span className="text-[10.5px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                Optional
              </span>
            </div>

            <div className="p-4 bg-purple-50/50 rounded-2xl border-2 border-dashed border-purple-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {resumeFile ? resumeFile.name : (lang === 'mr' ? 'आपला बायोडाटा निवडा' : 'Select your Resume / CV')}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {resumeFile ? `${(resumeFile.size / 1024).toFixed(1)} KB` : 'Accepted formats: PDF, JPG, PNG (Max: 5 MB)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{resumeFile ? 'Replace' : 'Choose File'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {resumeFile && (
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 7. Declaration & Digital Signature */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                7
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {lang === 'mr' ? '७. प्रतिज्ञापत्र व डिजिटल स्वाक्षरी' : '7. Declaration & Digital Signature'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'mr' ? 'मोबाईल स्क्रीनवर बोटाने थेट स्वाक्षरी करा किंवा नाव टाईप करा' : 'Sign directly with finger on mobile screen or type your full legal name'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded text-sky-700 border-slate-300 focus:ring-sky-500 cursor-pointer flex-shrink-0"
                />
                <span className="text-xs text-slate-700 leading-relaxed font-medium">
                  <strong>* Candidate Declaration:</strong> I hereby certify that the information and documents submitted above are true, complete, and correct to the best of my knowledge. I understand that my pre-registration will be finalized and verified upon physical arrival and fee settlement at the Central HR Front Desk.
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Place of Declaration
                </label>
                <input
                  type="text"
                  value={declarationPlace}
                  onChange={(e) => setDeclarationPlace(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="text"
                  readOnly
                  value={new Date().toLocaleDateString('en-GB')}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-slate-100 font-semibold text-slate-700 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Signature Draw / Type */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  * Candidate Signature
                </label>
                <button
                  type="button"
                  onClick={() => setUseTypedSignature(!useTypedSignature)}
                  className="text-[11px] text-sky-700 hover:text-sky-900 font-bold underline"
                >
                  {useTypedSignature ? 'Draw with finger instead' : 'Type Name instead'}
                </button>
              </div>

              {!useTypedSignature ? (
                <div className="space-y-2">
                  <div className="border-2 border-slate-300 rounded-2xl bg-white overflow-hidden relative shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={180}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      style={{ touchAction: 'none' }}
                      className="w-full h-36 bg-slate-50 cursor-crosshair block"
                    />
                    {!signatureData && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs font-medium">
                        ✍️ Draw your signature here using your finger / mouse
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition"
                    >
                      Clear Signature
                    </button>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="Type Full Legal Name"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="w-full px-3.5 py-3 border border-slate-300 rounded-xl text-sm font-serif italic bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* SUBMISSION ACTION WITH FEE NOTE */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600">
              Application Fee: <strong className="text-emerald-700 text-sm font-mono font-bold">₹{applicationFee}</strong>{' '}
              <span className="text-slate-500">(Payable upon physical arrival at Front Desk)</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-sky-800 via-sky-700 to-sky-900 hover:from-sky-900 hover:to-sky-950 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
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
      </main>
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
