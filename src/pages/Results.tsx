import React, { useState, useEffect } from 'react';
import { mockDb, Scholarship, School, Student, AdmitCard, Mark, Subject, Attendance } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Search, Printer, Download, Award, School2, BookOpen } from 'lucide-react';

export const Results: React.FC = () => {
  const [scholarships, setScholarships] = useState<Scholarship[]>(
    mockDb.getData<Scholarship>('scholarships').filter(s => s.status === 'ResultsPublished' || s.status === 'Completed' || s.status === 'MarksEntry')
  );
  const [schools, setSchools] = useState<School[]>(mockDb.getData<School>('schools'));
  
  const [selectedScholarship, setSelectedScholarship] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [studentResult, setStudentResult] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [activeProfile, setActiveProfile] = useState<any>(null);

  useEffect(() => {
    document.title = 'Verification Portal | ICST ISMS';
  }, []);

  // Fetch initial filters from Supabase if configured
  useEffect(() => {
    // Load active signature profile
    const sigProfiles = mockDb.getSetting('signature_profiles', []);
    const active = sigProfiles.find((p: any) => p.is_active) || sigProfiles[0];
    setActiveProfile(active);

    const fetchFilters = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: schs } = await supabase
            .from('scholarships')
            .select('*')
            .in('status', ['ResultsPublished', 'Completed', 'MarksEntry']);
          const { data: scls } = await supabase.from('schools').select('*');

          if (schs) {
            setScholarships(schs);
            if (schs.length > 0) setSelectedScholarship(schs[0].id);
          }
          if (scls) setSchools(scls);
        } catch (err) {
          console.error("Error loading filters from Supabase:", err);
        }
      } else {
        if (scholarships.length > 0) setSelectedScholarship(scholarships[0].id);
      }
    };
    fetchFilters();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStudentResult(null);

    if (!rollNumber.trim()) {
      setError('Please enter a valid Roll Number.');
      return;
    }

    let admitCard: AdmitCard | null = null;
    let student: Student | null = null;
    let studentMarks: Mark[] = [];
    let subjects: Subject[] = [];
    let attendanceList: Attendance[] = [];
    let schoolDetails: School | null = null;

    if (isSupabaseConfigured && supabase) {
      try {
        // Query Admit Card
        const { data: cardData, error: cardErr } = await supabase
          .from('admit_cards')
          .select('*')
          .eq('roll_number', rollNumber.trim())
          .maybeSingle();

        if (cardErr) throw cardErr;
        if (!cardData) {
          setError('No admit card found for the provided Roll Number.');
          return;
        }
        admitCard = cardData;

        // Query Student
        const { data: stuData, error: stuErr } = await supabase
          .from('students')
          .select('*')
          .eq('id', admitCard!.student_id)
          .maybeSingle();

        if (stuErr) throw stuErr;
        if (!stuData) {
          setError('Student record not found.');
          return;
        }
        student = stuData;

        // Query School
        const { data: sclData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', student!.school_id)
          .maybeSingle();
        schoolDetails = sclData;

        // Query Marks
        const { data: marksData } = await supabase
          .from('marks')
          .select('*')
          .eq('student_id', student!.id);
        studentMarks = marksData || [];

        // Query Subjects
        const { data: subsData } = await supabase
          .from('subjects')
          .select('*')
          .eq('scholarship_id', student!.scholarship_id)
          .order('display_order', { ascending: true });
        subjects = subsData || [];

        // Query Attendance
        const { data: attData } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', student!.id);
        attendanceList = attData || [];

      } catch (err: any) {
        setError('Error fetching results from database: ' + err.message);
        return;
      }
    } else {
      // Fallback local query
      const admitCards = mockDb.getData<AdmitCard>('admit_cards');
      const cardData = admitCards.find(ac => ac.roll_number === rollNumber.trim());

      if (!cardData) {
        setError('No admit card found for the provided Roll Number.');
        return;
      }
      admitCard = cardData;

      const students = mockDb.getData<Student>('students');
      const stuData = students.find(s => s.id === admitCard!.student_id);

      if (!stuData) {
        setError('Student record not found.');
        return;
      }
      student = stuData;

      schoolDetails = schools.find(s => s.id === student!.school_id) || null;
      const marksList = mockDb.getData<Mark>('marks');
      studentMarks = marksList.filter(m => m.student_id === student!.id);
      subjects = mockDb.getData<any>('subjects').filter((sub: any) => sub.scholarship_id === student!.scholarship_id);
      attendanceList = mockDb.getData<any>('attendance').filter((a: any) => a.student_id === student!.id);
    }

    // Verify school and scholarship filter constraints
    if (selectedSchool && student!.school_id !== selectedSchool) {
      setError('Roll Number does not match the selected school.');
      return;
    }
    if (selectedScholarship && student!.scholarship_id !== selectedScholarship) {
      setError('Roll Number does not match the selected scholarship session.');
      return;
    }

    const attend = attendanceList.find(a => a.student_id === student!.id);
    const isAbsent = attend?.status === 'Absent';

    // Calculate marks
    let totalMarksObtained = 0;
    let totalFullMarks = 0;
    const marksBreakdown = subjects.map((sub: any) => {
      const markEntry = studentMarks.find(m => m.subject_id === sub.id);
      const score = isAbsent ? 'AB' : (markEntry?.marks_obtained ?? null);
      
      if (typeof score === 'number') {
        totalMarksObtained += score;
      }
      totalFullMarks += sub.full_marks;

      return {
        subjectName: sub.name,
        fullMarks: sub.full_marks,
        passMarks: sub.pass_marks,
        obtained: score,
        componentMarks: markEntry?.component_marks || null,
        marksDistribution: sub.marks_distribution || null
      };
    });

    const percentage = totalFullMarks > 0 ? ((totalMarksObtained / totalFullMarks) * 100).toFixed(2) : '0.00';

    // Simple Grade Calculation
    const pctNum = parseFloat(percentage);
    let grade = 'F';
    if (isAbsent) grade = 'AB';
    else if (pctNum >= 90) grade = 'O (Outstanding)';
    else if (pctNum >= 80) grade = 'E (Excellent)';
    else if (pctNum >= 70) grade = 'A+ (Very Good)';
    else if (pctNum >= 60) grade = 'A (Good)';
    else if (pctNum >= 50) grade = 'B (Average)';
    else if (pctNum >= 35) grade = 'C (Pass)';

    setStudentResult({
      student,
      admitCard,
      school: schoolDetails,
      marks: marksBreakdown,
      totalObtained: isAbsent ? 'AB' : totalMarksObtained,
      totalFull: totalFullMarks,
      percentage: isAbsent ? 'N/A' : `${percentage}%`,
      grade,
      isAbsent
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* Public Header */}
      <header className="bg-slate-900 text-white py-6 shadow-md no-print">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-lg">
              ICST
            </div>
            <div>
              <h1 className="text-lg font-bold">Institute of Computer Science & Technology</h1>
              <p className="text-xs text-slate-400">Public Examinations & Results Portal</p>
            </div>
          </div>
          <a
            href="/"
            className="text-sm font-semibold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-xl transition-all"
          >
            Admin Login
          </a>
        </div>
      </header>

      {/* Main Search Panel */}
      <div className="max-w-4xl mx-auto px-4 mt-8 no-print">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center mb-6">
            <Search className="w-5 h-5 text-blue-600 mr-2" />
            Find Scholarship Examination Result
          </h2>

          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Scholarship Session</label>
              <select
                value={selectedScholarship}
                onChange={(e) => setSelectedScholarship(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {scholarships.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">School (Optional)</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">All Schools</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Roll Number (8 Digits)</label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  data-testid="search-roll-input"
                  placeholder="e.g. 26100001"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="submit"
                  data-testid="query-result-btn"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-5 py-2 rounded-lg shadow-md cursor-pointer transition-colors"
                >
                  Query
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Result Card Layout (Print Friendly) */}
      {studentResult && (
        <div className="max-w-4xl mx-auto px-4 mt-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 relative print:border-0 print:shadow-none">
            {/* Print Header Controls (Hidden on Print) */}
            <div className="absolute top-6 right-8 flex space-x-3 no-print">
              <button
                onClick={handlePrint}
                className="flex items-center text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-2 rounded-lg cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print Result
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg shadow-sm cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download PDF
              </button>
            </div>

            {/* Official Report Header */}
            <div className="text-center pb-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Official Marksheet</h3>
              <p className="text-slate-500 text-xs mt-1">ICST SCHOLARSHIP EXAMINATIONS CERTIFICATION</p>
            </div>

            {/* Student & Exam Meta Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center">
                  <Award className="w-4 h-4 mr-1.5 text-blue-600" />
                  Candidate Information
                </h4>
                <table className="text-sm w-full text-left">
                  <tbody>
                    <tr>
                      <th className="py-1 font-semibold text-slate-500 w-1/3">Name:</th>
                      <td className="py-1 text-slate-800 font-bold">{studentResult.student.name}</td>
                    </tr>
                    <tr>
                      <th className="py-1 font-semibold text-slate-500">Roll Number:</th>
                      <td className="py-1 text-slate-800 font-mono font-bold">{studentResult.admitCard.roll_number}</td>
                    </tr>
                    <tr>
                      <th className="py-1 font-semibold text-slate-500">Class/Sec:</th>
                      <td className="py-1 text-slate-800">{studentResult.student.class} - {studentResult.student.section}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center">
                  <School2 className="w-4 h-4 mr-1.5 text-blue-600" />
                  School Information
                </h4>
                <table className="text-sm w-full text-left">
                  <tbody>
                    <tr>
                      <th className="py-1 font-semibold text-slate-500 w-1/3">School Name:</th>
                      <td className="py-1 text-slate-800 font-semibold">{studentResult.school?.name || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th className="py-1 font-semibold text-slate-500">UDISE Code:</th>
                      <td className="py-1 text-slate-800 font-mono">{studentResult.school?.udise || 'N/A'}</td>
                    </tr>
                    <tr>
                      <th className="py-1 font-semibold text-slate-500">District:</th>
                      <td className="py-1 text-slate-800">{studentResult.school?.district || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subject-Wise Marks Grid */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 font-semibold text-slate-600">Subject Name</th>
                    <th className="p-3 font-semibold text-slate-600 text-center">Full Marks</th>
                    <th className="p-3 font-semibold text-slate-600 text-center">Pass Marks</th>
                    <th className="p-3 font-semibold text-slate-600 text-center">Obtained Marks</th>
                    <th className="p-3 font-semibold text-slate-600 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentResult.marks.map((row: any) => {
                    const isPass = row.obtained !== 'AB' && row.obtained !== null && row.obtained >= row.passMarks;
                    return (
                      <tr key={row.subjectName} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="font-medium text-slate-800 flex items-center">
                            <BookOpen className="w-4 h-4 mr-2 text-slate-400" />
                            {row.subjectName}
                          </div>
                          {row.marksDistribution && row.marksDistribution.length > 0 && row.obtained !== 'AB' && row.obtained !== null && (
                            <div className="text-[10px] text-slate-400 mt-1 pl-6 flex flex-wrap gap-1.5">
                              {row.marksDistribution.map((dist: any) => {
                                const scored = row.componentMarks?.[dist.name] ?? '-';
                                return (
                                  <span key={dist.name} className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                                    {dist.name}: <strong className="text-slate-700">{scored}/{dist.max_marks}</strong>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center text-slate-600 font-semibold">{row.fullMarks}</td>
                        <td className="p-3 text-center text-slate-600">{row.passMarks}</td>
                        <td className="p-3 text-center text-slate-800 font-extrabold">{row.obtained ?? '-'}</td>
                        <td className="p-3 text-center">
                          {row.obtained === 'AB' ? (
                            <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs">ABSENT</span>
                          ) : row.obtained === null ? (
                            <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded text-xs">PENDING</span>
                          ) : isPass ? (
                            <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded text-xs">PASS</span>
                          ) : (
                            <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs">FAIL</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Performance Summary Banner */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div>
                <span className="text-xs font-semibold text-slate-400 block uppercase">Total Obtained</span>
                <span className="text-2xl font-black text-slate-800 mt-1 inline-block">
                  {studentResult.totalObtained} <span className="text-sm font-semibold text-slate-400">/ {studentResult.totalFull}</span>
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block uppercase">Percentage</span>
                <span className="text-2xl font-black text-slate-800 mt-1 inline-block">{studentResult.percentage}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block uppercase">Grade</span>
                <span className="text-2xl font-black text-slate-800 mt-1 inline-block">{studentResult.grade}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block uppercase">Result Status</span>
                <span className={`text-xl font-bold mt-1 inline-block px-3 py-0.5 rounded-lg ${
                  studentResult.isAbsent 
                    ? 'text-red-700 bg-red-50' 
                    : studentResult.grade !== 'F' 
                      ? 'text-green-700 bg-green-50' 
                      : 'text-red-700 bg-red-50'
                }`}>
                  {studentResult.isAbsent ? 'ABSENT' : studentResult.grade !== 'F' ? 'QUALIFIED' : 'NOT QUALIFIED'}
                </span>
              </div>
            </div>

            {/* Seal / Footer Signature (Print view signature representation) */}
            <div className="mt-12 flex justify-between items-end relative z-10">
              <div className="text-left text-xs text-slate-400">
                <div>Document Hash: {Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
                <div>Generated: {new Date().toLocaleString()}</div>
              </div>
              <div className="flex items-center space-x-6 relative">
                {activeProfile?.official_seal && (
                  <img 
                    src={activeProfile.official_seal} 
                    alt="Official Seal" 
                    className="w-14 h-14 object-contain absolute left-[-50px] top-[-25px] opacity-75"
                  />
                )}
                <div className="text-center">
                  <div className="w-36 h-12 border-b border-slate-400 flex flex-col items-center justify-end pb-1 relative">
                    {activeProfile?.signature_image ? (
                      <img src={activeProfile.signature_image} alt="Signature" className="h-8 object-contain mb-0.5" />
                    ) : (
                      <span className="italic text-slate-400 text-xs">Sourav Mukherjee</span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{activeProfile?.name || 'Sourav Mukherjee'}</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">{activeProfile?.designation || 'General Secretary, ICST'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
