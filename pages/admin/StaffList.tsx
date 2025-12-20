import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, Briefcase, 
  Calendar, Pencil, Trash2, Building2, Lock, Download, Navigation, Globe, 
  MapPin, Eye, EyeOff, Smartphone, ScanLine, MousePointerClick, Heart, Home, 
  AlertCircle, PhoneCall, Laptop, ShieldCheck, Key, QrCode, ChevronDown, 
  IndianRupee, Fingerprint, Shield, UserCheck, Layers, FileCheck, CheckSquare, Square,
  Circle, Dot, DollarSign, Plane
} from 'lucide-react'; 
import { Employee, Branch, UserRole } from '../../types';
import ContactDisplay from '../../components/ContactDisplay';

interface Shift {
    id: number;
    name: string;
    start: string;
    end: string;
}

interface DisplayEmployee extends Employee {
    franchiseName?: string;
    franchiseId?: string;
}

const formatDateDisplay = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const PERMISSION_MODULES = [
  { id: 'reports', label: 'Reports & Analytics' },
  { id: 'trips', label: 'Trip Booking' },
  { id: 'driver-payments', label: 'Driver Payments' },
  { id: 'attendance_admin', label: 'Attendance (Admin View)' },
  { id: 'staff', label: 'Staff Management' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'finance', label: 'Finance & Expenses' }
];

const BLOOD_GROUPS = ['Select Blood Group', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Select Gender', 'Male', 'Female', 'Other'];
const MARITAL_STATUS = ['Select Status', 'Single', 'Married', 'Divorced', 'Widowed'];
const PAYMENT_CYCLES = ['Monthly', 'Weekly', 'Daily', 'Bi-Weekly'];
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const StaffList: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const [employees, setEmployees] = useState<DisplayEmployee[]>(() => {
    if (isSuperAdmin) {
        let allData: DisplayEmployee[] = [];
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { 
                allData = [...allData, ...JSON.parse(adminData).map((e: any) => ({...e, franchiseName: 'Head Office', franchiseId: 'admin'}))];
            } catch (e) {}
        }
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporates.forEach((corp: any) => {
            const cData = localStorage.getItem(`staff_data_${corp.email}`);
            if (cData) {
                try {
                    allData = [...allData, ...JSON.parse(cData).map((e: any) => ({...e, franchiseName: corp.companyName, franchiseId: corp.email }))];
                } catch (e) {}
            }
        });
        return allData;
    } else {
        const key = `staff_data_${sessionId}`;
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : [];
    }
  });

  const [branches, setBranches] = useState<any[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [globalLeaveTypes, setGlobalLeaveTypes] = useState<any[]>([]);

  useEffect(() => {
    const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
    setCorporates(corps);

    let allBranches: any[] = [];
    if (isSuperAdmin) {
        const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
        allBranches = [...adminBranches.map((b: any) => ({...b, corporateId: 'admin'}))];
        corps.forEach((c: any) => {
            const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
            allBranches = [...allBranches, ...cBranches.map((b: any) => ({...b, corporateId: c.email}))];
        });
    } else {
        const saved = localStorage.getItem(`branches_data_${sessionId}`);
        if (saved) allBranches = JSON.parse(saved);
    }
    setBranches(allBranches);

    const DEPT_KEY = isSuperAdmin ? 'company_departments' : `company_departments_${sessionId}`;
    const ROLE_KEY = isSuperAdmin ? 'company_roles' : `company_roles_${sessionId}`;
    const SHIFT_KEY = isSuperAdmin ? 'company_shifts' : `company_shifts_${sessionId}`;
    const LEAVE_KEY = isSuperAdmin ? 'company_leave_types' : `company_leave_types_${sessionId}`;

    setDepartmentOptions(JSON.parse(localStorage.getItem(DEPT_KEY) || '["Sales", "Operations"]'));
    setRoleOptions(JSON.parse(localStorage.getItem(ROLE_KEY) || '["Manager", "Executive"]'));
    setShifts(JSON.parse(localStorage.getItem(SHIFT_KEY) || '[{"id":1,"name":"General","start":"09:30","end":"18:30"}]'));
    setGlobalLeaveTypes(JSON.parse(localStorage.getItem(LEAVE_KEY) || '[]'));

  }, [isSuperAdmin, sessionId]);

  const availableBranches = useMemo(() => {
      if (!isSuperAdmin) return branches;
      if (filterCorporate === 'All') return branches;
      if (filterCorporate === 'admin') return branches.filter((b: any) => b.corporateId === 'admin');
      return branches.filter((b: any) => b.corporateId === filterCorporate);
  }, [branches, filterCorporate, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) {
        localStorage.setItem(`staff_data_${sessionId}`, JSON.stringify(employees));
    } else {
        const headOfficeStaff = employees.filter(e => e.franchiseId === 'admin');
        const cleanStaff = headOfficeStaff.map(({franchiseName, franchiseId, ...rest}) => rest);
        localStorage.setItem('staff_data', JSON.stringify(cleanStaff));
    }
  }, [employees, isSuperAdmin, sessionId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const getInitialFormState = () => {
    const isAutoTrackGlobal = localStorage.getItem(isSuperAdmin ? 'company_auto_live_track' : `company_auto_live_track_${sessionId}`) === 'true';
    return {
        firstName: '', lastName: '', email: '', password: 'user123', phone: '',
        department: '', role: '', branch: '', paymentCycle: 'Monthly', salary: '',
        joiningDate: new Date().toISOString().split('T')[0], status: 'Active',
        workingHours: '', weekOff: 'Sunday', aadhar: '', pan: '', accountNumber: '', ifsc: '',
        liveTracking: isAutoTrackGlobal, 
        gender: '', bloodGroup: '', maritalStatus: '', address: '',
        emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
        punchMethod: 'Manual' as 'Manual' | 'QR' | 'Anywhere',
        locationRestriction: 'Anywhere' as 'Branch' | 'Anywhere',
        moduleAccess: [] as string[],
        leaveBalances: globalLeaveTypes.reduce((acc: any, curr: any) => ({ ...acc, [curr.code]: curr.days }), {})
    };
  };

  const [formData, setFormData] = useState(getInitialFormState());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const generateNewEmployeeId = () => {
    let maxId = 0;
    employees.forEach(emp => {
      const match = emp.id.match(/^BOZ(\d+)$/);
      if (match) maxId = Math.max(maxId, parseInt(match[1], 10));
    });
    return `BOZ${String(maxId + 1).padStart(4, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.role) return;

    const attendanceConfig = {
        gpsGeofencing: formData.punchMethod === 'Manual' && formData.locationRestriction === 'Branch',
        qrScan: formData.punchMethod === 'QR',
        manualPunch: formData.punchMethod === 'Manual' || formData.punchMethod === 'Anywhere',
        manualPunchMode: formData.locationRestriction
    };

    const payload = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`,
        attendanceConfig
    };

    if (editingId) {
      setEmployees(prev => prev.map(emp => emp.id === editingId ? { ...emp, ...payload } : emp));
    } else {
      const newEmployee: DisplayEmployee = {
        ...payload,
        id: generateNewEmployeeId(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.firstName + ' ' + formData.lastName)}&background=10b981&color=fff`,
        franchiseId: isSuperAdmin ? 'admin' : sessionId
      };
      setEmployees(prev => [...prev, newEmployee]);
    }
    setIsModalOpen(false);
    setFormData(getInitialFormState());
    setEditingId(null);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === 'All' || emp.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'All' || (emp.status || 'Active') === selectedStatus;
    const matchesCorporate = isSuperAdmin ? (filterCorporate === 'All' || (emp.franchiseId || 'admin') === filterCorporate) : true;
    const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
    return matchesSearch && matchesDept && matchesStatus && matchesCorporate && matchesBranch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">Staff Management</h2><p className="text-gray-500">{isSuperAdmin ? "All branches management" : "Manage your franchise team"}</p></div>
        <div className="flex gap-2">
            <input type="file" accept=".csv" ref={csvInputRef} className="hidden" onChange={() => {}} />
            <button onClick={() => csvInputRef.current?.click()} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"><Upload className="w-5 h-5" /> Import CSV</button>
            <button onClick={() => { setEditingId(null); setFormData(getInitialFormState()); setIsModalOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"><Plus className="w-5 h-5" /> Add Staff</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row gap-4">
        <div className="flex-1 relative min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="Search staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
        <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 xl:pb-0">
          {isSuperAdmin && (<select value={filterCorporate} onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"><option value="All">All Corporates</option><option value="admin">Head Office</option>{corporates.map((c: any) => (<option key={c.email} value={c.email}>{c.companyName}</option>))}</select>)}
          <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"><option value="All">All Branches</option>{availableBranches.map((b, i) => (<option key={i} value={b.name}>{b.name}</option>))}</select>
          <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"><option value="All">All Departments</option>{departmentOptions.map(dept => (<option key={dept} value={dept}>{dept}</option>))}</select>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"><option value="All">All Status</option><option value="Active">Active</option><option value="Probation">Probation</option><option value="Inactive">Inactive</option></select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div key={employee.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group ${employee.status === 'Inactive' ? 'opacity-70' : ''}`}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="relative"><img src={employee.avatar} alt={employee.name} className="w-16 h-16 rounded-full object-cover border-2 border-emerald-100" />{employee.liveTracking && (<div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1 border-2 border-white shadow-sm"><Navigation className="w-3 h-3" /></div>)}</div>
                <div className="flex gap-1">
                    <button onClick={() => { setEditingId(employee.id); setFormData({ ...getInitialFormState(), ...employee, firstName: employee.name.split(' ')[0], lastName: employee.name.split(' ').slice(1).join(' ') }); setIsModalOpen(true); }} className="text-gray-400 hover:text-emerald-600 p-2 transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setEmployees(prev => prev.filter(e => e.id !== employee.id))} className="text-gray-400 hover:text-red-600 p-2 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800">{employee.name}</h3>
              <p className="text-emerald-600 font-medium text-sm mb-1">{employee.role}</p>
              <p className="text-gray-500 text-xs mb-4">{employee.department} Dept • Joined {formatDateDisplay(employee.joiningDate)}</p>
              <div className="space-y-2 pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" /><ContactDisplay type="phone" value={employee.phone || ''} /></div>
                  <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" /><ContactDisplay type="email" value={employee.email || ''} className="truncate" /></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-10 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Staff Details' : 'Add New Staff'}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{editingId ? 'Update employee information' : 'Onboard a new member to your team'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-gray-500 transition-colors p-1"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10">
                <section className="space-y-6">
                  <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-50"><User className="w-3.5 h-3.5" /> Personal Information</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-600">First Name</label><input name="firstName" required value={formData.firstName} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="First Name" /></div>
                    <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-600">Last Name</label><input name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Last Name" /></div>
                    <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-600">Email Address</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input name="email" type="email" required value={formData.email} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="example@email.com" /></div></div>
                    <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-600">Phone Number</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input name="phone" required value={formData.phone} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="+91..." /></div></div>
                    <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-600">Password</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange} className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                    <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-600">Date of Joining</label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /><input name="joiningDate" type="date" value={formData.joiningDate} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none" /></div></div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h4 className="text-[10px] font-bold text-purple-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-50"><Briefcase className="w-3.5 h-3.5" /> Employment Details</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="relative"><label className="text-xs font-semibold text-gray-600 mb-1.5 block">Department</label><select name="department" value={formData.department} onChange={handleInputChange} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none appearance-none pr-10"><option value="">Select Department</option>{departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}</select><ChevronDown className="absolute right-3 bottom-3 w-4 h-4 text-gray-400 pointer-events-none" /></div>
                    <div className="relative"><label className="text-xs font-semibold text-gray-600 mb-1.5 block">Job Role</label><select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none appearance-none pr-10"><option value="">Select Role</option>{roleOptions.map(r => <option key={r} value={r}>{r}</option>)}</select><ChevronDown className="absolute right-3 bottom-3 w-4 h-4 text-gray-400 pointer-events-none" /></div>
                    <div className="relative"><label className="text-xs font-semibold text-gray-600 mb-1.5 block">Branch</label><select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none appearance-none pr-10"><option value="">Select Branch</option>{availableBranches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}</select><ChevronDown className="absolute right-3 bottom-3 w-4 h-4 text-gray-400 pointer-events-none" /></div>
                    <div className="relative"><label className="text-xs font-semibold text-gray-600 mb-1.5 block">Status</label><select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none appearance-none pr-10"><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Probation">Probation</option></select><ChevronDown className="absolute right-3 bottom-3 w-4 h-4 text-gray-400 pointer-events-none" /></div>
                  </div>
                </section>

                {globalLeaveTypes.length > 0 && (
                  <section className="space-y-6">
                    <h4 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-50"><Plane className="w-3.5 h-3.5" /> Leave Allocation</h4>
                    <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl">
                      {globalLeaveTypes.map(lt => (
                        <div key={lt.code} className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">{lt.name} ({lt.code})</label>
                          <input 
                            type="number" 
                            className="w-full p-2 border rounded-lg text-sm" 
                            value={formData.leaveBalances[lt.code]} 
                            onChange={(e) => setFormData({...formData, leaveBalances: { ...formData.leaveBalances, [lt.code]: e.target.value }})}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="space-y-6">
                  <h4 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-50"><FileCheck className="w-3.5 h-3.5" /> Documents & Settings</h4>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-6">
                      <div className="flex items-start gap-4">
                          <input type="checkbox" name="liveTracking" id="liveTracking" checked={formData.liveTracking} onChange={handleInputChange} className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                          <label htmlFor="liveTracking" className="cursor-pointer"><span className="block text-sm font-bold text-gray-800">Enable Live Tracking</span><span className="text-[10px] text-gray-400 font-medium">Track location during shift hours (Mandatory for Marketing/Sales)</span></label>
                      </div>
                      <div className="space-y-4">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance Configuration</label>
                          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
                              <label className="flex items-center gap-3 cursor-pointer group"><input type="radio" name="punchMethod" value="Manual" checked={formData.punchMethod === 'Manual'} onChange={handleInputChange} className="w-4 h-4 text-emerald-600" /><div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Manual Button (Branch GPS Restricted)</span><span className="text-[10px] text-gray-400">Punch only works within configured branch radius.</span></div></label>
                              <label className="flex items-center gap-3 cursor-pointer group"><input type="radio" name="punchMethod" value="QR" checked={formData.punchMethod === 'QR'} onChange={handleInputChange} className="w-4 h-4 text-emerald-600" /><div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Require QR Scan</span><span className="text-[10px] text-gray-400">Scan physical QR code placed at branch.</span></div></label>
                              <label className="flex items-center gap-3 cursor-pointer group"><input type="radio" name="punchMethod" value="Anywhere" checked={formData.punchMethod === 'Anywhere'} onChange={handleInputChange} className="w-4 h-4 text-emerald-600" /><div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Web Punch <span className="font-normal text-emerald-500">(Work From Anywhere)</span></span><span className="text-[10px] text-gray-400">Allows marking attendance without location restriction.</span></div></label>
                          </div>
                      </div>
                  </div>
                </section>
            </form>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end items-center gap-6">
              <button onClick={() => setIsModalOpen(false)} className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
              <button onClick={handleSubmit} className="px-10 py-3.5 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all transform active:scale-95">Update Profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;