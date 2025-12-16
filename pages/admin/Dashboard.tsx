
import React, { useMemo, useState, useEffect } from 'react';
// @google/genai: Add missing import for Headset
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

  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';
  const sessionId = localStorage.getItem('app_session_id') || 'admin';

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
  const [trips, setTrips] = useState<Trip[]>([]); // Added Trips State
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  
  // --- Clock & Greeting State ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [franchiseName, setFranchiseName] = useState('Head Office');

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
    try {
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        setCorporates(corps);
    } catch (e) {}

    // B. Load Branches (Aggregated)
    try {
        let allBranches: any[] = [];
        // Head Office Branches
        const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
        allBranches = [...allBranches, ...adminBranches.map((b: any) => ({...b, corporateId: 'admin'}))];
        
        // Corporate Branches
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corps.forEach((c: any) => {
            const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
            allBranches = [...allBranches, ...cBranches.map((b: any) => ({...b, corporateId: c.email}))];
        });
        setBranches(allBranches);
    } catch(e) {}

    // C. Load Employees (Aggregated)
    let allEmployees: ExtendedEmployee[] = [];
    if (isSuperAdmin) {
        // Admin's own staff
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { allEmployees = [...allEmployees, ...JSON.parse(adminData).map((e:any) => ({...e, corporateId: 'admin', corporateName: 'Head Office'}))]; } catch (e) {}
        } else {
            allEmployees = []; // No mocks
        }
        // Corporate Staff
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
        // Single Corporate/User View
        const sessionId = localStorage.getItem('app_session_id') || 'admin';
        const key = `staff_data_${sessionId}`; 
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                allEmployees = JSON.parse(saved).map((e:any) => ({...e, corporateId: sessionId, corporateName: 'My Branch'}));
            }
        } catch(e) {}
    }
    setEmployees(allEmployees);

    // D. Load Vehicle Enquiries (Aggregated / Global)
    try {
        const enqs = JSON.parse(localStorage.getItem('global_enquiries_data') || '[]');
        setEnquiries(enqs);
    } catch(e) {}

    // E. Load Trips (Aggregated) - NEW
    let allTrips: Trip[] = [];
    if (isSuperAdmin) {
        // Admin Trips
        try {
            const adminTrips = JSON.parse(localStorage.getItem('trips_data') || '[]');
            allTrips = [...allTrips, ...adminTrips.map((t: any) => ({...t, ownerId: 'admin', ownerName: 'Head Office'}))];
        } catch(e) {}
        
        // Corporate Trips
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corps.forEach((c: any) => {
            const cTrips = localStorage.getItem(`trips_data_${c.email}`);
            if (cTrips) {
                try {
                    allTrips = [...allTrips, ...JSON.parse(cTrips).map((t: any) => ({...t, ownerId: c.email, ownerName: c.companyName}))];
                } catch(e) {}
            }
        });
    } else {
        const sessionId = localStorage.getItem('app_session_id') || 'admin';
        const key = `trips_data_${sessionId}`;
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                allTrips = JSON.parse(saved).map((t: any) => ({...t, ownerId: sessionId, ownerName: 'My Branch'}));
            }
        } catch(e) {}
    }
    setTrips(allTrips);

    // F. Pending Leaves (Mock removed)
    const savedApprovals = localStorage.getItem(`pending_approvals_${localStorage.getItem('app_session_id') || 'admin'}`);
    if (savedApprovals) setPendingApprovals(JSON.parse(savedApprovals));
    else setPendingApprovals([]);

  }, [isSuperAdmin]);

  // --- 4. Filtering Logic ---
  
  // Available Branches for Dropdown (Dependent on Selected Corporate)
  const availableBranches = useMemo(() => {
      if (filterCorporate === 'All') return branches; // Show all branches if All Corps selected
      if (filterCorporate === 'admin') return branches.filter(b => (b as any).corporateId === 'admin');
      return branches.filter(b => (b as any).corporateId === filterCorporate);
  }, [branches, filterCorporate]);

  // Filtered Data Sets
  const filteredEmployees = useMemo(() => {
      return employees.filter(e => {
          const matchCorp = filterCorporate === 'All' || e.corporateId === filterCorporate;
          const matchBranch = filterBranch === 'All' || e.branch === filterBranch;
          return matchCorp && matchBranch;
      });
  }, [employees, filterCorporate, filterBranch]);

  const filteredTrips = useMemo(() => {
      return trips.filter(t => {
          const matchCorp = filterCorporate === 'All' || t.ownerId === filterCorporate || (filterCorporate === 'admin' && t.ownerId === 'admin');
          const matchBranch = filterBranch === 'All' || t.branch === filterBranch;
          
          let matchDate = true;
          if (filterType === 'Daily') {
              matchDate = t.date === selectedDate;
          } else {
              matchDate = t.date.startsWith(selectedMonth);
          }
          return matchCorp && matchBranch && matchDate;
      });
  }, [trips, filterCorporate, filterBranch, filterType, selectedDate, selectedMonth]);

  const filteredEnquiries = useMemo(() => {
      return enquiries.filter(e => {
          const corpKey = e.assignedCorporate || 'Head Office';
          const branchKey = e.assignedBranch || '';

          // Match Corporate
          let matchCorp = true;
          if (filterCorporate !== 'All') {
              if (filterCorporate === 'admin') matchCorp = corpKey === 'Head Office';
              else matchCorp = corpKey === filterCorporate; // Matches email
          }

          // Match Branch
          const matchBranch = filterBranch === 'All' || branchKey === filterBranch;
          
          // Date Filtering
          let matchDate = true;
          const enqDate = e.date || e.createdAt.split(',')[0]; 
          
          if (filterType === 'Daily') {
              matchDate = enqDate === selectedDate;
          } else {
              matchDate = enqDate.startsWith(selectedMonth);
          }

          return matchCorp && matchBranch && matchDate;
      });
  }, [enquiries, filterCorporate, filterBranch, filterType, selectedDate, selectedMonth]);

  // --- 5. Statistics Calculation ---

  // Attendance Stats
  const attendanceStats = useMemo(() => {
      if (filteredEmployees.length === 0) return { present: 0, absent: 0, late: 0, onField: 0 };

      let present = 0, absent = 0, late = 0, onField = 0;
      
      const targetDate = new Date(selectedDate);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();

      // If Daily View
      if (filterType === 'Daily') {
          filteredEmployees.forEach(emp => {
              const data = getEmployeeAttendance(emp, targetYear, targetMonth);
              const record = data.find(d => d.date === selectedDate);
              
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
          // Monthly View - Simplified Active Count
          present = filteredEmployees.filter(e => e.status === 'Active').length;
          // Calculate total absences in month
          filteredEmployees.forEach(emp => {
              const data = getEmployeeAttendance(emp, parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1);
              absent += data.filter(d => d.status === AttendanceStatus.ABSENT).length;
          });
      }

      return { present, absent, late, onField };
  }, [filteredEmployees, filterType, selectedDate, selectedMonth]);

  // Trip Stats
  const tripStats = useMemo(() => {
      const total = filteredTrips.length;
      const completed = filteredTrips.filter(t => t.bookingStatus === 'Completed').length;
      const revenue = filteredTrips.filter(t => t.bookingStatus === 'Completed').reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0);
      return { total, completed, revenue };
  }, [filteredTrips]);

  // Vehicle Stats (Dynamic Revenue Parsing)
  const vehicleStats = useMemo(() => {
      const total = filteredEnquiries.length;
      const booked = filteredEnquiries.filter(e => e.status === 'Booked' || (e as any).outcome === 'Booked').length;
      const conversion = total > 0 ? Math.round((booked / total) * 100) : 0;
      
      // Attempt to parse revenue from "Total Estimate: ₹XXX" string in details
      const amount = filteredEnquiries.reduce((sum, e) => {
          if (e.status === 'Booked' || (e as any).outcome === 'Booked') {
              const match = e.details.match(/Estimate: ₹([\d,]+)/) || e.details.match(/₹([\d,]+)/);
              if (match) {
                  return sum + parseInt(match[1].replace(/,/g, ''));
              }
              return sum + 2500; // Fallback average if not parsed
          }
          return sum;
      }, 0);

      return { total, booked, conversion, amount };
  }, [filteredEnquiries]);

  // Attendance Chart Data (Weekly Trend)
  const attendanceChartData = useMemo(() => {
      const data = [];
      const baseDate = new Date(selectedDate);
      
      for (let i = 6; i >= 0; i--) {
          const d = new Date(baseDate);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

          // Calculate attendance for this day across filtered employees
          let p = 0;
          filteredEmployees.forEach(emp => {
              const record = getEmployeeAttendance(emp, d.getFullYear(), d.getMonth()).find(r => r.date === dateStr);
              if (record && (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.HALF_DAY)) p++;
          });

          data.push({ name: dayName, present: p });
      }
      return data;
  }, [selectedDate, filteredEmployees]);

  // Vehicle Revenue Chart Data
  const vehicleChartData = useMemo(() => {
      const data = [];
      // Calculate revenue trends for last 6 months
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
          const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
          
          const revenue = filteredEnquiries
              .filter(e => e.createdAt.startsWith(monthStr) && (e.status === 'Booked' || (e as any).outcome === 'Booked'))
              .reduce((sum, e) => {
                  const match = e.details.match(/Estimate: ₹([\d,]+)/) || e.details.match(/₹([\d,]+)/);
                  if (match) {
                      return sum + parseInt(match[1].replace(/,/g, ''));
                  }
                  return sum + 2500;
              }, 0);
          
          data.push({ name: monthLabel, revenue });
      }
      return data;
  }, [filteredEnquiries]);

  return (
    <div className="space-y-6">
      {/* Franchise/Admin Header with Clock */}
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
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Performance Metrics</h2>
        </div>
        
        {/* Global Filter Bar */}
        <div className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap gap-2 items-center">
            {isSuperAdmin && (
                <select 
                    value={filterCorporate}
                    onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none bg-gray-50 dark:bg-gray-700 dark:text-white"
                >
                    <option value="All">All Corporates</option>
                    <option value="admin">Head Office</option>
                    {corporates.map(c => (
                        <option key={c.id} value={c.email}>{c.companyName}</option>
                    ))}
                </select>
            )}
            
            <select 
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none bg-gray-50 dark:bg-gray-700 dark:text-white"
            >
                <option value="All">All Branches</option>
                {availableBranches.map((b, i) => (
                    <option key={i} value={b.name}>{b.name}</option>
                ))}
            </select>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1"></div>

            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button 
                    onClick={() => setFilterType('Daily')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterType === 'Daily' ? 'bg-white dark:bg-gray-600 shadow text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    Daily
                </button>
                <button 
                    onClick={() => setFilterType('Monthly')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterType === 'Monthly' ? 'bg-white dark:bg-gray-600 shadow text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    Monthly
                </button>
            </div>

            {filterType === 'Daily' ? (
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 dark:text-white"
                />
            ) : (
                <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 dark:text-white"
                />
            )}
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Stat */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendance</p>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                        {filterType === 'Daily' ? `${Math.round((attendanceStats.present / (filteredEmployees.length || 1)) * 100)}%` : attendanceStats.present}
                    </h3>
                </div>
                <div className={`p-2 rounded-lg ${attendanceStats.absent > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
                    <UserCheck className="w-5 h-5" />
                </div>
            </div>
            <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {attendanceStats.present} Present</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> {attendanceStats.absent} Absent</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> {attendanceStats.late} Late</span>
            </div>
        </div>

        {/* Trip Booking Stats */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => navigate('/admin/trips')}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Trips</p>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{tripStats.total}</h3>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                    <Truck className="w-5 h-5" />
                </div>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> {tripStats.completed} Completed</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{tripStats.revenue.toLocaleString()}</span>
            </div>
        </div>

        {/* Vehicle Enquiries Stat */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transport Revenue</p>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">₹{(vehicleStats.amount / 1000).toFixed(1)}k</h3>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                    <Car className="w-5 h-5" />
                </div>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>{vehicleStats.booked} Booked / {vehicleStats.total} Enquiries</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{vehicleStats.conversion}% Conv.</span>
            </div>
        </div>

        {/* Pending Tasks / Approvals */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors" onClick={() => navigate('/admin/tasks')}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending Tasks</p>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{pendingApprovals.length}</h3>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                    <Clock className="w-5 h-5" />
                </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Approvals for Leave, Advances, or Profile Edits.
            </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Chart */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-500" /> Attendance Trend (Last 7 Days)
              </h3>
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fill: '#9ca3af', fontSize: 12}} 
                              dy={10}
                          />
                          <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fill: '#9ca3af', fontSize: 12}} 
                          />
                          <Tooltip 
                              cursor={{fill: 'transparent'}}
                              contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                          />
                          <Bar 
                              dataKey="present" 
                              fill="#10b981" 
                              radius={[4, 4, 0, 0]} 
                              barSize={30}
                          />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" /> Transport Revenue (Last 6 Months)
              </h3>
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={vehicleChartData}>
                          <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fill: '#9ca3af', fontSize: 12}} 
                              dy={10}
                          />
                          <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fill: '#9ca3af', fontSize: 12}}
                              tickFormatter={(value) => `₹${value/1000}k`}
                          />
                          <Tooltip 
                              contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                              formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                          />
                          <Area 
                              type="monotone" 
                              dataKey="revenue" 
                              stroke="#8b5cf6" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorRevenue)" 
                          />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>

      {/* Recent Trips / Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 dark:text-white">Recent Trips</h3>
                  <button onClick={() => navigate('/admin/trips')} className="text-sm text-emerald-600 hover:underline">View All</button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredTrips.slice(0, 5).map((trip) => (
                      <div key={trip.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                                  <Truck className="w-4 h-4" />
                              </div>
                              <div>
                                  <p className="font-bold text-gray-800 dark:text-white text-sm">{trip.userName}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{trip.branch} • {trip.tripId}</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                  trip.bookingStatus === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                  trip.bookingStatus === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                                  trip.bookingStatus === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                              }`}>
                                  {trip.bookingStatus}
                              </span>
                              <p className="text-[10px] text-gray-400 mt-1">{trip.date}</p>
                          </div>
                      </div>
                  ))}
                  {filteredTrips.length === 0 && (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No recent trips found.</div>
                  )}
              </div>
          </div>

          <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg">
                  <h4 className="font-bold text-lg mb-2">Quick Actions</h4>
                  <div className="space-y-3">
                      <button onClick={() => navigate('/admin/trips')} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors text-left px-4 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-emerald-400" /> Book New Trip
                      </button>
                      
                      <button onClick={() => navigate('/admin/customer-care')} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors text-left px-4 flex items-center gap-2">
                          <Headset className="w-4 h-4 text-blue-400" /> Create Transport Quote
                      </button>
                      
                      <button onClick={() => navigate('/admin/attendance')} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors text-left px-4 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-400" /> Mark Attendance
                      </button>
                  </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-4">Staff Status</h4>
                  <div className="space-y-4">
                      <div>
                          <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600 dark:text-gray-400">Present</span>
                              <span className="font-bold text-gray-800 dark:text-white">{attendanceStats.present}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${(attendanceStats.present / (filteredEmployees.length || 1)) * 100}%`}}></div>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600 dark:text-gray-400">Late</span>
                              <span className="font-bold text-gray-800 dark:text-white">{attendanceStats.late}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                              <div className="bg-orange-500 h-1.5 rounded-full" style={{width: `${(attendanceStats.late / (filteredEmployees.length || 1)) * 100}%`}}></div>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600 dark:text-gray-400">On Field</span>
                              <span className="font-bold text-gray-800 dark:text-white">{attendanceStats.onField}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{width: `${(attendanceStats.onField / (filteredEmployees.length || 1)) * 100}%`}}></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
