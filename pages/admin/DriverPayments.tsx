
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Plus, Search, Filter, Download, 
  Truck, DollarSign, Calendar, CheckCircle, 
  AlertCircle, X, Save, ChevronDown, PieChart, Info, Building2
} from 'lucide-react';
import { 
  PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend 
} from 'recharts';

// --- Types ---

interface PaymentRules {
  freeLimitKm: number;
  maxPayableKm: number;
  ratePerKm: number;
  maxPromoPay: number;
  maxStickerPay: number;
}

interface DriverPayment {
  id: string;
  driverName: string;
  phone: string;
  vehicleNo: string;
  orderId: string;
  branch: string;
  corporateId: string;
  type: 'Empty Km' | 'Promo Code' | 'Sticker';
  amount: number;
  status: 'Paid' | 'Pending' | 'Rejected';
  date: string;
  paymentMode: string;
  remarks: string;
  // Specific details based on type
  details: {
    distance?: number;
    paidKm?: number;
    promoName?: string;
    stickerDuration?: number;
  };
}

const DEFAULT_RULES: PaymentRules = {
  freeLimitKm: 5,
  maxPayableKm: 15,
  ratePerKm: 10,
  maxPromoPay: 100,
  maxStickerPay: 3000
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const DriverPayments: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- State ---
  const [activeView, setActiveView] = useState<'Dashboard' | 'Rules'>('Dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rules, setRules] = useState<PaymentRules>(DEFAULT_RULES);
  const [payments, setPayments] = useState<DriverPayment[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');

  // Modal Form State
  const [paymentType, setPaymentType] = useState<'Empty Km' | 'Promo Code' | 'Sticker'>('Empty Km');
  const [formData, setFormData] = useState({
    branch: '',
    driverName: '',
    phone: '',
    vehicleNo: '',
    orderId: '',
    // Empty Km
    pickupDistance: '',
    // Promo
    promoName: '',
    discountAmount: '',
    // Sticker
    stickerDuration: '',
    stickerAmount: '',
    // Common
    date: new Date().toISOString().split('T')[0],
    status: 'Paid',
    paymentMode: 'Cash',
    remarks: ''
  });

  // --- Load Data ---
  useEffect(() => {
    // Load Rules (Global or Scoped?) - For now global default is okay, but payments must be scoped
    const savedRules = localStorage.getItem('driver_payment_rules');
    if (savedRules) setRules(JSON.parse(savedRules));

    // Load Payments based on Role
    let loadedPayments: DriverPayment[] = [];
    if (isSuperAdmin) {
        // Admin: Load Global + All Corporate
        // Note: For simplicity in this demo, let's assume payments are stored in 'driver_payment_records' for Head Office 
        // and 'driver_payment_records_{id}' for others.
        try {
            const adminData = JSON.parse(localStorage.getItem('driver_payment_records') || '[]');
            loadedPayments = [...loadedPayments, ...adminData];
            
            const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corporates.forEach((c: any) => {
                const cData = JSON.parse(localStorage.getItem(`driver_payment_records_${c.email}`) || '[]');
                loadedPayments = [...loadedPayments, ...cData];
            });
        } catch (e) {}
    } else {
        // Franchise: Load ONLY scoped data
        try {
            const data = localStorage.getItem(`driver_payment_records_${sessionId}`);
            if (data) loadedPayments = JSON.parse(data);
        } catch (e) {}
    }

    setPayments(loadedPayments);
  }, [isSuperAdmin, sessionId]);

  // Save Handlers
  const saveRules = () => {
    localStorage.setItem('driver_payment_rules', JSON.stringify(rules));
    alert("Rules updated successfully!");
    setActiveView('Dashboard');
  };

  const handleSavePayment = () => {
    if (!formData.driverName || !formData.phone) {
        alert("Please enter driver details");
        return;
    }

    let finalAmount = 0;
    let details: any = {};

    if (paymentType === 'Empty Km') {
        const dist = parseFloat(formData.pickupDistance) || 0;
        const cappedDistance = Math.min(dist, rules.maxPayableKm);
        const paidKm = Math.max(0, cappedDistance - rules.freeLimitKm);
        finalAmount = paidKm * rules.ratePerKm;
        details = { distance: dist, paidKm };
    } else if (paymentType === 'Promo Code') {
        finalAmount = parseFloat(formData.discountAmount) || 0;
        details = { promoName: formData.promoName };
    } else {
        finalAmount = parseFloat(formData.stickerAmount) || 0;
        details = { stickerDuration: parseInt(formData.stickerDuration) };
    }

    const newPayment: DriverPayment = {
        id: `DP-${Date.now()}`,
        driverName: formData.driverName,
        phone: formData.phone,
        vehicleNo: formData.vehicleNo,
        orderId: formData.orderId || `ORD-${Math.floor(Math.random()*10000)}`,
        branch: formData.branch || 'Main Branch',
        corporateId: isSuperAdmin ? 'admin' : sessionId, // Assign current session owner
        type: paymentType,
        amount: finalAmount,
        status: formData.status as any,
        date: formData.date,
        paymentMode: formData.paymentMode,
        remarks: formData.remarks,
        details: details
    };

    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    
    // Persist to correct storage
    if (isSuperAdmin) {
        // If admin creates, assume Head Office record
        // Warning: This logic assumes admin only creates for themselves. 
        // Ideally admin selects which corporate to book for.
        // For simplicity, saving to 'driver_payment_records' (Head Office)
        const currentHO = JSON.parse(localStorage.getItem('driver_payment_records') || '[]');
        localStorage.setItem('driver_payment_records', JSON.stringify([newPayment, ...currentHO]));
    } else {
        const key = `driver_payment_records_${sessionId}`;
        const currentCorp = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify([newPayment, ...currentCorp]));
    }
    
    setIsModalOpen(false);
    // Reset form...
    setFormData({ ...formData, driverName: '', phone: '', vehicleNo: '', orderId: '', pickupDistance: '', discountAmount: '', stickerAmount: '' });
  };

  // --- Computed Values ---
  const calculatedPayable = useMemo(() => {
      if (paymentType === 'Empty Km') {
          const dist = parseFloat(formData.pickupDistance) || 0;
          const cappedDistance = Math.min(dist, rules.maxPayableKm);
          const paidKm = Math.max(0, cappedDistance - rules.freeLimitKm);
          return paidKm * rules.ratePerKm;
      }
      if (paymentType === 'Promo Code') return parseFloat(formData.discountAmount) || 0;
      if (paymentType === 'Sticker') return parseFloat(formData.stickerAmount) || 0;
      return 0;
  }, [paymentType, formData, rules]);

  const eligiblePaidKm = useMemo(() => {
      if (paymentType !== 'Empty Km') return 0;
      const dist = parseFloat(formData.pickupDistance) || 0;
      const cappedDistance = Math.min(dist, rules.maxPayableKm);
      return Math.max(0, cappedDistance - rules.freeLimitKm);
  }, [formData.pickupDistance, rules]);

  const stats = useMemo(() => {
      const totalPaid = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
      const pendingCount = payments.filter(p => p.status === 'Pending').length;
      const emptyKmPaid = payments.filter(p => p.type === 'Empty Km' && p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
      const promoStickerPaid = payments.filter(p => (p.type === 'Promo Code' || p.type === 'Sticker') && p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
      
      return { totalPaid, pendingCount, emptyKmPaid, promoStickerPaid };
  }, [payments]);

  const chartData = useMemo(() => {
      return [
          { name: 'Empty Km', value: stats.emptyKmPaid },
          { name: 'Promo Code', value: stats.promoStickerPaid } // Simplifying for chart
      ].filter(d => d.value > 0);
  }, [stats]);

  const filteredPayments = payments.filter(p => {
      const matchesSearch = p.driverName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.orderId.includes(searchTerm) || 
                            p.phone.includes(searchTerm);
      const matchesDate = !filterDate || p.date === filterDate;
      const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
      const matchesType = filterType === 'All' || p.type === filterType;
      
      // Strict Corporate Filter for Franchise users is already handled by initial load logic,
      // but double check here doesn't hurt.
      const matchesCorporate = isSuperAdmin ? true : p.corporateId === sessionId;

      return matchesSearch && matchesDate && matchesStatus && matchesType && matchesCorporate;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Truck className="w-8 h-8 text-emerald-600" /> Driver Payments
          </h2>
          <p className="text-gray-500">Manage empty kilometer compensations, promo code reimbursements, and sticker payments</p>
        </div>
        <div className="flex gap-2">
            {!isSuperAdmin && (
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" /> My Branch
                </button>
            )}
            <button 
                onClick={() => setActiveView('Rules')}
                className={`px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeView === 'Rules' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
                <Settings className="w-4 h-4" /> Payment Rules
            </button>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-2 transition-colors"
            >
                <Plus className="w-4 h-4" /> Log New Payment
            </button>
        </div>
      </div>

      {/* VIEW: RULES CONFIGURATION */}
      {activeView === 'Rules' && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4">
              {/* ... Rules Config UI ... */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500" /> Configure Rules</h3>
                  <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Editing: Global Defaults
                      </span>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="p-4 rounded-xl border-l-4 border-l-orange-500 bg-white border border-gray-200 shadow-sm">
                      <label className="text-xs font-bold text-gray-500 uppercase">Free Limit (KM)</label>
                      <input 
                          type="number" 
                          value={rules.freeLimitKm} 
                          onChange={(e) => setRules({...rules, freeLimitKm: parseFloat(e.target.value)})}
                          className="text-2xl font-bold text-gray-800 w-full mt-1 outline-none border-b border-transparent focus:border-orange-500 transition-colors bg-transparent"
                      />
                      <p className="text-[10px] text-gray-400 mt-2 leading-tight">Distance up to this limit is NOT paid.</p>
                  </div>
                  
                  <div className="p-4 rounded-xl border-l-4 border-l-blue-500 bg-white border border-gray-200 shadow-sm">
                      <label className="text-xs font-bold text-gray-500 uppercase">Max Payable Cap</label>
                      <div className="flex items-baseline gap-1 mt-1">
                        <input 
                            type="number" 
                            value={rules.maxPayableKm} 
                            onChange={(e) => setRules({...rules, maxPayableKm: parseFloat(e.target.value)})}
                            className="text-2xl font-bold text-gray-800 w-16 outline-none border-b border-transparent focus:border-blue-500 transition-colors bg-transparent"
                        />
                        <span className="text-gray-400 font-bold">KM</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 leading-tight">Max distance paid per trip.</p>
                  </div>

                  <div className="p-4 rounded-xl border-l-4 border-l-emerald-500 bg-white border border-gray-200 shadow-sm">
                      <label className="text-xs font-bold text-gray-500 uppercase">Rate Per KM</label>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-gray-400 font-bold text-lg">₹</span>
                        <input 
                            type="number" 
                            value={rules.ratePerKm} 
                            onChange={(e) => setRules({...rules, ratePerKm: parseFloat(e.target.value)})}
                            className="text-2xl font-bold text-gray-800 w-full outline-none border-b border-transparent focus:border-emerald-500 transition-colors bg-transparent"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 leading-tight">Amount paid for eligible km.</p>
                  </div>

                  <div className="p-4 rounded-xl border-l-4 border-l-purple-500 bg-white border border-gray-200 shadow-sm">
                      <label className="text-xs font-bold text-gray-500 uppercase">Max Promo Reimb.</label>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-gray-400 font-bold text-lg">₹</span>
                        <input 
                            type="number" 
                            value={rules.maxPromoPay} 
                            onChange={(e) => setRules({...rules, maxPromoPay: parseFloat(e.target.value)})}
                            className="text-2xl font-bold text-gray-800 w-full outline-none border-b border-transparent focus:border-purple-500 transition-colors bg-transparent"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 leading-tight">Max payout cap for promo codes.</p>
                  </div>

                  <div className="p-4 rounded-xl border-l-4 border-l-indigo-500 bg-white border border-gray-200 shadow-sm">
                      <label className="text-xs font-bold text-gray-500 uppercase">Max Sticker Pay</label>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-gray-400 font-bold text-lg">₹</span>
                        <input 
                            type="number" 
                            value={rules.maxStickerPay} 
                            onChange={(e) => setRules({...rules, maxStickerPay: parseFloat(e.target.value)})}
                            className="text-2xl font-bold text-gray-800 w-full outline-none border-b border-transparent focus:border-indigo-500 transition-colors bg-transparent"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 leading-tight">Max payout cap for Sticker payments.</p>
                  </div>
              </div>

              <div className="mt-6 flex justify-end">
                  <button onClick={saveRules} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors shadow-sm">
                      Save Rules
                  </button>
              </div>
          </div>
      )}

      {/* VIEW: DASHBOARD */}
      {activeView === 'Dashboard' && (
          <div className="space-y-6">
              {/* Stats & Charts */}
              {/* ... (Existing Stats UI) ... */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* ... Cards ... */}
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Total Paid</p>
                      <h3 className="text-3xl font-bold text-gray-900 mt-2">₹{stats.totalPaid.toLocaleString()}</h3>
                      <p className="text-xs text-gray-400 mt-1">Successfully disbursed</p>
                      <span className="inline-block mt-3 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">100%</span>
                  </div>
                  
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Pending Payments</p>
                      <h3 className="text-3xl font-bold text-red-600 mt-2">{stats.pendingCount}</h3>
                      <p className="text-xs text-gray-400 mt-1">Action required</p>
                      {stats.pendingCount > 0 && <span className="inline-block mt-3 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">Urgent</span>}
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                      <div>
                          <p className="text-xs font-bold text-gray-500 uppercase">Empty Km Paid</p>
                          <h3 className="text-2xl font-bold text-orange-500 mt-1">₹{stats.emptyKmPaid.toLocaleString()}</h3>
                          <p className="text-[10px] text-gray-400">Compensation for travel to pickup</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs font-bold text-gray-500 uppercase">Promo & Sticker Paid</p>
                          <h3 className="text-2xl font-bold text-purple-600 mt-1">₹{stats.promoStickerPaid.toLocaleString()}</h3>
                          <p className="text-[10px] text-gray-400">Discounts & Ad reimbursements</p>
                      </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><PieChart className="w-4 h-4"/> Payment Distribution</p>
                      <div className="flex-1 min-h-[120px]">
                          {chartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                  <RePieChart>
                                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                                          {chartData.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} />
                                          ))}
                                      </Pie>
                                      <Legend iconSize={8} layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize:'10px'}} />
                                      <ReTooltip formatter={(value:number) => `₹${value}`}/>
                                  </RePieChart>
                              </ResponsiveContainer>
                          ) : (
                              <div className="h-full flex items-center justify-center text-gray-400 text-xs">No Data</div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Toolbar */}
              <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-2 items-center justify-between">
                  <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                          placeholder="Search..." 
                          className="w-full pl-10 pr-4 py-2 border-none rounded-lg focus:ring-0 text-sm bg-transparent"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <div className="flex gap-2 items-center overflow-x-auto">
                      <select 
                          className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white outline-none cursor-pointer"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                      >
                          <option value="All">All Status</option>
                          <option>Paid</option>
                          <option>Pending</option>
                      </select>
                      <select 
                          className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white outline-none cursor-pointer"
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                      >
                          <option value="All">All Types</option>
                          <option>Empty Km</option>
                          <option>Promo Code</option>
                          <option>Sticker</option>
                      </select>
                      <input 
                          type="date" 
                          value={filterDate} 
                          onChange={(e) => setFilterDate(e.target.value)} 
                          className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white outline-none cursor-pointer" 
                      />
                      <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"><Download className="w-4 h-4 text-gray-500" /></button>
                  </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                              <tr>
                                  <th className="px-6 py-4">Date</th>
                                  <th className="px-6 py-4">Order ID</th>
                                  <th className="px-6 py-4">Driver Details</th>
                                  <th className="px-6 py-4">Corporate</th>
                                  <th className="px-6 py-4">Branch</th>
                                  <th className="px-6 py-4">Payment Type</th>
                                  <th className="px-6 py-4">Details</th>
                                  <th className="px-6 py-4 text-right">Amount</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {filteredPayments.map(p => (
                                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 text-gray-600">{p.date}</td>
                                      <td className="px-6 py-4 font-mono text-blue-600">{p.orderId}</td>
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-gray-900">{p.driverName}</div>
                                          <div className="text-xs text-gray-500">{p.vehicleNo}</div>
                                      </td>
                                      <td className="px-6 py-4">
                                          {p.corporateId === 'admin' ? 
                                            <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded flex items-center w-fit gap-1"><Building2 className="w-3 h-3"/> Head Office</span> :
                                            <span className="text-gray-600">{p.corporateId}</span>
                                          }
                                      </td>
                                      <td className="px-6 py-4 text-gray-600">{p.branch}</td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                              p.type === 'Empty Km' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                              p.type === 'Promo Code' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                              'bg-blue-50 text-blue-700 border-blue-200'
                                          }`}>
                                              {p.type}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-gray-500 text-xs">
                                          {p.type === 'Empty Km' ? `Paid: ${p.details.paidKm}km` : 
                                           p.type === 'Promo Code' ? p.details.promoName : 
                                           `${p.details.stickerDuration} months`}
                                      </td>
                                      <td className="px-6 py-4 text-right font-bold text-gray-900">₹{p.amount}</td>
                                  </tr>
                              ))}
                              {filteredPayments.length === 0 && (
                                  <tr>
                                      <td colSpan={8} className="py-12 text-center text-gray-400">No payment records found.</td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* Log Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800 text-lg">Log Driver Payment</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                 {/* Driver Details Section */}
                 <div>
                     <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Truck className="w-3 h-3"/> Driver Details</h4>
                     <div className="space-y-3">
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                             <select 
                                 className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                                 value={formData.branch}
                                 onChange={(e) => setFormData({...formData, branch: e.target.value})}
                             >
                                 <option value="">Select Branch</option>
                                 <option value="Main Branch">Main Branch</option>
                                 <option value="Ramanathapuram">Ramanathapuram</option>
                             </select>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                             <input 
                                 placeholder="Driver Name" 
                                 className="p-2 border border-gray-300 rounded-lg text-sm outline-none w-full"
                                 value={formData.driverName}
                                 onChange={(e) => setFormData({...formData, driverName: e.target.value})}
                             />
                             <input 
                                 placeholder="Phone Number" 
                                 className="p-2 border border-gray-300 rounded-lg text-sm outline-none w-full"
                                 value={formData.phone}
                                 onChange={(e) => setFormData({...formData, phone: e.target.value})}
                             />
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                             <input 
                                 placeholder="Vehicle No (Optional)" 
                                 className="p-2 border border-gray-300 rounded-lg text-sm outline-none w-full"
                                 value={formData.vehicleNo}
                                 onChange={(e) => setFormData({...formData, vehicleNo: e.target.value})}
                             />
                             <input 
                                 placeholder="Order ID (Auto if empty)" 
                                 className="p-2 border border-gray-300 rounded-lg text-sm outline-none w-full"
                                 value={formData.orderId}
                                 onChange={(e) => setFormData({...formData, orderId: e.target.value})}
                             />
                         </div>
                     </div>
                 </div>

                 {/* Payment Type Tabs */}
                 <div className="bg-gray-100 p-1 rounded-lg flex">
                     {['Empty Km', 'Promo Code', 'Sticker'].map((t) => (
                         <button 
                             key={t}
                             onClick={() => setPaymentType(t as any)}
                             className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${paymentType === t ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                         >
                             {t}
                         </button>
                     ))}
                 </div>

                 {/* Dynamic Content based on Type */}
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                     {paymentType === 'Empty Km' && (
                         <div className="space-y-3">
                             <label className="text-xs font-bold text-gray-500 uppercase">Pickup Distance (KM)</label>
                             <input 
                                type="number"
                                placeholder="e.g. 8"
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none"
                                value={formData.pickupDistance}
                                onChange={(e) => setFormData({...formData, pickupDistance: e.target.value})}
                             />
                             <div className="bg-blue-50 border border-blue-100 p-2 rounded text-[10px] text-blue-700 flex items-start gap-1.5">
                                 <Info className="w-3 h-3 shrink-0 mt-0.5" />
                                 <span>Applied Rules: First <strong>{rules.freeLimitKm}km</strong> free. Paid up to <strong>{rules.maxPayableKm}km</strong>. Rate: <strong>₹{rules.ratePerKm}/km</strong>.</span>
                             </div>
                             <div className="flex justify-between items-center text-xs font-medium text-gray-600 pt-1">
                                 <span>Eligible Paid Km:</span>
                                 <span className="font-bold text-emerald-600">{eligiblePaidKm} km</span>
                             </div>
                         </div>
                     )}

                     {paymentType === 'Promo Code' && (
                         <div className="space-y-3">
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Promo Code Name</label>
                                 <input 
                                    placeholder="e.g. DIWALI10"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none"
                                    value={formData.promoName}
                                    onChange={(e) => setFormData({...formData, promoName: e.target.value})}
                                 />
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Discount Amount (To be reimbursed)</label>
                                 <input 
                                    type="number"
                                    placeholder="₹"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none"
                                    value={formData.discountAmount}
                                    onChange={(e) => setFormData({...formData, discountAmount: e.target.value})}
                                 />
                             </div>
                         </div>
                     )}

                     {paymentType === 'Sticker' && (
                         <div className="space-y-3">
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Sticker Duration (Months)</label>
                                 <input 
                                    type="number"
                                    placeholder="e.g. 1"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none"
                                    value={formData.stickerDuration}
                                    onChange={(e) => setFormData({...formData, stickerDuration: e.target.value})}
                                 />
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Payment Amount</label>
                                 <input 
                                    type="number"
                                    placeholder="₹"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none"
                                    value={formData.stickerAmount}
                                    onChange={(e) => setFormData({...formData, stickerAmount: e.target.value})}
                                 />
                             </div>
                         </div>
                     )}

                     <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                         <span className="font-bold text-gray-700">Calculated Payable:</span>
                         <span className="text-xl font-bold text-emerald-600">₹{calculatedPayable}</span>
                     </div>
                 </div>

                 {/* Common Fields */}
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                         <input 
                             type="date" 
                             className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none"
                             value={formData.date}
                             onChange={(e) => setFormData({...formData, date: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                         <select 
                             className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                             value={formData.status}
                             onChange={(e) => setFormData({...formData, status: e.target.value})}
                         >
                             <option>Paid</option>
                             <option>Pending</option>
                         </select>
                     </div>
                 </div>

                 <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Mode</label>
                     <div className="relative">
                         <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                         <select 
                             className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none appearance-none"
                             value={formData.paymentMode}
                             onChange={(e) => setFormData({...formData, paymentMode: e.target.value})}
                         >
                             <option>Cash</option>
                             <option>Bank Transfer</option>
                             <option>UPI</option>
                         </select>
                         <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                     </div>
                 </div>

                 <div>
                     <input 
                         placeholder="Remarks (Optional)..." 
                         className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none"
                         value={formData.remarks}
                         onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                     />
                 </div>
              </div>

              <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-2xl">
                  <button 
                      onClick={handleSavePayment}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors"
                  >
                      Save Payment
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DriverPayments;
