import React, { useState, useEffect } from 'react';
import { mockDb, Scholarship } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Award, Plus, Calendar, Pencil, Trash2, Loader2 } from 'lucide-react';
import { SkeletonCard } from '../components/Skeleton';

export const Scholarships: React.FC = () => {
  const [scholarships, setScholarships] = useState<Scholarship[]>(mockDb.getData<Scholarship>('scholarships'));
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [description, setDescription] = useState('');

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);

  // Fetch from Supabase on mount if configured
  useEffect(() => {
    const fetchLiveScholarships = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('scholarships')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (data) {
            setScholarships(data);
          }
        } catch (err) {
          console.error("Error fetching scholarships from Supabase:", err);
        }
      }
      setIsLoading(false);
    };
    fetchLiveScholarships();
  }, []);

  const clearForm = () => {
    setName('');
    setDescription('');
    setYear(new Date().getFullYear());
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    try {
      if (editingScholarship) {
        // Edit
        const updates = {
          name,
          academic_year: Number(year),
          description
        };

        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('scholarships')
            .update(updates)
            .eq('id', editingScholarship.id);
          if (error) throw error;
        }

        mockDb.updateRecord<Scholarship>('scholarships', editingScholarship.id, updates);
        setScholarships(scholarships.map(s => s.id === editingScholarship.id ? { ...s, ...updates } : s));
        setEditingScholarship(null);
        setShowAddForm(false);
        clearForm();
      } else {
        // Add
        const newSchData = {
          name,
          academic_year: Number(year),
          description,
          registration_start: new Date().toISOString(),
          registration_end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          admit_card_publish_date: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
          result_publish_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Draft' as const
        };

        let insertedId = `sch-${Date.now()}`;
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase
            .from('scholarships')
            .insert(newSchData)
            .select()
            .single();
          if (error) throw error;
          if (data) {
            insertedId = data.id;
          }
        }

        const newSch = mockDb.addRecord<Scholarship>('scholarships', {
          id: insertedId,
          ...newSchData
        });
        setScholarships([...scholarships, newSch]);
        setShowAddForm(false);
        clearForm();
      }
    } catch (err: any) {
      alert(err.message || "Failed to save scholarship.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (sch: Scholarship) => {
    setEditingScholarship(sch);
    setName(sch.name);
    setYear(sch.academic_year);
    setDescription(sch.description || '');
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scholarship? All related subjects, students, marks and logs will be permanently deleted.")) return;

    setDeletingId(id);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('scholarships')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }

      mockDb.deleteRecord('scholarships', id);
      setScholarships(scholarships.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete scholarship.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Scholarship['status']) => {
    setStatusChangingId(id);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('scholarships')
          .update({ status: newStatus })
          .eq('id', id);
        if (error) throw error;
      }

      const updated = mockDb.updateRecord<Scholarship>('scholarships', id, { status: newStatus });
      if (updated) {
        setScholarships(scholarships.map(s => s.id === id ? updated : s));
      }
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    } finally {
      setStatusChangingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Award className="w-6 h-6 mr-2 text-blue-600" />
            Scholarship Sessions
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage academic year examination sessions.</p>
        </div>
        <button
          onClick={() => {
            if (showAddForm) {
              setEditingScholarship(null);
              clearForm();
            }
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all"
        >
          <Plus className="w-5 h-5 mr-1" />
          {showAddForm ? 'Cancel' : 'Create Session'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddOrEdit} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 max-w-xl">
          <h3 className="text-lg font-bold text-slate-800">
            {editingScholarship ? 'Modify Scholarship Session' : 'Add Scholarship Session'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Session Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. ICST Scholarship 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 p-2 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Academic Year <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full border border-slate-200 p-2 text-sm rounded-lg"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Description</label>
            <textarea
              placeholder="Session details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-200 p-2 text-sm rounded-lg h-20"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setEditingScholarship(null);
                clearForm();
                setShowAddForm(false);
              }}
              className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-sm px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="text-white bg-blue-600 hover:bg-blue-500 text-sm px-4 py-2 rounded-lg flex items-center disabled:opacity-50 font-semibold"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editingScholarship ? (isSaving ? 'Saving Changes...' : 'Save Changes') : (isSaving ? 'Saving Session...' : 'Save Session')}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scholarships.map(s => (
          <div key={s.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative group">
            
            {/* Action buttons on card hover */}
            <div className="absolute top-4 right-4 flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleStartEdit(s)}
                disabled={deletingId !== null || statusChangingId !== null}
                title="Edit Session"
                className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 border border-slate-200 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deletingId !== null}
                title="Delete Session"
                className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 border border-red-100 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {deletingId === s.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded">Year {s.academic_year}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  s.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                  s.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' :
                  s.status === 'MarksEntry' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  {s.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mt-3 pr-16">{s.name}</h3>
              <p className="text-slate-500 text-sm mt-1">{s.description || 'No description provided.'}</p>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-slate-300" />
                Reg ends: {new Date(s.registration_end).toLocaleDateString()}
              </span>
              <div className="flex items-center space-x-2">
                {statusChangingId === s.id ? (
                  <div className="flex items-center space-x-1 text-blue-600 font-semibold">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  <>
                    {s.status === 'Draft' && (
                      <button
                        onClick={() => handleStatusChange(s.id, 'Active')}
                        className="text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Activate
                      </button>
                    )}
                    {s.status === 'Active' && (
                      <button
                        onClick={() => handleStatusChange(s.id, 'AdmitCardsGenerated')}
                        className="text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Generate Admit Cards
                      </button>
                    )}
                    {s.status === 'AdmitCardsGenerated' && (
                      <button
                        onClick={() => handleStatusChange(s.id, 'MarksEntry')}
                        className="text-amber-600 hover:underline font-semibold cursor-pointer"
                      >
                        Enable Marks Entry
                      </button>
                    )}
                    {s.status === 'MarksEntry' && (
                      <button
                        onClick={() => handleStatusChange(s.id, 'ResultsPublished')}
                        className="text-green-600 hover:underline font-semibold cursor-pointer"
                      >
                        Publish Results
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      )
    }
    </div>
  );
};
