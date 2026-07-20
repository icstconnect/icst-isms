import React, { useState, useMemo, useEffect } from 'react';
import { 
  mockDb, 
  LoginHistory, 
  SecurityAlert, 
  Student, 
  Profile, 
  School,
  Scholarship 
} from '../services/mockDb';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  getPublicationStatus, 
  validateSessionPublication, 
  publishSessionResults, 
  unpublishSessionResults, 
  ValidationResult, 
  PublicationStatus 
} from '../services/resultPublishingService';
import { 
  ShieldAlert, 
  Lock, 
  HardDrive, 
  Search, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Trash2, 
  Sliders, 
  Archive, 
  Laptop, 
  Globe,
  Award,
  CheckCircle2,
  FileCheck,
  Send,
  EyeOff,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { DatePicker } from '../components/DatePicker';
import { SkeletonTable, SkeletonDashboard } from '../components/Skeleton';

export const Security: React.FC = () => {
  const { user } = useAuth();
  const { toast, showConfirm } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'login' | 'alerts' | 'storage' | 'publishing'>('login');
  
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Storage Quota limits
  const [quotaLimits, setQuotaLimits] = useState<any>({
    system_quota_mb: 500,
    session_quota_mb: 100,
    school_quota_mb: 20,
    user_quota_mb: 5
  });

  // Alert toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [pushAlerts, setPushAlerts] = useState(true);

  // Result Publishing states
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [selectedPublishSession, setSelectedPublishSession] = useState<string>('');
  const [pubStatus, setPubStatus] = useState<PublicationStatus | null>(null);
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showValidationReportModal, setShowValidationReportModal] = useState(false);
  const [showPublishConfirmModal, setShowPublishConfirmModal] = useState(false);

  // Re-fetch data
  const loadData = async () => {
    let localHistory = mockDb.getData<LoginHistory>('login_history');
    let localAlerts = mockDb.getData<SecurityAlert>('security_alerts');
    let localStudents = mockDb.getData<Student>('students');
    let localProfiles = mockDb.getData<Profile>('profiles');
    let localSchools = mockDb.getData<School>('schools');

    if (isSupabaseConfigured && supabase) {
      try {
        const [histRes, alrtRes, stuRes, profRes, sclRes] = await Promise.all([
          supabase.from('login_history').select('*').order('timestamp', { ascending: false }),
          supabase.from('security_alerts').select('*').order('timestamp', { ascending: false }),
          supabase.from('students').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('schools').select('*')
        ]);
        if (histRes.data) localHistory = histRes.data;
        if (alrtRes.data) localAlerts = alrtRes.data;
        if (stuRes.data) localStudents = stuRes.data;
        if (profRes.data) localProfiles = profRes.data;
        if (sclRes.data) localSchools = sclRes.data;
      } catch (err) {
        console.error("Error loading live security data from Supabase:", err);
      }
    }

    setLoginHistory(localHistory.sort((a,b)=> new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setSecurityAlerts(localAlerts.sort((a,b)=> new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setStudents(localStudents);
    setProfiles(localProfiles);
    setSchools(localSchools);

    let localSchs = mockDb.getData<Scholarship>('scholarships');
    if (isSupabaseConfigured && supabase) {
      const schRes = await supabase.from('scholarships').select('*');
      if (schRes.data) localSchs = schRes.data;
    }
    setScholarships(localSchs);
    if (localSchs.length > 0 && !selectedPublishSession) {
      setSelectedPublishSession(localSchs[0].id);
    }

    const storedQuotas = mockDb.getSetting('storage_quota', {
      system_quota_mb: 500,
      session_quota_mb: 100,
      school_quota_mb: 20,
      user_quota_mb: 5
    });
    setQuotaLimits(storedQuotas);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync Publication Status when session changes
  useEffect(() => {
    if (selectedPublishSession) {
      getPublicationStatus(selectedPublishSession).then(setPubStatus);
      validateSessionPublication(selectedPublishSession).then(setValidationData);
    }
  }, [selectedPublishSession]);

  // Validate session
  const handleRunValidation = async () => {
    if (!selectedPublishSession) return;
    setIsValidating(true);
    try {
      const res = await validateSessionPublication(selectedPublishSession);
      setValidationData(res);
      if (!res.isValid) {
        setShowValidationReportModal(true);
      } else {
        toast.success("Validation passed 100%! Ready to publish results.");
      }
    } catch (err: any) {
      toast.error("Validation error: " + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  // Publish Result Trigger
  const handleInitiatePublish = async () => {
    if (user?.role !== 'SuperAdmin') {
      toast.error("Permission denied: Only SuperAdmin can publish scholarship results.");
      return;
    }
    if (!selectedPublishSession) return;

    setIsValidating(true);
    const res = await validateSessionPublication(selectedPublishSession);
    setValidationData(res);
    setIsValidating(false);

    if (!res.isValid) {
      setShowValidationReportModal(true);
    } else {
      setShowPublishConfirmModal(true);
    }
  };

  // Confirm Publish Result
  const handleConfirmPublish = async () => {
    if (!selectedPublishSession) return;
    setIsPublishing(true);
    try {
      const result = await publishSessionResults(selectedPublishSession, user?.role || '', user?.name || 'SuperAdmin');
      toast.success(`Scholarship Result Published Successfully! (${result.totalPublished} candidate marksheets generated and published).`);
      setShowPublishConfirmModal(false);
      
      const newStatus = await getPublicationStatus(selectedPublishSession);
      setPubStatus(newStatus);
    } catch (err: any) {
      toast.error(err.message || "Failed to publish results.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Unpublish Result Trigger
  const handleUnpublish = () => {
    if (user?.role !== 'SuperAdmin') {
      toast.error("Permission denied: Only SuperAdmin can unpublish scholarship results.");
      return;
    }
    if (!selectedPublishSession) return;

    showConfirm({
      title: "Unpublish Scholarship Results?",
      message: "Are you sure you want to unpublish the scholarship results? Public results verification portal will display 'Result Not Published' for this session.",
      type: 'warning',
      confirmText: "Unpublish Results",
      onConfirm: async () => {
        setIsPublishing(true);
        try {
          await unpublishSessionResults(selectedPublishSession, user?.role || '', user?.name || 'SuperAdmin');
          toast.info("Scholarship Results unpublished. Public results portal is now hidden for this session.");
          const newStatus = await getPublicationStatus(selectedPublishSession);
          setPubStatus(newStatus);
        } catch (err: any) {
          toast.error(err.message || "Failed to unpublish results.");
        } finally {
          setIsPublishing(false);
        }
      }
    });
  };

  // Filter login logs
  const filteredLogins = useMemo(() => {
    return loginHistory.filter(log => {
      const matchesSearch = log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            log.ip_address.includes(searchQuery) ||
                            (log.location && log.location.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === '' || log.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [loginHistory, searchQuery, statusFilter]);

  // Export Login History CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User Email', 'IP Address', 'Device', 'Browser', 'OS', 'Location', 'Status', 'Failure Reason'];
    const rows = filteredLogins.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user_email,
      log.ip_address,
      log.device,
      log.browser,
      log.os,
      log.location || 'N/A',
      log.status,
      log.failed_reason || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ICST_LoginHistory_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Resolve Alert action
  const handleResolveAlert = async (id: string, comment: string) => {
    const updates = {
      status: 'Resolved' as const,
      remarks: comment || 'Resolved by administrator'
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('security_alerts').update(updates).eq('id', id);
        if (error) throw error;
      }

      mockDb.updateRecord<SecurityAlert>('security_alerts', id, updates);
      setSecurityAlerts(securityAlerts.map(a => a.id === id ? { ...a, ...updates } : a));
      toast.success("Alert resolved.");
    } catch (e: any) {
      toast.error("Failed to resolve alert: " + e.message);
    }
  };

  // Increase storage quotas (Admin only)
  const handleUpdateQuota = (field: string, val: number) => {
    const updated = {
      ...quotaLimits,
      [field]: val
    };
    setQuotaLimits(updated);
    mockDb.setSetting('storage_quota', updated);
  };

  // Actual Storage size calculations (aggregates base64 file string lengths)
  const storageUsageMB = useMemo(() => {
    let totalBytes = 0;
    
    // 1. Student photos
    students.forEach(s => {
      if (s.photo_url && s.photo_url.startsWith('data:image')) {
        const base64Str = s.photo_url.split(',')[1] || '';
        totalBytes += Math.round((base64Str.length * 3) / 4);
      }
    });

    // 2. Profile photos
    profiles.forEach(p => {
      if (p.photo_url && p.photo_url.startsWith('data:image')) {
        const base64Str = p.photo_url.split(',')[1] || '';
        totalBytes += Math.round((base64Str.length * 3) / 4);
      }
    });

    // 3. Digital Signatures, seals, logos in config
    const signatures = mockDb.getSetting('signature_profiles', []);
    signatures.forEach((p: any) => {
      if (p.signature_image && p.signature_image.startsWith('data:image')) {
        totalBytes += Math.round((p.signature_image.split(',')[1] || '').length * 0.75);
      }
      if (p.official_seal && p.official_seal.startsWith('data:image')) {
        totalBytes += Math.round((p.official_seal.split(',')[1] || '').length * 0.75);
      }
      if (p.institution_logo && p.institution_logo.startsWith('data:image')) {
        totalBytes += Math.round((p.institution_logo.split(',')[1] || '').length * 0.75);
      }
    });

    // Convert to Megabytes
    const used = totalBytes / 1024 / 1024;
    return parseFloat(used.toFixed(4));
  }, [students, profiles]);

  const quotaPct = useMemo(() => {
    if (quotaLimits.system_quota_mb <= 0) return 0;
    return Math.round((storageUsageMB / quotaLimits.system_quota_mb) * 100);
  }, [storageUsageMB, quotaLimits]);

  // Quota bar colors based on warning thresholds
  const quotaBarColor = useMemo(() => {
    if (quotaPct >= 95) return 'bg-red-600';
    if (quotaPct >= 90) return 'bg-orange-500';
    if (quotaPct >= 80) return 'bg-yellow-500';
    return 'bg-blue-600';
  }, [quotaPct]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Lock className="w-6 h-6 mr-2 text-blue-600" />
            Security & Storage Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Monitor user logins, manage security alerts, and configure storage quotas.</p>
        </div>

        {/* Export log actions */}
        {activeTab === 'login' && (
          <button
            onClick={handleExportCSV}
            disabled={filteredLogins.length === 0}
            className="flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export History CSV
          </button>
        )}
      </div>

      {/* Admin Tab Switcher */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('login')}
            className={`pb-3 cursor-pointer border-b-2 transition-all ${
              activeTab === 'login' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            User Login History (K2)
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`pb-3 cursor-pointer border-b-2 transition-all flex items-center ${
              activeTab === 'alerts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Security Threats & Alerts (K7)
            {securityAlerts.filter(a => a.status === 'Open').length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {securityAlerts.filter(a => a.status === 'Open').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`pb-3 cursor-pointer border-b-2 transition-all ${
              activeTab === 'storage' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            System Storage Quotas (M4)
          </button>
          <button
            onClick={() => setActiveTab('publishing')}
            className={`pb-3 cursor-pointer border-b-2 transition-all flex items-center ${
              activeTab === 'publishing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Send className="w-4 h-4 mr-1.5" />
            Result Publishing Controls (K8)
            {pubStatus?.published ? (
              <span className="ml-2 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center">
                🟢 Published
              </span>
            ) : (
              <span className="ml-2 bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center">
                🔴 Not Published
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* TAB 1: LOGIN HISTORY */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
          <SkeletonTable rows={5} cols={5} />
        </div>
      ) : (
        <>
          {activeTab === 'login' && (
            <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search user email, IP, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 px-3 py-2 rounded-lg text-xs bg-slate-50 focus:outline-none font-semibold text-slate-600"
            >
              <option value="">All Statuses</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {filteredLogins.length > 0 ? (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="p-4 font-semibold text-slate-600">Timestamp</th>
                    <th className="p-4 font-semibold text-slate-600">User Email</th>
                    <th className="p-4 font-semibold text-slate-600">IP Address</th>
                    <th className="p-4 font-semibold text-slate-600">Device / Browser</th>
                    <th className="p-4 font-semibold text-slate-600">OS / Location</th>
                    <th className="p-4 font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogins.map(log => {
                    const isSuccess = log.status === 'Success';
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-semibold text-slate-700 text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4 font-bold text-slate-800">{log.user_email}</td>
                        <td className="p-4 font-mono font-bold text-slate-600 flex items-center">
                          <Globe className="w-3.5 h-3.5 mr-1 text-slate-400" /> {log.ip_address}
                        </td>
                        <td className="p-4">
                          <div className="text-slate-800 font-semibold">{log.browser}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{log.device}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-800 font-semibold flex items-center text-xs">
                            <Laptop className="w-3.5 h-3.5 mr-1 text-slate-400" /> {log.os}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">{log.location || 'Unknown Location'}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col space-y-0.5">
                            {isSuccess ? (
                              <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 w-max">
                                Success
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 w-max">
                                Failed
                              </span>
                            )}
                            {log.failed_reason && (
                              <span className="text-[10px] text-red-500 italic max-w-[150px] truncate block" title={log.failed_reason}>
                                Reason: {log.failed_reason}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-400 font-medium">No user login logs recorded.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY ALERTS */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Alerts List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Suspicious Alerts</h3>
            {securityAlerts.length > 0 ? (
              <div className="space-y-4">
                {securityAlerts.map(alert => {
                  const isOpen = alert.status === 'Open';
                  const isCritical = alert.severity === 'Critical';
                  const isHigh = alert.severity === 'High';
                  const isMed = alert.severity === 'Medium';
                  
                  return (
                    <div key={alert.id} className={`bg-white border rounded-2xl p-5 shadow-sm space-y-3 relative border-l-4 ${
                      isCritical ? 'border-l-red-600' : isHigh ? 'border-l-orange-500' : isMed ? 'border-l-yellow-500' : 'border-l-blue-400'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              isCritical ? 'bg-red-100 text-red-700' : isHigh ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {alert.severity} Severity
                            </span>
                            {isOpen ? (
                              <span className="bg-red-50 text-red-600 text-[10px] font-bold px-1.5 rounded border border-red-100">Open</span>
                            ) : (
                              <span className="bg-green-50 text-green-700 text-[10px] font-bold px-1.5 rounded border border-green-100">Resolved</span>
                            )}
                          </div>
                          <h4 className="text-sm font-extrabold text-slate-800 mt-2">{alert.event}</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>

                      <p className="text-xs text-slate-500 font-medium">User: <strong>{alert.user_email}</strong></p>
                      
                      {alert.remarks && (
                        <p className="bg-slate-50 p-2 border rounded-lg text-xs italic text-slate-500">
                          Remarks: {alert.remarks}
                        </p>
                      )}

                      {isOpen && (
                        <div className="pt-2 text-right">
                          <button
                            onClick={() => {
                              const reason = prompt("Enter resolution comments:");
                              if (reason !== null) {
                                handleResolveAlert(alert.id, reason);
                              }
                            }}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
                          >
                            Resolve Alert
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border rounded-2xl p-12 text-center text-slate-400 font-semibold">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                No threat alerts detected. Your environment is secure!
              </div>
            )}
          </div>

          {/* Config Panel */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alert Configurations</h3>
            <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-5 text-sm font-semibold text-slate-700">
              
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Automated Warnings</span>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  SysAlert automatically triggers alerts on failed logins, unrecognized user devices, location changes, and excessive exports.
                </p>
              </div>

              <div className="border-t pt-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Alert Delivery Channels</span>
                
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                  />
                  Email Notifications (Future)
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsAlerts}
                    onChange={(e) => setSmsAlerts(e.target.checked)}
                    className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                  />
                  SMS Gateway Alerts (Future)
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushAlerts}
                    onChange={(e) => setPushAlerts(e.target.checked)}
                    className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                  />
                  Push Alerts in Console
                </label>
              </div>

              <div className="border-t pt-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
                <div className="flex items-center text-orange-600 mb-1">
                  <ShieldAlert className="w-4 h-4 mr-1" /> System Hardening active
                </div>
                Brute force protection locks coordinator login after 3 attempts.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM STORAGE QUOTAS */}
      {activeTab === 'storage' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Quota Progress */}
          <div className="lg:col-span-2 bg-white border rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">System Storage Consumption</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Aggregated database image asset sizes (Student Photos, Official Seals, and Signature Profiles).</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-600">Total Consumed: <strong className="text-slate-800">{storageUsageMB} MB</strong></span>
                <span className="text-slate-600">Quota Limit: <strong>{quotaLimits.system_quota_mb} MB</strong></span>
              </div>
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border">
                <div 
                  className={`h-full ${quotaBarColor} transition-all duration-300`} 
                  style={{ width: `${Math.min(quotaPct, 100)}%` }} 
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>{quotaPct}% Used</span>
                <span>{Math.max(0, quotaLimits.system_quota_mb - storageUsageMB).toFixed(3)} MB Remaining</span>
              </div>
            </div>

            {/* Warnings threshold banners */}
            {quotaPct >= 80 && (
              <div className={`p-4 border rounded-xl flex items-center space-x-3 text-xs ${
                quotaPct >= 95 
                  ? 'bg-red-50 text-red-700 border-red-200' 
                  : quotaPct >= 90 
                    ? 'bg-orange-50 text-orange-700 border-orange-200' 
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
              }`}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <strong className="font-extrabold block">Storage warning: usage exceeds {quotaPct >= 95 ? '95%' : quotaPct >= 90 ? '90%' : '80%'}!</strong>
                  <p className="font-medium mt-0.5 opacity-90">
                    {quotaPct >= 95 
                      ? 'Critical Warning: Candidate registration and photo upload capabilities will be blocked shortly. Please increase limits.' 
                      : 'Please consider increasing system quotas or archiving historical databases to prevent blockages.'}
                  </p>
                </div>
              </div>
            )}

            {/* Simulated Quotas Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Scholarship Session Quota</span>
                <div className="text-sm font-bold text-slate-800 mt-1">{quotaLimits.session_quota_mb} MB <span className="text-slate-400 font-normal text-xs">/ cycle</span></div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Per School Quota</span>
                <div className="text-sm font-bold text-slate-800 mt-1">{quotaLimits.school_quota_mb} MB <span className="text-slate-400 font-normal text-xs">/ school</span></div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Per Coordinator Quota</span>
                <div className="text-sm font-bold text-slate-800 mt-1">{quotaLimits.user_quota_mb} MB <span className="text-slate-400 font-normal text-xs">/ coordinator</span></div>
              </div>
            </div>
          </div>

          {/* Limit Config form */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configure Quota parameters</h3>
            <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
              
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">System-wide limit (MB)</label>
                <input
                  type="number"
                  value={quotaLimits.system_quota_mb}
                  onChange={(e) => handleUpdateQuota('system_quota_mb', parseInt(e.target.value) || 0)}
                  className="w-full border p-2 text-xs rounded-lg bg-slate-50 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Per Session limit (MB)</label>
                <input
                  type="number"
                  value={quotaLimits.session_quota_mb}
                  onChange={(e) => handleUpdateQuota('session_quota_mb', parseInt(e.target.value) || 0)}
                  className="w-full border p-2 text-xs rounded-lg bg-slate-50 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Per School limit (MB)</label>
                <input
                  type="number"
                  value={quotaLimits.school_quota_mb}
                  onChange={(e) => handleUpdateQuota('school_quota_mb', parseInt(e.target.value) || 0)}
                  className="w-full border p-2 text-xs rounded-lg bg-slate-50 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Per Coordinator limit (MB)</label>
                <input
                  type="number"
                  value={quotaLimits.user_quota_mb}
                  onChange={(e) => handleUpdateQuota('user_quota_mb', parseInt(e.target.value) || 0)}
                  className="w-full border p-2 text-xs rounded-lg bg-slate-50 font-bold"
                />
              </div>

              <div className="border-t pt-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Archival Operations</span>
                
                <button
                  type="button"
                  disabled
                  className="w-full bg-slate-100 text-slate-400 font-bold text-xs p-2 rounded-lg flex items-center justify-center cursor-not-allowed border"
                >
                  <Archive className="w-4 h-4 mr-1.5" />
                  Auto-Archive Old Sessions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RESULT PUBLISHING CONTROLS */}
      {activeTab === 'publishing' && (
        <div className="space-y-6">
          {/* Main Publishing Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-400/30">
                    Examination Governance
                  </span>
                  {pubStatus?.published ? (
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold flex items-center border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2" />
                      🟢 RESULT PUBLISHED
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs font-bold flex items-center border border-rose-500/30">
                      <span className="w-2 h-2 rounded-full bg-rose-500 mr-2" />
                      🔴 RESULT NOT PUBLISHED
                    </span>
                  )}
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold mt-3 tracking-tight">
                  Scholarship Examination Result Publishing System
                </h2>
                <p className="text-slate-300 text-xs md:text-sm mt-1.5 max-w-2xl leading-relaxed">
                  Official examination result release portal. Control public accessibility of student marksheets, overall ranks, school ranks, and scholarship certificates.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <button
                  onClick={handleRunValidation}
                  disabled={isValidating}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center cursor-pointer transition-all shadow-md"
                >
                  {isValidating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCheck className="w-4 h-4 mr-2 text-blue-400" />}
                  Run Publication Audit Check
                </button>

                {pubStatus?.published ? (
                  <button
                    onClick={handleUnpublish}
                    disabled={isPublishing}
                    className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-900/40 flex items-center justify-center cursor-pointer transition-all border border-rose-500"
                  >
                    {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <EyeOff className="w-4 h-4 mr-2" />}
                    Unpublish Result
                  </button>
                ) : (
                  <button
                    onClick={handleInitiatePublish}
                    disabled={isPublishing}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center cursor-pointer transition-all border border-emerald-500"
                  >
                    {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Publish Scholarship Result
                  </button>
                )}
              </div>
            </div>

            {/* Session Selector & Status Info */}
            <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="flex items-center space-x-3">
                <label className="font-bold text-slate-300">Scholarship Session:</label>
                <select
                  value={selectedPublishSession}
                  onChange={(e) => setSelectedPublishSession(e.target.value)}
                  className="bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-1.5 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {scholarships.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>
                  ))}
                </select>
              </div>

              {pubStatus?.published && (
                <div className="text-slate-400 text-[11px] font-medium flex items-center space-x-3">
                  <span>Published on: <strong className="text-slate-200">{new Date(pubStatus.published_at!).toLocaleString()}</strong></span>
                  <span>•</span>
                  <span>Authorizing Authority: <strong className="text-slate-200">{pubStatus.published_by}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Validation Metrics Dashboard */}
          {validationData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Candidates</span>
                <div className="text-2xl font-black text-slate-800 mt-1">{validationData.totalStudents}</div>
                <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">Enrolled in session</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Participating Schools</span>
                <div className="text-2xl font-black text-slate-800 mt-1">{validationData.totalSchools}</div>
                <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">Mapped institutions</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Present Candidates</span>
                <div className="text-2xl font-black text-emerald-700 mt-1">{validationData.totalPresent}</div>
                <span className="text-[10px] font-bold text-emerald-600/80 mt-0.5 block">Attendance verified</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Absent Candidates</span>
                <div className="text-2xl font-black text-slate-600 mt-1">{validationData.totalAbsent}</div>
                <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Auto-marked 0 / ABSENT</span>
              </div>
            </div>
          )}

          {/* Publication Requirements Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2 text-blue-600" />
              Pre-Publication Strict Validation Criteria (Government Standard)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-slate-600">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 font-bold block">100% Attendance Verified</strong>
                  Every candidate must be marked Present or Absent. Zero NULL attendance permitted.
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 font-bold block">Complete Subject Marks Entry</strong>
                  Present candidates must have scores for all configured subjects in valid score ranges.
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 font-bold block">Identity & Admit Card Check</strong>
                  Valid photo URL, roll number, and school mapping must exist for every candidate.
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 font-bold block">SuperAdmin Authority Only</strong>
                  Publishing locks marks entry, generates overall ranks, school ranks, and scholarship certificates.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )}

      {/* DETAILED VALIDATION REPORT MODAL */}
      {showValidationReportModal && validationData && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] animate-in fade-in">
          <div className="bg-white rounded-3xl border border-rose-200 max-w-xl w-full shadow-2xl p-6 md:p-8 relative overflow-hidden">
            <div className="flex items-start space-x-4">
              <div className="p-3.5 bg-rose-100 text-rose-600 rounded-2xl shrink-0">
                <XCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Cannot Publish Results</h3>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">
                  Publishing has been cancelled due to incomplete data validation checks.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 max-h-72 overflow-y-auto pr-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Problems Found ({validationData.issues.length}):</div>
              {validationData.issues.map((issue, idx) => (
                <div key={idx} className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <div className="text-xs">
                    <strong className="font-bold text-rose-950 block">{issue.title}</strong>
                    <p className="text-rose-800 mt-0.5 leading-relaxed">{issue.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Resolve these issues in Students, Attendance, and Marks Entry pages before attempting to publish again.</span>
              <button
                onClick={() => setShowValidationReportModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH CONFIRMATION MODAL */}
      {showPublishConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full shadow-2xl p-6 md:p-8 relative">
            <div className="flex items-start space-x-4">
              <div className="p-3.5 bg-emerald-100 text-emerald-600 rounded-2xl shrink-0">
                <Send className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Publish Scholarship Result?</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  This action will calculate overall ranks, school ranks, scholarship tiers, lock marks entry, and make results publicly visible on the verification portal.
                </p>
              </div>
            </div>

            <div className="my-5 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Scholarship Session:</span>
                <strong className="text-slate-900 font-bold">{scholarships.find(s => s.id === selectedPublishSession)?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Validated Candidates:</span>
                <strong className="text-slate-900 font-bold">{validationData?.totalStudents}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mapped Partner Schools:</span>
                <strong className="text-slate-900 font-bold">{validationData?.totalSchools}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                disabled={isPublishing}
                onClick={() => setShowPublishConfirmModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isPublishing}
                onClick={handleConfirmPublish}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center cursor-pointer disabled:opacity-50"
              >
                {isPublishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm & Publish Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
