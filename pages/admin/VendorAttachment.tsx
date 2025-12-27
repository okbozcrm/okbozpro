
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Car, Phone, Mail, Trash2, 
  Sparkles, MessageCircle, Send, User, MapPin, X, 
  MoreVertical, Filter, RefreshCcw, ChevronDown, Building2,
  Calendar, FileText, CheckSquare, Square, DollarSign, Save, Briefcase,
  Users, CheckCircle, Clock, PhoneCall, List, Edit, Truck, Activity, Info
} from 'lucide-react';
import AiAssistant from '../../components/AiAssistant';
import ContactDisplay from '../../components/ContactDisplay';

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

export const VendorAttachment = () => {
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
                                  <td className="px-6 py-4 text-gray-600">
                                      <ContactDisplay type="phone" value={vendor.phone} />
                                  </td>
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
                                  <td className="px-6 py-4">
                                      {(vendor.documentStatus || []).length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                              {vendor.documentStatus.map((doc, idx) => (
                                                  <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                                                      {doc.split(' ')[0]}
                                                  </span>
                                              ))}
                                          </div>
                                      ) : <span className="text-gray-400 text-xs">-</span>}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button onClick={() => { setSelectedVendor(vendor); setFormMode('Full'); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold">Manage</button>
                                  </td>
                              </tr>
                          ))}
                          {filteredVendors.length === 0 && (
                            <tr><td colSpan={8} className="py-12 text-center text-gray-400 italic">No enquiries found. Add a new one!</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* 2. VENDOR LIST TAB */}
      {activeTab === 'List' && (
          <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50">
                  <div className="relative flex-1 w-full md:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                          type="text" 
                          placeholder="Search vendors..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                      <select 
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none"
                      >
                          <option value="All">All Status</option>
                          <option value="Active">Active</option>
                          <option value="Pending">Pending</option>
                          <option value="Inactive">Inactive</option>
                      </select>
                      <select 
                          value={cityFilter}
                          onChange={(e) => setCityFilter(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none"
                      >
                          <option value="All">All Cities</option>
                          {CITY_OPTIONS.map(city => <option key={city} value={city}>{city}</option>)}
                      </select>
                      <select 
                          value={vehicleFilter}
                          onChange={(e) => setVehicleFilter(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none"
                      >
                          <option value="All">All Vehicles</option>
                          {VEHICLE_TYPE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                      {isSuperAdmin && (
                          <select 
                              value={ownerFilter}
                              onChange={(e) => setOwnerFilter(e.target.value)}
                              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none"
                          >
                              <option value="All">All Entities</option>
                              <option value="admin">Head Office</option>
                              {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                          </select>
                      )}
                      <button onClick={() => { setSearchTerm(''); setStatusFilter('All'); setCityFilter('All'); setVehicleFilter('All'); setCategoryFilter('All'); setOwnerFilter('All'); }} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200" title="Reset Filters"><RefreshCcw className="w-4 h-4" /></button>
                  </div>
                  <button 
                    onClick={() => { setFormData(initialFormState); setFormMode('Full'); setIsModalOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" /> New Vendor
                  </button>
              </div>
              <div className="flex-1 overflow-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0 z-10">
                          <tr>
                              <th className="px-6 py-4">Vendor</th>
                              <th className="px-6 py-4">Contact</th>
                              <th className="px-6 py-4">Location</th>
                              <th className="px-6 py-4">Vehicle Types</th>
                              <th className="px-6 py-4">Fleet Size</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredVendors.map(vendor => (
                              <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-gray-900">{vendor.ownerName}</div>
                                      {isSuperAdmin && vendor.franchiseName && (
                                          <div className="text-xs text-indigo-600 font-bold flex items-center gap-1">
                                              <Building2 className="w-3 h-3" /> {vendor.franchiseName}
                                          </div>
                                      )}
                                  </td>
                                  <td className="px-6 py-4">
                                      <ContactDisplay type="phone" value={vendor.phone} />
                                  </td>
                                  <td className="px-6 py-4 text-gray-600">{vendor.city}</td>
                                  <td className="px-6 py-4">
                                      <div className="flex flex-wrap gap-1">
                                          {vendor.vehicleTypes.map((vType, idx) => (
                                              <span key={idx} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                                  {vType}
                                              </span>
                                          ))}
                                      </div>
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
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button onClick={() => { setSelectedVendor(vendor); setFormMode('Full'); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 text-xs font-bold">Edit</button>
                                          <button onClick={(e) => handleDelete(vendor.id, vendor, e)} className="text-red-600 hover:text-red-800 text-xs font-bold">Delete</button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredVendors.length === 0 && (
                            <tr><td colSpan={7} className="py-12 text-center text-gray-400 italic">No vendors found matching your criteria.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-800 text-lg">
                {formMode === 'Enquiry' ? 'Log Vendor Enquiry' : (editingId ? 'Edit Vendor Details' : 'Add New Vendor')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                {isSuperAdmin && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign to Entity</label>
                        <select 
                            name="ownerId" 
                            value={formData.ownerId} 
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                        >
                            <option value="admin">Head Office</option>
                            {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                        </select>
                    </div>
                )}
                
                {formMode === 'Enquiry' && (
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-blue-700 text-sm flex items-start gap-2">
                        <Info className="w-5 h-5 shrink-0" />
                        <p>Logging a new vendor enquiry. This will be visible in the Vendor List upon submission.</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rider/Company Name *</label>
                        <input 
                            required
                            name="ownerName"
                            value={formData.ownerName}
                            onChange={handleInputChange}
                            placeholder="Name"
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Number *</label>
                        <input 
                            required
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="+91..."
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
                        <select 
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                        >
                            <option value="">Select City</option>
                            {CITY_OPTIONS.map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Optional)</label>
                        <input 
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="email@example.com"
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Primary Vehicle Type</label>
                    <select 
                        name="vehicleType"
                        value={formData.vehicleType}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                    >
                        <option value="">Select Vehicle</option>
                        {VEHICLE_TYPE_OPTIONS.map(vType => <option key={vType} value={vType}>{vType}</option>)}
                    </select>
                    {formData.vehicleType === 'Other' && (
                        <input 
                            name="vehicleTypeOther"
                            value={formData.vehicleTypeOther}
                            onChange={handleInputChange}
                            placeholder="Specify other vehicle type"
                            className="w-full p-2 mt-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fleet Size</label>
                        <input 
                            type="number"
                            name="fleetSize"
                            value={formData.fleetSize}
                            onChange={handleInputChange}
                            min="1"
                            placeholder="1"
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                        <select 
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                        >
                            <option>Pending</option>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Documents Received</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {DOCUMENT_OPTIONS.map(doc => (
                            <label key={doc} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={formData.documentStatus.includes(doc)}
                                    onChange={() => handleCheckboxChange(doc)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                />
                                {doc}
                            </label>
                        ))}
                    </div>
                    {formData.documentStatus.includes('Full Document Received') && (
                        <p className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> All necessary documents marked as received.
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label>
                    <textarea 
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Additional notes about the vendor or enquiry..."
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-colors">
                        {formMode === 'Enquiry' ? 'Save Enquiry' : (editingId ? 'Update Vendor' : 'Add Vendor')}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
