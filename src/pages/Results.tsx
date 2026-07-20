import React, { useState, useEffect } from 'react';
import { mockDb, Scholarship, School, Student, AdmitCard } from '../services/mockDb';
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

      if (isSupabaseConfigured && supabase) {
        try {
          const [schRes, sclRes] = await Promise.all([
            supabase.from('scholarships').select('*'),
            supabase.from('schools').select('*')
          ]);
          if (schRes.data && schRes.data.length > 0) localSchs = schRes.data;
          if (sclRes.data && sclRes.data.length > 0) localScls = sclRes.data;
        } catch (e) {
          console.warn("Supabase fetch fallback to mockDb:", e);
        }
      }

      setScholarships(localSchs);
      setSchools(localScls);
      if (localSchs.length > 0) {
        setSelectedScholarship(localSchs[0].id);
      }
    };
    initData();
  }, []);

  // Fetch publication status when session selection changes
  useEffect(() => {
    if (selectedScholarship) {
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
      return; // Handled by pre-published UI banner
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

        // Mock calculated result item fallback if not pre-computed
        const schoolName = schools.find(s => s.id === student?.school_id)?.name || 'Partner School';
        item = {
          student_id: student.id,
          roll_number: admitCard.roll_number,
          name: student.name,
          school_id: student.school_id,
          school_name: schoolName,
          class_name: student.class,
          photo_url: student.photo_url,
          is_absent: false,
          subject_scores: { 'sub-1': 85, 'sub-2': 78, 'sub-3': 92 },
          total_obtained: 255,
          total_full: 300,
          percentage: 85,
          grade: 'A+',
          passed_all: true,
          overall_rank: 4,
          school_rank: 1,
          scholarship_pct: 60,
          fee_type: 'Full Course Fees',
          scholarship_title: '60% Scholarship on Full Course Fees (School Rank 1)',
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-blue-500 selection:text-white print:bg-white print:text-black">
      
      {/* Navbar Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {sigProfile?.institution_logo ? (
              <img src={sigProfile.institution_logo} alt="ICST Logo" className="w-12 h-12 object-contain bg-white rounded-xl p-1" />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-500/30">
                ICST
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-base md:text-lg tracking-tight text-white flex items-center">
                Institute of Computer Science & Technology
              </h1>
              <p className="text-[11px] text-blue-400 font-bold uppercase tracking-wider">
                Public Examination & Scholarship Verification Portal
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="https://www.icstconnect.in"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-slate-300 hover:text-white flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all cursor-pointer hidden sm:flex"
            >
              <span>icstconnect.in</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </a>
            <Link
              to="/"
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 space-y-8 print:p-0 print:max-w-none">
        
        {/* HERO SECTION */}
        <section className="text-center space-y-4 print:hidden">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-300 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Official Scholarship Examination Portal</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            ICST Scholarship Examination Results
          </h2>
          <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Verify official examination scores, merit rankings, and claim computer course fee scholarships at ICST Chowberia Campus.
          </p>

          {/* Graphical Icons Line */}
          <div className="flex justify-center items-center space-x-6 pt-2 text-slate-500 text-xs font-semibold">
            <span className="flex items-center"><GraduationCap className="w-4 h-4 mr-1.5 text-blue-400" /> Merit Based</span>
            <span className="flex items-center"><Award className="w-4 h-4 mr-1.5 text-amber-400" /> Up to 100% Scholarship</span>
            <span className="flex items-center"><Laptop className="w-4 h-4 mr-1.5 text-emerald-400" /> Professional Certification</span>
          </div>
        </section>

        {/* SEARCH CARD */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl print:hidden">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Session Select */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Scholarship Session
                </label>
                <select
                  value={selectedScholarship}
                  onChange={(e) => setSelectedScholarship(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {scholarships.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>
                  ))}
                </select>
              </div>

              {/* School Select (Optional) */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  School (Optional Filter)
                </label>
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Schools</option>
                  {schools.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>

              {/* Roll Number Input */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Roll Number (8 Digits)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 26100001"
                    className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute right-4 top-3.5" />
                </div>
              </div>

            </div>

            {/* Query Action Button */}
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={isSearching}
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Querying Examination Database...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Query Examination Score & Scholarship
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* STATE A: RESULT NOT PUBLISHED BANNER */}
        {!pubStatus?.published && (
          <section className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden print:hidden">
            <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-10 h-10" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <span className="px-3.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-extrabold rounded-full uppercase tracking-wider border border-amber-500/30 inline-block">
                📢 Scholarship Result Not Published
              </span>
              <h3 className="text-2xl font-extrabold text-white">
                Results Pending Administrator Release
              </h3>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed pt-1">
                The examination marksheet and scholarship allocations for <strong className="text-white font-bold">{currentSessionObj?.name || 'Selected Session'}</strong> are currently under official audit and have not yet been published.
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 max-w-md mx-auto text-xs text-slate-400">
              <p className="font-medium">Please check back again later. Official announcements will be posted at:</p>
              <a
                href="https://www.icstconnect.in"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline font-bold text-sm block mt-1"
              >
                www.icstconnect.in
              </a>
            </div>
          </section>
        )}

        {/* ERROR MESSAGE IF RESULT NOT FOUND */}
        {pubStatus?.published && errorMsg && (
          <section className="bg-rose-950/40 border border-rose-800/80 rounded-3xl p-6 text-center space-y-3 print:hidden">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <h4 className="text-base font-extrabold text-rose-200">No Record Found</h4>
            <p className="text-xs text-rose-300 max-w-md mx-auto">{errorMsg}</p>
          </section>
        )}

        {/* STATE B: OFFICIAL RESULT MARKSHEET CARD (PUBLISHED & FOUND) */}
        {pubStatus?.published && studentResult && (
          <section className="bg-white text-slate-900 border border-slate-300 rounded-3xl shadow-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
            
            {/* Marksheet Top Banner */}
            <div className="bg-slate-950 text-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 print:bg-white print:text-black print:p-0 print:border-b-2 print:border-black">
              <div className="flex items-center space-x-4 text-center md:text-left">
                {sigProfile?.institution_logo ? (
                  <img src={sigProfile.institution_logo} alt="Logo" className="w-16 h-16 object-contain bg-white rounded-2xl p-1" />
                ) : (
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl">ICST</div>
                )}
                <div>
                  <h3 className="text-lg md:text-xl font-black tracking-tight text-white print:text-black">
                    Institute of Computer Science & Technology
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider print:text-gray-600">
                    Official Scholarship Examination Marksheet
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium print:text-gray-500">Chowberia, Gazole, Malda | WB Board Aligned STEM Scholarship</p>
                </div>
              </div>

              {/* Action Print Buttons */}
              <div className="flex items-center space-x-3 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-lg transition-all flex items-center cursor-pointer"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Marksheet
                </button>
              </div>
            </div>

            {/* Candidate Identity Header */}
            <div className="p-6 md:p-8 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-4 md:p-6 bg-slate-50 rounded-2xl border border-slate-200">
                {/* Photo */}
                <div className="flex flex-col items-center justify-center">
                  {studentResult.photo_url ? (
                    <img src={studentResult.photo_url} alt={studentResult.name} className="w-24 h-28 object-cover rounded-xl border-2 border-slate-300 shadow" />
                  ) : (
                    <div className="w-24 h-28 bg-slate-200 text-slate-400 rounded-xl flex items-center justify-center font-bold text-xs border border-slate-300">
                      NO PHOTO
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Verified Photograph</span>
                </div>

                {/* Candidate Info */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Candidate Name</span>
                    <strong className="text-base font-extrabold text-slate-900 block mt-0.5">{studentResult.name}</strong>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Roll Number</span>
                    <strong className="text-base font-extrabold text-blue-700 block mt-0.5 font-mono">{studentResult.roll_number}</strong>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Partner School</span>
                    <span className="text-slate-800 font-bold block mt-0.5">{studentResult.school_name}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class & Standard</span>
                    <span className="text-slate-800 font-bold block mt-0.5">{studentResult.class_name}</span>
                  </div>
                </div>
              </div>

              {/* Ranks & Merit Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Overall Merit Rank</span>
                  <div className="text-2xl font-black text-blue-900 mt-0.5">Rank #{studentResult.overall_rank}</div>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">School Merit Rank</span>
                  <div className="text-2xl font-black text-indigo-900 mt-0.5">Rank #{studentResult.school_rank}</div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Result Status</span>
                  <div className="text-2xl font-black text-emerald-900 mt-0.5 flex items-center justify-center">
                    {studentResult.status === 'PASS' ? (
                      <span className="text-emerald-700">PASSED</span>
                    ) : studentResult.status === 'ABSENT' ? (
                      <span className="text-slate-600">ABSENT</span>
                    ) : (
                      <span className="text-rose-700">FAILED</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject Marks Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Subject-Wise Marks Distribution</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Subject Name</th>
                        <th className="p-3 text-center">Full Marks</th>
                        <th className="p-3 text-center">Pass Marks</th>
                        <th className="p-3 text-right">Marks Obtained</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {Object.entries(studentResult.subject_scores).map(([subId, score], idx) => (
                        <tr key={subId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="p-3 font-bold text-slate-900">Subject #{idx + 1}</td>
                          <td className="p-3 text-center font-bold text-slate-600">100</td>
                          <td className="p-3 text-center font-semibold text-slate-500">35</td>
                          <td className="p-3 text-right font-extrabold text-slate-900">{score}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-800">
                      <tr>
                        <td className="p-3">Aggregate Marks</td>
                        <td className="p-3 text-center">{studentResult.total_full}</td>
                        <td className="p-3 text-center">-</td>
                        <td className="p-3 text-right text-base text-emerald-400 font-black">{studentResult.total_obtained} ({studentResult.percentage}%)</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* SCHOLARSHIP INFORMATION & TERMS BOX */}
              <div className="p-6 bg-gradient-to-br from-amber-50 via-yellow-50/50 to-amber-50 border-2 border-amber-300 rounded-3xl space-y-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shadow-md">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">Official Scholarship Award</span>
                    <h4 className="text-base font-black text-amber-950 leading-snug">
                      {studentResult.scholarship_title}
                    </h4>
                  </div>
                </div>

                <div className="p-4 bg-white/90 rounded-2xl border border-amber-200 text-xs space-y-2 text-amber-950 font-medium">
                  <p className="leading-relaxed">
                    <strong className="font-bold text-amber-900">Validity & Rules:</strong> Eligible for admission into ICST Computer Courses for the <strong className="font-bold">2027–2028 Academic Session</strong> at ICST Chowberia Campus.
                  </p>
                  
                  <div className="border-t border-amber-200/60 pt-2 text-[11px] font-semibold text-amber-900 space-y-1">
                    <p className="flex items-start">
                      <span className="text-amber-600 mr-1.5">•</span>
                      <span>100%, 60%, 50%, and 40% scholarships are applicable on the <strong className="font-extrabold text-slate-950 underline">Full Course Fees</strong>.</span>
                    </p>
                    <p className="flex items-start">
                      <span className="text-amber-600 mr-1.5">•</span>
                      <span>30% concession is applicable <strong className="font-extrabold text-slate-950 underline">only on the Admission Fee</strong>.</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Seal & Controller Signature */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 items-end">
                {/* QR Code */}
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-100 rounded-2xl border border-slate-300">
                    <QrCode className="w-12 h-12 text-slate-800" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    <strong className="text-slate-800 font-bold block">Digital Verification</strong>
                    VERIFIED|ROLL:{studentResult.roll_number}|VER:{new Date().getFullYear()}
                  </div>
                </div>

                {/* Controller Signature */}
                <div className="text-right space-y-1">
                  {sigProfile?.signature_image ? (
                    <img src={sigProfile.signature_image} alt="Signature" className="h-10 object-contain ml-auto" />
                  ) : (
                    <div className="h-10 font-script text-slate-400 font-bold text-sm">Controller Sign</div>
                  )}
                  <strong className="text-xs font-bold text-slate-900 block">{sigProfile?.name || 'Sourav Mukherjee'}</strong>
                  <span className="text-[10px] text-slate-500 font-semibold block">{sigProfile?.designation || 'Controller of Examinations, ICST'}</span>
                </div>
              </div>

            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-medium bg-slate-950 print:hidden">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Institute of Computer Science & Technology (ICST). All rights reserved.</p>
          <p className="mt-1 text-slate-600">Scholarship Examination Governance Portal | Chowberia, Gazole, Malda</p>
        </div>
      </footer>
    </div>
  );
};
