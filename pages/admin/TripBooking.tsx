
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Download, X, Save,
  User, MapPin, Trash2, Edit2, 
  RefreshCcw, Calculator,
  Calendar as CalendarIcon, AlertTriangle
} from 'lucide-react';

interface Trip {
  id: string;
  tripId: string;
  date: string;
  branch: string;
  bookingType: string;
  orderType: string;
  transportType: string;
  tripCategory: string;
  bookingStatus: string;
  cancelBy?: string;
  userName: string;
  userMobile: string;
  driverName?: string;
  driverMobile?: string;
  tripPrice: number;
  adminCommission: number;
  adminCommissionPercentage?: number;
  tax: number;
  taxPercentage?: number;
  waitingCharge: number;
  discount: number;
  cancellationCharge: number;
  totalPrice: number;
  remarks?: string;
  ownerId?: string;
  ownerName?: string;
}

// Strict 2-decimal currency formatter (e.g., ₹101,247.60)
const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const TripBooking: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';
  
  // --- Load Trips ---
  const [trips, setTrips] = useState<Trip[]>(() => {
    if (isSuperAdmin) {
        let allTrips: Trip[] = [];
        
        // 1. Admin Trips
        try {
            const adminData = JSON.parse(localStorage.getItem('trips_data') || '[]');
            allTrips = [...allTrips, ...adminData.map((t: any) => ({...t, ownerId: 'admin', ownerName: 'Head Office'}))];
        } catch(e) {}

        // 2. Corporate Trips
        try {
            const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corporates.forEach((c: any) => {
                const cData = localStorage.getItem(`trips_data_${c.email}`);
                if (cData) {
                    const parsed = JSON.parse(cData);
                    const tagged = parsed.map((t: any) => ({...t, ownerId: c.email, ownerName: c.companyName}));
                    allTrips = [...allTrips, ...tagged];
                }
            });
        } catch(e) {}
        
        return allTrips.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
        const key = `trips_data_${sessionId}`;
        try {
            const saved = localStorage.getItem(key);
            const parsed = saved ? JSON.parse(saved) : [];
            return parsed.map((t: any) => ({...t, ownerId: sessionId, ownerName: 'My Branch'})).sort((a: Trip, b: Trip) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } catch (e) { return []; }
    }
  });

  const [allBranches, setAllBranches] = useState<any[]>([]); 
  const [corporates, setCorporates] = useState<any[]>([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // --- Filter State ---
  const [searchTerm, setSearchTerm] = useState('');
  
  // Specific Filters requested
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [corporateFilter, setCorporateFilter] = useState('All');
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Form Initial State
  const initialFormState = {
    ownerId: isSuperAdmin ? 'admin' : sessionId,
    branch: '',
    tripId: '',
    date: new Date().toISOString().split('T')[0],
    bookingType: 'Online',
    orderType: 'Scheduled',
    transportType: 'Sedan',
    tripCategory: 'Local',
    bookingStatus: 'Pending',
    cancelBy: '',
    userName: '',
    userMobile: '',
    driverName: '',
    driverMobile: '',
    tripPrice: 0,
    adminCommission: 0,
    adminCommissionPercentage: 10,
    tax: 0,
    taxPercentage: 5,
    waitingCharge: 0,
    discount: 0,
    cancellationCharge: 0,
    remarks: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- Loaders ---
  useEffect(() => {
    try {
      const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      setCorporates(corps);

      let loadedBranches: any[] = [];
      if (isSuperAdmin) {
          const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
          loadedBranches = [...adminBranches.map((b: any) => ({...b, owner: 'admin', ownerName: 'Head Office'}))]; 
          corps.forEach((c: any) => {
             const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
             loadedBranches = [...loadedBranches, ...cBranches.map((b: any) => ({...b, owner: c.email, ownerName: c.companyName}))];
          });
      } else {
          const key = `branches_data_${sessionId}`;
          const saved = localStorage.getItem(key);
          if (saved) {
              const parsed = JSON.parse(saved);
              loadedBranches = parsed.map((b: any) => ({...b, owner: sessionId}));
          }
      }
      setAllBranches(loadedBranches);
    } catch (e) {}
  }, [isSuperAdmin, sessionId]);

  // --- Persistence ---
  useEffect(() => {
    if (isSuperAdmin) {
        // Only save admin's own trips back to the main key to avoid overwriting franchise data
        const headOfficeTrips = trips.filter(t => t.ownerId === 'admin');
        const cleanTrips = headOfficeTrips.map(({ownerId, ownerName, ...rest}) => rest);
        localStorage.setItem('trips_data', JSON.stringify(cleanTrips));
    } else {
        const key = `trips_data_${sessionId}`;
        const cleanTrips = trips.map(({ownerId, ownerName, ...rest}) => rest);
        localStorage.setItem(key, JSON.stringify(cleanTrips));
    }
    // Ensure all changes are visible immediately across components
    window.dispatchEvent(new Event('storage'));
  }, [trips, isSuperAdmin, sessionId]);

  // --- Filtering Logic ---
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      // Search
      const matchesSearch = 
        t.tripId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.userMobile.includes(searchTerm);
      
      // Standard Filters
      const matchesStatus = statusFilter === 'All' || t.bookingStatus === statusFilter;
      const matchesBranch = branchFilter === 'All' || (t.branch && t.branch === branchFilter);
      
      // Strict Corporate filtering
      let matchesCorporate = true;
      if (isSuperAdmin) {
          matchesCorporate = corporateFilter === 'All' || t.ownerId === corporateFilter;
      } else {
          matchesCorporate = t.ownerId === sessionId; // Explicit check for Franchise
      }

      // Date Range
      const tripDate = t.date;
      let matchesDate = true;
      if (fromDate && toDate) matchesDate = tripDate >= fromDate && tripDate <= toDate;
      else if (fromDate) matchesDate = tripDate >= fromDate;
      else if (toDate) matchesDate = tripDate <= toDate;

      return matchesSearch && matchesStatus && matchesBranch && matchesCorporate && matchesDate;
    });
  }, [trips, searchTerm, statusFilter, branchFilter, corporateFilter, fromDate, toDate, isSuperAdmin, sessionId]);

  // --- Analytics Calculation ---
  const analytics = useMemo(() => {
    const totalTrips = filteredTrips.length;
    const totalRevenue = filteredTrips.reduce((sum, t) => sum + (t.totalPrice || 0), 0);
    const totalCommission = filteredTrips.reduce((sum, t) => sum + (t.adminCommission || 0), 0);
    const totalTax = filteredTrips.reduce((sum, t) => sum + (t.tax || 0), 0);
    
    return { 
        totalTrips, totalRevenue, totalCommission, totalTax 
    };
  }, [filteredTrips]);

  // --- Form Logic ---
  const totalPrice = useMemo(() => {
    const price = Number(formData.tripPrice) || 0;
    const tax = Number(formData.tax) || 0;
    const waiting = Number(formData.waitingCharge) || 0;
    const cancel = Number(formData.cancellationCharge) || 0;
    const discount = Number(formData.discount) || 0;
    return price + tax + waiting + cancel - discount; 
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFinancialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const val = value === '' ? 0 : parseFloat(value);
      
      setFormData(prev => {
          const newData = { ...prev, [name]: val };
          // Auto Calc Tax
          if (name === 'tripPrice' || name === 'taxPercentage') {
              const price = name === 'tripPrice' ? val : (prev.tripPrice || 0);
              const pct = name === 'taxPercentage' ? val : (prev.taxPercentage || 0);
              newData.tax = (price * pct) / 100;
          }
          // Auto Calc Commission
          if (['tripPrice', 'waitingCharge', 'cancellationCharge', 'discount', 'adminCommissionPercentage'].includes(name)) {
              const price = name === 'tripPrice' ? val : (prev.tripPrice || 0);
              const wait = name === 'waitingCharge' ? val : (prev.waitingCharge || 0);
              const cancel = name === 'cancellationCharge' ? val : (prev.cancellationCharge || 0);
              const disc = name === 'discount' ? val : (prev.discount || 0);
              const commPct = name === 'adminCommissionPercentage' ? val : (prev.adminCommissionPercentage || 0);
              
              const baseCommission = (price + wait) * (commPct / 100);
              newData.adminCommission = baseCommission + cancel - disc;
          }
          return newData;
      });
  };

  const formAvailableBranches = useMemo(() => {
      return allBranches.filter(b => b.owner === formData.ownerId);
  }, [allBranches, formData.ownerId]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSelectedMonth(val);
      if (val) {
          const [y, m] = val.split('-');
          const year = parseInt(y);
          const month = parseInt(m) - 1;
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0);
          
          // Adjust for timezone offset to get local YYYY-MM-DD
          const toLocalISO = (d: Date) => {
              const offset = d.getTimezoneOffset() * 60000;
              return new Date(d.getTime() - offset).toISOString().split('T')[0];
          };

          setFromDate(toLocalISO(firstDay));
          setToDate(toLocalISO(lastDay));
      } else {
          setFromDate('');
          setToDate('');
      }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tripId || !formData.date || !formData.userName) {
      alert("Please fill all required fields (*)");
      return;
    }

    let ownerName = 'My Branch';
    if (isSuperAdmin) {
        if (formData.ownerId === 'admin') ownerName = 'Head Office';
        else {
            const corp = corporates.find(c => c.email === formData.ownerId);
            ownerName = corp ? corp.companyName : 'Corporate';
        }
    }

    const tripData: Trip = {
      id: editingId || Date.now().toString(),
      ...formData,
      tripPrice: Number(formData.tripPrice),
      adminCommission: Number(formData.adminCommission),
      tax: Number(formData.tax),
      waitingCharge: Number(formData.waitingCharge),
      discount: Number(formData.discount),
      cancellationCharge: Number(formData.cancellationCharge),
      totalPrice: totalPrice,
      ownerId: formData.ownerId, 
      ownerName: ownerName
    };

    if (editingId) {
      setTrips(prev => prev.map(t => t.id === editingId ? { ...t, ...tripData } : t));
    } else {
      setTrips(prev => [tripData, ...prev]);
    }

    // Trigger immediate cloud sync
    window.dispatchEvent(new Event('cloud-sync-immediate'));

    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleEdit = (trip: Trip) => {
    setEditingId(trip.id);
    setFormData({
      ownerId: trip.ownerId || 'admin',
      branch: trip.branch,
      tripId: trip.tripId,
      date: trip.date,
      bookingType: trip.bookingType,
      orderType: trip.orderType || 'Scheduled',
      transportType: trip.transportType,
      tripCategory: trip.tripCategory,
      bookingStatus: trip.bookingStatus,
      cancelBy: trip.cancelBy || '',
      userName: trip.userName,
      userMobile: trip.userMobile,
      driverName: trip.driverName || '',
      driverMobile: trip.driverMobile || '',
      tripPrice: trip.tripPrice,
      adminCommission: trip.adminCommission,
      adminCommissionPercentage: trip.adminCommissionPercentage || 10,
      tax: trip.tax,
      taxPercentage: trip.taxPercentage || 5,
      waitingCharge: trip.waitingCharge,
      discount: trip.discount,
      cancellationCharge: trip.cancellationCharge,
      remarks: trip.remarks || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this trip?")) {
      setTrips(prev => prev.filter(t => t.id !== id));
      // Trigger immediate cloud sync
      window.dispatchEvent(new Event('cloud-sync-immediate'));
    }
  };

  const handleResetFilters = () => {
      setSearchTerm('');
      setStatusFilter('All');
      setBranchFilter('All');
      setCorporateFilter('All');
      setFromDate('');
      setToDate('');
      setSelectedMonth('');
  };

  const handleExport = () => {
    if (filteredTrips.length === 0) { alert("No data to export"); return; }
    const headers = ["Trip ID", "Date", "Owner", "Branch", "Booking Type", "Order Type", "Customer", "Transport", "Comm", "Tax", "Total", "Status"];
    const rows = filteredTrips.map(t => [
      t.tripId, t.date, t.ownerName, t.branch, t.bookingType, t.orderType, t.userName, 
      `${t.tripCategory}-${t.transportType}`, t.adminCommission.toFixed(2), t.tax.toFixed(2), t.totalPrice.toFixed(2), t.bookingStatus
    ]);
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "trips.csv";
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Trip Booking</h2>
          <p className="text-gray-500">Manage all bookings, commissions and trip details</p>
        </div>
      </div>

      {/* FILTERS & ACTION BAR */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between animate-in fade-in slide-in-from-top-2">
          {/* Search */}
          <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                  type="text" 
                  placeholder="Search Trip ID, Name or Mobile..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 items-center">
              {/* Date & Month Filters */}
              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                  <CalendarIcon className="w-4 h-4 text-gray-400 ml-2" />
                  
                  {/* Month Picker */}
                  <input 
                      type="month"
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      className="bg-transparent border-none text-xs focus:ring-0 text-gray-700 w-32 cursor-pointer font-medium"
                      title="Select Month"
                  />
                  <span className="text-gray-300">|</span>
                  {/* Custom Range */}
                  <input 
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="bg-transparent border-none text-xs focus:ring-0 text-gray-600 w-24"
                      placeholder="From"
                  />
                  <span className="text-gray-400 text-xs">-</span>
                  <input 
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="bg-transparent border-none text-xs focus:ring-0 text-gray-600 w-24"
                      placeholder="To"
                  />
              </div>

              {isSuperAdmin && (
                 <select 
                    value={corporateFilter}
                    onChange={(e) => setCorporateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[120px]"
                 >
                    <option value="All">All Corp</option>
                    <option value="admin">Head Office</option>
                    {corporates.map((c: any) => (
                       <option key={c.email} value={c.email}>{c.companyName}</option>
                    ))}
                 </select>
              )}
              
              <select 
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[120px]"
              >
                <option value="All">Branches</option>
                {Array.from(new Set(allBranches.map((b: any) => b.name))).map((name: string) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[100px]"
              >
                <option value="All">Status</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <button 
                onClick={handleResetFilters}
                className="px-2 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                title="Reset Filters"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>

              <div className="w-px h-6 bg-gray-200 mx-1"></div>

              <button 
                  onClick={handleExport} 
                  className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors text-sm"
              >
                  <Download className="w-4 h-4" /> Export
              </button>
              <button 
                  onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors text-sm"
              >
                  <Plus className="w-4 h-4" /> New
              </button>
          </div>
      </div>

      {/* DASHBOARD KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase">TOTAL TRIPS</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalTrips}</h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase">TOTAL REVENUE</p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(analytics.totalRevenue)}</h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase">ADMIN COMMISSION</p>
              <h3 className="text-3xl font-bold text-blue-600 mt-2">{formatCurrency(analytics.totalCommission)}</h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase">TAX</p>
              <h3 className="text-3xl font-bold text-purple-600 mt-2">{formatCurrency(analytics.totalTax)}</h3>
          </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                   <tr>
                      <th className="px-6 py-4">Trip ID / Date</th>
                      {isSuperAdmin && <th className="px-6 py-4">Agency</th>}
                      <th className="px-6 py-4">Branch</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Booking Type</th>
                      <th className="px-6 py-4">Order Type</th>
                      <th className="px-6 py-4">Transport</th>
                      <th className="px-6 py-4 text-right">Admin Commission</th>
                      <th className="px-6 py-4 text-right">Tax</th>
                      <th className="px-6 py-4 text-right">Total Price</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {filteredTrips.length > 0 ? filteredTrips.map(trip => (
                      <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                         <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{trip.tripId}</div>
                            <div className="text-xs text-gray-500">{trip.date}</div>
                         </td>
                         {isSuperAdmin && (
                             <td className="px-6 py-4">
                                 <span className="text-indigo-700 font-medium text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                     {trip.ownerName || 'Head Office'}
                                 </span>
                             </td>
                         )}
                         <td className="px-6 py-4 text-gray-600">{trip.branch}</td>
                         <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{trip.userName}</div>
                            <div className="text-xs text-gray-500">{trip.userMobile}</div>
                         </td>
                         <td className="px-6 py-4">
                            <span className="text-gray-700 text-xs font-semibold bg-gray-100 px-2 py-1 rounded">
                               {trip.bookingType}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <span className="text-purple-700 text-xs font-semibold bg-purple-50 px-2 py-1 rounded border border-purple-100">
                               {trip.orderType}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                               {trip.tripCategory} • {trip.transportType}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-right text-emerald-600 font-medium">
                            {formatCurrency(trip.adminCommission)}
                         </td>
                         <td className="px-6 py-4 text-right text-gray-600">
                            {formatCurrency(trip.tax)}
                         </td>
                         <td className="px-6 py-4 text-right">
                            <div className="font-bold text-gray-900">{formatCurrency(trip.totalPrice)}</div>
                         </td>
                         <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                               trip.bookingStatus === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                               trip.bookingStatus === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                               trip.bookingStatus === 'Pending' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                               'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}>
                               {trip.bookingStatus}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                               <button onClick={() => { setEditingId(trip.id); setFormData(prev => ({...prev, ...trip})); setIsModalOpen(true); }} className="text-gray-400 hover:text-emerald-600 p-1 rounded hover:bg-emerald-50"><Edit2 className="w-4 h-4"/></button>
                               <button onClick={() => handleDelete(trip.id)} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 className="w-4 h-4"/></button>
                            </div>
                         </td>
                      </tr>
                   )) : (
                      <tr>
                         <td colSpan={isSuperAdmin ? 12 : 11} className="text-center py-12 text-gray-500 bg-gray-50">
                            <div className="flex flex-col items-center">
                                <Search className="w-10 h-10 text-gray-300 mb-2" />
                                <p>No trips found matching the selected filters.</p>
                            </div>
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
      </div>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800 text-xl">{editingId ? 'Edit Trip' : 'New Trip Booking'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Column 1: Trip Basic Info */}
                    <div className="space-y-4">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500"/> Trip Info</h4>
                       
                       {isSuperAdmin && (
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign to (Corporate/HO)</label>
                               <select 
                                   name="ownerId" 
                                   value={formData.ownerId} 
                                   onChange={(e) => setFormData({...formData, ownerId: e.target.value, branch: ''})} 
                                   className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm"
                               >
                                   <option value="admin">Head Office</option>
                                   {corporates.map((c: any) => (
                                       <option key={c.email} value={c.email}>{c.companyName} ({c.city})</option>
                                   ))}
                               </select>
                           </div>
                       )}

                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch</label>
                          <select 
                              name="branch" 
                              value={formData.branch} 
                              onChange={handleInputChange} 
                              className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm"
                          >
                             <option value="">Select Branch</option>
                             {formAvailableBranches.map((b: any) => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                             ))}
                          </select>
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trip ID *</label>
                             <input 
                                type="text" 
                                name="tripId" 
                                value={formData.tripId} 
                                onChange={handleInputChange} 
                                className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm font-mono focus:ring-2 focus:ring-emerald-500" 
                                placeholder="Enter ID"
                                required 
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date *</label>
                             <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" required />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Booking Type *</label>
                             <select name="bookingType" value={formData.bookingType} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm">
                                <option>Online</option>
                                <option>Offline</option>
                                <option>Call</option>
                                <option>WhatsApp</option>
                             </select>
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Order Type</label>
                             <select name="orderType" value={formData.orderType} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm">
                                <option>Scheduled</option>
                                <option>Instant</option>
                             </select>
                          </div>
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Transport Type *</label>
                          <select name="transportType" value={formData.transportType} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm">
                             <option>Sedan</option>
                             <option>SUV</option>
                             <option>Van</option>
                             <option>Mini Bus</option>
                          </select>
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trip Category *</label>
                          <select name="tripCategory" value={formData.tripCategory} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm">
                             <option>Local</option>
                             <option>Rental</option>
                             <option>Outstation</option>
                          </select>
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status *</label>
                             <select name="bookingStatus" value={formData.bookingStatus} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm">
                                <option>Pending</option>
                                <option>Completed</option>
                                <option>Cancelled</option>
                             </select>
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cancel By</label>
                             <select name="cancelBy" value={formData.cancelBy} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm" disabled={formData.bookingStatus !== 'Cancelled'}>
                                <option>-</option>
                                <option>Head Office Admin</option>
                                <option>Franchise Admin</option>
                                <option>User</option>
                                <option>Driver</option>
                             </select>
                          </div>
                       </div>
                    </div>

                    {/* Column 2: People & Details */}
                    <div className="space-y-4">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><User className="w-4 h-4 text-blue-500"/> People</h4>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">User Name *</label>
                          <input type="text" name="userName" value={formData.userName} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="Customer Name" required />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">User Mobile *</label>
                          <input type="text" name="userMobile" value={formData.userMobile} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="+91..." />
                       </div>
                       
                       <div className="pt-2 border-t border-dashed">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Driver Name</label>
                          <input type="text" name="driverName" value={formData.driverName} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="Driver Name" />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Driver Mobile</label>
                          <input type="text" name="driverMobile" value={formData.driverMobile} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="+91..." />
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label>
                          <textarea name="remarks" value={formData.remarks} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm resize-none h-20" placeholder="Any special notes..." />
                       </div>
                    </div>

                    {/* Column 3: Financials */}
                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                       <h4 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2"><Calculator className="w-4 h-4 text-purple-500"/> Financials</h4>
                       
                       <div className="grid grid-cols-2 gap-2">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trip Price (₹) *</label>
                             <input type="number" name="tripPrice" value={formData.tripPrice} onChange={handleFinancialChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="0.00" />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tax %</label>
                             <input type="number" name="taxPercentage" value={formData.taxPercentage} onChange={handleFinancialChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="5" />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tax Amt</label>
                             <div className="w-full p-2 border border-gray-200 bg-gray-100 rounded-lg text-sm text-gray-600">{formatCurrency(formData.tax)}</div>
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Waiting Chg.</label>
                             <input type="number" name="waitingCharge" value={formData.waitingCharge} onChange={handleFinancialChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="0.00" />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cancel Chg.</label>
                             <input type="number" name="cancellationCharge" value={formData.cancellationCharge} onChange={handleFinancialChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="0.00" />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount</label>
                             <input type="number" name="discount" value={formData.discount} onChange={handleFinancialChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="0.00" />
                          </div>
                       </div>

                       <div className="pt-2">
                          <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Total Price</label>
                          <div className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-2xl font-bold text-emerald-600">
                             {formatCurrency(totalPrice)}
                          </div>
                          <p className="text-[10px] text-emerald-600 mt-1">Trip + Tax + Wait + Cancel - Disc</p>
                       </div>

                       <div className="border-t border-gray-200 pt-3 mt-2">
                          <div className="grid grid-cols-2 gap-2">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Admin Comm %</label>
                                  <input type="number" name="adminCommissionPercentage" value={formData.adminCommissionPercentage} onChange={handleFinancialChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="10" />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Admin Comm Amt</label>
                                  <div className="w-full p-2 border border-gray-200 bg-gray-100 rounded-lg text-sm text-gray-600">{formatCurrency(formData.adminCommission)}</div>
                              </div>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">(Trip + Wait)*% + Cancel - Disc</p>
                       </div>
                    </div>
                 </div>
              </form>

              <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end gap-3">
                 <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                 </button>
                 <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-md transition-colors flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Trip
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
