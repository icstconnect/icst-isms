import React, { useState, useMemo } from 'react';
import { mockDb, Subject, Scholarship } from '../services/mockDb';
import { BookOpen, Plus, BookCheck, ClipboardCopy } from 'lucide-react';

export const Subjects: React.FC = () => {
  const scholarships = mockDb.getData<Scholarship>('scholarships');
  const [selectedSch, setSelectedSch] = useState(scholarships[0]?.id || '');
  const [subjects, setSubjects] = useState<Subject[]>(mockDb.getData<Subject>('subjects'));

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [fullMarks, setFullMarks] = useState(100);
  const [passMarks, setPassMarks] = useState(35);
  const [numQuestions, setNumQuestions] = useState(50);
  const [qType, setQType] = useState<'MCQ' | 'Written' | 'Mixed'>('MCQ');
  const [negMarking, setNegMarking] = useState(false);
  const [negValue, setNegValue] = useState(0.25);

  const activeSubjects = useMemo(() => {
    return subjects.filter(s => s.scholarship_id === selectedSch)
      .sort((a, b) => a.display_order - b.display_order);
  }, [subjects, selectedSch]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSub = mockDb.addRecord<Subject>('subjects', {
      scholarship_id: selectedSch,
      name,
      display_order: activeSubjects.length + 1,
      full_marks: fullMarks,
      pass_marks: passMarks,
      num_questions: numQuestions,
      question_type: qType,
      negative_marking: negMarking,
      negative_value: negMarking ? negValue : 0
    });

    setSubjects([...subjects, newSub]);
    setName('');
    setShowAddForm(false);
  };

  // Helper to load WBBSE group defaults
  const loadPredefinedWBBSE = () => {
    if (!selectedSch) return;
    
    // Check if subjects already added
    if (activeSubjects.length > 0) {
      if (!confirm("Add WBBSE predefined subjects? This will append to your current subject configurations.")) {
        return;
      }
    }

    const wbbseList = [
      { name: 'Bengali', display_order: 1, full_marks: 100, pass_marks: 35, num_questions: 50, question_type: 'MCQ' as const, negative_marking: false, negative_value: 0 },
      { name: 'English', display_order: 2, full_marks: 50, pass_marks: 18, num_questions: 25, question_type: 'MCQ' as const, negative_marking: true, negative_value: 0.25 },
      { name: 'Mathematics', display_order: 3, full_marks: 100, pass_marks: 35, num_questions: 50, question_type: 'MCQ' as const, negative_marking: true, negative_value: 0.25 },
      { name: 'Physical Science', display_order: 4, full_marks: 100, pass_marks: 35, num_questions: 50, question_type: 'MCQ' as const, negative_marking: false, negative_value: 0 },
      { name: 'Life Science', display_order: 5, full_marks: 100, pass_marks: 35, num_questions: 50, question_type: 'MCQ' as const, negative_marking: false, negative_value: 0 }
    ];

    const addedList: Subject[] = [];
    wbbseList.forEach(item => {
      const added = mockDb.addRecord<Subject>('subjects', {
        scholarship_id: selectedSch,
        ...item
      });
      addedList.push(added);
    });

    setSubjects([...subjects, ...addedList]);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-blue-600" />
            Subject Configurations
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Select a scholarship session and configure standard or custom testing subjects.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadPredefinedWBBSE}
            disabled={!selectedSch}
            className="flex items-center text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
          >
            <ClipboardCopy className="w-4 h-4 mr-1.5" />
            Load WBBSE Defaults
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={!selectedSch}
            className="flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Custom Subject
          </button>
        </div>
      </div>

      {/* Scholarship Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 max-w-sm flex items-center space-x-3 shadow-sm">
        <label className="text-xs font-bold text-slate-500 uppercase flex-shrink-0">Active Session:</label>
        <select
          value={selectedSch}
          onChange={(e) => setSelectedSch(e.target.value)}
          className="flex-1 bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
        >
          {scholarships.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>
          ))}
        </select>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 max-w-xl">
          <h3 className="text-lg font-bold text-slate-800">Add New Subject</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Subject Name</label>
              <input
                type="text"
                placeholder="e.g. Mathematics"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 p-2 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Question Type</label>
              <select
                value={qType}
                onChange={(e) => setQType(e.target.value as any)}
                className="w-full border border-slate-200 p-2 text-sm rounded-lg"
              >
                <option value="MCQ">MCQ (Multiple Choice)</option>
                <option value="Written">Written</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Full Marks</label>
              <input
                type="number"
                value={fullMarks}
                onChange={(e) => setFullMarks(Number(e.target.value))}
                className="w-full border border-slate-200 p-2 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Pass Marks</label>
              <input
                type="number"
                value={passMarks}
                onChange={(e) => setPassMarks(Number(e.target.value))}
                className="w-full border border-slate-200 p-2 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Total Questions</label>
              <input
                type="number"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full border border-slate-200 p-2 text-sm rounded-lg"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="neg"
                checked={negMarking}
                onChange={(e) => setNegMarking(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="neg" className="text-sm font-semibold text-slate-700">Enable Negative Marking</label>
            </div>
            {negMarking && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">Deduction value:</span>
                <input
                  type="number"
                  step="0.05"
                  value={negValue}
                  onChange={(e) => setNegValue(Number(e.target.value))}
                  className="w-20 border border-slate-200 p-1.5 text-xs rounded bg-white text-center"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-sm px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-white bg-blue-600 hover:bg-blue-500 text-sm px-4 py-2 rounded-lg"
            >
              Save Subject
            </button>
          </div>
        </form>
      )}

      {/* Subjects list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {activeSubjects.length > 0 ? (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">Order</th>
                <th className="p-4 font-semibold text-slate-600">Subject Name</th>
                <th className="p-4 font-semibold text-slate-600">Type</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Full Marks</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Pass Marks</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Questions</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Negative Deduction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeSubjects.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-mono font-bold text-slate-400">#{sub.display_order}</td>
                  <td className="p-4 font-bold text-slate-800 flex items-center">
                    <BookCheck className="w-4 h-4 mr-2 text-blue-600" />
                    {sub.name}
                  </td>
                  <td className="p-4 text-slate-500">{sub.question_type}</td>
                  <td className="p-4 text-center font-semibold text-slate-700">{sub.full_marks}</td>
                  <td className="p-4 text-center text-slate-600">{sub.pass_marks}</td>
                  <td className="p-4 text-center text-slate-600">{sub.num_questions}</td>
                  <td className="p-4 text-center">
                    {sub.negative_marking ? (
                      <span className="text-orange-600 font-bold text-xs bg-orange-50 px-2.5 py-0.5 rounded border border-orange-100">
                        -{sub.negative_value}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center">
            <BookOpen className="w-12 h-12 text-slate-200 mb-2" />
            <span className="text-sm font-semibold">No subjects configured for this session yet.</span>
            <span className="text-xs text-slate-400 mt-1">Load WBBSE defaults or add custom subjects to begin.</span>
          </div>
        )}
      </div>
    </div>
  );
};
