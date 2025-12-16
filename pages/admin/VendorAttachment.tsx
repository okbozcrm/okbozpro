
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Car, Phone, Mail, Trash2, 
  Sparkles, MessageCircle, Send, User, MapPin, X, 
  MoreVertical, Filter, RefreshCcw, ChevronDown, Building2
} from 'lucide-react';
import AiAssistant from '../../components/AiAssistant'; // Import the refactored AI Assistant

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
  ownerName: string;
  phone: string;
  email: string;
  vehicleTypes: string[]; // e.g., ['Sedan', 'SUV']
  fleetSize: number;
  status: 'Active' | 'Inactive' | 'Pending';
  city: string;
  history: HistoryLog[];
  franchiseName?: string; // For Admin View
}

const CITY_OPTIONS = ['Coimbatore', 'Trichy', 'Salem', 'Madurai', 'Chennai'];
const VEHICLE_TYPE_OPTIONS = ['Sedan', 'SUV', 'Hatchback', 'Van', 'Truck', 'Auto'];

const MOCK_VENDORS: Vendor[] = [];

const VendorAttachment = () => {
  // Determine Session Context
  const getSessionKey = () => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? 'vendor_data' : `vendor_data_${sessionId}`;
  };

  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  const [vendors, setVendors] = useState<Vendor[]>(() => {
    if (isSuperAdmin) {
        // --- SUPER ADMIN AGGREGATION ---
        let allVendors: Vendor[] = [];
        
        // 1. Admin Data
        const adminData = localStorage.getItem('vendor_data');
        if (adminData) {
            try { 
                const parsed = JSON.parse(adminData);
                allVendors = [...allVendors, ...parsed.map((v: any) => ({...v, franchiseName: 'Head Office'}))];
            } catch (e) {}
        } else {
            allVendors = [...allVendors, ...MOCK_VENDORS.map(v => ({...v, franchiseName: 'Head Office'}))];
        }

        // 2. Corporate Data
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporates.forEach((corp: any) => {
            const cData = localStorage.getItem(`vendor_data_${corp.email}`);
            if (cData) {
                try {
                    const parsed = JSON.parse(cData);
                    const tagged = parsed.map((v: any) => ({...v, franchiseName: corp.companyName}));
                    allVendors = [...allVendors, ...tagged];
                } catch (e) {}
            }
        });
        return allVendors;
    } else {
        const key = getSessionKey();
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
        return [];
    }
  });

  // Save to persistent storage (Only for current session context)
  useEffect(() => {
    if (!isSuperAdmin) {
        const key = getSessionKey();
        localStorage.setItem(key, JSON.stringify(vendors));
    } else {
        // For Super Admin, only save Head Office vendors back to main storage to avoid duplication/overwrite issues
        const headOfficeVendors = vendors.filter(v => v.franchiseName === 'Head Office');
        localStorage.setItem('vendor_data', JSON.stringify(headOfficeVendors));
    }
  }, [vendors, isSuperAdmin]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  
  // Filter States
  const [cityFilter, setCityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vehicleFilter, setVehicleFilter] = useState('All');
  
  // AI & Logs State
  const [aiMessage, setAiMessage] = useState('');
  const [newLogMessage, setNewLogMessage] = useState('');
  const [logType, setLogType] = useState<'Note' | 'Call'>('Note');
  const [callOutcome, setCallOutcome] = useState('Connected');
  
  // Add Vendor Form State
  const [formData, setFormData] = useState({
    ownerName: '',
    phone: '',
    email: '',
    vehicleTypes: '',
    fleetSize: '',
    city: 'Coimbatore',
    status: 'Pending'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newVendor: Vendor = {
      id: `V${Date.now()}`,
      ownerName: formData.ownerName,
      phone: formData.phone,
      email: formData.email,
      vehicleTypes: formData.vehicleTypes.split(',').map(s => s.trim()),
      fleetSize: parseInt(formData.fleetSize) || 0,
      status: formData.status as any,
      city: formData.city,
      history: [],
      franchiseName: isSuperAdmin ? 'Head Office' : undefined
    };
    setVendors([newVendor, ...vendors]);
    setIsModalOpen(false);
    setFormData({
      ownerName: '', phone: '', email: '', 
      vehicleTypes: '', fleetSize: '', city: 'Coimbatore', status: 'Pending'
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('Are you sure you want to delete this vendor?')) {
        setVendors(vendors.filter(v => v.id !== id));
        if (selectedVendor?.id === id) setSelectedVendor(null);
    }
  };

  // Interaction Handlers
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = aiMessage ? `&text=${encodeURIComponent(aiMessage)}` : '';
    window.open(`https://wa.me/${cleanPhone}?${text}`, '_blank');
  };

  const handleEmail = (email: string) => {
    const body = aiMessage ? `&body=${encodeURIComponent(aiMessage)}` : '';
    window.location.href = `mailto:${email}?${body}`;
  };

  const handleAiGen = (type: 'Availability' | 'Payment') => {
    if (!selectedVendor) return;
    
    if (type === 'Availability') {
        setAiMessage(`Hi ${selectedVendor.ownerName},\n\nWe have a high demand for ${selectedVendor.vehicleTypes[0] || 'vehicles'} this weekend in ${selectedVendor.city}. Do you have any additional units available for deployment?\n\nLet us know.`);
    } else {
        setAiMessage(`Hi ${selectedVendor.ownerName},\n\nThis is regarding the payment for the last cycle. The invoice has been processed and you should receive the amount within 24 hours.\n\nThanks for your partnership.`);
    }
  };

  const handleAddLog = () => {
    if (!selectedVendor || !newLogMessage.trim()) return;

    const newLog: HistoryLog = {
        id: Date.now(),
        type: logType,
        message: newLogMessage,
        date: new Date().toLocaleString(),
        outcome: logType === 'Call' ? 'Connected' : undefined,
        duration: logType === 'Call' ? '0s' : undefined
    };

    const updatedVendor = {
        ...selectedVendor,
        history: [newLog, ...selectedVendor.history]
    };

    setVendors(prev => prev.map(v => v.id === updatedVendor.id ? updatedVendor : v));
    setSelectedVendor(updatedVendor);
    
    setNewLogMessage('');
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = cityFilter === 'All' || v.city === cityFilter;
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    
    const matchesVehicle = vehicleFilter === 'All' || 
        v.vehicleTypes.some(vt => vt.toLowerCase().includes(vehicleFilter.toLowerCase()));

    return matchesSearch && matchesCity && matchesStatus && matchesVehicle;
  });

  const aiSystemInstruction = `You are an AI assistant for vendor management at MY BUDDY. 
  Your task is to help the user with questions about vendors, their fleet, cities they operate in, 
  and common issues related to taxi services. Keep your responses concise and helpful. 
  The current vendor being viewed is ${selectedVendor?.ownerName || 'a vendor'}.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Vendor Attachment (Taxi)</h2>
           <p className="text-gray-500">
              {isSuperAdmin ? "View all vendors attached across franchises" : "Manage external taxi vendors and fleet partners"}
           </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Vendor
        </button>
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
         <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            <div className="relative min-w-[140px]">
                <select 
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm h-full cursor-pointer"
                >
                    <option value="All">All Cities</option>
                    {CITY_OPTIONS.map(city => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <ChevronDown className="w-3.5 h-3.5" />
                </div>
            </div>

            <div className="relative min-w-[140px]">
                <select 
                    value={vehicleFilter}
                    onChange={(e) => setVehicleFilter(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm h-full cursor-pointer"
                >
                    <option value="All">All Vehicles</option>
                    {VEHICLE_TYPE_OPTIONS.map(v => (
                        <option key={v} value={v}>{v}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <ChevronDown className="w-3.5 h-3.5" />
                </div>
            </div>

            <div className="relative min-w-[140px]">
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm h-full cursor-pointer"
                >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <ChevronDown className="w-3.5 h-3.5" />
                </div>
            </div>
            
            {(cityFilter !== 'All' || statusFilter !== 'All' || vehicleFilter !== 'All' || searchTerm) && (
               <button 
                  onClick={() => { setCityFilter('All'); setStatusFilter('All'); setVehicleFilter('All'); setSearchTerm(''); }}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                  title="Reset Filters"
               >
                  <RefreshCcw className="w-4 h-4" />
               </button>
            )}
         </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredVendors.map(vendor => (
            <div 
                key={vendor.id} 
                onClick={() => setSelectedVendor(vendor)}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group"
            >
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

                   {isSuperAdmin && vendor.franchiseName && (
                      <div className="mb-3 inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-semibold border border-indigo-100">
                          <Building2 className="w-3 h-3" />
                          {vendor.franchiseName}
                      </div>
                   )}
                   
                   <div className="space-y-2 border-t border-gray-50 pt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                         <Phone className="w-4 h-4 text-gray-400" /> {vendor.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                         <Mail className="w-4 h-4 text-gray-400" /> {vendor.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                         <Car className="w-4 h-4 text-gray-400" /> {vendor.fleetSize} Vehicles
                      </div>
                   </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
                   <span className="text-sm font-medium text-emerald-600 group-hover:underline">View Details</span>
                   <button onClick={(e) => handleDelete(vendor.id, e)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
            </div>
         ))}

         {filteredVendors.length === 0 && (
             <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                 {searchTerm || cityFilter !== 'All' || statusFilter !== 'All' || vehicleFilter !== 'All'
                    ? "No vendors match your filters." 
                    : "No vendors found. Add a new vendor to get started."}
             </div>
         )}
      </div>

      {/* Add Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-gray-800">Attach New Vendor</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                       <input required name="ownerName" value={formData.ownerName} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Rajesh Kumar" />
                    </div>
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                       <select 
                          name="city" 
                          value={formData.city} 
                          onChange={handleInputChange} 
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                          {CITY_OPTIONS.map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                       </select>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                       <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="+91..." />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                       <input required name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Email" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Fleet Size</label>
                       <input required type="number" name="fleetSize" value={formData.fleetSize} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                       <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-emerald-500">
                          <option>Active</option>
                          <option>Pending</option>
                          <option>Inactive</option>
                       </select>
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Types</label>
                    <input name="vehicleTypes" value={formData.vehicleTypes} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Sedan, SUV, Van (Comma separated)" />
                 </div>
                 
                 <div className="pt-4">
                    <button type="submit" className="w-full bg-emerald-500 text-white py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors shadow-sm">Attach Vendor</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Vendor Detail Modal (CRM Style) */}
      {selectedVendor && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
               {/* Modal Header */}
               <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50 rounded-t-2xl">
                  <div className="flex gap-4">
                     <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                        {selectedVendor.ownerName.charAt(0)}
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-gray-900">{selectedVendor.ownerName}</h3>
                        <p className="text-sm text-gray-500">{selectedVendor.city} • {selectedVendor.fleetSize} Vehicles</p>
                     </div>
                  </div>
                  <button onClick={() => { setSelectedVendor(null); setAiMessage(''); setNewLogMessage(''); }} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>

               {/* Modal Body */}
               <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       {/* Left Column: Contact Details, AI Assistant & Actions */}
                       <div className="space-y-6">
                          {/* Contact Details */}
                          <div className="space-y-4">
                             <h4 className="font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <User className="w-4 h-4 text-gray-400" /> Contact Info
                             </h4>
                             <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                   <Phone className="w-4 h-4 text-gray-400" />
                                   <a href={`tel:${selectedVendor.phone}`} className="text-blue-600 hover:underline">{selectedVendor.phone}</a>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                   <Mail className="w-4 h-4 text-gray-400" />
                                   <a href={`mailto:${selectedVendor.email}`} className="text-blue-600 hover:underline">{selectedVendor.email}</a>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                   <Car className="w-4 h-4 text-gray-400" />
                                   {selectedVendor.vehicleTypes.join(', ')}
                                </div>
                             </div>
                          </div>

                          {/* AI Smart Assistant - Refactored Component */}
                          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100 shadow-sm">
                             <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-3 text-sm">
                                <Sparkles className="w-4 h-4 text-indigo-600" /> AI Smart Assistant
                             </h4>
                             <div className="flex gap-2 mb-3">
                                <button 
                                  onClick={() => handleAiGen('Availability')}
                                  className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-50 transition-colors shadow-sm flex-1"
                                >
                                  Ask Availability
                                </button>
                                <button 
                                  onClick={() => handleAiGen('Payment')}
                                  className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-50 transition-colors shadow-sm flex-1"
                                >
                                  Payment Update
                                </button>
                             </div>
                             <div className="bg-white p-3 rounded-lg border border-indigo-100 text-xs text-gray-600 min-h-[80px] whitespace-pre-wrap leading-relaxed">
                                {aiMessage || <span className="text-gray-400 italic">Select a context above to generate a smart message using AI. This message will be pre-filled when you click WhatsApp or Email below.</span>}
                             </div>
                          </div>
                          <div className="relative">
                            <AiAssistant
                              systemInstruction={aiSystemInstruction}
                              initialMessage={`Hello! How can I assist you with ${selectedVendor.ownerName} today?`}
                              triggerButtonLabel="Ask Vendor AI"
                              isOpenInitially={false} // Always start closed in this context
                            />
                            <p className="text-xs text-gray-500 text-center mt-2">Click the button above to chat with the AI.</p>
                          </div>


                          {/* Quick Actions */}
                          <div className="flex gap-2">
                             <button 
                               onClick={() => handleCall(selectedVendor.phone)}
                               className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
                             >
                                <Phone className="w-3 h-3" /> Call
                             </button>
                             <button 
                               onClick={() => handleWhatsApp(selectedVendor.phone)}
                               className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
                             >
                                <MessageCircle className="w-3 h-3" /> WhatsApp
                             </button>
                             <button 
                               onClick={() => handleEmail(selectedVendor.email)}
                               className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
                             >
                                <Mail className="w-3 h-3" /> Email
                             </button>
                          </div>
                       </div>

                       {/* Right Column: Log & History */}
                       <div className="space-y-6">
                          {/* Manual Log Entry */}
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                             <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Add Note / Log Call</h4>
                             <div className="flex gap-2 mb-3">
                                <button 
                                  onClick={() => setLogType('Note')}
                                  className={`flex-1 text-xs font-medium py-1.5 rounded-md border ${logType === 'Note' ? 'bg-white border-gray-300 text-gray-800 shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}
                                >
                                  Note
                                </button>
                                <button 
                                  onClick={() => setLogType('Call')}
                                  className={`flex-1 text-xs font-medium py-1.5 rounded-md border ${logType === 'Call' ? 'bg-white border-gray-300 text-gray-800 shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}
                                >
                                  Call Log
                                </button>
                             </div>
                             
                             {logType === 'Call' && (
                                <div className="flex gap-2 mb-3">
                                   {['Connected', 'Missed', 'Voicemail'].map(outcome => (
                                      <button
                                          key={outcome}
                                          onClick={() => setCallOutcome(outcome)}
                                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${callOutcome === outcome ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200'}`}
                                      >
                                          {outcome}
                                      </button>
                                   ))}
                                </div>
                             )}

                             <div className="relative">
                                <textarea 
                                  value={newLogMessage}
                                  onChange={(e) => setNewLogMessage(e.target.value)}
                                  placeholder={logType === 'Call' ? "Call summary..." : "Add a note..."}
                                  className="w-full p-3 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                                />
                                <button 
                                  onClick={handleAddLog}
                                  disabled={!newLogMessage.trim()}
                                  className="absolute bottom-2 right-2 p-1.5 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                             </div>
                          </div>

                          {/* Activity History */}
                          <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Activity History</h4>
                              <div className="space-y-6 pl-2">
                                  {selectedVendor.history.length === 0 ? (
                                      <p className="text-xs text-gray-400 italic">No history available.</p>
                                  ) : (
                                      selectedVendor.history.map((log, idx) => (
                                          <div key={log.id} className={`relative pl-6 border-l-2 ${idx === selectedVendor.history.length - 1 ? 'border-transparent' : 'border-gray-200'}`}>
                                              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm ${
                                                  log.type === 'Call' ? 'bg-emerald-500' : 
                                                  log.type === 'Note' ? 'bg-blue-500' : 'bg-gray-400'
                                              }`}></div>
                                              <p className="text-xs text-gray-400 mb-1">{log.date}</p>
                                              <h5 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2">
                                                {log.type === 'Call' ? 'OUTGOING CALL' : log.type.toUpperCase()}
                                                {log.outcome && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                                        log.outcome === 'Missed' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    }`}>
                                                        {log.outcome}
                                                    </span>
                                                )}
                                              </h5>
                                              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{log.message}</p>
                                          </div>
                                      ))
                                  )}
                              </div>
                          </div>
                       </div>
                    </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default VendorAttachment;
