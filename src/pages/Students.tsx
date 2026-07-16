import React, { useState, useEffect, useMemo } from 'react';
import { 
  mockDb, 
  Student, 
  School, 
  Scholarship, 
  StudentTimelineEvent, 
  StudentTransfer, 
  Profile 
} from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  UserSquare2, 
  Plus, 
  Phone, 
  Calendar, 
  Search, 
  MapPin, 
  MessageSquare, 
  FileText, 
  Loader2, 
  Pencil, 
  Trash2, 
  History, 
  ArrowLeftRight, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ShieldAlert,
  Info,
  X
} from 'lucide-react';
import { DatePicker } from '../components/DatePicker';
import { SkeletonTable } from '../components/Skeleton';

export const Students: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  const [dbScholarships, setDbScholarships] = useState<Scholarship[]>([]);
  const [dbSchools, setDbSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [transfers, setTransfers] = useState<StudentTransfer[]>([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form Fields
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

  // C2 Configurable Duplicate Detection States
  const [showRulesConfig, setShowRulesConfig] = useState(false);
  const [duplicateRules, setDuplicateRules] = useState<any>({
    name_dob: true,
    guardian_contact: true,
    aadhaar: false,
    school_roll: true,
    student_id: true
  });
  const [potentialDuplicates, setPotentialDuplicates] = useState<Student[]>([]);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideRemarks, setOverrideRemarks] = useState('');
  const [pendingCandidateData, setPendingCandidateData] = useState<any>(null);

  // C3 Timeline Viewer States
  const [selectedStudentForTimeline, setSelectedStudentForTimeline] = useState<Student | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<StudentTimelineEvent[]>([]);

  // C4 Transfer Workflow States
  const [selectedStudentForTransfer, setSelectedStudentForTransfer] = useState<Student | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferDestinationSchoolId, setTransferDestinationSchoolId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferRejectRequest, setTransferRejectRequest] = useState<StudentTransfer | null>(null);
  const [transferRejectReason, setTransferRejectReason] = useState('');

  // Load Data Helper
  const loadData = async () => {
    let localSchs = mockDb.getData<Scholarship>('scholarships');
    let localSchools = mockDb.getData<School>('schools');
    let localStudents = mockDb.getData<Student>('students');
    let localTransfers = mockDb.getData<StudentTransfer>('student_transfers');

    if (isSupabaseConfigured && supabase) {
      try {
        const [schsRes, sclsRes, stusRes, transRes] = await Promise.all([
          supabase.from('scholarships').select('*'),
          supabase.from('schools').select('*'),
          supabase.from('students').select('*').order('created_at', { ascending: false }),
          supabase.from('student_transfers').select('*')
        ]);
        if (schsRes.data) localSchs = schsRes.data;
        if (sclsRes.data) localSchools = sclsRes.data;
        if (stusRes.data) localStudents = stusRes.data;
        if (transRes.data) localTransfers = transRes.data;
      } catch (err) {
        console.error("Error fetching live student data:", err);
      }
    }

    setDbScholarships(localSchs);
    setDbSchools(localSchools);
    setStudents(localStudents);
    setTransfers(localTransfers);

    if (localSchs.length > 0 && !selectedSch) {
      setSelectedSch(localSchs[0].id);
    }

    // Default duplicate checking rules
    const rules = mockDb.getSetting('duplicate_rules', {
      name_dob: true,
      guardian_contact: true,
      aadhaar: false,
      school_roll: true,
      student_id: true
    });
    setDuplicateRules(rules);

    // Apply B2 restriction: Coordinator defaults to their school
    if (user && user.role === 'ScholarshipCoordinator') {
      setSelectedScl(user.school_id || '');
    } else if (localSchools.length > 0 && !selectedScl) {
      setSelectedScl(localSchools[0].id);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // WhatsApp contact sync
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

  // Duplicate Check implementation
  const checkDuplicates = (candidate: any) => {
    const list = students.filter(s => s.id !== (editingStudent?.id || ''));
    return list.filter(s => {
      if (duplicateRules.name_dob && s.name.toLowerCase() === candidate.name.toLowerCase() && s.dob === candidate.dob) return true;
      if (duplicateRules.guardian_contact && s.guardian_contact === candidate.guardian_contact) return true;
      if (duplicateRules.aadhaar && candidate.aadhaar_no && s.aadhaar_no === candidate.aadhaar_no) return true;
      if (duplicateRules.school_roll && s.school_id === candidate.school_id && s.school_roll_no === candidate.school_roll_no) return true;
      return false;
    });
  };

  const executeSave = async (candidateData: any, isOverride: boolean = false, overrideReasonText?: string) => {
    setIsSaving(true);
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
        mockDb.addStudentEvent(
          editingStudent.id, 
          'Registration Updated', 
          `Details modified${isOverride ? ` (Override: ${overrideReasonText})` : ''}`, 
          user?.name
        );
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

        // Timeline log
        mockDb.addStudentEvent(newStudent.id, 'Registration Created', 'Candidate enrolled', user?.name);
        if (photoUrl) {
          mockDb.addStudentEvent(newStudent.id, 'Photo Uploaded', 'Candidate photograph saved', user?.name);
        }
      }

      setShowAddForm(false);
      clearForm();
      loadData();
      alert("Candidate record processed successfully.");
    } catch (err: any) {
      alert("Failed to save candidate: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOrEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob || !selectedScl || isSaving) return;

    // B1: Check school suspension
    const targetSchool = dbSchools.find(s => s.id === selectedScl);
    if (targetSchool?.status === 'Suspended') {
      alert("Registration blocked: The selected school is currently Suspended. Registrations from this school cannot proceed.");
      setIsSaving(false);
      return;
    }

    // B2 Check if registration closes
    const activeSch = dbScholarships.find(s => s.id === selectedSch);
    const isRegistrationOpen = activeSch ? new Date(activeSch.registration_end) > new Date() : true;
    
    // Coordinators cannot register/edit after closure
    if (user && user.role === 'ScholarshipCoordinator' && !isRegistrationOpen) {
      alert("Registration closed: The registration period for this scholarship session has expired.");
      setIsSaving(false);
      return;
    }

    // Coordinators need specific permission
    if (user && user.role === 'ScholarshipCoordinator') {
      if (editingStudent && !user.permissions?.includes('edit_students')) {
        alert("Permission denied: You do not have permission to modify student records.");
        setIsSaving(false);
        return;
      }
      if (!editingStudent && !user.permissions?.includes('register_students')) {
        alert("Permission denied: You do not have permission to register new students.");
        setIsSaving(false);
        return;
      }
    }

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

    // C2 Duplicate Detection check
    const dups = checkDuplicates(candidateData);
    if (dups.length > 0) {
      setPotentialDuplicates(dups);
      setPendingCandidateData(candidateData);
      
      if (user && (user.role === 'SuperAdmin' || user.role === 'Admin')) {
        setShowOverrideDialog(true);
      } else {
        alert("Registration blocked: Potential duplicate candidates detected. Only administrators may override this warning.");
      }
      return;
    }

    executeSave(candidateData);
  };

  const handleStartEdit = (s: Student) => {
    // B2 Closure restriction
    const activeSch = dbScholarships.find(sch => sch.id === s.scholarship_id);
    const isRegistrationOpen = activeSch ? new Date(activeSch.registration_end) > new Date() : true;
    if (user && user.role === 'ScholarshipCoordinator' && !isRegistrationOpen) {
      alert("Registration closed: Editing student details is disabled as the registration period has closed.");
      return;
    }

    setEditingStudent(s);
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
      alert("Candidate deleted successfully.");
    } catch (err: any) {
      alert("Failed to delete candidate: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // C2 Update rules settings in local storage
  const handleSaveRules = () => {
    mockDb.setSetting('duplicate_rules', duplicateRules);
    setShowRulesConfig(false);
    alert("Duplicate check rules updated.");
  };

  // C3 Timeline logs loader
  const handleViewTimeline = (stu: Student) => {
    setSelectedStudentForTimeline(stu);
    const events = mockDb.getData<StudentTimelineEvent>('student_timeline')
      .filter(evt => evt.student_id === stu.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setTimelineEvents(events);
  };

  // C4 Student Transfer request submission
  const handleRequestTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForTransfer || !transferDestinationSchoolId) return;

    // Check if exam marks entry has started
    const sch = dbScholarships.find(s => s.id === selectedStudentForTransfer.scholarship_id);
    if (sch && ['MarksEntry', 'ResultsPublished', 'Completed'].includes(sch.status)) {
      alert("Transfer blocked: Cannot request student transfers after the examination phase has started.");
      return;
    }

    const requestData = {
      student_id: selectedStudentForTransfer.id,
      from_school_id: selectedStudentForTransfer.school_id,
      to_school_id: transferDestinationSchoolId,
      status: 'Pending Admin' as StudentTransfer['status'],
      requested_by: user?.name || 'Coordinator',
      rejection_reason: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      let insertedId = `trf-${Date.now()}`;
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('student_transfers').insert(requestData).select().single();
        if (error) throw error;
        if (data) insertedId = data.id;
      }

      mockDb.addRecord<StudentTransfer>('student_transfers', {
        id: insertedId,
        ...requestData
      });

      mockDb.addStudentEvent(
        selectedStudentForTransfer.id,
        'Transfer Requested',
        `Transfer requested from current school to destination by coordinator. Reason: ${transferReason}`,
        user?.name
      );

      alert("Transfer request submitted. Awaiting administrator approval.");
      setShowTransferDialog(false);
      setSelectedStudentForTransfer(null);
      setTransferReason('');
      loadData();
    } catch (err: any) {
      alert("Failed to submit transfer request: " + err.message);
    }
  };

  // C4 Approve/Reject actions for transfers (Admin)
  const handleAdminTransferAction = async (request: StudentTransfer, isApprove: boolean) => {
    let newStatus: StudentTransfer['status'] = isApprove ? 'Pending Destination' : 'Rejected';
    const remarks = isApprove ? 'Approved by Administrator' : transferRejectReason;

    const updates = {
      status: newStatus,
      approved_by: user?.name || 'Admin',
      rejection_reason: !isApprove ? transferRejectReason : '',
      updated_at: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('student_transfers').update(updates).eq('id', request.id);
        if (error) throw error;
      }

      mockDb.updateRecord<StudentTransfer>('student_transfers', request.id, updates);
      
      // Update student timeline
      mockDb.addStudentEvent(
        request.student_id,
        isApprove ? 'Transfer Approved' : 'Transfer Request Rejected',
        remarks,
        user?.name
      );

      alert(`Transfer request ${newStatus.toLowerCase()}.`);
      setTransferRejectRequest(null);
      setTransferRejectReason('');
      loadData();
    } catch (e: any) {
      alert("Failed to update transfer: " + e.message);
    }
  };

  // C4 Destination Confirm/Reject actions
  const handleDestinationTransferConfirm = async (request: StudentTransfer, isConfirm: boolean) => {
    let newStatus: StudentTransfer['status'] = isConfirm ? 'Completed' : 'Rejected';
    const remarks = isConfirm ? 'Destination School Confirmed & Completed' : 'Destination School Rejected Transfer';

    const updates = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    try {
      if (isConfirm) {
        // Complete transfer: Update school_id of student in database
        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase.from('students').update({ school_id: request.to_school_id }).eq('id', request.student_id);
          if (error) throw error;
        }
        mockDb.updateRecord<Student>('students', request.student_id, { school_id: request.to_school_id });
      }

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('student_transfers').update(updates).eq('id', request.id);
        if (error) throw error;
      }

      mockDb.updateRecord<StudentTransfer>('student_transfers', request.id, updates);
      
      const fromSchName = dbSchools.find(s => s.id === request.from_school_id)?.name || 'Previous School';
      const toSchName = dbSchools.find(s => s.id === request.to_school_id)?.name || 'New School';

      // Update student timeline
      mockDb.addStudentEvent(
        request.student_id,
        isConfirm ? 'Transfer Completed' : 'Transfer Rejected by Destination',
        isConfirm ? `Transferred from ${fromSchName} to ${toSchName}. Student ID and Roll number preserved.` : remarks,
        user?.name
      );

      alert(`Transfer request ${newStatus.toLowerCase()}.`);
      loadData();
    } catch (e: any) {
      alert("Failed to confirm transfer: " + e.message);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Coordinator view restriction
      if (user && user.role === 'ScholarshipCoordinator' && s.school_id !== user.school_id) {
        return false;
      }

      const matchesSearch = (s.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
                            s.student_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
                            (s.form_number && s.form_number.toLowerCase().includes(filterQuery.toLowerCase())));
      const matchesSchool = (schoolFilter === '' || s.school_id === schoolFilter);
      return matchesSearch && matchesSchool;
    });
  }, [students, filterQuery, schoolFilter, user]);

  // Pending transfers filtering
  const pendingAdminTransfers = useMemo(() => {
    return transfers.filter(t => t.status === 'Pending Admin');
  }, [transfers]);

  const pendingDestinationTransfers = useMemo(() => {
    return transfers.filter(t => t.status === 'Pending Destination' && (user?.role === 'SuperAdmin' || user?.role === 'Admin' || t.to_school_id === user?.school_id));
  }, [transfers, user]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <UserSquare2 className="w-6 h-6 mr-2 text-blue-600" />
            Registered Candidates
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Manage and enroll candidates matching the computer scholarship application forms.</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {user && (user.role === 'SuperAdmin' || user.role === 'Admin') && (
            <button
              onClick={() => setShowRulesConfig(true)}
              className="flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2.5 rounded-xl cursor-pointer shadow-sm"
            >
              <ShieldAlert className="w-4 h-4 mr-1.5 text-slate-400" />
              Duplicate Settings
            </button>
          )}

          {/* Render Enroll button only if Coordinator has permission or user is Admin */}
          {(user?.role === 'SuperAdmin' || user?.role === 'Admin' || user?.permissions?.includes('register_students')) && (
            <button
              onClick={() => {
                if (showAddForm) {
                  clearForm();
                }
                setShowAddForm(!showAddForm);
              }}
              className="flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              {showAddForm ? 'Cancel' : 'Enroll Student'}
            </button>
          )}
        </div>
      </div>

      {/* C4 TRANSFER WORKFLOW ALERTS / ACTION LISTS */}
      {/* 1. Admin Pending Action list */}
      {user && (user.role === 'SuperAdmin' || user.role === 'Admin') && pendingAdminTransfers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 text-amber-800 font-extrabold text-sm uppercase tracking-wider">
            <ArrowLeftRight className="w-5 h-5 text-amber-600" />
            <span>Awaiting Admin Transfer Approvals ({pendingAdminTransfers.length})</span>
          </div>
          <div className="divide-y divide-amber-100/50">
            {pendingAdminTransfers.map(tr => {
              const studentName = students.find(s => s.id === tr.student_id)?.name || 'Unknown Candidate';
              const fromSch = dbSchools.find(s => s.id === tr.from_school_id)?.name || 'Source School';
              const toSch = dbSchools.find(s => s.id === tr.to_school_id)?.name || 'Destination School';
              return (
                <div key={tr.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">{studentName}</span>
                    <p className="text-slate-500 mt-1">
                      From: <strong>{fromSch}</strong> → To: <strong>{toSch}</strong> | Requested by: {tr.requested_by}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAdminTransferAction(tr, true)}
                      className="bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setTransferRejectRequest(tr)}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Destination Coordinator Action list */}
      {pendingDestinationTransfers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 text-blue-800 font-extrabold text-sm uppercase tracking-wider">
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            <span>Incoming School Transfers awaiting destination confirmation ({pendingDestinationTransfers.length})</span>
          </div>
          <div className="divide-y divide-blue-100">
            {pendingDestinationTransfers.map(tr => {
              const studentName = students.find(s => s.id === tr.student_id)?.name || 'Unknown Candidate';
              const fromSch = dbSchools.find(s => s.id === tr.from_school_id)?.name || 'Source School';
              const toSch = dbSchools.find(s => s.id === tr.to_school_id)?.name || 'Destination School';
              const isCoordinator = user?.role === 'ScholarshipCoordinator' && tr.to_school_id === user.school_id;
              const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin';
              
              return (
                <div key={tr.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">{studentName}</span>
                    <p className="text-slate-500 mt-1">
                      Moving from: <strong>{fromSch}</strong> to your school: <strong>{toSch}</strong>
                    </p>
                  </div>
                  {(isCoordinator || isAdmin) && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDestinationTransferConfirm(tr, true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        Confirm Transfer
                      </button>
                      <button
                        onClick={() => handleDestinationTransferConfirm(tr, false)}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Student Enrollment Form */}
      {showAddForm && (
        <form onSubmit={handleAddOrEdit} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6 max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              {editingStudent ? 'Edit Candidate Details' : 'Computer Scholarship Application Form 2026'}
            </h3>
            
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 bg-slate-50 mt-3 md:mt-0">
              <span className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 border-r border-slate-200">Form No.: ICST/SE/</span>
              <input
                type="text"
                placeholder="e.g. 10"
                value={formNoSuffix}
                onChange={(e) => setFormNoSuffix(e.target.value.replace(/\D/g, ''))}
                className="w-20 px-2 py-2 text-sm bg-white font-black text-center focus:outline-none text-slate-800"
                required
              />
            </div>
          </div>

          {/* 1. Basic Details & Photo Upload */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Basic Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
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
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Date of Birth <span className="text-red-500">*</span></label>
                  <DatePicker value={dob} onChange={(val) => setDob(val)} required />
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100/50 transition-colors order-1 md:order-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-3 text-center">Student Photograph</label>
                <div className="w-[140px] h-[180px] border border-slate-300 rounded-lg bg-white overflow-hidden shadow-sm flex flex-col items-center justify-center relative group">
                  {photoUrl ? (
                    <>
                      <img src={photoUrl} alt="Student passport preview" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-md flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-normal">Paste photo</span>
                      <span className="text-[9px] text-slate-300 mt-1 uppercase font-bold">3.5 x 4.5 Ratio</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-col items-center space-y-1.5 w-full">
                  <input type="file" accept="image/*" id="student-photo-file" onChange={handleFileChange} className="hidden" />
                  <label htmlFor="student-photo-file" className="w-full text-center text-base sm:text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-4 py-2.5 rounded-xl cursor-pointer transition-colors shadow-sm">
                    {photoUrl ? 'Change Image' : 'Upload Image'}
                  </label>
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
                    placeholder="Enter PIN code to load"
                    value={postOffice}
                    onChange={(e) => setPostOffice(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg focus:ring-1 focus:ring-blue-500"
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
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">District <span className="text-red-500">*</span></label>
                <input type="text" placeholder="District" value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full border border-slate-200 p-2.5 bg-slate-50 focus:outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">State <span className="text-red-500">*</span></label>
                <input type="text" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} className="w-full border border-slate-200 p-2.5 bg-slate-50 focus:outline-none" required />
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
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg font-mono disabled:bg-slate-100 disabled:opacity-75 focus:outline-none"
                />
                <div className="flex items-center space-x-2.5 mt-3.5">
                  <input
                    type="checkbox"
                    id="same-contact"
                    checked={isSameContact}
                    onChange={(e) => {
                      setIsSameContact(e.target.checked);
                      if (e.target.checked) setWhatsappNo(guardianContact);
                    }}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="same-contact" className="text-xs font-semibold text-slate-500 cursor-pointer select-none">
                    Same as contact number
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Educational Details */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Educational Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Scholarship Session</label>
                <select
                  value={selectedSch}
                  onChange={(e) => setSelectedSch(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg bg-white"
                >
                  {dbScholarships.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">School Name <span className="text-red-500">*</span></label>
                {user && user.role === 'ScholarshipCoordinator' ? (
                  <div className="w-full border border-slate-200 p-2.5 bg-slate-100 rounded-lg text-sm text-slate-600 font-bold">
                    {dbSchools.find(sch => sch.id === user.school_id)?.name || 'Assigned School'}
                  </div>
                ) : (
                  <select
                    value={selectedScl}
                    onChange={(e) => setSelectedScl(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 text-base sm:text-sm rounded-lg bg-white"
                    required
                  >
                    <option value="">-- Select School --</option>
                    {dbSchools.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.status === 'Suspended' ? '[SUSPENDED]' : s.status === 'Pending Review' ? '[PENDING]' : ''}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Class</label>
                <input type="text" value="X" disabled className="w-full border border-slate-200 p-2.5 bg-slate-100 text-slate-600 font-extrabold text-center" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Section <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Section" value={section} onChange={(e) => setSection(e.target.value)} className="w-full border border-slate-200 p-2.5 text-center font-bold" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Roll No. <span className="text-red-500">*</span></label>
                <input type="text" placeholder="School Roll" value={schoolRoll} onChange={(e) => setSchoolRoll(e.target.value)} className="w-full border border-slate-200 p-2.5 text-center font-bold" required />
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
              className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-base sm:text-sm py-2 px-5 rounded-xl disabled:opacity-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="text-white bg-blue-600 hover:bg-blue-500 text-base sm:text-sm py-2 px-5 rounded-xl font-semibold flex items-center justify-center disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {isSaving ? 'Processing...' : (editingStudent ? 'Save Changes' : 'Enroll Candidate')}
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
            
            {user?.role !== 'ScholarshipCoordinator' && (
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
            )}
          </div>
          <span className="text-xs font-semibold text-slate-400">Total Enrollment: {filteredStudents.length} candidates</span>
        </div>

        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} cols={7} />
          </div>
        ) : filteredStudents.length > 0 ? (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">ID / Form No.</th>
                <th className="p-4 font-semibold text-slate-600">Student Name</th>
                <th className="p-4 font-semibold text-slate-600">School</th>
                <th className="p-4 font-semibold text-slate-600">Class & Roll</th>
                <th className="p-4 font-semibold text-slate-600">Guardian Contact</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Workflow</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(s => {
                const school = dbSchools.find(sch => sch.id === s.school_id);
                // Allow edit only if registration closes in future OR Admin role
                const activeSch = dbScholarships.find(sch => sch.id === s.scholarship_id);
                const isRegOpen = activeSch ? new Date(activeSch.registration_end) > new Date() : true;
                const canEdit = user?.role === 'SuperAdmin' || user?.role === 'Admin' || (user?.permissions?.includes('edit_students') && isRegOpen);

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
                          <div className="text-[10px] text-slate-400 capitalize">DOB: {s.dob} | {s.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">{school?.name || 'N/A'}</td>
                    <td className="p-4 font-medium text-slate-600">
                      <div>Class {s.class}</div>
                      <div className="text-[11px] text-slate-400">Sec {s.section} | Roll #{s.school_roll_no}</div>
                    </td>
                    <td className="p-4 text-slate-500 text-xs font-semibold">
                      <div>{s.guardian_contact}</div>
                      {s.whatsapp_no && <div className="text-slate-400 text-[10px] mt-0.5">WA: {s.whatsapp_no}</div>}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleViewTimeline(s)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border text-[11px] font-bold text-slate-700 rounded-lg flex items-center"
                          title="View student timeline"
                        >
                          <History className="w-3.5 h-3.5 mr-1 text-slate-500" /> Timeline
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudentForTransfer(s);
                            setTransferDestinationSchoolId('');
                            setShowTransferDialog(true);
                          }}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-[11px] font-bold text-blue-700 rounded-lg flex items-center"
                          title="Request Transfer between schools"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 mr-1" /> Transfer
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end space-x-1.5">
                        {canEdit && (
                          <button
                            onClick={() => handleStartEdit(s)}
                            disabled={isSaving || deletingId !== null}
                            title="Edit Candidate Details"
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 border border-slate-200 cursor-pointer shadow-sm"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {user && (user.role === 'SuperAdmin' || user.role === 'Admin') && (
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={deletingId !== null}
                            title="Delete Candidate"
                            className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 border border-red-100 cursor-pointer shadow-sm"
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
        ) : (
          <div className="p-12 text-center text-slate-400">
            No registered students found matching search filters.
          </div>
        )}
      </div>

      {/* C2 CONFIGURE RULES MODAL (Admin Only) */}
      {showRulesConfig && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative space-y-4">
            <button onClick={() => setShowRulesConfig(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <ShieldAlert className="w-5 h-5 mr-2 text-blue-600" /> Configure Duplicate Check Rules
            </h3>
            <p className="text-xs text-slate-400">
              Check/uncheck rules to customise duplicate detection checks for candidate enrollments.
            </p>

            <div className="space-y-3.5 text-sm font-semibold text-slate-600">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={duplicateRules.name_dob}
                  onChange={(e) => setDuplicateRules({ ...duplicateRules, name_dob: e.target.checked })}
                  className="mr-2 rounded border-slate-300 text-blue-600"
                />
                Student Name + Date of Birth
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={duplicateRules.guardian_contact}
                  onChange={(e) => setDuplicateRules({ ...duplicateRules, guardian_contact: e.target.checked })}
                  className="mr-2 rounded border-slate-300 text-blue-600"
                />
                Guardian Contact Number
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={duplicateRules.aadhaar}
                  onChange={(e) => setDuplicateRules({ ...duplicateRules, aadhaar: e.target.checked })}
                  className="mr-2 rounded border-slate-300 text-blue-600"
                />
                Aadhaar Number (Optional field matching)
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={duplicateRules.school_roll}
                  onChange={(e) => setDuplicateRules({ ...duplicateRules, school_roll: e.target.checked })}
                  className="mr-2 rounded border-slate-300 text-blue-600"
                />
                School Roll Number (within same school)
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowRulesConfig(false)}
                className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-xs px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRules}
                className="text-white bg-blue-600 hover:bg-blue-500 text-xs px-4 py-2.5 rounded-xl font-bold shadow-md cursor-pointer"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C2 OVERRIDE WARNING DIALOG */}
      {showOverrideDialog && pendingCandidateData && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-slate-800 text-red-600 flex items-center mb-2">
              <ShieldAlert className="w-5 h-5 mr-2" /> Duplicate Warning Override
            </h3>
            <p className="text-slate-500 text-xs mb-4">
              The following duplicate matching profiles were detected. Administrators must provide an audit log remark to override.
            </p>

            <div className="bg-red-50/50 border border-red-100 rounded-xl p-3 max-h-[150px] overflow-y-auto space-y-2 mb-4">
              {potentialDuplicates.map(dup => (
                <div key={dup.id} className="text-xs text-slate-700">
                  • <strong>{dup.name}</strong> | DOB: {dup.dob} | Guardian Contact: {dup.guardian_contact} | ID: {dup.student_id} (School: {dbSchools.find(s=>s.id===dup.school_id)?.name})
                </div>
              ))}
            </div>

            <textarea
              placeholder="Provide a reason for overriding this duplicate warning..."
              value={overrideRemarks}
              onChange={(e) => setOverrideRemarks(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px] mb-4 font-medium text-slate-800"
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowOverrideDialog(false);
                  setPendingCandidateData(null);
                  setOverrideRemarks('');
                }}
                className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-xs px-4 py-2 rounded-xl"
              >
                Cancel Registration
              </button>
              <button
                onClick={() => {
                  if (!overrideRemarks.trim()) {
                    alert("Override reason comments are mandatory.");
                    return;
                  }
                  setShowOverrideDialog(false);
                  executeSave(pendingCandidateData, true, overrideRemarks);
                  setOverrideRemarks('');
                }}
                className="text-white bg-red-600 hover:bg-red-500 text-xs px-4 py-2.5 rounded-xl font-bold shadow-md cursor-pointer"
              >
                Approve & Enroll anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C3 STUDENT TIMELINE VIEW MODAL */}
      {selectedStudentForTimeline && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full shadow-2xl p-6 relative flex flex-col max-h-[85vh]">
            <button onClick={() => setSelectedStudentForTimeline(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
              <History className="w-5 h-5 mr-2 text-blue-600" /> Student Profile & Timeline
            </h3>
            <span className="text-xs text-slate-400 font-semibold mb-4">Chronological history log tracking status and milestones.</span>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 overflow-hidden">
              {/* Profile Details Panel (2 Cols) */}
              <div className="md:col-span-2 space-y-4 bg-slate-50 p-4 border rounded-xl overflow-y-auto text-xs">
                <div className="flex flex-col items-center border-b pb-4 mb-3">
                  {selectedStudentForTimeline.photo_url ? (
                    <img src={selectedStudentForTimeline.photo_url} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-white shadow shadow-blue-500/20" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 font-black text-2xl flex items-center justify-center shadow">
                      {selectedStudentForTimeline.name.charAt(0)}
                    </div>
                  )}
                  <h4 className="font-extrabold text-slate-800 text-sm mt-3">{selectedStudentForTimeline.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono font-bold mt-1 bg-slate-100 border px-2 py-0.5 rounded-full">{selectedStudentForTimeline.student_id}</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">School</span>
                    <p className="font-bold text-slate-800">{dbSchools.find(sch => sch.id === selectedStudentForTimeline.school_id)?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">DOB / Gender</span>
                    <p className="font-semibold text-slate-700">{selectedStudentForTimeline.dob} ({selectedStudentForTimeline.gender})</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Guardian Details</span>
                    <p className="font-semibold text-slate-700">{selectedStudentForTimeline.guardian_name} | Contact: {selectedStudentForTimeline.guardian_contact}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Class-wise Details</span>
                    <p className="font-semibold text-slate-700">Class {selectedStudentForTimeline.class} | Section {selectedStudentForTimeline.section} | Roll {selectedStudentForTimeline.school_roll_no}</p>
                  </div>
                  {selectedStudentForTimeline.aadhaar_no && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Aadhaar Card No.</span>
                      <p className="font-mono font-semibold text-slate-700">{selectedStudentForTimeline.aadhaar_no}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Permanent Address</span>
                    <p className="font-semibold text-slate-600 leading-relaxed text-[11px]">{selectedStudentForTimeline.address}</p>
                  </div>
                </div>
              </div>

              {/* Timeline list Panel (3 Cols) */}
              <div className="md:col-span-3 border-l-2 border-slate-100 pl-6 space-y-6 overflow-y-auto pr-1">
                {timelineEvents.length > 0 ? (
                  timelineEvents.map((evt, index) => (
                    <div key={evt.id} className="relative pl-6">
                      <span className="absolute left-[-29px] top-1.5 w-3 h-3 rounded-full border-2 border-white bg-blue-600" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{evt.action}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{new Date(evt.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{evt.remarks}</p>
                      <div className="text-[9px] text-slate-400 mt-0.5">Logged by user: {evt.user_name}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 text-center py-12 flex flex-col items-center justify-center">
                    <Info className="w-8 h-8 text-slate-300 mb-2" />
                    <span>No chronological events logged.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* C4 TRANSFER REQUEST MODAL */}
      {showTransferDialog && selectedStudentForTransfer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative">
            <button 
              onClick={() => {
                setShowTransferDialog(false);
                setSelectedStudentForTransfer(null);
                setTransferReason('');
              }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 flex items-center mb-1">
              <ArrowLeftRight className="w-5 h-5 mr-2 text-blue-600" /> Request Student Transfer
            </h3>
            <span className="text-xs text-slate-400 font-semibold">Initiating transfer for: <strong>{selectedStudentForTransfer.name}</strong></span>

            <form onSubmit={handleRequestTransferSubmit} className="space-y-4 mt-4">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Current School</span>
                <div className="p-2.5 bg-slate-50 border rounded-lg text-xs font-semibold text-slate-600">
                  {dbSchools.find(s => s.id === selectedStudentForTransfer.school_id)?.name}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Select Destination School</label>
                <select
                  value={transferDestinationSchoolId}
                  onChange={(e) => setTransferDestinationSchoolId(e.target.value)}
                  className="w-full border p-2.5 text-xs rounded-lg bg-white"
                  required
                >
                  <option value="">-- Choose School --</option>
                  {dbSchools.filter(s => s.id !== selectedStudentForTransfer.school_id && s.status === 'Approved').map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.school_id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Reason for Transfer</label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Candidate relocated, school enrollment update requested."
                  className="w-full border rounded-lg p-2.5 text-xs focus:outline-none min-h-[80px]"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferDialog(false);
                    setSelectedStudentForTransfer(null);
                    setTransferReason('');
                  }}
                  className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-xs px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-white bg-blue-600 hover:bg-blue-500 text-xs px-4 py-2.5 rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C4 TRANSFER REJECTION COMMENT MODAL */}
      {transferRejectRequest && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl p-6 relative">
            <button onClick={() => setTransferRejectRequest(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 text-red-600 mb-2">Reject Transfer Request</h3>
            <p className="text-slate-500 text-xs mb-3">Provide a comment explaining why this transfer request is rejected.</p>
            <textarea
              value={transferRejectReason}
              onChange={(e) => setTransferRejectReason(e.target.value)}
              placeholder="e.g. Rejecting due to incomplete academic session parameters."
              className="w-full border rounded-lg p-2 text-xs focus:outline-none min-h-[80px] mb-4"
              required
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setTransferRejectRequest(null)}
                className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-xs px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!transferRejectReason.trim()) {
                    alert("A reason comment is required.");
                    return;
                  }
                  handleAdminTransferAction(transferRejectRequest, false);
                }}
                className="text-white bg-red-600 hover:bg-red-500 text-xs px-4 py-2 rounded-xl font-bold cursor-pointer shadow-md"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
