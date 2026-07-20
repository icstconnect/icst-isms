import React, { useState, useEffect, useMemo } from 'react';
import { mockDb, School, Student, AdmitCard, Mark, Attendance } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  School as SchoolIcon, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  Search, 
  Pencil, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Ban, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  Award, 
  BookOpen, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  X, 
  Calendar, 
  ClipboardList 
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
import { DatePicker } from '../components/DatePicker';
import { SkeletonTable } from '../components/Skeleton';

export const Schools: React.FC = () => {
  const { user } = useAuth();
  const { toast, showConfirm } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [admitCards, setAdmitCards] = useState<AdmitCard[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [udise, setUdise] = useState('');
  const [type, setType] = useState<'Primary' | 'UpperPrimary' | 'Secondary' | 'HigherSecondary'>('Secondary');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [block, setBlock] = useState('');
  const [pin, setPin] = useState('');
  const [hmName, setHmName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  // B1 Approval Workflow Modal State
  const [historyModalSchool, setHistoryModalSchool] = useState<School | null>(null);
  const [rejectionModalSchool, setRejectionModalSchool] = useState<School | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // B3 Bulk Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);

  // B4 Analytics Dashboard Modal State
  const [analyticsSchool, setAnalyticsSchool] = useState<School | null>(null);

  // Load baseline statistics and DB entries
  const loadData = async () => {
    let localSchools = mockDb.getData<School>('schools');
    let localStudents = mockDb.getData<Student>('students');
    let localCards = mockDb.getData<AdmitCard>('admit_cards');
    let localMarks = mockDb.getData<Mark>('marks');
    let localAtt = mockDb.getData<Attendance>('attendance');

    if (isSupabaseConfigured && supabase) {
      try {
        const [scls, stus, cards, mrks, atts] = await Promise.all([
          supabase.from('schools').select('*').order('created_at', { ascending: false }),
          supabase.from('students').select('*'),
          supabase.from('admit_cards').select('*'),
          supabase.from('marks').select('*'),
          supabase.from('attendance').select('*')
        ]);
        if (scls.data) localSchools = scls.data;
        if (stus.data) localStudents = stus.data;
        if (cards.data) localCards = cards.data;
        if (mrks.data) localMarks = mrks.data;
        if (atts.data) localAtt = atts.data;
      } catch (err) {
        console.error("Error loading live Supabase stats for schools:", err);
      }
    }

    setStudents(localStudents);
    setAdmitCards(localCards);
    setMarks(localMarks);
    setAttendance(localAtt);

    // Apply B2 restriction: Coordinator only sees their school
    if (user && user.role === 'ScholarshipCoordinator') {
      setSchools(localSchools.filter(s => s.id === user.school_id));
    } else {
      setSchools(localSchools);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const clearForm = () => {
    setName('');
    setUdise('');
    setAddress('');
    setDistrict('');
    setBlock('');
    setPin('');
    setHmName('');
    setContact('');
    setEmail('');
    setType('Secondary');
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !udise.trim() || isSaving) return;

    setIsSaving(true);
    try {
      if (editingSchool) {
        // Edit Mode
        const updates = {
          name,
          udise,
          type,
          address,
          district,
          block,
          pin,
          headmaster_name: hmName,
          contact_number: contact,
          email
        };

        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('schools')
            .update(updates)
            .eq('id', editingSchool.id);
          if (error) throw error;
        }

        mockDb.updateRecord<School>('schools', editingSchool.id, updates);
        setEditingSchool(null);
        setShowAddForm(false);
        clearForm();
      } else {
        // Add Mode - Defaults to 'Pending Review'
        const nextId = `SCH-${String(schools.length + 1).padStart(4, '0')}`;
        const newSchoolData = {
          school_id: nextId,
          name,
          udise,
          type,
          address,
          district,
          block,
          pin,
          headmaster_name: hmName,
          contact_number: contact,
          email,
          status: 'Pending Review',
          rejection_reason: '',
          approval_history: [
            {
              status: 'Pending Review',
              timestamp: new Date().toISOString(),
              action_by: user?.name || 'Registrant',
              remarks: 'Initial registration request submitted'
            }
          ]
        };

        let insertedId = `scl-${Date.now()}`;
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase
            .from('schools')
            .insert(newSchoolData)
            .select()
            .single();
          if (error) throw error;
          if (data) insertedId = data.id;
        }

        mockDb.addRecord<School>('schools', {
          id: insertedId,
          ...newSchoolData
        });

        setShowAddForm(false);
        clearForm();
      }
      loadData();
      toast.success("School record saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save school.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (scl: School) => {
    setEditingSchool(scl);
    setName(scl.name);
    setUdise(scl.udise);
    setType(scl.type);
    setAddress(scl.address);
    setDistrict(scl.district);
    setBlock(scl.block);
    setPin(scl.pin);
    setHmName(scl.headmaster_name);
    setContact(scl.contact_number);
    setEmail(scl.email);
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    showConfirm({
      title: "Delete School Record?",
      message: "Are you sure you want to delete this school? This will cascade delete associated students, admit cards, and scores.",
      type: 'danger',
      confirmText: "Delete School",
      onConfirm: async () => {
        setDeletingId(id);
        try {
          if (isSupabaseConfigured && supabase) {
            const { error } = await supabase
              .from('schools')
              .delete()
              .eq('id', id);
            if (error) throw error;
          }

          mockDb.deleteRecord('schools', id);
          loadData();
          toast.success("School deleted successfully.");
        } catch (err: any) {
          toast.error(err.message || "Failed to delete school.");
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  // B1 workflow actions: status change
  const handleStatusChange = async (scl: School, newStatus: School['status'], remarks?: string) => {
    const historyItem = {
      status: newStatus || 'Pending Review',
      timestamp: new Date().toISOString(),
      action_by: user?.name || 'Administrator',
      remarks: remarks || ''
    };

    const updatedHistory = [...(scl.approval_history || []), historyItem];
    const updates = {
      status: newStatus,
      rejection_reason: newStatus === 'Rejected' ? remarks : (scl.rejection_reason || ''),
      approval_history: updatedHistory
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('schools')
          .update(updates)
          .eq('id', scl.id);
        if (error) throw error;
      }

      mockDb.updateRecord<School>('schools', scl.id, updates);
      loadData();
      toast.success(`School status updated to ${newStatus}.`);
    } catch (e: any) {
      toast.error("Failed to update status: " + e.message);
    }
  };

  // B3 Download Template
  const handleDownloadTemplate = () => {
    const csvContent = "Name,UDISE,Type,Address,District,Block,PIN,Headmaster Name,Contact Number,Email\n" +
      "Kolkata High School,19180100202,Secondary,45 Park Street,Kolkata,Kolkata-II,700016,Mrs. A. Sen,9830054321,info@kolkatahigh.edu.in\n" +
      "Salt Lake Academy,19180100303,HigherSecondary,Sector-V,North 24 Parganas,Bidhannagar,700091,Dr. J. Paul,9830098765,paul@saltlake.edu.in";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'school_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // B3 Parse CSV File
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length <= 1) {
        toast.warning("Invalid template layout or empty file.");
        return;
      }

      const allSchools = mockDb.getData<School>('schools');
      const rows = lines.slice(1).map((line, idx) => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const rowData = {
          name: values[0] || '',
          udise: values[1] || '',
          type: (values[2] as any) || 'Secondary',
          address: values[3] || '',
          district: values[4] || '',
          block: values[5] || '',
          pin: values[6] || '',
          headmaster_name: values[7] || '',
          contact_number: values[8] || '',
          email: values[9] || ''
        };

        const errors: string[] = [];
        if (!rowData.name) errors.push("Missing School Name");
        if (!rowData.udise || rowData.udise.length !== 11 || isNaN(Number(rowData.udise))) {
          errors.push("UDISE must be exactly 11 numeric digits");
        }
        if (!['Primary', 'UpperPrimary', 'Secondary', 'HigherSecondary'].includes(rowData.type)) {
          errors.push("Invalid type classification");
        }
        if (!rowData.pin || rowData.pin.length !== 6 || isNaN(Number(rowData.pin))) {
          errors.push("PIN must be 6 digits");
        }
        if (!rowData.contact_number || rowData.contact_number.length !== 10) {
          errors.push("Contact must be 10 digits");
        }
        if (!rowData.email || !rowData.email.includes('@')) {
          errors.push("Invalid email domain layout");
        }

        const dupUdise = allSchools.some(s => s.udise === rowData.udise);
        const dupEmail = allSchools.some(s => s.email === rowData.email);
        
        let duplicateMessage = "";
        if (dupUdise) duplicateMessage += "UDISE already registered. ";
        if (dupEmail) duplicateMessage += "Email already registered. ";

        return {
          id: `imp-${idx}-${Date.now()}`,
          ...rowData,
          errors,
          duplicateMessage,
          isValid: errors.length === 0 && !dupUdise && !dupEmail
        };
      });

      setImportPreview(rows);
      setShowImportModal(true);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    const importable = importPreview.filter(row => row.isValid || (!skipInvalidRows && row.errors.length === 0));
    if (importable.length === 0) {
      toast.warning("No valid rows available to import.");
      return;
    }

    try {
      let importedCount = 0;
      for (const item of importable) {
        const nextId = `SCH-${String(schools.length + importedCount + 1).padStart(4, '0')}`;
        const newSchoolData = {
          school_id: nextId,
          name: item.name,
          udise: item.udise,
          type: item.type,
          address: item.address,
          district: item.district,
          block: item.block,
          pin: item.pin,
          headmaster_name: item.headmaster_name,
          contact_number: item.contact_number,
          email: item.email,
          status: 'Pending Review' as School['status'],
          rejection_reason: '',
          approval_history: [
            {
              status: 'Pending Review',
              timestamp: new Date().toISOString(),
              action_by: user?.name || 'Bulk Importer',
              remarks: 'Imported via Bulk Upload portal'
            }
          ]
        };

        let insertedId = `scl-bulk-${importedCount}-${Date.now()}`;
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.from('schools').insert(newSchoolData).select().single();
          if (!error && data) insertedId = data.id;
        }

        mockDb.addRecord<School>('schools', {
          id: insertedId,
          ...newSchoolData
        });
        importedCount++;
      }

      toast.success(`Successfully imported ${importedCount} schools!`);
      setShowImportModal(false);
      loadData();
    } catch (e: any) {
      toast.error("Error executing bulk import: " + e.message);
    }
  };

  const filteredSchools = schools.filter(
    s => s.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
         s.udise.includes(filterQuery) || 
         s.school_id.toLowerCase().includes(filterQuery.toLowerCase())
  );

  // B4 Analytics Calculations helper
  const analyticsData = useMemo(() => {
    if (!analyticsSchool) return null;
    const schId = analyticsSchool.id;
    const schStudents = students.filter(s => s.school_id === schId);
    
    // Male/Female
    let m = 0, f = 0, o = 0;
    schStudents.forEach(s => {
      if (s.gender === 'Male') m++;
      else if (s.gender === 'Female') f++;
      else o++;
    });

    const genderData = [
      { name: 'Male', value: m, color: '#3B82F6' },
      { name: 'Female', value: f, color: '#EC4899' },
      { name: 'Other', value: o, color: '#10B981' }
    ].filter(i => i.value > 0);

    // Class wise
    const classMap: Record<string, number> = {};
    schStudents.forEach(s => {
      classMap[s.class] = (classMap[s.class] || 0) + 1;
    });
    const classData = Object.keys(classMap).map(cls => ({
      class: `Class ${cls}`,
      students: classMap[cls]
    }));

    // Admit cards generated
    const cardsGenerated = admitCards.filter(c => schStudents.some(s => s.id === c.student_id)).length;
    const cardsPct = schStudents.length > 0 ? Math.round((cardsGenerated / schStudents.length) * 100) : 0;

    // Attendance
    const schoolAttendance = attendance.filter(a => schStudents.some(s => s.id === a.student_id));
    const presentCount = schoolAttendance.filter(a => a.status === 'Present').length;
    const absentCount = schoolAttendance.filter(a => a.status === 'Absent').length;
    const attendancePct = schoolAttendance.length > 0 ? Math.round((presentCount / schoolAttendance.length) * 100) : 0;

    // Pass / Fail calculations
    let passCount = 0;
    let failCount = 0;
    const presentStudents = schStudents.filter(stu => {
      const att = attendance.find(a => a.student_id === stu.id);
      return !att || att.status === 'Present';
    });

    presentStudents.forEach(stu => {
      const studentMarks = marks.filter(mk => mk.student_id === stu.id && mk.marks_obtained !== null);
      if (studentMarks.length > 0) {
        const total = studentMarks.reduce((sum, item) => sum + (item.marks_obtained || 0), 0);
        // Say passing total score threshold is 35% of total marks
        const subjects = mockDb.getData<any>('subjects').filter((sub: any) => sub.scholarship_id === stu.scholarship_id);
        const totalFullMarks = subjects.reduce((sum: number, s: any) => sum + s.full_marks, 0);
        if (totalFullMarks > 0 && (total / totalFullMarks) * 100 >= 35) {
          passCount++;
        } else {
          failCount++;
        }
      }
    });

    const passPct = presentStudents.length > 0 ? Math.round((passCount / presentStudents.length) * 100) : 0;

    // Merit Rankings from this school
    const rankedStudents = presentStudents.map(stu => {
      const stuMarks = marks.filter(mk => mk.student_id === stu.id && mk.marks_obtained !== null);
      const total = stuMarks.reduce((sum, item) => sum + (item.marks_obtained || 0), 0);
      return { name: stu.name, score: total };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    return {
      totalRegistered: schStudents.length,
      genderData,
      classData,
      admitCardsGenerated: cardsGenerated,
      cardsPercentage: cardsPct,
      attendancePercentage: attendancePct,
      passPercentage: passPct,
      meritRankings: rankedStudents,
      winners: rankedStudents.slice(0, 2).map(r => r.name), // Mock scholarship winners
      historical: [
        { year: '2024', registrations: Math.round(schStudents.length * 0.8), passRate: 72 },
        { year: '2025', registrations: Math.round(schStudents.length * 0.95), passRate: 81 },
        { year: '2026', registrations: schStudents.length, passRate: passPct || 85 }
      ]
    };
  }, [analyticsSchool, students, admitCards, marks, attendance]);

  return (
    <div className="space-y-6 font-sans">
      {/* Title section */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <SchoolIcon className="w-6 h-6 mr-2 text-blue-600" />
            Registered Schools
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Manage and register partner academic institutions.</p>
        </div>

        {/* Administrator specific action buttons */}
        {user && (user.role === 'SuperAdmin' || user.role === 'Admin') && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
            >
              <Download className="w-4 h-4 mr-1.5 text-slate-400" />
              Get Template
            </button>
            <label className="flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all">
              <Upload className="w-4 h-4 mr-1.5 text-slate-400" />
              Bulk Import CSV
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
            <button
              onClick={() => {
                if (showAddForm) {
                  setEditingSchool(null);
                  clearForm();
                }
                setShowAddForm(!showAddForm);
              }}
              className="flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 mr-1" />
              {showAddForm ? 'Cancel' : 'Register School'}
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <form onSubmit={handleAddOrEdit} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-800">
            {editingSchool ? 'Modify Registered School' : 'Register New School'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">School Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Kolkata Science Academy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">UDISE Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                maxLength={11}
                placeholder="11 digit code"
                value={udise}
                onChange={(e) => setUdise(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">School Classification <span className="text-red-500">*</span></label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white"
              >
                <option value="Primary">Primary</option>
                <option value="UpperPrimary">Upper Primary</option>
                <option value="Secondary">Secondary</option>
                <option value="HigherSecondary">Higher Secondary</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">District <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Kolkata"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Block <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Ward 82"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">PIN Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                maxLength={6}
                placeholder="6 digits"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">HM / Principal Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="HM Name"
                value={hmName}
                onChange={(e) => setHmName(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">School Address <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Full Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Contact Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                maxLength={10}
                placeholder="10 digits"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Official Email Address <span className="text-red-500">*</span></label>
              <input
                type="email"
                placeholder="e.g. school@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setEditingSchool(null);
                clearForm();
                setShowAddForm(false);
              }}
              className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-sm px-5 py-2 rounded-xl disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="text-white bg-blue-600 hover:bg-blue-500 text-sm px-5 py-2.5 rounded-xl shadow flex items-center font-semibold disabled:opacity-50 transition-all"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editingSchool ? (isSaving ? 'Saving Changes...' : 'Save Changes') : (isSaving ? 'Registering...' : 'Register School')}
            </button>
          </div>
        </form>
      )}

      {/* Main Table view */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by school, UDISE..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs font-semibold text-slate-400">Total: {filteredSchools.length} schools</span>
        </div>

        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} cols={6} />
          </div>
        ) : filteredSchools.length > 0 ? (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 font-semibold text-slate-600">School ID</th>
                    <th className="p-4 font-semibold text-slate-600">School Name</th>
                    <th className="p-4 font-semibold text-slate-600">UDISE</th>
                    <th className="p-4 font-semibold text-slate-600">Status</th>
                    <th className="p-4 font-semibold text-slate-600 text-center">Analytics</th>
                    <th className="p-4 font-semibold text-slate-600">Contact Details</th>
                    <th className="p-4 font-semibold text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchools.map(s => {
                    const isApproved = s.status === 'Approved';
                    const isPending = s.status === 'Pending Review' || !s.status;
                    const isRejected = s.status === 'Rejected';
                    const isSuspended = s.status === 'Suspended';

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-mono font-bold text-slate-400">{s.school_id}</td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{s.name}</div>
                          <div className="text-xs text-slate-400 flex items-center mt-0.5">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-300" />
                            {s.block}, {s.district} - {s.pin}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-600">{s.udise}</td>
                        <td className="p-4">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-1.5">
                              {isApproved && (
                                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 flex items-center">
                                  <CheckCircle className="w-3 h-3 mr-1" /> Approved
                                </span>
                              )}
                              {isPending && (
                                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> Pending
                                </span>
                              )}
                              {isRejected && (
                                <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center" title={s.rejection_reason}>
                                  <XCircle className="w-3 h-3 mr-1" /> Rejected
                                </span>
                              )}
                              {isSuspended && (
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 flex items-center">
                                  <Ban className="w-3 h-3 mr-1" /> Suspended
                                </span>
                              )}
                              <button
                                onClick={() => setHistoryModalSchool(s)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                title="View Approval History Log"
                              >
                                <ClipboardList className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {isRejected && s.rejection_reason && (
                              <span className="text-[10px] text-red-500 italic max-w-[150px] truncate block" title={s.rejection_reason}>
                                Reason: {s.rejection_reason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setAnalyticsSchool(s)}
                            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg shadow-sm cursor-pointer inline-flex items-center"
                          >
                            <TrendingUp className="w-3.5 h-3.5 mr-1" />
                            Dashboard
                          </button>
                        </td>
                        <td className="p-4 text-slate-500">
                          <div className="flex items-center text-xs">
                            <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-300" />
                            {s.contact_number}
                          </div>
                          <div className="flex items-center text-xs mt-1">
                            <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-300" />
                            {s.email}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end items-center space-x-1.5">
                            {/* Status workflow triggers for Admins */}
                            {user && (user.role === 'SuperAdmin' || user.role === 'Admin') && (
                              <>
                                {isPending && (
                                  <>
                                    <button
                                      onClick={() => handleStatusChange(s, 'Approved')}
                                      title="Approve School"
                                      className="p-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-600 border border-green-200 cursor-pointer shadow-sm"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRejectionModalSchool(s);
                                        setRejectionReason('');
                                      }}
                                      title="Reject School"
                                      className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 border border-red-200 cursor-pointer shadow-sm"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                {isApproved && (
                                  <button
                                    onClick={() => handleStatusChange(s, 'Suspended', 'Administrative suspension')}
                                    title="Suspend School"
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 border border-slate-300 cursor-pointer shadow-sm"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isSuspended && (
                                  <button
                                    onClick={() => handleStatusChange(s, 'Approved', 'Administrative reactivation')}
                                    title="Reactivate School"
                                    className="p-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-600 border border-green-200 cursor-pointer shadow-sm"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isRejected && (
                                  <button
                                    onClick={() => handleStatusChange(s, 'Approved', 'Approved after verification')}
                                    title="Approve School"
                                    className="p-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-600 border border-green-200 cursor-pointer shadow-sm"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}

                            <button
                              onClick={() => handleStartEdit(s)}
                              disabled={isSaving || deletingId !== null}
                              title="Edit School details"
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 border border-slate-200 cursor-pointer shadow-sm disabled:opacity-50"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {user && (user.role === 'SuperAdmin' || user.role === 'Admin') && (
                              <button
                                onClick={() => handleDelete(s.id)}
                                disabled={deletingId !== null}
                                title="Delete School"
                                className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 border border-red-100 cursor-pointer shadow-sm disabled:opacity-50"
                              >
                                {deletingId === s.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Stack View */}
            <div className="block md:hidden p-4 space-y-4">
              {filteredSchools.map(s => {
                const isApproved = s.status === 'Approved';
                const isPending = s.status === 'Pending Review' || !s.status;
                const isRejected = s.status === 'Rejected';
                const isSuspended = s.status === 'Suspended';

                return (
                  <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-extrabold text-slate-800 text-sm">{s.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {s.school_id}</div>
                      </div>
                      <div>
                        {isApproved && (
                          <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 flex items-center">
                            <CheckCircle className="w-2.5 h-2.5 mr-1" /> Approved
                          </span>
                        )}
                        {isPending && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center">
                            <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Pending
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center" title={s.rejection_reason}>
                            <XCircle className="w-2.5 h-2.5 mr-1" /> Rejected
                          </span>
                        )}
                        {isSuspended && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 flex items-center">
                            <Ban className="w-2.5 h-2.5 mr-1" /> Suspended
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-start">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span>{s.address}, {s.block}, {s.district} - {s.pin}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50 mt-1">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">UDISE</span>
                          <span className="font-mono text-slate-700">{s.udise}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">HM Name</span>
                          <span className="text-slate-700">{s.headmaster_name || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Contact</span>
                          <span className="text-slate-700">{s.contact_number}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Email</span>
                          <span className="text-slate-700 truncate block">{s.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t pt-2.5">
                      <div className="flex space-x-1.5">
                        <button
                          onClick={() => setAnalyticsSchool(s)}
                          className="px-2 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg shadow-sm cursor-pointer flex items-center"
                        >
                          <TrendingUp className="w-3 h-3 mr-1" /> Dashboard
                        </button>
                        <button
                          onClick={() => setHistoryModalSchool(s)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 border border-slate-200 transition-colors"
                          title="View Approval History Log"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex space-x-1">
                        {user && (user.role === 'SuperAdmin' || user.role === 'Admin') && (
                          <>
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(s, 'Approved')}
                                  title="Approve School"
                                  className="p-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-600 border border-green-200 cursor-pointer shadow-sm"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectionModalSchool(s);
                                    setRejectionReason('');
                                  }}
                                  title="Reject School"
                                  className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 border border-red-200 cursor-pointer shadow-sm"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {isApproved && (
                              <button
                                onClick={() => handleStatusChange(s, 'Suspended', 'Administrative suspension')}
                                title="Suspend School"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 border border-slate-300 cursor-pointer shadow-sm"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isSuspended && (
                              <button
                                onClick={() => handleStatusChange(s, 'Approved', 'Administrative reactivation')}
                                title="Reactivate School"
                                className="p-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-600 border border-green-200 cursor-pointer shadow-sm"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isRejected && (
                              <button
                                onClick={() => handleStatusChange(s, 'Approved', 'Approved after verification')}
                                title="Approve School"
                                className="p-1.5 bg-green-50 hover:bg-green-100 rounded-lg text-green-600 border border-green-200 cursor-pointer shadow-sm"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => handleStartEdit(s)}
                          disabled={isSaving || deletingId !== null}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 border border-slate-200 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {user && (user.role === 'SuperAdmin' || user.role === 'Admin') && (
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={deletingId !== null}
                            className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 border border-red-100 cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            {deletingId === s.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            No registered schools found matching the current search parameters.
          </div>
        )}
      </div>

      {/* REJECTION REASON MODAL */}
      {rejectionModalSchool && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative">
            <button 
              onClick={() => setRejectionModalSchool(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center text-red-600">
              <XCircle className="w-5 h-5 mr-2" /> Reject Registration Request
            </h3>
            <p className="text-slate-500 text-xs mb-4 leading-relaxed">
              Provide a valid reason for rejecting <strong>{rejectionModalSchool.name}</strong>. This message will be displayed to coordinators.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Invalid UDISE certificate, address details could not be verified."
              className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 min-h-[100px] mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setRejectionModalSchool(null)}
                className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-sm px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    toast.warning("A rejection reason is required.");
                    return;
                  }
                  handleStatusChange(rejectionModalSchool, 'Rejected', rejectionReason);
                  setRejectionModalSchool(null);
                }}
                className="text-white bg-red-600 hover:bg-red-500 text-sm px-4 py-2 rounded-xl font-bold cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL HISTORY LOGS MODAL */}
      {historyModalSchool && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl p-6 relative">
            <button 
              onClick={() => setHistoryModalSchool(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
              <ClipboardList className="w-5 h-5 mr-2 text-blue-600" /> Approval Workflow History
            </h3>
            <span className="text-slate-400 text-xs font-semibold">{historyModalSchool.name}</span>

            <div className="mt-6 border-l-2 border-slate-100 space-y-5 max-h-[300px] overflow-y-auto pr-1">
              {historyModalSchool.approval_history && historyModalSchool.approval_history.length > 0 ? (
                historyModalSchool.approval_history.map((log, index) => {
                  const isApp = log.status === 'Approved';
                  const isRej = log.status === 'Rejected';
                  const isSus = log.status === 'Suspended';
                  return (
                    <div key={index} className="relative pl-6">
                      {/* Timeline dot */}
                      <span className={`absolute left-[-6px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        isApp ? 'bg-green-500' : isRej ? 'bg-red-500' : isSus ? 'bg-slate-500' : 'bg-amber-500'
                      }`} />
                      <div className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
                        <span>{log.status}</span>
                        <span className="text-[10px] text-slate-400 font-normal capitalize">by {log.action_by}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                      {log.remarks && (
                        <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded p-1.5 italic">
                          {log.remarks}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-slate-400 text-center py-6">No historical workflow logs recorded.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BULK IMPORT PREVIEW MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-5xl w-full shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
            <button 
              onClick={() => setShowImportModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
              <FileSpreadsheet className="w-5 h-5 mr-2 text-blue-600" /> Preview School Imports
            </h3>
            <p className="text-slate-500 text-xs mb-4">
              Review records parsed from your CSV file. Duplicates or validation errors are highlighted below.
            </p>

            {/* Preview Spreadsheet Table */}
            <div className="flex-1 overflow-auto border rounded-xl my-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b sticky top-0 z-10">
                    <th className="p-3 font-semibold text-slate-600">Row</th>
                    <th className="p-3 font-semibold text-slate-600">School Name</th>
                    <th className="p-3 font-semibold text-slate-600">UDISE</th>
                    <th className="p-3 font-semibold text-slate-600">Type</th>
                    <th className="p-3 font-semibold text-slate-600">Contact / Email</th>
                    <th className="p-3 font-semibold text-slate-600">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.map((row, idx) => {
                    const hasErr = row.errors.length > 0;
                    const hasDup = !!row.duplicateMessage;
                    return (
                      <tr key={row.id} className={`hover:bg-slate-50/50 ${!row.isValid ? 'bg-red-50/20' : ''}`}>
                        <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800">{row.name}</td>
                        <td className="p-3 font-mono text-slate-600">{row.udise}</td>
                        <td className="p-3">{row.type}</td>
                        <td className="p-3">
                          <div>{row.contact_number}</div>
                          <div className="text-slate-400 mt-0.5">{row.email}</div>
                        </td>
                        <td className="p-3">
                          {row.isValid ? (
                            <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                              Valid Row
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {hasErr && row.errors.map((e: string, i: number) => (
                                <span key={i} className="text-[9px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 block">
                                  ⚠️ {e}
                                </span>
                              ))}
                              {hasDup && (
                                <span className="text-[9px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 block">
                                  📋 {row.duplicateMessage}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-4">
              <label className="flex items-center text-xs font-semibold text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipInvalidRows}
                  onChange={(e) => setSkipInvalidRows(e.target.checked)}
                  className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Skip invalid/duplicate rows during import
              </label>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-sm px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="text-white bg-blue-600 hover:bg-blue-500 text-sm px-4 py-2.5 rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Confirm Import ({importPreview.filter(row => row.isValid || (!skipInvalidRows && row.errors.length === 0)).length} rows)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B4 SCHOOL ANALYTICS DASHBOARD MODAL */}
      {analyticsSchool && analyticsData && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full shadow-2xl p-6 relative flex flex-col max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setAnalyticsSchool(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="border-b pb-4 mb-5 flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <SchoolIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 leading-tight">School Analytics Dashboard</h3>
                <span className="text-slate-500 text-xs font-semibold">{analyticsSchool.name} • UDISE: {analyticsSchool.udise}</span>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 p-4 border rounded-xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Registered Students</div>
                <div className="text-xl font-extrabold text-slate-800 mt-1">{analyticsData.totalRegistered}</div>
              </div>
              <div className="bg-slate-50 p-4 border rounded-xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Admit Cards Generated</div>
                <div className="text-xl font-extrabold text-slate-800 mt-1">{analyticsData.admitCardsGenerated} <span className="text-xs font-bold text-blue-600">({analyticsData.cardsPercentage}%)</span></div>
              </div>
              <div className="bg-slate-50 p-4 border rounded-xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Attendance Rate</div>
                <div className="text-xl font-extrabold text-slate-800 mt-1">{analyticsData.attendancePercentage}%</div>
              </div>
              <div className="bg-slate-50 p-4 border rounded-xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Examination Pass Rate</div>
                <div className="text-xl font-extrabold text-slate-800 mt-1">{analyticsData.passPercentage}%</div>
              </div>
            </div>

            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Gender Split Pie */}
              <div className="border p-4 rounded-xl flex flex-col items-center">
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-4 self-start">Gender Distribution</h4>
                {analyticsData.genderData.length > 0 ? (
                  <div className="w-full h-48 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.genderData}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {analyticsData.genderData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" />
                        <ChartTooltip contentStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-xs">No registration data.</div>
                )}
              </div>

              {/* Class-wise Bar */}
              <div className="border p-4 rounded-xl flex flex-col">
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-4">Class-wise Distribution</h4>
                {analyticsData.classData.length > 0 ? (
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.classData} margin={{ left: -20, bottom: 0, top: 0, right: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="class" fontSize={10} stroke="#94A3B8" tickLine={false} />
                        <YAxis fontSize={10} stroke="#94A3B8" tickLine={false} />
                        <ChartTooltip />
                        <Bar dataKey="students" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-xs">No registration data.</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Historical Performance */}
              <div className="border p-4 rounded-xl flex flex-col">
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-4">Historical Performance Trend</h4>
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.historical} margin={{ left: -20, bottom: 0, top: 0, right: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="year" fontSize={10} stroke="#94A3B8" />
                      <YAxis fontSize={10} stroke="#94A3B8" />
                      <ChartTooltip />
                      <Bar dataKey="registrations" fill="#3B82F6" name="Registrations" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="passRate" fill="#10B981" name="Pass Rate (%)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ranks & Winners list */}
              <div className="border p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-4">Top Candidates & Winners</h4>
                  {analyticsData.meritRankings.length > 0 ? (
                    <div className="space-y-2.5">
                      {analyticsData.meritRankings.map((student, i) => {
                        const isWinner = analyticsData.winners.includes(student.name);
                        return (
                          <div key={i} className="flex justify-between items-center text-xs border-b pb-2 last:border-0 last:pb-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-slate-400">#{i + 1}</span>
                              <span className="font-bold text-slate-800">{student.name}</span>
                              {isWinner && (
                                <span className="bg-yellow-50 text-yellow-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-yellow-100 inline-flex items-center">
                                  <Award className="w-2.5 h-2.5 mr-0.5" /> Winner
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-blue-600">{student.score} pts</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 text-xs py-8">No scores entered yet for this school.</div>
                  )}
                </div>

                <div className="text-right mt-4 pt-4 border-t">
                  <button
                    onClick={() => setAnalyticsSchool(null)}
                    className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-xs px-4 py-2 rounded-xl"
                  >
                    Close Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
