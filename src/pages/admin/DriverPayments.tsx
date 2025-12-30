import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, Plus, Search, Filter, RefreshCcw, CheckCircle, Clock, X, 
  DollarSign, FileText, Calendar, Building2, ChevronDown, Edit2, Trash2,
  Save, AlertCircle
} from 'lucide-react';
import { UserRole } from '../../types';

interface PaymentRecord {
  id: string;
  driverName: string;
  phone: string;
  amount: number;
  type: 'Salary' | 'Incentive' | 'Bonus' | 'Reimbursement';
  status: 'Paid' | 'Pending';
  date: string;
  notes?: string;
  corporateId?: string;
  branch?: string;
}

export const DriverPayments: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Form State
  const initialForm = {
    driverName: '',
    phone: '',
    amount: '',
    type: 'Salary',
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  };
  const [compForm, setCompForm] = useState(initialForm);

  // Load Data
  useEffect(() => {
    const loadData = () => {
      let data: PaymentRecord[] = [];
      const key = isSuperAdmin ? 'driver_payment_records' : `driver_payment_records_${sessionId}`;
      
      // If super admin, try to aggregate (simplified for now, just load root or specific)
      // In a real scenario similar to other pages, we might aggregate. 
      // For simplicity and fixing the error, let's load from a key.
      if (isSuperAdmin) {
         // Load aggregated logic if needed, or just root. Let's stick to root for simplicity or mimic other pages if desired.
         // Let's assume standard behavior:
         const saved = localStorage.getItem('driver_payment_records');
         if (saved) data = JSON.parse(saved);
      } else {
         const saved = localStorage.getItem(key);
         if (saved) data = JSON.parse(saved);
      }
      setPayments(data);
    };
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [isSuperAdmin, sessionId]);

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
      corporateId: isSuperAdmin ? 'admin' : sessionId
    };

    let updatedList;
    if (editingId) {
      updatedList = payments.map(p => p.id === editingId ? newRecord : p);
    } else {
      updatedList = [newRecord, ...payments];
    }

    const key = isSuperAdmin ? 'driver_payment_records' : `driver_payment_records_${sessionId}`;
    localStorage.setItem(key, JSON.stringify(updatedList));
    setPayments(updatedList);
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
      notes: record.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this record?")) {
      const updated = payments.filter(p => p.id !== id);
      const key = isSuperAdmin ? 'driver_payment_records' : `driver_payment_records_${sessionId}`;
      localStorage.setItem(key, JSON.stringify(updated));
      setPayments(updated);
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.driverName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Truck className="w-8 h-8 text-indigo-600" /> Driver Payments
          </h2>
          <p className="text-gray-500">Manage driver payouts, incentives, and salary records</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setCompForm(initialForm); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" /> New Payment
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search driver..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-indigo-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Driver Details</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.map(record => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-600">{record.date}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{record.driverName}</div>
                    <div className="text-xs text-gray-500">{record.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600 border border-gray-200">{record.type}</span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-gray-800">₹{record.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(record)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(record.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Edit Payment' : 'New Payment'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Truck className="w-3 h-3"/> Driver Details</label>
                     <div className="grid grid-cols-2 gap-3">
                         <input 
                            type="text"
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Driver Name"
                            value={compForm.driverName}
                            onChange={(e) => setCompForm({...compForm, driverName: e.target.value})}
                            required
                         />
                         <input 
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                            placeholder="Phone Number" 
                            value={compForm.phone} 
                            onChange={(e) => setCompForm({...compForm, phone: e.target.value})} 
                         />
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Payment Type</label>
                      <select 
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        value={compForm.type}
                        onChange={(e) => setCompForm({...compForm, type: e.target.value})}
                      >
                        <option>Salary</option>
                        <option>Incentive</option>
                        <option>Bonus</option>
                        <option>Reimbursement</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date</label>
                      <input 
                        type="date"
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={compForm.date}
                        onChange={(e) => setCompForm({...compForm, date: e.target.value})}
                      />
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Amount (₹)</label>
                    <input 
                        type="number"
                        className="w-full p-3 border border-gray-300 rounded-lg text-lg font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                        value={compForm.amount}
                        onChange={(e) => setCompForm({...compForm, amount: e.target.value})}
                        required
                    />
                 </div>

                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Status</label>
                    <select 
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                      value={compForm.status}
                      onChange={(e) => setCompForm({...compForm, status: e.target.value})}
                    >
                      <option>Pending</option>
                      <option>Paid</option>
                    </select>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Notes</label>
                    <textarea 
                        rows={2}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="Additional details..."
                        value={compForm.notes}
                        onChange={(e) => setCompForm({...compForm, notes: e.target.value})}
                    />
                 </div>

                 <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md transition-colors mt-2">
                    {editingId ? 'Update Record' : 'Create Record'}
                 </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};