import React, { useState, useMemo, useEffect } from 'react';
import { mockDb, Student, School, Scholarship, Subject, Mark, Attendance } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Database, ShieldAlert, CheckCircle, Save, Lock, Unlock, Layers, Loader2 } from 'lucide-react';
import { SkeletonTable } from '../components/Skeleton';

export const MarksEntry: React.FC = () => {
  const { user } = useAuth();
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
  const [marksEditingEnabled, setMarksEditingEnabled] = useState(true);
  
  // Local changes temp buffer: key is `studentId_subjectId` -> score
  const [localScores, setLocalScores] = useState<Record<string, number | ''>>({});
  const [localComponentScores, setLocalComponentScores] = useState<Record<string, Record<string, number>>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
            // Update the generated UUID from Supabase in the state
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
      // Revert to original state on failure
      setDbAttendance(originalAttendance);
      setLocalScores(originalScores);
      setLocalComponentScores(originalComponentScores);
      setDbMarks(originalDbMarks);
      alert("Failed to save attendance: " + err.message);
    }
  };

  const handleSave = async () => {
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
          alert(`Failed to save mark for candidate: ${err.message}`);
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
    const isSuperAdminOrAdmin = user.role === 'SuperAdmin' || user.role === 'Admin';
    if (isSuperAdminOrAdmin) return true; 
    
    const isCoordinator = user.role === 'ScholarshipCoordinator';
    return isCoordinator && marksEditingEnabled && marksEntryEnabled;
  }, [user, marksEntryEnabled, marksEditingEnabled]);

  const isAdminRole = user?.role === 'SuperAdmin' || user?.role === 'Admin';

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Database className="w-6 h-6 mr-2 text-blue-600" />
            Marks & Attendance Entry
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage subject-wise academic test scores and candidate attendance.</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Admin Lock Toggles */}
          {isAdminRole && (
            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 space-x-2">
              <button
                onClick={() => setMarksEditingEnabled(!marksEditingEnabled)}
                className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  marksEditingEnabled 
                    ? 'bg-green-600 text-white shadow-sm' 
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {marksEditingEnabled ? <Unlock className="w-3.5 h-3.5 mr-1" /> : <Lock className="w-3.5 h-3.5 mr-1" />}
                Edit Lock: {marksEditingEnabled ? 'OFF' : 'ON'}
              </button>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!isAuthorizedToEdit || Object.keys(localScores).length === 0 || isSaving}
            className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors"
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
                        className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all cursor-pointer ${
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
        ) : (
          <div className="p-12 text-center text-slate-400">
            No students registered in this school for this scholarship session.
          </div>
        )}
      </div>
    </div>
  );
};
