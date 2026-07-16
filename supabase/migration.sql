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

-- School Approval Workflow Alterations
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Pending Review' CHECK (status IN ('Pending Review', 'Approved', 'Rejected', 'Suspended'));
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS approval_history JSONB DEFAULT '[]'::jsonb;

-- Coordinator and Committee Hierarchy Alterations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department VARCHAR;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS historical_positions JSONB DEFAULT '[]'::jsonb;

-- Student Timeline Table
CREATE TABLE IF NOT EXISTS public.student_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_name VARCHAR NOT NULL,
  action VARCHAR NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Student Transfers Table
CREATE TABLE IF NOT EXISTS public.student_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  from_school_id UUID REFERENCES public.schools(id),
  to_school_id UUID REFERENCES public.schools(id),
  status VARCHAR NOT NULL DEFAULT 'Pending Admin' CHECK (status IN ('Pending Admin', 'Pending Destination', 'Completed', 'Rejected')),
  requested_by VARCHAR NOT NULL,
  approved_by VARCHAR,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Settings Config Table
CREATE TABLE IF NOT EXISTS public.settings_config (
  id VARCHAR PRIMARY KEY,
  value JSONB NOT NULL
);

-- Login History Table
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_email VARCHAR NOT NULL,
  ip_address VARCHAR NOT NULL,
  device VARCHAR NOT NULL,
  browser VARCHAR NOT NULL,
  os VARCHAR NOT NULL,
  location VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'Success' CHECK (status IN ('Success', 'Failed')),
  failed_reason TEXT
);

-- Security Alerts Table
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_email VARCHAR NOT NULL,
  event VARCHAR NOT NULL,
  severity VARCHAR NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  status VARCHAR NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved')),
  remarks TEXT
);

