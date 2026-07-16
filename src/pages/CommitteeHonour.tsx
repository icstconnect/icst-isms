import React, { useState, useMemo } from 'react';
import { mockDb, Profile } from '../services/mockDb';
import { 
  Users, 
  Mail, 
  Phone, 
  Calendar, 
  ArrowLeft, 
  Search, 
  List, 
  FolderGit, 
  ChevronRight, 
  ChevronDown 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CommitteeHonour: React.FC = () => {
  const navigate = useNavigate();
  const officials = mockDb.getData<Profile>('profiles').filter(p => p.status === 'Active');
  
  const [activeTab, setActiveTab] = useState<'list' | 'chart'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const filteredOfficials = officials.filter(off => {
    const matchesSearch = off.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          off.designation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === '' || off.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const toggleCollapseNode = (id: string) => {
    setCollapsedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // org node renderer for public view
  const renderOrgNode = (node: Profile, allNodes: Profile[]) => {
    const children = allNodes.filter(n => n.parent_id === node.id && n.status === 'Active');
    const isCollapsed = !!collapsedNodes[node.id];

    return (
      <div key={node.id} className="flex flex-col items-center relative pl-4">
        <div className="flex flex-col items-center bg-white border border-slate-200 rounded-2xl shadow-sm p-4 w-48 relative hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold border shadow-inner mb-2 flex-shrink-0 bg-slate-100">
            {node.photo_url ? (
              <img src={node.photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                {node.name.charAt(0)}
              </div>
            )}
          </div>
          <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-full">{node.name}</h4>
          <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{node.designation}</span>
          <span className="text-[8px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-100 mt-1.5 capitalize">
            {node.role.replace(/([A-Z])/g, ' $1').trim()}
          </span>

          {children.length > 0 && (
            <button
              onClick={() => toggleCollapseNode(node.id)}
              className="absolute bottom-[-10px] bg-slate-50 hover:bg-slate-100 border rounded-full p-0.5 text-slate-500 shadow-sm cursor-pointer"
            >
              {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {children.length > 0 && !isCollapsed && (
          <div className="flex flex-col md:flex-row gap-6 mt-6 border-t pt-6 justify-center">
            {children.map(child => renderOrgNode(child, allNodes))}
          </div>
        )}
      </div>
    );
  };

  // Find root nodes of the hierarchy
  const rootOfficials = useMemo(() => {
    return officials.filter(off => {
      if (!off.parent_id) return true;
      return !officials.some(o => o.id === off.parent_id);
    });
  }, [officials]);

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
          <div className="mt-6 md:mt-0 flex items-center space-x-6">
            {/* View tab switcher */}
            <div className="bg-slate-800/80 p-0.5 border border-slate-700 rounded-xl flex items-center shadow-inner">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  activeTab === 'list' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5 mr-1" /> List View
              </button>
              <button
                onClick={() => setActiveTab('chart')}
                className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  activeTab === 'chart' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderGit className="w-3.5 h-3.5 mr-1" /> Org Tree
              </button>
            </div>

            <div className="flex items-center space-x-2 bg-slate-800/80 px-4 py-3 rounded-2xl border border-slate-700">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Committee Size</div>
                <div className="text-lg font-black text-white">{officials.length} Active Members</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="max-w-6xl mx-auto px-6 mt-8">
        {activeTab === 'list' ? (
          <>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                {filteredOfficials.map(off => (
                  <div key={off.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center font-bold border-2 border-blue-200 shadow shadow-blue-600/10 bg-slate-100 flex-shrink-0">
                          {off.photo_url ? (
                            <img src={off.photo_url} alt="Official Photo" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
                              {off.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-slate-800 text-lg truncate">{off.name}</h3>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{off.designation}</p>
                        </div>
                      </div>

                      <p className="text-slate-500 text-sm mt-4 leading-relaxed font-medium">
                        Committee Representative managing scholarship cycle parameters, regional coordination, and examination parameters.
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
          </>
        ) : (
          <div className="bg-white border rounded-2xl p-6 shadow-sm overflow-x-auto min-h-[500px] flex flex-col items-center py-12 animate-fade-in">
            {rootOfficials.length > 0 ? (
              <div className="flex flex-col md:flex-row gap-12 justify-center items-start min-w-[650px]">
                {rootOfficials.map(root => renderOrgNode(root, officials))}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-sm">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                No active committee structure configured.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
