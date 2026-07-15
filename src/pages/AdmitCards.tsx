import React, { useState, useMemo } from 'react';
import { mockDb, Student, School, Scholarship, AdmitCard } from '../services/mockDb';
import { FileText, Printer, QrCode } from 'lucide-react';

export const AdmitCards: React.FC = () => {
  const scholarships = mockDb.getData<Scholarship>('scholarships');
  const schools = mockDb.getData<School>('schools');
  
  const [selectedSch, setSelectedSch] = useState(scholarships[0]?.id || '');
  const [selectedScl, setSelectedScl] = useState('');
  
  const [students] = useState<Student[]>(mockDb.getData<Student>('students'));
  const [admitCards, setAdmitCards] = useState<AdmitCard[]>(mockDb.getData<AdmitCard>('admit_cards'));

  // Filter students who don't have admit cards generated yet
  const studentsWithCardStatus = useMemo(() => {
    return students.filter(
      s => s.scholarship_id === selectedSch && 
           (selectedScl === '' || s.school_id === selectedScl)
    ).map(s => {
      const card = admitCards.find(ac => ac.student_id === s.id);
      return {
        student: s,
        card,
        school: schools.find(sch => sch.id === s.school_id)
      };
    });
  }, [students, admitCards, schools, selectedSch, selectedScl]);

  const handleGenerateAll = () => {
    // Generate admit cards for all students in the filtered selection who don't have cards yet
    const pendingList = studentsWithCardStatus.filter(item => !item.card);
    if (pendingList.length === 0) {
      alert("All students in this selection already have admit cards generated.");
      return;
    }

    const currentYear = scholarships.find(s => s.id === selectedSch)?.academic_year || 2026;
    const generated: AdmitCard[] = [];

    pendingList.forEach((item) => {
      // 8 Digit Roll Number: YY + District code (e.g. 1) + sequence
      const rollSeq = String(admitCards.length + generated.length + 1).padStart(5, '0');
      const generatedRoll = `${String(currentYear).substring(2, 4)}1${rollSeq.substring(2)}`;

      const newCard = mockDb.addRecord<AdmitCard>('admit_cards', {
        student_id: item.student.id,
        roll_number: generatedRoll,
        exam_date: '2026-06-21',
        reporting_time: '10:00 AM',
        exam_time: '11:00 AM - 01:00 PM',
        venue: item.school ? `${item.school.name} Hall, ${item.school.district}` : 'Main Examination Center',
        instructions: '1. Bring this Admit Card & School ID card.\n2. Use Black/Blue ballpoint pen only.\n3. Calculator, smartwatches, or mobile phones are strictly prohibited.',
        qr_code_payload: `https://isms.icstconnect.in/verify/${generatedRoll}`,
        signature_url: ''
      });
      generated.push(newCard);
    });

    setAdmitCards([...admitCards, ...generated]);
    alert(`Successfully generated ${generated.length} admit cards.`);
  };

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-blue-600" />
            Admit Card Generation
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Generate, view, and print admission tickets in bulk or per student.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleGenerateAll}
            className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-4 py-2.5 rounded-xl cursor-pointer"
          >
            Generate Pending Cards
          </button>
          <button
            onClick={handlePrintAll}
            className="flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Bulk Print A4 Layout
          </button>
        </div>
      </div>

      {/* Filter Options (Hidden on Print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Scholarship Session</label>
          <select
            value={selectedSch}
            onChange={(e) => setSelectedSch(e.target.value)}
            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none"
          >
            {scholarships.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Filter by School</label>
          <select
            value={selectedScl}
            onChange={(e) => setSelectedScl(e.target.value)}
            className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none"
          >
            <option value="">All Schools</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Candidates List (Hidden on Print) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm no-print">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-500 uppercase">Filtered Selection Status</span>
          <span className="text-xs font-semibold text-slate-400">Total: {studentsWithCardStatus.length} Students</span>
        </div>
        
        {studentsWithCardStatus.length > 0 ? (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">Student Name</th>
                <th className="p-4 font-semibold text-slate-600">School</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Roll Number</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Admit Card</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentsWithCardStatus.map(item => (
                <tr key={item.student.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-800">{item.student.name}</td>
                  <td className="p-4 text-slate-600 font-medium">{item.school?.name || 'N/A'}</td>
                  <td className="p-4 text-center font-mono font-bold text-slate-700">
                    {item.card ? item.card.roll_number : '-'}
                  </td>
                  <td className="p-4 text-center">
                    {item.card ? (
                      <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded border border-green-100">
                        Generated
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs bg-slate-50 px-2 py-0.5 rounded border">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-slate-400">
            No students found matching current filter values.
          </div>
        )}
      </div>

      {/* PRINT-ONLY AREA (A4 Bulk Printing, rendered 2 cards per page using page break CSS) */}
      <div className="print-only">
        {studentsWithCardStatus.filter(item => item.card).map((item, idx) => (
          <React.Fragment key={item.student.id}>
            <div className="admit-card">
              <div className="text-center pb-2 border-b-2 border-black flex justify-between items-center">
                <div className="w-10 h-10 bg-slate-100 border flex items-center justify-center font-bold text-xs uppercase">Logo</div>
                <div>
                  <h4 className="font-extrabold text-sm uppercase tracking-wider">ICST Scholarship Examination</h4>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Official Admission Card</div>
                </div>
                <div className="w-10 h-10 border flex items-center justify-center"><QrCode className="w-8 h-8 text-black" /></div>
              </div>

              <div className="flex justify-between items-start my-4">
                <div className="space-y-1.5 text-xs">
                  <div><strong>Roll Number:</strong> <span className="font-bold font-mono text-sm">{item.card?.roll_number}</span></div>
                  <div><strong>Candidate Name:</strong> <span className="font-bold">{item.student.name}</span></div>
                  <div><strong>School:</strong> {item.school?.name}</div>
                  <div><strong>Date of Birth:</strong> {item.student.dob}</div>
                </div>

                {item.student.photo_url ? (
                  <img src={item.student.photo_url} alt="Photo" className="w-20 h-24 object-cover border border-black" />
                ) : (
                  <div className="w-20 h-24 border border-black bg-slate-50 flex items-center justify-center text-[10px] font-bold uppercase text-slate-400">
                    Photo Space
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-black p-2 rounded text-xs space-y-0.5">
                <div><strong>Schedule:</strong> Date: {item.card?.exam_date} | Time: {item.card?.exam_time}</div>
                <div><strong>Venue:</strong> {item.card?.venue}</div>
              </div>

              <div className="text-[9px] font-bold mt-2 border-t pt-1">
                Instructions: Bring Admit Card and School Identity card. Report 30 min before schedule. BALLPOINT PEN ONLY.
              </div>

              <div className="mt-6 flex justify-between items-end text-[9px] font-bold">
                <div className="text-center">
                  <div className="w-24 border-b border-black h-4"></div>
                  <div className="mt-1">Invigilator Sign</div>
                </div>
                <div className="text-center">
                  <div className="w-24 border-b border-black h-4 flex items-center justify-center italic font-normal">Sourav Mukherjee</div>
                  <div className="mt-1">Controller of Exam</div>
                </div>
              </div>
            </div>
            
            {/* Break page after every 2 cards (so 2 fit on a single A4) */}
            {(idx + 1) % 2 === 0 && <div className="page-break" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
