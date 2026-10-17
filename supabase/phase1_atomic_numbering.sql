-- ==============================================================================
-- PHASE 1: DATABASE-SAFE ATOMIC UNIQUE NUMBERING & AUDIT TRAIL
-- Sequence formats: REG-2026-00001 (Application) and FR-2026-00001 (Receipt)
-- ==============================================================================

-- 1. Ensure columns exist on organization_settings for numbering configuration
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS app_no_prefix VARCHAR(20) DEFAULT 'REG',
ADD COLUMN IF NOT EXISTS fee_receipt_prefix VARCHAR(20) DEFAULT 'FR',
ADD COLUMN IF NOT EXISTS number_digits INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS year_basis VARCHAR(20) DEFAULT 'calendar', -- 'calendar' or 'financial'
ADD COLUMN IF NOT EXISTS restart_yearly BOOLEAN DEFAULT true;

-- Update defaults if null
UPDATE organization_settings 
SET 
  app_no_prefix = COALESCE(app_no_prefix, 'REG'),
  fee_receipt_prefix = COALESCE(fee_receipt_prefix, 'FR'),
  number_digits = COALESCE(number_digits, 5),
  year_basis = COALESCE(year_basis, 'calendar'),
  restart_yearly = COALESCE(restart_yearly, true);

-- 2. Add Cancellation & Audit Fields to applications and fee_receipts
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE fee_receipts
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 3. Dedicated Sequence Tracker Table for safe concurrency / atomic increment
CREATE TABLE IF NOT EXISTS document_sequences (
    series_type VARCHAR(50) NOT NULL, -- 'application' or 'fee_receipt'
    year_key VARCHAR(20) NOT NULL,    -- '2026' or '2026-27' or 'ALL'
    last_number INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (series_type, year_key)
);

-- Enable RLS on document_sequences
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public / Authenticated sequence access" ON document_sequences FOR ALL USING (true) WITH CHECK (true);

-- 4. Atomic PostgreSQL function to generate the next unique sequence number
CREATE OR REPLACE FUNCTION get_next_sequence_number(p_series_type VARCHAR)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prefix VARCHAR(20);
    v_digits INT;
    v_year_basis VARCHAR(20);
    v_restart_yearly BOOLEAN;
    v_year_key VARCHAR(20);
    v_next_val INT;
    v_formatted_num TEXT;
    v_current_year INT;
    v_current_month INT;
BEGIN
    -- Read configuration from organization_settings (or use safe defaults)
    SELECT 
        CASE 
            WHEN p_series_type = 'application' THEN COALESCE(app_no_prefix, 'REG')
            ELSE COALESCE(fee_receipt_prefix, 'FR')
        END,
        COALESCE(number_digits, 5),
        COALESCE(year_basis, 'calendar'),
        COALESCE(restart_yearly, true)
    INTO 
        v_prefix,
        v_digits,
        v_year_basis,
        v_restart_yearly
    FROM organization_settings
    LIMIT 1;

    -- Fallback defaults if no settings found
    IF v_prefix IS NULL THEN
        IF p_series_type = 'application' THEN
            v_prefix := 'REG';
        ELSE
            v_prefix := 'FR';
        END IF;
        v_digits := 5;
        v_year_basis := 'calendar';
        v_restart_yearly := true;
    END IF;

    -- Determine Year Key
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);

    IF v_restart_yearly THEN
        IF v_year_basis = 'financial' THEN
            -- Financial year April - March (e.g. 2026-27)
            IF v_current_month >= 4 THEN
                v_year_key := v_current_year::TEXT || '-' || LPAD(((v_current_year + 1) % 100)::TEXT, 2, '0');
            ELSE
                v_year_key := (v_current_year - 1)::TEXT || '-' || LPAD((v_current_year % 100)::TEXT, 2, '0');
            END IF;
        ELSE
            -- Calendar Year (e.g. 2026)
            v_year_key := v_current_year::TEXT;
        END IF;
    ELSE
        v_year_key := 'ALL';
    END IF;

    -- Atomic Upsert with row-lock to increment counter safely
    INSERT INTO document_sequences (series_type, year_key, last_number, updated_at)
    VALUES (p_series_type, v_year_key, 1, timezone('utc'::text, now()))
    ON CONFLICT (series_type, year_key)
    DO UPDATE SET 
        last_number = document_sequences.last_number + 1,
        updated_at = timezone('utc'::text, now())
    RETURNING last_number INTO v_next_val;

    -- Format: PREFIX-YEAR-SERIAL (e.g. REG-2026-00001 or FR-2026-00001)
    IF v_year_key = 'ALL' THEN
        v_formatted_num := v_prefix || '-' || LPAD(v_next_val::TEXT, v_digits, '0');
    ELSE
        v_formatted_num := v_prefix || '-' || v_year_key || '-' || LPAD(v_next_val::TEXT, v_digits, '0');
    END IF;

    RETURN v_formatted_num;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_next_sequence_number(VARCHAR) TO public, anon, authenticated, service_role;
