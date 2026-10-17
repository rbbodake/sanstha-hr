-- ==============================================================================
-- FEE REGISTER ACCOUNTABILITY & EDUCATIONAL QUALIFICATIONS ENHANCEMENT
-- ==============================================================================

-- 1. Add Board/University, Passing Year, and Status Remark (Ph.D. Awarded/Scholar, NET/SET Qualified) to application_education
ALTER TABLE application_education
ADD COLUMN IF NOT EXISTS board_university TEXT,
ADD COLUMN IF NOT EXISTS passing_year VARCHAR(20),
ADD COLUMN IF NOT EXISTS status_remark VARCHAR(100);

-- 2. Performance indexes for Fee Register queries and tally reports
CREATE INDEX IF NOT EXISTS idx_fee_receipts_issued_at ON fee_receipts(issued_at);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_payment_mode ON fee_receipts(payment_mode);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_is_cancelled ON fee_receipts(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_receipt_no ON fee_receipts(receipt_no);
