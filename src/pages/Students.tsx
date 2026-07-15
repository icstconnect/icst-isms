import React, { useState, useEffect, useMemo } from 'react';
import { mockDb, Student, School, Scholarship } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { UserSquare2, Plus, Phone, Calendar, Search, MapPin, MessageSquare, FileText, Loader2, Pencil, Trash2 } from 'lucide-react';
import { DatePicker } from '../components/DatePicker';

export const Students: React.FC = () => {
  const [dbScholarships, setDbScholarships] = useState<Scholarship[]>(mockDb.getData<Scholarship>('scholarships'));
  const [dbSchools, setDbSchools] = useState<School[]>(mockDb.getData<School>('schools'));
  const [students, setStudents] = useState<Student[]>(mockDb.getData<Student>('students'));

  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Photo Upload & Cropper states
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropScale, setCropScale] = useState(1.0);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageSrc(reader.result as string);
        setCropScale(1.0);
        setCropX(0);
        setCropY(0);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropSave = () => {
    if (!tempImageSrc) return;

    const img = new Image();
    img.src = tempImageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 350;
      canvas.height = 450;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgRatio = img.width / img.height;
      const targetRatio = 175 / 225;
      let baseW = 175;
      let baseH = 225;
      if (imgRatio > targetRatio) {
        baseH = 225;
        baseW = 225 * imgRatio;
      } else {
        baseW = 175;
        baseH = 175 / imgRatio;
      }

      const dw = baseW * cropScale * 2;
      const dh = baseH * cropScale * 2;
      const dx = 175 + cropX * 2 - dw / 2;
      const dy = 225 + cropY * 2 - dh / 2;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 350, 450);
      ctx.drawImage(img, dx, dy, dw, dh);

      let quality = 0.8;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      let sizeKb = Math.round((dataUrl.split(',')[1].length * 3) / 4 / 1024);

      // Auto decrease image size to be within 100KB max
      while (sizeKb > 100 && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        sizeKb = Math.round((dataUrl.split(',')[1].length * 3) / 4 / 1024);
      }

      setPhotoUrl(dataUrl);
      setShowCropper(false);
    };
  };

  const clearForm = () => {
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
    setPhotoUrl(null);
    setEditingStudent(null);
  };

  const handleStartEdit = (s: Student) => {
    setEditingStudent(s);
    
    // Parse form number prefix
    if (s.form_number && s.form_number.startsWith('ICST/SE/')) {
      setFormNoSuffix(s.form_number.replace('ICST/SE/', ''));
    } else {
      setFormNoSuffix(s.form_number || '');
    }

    setName(s.name);
    setGuardianName(s.guardian_name || '');
    setAadhaarNo(s.aadhaar_no || '');
    setDob(s.dob);
    setGender(s.gender as any);
    setVillage(s.village || '');
    setPostOffice(s.post_office || '');
    setPoliceStation(s.police_station || '');
    setDistrict(s.district || '');
    setState(s.state || 'West Bengal');
    setPinCode(s.pin_code || '');
    setGuardianContact(s.guardian_contact);
    setWhatsappNo(s.whatsapp_no || '');
    setIsSameContact(s.whatsapp_no === s.guardian_contact);
    setSelectedSch(s.scholarship_id);
    setSelectedScl(s.school_id);
    setSection(s.section);
    setSchoolRoll(s.school_roll_no);
    setPhotoUrl(s.photo_url || null);
    
    setShowAddForm(true);
    // Scroll window to form view on mobile devices
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this candidate? This will delete all attendance records and marks for this student.")) return;

    setDeletingId(id);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }

      mockDb.deleteRecord('students', id);
      setStudents(students.filter(s => s.id !== id));
    } catch (err: any) {
      alert("Failed to delete candidate: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob || !selectedScl || isSaving) return;

    setIsSaving(true);
    const fullFormNo = formNoSuffix ? `ICST/SE/${formNoSuffix}` : '';

    const candidateData = {
      scholarship_id: selectedSch,
      school_id: selectedScl,
      name,
      dob,
      gender,
      class: 'X',
      section,
      school_roll_no: schoolRoll,
      guardian_contact: guardianContact,
      photo_url: photoUrl,
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
      if (editingStudent) {
        // Edit Mode
        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('students')
            .update(candidateData)
            .eq('id', editingStudent.id);
          if (error) throw error;
        }

        mockDb.updateRecord<Student>('students', editingStudent.id, candidateData);
        setStudents(students.map(s => s.id === editingStudent.id ? { ...s, ...candidateData } : s));
        setShowAddForm(false);
        clearForm();
      } else {
        // Add Mode
        const nextId = `STU-${String(students.length + 1).padStart(6, '0')}`;
        const newStudentData = {
          student_id: nextId,
          is_special_registration: false,
          ...candidateData
        };

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
        clearForm();
      }
    } catch (err: any) {
      alert("Failed to save candidate: " + err.message);
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
        <form onSubmit={handleAddOrEdit} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6 max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              {editingStudent ? 'Edit Candidate Details' : 'Computer Scholarship Application Form 2026'}
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

          {/* 1. Basic Details & Photo Upload */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Basic Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Left Form Fields (Col span 2) */}
              <div className="md:col-span-2 space-y-4 order-2 md:order-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Candidate Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                      className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Aadhaar No. <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="12 digit number"
                      maxLength={12}
                      value={aadhaarNo}
                      onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, ''))}
                      className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Gender <span className="text-red-500">*</span></label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Date of Birth <span className="text-red-500">*</span></label>
                  <DatePicker
                    value={dob}
                    onChange={(val) => setDob(val)}
                    required
                  />
                </div>
              </div>

              {/* Right Photo Upload Box (Col span 1) - Appears first on mobile flow for visual alignment */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100/50 transition-colors order-1 md:order-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-3 text-center">Student Photograph</label>
                
                {/* 3.5cm x 4.5cm Passport aspect ratio preview: scaled 140px x 180px */}
                <div className="w-[140px] h-[180px] border border-slate-300 rounded-lg bg-white overflow-hidden shadow-sm flex flex-col items-center justify-center relative group">
                  {photoUrl ? (
                    <>
                      <img src={photoUrl} alt="Student passport preview" className="w-full h-full object-cover" />
                      
                      {/* Green Success Sign overlay */}
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-md flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-normal">
                        Paste recent photo
                      </span>
                      <span className="text-[9px] text-slate-300 mt-1 uppercase font-bold">
                        3.5 x 4.5 Ratio
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col items-center space-y-1.5 w-full">
                  <input
                    type="file"
                    accept="image/*"
                    id="student-photo-file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="student-photo-file"
                    className="w-full text-center text-base sm:text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-4 py-3 sm:py-2 rounded-xl cursor-pointer transition-colors shadow-sm"
                  >
                    {photoUrl ? 'Change Image' : 'Upload Image'}
                  </label>
                  
                  {photoUrl && (
                    <span className="text-[10px] font-bold text-green-600 flex items-center bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                      ✓ Ready for admit card (Max 100KB)
                    </span>
                  )}
                </div>
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
                    className="w-full border border-slate-200 p-2.5 pr-10 text-base sm:text-sm rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Post Office <span className="text-red-500">*</span></label>
                {postOfficeList.length > 0 ? (
                  <select
                    value={postOffice}
                    onChange={(e) => setPostOffice(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                    className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg bg-slate-50 focus:outline-none"
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
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg bg-slate-50 focus:outline-none"
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
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg font-mono disabled:bg-slate-100 disabled:opacity-75 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                
                {/* Same contact checkbox */}
                <div className="flex items-center space-x-2.5 mt-3.5">
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
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Educational Details</h4>
              <span className="text-[11px] font-bold text-slate-400">Academic Session: 2026 - 2027</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Scholarship Session</label>
                <select
                  value={selectedSch}
                  onChange={(e) => setSelectedSch(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select School --</option>
                  {dbSchools.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.school_id})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Class</label>
                <input
                  type="text"
                  value="X"
                  disabled
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg bg-slate-100 text-slate-600 font-extrabold text-center focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Section <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Section (e.g. A, B)"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg text-center font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg text-center font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setShowAddForm(false);
                clearForm();
              }}
              className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-base sm:text-sm py-3 sm:py-2 px-5 rounded-xl disabled:opacity-50 font-semibold w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="text-white bg-blue-600 hover:bg-blue-500 text-base sm:text-sm py-3 sm:py-2.5 px-5 rounded-xl shadow font-semibold flex items-center justify-center disabled:opacity-50 w-full sm:w-auto"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {isSaving ? (editingStudent ? 'Saving...' : 'Enrolling...') : (editingStudent ? 'Save Changes' : 'Enroll Candidate')}
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
          <>
            <table className="w-full text-left border-collapse text-sm hidden md:table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-semibold text-slate-600">ID / Form No.</th>
                  <th className="p-4 font-semibold text-slate-600">Student Name</th>
                  <th className="p-4 font-semibold text-slate-600">School</th>
                  <th className="p-4 font-semibold text-slate-600">DOB / Gender</th>
                  <th className="p-4 font-semibold text-slate-600">Class & Roll</th>
                  <th className="p-4 font-semibold text-slate-600">Guardian Contact</th>
                  <th className="p-4 font-semibold text-slate-600 text-right">Actions</th>
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
                          {s.photo_url ? (
                            <img src={s.photo_url} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border">
                              {s.name.charAt(0)}
                            </div>
                          )}
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
                            <MessageSquare className="w-3.5 h-3.5 mr-1 text-slate-300" />
                            WA: {s.whatsapp_no}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end space-x-1.5">
                          <button
                            onClick={() => handleStartEdit(s)}
                            disabled={isSaving || deletingId !== null}
                            title="Edit Candidate"
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 border border-slate-200 cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={deletingId !== null}
                            title="Delete Candidate"
                            className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 border border-red-100 cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            {deletingId === s.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile View responsive candidate cards */}
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden bg-slate-50/50">
              {filteredStudents.map(s => {
                const school = dbSchools.find(sch => sch.id === s.school_id);
                return (
                  <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt={s.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-100 flex items-center justify-center">
                            {s.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{s.name}</h4>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="font-mono text-[10px] font-bold text-slate-400">{s.student_id}</span>
                            {s.form_number && (
                              <span className="text-[9px] text-blue-600 font-black bg-blue-50 px-1 py-0.2 rounded border border-blue-100/50">
                                {s.form_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2.5 text-slate-600">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">School</span>
                        <span className="font-semibold text-slate-700 truncate block">{school?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">DOB / Gender</span>
                        <span className="font-semibold text-slate-700 block">{s.dob} ({s.gender.charAt(0)})</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Class & Roll</span>
                        <span className="font-semibold text-slate-700 block">X | Sec {s.section} | #{s.school_roll_no}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Guardian Name</span>
                        <span className="font-semibold text-slate-700 block">{s.guardian_name || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span className="text-[10px] font-bold text-slate-400">Contact Details:</span>
                      <div className="flex space-x-2">
                        <a
                          href={`tel:${s.guardian_contact}`}
                          className="flex items-center text-xs font-bold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 mr-1" />
                          Call
                        </a>
                        {s.whatsapp_no && (
                          <a
                            href={`https://wa.me/91${s.whatsapp_no}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center text-xs font-bold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg border border-green-200 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span className="text-[10px] font-bold text-slate-400">Actions:</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStartEdit(s)}
                          disabled={isSaving || deletingId !== null}
                          className="flex items-center text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer disabled:opacity-50"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId !== null}
                          className="flex items-center text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 cursor-pointer disabled:opacity-50"
                        >
                          {deletingId === s.id ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-400">
            No registered students matching filter rules found.
          </div>
        )}
      </div>

      {/* Photo Cropping Modal */}
      {showCropper && tempImageSrc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-slate-800 border-b pb-2">Crop Student Photograph</h3>
            
            {/* Aspect Ratio Box Mask: 3.5 to 4.5 */}
            <div className="flex justify-center">
              <div className="w-[175px] h-[225px] border-2 border-blue-500 rounded-lg overflow-hidden bg-slate-900 relative shadow-inner">
                <img
                  src={tempImageSrc}
                  alt="Source to crop"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) translate(${cropX}px, ${cropY}px) scale(${cropScale})`,
                    transformOrigin: 'center center',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    minWidth: '100%',
                    minHeight: '100%',
                    display: 'block',
                    pointerEvents: 'none'
                  }}
                />
                
                {/* Visual guidelines */}
                <div className="absolute inset-0 border border-white/20 pointer-events-none"></div>
                <div className="absolute top-1/3 left-0 right-0 border-b border-dashed border-white/20 pointer-events-none"></div>
                <div className="absolute top-2/3 left-0 right-0 border-b border-dashed border-white/20 pointer-events-none"></div>
                <div className="absolute left-1/3 top-0 bottom-0 border-r border-dashed border-white/20 pointer-events-none"></div>
                <div className="absolute left-2/3 top-0 bottom-0 border-r border-dashed border-white/20 pointer-events-none"></div>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3.5 text-xs font-semibold text-slate-600">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Zoom / Scale:</span>
                  <span className="font-mono text-slate-500">{cropScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={cropScale}
                  onChange={(e) => setCropScale(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Horizontal (Pan X):</span>
                  <span className="font-mono text-slate-500">{cropX}px</span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="-150" // Wait, min="-150" max="150"
                  className="hidden" // we will write direct ranges
                />
                <input
                  type="range"
                  min="-150"
                  max="150"
                  value={cropX}
                  onChange={(e) => setCropX(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Vertical (Pan Y):</span>
                  <span className="font-mono text-slate-500">{cropY}px</span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  value={cropY}
                  onChange={(e) => setCropY(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end space-x-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowCropper(false)}
                className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-xs px-4 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropSave}
                className="text-white bg-blue-600 hover:bg-blue-500 text-xs px-4 py-2 rounded-lg font-bold shadow-md"
              >
                Crop & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
