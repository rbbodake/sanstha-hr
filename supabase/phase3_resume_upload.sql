-- ==============================================================================
-- PHASE 3: RESUME ATTACHMENT & SECURE STORAGE
-- ==============================================================================

-- 1. Add resume_url column to applications table
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- 2. Create candidate-resumes storage bucket if not present
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-resumes', 'candidate-resumes', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage access policies for candidate-resumes bucket
DROP POLICY IF EXISTS "Public upload candidate-resumes" ON storage.objects;
CREATE POLICY "Public upload candidate-resumes" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'candidate-resumes');

DROP POLICY IF EXISTS "Public read candidate-resumes" ON storage.objects;
CREATE POLICY "Public read candidate-resumes" ON storage.objects
FOR SELECT USING (bucket_id = 'candidate-resumes');

DROP POLICY IF EXISTS "Public update candidate-resumes" ON storage.objects;
CREATE POLICY "Public update candidate-resumes" ON storage.objects
FOR UPDATE USING (bucket_id = 'candidate-resumes');
