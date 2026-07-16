import React, { useState, useMemo, useEffect } from 'react';
import { mockDb, Student, School, Scholarship, AdmitCard, Mark, Attendance } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  FileText, 
  Printer, 
  Award, 
  TrendingUp, 
  Users, 
  School as SchoolIcon 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

import { SkeletonTable, SkeletonDashboard } from '../components/Skeleton';

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const [dbScholarships, setDbScholarships] = useState<Scholarship[]>([]);
  const [dbSchools, setDbSchools] = useState<School[]>([]);
  const [dbSubjects, setDbSubjects] = useState<any[]>([]);
  const [dbStudents, setDbStudents] = useState<Student[]>([]);
  const [dbAdmitCards, setDbAdmitCards] = useState<AdmitCard[]>([]);
  const [dbMarks, setDbMarks] = useState<Mark[]>([]);
  const [dbAttendance, setDbAttendance] = useState<Attendance[]>([]);

  const [selectedSch, setSelectedSch] = useState('');
  const [reportType, setReportType] = useState<'MeritList' | 'AbsentList' | 'GenderAnalysis'>('MeritList');

  // Load baseline statistics and DB entries
  const loadData = async () => {
    let localSchs = mockDb.getData<Scholarship>('scholarships');
    let localSchools = mockDb.getData<School>('schools');
    let localSubjects = mockDb.getData<any>('subjects');
    let localStudents = mockDb.getData<Student>('students');
    let localCards = mockDb.getData<AdmitCard>('admit_cards');
    let localMarks = mockDb.getData<Mark>('marks');
    let localAtt = mockDb.getData<Attendance>('attendance');

    if (isSupabaseConfigured && supabase) {
      try {
        const [schs, scls, subs, stus, mrks, atts, cards] = await Promise.all([
          supabase.from('scholarships').select('*'),
          supabase.from('schools').select('*'),
          supabase.from('subjects').select('*').order('display_order', { ascending: true }),
          supabase.from('students').select('*'),
          supabase.from('marks').select('*'),
          supabase.from('attendance').select('*'),
          supabase.from('admit_cards').select('*')
        ]);
        if (schs.data) localSchs = schs.data;
        if (scls.data) localSchools = scls.data;
        if (subs.data) localSubjects = subs.data;
        if (stus.data) localStudents = stus.data;
        if (mrks.data) localMarks = mrks.data;
        if (atts.data) localAtt = atts.data;
        if (cards.data) localCards = cards.data;
      } catch (err) {
        console.error("Error loading live data in Reports:", err);
      }
    }

    setDbScholarships(localSchs);
    setDbSchools(localSchools);
    setDbSubjects(localSubjects);
    setDbStudents(localStudents);
    setDbMarks(localMarks);
    setDbAttendance(localAtt);
    setDbAdmitCards(localCards);

    if (localSchs.length > 0 && !selectedSch) {
      setSelectedSch(localSchs[0].id);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const subjects = useMemo(() => {
    return dbSubjects.filter(sub => sub.scholarship_id === selectedSch);
  }, [dbSubjects, selectedSch]);

  // B2 view restriction: coordinators can only generate reports for their own school
  const activeSchStudents = useMemo(() => {
    let list = dbStudents.filter(s => s.scholarship_id === selectedSch);
    if (user && user.role === 'ScholarshipCoordinator') {
      list = list.filter(s => s.school_id === user.school_id);
    }
    return list;
  }, [dbStudents, selectedSch, user]);

  // Report Row Generator
  const reportRows = useMemo(() => {
    if (reportType === 'AbsentList') {
      return activeSchStudents.filter(student => {
        const attend = dbAttendance.find(a => a.student_id === student.id);
        return attend?.status === 'Absent';
      }).map(student => {
        const school = dbSchools.find(s => s.id === student.school_id);
        const card = dbAdmitCards.find(ac => ac.student_id === student.id);
        return {
          id: student.id,
          studentId: student.student_id,
          name: student.name,
          roll: card?.roll_number || '-',
          schoolName: school?.name || 'N/A',
          contact: student.guardian_contact
        };
      });
    } else if (reportType === 'MeritList') {
      const presentRows = activeSchStudents.filter(student => {
        const attend = dbAttendance.find(a => a.student_id === student.id);
        return !attend || attend.status === 'Present';
      }).map(student => {
        const school = dbSchools.find(s => s.id === student.school_id);
        const card = dbAdmitCards.find(ac => ac.student_id === student.id);
        const studentMarks = dbMarks.filter(m => m.student_id === student.id);

        let total = 0;
        let subjectsAttempted = 0;
        studentMarks.forEach(m => {
          if (m.marks_obtained !== null) {
            total += m.marks_obtained;
            subjectsAttempted++;
          }
        });

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

      return presentRows.sort((a, b) => b.total - a.total);
    }
    return [];
  }, [selectedSch, reportType, activeSchStudents, dbAdmitCards, dbMarks, dbAttendance, subjects, dbSchools]);

  // J5 Gender Analysis Calculations
  const genderAnalytics = useMemo(() => {
    if (reportType !== 'GenderAnalysis') return null;

    let m = 0, f = 0, o = 0;
    activeSchStudents.forEach(s => {
      if (s.gender === 'Male') m++;
      else if (s.gender === 'Female') f++;
      else o++;
    });

    const totalStudents = activeSchStudents.length;
    const distributionData = [
      { name: 'Male', value: m, color: '#3B82F6' },
      { name: 'Female', value: f, color: '#EC4899' },
      { name: 'Other', value: o, color: '#10B981' }
    ].filter(i => i.value > 0);

    // Class wise Gender Ratios
    const classGenders: Record<string, { male: number; female: number; other: number }> = {};
    activeSchStudents.forEach(s => {
      if (!classGenders[s.class]) {
        classGenders[s.class] = { male: 0, female: 0, other: 0 };
      }
      if (s.gender === 'Male') classGenders[s.class].male++;
      else if (s.gender === 'Female') classGenders[s.class].female++;
      else classGenders[s.class].other++;
    });

    const classData = Object.keys(classGenders).map(cls => ({
      class: `Class ${cls}`,
      Male: classGenders[cls].male,
      Female: classGenders[cls].female,
      Other: classGenders[cls].other
    }));

    // School wise Gender Statistics
    const schoolGenders: Record<string, { name: string; male: number; female: number; total: number }> = {};
    activeSchStudents.forEach(s => {
      const school = dbSchools.find(sch => sch.id === s.school_id);
      const schoolName = school ? school.name : 'Unknown School';
      
      if (!schoolGenders[s.school_id]) {
        schoolGenders[s.school_id] = { name: schoolName, male: 0, female: 0, total: 0 };
      }
      if (s.gender === 'Male') schoolGenders[s.school_id].male++;
      else if (s.gender === 'Female') schoolGenders[s.school_id].female++;
      schoolGenders[s.school_id].total++;
    });

    const schoolStats = Object.values(schoolGenders);

    // Attendance by Gender
    let mPres = 0, mAbs = 0, fPres = 0, fAbs = 0, oPres = 0, oAbs = 0;
    activeSchStudents.forEach(s => {
      const att = dbAttendance.find(a => a.student_id === s.id);
      const isAbsent = att?.status === 'Absent';
      if (s.gender === 'Male') {
        if (isAbsent) mAbs++; else mPres++;
      } else if (s.gender === 'Female') {
        if (isAbsent) fAbs++; else fPres++;
      } else {
        if (isAbsent) oAbs++; else oPres++;
      }
    });

    const attendanceData = [
      { name: 'Male', Present: mPres, Absent: mAbs },
      { name: 'Female', Present: fPres, Absent: fAbs },
      { name: 'Other', Present: oPres, Absent: oAbs }
    ];

    // Pass Percentage by Gender
    const presentStudents = activeSchStudents.filter(stu => {
      const att = dbAttendance.find(a => a.student_id === stu.id);
      return !att || att.status === 'Present';
    });

    let mPass = 0, mFail = 0, fPass = 0, fFail = 0, oPass = 0, oFail = 0;
    const totalFullMarks = subjects.reduce((sum, s) => sum + s.full_marks, 0);

    presentStudents.forEach(stu => {
      const stuMarks = dbMarks.filter(mk => mk.student_id === stu.id && mk.marks_obtained !== null);
      if (stuMarks.length > 0) {
        const score = stuMarks.reduce((sum, m) => sum + (m.marks_obtained || 0), 0);
        const pass = totalFullMarks > 0 && (score / totalFullMarks) * 100 >= 35;
        if (stu.gender === 'Male') {
          if (pass) mPass++; else mFail++;
        } else if (stu.gender === 'Female') {
          if (pass) fPass++; else fFail++;
        } else {
          if (pass) oPass++; else oFail++;
        }
      }
    });

    const mPassRate = (mPass + mFail) > 0 ? Math.round((mPass / (mPass + mFail)) * 100) : 0;
    const fPassRate = (fPass + fFail) > 0 ? Math.round((fPass / (fPass + fFail)) * 100) : 0;
    const oPassRate = (oPass + oFail) > 0 ? Math.round((oPass / (oPass + oFail)) * 100) : 0;

    const passRateData = [
      { name: 'Male', 'Pass Rate (%)': mPassRate },
      { name: 'Female', 'Pass Rate (%)': fPassRate },
      { name: 'Other', 'Pass Rate (%)': oPassRate }
    ];

    // Merit Ranking split by Gender
    const meritRankings = presentStudents.map(stu => {
      const stuMarks = dbMarks.filter(mk => mk.student_id === stu.id && mk.marks_obtained !== null);
      const score = stuMarks.reduce((sum, m) => sum + (m.marks_obtained || 0), 0);
      return { name: stu.name, gender: stu.gender, score };
    }).sort((a, b) => b.score - a.score);

    const topBoys = meritRankings.filter(s => s.gender === 'Male').slice(0, 3);
    const topGirls = meritRankings.filter(s => s.gender === 'Female').slice(0, 3);

    // Scholarship wins distribution (top 10% or top 10 students overall)
    const top10 = meritRankings.slice(0, 10);
    let topBoysWin = 0, topGirlsWin = 0, topOthersWin = 0;
    top10.forEach(s => {
      if (s.gender === 'Male') topBoysWin++;
      else if (s.gender === 'Female') topGirlsWin++;
      else topOthersWin++;
    });

    const winsData = [
      { name: 'Boys', value: topBoysWin, color: '#3B82F6' },
      { name: 'Girls', value: topGirlsWin, color: '#EC4899' },
      { name: 'Other', value: topOthersWin, color: '#10B981' }
    ].filter(i => i.value > 0);

    return {
      totalStudents,
      distributionData,
      classData,
      schoolStats,
      attendanceData,
      passRateData,
      topBoys,
      topGirls,
      winsData
    };
  }, [reportType, activeSchStudents, dbSchools, dbAttendance, dbMarks, subjects]);

  // Export CSV/Excel Helper
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
    } else if (reportType === 'MeritList') {
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
    } else if (reportType === 'GenderAnalysis' && genderAnalytics) {
      // Export statistical sheet
      headers = ['Gender Analysis Report', 'Academic Year:', String(dbScholarships.find(s=>s.id===selectedSch)?.academic_year || 2026)];
      csvRows = [
        [],
        ['Gender Distribution Summary'],
        ['Gender', 'Count', 'Percentage Share'],
        ...genderAnalytics.distributionData.map(d => [
          d.name,
          String(d.value),
          `${Math.round((d.value / genderAnalytics.totalStudents) * 100)}%`
        ]),
        [],
        ['School wise Gender Stats'],
        ['School Name', 'Male Candidates', 'Female Candidates', 'Total Candidates'],
        ...genderAnalytics.schoolStats.map(s => [
          s.name,
          String(s.male),
          String(s.female),
          String(s.total)
        ]),
        [],
        ['Attendance Rates by Gender'],
        ['Gender', 'Present Count', 'Absent Count'],
        ...genderAnalytics.attendanceData.map(a => [
          a.name,
          String(a.Present),
          String(a.Absent)
        ])
      ];
    }

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ICST_Report_${reportType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <FileSpreadsheet className="w-6 h-6 mr-2 text-blue-600" />
            Report Generator
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Filter, query, and export examination analytics and performance lists.</p>
        </div>
        <div className="flex space-x-2">
          {reportType === 'GenderAnalysis' && (
            <button
              onClick={handlePrint}
              className="flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
            >
              <Printer className="w-4 h-4 mr-1.5 text-slate-400" />
              Print PDF
            </button>
          )}
          <button
            onClick={handleExportCSV}
            disabled={reportType !== 'GenderAnalysis' && reportRows.length === 0}
            className="flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV Sheets
          </button>
        </div>
      </div>

      {/* Query panel (Hidden on Print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Scholarship Session</label>
          <select
            value={selectedSch}
            onChange={(e) => setSelectedSch(e.target.value)}
            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none"
          >
            {dbScholarships.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>
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
            <option value="GenderAnalysis">Gender Analysis Dashboard</option>
          </select>
        </div>
      </div>

      {/* RENDER NORMAL LISTS */}
      {reportType !== 'GenderAnalysis' && (
        isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} cols={8} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm no-print">
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
                      <td className="p-4 font-mono font-bold text-slate-500 text-xs">{row.studentId}</td>
                      <td className="p-4 font-bold text-slate-800 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                        {row.name}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-700">{row.roll}</td>
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
                    <th className="p-4 font-semibold text-slate-600 text-center">Attempted</th>
                    <th className="p-4 font-semibold text-slate-600 text-center">Total Marks</th>
                    <th className="p-4 font-semibold text-slate-600 text-center">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportRows.map((row: any, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="p-4 text-center font-bold text-blue-600">#{idx + 1}</td>
                      <td className="p-4 font-mono font-bold text-slate-500 text-xs">{row.studentId}</td>
                      <td className="p-4 font-bold text-slate-800 flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-blue-500" />
                        {row.name}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-700">{row.roll}</td>
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
            <div className="p-12 text-center text-slate-400 font-medium">
              No registry records matching selections.
            </div>
          )}
        </div>
        )
      )}

      {/* J5 GENDER ANALYSIS REPORT LAYOUT */}
      {reportType === 'GenderAnalysis' && genderAnalytics && (
        isLoading ? (
          <div className="space-y-6">
            <SkeletonDashboard />
          </div>
        ) : (
          <div className="space-y-6">
          
          {/* Main Visual Dashboard (Charts render on screen, hidden on Print) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
            
            {/* 1. Distribution Pie */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
              <h3 className="text-xs font-bold text-slate-700 uppercase mb-4 self-start">Gender Distribution Share</h3>
              <div className="w-full h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderAnalytics.distributionData}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {genderAnalytics.distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" />
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Class wise stack */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col col-span-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase mb-4">Class-wise Gender split</h3>
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={genderAnalytics.classData} margin={{ left: -20, bottom: 0, top: 0, right: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="class" fontSize={10} stroke="#94A3B8" />
                    <YAxis fontSize={10} stroke="#94A3B8" />
                    <ChartTooltip />
                    <Legend iconSize={8} iconType="circle" />
                    <Bar dataKey="Male" fill="#3B82F6" stackId="a" maxBarSize={25} />
                    <Bar dataKey="Female" fill="#EC4899" stackId="a" maxBarSize={25} />
                    <Bar dataKey="Other" fill="#10B981" stackId="a" maxBarSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
            {/* 3. Attendance rates */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-xs font-bold text-slate-700 uppercase mb-4">Examination Attendance by Gender</h3>
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={genderAnalytics.attendanceData} margin={{ left: -20, bottom: 0, top: 0, right: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" fontSize={10} stroke="#94A3B8" />
                    <YAxis fontSize={10} stroke="#94A3B8" />
                    <ChartTooltip />
                    <Legend iconSize={8} />
                    <Bar dataKey="Present" fill="#10B981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Absent" fill="#EF4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Pass Rates */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-xs font-bold text-slate-700 uppercase mb-4">Pass Percentage Rate by Gender</h3>
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={genderAnalytics.passRateData} margin={{ left: -20, bottom: 0, top: 0, right: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" fontSize={10} stroke="#94A3B8" />
                    <YAxis fontSize={10} stroke="#94A3B8" />
                    <ChartTooltip />
                    <Bar dataKey="Pass Rate (%)" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* School-wise stats table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm no-print">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-700 uppercase">School-wise Gender registry</h3>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="p-4 font-semibold text-slate-600">School Name</th>
                  <th className="p-4 font-semibold text-slate-600 text-center">Boys Registered</th>
                  <th className="p-4 font-semibold text-slate-600 text-center">Girls Registered</th>
                  <th className="p-4 font-semibold text-slate-600 text-center">Total Registered</th>
                  <th className="p-4 font-semibold text-slate-600 text-center">Ratio (Boys:Girls)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {genderAnalytics.schoolStats.map((sch, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{sch.name}</td>
                    <td className="p-4 text-center font-bold text-blue-600">{sch.male}</td>
                    <td className="p-4 text-center font-bold text-pink-600">{sch.female}</td>
                    <td className="p-4 text-center text-slate-500 font-extrabold">{sch.total}</td>
                    <td className="p-4 text-center font-semibold text-slate-700">
                      {sch.female > 0 ? (sch.male / sch.female).toFixed(2) : sch.male > 0 ? '1:0' : '0:0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PRINT-ONLY OFFICIAL PDF LAYOUT */}
          <div className="print-only bg-white p-8 border border-black space-y-8 text-slate-800">
            <div className="text-center pb-6 border-b-2 border-black flex justify-between items-center">
              <div className="font-extrabold text-sm uppercase">ICST Scholarship Committee</div>
              <div>
                <h3 className="text-base font-extrabold uppercase">Gender Analysis Report</h3>
                <span className="text-[10px] font-bold text-slate-500">Session: {dbScholarships.find(s=>s.id===selectedSch)?.name}</span>
              </div>
              <div className="text-[9px] font-bold text-slate-400">Generated: {new Date().toLocaleString()}</div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase border-b pb-1">1. Summary Distribution</h4>
              <table className="w-full text-left text-xs border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-50 border-b border-black">
                    <th className="p-2 border-r border-black">Gender Classification</th>
                    <th className="p-2 border-r border-black text-center">Registrations Count</th>
                    <th className="p-2 text-center">Percentage Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {genderAnalytics.distributionData.map((d, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 border-r border-black font-bold">{d.name}</td>
                      <td className="p-2 border-r border-black text-center font-bold">{d.value}</td>
                      <td className="p-2 text-center font-bold">{Math.round((d.value / genderAnalytics.totalStudents) * 100)}%</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-slate-50">
                    <td className="p-2 border-r border-black">Total Candidates</td>
                    <td className="p-2 border-r border-black text-center">{genderAnalytics.totalStudents}</td>
                    <td className="p-2 text-center">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase border-b pb-1">2. School Performance & Ratios</h4>
              <table className="w-full text-left text-xs border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-50 border-b border-black">
                    <th className="p-2 border-r border-black">School Name</th>
                    <th className="p-2 border-r border-black text-center">Boys</th>
                    <th className="p-2 border-r border-black text-center">Girls</th>
                    <th className="p-2 text-center">Total Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {genderAnalytics.schoolStats.map((sch, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 border-r border-black font-semibold">{sch.name}</td>
                      <td className="p-2 border-r border-black text-center font-mono">{sch.male}</td>
                      <td className="p-2 border-r border-black text-center font-mono">{sch.female}</td>
                      <td className="p-2 text-center font-mono font-bold">{sch.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Print Signatures */}
            <div className="pt-16 flex justify-between items-end text-[9px] font-bold">
              <div className="text-center">
                <div className="w-28 border-b border-black h-4"></div>
                <div className="mt-1">Prepared by Analyst</div>
              </div>
              <div className="text-center">
                <div className="w-28 border-b border-black h-4"></div>
                <div className="mt-1">General Secretary, ICST</div>
              </div>
            </div>
          </div>
        </div>
        )
      )}
    </div>
  );
};
