
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, Briefcase, 
  Calendar, Pencil, Trash2, Building2, Lock, Download, Navigation, Globe, 
  MapPin, Eye, EyeOff, Smartphone, ScanLine, MousePointerClick, Heart, Home, 
  AlertCircle, PhoneCall, Laptop, ShieldCheck, Key, QrCode, ChevronDown, 
  IndianRupee, Fingerprint, Shield, UserCheck, Layers, FileCheck, CheckSquare, Square,
  Circle, Dot, DollarSign, Plane, Building, UserPlus, Info, HeartPulse, Check, Car, BarChart3, Users, Landmark, CheckCircle,
  Save
} from 'lucide-react'; 
import { Employee, UserRole } from '../../types';

interface DisplayEmployee extends Employee {
    franchiseName?: string;
    franchiseId?: string;
}

const BLOOD_GROUPS = ['Select Blood Group', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Select Gender', 'Male', 'Female', 'Other'];
const MARITAL_STATUS = ['Select Status', 'Single', 'Married', 'Divorced', 'Widowed'];
const SHIFT_OPTIONS = ['Select Shift', 'General Shift (09:30 - 18:30)', 'Night Shift (22:00 - 07:00)', 'Afternoon Shift (14:00 - 23:00)'];
const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MODULE_PERMISSIONS = [
  { id: 'trips', label: 'Trip Earning (Bookings)', icon: Car },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'driver_payments', label: 'Driver Payments', icon: CreditCard },
  { id: 'staff_mgt', label: 'Staff Management', icon: Users },
  { id: 'finance', label: 'Finance & Expenses', icon: Landmark },
  { id: 'live_tracking', label: 'Live Tracking', icon: Navigation },
  { id: 'leads', label: 'Franchisee Leads', icon: Layers },
  { id: 'payroll', label: 'Payroll Access', icon: DollarSign }
];

const StaffList: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const [employees, setEmployees] = useState<DisplayEmployee[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);

  const loadScopedStaff = () => {
    let allData: DisplayEmployee[] = [];
    if (isSuperAdmin) {
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { 
                allData = [...allData, ...JSON.parse(adminData).map((e: any) => ({...e, franchiseName: 'OK BOZ HEAD OFFICE', franchiseId: 'admin'}))];
            } catch (e) {}
        }
        const corporatesList = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporatesList.forEach((corp: any) => {
            const cData = localStorage.getItem(`staff_data_${corp.email}`);
            if (cData) {
                try {
                    allData = [...allData, ...JSON.parse(cData).map((e: any) => ({...e, franchiseName: corp.companyName, franchiseId: corp.email }))];
                } catch (e) {}
            }
        });
    } else {
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
    setDepartmentOptions(JSON.parse(localStorage.getItem(DEPT_KEY) || '["Operations", "Sales", "HR", "Support", "Marketing"]'));
    setRoleOptions(JSON.parse(localStorage.getItem(ROLE_KEY) || '["Manager", "Supervisor", "Driver", "Executive", "Staff"]'));

    window.addEventListener('storage', loadScopedStaff);
    return () => window.removeEventListener('storage', loadScopedStaff);
  }, [isSuperAdmin, sessionId]);

  const getInitialFormState = (): Partial<Employee> & { franchiseId: string } => ({
    name: '', email: '', phone: '', password: 'user123',
    dob: '', gender: '', bloodGroup: '', maritalStatus: '', address: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
    department: '', role: '', branch: '', status: 'Active', shift: '', weekOff: 'Sunday',
    salary: '', accountNumber: '', ifsc: '', pan: '', aadhar: '', upiId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    attendanceConfig: { 
        punchMethod: 'Manual', 
        locationRestriction: 'Branch',
        gpsGeofencing: true,
        qrScan: false,
        manualPunch: true,
        workMode: 'Office'
    },
    moduleAccess: [],
    franchiseId: isSuperAdmin ? 'admin' : sessionId
  });

  const [formData, setFormData] = useState<any>(getInitialFormState());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev: any) => ({
            ...prev,
            attendanceConfig: { ...prev.attendanceConfig, [name]: checked }
        }));
    } else {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const togglePermission = (id: string) => {
    setFormData((prev: any) => ({ 
        ...prev, 
        moduleAccess: prev.moduleAccess.includes(id) 
            ? prev.moduleAccess.filter((m: string) => m !== id) 
            : [...prev.moduleAccess, id] 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim()) {
        alert("Please fill in mandatory fields: Name, Phone, and Email.");
        return;
    }

    const payload: DisplayEmployee = {
        ...formData,
        id: editingId || `BOZ${Date.now().toString().slice(-4)}`,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=10b981&color=fff`,
    };

    const targetId = formData.franchiseId || 'admin';
    const storageKey = targetId === 'admin' ? 'staff_data' : `staff_data_${targetId}`;
    
    // Logic to handle moving staff between franchises if editing
    if (editingId) {
        const originalEmp = employees.find(emp => emp.id === editingId);
        const originalFranchiseId = originalEmp?.franchiseId || 'admin';
        if (originalFranchiseId !== targetId) {
            const oldKey = originalFranchiseId === 'admin' ? 'staff_data' : `staff_data_${originalFranchiseId}`;
            const oldStorage = JSON.parse(localStorage.getItem(oldKey) || '[]');
            localStorage.setItem(oldKey, JSON.stringify(oldStorage.filter((e: any) => e.id !== editingId)));
        }
    }

    const currentStorage = JSON.parse(localStorage.getItem(storageKey) || '[]');
    let updatedStorage: any[];
    if (editingId) {
        updatedStorage = currentStorage.map((emp: any) => emp.id === editingId ? payload : emp);
    } else {
        updatedStorage = [payload, ...currentStorage];
    }
    
    const cleanForStorage = updatedStorage.map(({franchiseName, franchiseId, ...rest}: any) => rest);
    localStorage.setItem(storageKey, JSON.stringify(cleanForStorage));
    
    window.dispatchEvent(new Event('cloud-sync-immediate'));
    loadScopedStaff();
    setIsModalOpen(false);
    alert(editingId ? "Profile updated!" : "Employee onboarded successfully!");
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              emp.phone.includes(searchTerm);
        const matchesScope = isSuperAdmin ? true : emp.franchiseId === sessionId;
        return matchesSearch && matchesScope;
    });
  }, [employees, searchTerm, isSuperAdmin, sessionId]);

  const SectionTitle = ({ icon: Icon, title, color = "text-emerald-500" }: { icon: any, title: string, color?: string }) => (
      <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <h4 className="text-xs font-black uppercase tracking-widest text-gray-700">{title}</h4>
      </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
            <p className="text-gray-500">{isSuperAdmin ? 'Full organization directory' : 'Franchise workforce management'}</p>
        </div>
        <button 
            onClick={() => { setEditingId(null); setFormData(getInitialFormState()); setIsModalOpen(true); }} 
            className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all transform active:scale-95"
        >
            <UserPlus className="w-5 h-5" /> Onboard New Employee
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by name, phone or role..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium" 
              />
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((emp) => (
          <div key={emp.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group relative">
            {isSuperAdmin && emp.franchiseName && (
                <div className="absolute top-3 right-3 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border border-indigo-100 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {emp.franchiseName}
                </div>
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <img src={emp.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm bg-gray-50" />
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => { 
                            setEditingId(emp.id); 
                            setFormData({ ...getInitialFormState(), ...emp }); 
                            setIsModalOpen(true); 
                        }} 
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => {
                            if(window.confirm("Delete staff member permanent?")) {
                                const key = emp.franchiseId === 'admin' ? 'staff_data' : `staff_data_${emp.franchiseId}`;
                                const stored = JSON.parse(localStorage.getItem(key) || '[]');
                                localStorage.setItem(key, JSON.stringify(stored.filter((e:any) => e.id !== emp.id)));
                                loadScopedStaff();
                            }
                        }} 
                        className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 truncate">{emp.name}</h3>
              <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-2">{emp.role}</p>
              
              <div className="space-y-2 mt-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                      <Phone className="w-3.5 h-3.5" /> {emp.phone}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                      <Building className="w-3.5 h-3.5" /> {emp.branch || 'Head Office'}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                      <CheckCircle className={`w-3.5 h-3.5 ${emp.status === 'Active' ? 'text-emerald-500' : 'text-gray-300'}`} /> {emp.status}
                  </div>
              </div>
            </div>
          </div>
        ))}
        {filteredEmployees.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                <Users className="w-16 h-16 mx-auto text-gray-300 mb-4 opacity-20" />
                <p className="font-black uppercase tracking-[0.3em] text-gray-400 text-xs">No staff members found</p>
            </div>
        )}
      </div>

      {/* COMPREHENSIVE ONBOARDING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl my-4 animate-in zoom-in duration-200 flex flex-col max-h-[95vh] border border-white">
            
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
               <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">{editingId ? 'Edit Staff Profile' : 'Onboard New Employee'}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">HR Management System • Enterprise Tier</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white hover:bg-gray-100 rounded-2xl text-gray-400 hover:text-rose-500 transition-all shadow-sm">
                  <X className="w-7 h-7" />
               </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 p-10">
                    
                    {/* LEFT COLUMN: PERSONAL & IDENTITY */}
                    <div className="space-y-10">
                        {/* Core Identity */}
                        <section>
                            <SectionTitle icon={User} title="Core Identity" />
                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8">
                                <div className="shrink-0 flex flex-col items-center gap-3">
                                    <div className="w-32 h-32 rounded-full border-4 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative overflow-hidden group">
                                        <Upload className="w-6 h-6 mb-1 group-hover:-translate-y-1 transition-transform" />
                                        <span className="text-[10px] font-black uppercase text-center px-4">Upload Photo</span>
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Full Name *</label>
                                        <input name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" placeholder="Legal Name" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Phone *</label>
                                        <input name="phone" required value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono" placeholder="+91..." />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Email (Login ID) *</label>
                                        <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" placeholder="employee@okboz.com" />
                                    </div>
                                    <div className="md:col-span-2 relative">
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Set Password *</label>
                                        <div className="relative">
                                            <input type={showPassword ? "text" : "password"} name="password" required value={formData.password} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" placeholder="Minimum 6 chars" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Personal Details */}
                        <section>
                            <SectionTitle icon={Heart} title="Personal Details" color="text-rose-500" />
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="relative">
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Date of Birth</label>
                                    <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold bg-white">
                                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Blood Group</label>
                                    <select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold bg-white">
                                        {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Marital Status</label>
                                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold bg-white">
                                        {MARITAL_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Home Address</label>
                                    <textarea name="address" rows={2} value={formData.address} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-medium resize-none" placeholder="Complete resident address..." />
                                </div>
                            </div>
                        </section>

                        {/* Emergency Contact */}
                        <section>
                            <SectionTitle icon={PhoneCall} title="Emergency Contact" color="text-orange-500" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold" placeholder="Contact Name" />
                                </div>
                                <div>
                                    <input name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-mono" placeholder="+91..." />
                                </div>
                                <div className="col-span-2">
                                    <input name="emergencyContactRelation" value={formData.emergencyContactRelation} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold" placeholder="Relationship (e.g. Spouse, Father)" />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: EMPLOYMENT & CONFIG */}
                    <div className="space-y-10">
                        {/* Employment Details */}
                        <section>
                            <SectionTitle icon={Briefcase} title="Employment Details" color="text-blue-500" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <select name="department" value={formData.department} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white text-sm">
                                        <option value="">Select Dept</option>
                                        {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <select name="role" value={formData.role} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white text-sm">
                                        <option value="">Select Role</option>
                                        {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-4">
                                    {isSuperAdmin && (
                                        <select name="franchiseId" value={formData.franchiseId} onChange={handleInputChange} className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 text-sm">
                                            <option value="admin">Head Office (Internal)</option>
                                            {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                                        </select>
                                    )}
                                    <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white text-sm">
                                        <option value="">Select Branch</option>
                                        {branches.filter(b => b.owner === formData.franchiseId).map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Joining Date</label>
                                    <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Salary (Monthly CTC)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input type="number" name="salary" value={formData.salary} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="e.g. 25000" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Assigned Shift</label>
                                    <select name="shift" value={formData.shift} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white text-sm">
                                        {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Weekly Off</label>
                                    <select name="weekOff" value={formData.weekOff} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white text-sm">
                                        {WEEK_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* KYC & Banking */}
                        <section>
                            <SectionTitle icon={CreditCard} title="KYC & Banking" color="text-indigo-500" />
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <input name="aadhar" value={formData.aadhar} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-mono" placeholder="Aadhar Number" />
                                <input name="pan" value={formData.pan} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-mono uppercase" placeholder="PAN Number" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <input name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-mono" placeholder="Account Number" />
                                <input name="ifsc" value={formData.ifsc} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-mono uppercase" placeholder="IFSC Code" />
                            </div>
                            <input name="upiId" value={formData.upiId} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-mono" placeholder="UPI ID (optional)" />
                        </section>

                        {/* System Configuration */}
                        <section>
                            <SectionTitle icon={ShieldCheck} title="System Configuration" color="text-slate-600" />
                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-200 space-y-6">
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Attendance Rules</p>
                                    <div className="space-y-2">
                                        <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                                            <span className="text-sm font-bold text-gray-700">GPS Geofencing</span>
                                            <input type="checkbox" name="gpsGeofencing" checked={formData.attendanceConfig.gpsGeofencing} onChange={handleInputChange} className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                                        </label>
                                        <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                                            <span className="text-sm font-bold text-gray-700">QR Scan Required</span>
                                            <input type="checkbox" name="qrScan" checked={formData.attendanceConfig.qrScan} onChange={handleInputChange} className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                                        </label>
                                        <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                                            <span className="text-sm font-bold text-gray-700">Allow Manual Punch</span>
                                            <input type="checkbox" name="manualPunch" checked={formData.attendanceConfig.manualPunch} onChange={handleInputChange} className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Work Mode (Punch Restrictions)</p>
                                    <div className="flex gap-4">
                                        <button 
                                            type="button" 
                                            onClick={() => setFormData((prev:any) => ({ ...prev, attendanceConfig: { ...prev.attendanceConfig, workMode: 'Remote' } }))}
                                            className={`flex-1 p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${formData.attendanceConfig.workMode === 'Remote' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                                        >
                                            <Check className="w-5 h-5" />
                                            <div className="text-left">
                                                <p className="text-xs font-black uppercase tracking-tighter">Remote Allowed</p>
                                                <p className="text-[10px] opacity-60">(Anywhere)</p>
                                            </div>
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setFormData((prev:any) => ({ ...prev, attendanceConfig: { ...prev.attendanceConfig, workMode: 'Office' } }))}
                                            className={`flex-1 p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${formData.attendanceConfig.workMode === 'Office' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                                        >
                                            <Check className="w-5 h-5" />
                                            <div className="text-left">
                                                <p className="text-xs font-black uppercase tracking-tighter">Office Only</p>
                                                <p className="text-[10px] opacity-60">(Geofence Restricted)</p>
                                            </div>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 italic px-2">Tracking is active only when employee is clocked in.</p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 mb-2 block">Account Status</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700">
                                        <option value="Active">Active</option>
                                        <option value="On Hold">On Hold</option>
                                        <option value="Terminated">Terminated</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Module Permissions */}
                        <section>
                            <SectionTitle icon={Layers} title="Module Access Permissions" color="text-indigo-600" />
                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 max-h-60 overflow-y-auto custom-scrollbar">
                                {MODULE_PERMISSIONS.map(perm => (
                                    <label key={perm.id} className="flex items-center gap-3 group cursor-pointer">
                                        <div 
                                            onClick={() => togglePermission(perm.id)}
                                            className={`w-5 h-5 rounded flex items-center justify-center transition-all ${formData.moduleAccess.includes(perm.id) ? 'bg-emerald-500 border-emerald-500 shadow-sm' : 'bg-white border border-gray-300 group-hover:border-emerald-400'}`}
                                        >
                                            {formData.moduleAccess.includes(perm.id) && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <perm.icon className={`w-3.5 h-3.5 ${formData.moduleAccess.includes(perm.id) ? 'text-emerald-600' : 'text-gray-400'}`} />
                                            <span className={`text-xs font-bold ${formData.moduleAccess.includes(perm.id) ? 'text-gray-800' : 'text-gray-500'}`}>{perm.label}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </form>

            <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end gap-4 shrink-0 rounded-b-[2.5rem]">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-10 py-4 bg-white border border-gray-200 text-gray-600 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
                  className="px-16 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all transform active:scale-95 flex items-center gap-3"
                >
                  <Save className="w-5 h-5" /> Save Employee Profile
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
