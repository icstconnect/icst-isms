import { mockDb, Student, School, Scholarship, AdmitCard, Subject } from './mockDb';
import { fetchSetting, saveSetting } from './settingsService';
import { supabase, isSupabaseConfigured } from './supabase';

export interface ValidationIssue {
  type: 'student' | 'attendance' | 'marks' | 'subject' | 'school' | 'session';
  title: string;
  detail: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  totalStudents: number;
  totalSchools: number;
  totalPresent: number;
  totalAbsent: number;
}

export interface CalculatedResultItem {
  student_id: string;
  roll_number: string;
  name: string;
  school_id: string;
  school_name: string;
  class_name: string;
  photo_url: string | null;
  is_absent: boolean;
  subject_scores: Record<string, number>; // subject_id -> score
  total_obtained: number;
  total_full: number;
  percentage: number;
  grade: string;
  passed_all: boolean;
  overall_rank: number;
  school_rank: number;
  scholarship_pct: number;
  fee_type: 'Full Course Fees' | 'Admission Fee';
  scholarship_title: string;
  status: 'PASS' | 'FAIL' | 'ABSENT';
}

export interface PublicationStatus {
  published: boolean;
  published_at?: string;
  published_by?: string;
  session_id: string;
}

export const getPublicationStatus = async (sessionId: string): Promise<PublicationStatus> => {
  const statusMap = await fetchSetting<Record<string, PublicationStatus>>('publication_status_map', {});
  return statusMap[sessionId] || { published: false, session_id: sessionId };
};

export const validateSessionPublication = async (sessionId: string): Promise<ValidationResult> => {
  let students: Student[] = mockDb.getData<Student>('students').filter(s => s.scholarship_id === sessionId);
  let schools: School[] = mockDb.getData<School>('schools');
  let subjects: Subject[] = mockDb.getData<Subject>('subjects').filter(s => s.scholarship_id === sessionId);
  let admitCards: AdmitCard[] = mockDb.getData<AdmitCard>('admit_cards');
  let rawAttendance = mockDb.getData<any>('attendance');
  let rawMarks = mockDb.getData<any>('marks');

  if (isSupabaseConfigured && supabase) {
    try {
      const [stuRes, sclRes, subRes, cardRes, attRes, mrkRes] = await Promise.all([
        supabase.from('students').select('*').eq('scholarship_id', sessionId),
        supabase.from('schools').select('*'),
        supabase.from('subjects').select('*').eq('scholarship_id', sessionId),
        supabase.from('admit_cards').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('marks').select('*')
      ]);
      if (stuRes.data) students = stuRes.data;
      if (sclRes.data) schools = sclRes.data;
      if (subRes.data) subjects = subRes.data;
      if (cardRes.data) admitCards = cardRes.data;
      if (attRes.data) rawAttendance = attRes.data;
      if (mrkRes.data) rawMarks = mrkRes.data;
    } catch (err) {
      console.warn("Supabase fetch failed during publication validation, using local data:", err);
    }
  }

  const issues: ValidationIssue[] = [];

  // 1. Session check
  if (students.length === 0) {
    issues.push({
      type: 'session',
      title: 'No Registered Candidates',
      detail: 'Selected scholarship session has no registered students.'
    });
  }

  if (subjects.length === 0) {
    issues.push({
      type: 'subject',
      title: 'No Subjects Configured',
      detail: 'No examination subjects are configured for this session.'
    });
  }

  // Check subjects config
  subjects.forEach(sub => {
    if (!sub.full_marks || sub.full_marks <= 0) {
      issues.push({
        type: 'subject',
        title: `Invalid Full Marks: ${sub.name}`,
        detail: `Subject "${sub.name}" must have Full Marks greater than 0.`
      });
    }
  });

  // 2. Student Registration Integrity
  let missingPhotos = 0;
  let missingRolls = 0;
  let missingSchools = 0;

  students.forEach(st => {
    if (!st.photo_url) missingPhotos++;
    const card = admitCards.find(ac => ac.student_id === st.id);
    if (!card || !card.roll_number) missingRolls++;
    const school = schools.find(sc => sc.id === st.school_id);
    if (!school) missingSchools++;
  });

  if (missingPhotos > 0) {
    issues.push({
      type: 'student',
      title: 'Incomplete Registrations (Missing Photos)',
      detail: `${missingPhotos} registered student(s) are missing passport photograph uploads.`
    });
  }

  if (missingRolls > 0) {
    issues.push({
      type: 'student',
      title: 'Missing Admit Cards / Roll Numbers',
      detail: `${missingRolls} registered student(s) do not have generated admit cards or roll numbers assigned.`
    });
  }

  if (missingSchools > 0) {
    issues.push({
      type: 'school',
      title: 'Unmapped School Assignments',
      detail: `${missingSchools} student(s) have invalid or unmapped school IDs.`
    });
  }

  // 3. Attendance Validation
  let unrecordedAttendance = 0;
  let presentCount = 0;
  let absentCount = 0;

  const studentAttendanceMap: Record<string, boolean> = {}; // studentId -> isAbsent boolean

  students.forEach(st => {
    const attRec = rawAttendance.find((a: any) => a.student_id === st.id);
    const hasMarks = rawMarks.some((m: any) => m.student_id === st.id && m.marks_obtained !== null && m.marks_obtained !== undefined && m.marks_obtained !== '');
    
    let isAbsent: boolean | null = null;
    if (attRec) {
      if (attRec.status === 'Absent' || attRec.is_absent === true) isAbsent = true;
      else if (attRec.status === 'Present' || attRec.is_absent === false) isAbsent = false;
    } else if (hasMarks) {
      isAbsent = false; // Present if marks entered
    }

    if (isAbsent === null) {
      unrecordedAttendance++;
    } else {
      studentAttendanceMap[st.id] = isAbsent;
      if (isAbsent) absentCount++;
      else presentCount++;
    }
  });

  if (unrecordedAttendance > 0) {
    issues.push({
      type: 'attendance',
      title: 'Pending Attendance Records',
      detail: `${unrecordedAttendance} student(s) do not have attendance marked as Present or Absent.`
    });
  }

  // 4. Marks Validation for Present Students
  let missingMarksCount = 0;
  const missingMarksDetails: string[] = [];

  students.forEach(st => {
    const isAbsent = studentAttendanceMap[st.id];
    if (isAbsent === false) { // Present
      subjects.forEach(sub => {
        const markRec = rawMarks.find((m: any) => m.student_id === st.id && m.subject_id === sub.id);
        const scoreVal = markRec ? (markRec.marks_obtained !== null && markRec.marks_obtained !== undefined ? markRec.marks_obtained : markRec.score) : undefined;
        
        if (scoreVal === undefined || scoreVal === null || scoreVal === '') {
          missingMarksCount++;
          if (missingMarksDetails.length < 5) {
            const schoolName = schools.find(s => s.id === st.school_id)?.name || 'School';
            missingMarksDetails.push(`${st.name} (${schoolName}) - ${sub.name}`);
          }
        } else {
          const numScore = parseFloat(scoreVal);
          if (isNaN(numScore) || numScore < 0 || numScore > sub.full_marks) {
            issues.push({
              type: 'marks',
              title: `Invalid Mark Value: ${st.name}`,
              detail: `Score ${scoreVal} in ${sub.name} exceeds subject range (0-${sub.full_marks}).`
            });
          }
        }
      });
    }
  });

  if (missingMarksCount > 0) {
    issues.push({
      type: 'marks',
      title: 'Incomplete Subject Scores',
      detail: `${missingMarksCount} score entry(ies) are missing for Present candidates. E.g.: ${missingMarksDetails.join('; ')}`
    });
  }

  const uniqueSchoolsCount = new Set(students.map(s => s.school_id)).size;

  return {
    isValid: issues.length === 0,
    issues,
    totalStudents: students.length,
    totalSchools: uniqueSchoolsCount,
    totalPresent: presentCount,
    totalAbsent: absentCount
  };
};

export const publishSessionResults = async (
  sessionId: string, 
  userRole: string, 
  userName: string
): Promise<{ success: boolean; totalPublished: number }> => {
  if (userRole !== 'SuperAdmin') {
    throw new Error("HTTP 403 Forbidden: Only SuperAdmin has authority to publish scholarship results.");
  }

  const validation = await validateSessionPublication(sessionId);
  if (!validation.isValid) {
    throw new Error("Validation failed. Please resolve all checklist errors before publishing.");
  }

  // 1. Fetch all data to calculate ranks & scholarships
  let students: Student[] = mockDb.getData<Student>('students').filter(s => s.scholarship_id === sessionId);
  let schools: School[] = mockDb.getData<School>('schools');
  let subjects: Subject[] = mockDb.getData<Subject>('subjects').filter(s => s.scholarship_id === sessionId);
  let admitCards: AdmitCard[] = mockDb.getData<AdmitCard>('admit_cards');
  let rawAttendance = mockDb.getData<any>('attendance');
  let rawMarks = mockDb.getData<any>('marks');

  if (isSupabaseConfigured && supabase) {
    try {
      const [stuRes, sclRes, subRes, cardRes, attRes, mrkRes] = await Promise.all([
        supabase.from('students').select('*').eq('scholarship_id', sessionId),
        supabase.from('schools').select('*'),
        supabase.from('subjects').select('*').eq('scholarship_id', sessionId),
        supabase.from('admit_cards').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('marks').select('*')
      ]);
      if (stuRes.data) students = stuRes.data;
      if (sclRes.data) schools = sclRes.data;
      if (subRes.data) subjects = subRes.data;
      if (cardRes.data) admitCards = cardRes.data;
      if (attRes.data) rawAttendance = attRes.data;
      if (mrkRes.data) rawMarks = mrkRes.data;
    } catch (e) {}
  }

  const totalFull = subjects.reduce((sum, s) => sum + s.full_marks, 0);

  // 2. Pre-calculate total scores
  const calculatedItems: CalculatedResultItem[] = students.map(st => {
    const schoolObj = schools.find(s => s.id === st.school_id);
    const cardObj = admitCards.find(ac => ac.student_id === st.id);
    const attRec = rawAttendance.find((a: any) => a.student_id === st.id);
    const hasMarks = rawMarks.some((m: any) => m.student_id === st.id && m.marks_obtained !== null && m.marks_obtained !== undefined && m.marks_obtained !== '');
    
    let isAbsent = false;
    if (attRec) {
      if (attRec.status === 'Absent' || attRec.is_absent === true) isAbsent = true;
      else if (attRec.status === 'Present' || attRec.is_absent === false) isAbsent = false;
    } else if (hasMarks) {
      isAbsent = false;
    }

    const subjectScores: Record<string, number> = {};
    let totalObtained = 0;
    let passedAll = !isAbsent;

    subjects.forEach(sub => {
      if (isAbsent) {
        subjectScores[sub.id] = 0;
      } else {
        const m = rawMarks.find((mk: any) => mk.student_id === st.id && mk.subject_id === sub.id);
        const rawScore = m ? (m.marks_obtained !== null && m.marks_obtained !== undefined ? m.marks_obtained : m.score) : 0;
        const scoreVal = parseFloat(rawScore) || 0;
        subjectScores[sub.id] = scoreVal;
        totalObtained += scoreVal;
        if (scoreVal < sub.pass_marks) passedAll = false;
      }
    });

    const percentage = isAbsent || totalFull === 0 ? 0 : parseFloat(((totalObtained / totalFull) * 100).toFixed(2));
    
    let grade = 'F';
    if (!isAbsent) {
      if (percentage >= 90) grade = 'AA';
      else if (percentage >= 80) grade = 'A+';
      else if (percentage >= 70) grade = 'A';
      else if (percentage >= 60) grade = 'B+';
      else if (percentage >= 50) grade = 'B';
      else if (percentage >= 35) grade = 'C';
      else grade = 'F';
    }

    return {
      student_id: st.id,
      roll_number: cardObj?.roll_number || st.student_id,
      name: st.name,
      school_id: st.school_id,
      school_name: schoolObj?.name || 'School',
      class_name: st.class,
      photo_url: st.photo_url,
      is_absent: isAbsent,
      subject_scores: subjectScores,
      total_obtained: isAbsent ? 0 : totalObtained,
      total_full: totalFull,
      percentage: isAbsent ? 0 : percentage,
      grade: isAbsent ? 'AB' : grade,
      passed_all: passedAll,
      overall_rank: 99999,
      school_rank: 99999,
      scholarship_pct: isAbsent ? 0 : 30,
      fee_type: 'Admission Fee',
      scholarship_title: '30% Concession on Admission Fee',
      status: isAbsent ? 'ABSENT' : (passedAll ? 'PASS' : 'FAIL')
    };
  });

  // 3. Compute Overall Ranks for Appeared Candidates
  const appeared = calculatedItems.filter(item => !item.is_absent);
  appeared.sort((a, b) => b.percentage - a.percentage || b.total_obtained - a.total_obtained);
  appeared.forEach((item, idx) => {
    item.overall_rank = idx + 1;
  });

  // 4. Compute School Ranks
  const schoolGroups: Record<string, CalculatedResultItem[]> = {};
  appeared.forEach(item => {
    if (!schoolGroups[item.school_id]) schoolGroups[item.school_id] = [];
    schoolGroups[item.school_id].push(item);
  });

  Object.values(schoolGroups).forEach(group => {
    group.sort((a, b) => b.percentage - a.percentage || b.total_obtained - a.total_obtained);
    group.forEach((item, sIdx) => {
      item.school_rank = sIdx + 1;
    });
  });

  // 5. Assign Scholarship Tiers
  appeared.forEach(item => {
    if (item.overall_rank === 1) {
      item.scholarship_pct = 100;
      item.fee_type = 'Full Course Fees';
      item.scholarship_title = '100% Scholarship on Full Course Fees (Overall Rank 1)';
    } else if (item.school_rank === 1) {
      item.scholarship_pct = 60;
      item.fee_type = 'Full Course Fees';
      item.scholarship_title = '60% Scholarship on Full Course Fees (School Rank 1)';
    } else if (item.school_rank === 2) {
      item.scholarship_pct = 50;
      item.fee_type = 'Full Course Fees';
      item.scholarship_title = '50% Scholarship on Full Course Fees (School Rank 2)';
    } else if (item.school_rank === 3) {
      item.scholarship_pct = 40;
      item.fee_type = 'Full Course Fees';
      item.scholarship_title = '40% Scholarship on Full Course Fees (School Rank 3)';
    } else {
      item.scholarship_pct = 30;
      item.fee_type = 'Admission Fee';
      item.scholarship_title = '30% Concession on Admission Fee';
    }
  });

  // 6. Save Published Results Dataset to Database & Lock Marks Entry
  const publishedMap = await fetchSetting<Record<string, CalculatedResultItem[]>>('published_results_data', {});
  publishedMap[sessionId] = calculatedItems;
  await saveSetting('published_results_data', publishedMap);

  // Lock Marks Entry
  await saveSetting('marks_editing_lock', { locked: true, locked_at: new Date().toISOString(), locked_by: userName });

  // Update Status Map
  const statusMap = await fetchSetting<Record<string, PublicationStatus>>('publication_status_map', {});
  statusMap[sessionId] = {
    published: true,
    published_at: new Date().toISOString(),
    published_by: userName,
    session_id: sessionId
  };
  await saveSetting('publication_status_map', statusMap);

  return { success: true, totalPublished: calculatedItems.length };
};

export const unpublishSessionResults = async (
  sessionId: string, 
  userRole: string,
  userName: string
): Promise<boolean> => {
  if (userRole !== 'SuperAdmin') {
    throw new Error("HTTP 403 Forbidden: Only SuperAdmin has authority to unpublish results.");
  }

  const statusMap = await fetchSetting<Record<string, PublicationStatus>>('publication_status_map', {});
  statusMap[sessionId] = {
    published: false,
    session_id: sessionId,
    published_at: undefined,
    published_by: undefined
  };
  await saveSetting('publication_status_map', statusMap);

  return true;
};
