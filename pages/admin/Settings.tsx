
import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, Lock as LockIcon, 
  LogOut, Cloud, Database, Globe, Palette, Save,
  UploadCloud, DownloadCloud, Loader2, Map as MapIcon, Check,
  Users, Target, Building2, Car, Wallet, MapPin, Truck, Layers, RefreshCw, Eye,
  Phone, DollarSign, Plane, Briefcase as BriefcaseIcon, Clock, Calendar, X, EyeOff,
  MessageSquare, HardDrive, Bike, Megaphone, PhoneForwarded, Headset, ClipboardList,
  FileText, Activity, Map, ReceiptIndianRupee, Building, LayoutDashboard, ShieldCheck
} from 'lucide-react';
import { 
  HARDCODED_FIREBASE_CONFIG, HARDCODED_MAPS_API_KEY, getCloudDatabaseStats,
  syncToCloud, restoreFromCloud 
} from '../../services/cloudService';
import { useBranding } from '../../context/BrandingContext';

const Settings: React.FC = () => {
  const { companyName, primaryColor, updateBranding } = useBranding();
  const [stats, setStats] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<'Connected' | 'Disconnected' | 'Error'>('Disconnected');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [collectionStats, setCollectionStats] = useState<any[]>([]);

  const [brandName, setBrandName] = useState(companyName);
  const [brandColor, setBrandColor] = useState(primaryColor);

  const isMapsHardcoded = !!(HARDCODED_MAPS_API_KEY && HARDCODED_MAPS_API_KEY.length > 5);
  const [mapsKey, setMapsKey] = useState(HARDCODED_MAPS_API_KEY || localStorage.getItem('maps_api_key') || '');

  const [showCollectionViewer, setShowCollectionViewer] = useState(false);
  const [currentViewingCollection, setCurrentViewingCollection] = useState<string | null>(null);
  const [collectionContent, setCollectionContent] = useState<any[] | string | null>(null);
  const [collectionError, setCollectionError] = useState<string | null>(null);

  const [adminPasswords, setAdminPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showAdminPass, setShowAdminPass] = useState({ current: false, new: false });
  const [adminPassMsg, setAdminPassMsg] = useState({ type: '', text: '' });

  const isDbPermanent = !!(HARDCODED_FIREBASE_CONFIG.apiKey && HARDCODED_FIREBASE_CONFIG.apiKey.length > 5);

  useEffect(() => {
    try {
      checkConnection();
    } catch (e) {
      console.error("Connection check failed on mount", e);
    }
  }, []);

  const generateCollectionStats = (cloudData: any) => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    const isSuperAdmin = sessionId === 'admin';

    // List of modules to track for sync status
    const collections = [
        { key: 'dashboard_stats', label: 'Dashboard', icon: LayoutDashboard },
        { key: 'active_staff_locations', label: 'Live Tracking', icon: MapPin },
        { key: 'internal_messages_data', label: 'Boz Chat', icon: MessageSquare },
        { key: isSuperAdmin ? 'company_shifts' : `company_shifts_${sessionId}`, label: 'Employee Setting', icon: Clock },
        { key: 'analytics_cache', label: 'Reports', icon: FileText },
        { key: 'campaign_history', label: 'Email Marketing', icon: Megaphone },
        { key: isSuperAdmin ? 'auto_dialer_data' : `auto_dialer_data_${sessionId}`, label: 'Auto Dialer', icon: PhoneForwarded },
        { key: 'global_enquiries_data', label: 'Customer Care', icon: Headset },
        { key: isSuperAdmin ? 'trips_data' : `trips_data_${sessionId}`, label: 'Trip Booking', icon: Map },
        { key: isSuperAdmin ? 'driver_payment_records' : `driver_payment_records_${sessionId}`, label: 'Driver Payments', icon: ReceiptIndianRupee },
        { key: isSuperAdmin ? 'leads_data' : `leads_data_${sessionId}`, label: 'Franchisee Leads', icon: Target },
        { key: 'attendance_data_admin', label: 'Attendance Dashboard', icon: Activity },
        { key: isSuperAdmin ? 'tasks_data' : `tasks_data_${sessionId}`, label: 'Tasks', icon: ClipboardList },
        { key: isSuperAdmin ? 'staff_data' : `staff_data_${sessionId}`, label: 'Staff Management', icon: Users },
        { key: 'app_documents', label: 'Documents', icon: FileText },
        { key: isSuperAdmin ? 'branches_data' : `branches_data_${sessionId}`, label: 'Branches', icon: Building },
        { key: isSuperAdmin ? 'vendor_data' : `vendor_data_${sessionId}`, label: 'Vendor Attachment', icon: Car },
        { key: 'payroll_history', label: 'Payroll', icon: DollarSign },
        { key: 'office_expenses', label: 'Finance & Expenses', icon: HardDrive },
        { key: 'corporate_accounts', label: 'Corporate', icon: Building2 },
        { key: 'system_backup_logs', label: 'Data & Backup', icon: Database }
    ];

    return collections.map(col => {
        let localCount: string | number = 0;
        let localContent: any = null;
        let localStr: string | null = null;
        try {
            localStr = localStorage.getItem(col.key);
            if (localStr) {
                localContent = JSON.parse(localStr);
                localCount = Array.isArray(localContent) ? localContent.length : (typeof localContent === 'object' ? 1 : '1');
            }
        } catch(e) {
            localCount = localStr ? 'Raw' : 0;
            localContent = localStr;
        }

        let cloudCount: string | number = '-';
        if (cloudData && cloudData[col.key]) {
            cloudCount = cloudData[col.key].count || '0';
        }

        // Module is considered "Synced" if cloud exists for local data
        const isSynced = localCount === 0 || (localCount !== 0 && cloudCount !== '-');

        return {
            ...col,
            local: localCount,
            localContent: localContent,
            cloud: cloudCount,
            status: isSynced ? 'Live' : 'Syncing'
        };
    });
  };

  const checkConnection = async () => {
    try {
      const s = await getCloudDatabaseStats();
      const statsList = generateCollectionStats(s);
      setCollectionStats(statsList);

      if (s) {
        setStats(s);
        setDbStatus('Connected');
      } else {
        setDbStatus('Disconnected');
      }
    } catch (e) {
      console.error("Failed to check connection", e);
      setDbStatus('Error');
    }
  };

  const handleSaveBranding = () => {
    updateBranding({ companyName: brandName, primaryColor: brandColor });
    alert("Site settings saved!");
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
        const result = await syncToCloud();
        alert(result.message);
        checkConnection();
    } catch (e) {
        alert("Backup failed. Check internet connection.");
    }
    setIsBackingUp(false);
  };

  const handleRestore = async () => {
    if (window.confirm("⚠️ WARNING: Restoring will overwrite all current local data with data from the Cloud. Are you sure?")) {
        setIsRestoring(true);
        try {
            const result = await restoreFromCloud();
            alert(result.message);
            if (result.success) {
                window.location.reload();
            }
        } catch (e) {
            alert("Restore failed.");
        }
        setIsRestoring(false);
    }
  };

  const handleViewCollection = (collectionKey: string, content: any) => {
    setCurrentViewingCollection(collectionKey);
    setCollectionError(null);

    if (content === null || content === undefined || (typeof content === 'string' && content.trim() === '')) {
        setCollectionContent("No data available locally.");
    } else if (typeof content === 'string') {
        try {
            const parsed = JSON.parse(content);
            setCollectionContent(parsed);
        } catch (e) {
            setCollectionContent(content); 
            setCollectionError("Content is not valid JSON.");
        }
    } else {
        setCollectionContent(content);
    }
    setShowCollectionViewer(true);
  };

  const closeCollectionViewer = () => {
    setShowCollectionViewer(false);
    setCurrentViewingCollection(null);
    setCollectionContent(null);
    setCollectionError(null);
  };

  const handleAdminPasswordChange = (e: React.FormEvent) => {
      e.preventDefault();
      const storedPass = localStorage.getItem('admin_password') || '123456';
      if (adminPasswords.current !== storedPass) {
          setAdminPassMsg({ type: 'error', text: 'Current password incorrect.' });
          return;
      }
      if (adminPasswords.new.length < 6) {
          setAdminPassMsg({ type: 'error', text: 'Password must be at least 6 chars.' });
          return;
      }
      if (adminPasswords.new !== adminPasswords.confirm) {
          setAdminPassMsg({ type: 'error', text: 'New passwords do not match.' });
          return;
      }
      localStorage.setItem('admin_password', adminPasswords.new);
      setAdminPassMsg({ type: 'success', text: 'Password updated successfully!' });
      setAdminPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setAdminPassMsg({ type: '', text: '' }), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-gray-600" /> Site Settings
          </h2>
          <p className="text-gray-500">System configuration, branding, and cloud data manifest</p>
        </div>
        <div className={`px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 border ${
          dbStatus === 'Connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
          dbStatus === 'Error' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-gray-50 text-gray-700 border-gray-100'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${dbStatus === 'Connected' ? 'bg-emerald-500 animate-pulse' : dbStatus === 'Error' ? 'bg-rose-500' : 'bg-gray-500'}`}></div>
          CLOUD {dbStatus.toUpperCase()}
        </div>
      </div>

      {/* Cloud Repository Monitor */}
      <div className="space-y-4 animate-in fade-in duration-500">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">
                        Live Cloud Repository
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Automatic Synchronization Active</p>
                  </div>
              </div>
              <button 
                  onClick={checkConnection}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all uppercase tracking-widest"
              >
                  <RefreshCw className={`w-3.5 h-3.5 ${dbStatus === 'Connected' && !stats ? 'animate-spin' : ''}`} /> 
                  Verify Integrity
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {collectionStats.map(stat => (
                  <div key={stat.key} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                          <div className={`p-2.5 rounded-xl transition-colors ${stat.local !== 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                              <stat.icon className="w-5 h-5" />
                          </div>
                          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                             <div className={`w-1.5 h-1.5 rounded-full ${stat.status === 'Live' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`}></div>
                             <span className={`text-[9px] font-black uppercase tracking-tighter ${stat.status === 'Live' ? 'text-emerald-600' : 'text-amber-600'}`}>{stat.status}</span>
                          </div>
                      </div>
                      
                      <div className="space-y-3">
                          <h4 className="font-black text-gray-800 text-xs truncate uppercase tracking-wide">{stat.label}</h4>
                          <div className="flex items-center text-xs bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                              <div className="flex-1">
                                  <span className="text-gray-400 block text-[8px] uppercase font-black mb-0.5 tracking-widest">Local</span>
                                  <span className="text-base font-black text-gray-800">{stat.local}</span>
                              </div>
                              <div className="w-px h-6 bg-gray-200 mx-3"></div>
                              <div className="flex-1 text-right">
                                  <span className="text-gray-400 block text-[8px] uppercase font-black mb-0.5 tracking-widest">Cloud</span>
                                  <span className="text-base font-black text-blue-600">{stat.cloud}</span>
                              </div>
                          </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                          <button 
                              onClick={() => handleViewCollection(stat.key, stat.localContent)}
                              className="flex-1 px-3 py-2 bg-white border border-gray-200 text-gray-500 text-[10px] font-black uppercase rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                          >
                              <Eye className="w-3.5 h-3.5" /> Inspect
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* General Config */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-emerald-900/5 p-8">
             <h3 className="font-black text-gray-800 mb-6 flex items-center gap-3 uppercase tracking-widest text-sm">
                <Globe className="w-5 h-5 text-indigo-500" /> Branding Logic
             </h3>
             <div className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">App Title</label>
                   <input 
                      type="text" 
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800"
                      placeholder="e.g. OK BOZ CRM"
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">UI Accent Color</label>
                   <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <input 
                         type="color" 
                         value={brandColor}
                         onChange={(e) => setBrandColor(e.target.value)}
                         className="h-10 w-20 p-1 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <span className="text-sm font-mono font-bold text-gray-600">{brandColor.toUpperCase()}</span>
                   </div>
                </div>
                <div className="pt-4">
                    <button 
                       onClick={handleSaveBranding}
                       className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-900/20"
                    >
                       <Save className="w-4 h-4" /> Apply Site Changes
                    </button>
                </div>
             </div>
          </div>

          {/* Admin Security */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-emerald-900/5 p-8">
              <h3 className="font-black text-gray-800 mb-6 flex items-center gap-3 uppercase tracking-widest text-sm">
                  <LockIcon className="w-5 h-5 text-emerald-500" /> Security Override
              </h3>
              <form onSubmit={handleAdminPasswordChange} className="space-y-6">
                  <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Master Password</label>
                      <div className="relative">
                          <input 
                              type={showAdminPass.current ? "text" : "password"}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-800"
                              value={adminPasswords.current}
                              onChange={e => setAdminPasswords({...adminPasswords, current: e.target.value})}
                          />
                          <button type="button" onClick={() => setShowAdminPass(p => ({...p, current: !p.current}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                              {showAdminPass.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">New PIN</label>
                          <div className="relative">
                              <input 
                                  type={showAdminPass.new ? "text" : "password"}
                                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-800"
                                  value={adminPasswords.new}
                                  onChange={e => setAdminPasswords({...adminPasswords, new: e.target.value})}
                              />
                              <button type="button" onClick={() => setShowAdminPass(p => ({...p, new: !p.new}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                                  {showAdminPass.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Verify PIN</label>
                          <input 
                              type="password"
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-800"
                              value={adminPasswords.confirm}
                              onChange={e => setAdminPasswords({...adminPasswords, confirm: e.target.value})}
                          />
                      </div>
                  </div>
                  {adminPassMsg.text && (
                      <p className={`text-[10px] font-black uppercase text-center ${adminPassMsg.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{adminPassMsg.text}</p>
                  )}
                  <button 
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 transition-all transform active:scale-95"
                  >
                      Update Access Creds
                  </button>
              </form>
          </div>
      </div>

      {/* Cloud Sync Advanced Controls */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-emerald-900/5 overflow-hidden">
        <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                  <Cloud className="w-6 h-6" />
              </div>
              <div>
                  <h3 className="font-black text-gray-800 text-lg tracking-tighter uppercase">Cloud Integrity Controls</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Global Synchronization Settings</p>
              </div>
          </div>
          <div className="flex gap-4">
              <button 
                  onClick={handleRestore}
                  disabled={isRestoring || dbStatus !== 'Connected'}
                  className="px-6 py-3 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm"
              >
                  {isRestoring ? <Loader2 className="w-4 h-4 animate-spin"/> : <DownloadCloud className="w-4 h-4" />}
                  Pull Cloud Copy
              </button>
              <button 
                  onClick={handleBackup}
                  disabled={isBackingUp || dbStatus !== 'Connected'}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 transition-all shadow-xl shadow-emerald-900/20"
              >
                  {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4" />}
                  Force Push Sync
              </button>
          </div>
        </div>
        
        <div className="p-8">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <div className="text-sm">
                    <p className="font-black text-emerald-800 uppercase tracking-widest text-[10px]">Active Data Protection</p>
                    <p className="text-emerald-700 font-medium text-xs mt-0.5">Your repository is locked with {isDbPermanent ? 'Production-grade' : 'Development'} Firebase credentials.</p>
                </div>
            </div>
        </div>
      </div>
      
      {showCollectionViewer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-300 border border-white">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 rounded-t-[3rem]">
              <div>
                <h3 className="font-black text-gray-800 text-xl tracking-tighter uppercase">Inspecting Module: {currentViewingCollection}</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Direct Browser Storage Snapshot</p>
              </div>
              <button onClick={closeCollectionViewer} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 text-sm bg-slate-900 text-emerald-400 font-mono custom-scrollbar">
                {collectionError ? (
                    <div className="bg-rose-500/10 text-rose-400 p-4 rounded-2xl border border-rose-500/20 text-center font-bold text-xs uppercase tracking-widest">
                        {collectionError}
                    </div>
                ) : (
                    <pre className="whitespace-pre-wrap break-all text-xs opacity-90 leading-relaxed">
                        {JSON.stringify(collectionContent, null, 2)}
                    </pre>
                )}
            </div>

            <div className="p-6 border-t border-gray-50 bg-gray-50/50 flex justify-end rounded-b-[3rem]">
              <button 
                onClick={closeCollectionViewer} 
                className="px-10 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
