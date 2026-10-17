-- ==============================================================================
-- APPLICATION NUMBER FORMAT UPDATE: YYYY-MMM-Sequence (e.g. 2026-OCT-00001)
-- Standardized Structured Format across Candidate Walk-in & Front Desk
-- ==============================================================================

-- 1. Ensure document_sequences table exists
CREATE TABLE IF NOT EXISTS document_sequences (
    series_type VARCHAR(50) NOT NULL, -- 'application' or 'fee_receipt'
    year_key VARCHAR(20) NOT NULL,    -- '2026-OCT', '2026', etc.
    last_number INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (series_type, year_key)
);

-- Enable RLS on document_sequences
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'document_sequences' 
        AND policyname = 'Public / Authenticated sequence access'
    ) THEN
        CREATE POLICY "Public / Authenticated sequence access" 
        ON document_sequences FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. Enhanced PostgreSQL function to generate the standardized sequence number
CREATE OR REPLACE FUNCTION get_next_sequence_number(p_series_type VARCHAR)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_digits INT := 5;
    v_next_val INT;
    v_formatted_num TEXT;
    v_current_year INT;
    v_current_month INT;
    v_month_abbr VARCHAR(10);
    v_seq_key VARCHAR(30);
    v_receipt_prefix VARCHAR(20) := 'FR';
BEGIN
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INT;

    -- Strict 3-letter English month abbreviation in UPPERCASE (JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC)
    v_month_abbr := CASE v_current_month
        WHEN 1 THEN 'JAN'
        WHEN 2 THEN 'FEB'
        WHEN 3 THEN 'MAR'
        WHEN 4 THEN 'APR'
        WHEN 5 THEN 'MAY'
        WHEN 6 THEN 'JUN'
        WHEN 7 THEN 'JUL'
        WHEN 8 THEN 'AUG'
        WHEN 9 THEN 'SEP'
        WHEN 10 THEN 'OCT'
        WHEN 11 THEN 'NOV'
        WHEN 12 THEN 'DEC'
        ELSE 'GEN'
    END;

    IF p_series_type = 'application' THEN
        -- Format Template: YYYY-MMM-00001 (e.g. 2026-OCT-00001, 2026-APR-00001)
        -- Sequence key partitioned monthly by YYYY-MMM
        v_seq_key := v_current_year::TEXT || '-' || v_month_abbr;

        -- Thread-safe atomic upsert with row-lock
        INSERT INTO document_sequences (series_type, year_key, last_number, updated_at)
        VALUES (p_series_type, v_seq_key, 1, timezone('utc'::text, now()))
        ON CONFLICT (series_type, year_key)
        DO UPDATE SET 
            last_number = document_sequences.last_number + 1,
            updated_at = timezone('utc'::text, now())
        RETURNING last_number INTO v_next_val;

        v_formatted_num := v_current_year::TEXT || '-' || v_month_abbr || '-' || LPAD(v_next_val::TEXT, v_digits, '0');
        RETURN v_formatted_num;

    ELSE
        -- Fee Receipt series: FR-YYYY-00001
        SELECT COALESCE(fee_receipt_prefix, 'FR')
        INTO v_receipt_prefix
        FROM organization_settings
        LIMIT 1;

        IF v_receipt_prefix IS NULL THEN
            v_receipt_prefix := 'FR';
        END IF;

        v_seq_key := v_current_year::TEXT;

        INSERT INTO document_sequences (series_type, year_key, last_number, updated_at)
        VALUES (p_series_type, v_seq_key, 1, timezone('utc'::text, now()))
        ON CONFLICT (series_type, year_key)
        DO UPDATE SET 
            last_number = document_sequences.last_number + 1,
            updated_at = timezone('utc'::text, now())
        RETURNING last_number INTO v_next_val;

        v_formatted_num := v_receipt_prefix || '-' || v_seq_key || '-' || LPAD(v_next_val::TEXT, v_digits, '0');
        RETURN v_formatted_num;
    END IF;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_next_sequence_number(VARCHAR) TO public, anon, authenticated, service_role;
