-- ==============================================================================
-- SMARTHR - Complete Database Schema (Clean Delivery - No Hardcoded Trust Data)
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANISATION SETTINGS (Single-row master config for the Trust)
CREATE TABLE IF NOT EXISTS organization_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    registration_no VARCHAR(100),
    registration_date VARCHAR(50),
    tagline VARCHAR(255),
    logo_url TEXT,
    president_name VARCHAR(150),
    hr_head_name VARCHAR(150),
    contact_email VARCHAR(150),
    contact_phone VARCHAR(50),
    
    -- Receipt Settings
    receipt_prefix VARCHAR(50) DEFAULT 'REC/',
    receipt_starting_no INT DEFAULT 1,
    receipt_header_text TEXT,
    receipt_footer_text TEXT DEFAULT 'This is a computer-generated fee receipt.',
    receipt_copies_count INT DEFAULT 2, -- Default: Duplicate (Office + Candidate)
    
    -- Currency & Formatting
    currency_symbol VARCHAR(10) DEFAULT '₹',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. INSTITUTES / UNITS UNDER THE TRUST
CREATE TABLE IF NOT EXISTS institutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    address TEXT,
    head_name VARCHAR(150),
    head_email VARCHAR(150),
    head_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. STAFF CATEGORIES (Decides the application fee)
CREATE TABLE IF NOT EXISTS staff_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g. Teaching, Non-Teaching, House-Keeping
    description TEXT,
    application_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. POST MASTER
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES staff_categories(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL, -- e.g. Assistant Professor, Clerk, Peon
    qualification_requirement TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. PAYMENT MODES
CREATE TABLE IF NOT EXISTS payment_modes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- Cash, UPI / QR, Demand Draft, Bank Transfer
    is_active BOOLEAN DEFAULT true
);

-- 6. USER PROFILES (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(150) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'receptionist', -- 'admin_head_hr', 'receptionist', 'institute_head'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. CANDIDATE APPLICATIONS
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_no VARCHAR(50) UNIQUE NOT NULL,
    
    -- Post Selection
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    custom_post_title VARCHAR(150), -- Used if candidate picked "Other"
    category_id UUID REFERENCES staff_categories(id) ON DELETE SET NULL, -- Resolved category for fee
    
    -- Personal Information
    candidate_name VARCHAR(200) NOT NULL,
    photo_url TEXT,
    address TEXT NOT NULL,
    village_city TEXT,
    taluka TEXT,
    district TEXT,
    state TEXT,
    pin_code VARCHAR(10),
    contact_no VARCHAR(20) NOT NULL,
    email_id VARCHAR(150),
    dob DATE,
    age INT,
    is_married BOOLEAN DEFAULT false,
    
    -- Identification
    aadhaar_masked VARCHAR(20) NOT NULL, -- e.g. XXXX XXXX 1234
    aadhaar_full VARCHAR(20),            -- Encrypted / restricted full number
    aadhaar_doc_url TEXT,
    pan_masked VARCHAR(20) NOT NULL,     -- e.g. XXXXX 1234 X
    pan_full VARCHAR(20),
    pan_doc_url TEXT,
    
    -- Overview
    qualification_summary VARCHAR(255),
    salary_expectation NUMERIC(12, 2),
    
    -- Declaration & Signature
    declaration_accepted BOOLEAN DEFAULT true,
    signature_url TEXT,
    declaration_place VARCHAR(100),
    declaration_date DATE DEFAULT CURRENT_DATE,
    
    -- Status Workflow
    status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'verified_approved', 'fee_paid', 'rejected'

    -- Remote Pre-Registration & Settlement Fields
    source_type VARCHAR(50) DEFAULT 'WALKIN_DESK', -- 'WALKIN_DESK', 'ONLINE_REMOTE'
    registration_status VARCHAR(50) DEFAULT 'COMPLETED_PAID', -- 'DRAFT_PENDING_FEE', 'COMPLETED_PAID'
    temp_id VARCHAR(50) UNIQUE, -- e.g. 'TMP-2026-00001' for remote pre-registered candidates
    fee_receipt_no VARCHAR(100),
    collected_by_user_id UUID REFERENCES user_profiles(id),
    collected_at TIMESTAMP WITH TIME ZONE,
    
    -- Submission metadata
    submission_channel VARCHAR(30) DEFAULT 'qr_self', -- 'qr_self', 'receptionist_entry'
    verified_by UUID REFERENCES user_profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_remarks TEXT,
    interview_evaluation_report_url TEXT,
    head_signature_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. APPLICATION EDUCATION DETAILS (1 to many)
CREATE TABLE IF NOT EXISTS application_education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    level VARCHAR(50) NOT NULL, -- 'SSC', 'HSC', 'Diploma', 'UG', 'PG', 'Other'
    degree_name VARCHAR(150),
    percentage NUMERIC(5, 2),
    marking_system VARCHAR(20) NOT NULL DEFAULT 'percentage',
    cgpa NUMERIC(6, 3),
    cgpa_scale NUMERIC(6, 3),
    doc_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. APPLICATION EXPERIENCE DETAILS (1 to many)
CREATE TABLE IF NOT EXISTS application_experience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    is_fresher BOOLEAN DEFAULT false,
    organization_name VARCHAR(200),
    designation VARCHAR(150),
    years_experience NUMERIC(4, 1),
    previous_salary NUMERIC(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. FEE RECEIPTS
CREATE TABLE IF NOT EXISTS fee_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_no VARCHAR(50) UNIQUE NOT NULL,
    application_id UUID REFERENCES applications(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    amount_in_words VARCHAR(255) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
    reference_no VARCHAR(100),
    issued_by UUID REFERENCES user_profiles(id),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sequences & Auto Numbering Helpers
CREATE SEQUENCE IF NOT EXISTS application_number_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START WITH 1001;

-- STORAGE BUCKETS SETUP
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('candidate-photos', 'candidate-photos', true),
    ('candidate-signatures', 'candidate-signatures', true),
    ('candidate-documents', 'candidate-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_receipts ENABLE ROW LEVEL SECURITY;

-- 1) Public Read Policies for candidate form dropdowns
CREATE POLICY "Public read active posts" ON posts FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active categories" ON staff_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public read org settings" ON organization_settings FOR SELECT USING (true);
CREATE POLICY "Public read institutes" ON institutes FOR SELECT USING (is_active = true);
CREATE POLICY "Public read payment modes" ON payment_modes FOR SELECT USING (is_active = true);

-- 2) Public Insert Policy for Candidate Applications (for QR/Walk-in form submission)
CREATE POLICY "Allow candidate submission" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow candidate education submission" ON application_education FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow candidate experience submission" ON application_experience FOR INSERT WITH CHECK (true);

-- 3) Authenticated Staff full access
CREATE POLICY "Staff all access org_settings" ON organization_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff all access institutes" ON institutes FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff all access categories" ON staff_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff all access posts" ON posts FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff all access payment_modes" ON payment_modes FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff all access user_profiles" ON user_profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff all access applications" ON applications FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff all access education" ON application_education FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff all access experience" ON application_experience FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff all access receipts" ON fee_receipts FOR ALL TO authenticated USING (true);

-- Storage Policies
CREATE POLICY "Public photo upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('candidate-photos', 'candidate-signatures', 'candidate-documents'));
CREATE POLICY "Public read photos/signatures" ON storage.objects FOR SELECT USING (bucket_id IN ('candidate-photos', 'candidate-signatures'));
CREATE POLICY "Auth read private documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'candidate-documents');
