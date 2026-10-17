-- Candidate reporting fields, flexible qualification marks, and signed institute evaluation files.
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS village_city TEXT,
  ADD COLUMN IF NOT EXISTS taluka TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS caste_cert_url TEXT,
  ADD COLUMN IF NOT EXISTS interview_evaluation_report_url TEXT,
  ADD COLUMN IF NOT EXISTS head_signature_url TEXT;

ALTER TABLE application_education
  ADD COLUMN IF NOT EXISTS marking_system VARCHAR(20) NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS cgpa NUMERIC(6, 3),
  ADD COLUMN IF NOT EXISTS cgpa_scale NUMERIC(6, 3);

CREATE INDEX IF NOT EXISTS idx_applications_village_city ON applications (village_city);
CREATE INDEX IF NOT EXISTS idx_applications_taluka ON applications (taluka);
CREATE INDEX IF NOT EXISTS idx_applications_district ON applications (district);
CREATE INDEX IF NOT EXISTS idx_applications_state ON applications (state);
CREATE INDEX IF NOT EXISTS idx_applications_pin_code ON applications (pin_code);
