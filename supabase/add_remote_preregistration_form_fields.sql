-- ==============================================================================
-- SMARTHR - Add Remote Candidate Pre-Registration Extended Fields
-- Shri Balasaheb Mane Shikshan Prasarak Mandal, Ambap
-- Safe & Idempotent (ADD COLUMN IF NOT EXISTS)
-- ==============================================================================

-- 1. Applications table additions
ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS parent_spouse_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS religion_caste     VARCHAR(150),
    ADD COLUMN IF NOT EXISTS marital_status     VARCHAR(50),
    ADD COLUMN IF NOT EXISTS preferred_campus   VARCHAR(200),
    ADD COLUMN IF NOT EXISTS last_organization  VARCHAR(200),
    ADD COLUMN IF NOT EXISTS last_designation   VARCHAR(150),
    ADD COLUMN IF NOT EXISTS last_salary        NUMERIC(12, 2);

-- 2. Application Education additions
ALTER TABLE public.application_education
    ADD COLUMN IF NOT EXISTS score              VARCHAR(100);

-- 3. Application Experience additions
ALTER TABLE public.application_experience
    ADD COLUMN IF NOT EXISTS total_exp_months   INT;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
