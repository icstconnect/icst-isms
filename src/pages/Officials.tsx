import React, { useState, useEffect } from 'react';
import { mockDb, Profile } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Users, Plus, Mail, Phone, Calendar, Pencil, Trash2, Key } from 'lucide-react';

export const Officials: React.FC = () => {
  const [officials, setOfficials] = useState<Profile[]>(mockDb.getData<Profile>('profiles'));
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOfficial, setEditingOfficial] = useState<Profile | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState<Profile['role']>('ScholarshipCoordinator');
  const [customUuid, setCustomUuid] = useState(''); // Custom UUID field for Supabase FK

  // Fetch officials from Supabase on mount if configured
  useEffect(() => {
    const fetchLiveOfficials = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: true });
          if (error) throw error;
          if (data) {
            setOfficials(data);
          }
        } catch (err) {
          console.error("Error fetching profiles from Supabase:", err);
        }
      }
    };
    fetchLiveOfficials();
  }, []);

  const clearForm = () => {
    setName('');
    setEmail('');
    setContact('');
    setDesignation('');
    setRole('ScholarshipCoordinator');
    setCustomUuid('');
  };

  const handleRegisterOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (editingOfficial) {
      // Edit Mode
      const updates = {
        name,
        email,
        contact_number: contact,
        designation,
        role
      };

      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', editingOfficial.id);
          if (error) throw error;
        } catch (err: any) {
          alert(err.message || "Failed to update profile in Supabase.");
          return;
        }
      }

      mockDb.updateRecord<Profile>('profiles', editingOfficial.id, updates);
      setOfficials(officials.map(o => o.id === editingOfficial.id ? { ...o, ...updates } : o));
      setEditingOfficial(null);
      setShowAddForm(false);
      clearForm();
    } else {
      // Add/Register Mode
      const targetId = customUuid.trim() || `usr-${officials.length + 1}`;
      
      const newOfficialData = {
        id: targetId,
        name,
        email,
        contact_number: contact,
        designation,
        joining_date: new Date().toISOString().split('T')[0],
        photo_url: null,
        role,
        status: 'Active' as const
      };

      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase
            .from('profiles')
            .insert(newOfficialData);
          if (error) {
            // Check for foreign key violation
            if (error.code === '23503') {
              alert("Error 23503: The specified UUID does not match any user in Supabase Auth. To register a profile, you must first create a User in your Supabase Dashboard under Authentication -> Users, and copy their User ID here.");
              return;
            }
            throw error;
          }
        } catch (err: any) {
          alert(err.message || "Failed to insert profile into Supabase.");
          return;
        }
      }

      const newOfficial = mockDb.addRecord<Profile>('profiles', newOfficialData);
      setOfficials([...officials, newOfficial]);
      setShowAddForm(false);
      clearForm();
    }
  };

  const handleStartEdit = (off: Profile) => {
    setEditingOfficial(off);
    setName(off.name);
    setEmail(off.email);
    setContact(off.contact_number || '');
    setDesignation(off.designation || '');
    setRole(off.role);
    setCustomUuid(off.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this official?")) return;

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (err: any) {
        alert(err.message || "Failed to delete official from Supabase.");
        return;
      }
    }

    mockDb.deleteRecord('profiles', id);
    setOfficials(officials.filter(off => off.id !== id));
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-600" />
            Committee Officials
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage and register Scholarship Committee Officials and Coordinators.</p>
        </div>
        <button
          onClick={() => {
            if (showAddForm) {
              setEditingOfficial(null);
              clearForm();
            }
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          {showAddForm ? 'Cancel' : 'Add Committee Member'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleRegisterOrEdit} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 max-w-xl">
          <h3 className="text-lg font-bold text-slate-800">
            {editingOfficial ? 'Modify Committee Member' : 'Register Committee Member'}
          </h3>
          
          {isSupabaseConfigured && !editingOfficial && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 mb-2">
              <div className="flex items-center text-xs font-bold text-blue-700 space-x-1.5 mb-1.5">
                <Key className="w-4 h-4" />
                <span>Supabase Live Account Matching</span>
              </div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Enter Supabase User ID (UUID) from Authentication Dashboard: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. d3c8ed0b-15b2-416c-8fb2-ccab1621f010"
                value={customUuid}
                onChange={(e) => setCustomUuid(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-xs rounded-lg bg-white"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Official Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Committee Designation <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Exam Superintendent"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Email Address <span className="text-red-500">*</span></label>
              <input
                type="email"
                placeholder="e.g. official@icst.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Contact Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                maxLength={10}
                placeholder="10 digits"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">System Access Role <span className="text-red-500">*</span></label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white"
            >
              <option value="SuperAdmin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="ScholarshipCoordinator">Scholarship Coordinator</option>
              <option value="MarksEvaluator">Marks Evaluator</option>
              <option value="Invigilator">Invigilator</option>
              <option value="DataEntryOperator">Data Entry Operator</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setEditingOfficial(null);
                clearForm();
                setShowAddForm(false);
              }}
              className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-sm px-5 py-2 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-white bg-blue-600 hover:bg-blue-500 text-sm px-5 py-2 rounded-xl shadow"
            >
              {editingOfficial ? 'Save Changes' : 'Register Member'}
            </button>
          </div>
        </form>
      )}

      {/* Grid of officials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {officials.map(off => (
          <div key={off.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative group">
            
            {/* Edit / Delete Buttons overlay in top-right */}
            <div className="absolute top-4 right-4 flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleStartEdit(off)}
                title="Edit Official"
                className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 border border-slate-200 cursor-pointer shadow-sm"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(off.id)}
                title="Delete Official"
                className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 border border-red-100 cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg border-2 border-blue-200 shadow">
                {off.name ? off.name.charAt(0) : '?'}
              </div>
              <div className="flex-1 min-w-0 pr-12">
                <h3 className="text-base font-bold text-slate-800 truncate">{off.name}</h3>
                <span className="text-xs font-semibold text-slate-400 block uppercase mt-0.5">{off.designation}</span>
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 capitalize border border-blue-100">
                  {off.role.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-slate-300" />
                {off.email}
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-slate-300" />
                {off.contact_number || 'N/A'}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-slate-300" />
                Joined: {off.joining_date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
