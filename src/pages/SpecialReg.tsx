import React, { useState } from 'react';
import { mockDb, Student, School, Scholarship, AdmitCard } from '../services/mockDb';
import { UserCheck, Printer, QrCode } from 'lucide-react';
import { DatePicker } from '../components/DatePicker';

export const SpecialReg: React.FC = () => {
  const schools = mockDb.getData<School>('schools');
  const scholarships = mockDb.getData<Scholarship>('scholarships').filter(s => s.status === 'Active' || s.status === 'AdmitCardsGenerated' || s.status === 'MarksEntry');
  const activeSch = scholarships[0] || null;

  const [name, setName] = useState('');
  const [father, setFather] = useState('');
  const [mother, setMother] = useState('');
  const [dob, setDob] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState(schools[0]?.id || '');
  const [guardianContact, setGuardianContact] = useState('');

  const [registeredCard, setRegisteredCard] = useState<any | null>(null);
  const [error, setError] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRegisteredCard(null);

    if (!activeSch) {
      setError('No active scholarship session currently accepting registrations.');
      return;
    }

    if (!name.trim() || !dob || !selectedSchoolId) {
      setError('Please fill in all required fields.');
      return;
    }

    // 1. Create student record
    const allStudents = mockDb.getData<Student>('students');
    const nextStuId = `STU-SP-${String(allStudents.length + 1).padStart(5, '0')}`;
    const newStudent = mockDb.addRecord<Student>('students', {
      student_id: nextStuId,
      scholarship_id: activeSch.id,
      school_id: selectedSchoolId,
      name,
      father_name: father,
      mother_name: mother,
      dob,
      gender: 'Male', // Default or select
      class: 'Class X',
      section: 'SP',
      school_roll_no: 'SP',
      guardian_contact: guardianContact,
      address: 'Exam Day Special Registration',
      photo_url: null,
      is_special_registration: true
    });

    // 2. Generate Roll Number (8 digits)
    // 26 (Year) + 9 (Special District Code) + 00001 (sequence)
    const allCards = mockDb.getData<AdmitCard>('admit_cards');
    const rollSequence = String(allCards.length + 1).padStart(4, '0');
    const generatedRoll = `${String(activeSch.academic_year).substring(2, 4)}9${rollSequence}`;

    // 3. Create Admit Card record
    const school = schools.find(s => s.id === selectedSchoolId);
    const newCard = mockDb.addRecord<AdmitCard>('admit_cards', {
      student_id: newStudent.id,
      roll_number: generatedRoll,
      exam_date: new Date().toISOString().split('T')[0], // Scheduled for today
      reporting_time: '09:30 AM',
      exam_time: '10:30 AM - 12:30 PM',
      venue: school?.name || 'Main Exam Center',
      instructions: '1. This is an Emergency Admit Card issued on Exam Day.\n2. Verify registration ID at marks entry desks.\n3. Calculator and digital wear prohibited.',
      qr_code_payload: `https://isms.icstconnect.in/verify/${generatedRoll}`,
      signature_url: ''
    });

    // Automatically trigger attendance as Present
    mockDb.addRecord<any>('attendance', {
      student_id: newStudent.id,
      status: 'Present',
      recorded_by: 'usr-5' // Default Invigilator
    });

    setRegisteredCard({
      student: newStudent,
      card: newCard,
      school
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="no-print">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <UserCheck className="w-6 h-6 mr-2 text-blue-600" />
          Special Student Registration
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Emergency candidate registration on examination day. Generates admit card instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Side Registration form (Hidden in print) */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 no-print">
          <h3 className="text-lg font-bold text-slate-800">Exam Day Registration</h3>
          {activeSch ? (
            <div className="text-xs font-semibold text-green-600 bg-green-50 p-2 rounded border border-green-200">
              Active Exam Session: <span className="font-extrabold">{activeSch.name}</span>
            </div>
          ) : (
            <div className="text-xs font-semibold text-red-600 bg-red-50 p-2 rounded border border-red-200">
              No active scholarship session open for exam day registration.
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Enrolled School <span className="text-red-500">*</span></label>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.school_id})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Student Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Das"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
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
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Father's Name</label>
                <input
                  type="text"
                  placeholder="Father's Name"
                  value={father}
                  onChange={(e) => setFather(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Mother's Name</label>
                <input
                  type="text"
                  placeholder="Mother's Name"
                  value={mother}
                  onChange={(e) => setMother(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Guardian Contact Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                maxLength={10}
                placeholder="10 digit number"
                value={guardianContact}
                onChange={(e) => setGuardianContact(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-xs font-semibold">{error}</div>
            )}

            <button
              type="submit"
              disabled={!activeSch}
              className="w-full text-white bg-blue-600 hover:bg-blue-500 text-sm font-semibold py-2.5 rounded-xl shadow cursor-pointer disabled:opacity-50 transition-colors"
            >
              Generate Admit Card Instantly
            </button>
          </form>
        </div>

        {/* Right Side Admit Card layout preview (Visible in print too) */}
        {registeredCard ? (
          <div className="space-y-4">
            <div className="flex justify-end space-x-3 no-print">
              <button
                onClick={handlePrint}
                className="flex items-center text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-2 rounded-lg cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print Admit Card
              </button>
            </div>

            {/* Print Admit Card Structure */}
            <div className="bg-white border-2 border-slate-800 p-6 rounded-lg text-slate-800 shadow-md relative print:shadow-none print:border-slate-800 max-w-lg mx-auto">
              <div className="text-center pb-3 border-b-2 border-slate-800">
                <h4 className="font-extrabold text-sm uppercase tracking-wider">ICST Scholarship Committee</h4>
                <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-0.5">ADMIT CARD</div>
              </div>

              <div className="flex justify-between items-start my-4">
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="font-bold text-slate-400">Roll Number:</span>{' '}
                    <span className="font-black text-slate-900 font-mono text-sm">{registeredCard.card.roll_number}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Student Name:</span>{' '}
                    <span className="font-extrabold text-slate-900">{registeredCard.student.name}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">School ID:</span>{' '}
                    <span className="font-semibold text-slate-700">{registeredCard.school?.school_id}</span>
                  </div>
                  <div className="w-60 truncate">
                    <span className="font-bold text-slate-400">School Name:</span>{' '}
                    <span className="font-semibold text-slate-700">{registeredCard.school?.name}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Date of Birth:</span>{' '}
                    <span className="font-semibold text-slate-700">{registeredCard.student.dob}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-2">
                  {/* Photo Box */}
                  {registeredCard.student.photo_url ? (
                    <img src={registeredCard.student.photo_url} alt="Photo" className="w-20 h-24 object-cover border border-slate-300 rounded" />
                  ) : (
                    <div className="w-20 h-24 border border-slate-300 bg-slate-50 rounded flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                      Photo Pending
                    </div>
                  )}
                  {/* Mock QR Code */}
                  <div className="w-12 h-12 bg-slate-100 rounded border flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-slate-600" />
                  </div>
                </div>
              </div>

              {/* Schedule specifications */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1 mb-4">
                <div className="font-bold text-slate-800">Exam Details:</div>
                <div className="flex justify-between">
                  <span>Exam Date: <strong className="text-slate-800">{registeredCard.card.exam_date}</strong></span>
                  <span>Reporting: <strong className="text-slate-800">{registeredCard.card.reporting_time}</strong></span>
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
                  <div className="w-24 border-b border-slate-300 h-6 flex items-center justify-center italic font-normal text-slate-400">Sourav Mukherjee</div>
                  <div className="mt-1">Controller of Exam</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 border border-dashed border-slate-300 p-12 rounded-2xl text-center text-slate-400 text-sm no-print">
            Fill in the registration form to generate admit card layout.
          </div>
        )}
      </div>
    </div>
  );
};
