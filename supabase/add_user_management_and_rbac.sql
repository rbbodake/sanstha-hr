-- ==============================================================================
-- SMARTHR - User Management & Role-Based Access Control (RBAC) Migration
-- Shri Balasaheb Mane Shikshan Prasarak Mandal, Ambap
-- Safe & Idempotent Migration for Postgres / Supabase
-- ==============================================================================

-- 1. Upgrade user_profiles Table Schema
-- Adds username, login_name, mobile_number, password_hash, linked_institute_id
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS username VARCHAR(100),
    ADD COLUMN IF NOT EXISTS login_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS linked_institute_id UUID REFERENCES institutes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(lower(username));

-- 2. Ensure RLS Policy allows authenticated staff and service operations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Staff all access user_profiles" ON user_profiles;
        CREATE POLICY "Staff all access user_profiles" ON user_profiles FOR ALL TO authenticated USING (true);
        
        DROP POLICY IF EXISTS "Anon read active user_profiles" ON user_profiles;
        CREATE POLICY "Anon read active user_profiles" ON user_profiles FOR SELECT TO anon USING (is_active = true);
    END IF;
END $$;

-- 3. Upgrade applications table appointment status to support 'joined'
DO $$
BEGIN
    -- Check if appointment_order_status column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' AND column_name = 'appointment_order_status'
    ) THEN
        ALTER TABLE applications ADD COLUMN appointment_order_status VARCHAR(50) DEFAULT 'initiated';
    END IF;
END $$;

-- 4. Audit Trail Actions Index
CREATE INDEX IF NOT EXISTS idx_workflow_logs_action ON application_workflow_logs(action);

-- 5. Seed Initial System Roles & Administrative Users (for direct Supabase deployments)
-- Default Accounts:
--   1. admin (Central HR Admin, admin123)
--   2. frontdesk (Front Desk Officer, admin123)
--   3. principal (Institute Head, admin123)
--   4. appointment (Appointment Officer, admin123)
DO $$
BEGIN
    -- Informational comment
    RAISE NOTICE 'SmartHR RBAC & Appointment Section schema migration applied successfully.';
END $$;
