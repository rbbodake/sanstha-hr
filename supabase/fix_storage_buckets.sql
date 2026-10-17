-- ====================================================================
-- SUPABASE STORAGE BUCKETS SETUP & PERMISSIONS
-- Run this in your Supabase SQL Editor to fix "Bucket not found / NoSuchBucket" error.
-- ====================================================================

-- 1. Create all required storage buckets as PUBLIC buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('candidate-documents', 'candidate-documents', true, 52428800, NULL),
    ('candidate-photos', 'candidate-photos', true, 52428800, NULL),
    ('candidate-signatures', 'candidate-signatures', true, 52428800, NULL),
    ('institute-documents', 'institute-documents', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 52428800;

-- 2. Drop any outdated conflicting storage policies
DROP POLICY IF EXISTS "Public photo upload" ON storage.objects;
DROP POLICY IF EXISTS "Public read photos/signatures" ON storage.objects;
DROP POLICY IF EXISTS "Auth read private documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads for candidate files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing of candidate files" ON storage.objects;
DROP POLICY IF EXISTS "Allow full storage access" ON storage.objects;

-- 3. Create comprehensive Public & Staff Access Policies for storage

-- Allow Anyone (Candidate / Receptionist / Admin) to View / Read uploaded files
CREATE POLICY "Allow public viewing of candidate files"
ON storage.objects FOR SELECT
USING (
    bucket_id IN ('candidate-documents', 'candidate-photos', 'candidate-signatures', 'institute-documents')
);

-- Allow Anyone (Candidate submitting form / Staff) to Upload files
CREATE POLICY "Allow public uploads for candidate files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id IN ('candidate-documents', 'candidate-photos', 'candidate-signatures', 'institute-documents')
);

-- Allow Staff to Update / Replace uploaded files
CREATE POLICY "Allow public updates for candidate files"
ON storage.objects FOR UPDATE
USING (
    bucket_id IN ('candidate-documents', 'candidate-photos', 'candidate-signatures', 'institute-documents')
);

-- Allow Staff to Delete uploaded files
CREATE POLICY "Allow public delete for candidate files"
ON storage.objects FOR DELETE
USING (
    bucket_id IN ('candidate-documents', 'candidate-photos', 'candidate-signatures', 'institute-documents')
);
