'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { Post, StaffCategory, OrganizationSettings, Institute } from '@/types/database';
import { TrustLetterhead } from '@/components/TrustLetterhead';
import { toTitleCase, toSmartTitleCase, toCleanEmail, toCleanPAN } from '@/lib/stringUtils';
import { generateStandardApplicationNumber } from '@/lib/applicationNumberService';
import { setCandidateSession } from '@/lib/candidateSession';
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
  PenTool,
  Image as ImageIcon,
  ArrowLeft,
  Lock,
  Camera,
  Copy,
  Check,
  Sparkles,
  Languages,
  Globe,
  Info,
  Users,
  UserPlus
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

export default function CandidateApplicationForm() {
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [preferredInstituteId, setPreferredInstituteId] = useState<string>('');
  const [programStream, setProgramStream] = useState<string>('Engineering & Technology');
  const [courseName, setCourseName] = useState<string>('');
  const [isCustomCourse, setIsCustomCourse] = useState<boolean>(false);
  const [customCourseName, setCustomCourseName] = useState<string>('');
  const [specialization, setSpecialization] = useState<string>('');
  const [categories, setCategories] = useState<StaffCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAppNo, setSubmittedAppNo] = useState<string | null>(null);
  const [copiedAppNo, setCopiedAppNo] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Front Desk Assisted Entry Detection (?mode=assisted)
  const [isAssistedMode, setIsAssistedMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'assisted') {
        setIsAssistedMode(true);
      }
    }
  }, []);

  // Form Field States
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [cadreFilter, setCadreFilter] = useState<'all' | 'teaching' | 'non_teaching'>('all');
  const [showAllStreams, setShowAllStreams] = useState(false);

  // Personal
  const [salutation, setSalutation] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [villageCity, setVillageCity] = useState('');
  const [taluka, setTaluka] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pinCode, setPinCode] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [emailId, setEmailId] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [isMarried, setIsMarried] = useState<boolean>(false);

  // ── NEW: Section 2 personal profile fields ────────────────────────────────
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [reservationCategory, setReservationCategory] = useState('');
  const [isPwD, setIsPwD] = useState(false);
  const [pwdType, setPwdType] = useState('');
  const [languagesKnown, setLanguagesKnown] = useState<string[]>([]);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyMobile, setEmergencyMobile] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [sameAsResidential, setSameAsResidential] = useState(false);

  useEffect(() => {
    if (sameAsResidential) {
      setPermanentAddress([villageCity, taluka, district, stateName, pinCode].filter(Boolean).join(', '));
    }
  }, [sameAsResidential, villageCity, taluka, district, stateName, pinCode]);

  // ── NEW: Section 5 total experience summary ───────────────────────────────
  const [teachingExpYears, setTeachingExpYears] = useState('');
  const [teachingExpMonths, setTeachingExpMonths] = useState('');
  const [industryExpYears, setIndustryExpYears] = useState('');
  const [industryExpMonths, setIndustryExpMonths] = useState('');

  const [qualificationSummary, setQualificationSummary] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState<string>('');
  const [existingSubmission, setExistingSubmission] = useState<{
    application_no: string;
    candidate_name: string;
    post_title?: string;
    created_at: string;
  } | null>(null);

  // ID Cards
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [panNo, setPanNo] = useState('');

  // Uploaded Files State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Language Selection: English | मराठी
  const [lang, setLang] = useState<'en' | 'mr'>('en');

  // Educational Qualifications List (Includes Below 10th, SSC to Ph.D. / Doctorate)
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

  // Experience Rows
  const [isFresher, setIsFresher] = useState(false);
  const [experienceList, setExperienceList] = useState([
    { organization_name: '', designation: '', years_experience: '', previous_salary: '' },
  ]);

  // Declaration
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [declarationPlace, setDeclarationPlace] = useState('');
  const [signatureData, setSignatureData] = useState<string>('');
  const [useTypedSignature, setUseTypedSignature] = useState(false);
  const [typedSignature, setTypedSignature] = useState('');

  // Canvas ref for signature drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load master data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const { data: orgData } = await supabase
          .from('organization_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        if (orgData) setOrg(orgData);

        const { data: catData } = await supabase.from('staff_categories').select('*').eq('is_active', true);
        if (catData) setCategories(catData);

        const { data: postData } = await supabase.from('posts').select('*, staff_categories(*)').eq('is_active', true);
        if (postData) setPosts(postData);

        const { data: instData } = await supabase
          .from('institutes')
          .select('*, institute_courses(*)')
          .eq('is_active', true)
          .order('official_name', { ascending: true });
        if (instData) setInstitutes(instData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Calculate age automatically when DOB changes
  const handleDobChange = (val: string) => {
    setDob(val);
    if (!val) {
      setAge('');
      return;
    }
    const birthDate = new Date(val);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    setAge(calculatedAge >= 0 ? calculatedAge : '');
  };

  // Check for previous submissions by contact number or email
  useEffect(() => {
    let active = true;
    const cleanMobile = contactNo.trim();
    const cleanMail = emailId.trim().toLowerCase();

    if (cleanMobile.length === 10 || (cleanMail.includes('@') && cleanMail.length > 5)) {
      const checkPrev = async () => {
        try {
          let query = supabase
            .from('applications')
            .select('application_no, candidate_name, custom_post_title, created_at, posts(title)');

          if (cleanMobile.length === 10 && cleanMail.includes('@')) {
            query = query.or(`contact_no.eq.${cleanMobile},email_id.eq.${cleanMail}`);
          } else if (cleanMobile.length === 10) {
            query = query.eq('contact_no', cleanMobile);
          } else {
            query = query.eq('email_id', cleanMail);
          }

          const { data } = await query
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (active && data) {
            setExistingSubmission({
              application_no: data.application_no,
              candidate_name: data.candidate_name,
              post_title: (data.posts as any)?.title || data.custom_post_title || 'Post',
              created_at: data.created_at,
            });
          } else if (active) {
            setExistingSubmission(null);
          }
        } catch {
          // Non-blocking
        }
      };
      checkPrev();
    } else {
      setExistingSubmission(null);
    }

    return () => {
      active = false;
    };
  }, [contactNo, emailId]);

  // Photo change handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Photo size exceeds 5MB limit.');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Experience handlers
  const addExperienceRow = () => {
    setExperienceList([...experienceList, { organization_name: '', designation: '', years_experience: '', previous_salary: '' }]);
  };

  const removeExperienceRow = (idx: number) => {
    setExperienceList(experienceList.filter((_, i) => i !== idx));
  };

  // Canvas Signature Drawing (Optimized for Mobile Touch)
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if ('touches' in e) {
      e.preventDefault(); // Prevent mobile screen scrolling while signing
    }
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL());
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

  const uploadToStorage = async (bucket: string, file: File, prefix: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) {
      console.warn(`Storage upload error for ${bucket}:`, error.message);
      return '';
    }
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicData?.publicUrl || fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!salutation) {
      alert(lang === 'mr' ? 'कृपया उचित संबोधन (Salutation) निवडा.' : 'Please select a salutation (Mr./Mrs./Ms./Dr./etc.) before submitting.');
      return;
    }
    if (!candidateName.trim()) {
      alert(lang === 'mr' ? 'कृपया आधार कार्डानुसार आपले संपूर्ण नाव प्रविष्ट करा.' : 'Please enter your full name as per Aadhaar.');
      return;
    }
    if (!gender) {
      alert(lang === 'mr' ? 'कृपया आपले लिंग निवडा (Gender required).' : 'Please select your Gender.');
      return;
    }
    if (!contactNo || !/^\d{10}$/.test(contactNo.trim())) {
      alert(lang === 'mr' ? 'कृपया वैध १० अंकी मोबाईल नंबर प्रविष्ट करा.' : 'Please enter a valid 10-digit mobile contact number.');
      return;
    }
    if (!aadhaarNo || !/^\d{12}$/.test(aadhaarNo.replace(/\s+/g, ''))) {
      alert(lang === 'mr' ? 'कृपया वैध १२ अंकी आधार कार्ड नंबर प्रविष्ट करा.' : 'Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (resumeFile && resumeFile.size > 5 * 1024 * 1024) {
      alert(lang === 'mr' ? 'बायोडाटा फाईल ५ MB पेक्षा कमी असणे आवश्यक आहे.' : 'Resume file size must be less than 5 MB.');
      return;
    }
    if (!declarationAccepted) {
      alert(lang === 'mr' ? 'कृपया अर्ज सादर करण्यापूर्वी प्रतिज्ञापत्रास सहमती द्या.' : 'Please agree to the candidate declaration before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Generate Standardized Unique Application Number (YYYY-MMM-Sequence e.g. 2026-OCT-00001)
      const generatedAppNo = await generateStandardApplicationNumber();

      let uploadedPhotoUrl = '';
      let uploadedAadhaarDocUrl = '';
      let uploadedPanDocUrl = '';
      let uploadedResumeDocUrl = '';

      if (photoFile) {
        uploadedPhotoUrl = await uploadToStorage('candidate-photos', photoFile, 'photo');
      }
      if (aadhaarFile) {
        uploadedAadhaarDocUrl = await uploadToStorage('candidate-documents', aadhaarFile, 'aadhaar');
      }
      if (panFile) {
        uploadedPanDocUrl = await uploadToStorage('candidate-documents', panFile, 'pan');
      }
      if (resumeFile) {
        uploadedResumeDocUrl = await uploadToStorage('candidate-resumes', resumeFile, `${generatedAppNo}_resume`);
      }

      const cleanAadhaar = aadhaarNo.replace(/\s+/g, '');
      const maskedAadhaar = `XXXX-XXXX-${cleanAadhaar.slice(-4)}`;
      const cleanPan = toCleanPAN(panNo);
      const maskedPan = cleanPan.length === 10 ? `${cleanPan.slice(0, 2)}XXX${cleanPan.slice(5, 9)}X` : cleanPan;

      // Validate that the selected post exists in the master list (frontend guard)
      const foundPost = posts.find((p) => p.id === selectedPostId);
      if (!foundPost) {
        alert(lang === 'mr'
          ? 'कृपया Central HR द्वारे मंजूर पदांच्या यादीतून एक पद निवडा.'
          : 'Please select a designation from the approved Central HR master list.');
        setSubmitting(false);
        return;
      }

      const resolvedCategoryId = foundPost.category_id || '';

      const finalCourseName = isCustomCourse ? toSmartTitleCase(customCourseName) : toSmartTitleCase(courseName);

      const appInsertPayload: Record<string, any> = {
          application_no: generatedAppNo,
          post_id: selectedPostId,
          custom_post_title: null, // always null — custom titles are not permitted
          category_id: resolvedCategoryId || null,
          program_stream: programStream || 'Engineering & Technology',
          course_name: finalCourseName || null,
          specialization: toSmartTitleCase(specialization) || null,
          preferred_institute_id: preferredInstituteId || null,
          candidate_name: salutation ? `${salutation} ${toTitleCase(candidateName)}` : toTitleCase(candidateName),
          photo_url: uploadedPhotoUrl,
          address: [villageCity, taluka && `Taluka ${taluka}`, district && `District ${district}`, stateName, pinCode && `PIN ${pinCode}`]
            .filter(Boolean).map((part) => toTitleCase(part as string)).join(', '),
          village_city: toTitleCase(villageCity),
          taluka: toTitleCase(taluka),
          district: toTitleCase(district),
          state: toTitleCase(stateName),
          pin_code: pinCode.trim(),
          contact_no: contactNo.trim(),
          email_id: toCleanEmail(emailId) || null,
          dob: dob || null,
          age: typeof age === 'number' ? age : null,
          is_married: isMarried,
          // ── NEW personal profile fields ──────────────────────────────────
          gender: gender || null,
          blood_group: bloodGroup || null,
          reservation_category: reservationCategory || null,
          is_pwd: isPwD,
          pwd_type: isPwD ? pwdType.trim() || null : null,
          languages_known: languagesKnown.length > 0 ? languagesKnown : null,
          emergency_contact_name: toTitleCase(emergencyName) || null,
          emergency_contact_relation: toTitleCase(emergencyRelation) || null,
          emergency_contact_mobile: emergencyMobile || null,
          permanent_address: toTitleCase(permanentAddress) || null,
          // ── NEW experience summary fields ────────────────────────────────
          total_teaching_exp_years: teachingExpYears ? parseFloat(teachingExpYears) : null,
          total_teaching_exp_months: teachingExpMonths ? parseInt(teachingExpMonths, 10) : null,
          total_industry_exp_years: industryExpYears ? parseFloat(industryExpYears) : null,
          total_industry_exp_months: industryExpMonths ? parseInt(industryExpMonths, 10) : null,
          aadhaar_masked: maskedAadhaar,
          aadhaar_full: cleanAadhaar,
          aadhaar_doc_url: uploadedAadhaarDocUrl,
          pan_masked: maskedPan,
          pan_full: cleanPan,
          pan_doc_url: uploadedPanDocUrl,
          resume_url: uploadedResumeDocUrl || null,
          qualification_summary: toSmartTitleCase(qualificationSummary),
          salary_expectation: salaryExpectation ? parseFloat(salaryExpectation) : null,
          declaration_accepted: true,
          signature_url: useTypedSignature ? `typed:${toTitleCase(typedSignature)}` : signatureData,
          declaration_place: toTitleCase(declarationPlace) || 'Ambap',
          declaration_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          submission_channel: isAssistedMode ? 'frontdesk_assisted' : 'qr_self',
        };
      let newApp: any = null;
      const { data: insertedApp, error: appError } = await supabase
        .from('applications')
        .insert(appInsertPayload)
        .select()
        .single();

      if (appError) {
        if (appError.message.includes('village_city') || appError.message.includes('taluka') || appError.message.includes('district') || appError.message.includes('state') || appError.message.includes('pin_code')) {
          delete appInsertPayload.village_city;
          delete appInsertPayload.taluka;
          delete appInsertPayload.district;
          delete appInsertPayload.state;
          delete appInsertPayload.pin_code;
          const { data: retryApp, error: retryError } = await supabase
            .from('applications')
            .insert(appInsertPayload)
            .select()
            .single();
          if (retryError) throw retryError;
          newApp = retryApp;
        } else {
          throw appError;
        }
      } else {
        newApp = insertedApp;
      }

      if (!newApp) throw new Error('Application could not be created');

      const applicationId = newApp.id;

      // Insert education rows (including Below 10th, School/Board/University, Passing Year, Ph.D. and NET/SET)
      for (const edu of educationList) {
        const isFilled =
          Boolean(edu.percentage) ||
          Boolean(edu.cgpa) ||
          Boolean(edu.file) ||
          Boolean(edu.board_university?.trim()) ||
          Boolean(edu.passing_year?.trim()) ||
          (Boolean(edu.degree_name?.trim()) && !['SSC', 'HSC'].includes(edu.degree_name.trim()));

        if (isFilled) {
          let eduDocUrl = '';
          if (edu.file) {
            eduDocUrl = await uploadToStorage('candidate-documents', edu.file, `edu_${edu.level.replace(/[^a-zA-Z0-9]/g, '_')}`);
          }
          const eduPayload: Record<string, any> = {
            application_id: applicationId,
            level: edu.level,
            degree_name: toSmartTitleCase(edu.degree_name) || (edu.level.includes('Below 10th') ? 'Non-Matric / Below 10th' : edu.level.includes('S.S.C') ? 'SSC' : edu.level.includes('H.S.C') ? 'HSC' : edu.level),
            board_university: toSmartTitleCase(edu.board_university) || null,
            passing_year: edu.passing_year?.trim() || null,
            status_remark: edu.status_remark || null,
            percentage: edu.marking_system === 'percentage' && edu.percentage ? parseFloat(edu.percentage) : (edu.cgpa ? parseFloat(edu.cgpa) * 10 : null),
            marking_system: edu.marking_system,
            cgpa: edu.marking_system === 'cgpa' && edu.cgpa ? parseFloat(edu.cgpa) : null,
            cgpa_scale: edu.marking_system === 'cgpa' && edu.cgpa_scale ? parseFloat(edu.cgpa_scale) : null,
            doc_url: eduDocUrl || null,
          };
          const { error: eduErr } = await supabase.from('application_education').insert(eduPayload);
          if (eduErr && (eduErr.message.includes('marking_system') || eduErr.message.includes('cgpa'))) {
            delete eduPayload.marking_system;
            delete eduPayload.cgpa;
            delete eduPayload.cgpa_scale;
            await supabase.from('application_education').insert(eduPayload);
          }
        }
      }

      // Insert experience rows
      if (!isFresher && experienceList.length > 0) {
        for (const exp of experienceList) {
          if (exp.organization_name.trim() || exp.designation.trim()) {
            await supabase.from('application_experience').insert({
              application_id: applicationId,
              is_fresher: false,
              organization_name: toSmartTitleCase(exp.organization_name),
              designation: toTitleCase(exp.designation),
              years_experience: exp.years_experience ? parseFloat(exp.years_experience) : null,
              previous_salary: exp.previous_salary ? parseFloat(exp.previous_salary) : null,
            });
          }
        }
      } else {
        await supabase.from('application_experience').insert({
          application_id: applicationId,
          is_fresher: true,
        });
      }

      // Persist a tab-scoped candidate session so /upload and /download
      // can verify ownership without requiring a full login.
      setCandidateSession(generatedAppNo, newApp.id, contactNo.trim());
      setSubmittedAppNo(generatedAppNo);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit application. Please check entries.');
    } finally {
      setSubmitting(false);
    }
  };

  // Copy Application No on Mobile Success Screen
  const handleCopyAppNo = () => {
    if (!submittedAppNo) return;
    navigator.clipboard.writeText(submittedAppNo);
    setCopiedAppNo(true);
    setTimeout(() => setCopiedAppNo(false), 2000);
  };

  // SUCCESS SCREEN (Optimized for Mobile QR Scan Walk-in Candidates)
  if (submittedAppNo) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {lang === 'mr' ? 'अर्ज ड्राफ्ट जतन झाला!' : 'Application Draft Saved!'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {org?.name || 'Central HR Department'}
            </p>
          </div>

          {/* Big Mobile Reference Box */}
          <div className="p-4 sm:p-5 bg-sky-50 border-2 border-sky-300 rounded-2xl space-y-2 relative">
            <span className="text-[10.5px] font-bold text-sky-800 uppercase tracking-widest block">
              {lang === 'mr' ? 'आपला अर्ज क्रमांक' : 'Your Application Number'}
            </span>
            <p className="text-2xl sm:text-3xl font-black tracking-wider text-sky-950 font-mono select-all">
              {submittedAppNo}
            </p>

            {/* Scannable Verification QR for Front Desk */}
            <div className="flex flex-col items-center justify-center pt-2">
              <div className="p-3 bg-white border-2 border-sky-400 rounded-2xl shadow-sm inline-block">
                <QRCodeSVG
                  value={submittedAppNo}
                  size={140}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <span className="text-[10.5px] text-sky-900 font-bold mt-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-sky-700" /> {lang === 'mr' ? 'हा क्यूआर कोड फ्रंट डेस्कवर दाखवा' : 'Show this QR code at the Front Desk'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyAppNo}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-lg text-xs font-bold transition shadow-sm"
            >
              {copiedAppNo ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAppNo ? (lang === 'mr' ? 'कॉपी झाले!' : 'Copied to Clipboard!') : (lang === 'mr' ? 'अर्ज क्रमांक कॉपी करा' : 'Copy Application No')}
            </button>
          </div>

          {/* Draft state notice */}
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-left">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-900">
                {lang === 'mr' ? 'अर्ज ड्राफ्ट म्हणून जतन आहे — अंतिम सादरीकरण आवश्यक आहे' : 'Draft Saved — Final Submission Required'}
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                {lang === 'mr'
                  ? 'खालील बटणावर क्लिक करा, कागदपत्रे अपलोड करा, आणि "Verify & Submit Application" बटणावर क्लिक करून अर्ज अंतिम करा. अंतिम सादरीकरणानंतर अर्ज बंद होईल.'
                  : 'Click the button below, upload your certificates, then click "Verify & Submit Application" to finalize. The form will be locked after final submission.'}
              </p>
            </div>
          </div>

          <div className="text-left bg-slate-50 p-4 rounded-2xl text-xs text-slate-700 space-y-2 border border-slate-200">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> {lang === 'mr' ? 'पुढील आवश्यक पायऱ्या:' : 'Next Steps:'}
            </p>
            <p className="flex items-start gap-1.5">
              <span className="font-bold text-sky-700">1.</span> {lang === 'mr' ? 'या स्क्रीनचा स्क्रीनशॉट किंवा अर्ज क्रमांक जतन करून ठेवा.' : 'Save a screenshot of this screen or note your Application Number.'}
            </p>
            <p className="flex items-start gap-1.5">
              <span className="font-bold text-sky-700">2.</span> {lang === 'mr' ? <><strong>"दस्तऐवज अपलोड करा"</strong> वर क्लिक करून सर्व प्रमाणपत्रे अपलोड करा.</> : <>Click <strong>"Upload Documents &amp; Submit"</strong> to upload all required certificates.</>}
            </p>
            <p className="flex items-start gap-1.5">
              <span className="font-bold text-sky-700">3.</span> {lang === 'mr' ? <><strong>"Verify &amp; Submit Application"</strong> बटणावर क्लिक करून अर्ज अंतिम रूपाने सादर करा.</> : <>Click <strong>"Verify &amp; Submit Application"</strong> to lock and formally submit your application.</>}
            </p>
            <p className="flex items-start gap-1.5">
              <span className="font-bold text-sky-700">4.</span> {lang === 'mr' ? <><strong>फ्रंट डेस्क काउंन्टरवर</strong> जाऊन आपला अर्ज क्रमांक सांगा व पावती मिळवा.</> : <>Go to the <strong>Front Desk Counter</strong> with original documents and quote your Application Number.</>}
            </p>
          </div>

          {/* Single CTA — Upload & Submit (Download is restricted to admin roles) */}
          <Link
            href="/apply/upload"
            className="flex items-center justify-center gap-2.5 py-4 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-sm font-black uppercase tracking-wider transition shadow-lg active:scale-[0.98]"
          >
            <Upload className="w-5 h-5" />
            {lang === 'mr' ? 'दस्तऐवज अपलोड करा व अर्ज सादर करा' : 'Upload Documents & Submit Application'}
          </Link>

          <Link
            href="/"
            className="block w-full py-3.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition shadow active:scale-[0.99]"
          >
            {lang === 'mr' ? 'पूर्ण / मुख्यपृष्ठावर परत जा' : 'Done / Return to Portal'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-20 font-sans">
      {/* Sleek Mobile-Friendly Top Bar with Language Switcher */}
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
                lang === 'en'
                  ? 'bg-sky-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang('mr')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                lang === 'mr'
                  ? 'bg-sky-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              मराठी
            </button>
          </div>

          <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider bg-sky-50 px-3 py-1 rounded-full border border-sky-200 hidden sm:flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-sky-600" /> {lang === 'mr' ? 'उमेदवार स्वयं नोंदणी' : 'Self Registration'}
          </span>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6">
        {/* Compact Responsive Branding Banner */}
        <div className="mb-4 sm:mb-6">
          <TrustLetterhead 
            org={org} 
            variant="standard" 
            titleBadge={lang === 'mr' ? 'उमेदवार स्वयं नोंदणी अर्ज (रजिस्ट्रेशन)' : 'CANDIDATE SELF REGISTRATION FORM'} 
          />
        </div>

        {/* Front Desk Assisted Mode Banner */}
        {isAssistedMode && (
          <div className="mb-4 sm:mb-6 p-4 bg-gradient-to-r from-sky-900 via-blue-900 to-indigo-950 text-white rounded-2xl sm:rounded-3xl flex items-center justify-between border border-sky-600/40 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-300 flex items-center justify-center font-bold flex-shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black tracking-wide uppercase flex items-center gap-2">
                  <span>Front Desk Assisted Entry Mode</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/30 border border-sky-400 text-sky-200">
                    Assisted
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-sky-200 font-medium mt-0.5">
                  Reception desk is logging walk-in candidate details directly into the ERP.
                </p>
              </div>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            {submitError}
          </div>
        )}

        {/* ── SUBMISSION LOCK GATE ─────────────────────────────────────────────
            Once a candidate has already submitted a form (detected by phone/email),
            show a hard lock screen. Editing and re-submission are not permitted.
        ─────────────────────────────────────────────────────────────────────── */}
        {existingSubmission && (
          <div className="mb-6 rounded-3xl overflow-hidden border-2 border-amber-300 shadow-xl">
            {/* Lock Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border-b border-amber-200">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0 border border-amber-300">
                <Lock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-900 tracking-tight">
                  {lang === 'mr' ? 'अर्ज आधीच सादर केला आहे — लॉक' : 'Application Already Submitted — Locked'}
                </h3>
                <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                  {lang === 'mr'
                    ? 'आपण या मोबाईल/ईमेलद्वारे आधीच अर्ज सादर केला आहे. अर्ज संपादन किंवा पुन्हा सादर करणे शक्य नाही.'
                    : 'Your mobile number or email is already registered. Applications cannot be edited or re-submitted once filed.'}
                </p>
              </div>
            </div>

            {/* Existing Submission Details */}
            <div className="px-5 py-5 bg-white space-y-4">
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-center space-y-1.5">
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-widest block">
                  {lang === 'mr' ? 'आपला नोंदणी क्रमांक' : 'Your Registered Application No.'}
                </span>
                <p className="text-2xl font-black font-mono text-sky-950 tracking-wider select-all">
                  {existingSubmission.application_no}
                </p>
                <p className="text-xs text-slate-600 font-semibold">
                  {existingSubmission.candidate_name} &nbsp;·&nbsp; {existingSubmission.post_title}
                </p>
                <p className="text-[10.5px] text-slate-500">
                  {lang === 'mr' ? 'सादर केले:' : 'Filed on:'}{' '}
                  {new Date(existingSubmission.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>
                  {lang === 'mr'
                    ? 'कोणत्याही दुरुस्तीसाठी कृपया थेट Central HR Front Desk काउंटरशी संपर्क करा.'
                    : 'For any corrections, please contact the Central HR Front Desk Counter directly with your original documents.'}
                </span>
              </div>

              <Link
                href="/apply/upload"
                className="flex items-center justify-center gap-1.5 py-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-[11px] font-bold uppercase tracking-wide transition w-full"
              >
                <Upload className="w-4 h-4 text-teal-600" />
                {lang === 'mr' ? 'दस्तऐवज अपलोड करा व अर्ज सादर करा' : 'Upload Docs & Submit Application'}
              </Link>

              <Link
                href="/"
                className="block w-full py-3 text-center bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition"
              >
                {lang === 'mr' ? 'मुख्यपृष्ठावर परत जा' : 'Return to Portal Home'}
              </Link>
            </div>
          </div>
        )}

        {/* Application Form — hidden when a prior submission exists */}
        <form onSubmit={handleSubmit} className={`space-y-4 sm:space-y-6 ${existingSubmission ? 'pointer-events-none opacity-30 select-none' : ''}`}>

          {/* 1. Job Designation & Academic Program */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {lang === 'mr' ? '१. पदाचे नाव, संवर्ग व विद्याशाखा' : 'Job Designation, Cadre & Academic Stream'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'mr' ? 'आपण अर्ज करत असलेले पद, संस्था व विद्याशाखा निवडा' : 'Select your desired role, preferred institute, and academic stream'}
                </p>
              </div>
            </div>

            {/* Cadre Filter Pills & Institute Context */}
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
                    // If institute has courses, set first stream
                    if (newInstId) {
                      const selInst = institutes.find((i) => i.id === newInstId);
                      if (selInst && selInst.institute_courses && selInst.institute_courses.length > 0) {
                        const firstStream = selInst.institute_courses[0].program_stream;
                        if (firstStream) {
                          setProgramStream(firstStream);
                        }
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

              {/* Informative helper when institute is selected */}
              {(() => {
                const selInst = institutes.find((i) => i.id === preferredInstituteId);
                const instStreams = selInst?.institute_courses
                  ? Array.from(new Set(selInst.institute_courses.map((c) => c.program_stream).filter(Boolean)))
                  : [];

                if (!selInst || instStreams.length === 0) return null;

                return (
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-900 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-purple-600" />
                        <span>{lang === 'mr' ? 'संस्थेतील सक्रिय विद्याशाखा:' : 'Active Programs run by selected institute:'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAllStreams(!showAllStreams)}
                        className="text-[11px] text-purple-700 underline font-bold hover:text-purple-900"
                      >
                        {showAllStreams
                          ? (lang === 'mr' ? 'फक्त या संस्थेचे पद दाखवा' : 'Filter by this institute')
                          : (lang === 'mr' ? 'संस्थेबाहेरील इतर पदेही दाखवा' : 'Show all Sanstha posts')}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {instStreams.map((st) => (
                        <span key={st} className="px-2 py-0.5 rounded-md bg-white border border-purple-200 text-purple-800 text-[10.5px] font-semibold">
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Select Job Designation / Role */}
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

                  {/* Render Groups based on Cadre */}
                  {(() => {
                    const selInst = institutes.find((i) => i.id === preferredInstituteId);
                    const instStreams = selInst?.institute_courses
                      ? Array.from(new Set(selInst.institute_courses.map((c) => c.program_stream).filter(Boolean)))
                      : [];

                    // Separate Non-Teaching posts (Central Common Pool)
                    const nonTeachingPosts = posts.filter((p) => {
                      const catName = p.staff_categories?.name?.toLowerCase() || '';
                      return catName.includes('non') || catName.includes('house');
                    });

                    // Teaching posts
                    const teachingPosts = posts.filter((p) => {
                      const catName = p.staff_categories?.name?.toLowerCase() || '';
                      return catName.includes('teach') && !catName.includes('non');
                    });

                    // Filter teaching posts by institute streams if applied
                    const filteredTeachingPosts = teachingPosts.filter((p) => {
                      if (!preferredInstituteId || showAllStreams || instStreams.length === 0) return true;
                      const pStream = p.program_stream;
                      if (!pStream || pStream === 'All Programs / General') return true;
                      return instStreams.includes(pStream);
                    });

                    // Group teaching posts by program_stream
                    const groupedTeaching = filteredTeachingPosts.reduce((acc, post) => {
                      const streamKey = post.program_stream || 'General Academic Faculty';
                      if (!acc[streamKey]) acc[streamKey] = [];
                      acc[streamKey].push(post);
                      return acc;
                    }, {} as Record<string, Post[]>);

                    return (
                      <>
                        {/* 1. Central Common Pool for Non-Teaching (Always visible or when non-teaching filter active) */}
                        {cadreFilter !== 'teaching' && nonTeachingPosts.length > 0 && (
                          <optgroup
                            label={
                              lang === 'mr'
                                ? '🏛️ मध्यवर्ती सामाईक संवर्ग — शिक्षकेतर व प्रशासकीय पदे (सर्व संस्थांसाठी)'
                                : '🏛️ Central Common Pool — Non-Teaching & Administrative (Shared across Sanstha)'
                            }
                          >
                            {nonTeachingPosts.map((post) => (
                              <option key={post.id} value={post.id}>
                                {post.title} — [🏛️ Central Common Pool]
                              </option>
                            ))}
                          </optgroup>
                        )}

                        {/* 2. Program-Wise Teaching Posts */}
                        {cadreFilter !== 'non_teaching' &&
                          Object.entries(groupedTeaching).map(([streamKey, streamPosts]) => (
                            <optgroup
                              key={streamKey}
                              label={`🎓 ${lang === 'mr' ? 'शैक्षणिक पदे — ' : 'Teaching Faculty — '}${streamKey}`}
                            >
                              {streamPosts.map((post) => (
                                <option key={post.id} value={post.id}>
                                  {post.title} — [{post.staff_categories?.name || 'Teaching'}] • ({streamKey})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                      </>
                    );
                  })()}

                </select>
              </div>

              {/* Approved List Info Notice */}
              <div className="flex items-start gap-2 p-3 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-sky-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
                <span>
                  {lang === 'mr'
                    ? 'वरील यादी Central HR विभागाने मंजूर केलेली अधिकृत पदे दर्शवते. सूचीत नसलेल्या पदासाठी Front Desk काउंटरशी संपर्क करा.'
                    : 'The list above shows only officially approved designations managed by Central HR. If your desired role is not listed, please contact the Front Desk counter for assistance.'}
                </span>
              </div>

              {/* Callout Notice for Selected Post Type */}
              {(() => {
                if (!selectedPostId) return null;
                const selPost = posts.find((p) => p.id === selectedPostId);
                if (!selPost) return null;

                const isNonTeach =
                  selPost.staff_categories?.name?.toLowerCase().includes('non') ||
                  selPost.staff_categories?.name?.toLowerCase().includes('house');

                if (isNonTeach) {
                  return (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 flex items-start gap-2.5 animate-in fade-in duration-150">
                      <Users className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-teal-950 block">
                          {lang === 'mr'
                            ? '🏛️ मध्यवर्ती सामाईक संवर्ग पद (Central Common Pool):'
                            : '🏛️ Central Common Pool Position:'}
                        </span>
                        <p className="text-[11px] text-teal-800 leading-relaxed">
                          {lang === 'mr'
                            ? 'हे पद संस्थेच्या मध्यवर्ती सामाईक संवर्गातून (Common Pool) भरले जाते. शिक्षकेतर कर्मचाऱ्यांची नेमणूक गरजेनुसार मंडळाच्या कोणत्याही महाविद्यालयात किंवा विभागात केली जाऊ शकते.'
                            : 'Non-teaching and administrative positions belong to the Sanstha Central Common Pool. Staff members are shared and may be deployed across any institution or department within the Trust/Mandal.'}
                        </p>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 flex items-start gap-2.5 animate-in fade-in duration-150">
                      <GraduationCap className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-purple-950 block">
                          {lang === 'mr'
                            ? '🎓 शैक्षणिक संवर्ग पद (Program-Wise Posting):'
                            : '🎓 Academic Teaching Cadre Position:'}
                        </span>
                        <p className="text-[11px] text-purple-800 leading-relaxed">
                          {lang === 'mr'
                            ? 'हे पद संबंधित महाविद्यालयातील अभ्यासक्रम व विद्याशाखेनुसार (Program-Wise) भरले जाते. खालील विद्याशाखा व अभ्यासक्रम योग्यरीत्या निवडा.'
                            : 'This teaching position is mapped program-wise to the specific academic stream and course intake approved by the Apex Body (AICTE/UGC/PCI/MSBTE).'}
                        </p>
                      </div>
                    </div>
                  );
                }
              })()}

            </div>

            {/* Academic Program Discipline Stream, Course Name & Specialization */}
            {(() => {
              const instCoursesForStream: string[] = [];
              institutes.forEach((inst) => {
                inst.institute_courses?.forEach((c) => {
                  if (!c.program_stream || c.program_stream === programStream) {
                    if (c.course_name && !instCoursesForStream.includes(c.course_name)) {
                      instCoursesForStream.push(c.course_name);
                    }
                  }
                });
              });

              const defaultList = defaultStreamCourses[programStream] || [];
              const combinedCourses = Array.from(new Set([...instCoursesForStream, ...defaultList]));

              return (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Discipline / Program Stream */}
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

                    {/* 2. Course / Degree Name */}
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
                        {combinedCourses.map((cName) => (
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
              );
            })()}
          </div>

          {/* 2. Personal & Contact Information */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {lang === 'mr' ? '२. वैयक्तिक व संपर्क माहिती' : 'Personal & Contact Details'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'mr' ? 'आधार कार्डानुसार आपली वैयक्तिक माहिती भरा' : 'Provide your verified identity information'}
                </p>
              </div>
            </div>

            {/* Mobile-Friendly Passport Photo Box */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-20 h-24 rounded-xl bg-white border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm relative">
                {photoPreview ? (
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
                  {lang === 'mr' ? 'सेल्फी घ्या किंवा स्पष्ट फोटो अपलोड करा' : 'Take a selfie or upload a clear passport photo'}
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
              {/* Salutation */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? '* संबोधन / उपाधी' : '* Salutation / Title'}
                </label>
                <select
                  required
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                  className={`w-full px-3.5 py-2.5 sm:py-3 border rounded-xl text-xs sm:text-sm font-semibold bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition shadow-sm ${
                    !salutation ? 'border-slate-300 text-slate-400' : 'border-sky-400 text-slate-900'
                  }`}
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

              {/* Full Name */}
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
                {salutation && candidateName && (
                  <p className="text-[10px] text-sky-700 font-semibold mt-1 pl-0.5">
                    {lang === 'mr' ? 'अधिकृत नाव:' : 'Official name:'}{' '}
                    <span className="font-black">{salutation} {candidateName}</span>
                  </p>
                )}
              </div>
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
                  {lang === 'mr' ? 'ईमेल पत्ता (पर्यायी)' : 'Email Address'}
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

            {/* Existing Application Notice Callout */}
            {existingSubmission && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  {lang === 'mr' ? (
                    <span>
                      <strong>सूचना:</strong> या संपर्क माहितीसह यापूर्वी एक अर्ज (<strong>{existingSubmission.application_no}</strong> - {existingSubmission.post_title}) प्रणालीमध्ये नोंदवला गेला आहे. आपण दुसऱ्या पदासाठी अर्ज करत असल्यास हा फॉर्म सादर करू शकता. आधीच अर्ज केला असल्यास फ्रंट डेस्कवर आपला विद्यमान अर्ज क्रमांक दाखवा.
                    </span>
                  ) : (
                    <span>
                      <strong>Notice:</strong> An application is already on record under this contact ({existingSubmission.application_no} for <em>{existingSubmission.post_title}</em>). If you are applying for an additional post, you may proceed.
                    </span>
                  )}
                </div>
              </div>
            )}

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

            {/* ── NEW: Gender / लिंग ──────────────────────────────────────────── */}
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

            {/* ── NEW: Blood Group + Reservation Category ──────────────────── */}
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
                  <option value="">{lang === 'mr' ? '-- प्रवर्ग निवडा --' : '-- Select Category --'}</option>
                  {['General (Open)', 'SC', 'ST', 'VJ/DT(A)', 'NT(B)', 'NT(C)', 'NT(D)', 'OBC', 'SBC', 'SEBC', 'EWS'].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── NEW: PwD / Differently Abled Status ─────────────────────── */}
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
                    placeholder={
                      lang === 'mr'
                        ? 'उदा. अस्थिव्यंग ४०% / दृष्टिदोष ७०% / श्रवणदोष ५०%'
                        : 'e.g. Locomotor Disability 40% / Visual Impairment 70%'
                    }
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

            {/* ── NEW: Languages Known / भाषा ज्ञान ──────────────────────── */}
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

            {/* ── NEW: Permanent Address (with Same-as-Residential toggle) ── */}
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
                placeholder={
                  lang === 'mr'
                    ? 'गाव/शहर, तालुका, जिल्हा, राज्य आणि पिन कोड'
                    : 'Village/City, Taluka, District, State with PIN Code'
                }
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

            {/* ── NEW: Emergency Contact Details ───────────────────────────── */}
            <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
                  🚨 {lang === 'mr' ? 'आपत्कालीन संपर्क (Emergency Contact)' : 'Emergency Contact Details'}
                </span>
              </div>
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
                  {lang === 'mr' ? '३. आधार व पॅन ओळख' : 'Aadhaar & PAN Identification'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'mr' ? 'कागदपत्र पडताळणीसाठी सुरक्षितपणे साठवले जाते' : 'Stored safely for HR verification'}
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
                    {lang === 'mr' ? '* पॅन कार्ड नंबर (१० अक्षरे/अंक)' : '* PAN Card Number (10 Characters)'}
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

          {/* 4. Educational Qualifications (Mobile Adaptive Cards + Desktop Table) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {lang === 'mr' ? 'शैक्षणिक पात्रता' : 'Educational Qualifications'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'mr' ? 'आपली शैक्षणिक माहिती भरा (१०वी पेक्षा कमी ते Ph.D. पर्यंत)' : 'Fill your degrees (Below 10th / SSC to Ph.D. / Doctorate)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Below 10th / Non-matric helpful guidance callout */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <span className="text-base leading-none">💡</span>
              <div className="leading-relaxed">
                {lang === 'mr' ? (
                  <span>
                    <strong>१०वी पेक्षा कमी शिक्षण असल्यास:</strong> उमेदवार (उदा. ४थी, ७वी, ८वी, ९वी पास) पहिली ओळ <em>"Below 10th / SSC (१०वी पेक्षा कमी)"</em> भरू शकतात व पुढील १०वी चा रकाना रिकामा ठेवू शकतात.
                  </span>
                ) : (
                  <span>
                    <strong>Candidates with less than 10th qualification:</strong> Applicants (e.g. 4th, 7th, 8th, 9th pass) can fill the first row <em>"Below 10th / SSC"</em> and leave the 10th/SSC row blank.
                  </span>
                )}
              </div>
            </div>

            {/* A. MOBILE VIEW: Touch-friendly cards for each exam */}
            <div className="block md:hidden space-y-3.5">
              {educationList.map((edu, idx) => {
                const isBelow10th = edu.level.includes('Below 10th');
                const isPhd = edu.level.includes('Ph.D');
                const isNetSet = edu.level.includes('NET');
                const isUgPg = edu.level.includes('Graduation (UG)') || edu.level.includes('Post Graduation (PG)');

                return (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-xs text-slate-900">{edu.level}</span>
                      {edu.percentage && !isPhd && !isNetSet && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {edu.percentage}%
                        </span>
                      )}
                      {(isPhd || isNetSet) && edu.status_remark && (
                        <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                          {edu.status_remark}
                        </span>
                      )}
                    </div>

                    {/* Degree / Branch + Status or % */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                          {isBelow10th
                            ? (lang === 'mr' ? 'इयत्ता / वर्ग (उदा. ७वी / ८वी पास)' : 'Class / Standard (e.g. 7th / 8th Pass)')
                            : isPhd
                            ? (lang === 'mr' ? 'विषय / संशोधन शाखा' : 'Ph.D. Topic / Discipline')
                            : isNetSet
                            ? (lang === 'mr' ? 'परीक्षेचे नाव (उदा. NET / SET / GATE)' : 'Exam Name (e.g. NET / SET / GATE)')
                            : (lang === 'mr' ? 'पदवी / शाखा / विषय' : 'Degree / Branch')}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            isBelow10th
                              ? (lang === 'mr' ? 'उदा. ४थी / ७वी / ८वी / ९वी' : 'e.g. 4th / 7th / 8th / 9th')
                              : isPhd
                              ? (lang === 'mr' ? 'उदा. मेकॅनिकल इंजिनिअरिंग' : 'e.g. Mechanical Engineering')
                              : isNetSet
                              ? (lang === 'mr' ? 'उदा. UGC-NET / MH-SET / GATE' : 'e.g. UGC-NET / MH-SET / GATE')
                              : (lang === 'mr' ? 'उदा. SSC / HSC / B.E. / M.Tech' : 'e.g. SSC / HSC / B.E. / M.Tech')
                          }
                          value={edu.degree_name}
                          onChange={(e) => {
                            const updated = [...educationList];
                            updated[idx].degree_name = e.target.value;
                            setEducationList(updated);
                          }}
                          onBlur={(e) => {
                            const updated = [...educationList];
                            updated[idx].degree_name = toSmartTitleCase(e.target.value);
                            setEducationList(updated);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>

                      {isPhd ? (
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                            {lang === 'mr' ? 'पीएच.डी. स्थिती' : 'Ph.D. Status'}
                          </label>
                          <select
                            value={edu.status_remark || 'Awarded'}
                            onChange={(e) => {
                              const updated = [...educationList];
                              updated[idx].status_remark = e.target.value;
                              setEducationList(updated);
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          >
                            <option value="Awarded">{lang === 'mr' ? 'Awarded (प्रदान)' : 'Awarded'}</option>
                            <option value="Scholar / Pursuing">{lang === 'mr' ? 'Pursuing (संशोधक / चालू)' : 'Scholar / Pursuing'}</option>
                          </select>
                        </div>
                      ) : isNetSet ? (
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                            {lang === 'mr' ? 'स्थिती' : 'Status'}
                          </label>
                          <select
                            value={edu.status_remark || 'Qualified'}
                            onChange={(e) => {
                              const updated = [...educationList];
                              updated[idx].status_remark = e.target.value;
                              setEducationList(updated);
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          >
                            <option value="Qualified">{lang === 'mr' ? 'Qualified (उत्तीर्ण)' : 'Qualified'}</option>
                            <option value="Not Qualified / Appeared">{lang === 'mr' ? 'Not Qualified (अनुत्तीर्ण / प्रविष्ट)' : 'Not Qualified / Appeared'}</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                            {lang === 'mr' ? 'गुण / %' : '% / CGPA'}
                          </label>
                                                    {isUgPg && (
                            <select aria-label="Marking system" value={edu.marking_system} onChange={(e) => { const updated = [...educationList]; updated[idx].marking_system = e.target.value as 'percentage' | 'cgpa'; setEducationList(updated); }} className="w-full mb-1.5 px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white">
                              <option value="percentage">Percentage (%)</option>
                              <option value="cgpa">CGPA / Grade / Pointer</option>
                            </select>
                          )}
                          {isUgPg && edu.marking_system === 'cgpa' ? (
                            <div className="grid grid-cols-2 gap-1.5">
                              <input type="number" inputMode="decimal" step="0.001" min="0" placeholder="Obtained CGPA" value={edu.cgpa} onChange={(e) => { const updated = [...educationList]; updated[idx].cgpa = e.target.value; setEducationList(updated); }} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white" />
                              <input type="number" inputMode="decimal" step="0.001" min="0" placeholder="Out of scale" value={edu.cgpa_scale} onChange={(e) => { const updated = [...educationList]; updated[idx].cgpa_scale = e.target.value; setEducationList(updated); }} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white" />
                            </div>
                          ) : (
<input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            placeholder={lang === 'mr' ? 'उदा. ७८.५' : 'e.g. 78.5'}
                            value={edu.percentage}
                            onChange={(e) => {
                              const updated = [...educationList];
                              updated[idx].percentage = e.target.value;
                              setEducationList(updated);
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Board / University & Passing Year */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                          {isBelow10th 
                            ? (lang === 'mr' ? 'शाळेचे नाव / ठिकाण' : 'School Name / Location')
                            : (lang === 'mr' ? 'मंडळ / विद्यापीठ / कॉलेज / शाळा' : 'Board / University / School / College')}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            isBelow10th
                              ? (lang === 'mr' ? 'उदा. जि.प. प्राथमिक शाळा, अंबाप' : 'e.g. Z.P. School, Ambap')
                              : (lang === 'mr' ? 'उदा. शिवाजी विद्यापीठ / पुणे बोर्ड' : 'e.g. Shivaji University / Pune Board')
                          }
                          value={edu.board_university}
                          onChange={(e) => {
                            const updated = [...educationList];
                            updated[idx].board_university = e.target.value;
                            setEducationList(updated);
                          }}
                          onBlur={(e) => {
                            const updated = [...educationList];
                            updated[idx].board_university = toSmartTitleCase(e.target.value);
                            setEducationList(updated);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                          {lang === 'mr' ? 'उत्तीर्ण वर्ष' : 'Passing Year'}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder={lang === 'mr' ? 'उदा. २०२२' : 'e.g. 2022'}
                          value={edu.passing_year}
                          onChange={(e) => {
                            const updated = [...educationList];
                            updated[idx].passing_year = e.target.value.replace(/\D/g, '');
                            setEducationList(updated);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Marksheet Upload */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-0.5">
                        {isBelow10th
                          ? (lang === 'mr' ? 'शाळा सोडल्याचा दाखला (LC/TC) किंवा गुणपत्रिका (ऐच्छिक)' : 'Upload LC / TC / Marksheet (Optional)')
                          : (lang === 'mr' ? 'गुणपत्रिका / पदवी प्रमाणपत्र अपलोड करा (ऐच्छिक)' : 'Upload Marksheet / Degree Certificate (Optional)')}
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const updated = [...educationList];
                          updated[idx].file = e.target.files?.[0] || null;
                          setEducationList(updated);
                        }}
                        className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* B. DESKTOP VIEW: Clean Columnar Table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-3 w-40">{lang === 'mr' ? 'परीक्षा / शिक्षण स्तर' : 'Exam / Degree Level'}</th>
                    <th className="py-3 px-3">{lang === 'mr' ? 'इयत्ता / पदवी / शाखा / विषय' : 'Degree / Branch / Subject'}</th>
                    <th className="py-3 px-3">{lang === 'mr' ? 'शाळा / मंडळ / विद्यापीठ' : 'University / Board / College'}</th>
                    <th className="py-3 px-3 w-24 text-center">{lang === 'mr' ? 'वर्ष' : 'Passing Year'}</th>
                    <th className="py-3 px-3 w-36">{lang === 'mr' ? 'स्थिती / टक्केवारी (%)' : 'Status / % Grade'}</th>
                    <th className="py-3 px-3 w-40">{lang === 'mr' ? 'दाखला / प्रमाणपत्र' : 'Certificate Upload'}</th>
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
                                ? (lang === 'mr' ? 'उदा. ४थी / ७वी / ८वी' : 'Class / Std (e.g. 7th)')
                                : isPhd
                                ? (lang === 'mr' ? 'विषय / शाखा' : 'Discipline / Topic')
                                : isNetSet
                                ? (lang === 'mr' ? 'परीक्षेचे नाव' : 'Exam Name')
                                : (lang === 'mr' ? 'शाखा / विषय' : 'Branch / Subject')
                            }
                            value={edu.degree_name}
                            onChange={(e) => {
                              const updated = [...educationList];
                              updated[idx].degree_name = e.target.value;
                              setEducationList(updated);
                            }}
                            onBlur={(e) => {
                              const updated = [...educationList];
                              updated[idx].degree_name = toSmartTitleCase(e.target.value);
                              setEducationList(updated);
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder={
                              isBelow10th
                                ? (lang === 'mr' ? 'शाळेचे नाव व गाव' : 'School Name & Place')
                                : (lang === 'mr' ? 'मंडळ / विद्यापीठ नाव' : 'Board / University Name')
                            }
                            value={edu.board_university}
                            onChange={(e) => {
                              const updated = [...educationList];
                              updated[idx].board_university = e.target.value;
                              setEducationList(updated);
                            }}
                            onBlur={(e) => {
                              const updated = [...educationList];
                              updated[idx].board_university = toSmartTitleCase(e.target.value);
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
    <select value={edu.status_remark || 'Awarded'} onChange={(e) => { const updated = [...educationList]; updated[idx].status_remark = e.target.value; setEducationList(updated); }} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white">
      <option value="Awarded">Awarded</option><option value="Scholar / Pursuing">Scholar / Pursuing</option>
    </select>
  ) : isNetSet ? (
    <select value={edu.status_remark || 'Qualified'} onChange={(e) => { const updated = [...educationList]; updated[idx].status_remark = e.target.value; setEducationList(updated); }} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white">
      <option value="Qualified">Qualified</option><option value="Not Qualified / Appeared">Not Qualified / Appeared</option>
    </select>
  ) : (
    <div className="space-y-1">
      {isUgPg && <select aria-label="Marking system" value={edu.marking_system} onChange={(e) => { const updated = [...educationList]; updated[idx].marking_system = e.target.value as 'percentage' | 'cgpa'; setEducationList(updated); }} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"><option value="percentage">Percentage (%)</option><option value="cgpa">CGPA / Grade / Pointer</option></select>}
      {isUgPg && edu.marking_system === 'cgpa' ? (
        <div className="grid grid-cols-2 gap-1"><input type="number" step="0.001" min="0" placeholder="Obtained CGPA" value={edu.cgpa} onChange={(e) => { const updated = [...educationList]; updated[idx].cgpa = e.target.value; setEducationList(updated); }} className="min-w-0 w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs" /><input type="number" step="0.001" min="0" placeholder="Out of scale" value={edu.cgpa_scale} onChange={(e) => { const updated = [...educationList]; updated[idx].cgpa_scale = e.target.value; setEducationList(updated); }} className="min-w-0 w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs" /></div>
      ) : (
        <input type="number" inputMode="decimal" step="0.01" placeholder="%" value={edu.percentage} onChange={(e) => { const updated = [...educationList]; updated[idx].percentage = e.target.value; setEducationList(updated); }} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white" />
      )}
    </div>
  )}
</td>
                        <td className="py-2.5 px-3">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const updated = [...educationList];
                              updated[idx].file = e.target.files?.[0] || null;
                              setEducationList(updated);
                            }}
                            className="text-xs text-slate-600 file:mr-1 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:bg-slate-200 file:text-slate-800 cursor-pointer"
                          />
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
                placeholder={
                  lang === 'mr' 
                    ? 'उदा. ७वी पास / १०वी पास / बी.ए. मराठी / एम.टेक मेकॅनिकल' 
                    : 'e.g. 7th Pass / 10th Pass / B.A. / M.Tech in Computer Science'
                }
                value={qualificationSummary}
                onChange={(e) => setQualificationSummary(e.target.value)}
                onBlur={(e) => setQualificationSummary(toSmartTitleCase(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-sm"
              />
            </div>
          </div>

          {/* 5. Work Experience & Fresher Toggle */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                  5
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {lang === 'mr' ? 'कामाचा अनुभव' : 'Work Experience'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'mr' ? 'मागील शिकवण्याचा किंवा इतर कामाचा अनुभव' : 'Prior teaching or industry experience'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFresher(!isFresher)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${isFresher ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-300'}`}
                >
                  {isFresher 
                    ? (lang === 'mr' ? '✅ मी फ्रेशर आहे (अनुभव नाही)' : '✅ I am a Fresher') 
                    : (lang === 'mr' ? 'फ्रेशर आहात का?' : 'Fresher?')}
                </button>
              </div>
            </div>

            {/* ── NEW: Total Relevant Experience Summary ───────────────── */}
            <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-sky-700" />
                <span className="text-xs font-bold uppercase tracking-wider text-sky-900">
                  {lang === 'mr' ? 'एकूण अनुभव सारांश' : 'Total Relevant Experience Summary'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Teaching Experience */}
                <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-2">
                  <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {lang === 'mr' ? 'शैक्षणिक / अध्यापन अनुभव' : 'Total Teaching Experience'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        {lang === 'mr' ? 'वर्षे (Years)' : 'Years'}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="50"
                        placeholder="0"
                        value={teachingExpYears}
                        onChange={(e) => setTeachingExpYears(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        {lang === 'mr' ? 'महिने (Months)' : 'Months'}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="11"
                        placeholder="0"
                        value={teachingExpMonths}
                        onChange={(e) => setTeachingExpMonths(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                {/* Industry / Admin Experience */}
                <div className="p-3 bg-white rounded-xl border border-teal-200 space-y-2">
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    {lang === 'mr' ? 'उद्योग / प्रशासकीय अनुभव' : 'Total Industry / Admin Experience'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        {lang === 'mr' ? 'वर्षे (Years)' : 'Years'}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="50"
                        placeholder="0"
                        value={industryExpYears}
                        onChange={(e) => setIndustryExpYears(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        {lang === 'mr' ? 'महिने (Months)' : 'Months'}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="11"
                        placeholder="0"
                        value={industryExpMonths}
                        onChange={(e) => setIndustryExpMonths(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                      <div>
                        <label className="block text-[10.5px] font-bold uppercase text-slate-600 mb-0.5">
                          {lang === 'mr' ? 'संस्था / कंपनी / शाळेचे नाव' : 'Institute / Organization Name'}
                        </label>
                        <input
                          type="text"
                          placeholder={lang === 'mr' ? 'उदा. एबीसी कॉलेज / कंपनी / शाळा' : 'e.g. ABC College of Engineering'}
                          value={exp.organization_name}
                          onChange={(e) => {
                            const updated = [...experienceList];
                            updated[idx].organization_name = e.target.value;
                            setExperienceList(updated);
                          }}
                          onBlur={(e) => {
                            const updated = [...experienceList];
                            updated[idx].organization_name = toSmartTitleCase(e.target.value);
                            setExperienceList(updated);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold uppercase text-slate-600 mb-0.5">
                          {lang === 'mr' ? 'पद / हुद्दा' : 'Designation Held'}
                        </label>
                        <input
                          type="text"
                          placeholder={lang === 'mr' ? 'उदा. सहाय्यक प्राध्यापक / शिक्षक / शिपाई' : 'e.g. Assistant Professor / Lecturer / Peon'}
                          value={exp.designation}
                          onChange={(e) => {
                            const updated = [...experienceList];
                            updated[idx].designation = e.target.value;
                            setExperienceList(updated);
                          }}
                          onBlur={(e) => {
                            const updated = [...experienceList];
                            updated[idx].designation = toTitleCase(e.target.value);
                            setExperienceList(updated);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10.5px] font-bold uppercase text-slate-600 mb-0.5">
                          {lang === 'mr' ? 'एकूण अनुभव (वर्षे)' : 'Total Years Exp.'}
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          placeholder={lang === 'mr' ? 'उदा. २.५' : 'e.g. 2.5'}
                          value={exp.years_experience}
                          onChange={(e) => {
                            const updated = [...experienceList];
                            updated[idx].years_experience = e.target.value;
                            setExperienceList(updated);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold uppercase text-slate-600 mb-0.5">
                          {lang === 'mr' ? 'शेवटचा पगार (₹/महिना)' : 'Last Salary (₹/month)'}
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder={lang === 'mr' ? 'उदा. २५०००' : 'e.g. 45000'}
                          value={exp.previous_salary}
                          onChange={(e) => {
                            const updated = [...experienceList];
                            updated[idx].previous_salary = e.target.value;
                            setExperienceList(updated);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
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
                {lang === 'mr' 
                  ? '✨ फ्रेशर उमेदवार. मागील कामाचा अनुभव नोंदवला जाणार नाही.' 
                  : '✨ Fresher candidate profile. No previous work experience will be recorded.'}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {lang === 'mr' ? 'अपेक्षित पगार (₹ दरमहा)' : 'Expected Salary (₹ per month)'}
              </label>
              <input
                type="number"
                inputMode="numeric"
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
                    {lang === 'mr' ? 'बायोडाटा / रेझ्युमे (Resume / CV)' : 'Resume / Curriculum Vitae'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'mr' ? 'सविस्तर बायोडाटा (PDF किंवा फोटो स्वरूपात जोडा)' : 'Attach detailed resume in PDF or clear image format'}
                  </p>
                </div>
              </div>
              <span className="text-[10.5px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                {lang === 'mr' ? 'ऐच्छिक' : 'Optional'}
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
                      {resumeFile 
                        ? resumeFile.name 
                        : (lang === 'mr' ? 'आपला बायोडाटा निवडा किंवा फोटो काढा' : 'Select or Take Photo of your Resume')}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {resumeFile 
                        ? `${(resumeFile.size / 1024).toFixed(1)} KB • ${lang === 'mr' ? 'जोडले आहे' : 'Attached'}` 
                        : (lang === 'mr' ? 'मान्य फॉरमॅट: PDF, JPG, PNG (कमाल: ५ MB)' : 'Accepted formats: PDF, JPG, PNG (Max: 5 MB)')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {resumeFile 
                        ? (lang === 'mr' ? 'बदला' : 'Replace') 
                        : (lang === 'mr' ? 'फाईल निवडा' : 'Choose File')}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert(lang === 'mr' ? 'फाईलचा आकार ५ MB पेक्षा जास्त आहे. कृपया लहान फाईल निवडा.' : 'File size exceeds 5 MB. Please select a smaller file.');
                            return;
                          }
                          setResumeFile(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {resumeFile && (
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition"
                      title={lang === 'mr' ? 'बायोडाटा काढून टाका' : 'Remove resume'}
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
                  {lang === 'mr' ? 'प्रतिज्ञापत्र व डिजिटल स्वाक्षरी' : 'Declaration & Digital Signature'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'mr' ? 'मोबाईल स्क्रीनवर बोटाने थेट स्वाक्षरी करा किंवा नाव टाईप करा' : 'Sign directly with finger on mobile screen'}
                </p>
              </div>
            </div>

            {/* Candidate Declaration */}
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
                  {lang === 'mr' ? (
                    <>
                      <strong>* उमेदवाराचे प्रतिज्ञापत्र:</strong> मी याद्वारे घोषित करतो/करते की, वर दिलेली सर्व माहिती आणि कागदपत्रे माझ्या माहितीनुसार व समजुतीनुसार खरी, परिपूर्ण आणि अचूक आहेत. संस्थेने सदर माहिती केवळ भरती व मुलाखत प्रक्रियेसाठी वापरण्यास माझी पूर्ण संमती आहे.
                    </>
                  ) : (
                    <>
                      <strong>* Candidate Declaration:</strong> I hereby certify that the information and documents submitted above are true, complete, and correct to the best of my knowledge and belief. I agree that the Trust may process this data exclusively for recruitment and interview purposes.
                    </>
                  )}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? 'घोषणा करण्याचे ठिकाण' : 'Place of Declaration'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'mr' ? 'उदा. अंबाप / कोल्हापूर / पुणे' : 'e.g. Ambap / Kolhapur / Pune'}
                  value={declarationPlace}
                  onChange={(e) => setDeclarationPlace(e.target.value)}
                  onBlur={(e) => setDeclarationPlace(toTitleCase(declarationPlace))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {lang === 'mr' ? 'दिनांक' : 'Date'}
                </label>
                <input
                  type="text"
                  readOnly
                  value={new Date().toLocaleDateString('en-GB')}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-slate-100 font-semibold text-slate-700 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Signature Area (Touch Canvas or Digital Typed) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {lang === 'mr' ? '* उमेदवाराची स्वाक्षरी' : '* Candidate Signature'}
                </label>
                <button
                  type="button"
                  onClick={() => setUseTypedSignature(!useTypedSignature)}
                  className="text-[11px] text-sky-700 hover:text-sky-900 font-bold underline"
                >
                  {useTypedSignature 
                    ? (lang === 'mr' ? 'बोटाने स्वाक्षरी करा (Draw with finger)' : 'Draw with finger instead') 
                    : (lang === 'mr' ? 'नाव टाईप करा (Type Name instead)' : 'Type Name instead')}
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
                        {lang === 'mr' ? '✍️ येथे आपल्या बोटाने स्वाक्षरी करा' : '✍️ Draw your signature here using your finger'}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition"
                    >
                      {lang === 'mr' ? 'स्वाक्षरी पुसा (Clear)' : 'Clear Signature'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'mr' ? 'पूर्ण कायदेशीर नाव टाईप करा (उदा. अमोल सुरेश पाटील)' : 'Type Full Legal Name (Acts as Digital Signature)'}
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    onBlur={(e) => setTypedSignature(toTitleCase(e.target.value))}
                    className="w-full px-3.5 py-3 border border-slate-300 rounded-xl text-sm font-serif italic bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                  <span className="text-[10.5px] text-slate-500 block mt-1">
                    {lang === 'mr' 
                      ? 'आपले टाईप केलेले पूर्ण नाव ही कायदेशीर डिजिटल स्वाक्षरी मानली जाईल.' 
                      : 'Your typed full name serves as a legal digital endorsement of this form.'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Prominent High-Contrast Mobile Submit Button */}
          <div className="pt-2 sticky bottom-3 z-20">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-sky-800 via-sky-700 to-sky-900 hover:from-sky-900 hover:to-sky-950 text-white rounded-2xl text-sm sm:text-base font-black uppercase tracking-wider shadow-xl hover:shadow-2xl transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] border border-sky-600/30"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{lang === 'mr' ? 'अर्ज सादर होत आहे...' : 'Submitting Application...'}</span>
                </>
              ) : (
                <>
                  <span>{lang === 'mr' ? 'अर्ज सादर करा (Submit Application)' : 'Submit Application Form'}</span>
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
