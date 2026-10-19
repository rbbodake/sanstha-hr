'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { Post, StaffCategory, OrganizationSettings, Institute } from '@/types/database';
import { TrustLetterhead } from '@/components/TrustLetterhead';
import { toTitleCase, toSmartTitleCase, toCleanEmail, toCleanPAN } from '@/lib/stringUtils';
import { generateStandardApplicationNumber, generateTemporaryApplicationId } from '@/lib/applicationNumberService';
import { saveLocalApplicationOverride } from '@/lib/workflowService';
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
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  Languages,
  Printer,
  Clock,
  MapPin,
  Info,
  DollarSign,
  AlertTriangle
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
    'D.Pharm (Diploma in Pharmacy)',
  ],
  'BAMS (Ayurveda)': ['BAMS (Bachelor of Ayurvedic Medicine & Surgery)', 'MD / MS (Ayurveda)'],
  'BHMS (Homeopathy)': ['BHMS (Bachelor of Homeopathic Medicine & Surgery)', 'MD (Homeopathy)'],
  'Nursing & Health Sciences': ['B.Sc. Nursing', 'GNM (General Nursing)', 'ANM (Auxiliary Nursing)'],
  'Education (B.Ed / D.Ed / M.Ed)': ['B.Ed', 'D.El.Ed / D.Ed', 'M.Ed'],
  'Industrial Training Institute (ITI / Vocational)': ['ITI Electrician', 'ITI Fitter', 'ITI Welder', 'ITI COPA'],
  'Arts, Commerce & Science (General Degree)': ['B.A.', 'B.Com', 'B.Sc.', 'M.A.', 'M.Com', 'M.Sc.'],
  'Junior College / Higher Secondary': ['11th-12th Science', '11th-12th Commerce', '11th-12th Arts'],
  'School Education (CBSE / State)': ['Secondary School (Std 5-10)', 'Primary School (Std 1-4)', 'Pre-Primary / KG'],
  'General / Administrative / Other': [
    'Administrative / Office / Central HR Support',
    'Accountancy & Finance Department',
    'Library & Information Science',
    'Laboratory Support / Workshop',
    'Estate, Security & Housekeeping'
  ]
};

export default function OnlinePreRegistrationPage() {
  const [lang, setLang] = useState<'en' | 'mr'>('en');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [staffCategories, setStaffCategories] = useState<StaffCategory[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [org, setOrg] = useState<OrganizationSettings | null>(null);

  // Form Fields
  const [selectedPostId, setSelectedPostId] = useState('');
  const [programStream, setProgramStream] = useState('Engineering & Technology');
  const [courseName, setCourseName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [preferredInstituteId, setPreferredInstituteId] = useState('');

  // Personal Info
  const [salutation, setSalutation] = useState('Mr.');
  const [candidateName, setCandidateName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [isMarried, setIsMarried] = useState(false);
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [reservationCategory, setReservationCategory] = useState('OPEN');
  const [isPwD, setIsPwD] = useState(false);
  const [pwdType, setPwdType] = useState('');
  const [languagesKnown, setLanguagesKnown] = useState<string[]>(['Marathi', 'English']);

  // Contact Info
  const [contactNo, setContactNo] = useState('');
  const [emailId, setEmailId] = useState('');
  const [villageCity, setVillageCity] = useState('');
  const [taluka, setTaluka] = useState('');
  const [district, setDistrict] = useState('Kolhapur');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pinCode, setPinCode] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyMobile, setEmergencyMobile] = useState('');

  // Identification
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [panNo, setPanNo] = useState('');

  // Education Rows
  const [educationList, setEducationList] = useState<Array<{
    level: string;
    degree_name: string;
    board_university: string;
    passing_year: string;
    percentage: string;
  }>>([
    { level: 'SSC (10th)', degree_name: 'SSC', board_university: '', passing_year: '', percentage: '' },
    { level: 'HSC (12th)', degree_name: 'HSC', board_university: '', passing_year: '', percentage: '' },
    { level: 'Graduation / UG', degree_name: '', board_university: '', passing_year: '', percentage: '' },
  ]);

  // Experience
  const [isFresher, setIsFresher] = useState(true);
  const [organizationName, setOrganizationName] = useState('');
  const [designation, setDesignation] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');

  // Documents
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [typedSignature, setTypedSignature] = useState('');

  // Submission State & Success Screen
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedCandidate, setSubmittedCandidate] = useState<{
    temp_id: string;
    application_no: string;
    candidate_name: string;
    post_title: string;
    program_stream: string;
    contact_no: string;
    prescribed_fee: number;
    created_at: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Load masters on mount
  useEffect(() => {
    async function initMasters() {
      try {
        const { data: orgData } = await supabase.from('organization_settings').select('*').limit(1).maybeSingle();
        if (orgData) setOrg(orgData);

        const { data: postsData } = await supabase.from('posts').select('*, staff_categories(*)').eq('is_active', true).order('title');
        if (postsData) {
          setPosts(postsData);
          if (postsData.length > 0) setSelectedPostId(postsData[0].id);
        }

        const { data: catData } = await supabase.from('staff_categories').select('*').eq('is_active', true);
        if (catData) setStaffCategories(catData);

        const { data: instData } = await supabase.from('institutes').select('*').eq('is_active', true).order('official_name');
        if (instData) setInstitutes(instData);
      } catch (err) {
        console.warn('Masters init error:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    initMasters();
  }, []);

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

  // Handle Photo File selection
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

  const uploadToStorage = async (bucket: string, file: File, prefix: string): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error } = await supabase.storage.from(bucket).upload(fileName, file);
      if (error) {
        console.warn(`Storage upload error for ${bucket}:`, error.message);
        return '';
      }
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return publicData?.publicUrl || fileName;
    } catch {
      return '';
    }
  };

  const addEducationRow = () => {
    setEducationList([
      ...educationList,
      { level: 'Post-Graduation / PG', degree_name: '', board_university: '', passing_year: '', percentage: '' }
    ]);
  };

  const removeEducationRow = (index: number) => {
    if (educationList.length <= 1) return;
    setEducationList(educationList.filter((_, i) => i !== index));
  };

  const handleEducationChange = (index: number, field: string, value: string) => {
    const updated = [...educationList];
    (updated[index] as any)[field] = value;
    setEducationList(updated);
  };

  // Selected Post Details
  const selectedPost = posts.find((p) => p.id === selectedPostId);
  const applicationFee = selectedPost?.staff_categories?.application_fee ?? 200;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!candidateName.trim()) {
      alert(lang === 'mr' ? 'कृपया संपूर्ण नाव प्रविष्ट करा.' : 'Please enter full candidate name as per Aadhaar.');
      return;
    }
    if (!contactNo || !/^\d{10}$/.test(contactNo.trim())) {
      alert(lang === 'mr' ? 'कृपया वैध १० अंकी मोबाईल नंबर प्रविष्ट करा.' : 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!aadhaarNo || !/^\d{12}$/.test(aadhaarNo.replace(/\s+/g, ''))) {
      alert(lang === 'mr' ? 'कृपया वैध १२ अंकी आधार नंबर प्रविष्ट करा.' : 'Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (!declarationAccepted) {
      alert(lang === 'mr' ? 'कृपया प्रतिज्ञापत्रास सहमती द्या.' : 'Please agree to the candidate declaration before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Generate Standard App No and Temporary ID
      const generatedAppNo = await generateStandardApplicationNumber();
      const generatedTempId = await generateTemporaryApplicationId();

      let uploadedPhotoUrl = '';
      let uploadedResumeDocUrl = '';

      if (photoFile) {
        uploadedPhotoUrl = await uploadToStorage('candidate-photos', photoFile, 'remote_photo');
      }
      if (resumeFile) {
        uploadedResumeDocUrl = await uploadToStorage('candidate-resumes', resumeFile, `${generatedTempId}_resume`);
      }

      const cleanAadhaar = aadhaarNo.replace(/\s+/g, '');
      const maskedAadhaar = `XXXX-XXXX-${cleanAadhaar.slice(-4)}`;
      const cleanPan = toCleanPAN(panNo);
      const maskedPan = cleanPan.length === 10 ? `${cleanPan.slice(0, 2)}XXX${cleanPan.slice(5, 9)}X` : cleanPan;

      const fullName = salutation ? `${salutation} ${toTitleCase(candidateName)}` : toTitleCase(candidateName);
      const postTitle = selectedPost?.title || 'Applied Designation';

      // 2. Prepare Application Payload marked as ONLINE_REMOTE & DRAFT_PENDING_FEE
      const appPayload: Record<string, any> = {
        application_no: generatedAppNo,
        temp_id: generatedTempId,
        source_type: 'ONLINE_REMOTE',
        registration_status: 'DRAFT_PENDING_FEE',
        post_id: selectedPostId || null,
        category_id: selectedPost?.category_id || null,
        program_stream: programStream || 'Engineering & Technology',
        course_name: toSmartTitleCase(courseName) || null,
        specialization: toSmartTitleCase(specialization) || null,
        preferred_institute_id: preferredInstituteId || null,
        candidate_name: fullName,
        photo_url: uploadedPhotoUrl || null,
        address: [villageCity, taluka && `Taluka ${taluka}`, district && `District ${district}`, stateName, pinCode && `PIN ${pinCode}`]
          .filter(Boolean).map((p) => toTitleCase(p as string)).join(', '),
        village_city: toTitleCase(villageCity) || null,
        taluka: toTitleCase(taluka) || null,
        district: toTitleCase(district) || 'Kolhapur',
        state: toTitleCase(stateName) || 'Maharashtra',
        pin_code: pinCode.trim() || null,
        contact_no: contactNo.trim(),
        email_id: toCleanEmail(emailId) || null,
        dob: dob || null,
        age: typeof age === 'number' ? age : null,
        gender: gender || null,
        blood_group: bloodGroup || null,
        reservation_category: reservationCategory || null,
        is_pwd: isPwD,
        pwd_type: isPwD ? pwdType.trim() || null : null,
        languages_known: languagesKnown.length > 0 ? languagesKnown : null,
        emergency_contact_name: toTitleCase(emergencyName) || null,
        emergency_contact_mobile: emergencyMobile || null,
        aadhaar_masked: maskedAadhaar,
        aadhaar_full: cleanAadhaar,
        pan_masked: maskedPan || null,
        pan_full: cleanPan || null,
        resume_url: uploadedResumeDocUrl || null,
        declaration_accepted: true,
        signature_url: typedSignature ? `typed:${toTitleCase(typedSignature)}` : `typed:${fullName}`,
        declaration_place: toTitleCase(villageCity) || 'Online Remote',
        declaration_date: new Date().toISOString().split('T')[0],
        status: 'submitted',
        submission_channel: 'online_remote',
      };

      let newApp: any = null;
      const { data: insertedApp, error: insertError } = await supabase
        .from('applications')
        .insert(appPayload)
        .select()
        .single();

      if (insertError) {
        // Fallback if specific newly added columns aren't yet in the database schema
        console.warn('Initial insert notice:', insertError.message);
        if (insertError.message.includes('temp_id') || insertError.message.includes('source_type') || insertError.message.includes('registration_status')) {
          delete appPayload.temp_id;
          delete appPayload.source_type;
          delete appPayload.registration_status;

          const { data: retryApp, error: retryError } = await supabase
            .from('applications')
            .insert(appPayload)
            .select()
            .single();

          if (retryError) throw retryError;
          newApp = retryApp;
        } else {
          throw insertError;
        }
      } else {
        newApp = insertedApp;
      }

      if (!newApp) throw new Error('Could not create pre-registration record.');

      // Save local application override for zero-delay client reactivity
      saveLocalApplicationOverride(newApp.id, {
        temp_id: generatedTempId,
        source_type: 'ONLINE_REMOTE',
        registration_status: 'DRAFT_PENDING_FEE',
      });

      // 3. Insert Educational Details
      for (const edu of educationList) {
        if (edu.degree_name?.trim() || edu.percentage?.trim()) {
          try {
            await supabase.from('application_education').insert({
              application_id: newApp.id,
              level: edu.level,
              degree_name: toSmartTitleCase(edu.degree_name) || edu.level,
              board_university: toSmartTitleCase(edu.board_university) || null,
              passing_year: edu.passing_year?.trim() || null,
              percentage: edu.percentage ? parseFloat(edu.percentage) : null,
              marking_system: 'percentage',
            });
          } catch (e) {
            console.warn('Education row insert warning:', e);
          }
        }
      }

      // 4. Insert Experience Detail if not fresher
      if (!isFresher && organizationName.trim()) {
        try {
          await supabase.from('application_experience').insert({
            application_id: newApp.id,
            is_fresher: false,
            organization_name: toTitleCase(organizationName),
            designation: toTitleCase(designation),
            years_experience: yearsExperience ? parseFloat(yearsExperience) : null,
            previous_salary: salaryExpectation ? parseFloat(salaryExpectation) : null,
          });
        } catch (e) {
          console.warn('Experience insert warning:', e);
        }
      }

      // 5. Transition to Success Screen
      setSubmittedCandidate({
        temp_id: generatedTempId,
        application_no: generatedAppNo,
        candidate_name: fullName,
        post_title: postTitle,
        program_stream: programStream,
        contact_no: contactNo.trim(),
        prescribed_fee: applicationFee,
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Pre-registration submission error:', err);
      setSubmitError(err?.message || 'Failed to submit pre-registration. Please check all required fields.');
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
  // SUCCESS SCREEN: Clear Temporary ID & Step-by-Step Front Desk Instructions
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Pre-Registration Recorded • Pending Front Desk Fee Settlement
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Online Pre-Registration Successful!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
              Your details have been registered into the Sanstha hiring system. No online payment was required.
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

          {/* Candidate & QR Code Quick Summary */}
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
                <span className="text-slate-500 font-medium">Mobile:</span>{' '}
                <span className="font-bold font-mono text-slate-900">{submittedCandidate.contact_no}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Applicable Sanstha Fee:</span>{' '}
                <span className="font-bold text-emerald-700">₹{submittedCandidate.prescribed_fee} (Payable at Front Desk)</span>
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

          {/* Step-by-Step Walk-In Settlement Instructions */}
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
                    Save <span className="font-mono font-bold text-sky-700">{submittedCandidate.temp_id}</span> on your phone or print this slip.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <strong className="text-slate-900">Visit Sanstha Central HR Front Desk:</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Visit Shri Balasaheb Mane Shikshan Prasarak Mandal Head Office, Ambap Campus (Tal. Hatkanangale, Dist. Kolhapur) with your original certificates.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <strong className="text-slate-900">Desk Staff Fee Collection & Conversion:</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Front Desk staff will look up your record using your Temporary ID or Mobile Number, accept the application fee of ₹{submittedCandidate.prescribed_fee} (Cash, UPI, or DD), print your official stamped receipt, and activate your application for interview scheduling.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-slate-600" /> Print Confirmation Slip
            </button>

            <div className="flex items-center gap-2">
              <Link
                href="/apply/status"
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Track Status
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmittedCandidate(null);
                  setCandidateName('');
                  setContactNo('');
                  setAadhaarNo('');
                  setDeclarationAccepted(false);
                }}
                className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition shadow"
              >
                New Pre-Registration
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN PRE-REGISTRATION FORM
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Language Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-sky-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Candidate Portal
          </Link>

          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'mr' : 'en')}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-sm"
          >
            <Languages className="w-3.5 h-3.5 text-sky-600" />
            {lang === 'en' ? 'मराठी मध्ये भरा' : 'Fill in English'}
          </button>
        </div>

        {/* Sanstha Trust Letterhead */}
        <TrustLetterhead org={org || undefined} />

        {/* Feature Banner: Remote Pre-Registration */}
        <div className="bg-gradient-to-r from-sky-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Public Remote Candidate Pre-Registration Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {lang === 'mr' ? 'दूरस्थ उमेदवार ऑनलाइन पूर्व-नोंदणी' : 'Remote Candidate Online Pre-Registration'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              {lang === 'mr'
                ? 'जर आपण लगेच प्रत्यक्ष कार्यालयात येऊ शकत नसाल, तर आपण आपले तपशील येथून पूर्व-नोंदणी करू शकता. ऑनलाइन शुल्क भरण्याची आवश्यकता नाही. प्रत्यक्ष भेटीच्या वेळी शुल्क भरून अधिकृत पावती मिळवा.'
                : 'Candidates who cannot initially visit the front desk physically may pre-register their details online. Online payment is NOT required. You will be assigned a Temporary Application ID to present at the front desk upon arrival.'}
            </p>
          </div>
        </div>

        {/* Important Notice Callout */}
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 space-y-1">
            <strong className="font-bold">No Online Payment Required:</strong>
            <p className="text-amber-900 leading-relaxed">
              Your submission will be flagged as <span className="font-bold text-amber-950">Draft (Pending Fee)</span>. 
              The prescribed application fee (₹{applicationFee}) will be collected in-person by the Front Desk Officer when you visit the Sanstha Head Office at Ambap Campus.
            </p>
          </div>
        </div>

        {submitError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            {submitError}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Post & Stream */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                  1. Designation & Academic Stream Selection
                </h2>
                <p className="text-[11px] text-slate-500">Select the post and branch you wish to apply for</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Job Designation (पद) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                >
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.staff_categories?.name ? `(${p.staff_categories.name})` : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                  Category Application Fee: <strong className="text-emerald-700 font-mono">₹{applicationFee}</strong> (Settled at desk)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Academic Program Stream (विभाग) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={programStream}
                  onChange={(e) => {
                    setProgramStream(e.target.value);
                    setCourseName(defaultStreamCourses[e.target.value]?.[0] || '');
                  }}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                >
                  {programStreamOptions.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Course / Program (अभ्यासक्रम)
                </label>
                <input
                  type="text"
                  list="courseList"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science, MBA, B.Pharm"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                />
                <datalist id="courseList">
                  {(defaultStreamCourses[programStream] || []).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Subject / Specialization (विषय / विशेषीकरण)
                </label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Artificial Intelligence, Finance, Pharmaceutics"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Preferred Campus / Institute (ऐच्छिक महाविद्यालय)
                </label>
                <select
                  value={preferredInstituteId}
                  onChange={(e) => setPreferredInstituteId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                >
                  <option value="">Any Sanstha Campus / Central Trust Choice</option>
                  {institutes.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.official_name || inst.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Personal Information */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                  2. Personal Information & Identification
                </h2>
                <p className="text-[11px] text-slate-500">Provide official identity details as per government Aadhaar card</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Salutation</label>
                <select
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name as per Aadhaar (पूर्ण नाव) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  required
                  placeholder="First Middle Last Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender (लिंग)</label>
                <select
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Date of Birth (जन्म तारीख)</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Age (वय)</label>
                <input
                  type="text"
                  readOnly
                  value={age ? `${age} Years` : ''}
                  placeholder="Auto-calculated"
                  className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Blood Group (रक्तगट)</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reservation Category</label>
                <select
                  value={reservationCategory}
                  onChange={(e) => setReservationCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  {['OPEN', 'OBC', 'EWS', 'SC', 'ST', 'VJ / NT-A', 'NT-B', 'NT-C', 'NT-D', 'SBC'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Person with Disability (PwD)?</label>
                <div className="flex items-center gap-3 mt-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="pwd"
                      checked={!isPwD}
                      onChange={() => setIsPwD(false)}
                      className="text-sky-600"
                    />
                    No
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="pwd"
                      checked={isPwD}
                      onChange={() => setIsPwD(true)}
                      className="text-sky-600"
                    />
                    Yes
                  </label>
                </div>
              </div>

              {isPwD && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">PwD Type & Percentage</label>
                  <input
                    type="text"
                    value={pwdType}
                    onChange={(e) => setPwdType(e.target.value)}
                    placeholder="e.g. Locomotor Disability, 40%"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              )}
            </div>

            {/* National IDs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  12-digit Aadhaar Number (आधार कार्ड नंबर) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={aadhaarNo}
                  onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="12 digit Aadhaar number"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Used for verification lookup upon arrival at the desk
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  PAN Card Number (पॅन कार्ड नंबर)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={panNo}
                  onChange={(e) => setPanNo(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Address */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                  3. Contact Information & Residential Address
                </h2>
                <p className="text-[11px] text-slate-500">Provide active mobile number for Front Desk lookup</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Primary Mobile Number (मोबाईल नंबर) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-xs font-bold">
                    +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value.replace(/\D/g, ''))}
                    required
                    placeholder="9876543210"
                    className="w-full pl-12 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
                  ★ Front Desk staff can search your pre-registration using this number
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address (ईमेल आयडी)
                </label>
                <input
                  type="email"
                  value={emailId}
                  onChange={(e) => setEmailId(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Village / City (गाव / शहर)</label>
                <input
                  type="text"
                  value={villageCity}
                  onChange={(e) => setVillageCity(e.target.value)}
                  placeholder="e.g. Kolhapur / Ambap"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Taluka (तालुका)</label>
                <input
                  type="text"
                  value={taluka}
                  onChange={(e) => setTaluka(e.target.value)}
                  placeholder="e.g. Hatkanangale"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">District (जिल्हा)</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Kolhapur"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">PIN Code (पिन कोड)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="416112"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Educational Qualifications */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                    4. Educational Qualifications (शैक्षणिक पात्रता)
                  </h2>
                  <p className="text-[11px] text-slate-500">Add your degrees, passing years, and percentage marks</p>
                </div>
              </div>

              <button
                type="button"
                onClick={addEducationRow}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-sky-200"
              >
                <Plus className="w-3.5 h-3.5" /> Add Degree
              </button>
            </div>

            <div className="space-y-3">
              {educationList.map((edu, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Level</label>
                    <input
                      type="text"
                      value={edu.level}
                      onChange={(e) => handleEducationChange(idx, 'level', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Degree / Course</label>
                    <input
                      type="text"
                      value={edu.degree_name}
                      onChange={(e) => handleEducationChange(idx, 'degree_name', e.target.value)}
                      placeholder="e.g. B.Tech / B.Sc"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Board / University</label>
                    <input
                      type="text"
                      value={edu.board_university}
                      onChange={(e) => handleEducationChange(idx, 'board_university', e.target.value)}
                      placeholder="e.g. Shivaji University"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Percentage %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={edu.percentage}
                      onChange={(e) => handleEducationChange(idx, 'percentage', e.target.value)}
                      placeholder="e.g. 74.5"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeEducationRow(idx)}
                      disabled={educationList.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition disabled:opacity-30"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Experience & Resume */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                  5. Experience & Uploads (अनुभव व कागदपत्रे)
                </h2>
                <p className="text-[11px] text-slate-500">Provide work history if applicable</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFresher}
                  onChange={(e) => setIsFresher(e.target.checked)}
                  className="rounded text-sky-600"
                />
                I am a Fresher (No prior teaching / industrial work experience)
              </label>

              {!isFresher && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Previous Organization</label>
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="College / Company name"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Assistant Professor"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      placeholder="e.g. 3.5"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Photo & Resume Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Candidate Photo (छायाचित्र) <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="file"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Resume / CV (बायोडाटा) <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Declaration & Submit */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  className="mt-1 rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  I hereby declare that all information furnished in this pre-registration form is true, complete, and accurate to the best of my knowledge. I understand that my pre-registration will be finalized and activated only upon physical document verification and payment of the Sanstha application fee at the Central HR Front Desk.
                </span>
              </label>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Digital Signature (Type Full Name as Signature) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder={candidateName ? `${salutation} ${candidateName}` : 'Enter your full name'}
                  className="w-full max-w-md px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500">
                Application Fee: <strong className="text-slate-900 font-mono">₹{applicationFee}</strong> (Payable upon arrival at Front Desk)
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white rounded-2xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Recording Pre-Registration...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    Submit Online Pre-Registration
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
