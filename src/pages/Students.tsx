import React, { useState, useEffect, useMemo } from 'react';
import { mockDb, Student, School, Scholarship } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { UserSquare2, Plus, Phone, Calendar, Search, MapPin, MessageSquare, FileText, Loader2 } from 'lucide-react';
import { DatePicker } from '../components/DatePicker';

export const Students: React.FC = () => {
  const [dbScholarships, setDbScholarships] = useState<Scholarship[]>(mockDb.getData<Scholarship>('scholarships'));
  const [dbSchools, setDbSchools] = useState<School[]>(mockDb.getData<School>('schools'));
  const [students, setStudents] = useState<Student[]>(mockDb.getData<Student>('students'));

  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields based on the Physical Form image
  const [formNoSuffix, setFormNoSuffix] = useState('');
  const [name, setName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  
  // Address Details
  const [village, setVillage] = useState('');
  const [postOffice, setPostOffice] = useState('');
  const [policeStation, setPoliceStation] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('West Bengal');
  const [pinCode, setPinCode] = useState('');

  // Pin code fetching state
  const [isFetchingPincode, setIsFetchingPincode] = useState(false);
  const [postOfficeList, setPostOfficeList] = useState<string[]>([]);

  // Communication Details
  const [guardianContact, setGuardianContact] = useState('');
  const [whatsappNo, setWhatsappNo] = useState('');
  const [isSameContact, setIsSameContact] = useState(false);

  // Educational Details
  const [selectedSch, setSelectedSch] = useState('');
  const [selectedScl, setSelectedScl] = useState('');
  const [section, setSection] = useState('A');
  const [schoolRoll, setSchoolRoll] = useState('');

  const [filterQuery, setFilterQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');

  // Fetch data from Supabase if configured
  useEffect(() => {
    const fetchLiveStudentsData = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const [
            { data: stus },
            { data: scls },
            { data: schs }
          ] = await Promise.all([
            supabase.from('students').select('*').order('created_at', { ascending: false }),
            supabase.from('schools').select('*').order('name', { ascending: true }),
            supabase.from('scholarships').select('*')
          ]);

          if (stus) setStudents(stus);
          if (scls) setDbSchools(scls);
          if (schs) {
            setDbScholarships(schs);
            if (schs.length > 0) setSelectedSch(schs[0].id);
          }
          if (scls && scls.length > 0) setSelectedScl(scls[0].id);
        } catch (err) {
          console.error("Error fetching students live data:", err);
        }
      } else {
        if (dbScholarships.length > 0) setSelectedSch(dbScholarships[0].id);
        if (dbSchools.length > 0) setSelectedScl(dbSchools[0].id);
      }
    };
    fetchLiveStudentsData();
  }, []);

  // Sync WhatsApp number if checkbox is checked
  useEffect(() => {
    if (isSameContact) {
      setWhatsappNo(guardianContact);
    }
  }, [guardianContact, isSameContact]);

  // Handler for PIN code changes with API fetch
  const handlePinCodeChange = async (val: string) => {
    const sanitized = val.replace(/\D/g, '');
    setPinCode(sanitized);

    if (sanitized.length === 6) {
      setIsFetchingPincode(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${sanitized}`);
        const data = await res.json();
        
        if (data && data[0] && data[0].Status === 'Success') {
          const offices = data[0].PostOffice;
          if (offices && offices.length > 0) {
            const districtVal = offices[0].District;
            const stateVal = offices[0].State;
            setDistrict(districtVal);
            setState(stateVal);

            const officeNames = offices.map((o: any) => o.Name).sort();
            setPostOfficeList(officeNames);
            setPostOffice(officeNames[0]); // default to first
          }
        } else {
          setPostOfficeList([]);
        }
      } catch (err) {
        console.error("Error fetching PIN code details:", err);
        setPostOfficeList([]);
      } finally {
        setIsFetchingPincode(false);
      }
    } else {
      setPostOfficeList([]);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob || !selectedScl || isSaving) return;

    setIsSaving(true);
    const nextId = `STU-${String(students.length + 1).padStart(6, '0')}`;
    const fullFormNo = formNoSuffix ? `ICST/SE/${formNoSuffix}` : '';

    const newStudentData = {
      student_id: nextId,
      scholarship_id: selectedSch,
      school_id: selectedScl,
      name,
      dob,
      gender,
      class: 'X', // Predetermined class from the form image is "X"
      section,
      school_roll_no: schoolRoll,
      guardian_contact: guardianContact,
      photo_url: null,
      is_special_registration: false,
      form_number: fullFormNo,
      guardian_name: guardianName,
      aadhaar_no: aadhaarNo,
      whatsapp_no: whatsappNo,
      village,
      post_office: postOffice,
      police_station: policeStation,
      district,
      state,
      pin_code: pinCode,
      address: `${village}, P.O. ${postOffice}, P.S. ${policeStation}, Dist. ${district}, ${state} - ${pinCode}`
    };

    try {
      let insertedId = `stu-${Date.now()}`;
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('students')
          .insert(newStudentData)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          insertedId = data.id;
        }
      }

      const newStudent = mockDb.addRecord<Student>('students', {
        id: insertedId,
        ...newStudentData
      });

      setStudents([newStudent, ...students]);
      setShowAddForm(false);

      // Reset Form Fields
      setFormNoSuffix('');
      setName('');
      setGuardianName('');
      setAadhaarNo('');
      setDob('');
      setGender('Male');
      setVillage('');
      setPostOffice('');
      setPoliceStation('');
      setDistrict('');
      setState('West Bengal');
      setPinCode('');
      setGuardianContact('');
      setWhatsappNo('');
      setIsSameContact(false);
      setSection('A');
      setSchoolRoll('');
    } catch (err: any) {
      alert("Failed to register candidate: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(
      s => (s.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
            s.student_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
            (s.form_number && s.form_number.toLowerCase().includes(filterQuery.toLowerCase()))) &&
           (schoolFilter === '' || s.school_id === schoolFilter)
    );
  }, [students, filterQuery, schoolFilter]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <UserSquare2 className="w-6 h-6 mr-2 text-blue-600" />
            Registered Candidates
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage and enroll candidates matching the computer scholarship application forms.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          {showAddForm ? 'Cancel' : 'Enroll Student'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6 max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Computer Scholarship Application Form 2026
            </h3>
            
            {/* Form Number with pre-filled prefix */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 bg-slate-50 mt-3 md:mt-0">
              <span className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200">Form No.: ICST/SE/</span>
              <input
                type="text"
                placeholder="e.g. 10"
                value={formNoSuffix}
                onChange={(e) => setFormNoSuffix(e.target.value.replace(/\D/g, ''))} // only digits allowed
                className="w-20 px-2 py-2 text-sm bg-white font-black text-center focus:outline-none text-slate-800"
                required
              />
            </div>
          </div>

          {/* 1. Basic Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Basic Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Candidate Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Guardian Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Guardian Name"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Aadhaar No. <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="12 digit number"
                  maxLength={12}
                  value={aadhaarNo}
                  onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Date of Birth <span className="text-red-500">*</span></label>
                <DatePicker
                  value={dob}
                  onChange={(val) => setDob(val)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Gender <span className="text-red-500">*</span></label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Address Details */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Address Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">PIN Code <span className="text-red-500">*</span></label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="6 digits"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => handlePinCodeChange(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 pr-10 text-sm rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  {isFetchingPincode && (
                    <div className="absolute right-3 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Village <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Village"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Post Office <span className="text-red-500">*</span></label>
                {postOfficeList.length > 0 ? (
                  <select
                    value={postOffice}
                    onChange={(e) => setPostOffice(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white"
                    required
                  >
                    {postOfficeList.map((po) => (
                      <option key={po} value={po}>{po}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter PIN code to load or type Post Office"
                    value={postOffice}
                    onChange={(e) => setPostOffice(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                    required
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Police Station <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Police Station"
                  value={policeStation}
                  onChange={(e) => setPoliceStation(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">District <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="District (auto-fetched by PIN)"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">State <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="State (auto-fetched by PIN)"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50"
                  required
                />
              </div>
            </div>
          </div>

          {/* 3. Communication Details */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Communication Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Contact No. <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="10 digits"
                  value={guardianContact}
                  onChange={(e) => setGuardianContact(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">WhatsApp No.</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="WhatsApp Contact"
                  value={whatsappNo}
                  onChange={(e) => setWhatsappNo(e.target.value.replace(/\D/g, ''))}
                  disabled={isSameContact}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg font-mono disabled:bg-slate-100 disabled:opacity-75"
                />
                
                {/* Same contact checkbox */}
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    id="same-contact"
                    checked={isSameContact}
                    onChange={(e) => {
                      setIsSameContact(e.target.checked);
                      if (e.target.checked) {
                        setWhatsappNo(guardianContact);
                      }
                    }}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="same-contact" className="text-xs font-semibold text-slate-500 cursor-pointer select-none">
                    WhatsApp number is same as contact number
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Educational Details */}
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Educational Details</h4>
              <span className="text-xs font-bold text-slate-400">Academic Session: 2026 - 2027</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Scholarship Session</label>
                <select
                  value={selectedSch}
                  onChange={(e) => setSelectedSch(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white"
                >
                  {dbScholarships.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">School Name <span className="text-red-500">*</span></label>
                <select
                  value={selectedScl}
                  onChange={(e) => setSelectedScl(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white"
                  required
                >
                  <option value="">-- Select School --</option>
                  {dbSchools.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.school_id})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Class</label>
                <input
                  type="text"
                  value="X"
                  disabled
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-100 text-slate-600 font-extrabold text-center"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Section <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Section (e.g. A, B)"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg text-center font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Roll No. <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="School Roll"
                  value={schoolRoll}
                  onChange={(e) => setSchoolRoll(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg text-center font-bold"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setShowAddForm(false);
                setFormNoSuffix('');
              }}
              className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-sm px-5 py-2 rounded-xl disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="text-white bg-blue-600 hover:bg-blue-500 text-sm px-5 py-2.5 rounded-xl shadow font-semibold flex items-center disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {isSaving ? 'Enrolling...' : 'Enroll Candidate'}
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
                placeholder="Search name, ID, Form No..."
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
              {dbSchools.map(s => (
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
                <th className="p-4 font-semibold text-slate-600">ID / Form No.</th>
                <th className="p-4 font-semibold text-slate-600">Student Name</th>
                <th className="p-4 font-semibold text-slate-600">School</th>
                <th className="p-4 font-semibold text-slate-600">DOB / Gender</th>
                <th className="p-4 font-semibold text-slate-600">Class & Roll</th>
                <th className="p-4 font-semibold text-slate-600">Guardian Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(s => {
                const school = dbSchools.find(sch => sch.id === s.school_id);
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-500 text-xs">{s.student_id}</div>
                      {s.form_number && (
                        <div className="text-[10px] text-blue-600 font-extrabold mt-0.5 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/50 w-max">
                          {s.form_number}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{s.name}</div>
                          {s.guardian_name && (
                            <div className="text-[10px] text-slate-400">Guardian: {s.guardian_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">{school?.name || 'N/A'}</td>
                    <td className="p-4">
                      <div className="text-slate-700 font-semibold flex items-center text-xs">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {s.dob}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">{s.gender}</div>
                    </td>
                    <td className="p-4 font-medium text-slate-600">
                      <div>Class {s.class}</div>
                      <div className="text-[11px] text-slate-400">Sec {s.section} | Roll #{s.school_roll_no}</div>
                    </td>
                    <td className="p-4 text-slate-500">
                      <div className="flex items-center text-xs font-semibold">
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-300" />
                        {s.guardian_contact}
                      </div>
                      {s.whatsapp_no && (
                        <div className="flex items-center text-[10px] text-slate-400 mt-1">
                          <MessageSquare className="w-3 h-3 mr-1 text-slate-300" />
                          WA: {s.whatsapp_no}
                        </div>
                      )}
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
