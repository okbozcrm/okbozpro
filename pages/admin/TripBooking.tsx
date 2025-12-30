
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, X, Save,
  Edit2, Trash2, 
  Calendar as CalendarIcon, MapPin, User, Calculator, Map as MapIcon, ChevronDown,
  TrendingUp, CheckCircle, XCircle, DollarSign, Activity, Car, RefreshCcw, Filter,
  Building2, Percent, Download, Upload, FileSpreadsheet, Send
} from 'lucide-react';
import { UserRole, CorporateAccount } from '../../types';

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
  taxPercentage: number;
  tax: number;
  waitingCharge: number;
  discount: number;
  cancellationCharge: number;
  adminCommissionPercentage: number;
  adminCommission: number;
  totalPrice: number;
  remarks?: string;
  ownerId?: string;
  ownerName?: string;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Helper function to convert JSON to CSV
const convertToCSV = (data: Trip[]) => {
    const headers = [
        "Trip ID", "Date", "Customer Name", "Customer Mobile", "Driver Name", 
        "Driver Mobile", "Booking Type", "Order Type", "Vehicle", "Category", 
        "Status", "Trip Price", "Tax", "Waiting Charge", "Discount", 
        "Cancel Charge", "Admin Comm.", "Total Price", "Branch", "Owner"
    ];
    
    const rows = data.map(t => [
        t.tripId, t.date, t.userName, t.userMobile, t.driverName || '', 
        t.driverMobile || '', t.bookingType, t.orderType, t.transportType, t.tripCategory, 
        t.bookingStatus, t.tripPrice, t.tax, t.waitingCharge, t.discount, 
        t.cancellationCharge, t.adminCommission, t.totalPrice, t.branch, t.ownerName || ''
    ]);

    const csvContent = [
        headers.join(","), 
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    return csvContent;
};

// Helper function to download CSV
const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


export const TripBooking: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const role = localStorage.getItem('user_role') as UserRole;
  const corporateId = localStorage.getItem('logged_in_employee_corporate_id') || sessionId;
  const isSuperAdmin = role === UserRole.ADMIN;
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]); 
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // --- Filters State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [originFilter, setOriginFilter] = useState('All');
  const [fleetFilter, setFleetFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [corporateFilter, setCorporateFilter] = useState('All'); // NEW
  const [branchFilter, setBranchFilter] = useState('All'); // NEW
  const [minCommission, setMinCommission] = useState('');
  const [minTax, setMinTax] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState = {
    ownerId: corporateId,
    branch: '',
    tripId: '',
    date: new Date().toISOString().split('T')[0],
    bookingType: 'Online',
    orderType: 'Scheduled',
    transportType: 'Sedan',
    tripCategory: 'Local',
    bookingStatus: 'Completed',
    cancelBy: '-',
    userName: '',
    userMobile: '',
    driverName: '',
    driverMobile: '',
    tripPrice: 0,
    taxPercentage: 5,
    waitingCharge: 0,
    discount: 0,
    cancellationCharge: 0,
    adminCommissionPercentage: 10,
    remarks: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadData = () => {
    const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
    setCorporates(corps);

    let branches: any[] = [];
    if (isSuperAdmin) {
        const adminB = JSON.parse(localStorage.getItem('branches_data') || '[]');
        branches = [...adminB.map((b: any) => ({...b, owner: 'admin'}))];
        corps.forEach((c: any) => {
            const cb = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
            branches = [...branches, ...cb.map((b: any) => ({...b, owner: c.email}))];
        });
    } else {
        const key = `branches_data_${corporateId}`;
        const saved = localStorage.getItem(key);
        if (saved) branches = JSON.parse(saved).map((b: any) => ({...b, owner: corporateId}));
    }
    setAllBranches(branches);

    let allTrips: Trip[] = [];
    if (isSuperAdmin) {
        const adminData = JSON.parse(localStorage.getItem('trips_data') || '[]');
        allTrips = [...adminData.map((t: any) => ({...t, ownerId: 'admin', ownerName: 'Head Office'}))];
        corps.forEach((c: any) => {
            const cData = localStorage.getItem(`trips_data_${c.email}`);
            if (cData) {
                const parsed = JSON.parse(cData);
                allTrips = [...allTrips, ...parsed.map((t: any) => ({...t, ownerId: c.email, ownerName: c.companyName}))];
            }
        });
    } else {
        const key = `trips_data_${corporateId}`;
        const saved = localStorage.getItem(key);
        if (saved) allTrips = JSON.parse(saved).map((t: any) => ({...t, ownerId: corporateId, ownerName: 'My Branch'}));
    }
    setTrips(allTrips.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [corporateId, isSuperAdmin]);

  const stats = useMemo(() => {
    const completed = trips.filter(t => t.bookingStatus === 'Completed');
    const cancelled = trips.filter(t => t.bookingStatus === 'Cancelled');
    const totalRevenue = completed.reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0);
    const totalCommission = completed.reduce((sum, t) => sum + (Number(t.adminCommission) || 0), 0);
    const totalTax = completed.reduce((sum, t) => sum + (Number(t.tax) || 0), 0);
    const totalCancelledCharges = cancelled.reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0);
    
    return {
      total: trips.length,
      completed: completed.length,
      cancelled: cancelled.length,
      revenue: totalRevenue,
      commission: totalCommission,
      tax: totalTax,
      cancelRevenue: totalCancelledCharges
    };
  }, [trips]);

  const financials = useMemo(() => {
    const isCancelled = formData.bookingStatus === 'Cancelled';
    const tripPrice = Number(formData.tripPrice) || 0;
    const cancelChg = Number(formData.cancellationCharge) || 0;
    
    if (isCancelled) {
        return { 
            taxAmt: 0, 
            total: tripPrice + cancelChg, 
            commAmt: cancelChg, 
            isCancelled: true 
        };
    }

    const taxPct = Number(formData.taxPercentage) || 0;
    const wait = Number(formData.waitingCharge) || 0;
    const disc = Number(formData.discount) || 0;
    const commPct = Number(formData.adminCommissionPercentage) || 0;

    const taxAmt = (tripPrice * taxPct) / 100;
    const total = tripPrice + taxAmt + wait + cancelChg - disc;
    const commAmt = ((tripPrice + wait) * commPct / 100) + cancelChg - disc;

    return { taxAmt, total, commAmt, isCancelled: false };
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveToGoogleSheet = async (tripData: Trip) => {
    const scriptUrl = localStorage.getItem('google_sheet_script_url');
    if (!scriptUrl) {
        console.warn("Google Sheet URL not configured. Skipping sheet save.");
        return;
    }

    try {
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors', // Important to avoid CORS errors with Google Scripts
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tripData)
        });
        console.log("Trip data sent to Google Sheet");
    } catch (error) {
        console.error("Failed to save to Google Sheet", error);
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
      ...formData,
      id: editingId || `T-${Date.now()}`,
      tripPrice: Number(formData.tripPrice),
      taxPercentage: financials.isCancelled ? 0 : Number(formData.taxPercentage),
      tax: financials.taxAmt,
      waitingCharge: financials.isCancelled ? 0 : Number(formData.waitingCharge),
      discount: financials.isCancelled ? 0 : Number(formData.discount),
      cancellationCharge: Number(formData.cancellationCharge),
      adminCommissionPercentage: financials.isCancelled ? 0 : Number(formData.adminCommissionPercentage),
      adminCommission: financials.commAmt,
      totalPrice: financials.total,
      ownerId: formData.ownerId, 
      ownerName: ownerName
    };

    const targetId = formData.ownerId;
    const storageKey = targetId === 'admin' ? 'trips_data' : `trips_data_${targetId}`;
    const currentStorage = JSON.parse(localStorage.getItem(storageKey) || '[]');
    let updatedStorage: any[];

    if (editingId) {
        updatedStorage = currentStorage.map((t: any) => t.id === editingId ? tripData : t);
    } else {
        updatedStorage = [tripData, ...currentStorage];
    }

    const cleanForStorage = updatedStorage.map(({ownerId, ownerName, ...rest}: any) => rest);
    localStorage.setItem(storageKey, JSON.stringify(cleanForStorage));

    // --- AUTOMATIC GOOGLE SHEET SYNC ---
    // Only sync on new creation or if you want updates too, keep it here.
    // For "Automated" feel, usually syncing on Creation/Update is good.
    saveToGoogleSheet(tripData);

    window.dispatchEvent(new Event('cloud-sync-immediate'));
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    loadData();
    
    // Optional: Visual confirmation for the user
    // alert("Trip Saved & Synced to Cloud!"); 
  };

  const handleEdit = (trip: Trip) => {
    setEditingId(trip.id);
    setFormData({
      ownerId: trip.ownerId || 'admin',
      branch: trip.branch,
      tripId: trip.tripId,
      date: trip.date,
      bookingType: trip.bookingType,
      orderType: trip.orderType,
      transportType: trip.transportType,
      tripCategory: trip.tripCategory,
      bookingStatus: trip.bookingStatus,
      cancelBy: trip.cancelBy || '-',
      userName: trip.userName,
      userMobile: trip.userMobile,
      driverName: trip.driverName || '',
      driverMobile: trip.driverMobile || '',
      tripPrice: trip.tripPrice,
      taxPercentage: trip.taxPercentage || 5,
      waitingCharge: trip.waitingCharge,
      discount: trip.discount,
      cancellationCharge: trip.cancellationCharge,
      adminCommissionPercentage: trip.adminCommissionPercentage || 10,
      remarks: trip.remarks || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (trip: Trip) => {
    if (window.confirm("Delete this trip?")) {
      const targetId = trip.ownerId || 'admin';
      const key = targetId === 'admin' ? 'trips_data' : `trips_data_${targetId}`;
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = current.filter((t: any) => t.id !== trip.id);
      localStorage.setItem(key, JSON.stringify(filtered));
      window.dispatchEvent(new Event('cloud-sync-immediate'));
      loadData();
    }
  };

  const resetFilters = () => {
      setSearchTerm('');
      setStatusFilter('All');
      setOriginFilter('All');
      setFleetFilter('All');
      setCategoryFilter('All');
      setCorporateFilter('All');
      setBranchFilter('All');
      setMinCommission('');
      setMinTax('');
  };

  const filteredTrips = trips.filter(t => {
      const matchesSearch = t.tripId.toLowerCase().includes(searchTerm.toLowerCase()) || t.userName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || t.bookingStatus === statusFilter;
      const matchesOrigin = originFilter === 'All' || t.bookingType === originFilter;
      const matchesFleet = fleetFilter === 'All' || t.transportType === fleetFilter;
      const matchesCategory = categoryFilter === 'All' || t.tripCategory === categoryFilter;
      const matchesCorporate = isSuperAdmin ? (corporateFilter === 'All' || t.ownerId === corporateFilter) : true;
      const matchesBranch = branchFilter === 'All' || t.branch === branchFilter;
      const matchesComm = !minCommission || t.adminCommission >= Number(minCommission);
      const matchesTax = !minTax || t.tax >= Number(minTax);

      return matchesSearch && matchesStatus && matchesOrigin && matchesFleet && matchesCategory && matchesCorporate && matchesBranch && matchesComm && matchesTax;
  });

  // --- Import/Export Handlers ---
  const handleExportData = () => {
      if (trips.length === 0) {
          alert("No trip data available to export.");
          return;
      }
      const csv = convertToCSV(trips);
      downloadCSV(csv, `trip_booking_data_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDownloadSample = () => {
      const sampleData: Trip[] = [{
          id: 'SAMPLE',
          tripId: 'TRP-1001',
          date: new Date().toISOString().split('T')[0],
          branch: 'Main Branch',
          bookingType: 'Online',
          orderType: 'Scheduled',
          transportType: 'Sedan',
          tripCategory: 'Local',
          bookingStatus: 'Completed',
          userName: 'John Doe',
          userMobile: '9876543210',
          driverName: 'Driver A',
          driverMobile: '9123456780',
          tripPrice: 1000,
          taxPercentage: 5,
          tax: 50,
          waitingCharge: 0,
          discount: 0,
          cancellationCharge: 0,
          adminCommissionPercentage: 10,
          adminCommission: 100,
          totalPrice: 1050,
          ownerName: 'Head Office'
      }];
      const csv = convertToCSV(sampleData);
      downloadCSV(csv, 'trip_booking_sample.csv');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          // Simple CSV parser logic (assuming standard CSV format)
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          const newTrips: any[] = [];
          
          for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
              
              // Basic mapping based on index from sample format
              // Note: Production-grade import should be more robust with header mapping
              if (values.length >= 18) { // basic check
                   const trip: any = {
                       id: `T-IMP-${Date.now()}-${i}`,
                       tripId: values[0] || `TRP-${Date.now()}`,
                       date: values[1],
                       userName: values[2],
                       userMobile: values[3],
                       driverName: values[4],
                       driverMobile: values[5],
                       bookingType: values[6],
                       orderType: values[7],
                       transportType: values[8],
                       tripCategory: values[9],
                       bookingStatus: values[10],
                       tripPrice: Number(values[11]) || 0,
                       tax: Number(values[12]) || 0,
                       waitingCharge: Number(values[13]) || 0,
                       discount: Number(values[14]) || 0,
                       cancellationCharge: Number(values[15]) || 0,
                       adminCommission: Number(values[16]) || 0,
                       totalPrice: Number(values[17]) || 0,
                       branch: values[18] || 'Main Branch',
                       // Default assignment to current user/admin context
                       ownerId: isSuperAdmin ? 'admin' : corporateId, 
                       ownerName: isSuperAdmin ? 'Head Office' : 'Imported'
                   };
                   newTrips.push(trip);
              }
          }
          
          if (newTrips.length > 0) {
              const targetKey = isSuperAdmin ? 'trips_data' : `trips_data_${corporateId}`;
              const existing = JSON.parse(localStorage.getItem(targetKey) || '[]');
              localStorage.setItem(targetKey, JSON.stringify([...newTrips, ...existing]));
              alert(`Successfully imported ${newTrips.length} trips!`);
              loadData();
          } else {
              alert("No valid trip data found in file. Please check the format.");
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-full mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Trip Booking Terminal</h2>
          <p className="text-gray-500 font-medium">Fleet operations, billing and performance metrics</p>
        </div>
        <div className="flex gap-3">
             <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleImportData} />
             <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
                 <Upload className="w-4 h-4" /> Import CSV
             </button>
             <button onClick={handleExportData} className="bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
                 <Download className="w-4 h-4" /> Export CSV
             </button>
             <button onClick={handleDownloadSample} className="bg-white border border-gray-300 text-gray-500 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2" title="Download Sample CSV Format">
                 <FileSpreadsheet className="w-4 h-4" /> Sample
             </button>
             <button 
                onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-emerald-900/20 transform active:scale-95"
            >
                <Plus className="w-5 h-5" /> New Trip Record
            </button>
        </div>
      </div>

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-[2.5rem] shadow-xl shadow-blue-500/20 flex flex-col justify-between h-40 group hover:scale-[1.02] transition-all relative overflow-hidden">
              <div className="flex justify-between items-start relative z-10">
                <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest opacity-90">Total Trips</p>
                <div className="p-3 bg-white/20 text-white rounded-2xl backdrop-blur-sm"><Activity className="w-5 h-5"/></div>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tighter relative z-10">{stats.total}</h3>
              <Activity className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[2.5rem] shadow-xl shadow-emerald-500/20 flex flex-col justify-between h-40 group hover:scale-[1.02] transition-all relative overflow-hidden">
              <div className="flex justify-between items-start relative z-10">
                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest opacity-90">Completed</p>
                <div className="p-3 bg-white/20 text-white rounded-2xl backdrop-blur-sm"><CheckCircle className="w-5 h-5"/></div>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tighter relative z-10">{stats.completed}</h3>
              <CheckCircle className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-red-600 p-6 rounded-[2.5rem] shadow-xl shadow-rose-500/20 flex flex-col justify-between h-40 group hover:scale-[1.02] transition-all relative overflow-hidden">
              <div className="flex justify-between items-start relative z-10">
                <p className="text-[10px] font-black text-rose-100 uppercase tracking-widest opacity-90">Cancelled</p>
                <div className="p-3 bg-white/20 text-white rounded-2xl backdrop-blur-sm"><XCircle className="w-5 h-5"/></div>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tighter relative z-10">{stats.cancelled}</h3>
              <XCircle className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
          </div>
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 rounded-[2.5rem] shadow-xl shadow-orange-500/20 flex flex-col justify-between h-40 group hover:scale-[1.02] transition-all relative overflow-hidden">
              <div className="flex justify-between items-start relative z-10">
                <p className="text-[10px] font-black text-orange-100 uppercase tracking-widest opacity-90">Total GST</p>
                <div className="p-3 bg-white/20 text-white rounded-2xl backdrop-blur-sm"><Building2 className="w-5 h-5"/></div>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tighter relative z-10">{formatCurrency(stats.tax)}</h3>
              <Building2 className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
          </div>
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-6 rounded-[2.5rem] shadow-xl shadow-purple-500/20 flex flex-col justify-between h-40 group hover:scale-[1.02] transition-all relative overflow-hidden">
              <div className="flex justify-between items-start relative z-10">
                <p className="text-[10px] font-black text-purple-100 uppercase tracking-widest opacity-90">Comm. Earned</p>
                <div className="p-3 bg-white/20 text-white rounded-2xl backdrop-blur-sm"><Percent className="w-5 h-5"/></div>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tighter relative z-10">{formatCurrency(stats.commission)}</h3>
              <Percent className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
          </div>
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-6 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/20 flex flex-col justify-between h-40 hover:scale-[1.02] transition-all relative overflow-hidden">
              <div className="relative z-10 flex justify-between items-start">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest opacity-90">Net Revenue</p>
                <DollarSign className="w-6 h-6 text-white/40" />
              </div>
              <h3 className="text-3xl font-black tracking-tighter relative z-10">{formatCurrency(stats.revenue)}</h3>
              <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
          </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-indigo-900/5 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1 w-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="Search manifest by Trip ID, Customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-4 bg-gray-50 border-none rounded-[1.75rem] focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold text-gray-700 transition-all shadow-inner" />
             </div>
             <button onClick={resetFilters} className="p-4 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-red-500 rounded-[1.5rem] transition-colors" title="Reset All Filters">
                 <RefreshCcw className="w-5 h-5" />
             </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {isSuperAdmin && (
                  <div className="relative group">
                      <select value={corporateFilter} onChange={(e) => { setCorporateFilter(e.target.value); setBranchFilter('All'); }} className="w-full pl-4 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer">
                          <option value="All">All Corporates</option>
                          <option value="admin">Head Office</option>
                          {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                      </select>
                      <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
              )}

              <div className="relative group">
                  <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="w-full pl-4 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer">
                      <option value="All">All Branches</option>
                      {allBranches.filter(b => corporateFilter === 'All' || b.owner === corporateFilter).map(b => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                  </select>
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative group">
                  <select value={originFilter} onChange={(e) => setOriginFilter(e.target.value)} className="w-full pl-4 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer">
                      <option value="All">All Origins</option>
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                      <option value="Call">Call</option>
                      <option value="Whatsapp">Whatsapp</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative group">
                  <select value={fleetFilter} onChange={(e) => setFleetFilter(e.target.value)} className="w-full pl-4 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer">
                      <option value="All">All Fleets</option>
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="Auto">Auto</option>
                      <option value="Prime Luxury">Prime Luxury</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative group">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full pl-4 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer">
                      <option value="All">All Categories</option>
                      <option value="Local Trip">Local Trip</option>
                      <option value="Rental Package">Rental</option>
                      <option value="Outstation Drive">Outstation</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative group">
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full pl-4 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer">
                      <option value="All">All Statuses</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              
              <input 
                type="number" 
                placeholder="Min Comm." 
                value={minCommission}
                onChange={(e) => setMinCommission(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50"
              />

              <input 
                type="number" 
                placeholder="Min GST" 
                value={minTax}
                onChange={(e) => setMinTax(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
          </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-indigo-900/5 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                      <tr>
                          <th className="px-10 py-8">Trip Manifest</th>
                          {isSuperAdmin && <th className="px-10 py-8 text-center">Assigned Entity</th>}
                          <th className="px-10 py-8">Customer Details</th>
                          <th className="px-10 py-8 text-right">Net Revenue</th>
                          <th className="px-10 py-8 text-right text-indigo-600">Commission</th>
                          <th className="px-10 py-8 text-center">Status</th>
                          <th className="px-10 py-8 text-right">Operations</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {filteredTrips.map(trip => (
                          <tr key={trip.id} className="hover:bg-gray-50/50 transition-all group">
                              <td className="px-10 py-8">
                                  <div className="flex items-center gap-5">
                                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem] border border-indigo-100 shadow-sm"><MapIcon className="w-6 h-6"/></div>
                                      <div>
                                          <p className="font-black text-gray-900 text-lg leading-none mb-2">{trip.tripId}</p>
                                          <div className="flex flex-col gap-1">
                                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                                  <CalendarIcon className="w-3.5 h-3.5"/> {trip.date} • {trip.transportType}
                                              </p>
                                              <p className="text-[9px] text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded w-fit">{trip.bookingType}</p>
                                          </div>
                                      </div>
                                  </div>
                              </td>
                              {isSuperAdmin && (
                                  <td className="px-10 py-8 text-center">
                                      <span className="px-4 py-2 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-xl border border-indigo-100 tracking-widest">{trip.ownerName}</span>
                                  </td>
                              )}
                              <td className="px-10 py-8">
                                  <p className="font-bold text-gray-800 text-base mb-1">{trip.userName}</p>
                                  <p className="text-xs text-gray-500 font-mono tracking-tighter">{trip.userMobile}</p>
                              </td>
                              <td className="px-10 py-8 text-right">
                                  <p className="font-black text-gray-900 text-xl leading-none mb-1.5">{formatCurrency(trip.totalPrice)}</p>
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                      GST: {formatCurrency(trip.tax)}
                                  </p>
                              </td>
                              <td className="px-10 py-8 text-right font-black text-indigo-600">
                                  {formatCurrency(trip.adminCommission)}
                              </td>
                              <td className="px-10 py-8 text-center">
                                  <span className={`px-5 py-2.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${
                                      trip.bookingStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                      'bg-rose-50 text-rose-700 border-rose-100'
                                  }`}>
                                      {trip.bookingStatus}
                                  </span>
                              </td>
                              <td className="px-10 py-8 text-right">
                                  <div className="flex justify-end gap-3">
                                      <button onClick={() => handleEdit(trip)} className="p-4 hover:bg-white rounded-2xl text-gray-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100 hover:shadow-lg"><Edit2 className="w-5 h-5"/></button>
                                      <button onClick={() => handleDelete(trip)} className="p-4 hover:bg-white rounded-2xl text-gray-400 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100 hover:shadow-lg"><Trash2 className="w-5 h-5"/></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                      {filteredTrips.length === 0 && (
                          <tr><td colSpan={7} className="py-40 text-center"><div className="flex flex-col items-center gap-4 text-gray-200"><MapIcon className="w-20 h-20 opacity-10" /><p className="font-black uppercase tracking-[0.5em] text-sm">Empty Manifest</p></div></td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* --- NEW TRIP MODAL --- */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-300 overflow-hidden border border-white">
                  
                  <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 shrink-0">
                      <div>
                        <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{editingId ? 'Modify Trip' : 'Register New Trip'}</h3>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2">Strategic Fleet Operations Entry</p>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-5 bg-white border border-gray-100 rounded-[2rem] text-gray-400 hover:text-rose-500 transition-all shadow-sm transform active:scale-90">
                          <X className="w-10 h-10" />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                      <div className="flex flex-col lg:flex-row gap-16">
                          
                          <div className="lg:w-[35%] space-y-12">
                              <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-3 border-l-4 border-emerald-500 pl-4">
                                  <MapPin className="w-4 h-4" /> Trip Identification
                              </h4>
                              <div className="space-y-8">
                                  {isSuperAdmin && (
                                      <div className="space-y-2">
                                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Assign to Franchise/HO</label>
                                          <div className="relative">
                                            <select name="ownerId" value={formData.ownerId} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-gray-800 shadow-inner appearance-none transition-all">
                                                <option value="admin">Head Office</option>
                                                {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                          </div>
                                      </div>
                                  )}
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Operating Branch</label>
                                      <div className="relative">
                                        <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-gray-800 shadow-inner appearance-none transition-all">
                                            <option value="">Select Branch Location</option>
                                            {allBranches.filter(b => b.owner === formData.ownerId).map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Unique Trip ID *</label>
                                          <input name="tripId" placeholder="TRP-XXXX" value={formData.tripId} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-gray-800 shadow-inner placeholder:opacity-30" />
                                      </div>
                                      <div className="space-y-2">
                                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Dispatch Date *</label>
                                          <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-gray-800 shadow-inner" />
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Booking Origin *</label>
                                          <select name="bookingType" value={formData.bookingType} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none font-black text-gray-800 shadow-inner appearance-none">
                                              <option value="Online">Online App</option>
                                              <option value="Offline">Offline Walk-in</option>
                                              <option value="Call">Direct Call</option>
                                              <option value="Whatsapp">WhatsApp</option>
                                              <option value="Test Order">System Test</option>
                                          </select>
                                      </div>
                                      <div className="space-y-2">
                                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Order Priority</label>
                                          <select name="orderType" value={formData.orderType} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none font-black text-gray-800 shadow-inner appearance-none">
                                              <option>Scheduled</option>
                                              <option>Immediate</option>
                                          </select>
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Fleet Category *</label>
                                      <select name="transportType" value={formData.transportType} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none font-black text-gray-800 shadow-inner appearance-none">
                                          <option>Sedan</option>
                                          <option>SUV</option>
                                          <option>Auto</option>
                                          <option>Prime Luxury</option>
                                      </select>
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Trip Classification *</label>
                                      <select name="tripCategory" value={formData.tripCategory} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none font-black text-gray-800 shadow-inner appearance-none">
                                          <option>Local Trip</option>
                                          <option>Rental Package</option>
                                          <option>Outstation Drive</option>
                                      </select>
                                  </div>
                                  <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Final Status *</label>
                                          <select name="bookingStatus" value={formData.bookingStatus} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none font-black text-gray-800 shadow-inner appearance-none">
                                              <option>Completed</option>
                                              <option>Cancelled</option>
                                          </select>
                                      </div>
                                      {formData.bookingStatus === 'Cancelled' && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-[10px] font-black text-rose-500 uppercase ml-2">Cancelled By</label>
                                            <select name="cancelBy" value={formData.cancelBy} onChange={handleInputChange} className="w-full p-5 bg-rose-50 border border-rose-100 rounded-[1.5rem] outline-none font-black text-rose-700 shadow-inner appearance-none">
                                                <option value="-">-</option>
                                                <option value="Head Office">Head Office</option>
                                                <option value="Admin Branch">Admin Branch</option>
                                                <option value="Admin User">Admin User</option>
                                                <option value="Driver">Driver</option>
                                            </select>
                                        </div>
                                      )}
                                  </div>
                              </div>
                          </div>

                          <div className="lg:w-[35%] space-y-12">
                              <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-3 border-l-4 border-blue-500 pl-4">
                                  <User className="w-4 h-4" /> Stakeholders
                              </h4>
                              <div className="space-y-8">
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Customer Full Name *</label>
                                      <input name="userName" placeholder="Lead Name" value={formData.userName} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-gray-800 shadow-inner" />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Customer Contact *</label>
                                      <input name="userMobile" placeholder="+91..." value={formData.userMobile} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-gray-800 shadow-inner font-mono" />
                                  </div>
                                  <div className="pt-10 border-t border-gray-100 space-y-8">
                                      <div className="space-y-2">
                                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Driver Assignment</label>
                                          <input name="driverName" placeholder="Operator Name" value={formData.driverName} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-gray-800 shadow-inner" />
                                      </div>
                                      <div className="space-y-2">
                                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Driver Contact</label>
                                          <input name="driverMobile" placeholder="+91..." value={formData.driverMobile} onChange={handleInputChange} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-gray-800 shadow-inner font-mono" />
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Strategic Remarks</label>
                                      <textarea name="remarks" placeholder="Add operational notes here..." value={formData.remarks} onChange={handleInputChange} rows={4} className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-gray-700 shadow-inner resize-none transition-all leading-relaxed" />
                                  </div>
                              </div>
                          </div>

                          <div className="lg:w-[30%]">
                              <div className="bg-gray-50/50 rounded-[4rem] p-10 border border-gray-100 shadow-inner h-full flex flex-col">
                                  <h4 className="text-[11px] font-black text-purple-600 uppercase tracking-[0.3em] flex items-center gap-3 mb-10 border-l-4 border-purple-500 pl-4">
                                      <Calculator className="w-4 h-4" /> Financial Matrix
                                  </h4>
                                  
                                  <div className="space-y-8 flex-1">
                                      <div className="space-y-2">
                                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Base Trip Price (₹) *</label>
                                          <input type="number" name="tripPrice" value={formData.tripPrice} onChange={handleInputChange} className="w-full p-6 bg-white border-2 border-gray-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-purple-500/10 font-black text-gray-900 shadow-xl shadow-indigo-900/5 text-xl" />
                                      </div>

                                      {financials.isCancelled ? (
                                          <div className="space-y-2 animate-in fade-in">
                                              <label className="text-[10px] font-black text-rose-500 uppercase ml-2">Cancellation Charge (₹) *</label>
                                              <input type="number" name="cancellationCharge" value={formData.cancellationCharge} onChange={handleInputChange} className="w-full p-6 bg-white border-2 border-rose-100 rounded-[2rem] outline-none font-black text-rose-700 shadow-sm text-xl" />
                                          </div>
                                      ) : (
                                          <>
                                              <div className="grid grid-cols-2 gap-6 animate-in fade-in">
                                                  <div className="space-y-2">
                                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2">GST %</label>
                                                      <input type="number" name="taxPercentage" value={formData.taxPercentage} onChange={handleInputChange} className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/10 font-black text-gray-800 shadow-sm" />
                                                  </div>
                                                  <div className="space-y-2">
                                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2">GST Amt</label>
                                                      <div className="w-full p-4 bg-gray-100/50 rounded-2xl font-black text-gray-400 border border-gray-100 text-sm">{formatCurrency(financials.taxAmt)}</div>
                                                  </div>
                                              </div>

                                              <div className="grid grid-cols-2 gap-6 animate-in fade-in">
                                                  <div className="space-y-2">
                                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Wait/Other Chg.</label>
                                                      <input type="number" name="waitingCharge" value={formData.waitingCharge} onChange={handleInputChange} className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-800 shadow-sm" />
                                                  </div>
                                                  <div className="space-y-2">
                                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Discount</label>
                                                      <input type="number" name="discount" value={formData.discount} onChange={handleInputChange} className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-800 shadow-sm" />
                                                  </div>
                                              </div>
                                              
                                              <div className="space-y-2 animate-in fade-in">
                                                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Late Cancel Chg.</label>
                                                  <input type="number" name="cancellationCharge" value={formData.cancellationCharge} onChange={handleInputChange} className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-800 shadow-sm" />
                                              </div>
                                          </>
                                      )}

                                      <div className="pt-10 border-t-2 border-dashed border-gray-200">
                                          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-4 text-center">Net Total Price</p>
                                          <div className="bg-emerald-600 rounded-[3rem] p-10 text-center shadow-2xl shadow-emerald-900/30 group">
                                              <h3 className="text-5xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform">{formatCurrency(financials.total)}</h3>
                                              <p className="text-[9px] text-emerald-100 font-bold uppercase tracking-[0.2em] mt-3 opacity-60">
                                                  {financials.isCancelled ? 'Trip + Cancellation Logic' : 'Full Invoice Calculation'}
                                              </p>
                                          </div>
                                      </div>

                                      <div className="pt-10 space-y-6 animate-in fade-in">
                                          <div className="grid grid-cols-2 gap-6">
                                              <div className="space-y-2">
                                                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Admin Comm %</label>
                                                  <input type="number" name="adminCommissionPercentage" value={formData.adminCommissionPercentage} onChange={handleInputChange} disabled={financials.isCancelled} className={`w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none font-black text-gray-800 shadow-sm transition-all ${financials.isCancelled ? 'opacity-30 bg-gray-50 cursor-not-allowed' : 'focus:ring-4 focus:ring-purple-500/10'}`} />
                                              </div>
                                              <div className="space-y-2">
                                                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Comm. Earned</label>
                                                  <div className="w-full p-4 bg-indigo-50/50 rounded-2xl font-black text-indigo-600 border border-indigo-100 text-sm shadow-inner">{formatCurrency(financials.commAmt)}</div>
                                              </div>
                                          </div>
                                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center leading-relaxed">
                                              {financials.isCancelled ? 'Cancel Charge Earned' : 'Calculated on (Base + Wait) + Cancel - Disc'}
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-10 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-6 shrink-0">
                      <button onClick={() => setIsModalOpen(false)} className="px-14 py-5 bg-white border-2 border-gray-200 text-gray-500 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all shadow-sm">Discard Changes</button>
                      <button onClick={handleSave} className="px-20 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-emerald-900/30 transition-all transform active:scale-95 flex items-center gap-3">
                          <Save className="w-6 h-6" /> Save Manifest
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
