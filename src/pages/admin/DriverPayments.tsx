
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, Plus, Search, Filter, RefreshCcw, CheckCircle, Clock, X, 
  DollarSign, FileText, Calendar, Building2, ChevronDown, Edit2, Trash2,
  Save, AlertCircle, Wallet, ArrowRightLeft, User, Download, SlidersHorizontal
} from 'lucide-react';
import { UserRole, CorporateAccount } from '../../types';

interface PaymentRecord {
  id: string;
  driverName: string;
  phone: string;
  amount: number;
  type: 'Salary' | 'Incentive' | 'Bonus' | 'Reimbursement' | 'Empty Km' | 'Promo Code' | 'Sticker';
  status: 'Paid' | 'Pending' | 'Rejected';
  date: string;
  notes?: string;
  corporateId?: string;
  branch?: string;
  orderId?: string; // Added Order ID
}

interface WalletTransaction {
  id: string;
  driverId: string;
  driverName: string;
  type: 'Credit' | 'Debit';
  amount: number;
  date: string;
  status: 'Completed' | 'Pending';
}

export const DriverPayments: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- State ---
  const [activeTab, setActiveTab] = useState<'Compensations' | 'Wallet'>('Compensations');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // --- Filters State ---
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterComponent, setFilterComponent] = useState('All');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterDateType, setFilterDateType] = useState<'Month' | 'Date'>('Month');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterOrderId, setFilterOrderId] = useState('');

  // Form State
  const initialForm = {
    driverName: '',
    phone: '',
    amount: '',
    type: 'Empty Km',
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    orderId: ''
  };
  const [compForm, setCompForm] = useState(initialForm);

  // --- Load Data ---
  useEffect(() => {
    const loadData = () => {
      // 1. Load Corporates for Filter
      const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      setCorporates(corps);

      // 2. Load Payments
      let data: PaymentRecord[] = [];
      
      if (isSuperAdmin) {
         // Aggregated View for Super Admin
         const rootData = JSON.parse(localStorage.getItem('driver_payment_records') || '[]');
         data = [...rootData];
         corps.forEach((c: any) => {
            const cData = JSON.parse(localStorage.getItem(`driver_payment_records_${c.email}`) || '[]');
            data = [...data, ...cData];
         });
      } else {
         // Franchise View
         const key = `driver_payment_records_${sessionId}`;
         data = JSON.parse(localStorage.getItem(key) || '[]');
      }
      // Sort by date desc
      setPayments(data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [isSuperAdmin, sessionId]);

  // --- Handlers ---
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compForm.driverName || !compForm.amount) return;

    const newRecord: PaymentRecord = {
      id: editingId || `PAY-${Date.now()}`,
      driverName: compForm.driverName,
      phone: compForm.phone,
      amount: parseFloat(compForm.amount),
      type: compForm.type as any,
      status: compForm.status as any,
      date: compForm.date,
      notes: compForm.notes,
      orderId: compForm.orderId || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      corporateId: isSuperAdmin ? 'admin' : sessionId
    };

    const targetKey = isSuperAdmin ? 'driver_payment_records' : `driver_payment_records_${sessionId}`;
    const currentList = JSON.parse(localStorage.getItem(targetKey) || '[]');
    let updatedList;
    
    if (editingId) {
      updatedList = currentList.map((p: PaymentRecord) => p.id === editingId ? newRecord : p);
    } else {
      updatedList = [newRecord, ...currentList];
    }

    localStorage.setItem(targetKey, JSON.stringify(updatedList));
    
    // Trigger reload
    window.dispatchEvent(new Event('storage'));
    
    setIsModalOpen(false);
    setCompForm(initialForm);
    setEditingId(null);
  };

  const handleEdit = (record: PaymentRecord) => {
    setEditingId(record.id);
    setCompForm({
      driverName: record.driverName,
      phone: record.phone,
      amount: record.amount.toString(),
      type: record.type,
      status: record.status,
      date: record.date,
      notes: record.notes || '',
      orderId: record.orderId || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, record: PaymentRecord) => {
    if (window.confirm("Delete this record?")) {
      const targetOwner = record.corporateId || (isSuperAdmin ? 'admin' : sessionId);
      const key = targetOwner === 'admin' ? 'driver_payment_records' : `driver_payment_records_${targetOwner}`;
      
      const currentList = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = currentList.filter((p: PaymentRecord) => p.id !== id);
      
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    }
  };

  const resetFilters = () => {
    setFilterCorporate('All');
    setFilterComponent('All');
    setFilterDriver('');
    setFilterPhone('');
    setFilterStatus('All');
    setFilterOrderId('');
    setFilterDateType('Month');
    setFilterMonth(new Date().toISOString().slice(0, 7));
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // 1. Corporate Filter
      if (isSuperAdmin && filterCorporate !== 'All') {
          if (p.corporateId !== filterCorporate) return false;
      }
      // 2. Component/Type Filter
      if (filterComponent !== 'All' && p.type !== filterComponent) return false;
      // 3. Driver Name
      if (filterDriver && !p.driverName.toLowerCase().includes(filterDriver.toLowerCase())) return false;
      // 4. Phone
      if (filterPhone && !p.phone.includes(filterPhone)) return false;
      // 5. Order ID
      if (filterOrderId && !p.orderId?.toLowerCase().includes(filterOrderId.toLowerCase())) return false;
      // 6. Status
      if (filterStatus !== 'All' && p.status !== filterStatus) return false;
      // 7. Date/Month
      if (filterDateType === 'Date') {
          if (p.date !== filterDate) return false;
      } else {
          if (!p.date.startsWith(filterMonth)) return false;
      }
      
      return true;
    });
  }, [payments, filterCorporate, filterComponent, filterDriver, filterPhone, filterOrderId, filterStatus, filterDateType, filterDate, filterMonth, isSuperAdmin]);

  const stats = useMemo(() => {
      const total = filteredPayments.reduce((acc, curr) => acc + (curr.status === 'Paid' ? curr.amount : 0), 0);
      const pending = filteredPayments.filter(p => p.status === 'Pending').length;
      return { total, pending };
  }, [filteredPayments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Truck className="w-8 h-8 text-emerald-600" /> Driver Payments & Wallet
          </h2>
          <p className="text-gray-500">Manage compensations and driver wallet balance</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('Compensations')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'Compensations' ? 'bg-white shadow text-emerald-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
                <FileText className="w-4 h-4" /> Compensations
            </button>
            <button 
                onClick={() => setActiveTab('Wallet')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'Wallet' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
                <Wallet className="w-4 h-4" /> Driver Wallet
            </button>
        </div>
      </div>

      {activeTab === 'Compensations' && (
        <>
            {/* Filter Panel */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <Filter className="w-4 h-4 text-emerald-600" /> Filter Options
                    </h3>
                    <button onClick={resetFilters} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors">
                        <RefreshCcw className="w-3 h-3" /> Reset Filters
                    </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Filter: Corporate */}
                    {isSuperAdmin && (
                        <div className="relative group">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select 
                                value={filterCorporate} 
                                onChange={(e) => setFilterCorporate(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                            >
                                <option value="All">All Corporates</option>
                                <option value="admin">Head Office</option>
                                {corporates.map(c => (
                                    <option key={c.id} value={c.email}>{c.companyName}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    )}

                    {/* Filter: Payment Component */}
                    <div className="relative group">
                        <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select 
                            value={filterComponent} 
                            onChange={(e) => setFilterComponent(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                        >
                            <option value="All">All Components</option>
                            <option value="Empty Km">Empty Km</option>
                            <option value="Promo Code">Promo Code</option>
                            <option value="Sticker">Sticker</option>
                            <option value="Salary">Salary</option>
                            <option value="Incentive">Incentive</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Filter: Date */}
                    <div className="flex gap-2">
                        <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
                            <button onClick={() => setFilterDateType('Month')} className={`p-1.5 rounded-md ${filterDateType === 'Month' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}><Calendar className="w-4 h-4"/></button>
                            <button onClick={() => setFilterDateType('Date')} className={`p-1.5 rounded-md ${filterDateType === 'Date' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><Clock className="w-4 h-4"/></button>
                        </div>
                        {filterDateType === 'Month' ? (
                            <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        ) : (
                            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        )}
                    </div>

                    {/* Filter: Status */}
                    <div className="relative group">
                        <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                        >
                            <option value="All">All Status</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Filter: Driver Name */}
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            placeholder="Driver Name" 
                            value={filterDriver} 
                            onChange={(e) => setFilterDriver(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Filter: Phone */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            placeholder="Phone Number" 
                            value={filterPhone} 
                            onChange={(e) => setFilterPhone(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Filter: Order ID */}
                    <div className="relative col-span-2 sm:col-span-1 md:col-span-2">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">#</span>
                            <input 
                                placeholder="Order ID / Transaction Ref" 
                                value={filterOrderId} 
                                onChange={(e) => setFilterOrderId(e.target.value)}
                                className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* List Header & Add Button */}
            <div className="flex justify-between items-end">
                <div className="flex gap-4">
                    <div className="bg-white px-4 py-2 rounded-xl border border-emerald-100 shadow-sm">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Total Paid</p>
                        <p className="text-xl font-bold text-emerald-600">₹{stats.total.toLocaleString()}</p>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl border border-orange-100 shadow-sm">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Pending</p>
                        <p className="text-xl font-bold text-orange-600">{stats.pending}</p>
                    </div>
                </div>
                <button 
                    onClick={() => { setEditingId(null); setCompForm(initialForm); setIsModalOpen(true); }}
                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/10"
                >
                    <Plus className="w-5 h-5" /> Log Payment
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                    <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Order ID</th>
                        <th className="px-6 py-4">Driver</th>
                        <th className="px-6 py-4">Component</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {filteredPayments.map(record => (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-600">{record.date}</td>
                        <td className="px-6 py-4 font-mono text-xs text-blue-600">{record.orderId || '-'}</td>
                        <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{record.driverName}</div>
                            <div className="text-[10px] text-gray-500 font-mono">{record.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-600 border border-gray-200 uppercase tracking-wide">{record.type}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-gray-800 text-right">₹{record.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                record.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                                record.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                            }`}>
                            {record.status}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                            <button onClick={() => handleEdit(record)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors bg-gray-50 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(record.id, record)} className="p-2 text-gray-400 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </td>
                        </tr>
                    ))}
                    {filteredPayments.length === 0 && (
                        <tr><td colSpan={7} className="py-12 text-center text-gray-400 italic">No payments found matching your filters.</td></tr>
                    )}
                    </tbody>
                </table>
                </div>
            </div>
        </>
      )}

      {activeTab === 'Wallet' && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
              <div className="p-6 bg-blue-50 rounded-full mb-4">
                  <Wallet className="w-12 h-12 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Driver Wallet Module</h3>
              <p className="text-gray-500 mt-2 max-w-md text-center">
                  Wallet transactions, top-ups, and balance history will appear here. This section is currently under development for the enhanced version.
              </p>
          </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Edit Payment' : 'New Payment'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">Driver Details</label>
                     <div className="grid grid-cols-2 gap-3">
                         <input 
                            type="text"
                            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"
                            placeholder="Driver Name"
                            value={compForm.driverName}
                            onChange={(e) => setCompForm({...compForm, driverName: e.target.value})}
                            required
                         />
                         <input 
                            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all" 
                            placeholder="Phone Number" 
                            value={compForm.phone} 
                            onChange={(e) => setCompForm({...compForm, phone: e.target.value})} 
                         />
                     </div>
                 </div>

                 <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-500 uppercase">Transaction Info</label>
                     <input 
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                        placeholder="Order ID (Optional)" 
                        value={compForm.orderId} 
                        onChange={(e) => setCompForm({...compForm, orderId: e.target.value})} 
                     />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Component</label>
                      <select 
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        value={compForm.type}
                        onChange={(e) => setCompForm({...compForm, type: e.target.value})}
                      >
                        <option>Empty Km</option>
                        <option>Promo Code</option>
                        <option>Sticker</option>
                        <option>Salary</option>
                        <option>Incentive</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date</label>
                      <input 
                        type="date"
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={compForm.date}
                        onChange={(e) => setCompForm({...compForm, date: e.target.value})}
                      />
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Amount (₹)</label>
                    <input 
                        type="number"
                        className="w-full p-4 border border-gray-200 rounded-xl text-xl font-black text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                        placeholder="0.00"
                        value={compForm.amount}
                        onChange={(e) => setCompForm({...compForm, amount: e.target.value})}
                        required
                    />
                 </div>

                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Status</label>
                    <select 
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                      value={compForm.status}
                      onChange={(e) => setCompForm({...compForm, status: e.target.value})}
                    >
                      <option>Pending</option>
                      <option>Paid</option>
                      <option>Rejected</option>
                    </select>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Notes</label>
                    <textarea 
                        rows={2}
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="Additional details..."
                        value={compForm.notes}
                        onChange={(e) => setCompForm({...compForm, notes: e.target.value})}
                    />
                 </div>

                 <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" /> {editingId ? 'Update Record' : 'Create Record'}
                 </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
