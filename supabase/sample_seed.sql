-- ==============================================================================
-- OPTIONAL SAMPLE SEED DATA - For Shri Balasaheb Mane Shikshan Prasarak Mandal
-- (Skip running this script when deploying a clean copy for a different Trust)
-- ==============================================================================

-- 1. Insert Trust Organisation Settings
INSERT INTO organization_settings (
    name,
    address,
    registration_no,
    registration_date,
    tagline,
    president_name,
    hr_head_name,
    receipt_prefix,
    receipt_starting_no,
    receipt_header_text,
    receipt_footer_text,
    currency_symbol
) VALUES (
    'Shri Balasaheb Mane Shikshan Prasarak Mandal, Ambap',
    'Tal. Hatkanangale, Dist. Kolhapur, Pin 416112, Maharashtra State (A/p. Ambap)',
    'Regd. under B.P.T. Act 1950, No. F-1727-Kolhapur',
    '02/02/1981',
    'Education as a Service',
    'Shri Vijaysinh Ashokrao Mane',
    'Mrs. Priyanka M. Sutar',
    'REC/2026-27/',
    1001,
    'CENTRAL HR DEPARTMENT - RECRUITMENT FEE RECEIPT',
    'Thank you. Please retain this receipt for physical interview verification.',
    '₹'
) ON CONFLICT DO NOTHING;

-- 2. Insert Staff Categories with Application Fees
INSERT INTO staff_categories (name, description, application_fee, is_active) VALUES
('Teaching', 'Professors, Associate Professors, Assistant Professors, Lecturers, Teachers', 50.00, true),
('Non-Teaching', 'Clerks, Accountants, Librarians, Lab Assistants, Technical Staff', 100.00, true),
('House-Keeping', 'Peons, Attendants, Security, Housekeeping & Maintenance Staff', 50.00, true)
ON CONFLICT (name) DO NOTHING;

-- 3. Insert Sample Posts under Categories
DO $$
DECLARE
    teaching_id UUID;
    non_teaching_id UUID;
    hk_id UUID;
BEGIN
    SELECT id INTO teaching_id FROM staff_categories WHERE name = 'Teaching' LIMIT 1;
    SELECT id INTO non_teaching_id FROM staff_categories WHERE name = 'Non-Teaching' LIMIT 1;
    SELECT id INTO hk_id FROM staff_categories WHERE name = 'House-Keeping' LIMIT 1;

    -- Teaching posts
    INSERT INTO posts (category_id, title, qualification_requirement) VALUES
    (teaching_id, 'Assistant Professor - Computer Science', 'M.E. / M.Tech / Ph.D in CSE/IT'),
    (teaching_id, 'Assistant Professor - Mechanical Engineering', 'M.E. / M.Tech in Mechanical'),
    (teaching_id, 'Assistant Professor - Civil Engineering', 'M.E. / M.Tech in Civil'),
    (teaching_id, 'Lecturer - Pharmacy', 'M.Pharm / B.Pharm'),
    (teaching_id, 'School Teacher - English & Social Science', 'B.A. / B.Ed / M.A.');

    -- Non-Teaching posts
    INSERT INTO posts (category_id, title, qualification_requirement) VALUES
    (non_teaching_id, 'Junior Clerk / Office Assistant', 'Any Graduate with Tally & Typing Certificate'),
    (non_teaching_id, 'Senior Accountant', 'B.Com / M.Com with 3+ years experience in Tally'),
    (non_teaching_id, 'Librarian / Assistant Librarian', 'M.Lib.I.Sc / B.Lib'),
    (non_teaching_id, 'Laboratory Assistant - Computer Labs', 'Diploma / B.Sc in Computer Science');

    -- House-keeping posts
    INSERT INTO posts (category_id, title, qualification_requirement) VALUES
    (hk_id, 'Peon / Office Attendant', '10th / 12th Pass'),
    (hk_id, 'Security Guard', '10th Pass / Ex-Serviceman preferred'),
    (hk_id, 'Housekeeping & Cleaning Staff', 'Basic literacy');
END $$;

-- 4. Insert Default Payment Modes
INSERT INTO payment_modes (name, is_active) VALUES
('Cash', true),
('UPI / QR Code', true),
('Demand Draft (DD)', true),
('Bank Transfer / NEFT', true)
ON CONFLICT (name) DO NOTHING;
