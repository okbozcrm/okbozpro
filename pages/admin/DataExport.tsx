
import React, { useState, useEffect } from 'react';
import { 
  Database, Download, HardDrive, CheckCircle, 
  FileSpreadsheet, Loader2, RefreshCw, Shield, AlertTriangle, Cloud
} from 'lucide-react';
import { Employee, CorporateAccount } from '../../types';

// Helper to convert JSON to CSV
const convertToCSV = (objArray: any[]) => {
  if (!objArray || objArray.length === 0) return '';
  const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
  
  // Collect all unique keys from all objects to ensure columns align
  const allKeys = new Set<string>();
  array.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
  const header = Array.from(allKeys);

  let str = header.join(',') + '\r\n';

  for (let i = 0; i < array.length; i++) {
    let line = '';
    for (let index = 0; index < header.length; index++) {
      if (index > 0) line += ',';
      
      let val = array[i][header[index]];
      
      // Handle formatting
      if (val === null || val === undefined) val = '';
      if (typeof val === 'object') val = JSON.stringify(val).replace(/"/g, '""'); // Escape JSON inside CSV
      
      // Escape commas and quotes in strings
      if (typeof val === 'string') {
          val = val.replace(/"/g, '""');
          if (val.search(/("|,|\n)/g) >= 0) val = `"${val}"`;
      }
      
      line += val;
    }
    str += line + '\r\n';
  }
  return str;
};

const DataExport: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const [isLoading, setIsLoading] = useState(false);
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [dataStats, setDataStats] = useState<any>({});
  
  // Module Keys Definition
  const MODULES = [
      { id: 'staff', label: 'Staff & Payroll', key: 'staff_data' },
      { id: 'trips', label: 'Trip Bookings', key: 'trips_data' },
      { id: 'enquiries', label: 'Customer Care / Enquiries', key: 'global_enquiries_data' },
      { id: 'payments', label: 'Driver Payments', key: 'driver_payment_records' },
      { id: 'leads', label: 'Franchise Leads', key: 'leads_data' },
      { id: 'vendors', label: 'Vehicle Vendors', key: 'vendor_data' },
      { id: 'expenses', label: 'Office Expenses', key: 'office_expenses' },
      { id: 'tasks', label: 'Task Management', key: 'tasks_data' },
      { id: 'corporates', label: 'Corporate Accounts', key: 'corporate_accounts' },
  ];

  // Helper to fetch data based on role
  const fetchAggregatedData = (baseKey: string) => {
      let aggregated: any[] = [];
      
      if (isSuperAdmin) {
          // 1. Get Head Office Data
          try {
             const hoData = localStorage.getItem(baseKey);
             if (hoData) aggregated = [...aggregated, ...JSON.parse(hoData).map((i:any) => ({...i, source: 'Head Office'}))];
          } catch(e) {}

          // 2. Get Corporate Data
          try {
             const corporates: CorporateAccount[] = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
             corporates.forEach(corp => {
                 const corpKey = `${baseKey}_${corp.email}`;
                 const cData = localStorage.getItem(corpKey);
                 if (cData) {
                     aggregated = [...aggregated, ...JSON.parse(cData).map((i:any) => ({...i, source: corp.companyName}))];
                 }
             });
          } catch(e) {}
      } else {
          // Franchise View
          const key = `${baseKey}_${sessionId}`;
          try {
             const data = localStorage.getItem(key);
             if (data) aggregated = JSON.parse(data);
          } catch(e) {}
      }
      return aggregated;
  };

  useEffect(() => {
      // Calculate stats
      const stats: any = {};
      MODULES.forEach(mod => {
          const data = fetchAggregatedData(mod.key);
          stats[mod.id] = data.length;
      });
      setDataStats(stats);
  }, [isSuperAdmin, sessionId]);

  const handleDownload = (moduleId: string) => {
      const module = MODULES.find(m => m.id === moduleId);
      if(!module) return;

      const data = fetchAggregatedData(module.key);
      if (data.length === 0) {
          alert(`No data found for ${module.label}`);
          return;
      }

      const csv = convertToCSV(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `OKBOZ_${module.label.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
      setIsLoading(true);
      setTimeout(() => {
          MODULES.forEach(mod => {
              if (dataStats[mod.id] > 0) {
                  handleDownload(mod.id);
              }
          });
          setIsLoading(false);
          alert("Downloads started for all available modules.");
      }, 1000);
  };

  const handleGoogleDriveSync = () => {
      setDriveSyncing(true);
      
      // Simulate OAuth and Upload delay
      setTimeout(() => {
          setDriveSyncing(false);
          
          // Since we can't do real OAuth in this environment, we create a master CSV and prompt user
          let masterData: any[] = [];
          MODULES.forEach(mod => {
              const data = fetchAggregatedData(mod.key);
              if (data.length > 0) {
                  // Add a type field to distinguish in master file
                  const taggedData = data.map(d => ({ ...d, DATA_TYPE: mod.label }));
                  masterData = [...masterData, ...taggedData];
              }
          });

          if (masterData.length === 0) {
              alert("No data available to sync.");
              return;
          }

          const csv = convertToCSV(masterData);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          
          // Naming it .csv for Excel compatibility
          link.setAttribute('href', url);
          link.setAttribute('download', `OKBOZ_FULL_BACKUP_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Open Google Drive in new tab to prompt user to upload
          if(window.confirm("File generated! Would you like to open Google Drive to upload it now?")) {
              window.open("https://drive.google.com/drive/u/0/my-drive", "_blank");
          }

      }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
       <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Database className="w-8 h-8 text-emerald-600" /> Data Export & Backup
          </h2>
          <p className="text-gray-500">Download your entire database in Excel format or sync to Cloud Storage.</p>
       </div>

       {/* Drive Integration Card */}
       <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-green-500 to-yellow-500"></div>
          <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-start gap-4">
                 <div className="p-4 bg-gray-50 rounded-full border border-gray-200">
                     <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" 
                        alt="Google Drive" 
                        className="w-12 h-12"
                     />
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                         Google Drive Sync
                         <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">Auto-Format</span>
                     </h3>
                     <p className="text-gray-500 mt-1 max-w-lg">
                         Automatically compile all modules (Reports, Payments, Staff, etc.) into a single master Excel-compatible file and prepare it for your Google Drive.
                     </p>
                 </div>
             </div>
             
             <button 
                 onClick={handleGoogleDriveSync}
                 disabled={driveSyncing}
                 className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-3 transition-all transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
             >
                 {driveSyncing ? (
                     <>
                        <Loader2 className="w-6 h-6 animate-spin" /> Preparing Cloud Sync...
                     </>
                 ) : (
                     <>
                        <Cloud className="w-6 h-6" /> Sync to Drive
                     </>
                 )}
             </button>
          </div>
       </div>

       {/* Quick Actions */}
       <div className="flex justify-end gap-3">
            <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
                <RefreshCw className="w-4 h-4" /> Refresh Data
            </button>
            <button 
                onClick={handleDownloadAll}
                disabled={isLoading}
                className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-2"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />}
                Download All (ZIP/Multiple)
            </button>
       </div>

       {/* Modules Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {MODULES.map((mod) => (
               <div key={mod.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                   <div className="flex justify-between items-start mb-4">
                       <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-emerald-50 transition-colors">
                           <FileSpreadsheet className="w-6 h-6 text-gray-500 group-hover:text-emerald-600" />
                       </div>
                       <span className={`text-xs font-bold px-2 py-1 rounded-full ${dataStats[mod.id] > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                           {dataStats[mod.id]} Records
                       </span>
                   </div>
                   
                   <h4 className="font-bold text-gray-800 text-lg mb-1">{mod.label}</h4>
                   <p className="text-xs text-gray-400 mb-6">Key: {mod.key}</p>
                   
                   <button 
                       onClick={() => handleDownload(mod.id)}
                       disabled={dataStats[mod.id] === 0}
                       className="w-full py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                       <Download className="w-4 h-4" /> Download CSV
                   </button>
               </div>
           ))}
       </div>

       {/* Info Footer */}
       <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
           <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
           <div className="text-sm text-blue-800">
               <p className="font-bold">Data Privacy & Security</p>
               <p className="mt-1">
                   Exported files contain sensitive business information including staff salaries, customer phone numbers, and financial records. 
                   Ensure these files are stored securely after downloading. 
                   {isSuperAdmin ? " As Super Admin, your export includes data from Head Office and ALL Franchise accounts." : " Your export contains only data relevant to your Franchise account."}
               </p>
           </div>
       </div>
    </div>
  );
};

export default DataExport;
