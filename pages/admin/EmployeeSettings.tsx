
import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, FileText, UserX, Clock, 
  Settings2, Plane, Calendar, Zap, DollarSign, 
  RotateCcw, Download, Award, File, Bell, 
  MessageSquare, Plus, Trash2, Edit2, CheckCircle, 
  MapPin as MapPinIcon, Briefcase as BriefcaseIcon,
  ToggleLeft, ToggleRight, Save, UploadCloud, Search,
  AlertCircle, Shield, Smartphone, TrendingUp as TrendingUpIcon, RotateCw, CalendarCheck, BookOpen
} from 'lucide-react';

// --- Types ---
type SettingCategory = 
  | 'My Company Report' | 'My Team (Admins)' | 'Departments & Roles' | 'Custom Fields' | 'Inactive Employees'
  | 'Shifts & Breaks' | 'Attendance Modes'
  | 'Custom Paid Leaves' | 'Holiday List'
  | 'Auto Live Track'
  | 'Calendar Month' | 'Attendance Cycle' | 'Payout Date' | 'Import Settings' | 'Incentive Types' | 'Salary Templates' | 'Round Off'
  | 'App Notifications'
  | 'CMS & Content' // Added CMS
  | 'Request A Feature';

// --- Reusable UI Elements ---
const SectionHeader = ({ title, icon: Icon, desc }: { title: string, icon: any, desc?: string }) => (
  <div className="mb-6 border-b border-gray-100 pb-4">
    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
      <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
        <Icon className="w-5 h-5" />
      </div>
      {title}
    </h2>
    {desc && <p className="text-sm text-gray-500 mt-1 ml-11">{desc}</p>}
  </div>
);

const ToggleSwitch = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
    <span className="font-medium text-gray-700">{label}</span>
    <button 
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

// --- Sub-Components for Each Section ---

// 1. My Company Report
const MyCompanyReport = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="My Company Report" icon={FileText} desc="Overview of company health and statistics." />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-gray-500 text-sm mb-1">Total Employees</p>
        <h3 className="text-3xl font-bold text-gray-800">142</h3>
        <p className="text-emerald-600 text-xs font-medium mt-2 flex items-center gap-1">
          <TrendingUpIcon className="w-3 h-3" /> +12% this month
        </p>
      </div>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-gray-500 text-sm mb-1">Attendance Rate</p>
        <h3 className="text-3xl font-bold text-gray-800">94%</h3>
        <p className="text-emerald-600 text-xs font-medium mt-2">Consistent Performance</p>
      </div>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-gray-500 text-sm mb-1">Total Payroll (Est)</p>
        <h3 className="text-3xl font-bold text-gray-800">₹42.5L</h3>
        <p className="text-gray-400 text-xs font-medium mt-2">Next cycle: Dec 01</p>
      </div>
    </div>
    <div className="bg-gray-50 rounded-xl p-8 text-center border border-dashed border-gray-300">
       <Download className="w-10 h-10 text-gray-400 mx-auto mb-3" />
       <h4 className="text-gray-900 font-medium">Download Full Report</h4>
       <p className="text-gray-500 text-sm mb-4">Get a detailed PDF analysis of your company stats.</p>
       <button className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
         Download PDF
       </button>
    </div>
  </div>
);

// 2. My Team (Admins)
const MyTeamAdmins = () => {
  const [admins, setAdmins] = useState([
    { id: 1, name: 'Senthil Kumar', role: 'Super Admin', email: 'senthil@okboz.com', active: true },
    { id: 2, name: 'Priya Sharma', role: 'HR Manager', email: 'priya@okboz.com', active: true },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="My Team (Admins)" icon={Shield} desc="Manage access levels and administrative staff." />
      
      <div className="flex justify-end">
        <button className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> Add Admin
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{admin.name}</div>
                  <div className="text-gray-500 text-xs">{admin.email}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{admin.role}</td>
                <td className="px-6 py-4">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">Active</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-400 hover:text-emerald-600 p-1">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 3. Departments & Roles (Updated for Persistence)
const DepartmentsAndRoles = () => {
  // Load initial state from local storage or defaults
  const [departments, setDepartments] = useState<string[]>(() => {
    const saved = localStorage.getItem('company_departments');
    return saved ? JSON.parse(saved) : ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance'];
  });

  const [roles, setRoles] = useState<string[]>(() => {
    const saved = localStorage.getItem('company_roles');
    return saved ? JSON.parse(saved) : ['Manager', 'Team Lead', 'Executive', 'Intern', 'Director', 'Associate'];
  });

  const [newDept, setNewDept] = useState('');
  const [newRole, setNewRole] = useState('');

  // Persist changes
  useEffect(() => {
    localStorage.setItem('company_departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('company_roles', JSON.stringify(roles));
  }, [roles]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Departments & Roles" icon={Building2} desc="Define the organizational structure for your company." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Depts */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-500" /> Departments</h3>
          <div className="flex gap-2 mb-4">
            <input 
              value={newDept} 
              onChange={(e) => setNewDept(e.target.value)} 
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. Logistics"
            />
            <button onClick={() => {if(newDept) {setDepartments([...departments, newDept]); setNewDept('')}}} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"><Plus className="w-4 h-4"/></button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {departments.map((d, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-emerald-200 transition-colors">
                <span className="text-sm font-medium text-gray-700">{d}</span>
                <button onClick={() => setDepartments(departments.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>
        {/* Roles */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BriefcaseIcon className="w-4 h-4 text-blue-500" /> Job Roles</h3>
          <div className="flex gap-2 mb-4">
            <input 
              value={newRole} 
              onChange={(e) => setNewRole(e.target.value)} 
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. Driver"
            />
            <button onClick={() => {if(newRole) {setRoles([...roles, newRole]); setNewRole('')}}} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"><Plus className="w-4 h-4"/></button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {roles.map((r, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-blue-200 transition-colors">
                <span className="text-sm font-medium text-gray-700">{r}</span>
                <button onClick={() => setRoles(roles.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. Custom Fields
const CustomFields = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Custom Fields" icon={Settings2} desc="Add extra fields to employee profiles." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
       <div className="mb-4 text-gray-500">
         Currently no custom fields configured.
       </div>
       <button className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-medium hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center gap-2 mx-auto">
         <Plus className="w-4 h-4" /> Add Custom Field
       </button>
    </div>
  </div>
);

// 5. Inactive Employees
const InactiveEmployees = () => {
  const [inactiveStaff, setInactiveStaff] = useState<any[]>([]);
  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  const loadInactive = () => {
      let all: any[] = [];
      // 1. Head Office / Current User Data
      // For Super Admin in StaffList, they only save to 'staff_data'.
      // For normal users/corporate, they save to 'staff_data_{id}'.
      const sessionId = localStorage.getItem('app_session_id') || 'admin';
      const key = isSuperAdmin ? 'staff_data' : `staff_data_${sessionId}`;
      
      try {
        const localData = JSON.parse(localStorage.getItem(key) || '[]');
        // We tag them with the storage key so we know where to save them back
        all = [...localData.map((e:any) => ({...e, storageKey: key}))];
      } catch(e) {
        console.error("Error loading staff data for inactive list", e);
      }

      setInactiveStaff(all.filter(e => e.status === 'Inactive'));
  };

  useEffect(() => {
      loadInactive();
  }, []);

  const handleRestore = (employee: any) => {
      if(!window.confirm(`Restore ${employee.name} to Active status?`)) return;

      const key = employee.storageKey;
      try {
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = stored.map((e: any) => e.id === employee.id ? { ...e, status: 'Active' } : e);
        localStorage.setItem(key, JSON.stringify(updated));
        loadInactive(); // Refresh list
      } catch (e) {
        console.error("Failed to restore employee", e);
        alert("Error restoring employee data.");
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Inactive Employees" icon={UserX} desc="View and restore former employees." />
      
      {inactiveStaff.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Left On (Est.)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inactiveStaff.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={emp.avatar} alt="" className="w-8 h-8 rounded-full opacity-60" />
                      <div>
                        <div className="font-medium text-gray-900">{emp.name}</div>
                        <div className="text-gray-500 text-xs">{emp.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{emp.role}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {/* Mock exit date since we don't track it explicitly yet */}
                    N/A
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRestore(emp)}
                      className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ml-auto"
                    >
                      <RotateCw className="w-3 h-3" /> Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
           <div className="p-8 text-center text-gray-500">
              <UserX className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No inactive employees found.</p>
              <p className="text-xs text-gray-400 mt-1">Mark employees as 'Inactive' in Staff Management to see them here.</p>
           </div>
        </div>
      )}
    </div>
  );
};

// 6. Shifts & Breaks
const ShiftsAndBreaks = () => {
  const [shifts, setShifts] = useState<{id: number, name: string, start: string, end: string}[]>(() => {
    const saved = localStorage.getItem('company_shifts');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'General Shift', start: '09:30', end: '18:30' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('company_shifts', JSON.stringify(shifts));
  }, [shifts]);

  const addShift = () => {
    const newId = Date.now();
    setShifts([...shifts, { id: newId, name: 'New Shift', start: '09:00', end: '18:00' }]);
  };

  const updateShift = (id: number, field: string, value: string) => {
    setShifts(shifts.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeShift = (id: number) => {
    if (shifts.length <= 1) {
        alert("You need at least one shift configured.");
        return;
    }
    setShifts(shifts.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Shifts & Breaks" icon={Clock} desc="Configure working hours and break durations." />
      <div className="grid grid-cols-1 gap-4">
        {shifts.map(shift => (
          <div key={shift.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
             <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shift Name</label>
                <input 
                    value={shift.name} 
                    onChange={(e) => updateShift(shift.id, 'name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
             </div>
             <div className="w-full md:w-32">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Time</label>
                <input 
                    type="time" 
                    value={shift.start} 
                    onChange={(e) => updateShift(shift.id, 'start', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
             </div>
             <div className="w-full md:w-32">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Time</label>
                <input 
                    type="time" 
                    value={shift.end} 
                    onChange={(e) => updateShift(shift.id, 'end', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
             </div>
             <button 
                onClick={() => removeShift(shift.id)}
                className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
             >
                <Trash2 className="w-5 h-5" />
             </button>
          </div>
        ))}
        <button 
            onClick={addShift}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-emerald-400 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2"
        >
           <Plus className="w-5 h-5" /> Create New Shift
        </button>
      </div>
    </div>
  );
};

// 7. Attendance Modes
const AttendanceModes = () => {
  const [modes, setModes] = useState({
    gps: true,
    selfie: true,
    qr: false,
    manual: false
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Attendance Modes" icon={Smartphone} desc="Choose how employees mark their attendance." />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
         <ToggleSwitch label="GPS Geofencing" checked={modes.gps} onChange={() => setModes({...modes, gps: !modes.gps})} />
         <ToggleSwitch label="Selfie Verification" checked={modes.selfie} onChange={() => setModes({...modes, selfie: !modes.selfie})} />
         <ToggleSwitch label="QR Code Scan" checked={modes.qr} onChange={() => setModes({...modes, qr: !modes.qr})} />
         <ToggleSwitch label="Manual Punch (Web)" checked={modes.manual} onChange={() => setModes({...modes, manual: !modes.manual})} />
      </div>
    </div>
  );
};

// 8. Custom Paid Leaves
const CustomPaidLeaves = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Custom Paid Leaves" icon={Plane} desc="Set up annual leave quotas." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
       <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="font-bold text-gray-700">Casual Leave (CL)</span>
          <span className="bg-white border px-3 py-1 rounded text-sm font-bold">12 / Year</span>
       </div>
       <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="font-bold text-gray-700">Sick Leave (SL)</span>
          <span className="bg-white border px-3 py-1 rounded text-sm font-bold">10 / Year</span>
       </div>
       <button className="text-emerald-600 text-sm font-medium hover:underline flex items-center gap-1">
         <Plus className="w-3 h-3" /> Add Leave Type
       </button>
    </div>
  </div>
);

// 9. Holiday List
const HolidayList = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Holiday List" icon={Calendar} desc="Manage public holidays for the year." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
       <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-gray-800">2025 Calendar</h4>
          <button className="text-emerald-600 text-xs font-bold border border-emerald-200 px-3 py-1 rounded hover:bg-emerald-50">Upload List</button>
       </div>
       <div className="space-y-2">
          <div className="flex justify-between p-2 border-b border-gray-100">
             <span>New Year's Day</span>
             <span className="text-gray-500 text-sm">Jan 01, Wed</span>
          </div>
          <div className="flex justify-between p-2 border-b border-gray-100">
             <span>Republic Day</span>
             <span className="text-gray-500 text-sm">Jan 26, Sun</span>
          </div>
          <div className="flex justify-between p-2">
             <span>Independence Day</span>
             <span className="text-gray-500 text-sm">Aug 15, Fri</span>
          </div>
       </div>
    </div>
  </div>
);

// 10. Auto Live Track
const AutoLiveTrack = () => {
  const [tracking, setTracking] = useState(true);
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Auto Live Track" icon={Zap} desc="Background GPS tracking for field staff." />
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
         <ToggleSwitch label="Enable Live Tracking" checked={tracking} onChange={() => setTracking(!tracking)} />
         <p className="text-xs text-gray-500 mt-4 bg-yellow-50 p-3 rounded border border-yellow-100">
           <AlertCircle className="w-3 h-3 inline mr-1" />
           Battery usage may increase for employees with this setting enabled. Tracking only active during shift hours.
         </p>
      </div>
    </div>
  );
};

// 11. Payout Date Settings (New Component)
const PayoutDateSettings = () => {
  const [departments] = useState<string[]>(() => {
    const saved = localStorage.getItem('company_departments');
    return saved ? JSON.parse(saved) : ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance'];
  });

  const [payoutConfig, setPayoutConfig] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('company_payout_dates');
    return saved ? JSON.parse(saved) : {};
  });

  const [globalDay, setGlobalDay] = useState<string>(() => {
     return localStorage.getItem('company_global_payout_day') || '5'; // Default 5th
  });

  const handleSave = () => {
    localStorage.setItem('company_payout_dates', JSON.stringify(payoutConfig));
    localStorage.setItem('company_global_payout_day', globalDay);
    // Visual feedback
    const btn = document.getElementById('payout-save-btn');
    if(btn) {
        const originalText = btn.innerText;
        btn.innerText = 'Saved!';
        setTimeout(() => btn.innerText = originalText, 2000);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6 animate-in fade-in slide-in-from-right-4">
       <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Default Payout Day</label>
          <div className="flex items-center gap-3">
             <span className="text-sm text-gray-600">Monthly on the</span>
             <select 
                value={globalDay}
                onChange={(e) => setGlobalDay(e.target.value)}
                className="w-20 p-2 border border-gray-300 rounded-lg text-center outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
             >
                {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                ))}
             </select>
             <span className="text-sm text-gray-600">of every month</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">This date applies to all employees unless a department override is set below.</p>
       </div>

       <div className="pt-4 border-t border-gray-100">
          <h4 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2">
             <Building2 className="w-4 h-4 text-emerald-500" /> Department Overrides
          </h4>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
             {departments.map(dept => (
                <div key={dept} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors">
                   <span className="font-medium text-gray-700 text-sm">{dept}</span>
                   <div className="flex items-center gap-2">
                      <select 
                         value={payoutConfig[dept] || ''}
                         onChange={(e) => setPayoutConfig(prev => ({...prev, [dept]: e.target.value}))}
                         className="w-32 p-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
                      >
                         <option value="">Default ({globalDay}th)</option>
                         {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>{d}th</option>
                         ))}
                      </select>
                   </div>
                </div>
             ))}
          </div>
       </div>

       <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button 
             id="payout-save-btn"
             onClick={handleSave}
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
          >
             <Save className="w-4 h-4" /> Save Configuration
          </button>
       </div>
    </div>
  );
};

// 12. Salary Settings Group (Updated)
const SalarySettingsGroup = ({ active }: { active: SettingCategory }) => {
  const renderSalaryContent = () => {
    switch(active) {
      case 'Calendar Month':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <label className="block text-sm font-medium text-gray-700 mb-2">Payroll Calculation Period</label>
             <select className="w-full p-3 border border-gray-300 rounded-lg outline-none">
                <option>1st to 30th/31st (Standard)</option>
                <option>26th to 25th</option>
             </select>
          </div>
        );
      case 'Attendance Cycle':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <label className="block text-sm font-medium text-gray-700 mb-2">Attendance Cut-off Date</label>
             <select className="w-full p-3 border border-gray-300 rounded-lg outline-none">
                <option>Same as Calendar Month</option>
                <option>Last day of month</option>
             </select>
          </div>
        );
      case 'Payout Date':
        return <PayoutDateSettings />;
      case 'Import Settings':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
             <UploadCloud className="w-12 h-12 text-gray-300 mx-auto mb-3" />
             <p className="text-sm text-gray-500 mb-4">Import past salary data from CSV/Excel.</p>
             <button className="bg-emerald-50 text-white px-4 py-2 rounded-lg text-sm font-medium">Upload File</button>
          </div>
        );
      case 'Incentive Types':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
             <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>Performance Bonus</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Variable</span>
             </div>
             <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>Overtime Pay</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Hourly</span>
             </div>
             <button className="text-emerald-600 text-sm font-medium hover:underline">+ Add Incentive</button>
          </div>
        );
      case 'Salary Templates':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <h4 className="font-bold text-gray-800 mb-4">Default Structure</h4>
             <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Basic</span><span className="font-mono text-gray-600">50% of CTC</span></div>
                <div className="flex justify-between"><span>HRA</span><span className="font-mono text-gray-600">30% of Basic</span></div>
                <div className="flex justify-between"><span>Special Allowance</span><span className="font-mono text-gray-600">Balance</span></div>
             </div>
             <button className="mt-6 w-full py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Customize Template</button>
          </div>
        );
      case 'Round Off':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 mb-2">
                <input type="radio" name="round" defaultChecked className="text-emerald-500" />
                <span>Round to nearest integer</span>
             </label>
             <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="round" className="text-emerald-500" />
                <span>Round to 2 decimals</span>
             </label>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title={active} icon={DollarSign} desc="Configure payroll calculation rules." />
      {renderSalaryContent()}
    </div>
  );
};

// 13. App Notifications
const AppNotifications = () => {
  const [notifs, setNotifs] = useState({
    email: true,
    push: true,
    sms: false
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="App Notifications" icon={Bell} desc="Manage system alerts and triggers." />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
         <ToggleSwitch label="Email Alerts" checked={notifs.email} onChange={() => setNotifs({...notifs, email: !notifs.email})} />
         <ToggleSwitch label="Mobile Push Notifications" checked={notifs.push} onChange={() => setNotifs({...notifs, push: !notifs.push})} />
         <ToggleSwitch label="SMS Alerts (Extra charges apply)" checked={notifs.sms} onChange={() => setNotifs({...notifs, sms: !notifs.sms})} />
      </div>
    </div>
  );
};

// 14. CMS Settings (New Component)
const CMSSettings = () => {
    const [pages, setPages] = useState({
        privacy: '',
        terms: '',
        about: '',
        support: ''
    });

    useEffect(() => {
        const savedCMS = localStorage.getItem('cms_content');
        if (savedCMS) {
            try {
                setPages(JSON.parse(savedCMS));
            } catch(e) { console.error(e); }
        }
    }, []);

    const handleSaveCMS = () => {
        localStorage.setItem('cms_content', JSON.stringify(pages));
        const btn = document.getElementById('cms-save-btn');
        if (btn) {
            const originalText = btn.innerText;
            btn.innerText = 'Saved!';
            setTimeout(() => btn.innerText = originalText, 2000);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="CMS & Content" icon={BookOpen} desc="Manage website content pages." />
            
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">Privacy Policy</h3>
                    <textarea 
                        value={pages.privacy}
                        onChange={(e) => setPages({...pages, privacy: e.target.value})}
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
                        placeholder="Enter Privacy Policy content..."
                    />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">Terms & Conditions</h3>
                    <textarea 
                        value={pages.terms}
                        onChange={(e) => setPages({...pages, terms: e.target.value})}
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
                        placeholder="Enter Terms & Conditions content..."
                    />
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">About Us</h3>
                    <textarea 
                        value={pages.about}
                        onChange={(e) => setPages({...pages, about: e.target.value})}
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
                        placeholder="Enter About Us content..."
                    />
                </div>

                <div className="flex justify-end">
                    <button 
                        id="cms-save-btn"
                        onClick={handleSaveCMS}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> Save Content
                    </button>
                </div>
            </div>
        </div>
    );
};

// 15. Feature Request
const FeatureRequest = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Request A Feature" icon={MessageSquare} desc="Help us improve OK BOZ." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
       <textarea 
         rows={4}
         className="w-full p-4 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-4"
         placeholder="Describe the feature you would like to see..."
       />
       <button className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors">
         Submit Request
       </button>
    </div>
  </div>
);

// --- Main Employee Settings Page ---

const EmployeeSettings: React.FC = () => {
  const [activeSetting, setActiveSetting] = useState<SettingCategory>('Departments & Roles');

  const menuItems = [
    {
      heading: 'MY COMPANY',
      items: [
        { id: 'My Company Report', icon: FileText },
        { id: 'My Team (Admins)', icon: CheckCircle },
        { id: 'Departments & Roles', icon: Building2 },
        { id: 'Custom Fields', icon: Settings2 },
        { id: 'Inactive Employees', icon: UserX },
      ]
    },
    {
      heading: 'ATTENDANCE SETTINGS',
      items: [
        { id: 'Shifts & Breaks', icon: Clock },
        { id: 'Attendance Modes', icon: Smartphone },
      ]
    },
    {
      heading: 'LEAVES AND HOLIDAYS',
      items: [
        { id: 'Custom Paid Leaves', icon: Plane },
        { id: 'Holiday List', icon: Calendar },
      ]
    },
    {
      heading: 'AUTOMATION',
      items: [
        { id: 'Auto Live Track', icon: Zap },
      ]
    },
    {
      heading: 'SALARY SETTINGS',
      items: [
        { id: 'Calendar Month', icon: Calendar },
        { id: 'Attendance Cycle', icon: RotateCcw },
        { id: 'Payout Date', icon: CalendarCheck },
        { id: 'Import Settings', icon: Download },
        { id: 'Incentive Types', icon: Award },
        { id: 'Salary Templates', icon: File },
        { id: 'Round Off', icon: DollarSign },
      ]
    },
    {
      heading: 'ALERT & NOTIFICATION',
      items: [
        { id: 'App Notifications', icon: Bell },
      ]
    },
    {
        heading: 'WEBSITE CONTENT', // New Section
        items: [
            { id: 'CMS & Content', icon: BookOpen }
        ]
    },
    {
      heading: 'OTHER SETTINGS',
      items: [
        { id: 'Request A Feature', icon: MessageSquare },
      ]
    }
  ];

  // Render content based on active selection
  const renderContent = () => {
    switch (activeSetting) {
      case 'My Company Report': return <MyCompanyReport />;
      case 'My Team (Admins)': return <MyTeamAdmins />;
      case 'Departments & Roles': return <DepartmentsAndRoles />;
      case 'Custom Fields': return <CustomFields />;
      case 'Inactive Employees': return <InactiveEmployees />;
      
      case 'Shifts & Breaks': return <ShiftsAndBreaks />;
      case 'Attendance Modes': return <AttendanceModes />;
      
      case 'Custom Paid Leaves': return <CustomPaidLeaves />;
      case 'Holiday List': return <HolidayList />;
      
      case 'Auto Live Track': return <AutoLiveTrack />;
      
      case 'App Notifications': return <AppNotifications />;
      
      case 'CMS & Content': return <CMSSettings />; // Render CMS component

      case 'Request A Feature': return <FeatureRequest />;
      
      // Salary Group
      case 'Calendar Month':
      case 'Attendance Cycle':
      case 'Payout Date':
      case 'Import Settings':
      case 'Incentive Types':
      case 'Salary Templates':
      case 'Round Off':
        return <SalarySettingsGroup active={activeSetting} />;
        
      default:
        return <DepartmentsAndRoles />;
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
      </div>

      <div className="flex flex-1 overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
        {/* Left Sidebar Navigation */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex-shrink-0 overflow-y-auto custom-scrollbar">
          <div className="py-6 px-4 space-y-8">
            {menuItems.map((group, groupIdx) => (
              <div key={groupIdx}>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">
                  {group.heading}
                </h4>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSetting(item.id as SettingCategory)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeSetting === item.id 
                          ? 'bg-white text-emerald-600 shadow-sm border border-gray-100' 
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${activeSetting === item.id ? 'text-emerald-500' : 'text-gray-400'}`} />
                      {item.id}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto bg-white p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default EmployeeSettings;
