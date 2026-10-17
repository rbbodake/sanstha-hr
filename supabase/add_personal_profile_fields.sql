-- ==============================================================================
-- SMARTHR - Add Personal Profile & Experience Summary Columns to Applications
-- Safe & Idempotent (ADD COLUMN IF NOT EXISTS)
-- Run this migration in the Supabase SQL Editor to fix the schema cache error
-- for blood_group and related fields.
-- ==============================================================================

ALTER TABLE public.applications
    -- Personal profile fields
    ADD COLUMN IF NOT EXISTS gender                    VARCHAR(20),
    ADD COLUMN IF NOT EXISTS blood_group               VARCHAR(10),
    ADD COLUMN IF NOT EXISTS reservation_category      VARCHAR(50),
    ADD COLUMN IF NOT EXISTS is_pwd                    BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS pwd_type                  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS languages_known           TEXT[],               -- Array of language strings
    ADD COLUMN IF NOT EXISTS emergency_contact_name    VARCHAR(150),
    ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS emergency_contact_mobile  VARCHAR(20),
    ADD COLUMN IF NOT EXISTS permanent_address         TEXT,

    -- Experience summary fields
    ADD COLUMN IF NOT EXISTS total_teaching_exp_years  NUMERIC(4, 1),
    ADD COLUMN IF NOT EXISTS total_teaching_exp_months INT,
    ADD COLUMN IF NOT EXISTS total_industry_exp_years  NUMERIC(4, 1),
    ADD COLUMN IF NOT EXISTS total_industry_exp_months INT;

-- Optional: Indexes for common filter/search columns
CREATE INDEX IF NOT EXISTS idx_applications_gender               ON public.applications(gender);
CREATE INDEX IF NOT EXISTS idx_applications_blood_group          ON public.applications(blood_group);
CREATE INDEX IF NOT EXISTS idx_applications_reservation_category ON public.applications(reservation_category);

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
