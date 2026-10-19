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
    let stream = '';
    let course = '';
    let specialization = '';
    let preferredCampus = '';
    let salutation = 'Mr.';
    let fullName = '';
    let parentSpouseName = '';
    let gender = 'Male';
    let dob = '';
    let maritalStatus = 'Single';
    let bloodGroup = '';
    let category = 'OPEN';
    let religionCaste = '';
    let isPwd = false;
    let aadhaarNo = '';
    let panNo = '';
    let mobile = '';
    let email = '';
    let addressCity = '';
    let addressTaluka = '';
    let addressDistrict = 'Kolhapur';
    let pincode = '';
    let isFresher = false;
    let totalExpYears = '';
    let totalExpMonths = '';
    let lastOrganization = '';
    let lastDesignation = '';
    let lastSalary = '';
    let declarationAccepted = false;
    let digitalSignature = '';

    // Files
    let photoFile: File | null = null;
    let resumeFile: File | null = null;

    // Qualifications
    let eduRows: Array<{
      level: string;
      degree_name: string;
      board_university: string;
      passing_year: string;
      marking_system: string;
      score: string;
      percentage: string;
    }> = [];

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();

      designation = (formData.get('designation') as string) || '';
      stream = (formData.get('stream') as string) || '';
      course = (formData.get('course') as string) || '';
      specialization = (formData.get('specialization') as string) || '';
      preferredCampus = (formData.get('preferred_campus') as string) || '';
      salutation = (formData.get('salutation') as string) || 'Mr.';
      fullName = (formData.get('full_name') as string) || '';
      parentSpouseName = (formData.get('parent_spouse_name') as string) || '';
      gender = (formData.get('gender') as string) || 'Male';
      dob = (formData.get('dob') as string) || '';
      maritalStatus = (formData.get('marital_status') as string) || 'Single';
      bloodGroup = (formData.get('blood_group') as string) || '';
      category = (formData.get('category') as string) || 'OPEN';
      religionCaste = (formData.get('religion_caste') as string) || '';
      const pwdVal = (formData.get('is_pwd') as string) || '';
      isPwd = pwdVal.toLowerCase() === 'yes' || pwdVal === 'true';

      aadhaarNo = (formData.get('aadhaar_no') as string) || '';
      panNo = (formData.get('pan_no') as string) || '';
      mobile = (formData.get('mobile') as string) || '';
      email = (formData.get('email') as string) || '';
      addressCity = (formData.get('address_city') as string) || '';
      addressTaluka = (formData.get('address_taluka') as string) || '';
      addressDistrict = (formData.get('address_district') as string) || '';
      pincode = (formData.get('pincode') as string) || '';

      const fresherVal = (formData.get('is_fresher') as string) || '';
      isFresher = fresherVal.toLowerCase() === 'yes' || fresherVal === 'true' || fresherVal === 'on';

      totalExpYears = (formData.get('total_exp_years') as string) || '';
      totalExpMonths = (formData.get('total_exp_months') as string) || '';
      lastOrganization = (formData.get('last_organization') as string) || '';
      lastDesignation = (formData.get('last_designation') as string) || '';
      lastSalary = (formData.get('last_salary') as string) || '';

      const declVal = (formData.get('declaration') as string) || '';
      declarationAccepted = declVal === 'on' || declVal === 'true' || declVal === '1' || declVal === 'yes';
      digitalSignature = (formData.get('digital_signature') as string) || '';

      // Files
      const photo = formData.get('photo');
      if (photo && typeof photo === 'object' && 'name' in photo && (photo as File).size > 0) {
        photoFile = photo as File;
      }
      const resume = formData.get('resume');
      if (resume && typeof resume === 'object' && 'name' in resume && (resume as File).size > 0) {
        resumeFile = resume as File;
      }

      // Educational qualifications table
      eduRows = [
        {
          level: 'SSC (10th)',
          degree_name: (formData.get('edu_degree_ssc') as string) || 'SSC',
          board_university: (formData.get('edu_board_ssc') as string) || '',
          passing_year: (formData.get('edu_year_ssc') as string) || '',
          marking_system: (formData.get('edu_eval_ssc') as string) || 'Percentage',
          score: (formData.get('edu_score_ssc') as string) || '',
          percentage: (formData.get('edu_percentage_ssc') as string) || '',
        },
        {
          level: 'HSC (12th) / Diploma',
          degree_name: (formData.get('edu_degree_hsc') as string) || '',
          board_university: (formData.get('edu_board_hsc') as string) || '',
          passing_year: (formData.get('edu_year_hsc') as string) || '',
          marking_system: (formData.get('edu_eval_hsc') as string) || 'Percentage',
          score: (formData.get('edu_score_hsc') as string) || '',
          percentage: (formData.get('edu_percentage_hsc') as string) || '',
        },
        {
          level: 'Graduation / UG',
          degree_name: (formData.get('edu_degree_ug') as string) || '',
          board_university: (formData.get('edu_board_ug') as string) || '',
          passing_year: (formData.get('edu_year_ug') as string) || '',
          marking_system: (formData.get('edu_eval_ug') as string) || 'CGPA',
          score: (formData.get('edu_score_ug') as string) || '',
          percentage: (formData.get('edu_percentage_ug') as string) || '',
        },
        {
          level: 'Post-Graduation / PG',
          degree_name: (formData.get('edu_degree_pg') as string) || '',
          board_university: (formData.get('edu_board_pg') as string) || '',
          passing_year: (formData.get('edu_year_pg') as string) || '',
          marking_system: (formData.get('edu_eval_pg') as string) || 'CGPA',
          score: (formData.get('edu_score_pg') as string) || '',
          percentage: (formData.get('edu_percentage_pg') as string) || '',
        },
      ];
    } else {
      // JSON Payload
      const body = await request.json();
      designation = body.designation || '';
      stream = body.stream || '';
      course = body.course || '';
      specialization = body.specialization || '';
      preferredCampus = body.preferred_campus || '';
      salutation = body.salutation || 'Mr.';
      fullName = body.full_name || '';
      parentSpouseName = body.parent_spouse_name || '';
      gender = body.gender || 'Male';
      dob = body.dob || '';
      maritalStatus = body.marital_status || 'Single';
      bloodGroup = body.blood_group || '';
      category = body.category || 'OPEN';
      religionCaste = body.religion_caste || '';
      isPwd = Boolean(body.is_pwd === 'Yes' || body.is_pwd === true);
      aadhaarNo = body.aadhaar_no || '';
      panNo = body.pan_no || '';
      mobile = body.mobile || '';
      email = body.email || '';
      addressCity = body.address_city || '';
      addressTaluka = body.address_taluka || '';
      addressDistrict = body.address_district || '';
      pincode = body.pincode || '';
      isFresher = Boolean(body.is_fresher === 'Yes' || body.is_fresher === true);
      totalExpYears = body.total_exp_years?.toString() || '';
      totalExpMonths = body.total_exp_months?.toString() || '';
      lastOrganization = body.last_organization || '';
      lastDesignation = body.last_designation || '';
      lastSalary = body.last_salary?.toString() || '';
      declarationAccepted = Boolean(body.declaration);
      digitalSignature = body.digital_signature || '';

      if (Array.isArray(body.qualifications)) {
        eduRows = body.qualifications;
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

    if (photoFile) {
      photoUrl = await uploadFileBuffer('candidate-photos', photoFile, 'remote_photo');
    }
    if (resumeFile) {
      resumeUrl = await uploadFileBuffer('candidate-resumes', resumeFile, `${generatedTempId}_resume`);
    }

    // ─── MASKS & FORMATTING ──────────────────────────────────────────────────
    const maskedAadhaar = `XXXX-XXXX-${cleanAadhaar.slice(-4)}`;
    const cleanPan = toCleanPAN(panNo);
    const maskedPan = cleanPan.length === 10 ? `${cleanPan.slice(0, 2)}XXX${cleanPan.slice(5, 9)}X` : cleanPan;
    const formattedCandidateName = salutation ? `${salutation} ${toTitleCase(fullName)}` : toTitleCase(fullName);

    // ─── RESOLVE POST & CATEGORY ─────────────────────────────────────────────
    let resolvedPostId: string | null = null;
    let resolvedCategoryId: string | null = null;

    try {
      if (designation) {
        const { data: matchedPost } = await supabase
          .from('posts')
          .select('id, category_id, title')
          .ilike('title', `%${designation.trim()}%`)
          .limit(1)
          .maybeSingle();

        if (matchedPost) {
          resolvedPostId = matchedPost.id;
          resolvedCategoryId = matchedPost.category_id;
        } else {
          // Check staff category based on title
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
    let resolvedInstituteId: string | null = null;
    if (preferredCampus && preferredCampus !== 'Any Sanstha Campus') {
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
      'Maharashtra',
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
      custom_post_title: designation || null,
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
      state: 'Maharashtra',
      pin_code: pincode.trim() || null,
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
      aadhaar_masked: maskedAadhaar,
      aadhaar_full: cleanAadhaar,
      pan_masked: maskedPan || null,
      pan_full: cleanPan || null,
      resume_url: resumeUrl || null,
      declaration_accepted: true,
      signature_url: digitalSignature ? `typed:${toTitleCase(digitalSignature)}` : `typed:${formattedCandidateName}`,
      declaration_place: toTitleCase(addressCity) || 'Online Remote',
      declaration_date: new Date().toISOString().split('T')[0],
      status: 'submitted',
      submission_channel: 'online_remote',
      total_teaching_exp_years: totalExpYears ? parseFloat(totalExpYears) : null,
      total_teaching_exp_months: totalExpMonths ? parseInt(totalExpMonths) : null,
      last_organization: toTitleCase(lastOrganization) || null,
      last_designation: toTitleCase(lastDesignation) || null,
      last_salary: lastSalary ? parseFloat(lastSalary) : null,
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
      for (const edu of eduRows) {
        if (edu.degree_name?.trim() || edu.board_university?.trim() || edu.percentage?.toString().trim() || edu.score?.trim()) {
          try {
            const eduPayload: Record<string, any> = {
              application_id: newApp.id,
              level: edu.level,
              degree_name: toSmartTitleCase(edu.degree_name) || edu.level,
              board_university: toSmartTitleCase(edu.board_university) || null,
              passing_year: edu.passing_year?.trim() || null,
              marking_system: (edu.marking_system || 'percentage').toLowerCase(),
              score: edu.score?.trim() || null,
              percentage: edu.percentage ? parseFloat(edu.percentage.toString()) : null,
            };

            const { error: eduErr } = await supabase.from('application_education').insert(eduPayload);
            if (eduErr && eduErr.message.includes('score')) {
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
    if (!isFresher && (lastOrganization.trim() || lastDesignation.trim() || totalExpYears)) {
      try {
        await supabase.from('application_experience').insert({
          application_id: newApp.id,
          is_fresher: false,
          organization_name: toTitleCase(lastOrganization) || null,
          designation: toTitleCase(lastDesignation) || null,
          years_experience: totalExpYears ? parseFloat(totalExpYears) : null,
          total_exp_months: totalExpMonths ? parseInt(totalExpMonths) : null,
          previous_salary: lastSalary ? parseFloat(lastSalary) : null,
        });
      } catch (e) {
        console.warn('Experience insert warning in /api/apply/online:', e);
      }
    }

    // ─── RETURN RESPONSE (REDIRECT FOR HTML FORM OR JSON FOR FETCH) ──────────
    const prescribedFee = 50; // Standard prescribed pre-registration fee collected at front desk

    if (acceptsHtml) {
      const redirectUrl = new URL('/apply/online', request.url);
      redirectUrl.searchParams.set('success', '1');
      redirectUrl.searchParams.set('temp_id', generatedTempId);
      redirectUrl.searchParams.set('app_no', generatedAppNo);
      redirectUrl.searchParams.set('name', formattedCandidateName);
      redirectUrl.searchParams.set('post', designation);
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
      designation: designation,
      program_stream: stream,
      contact_no: cleanMobile,
      fee: prescribedFee,
      status: 'DRAFT_PENDING_FEE',
      message: 'Online pre-registration recorded successfully. Physical fee settlement (₹50) pending at Front Desk.',
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
