-- ==============================================================================
-- SMARTHR - Institute Staff Strength, Designation Mapping & Variance Calculator
-- Safe & Idempotent Migration
-- ==============================================================================

-- 1. Create table `institute_staff_strength`
CREATE TABLE IF NOT EXISTS institute_staff_strength (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institute_id UUID NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    course_id UUID REFERENCES institute_courses(id) ON DELETE SET NULL,
    post_type VARCHAR(50) NOT NULL DEFAULT 'Teaching', -- 'Teaching' | 'Non-Teaching'
    program_stream VARCHAR(150),                       -- e.g. 'Engineering & Technology', 'Management (MBA / MMS)'
    sanctioned_posts INT NOT NULL DEFAULT 0,           -- Approved post intake as per Apex Body (AICTE / UGC / PCI / MSBTE)
    available_strength INT NOT NULL DEFAULT 0,         -- Current working active staff count
    variance INT NOT NULL DEFAULT 0,                   -- Available - Sanctioned (computed via trigger)
    regulatory_body VARCHAR(100) DEFAULT 'AICTE',      -- e.g. AICTE, UGC, PCI, MSBTE, University
    remarks TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_inst_post_course UNIQUE(institute_id, post_id, course_id)
);

-- 2. Index for high-performance querying
CREATE INDEX IF NOT EXISTS idx_inst_staff_strength_inst ON institute_staff_strength(institute_id);
CREATE INDEX IF NOT EXISTS idx_inst_staff_strength_post ON institute_staff_strength(post_id);
CREATE INDEX IF NOT EXISTS idx_inst_staff_strength_type ON institute_staff_strength(post_type);

-- 3. Automatic variance calculation trigger
CREATE OR REPLACE FUNCTION calc_institute_staff_variance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.variance := NEW.available_strength - NEW.sanctioned_posts;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_institute_staff_variance ON institute_staff_strength;
CREATE TRIGGER trg_calc_institute_staff_variance
BEFORE INSERT OR UPDATE ON institute_staff_strength
FOR EACH ROW EXECUTE FUNCTION calc_institute_staff_variance();

-- 4. Enable Row Level Security (RLS) & Public Policies
ALTER TABLE institute_staff_strength ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public institute staff strength access" ON institute_staff_strength;
CREATE POLICY "Public institute staff strength access"
ON institute_staff_strength FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. Seed initial mappings for existing institute (AMGOI) if available
DO $$
DECLARE
    v_inst_id UUID;
    v_post_id UUID;
    v_course_id UUID;
BEGIN
    SELECT id INTO v_inst_id FROM institutes LIMIT 1;
    
    IF v_inst_id IS NOT NULL THEN
        -- Teaching Post 1: Assistant Professor - Computer Science
        SELECT id INTO v_post_id FROM posts WHERE title ILIKE '%Computer Science%' LIMIT 1;
        SELECT id INTO v_course_id FROM institute_courses WHERE course_name ILIKE '%COMPUTER SCIENCE%' LIMIT 1;
        
        IF v_post_id IS NOT NULL THEN
            INSERT INTO institute_staff_strength (institute_id, post_id, course_id, post_type, program_stream, sanctioned_posts, available_strength, variance, regulatory_body, remarks)
            VALUES (v_inst_id, v_post_id, v_course_id, 'Teaching', 'Engineering & Technology', 12, 9, -3, 'AICTE / DBATU', 'Approved intake as per AICTE 2024-25 norm')
            ON CONFLICT (institute_id, post_id, course_id) DO NOTHING;
        END IF;

        -- Teaching Post 2: Assistant Professor - Mechanical Engineering
        SELECT id INTO v_post_id FROM posts WHERE title ILIKE '%Mechanical%' LIMIT 1;
        SELECT id INTO v_course_id FROM institute_courses WHERE course_name ILIKE '%MECHANICAL%' LIMIT 1;
        
        IF v_post_id IS NOT NULL THEN
            INSERT INTO institute_staff_strength (institute_id, post_id, course_id, post_type, program_stream, sanctioned_posts, available_strength, variance, regulatory_body, remarks)
            VALUES (v_inst_id, v_post_id, v_course_id, 'Teaching', 'Engineering & Technology', 8, 7, -1, 'AICTE / DBATU', 'Norm: 1:20 Cadre ratio')
            ON CONFLICT (institute_id, post_id, course_id) DO NOTHING;
        END IF;

        -- Teaching Post 3: Assistant Professor - Civil Engineering
        SELECT id INTO v_post_id FROM posts WHERE title ILIKE '%Civil%' LIMIT 1;
        SELECT id INTO v_course_id FROM institute_courses WHERE course_name ILIKE '%CIVIL%' LIMIT 1;
        
        IF v_post_id IS NOT NULL THEN
            INSERT INTO institute_staff_strength (institute_id, post_id, course_id, post_type, program_stream, sanctioned_posts, available_strength, variance, regulatory_body, remarks)
            VALUES (v_inst_id, v_post_id, v_course_id, 'Teaching', 'Engineering & Technology', 6, 6, 0, 'AICTE / DBATU', 'Cadre requirement satisfied')
            ON CONFLICT (institute_id, post_id, course_id) DO NOTHING;
        END IF;

        -- Non-Teaching Post 1: Junior Clerk / Office Assistant (Common Pool)
        SELECT id INTO v_post_id FROM posts WHERE title ILIKE '%Junior Clerk%' LIMIT 1;
        IF v_post_id IS NOT NULL THEN
            INSERT INTO institute_staff_strength (institute_id, post_id, course_id, post_type, program_stream, sanctioned_posts, available_strength, variance, regulatory_body, remarks)
            VALUES (v_inst_id, v_post_id, NULL, 'Non-Teaching', 'General / Administrative', 5, 4, -1, 'DTE Maharashtra', 'Central shared pool: Central office posting')
            ON CONFLICT (institute_id, post_id, course_id) DO NOTHING;
        END IF;

        -- Non-Teaching Post 2: Peon / Office Attendant (Common Pool)
        SELECT id INTO v_post_id FROM posts WHERE title ILIKE '%Peon%' LIMIT 1;
        IF v_post_id IS NOT NULL THEN
            INSERT INTO institute_staff_strength (institute_id, post_id, course_id, post_type, program_stream, sanctioned_posts, available_strength, variance, regulatory_body, remarks)
            VALUES (v_inst_id, v_post_id, NULL, 'Non-Teaching', 'General / Administrative', 8, 6, -2, 'DTE Maharashtra', 'Campus support pool')
            ON CONFLICT (institute_id, post_id, course_id) DO NOTHING;
        END IF;
    END IF;
END $$;
