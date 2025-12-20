
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
  | 'CMS & Content'
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
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

// --- Sub-Components ---

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
  </div>
);

const MyTeamAdmins = () => {
  const [admins, setAdmins] = useState([
    { id: 1, name: 'Senthil Kumar', role: 'Super Admin', email: 'senthil@okboz.com', active: true },
    { id: 2, name: 'Priya Sharma', role: 'HR Manager', email: 'priya@okboz.com', active: true },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="My Team (Admins)" icon={Shield} desc="Manage access levels and administrative staff." />
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
                <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">Active</span></td>
                <td className="px-6 py-4 text-right">
                  <button type="button" className="text-gray-400 hover:text-emerald-600 p-1"><Edit2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DepartmentsAndRoles = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';
  
  // Namespaced storage keys to prevent multi-tenancy pollution
  const DEPT_KEY = isSuperAdmin ? 'company_departments' : `company_departments_${sessionId}`;
  const ROLE_KEY = isSuperAdmin ? 'company_roles' : `company_roles_${sessionId}`;

  const [departments, setDepartments] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(DEPT_KEY);
      return saved ? JSON.parse(saved) : ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance'];
    } catch (e) { return ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance']; }
  });

  const [roles, setRoles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(ROLE_KEY);
      return saved ? JSON.parse(saved) : ['Manager', 'Team Lead', 'Executive', 'Intern', 'Director', 'Associate'];
    } catch (e) { return ['Manager', 'Team Lead', 'Executive', 'Intern', 'Director', 'Associate']; }
  });

  const [newDept, setNewDept] = useState('');
  const [newRole, setNewRole] = useState('');

  const saveDepts = (list: string[]) => {
      setDepartments(list);
      localStorage.setItem(DEPT_KEY, JSON.stringify(list));
      // Fallback for StaffList which expects 'company_departments' globally in some contexts
      if (!isSuperAdmin) localStorage.setItem('company_departments', JSON.stringify(list));
  };

  const saveRoles = (list: string[]) => {
      setRoles(list);
      localStorage.setItem(ROLE_KEY, JSON.stringify(list));
      if (!isSuperAdmin) localStorage.setItem('company_roles', JSON.stringify(list));
  };

  const handleAddDept = () => {
      const trimmed = newDept.trim();
      if (!trimmed) return;
      if (departments.includes(trimmed)) { alert("Department already exists"); return; }
      saveDepts([...departments, trimmed]);
      setNewDept('');
  };

  const handleAddRole = () => {
      const trimmed = newRole.trim();
      if (!trimmed) return;
      if (roles.includes(trimmed)) { alert("Role already exists"); return; }
      saveRoles([...roles, trimmed]);
      setNewRole('');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Departments & Roles" icon={Building2} desc="Define the organizational structure for your company." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-500" /> Departments</h3>
          <div className="flex gap-2 mb-4">
            <input 
              value={newDept} 
              onChange={(e) => setNewDept(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddDept()}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. Logistics"
            />
            <button type="button" onClick={handleAddDept} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"><Plus className="w-4 h-4"/></button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            {departments.map((d, i) => (
              <div key={d} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-emerald-200 transition-colors">
                <span className="text-sm font-medium text-gray-700">{d}</span>
                <button type="button" onClick={() => saveDepts(departments.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BriefcaseIcon className="w-4 h-4 text-blue-500" /> Job Roles</h3>
          <div className="flex gap-2 mb-4">
            <input 
              value={newRole} 
              onChange={(e) => setNewRole(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. Driver"
            />
            <button type="button" onClick={handleAddRole} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"><Plus className="w-4 h-4"/></button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            {roles.map((r, i) => (
              <div key={r} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-blue-200 transition-colors">
                <span className="text-sm font-medium text-gray-700">{r}</span>
                <button type="button" onClick={() => saveRoles(roles.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomFields = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Custom Fields" icon={Settings2} desc="Add extra fields to employee profiles." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center text-gray-400">
       Currently no custom fields configured.
    </div>
  </div>
);

const InactiveEmployees = () => {
  const [inactiveStaff, setInactiveStaff] = useState<any[]>([]);
  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';
  const sessionId = localStorage.getItem('app_session_id') || 'admin';

  const loadInactive = () => {
      let all: any[] = [];
      const key = isSuperAdmin ? 'staff_data' : `staff_data_${sessionId}`;
      try {
        const localData = JSON.parse(localStorage.getItem(key) || '[]');
        all = localData.map((e:any) => ({...e, storageKey: key}));
      } catch(e) {}
      setInactiveStaff(all.filter(e => e.status === 'Inactive'));
  };

  useEffect(() => { loadInactive(); }, []);

  const handleRestore = (employee: any) => {
      if(!window.confirm(`Restore ${employee.name} to Active status?`)) return;
      try {
        const stored = JSON.parse(localStorage.getItem(employee.storageKey) || '[]');
        const updated = stored.map((e: any) => e.id === employee.id ? { ...e, status: 'Active' } : e);
        localStorage.setItem(employee.storageKey, JSON.stringify(updated));
        loadInactive();
      } catch (e) {}
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Inactive Employees" icon={UserX} desc="View and restore former employees." />
      {inactiveStaff.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr><th className="px-6 py-4">Employee</th><th className="px-6 py-4">Role</th><th className="px-6 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inactiveStaff.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={emp.avatar} alt="" className="w-8 h-8 rounded-full opacity-60" />
                      <div><div className="font-medium text-gray-900">{emp.name}</div><div className="text-gray-500 text-xs">{emp.department}</div></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{emp.role}</td>
                  <td className="px-6 py-4 text-right">
                    <button type="button" onClick={() => handleRestore(emp)} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md text-xs font-bold transition-colors">Restore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
           <UserX className="w-12 h-12 mx-auto mb-3 text-gray-300" />
           <p>No inactive employees found.</p>
        </div>
      )}
    </div>
  );
};

const ShiftsAndBreaks = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const SHIFT_KEY = sessionId === 'admin' ? 'company_shifts' : `company_shifts_${sessionId}`;

  const [shifts, setShifts] = useState<{id: number, name: string, start: string, end: string}[]>(() => {
    try {
      const saved = localStorage.getItem(SHIFT_KEY);
      return saved ? JSON.parse(saved) : [{ id: 1, name: 'General Shift', start: '09:30', end: '18:30' }];
    } catch(e) { return [{ id: 1, name: 'General Shift', start: '09:30', end: '18:30' }]; }
  });

  useEffect(() => { localStorage.setItem(SHIFT_KEY, JSON.stringify(shifts)); }, [shifts, SHIFT_KEY]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Shifts & Breaks" icon={Clock} desc="Configure working hours and break durations." />
      <div className="grid grid-cols-1 gap-4">
        {shifts.map(shift => (
          <div key={shift.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
             <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shift Name</label>
                <input value={shift.name} onChange={(e) => setShifts(shifts.map(s => s.id === shift.id ? { ...s, name: e.target.value } : s))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
             </div>
             <div className="w-full md:w-32"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start</label><input type="time" value={shift.start} onChange={(e) => setShifts(shifts.map(s => s.id === shift.id ? { ...s, start: e.target.value } : s))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
             <div className="w-full md:w-32"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">End</label><input type="time" value={shift.end} onChange={(e) => setShifts(shifts.map(s => s.id === shift.id ? { ...s, end: e.target.value } : s))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
             <button type="button" onClick={() => shifts.length > 1 && setShifts(shifts.filter(s => s.id !== shift.id))} className="text-gray-400 hover:text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setShifts([...shifts, { id: Date.now(), name: 'New Shift', start: '09:00', end: '18:00' }])} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-emerald-400 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> Create New Shift</button>
      </div>
    </div>
  );
};

const AttendanceModes = () => {
  const [modes, setModes] = useState({ gps: true, selfie: true, qr: false, manual: false });
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

// FIX: Added missing CustomPaidLeaves component
const CustomPaidLeaves = () => {
  const [leaves, setLeaves] = useState([
    { id: 1, name: 'Casual Leave', code: 'CL', days: 12 },
    { id: 2, name: 'Sick Leave', code: 'SL', days: 10 },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Custom Paid Leaves" icon={Plane} desc="Manage available leave types and their annual quotas." />
      <div className="grid grid-cols-1 gap-4">
        {leaves.map(leave => (
          <div key={leave.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-800">{leave.name} ({leave.code})</div>
              <div className="text-xs text-gray-500">{leave.days} days per year</div>
            </div>
            <button type="button" className="text-gray-400 hover:text-emerald-600 p-2"><Edit2 className="w-4 h-4" /></button>
          </div>
        ))}
        <button type="button" className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-emerald-400 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Add Leave Type
        </button>
      </div>
    </div>
  );
};

// FIX: Added missing HolidayList component
const HolidayList = () => {
  const [holidays, setHolidays] = useState([
    { id: 1, name: 'New Year', date: '2025-01-01' },
    { id: 2, name: 'Pongal', date: '2025-01-14' },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Holiday List" icon={Calendar} desc="Configure the annual holiday calendar." />
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Holiday Name</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {holidays.map((h) => (
              <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{h.name}</td>
                <td className="px-6 py-4 text-gray-600">{h.date}</td>
                <td className="px-6 py-4 text-right">
                  <button type="button" className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-emerald-400 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" /> Add Holiday
      </button>
    </div>
  );
};

// FIX: Added missing AutoLiveTrack component
const AutoLiveTrack = () => {
  const [enabled, setEnabled] = useState(false);
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Auto Live Track" icon={Zap} desc="Enable automatic background location tracking during shift hours." />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <ToggleSwitch label="Enable Auto Tracking" checked={enabled} onChange={() => setEnabled(!enabled)} />
        <div className="p-4 bg-blue-50 text-blue-700 text-xs flex items-start gap-2 border-t border-blue-100">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Enabling this will track staff location automatically from Punch In to Punch Out. Requires staff permission on their mobile device.</p>
        </div>
      </div>
    </div>
  );
};

// FIX: Added missing AppNotifications component
const AppNotifications = () => {
  const [config, setConfig] = useState({ push: true, email: true, whatsapp: false });
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="App Notifications" icon={Bell} desc="Configure which channels to use for system alerts." />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        <ToggleSwitch label="Push Notifications" checked={config.push} onChange={() => setConfig({...config, push: !config.push})} />
        <ToggleSwitch label="Email Alerts" checked={config.email} onChange={() => setConfig({...config, email: !config.email})} />
        <ToggleSwitch label="WhatsApp Integration" checked={config.whatsapp} onChange={() => setConfig({...config, whatsapp: !config.whatsapp})} />
      </div>
    </div>
  );
};

const PayoutDateSettings = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';
  const DEPT_KEY = isSuperAdmin ? 'company_departments' : `company_departments_${sessionId}`;
  const PAYOUT_KEY = isSuperAdmin ? 'company_payout_dates' : `company_payout_dates_${sessionId}`;
  const GLOBAL_DAY_KEY = isSuperAdmin ? 'company_global_payout_day' : `company_global_payout_day_${sessionId}`;

  const [departments] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(DEPT_KEY);
      return saved ? JSON.parse(saved) : ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance'];
    } catch(e) { return ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance']; }
  });

  const [payoutConfig, setPayoutConfig] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(PAYOUT_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch(e) { return {}; }
  });

  const [globalDay, setGlobalDay] = useState<string>(() => localStorage.getItem(GLOBAL_DAY_KEY) || '5');

  const handleSave = () => {
    localStorage.setItem(PAYOUT_KEY, JSON.stringify(payoutConfig));
    localStorage.setItem(GLOBAL_DAY_KEY, globalDay);
    alert("Payout configuration saved!");
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
       <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Default Payout Day</label>
          <div className="flex items-center gap-3">
             <span className="text-sm text-gray-600">Monthly on the</span>
             <select value={globalDay} onChange={(e) => setGlobalDay(e.target.value)} className="w-20 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500">
                {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
             </select>
             <span className="text-sm text-gray-600">of every month</span>
          </div>
       </div>
       <div className="pt-4 border-t border-gray-100">
          <h4 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-500" /> Department Overrides</h4>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
             {departments.map(dept => (
                <div key={dept} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                   <span className="font-medium text-gray-700 text-sm">{dept}</span>
                   <select value={payoutConfig[dept] || ''} onChange={(e) => setPayoutConfig(prev => ({...prev, [dept]: e.target.value}))} className="w-32 p-1.5 text-xs border border-gray-300 rounded-lg outline-none">
                      <option value="">Default ({globalDay}th)</option>
                      {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}th</option>)}
                   </select>
                </div>
             ))}
          </div>
       </div>
       <div className="pt-4 flex justify-end">
          <button type="button" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"><Save className="w-4 h-4" /> Save Configuration</button>
       </div>
    </div>
  );
};

const CMSSettings = () => {
    const [pages, setPages] = useState({ privacy: '', terms: '', about: '', support: '' });
    useEffect(() => {
        const saved = localStorage.getItem('cms_content');
        if (saved) try { setPages(JSON.parse(saved)); } catch(e) {}
    }, []);

    const handleSave = () => {
        localStorage.setItem('cms_content', JSON.stringify(pages));
        alert("CMS content saved!");
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="CMS & Content" icon={BookOpen} desc="Manage website content pages." />
            <div className="grid grid-cols-1 gap-6">
                {['privacy', 'terms', 'about'].map(p => (
                    <div key={p} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4 capitalize">{p} Policy</h3>
                        <textarea value={(pages as any)[p]} onChange={(e) => setPages({...pages, [p]: e.target.value})} className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder={`Enter ${p} content...`} />
                    </div>
                ))}
                <div className="flex justify-end"><button type="button" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2"><Save className="w-4 h-4" /> Save Content</button></div>
            </div>
        </div>
    );
};

const FeatureRequest = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Request A Feature" icon={MessageSquare} desc="Help us improve OK BOZ." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
       <textarea rows={4} className="w-full p-4 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-4" placeholder="Describe the feature you would like to see..." />
       <button type="button" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors">Submit Request</button>
    </div>
  </div>
);

const EmployeeSettings: React.FC = () => {
  const [activeSetting, setActiveSetting] = useState<SettingCategory>('Departments & Roles');
  const menuItems = [
    { heading: 'MY COMPANY', items: [ { id: 'My Company Report', icon: FileText }, { id: 'My Team (Admins)', icon: CheckCircle }, { id: 'Departments & Roles', icon: Building2 }, { id: 'Custom Fields', icon: Settings2 }, { id: 'Inactive Employees', icon: UserX } ] },
    { heading: 'ATTENDANCE SETTINGS', items: [ { id: 'Shifts & Breaks', icon: Clock }, { id: 'Attendance Modes', icon: Smartphone } ] },
    { heading: 'LEAVES AND HOLIDAYS', items: [ { id: 'Custom Paid Leaves', icon: Plane }, { id: 'Holiday List', icon: Calendar } ] },
    { heading: 'AUTOMATION', items: [ { id: 'Auto Live Track', icon: Zap } ] },
    { heading: 'SALARY SETTINGS', items: [ { id: 'Calendar Month', icon: Calendar }, { id: 'Attendance Cycle', icon: RotateCcw }, { id: 'Payout Date', icon: CalendarCheck }, { id: 'Import Settings', icon: Download }, { id: 'Incentive Types', icon: Award }, { id: 'Salary Templates', icon: File }, { id: 'Round Off', icon: DollarSign } ] },
    { heading: 'ALERT & NOTIFICATION', items: [ { id: 'App Notifications', icon: Bell } ] },
    { heading: 'WEBSITE CONTENT', items: [ { id: 'CMS & Content', icon: BookOpen } ] },
    { heading: 'OTHER SETTINGS', items: [ { id: 'Request A Feature', icon: MessageSquare } ] }
  ];

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
      case 'CMS & Content': return <CMSSettings />;
      case 'Request A Feature': return <FeatureRequest />;
      case 'Payout Date': return <PayoutDateSettings />;
      default: return <div className="p-8 text-center text-gray-500">Select a configuration option from the left.</div>;
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-6 shrink-0"><h2 className="text-2xl font-bold text-gray-800">Configuration</h2></div>
      <div className="flex flex-1 overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex-shrink-0 overflow-y-auto custom-scrollbar">
          <div className="py-6 px-4 space-y-8">
            {menuItems.map((group, groupIdx) => (
              <div key={groupIdx}>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">{group.heading}</h4>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button key={item.id} onClick={() => setActiveSetting(item.id as SettingCategory)} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${activeSetting === item.id ? 'bg-white text-emerald-600 shadow-sm border border-gray-100' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                      <item.icon className={`w-4 h-4 ${activeSetting === item.id ? 'text-emerald-500' : 'text-gray-400'}`} />
                      {item.id}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white p-8">{renderContent()}</div>
      </div>
    </div>
  );
};

export default EmployeeSettings;
