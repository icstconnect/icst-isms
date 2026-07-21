import React, { useState, useMemo, useEffect } from 'react';
import { mockDb, Student, School, Scholarship, AdmitCard } from '../services/mockDb';
import { fetchSetting, saveSetting, SignatureProfile } from '../services/settingsService';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  FileText, 
  Printer, 
  QrCode, 
  Loader2, 
  Settings, 
  Upload, 
  CheckCircle, 
  X, 
  Sliders, 
  Image as ImageIcon,
  Monitor,
  Code,
  Globe,
  Palette,
  Brain,
  Bot,
  Database,
  Shield,
  Cpu,
  FileSpreadsheet,
  Terminal,
  Cloud,
  Smartphone,
  CheckCheck,
  Award,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Zap,
  Check
} from 'lucide-react';
import { SkeletonTable } from '../components/Skeleton';

export const AdmitCards: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [dbScholarships, setDbScholarships] = useState<Scholarship[]>([]);
  const [dbSchools, setDbSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [admitCards, setAdmitCards] = useState<AdmitCard[]>([]);
  
  const [selectedSch, setSelectedSch] = useState('');
  const [selectedScl, setSelectedScl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Scheduling states
  const [examDateInput, setExamDateInput] = useState('2026-06-21');
  const [examStartTime, setExamStartTime] = useState('11:00');
  const [examEndTime, setExamEndTime] = useState('13:00');

  // E3 & E4 Settings States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [watermark, setWatermark] = useState<any>({
    text: 'Official',
    opacity: 0.1,
    rotation: -30,
    color: '#FF0000',
    position: 'diagonal',
    enabled: true
  });

  const [sigProfiles, setSigProfiles] = useState<SignatureProfile[]>([]);
  
  // New profile creator fields
  const [newSigName, setNewSigName] = useState('');
  const [newSigDesignation, setNewSigDesignation] = useState('Controller of Exam');
  const [newSigLogo, setNewSigLogo] = useState('');
  const [newSigImage, setNewSigImage] = useState('');
  const [newSigSeal, setNewSigSeal] = useState('');

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
        totalMinutes += 24 * 60;
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

  const loadData = async () => {
    setIsLoading(true);
    let localSchs = mockDb.getData<Scholarship>('scholarships');
    let localSchools = mockDb.getData<School>('schools');
    let localStudents = mockDb.getData<Student>('students');
    let localCards = mockDb.getData<AdmitCard>('admit_cards');

    if (isSupabaseConfigured && supabase) {
      try {
        const [schRes, sclRes, stuRes, cardRes] = await Promise.all([
          supabase.from('scholarships').select('*').order('created_at', { ascending: false }),
          supabase.from('schools').select('*').order('name', { ascending: true }),
          supabase.from('students').select('*'),
          supabase.from('admit_cards').select('*')
        ]);
        if (schRes.data) localSchs = schRes.data;
        if (sclRes.data) localSchools = sclRes.data;
        if (stuRes.data) localStudents = stuRes.data;
        if (cardRes.data) localCards = cardRes.data;
      } catch (err) {
        console.error("Error loading live admit card data:", err);
      }
    }

    setDbScholarships(localSchs);
    setDbSchools(localSchools);
    setStudents(localStudents);
    setAdmitCards(localCards);

    if (localSchs.length > 0 && !selectedSch) {
      setSelectedSch(localSchs[0].id);
    }

    // Load settings from database / settingsService
    const storedWatermark = await fetchSetting('watermark', {
      text: 'Official',
      opacity: 0.1,
      rotation: -30,
      color: '#FF0000',
      position: 'diagonal',
      enabled: true
    });
    setWatermark(storedWatermark);

    const storedProfiles = await fetchSetting<SignatureProfile[]>('signature_profiles', [
      {
        id: 'sig-default',
        session_id: 'default',
        name: 'Sourav Mukherjee',
        designation: 'Controller of Exam',
        signature_image: '',
        official_seal: '',
        institution_logo: '',
        is_active: true
      }
    ]);
    setSigProfiles(storedProfiles);

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter students (restrict to assigned school if Coordinator)
  const studentsWithCardStatus = useMemo(() => {
    let list = students.filter(s => s.scholarship_id === selectedSch);
    if (user && user.role === 'ScholarshipCoordinator') {
      list = list.filter(s => s.school_id === user.school_id);
    } else if (selectedScl) {
      list = list.filter(s => s.school_id === selectedScl);
    } else {
      return [];
    }

    return list.map(s => {
      const card = admitCards.find(ac => ac.student_id === s.id);
      return {
        student: s,
        card,
        school: dbSchools.find(sch => sch.id === s.school_id)
      };
    });
  }, [students, admitCards, dbSchools, selectedSch, selectedScl, user]);

  const activeSignatureProfile = useMemo(() => {
    return sigProfiles.find(p => p.is_active) || sigProfiles[0];
  }, [sigProfiles]);

  const handleGenerateAll = async () => {
    const targetSchoolId = user?.role === 'ScholarshipCoordinator' ? user.school_id : selectedScl;
    if (!targetSchoolId) {
      toast.warning("Please select a school to generate admit cards.");
      return;
    }
    if (!examDateInput || !examStartTime || !examEndTime) {
      toast.warning("Please configure the examination Date, Start Time, and End Time first.");
      return;
    }
    if (studentsWithCardStatus.length === 0) {
      toast.warning("No students are enrolled in this school for the selected session.");
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
          const rollSeq = String(admitCards.length + newCardsCount + 1).padStart(5, '0');
          rollNumber = `${String(currentYear).substring(2, 4)}1${rollSeq.substring(2)}`;
          newCardsCount++;
        }

        const cardId = hasCard ? item.card!.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ac-${Date.now()}-${Math.random()}`);

        return {
          id: cardId,
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
        }
      } else {
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
      }

      // Add timeline logs for generated admit cards
      upsertData.forEach(cd => {
        mockDb.addStudentEvent(
          cd.student_id, 
          'Admit Card Generated', 
          `Roll Number: ${cd.roll_number}. Exam: ${cd.exam_date} at ${cd.exam_time}`, 
          user?.name
        );
      });

      toast.success("Admit cards generated / updated successfully.");
      loadData();
    } catch (err: any) {
      toast.error("Failed to generate/update admit cards: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintAll = () => {
    window.print();
  };

  // E3 & E4 settings save
  const handleSaveSettings = async () => {
    setIsSaving(true);
    await saveSetting('watermark', watermark);
    await saveSetting('signature_profiles', sigProfiles);
    setIsSaving(false);
    setShowSettingsModal(false);
    toast.success("Admit Card & Digital Signature configurations saved to database successfully.");
  };

  // Image Upload helper
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'sig' | 'seal') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (type === 'logo') setNewSigLogo(base64);
        else if (type === 'sig') setNewSigImage(base64);
        else setNewSigSeal(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProfile = () => {
    if (!newSigName.trim()) {
      toast.warning("Official name is required.");
      return;
    }
    const newProfile: SignatureProfile = {
      id: `sig-${Date.now()}`,
      session_id: selectedSch || 'all',
      name: newSigName,
      designation: newSigDesignation,
      institution_logo: newSigLogo,
      signature_image: newSigImage,
      official_seal: newSigSeal,
      is_active: false
    };

    setSigProfiles([...sigProfiles, newProfile]);
    setNewSigName('');
    setNewSigDesignation('Controller of Exam');
    setNewSigLogo('');
    setNewSigImage('');
    setNewSigSeal('');
    toast.info("Signature profile added. Click Save to persist changes.");
  };

  const handleSetActiveProfile = (id: string) => {
    setSigProfiles(prev => prev.map(p => ({
      ...p,
      is_active: p.id === id
    })));
  };

  const handleDeleteProfile = (id: string) => {
    if (sigProfiles.length <= 1) {
      toast.warning("At least one profile must be preserved.");
      return;
    }
    setSigProfiles(prev => prev.filter(p => p.id !== id));
  };

  // Watermark style generation
  const watermarkStyle = useMemo(() => {
    if (!watermark.enabled) return {};
    const styles: React.CSSProperties = {
      position: 'absolute',
      pointerEvents: 'none',
      userSelect: 'none',
      color: watermark.color,
      opacity: watermark.opacity,
      transform: `rotate(${watermark.rotation}deg)`,
      zIndex: 0,
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: '0.2em'
    };

    if (watermark.position === 'diagonal' || watermark.position === 'center') {
      styles.top = '50%';
      styles.left = '50%';
      styles.transform += ' translate(-50%, -50%)';
      styles.fontSize = '4.5rem';
    } else if (watermark.position === 'top') {
      styles.top = '25%';
      styles.left = '50%';
      styles.transform += ' translate(-50%, -50%)';
      styles.fontSize = '3.5rem';
    } else {
      styles.bottom = '25%';
      styles.left = '50%';
      styles.transform += ' translate(-50%, 50%)';
      styles.fontSize = '3.5rem';
    }

    return styles;
  }, [watermark]);

  const activeSchoolName = useMemo(() => {
    if (user && user.role === 'ScholarshipCoordinator') {
      return dbSchools.find(s => s.id === user.school_id)?.name || '';
    }
    return dbSchools.find(s => s.id === selectedScl)?.name || '';
  }, [user, dbSchools, selectedScl]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-blue-600" />
            Admit Card Generation
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Generate, view, and print admission tickets in bulk or per student.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {user && (user.role === 'SuperAdmin' || user.role === 'Admin') && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
            >
              <Settings className="w-4 h-4 mr-1.5 text-slate-400 animate-spin-slow" />
              Settings & Signatures
            </button>
          )}
          <button
            onClick={handleGenerateAll}
            disabled={isSaving || isLoading || (user?.role !== 'ScholarshipCoordinator' && !selectedScl) || !examDateInput || !examStartTime || !examEndTime}
            className="flex items-center text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 font-semibold"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isSaving ? 'Generating...' : 'Generate Pending Cards'}
          </button>
          <button
            onClick={handlePrintAll}
            disabled={isSaving || isLoading || (user?.role !== 'ScholarshipCoordinator' && !selectedScl)}
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
            {user && user.role === 'ScholarshipCoordinator' ? (
              <div className="w-full border border-slate-200 p-2.5 bg-slate-100 rounded-lg text-sm text-slate-600 font-bold">
                {activeSchoolName || 'Assigned School'}
              </div>
            ) : (
              <select
                value={selectedScl}
                disabled={isLoading}
                onChange={(e) => setSelectedScl(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 focus:outline-none disabled:opacity-50"
              >
                <option value="">-- Select School --</option>
                {dbSchools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.status === 'Suspended' ? '[SUSPENDED]' : ''}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {selectedScl || user?.role === 'ScholarshipCoordinator' ? (
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
              ⚠️ Please select a specific school to configure the schedule and enable admit card generation.
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
        
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={4} cols={4} />
          </div>
        ) : studentsWithCardStatus.length > 0 ? (
          <div className="overflow-x-auto">
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
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            No students found matching current filter values.
          </div>
        )}
      </div>

      {/* PRINT-ONLY AREA (A4 Bulk Printing, rendered 2 cards per page using page break CSS) */}
      <div className="print-only font-sans text-black bg-white">
        {studentsWithCardStatus.filter(item => item.card).map((item, idx, arr) => (
          <React.Fragment key={item.student.id}>
            <div className="admit-card relative bg-white text-black border-2 border-black p-2 flex flex-col justify-between">
              
              {/* E3: Background Watermark overlay */}
              {watermark.enabled && (
                <div style={watermarkStyle}>
                  {watermark.text}
                </div>
              )}

              {/* 1. Header Section */}
              <div className="border-b-2 border-black pb-1 mb-1 flex justify-between items-center relative z-10">
                <div className="flex items-center space-x-2">
                  {activeSignatureProfile?.institution_logo ? (
                    <img src={activeSignatureProfile.institution_logo} alt="Logo" className="w-11 h-11 object-contain grayscale" />
                  ) : (
                    <div className="w-11 h-11 border border-black flex items-center justify-center font-black text-xs text-center leading-tight">
                      ICST
                    </div>
                  )}
                  <div>
                    <h2 className="font-black text-sm uppercase tracking-wide leading-none">ICST SCHOLARSHIP EXAMINATION</h2>
                    <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-black">
                      ADMIT CARD & SCHOLARSHIP CLAIM CERTIFICATE | SESSION {dbScholarships.find(s => s.id === selectedSch)?.academic_year || '2027-2028'}
                    </div>
                    <div className="text-[7.5px] font-semibold text-gray-800">
                      Govt. Regd. Computer Educational Institution | ICST Chowberia, Nadia
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 border-l border-black pl-2">
                  <div className="text-center">
                    <div className="w-10 h-10 border border-black flex items-center justify-center p-0.5 bg-white">
                      <QrCode className="w-9 h-9 text-black" />
                    </div>
                    <div className="text-[6.5px] font-bold uppercase mt-0.5 leading-none">Scan to Verify</div>
                  </div>
                </div>
              </div>

              {/* 2. Candidate & Examination Details Grid */}
              <div className="grid grid-cols-[1fr_120px] gap-2 mb-1.5 relative z-10">
                <div className="border border-black p-1.5 rounded text-[9.5px] leading-tight grid grid-cols-[85px_1fr_85px_1fr] gap-x-1 gap-y-0.5">
                  <div className="font-bold">Roll Number:</div>
                  <div className="font-black font-mono text-[11px]">{item.card?.roll_number}</div>
                  <div className="font-bold">Reg. Number:</div>
                  <div className="font-mono font-bold">{item.student.student_id}</div>

                  <div className="font-bold">Student Name:</div>
                  <div className="font-black uppercase col-span-3 text-[10.5px]">{item.student.name}</div>

                  <div className="font-bold">Father's Name:</div>
                  <div className="uppercase col-span-3">{item.student.father_name || 'N/A'}</div>

                  <div className="font-bold">School Name:</div>
                  <div className="font-bold col-span-3 truncate">{item.school?.name}</div>

                  <div className="font-bold">Class:</div>
                  <div className="font-bold">{item.student.class}</div>
                  <div className="font-bold">Date of Birth:</div>
                  <div>{item.student.dob}</div>

                  <div className="col-span-4 border-t border-black/40 my-0.5 pt-0.5 grid grid-cols-2 gap-x-2 text-[9px]">
                    <div><strong>Exam Date:</strong> {item.card?.exam_date} ({item.card?.exam_time})</div>
                    <div><strong>Reporting:</strong> {item.card?.reporting_time}</div>
                    <div className="col-span-2"><strong>Exam Venue:</strong> {item.card?.venue}</div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-between border border-black p-1 rounded bg-white">
                  {item.student.photo_url ? (
                    <img src={item.student.photo_url} alt="Candidate Photo" className="w-[70px] h-[85px] object-cover border border-black" />
                  ) : (
                    <div className="w-[70px] h-[85px] border border-black flex flex-col items-center justify-center text-[8px] font-bold text-gray-500 text-center leading-tight p-1">
                      Passport Photo Space
                    </div>
                  )}
                  <div className="w-full border-t border-black text-center pt-0.5 text-[7px] font-bold uppercase">
                    Candidate Signature
                  </div>
                </div>
              </div>

              {/* 3. Corrected Scholarship Table (FIXED CLIPPING & Full Course Fee Text) */}
              <div className="border border-black rounded mb-1.5 overflow-hidden relative z-10">
                <div className="bg-black text-white text-[8.5px] font-bold px-2 py-0.5 uppercase tracking-wider text-center">
                  স্কলারশিপের বিবরণ ও সুবিধাসমূহ (Scholarship Details & Eligibility)
                </div>
                <table className="w-full text-[8.5px] border-collapse">
                  <thead>
                    <tr className="border-b border-black bg-gray-100 font-bold text-center">
                      <th className="border-r border-black p-1 w-5/12">মেধা তালিকা / অর্জন</th>
                      <th className="p-1 w-7/12 text-left pl-3">প্রাপ্ত স্কলারশিপের পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/30 font-medium">
                    <tr>
                      <td className="border-r border-black p-1 text-center font-bold">সমগ্র পরীক্ষায় প্রথম স্থান অধিকারী</td>
                      <td className="p-1 pl-3 font-bold text-left">সম্পূর্ণ কোর্স ফিতে ১০০% স্কলারশিপ</td>
                    </tr>
                    <tr>
                      <td className="border-r border-black p-1 text-center font-bold">প্রতিটি বিদ্যালয়ের প্রথম স্থান অধিকারী</td>
                      <td className="p-1 pl-3 font-bold text-left">সম্পূর্ণ কোর্স ফিতে ৬০% স্কলারশিপ</td>
                    </tr>
                    <tr>
                      <td className="border-r border-black p-1 text-center font-bold">প্রতিটি বিদ্যালয়ের দ্বিতীয় স্থান অধিকারী</td>
                      <td className="p-1 pl-3 font-bold text-left">সম্পূর্ণ কোর্স ফিতে ৫০% স্কলারশিপ</td>
                    </tr>
                    <tr>
                      <td className="border-r border-black p-1 text-center font-bold">প্রতিটি বিদ্যালয়ের তৃতীয় স্থান অধিকারী</td>
                      <td className="p-1 pl-3 font-bold text-left">সম্পূর্ণ কোর্স ফিতে ৪০% স্কলারশিপ</td>
                    </tr>
                    <tr>
                      <td className="border-r border-black p-1 text-center font-bold">পরীক্ষায় অংশগ্রহণকারী সকল শিক্ষার্থী</td>
                      <td className="p-1 pl-3 font-bold text-left">ভর্তি ফিতে ৩০% ছাড়</td>
                    </tr>
                  </tbody>
                </table>
                <div className="bg-gray-100 border-t border-black text-[7.5px] font-bold p-1 text-center leading-tight">
                  ★ উপরোক্ত সকল স্কলারশিপ শুধুমাত্র ২০২৭–২০২৮ শিক্ষাবর্ষে ICST Chowberia-এ পরিচালিত কম্পিউটার কোর্সে ভর্তির ক্ষেত্রে প্রযোজ্য।
                </div>
              </div>

              {/* 4. 5-Step Visual Scholarship Claim Process */}
              <div className="border border-black p-1 rounded mb-1.5 relative z-10 bg-white">
                <div className="text-[8px] font-black uppercase tracking-wide mb-1 text-center border-b border-black/30 pb-0.5">
                  স্কলারশিপ গ্রহণের সহজ ধাপসমূহ (Step-by-Step Scholarship Process)
                </div>
                <div className="flex items-center justify-between text-[7.5px] font-bold text-center px-1">
                  <div className="border border-black px-1.5 py-0.5 rounded">① পরীক্ষা দিন</div>
                  <div>➔</div>
                  <div className="border border-black px-1.5 py-0.5 rounded">② ফলাফল প্রকাশ</div>
                  <div>➔</div>
                  <div className="border border-black px-1.5 py-0.5 rounded">③ স্কলারশিপ যাচাই</div>
                  <div>➔</div>
                  <div className="border border-black px-1.5 py-0.5 rounded">④ ICST-এ ভর্তি</div>
                  <div>➔</div>
                  <div className="border border-black px-1.5 py-0.5 rounded bg-black text-white">⑤ স্কলারশিপ প্রয়োগ</div>
                </div>
              </div>

              {/* 5. ICST Computer Courses, Tools & Tech Showcase + Robotics Illustration */}
              <div className="border border-black p-1 rounded mb-1.5 relative z-10 flex justify-between items-stretch gap-2">
                <div className="flex-1">
                  <div className="text-[8px] font-black uppercase tracking-wide mb-1 flex items-center">
                    <Monitor className="w-3 h-3 mr-1 text-black" /> আমাদের পরিচালিত কম্পিউটার কোর্সসমূহ ও প্রযুক্তিসমূহ
                  </div>
                  
                  {/* Course Tags */}
                  <div className="flex flex-wrap gap-1 mb-1">
                    <span className="inline-flex items-center border border-black text-[7px] font-bold px-1 rounded">
                      <Monitor className="w-2.5 h-2.5 mr-0.5" /> Basic
                    </span>
                    <span className="inline-flex items-center border border-black text-[7px] font-bold px-1 rounded">
                      <Cpu className="w-2.5 h-2.5 mr-0.5" /> Advanced
                    </span>
                    <span className="inline-flex items-center border border-black text-[7px] font-bold px-1 rounded">
                      <Code className="w-2.5 h-2.5 mr-0.5" /> Programming
                    </span>
                    <span className="inline-flex items-center border border-black text-[7px] font-bold px-1 rounded">
                      <Globe className="w-2.5 h-2.5 mr-0.5" /> Web Dev
                    </span>
                    <span className="inline-flex items-center border border-black text-[7px] font-bold px-1 rounded">
                      <Palette className="w-2.5 h-2.5 mr-0.5" /> Graphics
                    </span>
                    <span className="inline-flex items-center border border-black text-[7px] font-bold px-1 rounded">
                      <Brain className="w-2.5 h-2.5 mr-0.5" /> AI Tech
                    </span>
                    <span className="inline-flex items-center border border-black text-[7px] font-bold px-1 rounded">
                      <Bot className="w-2.5 h-2.5 mr-0.5" /> Robotics
                    </span>
                    <span className="inline-flex items-center border border-black text-[7px] font-bold px-1 rounded">
                      <FileSpreadsheet className="w-2.5 h-2.5 mr-0.5" /> Office Auto
                    </span>
                    <span className="inline-flex items-center border border-black text-[7px] font-bold px-1 rounded">
                      <Cloud className="w-2.5 h-2.5 mr-0.5" /> Cloud & DB
                    </span>
                    <span className="inline-flex items-center border border-black text-[7px] font-bold px-1 rounded">
                      <Shield className="w-2.5 h-2.5 mr-0.5" /> Cyber Security
                    </span>
                  </div>

                  {/* Software & Tech Badges */}
                  <div className="text-[6.5px] font-bold text-black border-t border-black/30 pt-0.5 flex flex-wrap gap-0.5">
                    <span className="px-1 border border-black/40 rounded">C</span>
                    <span className="px-1 border border-black/40 rounded">C++</span>
                    <span className="px-1 border border-black/40 rounded">Python</span>
                    <span className="px-1 border border-black/40 rounded">Java</span>
                    <span className="px-1 border border-black/40 rounded">JS</span>
                    <span className="px-1 border border-black/40 rounded">HTML5</span>
                    <span className="px-1 border border-black/40 rounded">React</span>
                    <span className="px-1 border border-black/40 rounded">SQL</span>
                    <span className="px-1 border border-black/40 rounded">MS Word</span>
                    <span className="px-1 border border-black/40 rounded">MS Excel</span>
                    <span className="px-1 border border-black/40 rounded">PowerPoint</span>
                    <span className="px-1 border border-black/40 rounded">Photoshop</span>
                    <span className="px-1 border border-black/40 rounded">Illustrator</span>
                    <span className="px-1 border border-black/40 rounded">VS Code</span>
                    <span className="px-1 border border-black/40 rounded">Git</span>
                  </div>
                </div>

                {/* Robotics Line-Art Illustration Vector */}
                <div className="w-14 shrink-0 border-l border-black pl-1 flex flex-col items-center justify-center text-center">
                  <svg className="w-10 h-10 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <circle cx="12" cy="5" r="2" />
                    <path d="M12 7v4" />
                    <line x1="8" y1="15" x2="8" y2="15.01" strokeWidth="3" />
                    <line x1="16" y1="15" x2="16" y2="15.01" strokeWidth="3" />
                    <path d="M9 18h6" />
                    <line x1="1" y1="16" x2="3" y2="16" />
                    <line x1="21" y1="16" x2="23" y2="16" />
                  </svg>
                  <div className="text-[6.5px] font-black uppercase mt-0.5 leading-none">Robotics & AI</div>
                </div>
              </div>

              {/* 6. Digital Signatures & Official Verification Footer */}
              <div className="border-t-2 border-black pt-1 relative z-10">
                <div className="flex justify-between items-end">
                  <div className="border border-black px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-black" /> ✓ Digitally Verified
                  </div>

                  <div className="text-center">
                    <div className="w-20 border-b border-black h-4 mb-0.5"></div>
                    <div className="text-[7.5px] font-bold uppercase">Invigilator Signature</div>
                  </div>

                  <div className="flex items-end space-x-2">
                    {activeSignatureProfile?.official_seal && (
                      <img src={activeSignatureProfile.official_seal} alt="Seal" className="w-9 h-9 object-contain grayscale" />
                    )}
                    <div className="text-center">
                      {activeSignatureProfile?.signature_image ? (
                        <img src={activeSignatureProfile.signature_image} alt="Signature" className="h-5 object-contain mb-0.5 grayscale" />
                      ) : (
                        <div className="h-5 italic text-[8px] text-gray-500">Controller Sign</div>
                      )}
                      <div className="w-24 border-b border-black"></div>
                      <div className="text-[8px] font-black uppercase mt-0.5">{activeSignatureProfile?.name || 'Sourav Mukherjee'}</div>
                      <div className="text-[6.5px] font-semibold text-gray-700">{activeSignatureProfile?.designation || 'Controller of Exam'}</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-[6.5px] font-mono border-t border-black/40 mt-1 pt-0.5">
                  <div>Verification: isms.icstconnect.in/verify</div>
                  <div>Doc ID: {item.card?.id.substring(0, 8) || 'N/A'} | Date: {new Date().toLocaleDateString('en-GB')}</div>
                </div>
              </div>

            </div>
            
            {/* Cut guide if it's the first card on page and not the very last card in the array */}
            {idx % 2 === 0 && idx + 1 < arr.length && (
              <div className="cut-guide">
                ✂ Cut Along This Line ✂
              </div>
            )}
            
            {/* Page break after every 2 cards */}
            {(idx + 1) % 2 === 0 && <div className="page-break" />}
          </React.Fragment>
        ))}
      </div>

      {/* WATERMARK & DIGITAL SIGNATURE CONFIGURATION DIALOG (Admin only) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full shadow-2xl p-6 relative my-8">
            <button 
              onClick={() => setShowSettingsModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
              <Sliders className="w-5 h-5 mr-2 text-blue-600" /> Admit Card Settings & Digital Signatures
            </h3>
            <span className="text-slate-400 text-xs font-semibold block mb-6">Manage watermark patterns, official seals, and signatures.</span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* E3: Watermark Settings Form */}
              <div className="space-y-4 border-r pr-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1.5 text-blue-600" /> 1. Watermark Settings
                </h4>
                
                <label className="flex items-center text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={watermark.enabled}
                    onChange={(e) => setWatermark({ ...watermark, enabled: e.target.checked })}
                    className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                  />
                  Enable Watermark Overlay
                </label>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Watermark Text</label>
                  <select
                    value={watermark.text}
                    onChange={(e) => setWatermark({ ...watermark, text: e.target.value })}
                    className="w-full border p-2 text-xs rounded-lg bg-slate-50"
                  >
                    <option value="Official">Official</option>
                    <option value="Sample">Sample</option>
                    <option value="Duplicate Copy">Duplicate Copy</option>
                    <option value="Confidential">Confidential</option>
                    <option value="ICST ISMS">ICST ISMS</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Opacity ({watermark.opacity})</label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.4"
                      step="0.02"
                      value={watermark.opacity}
                      onChange={(e) => setWatermark({ ...watermark, opacity: parseFloat(e.target.value) })}
                      className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rotation ({watermark.rotation}°)</label>
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      step="5"
                      value={watermark.rotation}
                      onChange={(e) => setWatermark({ ...watermark, rotation: parseInt(e.target.value) })}
                      className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Color Theme</label>
                    <input
                      type="color"
                      value={watermark.color}
                      onChange={(e) => setWatermark({ ...watermark, color: e.target.value })}
                      className="w-full h-8 p-1 border rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alignment Position</label>
                    <select
                      value={watermark.position}
                      onChange={(e) => setWatermark({ ...watermark, position: e.target.value })}
                      className="w-full border p-2 text-xs rounded-lg bg-slate-50"
                    >
                      <option value="diagonal">Diagonal Center</option>
                      <option value="top">Top Header</option>
                      <option value="bottom">Bottom Footer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* E4: Digital Signature Profile management */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                  <ImageIcon className="w-4 h-4 mr-1.5 text-blue-600" /> 2. Signature Profiles
                </h4>

                {/* Profiles List */}
                <div className="space-y-2 max-h-[140px] overflow-y-auto border p-2.5 rounded-xl bg-slate-50">
                  {sigProfiles.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-xs bg-white p-2 border rounded-lg">
                      <div>
                        <span className="font-bold text-slate-800">{p.name}</span>
                        <p className="text-slate-400 text-[10px]">{p.designation}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSetActiveProfile(p.id)}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                            p.is_active 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {p.is_active ? 'Active' : 'Set Active'}
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(p.id)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Signature Profile */}
                <div className="border border-dashed p-3 rounded-xl space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Create Profile</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newSigName}
                      onChange={(e) => setNewSigName(e.target.value)}
                      className="border p-2 text-xs rounded-lg w-full"
                    />
                    <input
                      type="text"
                      placeholder="Designation"
                      value={newSigDesignation}
                      onChange={(e) => setNewSigDesignation(e.target.value)}
                      className="border p-2 text-xs rounded-lg w-full"
                    />
                  </div>

                  <div className="space-y-1.5 text-[9px] font-bold text-slate-500">
                    <div className="flex justify-between items-center bg-slate-50 p-1 rounded border">
                      <span>Logo image:</span>
                      <label className="text-blue-600 hover:underline cursor-pointer">
                        {newSigLogo ? '✓ Uploaded' : 'Upload'}
                        <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'logo')} className="hidden" />
                      </label>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-1 rounded border">
                      <span>Signature Image:</span>
                      <label className="text-blue-600 hover:underline cursor-pointer">
                        {newSigImage ? '✓ Uploaded' : 'Upload'}
                        <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'sig')} className="hidden" />
                      </label>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-1 rounded border">
                      <span>Official Seal Image:</span>
                      <label className="text-blue-600 hover:underline cursor-pointer">
                        {newSigSeal ? '✓ Uploaded' : 'Upload'}
                        <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'seal')} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateProfile}
                    type="button"
                    className="w-full text-center bg-slate-100 hover:bg-slate-200 border text-xs py-1.5 rounded-lg font-bold text-slate-700 cursor-pointer"
                  >
                    Add Profile to List
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-xs px-4 py-2 rounded-xl"
              >
                Close
              </button>
              <button
                onClick={handleSaveSettings}
                className="text-white bg-blue-600 hover:bg-blue-500 text-xs px-4 py-2.5 rounded-xl font-bold shadow-md cursor-pointer"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
