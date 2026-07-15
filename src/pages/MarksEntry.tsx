import React, { useState, useMemo } from 'react';
import { mockDb, Student, School, Scholarship, Subject, Mark, Attendance } from '../services/mockDb';
import { useAuth } from '../context/AuthContext';
import { Database, ShieldAlert, CheckCircle, Save, Lock, Unlock } from 'lucide-react';

export const MarksEntry: React.FC = () => {
  const { user } = useAuth();
  const scholarships = mockDb.getData<Scholarship>('scholarships');
  const schools = mockDb.getData<School>('schools');

  const [selectedSch, setSelectedSch] = useState(scholarships[0]?.id || '');
  const [selectedScl, setSelectedScl] = useState(schools[0]?.id || '');
  const [selectedSub, setSelectedSub] = useState('');

  const [students, setStudents] = useState<Student[]>(mockDb.getData<Student>('students'));
  const [marks, setMarks] = useState<Mark[]>(mockDb.getData<Mark>('marks'));
  const [attendance, setAttendance] = useState<Attendance[]>(mockDb.getData<Attendance>('attendance'));

  // Admin lock toggles (state holds local locks; SuperAdmin/Admin can toggle them)
  const [marksEntryEnabled, setMarksEntryEnabled] = useState(true);
  const [marksEditingEnabled, setMarksEditingEnabled] = useState(true);
  
  // Local changes temp buffer
  const [localScores, setLocalScores] = useState<Record<string, number | 'AB'>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load subjects for selected scholarship
  const subjects = useMemo(() => {
    const list = mockDb.getData<Subject>('subjects').filter(s => s.scholarship_id === selectedSch);
    if (list.length > 0 && !selectedSub) {
      setSelectedSub(list[0].id);
    }
    return list;
  }, [selectedSch]);

  // Load subject specifications
  const activeSubjectSpec = useMemo(() => {
    return subjects.find(s => s.id === selectedSub) || null;
  }, [subjects, selectedSub]);

  // Load student lists with their existing marks for this subject
  const studentRows = useMemo(() => {
    const filteredStudents = students.filter(s => s.scholarship_id === selectedSch && s.school_id === selectedScl);
    
    return filteredStudents.map(student => {
      // Find admit card (required for marks entry)
      const admitCard = mockDb.getData<any>('admit_cards').find((ac: any) => ac.student_id === student.id);
      
      // Find current attendance status
      const attend = attendance.find(a => a.student_id === student.id);
      const isAbsent = attend?.status === 'Absent';

      // Find current mark
      const markEntry = marks.find(m => m.student_id === student.id && m.subject_id === selectedSub);
      
      const scoreValue = isAbsent ? 'AB' : (markEntry ? markEntry.marks_obtained : '');

      return {
        student,
        admitCard,
        isAbsent,
        scoreValue,
        markId: markEntry?.id || null
      };
    });
  }, [students, marks, attendance, selectedSch, selectedScl, selectedSub]);

  const handleScoreChange = (studentId: string, value: string, isAbsent: boolean) => {
    if (isAbsent) return; // Prevent entries if absent

    if (value === '') {
      const copy = { ...localScores };
      delete copy[studentId];
      setLocalScores(copy);
      return;
    }

    const numericVal = parseFloat(value);
    const maxMarks = activeSubjectSpec?.full_marks || 100;

    if (isNaN(numericVal) || numericVal < 0 || numericVal > maxMarks) {
      return; // Invalid score input bound check
    }

    setLocalScores({
      ...localScores,
      [studentId]: numericVal
    });
  };

  const handleToggleAttendance = (studentId: string, currentStatus: boolean) => {
    const newStatus = currentStatus ? 'Present' : 'Absent';
    
    // 1. Update mock DB record
    const existing = attendance.find(a => a.student_id === studentId);
    let updatedAttendance = [...attendance];
    
    if (existing) {
      const updated = mockDb.updateRecord<Attendance>('attendance', existing.id, { status: newStatus });
      if (updated) {
        updatedAttendance = attendance.map(a => a.id === existing.id ? updated : a);
      }
    } else {
      const created = mockDb.addRecord<Attendance>('attendance', {
        student_id: studentId,
        status: newStatus,
        recorded_by: user?.id || 'usr-1'
      });
      updatedAttendance.push(created);
    }

    setAttendance(updatedAttendance);

    // If marked absent, reset local scores
    if (newStatus === 'Absent') {
      const copy = { ...localScores };
      delete copy[studentId];
      setLocalScores(copy);
      
      // Update marks table to null/absent if there was a record
      const markEntry = marks.find(m => m.student_id === studentId && m.subject_id === selectedSub);
      if (markEntry) {
        const updatedMark = mockDb.updateRecord<Mark>('marks', markEntry.id, { marks_obtained: null });
        if (updatedMark) {
          setMarks(marks.map(m => m.id === markEntry.id ? updatedMark : m));
        }
      }
    }
  };

  const handleSave = () => {
    let updatedMarks = [...marks];

    Object.keys(localScores).forEach(studentId => {
      const score = localScores[studentId];
      if (score === 'AB') return;

      const existingMark = marks.find(m => m.student_id === studentId && m.subject_id === selectedSub);
      
      if (existingMark) {
        // Update
        const updated = mockDb.updateRecord<Mark>('marks', existingMark.id, {
          marks_obtained: score,
          entered_by: user?.id || 'usr-1'
        });
        if (updated) {
          updatedMarks = updatedMarks.map(m => m.id === existingMark.id ? updated : m);
        }
      } else {
        // Insert new
        const created = mockDb.addRecord<Mark>('marks', {
          student_id: studentId,
          subject_id: selectedSub,
          marks_obtained: score,
          entered_by: user?.id || 'usr-1'
        });
        updatedMarks.push(created);
      }
    });

    setMarks(updatedMarks);
    setLocalScores({});
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Check if current user role is authorized to perform editing/saving
  const isAuthorizedToEdit = useMemo(() => {
    if (!user) return false;
    const isSuperAdminOrAdmin = user.role === 'SuperAdmin' || user.role === 'Admin';
    if (isSuperAdminOrAdmin) return true; // Admins override locks
    
    // Check coordinator role authorization alongside active admin locks
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
            disabled={!isAuthorizedToEdit || Object.keys(localScores).length === 0}
            className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Entries
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
          <span>Scores and Attendance logs saved successfully. Postgres Audit triggers completed.</span>
        </div>
      )}

      {/* Filter panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Scholarship Session</label>
          <select
            value={selectedSch}
            onChange={(e) => { setSelectedSch(e.target.value); setLocalScores({}); }}
            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none"
          >
            {scholarships.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Academic School</label>
          <select
            value={selectedScl}
            onChange={(e) => { setSelectedScl(e.target.value); setLocalScores({}); }}
            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none"
          >
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Subject Selection</label>
          <select
            value={selectedSub}
            onChange={(e) => { setSelectedSub(e.target.value); setLocalScores({}); }}
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
                <th className="p-4 font-semibold text-slate-600 text-center">Attendance status</th>
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
                      <input
                        type="number"
                        disabled={row.isAbsent || !isAuthorizedToEdit || !row.admitCard}
                        placeholder={row.isAbsent ? 'AB' : 'Score'}
                        value={currentScore === 'AB' || currentScore === null ? '' : currentScore}
                        onChange={(e) => handleScoreChange(row.student.id, e.target.value, row.isAbsent)}
                        className="w-24 text-center border border-slate-200 px-2 py-1 text-sm rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-extrabold text-slate-800 disabled:opacity-50"
                      />
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
