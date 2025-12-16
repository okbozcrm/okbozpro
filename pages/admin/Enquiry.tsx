
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Phone, User, Users, MapPin, 
  MessageCircle, Mail, Send, Calendar, Clock, 
  CheckCircle, X, Car, AlertCircle, PhoneIncoming, UserPlus, PhoneOutgoing 
} from 'lucide-react';
import { Enquiry, HistoryLog, Employee } from '../../types';
import { MOCK_EMPLOYEES } from '../../constants';

// Helper to access vendor data to check for existence
const getExistingVendors = () => {
  // We look at both global admin vendor data and session data just in case
  const globalData = localStorage.getItem('vendor_data');
  return globalData ? JSON.parse(globalData) : [];
};

const EnquiryPage: React.FC = () => {
  // We use a GLOBAL key for enquiries so Admin and Corporate can share this specific pool of data
  // In a real app, this would be filtered by API. Here, we simulate a shared database.
  const STORAGE_KEY = 'global_enquiries_data';
  
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [vendors] = useState<any[]>(getExistingVendors());
  
  // Load Corporate Accounts for City Dropdown
  const [corporateAccounts, setCorporateAccounts] = useState<any[]>(() => {
    const saved = localStorage.getItem('corporate_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  // Determine Session Context and Load Employees
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (isSuperAdmin) {
       // Super Admin sees standard mock employees + any they added
       const saved = localStorage.getItem('staff_data');
       const localStaff = saved ? JSON.parse(saved) : [];
       return [...MOCK_EMPLOYEES, ...localStaff]; 
    } else {
       // Corporate sees their own staff
       const key = `staff_data_${sessionId}`;
       const saved = localStorage.getItem(key);
       return saved ? JSON.parse(saved) : [];
    }
  });
  
  // UI State
  const [viewMode, setViewMode] = useState<'List' | 'Detail'>('List');
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Customer' | 'Vendor'>('All');

  // Form State
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    initialInteraction: 'Incoming' as 'Incoming' | 'Outgoing', // NEW FIELD
    type: 'Customer' as 'Customer' | 'Vendor',
    phone: '',
    name: '',
    city: '',
    email: '',
    details: '',
    vendorId: '',
    isExisting: false
  });

  // Log State
  const [newLogMessage, setNewLogMessage] = useState('');
  const [logType, setLogType] = useState<'Note' | 'Call'>('Note');

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enquiries));
  }, [enquiries]);

  // --- Actions ---

  const handlePhoneCheck = () => {
    if (formData.type === 'Vendor') {
      const foundVendor = vendors.find((v: any) => v.phone.includes(formData.phone) && formData.phone.length > 5);
      if (foundVendor) {
        setFormData(prev => ({
          ...prev,
          name: foundVendor.ownerName,
          city: foundVendor.city,
          email: foundVendor.email,
          vendorId: foundVendor.id,
          isExisting: true
        }));
      } else {
        setFormData(prev => ({ ...prev, isExisting: false, vendorId: '' }));
      }
    }
    setFormStep(2);
  };

  const handleCreateEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newEnquiry: Enquiry = {
      id: `ENQ-${Date.now()}`,
      type: formData.type,
      initialInteraction: formData.initialInteraction, // NEW
      name: formData.name,
      phone: formData.phone,
      city: formData.city,
      email: formData.email,
      details: formData.details,
      status: 'New',
      isExistingVendor: formData.isExisting,
      vendorId: formData.vendorId,
      createdAt: new Date().toLocaleString(),
      history: [
        {
          id: Date.now(),
          type: 'Call',
          message: formData.initialInteraction === 'Incoming' ? 'Incoming Enquiry Received' : 'Outgoing Enquiry Initiated',
          date: new Date().toLocaleString(),
          outcome: 'Connected'
        }
      ]
    };

    setEnquiries([newEnquiry, ...enquiries]);
    closeModal();
  };

  const handleAddLog = () => {
    if (!selectedEnquiry || !newLogMessage.trim()) return;

    const newLog: HistoryLog = {
      id: Date.now(),
      type: logType,
      message: newLogMessage,
      date: new Date().toLocaleString(),
      outcome: logType === 'Call' ? 'Connected' : undefined
    };

    const updatedEnquiry = {
      ...selectedEnquiry,
      history: [newLog, ...selectedEnquiry.history]
    };

    setEnquiries(prev => prev.map(e => e.id === updatedEnquiry.id ? updatedEnquiry : e));
    setSelectedEnquiry(updatedEnquiry);
    setNewLogMessage('');
  };

  const handleStatusChange = (status: Enquiry['status']) => {
    if (!selectedEnquiry) return;
    const updated = { ...selectedEnquiry, status };
    setEnquiries(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelectedEnquiry(updated);
  };

  const handleFollowUpDate = (date: string) => {
    if (!selectedEnquiry) return;
    const updated = { ...selectedEnquiry, nextFollowUp: date };
    setEnquiries(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelectedEnquiry(updated);
  };

  const handleAssignStaff = (empId: string) => {
    if (!selectedEnquiry) return;
    const updated = { ...selectedEnquiry, assignedTo: empId };
    setEnquiries(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelectedEnquiry(updated);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormStep(1);
    setFormData({
      initialInteraction: 'Incoming', // Reset to default
      type: 'Customer',
      phone: '',
      name: '',
      city: '',
      email: '',
      details: '',
      vendorId: '',
      isExisting: false
    });
  };

  // --- Communication Handlers ---
  const handleCall = () => window.location.href = `tel:${selectedEnquiry?.phone}`;
  
  const handleWhatsApp = () => {
    if (!selectedEnquiry) return;
    const text = `Hi ${selectedEnquiry.name}, regarding your enquiry about: ${selectedEnquiry.details}`;
    window.open(`https://wa.me/${selectedEnquiry.phone.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleEmail = () => {
    if (!selectedEnquiry?.email) return;
    window.location.href = `mailto:${selectedEnquiry.email}?subject=Regarding your Enquiry&body=Hi ${selectedEnquiry.name},`;
  };

  // Helper to get assigned staff info
  const getAssignedStaff = (id?: string) => {
    if (!id) return null;
    return employees.find(e => e.id === id);
  };

  // --- Filtering ---
  const filteredEnquiries = enquiries.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.city.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.phone.includes(searchTerm);
    const matchesType = filterType === 'All' || e.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Enquiry Management</h2>
          <p className="text-gray-500">Handle Customer & Vendor calls, transfer to corporate</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all animate-in fade-in slide-in-from-right-4"
        >
          <PhoneIncoming className="w-5 h-5 animate-pulse" />
          New Enquiry
        </button>
      </div>

      {viewMode === 'List' ? (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
           {/* Filters */}
           <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
               <input 
                 type="text" 
                 placeholder="Search by Name, City or Phone..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
               />
             </div>
             <div className="flex bg-white rounded-lg border border-gray-200 p-1">
               {['All', 'Customer', 'Vendor'].map(t => (
                 <button
                   key={t}
                   onClick={() => setFilterType(t as any)}
                   className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === t ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'}`}
                 >
                   {t}
                 </button>
               ))}
             </div>
           </div>

           {/* List */}
           <div className="flex-1 overflow-y-auto p-2">
             <div className="space-y-2">
               {filteredEnquiries.map(enquiry => {
                 const assignedStaff = getAssignedStaff(enquiry.assignedTo);
                 return (
                 <div 
                    key={enquiry.id}
                    onClick={() => { setSelectedEnquiry(enquiry); setViewMode('Detail'); }}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white hover:bg-gray-50 border border-gray-100 rounded-xl cursor-pointer transition-all hover:shadow-md group"
                 >
                    <div className="flex items-start gap-4">
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${enquiry.type === 'Customer' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                          {enquiry.type === 'Customer' ? <User className="w-6 h-6" /> : <Car className="w-6 h-6" />}
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <h3 className="font-bold text-gray-800">{enquiry.name}</h3>
                             <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${enquiry.type === 'Customer' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                {enquiry.type}
                             </span>
                             {enquiry.initialInteraction === 'Incoming' ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1">
                                    <PhoneIncoming className="w-2.5 h-2.5" /> Incoming
                                </span>
                             ) : (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex items-center gap-1">
                                    <PhoneOutgoing className="w-2.5 h-2.5" /> Outgoing
                                </span>
                             )}
                             {enquiry.isExistingVendor && (
                               <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-green-50 text-green-600 border border-green-100">
                                  Existing
                               </span>
                             )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                             <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {enquiry.phone}</span>
                             <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {enquiry.city}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-1 border-l-2 border-gray-200 pl-2 italic">
                             "{enquiry.details}"
                          </p>
                       </div>
                    </div>

                    <div className="flex md:flex-col items-end gap-2 mt-4 md:mt-0 pl-16 md:pl-0">
                       {assignedStaff && (
                          <div className="flex items-center gap-2 mb-1 bg-gray-100 px-2 py-1 rounded-full">
                             <img src={assignedStaff.avatar} alt="" className="w-4 h-4 rounded-full" />
                             <span className="text-xs text-gray-600 font-medium max-w-[100px] truncate">{assignedStaff.name}</span>
                          </div>
                       )}
                       <div className="flex items-center gap-2">
                           <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              enquiry.status === 'New' ? 'bg-red-50 text-red-600' :
                              enquiry.status === 'In Progress' ? 'bg-yellow-50 text-yellow-600' :
                              enquiry.status === 'Converted' ? 'bg-emerald-50 text-emerald-600' :
                              'bg-gray-100 text-gray-600'
                           }`}>
                              {enquiry.status}
                           </span>
                           <span className="text-xs text-gray-400">{enquiry.createdAt.split(',')[0]}</span>
                       </div>
                    </div>
                 </div>
               )})}
               
               {filteredEnquiries.length === 0 && (
                 <div className="text-center py-12 text-gray-500">
                    <PhoneIncoming className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No enquiries found.</p>
                 </div>
               )}
             </div>
           </div>
        </div>
      ) : (
        /* Detail View */
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-full">
           {selectedEnquiry && (
             <>
                {/* Left Panel: Info */}
                <div className="md:w-1/3 bg-gray-50 p-6 border-r border-gray-200 overflow-y-auto">
                   <button onClick={() => setViewMode('List')} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-6">
                      <X className="w-4 h-4" /> Close Details
                   </button>
                   
                   <div className="flex flex-col items-center text-center mb-6">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 shadow-sm ${selectedEnquiry.type === 'Customer' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                          {selectedEnquiry.type === 'Customer' ? <User className="w-10 h-10" /> : <Car className="w-10 h-10" />}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedEnquiry.name}</h2>
                      <p className="text-sm text-gray-500 flex items-center gap-1 justify-center mt-1">
                         <MapPin className="w-3 h-3" /> {selectedEnquiry.city}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs font-bold text-gray-600 shadow-sm">
                           {selectedEnquiry.type}
                        </span>
                        {selectedEnquiry.initialInteraction === 'Incoming' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1">
                                <PhoneIncoming className="w-2.5 h-2.5" /> Incoming
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex items-center gap-1">
                                <PhoneOutgoing className="w-2.5 h-2.5" /> Outgoing
                            </span>
                        )}
                        {selectedEnquiry.isExistingVendor && (
                           <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded text-xs font-bold text-emerald-600 shadow-sm">
                              Existing Vendor
                           </span>
                        )}
                      </div>
                   </div>

                   <div className="space-y-6">
                      {/* Assign Staff Section */}
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                             <UserPlus className="w-3 h-3" /> Assign to Staff
                          </h4>
                          <div className="relative">
                              <select
                                  value={selectedEnquiry.assignedTo || ''}
                                  onChange={(e) => handleAssignStaff(e.target.value)}
                                  className="w-full p-2.5 pl-3 pr-8 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 cursor-pointer appearance-none"
                              >
                                  <option value="">Select Employee</option>
                                  {employees.map(emp => (
                                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                                  ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                              </div>
                          </div>
                          {selectedEnquiry.assignedTo && (
                              <div className="mt-3 flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                  <img src={getAssignedStaff(selectedEnquiry.assignedTo)?.avatar} alt="" className="w-8 h-8 rounded-full" />
                                  <div className="text-xs">
                                      <p className="font-bold text-blue-800">{getAssignedStaff(selectedEnquiry.assignedTo)?.name}</p>
                                      <p className="text-blue-600">Assigned Owner</p>
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                         <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Enquiry Details</h4>
                         <p className="text-sm text-gray-700 leading-relaxed italic">
                            "{selectedEnquiry.details}"
                         </p>
                         <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">
                            Created: {selectedEnquiry.createdAt}
                         </p>
                      </div>

                      <div>
                         <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Info</h4>
                         <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                               <Phone className="w-4 h-4 text-gray-400" />
                               <span className="text-sm font-medium">{selectedEnquiry.phone}</span>
                            </div>
                            {selectedEnquiry.email && (
                              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                                 <Mail className="w-4 h-4 text-gray-400" />
                                 <span className="text-sm font-medium">{selectedEnquiry.email}</span>
                              </div>
                            )}
                         </div>
                      </div>
                      
                      <div>
                         <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Actions</h4>
                         <div className="grid grid-cols-3 gap-2">
                            <button onClick={handleCall} className="flex flex-col items-center justify-center gap-1 p-3 bg-white border border-gray-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all">
                               <Phone className="w-5 h-5" />
                               <span className="text-xs font-medium">Call</span>
                            </button>
                            <button onClick={handleWhatsApp} className="flex flex-col items-center justify-center gap-1 p-3 bg-white border border-gray-200 rounded-xl hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-all">
                               <MessageCircle className="w-5 h-5" />
                               <span className="text-xs font-medium">WhatsApp</span>
                            </button>
                            <button onClick={handleEmail} className="flex flex-col items-center justify-center gap-1 p-3 bg-white border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all">
                               <Mail className="w-5 h-5" />
                               <span className="text-xs font-medium">Email</span>
                            </button>
                         </div>
                      </div>

                      {/* Corporate Routing Info */}
                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                         <div className="flex gap-2">
                            <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />
                            <div className="text-xs text-indigo-800">
                               <p className="font-bold mb-1">Corporate Routing</p>
                               <p>This enquiry is visible to the Corporate Panel managing <strong>{selectedEnquiry.city}</strong>.</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Right Panel: Workflows */}
                <div className="md:w-2/3 p-6 flex flex-col bg-white overflow-hidden">
                   {/* Status Bar */}
                   <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                      <div>
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Status</label>
                         <div className="flex gap-2 mt-2">
                            {['New', 'In Progress', 'Converted', 'Closed'].map(s => (
                               <button
                                 key={s}
                                 onClick={() => handleStatusChange(s as any)}
                                 className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                                    selectedEnquiry.status === s 
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200 ring-2 ring-emerald-100' 
                                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                 }`}
                               >
                                  {s}
                               </button>
                            ))}
                         </div>
                      </div>
                      <div className="text-right">
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Next Follow-up</label>
                         <div className="flex items-center gap-2 mt-2">
                            <Calendar className="w-4 h-4 text-emerald-500" />
                            <input 
                               type="date" 
                               value={selectedEnquiry.nextFollowUp || ''}
                               onChange={(e) => handleFollowUpDate(e.target.value)}
                               className="text-sm font-medium text-gray-700 bg-transparent border-none focus:ring-0 p-0"
                            />
                         </div>
                      </div>
                   </div>

                   {/* History Timeline */}
                   <div className="flex-1 overflow-y-auto pr-2">
                      <div className="space-y-6">
                         {selectedEnquiry.history.map((log, idx) => (
                            <div key={log.id} className="flex gap-4">
                               <div className="flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10 ${
                                     log.type === 'Call' ? 'bg-emerald-100 text-emerald-600' :
                                     log.type === 'Note' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                     {log.type === 'Call' ? <Phone className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                                  </div>
                                  {idx !== selectedEnquiry.history.length - 1 && <div className="w-0.5 bg-gray-100 h-full -mb-4"></div>}
                               </div>
                               <div className="bg-gray-50 rounded-lg p-4 flex-1 border border-gray-100">
                                  <div className="flex justify-between items-start mb-1">
                                     <span className="text-xs font-bold text-gray-500 uppercase">{log.type}</span>
                                     <span className="text-[10px] text-gray-400">{log.date}</span>
                                  </div>
                                  <p className="text-sm text-gray-800">{log.message}</p>
                                  {log.outcome && (
                                     <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-500">
                                        Outcome: {log.outcome}
                                     </span>
                                  )}
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* Add Log Input */}
                   <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex gap-2 mb-2">
                         <button onClick={() => setLogType('Note')} className={`text-xs px-3 py-1 rounded-md transition-colors ${logType === 'Note' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>Note</button>
                         <button onClick={() => setLogType('Call')} className={`text-xs px-3 py-1 rounded-md transition-colors ${logType === 'Call' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:bg-gray-50'}`}>Log Call</button>
                      </div>
                      <div className="relative">
                         <textarea 
                           placeholder={logType === 'Note' ? "Add a note..." : "Enter call summary..."}
                           value={newLogMessage}
                           onChange={(e) => setNewLogMessage(e.target.value)}
                           className="w-full p-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-20"
                         />
                         <button 
                           onClick={handleAddLog}
                           disabled={!newLogMessage.trim()}
                           className="absolute bottom-2 right-2 p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                         >
                            <Send className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                </div>
             </>
           )}
        </div>
      )}

      {/* Add Enquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-800">New Incoming Enquiry</h3>
               <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
               </button>
            </div>

            <form onSubmit={handleCreateEnquiry} className="p-6">
               {/* Step 1: Interaction Type, Enquiry Source & Phone */}
               {formStep === 1 && (
                  <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Interaction Type</label>
                        <div className="grid grid-cols-2 gap-4">
                           <button 
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, initialInteraction: 'Incoming'}))}
                              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.initialInteraction === 'Incoming' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-100 hover:border-gray-200 text-gray-600'}`}
                           >
                              <PhoneIncoming className="w-6 h-6" />
                              <span className="font-bold">Incoming Call</span>
                           </button>
                           <button 
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, initialInteraction: 'Outgoing'}))}
                              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.initialInteraction === 'Outgoing' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 hover:border-gray-200 text-gray-600'}`}
                           >
                              <PhoneOutgoing className="w-6 h-6" />
                              <span className="font-bold">Outgoing Call</span>
                           </button>
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Enquiry For</label>
                        <div className="grid grid-cols-2 gap-4">
                           <button 
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, type: 'Customer'}))}
                              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.type === 'Customer' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-200 text-gray-600'}`}
                           >
                              <User className="w-6 h-6" />
                              <span className="font-bold">Customer</span>
                           </button>
                           <button 
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, type: 'Vendor'}))}
                              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.type === 'Vendor' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 hover:border-gray-200 text-gray-600'}`}
                           >
                              <Car className="w-6 h-6" />
                              <span className="font-bold">Vendor</span>
                           </button>
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{formData.initialInteraction === 'Incoming' ? 'Incoming' : 'Outgoing'} Phone Number</label>
                        <div className="relative">
                           <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                           <input 
                              type="tel" 
                              required
                              autoFocus
                              placeholder="+91..."
                              value={formData.phone}
                              onChange={(e) => setFormData({...formData, phone: e.target.value})}
                              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg tracking-wide"
                           />
                        </div>
                     </div>

                     <button 
                        type="button"
                        onClick={handlePhoneCheck}
                        disabled={formData.phone.length < 5}
                        className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-md hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                     >
                        Continue &rarr;
                     </button>
                  </div>
               )}

               {/* Step 2: Details */}
               {formStep === 2 && (
                  <div className="space-y-4">
                     {formData.isExisting && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-center gap-3 text-green-800">
                           <CheckCircle className="w-5 h-5 shrink-0" />
                           <div className="text-sm">
                              <span className="font-bold block">Existing Vendor Found!</span>
                              Details auto-filled for {formData.name}
                           </div>
                        </div>
                     )}

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input 
                           required
                           readOnly={formData.isExisting}
                           type="text" 
                           value={formData.name}
                           onChange={(e) => setFormData({...formData, name: e.target.value})}
                           className={`w-full px-4 py-2 border border-gray-300 rounded-lg outline-none ${formData.isExisting ? 'bg-gray-50' : 'focus:ring-2 focus:ring-emerald-500'}`}
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City / Franchise <span className="text-xs text-gray-400 font-normal">(Routes to Corporate)</span></label>
                        {formData.isExisting ? (
                           <input 
                              readOnly
                              type="text" 
                              value={formData.city}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-gray-50"
                           />
                        ) : (
                           <select
                              required
                              value={formData.city}
                              onChange={(e) => setFormData({...formData, city: e.target.value})}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                           >
                              <option value="">Select City - Corporate</option>
                              {corporateAccounts.map((acc: any) => (
                                 <option key={acc.id} value={acc.city}>
                                    {acc.city} - {acc.companyName}
                                 </option>
                              ))}
                              <option value="Other">Other / Head Office</option>
                           </select>
                        )}
                     </div>

                     {!formData.isExisting && (
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                           <input 
                              type="email" 
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                           />
                        </div>
                     )}

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Enquiry Details / Requirements</label>
                        <textarea 
                           required
                           rows={3}
                           placeholder="What is the customer/vendor asking for?"
                           value={formData.details}
                           onChange={(e) => setFormData({...formData, details: e.target.value})}
                           className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        />
                     </div>

                     <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setFormStep(1)} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors">Back</button>
                        <button type="submit" className="flex-[2] bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-md hover:bg-emerald-600 transition-colors">
                           Create Enquiry
                        </button>
                     </div>
                  </div>
               )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnquiryPage;
