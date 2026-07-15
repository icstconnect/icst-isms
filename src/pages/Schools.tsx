import React, { useState, useEffect } from 'react';
import { mockDb, School } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { School as SchoolIcon, Plus, Mail, Phone, MapPin, Search, Pencil, Trash2, Loader2 } from 'lucide-react';

export const Schools: React.FC = () => {
  const [schools, setSchools] = useState<School[]>(mockDb.getData<School>('schools'));
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [udise, setUdise] = useState('');
  const [type, setType] = useState<'Primary' | 'UpperPrimary' | 'Secondary' | 'HigherSecondary'>('Secondary');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [block, setBlock] = useState('');
  const [pin, setPin] = useState('');
  const [hmName, setHmName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [filterQuery, setFilterQuery] = useState('');

  // Fetch schools from Supabase on mount if configured
  useEffect(() => {
    const fetchLiveSchools = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('schools')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (data) {
            setSchools(data);
          }
        } catch (err) {
          console.error("Error fetching schools from Supabase:", err);
        }
      }
    };
    fetchLiveSchools();
  }, []);

  const clearForm = () => {
    setName('');
    setUdise('');
    setAddress('');
    setDistrict('');
    setBlock('');
    setPin('');
    setHmName('');
    setContact('');
    setEmail('');
    setType('Secondary');
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !udise.trim() || isSaving) return;

    setIsSaving(true);
    try {
      if (editingSchool) {
        // Edit Mode
        const updates = {
          name,
          udise,
          type,
          address,
          district,
          block,
          pin,
          headmaster_name: hmName,
          contact_number: contact,
          email
        };

        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('schools')
            .update(updates)
            .eq('id', editingSchool.id);
          if (error) throw error;
        }

        mockDb.updateRecord<School>('schools', editingSchool.id, updates);
        setSchools(schools.map(s => s.id === editingSchool.id ? { ...s, ...updates } : s));
        setEditingSchool(null);
        setShowAddForm(false);
        clearForm();
      } else {
        // Add Mode
        const nextId = `SCH-${String(schools.length + 1).padStart(4, '0')}`;
        
        const newSchoolData = {
          school_id: nextId,
          name,
          udise,
          type,
          address,
          district,
          block,
          pin,
          headmaster_name: hmName,
          contact_number: contact,
          email
        };

        let insertedId = `scl-${Date.now()}`;
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase
            .from('schools')
            .insert(newSchoolData)
            .select()
            .single();
          if (error) throw error;
          if (data) {
            insertedId = data.id;
          }
        }

        const newSchool = mockDb.addRecord<School>('schools', {
          id: insertedId,
          ...newSchoolData
        });

        setSchools([...schools, newSchool]);
        setShowAddForm(false);
        clearForm();
      }
    } catch (err: any) {
      alert(err.message || "Failed to save school.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (scl: School) => {
    setEditingSchool(scl);
    setName(scl.name);
    setUdise(scl.udise);
    setType(scl.type);
    setAddress(scl.address);
    setDistrict(scl.district);
    setBlock(scl.block);
    setPin(scl.pin);
    setHmName(scl.headmaster_name);
    setContact(scl.contact_number);
    setEmail(scl.email);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this school? This will cascade delete all students, admit cards, and scores associated with this school.")) return;

    setDeletingId(id);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('schools')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }

      mockDb.deleteRecord('schools', id);
      setSchools(schools.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete school.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSchools = schools.filter(
    s => s.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
         s.udise.includes(filterQuery) || 
         s.school_id.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <SchoolIcon className="w-6 h-6 mr-2 text-blue-600" />
            Registered Schools
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage and register partner academic institutions.</p>
        </div>
        <button
          onClick={() => {
            if (showAddForm) {
              setEditingSchool(null);
              clearForm();
            }
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          {showAddForm ? 'Cancel' : 'Register School'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddOrEdit} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-800">
            {editingSchool ? 'Modify Registered School' : 'Register New School'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">School Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Kolkata Science Academy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">UDISE Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                maxLength={11}
                placeholder="11 digit code"
                value={udise}
                onChange={(e) => setUdise(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">School Classification <span className="text-red-500">*</span></label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white"
              >
                <option value="Primary">Primary</option>
                <option value="UpperPrimary">Upper Primary</option>
                <option value="Secondary">Secondary</option>
                <option value="HigherSecondary">Higher Secondary</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">District <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Kolkata"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Block <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Ward 82"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">PIN Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                maxLength={6}
                placeholder="6 digits"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">HM / Principal Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="HM Name"
                value={hmName}
                onChange={(e) => setHmName(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">School Address <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Full Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Official Email Address <span className="text-red-500">*</span></label>
              <input
                type="email"
                placeholder="e.g. school@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setEditingSchool(null);
                clearForm();
                setShowAddForm(false);
              }}
              className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-sm px-5 py-2 rounded-xl disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="text-white bg-blue-600 hover:bg-blue-500 text-sm px-5 py-2.5 rounded-xl shadow flex items-center font-semibold disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editingSchool ? (isSaving ? 'Saving Changes...' : 'Save Changes') : (isSaving ? 'Registering...' : 'Register School')}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by school, UDISE..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs font-semibold text-slate-400">Total: {filteredSchools.length} schools</span>
        </div>

        {filteredSchools.length > 0 ? (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">School ID</th>
                <th className="p-4 font-semibold text-slate-600">School Name</th>
                <th className="p-4 font-semibold text-slate-600">UDISE</th>
                <th className="p-4 font-semibold text-slate-600">Classification</th>
                <th className="p-4 font-semibold text-slate-600">HM/Principal</th>
                <th className="p-4 font-semibold text-slate-600">Contact Details</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchools.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-mono font-bold text-slate-400">{s.school_id}</td>
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{s.name}</div>
                    <div className="text-xs text-slate-400 flex items-center mt-0.5">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-300" />
                      {s.block}, {s.district} - {s.pin}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-600">{s.udise}</td>
                  <td className="p-4">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                      {s.type.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </td>
                  <td className="p-4 text-slate-700 font-medium">{s.headmaster_name}</td>
                  <td className="p-4 text-slate-500">
                    <div className="flex items-center text-xs">
                      <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-300" />
                      {s.contact_number}
                    </div>
                    <div className="flex items-center text-xs mt-1">
                      <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-300" />
                      {s.email}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end space-x-1.5">
                      <button
                        onClick={() => handleStartEdit(s)}
                        disabled={isSaving || deletingId !== null}
                        title="Edit School"
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 border border-slate-200 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId !== null}
                        title="Delete School"
                        className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 border border-red-100 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        {deletingId === s.id ? (
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
        ) : (
          <div className="p-12 text-center text-slate-400">
            No registered schools found.
          </div>
        )}
      </div>
    </div>
  );
};
