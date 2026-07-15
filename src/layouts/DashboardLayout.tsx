import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Profile, mockDb } from '../services/mockDb';
import { 
  LayoutDashboard, 
  School, 
  UserSquare2, 
  FileText, 
  Database, 
  Award, 
  ShieldAlert, 
  LogOut, 
  Search, 
  Menu, 
  X, 
  UserCheck, 
  BookOpen, 
  FileSpreadsheet, 
  Users
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    students: any[];
    schools: any[];
    officials: any[];
  } | null>(null);

  const handleGlobalSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    const q = query.toLowerCase();

    // Search Students
    const students = mockDb.getData<any>('students').filter(
      s => s.name.toLowerCase().includes(q) || 
           s.student_id.toLowerCase().includes(q) || 
           s.guardian_contact.includes(q)
    );

    // Search Schools
    const schools = mockDb.getData<any>('schools').filter(
      s => s.name.toLowerCase().includes(q) || 
           s.school_id.toLowerCase().includes(q) || 
           s.udise.includes(q)
    );

    // Search Committee Officials
    const officials = mockDb.getData<any>('profiles').filter(
      o => o.name.toLowerCase().includes(q) || 
           o.role.toLowerCase().includes(q)
    );

    setSearchResults({ students: students.slice(0, 3), schools: schools.slice(0, 3), officials: officials.slice(0, 3) });
  };

  const sidebarItems: SidebarItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['SuperAdmin', 'Admin', 'ScholarshipCoordinator', 'MarksEvaluator', 'Invigilator', 'DataEntryOperator', 'Viewer'] },
    { name: 'Scholarships', path: '/dashboard/scholarships', icon: <Award className="w-5 h-5" />, roles: ['SuperAdmin', 'Admin'] },
    { name: 'Subject Config', path: '/dashboard/subjects', icon: <BookOpen className="w-5 h-5" />, roles: ['SuperAdmin', 'Admin'] },
    { name: 'Schools', path: '/dashboard/schools', icon: <School className="w-5 h-5" />, roles: ['SuperAdmin', 'Admin', 'ScholarshipCoordinator'] },
    { name: 'Students', path: '/dashboard/students', icon: <UserSquare2 className="w-5 h-5" />, roles: ['SuperAdmin', 'Admin', 'ScholarshipCoordinator', 'DataEntryOperator'] },
    { name: 'Special Reg', path: '/dashboard/special-reg', icon: <UserCheck className="w-5 h-5" />, roles: ['SuperAdmin', 'Admin', 'ScholarshipCoordinator', 'Invigilator'] },
    { name: 'Admit Cards', path: '/dashboard/admit-cards', icon: <FileText className="w-5 h-5" />, roles: ['SuperAdmin', 'Admin', 'ScholarshipCoordinator'] },
    { name: 'Marks Entry', path: '/dashboard/marks-entry', icon: <Database className="w-5 h-5" />, roles: ['SuperAdmin', 'Admin', 'ScholarshipCoordinator', 'MarksEvaluator'] },
    { name: 'Officials', path: '/dashboard/officials', icon: <Users className="w-5 h-5" />, roles: ['SuperAdmin', 'Admin'] },
    { name: 'Reports', path: '/dashboard/reports', icon: <FileSpreadsheet className="w-5 h-5" />, roles: ['SuperAdmin', 'Admin', 'ScholarshipCoordinator', 'Viewer'] },
  ];

  const filteredSidebarItems = sidebarItems.filter(
    item => user && item.roles.includes(user.role)
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-slate-100 flex-shrink-0">
        <div className="p-6 border-b border-slate-800 flex flex-col items-center">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xl mb-2 shadow-lg shadow-blue-500/30">
            ICST
          </div>
          <span className="font-semibold text-sm tracking-wider text-slate-300">ISMS DASHBOARD</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {filteredSidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg transition-all"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-slate-900 text-slate-100 h-full p-4">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="mt-8 mb-6 border-b border-slate-800 pb-4 text-center">
              <span className="font-semibold text-lg text-slate-300">ICST ISMS</span>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {filteredSidebarItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-800 pt-4">
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-400 hover:bg-slate-800 rounded-lg"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex items-center flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden mr-4 text-slate-500 hover:text-slate-800"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Global Search Input */}
            <div className="relative w-full max-w-md hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search roll, student, school..."
                value={searchQuery}
                onChange={(e) => handleGlobalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              
              {/* Global Search Results Overlay */}
              {searchResults && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl p-4 space-y-3 z-50 text-slate-700">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-semibold text-xs text-slate-400 uppercase">Search Results</span>
                    <button onClick={() => { setSearchQuery(''); setSearchResults(null); }} className="text-slate-400 hover:text-slate-600 text-xs">Clear</button>
                  </div>
                  
                  {searchResults.students.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-blue-600 mb-1">Students</h4>
                      <ul className="space-y-1">
                        {searchResults.students.map(s => (
                          <li key={s.id} className="text-sm hover:bg-slate-50 p-1.5 rounded cursor-pointer transition-colors" onClick={() => { navigate('/dashboard/students'); setSearchQuery(''); setSearchResults(null); }}>
                            <div className="font-medium text-slate-800">{s.name}</div>
                            <div className="text-xs text-slate-400">ID: {s.student_id} | Class: {s.class}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {searchResults.schools.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-blue-600 mb-1">Schools</h4>
                      <ul className="space-y-1">
                        {searchResults.schools.map(s => (
                          <li key={s.id} className="text-sm hover:bg-slate-50 p-1.5 rounded cursor-pointer transition-colors" onClick={() => { navigate('/dashboard/schools'); setSearchQuery(''); setSearchResults(null); }}>
                            <div className="font-medium text-slate-800">{s.name}</div>
                            <div className="text-xs text-slate-400">UDISE: {s.udise} | District: {s.district}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {searchResults.students.length === 0 && searchResults.schools.length === 0 && (
                    <div className="text-sm text-slate-400 py-2 text-center">No matching records found.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Quick Testing: Mock Role Switcher (Hidden in Production if Supabase is active) */}
            {user && (
              <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-semibold text-slate-600">Dev Mode:</span>
                <select
                  value={user.role}
                  onChange={(e) => switchRole(e.target.value as Profile['role'])}
                  className="text-xs bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="SuperAdmin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="ScholarshipCoordinator">Coordinator</option>
                  <option value="MarksEvaluator">Marks Evaluator</option>
                  <option value="Invigilator">Invigilator</option>
                  <option value="DataEntryOperator">Data Entry</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
            )}

            {/* Profile Avatar info */}
            {user && (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-sm shadow">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</div>
                  <div className="text-xs text-slate-500 font-medium capitalize">{user.role.replace(/([A-Z])/g, ' $1').trim()}</div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Main Scrollable Panel */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
};
