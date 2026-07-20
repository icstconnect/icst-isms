# ICST Scholarship Management System (ISMS)

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#)

---

## 📌 Project Overview

The **ICST Scholarship Management System (ISMS)** is a comprehensive, production-grade web application built for **ICST Chowberia**, a Government-Registered Computer Educational Institution. 

The system automates the complete lifecycle of scholarship examinations—from partner school registration and student candidate enrollment to bulk admit card printing, real-time mobile-first examination marks entry, automated result calculation, and public online result verification.

Designed with a **mobile-first approach**, the platform guarantees 0% horizontal overflow on mobile viewports while offering high-density, 300 DPI 2-up A4 printing for official examination admit cards.

---

## ⭐ Core Modules & Key Features

### 1. 🎓 Student & Candidate Management
- **Passport Photo Upload & Cropper**: Integrated natural-dimension canvas cropper with 60 FPS touch-drag panning and instant re-crop workflows without page reloads.
- **Advanced Filtering**: Filter candidates by Scholarship Session, Partner School, Gender, Grade, and Special Registration status.
- **Audit Event Timeline**: Tracks registration timestamps, admit card generation history, and marks updates per candidate.

### 2. 🏫 Partner School Management
- **School Registry**: Track partner schools, district locations, contact persons, and assigned Scholarship Coordinators.
- **Automatic Code Generation**: Dynamically formats unique school codes and credentials.
- **Status Controls**: Suspend or activate partner school participation in real time.

### 3. 🎫 Production Admit Card Engine (2-Up A4 Printing)
- **High-Density A4 Geometry**: Automatically arranges **2 identical admit cards per A4 portrait page** with an SVG cut guide line (`✂ Cut Along This Line ✂`).
- **Laser & Inkjet Optimized**: High-contrast monochrome layout tailored for Black & White printing (e.g., HP Smart Tank 589) without grey ink bleeding.
- **Bengali Scholarship Table**: Formatted table stating scholarship eligibility percentages applying to the **Full Course Fee** (সম্পূর্ণ কোর্স ফিতে).
- **ICST Computer Courses & Tech Showcase**: Displays Lucide outline icons and technology badges (`C`, `C++`, `Python`, `Java`, `JS`, `React`, `HTML5`, `SQL`, `MS Word`, `Photoshop`, etc.) alongside a line-art robot vector illustration.
- **Verification QR Code**: Includes QR verification payload (`isms.icstconnect.in/verify`) and digital signature profiles with authorized controller seal.

### 4. 📝 Marks & Attendance Entry Module
- **Mobile-First Card View**: Compact student cards displaying photo, exam roll, attendance status toggle, and pass/fail summary.
- **Quick Marks Modal**: Input individual subject scores with live validation (`0` to `max_marks`), instant percentage calculation, and grade assignment.
- **Continuous "Save & Next" Flow**: Allows coordinators to rapidly grade candidates sequentially without closing the modal interface.
- **Global Edit Lock Security**: Remote locking system enforced on both frontend UI and backend mock API (`mockDb.ts` throws `HTTP 403`). When enabled:
  - All input fields, attendance toggles, and save buttons are immediately disabled.
  - Periodic polling (1s interval) syncs the lock status across concurrent admin sessions.

### 5. 🔍 Public Result Verification Portal (`/results`)
- **Online Verification**: Public search portal allowing students and parents to look up exam results using their Admit Roll Number or Registration ID.
- **Detailed Marksheets**: Displays subject-wise scores, total marks, percentage, grade, overall pass/fail status, and official ICST seal.

### 6. 📊 Reports & Analytics Dashboard
- **Visual Performance Charts**: Built with `recharts` to display school participation metrics, gender distribution, score distribution, and top performers.
- **Data Export**: Export candidate and score reports as CSV/Excel files.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript 6 |
| **Build Tool** | Vite 8 |
| **Styling** | Tailwind CSS + PostCSS |
| **Icons & UI** | Lucide React |
| **Charts & Analytics** | Recharts |
| **Routing** | React Router v7 |
| **Database (Production)** | Supabase (PostgreSQL + Row Level Security) |
| **Offline/Mock Storage** | `mockDb.ts` (localStorage fallback simulator) |

---

## 📁 Project Structure

```text
icst-scholarship/
├── .agents/               # Custom AI Agent Skills & Instructions
├── public/                # Static public assets & logos
├── src/
│   ├── assets/            # Project images and graphics
│   ├── components/        # Reusable UI components (Skeleton loader, headers)
│   ├── context/           # AuthContext (JWT & Role session state)
│   ├── hooks/             # Custom React hooks
│   ├── layouts/           # DashboardLayout (Sidebar, Mobile Header, Nav)
│   ├── pages/             # Main application screens:
│   │   ├── AdmitCards.tsx       # 2-up A4 Admit Card print engine & settings
│   │   ├── CommitteeHonour.tsx  # Committee members portal
│   │   ├── DashboardHome.tsx    # Executive dashboard stats & charts
│   │   ├── Login.tsx            # Authentication portal
│   │   ├── MarksEntry.tsx       # Mobile-first marks & attendance entry
│   │   ├── Officials.tsx        # Official credentials management
│   │   ├── Reports.tsx          # Analytical reports & export tools
│   │   ├── Results.tsx          # Public result verification search
│   │   ├── Scholarships.tsx     # Scholarship session configuration
│   │   ├── Schools.tsx          # Partner school management
│   │   ├── Security.tsx         # Audit logs & Edit Lock controls
│   │   ├── SpecialReg.tsx       # Direct candidate registration
│   │   ├── Students.tsx         # Candidate directory & photo cropper
│   │   └── Subjects.tsx         # Exam subject & max marks setup
│   ├── services/
│   │   ├── mockDb.ts            # Local database fallback & 403 lock engine
│   │   └── supabase.ts          # Supabase client setup
│   ├── App.tsx                  # Application routing & protected route guards
│   ├── index.css                # Custom CSS, Tailwind imports & @media print rules
│   └── main.tsx                 # React DOM entrypoint
├── memory.md              # Active project memory & architectural rules
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind design tokens & breakpoints
├── tsconfig.json          # TypeScript project configuration
└── vite.config.ts         # Vite bundler configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### 1. Installation
Clone the repository and install project dependencies:
```bash
git clone https://github.com/your-org/icst-scholarship.git
cd icst-scholarship
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```
*Note: If Supabase variables are omitted, the application will automatically fall back to the built-in offline database (`mockDb.ts`).*

### 3. Development Server
Launch the Vite development server:
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 4. Production Build
Compile TypeScript and generate the production bundle:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview
```

---

## 🔑 Demo Access & Roles

The system enforces **Role-Based Access Control (RBAC)** across the UI and database layer:

| Role | Access Scope |
|---|---|
| **SuperAdmin** | Full system access, Global Security & Edit Lock controls, Signature Profile configuration |
| **Admin** | Management of Schools, Students, Scholarships, Marks, and Reports |
| **ScholarshipCoordinator** | Restricted to candidates enrolled under their assigned partner school |

---

## 📜 Development Guidelines

1. **Mobile-First Responsiveness**: All pages must maintain `0px` horizontal scroll on screen widths down to `320px`.
2. **Strict Edit Lock Compliance**: Every data update function must check `isAuthorizedToEdit` and return early if the global lock is active.
3. **Print Layout Integrity**: Admit card print styles in `src/index.css` must preserve `calc(50vh - 10mm)` card dimensions to maintain 2-up A4 printing alignment.

---

## 📄 License

Copyright © 2026 **ICST Chowberia**. All rights reserved.  
Unauthorized copying or distribution of this software is strictly prohibited.
