export type OrganizationSettings = {
  id: string;
  name: string;
  address: string;
  registration_no?: string;
  registration_date?: string;
  tagline?: string;
  logo_url?: string;
  president_name?: string;
  hr_head_name?: string;
  contact_email?: string;
  contact_phone?: string;
  receipt_prefix: string;
  receipt_starting_no: number;
  app_no_prefix?: string;
  fee_receipt_prefix?: string;
  number_digits?: number;
  year_basis?: 'calendar' | 'financial';
  restart_yearly?: boolean;
  receipt_header_text?: string;
  receipt_footer_text?: string;
  receipt_copies_count: number;
  currency_symbol: string;
  created_at: string;
  updated_at: string;
};

export type InstituteApproval = {
  id?: string;
  institute_id?: string;
  body_name: string; // e.g. AICTE, UGC, DTE, PCI, NCTE, MSBTE, University
  reference_no?: string;
  approval_date?: string;
  valid_upto_date?: string;
  letter_doc_url?: string;
  letter_file?: File;
  created_at?: string;
};

export type InstituteCourse = {
  id?: string;
  institute_id?: string;
  program_stream?: string; // 'Engineering & Technology', 'Management (MBA)', 'Pharmacy', 'BAMS', 'BHMS', 'Nursing', 'Education', 'ITI', 'Arts, Commerce & Science', 'School Education', 'Other'
  course_name: string; // e.g. B.Tech Computer Science
  level: string; // 'Diploma' | 'UG' | 'PG' | 'Doctorate' | 'Junior College' | 'School' | 'ITI'
  duration_years?: string;
  sanctioned_intake?: number;
  approving_authority?: string;
  is_active: boolean;
  created_at?: string;
};

export type InstituteHeadHistory = {
  id?: string;
  institute_id: string;
  head_name: string;
  designation: string;
  mobile?: string;
  email?: string;
  from_date?: string;
  to_date?: string;
  reason_for_change?: string;
  created_at?: string;
};

export type Institute = {
  id: string;
  name?: string; // Legacy
  official_name: string; // Exact approved name for appointment orders
  short_name?: string;
  institute_type: string; // Engineering College, Pharmacy College, Polytechnic, etc.
  code?: string; // DTE / U-DISE / College Code
  establishment_year?: number;
  address?: string; // Legacy
  address_line?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pincode?: string;
  office_phone?: string;
  official_email: string;
  website?: string;
  head_name?: string;
  head_designation?: string;
  head_phone?: string; // Legacy
  head_mobile?: string;
  head_email?: string;
  head_user_id?: string;
  second_contact_name?: string;
  second_contact_designation?: string;
  second_contact_mobile?: string;
  second_contact_email?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  institute_approvals?: InstituteApproval[];
  institute_courses?: InstituteCourse[];
  institute_head_history?: InstituteHeadHistory[];
  institute_staff_strength?: InstituteStaffStrength[];
};

export type InstituteStaffStrength = {
  id: string;
  institute_id: string;
  post_id: string;
  course_id?: string | null;
  post_type: 'Teaching' | 'Non-Teaching';
  program_stream?: string | null;
  sanctioned_posts: number;
  available_strength: number;
  variance: number;
  regulatory_body?: string | null;
  remarks?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
  posts?: Post;
  institutes?: Institute;
  institute_courses?: InstituteCourse;
};

export type StaffCategory = {
  id: string;
  name: string;
  description?: string;
  application_fee: number;
  is_active: boolean;
  created_at: string;
};

export type Post = {
  id: string;
  category_id: string;
  institute_id?: string; // Optional: Trust-wide if null, or institute-specific
  program_stream?: string; // e.g. 'All Programs / General', 'Engineering & Technology', 'Pharmacy', 'Management (MBA)', etc.
  title: string;
  qualification_requirement?: string;
  is_active: boolean;
  created_at: string;
  staff_categories?: StaffCategory;
  institutes?: Institute;
};

export type PaymentMode = {
  id: string;
  name: string;
  is_active: boolean;
};

export type UserProfile = {
  id: string;
  username?: string;
  login_name?: string;
  email: string;
  mobile_number?: string;
  password?: string;
  full_name: string;
  role: 'admin_head_hr' | 'receptionist' | 'institute_head' | 'appointment_officer';
  linked_institute_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
};

export type ApplicationEducation = {
  id?: string;
  application_id?: string;
  level: string; // 'SSC' | 'HSC' | 'Diploma' | 'UG' | 'PG' | 'Ph.D. / Doctorate' | 'Other'
  degree_name?: string;
  board_university?: string; // School / College / Board / University Name
  passing_year?: string; // Year of passing (e.g. 2018, 2023)
  percentage?: number;
  marking_system?: 'percentage' | 'cgpa';
  score?: string; // Obtained / Total marks or CGPA string
  cgpa?: number;
  cgpa_scale?: number;
  status_remark?: string; // 'Awarded' | 'Pursuing (Scholar)' for Ph.D. or 'Qualified' | 'Not Qualified' for NET/SET/GATE
  doc_url?: string;
  doc_file?: File;
};

export type ApplicationExperience = {
  id?: string;
  application_id?: string;
  is_fresher?: boolean;
  organization_name?: string;
  designation?: string;
  years_experience?: number;
  total_exp_months?: number;
  previous_salary?: number;
};

export type Application = {
  id: string;
  application_no: string;
  post_id?: string;
  custom_post_title?: string;
  category_id?: string;
  program_stream?: string; // Academic Program Stream / Discipline
  course_name?: string; // Course / Programme (e.g. B.Tech Computer Science, MBA, B.Pharm)
  specialization?: string; // Subject / Specialization (e.g. AI & ML, Pharmacognosy, Finance)
  preferred_institute_id?: string;
  preferred_campus?: string;
  candidate_name: string;
  parent_spouse_name?: string;
  photo_url?: string;
  address: string;
  village_city?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pin_code?: string;
  contact_no: string;
  email_id?: string;
  dob?: string;
  age?: number;
  is_married: boolean;
  marital_status?: string;
  gender?: string;
  blood_group?: string;
  reservation_category?: string;
  religion_caste?: string;
  is_pwd?: boolean;
  pwd_type?: string;
  languages_known?: string[];
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_mobile?: string;
  permanent_address?: string;
  total_teaching_exp_years?: number;
  total_teaching_exp_months?: number;
  total_industry_exp_years?: number;
  total_industry_exp_months?: number;
  last_organization?: string;
  last_designation?: string;
  last_salary?: number;
  aadhaar_masked: string;
  aadhaar_full?: string;
  aadhaar_doc_url?: string;
  pan_masked: string;
  pan_full?: string;
  pan_doc_url?: string;
  resume_url?: string; // Secure CV / Resume document URL (PDF/Image)
  caste_cert_url?: string;
  qualification_summary?: string;
  salary_expectation?: number;
  declaration_accepted: boolean;
  signature_url?: string;
  declaration_place?: string;
  declaration_date?: string;
  status:
    | 'submitted'
    | 'verified_approved'
    | 'fee_paid'
    | 'forwarded_to_institute'
    | 'ready_for_physical_interview'
    | 'interview_scheduled'
    | 'selected_recommended'
    | 'management_approved'
    | 'hold'
    | 'institute_reviewed'
    | 'rejected'
    | 'cancelled';
  submission_channel: 'qr_self' | 'receptionist_entry' | 'online_remote' | 'frontdesk_assisted';
  source_type?: 'WALKIN_DESK' | 'ONLINE_REMOTE';
  registration_status?: 'DRAFT_PENDING_FEE' | 'COMPLETED_PAID';
  temp_id?: string | null;
  fee_receipt_no?: string | null;
  collected_by_user_id?: string | null;
  collected_at?: string | null;
  verified_by?: string;
  verified_at?: string;
  verification_remarks?: string;
  is_cancelled?: boolean;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;

  // Central HR Forwarding Module
  forwarded_to_institute_id?: string;
  forwarded_to_head_name?: string;
  forwarded_to_head_email?: string;
  forwarded_to_head_designation?: string;
  central_hr_remarks?: string;
  forwarded_at?: string;
  forwarded_by?: string;

  // Institute Head Physical Interview & Evaluation Fields
  institute_recommendation?: 'selected' | 'recommended' | 'hold' | 'rejected' | null;
  institute_remarks?: string | null; // Justification & evaluation remarks
  interview_conducted_date?: string | null; // Physical interview date & time
  interview_venue?: string | null; // Campus room/venue/location notes
  interview_panel_members?: string | null; // Panel members / evaluators list
  interview_panel_remarks?: string | null; // Panel remarks & performance notes
  interview_score?: number | null; // Evaluation score / marks (out of 100)
  interview_teaching_demo_score?: number | null; // Teaching demonstration / viva score
  physical_docs_verified?: boolean | null; // Original documents verified
  physical_docs_status?: 'verified_all_clear' | 'discrepancy_observed' | 'provisional_pending_docs' | null;
  physical_docs_remarks?: string | null; // Document verification notes
  interview_requested?: boolean;
  interview_suggested_date?: string | null;
  interview_instructions?: string | null;
  reviewed_by_head_name?: string | null;
  reviewed_at?: string | null;
  interview_evaluation_report_url?: string | null;
  head_signature_url?: string | null;

  // Management Approval & Administrative Appointment Workflow Fields
  management_approved_at?: string | null;
  management_approved_by?: string | null;
  management_approval_remarks?: string | null;
  joining_date?: string | null; // Candidate Date of Joining
  mandatory_bond_details?: string | null; // Mandatory Bond Submissions or compliance requirements
  confirmed_designation?: string | null; // Confirmed Designation recommendation
  pay_scale?: string | null; // Pay Scale details
  basic_pay?: number | null; // Basic Pay
  agreed_total_salary?: number | null; // Agreed Total Salary Amount (Compulsory)
  appointment_instructions?: string | null; // Additional customized important instructions or remarks
  appointment_order_workflow_initiated?: boolean | null; // Flag to initiate official appointment order generation
  appointment_order_status?: 'initiated' | 'pending_generation' | 'order_generated' | 'order_dispatched' | 'joined' | null;
  pushed_to_institute_portal?: boolean | null;
  pushed_to_appointment_section?: boolean | null;
  downstream_pushed_at?: string | null;
  downstream_pushed_by?: string | null;

  created_at: string;
  updated_at: string;
  posts?: Post;
  staff_categories?: StaffCategory;
  institutes?: Institute;
  forwarded_institutes?: Institute;
  fee_receipts?: FeeReceipt[];
  application_education?: ApplicationEducation[];
  application_experience?: ApplicationExperience[];
};

export type Notification = {
  id: string;
  recipient_role: 'admin_head_hr' | 'receptionist' | 'institute_head' | 'appointment_officer';
  recipient_email?: string;
  recipient_institute_id?: string;
  title: string;
  message: string;
  type: 'forwarded_to_institute' | 'institute_reviewed' | 'interview_requested' | 'management_approved' | 'appointment_order_initiated' | 'downstream_propagated' | 'system_alert';
  application_id?: string;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
};

export type ApplicationWorkflowLog = {
  id: string;
  application_id: string;
  action: 'forwarded_to_institute' | 'institute_reviewed' | 'interview_requested' | 'interview_scheduled' | 'management_approved' | 'downstream_propagated' | 'status_changed' | 'appointment_order_status_updated';
  actor_name: string;
  actor_role: string;
  remarks?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
};

export type FeeReceipt = {
  id: string;
  receipt_no: string;
  application_id: string;
  amount: number;
  amount_in_words: string;
  payment_mode: string;
  reference_no?: string;
  issued_by?: string;
  issued_at: string;
  is_cancelled?: boolean;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  applications?: Application;
  user_profiles?: UserProfile;
};
