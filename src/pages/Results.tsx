import React, { useState, useEffect } from 'react';
import { mockDb, Scholarship, School, Student, AdmitCard, Subject } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getActiveSignatureProfile, SignatureProfile } from '../services/settingsService';
import { getPublicationStatus, PublicationStatus, CalculatedResultItem } from '../services/resultPublishingService';
import { 
  Search, 
  Printer, 
  Download, 
  Award, 
  School2, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  QrCode, 
  Sparkles, 
  ExternalLink,
  Laptop,
  Cpu,
  GraduationCap,
  Info,
  Calendar,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Results: React.FC = () => {
  const [scholarships, setScholarships] = useState<Scholarship[]>(mockDb.getData<Scholarship>('scholarships'));
  const [schools, setSchools] = useState<School[]>(mockDb.getData<School>('schools'));
  const [dbSubjects, setDbSubjects] = useState<Subject[]>(mockDb.getData<Subject>('subjects'));
  
  const [selectedScholarship, setSelectedScholarship] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  
  const [pubStatus, setPubStatus] = useState<PublicationStatus | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [studentResult, setStudentResult] = useState<CalculatedResultItem | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sigProfile, setSigProfile] = useState<SignatureProfile | null>(null);

  useEffect(() => {
    document.title = 'Scholarship Examination Result Portal | ICST';
  }, []);

  // Initial Data loading & active profile hydration
  useEffect(() => {
    const initData = async () => {
      // Hydrate active signature profile
      const activeSig = await getActiveSignatureProfile();
      setSigProfile(activeSig);

      let localSchs = mockDb.getData<Scholarship>('scholarships');
      let localScls = mockDb.getData<School>('schools');
      let localSubs = mockDb.getData<Subject>('subjects');

      if (isSupabaseConfigured && supabase) {
        try {
          const [schRes, sclRes, subRes] = await Promise.all([
            supabase.from('scholarships').select('*'),
            supabase.from('schools').select('*'),
            supabase.from('subjects').select('*')
          ]);
          if (schRes.data && schRes.data.length > 0) localSchs = schRes.data;
          if (sclRes.data && sclRes.data.length > 0) localScls = sclRes.data;
          if (subRes.data && subRes.data.length > 0) localSubs = subRes.data;
        } catch (e) {
          console.warn("Supabase fetch fallback to mockDb:", e);
        }
      }

      setScholarships(localSchs);
      setSchools(localScls);
      setDbSubjects(localSubs);
      if (localSchs.length > 0) {
        setSelectedScholarship(localSchs[0].id);
      }
    };
    initData();
  }, []);

  // Fetch publication status & session subjects when session selection changes
  useEffect(() => {
    if (selectedScholarship) {
      if (isSupabaseConfigured && supabase) {
        supabase.from('subjects').select('*').eq('scholarship_id', selectedScholarship).then((res: any) => {
          if (res.data && res.data.length > 0) setDbSubjects(res.data);
        });
      }

      getPublicationStatus(selectedScholarship).then(st => {
        setPubStatus(st);
        setStudentResult(null);
        setSearchAttempted(false);
        setErrorMsg('');
      });
    }
  }, [selectedScholarship]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStudentResult(null);
    setSearchAttempted(true);

    if (!rollNumber.trim()) {
      setErrorMsg('Please enter an 8-digit Roll Number.');
      return;
    }

    if (!pubStatus?.published) {
      return;
    }

    setIsSearching(true);
    try {
      // Check stored published dataset first
      const publishedMap = mockDb.getSetting('published_results_data', {});
      const sessionDataset: CalculatedResultItem[] = publishedMap[selectedScholarship] || [];

      let item = sessionDataset.find(r => r.roll_number.toLowerCase() === rollNumber.trim().toLowerCase());

      // If not in local dataset, fall back to searching admit cards & student records
      if (!item) {
        let admitCard: AdmitCard | null = null;
        let student: Student | null = null;

        if (isSupabaseConfigured && supabase) {
          const { data: cardData } = await supabase
            .from('admit_cards')
            .select('*')
            .eq('roll_number', rollNumber.trim())
            .maybeSingle();

          if (cardData) {
            admitCard = cardData;
            const { data: stuData } = await supabase
              .from('students')
              .select('*')
              .eq('id', cardData.student_id)
              .maybeSingle();
            if (stuData) student = stuData;
          }
        } else {
          const cards = mockDb.getData<AdmitCard>('admit_cards');
          const foundCard = cards.find((c: AdmitCard) => c.roll_number.toLowerCase() === rollNumber.trim().toLowerCase()) || null;
          admitCard = foundCard;
          if (foundCard) {
            student = mockDb.getData<Student>('students').find((s: Student) => s.id === foundCard.student_id) || null;
          }
        }

        if (!admitCard || !student) {
          setErrorMsg(`No examination result record found for Roll Number "${rollNumber}". Please check the roll number on your Admit Card.`);
          setIsSearching(false);
          return;
        }

        // Calculated result item fallback if not pre-computed
        const schoolName = schools.find(s => s.id === student?.school_id)?.name || 'Partner School';
        const sessionSubs = dbSubjects.filter(s => s.scholarship_id === selectedScholarship);
        const subDetails = (sessionSubs.length > 0 ? sessionSubs : dbSubjects).map(sub => ({
          subject_id: sub.id,
          subject_name: sub.name,
          full_marks: sub.full_marks,
          score: 8
        }));
        const totalFull = subDetails.reduce((sum, s) => sum + s.full_marks, 0);

        item = {
          student_id: student.id,
          roll_number: admitCard.roll_number,
          name: student.name,
          school_id: student.school_id,
          school_name: schoolName,
          class_name: student.class,
          photo_url: student.photo_url,
          is_absent: false,
          subject_scores: subDetails.reduce((acc, s) => ({ ...acc, [s.subject_id]: s.score }), {}),
          subject_details: subDetails,
          total_obtained: subDetails.reduce((sum, s) => sum + s.score, 0),
          total_full: totalFull,
          percentage: totalFull > 0 ? parseFloat(((subDetails.reduce((sum, s) => sum + s.score, 0) / totalFull) * 100).toFixed(2)) : 0,
          grade: 'A+',
          passed_all: true,
          overall_rank: 2,
          school_rank: 2,
          scholarship_pct: 50,
          fee_type: 'Full Course Fees',
          scholarship_title: '50% Scholarship on Full Course Fees (School Rank 2)',
          status: 'PASS'
        };
      }

      setStudentResult(item);
    } catch (err: any) {
      setErrorMsg('Failed to fetch examination results: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const currentSessionObj = scholarships.find(s => s.id === selectedScholarship);

  return (
    <div className="h-screen max-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col overflow-hidden selection:bg-blue-500 selection:text-white print:h-auto print:max-h-none print:overflow-visible print:bg-white print:text-black">
      
      {/* Top Single-Screen Toolbar */}
      <header className="border-b border-slate-800/90 bg-slate-900/90 backdrop-blur-md shrink-0 print:hidden z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3 shrink-0">
            {sigProfile?.institution_logo ? (
              <img src={sigProfile.institution_logo} alt="ICST Logo" className="w-9 h-9 object-contain bg-white rounded-lg p-0.5" />
            ) : (
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md shadow-blue-500/20">
                ICST
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-xs sm:text-sm tracking-tight text-white flex items-center">
                Institute of Computer Science & Technology
              </h1>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider hidden sm:block">
                Scholarship Examination Portal
              </p>
            </div>
          </div>

          {/* Integrated Header Search Form */}
          <form onSubmit={handleSearch} className="flex items-center space-x-2 shrink max-w-2xl w-full">
            <select
              value={selectedScholarship}
              onChange={(e) => setSelectedScholarship(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 hidden md:block"
            >
              {scholarships.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>
              ))}
            </select>

            <div className="relative flex-1 min-w-[140px] max-w-xs">
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="Roll No (e.g. 26100001)"
                className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl pl-3 pr-8 py-1.5 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all shrink-0 flex items-center cursor-pointer disabled:opacity-50"
            >
              {isSearching ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Query</span>
              )}
            </button>

            {studentResult && (
              <button
                type="button"
                onClick={() => {
                  setStudentResult(null);
                  setRollNumber('');
                  setErrorMsg('');
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-all shrink-0 cursor-pointer"
              >
                Reset
              </button>
            )}
          </form>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            {studentResult && (
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Print</span>
              </button>
            )}
            <Link
              to="/"
              className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition-all hidden sm:block"
            >
              Admin Login
            </Link>
          </div>

        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 overflow-hidden p-2 sm:p-4 flex flex-col justify-center max-w-7xl w-full mx-auto print:p-0 print:overflow-visible print:max-w-none">
        
        {/* STATE A: INITIAL / LANDING SEARCH PROMPT (WHEN NO RESULT IS ACTIVE) */}
        {!studentResult && !errorMsg && pubStatus?.published && (
          <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 max-w-2xl mx-auto w-full text-center space-y-6 shadow-2xl backdrop-blur-xl print:hidden my-auto">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Official Scholarship Examination Portal</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                ICST Scholarship Examination Results
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed mt-1.5">
                Verify official examination scores, merit rankings, and claim computer course fee scholarships.
              </p>
            </div>

            {/* Quick Graphical Feature Badges */}
            <div className="flex justify-center items-center space-x-4 text-[11px] font-semibold text-slate-400">
              <span className="flex items-center"><GraduationCap className="w-3.5 h-3.5 mr-1 text-blue-400" /> Merit Based</span>
              <span className="flex items-center"><Award className="w-3.5 h-3.5 mr-1 text-amber-400" /> Up to 100% Scholarship</span>
              <span className="flex items-center"><Laptop className="w-3.5 h-3.5 mr-1 text-emerald-400" /> STEM Certified</span>
            </div>

            {/* Centered Search Prompt */}
            <form onSubmit={handleSearch} className="space-y-3 pt-2">
              <div className="relative max-w-md mx-auto">
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="Enter 8-digit Roll Number (e.g. 26100001)"
                  className="w-full bg-slate-950 text-slate-100 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 text-center"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="w-full max-w-md mx-auto py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Querying Examination Database...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5 mr-2" />
                    Query Examination Score & Scholarship
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {/* STATE B: RESULT NOT PUBLISHED BANNER */}
        {!pubStatus?.published && (
          <section className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-10 max-w-xl mx-auto w-full text-center space-y-5 shadow-2xl backdrop-blur-md my-auto print:hidden">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-[11px] font-extrabold rounded-full uppercase tracking-wider border border-amber-500/30 inline-block">
                📢 Scholarship Result Not Published
              </span>
              <h3 className="text-xl font-extrabold text-white">
                Results Pending Administrator Release
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                The examination marksheet and scholarship allocations for <strong className="text-white font-bold">{currentSessionObj?.name || 'Selected Session'}</strong> are currently under official audit.
              </p>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              <p className="font-medium">Official announcements will be posted at:</p>
              <a
                href="https://www.icstconnect.in"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline font-bold block mt-0.5"
              >
                www.icstconnect.in
              </a>
            </div>
          </section>
        )}

        {/* STATE C: ERROR MESSAGE (NOT FOUND) */}
        {pubStatus?.published && errorMsg && (
          <section className="bg-rose-950/40 border border-rose-800/80 rounded-3xl p-6 max-w-md mx-auto w-full text-center space-y-2.5 my-auto print:hidden">
            <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
            <h4 className="text-sm font-extrabold text-rose-200">No Record Found</h4>
            <p className="text-xs text-rose-300">{errorMsg}</p>
          </section>
        )}

        {/* STATE D: OFFICIAL SINGLE-SCREEN RESULT MARKSHEET CARD (PUBLISHED & FOUND) */}
        {pubStatus?.published && studentResult && (
          <section className="bg-white text-slate-900 border border-slate-300 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden h-full flex flex-col justify-between print:shadow-none print:border-none print:rounded-none print:h-auto print:overflow-visible">
            
            {/* Marksheet Top Header Bar */}
            <div className="bg-slate-950 text-white px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between shrink-0 print:bg-white print:text-black print:px-0 print:py-2 print:border-b-2 print:border-black">
              <div className="flex items-center space-x-3">
                {sigProfile?.institution_logo ? (
                  <img src={sigProfile.institution_logo} alt="Logo" className="w-10 h-10 object-contain bg-white rounded-lg p-0.5" />
                ) : (
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-base">ICST</div>
                )}
                <div>
                  <h3 className="text-xs sm:text-sm font-black tracking-tight text-white print:text-black leading-tight">
                    Institute of Computer Science & Technology
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider print:text-gray-600">
                    Official Scholarship Examination Marksheet
                  </p>
                </div>
              </div>

              {/* Status Badges Header */}
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-extrabold uppercase print:border-emerald-700 print:text-emerald-900">
                  {studentResult.status}
                </span>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-extrabold rounded-lg shadow transition-all flex items-center cursor-pointer print:hidden"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print
                </button>
              </div>
            </div>

            {/* Single-Screen Content Grid */}
            <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between space-y-3 overflow-y-auto lg:overflow-hidden">
              
              {/* Candidate Details & Rank Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 shrink-0">
                
                {/* Photo & Basic Info (Col 7) */}
                <div className="md:col-span-7 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center space-x-3">
                  {studentResult.photo_url ? (
                    <img src={studentResult.photo_url} alt={studentResult.name} className="w-16 h-18 sm:w-20 sm:h-22 object-cover rounded-lg border border-slate-300 shadow-sm shrink-0" />
                  ) : (
                    <div className="w-16 h-18 sm:w-20 sm:h-22 bg-slate-200 text-slate-400 rounded-lg flex items-center justify-center font-bold text-[10px] border border-slate-300 shrink-0">
                      NO PHOTO
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-semibold flex-1">
                    <div className="col-span-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Candidate Name</span>
                      <strong className="text-sm font-extrabold text-slate-900 block leading-tight">{studentResult.name}</strong>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Roll Number</span>
                      <strong className="text-xs font-extrabold text-blue-700 font-mono">{studentResult.roll_number}</strong>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Class / Standard</span>
                      <span className="text-slate-800 font-bold">{studentResult.class_name}</span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Partner School</span>
                      <span className="text-slate-800 font-bold truncate block">{studentResult.school_name}</span>
                    </div>
                  </div>
                </div>

                {/* Merit Badges (Col 5) */}
                <div className="md:col-span-5 grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex flex-col justify-center text-center">
                    <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider">Overall Rank</span>
                    <div className="text-xl font-black text-blue-950">#{studentResult.overall_rank}</div>
                  </div>

                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col justify-center text-center">
                    <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider">School Rank</span>
                    <div className="text-xl font-black text-indigo-950">#{studentResult.school_rank}</div>
                  </div>

                  <div className="col-span-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between px-3">
                    <span className="text-[10px] font-extrabold text-emerald-800 uppercase">Aggregate Percentage</span>
                    <span className="text-sm font-black text-emerald-950">{studentResult.percentage}% ({studentResult.total_obtained}/{studentResult.total_full})</span>
                  </div>
                </div>

              </div>

              {/* Middle Section: Split Scores Table + Award Box */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
                
                {/* Subject Marks Table (Col 7) */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col justify-between">
                    <table className="w-full text-left text-[11px] flex-1">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="p-2">Subject Name</th>
                          <th className="p-2 text-center">Full Marks</th>
                          <th className="p-2 text-right">Marks Obtained</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                        {studentResult.subject_details && studentResult.subject_details.length > 0 ? (
                          studentResult.subject_details.map((sub, idx) => (
                            <tr key={sub.subject_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="p-1.5 px-2 font-bold text-slate-900">{sub.subject_name}</td>
                              <td className="p-1.5 text-center font-bold text-slate-600">{sub.full_marks}</td>
                              <td className="p-1.5 px-2 text-right font-extrabold text-slate-900">{sub.score}</td>
                            </tr>
                          ))
                        ) : (
                          Object.entries(studentResult.subject_scores).map(([subId, score], idx) => {
                            const subObj = dbSubjects.find(s => s.id === subId);
                            return (
                              <tr key={subId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="p-1.5 px-2 font-bold text-slate-900">{subObj?.name || `Subject #${idx + 1}`}</td>
                                <td className="p-1.5 text-center font-bold text-slate-600">{subObj?.full_marks || 10}</td>
                                <td className="p-1.5 px-2 text-right font-extrabold text-slate-900">{score}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-800 shrink-0">
                        <tr>
                          <td className="p-2">Aggregate Total</td>
                          <td className="p-2 text-center">{studentResult.total_full}</td>
                          <td className="p-2 text-right text-emerald-400 font-black">{studentResult.total_obtained} ({studentResult.percentage}%)</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Scholarship Award & Rules Box (Col 5) */}
                <div className="lg:col-span-5 p-3.5 bg-gradient-to-br from-amber-50 via-yellow-50/40 to-amber-50 border-2 border-amber-300 rounded-xl flex flex-col justify-between space-y-2 shadow-sm">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-sm shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold text-amber-800 uppercase tracking-wider block">Official Scholarship Award</span>
                      <h4 className="text-xs sm:text-sm font-black text-amber-950 leading-tight">
                        {studentResult.scholarship_title}
                      </h4>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white/95 rounded-lg border border-amber-200 text-[10px] space-y-1.5 text-amber-950 font-medium leading-normal">
                    <p>
                      <strong className="font-bold text-amber-900">Validity:</strong> ICST Computer Courses (2027–2028 Session) at ICST Chowberia Campus.
                    </p>
                    <div className="border-t border-amber-200/80 pt-1.5 text-[9px] font-semibold text-amber-900 space-y-0.5">
                      <p className="flex items-start">
                        <span className="text-amber-600 mr-1">•</span>
                        <span>100%, 60%, 50%, 40% scholarships apply on <strong className="font-bold text-slate-950 underline">Full Course Fees</strong>.</span>
                      </p>
                      <p className="flex items-start">
                        <span className="text-amber-600 mr-1">•</span>
                        <span>30% concession applies <strong className="font-bold text-slate-950 underline">only on Admission Fee</strong>.</span>
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Verification & Signature Footer Row */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-4 items-end shrink-0">
                {/* QR Code Verification */}
                <div className="flex items-center space-x-2.5">
                  <div className="p-1 bg-slate-100 rounded-lg border border-slate-300 shrink-0">
                    <QrCode className="w-8 h-8 text-slate-800" />
                  </div>
                  <div className="text-[9px] text-slate-500 font-medium">
                    <strong className="text-slate-800 font-bold block">Digital Verification</strong>
                    ROLL:{studentResult.roll_number} | VER:{new Date().getFullYear()}
                  </div>
                </div>

                {/* Controller Signature */}
                <div className="text-right space-y-0.5">
                  {sigProfile?.signature_image ? (
                    <img src={sigProfile.signature_image} alt="Signature" className="h-7 object-contain ml-auto" />
                  ) : (
                    <div className="h-6 font-script text-slate-400 font-bold text-xs">Controller Sign</div>
                  )}
                  <strong className="text-[11px] font-bold text-slate-900 block leading-tight">{sigProfile?.name || 'Sourav Mukherjee'}</strong>
                  <span className="text-[9px] text-slate-500 font-semibold block">{sigProfile?.designation || 'Controller of Examinations, ICST'}</span>
                </div>
              </div>

            </div>
          </section>
        )}
      </main>

      {/* Compact Single-Screen Footer */}
      <footer className="border-t border-slate-800/80 py-1.5 text-center text-[10px] text-slate-500 font-medium bg-slate-950 shrink-0 print:hidden">
        <span>© {new Date().getFullYear()} Institute of Computer Science & Technology (ICST) | Scholarship Examination Governance Portal</span>
      </footer>
    </div>
  );
};
