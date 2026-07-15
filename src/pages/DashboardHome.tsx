import React, { useMemo } from 'react';
import { mockDb, Student, School, Scholarship, AdmitCard, Mark, Attendance } from '../services/mockDb';
import { 
  School as SchoolIcon, 
  Users, 
  Calendar, 
  Database, 
  ClipboardList, 
  Clock, 
  TrendingUp
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export const DashboardHome: React.FC = () => {
  // Fetch stats from mockDb
  const schools = mockDb.getData<School>('schools');
  const students = mockDb.getData<Student>('students');
  const scholarships = mockDb.getData<Scholarship>('scholarships');
  const admitCards = mockDb.getData<AdmitCard>('admit_cards');
  const marks = mockDb.getData<Mark>('marks');
  const attendance = mockDb.getData<Attendance>('attendance');

  // Stats calculation
  const totalSchools = schools.length;
  const totalStudents = students.length;
  
  // Today's exams calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysExamsCount = admitCards.filter(ac => ac.exam_date === todayStr).length;

  // Pending marks entry calculation
  // Students whose admit card is generated but don't have marks for all scholarship subjects entered yet.
  const activeScholarship = scholarships.find(s => s.status === 'MarksEntry') || scholarships[0];
  
  const pendingMarksCount = useMemo(() => {
    if (!activeScholarship) return 0;
    
    // Find subjects for active scholarship
    const activeSubjects = mockDb.getData<any>('subjects').filter(sub => sub.scholarship_id === activeScholarship.id);
    if (activeSubjects.length === 0) return 0;

    // Students registered for active scholarship
    const activeStudents = students.filter(s => s.scholarship_id === activeScholarship.id);
    
    let pendingCount = 0;
    activeStudents.forEach(student => {
      // Check if student has admit card
      const hasAdmitCard = admitCards.some(ac => ac.student_id === student.id);
      if (!hasAdmitCard) return; // Cannot enter marks if no admit card

      // Check if student was present
      const attend = attendance.find(a => a.student_id === student.id);
      if (attend && attend.status === 'Absent') return; // Absent student has no pending marks entry (locked)

      // Count marks entered for this student
      const marksEntered = marks.filter(m => m.student_id === student.id && m.marks_obtained !== null).length;
      if (marksEntered < activeSubjects.length) {
        pendingCount++;
      }
    });

    return pendingCount;
  }, [students, admitCards, marks, attendance, activeScholarship]);

  // Aggregate Chart Data: Registered Students by District
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(student => {
      const school = schools.find(s => s.id === student.school_id);
      const district = school ? school.district : 'Unknown';
      counts[district] = (counts[district] || 0) + 1;
    });

    return Object.keys(counts).map(district => ({
      name: district,
      students: counts[district]
    }));
  }, [students, schools]);

  const COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

  // Recent Activity Feed
  const recentActivities = useMemo(() => {
    const auditLogs = mockDb.getData<any>('audit_logs');
    // Map to user names
    const profiles = mockDb.getData<any>('profiles');

    return auditLogs.map((log: any) => {
      const user = profiles.find((p: any) => p.id === log.action_by);
      const student = students.find(s => s.id === log.student_id);
      const subject = mockDb.getData<any>('subjects').find((sub: any) => sub.id === log.subject_id);

      return {
        id: log.id,
        user: user ? user.name : 'System Coordinator',
        role: user ? user.role : 'Staff',
        action: log.old_marks === null 
          ? `Entered initial marks for ${student?.name || 'Student'}` 
          : `Updated marks for ${student?.name || 'Student'} in ${subject?.name || 'Subject'} (from ${log.old_marks} to ${log.new_marks})`,
        reason: log.reason,
        time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
      };
    }).reverse().slice(0, 5); // Latest 5 activities
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome back, Coordinator</h1>
          <p className="text-slate-500 text-sm mt-1">Here is a quick overview of the scholarship sessions and database statistics.</p>
        </div>
        {activeScholarship && (
          <div className="mt-4 md:mt-0 flex items-center space-x-3 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-xs text-blue-700 font-semibold uppercase">Active Session</div>
              <div className="text-sm font-bold text-slate-800">{activeScholarship.name}</div>
            </div>
          </div>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Schools */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mr-4">
            <SchoolIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400">Total Schools</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{totalSchools}</div>
          </div>
        </div>

        {/* Card 2: Students */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mr-4">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400">Total Students</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{totalStudents}</div>
          </div>
        </div>

        {/* Card 3: Today's Exams */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mr-4">
            <Calendar className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400">Today's Exams</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{todaysExamsCount}</div>
          </div>
        </div>

        {/* Card 4: Pending Marks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mr-4">
            <Database className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400">Pending Marks</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{pendingMarksCount}</div>
          </div>
        </div>
      </div>

      {/* Main Charts & Logs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Student Distribution</h2>
              <p className="text-slate-400 text-xs mt-0.5">Number of registered students grouped by district</p>
            </div>
            <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">Real-time</span>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="students" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No student registration data available.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Recent Activity log */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Recent Activity</h2>
              <p className="text-slate-400 text-xs mt-0.5">Audit log of student marks adjustments</p>
            </div>
            <Clock className="w-5 h-5 text-slate-400" />
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[260px] pr-1">
            {recentActivities.length > 0 ? (
              recentActivities.map((act) => (
                <div key={act.id} className="flex space-x-3 text-sm pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 text-xs">{act.user} <span className="text-slate-400 font-normal">({act.role})</span></div>
                    <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">{act.action}</p>
                    <div className="text-[10px] text-slate-400 font-medium mt-1 flex items-center space-x-1">
                      <span>{act.date}</span>
                      <span>•</span>
                      <span>{act.time}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <ClipboardList className="w-8 h-8 text-slate-300 mb-2" />
                <span className="text-xs">No recent marks entries or audits found.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
