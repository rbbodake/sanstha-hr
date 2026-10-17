-- ==============================================================================
-- SMARTHR - Complete Central HR Workflow & Final Management Appointment Approval
-- Safe & Idempotent Migration for Postgres / Supabase
-- ==============================================================================

-- 1. Forwarding & Institute Review Columns on applications
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS forwarded_to_institute_id UUID REFERENCES institutes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS forwarded_to_head_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS forwarded_to_head_email VARCHAR(150),
    ADD COLUMN IF NOT EXISTS forwarded_to_head_designation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS central_hr_remarks TEXT,
    ADD COLUMN IF NOT EXISTS forwarded_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS forwarded_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS institute_recommendation VARCHAR(50),
    ADD COLUMN IF NOT EXISTS institute_remarks TEXT,
    ADD COLUMN IF NOT EXISTS interview_conducted_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS interview_venue VARCHAR(255),
    ADD COLUMN IF NOT EXISTS interview_panel_members TEXT,
    ADD COLUMN IF NOT EXISTS interview_panel_remarks TEXT,
    ADD COLUMN IF NOT EXISTS interview_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS interview_teaching_demo_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS physical_docs_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS physical_docs_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS physical_docs_remarks TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by_head_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS management_approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS management_approved_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS management_approval_remarks TEXT;

-- 2. Rich Administrative Appointment Instructions & Downstream Propagation Columns
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS joining_date DATE,
    ADD COLUMN IF NOT EXISTS mandatory_bond_details TEXT,
    ADD COLUMN IF NOT EXISTS confirmed_designation VARCHAR(150),
    ADD COLUMN IF NOT EXISTS pay_scale VARCHAR(100),
    ADD COLUMN IF NOT EXISTS basic_pay NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS agreed_total_salary NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS appointment_instructions TEXT,
    ADD COLUMN IF NOT EXISTS appointment_order_workflow_initiated BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS appointment_order_status VARCHAR(50) DEFAULT 'initiated',
    ADD COLUMN IF NOT EXISTS pushed_to_institute_portal BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS pushed_to_appointment_section BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS downstream_pushed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS downstream_pushed_by VARCHAR(150);

-- 3. In-App Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_role VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(150),
    recipient_institute_id UUID REFERENCES institutes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'workflow_alert',
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Audit Trail Logs table
CREATE TABLE IF NOT EXISTS application_workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Indexes for fast query and filtering
CREATE INDEX IF NOT EXISTS idx_applications_mgmt_approved ON applications(status) WHERE status = 'management_approved';
CREATE INDEX IF NOT EXISTS idx_applications_appt_order_wf ON applications(appointment_order_workflow_initiated);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_app ON notifications(application_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_app ON application_workflow_logs(application_id);
