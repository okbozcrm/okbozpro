
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Car, Phone, Mail, Trash2, 
  Sparkles, MessageCircle, Send, User, MapPin, X, 
  MoreVertical, Filter, RefreshCcw, ChevronDown, Building2,
  Calendar, FileText, CheckSquare, Square, DollarSign, Save, Briefcase,
  Users, CheckCircle, Clock, PhoneCall, List, Edit, Truck, Activity
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

interface Vendor {
  id: string;
  ownerId?: string; 
  franchiseName?: string; 
  employeeId?: string; 
  employeeName?: string; 
  category?: string;
  subCategory?: string;
  callCategory?: string;
  vehicleType: string;
  vehicleTypeOther?: string; 
  source?: string;
  phone: string; 
  callStatus?: string;
  ownerName: string; 
  city: string; 
  riderStatus?: string;
  followUpStatus?: string;
  followUpDate?: string;
  documentReceived?: string;
  documentStatus: string[]; 
  existingDocuments?: string; 
  attachmentStatus?: string;
  recharge99?: string;
  topup100?: string;
  topup50?: string;
  remarks?: string;
  email?: string;
  vehicleTypes: string[]; 
  fleetSize: number;
  status: 'Active' | 'Inactive' | 'Pending';
  history: HistoryLog[];
}

const CITY_OPTIONS = ['Coimbatore', 'Trichy', 'Salem', 'Madurai', 'Chennai'];
const VEHICLE_TYPE_OPTIONS = ['Cab', 'Load Xpress', 'Passenger Auto', 'Bike Taxi', 'Other'];
const DOCUMENT_OPTIONS = ['Aadhaar Card', 'Driving License', 'RC Book', 'Insurance', 'Vehicle Permit', 'Full Document Received'];

const VendorAttachment = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const [activeTab, setActiveTab] = useState<'Enquiries' | 'List'>('Enquiries');
  const [corporates, setCorporates] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
      const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      setCorporates(corps);

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

  const [vendors, setVendors] = useState<Vendor[]>([]);

  const loadVendors = () => {
    let allVendors: Vendor[] = [];
    if (isSuperAdmin) {
        const adminData = localStorage.getItem('vendor_data');
        if (adminData) {
            try { 
                const parsed = JSON.parse(adminData);
                allVendors = [...allVendors, ...parsed.map((v: any) => ({...v, ownerId: 'admin', franchiseName: 'Head Office'}))];
            } catch (e) {}
        }
        const corporatesList = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporatesList.forEach((corp: any) => {
            const cData = localStorage.getItem(`vendor_data_${corp.email}`);
            if (cData) {
                try {
                    const parsed = JSON.parse(cData);
                    allVendors = [...allVendors, ...parsed.map((v: any) => ({...v, ownerId: corp.email, franchiseName: corp.companyName}))];
                } catch (e) {}
            }
        });
    } else {
        const key = `vendor_data_${sessionId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                allVendors = JSON.parse(saved).map((v: any) => ({...v, ownerId: sessionId, franchiseName: 'My Franchise'}));
            } catch (e) {}
        }
    }
    setVendors(allVendors.reverse());
  };

  useEffect(() => {
      loadVendors();
      window.addEventListener('storage', loadVendors);
      return () => window.removeEventListener('storage', loadVendors);
  }, [isSuperAdmin, sessionId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [cityFilter, setCityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vehicleFilter, setVehicleFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All');

  const initialFormState = {
    ownerId: isSuperAdmin ? 'admin' : sessionId,
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
    existingDocuments: '',
    attachmentStatus: '',
    recharge99: '',
    topup100: '',
    topup50: '', 
    remarks: '',
    status: 'Pending' as 'Active' | 'Inactive' | 'Pending',
    fleetSize: 1
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formMode, setFormMode] = useState<'Enquiry' | 'Full'>('Full');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ownerName || !formData.phone) {
        alert("Rider Name and Phone Number are required.");
        return;
    }

    const employeeName = employees.find(e => e.id === formData.employeeId)?.name || (formMode === 'Enquiry' ? 'Web Enquiry' : 'Unknown');
    const finalVehicleType = formData.vehicleType === 'Other' ? formData.vehicleTypeOther : formData.vehicleType;
    const targetOwnerId = formData.ownerId; 
    const storageKey = targetOwnerId === 'admin' ? 'vendor_data' : `vendor_data_${targetOwnerId}`;

    let existingData: Vendor[] = [];
    try {
        existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch(e) {}

    const vendorData: Vendor = {
      id: editingId || `V${Date.now()}`,
      ...formData,
      employeeName,
      email: formData.email || '', 
      fleetSize: Number(formData.fleetSize) || 1,
      vehicleTypes: [finalVehicleType || 'Unknown'],
      status: formData.status, 
      history: [],
      ownerId: targetOwnerId, 
      franchiseName: targetOwnerId === 'admin' ? 'Head Office' : corporates.find(c => c.email === targetOwnerId)?.companyName
    };

    let updatedData: Vendor[];
    if (editingId) {
        const existingRecord = existingData.find(v => v.id === editingId);
        if (existingRecord) vendorData.history = existingRecord.history;
        updatedData = existingData.map(v => v.id === editingId ? vendorData : v);
    } else {
        updatedData = [vendorData, ...existingData];
    }

    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    window.dispatchEvent(new Event('cloud-sync-immediate'));

    if (editingId) setVendors(prev => prev.map(v => v.id === editingId ? vendorData : v));
    else setVendors(prev => [vendorData, ...prev]);
    
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    alert("Record saved!");
  };

  const handleDelete = (id: string, vendor: Vendor, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('Are you sure?')) {
        const targetOwnerId = vendor.ownerId || 'admin';
        const storageKey = targetOwnerId === 'admin' ? 'vendor_data' : `vendor_data_${targetOwnerId}`;
        try {
            const currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const updatedData = currentData.filter((v: any) => v.id !== id);
            localStorage.setItem(storageKey, JSON.stringify(updatedData));
            window.dispatchEvent(new Event('cloud-sync-immediate'));
            setVendors(prev => prev.filter(v => v.id !== id));
            if (selectedVendor?.id === id) setSelectedVendor(null);
        } catch(err) {}
    }
  };

  const handleCall = (phone: string) => window.location.href = `tel:${phone}`;
  const handleWhatsApp = (phone: string) => window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.city.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.phone.includes(searchTerm);
    const matchesCity = cityFilter === 'All' || v.city === cityFilter;
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || v.category === categoryFilter;
    const matchesVehicle = vehicleFilter === 'All' || v.vehicleTypes.some(vt => vt.toLowerCase().includes(vehicleFilter.toLowerCase()));
    const matchesOwner = ownerFilter === 'All' || v.ownerId === ownerFilter;
    return matchesSearch && matchesCity && matchesStatus && matchesVehicle && matchesCategory && matchesOwner;
  });

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
        <div><h2 className="text-2xl font-bold text-gray-800">Vendor Management</h2><p className="text-gray-500">{isSuperAdmin ? "Consolidated vendors across all entities" : "Manage your attached vendors"}</p></div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('Enquiries')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'Enquiries' ? 'bg-white shadow text-emerald-600' : 'text-gray-600'}`}><FileText className="w-4 h-4" /> Enquiries</button>
            <button onClick={() => setActiveTab('List')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'List' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}><List className="w-4 h-4" /> Vendor List</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0 animate-in fade-in">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4"><div className="p-3 rounded-full bg-blue-50 text-blue-600"><Users className="w-6 h-6" /></div><div><p className="text-xs font-bold text-gray-500 uppercase">Total Vendors</p><h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3></div></div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4"><div className="p-3 rounded-full bg-emerald-50 text-emerald-600"><CheckCircle className="w-6 h-6" /></div><div><p className="text-xs font-bold text-gray-500 uppercase">Active</p><h3 className="text-2xl font-bold text-gray-800">{stats.active}</h3></div></div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4"><div className="p-3 rounded-full bg-orange-50 text-orange-600"><Clock className="w-6 h-6" /></div><div><p className="text-xs font-bold text-gray-500 uppercase">Pending</p><h3 className="text-2xl font-bold text-gray-800">{stats.pending}</h3></div></div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4"><div className="p-3 rounded-full bg-purple-50 text-purple-600"><Truck className="w-6 h-6" /></div><div><p className="text-xs font-bold text-gray-500 uppercase">Fleet Size</p><h3 className="text-2xl font-bold text-gray-800">{stats.fleet}</h3></div></div>
      </div>

      {activeTab === 'Enquiries' && (
          <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> Recent Enquiries</h3>
                  <button onClick={() => { setFormData(initialFormState); setFormMode('Enquiry'); setIsModalOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Enquiry</button>
              </div>
              <div className="flex-1 overflow-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0 z-10">
                          <tr><th className="px-6 py-4">Vendor Name</th><th className="px-6 py-4">City</th><th className="px-6 py-4">Phone</th><th className="px-6 py-4">Vehicle</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredVendors.map(vendor => (
                              <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-gray-900">{vendor.ownerName}</td>
                                  <td className="px-6 py-4 text-gray-600">{vendor.city}</td>
                                  <td className="px-6 py-4 text-gray-600"><ContactDisplay type="phone" value={vendor.phone} /></td>
                                  <td className="px-6 py-4 text-gray-600"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{vendor.vehicleTypes.join(', ')}</span></td>
                                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${vendor.status === 'Active' ? 'bg-green-100 text-green-700' : vendor.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{vendor.status}</span></td>
                                  <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => setSelectedVendor(vendor)} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded border border-blue-200 text-xs font-medium">Details</button></div></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'List' && (
          <div className="space-y-6 animate-in fade-in flex-1 overflow-auto">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                 <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                 <div className="flex gap-2 items-center">
                    <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none cursor-pointer"><option value="All">All Cities</option>{CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    <button onClick={() => { setFormData(initialFormState); setFormMode('Full'); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Vendor</button>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredVendors.map(vendor => (
                    <div key={vendor.id} onClick={() => setSelectedVendor(vendor)} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg transition-all cursor-pointer group relative">
                        {isSuperAdmin && vendor.franchiseName && (<div className="absolute top-3 right-3 bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1"><Building2 className="w-3 h-3" />{vendor.franchiseName}</div>)}
                        <div className="p-6">
                           <div className="flex justify-between items-start mb-4"><div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100"><Car className="w-6 h-6 text-blue-600" /></div><span className={`px-2 py-1 rounded-full text-xs font-bold border ${vendor.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : vendor.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{vendor.status}</span></div>
                           <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{vendor.ownerName}</h3>
                           <p className="text-sm text-gray-500 mb-4 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {vendor.city}</p>
                           <div className="space-y-2 border-t border-gray-50 pt-3"><div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" /><span onClick={(e) => e.stopPropagation()}><ContactDisplay type="phone" value={vendor.phone} /></span></div></div>
                        </div>
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center group-hover:bg-blue-50/30"><span className="text-sm font-medium text-emerald-600 group-hover:underline">View Details</span><button onClick={(e) => handleDelete(vendor.id, vendor, e)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button></div>
                    </div>
                 ))}
              </div>
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl"><h3 className="font-bold text-gray-800">{formMode === 'Enquiry' ? 'New Vendor Enquiry' : 'Full Vendor Form'}</h3><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                 <div className="bg-white border border-gray-200 rounded-xl p-4">
                     <h4 className="font-bold text-gray-700 mb-4 border-b pb-2 text-sm flex items-center gap-2"><Car className="w-4 h-4 text-emerald-600" /> Details</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name *</label><input name="ownerName" value={formData.ownerName} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" required /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone *</label><input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" required /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">City *</label><select name="city" value={formData.city} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none" required><option value="">Choose</option>{CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vehicle *</label><select name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none" required><option value="">Choose</option>{VEHICLE_TYPE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                        <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label><select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"><option value="Pending">Pending</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
                     </div>
                 </div>
                 <div className="pt-4 flex justify-end gap-2 border-t border-gray-100"><button type="submit" className="bg-emerald-600 text-white px-8 py-2.5 rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all">Save Changes</button></div>
              </form>
           </div>
        </div>
      )}

      {selectedVendor && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
               <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50 rounded-t-2xl"><div><h3 className="text-xl font-bold text-gray-900">{selectedVendor.ownerName}</h3><p className="text-sm text-gray-500">{selectedVendor.city}</p></div><button onClick={() => setSelectedVendor(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
               <div className="p-6 overflow-y-auto space-y-6"><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-gray-500 text-xs font-bold uppercase">Contact</p><p className="font-medium text-gray-800"><ContactDisplay type="phone" value={selectedVendor.phone} /></p></div><div><p className="text-gray-500 text-xs font-bold uppercase">Status</p><p className="font-medium text-gray-800">{selectedVendor.status}</p></div></div><div className="flex gap-3 pt-4 border-t border-gray-100"><button onClick={() => handleCall(selectedVendor.phone)} className="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-lg font-bold text-sm">Call</button><button onClick={() => handleWhatsApp(selectedVendor.phone)} className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg font-bold text-sm">WhatsApp</button></div></div>
            </div></div>
      )}

      <AiAssistant systemInstruction="You are Boz Chat, helping with vendor attachments." initialMessage="Need help with vendors?" triggerButtonLabel="Boz Chat" />
    </div>
  );
};

export default VendorAttachment;
