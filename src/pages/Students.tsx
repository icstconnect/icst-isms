import React, { useState } from 'react';
import { mockDb, Student, School, Scholarship } from '../services/mockDb';
import { UserSquare2, Plus, Phone, Calendar, Search } from 'lucide-react';

export const Students: React.FC = () => {
  const schools = mockDb.getData<School>('schools');
  const scholarships = mockDb.getData<Scholarship>('scholarships');
  
  const [students, setStudents] = useState<Student[]>(mockDb.getData<Student>('students'));
  const [showAddForm, setShowAddForm] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [father, setFather] = useState('');
  const [mother, setMother] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [className, setClassName] = useState('Class X');
  const [section, setSection] = useState('A');
  const [schoolRoll, setSchoolRoll] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [address, setAddress] = useState('');
  const [selectedSch, setSelectedSch] = useState(scholarships[0]?.id || '');
  const [selectedScl, setSelectedScl] = useState(schools[0]?.id || '');

  const [filterQuery, setFilterQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob) return;

    // Generate consecutive student id
    const nextId = `STU-${String(students.length + 1).padStart(6, '0')}`;

    const newStudent = mockDb.addRecord<Student>('students', {
      student_id: nextId,
      scholarship_id: selectedSch,
      school_id: selectedScl,
      name,
      father_name: father,
      mother_name: mother,
      dob,
      gender,
      class: className,
      section,
      school_roll_no: schoolRoll,
      guardian_contact: guardianContact,
      address,
      photo_url: null,
      is_special_registration: false
    });

    setStudents([...students, newStudent]);
    setShowAddForm(false);
    // Reset fields
    setName(''); setFather(''); setMother(''); setDob(''); setSchoolRoll(''); setGuardianContact(''); setAddress('');
  };

  const filteredStudents = students.filter(
    s => (s.name.toLowerCase().includes(filterQuery.toLowerCase()) || s.student_id.toLowerCase().includes(filterQuery.toLowerCase())) &&
         (schoolFilter === '' || s.school_id === schoolFilter)
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <UserSquare2 className="w-6 h-6 mr-2 text-blue-600" />
            Registered Students
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage and enroll candidates for scholarship examinations.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          Enroll Student
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Enroll New Student</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Scholarship Session</label>
              <select
                value={selectedSch}
                onChange={(e) => setSelectedSch(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white"
              >
                {scholarships.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Enrolled School</label>
              <select
                value={selectedScl}
                onChange={(e) => setSelectedScl(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.school_id})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Student Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Student Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Father's Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Father's Name"
                value={father}
                onChange={(e) => setFather(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Mother's Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Mother's Name"
                value={mother}
                onChange={(e) => setMother(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Date of Birth <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Class Level <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Section / Roll No <span className="text-red-500">*</span></label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Sec"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-1/2 border border-slate-200 p-2.5 text-sm rounded-lg text-center"
                  required
                />
                <input
                  type="text"
                  placeholder="Roll"
                  value={schoolRoll}
                  onChange={(e) => setSchoolRoll(e.target.value)}
                  className="w-1/2 border border-slate-200 p-2.5 text-sm rounded-lg text-center"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Residential Address <span className="text-red-500">*</span></label>
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
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Guardian Contact Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                maxLength={10}
                placeholder="10 digits"
                value={guardianContact}
                onChange={(e) => setGuardianContact(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-sm px-5 py-2 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-white bg-blue-600 hover:bg-blue-500 text-sm px-5 py-2 rounded-xl shadow"
            >
              Enroll Candidate
            </button>
          </div>
        </form>
      )}

      {/* Filter panel */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex flex-1 gap-4">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search by student name, ID..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="border border-slate-200 px-3 py-1.5 rounded-lg text-xs bg-white focus:outline-none"
            >
              <option value="">All Schools</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <span className="text-xs font-semibold text-slate-400">Total Enrollment: {filteredStudents.length} candidates</span>
        </div>

        {filteredStudents.length > 0 ? (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">Student ID</th>
                <th className="p-4 font-semibold text-slate-600">Student Name</th>
                <th className="p-4 font-semibold text-slate-600">School</th>
                <th className="p-4 font-semibold text-slate-600">DOB / Gender</th>
                <th className="p-4 font-semibold text-slate-600">Class & Roll</th>
                <th className="p-4 font-semibold text-slate-600">Guardian Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(s => {
                const school = schools.find(sch => sch.id === s.school_id);
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-slate-400">{s.student_id}</td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{s.name}</div>
                          <div className="text-xs text-slate-400">F: {s.father_name} | M: {s.mother_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">{school?.name || 'N/A'}</td>
                    <td className="p-4">
                      <div className="text-slate-700 font-semibold flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {s.dob}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">{s.gender}</div>
                    </td>
                    <td className="p-4 font-medium text-slate-600">
                      <div>{s.class}</div>
                      <div className="text-xs text-slate-400">Sec {s.section} | Roll #{s.school_roll_no}</div>
                    </td>
                    <td className="p-4 text-slate-500">
                      <div className="flex items-center text-xs font-semibold">
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-300" />
                        {s.guardian_contact}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-slate-400">
            No registered students matching filter rules found.
          </div>
        )}
      </div>
    </div>
  );
};
