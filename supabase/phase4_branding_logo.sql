-- ==============================================================================
-- PHASE 4: TRUST LOGO BRANDING & UNIVERSAL LETTERHEAD
-- ==============================================================================

-- 1. Ensure logo_url column exists in organization_settings table
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Create branding storage bucket if not already present
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set public storage access policies for branding bucket
DROP POLICY IF EXISTS "Public upload branding" ON storage.objects;
CREATE POLICY "Public upload branding" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'branding');

DROP POLICY IF EXISTS "Public read branding" ON storage.objects;
CREATE POLICY "Public read branding" ON storage.objects
FOR SELECT USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Public update branding" ON storage.objects;
CREATE POLICY "Public update branding" ON storage.objects
FOR UPDATE USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Public delete branding" ON storage.objects;
CREATE POLICY "Public delete branding" ON storage.objects
FOR DELETE USING (bucket_id = 'branding');
