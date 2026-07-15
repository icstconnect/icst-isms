import React, { useState, useEffect } from 'react';
import { mockDb, Profile } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Users, Plus, Mail, Phone, Calendar, Pencil, Trash2, Key } from 'lucide-react';
import { DatePicker } from '../components/DatePicker';

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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  // Photograph Cropping States
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1.0);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);

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

  const generateUUID = () => {
    if (typeof window.crypto?.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageSrc(reader.result as string);
        setCropScale(1.0);
        setCropX(0);
        setCropY(0);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropSave = () => {
    if (!tempImageSrc) return;

    const img = new Image();
    img.src = tempImageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 350;
      canvas.height = 450;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgRatio = img.width / img.height;
      const targetRatio = 175 / 225;
      let baseW = 175;
      let baseH = 225;
      if (imgRatio > targetRatio) {
        baseH = 225;
        baseW = 225 * imgRatio;
      } else {
        baseW = 175;
        baseH = 175 / imgRatio;
      }

      const dw = baseW * cropScale * 2;
      const dh = baseH * cropScale * 2;
      const dx = 175 + cropX * 2 - dw / 2;
      const dy = 225 + cropY * 2 - dh / 2;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 350, 450);
      ctx.drawImage(img, dx, dy, dw, dh);

      let quality = 0.8;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      let sizeKb = Math.round((dataUrl.split(',')[1].length * 3) / 4 / 1024);

      // Compress to stay under 100KB
      while (sizeKb > 100 && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        sizeKb = Math.round((dataUrl.split(',')[1].length * 3) / 4 / 1024);
      }

      setPhotoUrl(dataUrl);
      setShowCropper(false);
    };
  };

  const clearForm = () => {
    setName('');
    setEmail('');
    setContact('');
    setDesignation('');
    setRole('ScholarshipCoordinator');
    setCustomUuid('');
    setPhotoUrl(null);
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setTempImageSrc(null);
    setShowCropper(false);
  };

  const handleRegisterOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (!photoUrl) {
      alert("Please upload a profile photograph for the committee member.");
      return;
    }

    if (editingOfficial) {
      // Edit Mode
      const updates = {
        name,
        email,
        contact_number: contact,
        designation,
        role,
        photo_url: photoUrl,
        joining_date: joiningDate
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
      const targetId = customUuid.trim() || generateUUID();
      
      const newOfficialData = {
        id: targetId,
        name,
        email,
        contact_number: contact,
        designation,
        joining_date: joiningDate,
        photo_url: photoUrl,
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
    setPhotoUrl(off.photo_url || null);
    setJoiningDate(off.joining_date || new Date().toISOString().split('T')[0]);
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
                Enter Supabase User ID (UUID) from Authentication Dashboard (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. d3c8ed0b-15b2-416c-8fb2-ccab1621f010"
                value={customUuid}
                onChange={(e) => setCustomUuid(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-xs rounded-lg bg-white"
              />
            </div>
          )}

          {/* Photograph Upload (Mandatory) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden border border-slate-300 flex-shrink-0 flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center px-1">No Image</span>
              )}
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">
                Official Photograph <span className="text-red-500">*</span>
              </label>
              <p className="text-[10px] text-slate-400">Upload a recent professional photo (JPEG/PNG format, max 200KB).</p>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="file"
                  accept="image/*"
                  id="official-photo-file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="official-photo-file"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer shadow transition-colors"
                >
                  {photoUrl ? 'Change Photo' : 'Upload Photo'}
                </label>
                {photoUrl && (
                  <span className="text-[10px] font-bold text-green-600">✓ Uploaded</span>
                )}
              </div>
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Joining Date <span className="text-red-500">*</span></label>
              <DatePicker
                value={joiningDate}
                onChange={(val) => setJoiningDate(val)}
                required
              />
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
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold border-2 border-blue-200 shadow bg-slate-100 flex-shrink-0">
                {off.photo_url ? (
                  <img src={off.photo_url} alt="Official Photo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {off.name ? off.name.charAt(0) : '?'}
                  </div>
                )}
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

      {/* Photo Cropping Modal */}
      {showCropper && tempImageSrc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-slate-800 border-b pb-2">Crop Official Photograph</h3>
            
            {/* Aspect Ratio Box Mask: 3.5 to 4.5 */}
            <div className="flex justify-center">
              <div className="w-[175px] h-[225px] border-2 border-blue-500 rounded-lg overflow-hidden bg-slate-900 relative shadow-inner">
                <img
                  src={tempImageSrc}
                  alt="Source to crop"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) translate(${cropX}px, ${cropY}px) scale(${cropScale})`,
                    transformOrigin: 'center center',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    minWidth: '100%',
                    minHeight: '100%',
                    display: 'block',
                    pointerEvents: 'none'
                  }}
                />
                
                {/* Visual guidelines */}
                <div className="absolute inset-0 border border-white/20 pointer-events-none"></div>
                <div className="absolute top-1/3 left-0 right-0 border-b border-dashed border-white/20 pointer-events-none"></div>
                <div className="absolute top-2/3 left-0 right-0 border-b border-dashed border-white/20 pointer-events-none"></div>
                <div className="absolute left-1/3 top-0 bottom-0 border-r border-dashed border-white/20 pointer-events-none"></div>
                <div className="absolute left-2/3 top-0 bottom-0 border-r border-dashed border-white/20 pointer-events-none"></div>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3.5 text-xs font-semibold text-slate-600">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Zoom / Scale:</span>
                  <span className="font-mono text-slate-500">{cropScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={cropScale}
                  onChange={(e) => setCropScale(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Horizontal (Pan X):</span>
                  <span className="font-mono text-slate-500">{cropX}px</span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  value={cropX}
                  onChange={(e) => setCropX(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Vertical (Pan Y):</span>
                  <span className="font-mono text-slate-500">{cropY}px</span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  value={cropY}
                  onChange={(e) => setCropY(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end space-x-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowCropper(false)}
                className="text-slate-500 bg-slate-100 hover:bg-slate-200 text-xs px-4 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropSave}
                className="text-white bg-blue-600 hover:bg-blue-500 text-xs px-4 py-2 rounded-lg font-bold shadow-md"
              >
                Crop & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
