
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  Users, UserCheck, UserX, MapPin, ArrowRight, Building2, Car, TrendingUp, 
  DollarSign, Clock, BarChart3, Calendar, Truck, CheckCircle, Headset, 
  Bike, AlertCircle, Check, X, Wallet, Calculator, Zap, RefreshCcw,
  FileText, Map
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, Enquiry, Branch, CorporateAccount, TravelAllowanceRequest, SalaryAdvanceRequest, UserRole } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { sendSystemNotification } from '../../services/cloudService';

interface ExtendedEmployee extends Employee {
    corporateId: string;
    corporateName: string;
}

interface ExtendedEnquiry extends Enquiry {
    assignedCorporate?: string;
    assignedBranch?: string;
}

interface Trip {
    id: string;
    tripId: string;
    date: string;
    branch: string;
    bookingStatus: string;
    totalPrice: number;
    userName: string;
    transportType: string;
    ownerId?: string;
    ownerName?: string;
}

interface DashboardAction {
    id: string;
    type: 'TA_CLAIM' | 'SALARY_ADVANCE';
    employeeName: string;
    employeeId: string;
    amount: number;
    date: string;
    details: string;
    corporateId: string;
    originalData: any;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- State ---
  const [filterCorporate, setFilterCorporate] = useState<string>('All');
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [filterType, setFilterType] = useState<'Daily' | 'Monthly'>('Daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<ExtendedEmployee[]>([]);
  const [enquiries, setEnquiries] = useState<ExtendedEnquiry[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pendingActions, setPendingActions] = useState<DashboardAction[]>([]);
  const [refreshToggle, setRefreshToggle] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [franchiseName, setFranchiseName] = useState('Head Office');

  // --- Data Loading Logic ---
  const loadAllData = useCallback(() => {
    // 1. Corporates
    const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
    setCorporates(corps);
    
    // 2. Franchise Name
    if (isSuperAdmin) setFranchiseName('Head Office Panel');
    else {
        const myCorp = corps.find((c: any) => c.email === sessionId);
        setFranchiseName(myCorp ? myCorp.companyName : 'Franchise Panel');
    }

    // 3. Branches
    let loadedBranches: any[] = [];
    if (isSuperAdmin) {
        const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
        loadedBranches = [...adminBranches.map((b: any) => ({...b, corporateId: 'admin'}))];
        corps.forEach((c: any) => {
            const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
            loadedBranches = [...loadedBranches, ...cBranches.map((b: any) => ({...b, corporateId: c.email}))];
        });
    } else {
        const key = `branches_data_${sessionId}`;
        const saved = localStorage.getItem(key);
        if (saved) loadedBranches = JSON.parse(saved).map((b: any) => ({...b, corporateId: sessionId}));
    }
    setBranches(loadedBranches);

    // 4. Employees - FILTERED FOR FRANCHISE
    let allEmployees: ExtendedEmployee[] = [];
    const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
    allEmployees = [...adminStaff.map((e:any) => ({...e, corporateId: 'admin', corporateName: 'Head Office'}))];
    corps.forEach((corp: any) => {
        const corpStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]');
        allEmployees = [...allEmployees, ...corpStaff.map((e:any) => ({...e, corporateId: corp.email, corporateName: corp.companyName}))];
    });
    
    // Scoping for Dashboard
    const scopedEmployees = isSuperAdmin ? allEmployees : allEmployees.filter(e => e.corporateId === sessionId);
    setEmployees(scopedEmployees);

    // 5. Enquiries - FILTERED FOR FRANCHISE
    const enqsRaw: Enquiry[] = JSON.parse(localStorage.getItem('global_enquiries_data') || '[]');
    const scopedEnqs = isSuperAdmin ? enqsRaw : enqsRaw.filter(e => e.assignedCorporate === sessionId);
    setEnquiries(scopedEnqs);

    // 6. Trips
    let allTrips: Trip[] = [];
    const adminTrips = JSON.parse(localStorage.getItem('trips_data') || '[]');
    allTrips = [...adminTrips.map((t: any) => ({...t, ownerId: 'admin', ownerName: 'Head Office'}))];
    corps.forEach((c: any) => {
        const cTrips = JSON.parse(localStorage.getItem(`trips_data_${c.email}`) || '[]');
        allTrips = [...allTrips, ...cTrips.map((t: any) => ({...t, ownerId: c.email, ownerName: c.companyName}))];
    });
    const scopedTrips = isSuperAdmin ? allTrips : allTrips.filter(t => t.ownerId === sessionId);
    setTrips(scopedTrips);

    // 7. Action Center Items
    let actions: DashboardAction[] = [];
    
    // TA Claims
    const taRequests: TravelAllowanceRequest[] = JSON.parse(localStorage.getItem('global_travel_requests') || '[]');
    taRequests.filter(r => r.status === 'Pending').forEach(r => {
        if (isSuperAdmin || r.corporateId === sessionId) {
            actions.push({
                id: r.id,
                type: 'TA_CLAIM',
                employeeName: r.employeeName,
                employeeId: r.employeeId,
                amount: r.totalAmount,
                date: r.date,
                details: `${r.totalKm} KM journey`,
                corporateId: r.corporateId,
                originalData: r
            });
        }
    });

    // Salary Advances
    const advRequests: SalaryAdvanceRequest[] = JSON.parse(localStorage.getItem('salary_advances') || '[]');
    advRequests.filter(r => r.status === 'Pending').forEach(r => {
        const emp = allEmployees.find(e => e.id === r.employeeId);
        const corpId = emp?.corporateId || 'admin';

        if (isSuperAdmin || corpId === sessionId) {
            actions.push({
                id: r.id,
                type: 'SALARY_ADVANCE',
                employeeName: r.employeeName,
                employeeId: r.employeeId,
                amount: r.amountRequested,
                date: r.requestDate.split('T')[0],
                details: r.reason,
                corporateId: corpId,
                originalData: r
            });
        }
    });

    setPendingActions(actions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [isSuperAdmin, sessionId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData, refreshToggle]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter Listeners
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
        if (!e.key || e.key.includes('requests') || e.key.includes('advances') || e.key.includes('staff')) {
            loadAllData();
        }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadAllData]);

  const dashboardFilterBranches = useMemo(() => {
    if (filterCorporate === 'All') return branches;
    return branches.filter(b => (b as any).corporateId === filterCorporate);
  }, [branches, filterCorporate]);

  // --- Handlers ---
  const handleQuickAction = async (actionId: string, type: DashboardAction['type'], newStatus: 'Approved' | 'Rejected') => {
      if (!window.confirm(`Are you sure you want to ${newStatus.toLowerCase()} this request?`)) return;

      if (type === 'TA_CLAIM') {
          const key = 'global_travel_requests';
          const all: TravelAllowanceRequest[] = JSON.parse(localStorage.getItem(key) || '[]');
          const updated = all.map(r => r.id === actionId ? { ...r, status: newStatus } : r);
          localStorage.setItem(key, JSON.stringify(updated));

          const req = all.find(r => r.id === actionId);
          if (req) {
              await sendSystemNotification({
                  type: 'system',
                  title: `KM Claim ${newStatus}`,
                  message: `Your travel allowance request for ${req.date} was ${newStatus.toLowerCase()}.`,
                  targetRoles: [UserRole.EMPLOYEE],
                  employeeId: req.employeeId,
                  link: '/user/km-claims'
              });
          }
      } else {
          const key = 'salary_advances';
          const all: SalaryAdvanceRequest[] = JSON.parse(localStorage.getItem(key) || '[]');
          const updated = all.map(r => r.id === actionId ? { 
            ...r, 
            status: newStatus, 
            amountApproved: newStatus === 'Approved' ? r.amountRequested : 0 
          } : r);
          localStorage.setItem(key, JSON.stringify(updated));

          const req = all.find(r => r.id === actionId);
          if (req) {
              await sendSystemNotification({
                  type: 'system',
                  title: `Salary Advance ${newStatus}`,
                  message: `Your advance request for ₹${req.amountRequested} was ${newStatus.toLowerCase()}.`,
                  targetRoles: [UserRole.EMPLOYEE],
                  employeeId: req.employeeId,
                  link: '/user/salary'
              });
          }
      }

      // Sync and UI Refresh
      window.dispatchEvent(new Event('storage'));
      setRefreshToggle(v => v + 1);
      alert(`Successfully ${newStatus.toLowerCase()}!`);
  };

  // --- Stats Calculation ---
  const statsSummary = useMemo(() => {
    const totalStaff = employees.length;
    const pendingCount = pendingActions.length;
    const conversions = enquiries.filter(e => e.status === 'Booked' || e.status === 'Completed').length;
    return { totalStaff, pendingCount, conversions };
  }, [employees, pendingActions, enquiries]);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
              <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-200 text-xs font-black uppercase tracking-[0.2em]">Management Terminal</span>
              </div>
              <h1 className="text-4xl font-black tracking-tighter">{franchiseName}</h1>
              <p className="text-emerald-100 text-sm mt-2 opacity-80 font-medium">Real-time business vitals and workforce activity.</p>
          </div>
          <div className="text-right bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/20 shadow-inner">
              <div className="text-5xl font-black tracking-tighter tabular-nums leading-none">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[10px] text-emerald-200 mt-2 uppercase font-black tracking-[0.3em]">
                  {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dashboard Main Stats */}
          <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* HIDE STAFF COUNT KPI FOR FRANCHISE PANEL AS REQUESTED */}
                  {isSuperAdmin && (
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-36">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Staff</p>
                        <div className="flex justify-between items-end">
                            <h3 className="text-3xl font-black text-gray-800">{statsSummary.totalStaff}</h3>
                            <Users className="w-6 h-6 text-emerald-500 opacity-20" />
                        </div>
                    </div>
                  )}
                  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-36">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enquiry Convs.</p>
                      <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-black text-blue-600">{statsSummary.conversions}</h3>
                        <TrendingUp className="w-6 h-6 text-blue-500 opacity-20" />
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-36">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Branches</p>
                      <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-black text-purple-600">{branches.length}</h3>
                        <Building2 className="w-6 h-6 text-purple-500 opacity-20" />
                      </div>
                  </div>
                  {/* If not admin, show assigned trips instead to maintain balance */}
                  {!isSuperAdmin && (
                      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-36">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Trips</p>
                        <div className="flex justify-between items-end">
                            <h3 className="text-3xl font-black text-emerald-600">{trips.length}</h3>
                            <Truck className="w-6 h-6 text-emerald-500 opacity-20" />
                        </div>
                    </div>
                  )}
              </div>

              {/* Chart Section */}
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-500" /> System Activity
                    </h3>
                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                  </div>
                  <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                    <div className="relative">
                        <Zap className="w-24 h-24 opacity-5 group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-emerald-400/5 blur-3xl rounded-full"></div>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest mt-4">Activity visualizer active</p>
                  </div>
              </div>

              {/* Quick Launch */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                      { icon: Map, label: 'Trip Logs', path: '/admin/trips', color: 'bg-blue-50 text-blue-600' },
                      { icon: Users, label: 'Staff List', path: '/admin/staff', color: 'bg-emerald-50 text-emerald-600' },
                      { icon: FileText, label: 'Enquiries', path: '/admin/customer-care', color: 'bg-indigo-50 text-indigo-600' },
                      { icon: Wallet, label: 'Payments', path: '/admin/driver-payments', color: 'bg-orange-50 text-orange-600' }
                  ].map((btn, i) => (
                      <button 
                        key={i} 
                        onClick={() => navigate(btn.path)}
                        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-3"
                      >
                          <div className={`p-2 rounded-xl ${btn.color}`}><btn.icon className="w-5 h-5" /></div>
                          <span className="text-[10px] font-black uppercase text-gray-500">{btn.label}</span>
                      </button>
                  ))}
              </div>
          </div>

          {/* ACTION CENTER - The Instant Approval Panel */}
          <div className="lg:col-span-1 flex flex-col">
              <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl flex flex-col h-[650px] overflow-hidden sticky top-6">
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${pendingActions.length > 0 ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>
                              {pendingActions.length > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                          </div>
                          <div>
                              <h3 className="font-black text-gray-900 tracking-tight">Action Center</h3>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pending: {pendingActions.length}</p>
                          </div>
                      </div>
                      <button 
                        onClick={() => setRefreshToggle(v => v + 1)}
                        className="p-2.5 bg-white hover:bg-gray-100 rounded-xl transition-all border border-gray-200 text-gray-400 hover:text-emerald-600 shadow-sm"
                      >
                          <RefreshCcw className="w-4 h-4" />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/30">
                      {pendingActions.length > 0 ? pendingActions.map((action) => (
                          <div key={action.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-right-4 duration-500">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${action.type === 'TA_CLAIM' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-600'}`}>
                                          {action.type === 'TA_CLAIM' ? <Bike className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                                      </div>
                                      <div className="min-w-0 max-w-[140px]">
                                          <h4 className="font-black text-gray-800 text-sm leading-tight truncate">{action.employeeName}</h4>
                                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 truncate">{action.type === 'TA_CLAIM' ? 'KM Claim' : 'Salary Advance'}</p>
                                      </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                      <p className={`text-lg font-black ${action.type === 'TA_CLAIM' ? 'text-emerald-600' : 'text-blue-600'}`}>₹{action.amount.toLocaleString()}</p>
                                      <p className="text-[9px] text-gray-400 font-bold uppercase">{action.date}</p>
                                  </div>
                              </div>
                              
                              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 mb-4">
                                  <p className="text-xs text-gray-500 line-clamp-2 italic font-medium leading-relaxed">
                                      "{action.details}"
                                  </p>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                  <button 
                                      onClick={() => handleQuickAction(action.id, action.type, 'Approved')}
                                      className="py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-900/10 transform active:scale-95 transition-all"
                                  >
                                      <Check className="w-4 h-4" /> Approve
                                  </button>
                                  <button 
                                      onClick={() => handleQuickAction(action.id, action.type, 'Rejected')}
                                      className="py-3 bg-white border border-rose-100 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-50 transform active:scale-95 transition-all shadow-sm"
                                  >
                                      <X className="w-4 h-4" /> Reject
                                  </button>
                              </div>
                          </div>
                      )) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-400 mb-6">
                                  <CheckCircle className="w-12 h-12" />
                              </div>
                              <h4 className="text-gray-900 font-black tracking-tight text-lg">All Caught Up!</h4>
                              <p className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-widest">No pending approvals found at this moment.</p>
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-gray-50 bg-white shrink-0">
                      <button 
                        onClick={() => navigate('/admin/km-claims')}
                        className="w-full py-4 text-emerald-600 font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-emerald-50 rounded-2xl transition-all border border-transparent hover:border-emerald-100"
                      >
                          Management Portal <ArrowRight className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
