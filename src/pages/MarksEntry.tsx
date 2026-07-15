import React, { useState, useMemo, useEffect } from 'react';
import { mockDb, Student, School, Scholarship, Subject, Mark, Attendance } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Database, ShieldAlert, CheckCircle, Save, Lock, Unlock, Layers, Loader2 } from 'lucide-react';

export const MarksEntry: React.FC = () => {
  const { user } = useAuth();
  
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
  const [selectedSub, setSelectedSub] = useState('');

  // Admin lock toggles (state holds local locks; SuperAdmin/Admin can toggle them)
  const [marksEntryEnabled] = useState(true);
  const [marksEditingEnabled, setMarksEditingEnabled] = useState(true);
  
  // Local changes temp buffer
  const [localScores, setLocalScores] = useState<Record<string, number | 'AB'>>({});
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
    };
    fetchLiveDbData();
  }, []);

  // Load subjects for selected scholarship
  const subjects = useMemo(() => {
    return dbSubjects.filter(s => s.scholarship_id === selectedSch);
  }, [dbSubjects, selectedSch]);

  // Sync selectedSub when subjects list changes
  useEffect(() => {
    if (subjects.length > 0) {
      if (!selectedSub || !subjects.some(s => s.id === selectedSub)) {
        setSelectedSub(subjects[0].id);
      }
    } else {
      setSelectedSub('');
    }
  }, [subjects, selectedSub]);

  // Load subject specifications
  const activeSubjectSpec = useMemo(() => {
    return subjects.find(s => s.id === selectedSub) || null;
  }, [subjects, selectedSub]);

  const hasDist = useMemo(() => {
    return activeSubjectSpec?.marks_distribution && activeSubjectSpec.marks_distribution.length > 0;
  }, [activeSubjectSpec]);

  // Load student lists with their existing marks for this subject
  const studentRows = useMemo(() => {
    const filteredStudents = dbStudents.filter(s => s.scholarship_id === selectedSch && s.school_id === selectedScl);
    
    return filteredStudents.map(student => {
      const admitCard = dbAdmitCards.find((ac: any) => ac.student_id === student.id);
      const attend = dbAttendance.find(a => a.student_id === student.id);
      const isAbsent = attend?.status === 'Absent';
      const markEntry = dbMarks.find(m => m.student_id === student.id && m.subject_id === selectedSub);
      
      const scoreValue = isAbsent ? 'AB' : (markEntry ? markEntry.marks_obtained : '');

      return {
        student,
        admitCard,
        isAbsent,
        scoreValue,
        markId: markEntry?.id || null,
        componentMarks: markEntry?.component_marks || null
      };
    });
  }, [dbStudents, dbMarks, dbAttendance, dbAdmitCards, selectedSch, selectedScl, selectedSub]);

  const getComponentScore = (studentId: string, componentName: string, savedComponentMarks: any) => {
    if (localComponentScores[studentId]?.[componentName] !== undefined) {
      return localComponentScores[studentId][componentName] === null ? '' : localComponentScores[studentId][componentName];
    }
    if (savedComponentMarks?.[componentName] !== undefined) {
      return savedComponentMarks[componentName];
    }
    return '';
  };

  const calculateTotalFromComponents = (scores: Record<string, number>, distribution: any[]): number | null => {
    let sum = 0;
    let hasEntries = false;
    distribution.forEach(item => {
      const val = scores[item.name];
      if (val !== undefined && val !== null) {
        sum += val;
        hasEntries = true;
      }
    });
    return hasEntries ? sum : null;
  };

  const handleScoreChange = (studentId: string, value: string, isAbsent: boolean) => {
    if (isAbsent) return; 

    if (value === '') {
      const copy = { ...localScores };
      delete copy[studentId];
      setLocalScores(copy);
      return;
    }

    const numericVal = parseFloat(value);
    const maxMarks = activeSubjectSpec?.full_marks || 100;

    if (isNaN(numericVal) || numericVal < 0 || numericVal > maxMarks) {
      return; 
    }

    setLocalScores({
      ...localScores,
      [studentId]: numericVal
    });
  };

  const handleComponentScoreChange = (
    studentId: string,
    componentName: string,
    value: string,
    maxMarks: number,
    savedComponentMarks: any
  ) => {
    const currentStudentScores = {
      ...savedComponentMarks,
      ...(localComponentScores[studentId] || {})
    };

    if (value === '') {
      delete currentStudentScores[componentName];
      const updatedLocal = { ...(localComponentScores[studentId] || {}) };
      delete updatedLocal[componentName];
      
      const newLocalComp = {
        ...localComponentScores,
        [studentId]: updatedLocal
      };
      setLocalComponentScores(newLocalComp);

      const total = calculateTotalFromComponents(currentStudentScores, activeSubjectSpec?.marks_distribution || []);
      if (total === null) {
        const copyTotal = { ...localScores };
        delete copyTotal[studentId];
        setLocalScores(copyTotal);
      } else {
        setLocalScores({
          ...localScores,
          [studentId]: total
        });
      }
      return;
    }

    const numericVal = parseFloat(value);
    if (isNaN(numericVal) || numericVal < 0 || numericVal > maxMarks) {
      return; 
    }

    const updatedLocal = {
      ...(localComponentScores[studentId] || {}),
      [componentName]: numericVal
    };

    const newLocalComp = {
      ...localComponentScores,
      [studentId]: updatedLocal
    };
    setLocalComponentScores(newLocalComp);

    const mergedScores = {
      ...savedComponentMarks,
      ...updatedLocal
    };

    const total = calculateTotalFromComponents(mergedScores, activeSubjectSpec?.marks_distribution || []);
    if (total !== null) {
      setLocalScores({
        ...localScores,
        [studentId]: total
      });
    }
  };

  const handleToggleAttendance = async (studentId: string, currentStatus: boolean) => {
    const newStatus = currentStatus ? 'Present' : 'Absent';
    
    const existing = dbAttendance.find(a => a.student_id === studentId);
    let updatedAttendance = [...dbAttendance];
    
    const attData = {
      student_id: studentId,
      status: newStatus,
      recorded_by: user?.id || 'usr-1'
    };

    let insertedId = `att-${Date.now()}`;
    if (isSupabaseConfigured && supabase) {
      try {
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
          if (data) insertedId = data.id;
        }
      } catch (err: any) {
        alert("Failed to save attendance in Supabase: " + err.message);
        return;
      }
    }

    if (existing) {
      const updated = mockDb.updateRecord<Attendance>('attendance', existing.id, { status: newStatus });
      if (updated) {
        updatedAttendance = dbAttendance.map(a => a.id === existing.id ? updated : a);
      }
    } else {
      const created = mockDb.addRecord<Attendance>('attendance', {
        id: insertedId,
        ...attData
      });
      updatedAttendance.push(created);
    }

    setDbAttendance(updatedAttendance);

    // If marked absent, reset local scores
    if (newStatus === 'Absent') {
      const copy = { ...localScores };
      delete copy[studentId];
      setLocalScores(copy);

      const copyComp = { ...localComponentScores };
      delete copyComp[studentId];
      setLocalComponentScores(copyComp);
      
      const markEntry = dbMarks.find(m => m.student_id === studentId && m.subject_id === selectedSub);
      if (markEntry) {
        if (isSupabaseConfigured && supabase) {
          try {
            const { error } = await supabase
              .from('marks')
              .update({ marks_obtained: null, component_marks: null })
              .eq('id', markEntry.id);
            if (error) throw error;
          } catch (err: any) {
            alert("Failed to reset marks in Supabase: " + err.message);
            return;
          }
        }

        const updatedMark = mockDb.updateRecord<Mark>('marks', markEntry.id, { marks_obtained: null, component_marks: undefined });
        if (updatedMark) {
          setDbMarks(dbMarks.map(m => m.id === markEntry.id ? updatedMark : m));
        }
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    let updatedMarks = [...dbMarks];

    const savePromises = Object.keys(localScores).map(async studentId => {
      const score = localScores[studentId];
      if (score === 'AB') return;

      const existingMark = dbMarks.find(m => m.student_id === studentId && m.subject_id === selectedSub);
      
      const compScores = hasDist
        ? {
            ...(existingMark?.component_marks || {}),
            ...(localComponentScores[studentId] || {})
          }
        : null;

      const markData = {
        student_id: studentId,
        subject_id: selectedSub,
        marks_obtained: score,
        component_marks: compScores,
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
      setDbMarks(updatedMarks);
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Subject Selection</label>
          <select
            value={selectedSub}
            onChange={(e) => { setSelectedSub(e.target.value); setLocalScores({}); setLocalComponentScores({}); }}
            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none"
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} (Max: {s.full_marks})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {studentRows.length > 0 ? (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">Candidate Name</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Exam Roll</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Attendance Status</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Marks Obtained</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentRows.map(row => {
                const currentScore = localScores[row.student.id] !== undefined 
                  ? localScores[row.student.id] 
                  : row.scoreValue;

                const passMarks = activeSubjectSpec?.pass_marks || 35;
                const isPass = typeof currentScore === 'number' && currentScore >= passMarks;

                return (
                  <tr key={row.student.id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{row.student.name}</div>
                      <div className="text-xs text-slate-400">ID: {row.student.student_id}</div>
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-slate-700">
                      {row.admitCard ? row.admitCard.roll_number : (
                        <span className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded">No Admit Card</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        disabled={!isAuthorizedToEdit}
                        onClick={() => handleToggleAttendance(row.student.id, row.isAbsent)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          row.isAbsent 
                            ? 'bg-red-50 text-red-600 border-red-200' 
                            : 'bg-green-50 text-green-600 border-green-200'
                        }`}
                      >
                        {row.isAbsent ? 'ABSENT (AB)' : 'PRESENT'}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      {hasDist && activeSubjectSpec?.marks_distribution ? (
                        <div className="flex flex-col items-center space-y-2">
                          <div className="flex items-center justify-center space-x-3">
                            {activeSubjectSpec.marks_distribution.map((comp) => {
                              const compVal = getComponentScore(row.student.id, comp.name, row.componentMarks);
                              return (
                                <div key={comp.name} className="flex flex-col items-center">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">{comp.name} (/{comp.max_marks})</span>
                                  <input
                                    type="number"
                                    disabled={row.isAbsent || !isAuthorizedToEdit || !row.admitCard}
                                    placeholder="Score"
                                    value={compVal}
                                    onChange={(e) => handleComponentScoreChange(row.student.id, comp.name, e.target.value, comp.max_marks, row.componentMarks)}
                                    className="w-16 text-center border border-slate-200 px-1 py-1 text-xs rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800 disabled:opacity-50 mt-1"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          {currentScore !== '' && currentScore !== null && (
                            <div className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              Total: {currentScore} / {activeSubjectSpec.full_marks}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="number"
                          disabled={row.isAbsent || !isAuthorizedToEdit || !row.admitCard}
                          placeholder={row.isAbsent ? 'AB' : 'Score'}
                          value={currentScore === 'AB' || currentScore === null ? '' : currentScore}
                          onChange={(e) => handleScoreChange(row.student.id, e.target.value, row.isAbsent)}
                          className="w-24 text-center border border-slate-200 px-2 py-1 text-sm rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-extrabold text-slate-800 disabled:opacity-50"
                        />
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.isAbsent ? (
                        <span className="text-red-600 font-bold text-xs bg-red-50 px-2.5 py-0.5 rounded">ABSENT</span>
                      ) : typeof currentScore === 'number' ? (
                        isPass ? (
                          <span className="text-green-600 font-bold text-xs bg-green-50 px-2.5 py-0.5 rounded">PASS</span>
                        ) : (
                          <span className="text-red-600 font-bold text-xs bg-red-50 px-2.5 py-0.5 rounded">FAIL</span>
                        )
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
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
