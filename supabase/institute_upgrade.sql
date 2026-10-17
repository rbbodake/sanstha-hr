-- ==============================================================================
-- SMARTHR - Institute / College Master Upgrade Migration
-- Safe & Idempotent (Preserves all existing data)
-- ==============================================================================

-- 1. Upgrade the existing `institutes` table
ALTER TABLE institutes 
    ADD COLUMN IF NOT EXISTS official_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS short_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS institute_type VARCHAR(100) DEFAULT 'Engineering College',
    ADD COLUMN IF NOT EXISTS establishment_year INT,
    ADD COLUMN IF NOT EXISTS address_line TEXT,
    ADD COLUMN IF NOT EXISTS taluka VARCHAR(100),
    ADD COLUMN IF NOT EXISTS district VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Maharashtra',
    ADD COLUMN IF NOT EXISTS pincode VARCHAR(10),
    ADD COLUMN IF NOT EXISTS office_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS official_email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS website VARCHAR(200),
    ADD COLUMN IF NOT EXISTS head_designation VARCHAR(100) DEFAULT 'Principal',
    ADD COLUMN IF NOT EXISTS head_mobile VARCHAR(20),
    ADD COLUMN IF NOT EXISTS head_user_id UUID,
    ADD COLUMN IF NOT EXISTS second_contact_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS second_contact_designation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS second_contact_mobile VARCHAR(20),
    ADD COLUMN IF NOT EXISTS second_contact_email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Sync official_name from legacy name if official_name was null
UPDATE institutes SET official_name = name WHERE official_name IS NULL AND name IS NOT NULL;
UPDATE institutes SET short_name = name WHERE short_name IS NULL AND name IS NOT NULL;

-- 2. Create `institute_approvals` (Multi-body apex/regulatory approvals)
CREATE TABLE IF NOT EXISTS institute_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    body_name VARCHAR(100) NOT NULL, -- e.g. AICTE, UGC, DTE Maharashtra, PCI, NCTE, University, Board
    reference_no VARCHAR(150),
    approval_date DATE,
    valid_upto_date DATE,
    letter_doc_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create `institute_courses` (Programmes & Departments run by Institute)
CREATE TABLE IF NOT EXISTS institute_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    course_name VARCHAR(200) NOT NULL, -- e.g. B.Tech Computer Science and Engineering
    level VARCHAR(100) NOT NULL DEFAULT 'UG', -- Diploma, UG, PG, Doctorate, Junior College, School, ITI
    duration_years VARCHAR(50) DEFAULT '4 Years',
    sanctioned_intake INT,
    approving_authority VARCHAR(150),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create `institute_head_history` (Audit trail when Principal/Director changes)
CREATE TABLE IF NOT EXISTS institute_head_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    head_name VARCHAR(150) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    mobile VARCHAR(20),
    email VARCHAR(150),
    from_date DATE,
    to_date DATE,
    reason_for_change TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Add institute linking to `user_profiles`
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS linked_institute_id UUID REFERENCES institutes(id) ON DELETE SET NULL;

-- 6. Add preferred institute column to `applications` (for candidate preference)
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS preferred_institute_id UUID REFERENCES institutes(id) ON DELETE SET NULL;

-- 7. Add optional institute linking to `posts` (Option A: Trust-wide or Institute-specific)
ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES institutes(id) ON DELETE SET NULL;

-- 8. Storage bucket for institute approval letters
INSERT INTO storage.buckets (id, name, public) 
VALUES ('institute-documents', 'institute-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Enable RLS and Policies for new tables
ALTER TABLE institute_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE institute_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE institute_head_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public institute approvals access" ON institute_approvals;
DROP POLICY IF EXISTS "Public institute courses access" ON institute_courses;
DROP POLICY IF EXISTS "Public institute head history access" ON institute_head_history;

CREATE POLICY "Public institute approvals access" 
ON institute_approvals FOR ALL 
TO anon, authenticated 
USING (true) WITH CHECK (true);

CREATE POLICY "Public institute courses access" 
ON institute_courses FOR ALL 
TO anon, authenticated 
USING (true) WITH CHECK (true);

CREATE POLICY "Public institute head history access" 
ON institute_head_history FOR ALL 
TO anon, authenticated 
USING (true) WITH CHECK (true);
