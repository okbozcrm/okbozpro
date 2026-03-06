
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bike, Plus, Search, CheckCircle, 
  Clock, Check, X, 
  TrendingUp, AlertCircle, Gauge,
  DollarSign, Send, Trash2, FileText, Calculator
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
  const [editingClaim, setEditingClaim] = useState<TravelAllowanceRequest | null>(null);
  const [editRate, setEditRate] = useState<string>('');

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
    ratePerKm: '10', // Default, will be updated by useEffect
    remarks: ''
  });

  // Reference Data
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [staff, setStaff] = useState<Employee[]>([]);

  // --- Fetch Configured Rate ---
  useEffect(() => {
    const fetchRate = () => {
        let corporateId = 'admin';
        if (role === UserRole.EMPLOYEE) {
            corporateId = localStorage.getItem('logged_in_employee_corporate_id') || 'admin';
        } else if (role === UserRole.CORPORATE) {
            corporateId = sessionId;
        }
        
        const key = corporateId === 'admin' ? 'company_ta_rate' : `company_ta_rate_${corporateId}`;
        const savedRate = localStorage.getItem(key);
        // Fallback to global if corporate-specific not found for employees under franchise (optional logic, sticking to direct check)
        if (savedRate) {
            setFormData(prev => ({ ...prev, ratePerKm: savedRate }));
        } else if (corporateId !== 'admin') {
             // If franchise doesn't have setting, try checking if they rely on global default?
             // For now, keep it simple.
             const globalRate = localStorage.getItem('company_ta_rate');
             if (globalRate) setFormData(prev => ({ ...prev, ratePerKm: globalRate }));
        }
    };
    fetchRate();
  }, [role, sessionId]);

  // --- Load Data ---
  const loadData = () => {
    try {
      const key = 'global_travel_requests';
      const saved = localStorage.getItem(key);
      let allRequests: TravelAllowanceRequest[] = [];
      try {
        allRequests = saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error("Error parsing travel requests:", e);
        allRequests = [];
      }

      // Data Scoping
      if (isEmployee) {
        allRequests = allRequests.filter(r => r.employeeId === sessionId);
      } else if (role === UserRole.CORPORATE) {
        allRequests = allRequests.filter(r => r.corporateId === sessionId);
      }

      setRequests(allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      
      try {
        setCorporates(JSON.parse(localStorage.getItem('corporate_accounts') || '[]'));
      } catch (e) {
        console.error("Error parsing corporate accounts:", e);
        setCorporates([]);
      }
      
      // Load staff for names in Admin view
      let allStaff: Employee[] = [];
      try {
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        allStaff = [...adminStaff];
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corps.forEach((c: CorporateAccount) => {
          try {
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
            allStaff = [...allStaff, ...cStaff];
          } catch (e) {
            console.warn(`Error parsing staff for ${c.email}`, e);
          }
        });
      } catch (e) {
        console.error("Error loading staff data:", e);
      }
      setStaff(allStaff);
    } catch (error) {
      console.error("Critical error in loadData:", error);
    }
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

    // Resolve my corporate ID
    const me = staff.find(s => s.id === sessionId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    localStorage.setItem(key, JSON.stringify([newRequest, ...existing]));

    sendSystemNotification({
      type: 'advance_request',
      title: 'New KM Claim Submitted',
      message: `${newRequest.employeeName} submitted a TA claim for ${totalKm} KM (₹${totalAmount.toFixed(2)})`,
      targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
      corporateId: myCorpId === 'admin' ? undefined : myCorpId,
      link: '/admin/km-claims'
    });

    setRequests([newRequest, ...requests]);
    setIsModalOpen(false);
    // Keep the rate, clear other fields
    setFormData(prev => ({ ...prev, startOdometer: '', endOdometer: '', remarks: '' }));
    alert("Claim submitted successfully!");
  };

  const handleStatusUpdate = (id: string, newStatus: TravelAllowanceRequest['status']) => {
    if (window.confirm(`Are you sure you want to mark this claim as ${newStatus}?`)) {
      const key = 'global_travel_requests';
      const all = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = all.map((r: TravelAllowanceRequest) => r.id === id ? { ...r, status: newStatus } : r);
      localStorage.setItem(key, JSON.stringify(updated));
      
      const request = updated.find((r: TravelAllowanceRequest) => r.id === id);
      if (request) {
          sendSystemNotification({
              type: 'system',
              title: `TA Claim ${newStatus}`,
              message: `Your KM Claim for ${request.date} has been ${newStatus.toLowerCase()}.`,
              targetRoles: [UserRole.EMPLOYEE],
              employeeId: request.employeeId,
              link: '/user/km-claims'
          });
      }
      
      loadData();
    }
  };

  const handleEditRate = (req: TravelAllowanceRequest) => {
    setEditingClaim(req);
    setEditRate(req.ratePerKm.toString());
  };

  const saveRateUpdate = () => {
    if (!editingClaim) return;
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0) {
      alert("Please enter a valid rate.");
      return;
    }

    const totalAmount = editingClaim.totalKm * rate;
    const key = 'global_travel_requests';
    const all = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = all.map((r: TravelAllowanceRequest) => 
      r.id === editingClaim.id ? { ...r, ratePerKm: rate, totalAmount: totalAmount } : r
    );

    localStorage.setItem(key, JSON.stringify(updated));
    loadData();
    setEditingClaim(null);
    setEditRate('');
    alert("Rate updated successfully!");
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this request?")) {
        const key = 'global_travel_requests';
        const all = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = all.filter((r: TravelAllowanceRequest) => r.id !== id);
        localStorage.setItem(key, JSON.stringify(updated));
        loadData();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Claimed KM</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.totalKm.toFixed(1)} km</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Payable</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">₹{stats.totalAmount.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Claims</p>
                <h3 className="text-2xl font-bold text-orange-600 mt-1">{stats.pendingCount}</h3>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                <Clock className="w-5 h-5" />
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Paid</p>
                <h3 className="text-2xl font-bold text-indigo-600 mt-1">₹{stats.paidAmount.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <CheckCircle className="w-5 h-5" />
            </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                  type="text" 
                  placeholder="Search by name or remarks..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
              {isSuperAdmin && (
                <select 
                    value={corpFilter}
                    onChange={(e) => setCorpFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="All">All Corporates</option>
                    <option value="admin">Head Office</option>
                    {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                </select>
              )}
              <input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid</option>
                <option value="Rejected">Rejected</option>
              </select>
          </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase tracking-widest text-[10px]">
                      <tr>
                          <th className="px-6 py-4">Date</th>
                          {!isEmployee && <th className="px-6 py-4">Employee</th>}
                          <th className="px-6 py-4">Odometer (Start - End)</th>
                          <th className="px-6 py-4">Total Distance</th>
                          <th className="px-6 py-4">Rate</th>
                          <th className="px-6 py-4">Payable</th>
                          <th className="px-6 py-4">Remarks</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-gray-50 transition-colors group">
                              <td className="px-6 py-4 font-medium text-gray-900">{req.date}</td>
                              {!isEmployee && (
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase">
                                            {req.employeeName.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">{req.employeeName}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                                {corporates.find(c => c.email === req.corporateId)?.companyName || 'Head Office'}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                              )}
                              <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                                  {req.startOdometer} → {req.endOdometer}
                              </td>
                              <td className="px-6 py-4">
                                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                                      {req.totalKm} km
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-gray-500 text-xs">₹{req.ratePerKm}/km</td>
                              <td className="px-6 py-4 font-bold text-gray-900 text-lg">₹{req.totalAmount.toFixed(2)}</td>
                              <td className="px-6 py-4 text-gray-500 text-xs italic max-w-xs truncate" title={req.remarks}>
                                  {req.remarks || '-'}
                              </td>
                              <td className="px-6 py-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                      req.status === 'Paid' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                      req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                      req.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                                  }`}>
                                      {req.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  {!isEmployee ? (
                                      <div className="flex justify-end gap-2">
                                          {req.status === 'Pending' && (
                                              <>
                                                  <button onClick={() => handleStatusUpdate(req.id, 'Approved')} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-700 shadow-sm transition-all transform active:scale-95 flex items-center gap-1">
                                                      <Check className="w-3 h-3" /> Approve
                                                  </button>
                                                  <button onClick={() => handleStatusUpdate(req.id, 'Rejected')} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-100 border border-red-100 transition-all flex items-center gap-1">
                                                      <X className="w-3 h-3" /> Reject
                                                  </button>
                                                  <button onClick={() => handleEditRate(req)} className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-amber-100 border border-amber-100 transition-all flex items-center gap-1">
                                                      <Calculator className="w-3 h-3" /> Edit Rate
                                                  </button>
                                              </>
                                          )}
                                          {req.status === 'Approved' && (
                                              <>
                                                  <button onClick={() => handleStatusUpdate(req.id, 'Paid')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1">
                                                      <DollarSign className="w-3 h-3" /> Mark Paid
                                                  </button>
                                                  <button onClick={() => handleEditRate(req)} className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-amber-100 border border-amber-100 transition-all flex items-center gap-1">
                                                      <Calculator className="w-3 h-3" /> Edit Rate
                                                  </button>
                                              </>
                                          )}
                                          <button onClick={() => handleDelete(req.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Delete Permanent"><Trash2 className="w-4 h-4" /></button>
                                      </div>
                                  ) : (
                                      <button 
                                          disabled={req.status !== 'Pending'} 
                                          onClick={() => handleDelete(req.id)}
                                          className={`p-2 transition-colors ${req.status === 'Pending' ? 'text-gray-400 hover:text-red-600' : 'text-gray-200 cursor-not-allowed'}`}
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  )}
                              </td>
                          </tr>
                      ))}
                      {filteredRequests.length === 0 && (
                          <tr>
                              <td colSpan={isEmployee ? 8 : 9} className="py-20 text-center text-gray-400 italic">
                                  <div className="flex flex-col items-center gap-3">
                                      <FileText className="w-12 h-12 opacity-10" />
                                      <p>No claims found matching your filters.</p>
                                  </div>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Claim Submission Modal (Employee) */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="text-xl font-black text-gray-900 tracking-tighter flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-emerald-600" /> New KM Claim
                      </h3>
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
                            <input 
                                type="number" 
                                name="ratePerKm" 
                                required 
                                value={formData.ratePerKm} 
                                onChange={handleInputChange} 
                                disabled={true}
                                className="w-full px-4 py-3 bg-gray-100 border border-gray-100 rounded-xl text-sm font-bold text-gray-600 outline-none cursor-not-allowed opacity-70" 
                            />
                        </div>
                      </div>

                      <div className="space-y-4 bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100/50">
                          <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Start Odometer</label>
                              <div className="relative">
                                  <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                                  <input type="number" name="startOdometer" required placeholder="0.0" value={formData.startOdometer} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-white border border-emerald-100 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500" />
                              </div>
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">End Odometer</label>
                              <div className="relative">
                                  <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                                  <input type="number" name="endOdometer" required placeholder="0.0" value={formData.endOdometer} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-white border border-emerald-100 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500" />
                              </div>
                          </div>
                      </div>

                      <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Purpose / Remarks</label>
                          <textarea name="remarks" rows={3} value={formData.remarks} onChange={handleInputChange} placeholder="e.g. Field visit to client location..." className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                      </div>

                      <div className="bg-gray-900 rounded-2xl p-5 text-white flex justify-between items-center shadow-lg">
                          <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estimated Amount</p>
                              <h4 className="text-2xl font-black">
                                  ₹{((parseFloat(formData.endOdometer) - parseFloat(formData.startOdometer)) * parseFloat(formData.ratePerKm) || 0).toFixed(2)}
                              </h4>
                          </div>
                          <div className="text-right">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total KM</p>
                              <h4 className="text-xl font-black text-emerald-400">
                                  {Math.max(0, (parseFloat(formData.endOdometer) - parseFloat(formData.startOdometer) || 0)).toFixed(1)} km
                              </h4>
                          </div>
                      </div>

                      <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-2xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                          <Send className="w-4 h-4" /> Submit Claim
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Edit Rate Modal */}
      {editingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-black text-gray-900 tracking-tighter flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-amber-600" /> Update Rate
                    </h3>
                    <button onClick={() => setEditingClaim(null)} className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-400 hover:text-gray-900"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rate per KM (₹)</label>
                        <input 
                            type="number" 
                            value={editRate} 
                            onChange={(e) => setEditRate(e.target.value)} 
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-bold text-gray-800 outline-none focus:ring-2 focus:ring-amber-500" 
                            placeholder="0.00"
                            step="0.1"
                        />
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-500 font-medium">Total Distance</span>
                            <span className="text-sm font-bold text-gray-800">{editingClaim.totalKm} km</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-xs text-gray-500 font-medium">New Payable Amount</span>
                            <span className="text-lg font-black text-emerald-600">₹{((parseFloat(editRate) || 0) * editingClaim.totalKm).toFixed(2)}</span>
                        </div>
                    </div>
                    <button onClick={saveRateUpdate} className="w-full py-3 bg-amber-500 text-white rounded-xl font-black text-sm shadow-lg shadow-amber-900/20 hover:bg-amber-600 transition-all transform active:scale-95">
                        Update Rate & Amount
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
              <p className="font-bold">Guidelines for TA Claims</p>
              <ul className="list-disc list-inside mt-1 space-y-1 opacity-80">
                  <li>Ensure odometer photos are available if requested by HR for audit.</li>
                  <li>Claims are usually processed along with the monthly salary disbursement.</li>
                  <li>Approved claims appear in your Salary Breakdown as &quot;Special Allowance&quot; or &quot;TA Reimb.&quot;.</li>
              </ul>
          </div>
      </div>
    </div>
  );
};

export default KmClaims;
