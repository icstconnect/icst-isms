import React, { useState, useMemo } from 'react';
import { mockDb, Student, School, Scholarship, AdmitCard, Mark, Attendance } from '../services/mockDb';
import { FileSpreadsheet, Download, Search, AlertCircle, FileText } from 'lucide-react';

export const Reports: React.FC = () => {
  const scholarships = mockDb.getData<Scholarship>('scholarships');
  const schools = mockDb.getData<School>('schools');

  const [selectedSch, setSelectedSch] = useState(scholarships[0]?.id || '');
  const [reportType, setReportType] = useState<'MeritList' | 'AbsentList'>('MeritList');

  const students = mockDb.getData<Student>('students');
  const admitCards = mockDb.getData<AdmitCard>('admit_cards');
  const marks = mockDb.getData<Mark>('marks');
  const attendance = mockDb.getData<Attendance>('attendance');

  // Load subject checklist for the active scholarship
  const subjects = useMemo(() => {
    return mockDb.getData<any>('subjects').filter(sub => sub.scholarship_id === selectedSch);
  }, [selectedSch]);

  // Ranks/Filters rows depending on selection
  const reportRows = useMemo(() => {
    const activeSchStudents = students.filter(s => s.scholarship_id === selectedSch);

    if (reportType === 'AbsentList') {
      // Find students marked as Absent
      return activeSchStudents.filter(student => {
        const attend = attendance.find(a => a.student_id === student.id);
        return attend?.status === 'Absent';
      }).map(student => {
        const school = schools.find(s => s.id === student.school_id);
        const card = admitCards.find(ac => ac.student_id === student.id);
        return {
          id: student.id,
          studentId: student.student_id,
          name: student.name,
          roll: card?.roll_number || '-',
          schoolName: school?.name || 'N/A',
          contact: student.guardian_contact
        };
      });
    } else {
      // Merit List
      // Ranks present students by their score total
      const presentRows = activeSchStudents.filter(student => {
        const attend = attendance.find(a => a.student_id === student.id);
        return !attend || attend.status === 'Present';
      }).map(student => {
        const school = schools.find(s => s.id === student.school_id);
        const card = admitCards.find(ac => ac.student_id === student.id);
        const studentMarks = marks.filter(m => m.student_id === student.id);

        let total = 0;
        let subjectsAttempted = 0;
        studentMarks.forEach(m => {
          if (m.marks_obtained !== null) {
            total += m.marks_obtained;
            subjectsAttempted++;
          }
        });

        // Calculate aggregate percentage
        const totalFullMarks = subjects.reduce((sum, s) => sum + s.full_marks, 0);
        const percentage = totalFullMarks > 0 ? ((total / totalFullMarks) * 100) : 0;

        return {
          id: student.id,
          studentId: student.student_id,
          name: student.name,
          roll: card?.roll_number || '-',
          schoolName: school?.name || 'N/A',
          total,
          percentage: percentage.toFixed(2),
          subjectsAttempted
        };
      });

      // Sort by total marks descending
      return presentRows.sort((a, b) => b.total - a.total);
    }
  }, [selectedSch, reportType, students, admitCards, marks, attendance, subjects, schools]);

  // Export CSV Helper
  const handleExportCSV = () => {
    let headers: string[] = [];
    let csvRows: string[][] = [];

    if (reportType === 'AbsentList') {
      headers = ['Student ID', 'Name', 'Roll Number', 'School', 'Guardian Contact'];
      csvRows = reportRows.map((row: any) => [
        row.studentId,
        row.name,
        row.roll,
        row.schoolName,
        row.contact
      ]);
    } else {
      headers = ['Rank', 'Student ID', 'Name', 'Roll Number', 'School', 'Subjects Attempted', 'Total Score', 'Percentage'];
      csvRows = reportRows.map((row: any, index) => [
        String(index + 1),
        row.studentId,
        row.name,
        row.roll,
        row.schoolName,
        String(row.subjectsAttempted),
        String(row.total),
        `${row.percentage}%`
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ICST_${reportType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <FileSpreadsheet className="w-6 h-6 mr-2 text-blue-600" />
            Report Generator
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Filter, query, and export examination analytics and performance lists.</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={reportRows.length === 0}
          className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors"
        >
          <Download className="w-4 h-4 mr-1.5" />
          Export CSV Sheets
        </button>
      </div>

      {/* Query panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Scholarship Session</label>
          <select
            value={selectedSch}
            onChange={(e) => setSelectedSch(e.target.value)}
            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none"
          >
            {scholarships.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none"
          >
            <option value="MeritList">Scholarship Merit List (Ranks)</option>
            <option value="AbsentList">Candidate Absence Register</option>
          </select>
        </div>
      </div>

      {/* Grid of Results */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-500 uppercase">Generated Registry Preview</span>
          <span className="text-xs font-semibold text-slate-400">Total: {reportRows.length} Rows</span>
        </div>

        {reportRows.length > 0 ? (
          reportType === 'AbsentList' ? (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-semibold text-slate-600">Student ID</th>
                  <th className="p-4 font-semibold text-slate-600">Student Name</th>
                  <th className="p-4 font-semibold text-slate-600 text-center">Exam Roll</th>
                  <th className="p-4 font-semibold text-slate-600">School</th>
                  <th className="p-4 font-semibold text-slate-600">Guardian Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportRows.map((row: any) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-slate-400">{row.studentId}</td>
                    <td className="p-4 font-bold text-slate-800 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                      {row.name}
                    </td>
                    <td className="p-4 text-center font-mono font-semibold text-slate-700">{row.roll}</td>
                    <td className="p-4 text-slate-600 font-medium">{row.schoolName}</td>
                    <td className="p-4 text-slate-500 font-medium">{row.contact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-semibold text-slate-600 text-center">Rank</th>
                  <th className="p-4 font-semibold text-slate-600">Student ID</th>
                  <th className="p-4 font-semibold text-slate-600">Student Name</th>
                  <th className="p-4 font-semibold text-slate-600 text-center">Exam Roll</th>
                  <th className="p-4 font-semibold text-slate-600">School</th>
                  <th className="p-4 font-semibold text-slate-600 text-center">Subjects Attempted</th>
                  <th className="p-4 font-semibold text-slate-600 text-center">Total Marks</th>
                  <th className="p-4 font-semibold text-slate-600 text-center">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportRows.map((row: any, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 text-center font-bold text-blue-600">#{idx + 1}</td>
                    <td className="p-4 font-mono font-bold text-slate-400">{row.studentId}</td>
                    <td className="p-4 font-bold text-slate-800 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-blue-500" />
                      {row.name}
                    </td>
                    <td className="p-4 text-center font-mono font-semibold text-slate-700">{row.roll}</td>
                    <td className="p-4 text-slate-600 font-medium">{row.schoolName}</td>
                    <td className="p-4 text-center text-slate-500 font-bold">{row.subjectsAttempted}</td>
                    <td className="p-4 text-center font-extrabold text-slate-800">{row.total}</td>
                    <td className="p-4 text-center">
                      <span className="text-xs font-bold bg-blue-50 px-2 py-0.5 rounded text-blue-700 border border-blue-100">
                        {row.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div className="p-12 text-center text-slate-400">
            No records match the current selections.
          </div>
        )}
      </div>
    </div>
  );
};
