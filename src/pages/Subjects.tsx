import React, { useState, useMemo, useEffect } from 'react';
import { mockDb, Subject, Scholarship } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { BookOpen, Plus, BookCheck, ClipboardCopy, Pencil, Trash2, ChevronUp, ChevronDown, Layers, Loader2 } from 'lucide-react';
import { SkeletonTable } from '../components/Skeleton';

export const Subjects: React.FC = () => {
  const [dbScholarships, setDbScholarships] = useState<Scholarship[]>(mockDb.getData<Scholarship>('scholarships'));
  const [selectedSch, setSelectedSch] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>(mockDb.getData<Subject>('subjects'));
  const [isLoading, setIsLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [fullMarks, setFullMarks] = useState(100);
  const [passMarks, setPassMarks] = useState(35);
  const [numQuestions, setNumQuestions] = useState(50);
  const [qType, setQType] = useState<'MCQ' | 'Written' | 'Mixed'>('MCQ');
  const [negMarking, setNegMarking] = useState(false);
  const [negValue, setNegValue] = useState(0.25);

  // Marks Distribution states
  const [useDistribution, setUseDistribution] = useState(false);
  const [distItems, setDistItems] = useState<{ name: string; max_marks: number }[]>([]);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  // Fetch live subjects and scholarships from Supabase on mount
  useEffect(() => {
    const fetchLiveDetails = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const [subRes, schRes] = await Promise.all([
            supabase.from('subjects').select('*').order('display_order', { ascending: true }),
            supabase.from('scholarships').select('*').order('created_at', { ascending: false })
          ]);
          
          if (subRes.error) throw subRes.error;
          if (schRes.error) throw schRes.error;

          if (subRes.data) setSubjects(subRes.data);
          if (schRes.data) {
            setDbScholarships(schRes.data);
            if (schRes.data.length > 0) {
              setSelectedSch(schRes.data[0].id);
            }
          }
        } catch (err) {
          console.error("Error fetching live data from Supabase:", err);
        }
      } else {
        if (dbScholarships.length > 0) {
          setSelectedSch(dbScholarships[0].id);
        }
      }
      setIsLoading(false);
    };
    fetchLiveDetails();
  }, []);

  const activeSubjects = useMemo(() => {
    return subjects.filter(s => s.scholarship_id === selectedSch)
      .sort((a, b) => a.display_order - b.display_order);
  }, [subjects, selectedSch]);

  const totalExamMarks = useMemo(() => {
    return activeSubjects.reduce((sum, s) => sum + s.full_marks, 0);
  }, [activeSubjects]);

  const resetForm = () => {
    setName('');
    setFullMarks(100);
    setPassMarks(35);
    setNumQuestions(50);
    setQType('MCQ');
    setNegMarking(false);
    setNegValue(0.25);
    setUseDistribution(false);
    setDistItems([]);
    setEditingSubject(null);
  };

  const handleStartEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setName(sub.name);
    setFullMarks(sub.full_marks);
    setPassMarks(sub.pass_marks);
    setNumQuestions(sub.num_questions);
    setQType(sub.question_type);
    setNegMarking(sub.negative_marking);
    setNegValue(sub.negative_value || 0.25);
    
    if (sub.marks_distribution && sub.marks_distribution.length > 0) {
      setUseDistribution(true);
      setDistItems(sub.marks_distribution);
    } else {
      setUseDistribution(false);
      setDistItems([]);
    }
    setShowAddForm(true);
  };

  const addDistItem = () => {
    setDistItems([...distItems, { name: '', max_marks: 10 }]);
  };

  const updateDistItem = (index: number, field: 'name' | 'max_marks', value: any) => {
    const updated = [...distItems];
    updated[index] = {
      ...updated[index],
      [field]: field === 'max_marks' ? Number(value) : value
    };
    setDistItems(updated);
  };

  const removeDistItem = (index: number) => {
    setDistItems(distItems.filter((_, i) => i !== index));
  };

  // Auto-update Full Marks when distribution items change
  const computedFullMarks = useMemo(() => {
    if (useDistribution && distItems.length > 0) {
      return distItems.reduce((sum, item) => sum + item.max_marks, 0);
    }
    return fullMarks;
  }, [useDistribution, distItems, fullMarks]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalFullMarks = computedFullMarks;
    if (passMarks > finalFullMarks) {
      alert("Pass Marks cannot be greater than Full Marks.");
      return;
    }

    const subData = {
      scholarship_id: selectedSch,
      name,
      display_order: editingSubject ? editingSubject.display_order : activeSubjects.length + 1,
      full_marks: finalFullMarks,
      pass_marks: passMarks,
      num_questions: numQuestions,
      question_type: qType,
      negative_marking: negMarking,
      negative_value: negMarking ? negValue : 0,
      marks_distribution: useDistribution && distItems.length > 0 ? distItems : null
    };

    setIsSaving(true);
    try {
      if (editingSubject) {
        // Update Mode
        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('subjects')
            .update(subData)
            .eq('id', editingSubject.id);
          if (error) throw error;
        }

        mockDb.updateRecord<Subject>('subjects', editingSubject.id, subData);
        setSubjects(subjects.map(s => s.id === editingSubject.id ? { ...s, ...subData } : s));
      } else {
        // Add Mode
        let insertedId = `sub-${Date.now()}`;
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase
            .from('subjects')
            .insert(subData)
            .select()
            .single();
          if (error) throw error;
          if (data) {
            insertedId = data.id;
          }
        }

        const newSub = mockDb.addRecord<Subject>('subjects', {
          id: insertedId,
          ...subData
        });
        setSubjects([...subjects, newSub]);
      }

      setShowAddForm(false);
      resetForm();
    } catch (err: any) {
      alert(err.message || "Failed to save subject.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject? All related candidate marks will be permanently deleted.")) return;

    setDeletingId(id);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('subjects')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }

      mockDb.deleteRecord('subjects', id);
      
      // Clean up local mock database student marks for this subject
      const allMarks = mockDb.getData<any>('marks');
      const filteredMarks = allMarks.filter((m: any) => m.subject_id !== id);
      mockDb.setData('marks', filteredMarks);

      setSubjects(subjects.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete subject.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMoveOrder = async (sub: Subject, direction: 'up' | 'down') => {
    const currentIndex = activeSubjects.findIndex(s => s.id === sub.id);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === activeSubjects.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetSub = activeSubjects[targetIndex];

    const currentOrder = sub.display_order;
    const targetOrder = targetSub.display_order;

    setMovingId(sub.id);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: err1 } = await supabase
          .from('subjects')
          .update({ display_order: targetOrder })
          .eq('id', sub.id);
        if (err1) throw err1;

        const { error: err2 } = await supabase
          .from('subjects')
          .update({ display_order: currentOrder })
          .eq('id', targetSub.id);
        if (err2) throw err2;
      }

      mockDb.updateRecord<Subject>('subjects', sub.id, { display_order: targetOrder });
      mockDb.updateRecord<Subject>('subjects', targetSub.id, { display_order: currentOrder });

      setSubjects(subjects.map(s => {
        if (s.id === sub.id) return { ...s, display_order: targetOrder };
        if (s.id === targetSub.id) return { ...s, display_order: currentOrder };
        return s;
      }));
    } catch (err: any) {
      alert(err.message || "Failed to reorder subjects.");
    } finally {
      setMovingId(null);
    }
  };

  const loadPredefinedWBBSE = async () => {
    if (!selectedSch) return;
    
    if (activeSubjects.length > 0) {
      if (!confirm("Add WBBSE predefined subjects? This will append to your current subject configurations.")) {
        return;
      }
    }

    const wbbseList = [
      { name: 'Bengali', display_order: activeSubjects.length + 1, full_marks: 100, pass_marks: 35, num_questions: 50, question_type: 'MCQ' as const, negative_marking: false, negative_value: 0, marks_distribution: null },
      { name: 'English', display_order: activeSubjects.length + 2, full_marks: 50, pass_marks: 18, num_questions: 25, question_type: 'MCQ' as const, negative_marking: true, negative_value: 0.25, marks_distribution: null },
      { name: 'Mathematics', display_order: activeSubjects.length + 3, full_marks: 100, pass_marks: 35, num_questions: 50, question_type: 'MCQ' as const, negative_marking: true, negative_value: 0.25, marks_distribution: null },
      { name: 'Physical Science', display_order: activeSubjects.length + 4, full_marks: 100, pass_marks: 35, num_questions: 50, question_type: 'MCQ' as const, negative_marking: false, negative_value: 0, marks_distribution: null },
      { name: 'Life Science', display_order: activeSubjects.length + 5, full_marks: 100, pass_marks: 35, num_questions: 50, question_type: 'MCQ' as const, negative_marking: false, negative_value: 0, marks_distribution: null }
    ];

    const insertData = wbbseList.map(item => ({
      scholarship_id: selectedSch,
      ...item
    }));

    setIsSaving(true);
    try {
      let addedList: Subject[] = [];

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('subjects')
          .insert(insertData)
          .select();
        if (error) throw error;
        if (data) {
          addedList = data;
        }
      } else {
        insertData.forEach(item => {
          const added = mockDb.addRecord<Subject>('subjects', item);
          addedList.push(added);
        });
      }

      if (isSupabaseConfigured && supabase) {
        addedList.forEach(item => {
          mockDb.addRecord<Subject>('subjects', item);
        });
      }

      setSubjects([...subjects, ...addedList]);
    } catch (err: any) {
      alert(err.message || "Failed to load predefined subjects.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-blue-600" />
            Subject Configurations
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Select a scholarship session and configure standard or custom testing subjects.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <button
            onClick={loadPredefinedWBBSE}
            disabled={!selectedSch || isSaving}
            className="flex items-center text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <ClipboardCopy className="w-4 h-4 mr-1.5" />
            )}
            {isSaving ? 'Loading...' : 'Load WBBSE Defaults'}
          </button>
          <button
            onClick={() => {
              if (showAddForm) resetForm();
              setShowAddForm(!showAddForm);
            }}
            disabled={!selectedSch}
            className="flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            {showAddForm && !editingSubject ? 'Cancel' : 'Add Custom Subject'}
          </button>
        </div>
      </div>

      {/* Scholarship Selector & Total Marks */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex-1 max-w-sm flex items-center space-x-3 shadow-sm">
          <label className="text-xs font-bold text-slate-500 uppercase flex-shrink-0">Active Session:</label>
          <select
            value={selectedSch}
            onChange={(e) => setSelectedSch(e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            {dbScholarships.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>
            ))}
          </select>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-3.5 rounded-xl flex items-center space-x-3 shadow-sm">
          <BookCheck className="w-5 h-5 text-blue-100" />
          <div>
            <div className="text-[10px] text-blue-100 font-bold uppercase tracking-wider">Total Exam Marks</div>
            <div className="text-base font-black leading-tight">{totalExamMarks} Marks</div>
          </div>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 max-w-xl">
          <h3 className="text-lg font-bold text-slate-800">
            {editingSubject ? `Edit Subject: ${editingSubject.name}` : 'Add New Subject'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Subject Name</label>
              <input
                type="text"
                placeholder="e.g. Mathematics"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Question Type</label>
              <select
                value={qType}
                onChange={(e) => setQType(e.target.value as any)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
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
                value={computedFullMarks}
                onChange={(e) => setFullMarks(Number(e.target.value))}
                disabled={useDistribution}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-slate-50 disabled:opacity-75"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Pass Marks</label>
              <input
                type="number"
                value={passMarks}
                onChange={(e) => setPassMarks(Number(e.target.value))}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Total Questions</label>
              <input
                type="number"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
          </div>

          {/* Marks Distribution Sub-form */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="use-dist"
                  checked={useDistribution}
                  onChange={(e) => {
                    setUseDistribution(e.target.checked);
                    if (e.target.checked && distItems.length === 0) {
                      setDistItems([{ name: 'MCQ', max_marks: 50 }, { name: 'Written', max_marks: 50 }]);
                    }
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="use-dist" className="text-sm font-semibold text-slate-700 flex items-center">
                  <Layers className="w-4 h-4 mr-1 text-slate-500" />
                  Subjectwise Marks Distribution
                </label>
              </div>
              {useDistribution && (
                <button
                  type="button"
                  onClick={addDistItem}
                  className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center"
                >
                  + Add Component
                </button>
              )}
            </div>

            {useDistribution && (
              <div className="space-y-2 mt-2">
                {distItems.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-3 bg-white p-2.5 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      placeholder="Component (e.g. MCQ, Practical)"
                      value={item.name}
                      onChange={(e) => updateDistItem(idx, 'name', e.target.value)}
                      className="flex-1 border border-slate-200 p-1.5 text-xs rounded"
                      required
                    />
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-slate-400">Max Marks:</span>
                      <input
                        type="number"
                        placeholder="Marks"
                        value={item.max_marks}
                        onChange={(e) => updateDistItem(idx, 'max_marks', e.target.value)}
                        className="w-16 border border-slate-200 p-1.5 text-xs rounded text-center font-bold"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDistItem(idx)}
                      className="text-red-500 hover:text-red-700 text-xs p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="text-[10px] text-slate-400 italic">
                  Note: Full Marks is locked to the sum of components ({computedFullMarks} marks).
                </div>
              </div>
            )}
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
                  className="w-20 border border-slate-200 p-1.5 text-xs rounded bg-white text-center font-bold"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
              className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-sm px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="text-white bg-blue-600 hover:bg-blue-500 text-sm px-4 py-2 rounded-lg font-semibold flex items-center disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editingSubject ? (isSaving ? 'Saving Changes...' : 'Save Changes') : (isSaving ? 'Saving Subject...' : 'Save Subject')}
            </button>
          </div>
        </form>
      )}

      {/* Subjects list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={4} cols={5} />
          </div>
        ) : activeSubjects.length > 0 ? (
          <div className="overflow-x-auto">
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
                  <th className="p-4 font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeSubjects.map((sub, index) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-slate-400">#{sub.display_order}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 flex items-center">
                        <BookCheck className="w-4 h-4 mr-2 text-blue-600" />
                        {sub.name}
                      </div>
                      {sub.marks_distribution && sub.marks_distribution.length > 0 && (
                        <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-1.5 pl-6">
                          {sub.marks_distribution.map((item, dIdx) => (
                            <span key={dIdx} className="bg-slate-100 px-1.5 py-0.5 rounded font-medium border border-slate-200/50">
                              {item.name}: {item.max_marks}
                            </span>
                          ))}
                        </div>
                      )}
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
                    <td className="p-4 text-right">
                      <div className="flex justify-end items-center space-x-1.5">
                        <button
                          onClick={() => handleMoveOrder(sub, 'up')}
                          disabled={index === 0 || movingId !== null}
                          title="Move Up"
                          className="p-1 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 rounded border border-slate-200 text-slate-500 cursor-pointer"
                        >
                          {movingId === sub.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleMoveOrder(sub, 'down')}
                          disabled={index === activeSubjects.length - 1 || movingId !== null}
                          title="Move Down"
                          className="p-1 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 rounded border border-slate-200 text-slate-500 cursor-pointer"
                        >
                          {movingId === sub.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleStartEdit(sub)}
                          disabled={isSaving || deletingId !== null || movingId !== null}
                          title="Edit Subject"
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 border border-slate-200 cursor-pointer shadow-sm ml-1 disabled:opacity-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          disabled={deletingId !== null}
                          title="Delete Subject"
                          className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 border border-red-100 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {deletingId === sub.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

