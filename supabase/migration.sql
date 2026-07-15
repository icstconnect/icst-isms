-- Run this SQL in your Supabase SQL Editor to update the live database schema:

ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS marks_distribution JSONB;

ALTER TABLE public.marks 
ADD COLUMN IF NOT EXISTS component_marks JSONB;

-- Update students table structure for application form fields
ALTER TABLE public.students ALTER COLUMN father_name DROP NOT NULL;
ALTER TABLE public.students ALTER COLUMN mother_name DROP NOT NULL;
ALTER TABLE public.students ALTER COLUMN address DROP NOT NULL;

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS form_number VARCHAR;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_name VARCHAR;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS aadhaar_no VARCHAR;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS whatsapp_no VARCHAR;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS village VARCHAR;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS post_office VARCHAR;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS police_station VARCHAR;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS district VARCHAR;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS state VARCHAR;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS pin_code VARCHAR;

-- Alter admit_cards table column types to VARCHAR to support human-readable time strings (e.g. "10:00 AM", "11:00 AM - 01:00 PM")
ALTER TABLE public.admit_cards ALTER COLUMN reporting_time TYPE VARCHAR;
ALTER TABLE public.admit_cards ALTER COLUMN exam_time TYPE VARCHAR;

-- Drop foreign key constraint on profiles to allow non-auth registered officials
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
