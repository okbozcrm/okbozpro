import React, { useMemo, useState, useEffect } from 'react';
import { Users, UserCheck, UserX, MapPin, ArrowRight, Building2, Car, TrendingUp, DollarSign, Clock, BarChart3, Calendar, Truck, CheckCircle, Headset } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, Enquiry, Branch, CorporateAccount } from '../../types';
import { useTheme } from '../../context/ThemeContext';

// Extended interfaces for internal mapping
interface ExtendedEmployee extends Employee {
    corporateId: string; // 'admin' or corporate email
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- 1. Global Filter States ---
  const [filterCorporate, setFilterCorporate] = useState<string>('All');
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [filterType, setFilterType] = useState<'Daily' | 'Monthly'>('Daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // --- 2. Data Loading States ---
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<ExtendedEmployee[]>([]);
  const [enquiries, setEnquiries] = useState<ExtendedEnquiry[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  
  // Real-time update trigger
  const [refreshToggle, setRefreshToggle] = useState(0);

  // --- Clock & Greeting State ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [franchiseName, setFranchiseName] = useState('Head Office');

  // FIX: Added dashboardFilterBranches memo to resolve "Cannot find name 'dashboardFilterBranches'" error
  const dashboardFilterBranches = useMemo(() => {
    if (filterCorporate === 'All') return branches;
    return branches.filter(b => (b as any).corporateId === filterCorporate);
  }, [branches, filterCorporate]);

  // Sync Logic
  useEffect(() => {
    const triggerRefresh = () => {
        setRefreshToggle(v => v + 1);
    };
    
    const handleStorage = (e: StorageEvent) => {
        // Broaden the check to catch any attendance update
        if (!e.key || e.key.includes('attendance_data') || e.key.includes('trips_data') || e.key.includes('enquiries')) {
            triggerRefresh();
        }
    };
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('attendance-updated', triggerRefresh);
    
    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('attendance-updated', triggerRefresh);
    };
  }, []);

  // Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine Franchise Name
  useEffect(() => {
    if (isSuperAdmin) {
        setFranchiseName('Head Office Panel');
    } else {
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            const myCorp = corps.find((c: CorporateAccount) => c.email === sessionId);
            if (myCorp) {
                setFranchiseName(`${myCorp.companyName}`);
            } else {
                setFranchiseName('Franchise Panel');
            }
        } catch (e) {
            setFranchiseName('Franchise Panel');
        }
    }
  }, [isSuperAdmin, sessionId]);

  const getGreeting = () => {
      const hour = currentTime.getHours();
      if (hour < 12) return 'Good Morning';
      if (hour < 17) return 'Good Afternoon';
      return 'Good Evening';
  };

  // --- 3. Initial Data Fetching ---
  useEffect(() => {
    // A. Load Corporates
    if (isSuperAdmin) {
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            setCorporates(corps);
        } catch (e) {}
    }

    // B. Load Branches
    try {
        let loadedBranches: any[] = [];
        if (isSuperAdmin) {
            const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
            loadedBranches = [...adminBranches.map((b: any) => ({...b, corporateId: 'admin'}))];
            
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
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
    } catch(e) {}

    // C. Load Employees
    let allEmployees: ExtendedEmployee[] = [];
    if (isSuperAdmin) {
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { allEmployees = [...allEmployees, ...JSON.parse(adminData).map((e:any) => ({...e, corporateId: 'admin', corporateName: 'Head Office'}))]; } catch (e) {}
        }
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corps.forEach((corp: any) => {
            const corpData = localStorage.getItem(`staff_data_${corp.email}`);
            if (corpData) {
                try {
                    allEmployees = [...allEmployees, ...JSON.parse(corpData).map((e:any) => ({...e, corporateId: corp.email, corporateName: corp.companyName}))];
                } catch (e) {}
            }
        });
    } else {
        const key = `staff_data_${sessionId}`; 
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                allEmployees = JSON.parse(saved).map((e:any) => ({...e, corporateId: sessionId, corporateName: 'My Branch'}));
            }
        } catch(e) {}
    }
    setEmployees(allEmployees);

    // D. Load Vehicle Enquiries
    try {
        const enqs: Enquiry[] = JSON.parse(localStorage.getItem('global_enquiries_data') || '[]');
        if (isSuperAdmin) {
            setEnquiries(enqs);
        } else {
            const myEnqs = enqs.filter(e => {
               let ownerId = e.assignedCorporate;
               if (!ownerId && e.assignedTo) {
                   const staff = allEmployees.find(s => s.id === e.assignedTo);
                   if (staff) ownerId = staff.corporateId;
               }
               return ownerId === sessionId;
            });
            setEnquiries(myEnqs);
        }
    } catch(e) {}

    // E. Load Trips
    let allTrips: Trip[] = [];
    if (isSuperAdmin) {
        try {
            const adminTrips = JSON.parse(localStorage.getItem('trips_data') || '[]');
            allTrips = [...allTrips, ...adminTrips.map((t: any) => ({...t, ownerId: 'admin', ownerName: 'Head Office'}))];
        } catch(e) {}
        
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corps.forEach((c: any) => {
            const cTrips = localStorage.getItem(`trips_data_${c.email}`);
            if (cTrips) {
                try {
                    allTrips = [...allTrips, ...JSON.parse(cTrips).map((t: any) => ({...t, ownerId: c.email, ownerName: c.companyName}))];
                } catch (e) {}
            }
        });
    } else {
        const key = `trips_data_${sessionId}`;
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                allTrips = JSON.parse(saved).map((t: any) => ({...t, ownerId: sessionId, ownerName: 'My Branch'}));
            }
        } catch(e) {}
    }
    setTrips(allTrips);

    const savedApprovals = localStorage.getItem(`pending_approvals_${sessionId}`);
    if (savedApprovals) setPendingApprovals(JSON.parse(savedApprovals));
    else setPendingApprovals([]);

  }, [isSuperAdmin, sessionId, refreshToggle]);

  // --- 4. Statistics Calculation ---

  const attendanceStats = useMemo(() => {
      if (employees.length === 0) return { present: 0, absent: 0, late: 0, onField: 0 };

      let present = 0, absent = 0, late = 0, onField = 0;
      
      const targetDate = new Date(selectedDate);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();

      // Filtering layer inside stat calc to ensure it respects refreshToggle
      const activeSet = employees.filter(e => {
          const matchCorp = isSuperAdmin ? (filterCorporate === 'All' || e.corporateId === filterCorporate) : true;
          const matchBranch = filterBranch === 'All' || e.branch === filterBranch;
          return matchCorp && matchBranch;
      });

      if (filterType === 'Daily') {
          activeSet.forEach(emp => {
              const key = `attendance_data_${emp.id}_${targetYear}_${targetMonth}`;
              const saved = localStorage.getItem(key);
              // Always use disk data first, then mock if missing
              const data = saved ? JSON.parse(saved) : getEmployeeAttendance(emp, targetYear, targetMonth);
              const record = data.find((d: any) => d.date === selectedDate);
              
              if (record) {
                  if (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.HALF_DAY) {
                      present++;
                      if (record.isLate) late++;
                      if (emp.department === 'Sales' || emp.role.includes('Driver')) onField++;
                  } else if (record.status === AttendanceStatus.ABSENT) {
                      absent++;
                  }
              }
          });
      } else {
          present = activeSet.filter(e => e.status === 'Active').length;
          activeSet.forEach(emp => {
              const [y, m] = selectedMonth.split('-').map(Number);
              const data = getEmployeeAttendance(emp, y, m - 1);
              absent += data.filter(d => d.status === AttendanceStatus.ABSENT).length;
          });
      }

      return { present, absent, late, onField, total: activeSet.length };
  }, [employees, filterType, selectedDate, selectedMonth, filterCorporate, filterBranch, isSuperAdmin, refreshToggle]);

  // Trip Stats
  const tripStats = useMemo(() => {
      const activeTrips = trips.filter(t => {
          const matchCorp = isSuperAdmin ? (filterCorporate === 'All' || t.ownerId === filterCorporate) : true;
          const matchBranch = filterBranch === 'All' || t.branch === filterBranch;
          let matchDate = true;
          if (filterType === 'Daily') matchDate = t.date === selectedDate;
          else matchDate = t.date.startsWith(selectedMonth);
          return matchCorp && matchBranch && matchDate;
      });

      const total = activeTrips.length;
      const completed = activeTrips.filter(t => t.bookingStatus === 'Completed').length;
      const revenue = activeTrips.filter(t => t.bookingStatus === 'Completed').reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0);
      return { total, completed, revenue };
  }, [trips, filterCorporate, filterBranch, filterType, selectedDate, selectedMonth, isSuperAdmin, refreshToggle]);

  // Vehicle Stats
  const vehicleStats = useMemo(() => {
      const activeEnqs = enquiries.filter(e => {
          const matchBranch = filterBranch === 'All' || e.assignedBranch === filterBranch;
          let matchDate = true;
          const enqDate = e.date || e.createdAt.split(',')[0]; 
          if (filterType === 'Daily') matchDate = enqDate === selectedDate;
          else matchDate = enqDate.startsWith(selectedMonth);
          return matchBranch && matchDate;
      });

      const total = activeEnqs.length;
      const booked = activeEnqs.filter(e => e.status === 'Booked' || e.status === 'Order Accepted').length;
      const conversion = total > 0 ? Math.round((booked / total) * 100) : 0;
      const amount = activeEnqs.reduce((sum, e) => {
          if (e.status === 'Booked' || e.status === 'Order Accepted' || e.status === 'Completed') {
              const match = e.details.match(/Estimate: ₹([\d,]+)/) || e.details.match(/₹([\d,]+)/);
              return sum + (match ? parseInt(match[1].replace(/,/g, '')) : (e.estimatedPrice || 0));
          }
          return sum;
      }, 0);

      return { total, booked, conversion, amount };
  }, [enquiries, filterBranch, filterType, selectedDate, selectedMonth, refreshToggle]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center animate-in fade-in slide-in-from-top-4">
          <div>
              <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-200 text-sm font-bold uppercase tracking-wider">{getGreeting()}</span>
              </div>
              <h1 className="text-3xl font-bold">{franchiseName}</h1>
              <p className="text-emerald-100 text-sm mt-1 opacity-90">Welcome back, here is your daily overview.</p>
          </div>
          <div className="text-right mt-4 md:mt-0 bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/20">
              <div className="text-4xl font-mono font-bold tracking-widest leading-none">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs text-emerald-200 mt-1 uppercase font-medium tracking-wide">
                  {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
          </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div><h2 className="text-xl font-bold text-gray-800 dark:text-white">Performance Metrics</h2></div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap gap-2 items-center">
            {isSuperAdmin && (
                <select value={filterCorporate} onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none bg-gray-50 dark:bg-gray-700 dark:text-white">
                    <option value="All">All Corporates</option>
                    <option value="admin">Head Office</option>
                    {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                </select>
            )}
            <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none bg-gray-50 dark:bg-gray-700 dark:text-white">
                <option value="All">All Branches</option>
                {dashboardFilterBranches.map((b, i) => <option key={i} value={b.name}>{b.name}</option>)}
            </select>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1"></div>
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button onClick={() => setFilterType('Daily')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterType === 'Daily' ? 'bg-white dark:bg-gray-600 shadow text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>Daily</button>
                <button onClick={() => setFilterType('Monthly')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterType === 'Monthly' ? 'bg-white dark:bg-gray-600 shadow text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>Monthly</button>
            </div>
            {filterType === 'Daily' ? (
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 dark:text-white" />
            ) : (
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 dark:text-white" />
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendance</p>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                        {filterType === 'Daily' ? `${Math.round((attendanceStats.present / (attendanceStats.total || 1)) * 100)}%` : attendanceStats.present}
                    </h3>
                </div>
                <div className={`p-2 rounded-lg ${attendanceStats.absent > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}><UserCheck className="w-5 h-5" /></div>
            </div>
            <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {attendanceStats.present} Present</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> {attendanceStats.absent} Absent</span>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => navigate('/admin/trips')}>
            <div className="flex justify-between items-start mb-2">
                <div><p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Trips</p><h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{tripStats.total}</h3></div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400"><Truck className="w-5 h-5" /></div>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> {tripStats.completed} Completed</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{tripStats.revenue.toLocaleString()}</span>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div><p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transport Revenue</p><h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">₹{(vehicleStats.amount / 1000).toFixed(1)}k</h3></div>
                <div className="p-2 bg-purple-50 dark:bg-blue-900/20 rounded-lg text-purple-600 dark:text-purple-400"><Car className="w-5 h-5" /></div>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>{vehicleStats.booked} Booked / {vehicleStats.total} Enquiries</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{vehicleStats.conversion}% Conv.</span>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => navigate('/admin/tasks')}>
            <div className="flex justify-between items-start mb-2">
                <div><p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending Tasks</p><h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{pendingApprovals.length}</h3></div>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400"><Clock className="w-5 h-5" /></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Approvals for Leave, Advances, or Profile Edits.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;