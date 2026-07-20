import React, { useState, useMemo, useEffect } from 'react';
import { mockDb, Student, School, Scholarship, Subject, Mark, Attendance } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Database, ShieldAlert, CheckCircle, Save, Lock, Unlock, Layers, Loader2, Pencil, X } from 'lucide-react';
import { SkeletonTable } from '../components/Skeleton';

export const MarksEntry: React.FC = () => {
  const { user } = useAuth();
  const { toast, showConfirm } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  // Database states loaded from Supabase or mockDb
  const [dbScholarships, setDbScholarships] = useState<Scholarship[]>(mockDb.getData<Scholarship>('scholarships'));
  const [dbSchools, setDbSchools] = useState<School[]>(mockDb.getData<School>('schools'));
  const [dbSubjects, setDbSubjects] = useState<Subject[]>(mockDb.getData<Subject>('subjects'));
  const [dbStudents, setDbStudents] = useState<Student[]>(mockDb.getData<Student>('students'));
  const [dbMarks, setDbMarks] = useState<Mark[]>(mockDb.getData<Mark>('marks'));
  const [dbAttendance, setDbAttendance] = useState<Attendance[]>(mockDb.getData<Attendance>('attendance'));
  const [dbAdmitCards, setDbAdmitCards] = useState<any[]>(mockDb.getData<any>('admit_cards'));

  const [selectedSch, setSelectedSch] = useState('');
  const [selectedScl, setSelectedScl] = useState('');

  // Admin lock toggles (state holds local locks; SuperAdmin/Admin can toggle them)
  const [marksEntryEnabled] = useState(true);
  const [marksEditingEnabled, setMarksEditingEnabled] = useState<boolean>(() => {
    const lockSetting = mockDb.getSetting('marks_editing_lock', { locked: false });
    return !lockSetting.locked;
  });
  
  // Local changes temp buffer: key is `studentId_subjectId` -> score
  const [localScores, setLocalScores] = useState<Record<string, number | ''>>({});
  const [localComponentScores, setLocalComponentScores] = useState<Record<string, Record<string, number>>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal states for mobile-first edit marks flow
  const [activeModalStudentId, setActiveModalStudentId] = useState<string | null>(null);
  const [modalScores, setModalScores] = useState<Record<string, number | ''>>({});

  // Fetch all databases from Supabase if configured
  useEffect(() => {
    const fetchLiveDbData = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const [
            { data: schs },
            { data: scls },
            { data: subs },
            { data: stus },
            { data: mrks },
            { data: atts },
            { data: cards }
          ] = await Promise.all([
            supabase.from('scholarships').select('*'),
            supabase.from('schools').select('*'),
            supabase.from('subjects').select('*').order('display_order', { ascending: true }),
            supabase.from('students').select('*'),
            supabase.from('marks').select('*'),
            supabase.from('attendance').select('*'),
            supabase.from('admit_cards').select('*')
          ]);

          if (schs) setDbScholarships(schs);
          if (scls) setDbSchools(scls);
          if (subs) setDbSubjects(subs);
          if (stus) setDbStudents(stus);
          if (mrks) setDbMarks(mrks);
          if (atts) setDbAttendance(atts);
          if (cards) setDbAdmitCards(cards);

          if (schs && schs.length > 0) setSelectedSch(schs[0].id);
          if (scls && scls.length > 0) setSelectedScl(scls[0].id);
        } catch (err) {
          console.error("Error fetching live data for Marks Entry from Supabase:", err);
        }
      } else {
        // Fallback: sync defaults if not configured
        if (dbScholarships.length > 0) setSelectedSch(dbScholarships[0].id);
        if (dbSchools.length > 0) setSelectedScl(dbSchools[0].id);
      }
      setIsLoading(false);
    };
    fetchLiveDbData();
  }, []);

  // Real-time lock detection polling (checks every 1 second for global lock state updates)
  useEffect(() => {
    const checkLockInterval = setInterval(() => {
      const lockSetting = mockDb.getSetting('marks_editing_lock', { locked: false });
      const currentLockedState = lockSetting.locked;
      const currentEditingEnabledState = !currentLockedState;

      if (currentEditingEnabledState !== marksEditingEnabled) {
        setMarksEditingEnabled(currentEditingEnabledState);
        
        // If it got locked
        if (currentLockedState) {
          if (activeModalStudentId) {
            setActiveModalStudentId(null);
            toast.warning("Editing has been locked by the administrator.");
          }
          setModalScores({});
          setLocalScores({});
        }
      }
    }, 1000);

    return () => clearInterval(checkLockInterval);
  }, [marksEditingEnabled, activeModalStudentId]);

  const handleToggleLock = () => {
    const newLockState = !marksEditingEnabled;
    const isLocked = !newLockState;
    mockDb.setSetting('marks_editing_lock', { locked: isLocked });
    setMarksEditingEnabled(newLockState);
  };

  // Load subjects for selected scholarship
  const subjects = useMemo(() => {
    return dbSubjects.filter(s => s.scholarship_id === selectedSch);
  }, [dbSubjects, selectedSch]);

  // Load student lists with their existing marks for all subjects of this session
  const studentRows = useMemo(() => {
    const filteredStudents = dbStudents.filter(s => s.scholarship_id === selectedSch && s.school_id === selectedScl);
    
    return filteredStudents.map(student => {
      const admitCard = dbAdmitCards.find((ac: any) => ac.student_id === student.id);
      const attend = dbAttendance.find(a => a.student_id === student.id);
      const isAbsent = attend?.status === 'Absent';
      
      const marksMap: Record<string, { id: string | null, score: number | '' }> = {};
      
      subjects.forEach(sub => {
        const markEntry = dbMarks.find(m => m.student_id === student.id && m.subject_id === sub.id);
        marksMap[sub.id] = {
          id: markEntry?.id || null,
          score: isAbsent ? '' : (markEntry?.marks_obtained !== undefined && markEntry.marks_obtained !== null ? markEntry.marks_obtained : '')
        };
      });

      return {
        student,
        admitCard,
        isAbsent,
        marksMap
      };
    });
  }, [dbStudents, dbMarks, dbAttendance, dbAdmitCards, selectedSch, selectedScl, subjects]);

  const getSubjectScore = (studentId: string, subjectId: string, savedScore: number | '') => {
    const key = `${studentId}_${subjectId}`;
    if (localScores[key] !== undefined) {
      return localScores[key];
    }
    return savedScore;
  };

  const handleScoreChange = (studentId: string, subjectId: string, value: string, isAbsent: boolean, maxMarks: number) => {
    if (!isAuthorizedToEdit) return;
    if (isAbsent) return; 

    const key = `${studentId}_${subjectId}`;
    if (value === '') {
      const copy = { ...localScores };
      delete copy[key];
      setLocalScores(copy);
      return;
    }

    const numericVal = parseFloat(value);
    if (isNaN(numericVal) || numericVal < 0 || numericVal > maxMarks) {
      return; 
    }

    setLocalScores({
      ...localScores,
      [key]: numericVal
    });
  };

  const getValidationErrorForSubject = (subjectId: string, val: any, maxMarks: number) => {
    if (val === '' || val === null || val === undefined) return null;
    const num = Number(val);
    if (isNaN(num)) return "Must be a valid number";
    if (num < 0) return "Cannot be negative";
    if (num > maxMarks) return `Max limit is ${maxMarks}`;
    if (!Number.isInteger(num)) return "Decimals not allowed";
    return null;
  };

  const handleOpenMarksModal = (studentId: string, marksMap: Record<string, { id: string | null, score: number | '' }>) => {
    if (!isAuthorizedToEdit) {
      toast.warning("Marks entry is currently locked by the administrator.");
      return;
    }
    setActiveModalStudentId(studentId);
    
    // Populate modalScores with current values
    const scores: Record<string, number | ''> = {};
    subjects.forEach(sub => {
      const saved = marksMap[sub.id]?.score;
      scores[sub.id] = getSubjectScore(studentId, sub.id, saved);
    });
    setModalScores(scores);
  };

  const handleModalScoreChange = (subjectId: string, value: string, maxMarks: number) => {
    if (!isAuthorizedToEdit) return;
    if (value === '') {
      setModalScores(prev => ({ ...prev, [subjectId]: '' }));
      return;
    }
    const val = parseFloat(value);
    if (isNaN(val) || val < 0 || val > maxMarks || !Number.isInteger(val)) {
      return;
    }
    setModalScores(prev => ({ ...prev, [subjectId]: val }));
  };

  const saveSingleStudentMarks = async (studentId: string, studentScores: Record<string, number | ''>) => {
    if (!isAuthorizedToEdit) {
      toast.warning("Editing is locked by the administrator.");
      return;
    }
    setIsSaving(true);
    let updatedMarks = [...dbMarks];
    
    // Convert studentScores keys to the database inputs
    const savePromises = Object.keys(studentScores).map(async subjectId => {
      const score = studentScores[subjectId];
      if (score === '') return;

      const existingMark = dbMarks.find(m => m.student_id === studentId && m.subject_id === subjectId);
      
      const markData = {
        student_id: studentId,
        subject_id: subjectId,
        marks_obtained: score,
        component_marks: null,
        entered_by: user?.id || 'usr-1'
      };

      if (isSupabaseConfigured && supabase) {
        try {
          if (existingMark) {
            const { error } = await supabase
              .from('marks')
              .update(markData)
              .eq('id', existingMark.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('marks')
              .insert(markData);
            if (error) throw error;
          }
        } catch (err: any) {
          toast.error(`Failed to save mark for candidate: ${err.message}`);
          throw err;
        }
      }

      if (existingMark) {
        const updated = mockDb.updateRecord<Mark>('marks', existingMark.id, markData);
        if (updated) {
          updatedMarks = updatedMarks.map(m => m.id === existingMark.id ? updated : m);
        }
      } else {
        const created = mockDb.addRecord<Mark>('marks', markData);
        updatedMarks.push(created);
      }
    });

    try {
      await Promise.all(savePromises);
      
      if (isSupabaseConfigured && supabase) {
        const { data: reloadRes, error: reloadErr } = await supabase.from('marks').select('*');
        if (!reloadErr && reloadRes) {
          setDbMarks(reloadRes);
        }
      } else {
        setDbMarks(updatedMarks);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Save student error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStudent = async (studentId: string) => {
    if (!isAuthorizedToEdit) return;
    const errors: string[] = [];
    subjects.forEach(sub => {
      const val = modalScores[sub.id];
      if (val !== '' && val !== null && val !== undefined) {
        if (val < 0 || val > sub.full_marks || !Number.isInteger(val)) {
          errors.push(`Invalid score for ${sub.name}. Must be an integer between 0 and ${sub.full_marks}.`);
        }
      }
    });

    if (errors.length > 0) {
      toast.warning(errors.join('. '));
      return;
    }

    await saveSingleStudentMarks(studentId, modalScores);
    setActiveModalStudentId(null);
  };

  const handleSaveAndNext = async (studentId: string) => {
    if (!isAuthorizedToEdit) return;
    const errors: string[] = [];
    subjects.forEach(sub => {
      const val = modalScores[sub.id];
      if (val !== '' && val !== null && val !== undefined) {
        if (val < 0 || val > sub.full_marks || !Number.isInteger(val)) {
          errors.push(`Invalid score for ${sub.name}. Must be an integer between 0 and ${sub.full_marks}.`);
        }
      }
    });

    if (errors.length > 0) {
      toast.warning(errors.join('. '));
      return;
    }

    await saveSingleStudentMarks(studentId, modalScores);

    // Find next student in the filtered list
    const filteredStudents = dbStudents.filter(s => s.scholarship_id === selectedSch && s.school_id === selectedScl);
    const currentIndex = filteredStudents.findIndex(s => s.id === studentId);
    if (currentIndex !== -1 && currentIndex < filteredStudents.length - 1) {
      const nextStudent = filteredStudents[currentIndex + 1];
      const nextRow = studentRows.find(r => r.student.id === nextStudent.id);
      if (nextRow) {
        // Prepare next student scores
        const scores: Record<string, number | ''> = {};
        subjects.forEach(sub => {
          const saved = nextRow.marksMap[sub.id]?.score;
          scores[sub.id] = getSubjectScore(nextStudent.id, sub.id, saved);
        });
        setModalScores(scores);
        setActiveModalStudentId(nextStudent.id);
      } else {
        setActiveModalStudentId(null);
      }
    } else {
      setActiveModalStudentId(null);
    }
  };

  const getStudentTotalAndStatus = (studentId: string, marksMap: Record<string, { id: string | null, score: number | '' }>) => {
    let totalObtained = 0;
    let totalFull = 0;
    let hasGradedAll = true;
    let passedAll = true;
    let hasAnyMark = false;

    subjects.forEach(sub => {
      const saved = marksMap[sub.id]?.score;
      const score = getSubjectScore(studentId, sub.id, saved);
      
      totalFull += sub.full_marks;
      if (score === '' || score === null) {
        hasGradedAll = false;
      } else {
        hasAnyMark = true;
        const numScore = typeof score === 'number' ? score : parseFloat(score);
        totalObtained += numScore;
        if (numScore < sub.pass_marks) {
          passedAll = false;
        }
      }
    });

    return {
      totalObtained,
      totalFull,
      hasGradedAll,
      passedAll,
      hasAnyMark
    };
  };

  const handleToggleAttendance = async (studentId: string, currentStatus: boolean) => {
    if (!isAuthorizedToEdit) {
      toast.warning("Editing is locked by the administrator.");
      return;
    }
    const newStatus: 'Present' | 'Absent' = currentStatus ? 'Present' : 'Absent';
    const existing = dbAttendance.find(a => a.student_id === studentId);
    
    // Save original state for reversion on failure
    const originalAttendance = [...dbAttendance];
    const originalScores = { ...localScores };
    const originalComponentScores = { ...localComponentScores };
    const originalDbMarks = [...dbMarks];

    // Optimistically update React state immediately for snappy user experience
    let updatedAttendance = [...dbAttendance];
    let insertedId = existing?.id || `att-${Date.now()}`;
    const attData = {
      student_id: studentId,
      status: newStatus,
      recorded_by: user?.id || 'usr-1'
    };

    if (existing) {
      const updatedObj: Attendance = { ...existing, status: newStatus };
      updatedAttendance = dbAttendance.map(a => a.id === existing.id ? updatedObj : a);
    } else {
      const createdObj: Attendance = {
        id: insertedId,
        ...attData,
        created_at: new Date().toISOString()
      };
      updatedAttendance.push(createdObj);
    }

    setDbAttendance(updatedAttendance);

    // If marked absent, optimistically clear local scores in buffer
    if (newStatus === 'Absent') {
      const copy = { ...localScores };
      Object.keys(copy).forEach(k => {
        if (k.startsWith(`${studentId}_`)) {
          delete copy[k];
        }
      });
      setLocalScores(copy);

      const copyComp = { ...localComponentScores };
      delete copyComp[studentId];
      setLocalComponentScores(copyComp);

      const studentMarks = dbMarks.filter(m => m.student_id === studentId);
      if (studentMarks.length > 0) {
        let nextDbMarks = [...dbMarks];
        studentMarks.forEach(markEntry => {
          nextDbMarks = nextDbMarks.map(m => m.id === markEntry.id ? { ...m, marks_obtained: null, component_marks: undefined } : m);
        });
        setDbMarks(nextDbMarks);
      }
    }

    // Now perform the database/local writes asynchronously
    try {
      if (isSupabaseConfigured && supabase) {
        if (existing) {
          const { error } = await supabase
            .from('attendance')
            .update({ status: newStatus })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('attendance')
            .insert(attData)
            .select()
            .single();
          if (error) throw error;
          if (data && data.id) {
            insertedId = data.id;
            setDbAttendance(prev => prev.map(a => a.student_id === studentId ? { ...a, id: data.id } : a));
          }
        }
      }

      // Sync with local mockDb
      if (existing) {
        mockDb.updateRecord<Attendance>('attendance', existing.id, { status: newStatus });
      } else {
        mockDb.addRecord<Attendance>('attendance', {
          id: insertedId,
          ...attData
        });
      }

      // Sync mockDb marks reset if absent
      if (newStatus === 'Absent') {
        const studentMarks = dbMarks.filter(m => m.student_id === studentId);
        studentMarks.forEach(markEntry => {
          mockDb.updateRecord<Mark>('marks', markEntry.id, { marks_obtained: null, component_marks: undefined });
        });
        
        if (isSupabaseConfigured && supabase && studentMarks.length > 0) {
          const { error } = await supabase
            .from('marks')
            .update({ marks_obtained: null, component_marks: null })
            .eq('student_id', studentId);
          if (error) throw error;
        }
      }
    } catch (err: any) {
      setDbAttendance(originalAttendance);
      setLocalScores(originalScores);
      setLocalComponentScores(originalComponentScores);
      setDbMarks(originalDbMarks);
      toast.error("Failed to save attendance: " + err.message);
    }
  };

  const handleSave = async () => {
    if (!isAuthorizedToEdit) {
      toast.warning("Editing is locked by the administrator.");
      return;
    }
    setIsSaving(true);
    let updatedMarks = [...dbMarks];

    // localScores maps "studentId_subjectId" -> score
    const savePromises = Object.keys(localScores).map(async key => {
      const [studentId, subjectId] = key.split('_');
      const score = localScores[key];
      
      if (score === '') return;

      const existingMark = dbMarks.find(m => m.student_id === studentId && m.subject_id === subjectId);
      
      const markData = {
        student_id: studentId,
        subject_id: subjectId,
        marks_obtained: score,
        component_marks: null,
        entered_by: user?.id || 'usr-1'
      };

      if (isSupabaseConfigured && supabase) {
        try {
          if (existingMark) {
            const { error } = await supabase
              .from('marks')
              .update(markData)
              .eq('id', existingMark.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('marks')
              .insert(markData);
            if (error) throw error;
          }
        } catch (err: any) {
          toast.error(`Failed to save mark for candidate: ${err.message}`);
          throw err;
        }
      }

      if (existingMark) {
        const updated = mockDb.updateRecord<Mark>('marks', existingMark.id, markData);
        if (updated) {
          updatedMarks = updatedMarks.map(m => m.id === existingMark.id ? updated : m);
        }
      } else {
        const created = mockDb.addRecord<Mark>('marks', markData);
        updatedMarks.push(created);
      }
    });

    try {
      await Promise.all(savePromises);
      
      if (isSupabaseConfigured && supabase) {
        const { data: reloadRes, error: reloadErr } = await supabase.from('marks').select('*');
        if (!reloadErr && reloadRes) {
          setDbMarks(reloadRes);
        }
      } else {
        setDbMarks(updatedMarks);
      }

      setLocalScores({});
      setLocalComponentScores({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Save transaction error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const isAuthorizedToEdit = useMemo(() => {
    if (!user) return false;
    
    // Global Edit Lock Check - if locked, NO ONE can edit (including Admins)
    if (!marksEditingEnabled || !marksEntryEnabled) return false;

    // If unlocked, check role permissions
    const isSuperAdminOrAdmin = user.role === 'SuperAdmin' || user.role === 'Admin';
    if (isSuperAdminOrAdmin) return true; 
    
    const isCoordinator = user.role === 'ScholarshipCoordinator';
    return isCoordinator;
  }, [user, marksEntryEnabled, marksEditingEnabled]);

  const activeStudentRow = useMemo(() => {
    if (!activeModalStudentId) return null;
    return studentRows.find(r => r.student.id === activeModalStudentId) || null;
  }, [activeModalStudentId, studentRows]);

  const modalSummary = useMemo(() => {
    if (!activeModalStudentId) return null;
    let totalObtained = 0;
    let totalFull = 0;
    let hasGradedAll = true;
    let passedAll = true;
    let hasAnyMark = false;

    subjects.forEach(sub => {
      const score = modalScores[sub.id];
      totalFull += sub.full_marks;
      if (score === '' || score === null || score === undefined) {
        hasGradedAll = false;
      } else {
        hasAnyMark = true;
        const numScore = typeof score === 'number' ? score : parseFloat(score);
        totalObtained += numScore;
        if (numScore < sub.pass_marks) {
          passedAll = false;
        }
      }
    });

    const pct = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0;
    let grade = 'F';
    if (pct >= 90) grade = 'AA';
    else if (pct >= 80) grade = 'A+';
    else if (pct >= 70) grade = 'A';
    else if (pct >= 60) grade = 'B+';
    else if (pct >= 50) grade = 'B';
    else if (pct >= 35) grade = 'C';

    return {
      totalObtained,
      totalFull,
      hasGradedAll,
      passedAll,
      hasAnyMark,
      percentage: pct,
      grade
    };
  }, [activeModalStudentId, modalScores, subjects]);

  const isAdminRole = user?.role === 'SuperAdmin' || user?.role === 'Admin';

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex flex-wrap items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            <span>Marks & Attendance Entry</span>
            {!marksEditingEnabled && (
              <span className="text-xs font-black text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                🔒 Marks Entry Locked
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage subject-wise academic test scores and candidate attendance.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto self-stretch sm:self-auto justify-end">
          {/* Admin Lock Toggles */}
          {isAdminRole && (
            <button
              onClick={handleToggleLock}
              className={`flex items-center justify-center text-xs font-bold px-4 py-2.5 rounded-xl border transition-all cursor-pointer w-full sm:w-auto ${
                marksEditingEnabled 
                  ? 'bg-green-600 text-white shadow-sm border-transparent' 
                  : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}
            >
              {marksEditingEnabled ? <Unlock className="w-3.5 h-3.5 mr-1.5" /> : <Lock className="w-3.5 h-3.5 mr-1.5" />}
              Edit Lock: {marksEditingEnabled ? 'OFF' : 'ON'}
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!isAuthorizedToEdit || Object.keys(localScores).length === 0 || isSaving}
            className={`flex items-center justify-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto ${(!isAuthorizedToEdit || Object.keys(localScores).length === 0 || isSaving) ? '' : 'cursor-pointer'}`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            {isSaving ? 'Saving...' : 'Save Entries'}
          </button>
        </div>
      </div>

      {!isAuthorizedToEdit && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-2xl flex items-center space-x-2 text-sm font-medium">
          <ShieldAlert className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <span>
            {user?.role === 'ScholarshipCoordinator' 
              ? 'Marks Editing is locked by the admin. Please request the administrator to unlock editing.' 
              : 'Your current role profile is authorized as READ-ONLY for marks sheets.'}
          </span>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-2xl flex items-center space-x-2 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span>Scores and Attendance logs saved successfully. PostgreSQL sync completed.</span>
        </div>
      )}

      {/* Filter panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Scholarship Session</label>
          <select
            value={selectedSch}
            onChange={(e) => { setSelectedSch(e.target.value); setLocalScores({}); setLocalComponentScores({}); }}
            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none"
          >
            {dbScholarships.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Academic School</label>
          <select
            value={selectedScl}
            onChange={(e) => { setSelectedScl(e.target.value); setLocalScores({}); setLocalComponentScores({}); }}
            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none"
          >
            {dbSchools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} cols={6} />
          </div>
        ) : studentRows.length > 0 ? (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs table-auto">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-2 py-3 font-semibold text-slate-600">Candidate Name</th>
                    <th className="p-2 py-3 font-semibold text-slate-600 text-center">Exam Roll</th>
                    <th className="p-2 py-3 font-semibold text-slate-600 text-center">Attendance</th>
                    {subjects.map(sub => (
                      <th key={sub.id} className="p-2 py-3 font-semibold text-slate-600 text-center">
                        {sub.name} (Max: {sub.full_marks})
                      </th>
                    ))}
                    <th className="p-2 py-3 font-semibold text-slate-600 text-center font-bold">Total</th>
                    <th className="p-2 py-3 font-semibold text-slate-600 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentRows.map(row => {
                    const summary = getStudentTotalAndStatus(row.student.id, row.marksMap);

                    return (
                      <tr key={row.student.id} className="hover:bg-slate-50/50">
                        <td className="p-2 py-2.5">
                          <div className="font-bold text-slate-800 text-xs">{row.student.name}</div>
                          <div className="text-[10px] text-slate-400">ID: {row.student.student_id}</div>
                        </td>
                        <td className="p-2 py-2.5 text-center font-mono font-bold text-slate-700 text-xs">
                          {row.admitCard ? row.admitCard.roll_number : (
                            <span className="text-[10px] text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded">No Card</span>
                          )}
                        </td>
                        <td className="p-2 py-2.5 text-center">
                          <button
                            disabled={!isAuthorizedToEdit}
                            onClick={() => handleToggleAttendance(row.student.id, row.isAbsent)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isAuthorizedToEdit ? 'cursor-pointer' : ''} ${
                              row.isAbsent 
                                ? 'bg-red-50 text-red-600 border-red-200' 
                                : 'bg-green-50 text-green-600 border-green-200'
                            }`}
                          >
                            {row.isAbsent ? 'ABSENT' : 'PRESENT'}
                          </button>
                        </td>
                        {subjects.map(sub => {
                          const savedScore = row.marksMap[sub.id]?.score;
                          const currentScore = getSubjectScore(row.student.id, sub.id, savedScore);

                          return (
                            <td key={sub.id} className="p-2 py-2.5 text-center">
                              <input
                                type="number"
                                disabled={row.isAbsent || !isAuthorizedToEdit || !row.admitCard}
                                placeholder={row.isAbsent ? 'AB' : 'Score'}
                                value={currentScore === null ? '' : currentScore}
                                onChange={(e) => handleScoreChange(row.student.id, sub.id, e.target.value, row.isAbsent, sub.full_marks)}
                                className="w-14 text-center border border-slate-200 p-1 text-xs rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-extrabold text-slate-800 disabled:opacity-50"
                              />
                            </td>
                          );
                        })}
                        <td className="p-2 py-2.5 text-center font-bold text-slate-700 text-xs">
                          {row.isAbsent ? (
                            <span className="text-[10px] text-slate-400 font-normal">AB</span>
                          ) : summary.hasAnyMark ? (
                            `${summary.totalObtained}/${summary.totalFull}`
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-2 py-2.5 text-center">
                          {row.isAbsent ? (
                            <span className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-0.5 rounded">ABSENT</span>
                          ) : summary.hasAnyMark ? (
                            summary.passedAll ? (
                              <span className="text-green-600 font-bold text-[10px] bg-green-50 px-2 py-0.5 rounded">PASS</span>
                            ) : (
                              <span className="text-red-600 font-bold text-[10px] bg-red-50 px-2 py-0.5 rounded">FAIL</span>
                            )
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="block md:hidden p-4 space-y-4">
              {studentRows.map(row => {
                const summary = getStudentTotalAndStatus(row.student.id, row.marksMap);
                const hasExistingMarks = Object.values(row.marksMap).some((m: any) => m.score !== '');

                return (
                  <div key={row.student.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
                    {/* Top candidate header info */}
                    <div className="flex items-start space-x-3.5">
                      {row.student.photo_url ? (
                        <img 
                          src={row.student.photo_url} 
                          alt={row.student.name} 
                          className="w-12 h-16 rounded-xl object-cover border border-slate-200" 
                        />
                      ) : (
                        <div className="w-12 h-16 rounded-xl bg-slate-100 border flex items-center justify-center text-sm font-bold text-slate-500">
                          {row.student.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-slate-800 text-sm truncate">{row.student.name}</h4>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {row.student.student_id}</div>
                        <div className="text-[10px] text-slate-600 font-bold font-mono mt-1 bg-slate-50 border px-2 py-0.5 rounded w-max">
                          Exam Roll: {row.admitCard ? row.admitCard.roll_number : 'No Admit Card'}
                        </div>
                      </div>
                    </div>

                    {/* Attendance segment selector */}
                    <div className="border-t pt-2.5 space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Attendance status</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={!isAuthorizedToEdit}
                          onClick={() => { if (row.isAbsent) handleToggleAttendance(row.student.id, row.isAbsent); }}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all text-center disabled:opacity-60 disabled:cursor-not-allowed ${
                            !row.isAbsent
                              ? 'bg-green-600 text-white border-transparent shadow-sm'
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 disabled:hover:bg-white'
                          } ${isAuthorizedToEdit ? 'cursor-pointer' : ''}`}
                        >
                          PRESENT
                        </button>
                        <button
                          type="button"
                          disabled={!isAuthorizedToEdit}
                          onClick={() => { if (!row.isAbsent) handleToggleAttendance(row.student.id, row.isAbsent); }}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all text-center disabled:opacity-60 disabled:cursor-not-allowed ${
                            row.isAbsent
                              ? 'bg-red-600 text-white border-transparent shadow-sm'
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 disabled:hover:bg-white'
                          } ${isAuthorizedToEdit ? 'cursor-pointer' : ''}`}
                        >
                          ABSENT
                        </button>
                      </div>
                    </div>

                    {/* Summary Total & Pass/Fail status */}
                    <div className="border-t pt-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Marks</span>
                        <span className="text-sm font-black text-slate-800">
                          {row.isAbsent ? 'ABSENT' : summary.hasAnyMark ? `${summary.totalObtained} / ${summary.totalFull}` : 'Not Graded'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block text-right">Result status</span>
                        <div className="mt-0.5">
                          {row.isAbsent ? (
                            <span className="text-red-600 font-extrabold text-[10px] bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">ABSENT</span>
                          ) : summary.hasAnyMark ? (
                            summary.passedAll ? (
                              <span className="text-green-600 font-extrabold text-[10px] bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">PASS</span>
                            ) : (
                              <span className="text-red-600 font-extrabold text-[10px] bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">FAIL</span>
                            )
                          ) : (
                            <span className="text-slate-400 font-semibold text-[10px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">-</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Enter/Edit Marks action button */}
                    <div className="border-t pt-2.5">
                      {!isAuthorizedToEdit ? (
                        <button
                          disabled
                          className="w-full py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 cursor-not-allowed"
                        >
                          <Lock className="w-3.5 h-3.5" /> Marks Locked
                        </button>
                      ) : row.isAbsent ? (
                        <button
                          disabled
                          className="w-full py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5 cursor-not-allowed"
                        >
                          Candidate is Absent
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenMarksModal(row.student.id, row.marksMap)}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {hasExistingMarks ? 'Edit Marks' : 'Enter Marks'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            No students registered in this school for this scholarship session.
          </div>
        )}
      </div>

      {/* Marks Entry Modal Dialog */}
      {activeModalStudentId && activeStudentRow && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 no-print select-none">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden max-w-md w-full flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  {activeStudentRow.marksMap && Object.values(activeStudentRow.marksMap).some((m: any) => m.score !== '') ? 'Edit Marks' : 'Enter Marks'}
                </h3>
                <p className="text-[10px] text-slate-400">Fill and save candidate marks sheets</p>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveModalStudentId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Student Header */}
              <div className="flex items-center space-x-3.5 bg-slate-50 p-3 rounded-2xl border border-slate-150">
                {activeStudentRow.student.photo_url ? (
                  <img 
                    src={activeStudentRow.student.photo_url} 
                    alt={activeStudentRow.student.name} 
                    className="w-12 h-16 rounded-lg object-cover border border-slate-200" 
                  />
                ) : (
                  <div className="w-12 h-16 rounded-lg bg-slate-100 border flex items-center justify-center text-lg font-bold text-slate-500">
                    {activeStudentRow.student.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-slate-800 text-sm truncate">{activeStudentRow.student.name}</h4>
                  <div className="text-[10px] text-slate-400 font-mono">ID: {activeStudentRow.student.student_id}</div>
                  <div className="text-[10px] text-slate-500 font-bold font-mono mt-0.5">
                    Roll: {activeStudentRow.admitCard ? activeStudentRow.admitCard.roll_number : 'No Admit Card'}
                  </div>
                </div>
              </div>

              {/* Attendance toggle inside modal */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Attendance</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!isAuthorizedToEdit}
                    onClick={() => {
                      if (activeStudentRow.isAbsent) {
                        handleToggleAttendance(activeStudentRow.student.id, activeStudentRow.isAbsent);
                      }
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      !activeStudentRow.isAbsent
                        ? 'bg-green-600 text-white border-transparent shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    PRESENT
                  </button>
                  <button
                    type="button"
                    disabled={!isAuthorizedToEdit}
                    onClick={() => {
                      if (!activeStudentRow.isAbsent) {
                        handleToggleAttendance(activeStudentRow.student.id, activeStudentRow.isAbsent);
                        // Reset modalScores locally too
                        const cleared: Record<string, number | ''> = {};
                        subjects.forEach(sub => cleared[sub.id] = '');
                        setModalScores(cleared);
                      }
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      activeStudentRow.isAbsent
                        ? 'bg-red-600 text-white border-transparent shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ABSENT
                  </button>
                </div>
              </div>

              {/* Subject mark entry inputs */}
              <div className="space-y-2.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Subject Scores</label>
                {activeStudentRow.isAbsent ? (
                  <div className="bg-red-50 text-red-700 text-xs font-extrabold p-4 rounded-2xl text-center border border-red-100">
                    Candidate is ABSENT. Attendance must be marked PRESENT to edit scores.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subjects.map(sub => {
                      const currentScore = modalScores[sub.id];
                      const error = getValidationErrorForSubject(sub.id, currentScore, sub.full_marks);

                      return (
                        <div key={sub.id} className="flex flex-col bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-slate-700">
                              {sub.name} <span className="text-[10px] text-slate-400 font-normal">(Max: {sub.full_marks})</span>
                            </span>
                            <input
                              type="number"
                              disabled={!isAuthorizedToEdit || !activeStudentRow.admitCard}
                              placeholder="Score"
                              value={currentScore === null ? '' : currentScore}
                              onChange={(e) => handleModalScoreChange(sub.id, e.target.value, sub.full_marks)}
                              className="w-24 text-center border border-slate-200 p-1.5 text-xs font-extrabold rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                            />
                          </div>
                          {error && (
                            <span className="text-[9px] text-red-500 font-extrabold mt-1 text-right">{error}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Live Summary Stats (Instant Update) */}
              {!activeStudentRow.isAbsent && modalSummary && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex justify-between text-xs border-b pb-2 border-blue-100/50">
                    <span className="text-slate-500 font-semibold">Total Marks:</span>
                    <span className="font-extrabold text-slate-800">{modalSummary.totalObtained} / {modalSummary.totalFull}</span>
                  </div>
                  <div className="flex justify-between text-xs border-b pb-2 border-blue-100/50">
                    <span className="text-slate-500 font-semibold">Percentage:</span>
                    <span className="font-extrabold text-blue-600">{modalSummary.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs border-b pb-2 border-blue-100/50">
                    <span className="text-slate-500 font-semibold">Grade:</span>
                    <span className="font-extrabold text-slate-800">{modalSummary.grade}</span>
                  </div>
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-slate-500 font-semibold">Result Status:</span>
                    {modalSummary.hasAnyMark ? (
                      modalSummary.passedAll ? (
                        <span className="text-green-600 font-extrabold text-[10px] bg-green-50 px-2 py-0.5 rounded border border-green-150">PASS</span>
                      ) : (
                        <span className="text-red-600 font-extrabold text-[10px] bg-red-50 px-2 py-0.5 rounded border border-red-150">FAIL</span>
                      )
                    ) : (
                      <span className="text-slate-400 font-medium text-[10px]">-</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Buttons */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveModalStudentId(null)}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!isAuthorizedToEdit || isSaving}
                  onClick={() => handleSaveStudent(activeStudentRow.student.id)}
                  className={`flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed ${(!isAuthorizedToEdit || isSaving) ? '' : 'cursor-pointer'}`}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Save Marks
                </button>
              </div>
              
              {!activeStudentRow.isAbsent && isAuthorizedToEdit && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveAndNext(activeStudentRow.student.id)}
                  className={`w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow flex justify-center items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${isSaving ? '' : 'cursor-pointer'}`}
                >
                  Save & Next Student ➡️
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
