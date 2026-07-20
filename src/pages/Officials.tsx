import React, { useState, useEffect, useMemo } from 'react';
import { mockDb, Profile, School } from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { 
  Users, 
  Plus, 
  Mail, 
  Phone, 
  Calendar, 
  Pencil, 
  Trash2, 
  Key, 
  ShieldAlert, 
  List, 
  FolderGit, 
  School as SchoolIcon, 
  ChevronRight, 
  ChevronDown, 
  Briefcase, 
  UserCheck 
} from 'lucide-react';
import { DatePicker } from '../components/DatePicker';
import { SkeletonCard } from '../components/Skeleton';
import { ImageUpload } from '../components/ImageUpload';

export const Officials: React.FC = () => {
  const [officials, setOfficials] = useState<Profile[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'chart'>('list');
  const [isLoading, setIsLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOfficial, setEditingOfficial] = useState<Profile | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState<Profile['role']>('ScholarshipCoordinator');
  const [customUuid, setCustomUuid] = useState(''); 
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  // H2 Hierarchy Form Fields
  const [parentId, setParentId] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<'Active' | 'Suspended'>('Active');
  const [historicalPositions, setHistoricalPositions] = useState<{ position: string; start_date: string; end_date: string }[]>([]);
  const [newHistPosition, setNewHistPosition] = useState('');
  const [newHistStart, setNewHistStart] = useState('');
  const [newHistEnd, setNewHistEnd] = useState('');

  // B2 Coordinator Form Fields
  const [assignedSchoolId, setAssignedSchoolId] = useState('');
  const [permissions, setPermissions] = useState<string[]>([
    'view_school',
    'register_students',
    'edit_students'
  ]);

  // Collapsed state map for the org tree

  // Collapsed state map for the org tree
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    let localProfiles = mockDb.getData<Profile>('profiles');
    let localSchools = mockDb.getData<School>('schools');

    if (isSupabaseConfigured && supabase) {
      try {
        const [profRes, sclRes] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: true }),
          supabase.from('schools').select('*')
        ]);
        if (profRes.data) localProfiles = profRes.data;
        if (sclRes.data) localSchools = sclRes.data;
      } catch (err) {
        console.error("Error loading live profiles:", err);
      }
    }

    setOfficials(localProfiles);
    setSchools(localSchools);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
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

  const clearForm = () => {
    setName('');
    setEmail('');
    setContact('');
    setDesignation('');
    setRole('ScholarshipCoordinator');
    setCustomUuid('');
    setPhotoUrl(null);
    setJoiningDate(new Date().toISOString().split('T')[0]);
    
    // Reset additions
    setParentId('');
    setDepartment('');
    setStatus('Active');
    setHistoricalPositions([]);
    setAssignedSchoolId('');
    setPermissions(['view_school', 'register_students', 'edit_students']);
  };

  const handleRegisterOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (!photoUrl) {
      alert("Please upload a profile photograph for the committee member.");
      return;
    }

    const updates = {
      name,
      email,
      contact_number: contact,
      designation,
      role,
      photo_url: photoUrl,
      joining_date: joiningDate,
      parent_id: parentId || undefined,
      department: department || undefined,
      status,
      historical_positions: historicalPositions,
      school_id: role === 'ScholarshipCoordinator' ? assignedSchoolId : undefined,
      permissions: role === 'ScholarshipCoordinator' ? permissions : undefined
    };

    if (editingOfficial) {
      // Edit Mode
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
      setEditingOfficial(null);
      setShowAddForm(false);
      clearForm();
    } else {
      // Add/Register Mode
      const targetId = customUuid.trim() || generateUUID();
      const newOfficialData = {
        id: targetId,
        ...updates
      };

      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase
            .from('profiles')
            .insert(newOfficialData);
          if (error) {
            if (error.code === '23503') {
              alert("Error 23503: The specified UUID does not match any user in Supabase Auth. Please match the UUID with Supabase Auth or disable Supabase sync offline.");
              return;
            }
            throw error;
          }
        } catch (err: any) {
          alert(err.message || "Failed to insert profile into Supabase.");
          return;
        }
      }

      mockDb.addRecord<Profile>('profiles', newOfficialData);
      setShowAddForm(false);
      clearForm();
    }
    loadData();
    alert("Official profile processed successfully.");
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

    // Set extensions
    setParentId(off.parent_id || '');
    setDepartment(off.department || '');
    setStatus(off.status || 'Active');
    setHistoricalPositions(off.historical_positions || []);
    setAssignedSchoolId(off.school_id || '');
    setPermissions(off.permissions || ['view_school', 'register_students', 'edit_students']);
    
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
    loadData();
  };

  const handleAddHistPosition = () => {
    if (!newHistPosition.trim() || !newHistStart) {
      alert("Position name and Start Date are required.");
      return;
    }
    setHistoricalPositions([
      ...historicalPositions,
      { position: newHistPosition, start_date: newHistStart, end_date: newHistEnd || 'Present' }
    ]);
    setNewHistPosition('');
    setNewHistStart('');
    setNewHistEnd('');
  };

  const handleRemoveHistPosition = (idx: number) => {
    setHistoricalPositions(historicalPositions.filter((_, i) => i !== idx));
  };

  const handleTogglePermission = (perm: string) => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter(p => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  // Node collapse toggle
  const toggleCollapseNode = (id: string) => {
    setCollapsedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // H2 Organization Chart Builder: Recursive render
  const renderOrgNode = (node: Profile, allNodes: Profile[]) => {
    const children = allNodes.filter(n => n.parent_id === node.id && n.status === 'Active');
    const isCollapsed = !!collapsedNodes[node.id];

    return (
      <div key={node.id} className="flex flex-col items-center relative pl-4">
        {/* Reporting line connector */}
        <div className="flex flex-col items-center bg-white border border-slate-200 rounded-2xl shadow-sm p-4 w-52 relative hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold border shadow-inner mb-2 flex-shrink-0">
            {node.photo_url ? (
              <img src={node.photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                {node.name.charAt(0)}
              </div>
            )}
          </div>
          <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-full">{node.name}</h4>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{node.designation}</span>
          <span className="text-[8px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-100 mt-1 capitalize">
            {node.role.replace(/([A-Z])/g, ' $1').trim()}
          </span>

          {node.department && (
            <span className="text-[8px] font-semibold text-slate-400 mt-1">Dept: {node.department}</span>
          )}

          {/* Children Expand/Collapse toggle */}
          {children.length > 0 && (
            <button
              onClick={() => toggleCollapseNode(node.id)}
              className="absolute bottom-[-10px] bg-slate-100 hover:bg-slate-200 border rounded-full p-0.5 text-slate-500 shadow-sm cursor-pointer"
            >
              {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Child nodes stack */}
        {children.length > 0 && !isCollapsed && (
          <div className="flex flex-col md:flex-row gap-6 mt-6 border-t border-slate-200 pt-6 justify-center">
            {children.map(child => renderOrgNode(child, allNodes))}
          </div>
        )}
      </div>
    );
  };

  // Find root nodes of the hierarchy (nodes whose parent_id matches no official in active list)
  const rootOfficials = useMemo(() => {
    return officials.filter(off => {
      if (off.status !== 'Active') return false;
      if (!off.parent_id) return true;
      return !officials.some(o => o.id === off.parent_id && o.status === 'Active');
    });
  }, [officials]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-600" />
            Committee Officials
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Manage, check hierarchy structure, and register Scholarship Committee members.</p>
        </div>
        <div className="flex space-x-2">
          {/* Tab switcher */}
          <div className="bg-slate-100 p-0.5 border rounded-xl flex items-center shadow-inner">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                activeTab === 'list' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List className="w-3.5 h-3.5 mr-1" /> List View
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                activeTab === 'chart' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FolderGit className="w-3.5 h-3.5 mr-1" /> Org Chart
            </button>
          </div>

          <button
            onClick={() => {
              if (showAddForm) {
                setEditingOfficial(null);
                clearForm();
              }
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 mr-1" />
            {showAddForm ? 'Cancel' : 'Add Committee Member'}
          </button>
        </div>
      </div>

      {/* Register / Edit Member Form */}
      {showAddForm && (
        <form onSubmit={handleRegisterOrEdit} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5 max-w-3xl">
          <h3 className="text-lg font-bold text-slate-800">
            {editingOfficial ? 'Modify Committee Member details' : 'Register Committee Member'}
          </h3>
          
          {isSupabaseConfigured && !editingOfficial && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
              <div className="flex items-center text-xs font-bold text-blue-700 space-x-1.5 mb-1">
                <Key className="w-4 h-4" />
                <span>Supabase Live Account Matching</span>
              </div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Enter Supabase User ID (UUID) from Authentication dashboard (Optional):
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

          {/* Photograph Upload */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <ImageUpload 
              photoUrl={photoUrl} 
              onPhotoChange={setPhotoUrl} 
              label="Official Photograph" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Full Name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Committee Designation <span className="text-red-500">*</span></label>
              <input type="text" placeholder="e.g. Secretary, Joint Secretary" value={designation} onChange={(e) => setDesignation(e.target.value)} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Email Address <span className="text-red-500">*</span></label>
              <input type="email" placeholder="e.g. official@icst.in" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Contact Number <span className="text-red-500">*</span></label>
              <input type="text" maxLength={10} placeholder="10 digits" value={contact} onChange={(e) => setContact(e.target.value)} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Joining Date <span className="text-red-500">*</span></label>
              <DatePicker value={joiningDate} onChange={(val) => setJoiningDate(val)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">System Role <span className="text-red-500">*</span></label>
              <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white">
                <option value="SuperAdmin">Super Admin</option>
                <option value="Admin">Admin</option>
                <option value="ScholarshipCoordinator">Scholarship Coordinator</option>
                <option value="MarksEvaluator">Marks Evaluator</option>
                <option value="Invigilator">Invigilator</option>
                <option value="DataEntryOperator">Data Entry Operator</option>
              </select>
            </div>

            {/* H2 Hierarchy Parent reporting fields */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Reports To (Manager)</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white"
              >
                <option value="">-- No Manager --</option>
                {officials.filter(o => o.id !== editingOfficial?.id).map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.designation})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Department</label>
              <input 
                type="text" 
                placeholder="e.g. Operations, Finance" 
                value={department} 
                onChange={(e) => setDepartment(e.target.value)} 
                className="w-full border border-slate-200 p-2.5 text-sm rounded-lg" 
              />
            </div>
          </div>

          {/* B2: Coordinator school and permissions assignment */}
          {role === 'ScholarshipCoordinator' && (
            <div className="bg-slate-50 p-4 border rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                <ShieldAlert className="w-4 h-4 mr-1.5 text-orange-500" /> Coordinator Assignments & Permissions
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Assign School <span className="text-red-500">*</span></label>
                  <select
                    value={assignedSchoolId}
                    onChange={(e) => setAssignedSchoolId(e.target.value)}
                    className="w-full border border-slate-200 p-2 text-xs rounded-lg bg-white"
                    required
                  >
                    <option value="">-- Choose School --</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.school_id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Toggled Permissions</label>
                  <div className="space-y-1.5 text-xs text-slate-600 font-semibold">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.includes('view_school')}
                        onChange={() => handleTogglePermission('view_school')}
                        className="mr-2 rounded border-slate-300 text-blue-600"
                      />
                      View Assigned School details
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.includes('register_students')}
                        onChange={() => handleTogglePermission('register_students')}
                        className="mr-2 rounded border-slate-300 text-blue-600"
                      />
                      Register / Enroll students
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.includes('edit_students')}
                        onChange={() => handleTogglePermission('edit_students')}
                        className="mr-2 rounded border-slate-300 text-blue-600"
                      />
                      Edit student profiles
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.includes('download_admit_cards')}
                        onChange={() => handleTogglePermission('download_admit_cards')}
                        className="mr-2 rounded border-slate-300 text-blue-600"
                      />
                      Download/Print Admit Cards
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.includes('view_schedules')}
                        onChange={() => handleTogglePermission('view_schedules')}
                        className="mr-2 rounded border-slate-300 text-blue-600"
                      />
                      View schedules
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.includes('view_results')}
                        onChange={() => handleTogglePermission('view_results')}
                        className="mr-2 rounded border-slate-300 text-blue-600"
                      />
                      View Results
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.includes('download_reports')}
                        onChange={() => handleTogglePermission('download_reports')}
                        className="mr-2 rounded border-slate-300 text-blue-600"
                      />
                      Download reports for own school
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* H2: Historical positions management */}
          <div className="bg-slate-50 p-4 border rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
              <UserCheck className="w-4 h-4 mr-1.5 text-blue-600" /> Committee History & Status
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Access</label>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value as any)} 
                  className="w-full border p-2 text-xs rounded-lg bg-white font-semibold"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended/Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Manage Position logs</span>
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" placeholder="Title/Position" value={newHistPosition} onChange={(e) => setNewHistPosition(e.target.value)} className="border p-2 text-xs rounded-lg" />
                  <input type="date" value={newHistStart} onChange={(e) => setNewHistStart(e.target.value)} className="border p-2 text-xs rounded-lg text-center" />
                  <div className="flex space-x-1">
                    <input type="date" value={newHistEnd} onChange={(e) => setNewHistEnd(e.target.value)} className="border p-2 text-xs rounded-lg text-center flex-1" />
                    <button type="button" onClick={handleAddHistPosition} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 rounded-lg text-xs cursor-pointer">+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Position logs render table */}
            {historicalPositions.length > 0 && (
              <div className="border bg-white rounded-lg p-2 max-h-[120px] overflow-y-auto">
                <table className="w-full text-left text-[11px] font-semibold text-slate-600">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-1">Position / Office</th>
                      <th className="pb-1">Start Date</th>
                      <th className="pb-1">End Date</th>
                      <th className="pb-1 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalPositions.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-1 text-slate-800 font-bold">{item.position}</td>
                        <td className="py-1 font-mono">{item.start_date}</td>
                        <td className="py-1 font-mono">{item.end_date}</td>
                        <td className="py-1 text-right">
                          <button type="button" onClick={() => handleRemoveHistPosition(idx)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
              className="text-white bg-blue-600 hover:bg-blue-500 text-sm px-5 py-2.5 rounded-xl shadow font-semibold cursor-pointer"
            >
              {editingOfficial ? 'Save Changes' : 'Register Member'}
            </button>
          </div>
        </form>
      )}

      {/* Tab block: List View */}
      {activeTab === 'list' && (
        isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {officials.map(off => {
            const reportingName = officials.find(o => o.id === off.parent_id)?.name;
            const schAssigned = schools.find(s => s.id === off.school_id)?.name;
            return (
              <div key={off.id} className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative group ${
                off.status === 'Suspended' ? 'opacity-70 bg-slate-50/50' : ''
              }`}>
                
                {/* Actions overlay */}
                <div className="absolute top-4 right-4 flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(off)}
                    title="Edit Official"
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 border border-slate-200 cursor-pointer shadow-sm animate-fade-in"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(off.id)}
                    title="Delete Official"
                    className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 border border-red-100 cursor-pointer shadow-sm animate-fade-in"
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
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 capitalize border border-blue-100/50">
                        {off.role.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      {off.status === 'Suspended' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100/50">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-2 text-slate-500 font-semibold">
                  {off.department && (
                    <div className="flex items-center text-slate-700">
                      <Briefcase className="w-4 h-4 mr-2 text-slate-400" />
                      <span>Dept: <strong className="text-slate-800">{off.department}</strong></span>
                    </div>
                  )}
                  {reportingName && (
                    <div className="flex items-center text-slate-700">
                      <Users className="w-4 h-4 mr-2 text-slate-400" />
                      <span>Manager: <strong className="text-slate-800">{reportingName}</strong></span>
                    </div>
                  )}
                  {schAssigned && (
                    <div className="flex items-center text-slate-700">
                      <SchoolIcon className="w-4 h-4 mr-2 text-slate-400 inline" />
                      <span>School: <strong className="text-slate-800">{schAssigned}</strong></span>
                    </div>
                  )}
                  {off.historical_positions && off.historical_positions.length > 0 && (
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <span className="text-[9px] uppercase text-slate-400 block">Past roles</span>
                      {off.historical_positions.slice(0, 2).map((h, i) => (
                        <div key={i} className="text-[10px] text-slate-500 font-normal">
                          • {h.position} ({h.start_date.split('-')[0]} - {h.end_date.split('-')[0]})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-slate-300" />
                    {off.email}
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-slate-300" />
                    {off.contact_number || 'N/A'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )
      )}

      {/* Tab block: Org Chart View */}
      {activeTab === 'chart' && (
        isLoading ? (
          <div className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center justify-center py-12 animate-pulse space-y-4">
              <div className="w-40 h-20 bg-slate-200 rounded-xl" />
              <div className="w-1 h-8 bg-slate-100" />
              <div className="flex space-x-8">
                <div className="w-40 h-20 bg-slate-200 rounded-xl" />
                <div className="w-40 h-20 bg-slate-200 rounded-xl" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border rounded-2xl p-6 shadow-sm overflow-x-auto min-h-[500px]">
            <div className="flex flex-col items-center min-w-[700px] py-6">
              {rootOfficials.length > 0 ? (
              <div className="flex flex-col md:flex-row gap-12 justify-center items-start">
                {rootOfficials.map(root => renderOrgNode(root, officials))}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-sm">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                No active root committee members configured. Set Manager values to construct the tree hierarchy.
              </div>
            )}
          </div>
        </div>
        )
      )}


    </div>
  );
};
