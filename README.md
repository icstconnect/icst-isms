# ICST Scholarship Management System (ISMS) - Technical Documentation & User Manual

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)](#)

---

## 📖 Table of Contents
1. [Executive Summary](#-executive-summary)
2. [Architecture & Technology Stack](#-architecture--technology-stack)
3. [Database Schema & SQL Migration Guide](#-database-schema--sql-migration-guide)
4. [Module Specifications & Features](#-module-specifications--features)
5. [Admit Card 2-Up A4 Print Engine](#-admit-card-2-up-a4-print-engine)
6. [Global Security & Edit Lock Engine](#-global-security--edit-lock-engine)
7. [User Manual & Operational Workflows](#-user-manual--operational-workflows)
8. [Installation & Deployment Guide](#-installation--deployment-guide)
9. [Troubleshooting & Maintenance](#-troubleshooting--maintenance)

---

## 📌 Executive Summary

The **ICST Scholarship Management System (ISMS)** is an enterprise-grade administrative and examination management platform custom-built for **ICST Chowberia** (a Government-Registered Computer Educational Institution in Nadia, West Bengal).

ISMS automates the complete lifecycle of competitive scholarship examinations conducted across hundreds of affiliated primary, secondary, and higher-secondary schools. It manages candidate registrations, photo cropping, school partnerships, admit card printing, real-time examination grading, pass/fail calculations, and public web-based certificate verification.

---

## 🏗️ Architecture & Technology Stack

```
[ Web Browser / Mobile Device ]
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    REACT 19 + TYPESCRIPT                    │
│  - React Router v7 (Client-Side SPA Routing)                │
│  - Tailwind CSS (Mobile-First Utility Styling)              │
│  - Lucide React (Monochrome Outline Icons)                  │
│  - Recharts (Analytical Performance Dashboard)              │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│     SUPABASE (LIVE)   │             │   MOCKDB (OFFLINE)    │
│ - PostgreSQL DB       │   FALLBACK  │ - localStorage Engine │
│ - Row Level Security  │  ─────────► │ - 403 Lock Guard      │
│ - Storage Buckets     │             │ - Auto Audit Event Log│
└───────────────────────┘             └───────────────────────┘
```

### Core Technologies
- **Frontend Core**: React 19, TypeScript 6.0, Vite 8.1.
- **Styling & Design System**: Tailwind CSS v3.4, PostCSS, Lucide React icons.
- **Data Visualization**: Recharts v3.9.
- **Database & Auth**: Supabase JS SDK v2.110 (PostgreSQL + RLS) with automatic local fallback database (`mockDb.ts`).

---

## 💾 Database Schema & SQL Migration Guide

The database schema is structured around 10 primary relational tables with foreign keys and Row Level Security (RLS) policies.

```sql
-- 1. Profiles Table (User Accounts & Roles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
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

-- 2. Partner Schools Table
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id VARCHAR NOT NULL UNIQUE, -- e.g. SCH-0001
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

-- 3. Scholarships Sessions Table
CREATE TABLE scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE, -- e.g. "ICST Scholarship 2026"
  academic_year INTEGER NOT NULL,
  description TEXT,
  registration_start TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_end TIMESTAMP WITH TIME ZONE NOT NULL,
  admit_card_publish_date TIMESTAMP WITH TIME ZONE NOT NULL,
  result_publish_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'AdmitCardsGenerated', 'MarksEntry', 'ResultsPublished', 'Completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Subjects Table
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id UUID REFERENCES scholarships(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  full_marks INTEGER NOT NULL DEFAULT 100,
  pass_marks INTEGER NOT NULL DEFAULT 35,
  num_questions INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Student Candidates Table
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
  photo_url TEXT,
  is_special_registration BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Admit Cards Table
CREATE TABLE admit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL UNIQUE,
  roll_number VARCHAR NOT NULL UNIQUE,
  exam_date DATE NOT NULL,
  reporting_time VARCHAR NOT NULL,
  exam_time VARCHAR NOT NULL,
  venue TEXT NOT NULL,
  instructions TEXT,
  qr_code_payload TEXT NOT NULL,
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Marks Table
CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC(5, 2) NOT NULL CHECK (score >= 0),
  is_absent BOOLEAN DEFAULT FALSE,
  evaluator_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(student_id, subject_id)
);
```

---

## 🎯 Module Specifications & Features

### 1. Student Candidates (`/dashboard/students`)
- **Canvas Photo Cropper**: High-performance 60 FPS panning cropper scaling natural image dimensions to fit a standard `175x225` boundary.
- **Re-Crop Workflow**: Retains original uncropped image locally for adjustment without re-uploading.
- **Timeline Audit**: Tracks candidate updates, admit card generation, and marks modifications.

### 2. Partner Schools (`/dashboard/schools`)
- **UDISE & Code Registry**: Tracks school identification codes, district, block, headmaster contact details.
- **Coordinator Mapping**: Maps registered Scholarship Coordinators to specific schools.

### 3. Examination Marks Entry (`/dashboard/marks-entry`)
- **Mobile-First Cards Layout**: Designed for Android smartphones used by exam invigilators.
- **Live Pass/Fail Summary**: Computes total marks, percentage, grade, and pass status on the fly.
- **Continuous "Save & Next"**: Grade candidates sequentially inside the modal interface.

### 4. Public Results Portal (`/results`)
- **Student Lookup**: Public interface enabling candidates to query exam results via Roll Number or Student ID.
- **Marksheet View**: Displays breakdown of individual subject marks, percentage, grade, and digital validation seal.

---

## 🖨️ Admit Card 2-Up A4 Print Engine

The Admit Card generator (`src/pages/AdmitCards.tsx`) produces a high-density, 300 DPI layout designed for **HP Smart Tank 589 B&W inkjet** and laser printers.

```
┌──────────────────────────────────────────────────────────┐
│                   ICST SCHOLARSHIP EXAM                  │ ◄── Top Card
│  Roll: 261001   Name: AKASH SARKAR   [Photo]             │     (Height: 48% A4)
│  Exam Date: 2026-06-21               [QR Code]           │
│  [Bengali Scholarship Table - Full Course Fee 100/60/50] │
│  [Visual Flow: ① Exam ➔ ② Result ➔ ③ Verify ➔ ④ Enroll]  │
│  [Courses & Software Badges] [Robot Vector Graphic]      │
│  [✓ Digitally Verified]   [Invigilator]   [Controller]   │
├──────────────────────────────────────────────────────────┤
│ - - - - - - - - ✂ Cut Along This Line ✂ - - - - - - - - -│ ◄── Dashed Cut Guide
├──────────────────────────────────────────────────────────┤
│                   ICST SCHOLARSHIP EXAM                  │ ◄── Bottom Card
│  Roll: 261002   Name: PRIYA ROY      [Photo]             │     (Height: 48% A4)
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

### Key Print Features
- **Strict 2-Up Sizing**: `.admit-card` CSS height is set to `calc(50vh - 10mm)` with `@page { size: A4 portrait; margin: 8mm; }`.
- **Zero Text Clipping**: Scholarship amount columns feature expanded widths (`w-7/12`) and padding to ensure percentage labels (`১০০%`, `৬০%`, `৫০%`, `৪০%`, `৩০%`) never touch borders.
- **Updated Full Course Fee Terms**: Formatted Bengali table specifying scholarship amounts apply to **সম্পূর্ণ কোর্স ফিতে** (Full Course Fee).
- **Computer Courses Showcase**: Features outline Lucide icons for Basic, Advanced, Programming, AI, Robotics, Cyber Security, plus software badges (C, C++, Python, Java, JS, HTML5, React, SQL, Word, Excel, Photoshop, VS Code, Git).

---

## 🔒 Global Security & Edit Lock Engine

To preserve examination integrity, ISMS incorporates a global **Edit Lock Engine** enforced at both the UI layer and database service layer.

```
       [ Edit Lock = ON ]
               │
   ┌───────────┴───────────┐
   ▼                       ▼
Frontend UI             Backend Service
- All inputs disabled   - mockDb.ts checks lock
- Modals blocked        - Throws HTTP 403 Forbidden
- Attendance frozen     - Blocks synthetic requests
```

1. **Role-Agnostic Lockdown**: When Edit Lock is enabled, `isAuthorizedToEdit` returns `false` for **all user roles**, including Admins and SuperAdmins.
2. **Backend Guard**: Operations in `mockDb.ts` (`addRecord`, `updateRecord`, `deleteRecord`) check global settings and throw `HTTP 403 Forbidden: Marks entry is currently locked`.
3. **Real-Time Polling**: `MarksEntry.tsx` polls the lock state every 1 second, closing open modals and freezing editing fields instantly across concurrent sessions.

---

## 📑 User Manual & Operational Workflows

### Workflow 1: Initial Scholarship Session Setup (Admin)
1. Navigate to **Scholarships** (`/dashboard/scholarships`).
2. Create a new session (e.g. *ICST Scholarship 2027*).
3. Set registration, admit card publish, and exam dates.
4. Navigate to **Subjects** (`/dashboard/subjects`) and configure subjects, full marks, pass marks, and negative marking rules.

### Workflow 2: Registering Candidates & Partner Schools
1. Go to **Schools** (`/dashboard/schools`) and add partner schools.
2. Go to **Students** (`/dashboard/students`) to register candidates.
3. Upload and crop candidate photos using the crop modal.

### Workflow 3: Bulk Printing Admit Cards
1. Go to **Admit Cards** (`/dashboard/admit-cards`).
2. Select the Scholarship Session and Filter by School.
3. Configure Exam Date, Start Time, and End Time.
4. Click **Generate Pending Cards**.
5. Click **Bulk Print A4 Layout** and set destination to **Save as PDF** or print directly.

### Workflow 4: Examination Grading & Lock Enforcement
1. Go to **Marks Entry** (`/dashboard/marks-entry`).
2. Toggle attendance (`PRESENT` / `ABSENT`).
3. Click **Enter Marks** on a candidate card, fill in scores, and click **Save & Next Student** for continuous data entry.
4. Once grading is complete, navigate to **Security** (`/dashboard/security`) and toggle **Edit Lock = ON**.

---

## ⚙️ Installation & Deployment Guide

### Local Development Setup
```bash
# 1. Clone Repository
git clone https://github.com/icstconnect/icst-scholarship.git
cd icst-scholarship

# 2. Install Dependencies
npm install

# 3. Create Environment File
cat <<EOT > .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
EOT

# 4. Launch Development Server
npm run dev
```

### Production Build & Netlify/Vercel Deployment
```bash
# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

#### Netlify Deployment Settings
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Redirects File (`public/_redirects`)**:
  ```text
  /*    /index.html   200
  ```

---

## 🔧 Troubleshooting & Maintenance

| Symptom | Probable Cause | Solution |
|---|---|---|
| **Form reloads during image upload** | Event propagation on form button | Ensure crop save button uses `e.preventDefault()` and `e.stopPropagation()`. |
| **Horizontal scrollbar on mobile** | Overflowing table or element | Apply `max-width: 100%` and `overflow-x: hidden` to parent container. |
| **Marks entry buttons disabled** | Global Edit Lock is active | Go to **Security** screen and switch Edit Lock to **OFF**. |
| **Admit cards spilling to page 2** | Printer margins mismatched | Set browser print margins to `Default` or `8mm` with A4 portrait size. |

---

## 📜 License & Copyright

Copyright © 2026 **ICST Chowberia**. All rights reserved.  
*Internal Educational Administrative Software - ICST ISMS Platform.*
