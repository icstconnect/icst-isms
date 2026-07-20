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
  // B1 Workflow Additions
  status?: 'Pending Review' | 'Approved' | 'Rejected' | 'Suspended';
  rejection_reason?: string;
  approval_history?: {
    status: string;
    timestamp: string;
    action_by: string;
    remarks?: string;
  }[];
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
  // B2 Coordinator Additions
  school_id?: string;
  permissions?: string[];
  // H2 Committee Hierarchy
  parent_id?: string;
  department?: string;
  historical_positions?: {
    position: string;
    start_date: string;
    end_date: string;
  }[];
}

// C3 Student Timeline Event
export interface StudentTimelineEvent {
  id: string;
  student_id: string;
  timestamp: string;
  user_name: string;
  action: string;
  remarks?: string;
}

// C4 Student Transfer Request
export interface StudentTransfer {
  id: string;
  student_id: string;
  from_school_id: string;
  to_school_id: string;
  status: 'Pending Admin' | 'Pending Destination' | 'Completed' | 'Rejected';
  requested_by: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

// K2 Login History
export interface LoginHistory {
  id: string;
  timestamp: string;
  user_email: string;
  ip_address: string;
  device: string;
  browser: string;
  os: string;
  location?: string;
  status: 'Success' | 'Failed';
  failed_reason?: string;
}

// K7 Security Alert
export interface SecurityAlert {
  id: string;
  timestamp: string;
  user_email: string;
  event: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Resolved';
  remarks?: string;
}

// Generic Key-Value Settings store
export interface SettingsConfig {
  id: string;
  value: any;
}

// Initial Mock Data
const INITIAL_PROFILES: Profile[] = [
  { id: 'usr-1', name: 'Super Admin', role: 'SuperAdmin', contact_number: '9876543210', designation: 'General Secretary', joining_date: '2023-01-15', photo_url: null, status: 'Active', email: 'sourav@icst.in' },
  { id: 'usr-2', name: 'Admin', role: 'Admin', contact_number: '9876543211', designation: 'Exam Coordinator', joining_date: '2024-03-10', photo_url: null, status: 'Active', email: 'ananya@icst.in' },
  {
    id: 'usr-3',
    name: 'School Coordinator',
    role: 'ScholarshipCoordinator',
    contact_number: '9876543212',
    designation: 'Coordinator',
    joining_date: '2024-05-10',
    photo_url: null,
    status: 'Active',
    email: 'coordinator@icst.in',
    school_id: 'scl-1',
    permissions: [
      'view_school',
      'register_students',
      'edit_students',
      'download_admit_cards',
      'view_schedules',
      'view_results',
      'download_reports'
    ]
  }
];

const INITIAL_SCHOLARSHIPS: Scholarship[] = [];
const INITIAL_SUBJECTS: Subject[] = [];

const INITIAL_SCHOOLS: School[] = [
  {
    id: 'scl-1',
    school_id: 'SCH-0001',
    name: 'ICST Model School',
    udise: '19180100101',
    type: 'Secondary',
    address: '12, College Street, Kolkata',
    district: 'Kolkata',
    block: 'Kolkata-I',
    pin: '700073',
    headmaster_name: 'Dr. S. K. Roy',
    contact_number: '9830012345',
    email: 'contact@icstmodel.edu.in',
    status: 'Approved',
    created_at: new Date().toISOString()
  },
  {
    id: 'scl-2',
    school_id: 'SCH-0002',
    name: 'Kolkata High School',
    udise: '19180100202',
    type: 'HigherSecondary',
    address: '45, Park Street, Kolkata',
    district: 'Kolkata',
    block: 'Kolkata-II',
    pin: '700016',
    headmaster_name: 'Mrs. A. Sen',
    contact_number: '9830054321',
    email: 'info@kolkatahigh.edu.in',
    status: 'Pending Review',
    created_at: new Date().toISOString()
  },
  {
    id: 'scl-3',
    school_id: 'SCH-0003',
    name: 'Salt Lake Public School',
    udise: '19180100303',
    type: 'Secondary',
    address: 'Sector-II, Salt Lake, Kolkata',
    district: 'North 24 Parganas',
    block: 'Bidhannagar',
    pin: '700091',
    headmaster_name: 'Mr. R. N. Dutta',
    contact_number: '9830098765',
    email: 'slps@gmail.com',
    status: 'Suspended',
    created_at: new Date().toISOString()
  }
];

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
    const keys = [
      'profiles',
      'scholarships',
      'subjects',
      'schools',
      'students',
      'admit_cards',
      'marks',
      'attendance',
      'audit_logs',
      'student_timeline',
      'student_transfers',
      'settings_config',
      'login_history',
      'security_alerts'
    ];

    const initialDataMap: Record<string, any> = {
      profiles: INITIAL_PROFILES,
      scholarships: INITIAL_SCHOLARSHIPS,
      subjects: INITIAL_SUBJECTS,
      schools: INITIAL_SCHOOLS,
      students: INITIAL_STUDENTS,
      admit_cards: INITIAL_ADMIT_CARDS,
      marks: INITIAL_MARKS,
      attendance: INITIAL_ATTENDANCE,
      audit_logs: INITIAL_AUDIT_LOGS,
      student_timeline: [],
      student_transfers: [],
      settings_config: [
        {
          id: 'duplicate_rules',
          value: {
            name_dob: true,
            guardian_contact: true,
            aadhaar: false,
            school_roll: true,
            student_id: true
          }
        },
        {
          id: 'watermark',
          value: {
            text: 'Official',
            opacity: 0.1,
            rotation: -30,
            color: '#FF0000',
            position: 'diagonal',
            enabled: true
          }
        },
        {
          id: 'signature_profiles',
          value: [
            {
              id: 'sig-default',
              session_id: 'default',
              name: 'Sourav Mukherjee',
              designation: 'Controller of Exam',
              signature_image: '',
              official_seal: '',
              institution_logo: '',
              is_active: true
            }
          ]
        },
        {
          id: 'storage_quota',
          value: {
            system_quota_mb: 500,
            session_quota_mb: 100,
            school_quota_mb: 20,
            user_quota_mb: 5
          }
        }
      ],
      login_history: [],
      security_alerts: []
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
    if (table === 'marks' || table === 'attendance') {
      const lockSetting = this.getSetting('marks_editing_lock', { locked: false });
      if (lockSetting && lockSetting.locked === true) {
        throw new Error("HTTP 403 Forbidden: Marks entry is currently locked.");
      }
    }
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
    if (table === 'marks' || table === 'attendance') {
      const lockSetting = this.getSetting('marks_editing_lock', { locked: false });
      if (lockSetting && lockSetting.locked === true) {
        throw new Error("HTTP 403 Forbidden: Marks entry is currently locked.");
      }
    }
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
    if (table === 'marks' || table === 'attendance') {
      const lockSetting = this.getSetting('marks_editing_lock', { locked: false });
      if (lockSetting && lockSetting.locked === true) {
        throw new Error("HTTP 403 Forbidden: Marks entry is currently locked.");
      }
    }
    const records = this.getData<T>(table);
    const filtered = records.filter(r => r.id !== id);
    if (records.length === filtered.length) return false;
    this.setData(table, filtered);
    return true;
  }

  // Settings Configuration Helpers
  getSetting(key: string, defaultValue: any): any {
    const settings = this.getData<SettingsConfig>('settings_config');
    const setting = settings.find(s => s.id === key);
    return setting ? setting.value : defaultValue;
  }

  setSetting(key: string, value: any) {
    const settings = this.getData<SettingsConfig>('settings_config');
    const index = settings.findIndex(s => s.id === key);
    if (index === -1) {
      settings.push({ id: key, value });
    } else {
      settings[index].value = value;
    }
    this.setData('settings_config', settings);
  }

  // Student Timeline logging helper
  addStudentEvent(studentId: string, action: string, remarks?: string, userName?: string) {
    const event: StudentTimelineEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      student_id: studentId,
      timestamp: new Date().toISOString(),
      user_name: userName || 'System',
      action,
      remarks
    };
    this.addRecord<StudentTimelineEvent>('student_timeline', event);
  }
}

export const mockDb = new MockDatabase();
