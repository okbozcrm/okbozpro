
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Zap, User, Phone, Store, Home, 
  Clock, Percent, Tag, ShieldCheck, ChevronRight,
  Receipt, Info, Layers, CheckCircle2, X, Calendar,
  MessageSquare, Mail, History, ExternalLink, Search, Settings, Filter, Pencil
} from 'lucide-react';
import { CorporateAccount, Branch } from '../types';

interface ServiceItem {
  id: string;
  name: string;
  pricePerQty: number;
  quantity: number;
}

interface BookingHistory {
  id: string;
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  totalPrice: number;
  items: string[];
  fullItems?: ServiceItem[];
  status: 'Now' | 'Schedule';
  date: string;
  timestamp: number;
  taxAmount: number;
  adminCommissionAmount: number;
  adminCommissionPercent?: number;
  serviceCategory?: string;
  visitationCharge?: number;
  technicianTip?: number;
  taxPercent?: number;
}

interface OnDemandServiceState {
  franchise: string; // Corporate Email
  branch: string; // Branch ID
  serviceCategory: string;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  serviceType: 'Doorstep' | 'Visit Store';
  bookingMode: 'Now' | 'Schedule';
  scheduledDate: string;
  scheduledTime: string;
  bookedAt: string;
  adminCommission: number;
  visitationCharge: number;
  technicianTip: number;
  taxPercent: number;
  vendorDiscount: number;
  promoDiscount: number;
  promoCode: string;
  items: ServiceItem[];
}

const SERVICE_CATEGORIES = [
  "Salon and Make-up artist",
  "Physiotherapist",
  "Veterinary doctor",
  "Acting drivers",
  "Pest control and Cleaning service",
  "Home appliance",
  "Home nurse",
  "Bike repair and technician",
  "Gym",
  "Interior decorator"
];

const OnDemandService: React.FC = () => {
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [history, setHistory] = useState<BookingHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const [state, setState] = useState<OnDemandServiceState>({
    franchise: 'HO',
    branch: '',
    serviceCategory: SERVICE_CATEGORIES[0],
    customerName: '',
    customerContact: '',
    customerEmail: '',
    serviceType: 'Doorstep',
    bookingMode: 'Now',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '10:00',
    bookedAt: new Date().toLocaleString('en-US', { 
      weekday: 'short', month: 'short', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    }),
    adminCommission: 10,
    visitationCharge: 150,
    technicianTip: 0,
    taxPercent: 5,
    vendorDiscount: 0,
    promoDiscount: 0,
    promoCode: '',
    items: [
      { id: '1', name: 'Fruit facial', pricePerQty: 800, quantity: 1 }
    ]
  });

  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterDate, setFilterDate] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  // Load Settings and History
  useEffect(() => {
    const savedSettings = localStorage.getItem('on_demand_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setState(prev => ({ 
        ...prev, 
        adminCommission: settings.adminCommission || 10,
        taxPercent: settings.taxPercent || 5,
        serviceCategory: settings.serviceCategory || SERVICE_CATEGORIES[0]
      }));
    }

    const savedHistory = localStorage.getItem('on_demand_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedCorps = localStorage.getItem('corporate_accounts');
    if (savedCorps) setCorporates(JSON.parse(savedCorps));
  }, []);

  const saveSettings = (commission: number, tax: number, category: string) => {
    localStorage.setItem('on_demand_settings', JSON.stringify({ 
      adminCommission: commission, 
      taxPercent: tax,
      serviceCategory: category
    }));
    setState(prev => ({ ...prev, adminCommission: commission, taxPercent: tax, serviceCategory: category }));
    setShowSettings(false);
  };

  const filteredHistory = history.filter(b => {
    const bDate = new Date(b.timestamp).toISOString();
    const monthMatch = bDate.startsWith(filterMonth);
    const dateMatch = filterDate ? bDate.startsWith(filterDate) : true;
    return monthMatch && dateMatch;
  });

  // Load Branches when Franchise changes
  useEffect(() => {
    if (state.franchise === 'HO') {
      const savedBranches = localStorage.getItem('branches_data'); // Root branches
      setBranches(savedBranches ? JSON.parse(savedBranches) : []);
    } else {
      const savedBranches = localStorage.getItem(`branches_data_${state.franchise}`);
      setBranches(savedBranches ? JSON.parse(savedBranches) : []);
    }
  }, [state.franchise]);

  const addItem = () => {
    const newItem: ServiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      pricePerQty: 0,
      quantity: 1
    };
    setState(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (id: string) => {
    setState(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  const updateItem = (id: string, field: keyof ServiceItem, value: string | number) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const totalItemPrice = state.items.reduce((sum, item) => sum + (item.pricePerQty * item.quantity), 0);
  const totalTax = (totalItemPrice * state.taxPercent) / 100;
  const totalPrice = totalItemPrice + state.visitationCharge + state.technicianTip + totalTax - state.vendorDiscount - state.promoDiscount;

  const deleteHistory = (id: string) => {
    if (window.confirm("Are you sure you want to delete this booking record?")) {
      const updatedHistory = history.filter(b => b.id !== id);
      setHistory(updatedHistory);
      localStorage.setItem('on_demand_history', JSON.stringify(updatedHistory));
    }
  };

  const editHistory = (booking: BookingHistory) => {
    if (window.confirm("Restore this booking to the editor? Current editor data will be overwritten.")) {
      setState(prev => ({
        ...prev,
        customerName: booking.customerName,
        customerContact: booking.customerContact,
        customerEmail: booking.customerEmail || '',
        bookingMode: booking.status,
        serviceCategory: booking.serviceCategory ?? prev.serviceCategory,
        visitationCharge: booking.visitationCharge ?? prev.visitationCharge,
        technicianTip: booking.technicianTip ?? prev.technicianTip,
        adminCommission: booking.adminCommissionPercent ?? prev.adminCommission,
        items: booking.fullItems && booking.fullItems.length > 0 ? booking.fullItems : prev.items
      }));
      setShowHistory(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const generateSummary = () => {
    const itemsText = state.items.map(i => `${i.name} (x${i.quantity}) - ₹${i.pricePerQty * i.quantity}`).join('\n');
    return `*ON DEMAND SERVICE SUMMARY*\n\n` +
           `📂 *Category:* ${state.serviceCategory}\n` +
           `👤 *Customer:* ${state.customerName}\n` +
           `📞 *Contact:* ${state.customerContact}\n` +
           `📍 *Type:* ${state.serviceType}\n` +
           `📅 *Mode:* ${state.bookingMode === 'Schedule' ? `Scheduled for ${state.scheduledDate} at ${state.scheduledTime}` : 'Immediate'}\n\n` +
           `🛠 *Services:*\n${itemsText}\n\n` +
           `-------------------\n` +
           `📦 *Sub Total*\n₹${totalItemPrice.toFixed(2)}\n\n` +
           `🚚 *Visitation Fee*\n₹${state.visitationCharge.toFixed(2)}\n\n` +
           `🎁 *Technician Tip*\n₹${state.technicianTip.toFixed(2)}\n\n` +
           `🧾 *Taxes (CGST/SGST ${state.taxPercent}%)*\n₹${totalTax.toFixed(2)}\n\n` +
           (state.vendorDiscount > 0 ? `🧧 *Vendor Discount*\n-₹${state.vendorDiscount.toFixed(2)}\n\n` : '') +
           (state.promoDiscount > 0 ? `🎫 *Promo Discount*\n-₹${state.promoDiscount.toFixed(2)}\n\n` : '') +
           `-------------------\n` +
           `💰 *Grand Total*\n₹${totalPrice.toFixed(2)}`;
  };

  const handleBookService = () => {
    if (!state.customerName || !state.customerContact) {
      alert("Please enter customer name and contact");
      return;
    }

    const newBooking: BookingHistory = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      customerName: state.customerName,
      customerContact: state.customerContact,
      customerEmail: state.customerEmail,
      totalPrice: totalPrice,
      items: state.items.map(i => i.name),
      fullItems: [...state.items],
      status: state.bookingMode,
      date: state.bookingMode === 'Schedule' ? `${state.scheduledDate} ${state.scheduledTime}` : new Date().toLocaleString(),
      timestamp: Date.now(),
      taxAmount: totalTax,
      adminCommissionAmount: (totalItemPrice * state.adminCommission) / 100,
      adminCommissionPercent: state.adminCommission,
      serviceCategory: state.serviceCategory,
      visitationCharge: state.visitationCharge,
      technicianTip: state.technicianTip,
      taxPercent: state.taxPercent
    };

    const updatedHistory = [newBooking, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('on_demand_history', JSON.stringify(updatedHistory));

    const summary = generateSummary();
    const waUrl = `https://wa.me/${state.customerContact.replace(/\D/g, '')}?text=${encodeURIComponent(summary)}`;
    const emailUrl = `mailto:${state.customerEmail}?subject=Service Booking Summary&body=${encodeURIComponent(summary)}`;

    // Open WhatsApp
    window.open(waUrl, '_blank');
    
    // Simulate Email or check if user has email
    if (state.customerEmail) {
        window.open(emailUrl, '_blank');
    }

    alert(`Service ${state.bookingMode === 'Schedule' ? 'Scheduled' : 'Booked'} Successfully!`);
  };

  const applyPromo = () => {
    if (state.promoCode.toUpperCase() === 'SAVE10') {
      const discount = (totalItemPrice * 0.1);
      setState(prev => ({ ...prev, promoDiscount: discount }));
      setAppliedPromo('SAVE10');
      setShowPromoInput(false);
    } else if (state.promoCode.toUpperCase() === 'FIRST50') {
      setState(prev => ({ ...prev, promoDiscount: 50 }));
      setAppliedPromo('FIRST50');
      setShowPromoInput(false);
    } else {
      alert('Invalid Promo Code. Try "SAVE10" or "FIRST50"');
    }
  };

  const removePromo = () => {
    setState(prev => ({ ...prev, promoDiscount: 0, promoCode: '' }));
    setAppliedPromo(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Zap className="text-white w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">On demand SERVICE</h1>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-2 rounded-xl transition-all ${showHistory ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <History className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                <Clock className="w-3 h-3" />
                <span>{state.bookedAt}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign to Franchise/HO</label>
              <select 
                className="bg-slate-50 border-0 text-sm font-bold text-slate-700 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                value={state.franchise}
                onChange={(e) => setState(prev => ({ ...prev, franchise: e.target.value, branch: '' }))}
              >
                <option value="HO">HEAD OFFICE (HO)</option>
                {corporates.map(corp => (
                  <option key={corp.id} value={corp.email}>{corp.companyName}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operating Branch</label>
              <select 
                className="bg-slate-50 border-0 text-sm font-bold text-slate-700 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                value={state.branch}
                onChange={(e) => setState(prev => ({ ...prev, branch: e.target.value }))}
              >
                <option value="">Select Branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {showSettings && (
          <div className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-100/20 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6 text-indigo-600" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Global Service Settings</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Admin Commission (%)</label>
                <input 
                  type="number"
                  className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={state.adminCommission}
                  onChange={(e) => setState(prev => ({ ...prev, adminCommission: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Tax (%)</label>
                <input 
                  type="number"
                  className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={state.taxPercent}
                  onChange={(e) => setState(prev => ({ ...prev, taxPercent: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Service Category</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                  value={state.serviceCategory}
                  onChange={(e) => setState(prev => ({ ...prev, serviceCategory: e.target.value }))}
                >
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => saveSettings(state.adminCommission, state.taxPercent, state.serviceCategory)}
                className="px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
              >
                Save Global Defaults
              </button>
            </div>
          </div>
        )}

        {/* KPI Dashboard - Filters Added */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filters:</span>
            </div>
            <div className="flex gap-2">
                <input 
                type="month" 
                className="bg-slate-50 border-0 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-emerald-500"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                />
                <input 
                type="date" 
                className="bg-slate-50 border-0 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-emerald-500"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                />
                {(filterMonth || filterDate) && (
                <button 
                    onClick={() => { setFilterMonth(''); setFilterDate(''); }}
                    className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline px-2"
                >
                    Clear
                </button>
                )}
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="bg-emerald-500 p-4 rounded-3xl shadow-lg shadow-emerald-200 text-white group hover:-translate-y-1 transition-all">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Receipt className="w-4 h-4 text-white" />
            </div>
            <div className="text-[9px] font-black text-emerald-100 uppercase tracking-widest leading-tight">Total revenue</div>
            <div className="text-lg font-black mt-1 italic">
                <span className="text-xs font-bold align-top mr-0.5 text-emerald-200">₹</span>
                {filteredHistory.reduce((sum, b) => sum + b.totalPrice, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            </div>

            <div className="bg-indigo-600 p-4 rounded-3xl shadow-lg shadow-indigo-200 text-white group hover:-translate-y-1 transition-all">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Settings className="w-4 h-4 text-white" />
            </div>
            <div className="text-[9px] font-black text-indigo-100 uppercase tracking-widest leading-tight">Admin Comm.</div>
            <div className="text-lg font-black mt-1 italic">
                <span className="text-xs font-bold align-top mr-0.5 text-indigo-200">₹</span>
                {filteredHistory.reduce((sum, b) => sum + (b.adminCommissionAmount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            </div>

            <div className="bg-rose-500 p-4 rounded-3xl shadow-lg shadow-rose-200 text-white group hover:-translate-y-1 transition-all">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Tag className="w-4 h-4 text-white" />
            </div>
            <div className="text-[9px] font-black text-rose-100 uppercase tracking-widest leading-tight">Total Tax</div>
            <div className="text-lg font-black mt-1 italic">
                <span className="text-xs font-bold align-top mr-0.5 text-rose-200">₹</span>
                {filteredHistory.reduce((sum, b) => sum + (b.taxAmount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            </div>

            <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-200 text-white group hover:-translate-y-1 transition-all">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Layers className="w-4 h-4 text-white" />
            </div>
            <div className="text-[9px] font-black text-blue-100 uppercase tracking-widest leading-tight">Total Bookings</div>
            <div className="text-lg font-black mt-1 italic">{filteredHistory.length}</div>
            </div>

            <div className="bg-purple-600 p-4 rounded-3xl shadow-lg shadow-purple-200 text-white group hover:-translate-y-1 transition-all">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Calendar className="w-4 h-4 text-white" />
            </div>
            <div className="text-[9px] font-black text-purple-100 uppercase tracking-widest leading-tight">Scheduled</div>
            <div className="text-lg font-black mt-1 italic">{filteredHistory.filter(b => b.status === 'Schedule').length}</div>
            </div>

            <div className="bg-orange-500 p-4 rounded-3xl shadow-lg shadow-orange-200 text-white group hover:-translate-y-1 transition-all">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="text-[9px] font-black text-orange-100 uppercase tracking-widest leading-tight">Immediate</div>
            <div className="text-lg font-black mt-1 italic">{filteredHistory.filter(b => b.status === 'Now').length}</div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Booking Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {showHistory ? (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Recent Bookings</h2>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type="text" placeholder="Search customer..." className="pl-9 pr-4 py-2 bg-slate-50 text-xs font-bold rounded-xl border-0 focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>

                <div className="space-y-3">
                  {history.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                      <History className="w-12 h-12 mb-2 opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest transition-all">No history found</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all group">
                         <div className="flex gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === 'Schedule' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                              {item.status === 'Schedule' ? <Calendar className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                            </div>
                            <div>
                               <h4 className="text-sm font-black text-slate-800">{item.customerName}</h4>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.date}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="text-sm font-black text-slate-900 italic">₹{(item.totalPrice || 0).toFixed(2)}</div>
                            <button className="text-emerald-500 hover:text-emerald-600 p-1 opacity-0 group-hover:opacity-100 transition-all">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Customer Details */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-6">
                    <User className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Customer Information</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="text"
                          placeholder="Jane Doe"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          value={state.customerName}
                          onChange={(e) => setState(prev => ({ ...prev, customerName: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Contact *</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="tel"
                          placeholder="+91 XXXXX XXXXX"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          value={state.customerContact}
                          onChange={(e) => setState(prev => ({ ...prev, customerContact: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="email"
                          placeholder="jane@example.com"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          value={state.customerEmail}
                          onChange={(e) => setState(prev => ({ ...prev, customerEmail: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Category</label>
                      <div className="relative">
                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <select 
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                          value={state.serviceCategory}
                          onChange={(e) => setState(prev => ({ ...prev, serviceCategory: e.target.value }))}
                        >
                          {SERVICE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Commission (%)</label>
                      <div className="relative">
                        <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="number"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          value={state.adminCommission}
                          onChange={(e) => setState(prev => ({ ...prev, adminCommission: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Type</label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setState(prev => ({ ...prev, serviceType: 'Doorstep' }))}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${state.serviceType === 'Doorstep' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                          <Home className="w-4 h-4" /> Doorstep
                        </button>
                        <button 
                          type="button"
                          onClick={() => setState(prev => ({ ...prev, serviceType: 'Visit Store' }))}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${state.serviceType === 'Visit Store' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                          <Store className="w-4 h-4" /> Visit Store
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Booking Mode</label>
                      <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                        <button 
                          type="button"
                          onClick={() => setState(prev => ({ ...prev, bookingMode: 'Now' }))}
                          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${state.bookingMode === 'Now' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                        >
                          Now
                        </button>
                        <button 
                          type="button"
                          onClick={() => setState(prev => ({ ...prev, bookingMode: 'Schedule' }))}
                          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${state.bookingMode === 'Schedule' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                        >
                          Schedule
                        </button>
                      </div>
                    </div>
                    {state.bookingMode === 'Schedule' && (
                       <div className="flex-[2] flex gap-2 animate-in slide-in-from-right-4 duration-300">
                          <div className="flex-[2] space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Date</label>
                            <input 
                              type="date"
                              className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                              value={state.scheduledDate}
                              onChange={(e) => setState(prev => ({ ...prev, scheduledDate: e.target.value }))}
                            />
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time</label>
                            <input 
                              type="time"
                              className="w-full px-4 py-3 bg-slate-50 border-0 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                              value={state.scheduledTime}
                              onChange={(e) => setState(prev => ({ ...prev, scheduledTime: e.target.value }))}
                            />
                          </div>
                       </div>
                    )}
                  </div>
                </div>

                {/* Services Table */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Services & Packages</h2>
                </div>
                <button 
                  onClick={addItem}
                  className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100"
                >
                  <Plus className="w-3 h-3" /> Add Service
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub Service Name</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Price / Qty</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Quantity</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-right">Price</th>
                      <th className="pb-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {state.items.map((item) => (
                      <tr key={item.id} className="group">
                        <td className="py-4">
                          <input 
                            type="text"
                            placeholder="Service Name"
                            className="bg-transparent border-0 font-bold text-slate-700 w-full focus:ring-0 px-0 translate-y-0 shadow-none outline-none"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input 
                            type="number"
                            className="bg-slate-50 border-0 rounded-lg text-sm font-bold text-slate-700 w-24 py-1 px-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                            value={item.pricePerQty}
                            onChange={(e) => updateItem(item.id, 'pricePerQty', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input 
                            type="number"
                            className="bg-slate-50 border-0 rounded-lg text-sm font-bold text-slate-700 w-16 py-1 px-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-4 px-4 text-right font-black text-slate-900">
                          ₹{(item.pricePerQty * item.quantity).toFixed(2)}
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed History Table - Added below Services */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-900" />
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Detailed History Log</h2>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                   <Clock className="w-3 h-3" /> Real-time Updates
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Date</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Customer</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-center">Commission</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-center">Status</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-right">Revenue</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No previous bookings recorded</p>
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((booking) => (
                        <tr key={booking.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">#{booking.id}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{booking.date}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{booking.customerName}</span>
                              {booking.serviceCategory && (
                                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-0.5">{booking.serviceCategory}</span>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {booking.items.slice(0, 2).map((item, idx) => (
                                  <span key={idx} className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                    {item}
                                  </span>
                                ))}
                                {booking.items.length > 2 && <span className="text-[8px] font-bold text-slate-400">+{booking.items.length - 2} more</span>}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="text-[11px] font-black text-indigo-600">
                               ₹{(booking.adminCommissionAmount || 0).toFixed(0)}
                            </div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase">{booking.adminCommissionPercent || 0}%</div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                              booking.status === 'Now' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {booking.status === 'Now' ? <Zap className="w-3 h-3 fill-emerald-600" /> : <Calendar className="w-3 h-3" />}
                              {booking.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="text-sm font-black text-slate-900 flex items-center justify-end gap-1">
                              <span className="text-[10px] font-bold">₹</span>
                              {(booking.totalPrice || 0).toFixed(2)}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-2">
                               <button 
                                 onClick={() => editHistory(booking)}
                                 className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                 title="Edit / Restore"
                               >
                                 <Pencil className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => deleteHistory(booking.id)}
                                 className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                 title="Delete"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}
      </div>

          {/* Price Summary Panel - Light Theme */}
          <div className="space-y-6 lg:pt-16">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-slate-900">
                <Receipt className="w-32 h-32 rotate-12" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Order Summary</h2>
                </div>

                <div className="space-y-5">
                  <div className="flex justify-between items-center group cursor-help">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                      Sub Total
                      <Info className="w-3 h-3 text-slate-300" />
                    </span>
                    <span className="font-bold text-slate-700">₹{totalItemPrice.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Visitation Fee</span>
                    <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-100">
                       <span className="text-[10px] text-slate-400 font-bold mr-1">₹</span>
                       <input 
                         type="number"
                         className="w-16 bg-transparent border-0 text-slate-700 text-sm font-bold focus:ring-0 outline-none"
                         value={state.visitationCharge}
                         onChange={(e) => setState(prev => ({ ...prev, visitationCharge: parseFloat(e.target.value) || 0 }))}
                       />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Technician Tip</span>
                    <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-100">
                       <span className="text-[10px] text-slate-400 font-bold mr-1">₹</span>
                       <input 
                         type="number"
                         className="w-16 bg-transparent border-0 text-slate-700 text-sm font-bold focus:ring-0 outline-none"
                         value={state.technicianTip}
                         onChange={(e) => setState(prev => ({ ...prev, technicianTip: parseFloat(e.target.value) || 0 }))}
                       />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Taxes</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">CGST/SGST ({state.taxPercent}%)</span>
                    </div>
                    <span className="font-bold text-slate-500">₹{totalTax.toFixed(2)}</span>
                  </div>

                  <div className="h-px bg-slate-50 my-2"></div>

                  <div className="flex justify-between items-center">
                    <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Vendor Discount</span>
                    <div className="flex items-center bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl px-3 py-1.5">
                       <span className="text-[10px] font-bold mr-1">-₹</span>
                       <input 
                         type="number"
                         className="w-16 bg-transparent border-0 text-emerald-600 text-sm font-bold focus:ring-0 outline-none"
                         value={state.vendorDiscount}
                         onChange={(e) => setState(prev => ({ ...prev, vendorDiscount: parseFloat(e.target.value) || 0 }))}
                       />
                    </div>
                  </div>

                  {appliedPromo && (
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Tag className="w-3 h-3" /> {appliedPromo}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600">-₹{state.promoDiscount.toFixed(2)}</span>
                        <button onClick={removePromo} className="text-slate-300 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-10 pt-6 border-t border-slate-50">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Total Price</span>
                    <div className="flex items-end justify-between mt-1">
                      <span className="text-5xl font-black tracking-tighter text-slate-900 italic relative">
                        <span className="text-xl font-bold align-top mt-1 inline-block">₹</span>
                        {totalPrice.toFixed(0)}
                      </span>
                      <span className="text-slate-400 text-sm font-bold mb-1">.{totalPrice.toFixed(2).split('.')[1]}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mt-6">
                    <button 
                      onClick={handleBookService}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3"
                    >
                      {state.bookingMode === 'Now' ? <Zap className="w-5 h-5 fill-white" /> : <Calendar className="w-5 h-5" />}
                      {state.bookingMode === 'Now' ? 'Book Service Now' : 'Schedule Service'}
                    </button>
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          const summary = generateSummary();
                          window.open(`https://wa.me/${state.customerContact.replace(/\D/g, '')}?text=${encodeURIComponent(summary)}`, '_blank');
                        }}
                        className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-green-500/10 transition-all active:scale-[0.95]"
                      >
                        <MessageSquare className="w-4 h-4 fill-white" /> WhatsApp
                      </button>
                      
                      <button 
                        onClick={() => {
                          const summary = generateSummary();
                          window.open(`mailto:${state.customerEmail}?subject=Service Booking Summary&body=${encodeURIComponent(summary)}`, '_blank');
                        }}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/10 transition-all active:scale-[0.95]"
                      >
                        <Mail className="w-4 h-4" /> Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* working Promo Code Input */}
            {!appliedPromo && (
               <div className="bg-white p-6 rounded-3xl border border-gray-100 transition-all">
                {!showPromoInput ? (
                  <div 
                    onClick={() => setShowPromoInput(true)}
                    className="flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Tag className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Apply Promo Code</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Save more on this order</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Enter Promo Code</h3>
                       <button onClick={() => setShowPromoInput(false)} className="text-slate-400 hover:text-slate-600">
                         <X className="w-4 h-4" />
                       </button>
                    </div>
                    <div className="flex gap-2">
                       <input 
                         type="text"
                         className="flex-1 bg-slate-50 border-0 rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                         placeholder="SAVE10..."
                         value={state.promoCode}
                         onChange={(e) => setState(prev => ({ ...prev, promoCode: e.target.value }))}
                       />
                       <button 
                         onClick={applyPromo}
                         className="bg-blue-500 text-white px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all font-black"
                       >
                         Apply
                       </button>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Try codes: <span className="text-blue-500 font-black">SAVE10</span> or <span className="text-blue-500 font-black">FIRST50</span></p>
                  </div>
                )}
              </div>
            )}

            {appliedPromo && (
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest">Promo Applied!</h3>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">You saved ₹{state.promoDiscount.toFixed(0)} with {appliedPromo}</p>
                </div>
              </div>
            )}

            {/* Message Preview Section */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Message Preview</h3>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generateSummary());
                    alert("Message copied to clipboard!");
                  }}
                  className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors bg-emerald-50 px-3 py-1.5 rounded-lg"
                >
                  Copy Message
                </button>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <pre className="text-[11px] font-medium text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                  {generateSummary()}
                </pre>
              </div>
              
              <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <Info className="w-3 h-3" />
                <span>This message will be sent to {state.customerName || 'Customer'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 border-2 border-dashed border-slate-200 rounded-3xl opacity-50">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secure Admin Terminal v4.2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnDemandService;

