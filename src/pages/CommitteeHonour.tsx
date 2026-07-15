import React, { useState } from 'react';
import { mockDb, Profile } from '../services/mockDb';
import { Users, Mail, Phone, Calendar, ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CommitteeHonour: React.FC = () => {
  const navigate = useNavigate();
  const officials = mockDb.getData<Profile>('profiles').filter(p => p.status === 'Active');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const filteredOfficials = officials.filter(off => {
    const matchesSearch = off.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          off.designation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === '' || off.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white py-12 px-6 shadow-md relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between relative z-10">
          <div className="space-y-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-xs font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-wider mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Portal Access
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight">ICST Scholarship Committee</h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Meet the distinguished academicians, officers, and coordinators managing our scholarship and examination cycles.
            </p>
          </div>
          <div className="mt-6 md:mt-0 flex items-center space-x-2 bg-slate-800/80 px-4 py-3 rounded-2xl border border-slate-700">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Committee Size</div>
              <div className="text-lg font-black text-white">{officials.length} Active Members</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and List */}
      <div className="max-w-6xl mx-auto px-6 mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-slate-200 px-4 py-2 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
          >
            <option value="">All Roles</option>
            <option value="SuperAdmin">Super Admin</option>
            <option value="Admin">Admin</option>
            <option value="ScholarshipCoordinator">Coordinators</option>
            <option value="MarksEvaluator">Marks Evaluators</option>
          </select>
        </div>

        {filteredOfficials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredOfficials.map(off => (
              <div key={off.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl border-2 border-blue-200 shadow shadow-blue-600/10">
                      {off.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-slate-800 text-lg truncate">{off.name}</h3>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{off.designation}</p>
                    </div>
                  </div>

                  <p className="text-slate-500 text-sm mt-4 leading-relaxed">
                    Representing the ICST scholarship committee for academic governance, examination integrity, and regional operations.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-500">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-slate-400" />
                    <span>{off.email}</span>
                  </div>
                  {off.contact_number && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-slate-400" />
                      <span>{off.contact_number}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                    <span>Member since: {off.joining_date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-bold text-sm">No committee members match the current search query.</p>
          </div>
        )}
      </div>
    </div>
  );
};
