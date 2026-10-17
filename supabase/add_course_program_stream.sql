-- Add program_stream to institute_courses table
ALTER TABLE public.institute_courses
ADD COLUMN IF NOT EXISTS program_stream TEXT DEFAULT 'Engineering & Technology';

-- Also add an index for quick filtering by program stream
CREATE INDEX IF NOT EXISTS idx_institute_courses_program_stream ON public.institute_courses(program_stream);

-- Update existing records if any
UPDATE public.institute_courses
SET program_stream = 'Engineering & Technology'
WHERE program_stream IS NULL;
