import React, { useState, useMemo, useEffect } from 'react';
import { mockDb, Student, School, Scholarship, AdmitCard } from '../services/mockDb';
import { FileText, Printer, QrCode, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export const AdmitCards: React.FC = () => {
  const [dbScholarships, setDbScholarships] = useState<Scholarship[]>(mockDb.getData<Scholarship>('scholarships'));
  const [dbSchools, setDbSchools] = useState<School[]>(mockDb.getData<School>('schools'));
  const [students, setStudents] = useState<Student[]>(mockDb.getData<Student>('students'));
  const [admitCards, setAdmitCards] = useState<AdmitCard[]>(mockDb.getData<AdmitCard>('admit_cards'));
  
  const [selectedSch, setSelectedSch] = useState('');
  const [selectedScl, setSelectedScl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Scheduling states
  const [examDateInput, setExamDateInput] = useState('2026-06-21');
  const [examStartTime, setExamStartTime] = useState('11:00');
  const [examEndTime, setExamEndTime] = useState('13:00');

  const formatTime12h = (time24: string): string => {
    if (!time24) return '';
    const parts = time24.split(':');
    let hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const calculatedReportingTime = useMemo(() => {
    if (!examStartTime) return '';
    try {
      const parts = examStartTime.split(':');
      let hours = parseInt(parts[0], 10) || 0;
      let minutes = parseInt(parts[1], 10) || 0;
      
      let totalMinutes = hours * 60 + minutes - 15;
      if (totalMinutes < 0) {
        totalMinutes += 24 * 60; // Wrap around day
      }
      
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      
      const displayHours = newHours % 12 === 0 ? 12 : newHours % 12;
      const displayMinutes = String(newMinutes).padStart(2, '0');
      const ampm = newHours >= 12 ? 'PM' : 'AM';
      
      return `${String(displayHours).padStart(2, '0')}:${displayMinutes} ${ampm}`;
    } catch (e) {
      return '';
    }
  }, [examStartTime]);

  // Fetch live admit card page details from Supabase on mount
  useEffect(() => {
    const fetchLiveDetails = async () => {
      setIsLoading(true);
      if (isSupabaseConfigured && supabase) {
        try {
          const [schRes, sclRes, stuRes, cardRes] = await Promise.all([
            supabase.from('scholarships').select('*').order('created_at', { ascending: false }),
            supabase.from('schools').select('*').order('created_at', { ascending: false }),
            supabase.from('students').select('*'),
            supabase.from('admit_cards').select('*')
          ]);

          if (schRes.error) throw schRes.error;
          if (sclRes.error) throw sclRes.error;
          if (stuRes.error) throw stuRes.error;
          if (cardRes.error) throw cardRes.error;

          if (schRes.data) {
            setDbScholarships(schRes.data);
            if (schRes.data.length > 0) setSelectedSch(schRes.data[0].id);
          }
          if (sclRes.data) setDbSchools(sclRes.data);
          if (stuRes.data) setStudents(stuRes.data);
          if (cardRes.data) setAdmitCards(cardRes.data);
        } catch (err) {
          console.error("Error loading live admit card data:", err);
        } finally {
          setIsLoading(false);
        }
      } else {
        if (dbScholarships.length > 0) setSelectedSch(dbScholarships[0].id);
        setIsLoading(false);
      }
    };
    fetchLiveDetails();
  }, []);

  // Filter students who don't have admit cards generated yet (strictly for the selected school)
  const studentsWithCardStatus = useMemo(() => {
    if (!selectedScl) return [];
    return students.filter(
      s => s.scholarship_id === selectedSch && s.school_id === selectedScl
    ).map(s => {
      const card = admitCards.find(ac => ac.student_id === s.id);
      return {
        student: s,
        card,
        school: dbSchools.find(sch => sch.id === s.school_id)
      };
    });
  }, [students, admitCards, dbSchools, selectedSch, selectedScl]);

  const handleGenerateAll = async () => {
    if (!selectedScl) {
      alert("Please select a specific school to generate/update admit cards.");
      return;
    }
    if (!examDateInput || !examStartTime || !examEndTime) {
      alert("Please configure the examination Date, Start Time, and End Time first.");
      return;
    }

    if (studentsWithCardStatus.length === 0) {
      alert("No students are enrolled in this school for the selected session.");
      return;
    }

    setIsSaving(true);
    try {
      const currentYear = dbScholarships.find(s => s.id === selectedSch)?.academic_year || 2026;
      const generated: AdmitCard[] = [];
      const formattedExamTime = `${formatTime12h(examStartTime)} - ${formatTime12h(examEndTime)}`;

      let newCardsCount = 0;
      const upsertData = studentsWithCardStatus.map((item) => {
        const hasCard = !!item.card;
        
        let rollNumber = '';
        if (hasCard) {
          rollNumber = item.card!.roll_number;
        } else {
          // Generate new roll number
          const rollSeq = String(admitCards.length + newCardsCount + 1).padStart(5, '0');
          rollNumber = `${String(currentYear).substring(2, 4)}1${rollSeq.substring(2)}`;
          newCardsCount++;
        }

        return {
          ...(hasCard ? { id: item.card!.id } : {}), // Preserve UUID key if it already exists
          student_id: item.student.id,
          roll_number: rollNumber,
          exam_date: examDateInput,
          reporting_time: calculatedReportingTime,
          exam_time: formattedExamTime,
          venue: item.school ? `${item.school.name} Hall, ${item.school.district}` : 'Main Examination Center',
          instructions: '1. Bring this Admit Card & School ID card.\n2. Use Black/Blue ballpoint pen only.\n3. Calculator, smartwatches, or mobile phones are strictly prohibited.',
          qr_code_payload: `https://isms.icstconnect.in/verify/${rollNumber}`,
          signature_url: ''
        };
      });

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('admit_cards')
          .upsert(upsertData, { onConflict: 'student_id' })
          .select();
        if (error) throw error;
        if (data) {
          data.forEach((card: any) => {
            const exists = mockDb.getData<AdmitCard>('admit_cards').some(ac => ac.id === card.id);
            if (exists) {
              mockDb.updateRecord<AdmitCard>('admit_cards', card.id, card);
            } else {
              mockDb.addRecord<AdmitCard>('admit_cards', card);
            }
          });

          // Reload all cards from Supabase to sync client state perfectly
          const { data: reloadRes, error: reloadErr } = await supabase.from('admit_cards').select('*');
          if (!reloadErr && reloadRes) {
            setAdmitCards(reloadRes);
          }
        }
      } else {
        // Offline mock DB state updates
        upsertData.forEach(cardData => {
          const existingRecord = admitCards.find(ac => ac.student_id === cardData.student_id);
          if (existingRecord) {
            const updated = mockDb.updateRecord<AdmitCard>('admit_cards', existingRecord.id, cardData);
            if (updated) generated.push(updated);
          } else {
            const inserted = mockDb.addRecord<AdmitCard>('admit_cards', {
              id: `ac-${Date.now()}-${Math.random()}`,
              ...cardData
            });
            generated.push(inserted);
          }
        });

        const remainingCards = admitCards.filter(
          ac => !studentsWithCardStatus.some(item => item.student.id === ac.student_id)
        );
        setAdmitCards([...remainingCards, ...generated]);
      }

      alert("Admit cards generated / updated successfully.");
    } catch (err: any) {
      alert("Failed to generate/update admit cards: " + err.message);
    } finally {
      setIsSaving(false);
    }
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
            disabled={isSaving || isLoading || !selectedScl || !examDateInput || !examStartTime || !examEndTime}
            className="flex items-center text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 font-semibold"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isSaving ? 'Generating...' : 'Generate Pending Cards'}
          </button>
          <button
            onClick={handlePrintAll}
            disabled={isSaving || isLoading || !selectedScl}
            className="flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Bulk Print A4 Layout
          </button>
        </div>
      </div>

      {/* Filter Options (Hidden on Print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Scholarship Session</label>
            <select
              value={selectedSch}
              disabled={isLoading}
              onChange={(e) => setSelectedSch(e.target.value)}
              className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none disabled:opacity-50"
            >
              {dbScholarships.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Filter by School <span className="text-red-500">*</span></label>
            <select
              value={selectedScl}
              disabled={isLoading}
              onChange={(e) => setSelectedScl(e.target.value)}
              className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none disabled:opacity-50"
            >
              <option value="">-- Select School --</option>
              {dbSchools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedScl ? (
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configure Examination Schedule</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Exam Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={examDateInput}
                  onChange={(e) => setExamDateInput(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Start Time (24h) <span className="text-red-500">*</span></label>
                <input
                  type="time"
                  value={examStartTime}
                  onChange={(e) => setExamStartTime(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">End Time (24h) <span className="text-red-500">*</span></label>
                <input
                  type="time"
                  value={examEndTime}
                  onChange={(e) => setExamEndTime(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Calculated Reporting Time</label>
                <div className="w-full border border-blue-100 bg-blue-50/50 p-2.5 text-sm font-extrabold text-blue-700 rounded-lg text-center">
                  {calculatedReportingTime || '--:--'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-100 pt-4 text-center">
            <p className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-100 rounded-xl p-3 inline-block">
              ⚠️ Please select a specific school in the dropdown above to schedule the exam date & time and enable generate/print actions.
            </p>
          </div>
        )}
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
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">ADMIT CARD</div>
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
                Instructions: Bring Admit Card and School Identity card. Report at {item.card?.reporting_time || '30 min before schedule'}. BALLPOINT PEN ONLY.
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
