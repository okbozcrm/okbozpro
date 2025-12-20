
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, Briefcase, Building, Calendar, Pencil, Trash2, Building2, Lock, Download, Navigation, Globe, MapPin, Eye, EyeOff, Smartphone, ScanLine, MousePointerClick, Heart, Home, AlertCircle, PhoneCall, Laptop, ShieldCheck, Key, QrCode } from 'lucide-react'; 
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

    // Load namespaced settings
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const initialFormState = {
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
                  id: `BOZ${String(maxId).padStart(4, '0')}`, name, email,
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
    e.preventDefault();
    if (!formData.firstName || !formData.role) return;
    const attendanceConfig = {
        gpsGeofencing: formData.punchMethod === 'Branch',
        qrScan: formData.punchMethod === 'QR',
        manualPunch: formData.punchMethod === 'Branch' || formData.punchMethod === 'Anywhere',
        manualPunchMode: (formData.punchMethod === 'Branch' ? 'Branch' : 'Anywhere') as 'Branch' | 'Anywhere'
    };
    if (editingId) {
      setEmployees(prev => prev.map(emp => emp.id === editingId ? {
        ...emp, name: `${formData.firstName} ${formData.lastName}`, role: formData.role, department: formData.department || 'General',
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
        id: generateNewEmployeeId(), name: `${formData.firstName} ${formData.lastName}`, role: formData.role, department: formData.department || 'General',
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
            <input type="file" accept=".csv" ref={csvInputRef} className="hidden" onChange={handleCSVImport} />
            <button onClick={() => csvInputRef.current?.click()} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"><Upload className="w-5 h-5" /> Import CSV</button>
            <button onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"><Plus className="w-5 h-5" /> Add Staff</button>
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
                <div className="flex gap-1"><button onClick={() => { setEditingId(employee.id); setFormData({ ...initialFormState, ...employee, firstName: employee.name.split(' ')[0], lastName: employee.name.split(' ').slice(1).join(' ') }); setIsModalOpen(true); }} className="text-gray-400 hover:text-emerald-600 p-2"><Pencil className="w-4 h-4" /></button><button onClick={() => setEmployees(prev => prev.filter(e => e.id !== employee.id))} className="text-gray-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button></div>
              </div>
              <h3 className="text-lg font-bold text-gray-800">{employee.name}</h3><p className="text-emerald-600 font-medium text-sm mb-1">{employee.role}</p><p className="text-gray-500 text-xs mb-4">{employee.department} Dept • Joined {formatDateDisplay(employee.joiningDate)}</p>
              <div className="space-y-2 pt-2 border-t border-gray-50"><div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" /><ContactDisplay type="phone" value={employee.phone || ''} /></div><div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" /><ContactDisplay type="email" value={employee.email || ''} className="truncate" /></div></div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center"><span className={`text-xs font-medium px-2 py-1 rounded-full ${employee.status === 'Probation' ? 'bg-yellow-100 text-yellow-700' : employee.status === 'Inactive' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{employee.status || 'Active'}</span><button onClick={() => { setEditingId(employee.id); setIsModalOpen(true); }} className="text-sm text-blue-600 font-medium hover:underline">View Profile</button></div>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl"><div><h3 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Staff' : 'Add New Staff'}</h3></div><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b">Personal Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" name="firstName" required placeholder="First Name" value={formData.firstName} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" />
                    <input type="text" name="lastName" required placeholder="Last Name" value={formData.lastName} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" />
                    <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" />
                    <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                </section>
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b">Employment Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <select name="department" value={formData.department} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg bg-white"><option value="">Select Department</option>{departmentOptions.map(dept => (<option key={dept} value={dept}>{dept}</option>))}</select>
                    <select name="role" required value={formData.role} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg bg-white"><option value="">Select Role</option>{roleOptions.map(role => (<option key={role} value={role}>{role}</option>))}</select>
                    <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg bg-white"><option value="">Select Branch</option>{availableBranches.map((b: any, idx: number) => (<option key={idx} value={b.name}>{b.name}</option>))}</select>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg bg-white"><option value="Active">Active</option><option value="Probation">Probation</option><option value="Inactive">Inactive</option></select>
                  </div>
                </section>
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Key className="w-3 h-3" /> Module Access Permissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {PERMISSION_MODULES.map(mod => (
                          <label key={mod.id} className="flex items-center gap-2 cursor-pointer p-2 bg-gray-50 rounded border border-gray-100">
                              <input type="checkbox" checked={formData.moduleAccess.includes(mod.id)} onChange={() => setFormData(prev => ({ ...prev, moduleAccess: prev.moduleAccess.includes(mod.id) ? prev.moduleAccess.filter(id => id !== mod.id) : [...prev.moduleAccess, mod.id] }))} className="w-4 h-4" />
                              <span className="text-sm">{mod.label}</span>
                          </label>
                      ))}
                  </div>
                </section>
            </form>
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3"><button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors">Cancel</button><button onClick={handleSubmit} className="px-8 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md transition-all transform hover:scale-105">{editingId ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
