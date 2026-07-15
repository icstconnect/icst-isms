-- ==========================================================
-- ICST SCHOLARSHIP MANAGEMENT SYSTEM (ISMS) DATABASE SCHEMA
-- ==========================================================

-- Clean up existing resources (if running schema recreation)
-- DROP TABLE IF EXISTS marks_audit_trail CASCADE;
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS marks CASCADE;
-- DROP TABLE IF EXISTS attendance CASCADE;
-- DROP TABLE IF EXISTS admit_cards CASCADE;
-- DROP TABLE IF EXISTS students CASCADE;
-- DROP TABLE IF EXISTS subjects CASCADE;
-- DROP TABLE IF EXISTS scholarships CASCADE;
-- DROP TABLE IF EXISTS schools CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Profiles Table (extending Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'Viewer' CHECK (role IN ('SuperAdmin', 'Admin', 'ScholarshipCoordinator', 'MarksEvaluator', 'Invigilator', 'DataEntryOperator', 'Viewer')),
  contact_number VARCHAR,
  designation VARCHAR,
  joining_date DATE,
  photo_url TEXT,
  status VARCHAR NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended')),
  email VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Schools Table
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id VARCHAR NOT NULL UNIQUE, -- e.g., SCH-0001
  name VARCHAR NOT NULL,
  udise VARCHAR NOT NULL UNIQUE,
  type VARCHAR NOT NULL CHECK (type IN ('Primary', 'UpperPrimary', 'Secondary', 'HigherSecondary')),
  address TEXT NOT NULL,
  district VARCHAR NOT NULL,
  block VARCHAR NOT NULL,
  pin VARCHAR(6) NOT NULL,
  headmaster_name VARCHAR NOT NULL,
  contact_number VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_schools_district_block ON schools(district, block);
CREATE INDEX idx_schools_udise ON schools(udise);

-- 3. Scholarships Table
CREATE TABLE scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE, -- e.g. "ICST Scholarship 2026"
  academic_year INTEGER NOT NULL, -- e.g. 2026
  description TEXT,
  registration_start TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_end TIMESTAMP WITH TIME ZONE NOT NULL,
  admit_card_publish_date TIMESTAMP WITH TIME ZONE NOT NULL,
  result_publish_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'AdmitCardsGenerated', 'MarksEntry', 'ResultsPublished', 'Completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_scholarships_year ON scholarships(academic_year);

-- 4. Subjects Table
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id UUID REFERENCES scholarships(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  full_marks INTEGER NOT NULL DEFAULT 100,
  pass_marks INTEGER NOT NULL DEFAULT 35,
  num_questions INTEGER NOT NULL DEFAULT 50,
  question_type VARCHAR NOT NULL DEFAULT 'MCQ' CHECK (question_type IN ('MCQ', 'Written', 'Mixed')),
  negative_marking BOOLEAN NOT NULL DEFAULT FALSE,
  negative_value NUMERIC(4, 2) DEFAULT 0.00,
  marks_distribution JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_subjects_scholarship ON subjects(scholarship_id);
CREATE UNIQUE INDEX uq_scholarship_subject_name ON subjects(scholarship_id, name);

-- 5. Students Table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR NOT NULL UNIQUE, -- e.g. STU-000001
  scholarship_id UUID REFERENCES scholarships(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES schools(id) ON DELETE RESTRICT NOT NULL,
  name VARCHAR NOT NULL,
  father_name VARCHAR,
  mother_name VARCHAR,
  dob DATE NOT NULL,
  gender VARCHAR NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  class VARCHAR NOT NULL,
  section VARCHAR(10) NOT NULL,
  school_roll_no VARCHAR NOT NULL,
  guardian_contact VARCHAR(10) NOT NULL,
  address TEXT,
  photo_url TEXT,
  is_special_registration BOOLEAN NOT NULL DEFAULT FALSE,
  form_number VARCHAR,
  guardian_name VARCHAR,
  aadhaar_no VARCHAR,
  whatsapp_no VARCHAR,
  village VARCHAR,
  post_office VARCHAR,
  police_station VARCHAR,
  district VARCHAR,
  state VARCHAR,
  pin_code VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_scholarship ON students(scholarship_id);
CREATE INDEX idx_students_name_roll ON students(name, school_roll_no);

-- 6. Admit Cards Table
CREATE TABLE admit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL UNIQUE,
  roll_number VARCHAR(8) NOT NULL UNIQUE, -- 8-Digit Code: YY + D + SSSSS
  exam_date DATE NOT NULL,
  reporting_time TIME NOT NULL,
  exam_time TIME NOT NULL,
  venue TEXT NOT NULL,
  instructions TEXT,
  qr_code_payload TEXT,
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_admit_cards_roll ON admit_cards(roll_number);

-- 7. Attendance Table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status VARCHAR NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent')),
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Marks Table
CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  marks_obtained NUMERIC(5, 2) CHECK (marks_obtained >= 0),
  component_marks JSONB,
  entered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_student_subject_marks UNIQUE (student_id, subject_id)
);

CREATE INDEX idx_marks_student ON marks(student_id);
CREATE INDEX idx_marks_subject ON marks(subject_id);

-- 9. Marks Audit Trail (logs modifications to scores)
CREATE TABLE marks_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  old_marks NUMERIC(5, 2),
  new_marks NUMERIC(5, 2),
  action_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. General Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR NOT NULL,
  details JSONB,
  ip_address VARCHAR,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE admit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Simple helper functions to query roles in RLS
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS VARCHAR AS $$
  SELECT role FROM profiles WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Allow public read on profiles" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "Allow update on own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "SuperAdmin / Admin full access on profiles" ON profiles FOR ALL USING (
  get_user_role(auth.uid()) IN ('SuperAdmin', 'Admin')
);

-- Schools Policies
CREATE POLICY "Allow select on schools for everyone authenticated" ON schools FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Coordinators and Admins manage schools" ON schools FOR ALL USING (
  get_user_role(auth.uid()) IN ('SuperAdmin', 'Admin', 'ScholarshipCoordinator')
);

-- Scholarships Policies
CREATE POLICY "Allow read on scholarships for authenticated users" ON scholarships FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage scholarships" ON scholarships FOR ALL USING (
  get_user_role(auth.uid()) IN ('SuperAdmin', 'Admin')
);

-- Subjects Policies
CREATE POLICY "Allow select on subjects for authenticated users" ON subjects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage subjects" ON subjects FOR ALL USING (
  get_user_role(auth.uid()) IN ('SuperAdmin', 'Admin')
);

-- Students Policies
CREATE POLICY "Allow select on students for authenticated users" ON students FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Coordinators and Data Entry manage students" ON students FOR ALL USING (
  get_user_role(auth.uid()) IN ('SuperAdmin', 'Admin', 'ScholarshipCoordinator', 'DataEntryOperator')
);
CREATE POLICY "Invigilator creates students during exam" ON students FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'Invigilator' AND is_special_registration = TRUE
);

-- Admit Cards Policies
CREATE POLICY "Allow select on admit_cards for authenticated users" ON admit_cards FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Coordinators and Admins manage admit cards" ON admit_cards FOR ALL USING (
  get_user_role(auth.uid()) IN ('SuperAdmin', 'Admin', 'ScholarshipCoordinator')
);
CREATE POLICY "Invigilators insert admit cards during exam" ON admit_cards FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'Invigilator'
);

-- Attendance Policies
CREATE POLICY "Allow select on attendance for authenticated users" ON attendance FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Coordinators and Invigilators manage attendance" ON attendance FOR ALL USING (
  get_user_role(auth.uid()) IN ('SuperAdmin', 'Admin', 'ScholarshipCoordinator', 'Invigilator')
);

-- Marks Policies
CREATE POLICY "Allow select on marks for authenticated users" ON marks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Evaluators, Coordinators and Admins insert/update marks" ON marks FOR ALL USING (
  get_user_role(auth.uid()) IN ('SuperAdmin', 'Admin', 'ScholarshipCoordinator', 'MarksEvaluator')
);

-- Marks Audit Trail Policies
CREATE POLICY "Allow read on audit trail for admins and coordinators" ON marks_audit_trail FOR SELECT USING (
  get_user_role(auth.uid()) IN ('SuperAdmin', 'Admin', 'ScholarshipCoordinator')
);
CREATE POLICY "Enable insert for authorized roles" ON marks_audit_trail FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) IN ('SuperAdmin', 'Admin', 'ScholarshipCoordinator')
);

-- General Audit Logs Policies
CREATE POLICY "Allow read on audit logs for admins only" ON audit_logs FOR SELECT USING (
  get_user_role(auth.uid()) IN ('SuperAdmin', 'Admin')
);
CREATE POLICY "Enable insert for audit logger" ON audit_logs FOR INSERT WITH CHECK (TRUE);

-- ==========================================================
-- TRIGGERS & PROCEDURES (Audit Log & Sync)
-- ==========================================================

-- Trigger to automatically track edits on Marks table
CREATE OR REPLACE FUNCTION audit_marks_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.marks_obtained IS DISTINCT FROM NEW.marks_obtained THEN
      INSERT INTO marks_audit_trail (student_id, subject_id, old_marks, new_marks, action_by, reason)
      VALUES (NEW.student_id, NEW.subject_id, OLD.marks_obtained, NEW.marks_obtained, auth.uid(), 'Marks changed from entry UI');
    END IF;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO marks_audit_trail (student_id, subject_id, old_marks, new_marks, action_by, reason)
    VALUES (NEW.student_id, NEW.subject_id, NULL, NEW.marks_obtained, auth.uid(), 'Initial marks entry');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_marks
AFTER INSERT OR UPDATE ON marks
FOR EACH ROW EXECUTE FUNCTION audit_marks_changes();


-- Trigger to automatically create a profile record when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, email, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Viewer'),
    NEW.email,
    'Active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The signup trigger is hooked into auth.users (requires superuser or Supabase dashboard to install, but listed here as template)
-- CREATE TRIGGER on_auth_user_created
-- AFTER INSERT ON auth.users
-- FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();
