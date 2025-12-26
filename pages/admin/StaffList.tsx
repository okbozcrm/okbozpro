
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, Briefcase, 
  Calendar, Pencil, Trash2, Building2, Lock, Download, Navigation, Globe, 
  MapPin, Eye, EyeOff, Smartphone, ScanLine, MousePointerClick, Heart, Home, 
  AlertCircle, PhoneCall, Laptop, ShieldCheck, Key, QrCode, ChevronDown, 
  IndianRupee, Fingerprint, Shield, UserCheck, Layers, FileCheck, CheckSquare, Square,
  Circle, Dot, DollarSign, Plane, Building, UserPlus, Info, HeartPulse
} from 'lucide-react'; 
import { Employee, UserRole } from '../../types';
import ContactDisplay from '../../components/ContactDisplay';

interface DisplayEmployee extends Employee {
    franchiseName?: string;
    franchiseId?: string;
}

const BLOOD_GROUPS = ['Select Blood Group', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Select Gender', 'Male', 'Female', 'Other'];
const MARITAL_STATUS = ['Select Status', 'Single', 'Married', 'Divorced', 'Widowed'];
const PAYMENT_CYCLES = ['Monthly', 'Weekly', 'Daily', 'Bi-Weekly'];

const MODULE_PERMISSIONS = [
  { id: 'reports', label: 'Reports & Analytics' },
  { id: 'trips', label: 'Trip Booking' },
  { id: 'driver-payments', label: 'Driver Payments' },
  { id: 'attendance_admin', label: 'Attendance (Admin View)' },
  { id: 'staff', label: 'Staff Management' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'finance', label: 'Finance & Expenses' },
  { id: 'leads', label: 'Franchisee Leads' },
  { id: 'auto-dialer', label: 'Auto Dialer' }
];

const StaffList: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- Core State ---
  const [employees, setEmployees] = useState<DisplayEmployee[]>([]);

  // Function to load employees based on current user scope
  const loadScopedStaff = () => {
    let allData: DisplayEmployee[] = [];
    
    if (isSuperAdmin) {
        // SUPER ADMIN: Load EVERYTHING from all buckets
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { 
                allData = [...allData, ...JSON.parse(adminData).map((e: any) => ({...e, franchiseName: 'OK BOZ HEAD OFFICE', franchiseId: 'admin'}))];
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
    } else {
        // FRANCHISE ADMIN: Load only their specific key
        const key = `staff_data_${sessionId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                allData = JSON.parse(saved).map((e: any) => ({...e, franchiseName: 'My Branch', franchiseId: sessionId }));
            } catch (e) {}
        }
    }
    setEmployees(allData);
  };

  const [corporates, setCorporates] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Configuration from Admin Settings
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [shiftOptions, setShiftOptions] = useState<any[]>([]);

  useEffect(() => {
    loadScopedStaff();
    
    const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
    setCorporates(corps);

    let allB: any[] = [];
    if (isSuperAdmin) {
        const adminB = JSON.parse(localStorage.getItem('branches_data') || '[]');
        allB = [...adminB.map((b: any) => ({...b, owner: 'admin'}))];
        corps.forEach((c: any) => {
            const cB = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
            allB = [...allB, ...cB.map((b: any) => ({...b, owner: c.email}))];
        });
    } else {
        allB = JSON.parse(localStorage.getItem(`branches_data_${sessionId}`) || '[]');
    }
    setBranches(allB);

    const DEPT_KEY = isSuperAdmin ? 'company_departments' : `company_departments_${sessionId}`;
    const ROLE_KEY = isSuperAdmin ? 'company_roles' : `company_roles_${sessionId}`;
    const SHIFT_KEY = isSuperAdmin ? 'company_shifts' : `company_shifts_${sessionId}`;

    setDepartmentOptions(JSON.parse(localStorage.getItem(DEPT_KEY) || '["Operations", "Sales", "HR"]'));
    setRoleOptions(JSON.parse(localStorage.getItem(ROLE_KEY) || '["Manager", "Supervisor", "Driver"]'));
    setShiftOptions(JSON.parse(localStorage.getItem(SHIFT_KEY) || '[{"name":"General Shift (09:30 - 18:30)"}]'));

    window.addEventListener('storage', loadScopedStaff);
    return () => window.removeEventListener('storage', loadScopedStaff);
  }, [isSuperAdmin, sessionId]);

  const getInitialFormState = () => ({
    firstName: '', lastName: '', email: '', password: 'user123', phone: '',
    gender: '', bloodGroup: '', maritalStatus: '', address: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
    department: '', role: '', branch: '', status: 'Active', shift: '', weekOff: 'Sunday',
    salary: '', paymentCycle: 'Monthly', accountNumber: '', ifsc: '', pan: '', aadhar: '',
    joiningDate: new Date().toISOString().split('T')[0],
    liveTracking: false,
    punchMethod: 'Manual' as 'Manual' | 'QR' | 'Disabled',
    locationRestriction: 'Anywhere' as 'Branch' | 'Anywhere',
    moduleAccess: [] as string[],
    franchiseId: isSuperAdmin ? 'admin' : sessionId
  });

  const [formData, setFormData] = useState(getInitialFormState());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    // Auto-strip Franchisee Leads if the user switches to a non-HO account
    if (name === 'franchiseId' && value !== 'admin') {
      setFormData(prev => ({
        ...prev,
        [name]: val,
        moduleAccess: prev.moduleAccess.filter(m => m !== 'leads')
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const togglePermission = (id: string) => {
    setFormData(prev => ({
        ...prev,
        moduleAccess: prev.moduleAccess.includes(id) 
            ? prev.moduleAccess.filter(m => m !== id)
            : [...prev.moduleAccess, id]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.phone || !formData.role) {
        alert("Please fill in all mandatory fields.");
        return;
    }

    const payload: DisplayEmployee = {
        ...formData,
        id: editingId || `BOZ${Date.now().toString().slice(-4)}`,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.firstName)}&background=10b981&color=fff`,
        attendanceConfig: {
            punchMethod: formData.punchMethod,
            locationRestriction: formData.locationRestriction
        }
    };

    // --- TRANSFER LOGIC ---
    if (editingId) {
        // Find original record to see if we need to remove it from another corporate bucket
        const originalEmp = employees.find(emp => emp.id === editingId);
        const originalFranchiseId = originalEmp?.franchiseId || 'admin';
        const newFranchiseId = formData.franchiseId || 'admin';

        if (originalFranchiseId !== newFranchiseId) {
            // Remove from old bucket
            const oldKey = originalFranchiseId === 'admin' ? 'staff_data' : `staff_data_${originalFranchiseId}`;
            const oldStorage = JSON.parse(localStorage.getItem(oldKey) || '[]');
            const updatedOldStorage = oldStorage.filter((e: any) => e.id !== editingId);
            localStorage.setItem(oldKey, JSON.stringify(updatedOldStorage));
        }
    }

    // Determine current target storage key
    const targetId = formData.franchiseId || 'admin';
    const storageKey = targetId === 'admin' ? 'staff_data' : `staff_data_${targetId}`;
    
    // Load target copy from storage to modify
    const currentStorage = JSON.parse(localStorage.getItem(storageKey) || '[]');
    let updatedStorage: any[];
    
    if (editingId) {
        // Check if employee already exists in target (in case it wasn't a move)
        const exists = currentStorage.some((emp: any) => emp.id === editingId);
        if (exists) {
            updatedStorage = currentStorage.map((emp: any) => emp.id === editingId ? payload : emp);
        } else {
            // Moving into this bucket for the first time
            updatedStorage = [payload, ...currentStorage];
        }
    } else {
        updatedStorage = [payload, ...currentStorage];
    }

    // Save to storage
    const cleanForStorage = updatedStorage.map(({franchiseName, franchiseId, ...rest}) => rest);
    localStorage.setItem(storageKey, JSON.stringify(cleanForStorage));

    // Refresh UI
    loadScopedStaff();
    setIsModalOpen(false);
    alert(editingId ? "Staff profile updated!" : "New staff member onboarded!");
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              emp.role.toLowerCase().includes(searchTerm.toLowerCase());
        // Extra security layer: ensure Franchise user only sees their specific ID
        const matchesScope = isSuperAdmin ? true : emp.franchiseId === sessionId;
        return matchesSearch && matchesScope;
    });
  }, [employees, searchTerm, isSuperAdmin, sessionId]);

  const handleDelete = (id: string, emp: DisplayEmployee) => {
    if(window.confirm(`Delete staff member ${emp.name}?`)) {
        const targetId = emp.franchiseId || 'admin';
        const storageKey = targetId === 'admin' ? 'staff_data' : `staff_data_${targetId}`;
        const currentStorage = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updated = currentStorage.filter((e: any) => e.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(updated));
        setEmployees(prev => prev.filter(e => e.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
            <p className="text-gray-500">
                {isSuperAdmin ? 'View and manage all organization staff' : 'Manage your franchise staff members'}
            </p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData(getInitialFormState()); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all transform active:scale-95"><UserPlus className="w-5 h-5" /> Add Staff</button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="Search by name or role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((emp) => (
          <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group relative">
            {isSuperAdmin && emp.franchiseName && (
                <div className="absolute top-3 right-3 bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {emp.franchiseName}
                </div>
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <img src={emp.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-50 shadow-sm" />
                <div className="flex gap-1">
                    <button onClick={() => { setEditingId(emp.id); setFormData({ ...getInitialFormState(), ...emp, firstName: emp.name.split(' ')[0], lastName: emp.name.split(' ').slice(1).join(' ') }); setIsModalOpen(true); }} className="text-gray-400 hover:text-emerald-600 p-2"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(emp.id, emp)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{emp.name}</h3>
              <p className="text-emerald-600 font-bold text-sm mb-1">{emp.role}</p>
              <p className="text-gray-400 text-xs font-medium">{emp.department} • Joined {new Date(emp.joiningDate).toLocaleDateString()}</p>
              <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-300" /><ContactDisplay type="phone" value={emp.phone || ''} /></div>
                  <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-300" /><ContactDisplay type="email" value={emp.email || ''} className="truncate" /></div>
              </div>
            </div>
          </div>
        ))}
        {filteredEmployees.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 italic bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                No staff members found matching your search or account scope.
            </div>
        )}
      </div>

      {/* --- STAFF MANAGEMENT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0 rounded-t-3xl">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Staff Details' : 'Onboard New Staff'}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{editingId ? 'Update employee information' : 'Create a new employee profile'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-gray-500 transition-colors p-2 rounded-full hover:bg-gray-50"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-12">
                
                {/* 1. PERSONAL INFORMATION */}
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-50">
                    <User className="w-3.5 h-3.5" /> Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">First Name</label><input name="firstName" required value={formData.firstName} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Enter First Name" /></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Last Name</label><input name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Enter Last Name" /></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Email Address</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" /><input name="email" type="email" required value={formData.email} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="name@okboz.com" /></div></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Phone Number</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" /><input name="phone" required value={formData.phone} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="+91 00000 00000" /></div></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Password</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" /><input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange} className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Date of Joining</label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" /><input name="joiningDate" type="date" value={formData.joiningDate} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" /></div></div>
                  </div>
                </section>

                {/* 2. EDIT STAFF DETAILS (Renamed from Extended Personal Details) */}
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-50">
                    <Heart className="w-3.5 h-3.5" /> Edit Staff Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Gender</label><select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOTNhM2FmIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xOSAxMmw3IDcgNy03Ii8+PC9zdmc+')] bg-no-repeat bg-[length:1em_1em] bg-[right_1rem_center]">{GENDERS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Blood Group</label><select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOTNhM2FmIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xOSAxMmw3IDcgNy03Ii8+PC9zdmc+')] bg-no-repeat bg-[length:1em_1em] bg-[right_1rem_center]">{BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Marital Status</label><select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOTNhM2FmIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xOSAxMmw3IDcgNy03Ii8+PC9zdmc+')] bg-no-repeat bg-[length:1em_1em] bg-[right_1rem_center]">{MARITAL_STATUS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                    <div className="md:col-span-3 space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Home Address</label><textarea name="address" rows={2} value={formData.address} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Enter residential address" /></div>
                  </div>
                </section>

                {/* 3. EMERGENCY CONTACT DETAILS */}
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-50">
                    <HeartPulse className="w-3.5 h-3.5" /> Emergency Contact Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5">
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Contact Person Name</label><input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all" placeholder="Full Name" /></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Phone Number</label><input name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all" placeholder="+91 00000 00000" /></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Relation</label><input name="emergencyContactRelation" value={formData.emergencyContactRelation} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all" placeholder="e.g. Spouse, Parent" /></div>
                  </div>
                </section>

                {/* 4. EMPLOYMENT DETAILS */}
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-50">
                    <Briefcase className="w-3.5 h-3.5" /> Employment Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Only show corporate selector if Super Admin */}
                    {isSuperAdmin && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 px-1">Assign to Corporate</label>
                            <select name="franchiseId" value={formData.franchiseId} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOTNhM2FmIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xOSAxMmw3IDcgNy03Ii8+PC9zdmc+')] bg-no-repeat bg-[length:1em_1em] bg-[right_1rem_center]">
                                <option value="admin">OK BOZ HEAD OFFICE</option>
                                {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Department</label><select name="department" value={formData.department} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOTNhM2FmIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xOSAxMmw3IDcgNy03Ii8+PC9zdmc+')] bg-no-repeat bg-[length:1em_1em] bg-[right_1rem_center]"><option value="">Select</option>{departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Job Role</label><select name="role" value={formData.role} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOTNhM2FmIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xOSAxMmw3IDcgNy03Ii8+PC9zdmc+')] bg-no-repeat bg-[length:1em_1em] bg-[right_1rem_center]"><option value="">Select</option>{roleOptions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Branch</label><select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOTNhM2FmIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xOSAxMmw3IDcgNy03Ii8+PC9zdmc+')] bg-no-repeat bg-[length:1em_1em] bg-[right_1rem_center]"><option value="">Select</option>{branches.map(b => <option key={b.id || b.name} value={b.name}>{b.name}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Status</label><select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOTNhM2FmIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xOSAxMmw3IDcgNy03Ii8+PC9zdmc+')] bg-no-repeat bg-[length:1em_1em] bg-[right_1rem_center]"><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Probation">Probation</option></select></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Shift / Working Hours</label><select name="shift" value={formData.shift} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOTNhM2FmIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xOSAxMmw3IDcgNy03Ii8+PC9zdmc+')] bg-no-repeat bg-[length:1em_1em] bg-[right_1rem_center]"><option value="">Select Shift</option>{shiftOptions.map((s, idx) => <option key={idx} value={s.name}>{s.name}</option>)}</select></div>
                  </div>
                </section>

                {/* 5. COMPENSATION */}
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-50">
                    <DollarSign className="w-3.5 h-3.5" /> Compensation
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Monthly Salary (CTC)</label><div className="relative"><IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input name="salary" type="number" value={formData.salary} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all" placeholder="0" /></div></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Payment Cycle</label><select name="paymentCycle" value={formData.paymentCycle} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOTNhM2FmIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xOSAxMmw3IDcgNy03Ii8+PC9zdmc+')] bg-no-repeat bg-[length:1em_1em] bg-[right_1rem_center]">{PAYMENT_CYCLES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">Bank Account Number</label><input name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all" placeholder="XXXXXXXXXXXXXX" /></div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 px-1">IFSC Code</label><input name="ifsc" value={formData.ifsc} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all font-mono" placeholder="ABCD0123456" /></div>
                  </div>
                </section>

                {/* 6. ATTENDANCE CONFIG */}
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-50">
                    <CheckSquare className="w-3.5 h-3.5" /> Attendance Protocols
                  </h4>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-6 shadow-sm">
                      <div className="space-y-4">
                          <label className="block text-sm font-bold text-gray-700">Punch-in Method</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {['Manual', 'QR', 'Disabled'].map(m => (
                                  <label key={m} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.punchMethod === m ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-200'}`}>
                                      <input type="radio" name="punchMethod" value={m} checked={formData.punchMethod === m} onChange={handleInputChange} className="w-4 h-4 text-emerald-600" />
                                      <span className="text-sm font-bold text-gray-700">{m}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                      <div className="space-y-4">
                          <label className="block text-sm font-bold text-gray-700">Location Restriction</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {['Branch', 'Anywhere'].map(l => (
                                  <label key={l} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.locationRestriction === l ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200'}`}>
                                      <input type="radio" name="locationRestriction" value={l} checked={formData.locationRestriction === l} onChange={handleInputChange} className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm font-bold text-gray-700">{l === 'Branch' ? 'At Assigned Branch (Geofenced)' : 'Anywhere (Field Staff)'}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  </div>
                </section>

                {/* 7. MODULE ACCESS PERMISSIONS */}
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-gray-50">
                    <Layers className="w-3.5 h-3.5" /> Module Access Permissions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MODULE_PERMISSIONS.filter(m => (m.id === 'leads') ? formData.franchiseId === 'admin' : true).map(module => (
                      <div 
                        key={module.id} 
                        onClick={() => togglePermission(module.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${formData.moduleAccess.includes(module.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                      >
                         {formData.moduleAccess.includes(module.id) ? (
                            <div className="bg-indigo-600 text-white p-1 rounded-md shadow-inner"><CheckSquare className="w-4 h-4" /></div>
                         ) : (
                            <div className="text-gray-200 p-1"><Square className="w-4 h-4" /></div>
                         )}
                         <span className={`text-sm font-bold ${formData.moduleAccess.includes(module.id) ? 'text-indigo-900' : 'text-gray-600'}`}>{module.label}</span>
                      </div>
                    ))}
                  </div>
                </section>

            </form>
            
            <div className="p-8 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex justify-end items-center gap-8 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest">Cancel</button>
              <button onClick={handleSubmit} className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all transform hover:scale-[1.02] active:scale-95">Update Profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
