# ICST Scholarship Management System (ISMS)

## Role

You are an expert Solution Architect, Product Manager, UX Designer, Database Architect, and Senior Full Stack Engineer.

Design a **production-ready Scholarship Management System** for the **Institute of Computer Science and Technology (ICST)**.

Do **not** start coding immediately.

First create a complete solution architecture, database design, workflow, permission model, API plan, UI plan, deployment strategy, and implementation roadmap. Only after the planning is complete should development begin.

---

# Project Objective

Build a centralized, modern, real-time Scholarship Management System that manages the complete scholarship lifecycle.

**Important:** The examination itself is conducted **offline inside schools using the traditional pen-and-paper method**. Therefore, **do NOT create any online examination module**.

---

# General Requirements

- Modern UI
- Responsive design
- Fast and scalable
- Real-time updates (no full-page refresh)
- Single Page Application (SPA)
- Easy for non-technical users
- Secure
- Expandable
- Production ready

---

# Recommended Tech Stack

Recommend the best architecture suitable for **Netlify deployment**.

Include recommendations for:

- Frontend (React + TypeScript + Vite + Tailwind CSS + shadcn/ui preferred)
- Backend (Supabase / Firebase / Appwrite / PocketBase / Netlify Functions / Edge Functions)
- Database
- Authentication
- Storage
- Real-time subscriptions
- API
- Deployment
- Logging
- Backup strategy
- Audit trail

Explain why each technology is chosen.

---

# User Roles

Rename "Members" to a more professional term such as:

- Scholarship Committee Officials
- Scholarship Coordinators

Design a flexible Role-Based Access Control (RBAC) system.

Suggested roles:

- Super Admin
- Admin
- Scholarship Coordinator
- Data Entry Operator
- Marks Evaluator
- Invigilator
- Viewer

Permissions must be individually assignable.

---

# Functional Modules

## 1. Scholarship Management

Support unlimited scholarship sessions.

Example:

- ICST Scholarship 2026
- ICST Scholarship 2027
- ICST Talent Search 2028

Fields:

- Scholarship Name
- Academic Year
- Description
- Registration Start/End
- Admit Card Publish Date
- Result Publish Date
- Status

Everything must remain editable.

---

## 2. Subject Configuration

When creating a scholarship:

### Option A: Predefined Subject Groups

Example:

### WBBSE

Automatically include:

- Bengali
- English
- Mathematics
- Physical Science
- Life Science
- History
- Geography

Also support:

- CBSE
- ICSE

### Option B: Custom Subjects

Admin may manually add unlimited subjects.

Each subject includes:

- Name
- Display Order
- Full Marks
- Pass Marks
- Number of Questions
- Question Type (MCQ/Written/Mixed)
- Negative Marking (optional)

Everything editable later.

---

## 3. School Registration

Store:

- School Name
- UDISE
- School Type
- Address
- District
- Block
- PIN
- Headmaster/Headmistress
- Contact Number
- Email

Each school gets a unique School ID.

---

## 4. Student Registration

Every student must belong to exactly one school.

Collect:

- Student Name
- Father
- Mother
- DOB
- Gender
- Class
- Section
- School Roll Number
- Guardian Contact
- Address
- Photo
- Scholarship Session
- School

Each student receives a unique Student ID.

Editable anytime.

---

## 5. Special Student Registration

Support emergency registrations on examination day.

Workflow:

Invigilator →

Choose School →

Quick Student Registration →

Generate Student ID →

Generate Admit Card Immediately →

Student appears in examination.

The generated admit card must be identical to regular admit cards.

---

## 6. Examination Scheduling

Assign examination dates **school-wise**.

Fields:

- Exam Date
- Reporting Time
- Exam Time
- Venue
- Instructions

Schedules may be modified anytime.

---

## 7. Admit Card Generation

Generate:

- School-wise
- Student-wise
- Bulk PDF

Requirements:

- Two admit cards per A4 page
- Print-ready
- QR Code
- Student Photo
- Scholarship Name
- School
- Subjects
- Exam Details
- Instructions
- Signature

### Roll Number

- Exactly 8 digits
- Globally unique
- Scalable
- Never reused

Design the best roll number strategy.

---

## 8. Marks Entry

Marks entry is enabled only after admit cards are generated.

Marks are entered subject-wise.

Automatically calculate:

- Total
- Percentage
- Grade
- Rank
- Merit Position

---

## 9. Attendance

Support:

- Present
- Absent

If absent:

- Display "AB"
- Prevent marks entry
- Recalculate totals automatically

---

## 10. Marks Editing Control

Admin controls:

- Marks Entry ON/OFF
- Marks Editing ON/OFF

Only authorized Scholarship Coordinators may edit marks.

Maintain an audit trail:

- User
- Timestamp
- Old Value
- New Value
- Reason

---

## 11. Scholarship Committee Officials

Admin registers committee officials.

Store:

- Photo
- Name
- Designation
- Contact Number
- Email
- Address
- Joining Date
- Role
- Status

Everything editable.

---

## 12. Permission System

Every permission must be assignable individually.

Examples:

- School Registration
- Student Registration
- Schedule Management
- Admit Cards
- Marks Entry
- Marks Editing
- Reports
- Result Publishing
- API Access
- Settings

---

## 13. Public Result Portal

Workflow:

Scholarship →

School →

Student or Roll Number →

View Result

Display:

- Student Details
- School
- Subject-wise Marks
- Total
- Percentage
- Grade
- Rank

Include:

- Print
- Download PDF

---

## 14. Public JSON API

Expose documented REST endpoints.

Examples:

- /api/results
- /api/student
- /api/school
- /api/scholarship

Support filtering by:

- School
- Academic Year
- Student
- Roll Number

Designed for integration with **https://icstconnect.in**

---

## 15. Dashboard

Display:

- Total Schools
- Total Students
- Today's Exams
- Pending Marks
- Published Results
- Committee Officials
- Recent Activity
- Charts

Real-time updates.

---

## 16. Reports

Generate:

- School-wise
- District-wise
- Subject-wise
- Merit List
- Absent List

Export:

- PDF
- Excel
- CSV

---

## 17. Notifications

Support:

- Admit Card Published
- Results Published
- Schedule Changed
- Registration Closed

Future-ready for:

- SMS
- Email
- WhatsApp
- Push Notifications

---

## 18. Real-time Synchronization

All data changes should appear instantly without manual refresh.

---

## 19. Global Search

Search:

- Student
- Roll Number
- School
- Scholarship
- Committee Official
- Phone Number

---

## 20. Activity Log

Log:

- Registrations
- Updates
- Deletions
- Marks Changes
- Permission Changes
- Login
- Exports

Store:

- Timestamp
- User
- IP
- Device

---

## 21. Backup & Recovery

Design:

- Automatic Backups
- Version History
- Disaster Recovery Strategy

---

## 22. Security

Include:

- HTTPS
- JWT/Auth
- RBAC
- Row Level Security
- Rate Limiting
- Input Validation
- CSRF
- XSS
- SQL Injection Protection
- Audit Logs

---

## 23. Committee Honour Page

Create a public page showcasing the ICST Scholarship Committee.

Features:

- Photo
- Name
- Designation
- Biography (optional)
- Contact (optional)
- Social Links (optional)
- Search
- Filter
- Public/Private visibility
- Admin-managed content

---

# Database Design

Produce:

- Normalized schema
- ER Diagram
- PK/FK relationships
- Indexes
- Constraints
- Naming conventions

---

# Deliverables

Produce the following in order:

1. Functional Requirement Specification (FRS)
2. System Architecture
3. User Flow Diagrams
4. Database Schema
5. ER Diagram
6. API Specification
7. Authentication & Authorization Plan
8. RBAC Permission Matrix
9. Folder Structure
10. UI/UX Sitemap
11. Dashboard Wireframes
12. Admit Card Layout (2 per A4)
13. Result Page Wireframe
14. Committee Honour Page Wireframe
15. Roll Number Strategy
16. Real-time Data Flow
17. Security Plan
18. Backup & Disaster Recovery Plan
19. Deployment Plan (Netlify + Backend)
20. Future Scalability Roadmap

Only after the entire planning phase is complete should you begin implementing the application in a modular, well-documented, production-ready manner.
