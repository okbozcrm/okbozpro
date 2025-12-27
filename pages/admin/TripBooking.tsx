
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
  
  const [trips, setTrips] = useState<Trip[]>(() => {
    if (isSuperAdmin) {
        let allTrips: Trip[] = [];
        try {
            const adminData = JSON.parse(localStorage.getItem('trips_data') || '[]');
            allTrips = [...allTrips, ...adminData.map((t: any) => ({...t, ownerId: 'admin', ownerName: 'Head Office'}))];
        } catch(e) {}
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [corporateFilter, setCorporateFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

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

  useEffect(() => {
    if (isSuperAdmin) {
        const headOfficeTrips = trips.filter(t => t.ownerId === 'admin');
        const cleanTrips = headOfficeTrips.map(({ownerId, ownerName, ...rest}: any) => rest);
        localStorage.setItem('trips_data', JSON.stringify(cleanTrips));
    } else {
        const key = `trips_data_${sessionId}`;
        const cleanTrips = trips.map(({ownerId, ownerName, ...rest}: any) => rest);
        localStorage.setItem(key, JSON.stringify(cleanTrips));
    }
  }, [trips, isSuperAdmin, sessionId]);

  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchesSearch = t.tripId.toLowerCase().includes(searchTerm.toLowerCase()) || t.userName.toLowerCase().includes(searchTerm.toLowerCase()) || t.userMobile.includes(searchTerm);
      const matchesStatus = statusFilter === 'All' || t.bookingStatus === statusFilter;
      const matchesBranch = branchFilter === 'All' || t.branch === branchFilter;
      let matchesCorporate = true;
      if (isSuperAdmin) {
          matchesCorporate = corporateFilter === 'All' || t.ownerId === corporateFilter;
      } else {
          matchesCorporate = t.ownerId === sessionId;
      }
      const tripDate = t.date;
      let matchesDate = true;
      if (fromDate && toDate) matchesDate = tripDate >= fromDate && tripDate <= toDate;
      else if (fromDate) matchesDate = tripDate >= fromDate;
      else if (toDate) matchesDate = tripDate <= toDate;
      return matchesSearch && matchesStatus && matchesBranch && matchesCorporate && matchesDate;
    });
  }, [trips, searchTerm, statusFilter, branchFilter, corporateFilter, fromDate, toDate, isSuperAdmin, sessionId]);

  const analytics = useMemo(() => {
    const totalTrips = filteredTrips.length;
    const totalRevenue = filteredTrips.reduce((sum, t) => sum + (t.totalPrice || 0), 0);
    const totalCommission = filteredTrips.reduce((sum, t) => sum + (t.adminCommission || 0), 0);
    const totalTax = filteredTrips.reduce((sum, t) => sum + (t.tax || 0), 0);
    return { totalTrips, totalRevenue, totalCommission, totalTax };
  }, [filteredTrips]);

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
          const newData = { ...prev, [name]: val } as any;
          if (name === 'tripPrice' || name === 'taxPercentage') {
              const price = name === 'tripPrice' ? val : (prev.tripPrice || 0);
              const pct = name === 'taxPercentage' ? val : (prev.taxPercentage || 0);
              newData.tax = (price * pct) / 100;
          }
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

  // FIX: Added missing handleEdit function
  const handleEdit = (trip: Trip) => {
    setEditingId(trip.id);
    setFormData({
      ownerId: trip.ownerId || 'admin',
      branch: trip.branch || '',
      tripId: trip.tripId,
      date: trip.date,
      bookingType: trip.bookingType,
      orderType: trip.orderType,
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
    } as Trip;
    if (editingId) {
      setTrips(prev => prev.map(t => t.id === editingId ? { ...t, ...tripData } : t));
    } else {
      setTrips(prev => [tripData, ...prev]);
    }
    window.dispatchEvent(new Event('cloud-sync-immediate'));
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this trip?")) {
      setTrips(prev => prev.filter(t => t.id !== id));
      window.dispatchEvent(new Event('cloud-sync-immediate'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Trip Booking</h2>
          <p className="text-gray-500">Manage all bookings, commissions and trip details</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </div>
          <div className="flex gap-2">
              <button onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm text-sm"><Plus className="w-4 h-4" /> New Booking</button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase">TOTAL TRIPS</p><h3 className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalTrips}</h3></div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase">REVENUE</p><h3 className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(analytics.totalRevenue)}</h3></div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase">COMMISSION</p><h3 className="text-3xl font-bold text-blue-600 mt-2">{formatCurrency(analytics.totalCommission)}</h3></div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase">TAX</p><h3 className="text-3xl font-bold text-purple-600 mt-2">{formatCurrency(analytics.totalTax)}</h3></div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                   <tr>
                      <th className="px-6 py-4">Trip ID / Date</th>
                      {isSuperAdmin && <th className="px-6 py-4">Agency</th>}
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4 text-right">Total Price</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {filteredTrips.map(trip => (
                      <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                         <td className="px-6 py-4"><div className="font-bold text-gray-900">{trip.tripId}</div><div className="text-xs text-gray-500">{trip.date}</div></td>
                         {isSuperAdmin && (<td className="px-6 py-4"><span className="text-indigo-700 font-medium text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{trip.ownerName}</span></td>)}
                         <td className="px-6 py-4"><div className="font-medium text-gray-900">{trip.userName}</div><div className="text-xs text-gray-500">{trip.userMobile}</div></td>
                         <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(trip.totalPrice)}</td>
                         <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold border ${trip.bookingStatus === 'Completed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>{trip.bookingStatus}</span></td>
                         <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleEdit(trip)} className="text-gray-400 hover:text-emerald-600"><Edit2 className="w-4 h-4"/></button><button onClick={() => handleDelete(trip.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button></div></td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl"><h3 className="font-bold text-gray-800 text-xl">{editingId ? 'Edit Trip' : 'New Trip Booking'}</h3><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button></div>
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <input name="tripId" placeholder="Trip ID *" value={formData.tripId} onChange={handleInputChange} className="p-2 border rounded-lg" required />
                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="p-2 border rounded-lg" required />
                 </div>
                 <input name="userName" placeholder="Customer Name *" value={formData.userName} onChange={handleInputChange} className="w-full p-2 border rounded-lg" required />
                 <input name="userMobile" placeholder="Customer Mobile *" value={formData.userMobile} onChange={handleInputChange} className="w-full p-2 border rounded-lg" required />
                 <div className="grid grid-cols-2 gap-4">
                    <input type="number" name="tripPrice" placeholder="Trip Price" value={formData.tripPrice} onChange={handleFinancialChange} className="p-2 border rounded-lg" />
                    <select name="bookingStatus" value={formData.bookingStatus} onChange={handleInputChange} className="p-2 border rounded-lg bg-white"><option>Pending</option><option>Completed</option><option>Cancelled</option></select>
                 </div>
                 <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all">Save Trip</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
