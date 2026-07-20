import React, { useState, useEffect } from 'react';
import { mockDb, Student, School, Scholarship, AdmitCard } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Printer, QrCode, RefreshCw, Sparkles, Building, Phone, MapPin, User, FileText } from 'lucide-react';
import { DatePicker } from '../components/DatePicker';
import { ImageUpload } from '../components/ImageUpload';

export const SpecialReg: React.FC = () => {
  const { user } = useAuth();
  
  // Data loading states
  const [schools, setSchools] = useState<School[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [activeSch, setActiveSch] = useState<Scholarship | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form Fields
  const [name, setName] = useState('');
  const [father, setFather] = useState('');
  const [mother, setMother] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [classLevel, setClassLevel] = useState('Class X');
  const [section, setSection] = useState('SP');
  const [schoolRoll, setSchoolRoll] = useState('SP');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [address, setAddress] = useState('Exam Day Special Registration');

  const [registeredCard, setRegisteredCard] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Fetch active scholarships & schools on mount
  useEffect(() => {
    const loadSessionAndSchools = async () => {
      setIsLoading(true);
      setError('');
      if (isSupabaseConfigured && supabase) {
        try {
          // Fetch scholarships in stages that are active for registration/exam
          const { data: schData } = await supabase
            .from('scholarships')
            .select('*')
            .in('status', ['Active', 'AdmitCardsGenerated', 'MarksEntry']);
          
          const { data: sclData } = await supabase
            .from('schools')
            .select('*')
            .order('name', { ascending: true });

          if (schData && schData.length > 0) {
            setScholarships(schData);
            // Default to first active session
            setActiveSch(schData[0]);
          }
          if (sclData) {
            setSchools(sclData);
            if (sclData.length > 0) {
              setSelectedSchoolId(sclData[0].id);
            }
          }
        } catch (err: any) {
          console.error("Error loading session and schools from Supabase:", err);
          setError("Failed to sync with Supabase server. Please try again.");
        }
      } else {
        // Mock Db Fallback
        const localSchs = mockDb.getData<Scholarship>('scholarships').filter(
          s => s.status === 'Active' || s.status === 'AdmitCardsGenerated' || s.status === 'MarksEntry'
        );
        const localScls = mockDb.getData<School>('schools');
        
        if (localSchs.length > 0) {
          setScholarships(localSchs);
          setActiveSch(localSchs[0]);
        }
        setSchools(localScls);
        if (localScls.length > 0) {
          setSelectedSchoolId(localScls[0].id);
        }
      }
      setIsLoading(false);
    };

    loadSessionAndSchools();
  }, []);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const draftJson = localStorage.getItem('isms_special_registration_draft');
      if (draftJson) {
        const draft = JSON.parse(draftJson);
        if (draft.name) setName(draft.name);
        if (draft.father) setFather(draft.father);
        if (draft.mother) setMother(draft.mother);
        if (draft.dob) setDob(draft.dob);
        if (draft.gender) setGender(draft.gender);
        if (draft.classLevel) setClassLevel(draft.classLevel);
        if (draft.section) setSection(draft.section);
        if (draft.schoolRoll) setSchoolRoll(draft.schoolRoll);
        if (draft.selectedSchoolId) setSelectedSchoolId(draft.selectedSchoolId);
        if (draft.guardianContact) setGuardianContact(draft.guardianContact);
        if (draft.address) setAddress(draft.address);
        if (draft.photoUrl) setPhotoUrl(draft.photoUrl);
      }
    } catch (e) {
      console.error("Failed to load special registration draft:", e);
    }
  }, []);

  // Save draft on changes
  useEffect(() => {
    const draft = {
      name, father, mother, dob, gender, classLevel, section, schoolRoll,
      selectedSchoolId, guardianContact, address, photoUrl
    };
    if (name || father || guardianContact || photoUrl) {
      localStorage.setItem('isms_special_registration_draft', JSON.stringify(draft));
    }
  }, [
    name, father, mother, dob, gender, classLevel, section, schoolRoll,
    selectedSchoolId, guardianContact, address, photoUrl
  ]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!activeSch) {
      setError('No active scholarship session currently accepting registrations.');
      setIsSubmitting(false);
      return;
    }

    if (!name.trim() || !dob || !selectedSchoolId || !guardianContact.trim()) {
      setError('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    // Find selected school metadata
    const school = schools.find(s => s.id === selectedSchoolId);

    // 1. Roll Number generation logic:
    // 8 Digits: YY + 9 (Special District Code) + sequence (4 digits)
    let totalCardsCount = 0;
    if (isSupabaseConfigured && supabase) {
      try {
        const { count, error: countErr } = await supabase
          .from('admit_cards')
          .select('*', { count: 'exact', head: true });
        if (!countErr) totalCardsCount = count || 0;
      } catch (err) {
        console.error("Error counting existing cards:", err);
      }
    } else {
      totalCardsCount = mockDb.getData<AdmitCard>('admit_cards').length;
    }

    const rollSequence = String(totalCardsCount + 1).padStart(4, '0');
    const generatedRoll = `${String(activeSch.academic_year).substring(2, 4)}9${rollSequence}`;

    // 2. Prepare payload
    const studentData = {
      scholarship_id: activeSch.id,
      school_id: selectedSchoolId,
      name: name.trim(),
      father_name: father.trim() || null,
      mother_name: mother.trim() || null,
      dob,
      gender,
      class: classLevel,
      section: section.trim() || 'SP',
      school_roll_no: schoolRoll.trim() || 'SP',
      guardian_contact: guardianContact.trim(),
      address: address.trim() || 'Exam Day Special Registration',
      is_special_registration: true,
      student_id: `STU-SP-${Date.now().toString().slice(-6)}`,
      photo_url: photoUrl
    };

    let insertedStudentId = `stu-sp-${Date.now()}`;
    let insertedAdmitCardId = `card-sp-${Date.now()}`;
    let actualNewCard: any = null;
    let actualNewStudent: any = null;

    if (isSupabaseConfigured && supabase) {
      try {
        // Insert student
        const { data: studentResult, error: studentError } = await supabase
          .from('students')
          .insert(studentData)
          .select()
          .single();
        if (studentError) throw studentError;
        if (studentResult) {
          insertedStudentId = studentResult.id;
          actualNewStudent = studentResult;
        }

        // Prepare Card payload
        const cardData = {
          student_id: insertedStudentId,
          roll_number: generatedRoll,
          exam_date: new Date().toISOString().split('T')[0], // scheduled today
          reporting_time: '09:30 AM',
          exam_time: '10:30 AM - 12:30 PM',
          venue: school?.name || 'Main Exam Center',
          instructions: '1. This is an Emergency Admit Card issued on Exam Day.\n2. Verify registration ID at marks entry desks.\n3. Calculator and digital wear prohibited.',
          qr_code_payload: `https://isms.icstconnect.in/verify/${generatedRoll}`,
          signature_url: ''
        };

        // Insert admit card
        const { data: cardResult, error: cardError } = await supabase
          .from('admit_cards')
          .insert(cardData)
          .select()
          .single();
        if (cardError) throw cardError;
        if (cardResult) {
          insertedAdmitCardId = cardResult.id;
          actualNewCard = cardResult;
        }

        // Trigger attendance as Present automatically
        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert({
            student_id: insertedStudentId,
            status: 'Present',
            recorded_by: user?.id || null
          });
        if (attendanceError) throw attendanceError;
      } catch (err: any) {
        setError('Failed to complete registration: ' + err.message);
        setIsSubmitting(false);
        return;
      }
    }

    // Save to mockDb as fallback or local cache
    const finalStudent = mockDb.addRecord<Student>('students', {
      id: insertedStudentId,
      ...studentData
    });
    
    const finalCard = mockDb.addRecord<AdmitCard>('admit_cards', {
      id: insertedAdmitCardId,
      student_id: insertedStudentId,
      roll_number: generatedRoll,
      exam_date: new Date().toISOString().split('T')[0],
      reporting_time: '09:30 AM',
      exam_time: '10:30 AM - 12:30 PM',
      venue: school?.name || 'Main Exam Center',
      instructions: '1. This is an Emergency Admit Card issued on Exam Day.\n2. Verify registration ID at marks entry desks.\n3. Calculator and digital wear prohibited.',
      qr_code_payload: `https://isms.icstconnect.in/verify/${generatedRoll}`,
      signature_url: ''
    });

    mockDb.addRecord<any>('attendance', {
      student_id: insertedStudentId,
      status: 'Present',
      recorded_by: user?.id || 'usr-5'
    });

    setRegisteredCard({
      student: actualNewStudent || finalStudent,
      card: actualNewCard || finalCard,
      school
    });
    setIsSubmitting(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetForm = () => {
    setName('');
    setFather('');
    setMother('');
    setDob('');
    setGender('Male');
    setClassLevel('Class X');
    setSection('SP');
    setSchoolRoll('SP');
    setGuardianContact('');
    setAddress('Exam Day Special Registration');
    setPhotoUrl(null);
    setRegisteredCard(null);
    try {
      localStorage.removeItem('isms_special_registration_draft');
    } catch (e) {}
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="no-print">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <UserCheck className="w-6 h-6 mr-2 text-blue-600 animate-pulse" />
          Special Student Registration
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Emergency candidate registration on examination day. Generates admit card instantly.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20 no-print">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mr-3" />
          <span className="text-sm font-semibold text-slate-500">Checking Active Scholarship Cycles...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Side Registration form (Hidden in print) */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 no-print">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
              Exam Day Registration
            </h3>
            
            {activeSch ? (
              <div className="text-xs font-semibold text-green-700 bg-green-50/50 p-3 rounded-xl border border-green-200/50 flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping mr-1"></span>
                <span>Active Exam Session: <strong>{activeSch.name}</strong></span>
              </div>
            ) : (
              <div className="text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                No active scholarship session open for exam day registration. Please configure an active session in the Scholarships dashboard first.
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase flex items-center">
                  <Building className="w-3.5 h-3.5 mr-1" /> Enrolled School <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  disabled={!activeSch}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {schools.length > 0 ? (
                    schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.school_id})</option>
                    ))
                  ) : (
                    <option>No Registered Schools Found</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase flex items-center">
                    <User className="w-3.5 h-3.5 mr-1" /> Student Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Das"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!activeSch}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Date of Birth <span className="text-red-500">*</span></label>
                  <DatePicker
                    value={dob}
                    onChange={(val) => setDob(val)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Gender <span className="text-red-500">*</span></label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    disabled={!activeSch}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Class Level <span className="text-red-500">*</span></label>
                  <select
                    value={classLevel}
                    onChange={(e) => setClassLevel(e.target.value)}
                    disabled={!activeSch}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Class V">Class V</option>
                    <option value="Class VI">Class VI</option>
                    <option value="Class VII">Class VII</option>
                    <option value="Class VIII">Class VIII</option>
                    <option value="Class IX">Class IX</option>
                    <option value="Class X">Class X</option>
                    <option value="Class XI">Class XI</option>
                    <option value="Class XII">Class XII</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Section / Stream <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. A, Science, SP"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    disabled={!activeSch}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">School Roll No <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. 24"
                    value={schoolRoll}
                    onChange={(e) => setSchoolRoll(e.target.value)}
                    disabled={!activeSch}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Father's Name</label>
                  <input
                    type="text"
                    placeholder="Father's Name"
                    value={father}
                    onChange={(e) => setFather(e.target.value)}
                    disabled={!activeSch}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Mother's Name</label>
                  <input
                    type="text"
                    placeholder="Mother's Name"
                    value={mother}
                    onChange={(e) => setMother(e.target.value)}
                    disabled={!activeSch}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-1" /> Guardian Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="10 digit number"
                  value={guardianContact}
                  onChange={(e) => setGuardianContact(e.target.value)}
                  disabled={!activeSch}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1" /> Residential Address
                </label>
                <textarea
                  placeholder="Full address details..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={!activeSch}
                />
              </div>

              <div>
                <ImageUpload 
                  photoUrl={photoUrl} 
                  onPhotoChange={setPhotoUrl} 
                  label="Student Photograph" 
                />
              </div>

              {error && (
                <div className="text-red-500 text-xs font-semibold">{error}</div>
              )}

              <button
                type="submit"
                disabled={!activeSch || isSubmitting}
                className="w-full text-white bg-blue-600 hover:bg-blue-500 text-sm font-semibold py-2.5 rounded-xl shadow cursor-pointer disabled:opacity-50 transition-colors flex justify-center items-center"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating Admit Card...
                  </>
                ) : (
                  'Generate Admit Card Instantly'
                )}
              </button>
            </form>
          </div>

          {/* Right Side Admit Card layout preview (Visible in print too) */}
          {registeredCard ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 no-print bg-slate-100 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold">Success! Admit Card Generated.</span>
                <div className="flex space-x-2 self-end sm:self-auto">
                  <button
                    onClick={handleResetForm}
                    className="flex items-center text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    Reset Form
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg cursor-pointer shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    Print Admit Card
                  </button>
                </div>
              </div>

              {/* Print Admit Card Structure */}
              <div className="bg-white border-2 border-slate-800 p-6 rounded-lg text-slate-800 shadow-md relative print:shadow-none print:border-slate-800 max-w-lg mx-auto font-sans">
                <div className="text-center pb-3 border-b-2 border-slate-800">
                  <h4 className="font-extrabold text-sm uppercase tracking-wider">ICST Scholarship Committee</h4>
                  <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-0.5">ADMIT CARD</div>
                </div>

                <div className="flex justify-between items-start my-4">
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px]">Roll Number</span>{' '}
                      <span className="font-black text-slate-900 font-mono text-base">{registeredCard.card.roll_number}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px]">Student Name</span>{' '}
                      <span className="font-extrabold text-slate-900">{registeredCard.student.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px]">Class & Section</span>{' '}
                        <span className="font-semibold text-slate-700">{registeredCard.student.class} ({registeredCard.student.section})</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px]">School Roll No</span>{' '}
                        <span className="font-semibold text-slate-700">{registeredCard.student.school_roll_no}</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px]">School Name</span>{' '}
                      <span className="font-semibold text-slate-700 break-words">{registeredCard.school?.name}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-wider block text-[9px]">Date of Birth</span>{' '}
                      <span className="font-semibold text-slate-700">{registeredCard.student.dob}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center space-y-3">
                    {/* Photo Box */}
                    {registeredCard.student.photo_url ? (
                      <img 
                        src={registeredCard.student.photo_url} 
                        alt="Candidate" 
                        className="w-20 h-24 object-cover border border-slate-300 rounded" 
                      />
                    ) : (
                      <div className="w-20 h-24 border border-slate-300 bg-slate-50 rounded flex items-center justify-center text-[9px] text-slate-400 font-bold uppercase text-center p-2">
                        Photo Attested on Spot
                      </div>
                    )}
                    {/* QR Code image loaded dynamically from qrserver API */}
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(registeredCard.card.qr_code_payload)}`} 
                      alt="Verify QR" 
                      className="w-16 h-16 border p-0.5 rounded"
                    />
                  </div>
                </div>

                {/* Schedule specifications */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1 mb-4">
                  <div className="font-bold text-slate-800 mb-1">Exam Details:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Exam Date: <strong className="text-slate-800">{registeredCard.card.exam_date}</strong></div>
                    <div>Reporting: <strong className="text-slate-800">{registeredCard.card.reporting_time}</strong></div>
                  </div>
                  <div>Exam Venue: <strong className="text-slate-800">{registeredCard.card.venue}</strong></div>
                </div>

                <div className="text-[9px] text-slate-400 uppercase tracking-wider pb-1 border-b">Instructions:</div>
                <div className="text-[8px] text-slate-500 leading-tight mt-1 whitespace-pre-line">
                  {registeredCard.card.instructions}
                </div>

                {/* Signature lines */}
                <div className="mt-8 flex justify-between items-end text-[9px] font-bold text-slate-400 uppercase">
                  <div className="text-center">
                    <div className="w-24 border-b border-slate-300 h-6"></div>
                    <div className="mt-1">Invigilator Sign</div>
                  </div>
                  <div className="text-center">
                    <div className="w-24 border-b border-slate-300 h-6 flex items-center justify-center italic font-normal text-slate-500 font-serif">Sourav Mukherjee</div>
                    <div className="mt-1">Controller of Exam</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 p-16 rounded-2xl text-center text-slate-400 flex flex-col items-center justify-center no-print">
              <FileText className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-600">No Admit Card Generated</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Fill in the registration form on the left to dynamically generate a print-ready Admit Card.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
