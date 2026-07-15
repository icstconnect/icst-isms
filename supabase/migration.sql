-- Run this SQL in your Supabase SQL Editor to update the live database schema:

ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS marks_distribution JSONB;

ALTER TABLE public.marks 
ADD COLUMN IF NOT EXISTS component_marks JSONB;
