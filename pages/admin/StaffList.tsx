
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, Briefcase, Building, Calendar, Pencil, Trash2, Building2, Lock, Download, Navigation, Globe, MapPin, Eye, EyeOff, Smartphone, ScanLine, MousePointerClick, Heart, Home, AlertCircle, PhoneCall, Laptop, ShieldCheck, Key, QrCode } from 'lucide-react'; 
import { Employee, Branch } from '../../types';

interface Shift {
    id: number;
    name: string;
    start: string;
    end: string;
}

// Extended interface for UI display
interface DisplayEmployee extends Employee {
    franchiseName?: string;
    franchiseId?: string;
}

// Helper to format date as dd/mm/yyyy
const formatDateDisplay = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Available Modules for Permission
const PERMISSION_MODULES = [
  { id: 'reports', label: 'Reports & Analytics' },
  { id: 'trips', label: 'Trip Booking' },
  { id: 'driver-payments', label: 'Driver Payments' },
  { id: 'attendance_admin', label: 'Attendance (Admin View)' },
  { id: 'staff', label: 'Staff Management' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'finance', label: 'Finance & Expenses' }
];

const StaffList: React.FC = () => {
  // Determine Session Context
  const getSessionKey = (key: string) => {
     const sessionId = localStorage.getItem('app_session_id') || 'admin';
     return sessionId === 'admin' ? key : `${key}_${sessionId}`;
  };

  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  // Initialize state
  const [employees, setEmployees] = useState<DisplayEmployee[]>(() => {
    if (isSuperAdmin) {
        // --- SUPER ADMIN AGGREGATION ---
        let allData: DisplayEmployee[] = [];
        
        // 1. Admin Data
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { 
                const parsed = JSON.parse(adminData);
                // Explicitly set franchiseId to 'admin' for proper filtering
                allData = [...allData, ...parsed.map((e: any) => ({...e, franchiseName: 'Head Office', franchiseId: 'admin'}))];
            } catch (e) {}
        } else {
             allData = [];
        }

        // 2. Corporate Data
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporates.forEach((corp: any) => {
            const cData = localStorage.getItem(`staff_data_${corp.email}`);
            if (cData) {
                try {
                    const parsed = JSON.parse(cData);
                    const tagged = parsed.map((e: any) => ({...e, franchiseName: corp.companyName, franchiseId: corp.email }));
                    allData = [...allData, ...tagged];
                } catch (e) {}
            }
        });
        return allData;
    } else {
        // --- REGULAR FRANCHISE LOGIC ---
        const key = getSessionKey('staff_data');
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) { console.error(e); }
        }
        return [];
    }
  });

  const [branches, setBranches] = useState<any[]>([]); // Using any to accommodate corporateId extension
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);
  
  // Filters
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Dynamic Settings from EmployeeSettings
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);

  // Load Settings (Departments, Roles, Shifts, Branches, Corporates)
  useEffect(() => {
    // 1. Load Corporates (Super Admin Only)
    if (isSuperAdmin) {
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            setCorporates(corps);
        } catch(e) {}
    }

    // 2. Load Branches (Aggregated for Super Admin)
    let allBranches: any[] = [];
    if (isSuperAdmin) {
        // Head Office
        try {
            const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
            allBranches = [...allBranches, ...adminBranches.map((b: any) => ({...b, corporateId: 'admin'}))];
        } catch(e) {}
        
        // Corporates
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
                const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
                allBranches = [...allBranches, ...cBranches.map((b: any) => ({...b, corporateId: c.email}))];
            });
        } catch(e) {}
    } else {
        const branchKey = getSessionKey('branches_data');
        try {
            const saved = localStorage.getItem(branchKey);
            if (saved) allBranches = JSON.parse(saved);
        } catch(e) {}
    }
    setBranches(allBranches);

    // 3. Shifts (Prioritize company_shifts key from EmployeeSettings, fall back to old app_settings)
    const savedShifts = localStorage.getItem('company_shifts');
    if (savedShifts) {
        try { 
            setShifts(JSON.parse(savedShifts)); 
        } catch (e) { console.error(e); }
    } else {
        // Fallback to legacy structure
        const settingsKey = getSessionKey('app_settings');
        const savedSettings = localStorage.getItem(settingsKey);
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                if (parsed.shifts && Array.isArray(parsed.shifts)) {
                    setShifts(parsed.shifts);
                }
            } catch (e) { console.error(e); }
        }
        // Default if nothing exists
        if (shifts.length === 0) {
             setShifts([{ id: 1, name: 'General Shift', start: '09:30', end: '18:30' }]);
        }
    }

    // 4. Departments & Roles (Global for simplicity, or namespaced if needed)
    const savedDepts = localStorage.getItem('company_departments');
    if (savedDepts) {
        try { setDepartmentOptions(JSON.parse(savedDepts)); } catch (e) {}
    } else {
        setDepartmentOptions(['Sales', 'Marketing', 'Development', 'HR', 'Operations']);
    }

    const savedRoles = localStorage.getItem('company_roles');
    if (savedRoles) {
        try { setRoleOptions(JSON.parse(savedRoles)); } catch (e) {}
    } else {
        setRoleOptions(['Manager', 'Team Lead', 'Executive', 'Intern', 'Director']);
    }

  }, [isSuperAdmin]);

  // Derived Available Branches based on filters
  const availableBranches = useMemo(() => {
      if (!isSuperAdmin) return branches;
      if (filterCorporate === 'All') return branches;
      if (filterCorporate === 'admin') return branches.filter((b: any) => b.corporateId === 'admin');
      return branches.filter((b: any) => b.corporateId === filterCorporate);
  }, [branches, filterCorporate, isSuperAdmin]);

  // Save to namespaced localStorage ONLY if not viewing aggregated data
  useEffect(() => {
    if (!isSuperAdmin) {
        const key = getSessionKey('staff_data');
        localStorage.setItem(key, JSON.stringify(employees));
    } else {
        // For Super Admin, we only save 'Head Office' staff back to 'staff_data' to avoid overwriting franchise data with the whole list
        const headOfficeStaff = employees.filter(e => e.franchiseName === 'Head Office');
        // Strip metadata before saving to keep data clean
        const cleanStaff = headOfficeStaff.map(({franchiseName, franchiseId, ...rest}) => rest);
        localStorage.setItem('staff_data', JSON.stringify(cleanStaff));
    }
  }, [employees, isSuperAdmin]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const initialFormState = {
    firstName: '',
    lastName: '',
    email: '',
    password: '', 
    phone: '',
    department: '',
    role: '', 
    branch: '',
    paymentCycle: 'Monthly',
    salary: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'Onboarding',
    workingHours: '', 
    weekOff: 'Sunday',
    aadhar: '',
    pan: '',
    accountNumber: '',
    ifsc: '',
    liveTracking: false,
    
    // Personal Details
    gender: '',
    bloodGroup: '',
    maritalStatus: '',
    address: '',

    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',

    // Attendance Config
    gpsGeofencing: true,
    qrScan: false,
    manualPunch: true,
    manualPunchMode: 'Branch' as 'Branch' | 'Anywhere', // Default to Branch restricted
    punchMethod: 'Manual' as 'Manual' | 'QR' | 'Disabled', // New state for radio group logic
    
    // Module Access
    moduleAccess: [] as string[]
  };

  const [formData, setFormData] = useState(initialFormState);

  // Sync punchMethod with underlying flags
  useEffect(() => {
    if (formData.punchMethod === 'Manual') {
        setFormData(prev => ({ ...prev, manualPunch: true, qrScan: false }));
    } else if (formData.punchMethod === 'QR') {
        setFormData(prev => ({ ...prev, manualPunch: false, qrScan: true }));
    } else {
        setFormData(prev => ({ ...prev, manualPunch: false, qrScan: false }));
    }
  }, [formData.punchMethod]);

  // Auto-enable Live Tracking for Marketing/Sales
  useEffect(() => {
      const dept = formData.department.toLowerCase();
      if (dept.includes('marketing') || dept.includes('sales')) {
          setFormData(prev => ({...prev, liveTracking: true}));
      }
  }, [formData.department]);

  // Auto-enable Live Tracking for 'Work from Anywhere' mode
  useEffect(() => {
      if (formData.manualPunchMode === 'Anywhere' && formData.punchMethod === 'Manual') {
          setFormData(prev => ({...prev, liveTracking: true}));
      }
  }, [formData.manualPunchMode, formData.punchMethod]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleModuleAccessChange = (moduleId: string) => {
    setFormData(prev => {
        const current = prev.moduleAccess || [];
        if (current.includes(moduleId)) {
            return { ...prev, moduleAccess: current.filter(id => id !== moduleId) };
        } else {
            return { ...prev, moduleAccess: [...current, moduleId] };
        }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const generateNewEmployeeId = () => {
    // Find the highest ID number
    let maxId = 0;
    employees.forEach(emp => {
      const match = emp.id.match(/^BOZ(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    });
    
    const nextId = maxId + 1;
    return `BOZ${String(nextId).padStart(4, '0')}`;
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) {
          alert("Invalid CSV format. Needs header and at least one row.");
          return;
      }
      
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
          const rowData: any = {};
          headers.forEach((h, idx) => { rowData[h] = values[idx]; });
          
          const name = rowData.name || rowData['employee name'] || rowData.firstname ? `${rowData.firstname} ${rowData.lastname}` : '';
          const email = rowData.email || rowData['email address'];
          
          if (name && email) {
              maxId++;
              newStaff.push({
                  id: `BOZ${String(maxId).padStart(4, '0')}`,
                  name: name,
                  email: email,
                  phone: rowData.phone || rowData.mobile || '',
                  role: rowData.role || rowData.designation || 'Employee',
                  department: rowData.department || 'General',
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff`,
                  joiningDate: rowData.joiningdate || new Date().toISOString().split('T')[0],
                  status: 'Active',
                  password: 'user123',
                  weekOff: 'Sunday',
                  gender: rowData.gender || '',
                  bloodGroup: rowData.bloodgroup || '',
                  maritalStatus: '',
                  address: '',
                  franchiseName: isSuperAdmin ? 'Head Office' : undefined,
                  franchiseId: isSuperAdmin ? 'admin' : undefined,
                  liveTracking: false,
                  attendanceConfig: {
                      gpsGeofencing: true,
                      qrScan: false,
                      manualPunch: true,
                      manualPunchMode: 'Branch'
                  },
                  moduleAccess: [] // Default no special access
              });
          }
      }
      
      if (newStaff.length > 0) {
          setEmployees(prev => [...prev, ...newStaff]);
          alert(`Successfully imported ${newStaff.length} staff members.`);
      } else {
          alert("No valid staff records found. Ensure columns: Name, Email, Phone, Role, Department.");
      }
    };
    
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData(initialFormState);
    if (shifts.length > 0) {
        setFormData(prev => ({...prev, workingHours: shifts[0].name}));
    }
    setEditingId(null);
    setShowPassword(false);
    setIsModalOpen(false);
    setSelectedFiles([]);
  };

  const handleEdit = (employee: Employee) => {
    const nameParts = employee.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    // Determine Punch Method state based on config
    let method: 'Manual' | 'QR' | 'Disabled' = 'Disabled';
    if (employee.attendanceConfig?.qrScan) method = 'QR';
    else if (employee.attendanceConfig?.manualPunch) method = 'Manual';

    setFormData({
      firstName: firstName || '',
      lastName: lastName || '',
      email: employee.email || '',
      password: employee.password || '', 
      phone: employee.phone || '',
      department: employee.department,
      role: employee.role,
      branch: employee.branch || '',
      paymentCycle: employee.paymentCycle || 'Monthly',
      salary: employee.salary || '',
      joiningDate: employee.joiningDate,
      status: employee.status || 'Active',
      workingHours: employee.workingHours || (shifts.length > 0 ? shifts[0].name : ''),
      weekOff: employee.weekOff || 'Sunday',
      aadhar: employee.aadhar || '',
      pan: employee.pan || '',
      accountNumber: employee.accountNumber || '',
      ifsc: employee.ifsc || '',
      liveTracking: employee.liveTracking || false,
      gender: employee.gender || '',
      bloodGroup: employee.bloodGroup || '',
      maritalStatus: employee.maritalStatus || '',
      address: employee.address || '',
      emergencyContactName: employee.emergencyContactName || '',
      emergencyContactPhone: employee.emergencyContactPhone || '',
      emergencyContactRelation: employee.emergencyContactRelation || '',
      gpsGeofencing: employee.attendanceConfig?.gpsGeofencing ?? !employee.allowRemotePunch ?? true,
      qrScan: employee.attendanceConfig?.qrScan ?? false,
      manualPunch: employee.attendanceConfig?.manualPunch ?? true, 
      manualPunchMode: employee.attendanceConfig?.manualPunchMode || 'Branch',
      punchMethod: method, // Set the radio group state
      moduleAccess: employee.moduleAccess || []
    });
    setEditingId(employee.id);
    setShowPassword(false);
    setIsModalOpen(true);
    setSelectedFiles([]); 
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.role) return;

    // Logic: If Mode is 'Anywhere', we usually disable geofencing strictness.
    // If Mode is 'Branch', we enable geofencing.
    const isBranchMode = formData.manualPunchMode === 'Branch';
    
    // Final logic based on the radio selection
    let finalManualPunch = false;
    let finalQrScan = false;
    
    if (formData.punchMethod === 'Manual') {
        finalManualPunch = true;
    } else if (formData.punchMethod === 'QR') {
        finalQrScan = true;
    }

    const attendanceConfig = {
        gpsGeofencing: isBranchMode && finalManualPunch, // Enforce geofencing if in Branch mode and Manual
        qrScan: finalQrScan,
        manualPunch: finalManualPunch,
        manualPunchMode: formData.manualPunchMode
    };

    if (editingId) {
      // Update existing
      setEmployees(prev => prev.map(emp => {
        if (emp.id === editingId) {
          return {
            ...emp,
            name: `${formData.firstName} ${formData.lastName}`,
            role: formData.role,
            department: formData.department || 'General',
            joiningDate: formData.joiningDate,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            branch: formData.branch,
            paymentCycle: formData.paymentCycle,
            salary: formData.salary,
            status: formData.status,
            workingHours: formData.workingHours,
            weekOff: formData.weekOff,
            aadhar: formData.aadhar,
            pan: formData.pan,
            accountNumber: formData.accountNumber,
            ifsc: formData.ifsc,
            liveTracking: formData.liveTracking,
            allowRemotePunch: formData.manualPunchMode === 'Anywhere', // Allow remote if Anywhere mode
            gender: formData.gender,
            bloodGroup: formData.bloodGroup,
            maritalStatus: formData.maritalStatus,
            address: formData.address,
            emergencyContactName: formData.emergencyContactName,
            emergencyContactPhone: formData.emergencyContactPhone,
            emergencyContactRelation: formData.emergencyContactRelation,
            attendanceConfig: attendanceConfig,
            moduleAccess: formData.moduleAccess // Save module permissions
          };
        }
        return emp;
      }));
    } else {
      // Create new
      const newEmployee: DisplayEmployee = {
        id: generateNewEmployeeId(),
        name: `${formData.firstName} ${formData.lastName}`,
        role: formData.role,
        department: formData.department || 'General',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.firstName + ' ' + formData.lastName)}&background=10b981&color=fff`,
        joiningDate: formData.joiningDate,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        branch: formData.branch,
        paymentCycle: formData.paymentCycle,
        salary: formData.salary,
        status: formData.status,
        workingHours: formData.workingHours,
        weekOff: formData.weekOff,
        aadhar: formData.aadhar,
        pan: formData.pan,
        accountNumber: formData.accountNumber,
        ifsc: formData.ifsc,
        franchiseName: isSuperAdmin ? 'Head Office' : undefined, 
        franchiseId: isSuperAdmin ? 'admin' : undefined,
        liveTracking: formData.liveTracking,
        allowRemotePunch: formData.manualPunchMode === 'Anywhere',
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        maritalStatus: formData.maritalStatus,
        address: formData.address,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelation: formData.emergencyContactRelation,
        attendanceConfig: attendanceConfig,
        moduleAccess: formData.moduleAccess // Save module permissions
      };
      setEmployees(prev => [...prev, newEmployee]);
    }
    
    resetForm();
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === 'All' || emp.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'All' || (emp.status || 'Active') === selectedStatus;
    
    let matchesCorporate = true;
    if (isSuperAdmin && filterCorporate !== 'All') {
        const empCorpId = emp.franchiseId || 'admin';
        matchesCorporate = empCorpId === filterCorporate;
    }

    const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
    
    return matchesSearch && matchesDept && matchesStatus && matchesCorporate && matchesBranch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
          <p className="text-gray-500">
             {isSuperAdmin ? "View and manage employees across all franchises" : "Manage your employees and their roles"}
          </p>
        </div>
        <div className="flex gap-2">
            <input 
                type="file" 
                accept=".csv" 
                ref={csvInputRef} 
                className="hidden" 
                onChange={handleCSVImport} 
            />
            <button 
                onClick={() => csvInputRef.current?.click()}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
                <Upload className="w-5 h-5" />
                Import CSV
            </button>
            <button 
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Staff
            </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row gap-4">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search staff by name or role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-2 md:gap-4 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
          
          {/* Corporate Filter (Super Admin) */}
          {isSuperAdmin && (
              <select 
                value={filterCorporate}
                onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm text-gray-700 cursor-pointer min-w-[160px]"
              >
                <option value="All">All Corporates</option>
                <option value="admin">Head Office</option>
                {corporates.map((c: any) => (
                    <option key={c.email} value={c.email}>{c.companyName}</option>
                ))}
              </select>
          )}

          {/* Branch Filter */}
          <select 
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm text-gray-700 cursor-pointer min-w-[140px]"
          >
            <option value="All">All Branches</option>
            {availableBranches.map((b, i) => (
                <option key={i} value={b.name}>{b.name}</option>
            ))}
          </select>

          <select 
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm text-gray-700 cursor-pointer min-w-[140px]"
          >
            <option value="All">All Departments</option>
            {departmentOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm text-gray-700 cursor-pointer min-w-[130px]"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Probation">Probation</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.length > 0 ? filteredEmployees.map((employee) => (
          <div key={employee.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group ${employee.status === 'Inactive' ? 'opacity-70' : ''}`}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="relative">
                    <img src={employee.avatar} alt={employee.name} className="w-16 h-16 rounded-full object-cover border-2 border-emerald-100 group-hover:border-emerald-300 transition-colors" />
                    {employee.liveTracking && (
                        <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1 border-2 border-white shadow-sm" title="Live Tracking Enabled">
                            <Navigation className="w-3 h-3" />
                        </div>
                    )}
                    {employee.allowRemotePunch && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1 border-2 border-white shadow-sm" title="Remote Punch Allowed">
                            <Globe className="w-3 h-3" />
                        </div>
                    )}
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleEdit(employee)}
                    className="text-gray-400 hover:text-emerald-600 p-2 hover:bg-emerald-50 rounded-full transition-colors"
                    title="Edit Details"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(employee.id)}
                    className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                    title="Remove Staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-800">{employee.name}</h3>
              <p className="text-emerald-600 font-medium text-sm mb-1">{employee.role}</p>
              <p className="text-gray-500 text-xs mb-1 font-mono">{employee.id}</p>
              <p className="text-gray-500 text-xs mb-4">{employee.department} Dept • Joined {formatDateDisplay(employee.joiningDate)}</p>

              {isSuperAdmin && employee.franchiseName && (
                  <div className="mb-3 inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-semibold border border-indigo-100">
                      <Building2 className="w-3 h-3" />
                      {employee.franchiseName}
                  </div>
              )}

              <div className="space-y-2 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{employee.phone || '+91 98765 43210'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{employee.email || `${employee.name.toLowerCase().replace(/\s+/g, '.')}@okboz.com`}</span>
                </div>
                {employee.branch && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{employee.branch}</span>
                    </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  employee.status === 'Probation' ? 'bg-yellow-100 text-yellow-700' : 
                  employee.status === 'Inactive' ? 'bg-red-100 text-red-700' :
                  'bg-green-100 text-green-700'
                }`}>
                {employee.status || 'Active'}
              </span>
              <button onClick={() => handleEdit(employee)} className="text-sm text-blue-600 font-medium hover:underline">View Profile</button>
            </div>
          </div>
        )) : (
           <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
               <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
               <p>No staff members found.</p>
               <p className="text-xs mt-1">Click "Add Staff" to create your first employee.</p>
           </div>
        )}
        
        {/* Add New Placeholder Card */}
        <button 
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-6 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50/50 transition-all min-h-[200px]"
        >
           <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
             <Plus className="w-6 h-6" />
           </div>
           <span className="font-medium">Add New Employee</span>
        </button>
      </div>

      {/* Add/Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetForm}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Staff Details' : 'Add New Staff'}</h3>
                <p className="text-sm text-gray-500">{editingId ? 'Update employee information' : 'Complete onboarding details for new employee'}</p>
              </div>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-8">
                
                {/* 1. Personal Information */}
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                    <User className="w-4 h-4 text-emerald-500"/> Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input 
                        type="text" 
                        name="firstName"
                        required
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input 
                        type="text" 
                        name="lastName"
                        required
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                          type="email" 
                          name="email"
                          placeholder="john@company.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                          type="tel" 
                          name="phone"
                          placeholder="+91 1234567890"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
                        <input 
                            type="date" 
                            name="joiningDate"
                            value={formData.joiningDate}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                  </div>
                </section>

                {/* 2. Additional Personal Details */}
                <section className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                        <User className="w-4 h-4 text-blue-500"/> Extended Personal Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select 
                                name="gender" 
                                value={formData.gender} 
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                            <select 
                                name="bloodGroup" 
                                value={formData.bloodGroup} 
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                            >
                                <option value="">Select Blood Group</option>
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                    <option key={bg} value={bg}>{bg}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                            <select 
                                name="maritalStatus" 
                                value={formData.maritalStatus} 
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                            >
                                <option value="">Select Status</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Divorced">Divorced</option>
                                <option value="Widowed">Widowed</option>
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Home Address</label>
                            <textarea 
                                name="address"
                                rows={2}
                                placeholder="Full residential address"
                                value={formData.address}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                            />
                        </div>
                    </div>
                </section>

                {/* 3. Emergency Contact */}
                <section className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                        <AlertCircle className="w-4 h-4 text-red-500"/> Emergency Contact
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                            <input 
                                type="text" 
                                name="emergencyContactName"
                                placeholder="Name"
                                value={formData.emergencyContactName}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                            <div className="relative">
                                <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input 
                                    type="tel" 
                                    name="emergencyContactPhone"
                                    placeholder="+91..."
                                    value={formData.emergencyContactPhone}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                            <input 
                                type="text" 
                                name="emergencyContactRelation"
                                placeholder="e.g. Spouse, Father"
                                value={formData.emergencyContactRelation}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>
                </section>

                {/* 4. Employment & Role */}
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Briefcase className="w-4 h-4 text-purple-500"/> Employment Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <select 
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer"
                      >
                        <option value="">Select Department</option>
                        {departmentOptions.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Job Role</label>
                      <select 
                        name="role"
                        required
                        value={formData.role}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer"
                      >
                        <option value="">Select Role</option>
                        {roleOptions.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                        <select 
                            name="branch"
                            value={formData.branch}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer"
                        >
                            <option value="">Select Branch</option>
                            {availableBranches.map((b: any, idx: number) => (
                                <option key={idx} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select 
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer"
                        >
                            <option value="Onboarding">Onboarding</option>
                            <option value="Probation">Probation</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shift / Working Hours</label>
                        <select 
                            name="workingHours"
                            value={formData.workingHours}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer"
                        >
                            <option value="">Select Shift</option>
                            {shifts.map(shift => (
                                <option key={shift.id} value={shift.name}>{shift.name} ({shift.start} - {shift.end})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Off</label>
                        <select 
                            name="weekOff"
                            value={formData.weekOff}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer"
                        >
                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                                <option key={day} value={day}>{day}</option>
                            ))}
                        </select>
                    </div>
                  </div>
                </section>

                {/* 5. Salary & Bank Info */}
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                    <CreditCard className="w-4 h-4 text-emerald-500"/> Compensation
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (CTC)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                        <input 
                          type="number" 
                          name="salary"
                          placeholder="0.00"
                          value={formData.salary}
                          onChange={handleInputChange}
                          className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Cycle</label>
                        <select 
                            name="paymentCycle"
                            value={formData.paymentCycle}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer"
                        >
                            <option value="Monthly">Monthly</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Bi-Weekly">Bi-Weekly</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account Number</label>
                        <input 
                            type="text" 
                            name="accountNumber"
                            placeholder="XXXXXXXXXXXX"
                            value={formData.accountNumber}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                        <input 
                            type="text" 
                            name="ifsc"
                            placeholder="ABCD0123456"
                            value={formData.ifsc}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono uppercase"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                        <input 
                            type="text" 
                            name="pan"
                            placeholder="ABCDE1234F"
                            value={formData.pan}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono uppercase"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                        <input 
                            type="text" 
                            name="aadhar"
                            placeholder="1234 5678 9012"
                            value={formData.aadhar}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                        />
                    </div>
                  </div>
                </section>

                {/* 6. Documents & Features */}
                <section className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                        <FileText className="w-4 h-4 text-orange-500"/> Documents & Settings
                    </h4>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="grid grid-cols-1 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    name="liveTracking"
                                    checked={formData.liveTracking}
                                    onChange={(e) => setFormData(prev => ({...prev, liveTracking: e.target.checked}))}
                                    className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                />
                                <div>
                                    <span className="block text-sm font-medium text-gray-700">Enable Live Tracking</span>
                                    <span className="block text-xs text-gray-500">Track location during shift hours (Mandatory for Marketing/Sales)</span>
                                </div>
                            </label>

                            {/* Attendance Rules Configuration */}
                            <div className="pt-3 border-t border-gray-200">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Attendance Configuration</p>
                                
                                <div className="space-y-4">
                                    {/* Web Punch Method - Radio Group */}
                                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                                        <p className="text-sm font-medium text-gray-700 mb-2">Web Punch Method</p>
                                        <div className="space-y-3">
                                            <label className="flex items-start gap-2 cursor-pointer">
                                                <input 
                                                    type="radio"
                                                    name="punchMethod"
                                                    value="Manual"
                                                    checked={formData.punchMethod === 'Manual'}
                                                    onChange={() => setFormData(prev => ({...prev, punchMethod: 'Manual'}))}
                                                    className="w-4 h-4 text-emerald-600 mt-0.5"
                                                />
                                                <div className="text-sm">
                                                    <span className="font-medium text-gray-800">Manual Button (Click to Punch)</span>
                                                    {formData.punchMethod === 'Manual' && (
                                                        <div className="mt-2 ml-1 pl-3 border-l-2 border-gray-200 space-y-2">
                                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Location Restriction:</p>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input 
                                                                    type="radio"
                                                                    name="manualPunchMode"
                                                                    value="Branch"
                                                                    checked={formData.manualPunchMode === 'Branch'}
                                                                    onChange={() => setFormData(prev => ({...prev, manualPunchMode: 'Branch'}))}
                                                                    className="w-3 h-3 text-blue-600"
                                                                />
                                                                <span className="text-xs text-gray-600">Restrict to Branch (GPS Geofencing)</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input 
                                                                    type="radio"
                                                                    name="manualPunchMode"
                                                                    value="Anywhere"
                                                                    checked={formData.manualPunchMode === 'Anywhere'}
                                                                    onChange={() => setFormData(prev => ({...prev, manualPunchMode: 'Anywhere'}))}
                                                                    className="w-3 h-3 text-blue-600"
                                                                />
                                                                <span className="text-xs text-gray-600">Allow Work From Anywhere</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="radio"
                                                    name="punchMethod"
                                                    value="QR"
                                                    checked={formData.punchMethod === 'QR'}
                                                    onChange={() => setFormData(prev => ({...prev, punchMethod: 'QR'}))}
                                                    className="w-4 h-4 text-emerald-600"
                                                />
                                                <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                                                    Require QR Scan <span className="text-xs font-normal text-gray-500">(Scan Branch Code)</span>
                                                </span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="radio"
                                                    name="punchMethod"
                                                    value="Disabled"
                                                    checked={formData.punchMethod === 'Disabled'}
                                                    onChange={() => setFormData(prev => ({...prev, punchMethod: 'Disabled'}))}
                                                    className="w-4 h-4 text-gray-400"
                                                />
                                                <span className="text-sm text-gray-600">Disabled (No Web Punch)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- NEW: Module Access Permissions --- */}
                            <div className="pt-3 border-t border-gray-200">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                    <Key className="w-3 h-3" /> Module Access Permissions
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {PERMISSION_MODULES.map(mod => (
                                        <label key={mod.id} className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded border border-gray-200 hover:border-blue-300 transition-colors">
                                            <input 
                                                type="checkbox"
                                                checked={formData.moduleAccess.includes(mod.id)}
                                                onChange={() => handleModuleAccessChange(mod.id)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">{mod.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                  Default access: Customer Care, Tasks, Vendor Attachment, My Profile, My Attendance.
                                  Check boxes above to grant extra permissions.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Upload Documents</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <input 
                          type="file" 
                          multiple
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Click to upload files</p>
                        <p className="text-xs text-gray-500 mt-1">ID Proofs, Contracts, Photos (Max 5MB)</p>
                      </div>
                      
                      {selectedFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {selectedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                              <span className="text-sm text-gray-600 truncate max-w-[200px]">{file.name}</span>
                              <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                </section>

              </div>
            </form>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button 
                onClick={resetForm}
                className="px-6 py-2.5 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                className="px-8 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md transition-all transform hover:scale-105"
              >
                {editingId ? 'Update Profile' : 'Create Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
