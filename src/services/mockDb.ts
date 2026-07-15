// Mock Database persistent local storage service for offline testing

export interface School {
  id: string;
  school_id: string;
  name: string;
  udise: string;
  type: 'Primary' | 'UpperPrimary' | 'Secondary' | 'HigherSecondary';
  address: string;
  district: string;
  block: string;
  pin: string;
  headmaster_name: string;
  contact_number: string;
  email: string;
  created_at: string;
}

export interface Scholarship {
  id: string;
  name: string;
  academic_year: number;
  description: string;
  registration_start: string;
  registration_end: string;
  admit_card_publish_date: string;
  result_publish_date: string;
  status: 'Draft' | 'Active' | 'AdmitCardsGenerated' | 'MarksEntry' | 'ResultsPublished' | 'Completed';
  created_at: string;
}

export interface MarksDistributionItem {
  name: string;
  max_marks: number;
}

export interface Subject {
  id: string;
  scholarship_id: string;
  name: string;
  display_order: number;
  full_marks: number;
  pass_marks: number;
  num_questions: number;
  question_type: 'MCQ' | 'Written' | 'Mixed';
  negative_marking: boolean;
  negative_value: number;
  marks_distribution?: MarksDistributionItem[] | null;
}

export interface Student {
  id: string;
  student_id: string;
  scholarship_id: string;
  school_id: string;
  name: string;
  father_name?: string | null;
  mother_name?: string | null;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  class: string;
  section: string;
  school_roll_no: string;
  guardian_contact: string;
  address?: string | null;
  photo_url: string | null;
  is_special_registration: boolean;
  form_number?: string | null;
  guardian_name?: string | null;
  aadhaar_no?: string | null;
  whatsapp_no?: string | null;
  village?: string | null;
  post_office?: string | null;
  police_station?: string | null;
  district?: string | null;
  state?: string | null;
  pin_code?: string | null;
  created_at: string;
}

export interface AdmitCard {
  id: string;
  student_id: string;
  roll_number: string;
  exam_date: string;
  reporting_time: string;
  exam_time: string;
  venue: string;
  instructions: string;
  qr_code_payload: string;
  signature_url: string;
  created_at: string;
}

export interface Mark {
  id: string;
  student_id: string;
  subject_id: string;
  marks_obtained: number | null;
  component_marks?: Record<string, number> | null;
  entered_by: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  status: 'Present' | 'Absent';
  recorded_by: string;
  created_at: string;
}

export interface MarksAuditLog {
  id: string;
  student_id: string;
  subject_id: string;
  old_marks: number | null;
  new_marks: number | null;
  action_by: string;
  reason: string;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  role: 'SuperAdmin' | 'Admin' | 'ScholarshipCoordinator' | 'MarksEvaluator' | 'Invigilator' | 'DataEntryOperator' | 'Viewer';
  contact_number: string;
  designation: string;
  joining_date: string;
  photo_url: string | null;
  status: 'Active' | 'Suspended';
  email: string;
}

// Initial Mock Data
const INITIAL_PROFILES: Profile[] = [
  { id: 'usr-1', name: 'Super Admin', role: 'SuperAdmin', contact_number: '9876543210', designation: 'General Secretary', joining_date: '2023-01-15', photo_url: null, status: 'Active', email: 'sourav@icst.in' },
  { id: 'usr-2', name: 'Admin', role: 'Admin', contact_number: '9876543211', designation: 'Exam Coordinator', joining_date: '2024-03-10', photo_url: null, status: 'Active', email: 'ananya@icst.in' }
];

const INITIAL_SCHOLARSHIPS: Scholarship[] = [];
const INITIAL_SUBJECTS: Subject[] = [];
const INITIAL_SCHOOLS: School[] = [];
const INITIAL_STUDENTS: Student[] = [];
const INITIAL_ADMIT_CARDS: AdmitCard[] = [];
const INITIAL_MARKS: Mark[] = [];
const INITIAL_ATTENDANCE: Attendance[] = [];
const INITIAL_AUDIT_LOGS: MarksAuditLog[] = [];

// Mock database CRUD management class
class MockDatabase {
  constructor() {
    this.initLocalStorage();
  }

  private initLocalStorage() {
    const keys = ['profiles', 'scholarships', 'subjects', 'schools', 'students', 'admit_cards', 'marks', 'attendance', 'audit_logs'];
    const initialDataMap: Record<string, any> = {
      profiles: INITIAL_PROFILES,
      scholarships: INITIAL_SCHOLARSHIPS,
      subjects: INITIAL_SUBJECTS,
      schools: INITIAL_SCHOOLS,
      students: INITIAL_STUDENTS,
      admit_cards: INITIAL_ADMIT_CARDS,
      marks: INITIAL_MARKS,
      attendance: INITIAL_ATTENDANCE,
      audit_logs: INITIAL_AUDIT_LOGS
    };

    keys.forEach(key => {
      if (!localStorage.getItem(`isms_${key}`)) {
        localStorage.setItem(`isms_${key}`, JSON.stringify(initialDataMap[key]));
      }
    });
  }

  // Generic accessors
  getData<T>(table: string): T[] {
    const data = localStorage.getItem(`isms_${table}`);
    return data ? JSON.parse(data) : [];
  }

  setData<T>(table: string, data: T[]) {
    localStorage.setItem(`isms_${table}`, JSON.stringify(data));
  }

  // Specific helpers
  addRecord<T extends { id: string }>(table: string, record: any): T {
    const records = this.getData<T>(table);
    const newRecord = {
      ...record,
      id: record.id || `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: record.created_at || new Date().toISOString()
    } as any;
    records.push(newRecord);
    this.setData(table, records);
    return newRecord as T;
  }

  updateRecord<T extends { id: string }>(table: string, id: string, updates: Partial<T>): T | null {
    const records = this.getData<T>(table);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;

    // Track marks updates for audit trail
    if (table === 'marks') {
      const oldMark = records[index] as any;
      const newMark = updates as any;
      if (oldMark.marks_obtained !== newMark.marks_obtained) {
        this.addRecord<MarksAuditLog>('audit_logs', {
          student_id: oldMark.student_id,
          subject_id: oldMark.subject_id,
          old_marks: oldMark.marks_obtained,
          new_marks: newMark.marks_obtained,
          action_by: 'usr-3', // Default action by Coordinator in mock
          reason: 'Coordinator manual revision',
          created_at: new Date().toISOString()
        });
      }
    }

    records[index] = { ...records[index], ...updates, updated_at: new Date().toISOString() };
    this.setData(table, records);
    return records[index];
  }

  deleteRecord<T extends { id: string }>(table: string, id: string): boolean {
    const records = this.getData<T>(table);
    const filtered = records.filter(r => r.id !== id);
    if (records.length === filtered.length) return false;
    this.setData(table, filtered);
    return true;
  }
}

export const mockDb = new MockDatabase();
