
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Car, Phone, Mail, Trash2, 
  Sparkles, MessageCircle, Send, User, MapPin, X, 
  MoreVertical, Filter, RefreshCcw, ChevronDown, Building2,
  Calendar, FileText, CheckSquare, Square, DollarSign, Save, Briefcase,
  Users, CheckCircle, Clock, PhoneCall, List, Edit, Truck, Activity
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
  existingDocuments?: string; // NEW: To capture "Exist Document" during enquiry
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

  // --- Tabs State ---
  const [activeTab, setActiveTab] = useState<'Enquiries' | 'List'>('Enquiries');

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
    // Sort by newness
    setVendors(allVendors.reverse());
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
  const [editingId, setEditingId] = useState<string | null>(null);
  
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
    existingDocuments: '', // New field
    attachmentStatus: '',
    recharge99: '',
    topup100: '',
    topup50: '', 
    remarks: '',
    status: 'Pending' as 'Active' | 'Inactive' | 'Pending',
    fleetSize: 1
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formMode, setFormMode] = useState<'Enquiry' | 'Full'>('Full'); // Which form to show in modal

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

    const employeeName = employees.find(e => e.id === formData.employeeId)?.name || (formMode === 'Enquiry' ? 'Web Enquiry' : 'Unknown');
    const finalVehicleType = formData.vehicleType === 'Other' ? formData.vehicleTypeOther : formData.vehicleType;

    // Determine target storage key
    const targetOwnerId = formData.ownerId; 
    const storageKey = targetOwnerId === 'admin' ? 'vendor_data' : `vendor_data_${targetOwnerId}`;

    // Load existing data for that specific owner
    let existingData: Vendor[] = [];
    try {
        existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch(e) {}

    const vendorData: Vendor = {
      id: editingId || `V${Date.now()}`,
      ...formData,
      employeeName,
      // If form mode is enquiry, we explicitly set what we have, otherwise use form data
      email: formData.email || '', 
      fleetSize: Number(formData.fleetSize) || 1,
      vehicleTypes: [finalVehicleType || 'Unknown'],
      status: formData.status, // Use status from form (Enquiry has specific selector)
      history: [],
      // These are transient in memory but stored implicitly by key
      ownerId: targetOwnerId, 
      franchiseName: targetOwnerId === 'admin' ? 'Head Office' : corporates.find(c => c.email === targetOwnerId)?.companyName
    };

    let updatedData: Vendor[];
    if (editingId) {
        // Preserve history from existing record
        const existingRecord = existingData.find(v => v.id === editingId);
        if (existingRecord) {
            vendorData.history = existingRecord.history;
        }
        updatedData = existingData.map(v => v.id === editingId ? vendorData : v);
    } else {
        updatedData = [vendorData, ...existingData];
    }

    // Save to specific storage
    localStorage.setItem(storageKey, JSON.stringify(updatedData));

    // Update local state immediately without waiting for reload
    if (editingId) {
        setVendors(prev => prev.map(v => v.id === editingId ? vendorData : v));
    } else {
        setVendors(prev => [vendorData, ...prev]);
    }
    
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    alert(formMode === 'Enquiry' ? "Enquiry saved! Moved to Vendor List." : (editingId ? "Vendor updated successfully!" : "Vendor added successfully!"));
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
                          v.city.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.phone.includes(searchTerm);
    
    const matchesCity = cityFilter === 'All' || v.city === cityFilter;
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || v.category === categoryFilter; // New Filter Logic
    
    const matchesVehicle = vehicleFilter === 'All' || 
        v.vehicleTypes.some(vt => vt.toLowerCase().includes(vehicleFilter.toLowerCase()));

    // Admin specific owner filter
    const matchesOwner = ownerFilter === 'All' || v.ownerId === ownerFilter;

    return matchesSearch && matchesCity && matchesStatus && matchesVehicle && matchesCategory && matchesOwner;
  });

  // Calculate Dashboard Metrics
  const stats = useMemo(() => {
      return {
          total: vendors.length,
          active: vendors.filter(v => v.status === 'Active').length,
          pending: vendors.filter(v => v.status === 'Pending').length,
          fleet: vendors.reduce((acc, v) => acc + (v.fleetSize || 0), 0)
      };
  }, [vendors]);

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Vendor Management</h2>
           <p className="text-gray-500">
              {isSuperAdmin ? "View all attached vendors & enquiries across franchises" : "Manage vehicle vendors and enquiries"}
           </p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('Enquiries')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'Enquiries' ? 'bg-white shadow text-emerald-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
                <FileText className="w-4 h-4" /> Enquiries
            </button>
            <button 
                onClick={() => setActiveTab('List')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'List' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
                <List className="w-4 h-4" /> Vendor List
            </button>
        </div>
      </div>

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2 shrink-0 animate-in fade-in slide-in-from-top-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                  <Users className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Vendors</p>
                  <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Active</p>
                  <h3 className="text-2xl font-bold text-gray-800">{stats.active}</h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-50 text-orange-600">
                  <Clock className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Pending</p>
                  <h3 className="text-2xl font-bold text-gray-800">{stats.pending}</h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                  <Truck className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Fleet Size</p>
                  <h3 className="text-2xl font-bold text-gray-800">{stats.fleet}</h3>
              </div>
          </div>
      </div>

      {/* --- CONTENT AREA --- */}
      
      {/* 1. VENDOR ENQUIRIES TAB */}
      {activeTab === 'Enquiries' && (
          <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" /> Recent Enquiries
                  </h3>
                  <button 
                    onClick={() => { setFormData(initialFormState); setFormMode('Enquiry'); setIsModalOpen(true); }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Enquiry
                  </button>
              </div>
              
              <div className="flex-1 overflow-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0 z-10">
                          <tr>
                              <th className="px-6 py-4">Vendor Name</th>
                              <th className="px-6 py-4">City</th>
                              <th className="px-6 py-4">Phone</th>
                              <th className="px-6 py-4">Vehicle</th>
                              <th className="px-6 py-4">Fleet</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Documents</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {/* Filter logic reused but presentation simplified for enquiries */}
                          {filteredVendors.map(vendor => (
                              <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-gray-900">{vendor.ownerName}</td>
                                  <td className="px-6 py-4 text-gray-600">{vendor.city}</td>
                                  <td className="px-6 py-4 text-gray-600">{vendor.phone}</td>
                                  <td className="px-6 py-4 text-gray-600">
                                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                          {vendor.vehicleTypes.join(', ')}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-gray-600 font-mono">{vendor.fleetSize}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                          vendor.status === 'Active' ? 'bg-green-100 text-green-700' :
                                          vendor.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                                          'bg-red-100 text-red-700'
                                      }`}>
                                          {vendor.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate" title={vendor.existingDocuments}>
                                      {vendor.existingDocuments || '-'}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button 
                                              onClick={() => { setSelectedVendor(vendor); }} 
                                              className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded border border-blue-200 text-xs font-medium"
                                          >
                                              Details
                                          </button>
                                          <button 
                                              onClick={() => {
                                                  setFormData({
                                                      ...initialFormState, // Reset then overwrite
                                                      ...vendor,
                                                      vehicleType: vendor.vehicleTypes[0] || '',
                                                  });
                                                  setEditingId(vendor.id); 
                                                  setFormMode('Full');
                                                  setIsModalOpen(true);
                                              }}
                                              className="text-gray-500 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                              title="Edit Full Info"
                                          >
                                              <Edit className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredVendors.length === 0 && (
                              <tr>
                                  <td colSpan={8} className="py-12 text-center text-gray-400">
                                      No enquiries found.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* 2. VENDOR LIST TAB (Existing Full View) */}
      {activeTab === 'List' && (
          <div className="space-y-6 animate-in fade-in">
              {/* Search & Filter Bar */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search by owner name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                 </div>
                 <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 items-center">
                    <div className="h-6 w-px bg-gray-200 mx-1"></div>
                    <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none cursor-pointer">
                        <option value="All">All Cities</option>
                        {CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none cursor-pointer">
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    <button 
                        onClick={() => { setFormData(initialFormState); setFormMode('Full'); setIsModalOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors text-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Full Vendor
                    </button>
                 </div>
              </div>

              {/* Vendors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredVendors.map(vendor => (
                    <div 
                        key={vendor.id} 
                        onClick={() => setSelectedVendor(vendor)}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group relative"
                    >
                        {isSuperAdmin && vendor.franchiseName && (
                            <div className="absolute top-3 right-3 bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {vendor.franchiseName}
                            </div>
                        )}

                        <div className="p-6">
                           <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                 <Car className="w-6 h-6 text-blue-600" />
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                 vendor.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                                 vendor.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                 'bg-red-50 text-red-600 border-red-200'
                              }`}>
                                 {vendor.status}
                              </span>
                           </div>
                           
                           <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{vendor.ownerName}</h3>
                           <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {vendor.city}
                           </p>

                           <div className="space-y-2 border-t border-gray-50 pt-3">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                 <Phone className="w-4 h-4 text-gray-400" /> {vendor.phone}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                 <Car className="w-4 h-4 text-gray-400" /> {vendor.vehicleTypes.join(', ')} • <strong>{vendor.fleetSize}</strong> Vehicle(s)
                              </div>
                           </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center group-hover:bg-blue-50/30 transition-colors">
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
          </div>
      )}

      {/* Add Vendor / Enquiry Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    {formMode === 'Enquiry' ? <FileText className="w-5 h-5 text-emerald-600" /> : <Car className="w-5 h-5 text-emerald-600" />}
                    {formMode === 'Enquiry' ? 'New Vendor Enquiry' : 'Full Vendor Attachment Form'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                 
                 {/* Vendor and Vehicle Details Section (For Both Modes) */}
                 <div className="bg-white border border-gray-200 rounded-xl p-4">
                     <h4 className="font-bold text-gray-700 mb-4 border-b pb-2 text-sm flex items-center gap-2">
                         <Car className="w-4 h-4 text-emerald-600" /> Vendor and Vehicle Details
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name <span className="text-red-500">*</span></label>
                            <input name="ownerName" value={formData.ownerName} onChange={handleInputChange} placeholder="Vendor Name" className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number <span className="text-red-500">*</span></label>
                            <input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="10-digit number" className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City <span className="text-red-500">*</span></label>
                            <select name="city" value={formData.city} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose City</option>
                                {branches.length > 0 ? branches.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>) : CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
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
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rider Status <span className="text-red-500">*</span></label>
                            <select name="riderStatus" value={formData.riderStatus} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose</option>
                                <option>Owner</option>
                                <option>Driver</option>
                                <option>Owner cum Driver</option>
                                <option>Acting Driver</option>
                                <option>Load</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="Pending">Pending</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fleet Size</label>
                            <input type="number" name="fleetSize" value={formData.fleetSize} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none" min="1" />
                        </div>
                        
                        {/* Fields ONLY visible in Full Mode */}
                        {formMode === 'Full' && (
                            <>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Existing Documents</label>
                                    <input name="existingDocuments" value={formData.existingDocuments} onChange={handleInputChange} placeholder="e.g. RC, Insurance, License (comma separated)" className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                                    <input name="email" value={formData.email} onChange={handleInputChange} placeholder="Email" className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                            </>
                        )}
                     </div>
                 </div>

                 {/* Follow-up & Docs (Available for both modes as requested) */}
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-gray-700 mb-3 border-b pb-1 text-sm">Follow-up & Docs</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Followup Status</label>
                            <select name="followUpStatus" value={formData.followUpStatus} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none">
                                <option value="">Choose</option>
                                <option>Need to call back</option>
                                <option>Ready to attach</option>
                                <option>Already attached</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Follow Back Date</label>
                            <input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none" />
                        </div>
                        
                        {/* Checkboxes ONLY visible in Full Mode */}
                        {formMode === 'Full' && (
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Documents Collected</label>
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
                        )}
                    </div>
                 </div>

                 {/* 2. Full Form Extras (Only if mode is Full) */}
                 {formMode === 'Full' && (
                     <>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-1 text-sm">Administrative & Classification</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {isSuperAdmin && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign To (Franchise)</label>
                                        <select 
                                            name="ownerId" 
                                            value={formData.ownerId} 
                                            onChange={handleInputChange} 
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                                        >
                                            <option value="admin">Head Office</option>
                                            {corporates.map((c: any) => (
                                                <option key={c.email} value={c.email}>{c.companyName}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Employee Name <span className="text-red-500">*</span></label>
                                    <select 
                                        name="employeeId" 
                                        value={formData.employeeId} 
                                        onChange={handleInputChange} 
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                                    >
                                        <option value="">Choose Employee</option>
                                        {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                    <select 
                                        name="category" 
                                        value={formData.category} 
                                        onChange={handleInputChange} 
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                                    >
                                        <option value="">Choose</option>
                                        <option>Telecalling</option>
                                        <option>Office Visit</option>
                                        <option>Field Visit</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sub Category</label>
                                    <select 
                                        name="subCategory" 
                                        value={formData.subCategory} 
                                        onChange={handleInputChange} 
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                                    >
                                        <option value="">Choose</option>
                                        <option>Inbound</option>
                                        <option>Outbound</option>
                                        <option>Walk-in</option>
                                        <option>Schedule</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Call Category</label>
                                    <select 
                                        name="callCategory" 
                                        value={formData.callCategory} 
                                        onChange={handleInputChange} 
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                                    >
                                        <option value="">Choose</option>
                                        <option>New Call</option>
                                        <option>Follow-up Call</option>
                                        <option>Top-up Call</option>
                                        <option>Document Call</option>
                                        <option>Demo</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-1 text-sm">Payments</h4>
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
                            </div>
                        </div>
                     </>
                 )}

                 {/* Remarks (Common) */}
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label>
                    <textarea 
                        name="remarks"
                        rows={2}
                        value={formData.remarks}
                        onChange={handleInputChange}
                        placeholder="Additional notes..."
                        className="w-full p-3 border-b-2 border-gray-300 bg-gray-50 focus:border-emerald-500 focus:bg-white transition-colors outline-none resize-none text-sm"
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
                  <div className="flex gap-2">
                      <button 
                        onClick={() => {
                            setFormData({
                                ...initialFormState, // Reset then overwrite
                                ...selectedVendor,
                                fleetSize: selectedVendor.fleetSize || 1,
                                vehicleType: selectedVendor.vehicleTypes[0] || '',
                                // Ensure nested arrays/objects are handled if any
                            });
                            setEditingId(selectedVendor.id); 
                            setFormMode('Full');
                            setIsModalOpen(true);
                            setSelectedVendor(null);
                        }}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded-full transition-colors"
                        title="Edit Full Details"
                      >
                          <Edit className="w-5 h-5" />
                      </button>
                      <button onClick={() => setSelectedVendor(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                         <X className="w-5 h-5" />
                      </button>
                  </div>
               </div>
               <div className="p-6 overflow-y-auto space-y-6">
                   <div className="grid grid-cols-2 gap-4 text-sm">
                       <div>
                           <p className="text-gray-500 text-xs uppercase font-bold">Contact</p>
                           <p className="font-medium text-gray-800">{selectedVendor.phone}</p>
                           {selectedVendor.email && <p className="text-xs text-gray-600">{selectedVendor.email}</p>}
                       </div>
                       <div>
                           <p className="text-gray-500 text-xs uppercase font-bold">Status</p>
                           <p className="font-medium text-gray-800">{selectedVendor.status}</p>
                       </div>
                       <div>
                           <p className="text-gray-500 text-xs uppercase font-bold">Fleet Size</p>
                           <p className="font-medium text-gray-800">{selectedVendor.fleetSize}</p>
                       </div>
                       <div>
                           <p className="text-gray-500 text-xs uppercase font-bold">Attached By</p>
                           <p className="font-medium text-gray-800">{selectedVendor.employeeName || '-'}</p>
                       </div>
                       <div className="col-span-2">
                           <p className="text-gray-500 text-xs uppercase font-bold">Existing Docs</p>
                           <p className="font-medium text-gray-800">{selectedVendor.existingDocuments || '-'}</p>
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
                       <p className="text-gray-500 text-xs uppercase font-bold mb-2">Documents Collected</p>
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
