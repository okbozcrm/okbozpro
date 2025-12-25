import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, Lock as LockIcon, 
  LogOut, Cloud, Database, Globe, Palette, Save,
  UploadCloud, DownloadCloud, Loader2, Map as MapIcon, Check,
  Users, Target, Building2, Car, Wallet, MapPin, Truck, Layers, RefreshCw, Eye,
  Phone, DollarSign, Plane, Briefcase as BriefcaseIcon, Clock, Calendar, X, EyeOff,
  MessageSquare, HardDrive, Bike
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

  // Local state for branding form
  const [brandName, setBrandName] = useState(companyName);
  const [brandColor, setBrandColor] = useState(primaryColor);

  // Maps API Key State
  const isMapsHardcoded = !!(HARDCODED_MAPS_API_KEY && HARDCODED_MAPS_API_KEY.length > 5);
  const [mapsKey, setMapsKey] = useState(HARDCODED_MAPS_API_KEY || localStorage.getItem('maps_api_key') || '');
  const [showMapsInput, setShowMapsInput] = useState(false);

  // Collection Viewer Modal State
  const [showCollectionViewer, setShowCollectionViewer] = useState(false);
  const [currentViewingCollection, setCurrentViewingCollection] = useState<string | null>(null);
  const [collectionContent, setCollectionContent] = useState<any[] | string | null>(null);
  const [collectionError, setCollectionError] = useState<string | null>(null);

  // Password Management State
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
    const collections = [
        { key: 'staff_data', label: 'Staff Records', icon: Users },
        { key: 'corporate_accounts', label: 'Corporate Accounts', icon: Building2 },
        { key: 'global_enquiries_data', label: 'Enquiries', icon: Phone },
        { key: 'trips_data', label: 'Trip Logs', icon: Truck },
        { key: 'global_travel_requests', label: 'KM Claims (TA)', icon: Bike },
        { key: 'driver_payment_records', label: 'Driver Pay', icon: DollarSign },
        { key: 'driver_wallet_data', label: 'Driver Wallets', icon: Wallet },
        { key: 'internal_messages_data', label: 'Chat History', icon: MessageSquare },
        { key: 'office_expenses', label: 'Expense Data', icon: HardDrive },
        { key: 'branches_data', label: 'Branch Config', icon: MapPin },
        { key: 'app_branding', label: 'Site Branding', icon: Palette },
        { key: 'leads_data', label: 'Active Leads', icon: Target }
    ];

    return collections.map(col => {
        let localCount: string | number = 0;
        let localContent: any = null;
        let localStr: string | null = null;
        try {
            localStr = localStorage.getItem(col.key);
            if (localStr) {
                localContent = JSON.parse(localStr);
                localCount = Array.isArray(localContent) ? localContent.length : 1;
            }
        } catch(e) {
            localCount = 'Err';
            localContent = localStr;
        }

        let cloudCount: string | number = '-';
        if (cloudData && cloudData[col.key]) {
            cloudCount = cloudData[col.key].count || '0';
        }

        return {
            ...col,
            local: localCount,
            localContent: localContent,
            cloud: cloudCount,
            status: 'Synced' 
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

  const handleSaveMapsKey = () => {
      localStorage.setItem('maps_api_key', mapsKey);
      setShowMapsInput(false);
      alert("Google Maps API Key saved. Please refresh the page to apply changes.");
      window.location.reload();
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
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-600" /> Site Settings
        </h2>
        <p className="text-gray-500">System configuration, branding, and data management</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
         <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" /> General Configuration
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Company Name (App Title)</label>
               <input 
                  type="text" 
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. OK BOZ CRM"
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Theme Primary Color</label>
               <div className="flex items-center gap-3">
                  <input 
                     type="color" 
                     value={brandColor}
                     onChange={(e) => setBrandColor(e.target.value)}
                     className="h-10 w-20 p-1 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <span className="text-sm font-mono text-gray-500">{brandColor}</span>
               </div>
            </div>
         </div>
         <div className="mt-4 flex justify-end">
            <button 
               onClick={handleSaveBranding}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
            >
               <Save className="w-4 h-4" /> Save Changes
            </button>
         </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <LockIcon className="w-5 h-5 text-emerald-500" /> Account Security (Admin)
          </h3>
          <form onSubmit={handleAdminPasswordChange} className="max-w-md space-y-4">
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current Password</label>
                  <div className="relative">
                      <input 
                          type={showAdminPass.current ? "text" : "password"}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={adminPasswords.current}
                          onChange={e => setAdminPasswords({...adminPasswords, current: e.target.value})}
                      />
                      <button type="button" onClick={() => setShowAdminPass(p => ({...p, current: !p.current}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                          {showAdminPass.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
                      <div className="relative">
                          <input 
                              type={showAdminPass.new ? "text" : "password"}
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              value={adminPasswords.new}
                              onChange={e => setAdminPasswords({...adminPasswords, new: e.target.value})}
                          />
                          <button type="button" onClick={() => setShowAdminPass(p => ({...p, new: !p.new}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                              {showAdminPass.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm New</label>
                      <input 
                          type="password"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={adminPasswords.confirm}
                          onChange={e => setAdminPasswords({...adminPasswords, confirm: e.target.value})}
                      />
                  </div>
              </div>
              {adminPassMsg.text && (
                  <p className={`text-xs ${adminPassMsg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{adminPassMsg.text}</p>
              )}
              <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm"
              >
                  Update Password
              </button>
          </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" /> Cloud Database
          </h3>
          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
            dbStatus === 'Connected' ? 'bg-green-100 text-green-700' : 
            dbStatus === 'Error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${dbStatus === 'Connected' ? 'bg-green-500' : dbStatus === 'Error' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
            {dbStatus}
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                   <Database className="w-4 h-4" /> Connection Info
                </h4>
                <div className="space-y-2 text-sm text-blue-800">
                   <div className="flex justify-between">
                      <span className="opacity-70">Project ID:</span>
                      <span className="font-mono font-bold">{HARDCODED_FIREBASE_CONFIG.projectId || 'Not Configured'}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="opacity-70">Status:</span>
                      <span className="font-bold">{isDbPermanent ? 'Permanent Link' : 'Temporary'}</span>
                   </div>
                </div>
             </div>

             <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-700 mb-2">Database Stats</h4>
                {stats ? (
                   <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                         <span>Collections:</span>
                         <span className="font-bold text-gray-900">{Object.keys(stats).length}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                         <span>Staff Records:</span>
                         <span className="font-bold text-gray-900">{stats['staff_data']?.count || 0}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                         <span>Last Cloud Update:</span>
                         <span className="font-bold text-gray-900">
                            {stats['staff_data']?.lastUpdated ? new Date(stats['staff_data'].lastUpdated).toLocaleDateString() : '-'}
                         </span>
                      </div>
                   </div>
                ) : (
                   <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
                      {dbStatus === 'Connected' ? 'Loading stats...' : 'No connection'}
                   </div>
                )}
             </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center mt-4">
              <span className="text-xs text-gray-400">
                  {isDbPermanent ? '🔒 Connected via Hardcoded Config' : 'ℹ️ Using Temporary Config'}
              </span>
              
              <div className="flex gap-3">
                  <button 
                      onClick={handleRestore}
                      disabled={isRestoring || dbStatus !== 'Connected'}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                  >
                      {isRestoring ? <Loader2 className="w-4 h-4 animate-spin"/> : <DownloadCloud className="w-4 h-4" />}
                      Restore
                  </button>
                  <button 
                      onClick={handleBackup}
                      disabled={isBackingUp || dbStatus !== 'Connected'}
                      className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-2 disabled:opacity-50"
                  >
                      {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4" />}
                      Backup
                  </button>
              </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
          <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-gray-500" /> LIVE DATA COLLECTIONS
              </h3>
              <button 
                  onClick={checkConnection}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
              >
                  <RefreshCw className={`w-4 h-4 ${dbStatus === 'Connected' && !stats ? 'animate-spin' : ''}`} /> 
                  Refresh
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collectionStats.map(stat => (
                  <div key={stat.key} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-gray-50 rounded-xl text-gray-600 border border-gray-100">
                              <stat.icon className="w-6 h-6" />
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                              {stat.status}
                          </span>
                      </div>
                      
                      <div>
                          <h4 className="font-bold text-gray-800 text-lg mb-4">{stat.label}</h4>
                          <div className="flex items-center text-sm bg-gray-50 rounded-lg p-3 border border-gray-100">
                              <div className="flex-1">
                                  <span className="text-gray-500 block text-xs uppercase font-bold mb-1 tracking-wider">Local</span>
                                  <span className="text-xl font-bold text-gray-800">{stat.local}</span>
                              </div>
                              <div className="w-px h-8 bg-gray-200 mx-4"></div>
                              <div className="flex-1 text-right">
                                  <span className="text-gray-500 block text-xs uppercase font-bold mb-1 tracking-wider">Cloud</span>
                                  <span className="text-xl font-bold text-blue-600">{stat.cloud}</span>
                              </div>
                          </div>
                      </div>
                      <div className="mt-4">
                          <button 
                              onClick={() => handleViewCollection(stat.key, stat.localContent)}
                              className="w-full px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                          >
                              <Eye className="w-4 h-4" /> View Items
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
         <h3 className="font-bold text-gray-800 mb-4">Integrations</h3>
         <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg">
               <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-50 rounded text-yellow-600">
                         <MapIcon className="w-6 h-6" />
                      </div>
                      <div>
                         <h4 className="font-bold text-gray-800">Google Maps API</h4>
                         <p className="text-xs text-gray-500">For location tracking and address search</p>
                      </div>
                   </div>
                   {!isMapsHardcoded && (
                       <button 
                          className="text-xs font-bold text-blue-600 hover:underline border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          onClick={() => setShowMapsInput(!showMapsInput)}
                       >
                          {showMapsInput ? 'Cancel' : (mapsKey ? 'Edit Key' : 'Configure')}
                       </button>
                   )}
                   {isMapsHardcoded && (
                       <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">Permanent Link</span>
                   )}
               </div>
               
               {showMapsInput && !isMapsHardcoded && (
                   <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
                       <div className="flex gap-2">
                           <input 
                               type="text" 
                               value={mapsKey}
                               onChange={(e) => setMapsKey(e.target.value)}
                               placeholder="Paste your AIza... API Key here"
                               className="flex-1 p-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                           />
                           <button 
                               onClick={handleSaveMapsKey}
                               className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-1 shadow-sm"
                           >
                               <Check className="w-4 h-4" /> Save
                           </button>
                       </div>
                       <div className="mt-2 text-[10px] text-gray-500 space-y-1">
                           <p>Get this key from Google Cloud Console (Maps JavaScript API & Places API)</p>
                           <p className="text-red-500 font-medium">Important: You must enable BILLING on the Google Cloud Project for the map to work.</p>
                       </div>
                   </div>
               )}
            </div>
         </div>
      </div>

      {showCollectionViewer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-800">Viewing Collection: {currentViewingCollection}</h3>
              <button onClick={closeCollectionViewer} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 text-sm bg-gray-50 text-gray-800 font-mono">
                {collectionError ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 text-center">
                        {collectionError}
                    </div>
                ) : (
                    <>
                        {Array.isArray(collectionContent) ? (
                            collectionContent.length > 0 ? (
                                <ul className="space-y-3">
                                    {collectionContent.map((item, index) => (
                                        <li key={index} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                            <pre className="whitespace-pre-wrap break-all text-xs">
                                                {JSON.stringify(item, null, 2)}
                                            </pre>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500">This collection is empty.</p>
                            )
                        ) : (
                            typeof collectionContent === 'object' && collectionContent !== null ? (
                                <pre className="whitespace-pre-wrap break-all text-xs">
                                    {JSON.stringify(collectionContent, null, 2)}
                                </pre>
                            ) : (
                                <p className="text-center text-gray-500">{collectionContent || "No content available."}</p>
                            )
                        )}
                    </>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-2xl">
              <button 
                onClick={closeCollectionViewer} 
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;