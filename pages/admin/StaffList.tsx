
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, Briefcase, Calendar, Pencil, Trash2, Building2, Lock, Download, Navigation, Globe, MapPin, Eye, EyeOff, Smartphone, ScanLine, MousePointerClick, Heart, Home, AlertCircle, PhoneCall, Laptop, ShieldCheck, Key, QrCode, UserCog, UserCheck, Hash, CheckSquare, Square, Save } from 'lucide-react'; 
import { Employee, Branch } from '../../types';
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
  { id: 'driver-monitoring', label: 'Driver Monitoring' },
  { id: 'driver-payments', label: 'Driver Payments' },
  { id: 'attendance_admin', label: 'Attendance (Admin View)' },
  { id: 'staff', label: 'Staff Management' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'finance', label: 'Finance & Expenses' }
];

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

  useEffect(() => {
    const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
    setCorporates(corps);

    let allBranches: any[] = [];
    if (isSuperAdmin) {
        const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
        allBranches = [...allBranches, ...adminBranches.map((b: any) => ({...b, corporateId: 'admin'}))];
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

    const savedDepts = localStorage.getItem(DEPT_KEY);
    setDepartmentOptions(savedDepts ? JSON.parse(savedDepts) : ['Sales', 'Marketing', 'Development', 'HR', 'Operations']);
    
    const savedRoles = localStorage.getItem(ROLE_KEY);
    setRoleOptions(savedRoles ? JSON.parse(savedRoles) : ['Manager', 'Team Lead', 'Executive', 'Intern', 'Director']);
    
    const savedShifts = localStorage.getItem(SHIFT_KEY);
    setShifts(savedShifts ? JSON.parse(savedShifts) : [{ id: 1, name: 'General Shift', start: '09:30', end: '18:30' }]);

  }, [isSuperAdmin, sessionId]);

  const availableBranches = useMemo(() => {
      if (!isSuperAdmin) return branches;
      if (filterCorporate === 'All') return branches;
      if (filterCorporate === 'admin') return branches.filter((b: any) => b.corporateId === 'admin');
      return branches.filter((b: any) => b.corporateId === filterCorporate);
  }, [branches, filterCorporate, isSuperAdmin]);

  // FIX: Persistent logic updated for Super Admin to save back to specific franchise keys
  useEffect(() => {
    if (!isSuperAdmin) {
        localStorage.setItem(`staff_data_${sessionId}`, JSON.stringify(employees));
    } else {
        // Group all employees by their franchiseId
        const groups: Record<string, DisplayEmployee[]> = {};
        employees.forEach(emp => {
            const fid = emp.franchiseId || 'admin';
            if (!groups[fid]) groups[fid] = [];
            groups[fid].push(emp);
        });

        // Save each group to its respective key
        Object.entries(groups).forEach(([fid, staffList]) => {
            const cleanStaff = staffList.map(({franchiseName, franchiseId, ...rest}) => rest);
            const key = fid === 'admin' ? 'staff_data' : `staff_data_${fid}`;
            localStorage.setItem(key, JSON.stringify(cleanStaff));
        });
    }
  }, [employees, isSuperAdmin, sessionId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const initialFormState = {
    id: '',
    firstName: '', lastName: '', email: '', password: 'user123', phone: '',
    department: '', role: '', branch: '', paymentCycle: 'Monthly', salary: '',
    joiningDate: new Date().toISOString().split('T')[0], status: 'Active',
    workingHours: '', weekOff: 'Sunday', aadhar: '', pan: '', accountNumber: '', ifsc: '',
    liveTracking: false, gender: '', bloodGroup: '', maritalStatus: '', address: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
    gpsGeofencing: false, qrScan: false, manualPunch: true, manualPunchMode: 'Anywhere' as 'Branch' | 'Anywhere', 
    punchMethod: 'Anywhere' as 'Branch' | 'Anywhere' | 'QR', moduleAccess: [] as string[]
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (formData.punchMethod === 'Branch') setFormData(prev => ({ ...prev, manualPunch: true, manualPunchMode: 'Branch', gpsGeofencing: true, qrScan: false }));
    else if (formData.punchMethod === 'Anywhere') setFormData(prev => ({ ...prev, manualPunch: true, manualPunchMode: 'Anywhere', gpsGeofencing: false, qrScan: false }));
    else if (formData.punchMethod === 'QR') setFormData(prev => ({ ...prev, manualPunch: false, qrScan: true }));
  }, [formData.punchMethod]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateNewEmployeeId = () => {
    let maxId = 0;
    employees.forEach(emp => {
      const match = emp.id.match(/^BOZ(\d+)$/);
      if (match) maxId = Math.max(maxId, parseInt(match[1], 10));
    });
    return `BOZ${String(maxId + 1).padStart(4, '0')}`;
  };

  const handleOpenAdd = () => {
      setEditingId(null);
      setFormData({
          ...initialFormState,
          id: generateNewEmployeeId()
      });
      setIsModalOpen(true);
  };

  const handleEdit = (employee: DisplayEmployee) => {
      setEditingId(employee.id);
      setFormData({ 
          ...initialFormState, 
          ...employee, 
          firstName: employee.name.split(' ')[0], 
          lastName: employee.name.split(' ').slice(1).join(' ') 
      }); 
      setIsModalOpen(true);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) { alert("Invalid CSV format."); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const newStaff: DisplayEmployee[] = [];
      let maxId = 0;
      employees.forEach(emp => {
        const match = emp.id.match(/^BOZ(\d+)$/);
        if (match) maxId = Math.max(maxId, parseInt(match[1], 10));
      });
      for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const data: any = {};
          headers.forEach((h, idx) => { data[h] = values[idx]; });
          const name = data.name || (data.firstname ? `${data.firstname} ${data.lastname}` : '');
          const email = data.email || data['email address'];
          if (name && email) {
              maxId++;
              newStaff.push({
                  id: data.id || `BOZ${String(maxId).padStart(4, '0')}`, name, email,
                  phone: data.phone || '', role: data.role || 'Employee', department: data.department || 'General',
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff`,
                  joiningDate: data.joiningdate || new Date().toISOString().split('T')[0], status: 'Active',
                  password: 'user123', weekOff: 'Sunday', franchiseId: isSuperAdmin ? 'admin' : sessionId,
                  attendanceConfig: { gpsGeofencing: false, qrScan: false, manualPunch: true, manualPunchMode: 'Anywhere' }
              });
          }
      }
      if (newStaff.length > 0) { setEmployees(prev => [...prev, ...newStaff]); alert(`Imported ${newStaff.length} members.`); }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // FIX: Added validation feedback
    if (!formData.firstName) { alert("First Name is required."); return; }
    if (!formData.role) { alert("Job Role is required."); return; }
    if (!formData.id) { alert("Employee ID is required."); return; }
    if (!formData.department) { alert("Department is required."); return; }
    
    const attendanceConfig = {
        gpsGeofencing: formData.punchMethod === 'Branch',
        qrScan: formData.punchMethod === 'QR',
        manualPunch: formData.punchMethod === 'Branch' || formData.punchMethod === 'Anywhere',
        manualPunchMode: (formData.punchMethod === 'Branch' ? 'Branch' : 'Anywhere') as 'Branch' | 'Anywhere'
    };

    if (editingId) {
      setEmployees(prev => prev.map(emp => emp.id === editingId ? {
        ...emp, 
        id: formData.id, 
        name: `${formData.firstName} ${formData.lastName}`, role: formData.role, department: formData.department || 'General',
        joiningDate: formData.joiningDate, email: formData.email, password: formData.password, phone: formData.phone,
        branch: formData.branch, paymentCycle: formData.paymentCycle, salary: formData.salary, status: formData.status,
        workingHours: formData.workingHours, weekOff: formData.weekOff, aadhar: formData.aadhar, pan: formData.pan,
        accountNumber: formData.accountNumber, ifsc: formData.ifsc, liveTracking: formData.liveTracking,
        allowRemotePunch: formData.punchMethod === 'Anywhere', gender: formData.gender, bloodGroup: formData.bloodGroup,
        maritalStatus: formData.maritalStatus, address: formData.address, emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone, emergencyContactRelation: formData.emergencyContactRelation,
        attendanceConfig, moduleAccess: formData.moduleAccess 
      } : emp));
    } else {
      const newEmployee: DisplayEmployee = {
        id: formData.id, name: `${formData.firstName} ${formData.lastName}`, role: formData.role, department: formData.department || 'General',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.firstName + ' ' + formData.lastName)}&background=10b981&color=fff`,
        joiningDate: formData.joiningDate, email: formData.email, password: formData.password, phone: formData.phone,
        branch: formData.branch, paymentCycle: formData.paymentCycle, salary: formData.salary, status: formData.status,
        workingHours: formData.workingHours, weekOff: formData.weekOff, aadhar: formData.aadhar, pan: formData.pan,
        accountNumber: formData.accountNumber, ifsc: formData.ifsc, franchiseId: isSuperAdmin ? 'admin' : sessionId,
        liveTracking: formData.liveTracking, allowRemotePunch: formData.punchMethod === 'Anywhere',
        gender: formData.gender, bloodGroup: formData.bloodGroup, maritalStatus: formData.maritalStatus, address: formData.address,
        emergencyContactName: formData.emergencyContactName, emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelation: formData.emergencyContactRelation, attendanceConfig, moduleAccess: formData.moduleAccess 
      };
      setEmployees(prev => [...prev, newEmployee]);
    }
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.role.toLowerCase().includes(searchTerm.toLowerCase()) || emp.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === 'All' || emp.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'All' || (emp.status || 'Active') === selectedStatus;
    const matchesCorporate = isSuperAdmin ? (filterCorporate === 'All' || (emp.franchiseId || 'admin') === filterCorporate) : true;
    const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
    return matchesSearch && matchesDept && matchesStatus && matchesCorporate && matchesBranch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">Staff Management</h2><p className="text-gray-500">{isSuperAdmin ? "Head Office & Franchise management" : "Manage your franchise team"}</p></div>
        <div className="flex gap-2">
            <input type="file" accept=".csv" ref={csvInputRef} className="hidden" onChange={handleCSVImport} />
            <button onClick={() => csvInputRef.current?.click()} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"><Upload className="w-5 h-5" /> Import CSV</button>
            <button onClick={handleOpenAdd} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"><Plus className="w-5 h-5" /> Add Staff</button>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row gap-4">
        <div className="flex-1 relative min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="Search by name, role or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-shadow" /></div>
        <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 xl:pb-0">
          {isSuperAdmin && (<select value={filterCorporate} onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"><option value="All">All Corporates</option><option value="admin">Head Office</option>{corporates.map((c: any) => (<option key={c.email} value={c.email}>{c.companyName}</option>))}</select>)}
          <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"><option value="All">All Branches</option>{availableBranches.map((b, i) => (<option key={i} value={b.name}>{b.name}</option>))}</select>
          <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"><option value="All">All Departments</option>{departmentOptions.map(dept => (<option key={dept} value={dept}>{dept}</option>))}</select>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"><option value="All">All Status</option><option value="Active">Active</option><option value="Probation">Probation</option><option value="Inactive">Inactive</option></select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div key={employee.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all group ${employee.status === 'Inactive' ? 'opacity-70 grayscale' : ''}`}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="relative"><img src={employee.avatar} alt={employee.name} className="w-16 h-16 rounded-full object-cover border-2 border-emerald-100 shadow-sm" />{employee.liveTracking && (<div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1.5 border-2 border-white shadow-sm animate-pulse"><Navigation className="w-3 h-3" /></div>)}</div>
                <div className="flex gap-1">
                    <button onClick={() => handleEdit(employee)} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setEmployees(prev => prev.filter(e => e.id !== employee.id))} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="mb-2">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    {employee.name}
                    <span className="text-[10px] font-mono text-gray-400">#{employee.id}</span>
                </h3>
                <p className="text-emerald-600 font-semibold text-sm">{employee.role}</p>
              </div>
              <p className="text-gray-500 text-xs mb-4 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {employee.department} Dept • Joined {formatDateDisplay(employee.joiningDate)}
              </p>
              <div className="space-y-2 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 transition-colors"><Phone className="w-4 h-4 text-gray-400" /><ContactDisplay type="phone" value={employee.phone || ''} /></div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 transition-colors"><Mail className="w-4 h-4 text-gray-400" /><ContactDisplay type="email" value={employee.email || ''} className="truncate" /></div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center group-hover:bg-gray-100 transition-colors">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${employee.status === 'Probation' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : employee.status === 'Inactive' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                    {employee.status || 'Active'}
                </span>
                <button onClick={() => handleEdit(employee)} className="text-xs text-blue-600 font-bold hover:underline tracking-tight">VIEW PROFILE</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl shadow-sm">
                        <UserCog className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Staff Profile' : 'Add New Staff Member'}</h3>
                        <p className="text-xs text-gray-500 font-medium">Configure personal and employment information</p>
                    </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} id="staff-form" className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
                {/* PERSONAL INFORMATION */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-3">
                    <User className="w-4 h-4" /> Personal Information
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">First Name</label>
                        <input type="text" name="firstName" required value={formData.firstName} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all" placeholder="John" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Last Name</label>
                        <input type="text" name="lastName" required value={formData.lastName} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all" placeholder="Doe" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all" placeholder="john.doe@company.com" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all" placeholder="+91 0000000000" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Gender</label>
                        <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Blood Group</label>
                        <input type="text" name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none" placeholder="e.g. O+" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Current Home Address</label>
                    <div className="relative">
                        <Home className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <textarea name="address" rows={2} value={formData.address} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none" placeholder="Enter full residential address..." />
                    </div>
                  </div>
                </section>

                {/* EMPLOYMENT DETAILS */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-3">
                    <Briefcase className="w-4 h-4" /> Employment Details
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Employee ID <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                name="id" 
                                required 
                                value={formData.id} 
                                onChange={handleInputChange} 
                                readOnly={!!editingId}
                                className={`w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none transition-all font-mono font-bold ${editingId ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'focus:ring-2 focus:ring-emerald-500 focus:border-transparent'}`} 
                                placeholder="BOZ0000" 
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Joining Date <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="date" 
                                name="joiningDate" 
                                required 
                                value={formData.joiningDate} 
                                onChange={handleInputChange} 
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Department <span className="text-red-500">*</span></label>
                        <select name="department" required value={formData.department} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                            <option value="">Select Department</option>
                            {departmentOptions.map(dept => (<option key={dept} value={dept}>{dept}</option>))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Job Role <span className="text-red-500">*</span></label>
                        <select name="role" required value={formData.role} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                            <option value="">Select Role</option>
                            {roleOptions.map(role => (<option key={role} value={role}>{role}</option>))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Branch Allocation</label>
                        <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                            <option value="">Select Branch</option>
                            {availableBranches.map((b: any, idx: number) => (<option key={idx} value={b.name}>{b.name}</option>))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Employment Status</label>
                        <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                            <option value="Active">Active</option>
                            <option value="Probation">Probation</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Monthly Salary (CTC)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                            <input type="number" name="salary" value={formData.salary} onChange={handleInputChange} className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0.00" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Payment Cycle</label>
                        <select name="paymentCycle" value={formData.paymentCycle} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white outline-none">
                            <option value="Monthly">Monthly</option>
                            <option value="Bi-Weekly">Bi-Weekly</option>
                            <option value="Weekly">Weekly</option>
                        </select>
                    </div>
                  </div>
                </section>

                {/* ACCESS PERMISSIONS */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-3">
                    <Key className="w-4 h-4" /> System Access & Permissions
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <p className="text-xs text-gray-500 font-medium mb-4">Grant access to specific dashboard modules:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {PERMISSION_MODULES.map(mod => (
                              <label key={mod.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formData.moduleAccess.includes(mod.id) ? 'bg-white border-emerald-200 shadow-sm' : 'bg-transparent border-gray-100 hover:border-gray-200'}`}>
                                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${formData.moduleAccess.includes(mod.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}`}>
                                      {formData.moduleAccess.includes(mod.id) && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                      {!formData.moduleAccess.includes(mod.id) && <Square className="w-3.5 h-3.5 text-transparent" />}
                                  </div>
                                  <input 
                                      type="checkbox" 
                                      className="hidden" 
                                      checked={formData.moduleAccess.includes(mod.id)} 
                                      onChange={() => setFormData(prev => ({ ...prev, moduleAccess: prev.moduleAccess.includes(mod.id) ? prev.moduleAccess.filter(id => id !== mod.id) : [...prev.moduleAccess, mod.id] }))} 
                                  />
                                  <span className={`text-xs font-bold ${formData.moduleAccess.includes(mod.id) ? 'text-emerald-700' : 'text-gray-600'}`}>{mod.label}</span>
                              </label>
                          ))}
                      </div>
                  </div>
                </section>
            </form>

            <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl text-gray-600 font-bold hover:bg-gray-200 transition-colors text-sm">Cancel</button>
                <button onClick={handleSubmit} type="button" form="staff-form" className="px-10 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all transform active:scale-95 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {editingId ? 'Update Profile' : 'Register Staff'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
