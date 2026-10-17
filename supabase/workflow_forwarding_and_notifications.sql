-- ==============================================================================
-- SMARTHR - Multi-Tier Recruitment Workflow Migration
-- Central HR Forwarding, Institute Head Review, Interview Request & Alerts
-- Safe & Idempotent (Preserves all existing data)
-- ==============================================================================

-- 1. Upgrade `applications` table with forwarding & review columns
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS forwarded_to_institute_id UUID REFERENCES institutes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS forwarded_to_head_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS forwarded_to_head_email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS forwarded_to_head_designation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS central_hr_remarks TEXT,
    ADD COLUMN IF NOT EXISTS forwarded_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS forwarded_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS institute_recommendation VARCHAR(50), -- 'selected', 'recommended', 'hold', 'rejected'
    ADD COLUMN IF NOT EXISTS institute_remarks TEXT,
    ADD COLUMN IF NOT EXISTS interview_conducted_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS interview_venue VARCHAR(255),
    ADD COLUMN IF NOT EXISTS interview_panel_members TEXT,
    ADD COLUMN IF NOT EXISTS interview_panel_remarks TEXT,
    ADD COLUMN IF NOT EXISTS interview_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS interview_teaching_demo_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS physical_docs_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS physical_docs_status VARCHAR(50), -- 'verified_all_clear', 'discrepancy_observed', 'provisional_pending_docs'
    ADD COLUMN IF NOT EXISTS physical_docs_remarks TEXT,
    ADD COLUMN IF NOT EXISTS interview_requested BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS interview_suggested_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS interview_instructions TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by_head_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS management_approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS management_approved_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS management_approval_remarks TEXT;

-- 2. Create `notifications` table for real-time workflow alerts
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_role VARCHAR(50) NOT NULL, -- 'institute_head', 'admin_head_hr', 'receptionist'
    recipient_email VARCHAR(150),
    recipient_institute_id UUID REFERENCES institutes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'workflow_alert', -- 'forwarded_to_institute', 'institute_reviewed', 'interview_requested'
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for speedy recipient filtering
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_institute ON notifications(recipient_institute_id);
CREATE INDEX IF NOT EXISTS idx_notifications_app ON notifications(application_id);

-- 3. Create `application_workflow_logs` table for complete audit trail
CREATE TABLE IF NOT EXISTS application_workflow_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'forwarded_to_institute', 'institute_reviewed', 'interview_requested'
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    remarks TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_app ON application_workflow_logs(application_id);

-- 4. Enable RLS and Permissive Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_workflow_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Public notifications access'
    ) THEN
        CREATE POLICY "Public notifications access" 
        ON notifications FOR ALL 
        TO anon, authenticated 
        USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'application_workflow_logs' 
        AND policyname = 'Public workflow logs access'
    ) THEN
        CREATE POLICY "Public workflow logs access" 
        ON application_workflow_logs FOR ALL 
        TO anon, authenticated 
        USING (true) WITH CHECK (true);
    END IF;
END $$;
