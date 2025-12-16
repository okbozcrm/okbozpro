
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Car, Phone, Mail, Trash2, 
  Sparkles, MessageCircle, Send, User, MapPin, X, 
  MoreVertical, Filter, RefreshCcw, ChevronDown, Building2,
  Calendar, FileText, CheckSquare, Square, DollarSign, Save, Briefcase,
  Users, CheckCircle, Clock, PhoneCall
} from 'lucide-react';
import AiAssistant from '../../components/AiAssistant';

interface HistoryLog {
  id: number;
  type: 'Call' | 'WhatsApp' | 'Email' | 'Note' | 'Meeting';
  message: string;
  date: string;
  duration?: string;
  outcome?: string;
}

// Expanded Vendor Interface to match the new form requirements
interface Vendor {
  id: string;
  ownerId?: string; // ID of the Corporate/Admin who owns this record
  franchiseName?: string; // Display name of the owner
  
  // --- Form Fields ---
  employeeId?: string; // Employee Name (ID ref)
  employeeName?: string; // Snapshot of name
  category?: string;
  subCategory?: string;
  callCategory?: string;
  vehicleType: string;
  vehicleTypeOther?: string; // If 'Other' is selected
  source?: string;
  phone: string; // Contact Number
  callStatus?: string;
  ownerName: string; // Rider Name
  city: string; // Location
  riderStatus?: string;
  followUpStatus?: string;
  followUpDate?: string;
  documentReceived?: string;
  documentStatus: string[]; // Array of checked docs
  attachmentStatus?: string;
  recharge99?: string;
  topup100?: string;
  topup50?: string;
  remarks?: string;
  
  // --- Legacy / Computed Fields ---
  email?: string;
  vehicleTypes: string[]; // Computed from vehicleType for compatibility
  fleetSize: number;
  status: 'Active' | 'Inactive' | 'Pending';
  history: HistoryLog[];
}

const CITY_OPTIONS = ['Coimbatore', 'Trichy', 'Salem', 'Madurai', 'Chennai'];
const VEHICLE_TYPE_OPTIONS = ['Cab', 'Load Xpress', 'Passenger Auto', 'Bike Taxi', 'Other'];
const DOCUMENT_OPTIONS = ['Aadhaar Card', 'Driving License', 'RC Book', 'Insurance', 'Vehicle Permit', 'Full Document Received'];

const VendorAttachment = () => {
  // Determine Session Context
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- 1. Load Reference Data (Corporates & Employees) ---
  const [corporates, setCorporates] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
      // Load Corporates (For Super Admin Dropdown)
      const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      setCorporates(corps);

      // Load Employees (Aggregated based on role)
      let staff: any[] = [];
      if (isSuperAdmin) {
          const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
          staff = [...adminStaff];
          corps.forEach((c: any) => {
              const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
              staff = [...staff, ...cStaff];
          });
      } else {
          const key = `staff_data_${sessionId}`;
          staff = JSON.parse(localStorage.getItem(key) || '[]');
      }
      setEmployees(staff.filter((s: any) => s.status === 'Active'));

      // Load Branches
      let allBranches: any[] = [];
      if (isSuperAdmin) {
          const adminB = JSON.parse(localStorage.getItem('branches_data') || '[]');
          allBranches = [...adminB];
          corps.forEach((c: any) => {
              const cB = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
              allBranches = [...allBranches, ...cB];
          });
      } else {
          const key = `branches_data_${sessionId}`;
          allBranches = JSON.parse(localStorage.getItem(key) || '[]');
      }
      setBranches(allBranches);

  }, [isSuperAdmin, sessionId]);

  // --- 2. Load Vendors (Aggregated View for Admin, Scoped for Corp) ---
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const loadVendors = () => {
    let allVendors: Vendor[] = [];
    
    if (isSuperAdmin) {
        // Admin Data
        const adminData = localStorage.getItem('vendor_data');
        if (adminData) {
            try { 
                const parsed = JSON.parse(adminData);
                allVendors = [...allVendors, ...parsed.map((v: any) => ({...v, ownerId: 'admin', franchiseName: 'Head Office'}))];
            } catch (e) {}
        }
        // Corporate Data
        const corporatesList = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporatesList.forEach((corp: any) => {
            const cData = localStorage.getItem(`vendor_data_${corp.email}`);
            if (cData) {
                try {
                    const parsed = JSON.parse(cData);
                    const tagged = parsed.map((v: any) => ({...v, ownerId: corp.email, franchiseName: corp.companyName}));
                    allVendors = [...allVendors, ...tagged];
                } catch (e) {}
            }
        });
    } else {
        // Single Corporate View
        const key = `vendor_data_${sessionId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                allVendors = JSON.parse(saved).map((v: any) => ({...v, ownerId: sessionId, franchiseName: 'My Franchise'}));
            } catch (e) {}
        }
    }
    setVendors(allVendors);
  };

  useEffect(() => {
      loadVendors();
      // Listen for storage changes to keep in sync if multiple tabs open
      window.addEventListener('storage', loadVendors);
      return () => window.removeEventListener('storage', loadVendors);
  }, [isSuperAdmin, sessionId]);


  // --- UI State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  
  // Filters
  const [cityFilter, setCityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vehicleFilter, setVehicleFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All'); // NEW FILTER
  const [ownerFilter, setOwnerFilter] = useState('All'); // NEW: For Super Admin to filter by franchise

  // --- Form State ---
  const initialFormState = {
    ownerId: isSuperAdmin ? 'admin' : sessionId, // Default owner
    employeeId: '',
    category: '',
    subCategory: '', 
    callCategory: '',
    vehicleType: '',
    vehicleTypeOther: '',
    source: '',
    phone: '',
    callStatus: '',
    ownerName: '', 
    city: '', 
    riderStatus: '',
    followUpStatus: '',
    followUpDate: '',
    documentReceived: '',
    documentStatus: [] as string[],
    attachmentStatus: '',
    recharge99: '',
    topup100: '',
    topup50: '', 
    remarks: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (doc: string) => {
    setFormData(prev => {
        const current = prev.documentStatus;
        if (current.includes(doc)) {
            return { ...prev, documentStatus: current.filter(d => d !== doc) };
        } else {
            return { ...prev, documentStatus: [...current, doc] };
        }
    });
  };

  // --- Save Logic (With strict separation) ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ownerName || !formData.phone) {
        alert("Rider Name and Phone Number are required.");
        return;
    }

    const employeeName = employees.find(e => e.id === formData.employeeId)?.name || 'Unknown';
    const finalVehicleType = formData.vehicleType === 'Other' ? formData.vehicleTypeOther : formData.vehicleType;

    // Determine target storage key
    const targetOwnerId = formData.ownerId; 
    const storageKey = targetOwnerId === 'admin' ? 'vendor_data' : `vendor_data_${targetOwnerId}`;

    // Load existing data for that specific owner
    let existingData: Vendor[] = [];
    try {
        existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch(e) {}

    const newVendor: Vendor = {
      id: `V${Date.now()}`,
      ...formData,
      employeeName,
      email: '', 
      vehicleTypes: [finalVehicleType || 'Unknown'],
      fleetSize: 1,
      status: formData.attachmentStatus === 'Yes' ? 'Active' : 'Pending',
      history: [],
      // These are transient in memory but stored implicitly by key
      ownerId: targetOwnerId, 
      franchiseName: targetOwnerId === 'admin' ? 'Head Office' : corporates.find(c => c.email === targetOwnerId)?.companyName
    };

    // Save to specific storage
    const updatedData = [newVendor, ...existingData];
    localStorage.setItem(storageKey, JSON.stringify(updatedData));

    // Update local state immediately without waiting for reload
    setVendors(prev => [newVendor, ...prev]);
    
    setIsModalOpen(false);
    setFormData(initialFormState);
    alert("Vendor added successfully!");
  };

  const handleDelete = (id: string, vendor: Vendor, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('Are you sure you want to delete this vendor?')) {
        // Identify where this vendor lives
        const targetOwnerId = vendor.ownerId || 'admin';
        const storageKey = targetOwnerId === 'admin' ? 'vendor_data' : `vendor_data_${targetOwnerId}`;
        
        try {
            const currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const updatedData = currentData.filter((v: any) => v.id !== id);
            localStorage.setItem(storageKey, JSON.stringify(updatedData));
            
            // Update UI
            setVendors(prev => prev.filter(v => v.id !== id));
            if (selectedVendor?.id === id) setSelectedVendor(null);
        } catch(err) {
            console.error("Delete failed", err);
        }
    }
  };

  // Interaction Handlers
  const handleCall = (phone: string) => window.location.href = `tel:${phone}`;
  const handleWhatsApp = (phone: string) => window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = cityFilter === 'All' || v.city === cityFilter;
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || v.category === categoryFilter; // New Filter Logic
    
    const matchesVehicle = vehicleFilter === 'All' || 
        v.vehicleTypes.some(vt => vt.toLowerCase().includes(vehicleFilter.toLowerCase()));

    // Admin specific owner filter
    const matchesOwner = ownerFilter === 'All' || v.ownerId === ownerFilter;

    return matchesSearch && matchesCity && matchesStatus && matchesVehicle && matchesCategory && matchesOwner;
  });

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
      // Calculate based on the currently viewable vendors (filtered by role but NOT by search/filter inputs)
      // This gives an overview of the "whole" accessible dataset
      
      const total = vendors.length;
      const active = vendors.filter(v => v.status === 'Active').length;
      const pending = vendors.filter(v => v.status === 'Pending').length;
      const telecalling = vendors.filter(v => v.category === 'Telecalling').length;
      const fieldVisit = vendors.filter(v => v.category === 'Field Visit').length;

      return { total, active, pending, telecalling, fieldVisit };
  }, [vendors]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Vendor Attachment</h2>
           <p className="text-gray-500">
              {isSuperAdmin ? "View all attached vendors across franchises" : "Onboard and manage vehicle vendors"}
           </p>
        </div>
        <button 
          onClick={() => { setFormData(initialFormState); setIsModalOpen(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Vendor
        </button>
      </div>

      {/* --- Dashboard Buttons (Statistics Cards) --- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => {setStatusFilter('All'); setCategoryFilter('All');}}>
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Vendors</p>
                      <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</h3>
                  </div>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Users className="w-5 h-5" />
                  </div>
              </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => {setStatusFilter('Active'); setCategoryFilter('All');}}>
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active</p>
                      <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</h3>
                  </div>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <CheckCircle className="w-5 h-5" />
                  </div>
              </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => {setStatusFilter('Pending'); setCategoryFilter('All');}}>
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending</p>
                      <h3 className="text-2xl font-bold text-orange-600 mt-1">{stats.pending}</h3>
                  </div>
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                      <Clock className="w-5 h-5" />
                  </div>
              </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => {setCategoryFilter('Telecalling'); setStatusFilter('All');}}>
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telecalling</p>
                      <h3 className="text-2xl font-bold text-purple-600 mt-1">{stats.telecalling}</h3>
                  </div>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <PhoneCall className="w-5 h-5" />
                  </div>
              </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => {setCategoryFilter('Field Visit'); setStatusFilter('All');}}>
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Field Visits</p>
                      <h3 className="text-2xl font-bold text-indigo-600 mt-1">{stats.fieldVisit}</h3>
                  </div>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <MapPin className="w-5 h-5" />
                  </div>
              </div>
          </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by owner name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
         </div>
         <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 items-center">
            {isSuperAdmin && (
                <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none">
                    <option value="All">All Franchises</option>
                    <option value="admin">Head Office</option>
                    {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                </select>
            )}
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none">
                <option value="All">All Categories</option>
                <option value="Telecalling">Telecalling</option>
                <option value="Office Visit">Office Visit</option>
                <option value="Field Visit">Field Visit</option>
            </select>
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none">
                <option value="All">All Cities</option>
                {CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none">
                <option value="All">All Vehicles</option>
                {VEHICLE_TYPE_OPTIONS.filter(v => v !== 'Other').map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none">
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
            </select>
         </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredVendors.map(vendor => (
            <div 
                key={vendor.id} 
                onClick={() => setSelectedVendor(vendor)}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group relative"
            >
                {isSuperAdmin && vendor.franchiseName && (
                    <div className="absolute top-3 right-3 bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {vendor.franchiseName}
                    </div>
                )}

                <div className="p-6">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                         <Car className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                         vendor.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                         vendor.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                         'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                         {vendor.status}
                      </span>
                   </div>
                   
                   <h3 className="text-lg font-bold text-gray-900 mb-1">{vendor.ownerName}</h3>
                   <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {vendor.city}
                   </p>

                   <div className="space-y-2 border-t border-gray-50 pt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                         <Phone className="w-4 h-4 text-gray-400" /> {vendor.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                         <Car className="w-4 h-4 text-gray-400" /> {vendor.vehicleTypes.join(', ')}
                      </div>
                      {vendor.category && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Briefcase className="w-4 h-4 text-gray-400" /> {vendor.category}
                          </div>
                      )}
                   </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
                   <span className="text-sm font-medium text-emerald-600 group-hover:underline">View Details</span>
                   <button onClick={(e) => handleDelete(vendor.id, vendor, e)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
            </div>
         ))}

         {filteredVendors.length === 0 && (
             <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                 No vendors found. Add a new vendor to get started.
             </div>
         )}
      </div>

      {/* Add Vendor Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Car className="w-5 h-5 text-emerald-600" /> Vendor Attachment Form
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                 
                 {/* 1. Agent / Category Info */}
                 <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    
                    {/* Super Admin: Assign To Field */}
                    {isSuperAdmin && (
                        <div className="bg-white p-3 rounded-lg border border-blue-200 mb-2">
                            <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Assign Vendor To</label>
                            <select 
                                name="ownerId" 
                                value={formData.ownerId} 
                                onChange={handleInputChange} 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="admin">Head Office</option>
                                {corporates.map((c: any) => (
                                    <option key={c.email} value={c.email}>{c.companyName} ({c.city})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Employee Name <span className="text-red-500">*</span></label>
                            <select 
                                name="employeeId" 
                                value={formData.employeeId} 
                                onChange={handleInputChange} 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                required
                            >
                                <option value="">Choose Employee</option>
                                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                            <select name="category" value={formData.category} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose</option>
                                <option>Telecalling</option>
                                <option>Office Visit</option>
                                <option>Field Visit</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sub Category</label>
                            <select name="subCategory" value={formData.subCategory} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose</option>
                                <option>Inbound</option>
                                <option>Outbound</option>
                                <option>Walk-in</option>
                                <option>Scheduled</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Call Category</label>
                            <select name="callCategory" value={formData.callCategory} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose</option>
                                <option>New Call</option>
                                <option>Follow Call</option>
                                <option>Top up Call</option>
                                <option>Document Call</option>
                                <option>Demo</option>
                            </select>
                        </div>
                    </div>
                 </div>

                 {/* 2. Vendor & Vehicle Details */}
                 <div>
                    <h4 className="font-bold text-gray-700 mb-3 border-b pb-1">Vendor & Vehicle Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vehicle Type <span className="text-red-500">*</span></label>
                            <select name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose</option>
                                {VEHICLE_TYPE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            {formData.vehicleType === 'Other' && (
                                <input name="vehicleTypeOther" value={formData.vehicleTypeOther} onChange={handleInputChange} placeholder="Specify Other" className="w-full mt-2 p-2 border border-gray-300 rounded-lg text-sm" />
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source <span className="text-red-500">*</span></label>
                            <select name="source" value={formData.source} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose</option>
                                <option>Exist Driver</option>
                                <option>Social Media</option>
                                <option>Driver Reference</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Number <span className="text-red-500">*</span></label>
                            <input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="10-digit number" className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Call Status</label>
                            <select name="callStatus" value={formData.callStatus} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose</option>
                                <option>Connected</option>
                                <option>Not Picked</option>
                                <option>Busy</option>
                                <option>Switch Off</option>
                                <option>Wrong Number</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rider Name <span className="text-red-500">*</span></label>
                            <input name="ownerName" value={formData.ownerName} onChange={handleInputChange} placeholder="Name" className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
                            <select name="city" value={formData.city} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose</option>
                                {branches.length > 0 ? branches.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>) : CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rider Status</label>
                            <select name="riderStatus" value={formData.riderStatus} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose</option>
                                <option>Owner</option>
                                <option>Driver</option>
                                <option>Owner cum Driver</option>
                                <option>Acting Driver</option>
                                <option>Load</option>
                            </select>
                        </div>
                    </div>
                 </div>

                 {/* 3. Follow-up Details */}
                 <div>
                    <h4 className="font-bold text-gray-700 mb-3 border-b pb-1">Follow-up</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Followup Status <span className="text-red-500">*</span></label>
                            <select name="followUpStatus" value={formData.followUpStatus} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none" required>
                                <option value="">Choose</option>
                                <option>Need to call back</option>
                                <option>No need to call back</option>
                                <option>Ready to attach</option>
                                <option>Already attached</option>
                                <option>Right now Attach</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Follow Back Date</label>
                            <input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none" />
                        </div>
                    </div>
                 </div>

                 {/* 4. Documents */}
                 <div>
                    <h4 className="font-bold text-gray-700 mb-3 border-b pb-1">Documents</h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Document Received</label>
                                <select name="documentReceived" value={formData.documentReceived} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                    <option value="">Choose</option>
                                    <option>Yes</option>
                                    <option>No</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Attachment Status</label>
                                <select name="attachmentStatus" value={formData.attachmentStatus} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                    <option value="">Choose</option>
                                    <option>Yes</option>
                                    <option>No</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Document Status</label>
                            <div className="grid grid-cols-2 gap-2">
                                {DOCUMENT_OPTIONS.map(doc => (
                                    <label key={doc} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                        <div 
                                            onClick={() => handleCheckboxChange(doc)}
                                            className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${formData.documentStatus.includes(doc) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-400 bg-white'}`}
                                        >
                                            {formData.documentStatus.includes(doc) && <CheckSquare className="w-3 h-3" />}
                                        </div>
                                        {doc}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* 5. Payments */}
                 <div>
                    <h4 className="font-bold text-gray-700 mb-3 border-b pb-1">Payments & Recharge</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Recharge 99</label>
                            <select name="recharge99" value={formData.recharge99} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose</option>
                                <option>Done</option>
                                <option>Pending</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Topup 100</label>
                            <select name="topup100" value={formData.topup100} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose</option>
                                <option>Done</option>
                                <option>Pending</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Top up 50</label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                <div 
                                    onClick={() => setFormData(prev => ({...prev, topup50: prev.topup50 === 'done' ? '' : 'done'}))}
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.topup50 === 'done' ? 'border-emerald-500' : 'border-gray-400'}`}
                                >
                                    {formData.topup50 === 'done' && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                </div>
                                done
                            </label>
                        </div>
                    </div>
                 </div>

                 {/* 6. Remarks */}
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks <span className="text-red-500">*</span></label>
                    <textarea 
                        name="remarks"
                        rows={3}
                        value={formData.remarks}
                        onChange={handleInputChange}
                        placeholder="Your answer"
                        className="w-full p-3 border-b-2 border-gray-300 bg-gray-50 focus:border-emerald-500 focus:bg-white transition-colors outline-none resize-none text-sm"
                        required
                    />
                 </div>

                 <div className="pt-4 flex justify-between items-center border-t border-gray-100">
                    <button type="button" onClick={() => setFormData(initialFormState)} className="text-emerald-600 font-medium text-sm hover:underline">Clear form</button>
                    <button type="submit" className="bg-emerald-600 text-white px-8 py-2.5 rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-colors">Submit</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedVendor && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
               <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50 rounded-t-2xl">
                  <div>
                     <h3 className="text-xl font-bold text-gray-900">{selectedVendor.ownerName}</h3>
                     <p className="text-sm text-gray-500">{selectedVendor.vehicleTypes.join(', ')} • {selectedVendor.city}</p>
                  </div>
                  <button onClick={() => setSelectedVendor(null)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               <div className="p-6 overflow-y-auto space-y-6">
                   <div className="grid grid-cols-2 gap-4 text-sm">
                       <div>
                           <p className="text-gray-500 text-xs uppercase font-bold">Contact</p>
                           <p className="font-medium text-gray-800">{selectedVendor.phone}</p>
                       </div>
                       <div>
                           <p className="text-gray-500 text-xs uppercase font-bold">Status</p>
                           <p className="font-medium text-gray-800">{selectedVendor.status}</p>
                       </div>
                       <div>
                           <p className="text-gray-500 text-xs uppercase font-bold">Follow Up</p>
                           <p className="font-medium text-gray-800">{selectedVendor.followUpStatus || '-'} ({selectedVendor.followUpDate || '-'})</p>
                       </div>
                       <div>
                           <p className="text-gray-500 text-xs uppercase font-bold">Attached By</p>
                           <p className="font-medium text-gray-800">{selectedVendor.employeeName || '-'}</p>
                       </div>
                       {isSuperAdmin && selectedVendor.franchiseName && (
                           <div className="col-span-2 mt-2 pt-2 border-t border-gray-100">
                               <p className="text-indigo-600 text-xs uppercase font-bold flex items-center gap-1">
                                   <Building2 className="w-3 h-3"/> {selectedVendor.franchiseName}
                               </p>
                           </div>
                       )}
                   </div>
                   
                   <div>
                       <p className="text-gray-500 text-xs uppercase font-bold mb-2">Documents</p>
                       <div className="flex flex-wrap gap-2">
                           {selectedVendor.documentStatus && selectedVendor.documentStatus.length > 0 ? (
                               selectedVendor.documentStatus.map(doc => (
                                   <span key={doc} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200">{doc}</span>
                               ))
                           ) : <span className="text-gray-400 text-xs italic">No docs checked</span>}
                       </div>
                   </div>

                   <div>
                       <p className="text-gray-500 text-xs uppercase font-bold mb-2">Payments</p>
                       <div className="flex gap-4 text-sm">
                           <span className={selectedVendor.recharge99 === 'Done' ? 'text-green-600 font-bold' : 'text-gray-600'}>Recharge 99: {selectedVendor.recharge99 || '-'}</span>
                           <span className={selectedVendor.topup100 === 'Done' ? 'text-green-600 font-bold' : 'text-gray-600'}>Topup 100: {selectedVendor.topup100 || '-'}</span>
                       </div>
                   </div>

                   <div>
                       <p className="text-gray-500 text-xs uppercase font-bold mb-1">Remarks</p>
                       <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{selectedVendor.remarks || 'No remarks.'}</p>
                   </div>

                   <div className="flex gap-3 pt-4 border-t border-gray-100">
                       <button onClick={() => handleCall(selectedVendor.phone)} className="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-lg font-bold text-sm hover:bg-emerald-100 transition-colors">Call</button>
                       <button onClick={() => handleWhatsApp(selectedVendor.phone)} className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg font-bold text-sm hover:bg-green-100 transition-colors">WhatsApp</button>
                   </div>
               </div>
            </div>
         </div>
      )}

      {/* Boz Chat (AI Assistant) */}
      <AiAssistant 
        systemInstruction="You are Boz Chat, an AI assistant for managing vehicle vendor attachments. Help users categorize vendors, suggest follow-up strategies, and summarize vendor details."
        initialMessage="Hi, I'm Boz Chat! Need help categorizing a vendor or planning a follow-up?"
        triggerButtonLabel="Boz Chat"
      />
    </div>
  );
};

export default VendorAttachment;
