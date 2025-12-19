
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PhoneIncoming, PhoneOutgoing, ArrowRight, Search, Clock, User, Car, 
  Edit2, X, Save, UserPlus, History, Filter, Download, Truck, Calculator, 
  MessageCircle, Mail, Copy, MapPin, Calendar as CalendarIcon, RefreshCcw, 
  Sparkles, Wand2, Loader2, Building2, CheckCircle, ChevronDown, ChevronUp,
  Plus, MoreHorizontal, FileText, Phone
} from 'lucide-react';
import { MOCK_EMPLOYEES } from '../../constants';
import { Employee, Enquiry, HistoryLog } from '../../types';
import { generateGeminiResponse } from '../../services/geminiService';

interface HistoryItem {
  id: number;
  time: string;
  type: string;
  details: string;
  status: string;
  name?: string; 
  city?: string; 
  assignedTo?: string; 
  date?: string; 
  phone?: string;
  loggedBy?: string; 
}

const RENTAL_PACKAGES = [
  { id: '1hr', name: '1 Hr / 10 km', hours: 1, km: 10, price: 200 },
  { id: '2hr', name: '2 Hr / 20 km', hours: 2, km: 20, price: 400 },
  { id: '4hr', name: '4 Hr / 40 km', hours: 4, km: 40, price: 800 },
  { id: '8hr', name: '8 Hr / 80 km', hours: 8, km: 80, price: 1600 },
];

const getExistingVendors = () => {
  const globalData = localStorage.getItem('vendor_data');
  return globalData ? JSON.parse(globalData) : [];
};

const CallEnquiries: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const [allEmployees, setAllEmployees] = useState<Employee[]>(() => {
    if (isSuperAdmin) {
       let all: Employee[] = [];
       const saved = localStorage.getItem('staff_data');
       if (saved) all = [...all, ...JSON.parse(saved)];
       else all = [...all, ...MOCK_EMPLOYEES];

       try {
         const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
         corps.forEach((c: any) => {
            const s = localStorage.getItem(`staff_data_${c.email}`);
            if (s) all = [...all, ...JSON.parse(s)];
         });
       } catch (e) {}
       return all;
    } else {
       const key = `staff_data_${sessionId}`;
       const saved = localStorage.getItem(key);
       return saved ? JSON.parse(saved) : [];
    }
  });

  const [corporates] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
    } catch (e) { return []; }
  });

  const STORAGE_KEY = 'global_enquiries_data';
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [vendors] = useState<any[]>(getExistingVendors());

  const [recentTransfers, setRecentTransfers] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('call_enquiries_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse call enquiries history", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('call_enquiries_history', JSON.stringify(recentTransfers));
  }, [recentTransfers]);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'Incoming' | 'Outgoing'>('All');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  const [logForm, setLogForm] = useState({
    phoneNumber: '',
    name: '',
    city: '',
    note: '',
    type: 'Incoming', 
    callerType: 'Customer', 
    status: 'Message Taken',
    assignedTo: ''
  });
  
  const [isChecked, setIsChecked] = useState(false);
  const [lookupResult, setLookupResult] = useState<'New' | 'Existing' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    city: '',
    details: '',
    status: '',
    assignedTo: ''
  });
  
  const [editEnquiryType, setEditEnquiryType] = useState<'General' | 'Transport'>('General');
  const [editTransportService, setEditTransportService] = useState<'Taxi' | 'Load Xpress'>('Taxi');
  const [editTaxiType, setEditTaxiType] = useState<'Local' | 'Rental' | 'Outstation'>('Local');
  const [editOutstationType, setEditOutstationType] = useState<'OneWay' | 'RoundTrip'>('RoundTrip');
  const [editVehicleType, setEditVehicleType] = useState<'Sedan' | 'SUV'>('Sedan');
  const [calcDetails, setCalcDetails] = useState({
     pickup: '', drop: '', estKm: '', waitingMins: '', packageId: '1hr',
     destination: '', days: '1', estTotalKm: '', loadPickup: '', loadDrop: '', loadWeight: ''
  });
  const [generatedEstimateMsg, setGeneratedEstimateMsg] = useState('');
  const [estimateTotal, setEstimateTotal] = useState(0);

  const handleOpenLogModal = () => {
    setLogForm({
        phoneNumber: '', name: '', city: '', note: '', 
        type: 'Incoming', callerType: 'Customer', status: 'Message Taken', assignedTo: ''
    });
    setIsChecked(false);
    setLookupResult(null);
    setIsLogModalOpen(true);
  };

  const handlePhoneCheck = () => {
    if (logForm.phoneNumber.length < 5) return;
    
    const cleanNumber = logForm.phoneNumber.replace(/\D/g, '');
    let found = false;

    const vendor = vendors.find((v: any) => v.phone && v.phone.replace(/\D/g, '').includes(cleanNumber));
    if (vendor) {
        setLogForm(prev => ({ ...prev, name: vendor.ownerName, city: vendor.city, callerType: 'Vendor' }));
        setLookupResult('Existing');
        found = true;
    }

    if (!found) {
        const prevEnquiry = enquiries.find(e => e.phone && e.phone.replace(/\D/g, '').includes(cleanNumber));
        if (prevEnquiry) {
            setLogForm(prev => ({ 
                ...prev, 
                name: prevEnquiry.name, 
                city: prevEnquiry.city, 
                callerType: prevEnquiry.type as any 
            }));
            setLookupResult('Existing');
            found = true;
        }
    }

    if (!found) setLookupResult('New');
    setIsChecked(true);
  };

  const handleSubmitLog = () => {
    if (!logForm.name || !logForm.city) {
        alert("Please enter Name and City");
        return;
    }
    setIsSubmitting(true);

    const newItem: HistoryItem = {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().split('T')[0],
        type: `${logForm.type} ${logForm.callerType} Call`,
        details: logForm.note || 'No notes',
        status: logForm.status,
        name: logForm.name,
        city: logForm.city,
        assignedTo: logForm.assignedTo,
        phone: logForm.phoneNumber,
        loggedBy: sessionId
    };

    setRecentTransfers(prev => [newItem, ...prev]);

    setTimeout(() => {
        setIsSubmitting(false);
        setIsLogModalOpen(false);
    }, 500);
  };

  const stats = useMemo(() => {
    const total = recentTransfers.length;
    const pending = recentTransfers.filter(i => i.status === 'Pending' || i.status === 'Message Taken').length;
    const transferred = recentTransfers.filter(i => i.status === 'Transferred').length;
    const closed = recentTransfers.filter(i => i.status === 'Closed').length;
    return { total, pending, transferred, closed };
  }, [recentTransfers]);

  const filteredList = recentTransfers.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.phone?.includes(searchQuery) || 
                          item.city?.toLowerCase().includes(searchQuery);
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesDate = !dateFilter || item.date === dateFilter;
    const matchesTab = activeTab === 'All' || item.type.includes(activeTab);
    
    return matchesSearch && matchesStatus && matchesDate && matchesTab;
  });

  const handleSaveEdit = () => {
      if(!editingItem) return;
      const updated = recentTransfers.map(i => i.id === editingItem.id ? { ...i, ...editFormData } : i);
      setRecentTransfers(updated);
      setEditingItem(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Call Enquiries</h2>
          <p className="text-gray-500">Track and manage all inbound and outbound communications.</p>
        </div>
        <button 
          onClick={handleOpenLogModal}
          className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
        >
          <PhoneIncoming className="w-5 h-5" /> Log New Call
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-xs font-bold text-gray-500 uppercase">Total Calls</p>
               <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg text-gray-600"><History className="w-5 h-5"/></div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-xs font-bold text-gray-500 uppercase">Action Needed</p>
               <h3 className="text-2xl font-bold text-orange-600">{stats.pending}</h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-orange-600"><Clock className="w-5 h-5"/></div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-xs font-bold text-gray-500 uppercase">Transferred</p>
               <h3 className="text-2xl font-bold text-blue-600">{stats.transferred}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><ArrowRight className="w-5 h-5"/></div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-xs font-bold text-gray-500 uppercase">Closed</p>
               <h3 className="text-2xl font-bold text-emerald-600">{stats.closed}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle className="w-5 h-5"/></div>
         </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
         <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-4 justify-between items-center bg-gray-50/50">
            <div className="flex gap-2 p-1 bg-gray-200/50 rounded-lg">
               {['All', 'Incoming', 'Outgoing'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === tab ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                     {tab}
                  </button>
               ))}
            </div>

            <div className="flex gap-3 w-full lg:w-auto">
               <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                     type="text" 
                     placeholder="Search calls..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
               </div>
               <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
               >
                  <option value="All">All Status</option>
                  <option>Message Taken</option>
                  <option>Transferred</option>
                  <option>Pending</option>
                  <option>Closed</option>
               </select>
               <input 
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-500"
               />
            </div>
         </div>

         <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                     <th className="px-6 py-4">Date & Time</th>
                     <th className="px-6 py-4">Caller Details</th>
                     <th className="px-6 py-4">Type</th>
                     <th className="px-6 py-4 w-1/3">Notes</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {filteredList.map((item) => (
                     <tr key={item.id} className="hover:bg-violet-50/30 transition-colors group">
                        <td className="px-6 py-4">
                           <div className="font-medium text-gray-900">{item.time}</div>
                           <div className="text-xs text-gray-500">{item.date}</div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${item.name?.[0].toUpperCase() < 'M' ? 'bg-blue-400' : 'bg-orange-400'}`}>
                                 {item.name?.[0]}
                              </div>
                              <div>
                                 <div className="font-bold text-gray-800">{item.name}</div>
                                 <div className="text-xs text-gray-500">{item.phone} • {item.city}</div>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-xs font-medium border ${item.type.includes('Incoming') ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-pink-50 text-pink-700 border-pink-100'}`}>
                              {item.type}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <p className="truncate max-w-xs text-gray-600" title={item.details}>{item.details}</p>
                           {item.assignedTo && <p className="text-xs text-violet-600 mt-1 flex items-center gap-1"><User className="w-3 h-3" /> {item.assignedTo}</p>}
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              item.status === 'Closed' ? 'bg-gray-100 text-gray-600' :
                              item.status === 'Transferred' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                           }`}>
                              {item.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button 
                              onClick={() => { setEditingItem(item); setEditFormData({ name: item.name || '', city: item.city || '', details: item.details, status: item.status, assignedTo: item.assignedTo || '' }); }}
                              className="text-gray-400 hover:text-violet-600 p-2 hover:bg-violet-50 rounded-full transition-colors"
                           >
                              <Edit2 className="w-4 h-4" />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default CallEnquiries;
