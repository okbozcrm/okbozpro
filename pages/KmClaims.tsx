
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bike, Plus, Search, Filter, Download, CheckCircle, 
  XCircle, Clock, MapPin, Calculator, FileText, 
  Trash2, Check, X, Building2, User, Calendar, 
  TrendingUp, Wallet, AlertCircle, Loader2, Gauge,
  DollarSign, Send
} from 'lucide-react';
import { UserRole, TravelAllowanceRequest, Employee, CorporateAccount } from '../types';
import { sendSystemNotification } from '../services/cloudService';

interface KmClaimsProps {
  role: UserRole;
}

const KmClaims: React.FC<KmClaimsProps> = ({ role }) => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = role === UserRole.ADMIN;
  const isEmployee = role === UserRole.EMPLOYEE;

  // --- State ---
  const [requests, setRequests] = useState<TravelAllowanceRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [corpFilter, setCorpFilter] = useState('All');

  // Form State (Employee)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startOdometer: '',
    endOdometer: '',
    ratePerKm: '10',
    remarks: ''
  });

  // Reference Data
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [staff, setStaff] = useState<Employee[]>([]);

  // --- Load Data ---
  const loadData = () => {
    const key = 'global_travel_requests';
    const saved = localStorage.getItem(key);
    let allRequests: TravelAllowanceRequest[] = saved ? JSON.parse(saved) : [];

    // Data Scoping
    if (isEmployee) {
      allRequests = allRequests.filter(r => r.employeeId === sessionId);
    } else if (role === UserRole.CORPORATE) {
      allRequests = allRequests.filter(r => r.corporateId === sessionId);
    }

    setRequests(allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setCorporates(JSON.parse(localStorage.getItem('corporate_accounts') || '[]'));
    
    let allStaff: Employee[] = [];
    const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
    allStaff = [...adminStaff];
    const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
    corps.forEach((c: any) => {
      const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
      allStaff = [...allStaff, ...cStaff];
    });
    setStaff(allStaff);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [role, sessionId]);

  // --- Computed Stats ---
  const stats = useMemo(() => {
    const active = requests.filter(r => r.status !== 'Rejected');
    const totalKm = active.reduce((sum, r) => sum + r.totalKm, 0);
    const totalAmount = active.reduce((sum, r) => sum + r.totalAmount, 0);
    const pendingCount = requests.filter(r => r.status === 'Pending').length;
    const paidAmount = requests.filter(r => r.status === 'Paid').reduce((sum, r) => sum + r.totalAmount, 0);

    return { totalKm, totalAmount, pendingCount, paidAmount };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesSearch = r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.remarks.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchesDate = !dateFilter || r.date === dateFilter;
      const matchesCorp = !isSuperAdmin || corpFilter === 'All' || r.corporateId === corpFilter;

      return matchesSearch && matchesStatus && matchesDate && matchesCorp;
    });
  }, [requests, searchTerm, statusFilter, dateFilter, corpFilter, isSuperAdmin]);

  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseFloat(formData.startOdometer);
    const end = parseFloat(formData.endOdometer);
    const rate = parseFloat(formData.ratePerKm);

    if (end <= start) {
      alert("End odometer must be greater than start odometer.");
      return;
    }

    const totalKm = end - start;
    const totalAmount = totalKm * rate;

    const me = staff.find(s => s.id === sessionId);
    const myCorpId = (me as any)?.corporateId || (me as any)?.owner || 'admin';

    const newRequest: TravelAllowanceRequest = {
      id: `TA-${Date.now()}`,
      employeeId: sessionId,
      employeeName: me?.name || 'Unknown Employee',
      corporateId: myCorpId,
      date: formData.date,
      startOdometer: start,
      endOdometer: end,
      totalKm: totalKm,
      ratePerKm: rate,
      totalAmount: totalAmount,
      status: 'Pending',
      remarks: formData.remarks,
      createdAt: new Date().toISOString()
    };

    const key = 'global_travel_requests';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = [newRequest, ...existing];
    localStorage.setItem(key, JSON.stringify(updated));

    // Force Sync & Dispatch Events
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('cloud-sync-immediate'));

    sendSystemNotification({
      type: 'advance_request',
      title: 'New KM Claim Submitted',
      message: `${newRequest.employeeName} submitted a TA claim for ${totalKm} KM (₹${totalAmount.toFixed(2)})`,
      targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
      corporateId: myCorpId === 'admin' ? undefined : myCorpId,
      link: '/admin/km-claims'
    });

    setRequests(updated);
    setIsModalOpen(false);
    setFormData({ ...formData, startOdometer: '', endOdometer: '', remarks: '' });
    alert("Claim submitted successfully!");
  };

  const handleStatusUpdate = (id: string, newStatus: TravelAllowanceRequest['status']) => {
    if (window.confirm(`Mark this claim as ${newStatus}?`)) {
      const key = 'global_travel_requests';
      const all = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = all.map((r: TravelAllowanceRequest) => r.id === id ? { ...r, status: newStatus } : r);
      localStorage.setItem(key, JSON.stringify(updated));
      
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('cloud-sync-immediate'));

      const request = updated.find((r: any) => r.id === id);
      if (request) {
          sendSystemNotification({
              type: 'system',
              title: `TA Claim ${newStatus}`,
              message: `Your KM Claim for ${request.date} was ${newStatus.toLowerCase()}.`,
              targetRoles: [UserRole.EMPLOYEE],
              employeeId: request.employeeId,
              link: '/user/km-claims'
          });
      }
      loadData();
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this request?")) {
        const key = 'global_travel_requests';
        const all = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = all.filter((r: any) => r.id !== id);
        localStorage.setItem(key, JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('cloud-sync-immediate'));
        loadData();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bike className="w-8 h-8 text-emerald-600" /> KM Claims (TA)
          </h2>
          <p className="text-gray-500">
            {isEmployee ? "Track your travel allowance and submit new claims" : "Manage and approve staff travel allowance requests"}
          </p>
        </div>
        {isEmployee && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all transform active:scale-95"
          >
            <Plus className="w-5 h-5" /> New Claim
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total KM</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalKm.toFixed(1)} km</h3></div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Payable</p><h3 className="text-2xl font-bold text-emerald-600 mt-1">₹{stats.totalAmount.toLocaleString()}</h3></div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending</p><h3 className="text-2xl font-bold text-orange-600 mt-1">{stats.pendingCount}</h3></div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Clock className="w-5 h-5" /></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Paid</p><h3 className="text-2xl font-bold text-indigo-600 mt-1">₹{stats.paidAmount.toLocaleString()}</h3></div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><CheckCircle className="w-5 h-5" /></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
              {isSuperAdmin && (
                <select value={corpFilter} onChange={(e) => setCorpFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none">
                    <option value="All">All Corporates</option>
                    <option value="admin">Head Office</option>
                    {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                </select>
              )}
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none">
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid</option>
                <option value="Rejected">Rejected</option>
              </select>
          </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase tracking-widest text-[10px]">
                      <tr>
                          <th className="px-6 py-4">Date</th>
                          {!isEmployee && <th className="px-6 py-4">Employee</th>}
                          <th className="px-6 py-4">Odometer</th>
                          <th className="px-6 py-4">Distance</th>
                          <th className="px-6 py-4">Rate</th>
                          <th className="px-6 py-4">Payable</th>
                          <th className="px-6 py-4">Remarks</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900">{req.date}</td>
                              {!isEmployee && (
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase">{req.employeeName.charAt(0)}</div>
                                        <div><div className="font-bold text-gray-800">{req.employeeName}</div></div>
                                    </div>
                                </td>
                              )}
                              <td className="px-6 py-4 text-gray-600 font-mono text-xs">{req.startOdometer} → {req.endOdometer}</td>
                              <td className="px-6 py-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{req.totalKm} km</span></td>
                              <td className="px-6 py-4 text-gray-500 text-xs">₹{req.ratePerKm}/km</td>
                              <td className="px-6 py-4 font-bold text-gray-900 text-lg">₹{req.totalAmount.toFixed(2)}</td>
                              <td className="px-6 py-4 text-gray-500 text-xs italic max-w-xs truncate">{req.remarks || '-'}</td>
                              <td className="px-6 py-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                      req.status === 'Paid' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                      req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                      req.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                                  }`}>{req.status}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  {!isEmployee ? (
                                      <div className="flex justify-end gap-2">
                                          {req.status === 'Pending' && (
                                              <>
                                                  <button onClick={() => handleStatusUpdate(req.id, 'Approved')} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-700 flex items-center gap-1"><Check className="w-3 h-3" /> Approve</button>
                                                  <button onClick={() => handleStatusUpdate(req.id, 'Rejected')} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-100 border border-red-100 flex items-center gap-1"><X className="w-3 h-3" /> Reject</button>
                                              </>
                                          )}
                                          {req.status === 'Approved' && (
                                              <button onClick={() => handleStatusUpdate(req.id, 'Paid')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-indigo-700 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Mark Paid</button>
                                          )}
                                          <button onClick={() => handleDelete(req.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                      </div>
                                  ) : (
                                      <button disabled={req.status !== 'Pending'} onClick={() => handleDelete(req.id)} className={`p-2 transition-colors ${req.status === 'Pending' ? 'text-gray-400 hover:text-red-600' : 'text-gray-200 cursor-not-allowed'}`}><Trash2 className="w-4 h-4" /></button>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                      <h3 className="text-xl font-black text-gray-900 tracking-tighter flex items-center gap-2"><Calculator className="w-5 h-5 text-emerald-600" /> New KM Claim</h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-400 hover:text-gray-900"><X className="w-5 h-5"/></button>
                  </div>
                  <form onSubmit={handleSubmitClaim} className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Journey Date</label>
                            <input type="date" name="date" required value={formData.date} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rate (₹/km)</label>
                            <input type="number" name="ratePerKm" required value={formData.ratePerKm} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      </div>
                      <div className="space-y-4 bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100/50">
                          <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Start Odometer</label>
                              <input type="number" name="startOdometer" required placeholder="0.0" value={formData.startOdometer} onChange={handleInputChange} className="w-full pl-4 pr-4 py-3 bg-white border border-emerald-100 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500" />
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">End Odometer</label>
                              <input type="number" name="endOdometer" required placeholder="0.0" value={formData.endOdometer} onChange={handleInputChange} className="w-full pl-4 pr-4 py-3 bg-white border border-emerald-100 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500" />
                          </div>
                      </div>
                      <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Purpose / Remarks</label>
                          <textarea name="remarks" rows={3} value={formData.remarks} onChange={handleInputChange} placeholder="Describe the trip..." className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                      </div>
                      <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-2xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 transform active:scale-95"><Send className="w-4 h-4" /> Submit Claim</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default KmClaims;
