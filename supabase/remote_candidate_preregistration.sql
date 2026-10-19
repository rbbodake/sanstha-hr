-- ==============================================================================
-- SMARTHR - Remote Candidate Online Pre-Registration Migration
-- Shri Balasaheb Mane Shikshan Prasarak Mandal, Ambap
-- Safe, Idempotent Database Schema Update for Supabase / PostgreSQL
-- ==============================================================================

-- 1. Upgrade `applications` table to support Remote Pre-Registration & Settlement
ALTER TABLE applications 
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'WALKIN_DESK',
    ADD COLUMN IF NOT EXISTS registration_status VARCHAR(50) DEFAULT 'COMPLETED_PAID',
    ADD COLUMN IF NOT EXISTS temp_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS fee_receipt_no VARCHAR(100),
    ADD COLUMN IF NOT EXISTS collected_by_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP WITH TIME ZONE;

-- 2. Add Unique Constraint on temp_id (ignoring nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_temp_id_unique ON applications(temp_id) WHERE temp_id IS NOT NULL;

-- 3. Add Domain Check Constraints (Idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_applications_source_type') THEN
        ALTER TABLE applications ADD CONSTRAINT check_applications_source_type 
            CHECK (source_type IN ('WALKIN_DESK', 'ONLINE_REMOTE'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_applications_registration_status') THEN
        ALTER TABLE applications ADD CONSTRAINT check_applications_registration_status 
            CHECK (registration_status IN ('DRAFT_PENDING_FEE', 'COMPLETED_PAID'));
    END IF;
END $$;

-- 4. High-Performance Indexes for Front Desk Walk-In Lookup & Central HR Reporting
CREATE INDEX IF NOT EXISTS idx_applications_source_reg_status ON applications(source_type, registration_status);
CREATE INDEX IF NOT EXISTS idx_applications_temp_id ON applications(temp_id);
CREATE INDEX IF NOT EXISTS idx_applications_contact_no ON applications(contact_no);
CREATE INDEX IF NOT EXISTS idx_applications_aadhaar_full ON applications(aadhaar_full);
CREATE INDEX IF NOT EXISTS idx_applications_fee_receipt_no ON applications(fee_receipt_no);

-- 5. Backfill Existing Records
-- Existing walk-in records default to source_type = 'WALKIN_DESK' and 'COMPLETED_PAID'
UPDATE applications 
SET source_type = 'WALKIN_DESK' 
WHERE source_type IS NULL;

UPDATE applications 
SET registration_status = CASE 
    WHEN status IN ('fee_paid', 'verified_approved', 'forwarded_to_institute', 'ready_for_physical_interview', 'selected_recommended', 'management_approved') THEN 'COMPLETED_PAID'
    WHEN EXISTS (SELECT 1 FROM fee_receipts fr WHERE fr.application_id = applications.id AND fr.is_cancelled = false) THEN 'COMPLETED_PAID'
    ELSE 'COMPLETED_PAID'
END
WHERE registration_status IS NULL;

-- 6. Sequence / Stored Procedure for Atomic Temporary ID Generation (Optional Helper)
CREATE SEQUENCE IF NOT EXISTS temp_application_id_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_next_temp_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_year TEXT := to_char(CURRENT_DATE, 'YYYY');
    v_seq_num BIGINT;
    v_temp_id TEXT;
BEGIN
    v_seq_num := nextval('temp_application_id_seq');
    v_temp_id := 'TMP-' || v_year || '-' || LPAD(v_seq_num::TEXT, 5, '0');
    RETURN v_temp_id;
END;
$$;

COMMENT ON COLUMN applications.source_type IS 'Origin channel of application: WALKIN_DESK (in-person physical desk) or ONLINE_REMOTE (public web pre-registration)';
COMMENT ON COLUMN applications.registration_status IS 'Lifecycle status: DRAFT_PENDING_FEE (remote pre-registered awaiting front desk payment) or COMPLETED_PAID (fee collected and application active)';
COMMENT ON COLUMN applications.temp_id IS 'Unique temporary application identifier (e.g. TMP-2026-00001) given to remote candidates';
COMMENT ON COLUMN applications.fee_receipt_no IS 'Official Sanstha fee receipt number generated upon desk settlement';
COMMENT ON COLUMN applications.collected_by_user_id IS 'Front desk staff or Central HR user who verified documents and collected the fee';
COMMENT ON COLUMN applications.collected_at IS 'Timestamp of physical fee collection and walk-in settlement at the front desk';
