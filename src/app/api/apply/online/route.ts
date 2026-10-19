import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateStandardApplicationNumber, generateTemporaryApplicationId } from '@/lib/applicationNumberService';
import { toTitleCase, toSmartTitleCase, toCleanEmail, toCleanPAN } from '@/lib/stringUtils';

/**
 * Uploads a file buffer to Supabase Storage.
 * Falls back safely if bucket is missing or unconfigured.
 */
async function uploadFileBuffer(bucket: string, file: File, prefix: string): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExt = file.name.split('.').pop() || 'dat';
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage.from(bucket).upload(fileName, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });

    if (error) {
      console.warn(`Storage upload warning for ${bucket}:`, error.message);
      return '';
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicData?.publicUrl || fileName;
  } catch (err: any) {
    console.warn(`File upload exception for ${bucket}:`, err?.message);
    return '';
  }
}

/**
 * GET /api/apply/online
 * Redirects or returns endpoint status
 */
export async function GET(request: NextRequest) {
  const url = new URL('/apply/online', request.url);
  return NextResponse.redirect(url);
}

/**
 * POST /api/apply/online
 * Receives remote candidate pre-registration submission.
 * Supports both multipart/form-data (HTML Form) and application/json (AJAX/Fetch).
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const acceptsHtml = request.headers.get('accept')?.includes('text/html');

    let designation = '';
    let postId = '';
    let stream = 'Engineering & Technology';
    let course = '';
    let specialization = '';
    let preferredCampus = '';
    let preferredInstituteId = '';
    let salutation = 'Mr.';
    let fullName = '';
    let parentSpouseName = '';
    let gender = 'Male';
    let dob = '';
    let maritalStatus = 'Single';
    let bloodGroup = '';
    let category = 'General (Open)';
    let religionCaste = '';
    let isPwd = false;
    let pwdType = '';
    let languagesKnown: string[] = [];
    let aadhaarNo = '';
    let panNo = '';
    let mobile = '';
    let email = '';
    let addressCity = '';
    let addressTaluka = '';
    let addressDistrict = 'Kolhapur';
    let stateName = 'Maharashtra';
    let pincode = '';
    let permanentAddress = '';
    let emergencyName = '';
    let emergencyRelation = '';
    let emergencyMobile = '';
    let qualificationSummary = '';
    let salaryExpectation = '';
    let isFresher = false;
    let teachingExpYears = '';
    let teachingExpMonths = '';
    let industryExpYears = '';
    let industryExpMonths = '';
    let declarationAccepted = false;
    let declarationPlace = 'Ambap';
    let signatureUrl = '';

    // Files
    let photoFile: File | null = null;
    let resumeFile: File | null = null;
    let aadhaarFile: File | null = null;
    let panFile: File | null = null;
    const eduFiles: Record<number, File> = {};

    // Qualifications & Experiences
    let eduRows: Array<{
      level: string;
      degree_name: string;
      board_university: string;
      passing_year: string;
      status_remark?: string;
      marking_system: string;
      score?: string;
      percentage?: string;
      cgpa?: string;
      cgpa_scale?: string;
      file?: File | null;
      doc_url?: string;
    }> = [];

    let expRows: Array<{
      organization_name: string;
      designation: string;
      years_experience: string;
      previous_salary: string;
    }> = [];

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();

      postId = (formData.get('post_id') as string) || '';
      designation = (formData.get('designation') as string) || '';
      stream = (formData.get('stream') as string) || (formData.get('program_stream') as string) || 'Engineering & Technology';
      course = (formData.get('course') as string) || (formData.get('course_name') as string) || '';
      specialization = (formData.get('specialization') as string) || '';
      preferredCampus = (formData.get('preferred_campus') as string) || '';
      preferredInstituteId = (formData.get('preferred_institute_id') as string) || '';
      salutation = (formData.get('salutation') as string) || 'Mr.';
      fullName = (formData.get('full_name') as string) || (formData.get('candidate_name') as string) || '';
      parentSpouseName = (formData.get('parent_spouse_name') as string) || '';
      gender = (formData.get('gender') as string) || 'Male';
      dob = (formData.get('dob') as string) || '';
      maritalStatus = (formData.get('marital_status') as string) || 'Single';
      bloodGroup = (formData.get('blood_group') as string) || '';
      category = (formData.get('category') as string) || (formData.get('reservation_category') as string) || 'General (Open)';
      religionCaste = (formData.get('religion_caste') as string) || '';
      
      const pwdVal = (formData.get('is_pwd') as string) || '';
      isPwd = pwdVal.toLowerCase() === 'yes' || pwdVal === 'true';
      pwdType = (formData.get('pwd_type') as string) || '';

      const langs = formData.getAll('languages_known');
      if (langs && langs.length > 0) {
        languagesKnown = langs.map((l) => l.toString());
      } else {
        const langStr = formData.get('languages_known') as string;
        if (langStr) {
          try {
            languagesKnown = JSON.parse(langStr);
          } catch {
            languagesKnown = langStr.split(',').map((s) => s.trim());
          }
        }
      }

      aadhaarNo = (formData.get('aadhaar_no') as string) || '';
      panNo = (formData.get('pan_no') as string) || '';
      mobile = (formData.get('mobile') as string) || (formData.get('contact_no') as string) || '';
      email = (formData.get('email') as string) || (formData.get('email_id') as string) || '';
      addressCity = (formData.get('address_city') as string) || (formData.get('village_city') as string) || '';
      addressTaluka = (formData.get('address_taluka') as string) || (formData.get('taluka') as string) || '';
      addressDistrict = (formData.get('address_district') as string) || (formData.get('district') as string) || 'Kolhapur';
      stateName = (formData.get('state') as string) || 'Maharashtra';
      pincode = (formData.get('pincode') as string) || (formData.get('pin_code') as string) || '';
      permanentAddress = (formData.get('permanent_address') as string) || '';
      emergencyName = (formData.get('emergency_contact_name') as string) || (formData.get('emergency_name') as string) || '';
      emergencyRelation = (formData.get('emergency_contact_relation') as string) || (formData.get('emergency_relation') as string) || '';
      emergencyMobile = (formData.get('emergency_contact_mobile') as string) || (formData.get('emergency_mobile') as string) || '';
      qualificationSummary = (formData.get('qualification_summary') as string) || '';
      salaryExpectation = (formData.get('salary_expectation') as string) || '';

      const fresherVal = (formData.get('is_fresher') as string) || '';
      isFresher = fresherVal.toLowerCase() === 'yes' || fresherVal === 'true' || fresherVal === 'on';

      teachingExpYears = (formData.get('total_teaching_exp_years') as string) || (formData.get('total_exp_years') as string) || '';
      teachingExpMonths = (formData.get('total_teaching_exp_months') as string) || (formData.get('total_exp_months') as string) || '';
      industryExpYears = (formData.get('total_industry_exp_years') as string) || '';
      industryExpMonths = (formData.get('total_industry_exp_months') as string) || '';

      const declVal = (formData.get('declaration') as string) || (formData.get('declaration_accepted') as string) || '';
      declarationAccepted = declVal === 'on' || declVal === 'true' || declVal === '1' || declVal === 'yes';
      declarationPlace = (formData.get('declaration_place') as string) || 'Ambap';
      signatureUrl = (formData.get('digital_signature') as string) || (formData.get('signature_url') as string) || '';

      // Uploads
      const photo = formData.get('photo');
      if (photo && typeof photo === 'object' && 'name' in photo && (photo as File).size > 0) {
        photoFile = photo as File;
      }
      const resume = formData.get('resume');
      if (resume && typeof resume === 'object' && 'name' in resume && (resume as File).size > 0) {
        resumeFile = resume as File;
      }
      const aadhaarDoc = formData.get('aadhaar_file');
      if (aadhaarDoc && typeof aadhaarDoc === 'object' && 'name' in aadhaarDoc && (aadhaarDoc as File).size > 0) {
        aadhaarFile = aadhaarDoc as File;
      }
      const panDoc = formData.get('pan_file');
      if (panDoc && typeof panDoc === 'object' && 'name' in panDoc && (panDoc as File).size > 0) {
        panFile = panDoc as File;
      }

      for (let i = 0; i < 25; i++) {
        const ef = formData.get(`edu_file_${i}`);
        if (ef && typeof ef === 'object' && 'name' in ef && (ef as File).size > 0) {
          eduFiles[i] = ef as File;
        }
      }

      // Check if education list was submitted as JSON
      const eduJson = formData.get('education_list_json') as string;
      if (eduJson) {
        try {
          eduRows = JSON.parse(eduJson);
        } catch {
          eduRows = [];
        }
      } else {
        // Fallback for standard individual fields (SSC, HSC, UG, PG)
        eduRows = [
          {
            level: 'S.S.C. (10th) / १०वी',
            degree_name: (formData.get('edu_degree_ssc') as string) || 'SSC',
            board_university: (formData.get('edu_board_ssc') as string) || '',
            passing_year: (formData.get('edu_year_ssc') as string) || '',
            marking_system: (formData.get('edu_eval_ssc') as string) || 'percentage',
            score: (formData.get('edu_score_ssc') as string) || '',
            percentage: (formData.get('edu_percentage_ssc') as string) || '',
          },
          {
            level: 'H.S.C. (12th) / १२वी',
            degree_name: (formData.get('edu_degree_hsc') as string) || 'HSC',
            board_university: (formData.get('edu_board_hsc') as string) || '',
            passing_year: (formData.get('edu_year_hsc') as string) || '',
            marking_system: (formData.get('edu_eval_hsc') as string) || 'percentage',
            score: (formData.get('edu_score_hsc') as string) || '',
            percentage: (formData.get('edu_percentage_hsc') as string) || '',
          },
          {
            level: 'Graduation (UG) / पदवी',
            degree_name: (formData.get('edu_degree_ug') as string) || '',
            board_university: (formData.get('edu_board_ug') as string) || '',
            passing_year: (formData.get('edu_year_ug') as string) || '',
            marking_system: (formData.get('edu_eval_ug') as string) || 'cgpa',
            score: (formData.get('edu_score_ug') as string) || '',
            percentage: (formData.get('edu_percentage_ug') as string) || '',
          },
          {
            level: 'Post Graduation (PG) / पदव्युत्तर',
            degree_name: (formData.get('edu_degree_pg') as string) || '',
            board_university: (formData.get('edu_board_pg') as string) || '',
            passing_year: (formData.get('edu_year_pg') as string) || '',
            marking_system: (formData.get('edu_eval_pg') as string) || 'cgpa',
            score: (formData.get('edu_score_pg') as string) || '',
            percentage: (formData.get('edu_percentage_pg') as string) || '',
          },
        ];
      }

      // Check if experience list was submitted as JSON
      const expJson = formData.get('experience_list_json') as string;
      if (expJson) {
        try {
          expRows = JSON.parse(expJson);
        } catch {
          expRows = [];
        }
      } else {
        const lastOrg = (formData.get('last_organization') as string) || '';
        const lastDesig = (formData.get('last_designation') as string) || '';
        const lastSal = (formData.get('last_salary') as string) || '';
        if (lastOrg || lastDesig) {
          expRows = [{
            organization_name: lastOrg,
            designation: lastDesig,
            years_experience: teachingExpYears,
            previous_salary: lastSal,
          }];
        }
      }
    } else {
      // JSON Payload
      const body = await request.json();
      postId = body.post_id || '';
      designation = body.designation || '';
      stream = body.stream || body.program_stream || 'Engineering & Technology';
      course = body.course || body.course_name || '';
      specialization = body.specialization || '';
      preferredCampus = body.preferred_campus || '';
      preferredInstituteId = body.preferred_institute_id || '';
      salutation = body.salutation || 'Mr.';
      fullName = body.full_name || body.candidate_name || '';
      parentSpouseName = body.parent_spouse_name || '';
      gender = body.gender || 'Male';
      dob = body.dob || '';
      maritalStatus = body.marital_status || 'Single';
      bloodGroup = body.blood_group || '';
      category = body.category || body.reservation_category || 'General (Open)';
      religionCaste = body.religion_caste || '';
      isPwd = Boolean(body.is_pwd === 'Yes' || body.is_pwd === true);
      pwdType = body.pwd_type || '';
      languagesKnown = Array.isArray(body.languages_known) ? body.languages_known : [];
      aadhaarNo = body.aadhaar_no || '';
      panNo = body.pan_no || '';
      mobile = body.mobile || body.contact_no || '';
      email = body.email || body.email_id || '';
      addressCity = body.address_city || body.village_city || '';
      addressTaluka = body.address_taluka || body.taluka || '';
      addressDistrict = body.address_district || body.district || 'Kolhapur';
      stateName = body.state || 'Maharashtra';
      pincode = body.pincode || body.pin_code || '';
      permanentAddress = body.permanent_address || '';
      emergencyName = body.emergency_contact_name || body.emergency_name || '';
      emergencyRelation = body.emergency_contact_relation || body.emergency_relation || '';
      emergencyMobile = body.emergency_contact_mobile || body.emergency_mobile || '';
      qualificationSummary = body.qualification_summary || '';
      salaryExpectation = body.salary_expectation?.toString() || '';
      isFresher = Boolean(body.is_fresher === 'Yes' || body.is_fresher === true);
      teachingExpYears = body.total_teaching_exp_years?.toString() || body.total_exp_years?.toString() || '';
      teachingExpMonths = body.total_teaching_exp_months?.toString() || body.total_exp_months?.toString() || '';
      industryExpYears = body.total_industry_exp_years?.toString() || '';
      industryExpMonths = body.total_industry_exp_months?.toString() || '';
      declarationAccepted = Boolean(body.declaration || body.declaration_accepted);
      declarationPlace = body.declaration_place || 'Ambap';
      signatureUrl = body.digital_signature || body.signature_url || '';

      if (Array.isArray(body.education_list)) {
        eduRows = body.education_list;
      }
      if (Array.isArray(body.experience_list)) {
        expRows = body.experience_list;
      }
    }

    // ─── VALIDATION ──────────────────────────────────────────────────────────
    const cleanMobile = mobile.replace(/\D/g, '');
    const cleanAadhaar = aadhaarNo.replace(/\D/g, '');

    if (!fullName.trim()) {
      return NextResponse.json({ error: 'Full name as per Aadhaar is required.' }, { status: 400 });
    }
    if (cleanMobile.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number is required.' }, { status: 400 });
    }
    if (cleanAadhaar.length !== 12) {
      return NextResponse.json({ error: 'Valid 12-digit Aadhaar number is required.' }, { status: 400 });
    }
    if (!declarationAccepted) {
      return NextResponse.json({ error: 'You must accept the candidate declaration.' }, { status: 400 });
    }

    // ─── CALCULATE AGE ───────────────────────────────────────────────────────
    let calculatedAge: number | null = null;
    if (dob) {
      const birth = new Date(dob);
      const today = new Date();
      let a = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        a--;
      }
      calculatedAge = a >= 0 ? a : null;
    }

    // ─── GENERATE IDENTIFIERS ────────────────────────────────────────────────
    const generatedAppNo = await generateStandardApplicationNumber();
    const generatedTempId = await generateTemporaryApplicationId();

    // ─── UPLOAD ATTACHMENTS ──────────────────────────────────────────────────
    let photoUrl = '';
    let resumeUrl = '';
    let aadhaarDocUrl = '';
    let panDocUrl = '';

    if (photoFile) {
      photoUrl = await uploadFileBuffer('candidate-photos', photoFile, 'remote_photo');
    }
    if (resumeFile) {
      resumeUrl = await uploadFileBuffer('candidate-resumes', resumeFile, `${generatedTempId}_resume`);
    }
    if (aadhaarFile) {
      aadhaarDocUrl = await uploadFileBuffer('candidate-documents', aadhaarFile, `${generatedTempId}_aadhaar`);
    }
    if (panFile) {
      panDocUrl = await uploadFileBuffer('candidate-documents', panFile, `${generatedTempId}_pan`);
    }

    // ─── MASKS & FORMATTING ──────────────────────────────────────────────────
    const maskedAadhaar = `XXXX-XXXX-${cleanAadhaar.slice(-4)}`;
    const cleanPan = toCleanPAN(panNo);
    const maskedPan = cleanPan.length === 10 ? `${cleanPan.slice(0, 2)}XXX${cleanPan.slice(5, 9)}X` : cleanPan;
    const formattedCandidateName = salutation ? `${salutation} ${toTitleCase(fullName)}` : toTitleCase(fullName);

    // ─── RESOLVE POST & CATEGORY ─────────────────────────────────────────────
    let resolvedPostId: string | null = postId || null;
    let resolvedCategoryId: string | null = null;
    let resolvedTitle = designation || '';

    try {
      if (postId) {
        const { data: postRecord } = await supabase
          .from('posts')
          .select('id, category_id, title')
          .eq('id', postId)
          .maybeSingle();
        if (postRecord) {
          resolvedPostId = postRecord.id;
          resolvedCategoryId = postRecord.category_id;
          resolvedTitle = postRecord.title;
        }
      } else if (designation) {
        const { data: matchedPost } = await supabase
          .from('posts')
          .select('id, category_id, title')
          .ilike('title', `%${designation.trim()}%`)
          .limit(1)
          .maybeSingle();

        if (matchedPost) {
          resolvedPostId = matchedPost.id;
          resolvedCategoryId = matchedPost.category_id;
          resolvedTitle = matchedPost.title;
        } else {
          // Resolve category from designation
          const isTeaching = designation.toUpperCase().includes('PROFESSOR') ||
            designation.toUpperCase().includes('DIRECTOR') ||
            designation.toUpperCase().includes('LIBRARIAN');
          const categoryName = isTeaching ? 'Teaching' : 'Non-Teaching';
          const { data: matchedCat } = await supabase
            .from('staff_categories')
            .select('id')
            .ilike('name', `%${categoryName}%`)
            .limit(1)
            .maybeSingle();
          if (matchedCat) {
            resolvedCategoryId = matchedCat.id;
          }
        }
      }
    } catch (e) {
      console.warn('Post resolution warning:', e);
    }

    // ─── RESOLVE PREFERRED INSTITUTE ─────────────────────────────────────────
    let resolvedInstituteId: string | null = preferredInstituteId || null;
    if (!resolvedInstituteId && preferredCampus && preferredCampus !== 'Any Sanstha Campus') {
      try {
        const { data: matchedInst } = await supabase
          .from('institutes')
          .select('id')
          .or(`official_name.ilike.%${preferredCampus}%,short_name.ilike.%${preferredCampus}%`)
          .limit(1)
          .maybeSingle();
        if (matchedInst) {
          resolvedInstituteId = matchedInst.id;
        }
      } catch (e) {
        console.warn('Institute match warning:', e);
      }
    }

    // ─── PREPARE APPLICATION RECORD ──────────────────────────────────────────
    const fullAddress = [
      addressCity,
      addressTaluka && `Taluka ${addressTaluka}`,
      addressDistrict && `District ${addressDistrict}`,
      stateName || 'Maharashtra',
      pincode && `PIN ${pincode}`,
    ]
      .filter(Boolean)
      .map((p) => toTitleCase(p as string))
      .join(', ');

    const appPayload: Record<string, any> = {
      application_no: generatedAppNo,
      temp_id: generatedTempId,
      source_type: 'ONLINE_REMOTE',
      registration_status: 'DRAFT_PENDING_FEE',
      post_id: resolvedPostId,
      custom_post_title: resolvedTitle || designation || null,
      category_id: resolvedCategoryId,
      program_stream: stream || 'Engineering & Technology',
      course_name: toSmartTitleCase(course) || null,
      specialization: toSmartTitleCase(specialization) || null,
      preferred_institute_id: resolvedInstituteId,
      preferred_campus: preferredCampus || 'Any Sanstha Campus',
      candidate_name: formattedCandidateName,
      parent_spouse_name: toTitleCase(parentSpouseName) || null,
      photo_url: photoUrl || null,
      address: fullAddress,
      village_city: toTitleCase(addressCity) || null,
      taluka: toTitleCase(addressTaluka) || null,
      district: toTitleCase(addressDistrict) || 'Kolhapur',
      state: toTitleCase(stateName) || 'Maharashtra',
      pin_code: pincode.trim() || null,
      permanent_address: permanentAddress ? toTitleCase(permanentAddress) : fullAddress,
      contact_no: cleanMobile,
      email_id: toCleanEmail(email) || null,
      dob: dob || null,
      age: calculatedAge,
      gender: gender || null,
      marital_status: maritalStatus || 'Single',
      is_married: maritalStatus === 'Married',
      blood_group: bloodGroup || null,
      reservation_category: category || null,
      religion_caste: toTitleCase(religionCaste) || null,
      is_pwd: isPwd,
      pwd_type: isPwd ? pwdType.trim() || null : null,
      languages_known: languagesKnown.length > 0 ? languagesKnown : null,
      emergency_contact_name: toTitleCase(emergencyName) || null,
      emergency_contact_relation: toTitleCase(emergencyRelation) || null,
      emergency_contact_mobile: emergencyMobile ? emergencyMobile.replace(/\D/g, '') : null,
      aadhaar_masked: maskedAadhaar,
      aadhaar_full: cleanAadhaar,
      aadhaar_doc_url: aadhaarDocUrl || null,
      pan_masked: maskedPan || null,
      pan_full: cleanPan || null,
      pan_doc_url: panDocUrl || null,
      resume_url: resumeUrl || null,
      qualification_summary: toSmartTitleCase(qualificationSummary) || null,
      salary_expectation: salaryExpectation ? parseFloat(salaryExpectation) : null,
      declaration_accepted: true,
      signature_url: signatureUrl ? (signatureUrl.startsWith('data:') ? signatureUrl : `typed:${toTitleCase(signatureUrl)}`) : `typed:${formattedCandidateName}`,
      declaration_place: toTitleCase(declarationPlace) || 'Ambap',
      declaration_date: new Date().toISOString().split('T')[0],
      status: 'submitted',
      submission_channel: 'online_remote',
      total_teaching_exp_years: teachingExpYears ? parseFloat(teachingExpYears) : null,
      total_teaching_exp_months: teachingExpMonths ? parseInt(teachingExpMonths, 10) : null,
      total_industry_exp_years: industryExpYears ? parseFloat(industryExpYears) : null,
      total_industry_exp_months: industryExpMonths ? parseInt(industryExpMonths, 10) : null,
      last_organization: expRows[0]?.organization_name ? toTitleCase(expRows[0].organization_name) : null,
      last_designation: expRows[0]?.designation ? toTitleCase(expRows[0].designation) : null,
      last_salary: expRows[0]?.previous_salary ? parseFloat(expRows[0].previous_salary) : null,
    };

    // ─── INSERT APPLICATION (WITH SAFE RETRY FALLBACK) ────────────────────────
    let newApp: any = null;
    const { data: insertedApp, error: insertError } = await supabase
      .from('applications')
      .insert(appPayload)
      .select()
      .single();

    if (insertError) {
      console.warn('Initial insert error in /api/apply/online:', insertError.message);

      // Gracefully strip newer extended columns if DB schema doesn't have them yet
      const fallbackPayload = { ...appPayload };
      delete fallbackPayload.parent_spouse_name;
      delete fallbackPayload.religion_caste;
      delete fallbackPayload.marital_status;
      delete fallbackPayload.preferred_campus;
      delete fallbackPayload.last_organization;
      delete fallbackPayload.last_designation;
      delete fallbackPayload.last_salary;
      delete fallbackPayload.total_teaching_exp_months;
      delete fallbackPayload.total_industry_exp_months;

      if (insertError.message.includes('temp_id') || insertError.message.includes('source_type') || insertError.message.includes('registration_status')) {
        delete fallbackPayload.temp_id;
        delete fallbackPayload.source_type;
        delete fallbackPayload.registration_status;
      }

      const { data: retryApp, error: retryError } = await supabase
        .from('applications')
        .insert(fallbackPayload)
        .select()
        .single();

      if (retryError) {
        console.error('Fatal retry error in /api/apply/online:', retryError.message);
        throw retryError;
      }
      newApp = retryApp;
    } else {
      newApp = insertedApp;
    }

    if (!newApp) {
      throw new Error('Failed to create candidate pre-registration record.');
    }

    // ─── INSERT EDUCATIONAL DETAILS ──────────────────────────────────────────
    if (eduRows && eduRows.length > 0) {
      for (let idx = 0; idx < eduRows.length; idx++) {
        const edu = eduRows[idx];
        const hasContent =
          Boolean(edu.percentage) ||
          Boolean(edu.cgpa) ||
          Boolean(edu.score) ||
          Boolean(edu.board_university?.trim()) ||
          Boolean(edu.passing_year?.trim()) ||
          (Boolean(edu.degree_name?.trim()) && !['SSC', 'HSC'].includes(edu.degree_name.trim()));

        if (hasContent) {
          try {
            let docUrl = edu.doc_url || null;
            if (eduFiles[idx]) {
              docUrl = await uploadFileBuffer('candidate-documents', eduFiles[idx], `${generatedTempId}_edu_${idx}`);
            }

            const markingSys = (edu.marking_system || 'percentage').toLowerCase();
            const pct = markingSys === 'percentage' && edu.percentage
              ? parseFloat(edu.percentage)
              : (edu.cgpa ? parseFloat(edu.cgpa) * 10 : (edu.percentage ? parseFloat(edu.percentage) : null));

            const eduPayload: Record<string, any> = {
              application_id: newApp.id,
              level: edu.level,
              degree_name: toSmartTitleCase(edu.degree_name) || (edu.level.includes('Below 10th') ? 'Non-Matric / Below 10th' : edu.level.includes('S.S.C') ? 'SSC' : edu.level.includes('H.S.C') ? 'HSC' : edu.level),
              board_university: toSmartTitleCase(edu.board_university) || null,
              passing_year: edu.passing_year?.trim() || null,
              status_remark: edu.status_remark || null,
              marking_system: markingSys,
              percentage: pct,
              cgpa: markingSys === 'cgpa' && edu.cgpa ? parseFloat(edu.cgpa) : null,
              cgpa_scale: markingSys === 'cgpa' && edu.cgpa_scale ? parseFloat(edu.cgpa_scale) : 10,
              score: edu.score?.trim() || null,
              doc_url: docUrl,
            };

            const { error: eduErr } = await supabase.from('application_education').insert(eduPayload);
            if (eduErr && (eduErr.message.includes('marking_system') || eduErr.message.includes('cgpa') || eduErr.message.includes('score'))) {
              delete eduPayload.marking_system;
              delete eduPayload.cgpa;
              delete eduPayload.cgpa_scale;
              delete eduPayload.score;
              await supabase.from('application_education').insert(eduPayload);
            }
          } catch (e) {
            console.warn('Education row insert warning in /api/apply/online:', e);
          }
        }
      }
    }

    // ─── INSERT EXPERIENCE DETAILS ───────────────────────────────────────────
    if (!isFresher && expRows && expRows.length > 0) {
      for (const exp of expRows) {
        if (exp.organization_name?.trim() || exp.designation?.trim()) {
          try {
            await supabase.from('application_experience').insert({
              application_id: newApp.id,
              is_fresher: false,
              organization_name: toSmartTitleCase(exp.organization_name),
              designation: toTitleCase(exp.designation),
              years_experience: exp.years_experience ? parseFloat(exp.years_experience) : null,
              previous_salary: exp.previous_salary ? parseFloat(exp.previous_salary) : null,
            });
          } catch (e) {
            console.warn('Experience insert warning in /api/apply/online:', e);
          }
        }
      }
    } else {
      try {
        await supabase.from('application_experience').insert({
          application_id: newApp.id,
          is_fresher: true,
        });
      } catch (e) {
        console.warn('Experience insert fresher warning:', e);
      }
    }

    // ─── RETURN RESPONSE (REDIRECT FOR HTML FORM OR JSON FOR FETCH) ──────────
    const prescribedFee = 50; // Standard pre-registration fee settled physically at front desk

    if (acceptsHtml) {
      const redirectUrl = new URL('/apply/online', request.url);
      redirectUrl.searchParams.set('success', '1');
      redirectUrl.searchParams.set('temp_id', generatedTempId);
      redirectUrl.searchParams.set('app_no', generatedAppNo);
      redirectUrl.searchParams.set('name', formattedCandidateName);
      redirectUrl.searchParams.set('post', resolvedTitle || designation);
      redirectUrl.searchParams.set('stream', stream);
      redirectUrl.searchParams.set('mobile', cleanMobile);
      redirectUrl.searchParams.set('fee', prescribedFee.toString());
      return NextResponse.redirect(redirectUrl, 303);
    }

    return NextResponse.json({
      success: true,
      temp_id: generatedTempId,
      application_no: generatedAppNo,
      candidate_name: formattedCandidateName,
      designation: resolvedTitle || designation,
      program_stream: stream,
      contact_no: cleanMobile,
      status: 'SUBMITTED',
      message: 'Online pre-registration recorded successfully. Physical verification pending at Central HR Front Desk.',
      redirect_url: `/apply/online?success=1&temp_id=${generatedTempId}`,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Unhandled error in /api/apply/online:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error while processing online pre-registration.' },
      { status: 500 }
    );
  }
}
