-- 1. Add program_stream, course_name & specialization to applications table
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS program_stream TEXT DEFAULT 'Engineering & Technology',
ADD COLUMN IF NOT EXISTS course_name TEXT,
ADD COLUMN IF NOT EXISTS specialization TEXT;

-- Index on applications program_stream
CREATE INDEX IF NOT EXISTS idx_applications_program_stream ON public.applications(program_stream);

-- Update existing applications default if null
UPDATE public.applications
SET program_stream = 'Engineering & Technology'
WHERE program_stream IS NULL;

-- 2. Add program_stream to posts table (Job Designations)
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS program_stream TEXT DEFAULT 'All Programs / General';

CREATE INDEX IF NOT EXISTS idx_posts_program_stream ON public.posts(program_stream);

UPDATE public.posts
SET program_stream = 'All Programs / General'
WHERE program_stream IS NULL;
