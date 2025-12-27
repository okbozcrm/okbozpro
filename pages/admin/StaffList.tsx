
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

  const [employees, setEmployees] = useState<DisplayEmployee[]>([]);

  const loadScopedStaff = () => {
    let allData: DisplayEmployee[] = [];
    
    if (isSuperAdmin) {
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

  // FIX: Called getInitialFormState() instead of using initialFormState which was undefined
  const [formData, setFormData] = useState(getInitialFormState());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    if (name === 'franchiseId' && value !== 'admin') {
      setFormData(prev => ({ ...prev, [name]: val, moduleAccess: prev.moduleAccess.filter(m => m !== 'leads') }));
    } else {
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const togglePermission = (id: string) => {
    setFormData(prev => ({ ...prev, moduleAccess: prev.moduleAccess.includes(id) ? prev.moduleAccess.filter(m => m !== id) : [...prev.moduleAccess, id] }));
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
        attendanceConfig: { punchMethod: formData.punchMethod, locationRestriction: formData.locationRestriction }
    };
    if (editingId) {
        const originalEmp = employees.find(emp => emp.id === editingId);
        const originalFranchiseId = originalEmp?.franchiseId || 'admin';
        const newFranchiseId = formData.franchiseId || 'admin';
        if (originalFranchiseId !== newFranchiseId) {
            const oldKey = originalFranchiseId === 'admin' ? 'staff_data' : `staff_data_${originalFranchiseId}`;
            const oldStorage = JSON.parse(localStorage.getItem(oldKey) || '[]');
            localStorage.setItem(oldKey, JSON.stringify(oldStorage.filter((e: any) => e.id !== editingId)));
        }
    }
    const targetId = formData.franchiseId || 'admin';
    const storageKey = targetId === 'admin' ? 'staff_data' : `staff_data_${targetId}`;
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
    alert(editingId ? "Staff profile updated!" : "New staff member onboarded!");
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.role.toLowerCase().includes(searchTerm.toLowerCase());
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
        window.dispatchEvent(new Event('cloud-sync-immediate'));
        setEmployees(prev => prev.filter(e => e.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">Staff Management</h2><p className="text-gray-500">{isSuperAdmin ? 'View and manage all organization staff' : 'Manage your franchise staff members'}</p></div>
        <button onClick={() => { setEditingId(null); setFormData(getInitialFormState()); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all transform active:scale-95"><UserPlus className="w-5 h-5" /> Add Staff</button>
      </div>
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" /></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((emp) => (
          <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group relative">
            {isSuperAdmin && emp.franchiseName && (<div className="absolute top-3 right-3 bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1"><Building2 className="w-3 h-3" /> {emp.franchiseName}</div>)}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4"><img src={emp.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-50 shadow-sm" /><div className="flex gap-1"><button onClick={() => { setEditingId(emp.id); setFormData({ ...getInitialFormState(), ...emp, firstName: emp.name.split(' ')[0], lastName: emp.name.split(' ').slice(1).join(' ') }); setIsModalOpen(true); }} className="text-gray-400 hover:text-emerald-600 p-2"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDelete(emp.id, emp)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button></div></div>
              <h3 className="text-lg font-bold text-gray-900">{emp.name}</h3><p className="text-emerald-600 font-bold text-sm mb-1">{emp.role}</p><p className="text-gray-400 text-xs font-medium">{emp.department} Joined {new Date(emp.joiningDate).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-3xl shrink-0"><div><h3 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Staff' : 'Add Staff'}</h3></div><button onClick={() => setIsModalOpen(false)} className="text-gray-300 p-2"><X className="w-6 h-6" /></button></div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <input name="firstName" placeholder="First Name *" value={formData.firstName} onChange={handleInputChange} className="p-2 border rounded-lg" required />
                  <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleInputChange} className="p-2 border rounded-lg" />
                </div>
                <input name="email" placeholder="Email *" value={formData.email} onChange={handleInputChange} className="w-full p-2 border rounded-lg" required />
                <input name="phone" placeholder="Phone *" value={formData.phone} onChange={handleInputChange} className="w-full p-2 border rounded-lg" required />
                <div className="grid grid-cols-2 gap-4">
                  <select name="role" value={formData.role} onChange={handleInputChange} className="p-2 border rounded-lg bg-white" required><option value="">Select Role</option>{roleOptions.map(r => <option key={r} value={r}>{r}</option>)}</select>
                  <select name="department" value={formData.department} onChange={handleInputChange} className="p-2 border rounded-lg bg-white"><option value="">Select Dept</option>{departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}</select>
                </div>
                {isSuperAdmin && (
                  <select name="franchiseId" value={formData.franchiseId} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white">
                      <option value="admin">Head Office</option>
                      {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                  </select>
                )}
                <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold">Save Profile</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
