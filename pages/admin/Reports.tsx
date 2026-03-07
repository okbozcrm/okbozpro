import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, 
  Download, DollarSign, 
  CreditCard, Briefcase,
  Users, Calendar, Truck, PhoneCall, LayoutGrid,
  CheckCircle, XCircle, Clock
} from 'lucide-react';
import { 
  PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  BarChart, Bar, LineChart, Line
} from 'recharts';
import { CorporateAccount, PayrollEntry, Trip, Branch, Employee, DailyAttendance, AttendanceStatus } from '../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Interfaces for Data
interface PayrollHistoryRecord {
  id: string;
  name: string;
  date: string;
  totalAmount: number;
  employeeCount: number;
  data: Record<string, PayrollEntry>;
}

interface DriverPayment {
  id: string;
  type: string;
  amount: number;
  status: string;
  corporateId: string;
  date: string;
  driverName?: string;
  driverId?: string;
}

interface Expense {
  id: string;
  amount: number;
  date: string;
  category: string;
  description: string;
  type: 'Expense' | 'Income';
  corporateId?: string;
  branchId?: string; 
}

interface EmployeeAttendanceStat {
  id: string;
  name: string;
  role: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

const Reports: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const userRole = localStorage.getItem('user_role');
  const isSuperAdmin = userRole === 'ADMIN';
  const contextOwnerId = isSuperAdmin ? 'admin' : (localStorage.getItem('logged_in_employee_corporate_id') || sessionId);

  // Tabs State
  const [activeTab, setActiveTab] = useState('Finance & Expenses');

  // Filter State
  const [dateFilterType, setDateFilterType] = useState<'Monthly' | 'Range'>('Monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [selectedCorporate, setSelectedCorporate] = useState('All');
  const [selectedBranch, setSelectedBranch] = useState('All');
  
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Data State
  const [officeExpenses, setOfficeExpenses] = useState<Expense[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<PayrollHistoryRecord[]>([]);
  const [driverPayments, setDriverPayments] = useState<DriverPayment[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Load Data
  useEffect(() => {
    const loadData = () => {
      const corps: CorporateAccount[] = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      setCorporates(corps);

      // Load Branches
      let allBranches: Branch[] = [];
      if (isSuperAdmin) {
         const rootBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
         allBranches = [...rootBranches];
         corps.forEach(c => {
             const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
             allBranches = [...allBranches, ...cBranches];
         });
      } else {
         const key = contextOwnerId === 'admin' ? 'branches_data' : `branches_data_${contextOwnerId}`;
         allBranches = JSON.parse(localStorage.getItem(key) || '[]');
      }
      setBranches(allBranches);

      // Helper to fetch data from multiple keys if Super Admin
      const fetchData = (baseKey: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any[] = [];
        if (isSuperAdmin) {
          const rootData = JSON.parse(localStorage.getItem(baseKey) || '[]');
          // Inject admin corporateId
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data = [...rootData.map((item: any) => ({ ...item, corporateId: 'admin', ownerId: 'admin' }))];
          corps.forEach(c => {
            const cData = JSON.parse(localStorage.getItem(`${baseKey}_${c.email}`) || '[]');
            // Inject corporateId
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data = [...data, ...cData.map((item: any) => ({ ...item, corporateId: c.email, ownerId: c.email }))];
          });
        } else {
          const key = contextOwnerId === 'admin' ? baseKey : `${baseKey}_${contextOwnerId}`;
          const localData = JSON.parse(localStorage.getItem(key) || '[]');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data = localData.map((item: any) => ({ ...item, corporateId: contextOwnerId, ownerId: contextOwnerId }));
        }
        return data;
      };

      setOfficeExpenses(fetchData('office_expenses'));
      setPayrollHistory(fetchData('payroll_history'));
      setDriverPayments(fetchData('driver_payment_records'));
      setTrips(fetchData('trips_data'));
      setEmployees(fetchData('staff_data'));
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [isSuperAdmin, contextOwnerId]);

  // Filter Logic
  const filterDataByDate = (dateStr: string) => {
    const date = new Date(dateStr);
    
    if (dateFilterType === 'Monthly') {
      const [year, month] = selectedMonth.split('-').map(Number);
      return date.getMonth() === month - 1 && date.getFullYear() === year;
    } else if (dateFilterType === 'Range' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    return true;
  };

  const filterByCorporate = (itemCorpId?: string) => {
    if (!isSuperAdmin) return true;
    if (selectedCorporate === 'All') return true;
    return itemCorpId === selectedCorporate;
  };

  const filterByBranch = (itemBranch?: string) => {
      if (selectedBranch === 'All') return true;
      return itemBranch === selectedBranch;
  };

  // --- CALCULATIONS ---

  // 1. Office Expenses
  const filteredOfficeExpenses = useMemo(() => {
    return officeExpenses.filter(e => 
      e.type === 'Expense' && 
      filterDataByDate(e.date) && 
      filterByCorporate(e.corporateId) &&
      filterByBranch(e.branchId) 
    );
  }, [officeExpenses, dateFilterType, selectedMonth, customStartDate, customEndDate, selectedCorporate, selectedBranch]);

  const totalOfficeExpenses = filteredOfficeExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 2. Payroll
  const filteredPayroll = useMemo(() => {
    return payrollHistory.filter(p => 
      filterDataByDate(p.date) &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filterByCorporate((p as any).corporateId)
    );
  }, [payrollHistory, dateFilterType, selectedMonth, customStartDate, customEndDate, selectedCorporate]);

  const totalPayroll = filteredPayroll.reduce((sum, p) => sum + p.totalAmount, 0);

  // 3. Driver Payments
  const filteredDriverPayments = useMemo(() => {
    return driverPayments.filter(p => 
      filterDataByDate(p.date) && 
      filterByCorporate(p.corporateId)
    );
  }, [driverPayments, dateFilterType, selectedMonth, customStartDate, customEndDate, selectedCorporate]);

  const totalDriverPayments = filteredDriverPayments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);

  // --- TOTAL EXPENSES ---
  const totalExpenses = totalOfficeExpenses + totalPayroll + totalDriverPayments;

  // 4. Revenue (Admin Commission from Trips)
  const filteredTrips = useMemo(() => {
    return trips.filter(t => 
      filterDataByDate(t.date) && 
      filterByCorporate(t.ownerId) &&
      filterByBranch(t.branch)
    );
  }, [trips, dateFilterType, selectedMonth, customStartDate, customEndDate, selectedCorporate, selectedBranch]);

  const totalRevenue = filteredTrips.reduce((sum, t) => sum + (t.adminCommission || 0), 0);

  // --- NET PROFIT ---
  const netProfit = totalRevenue - totalExpenses;

  // Chart Data: Expense Breakdown
  const expenseDistribution = [
    { name: 'Office Expenses', value: totalOfficeExpenses, color: '#EF4444' }, // Red
    { name: 'Payroll', value: totalPayroll, color: '#F59E0B' }, // Amber
    { name: 'Driver Payouts', value: totalDriverPayments, color: '#3B82F6' }, // Blue
  ].filter(d => d.value > 0);

  // Chart Data: Trend (Income vs Expense)
  const trendData = useMemo(() => {
      const dataMap: Record<string, { date: string, income: number, expense: number }> = {};

      const addToMap = (dateStr: string, type: 'income' | 'expense', amount: number) => {
          const date = new Date(dateStr);
          const key = dateFilterType === 'Monthly' 
              ? `${date.getDate()}` 
              : date.toISOString().split('T')[0]; 

          if (!dataMap[key]) {
              dataMap[key] = { 
                  date: dateFilterType === 'Monthly' ? `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}` : date.toLocaleDateString(), 
                  income: 0, 
                  expense: 0 
              };
          }
          if (type === 'income') dataMap[key].income += amount;
          else dataMap[key].expense += amount;
      };

      filteredTrips.forEach(t => addToMap(t.date, 'income', t.adminCommission || 0));
      filteredOfficeExpenses.forEach(e => addToMap(e.date, 'expense', e.amount));
      filteredPayroll.forEach(p => addToMap(p.date, 'expense', p.totalAmount));
      filteredDriverPayments.filter(p => p.status === 'Paid').forEach(p => addToMap(p.date, 'expense', p.amount));

      return Object.values(dataMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTrips, filteredOfficeExpenses, filteredPayroll, filteredDriverPayments, dateFilterType]);

  // --- ATTENDANCE AGGREGATION ---
  const attendanceStats = useMemo(() => {
      const stats = {
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          totalDays: 0,
          employeeStats: [] as EmployeeAttendanceStat[]
      };

      const filteredEmployees = employees.filter(e => 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filterByCorporate((e as any).corporateId) && 
          filterByBranch(e.branch)
      );

      filteredEmployees.forEach(emp => {
          let empPresent = 0;
          let empAbsent = 0;
          let empLate = 0;
          let empLeave = 0;

          // Determine date range for fetching attendance
          let startDate: Date, endDate: Date;
          if (dateFilterType === 'Monthly') {
              const [year, month] = selectedMonth.split('-').map(Number);
              startDate = new Date(year, month - 1, 1);
              endDate = new Date(year, month, 0);
          } else if (customStartDate && customEndDate) {
              startDate = new Date(customStartDate);
              endDate = new Date(customEndDate);
          } else {
              // Default to current month if something is wrong
              const now = new Date();
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          }

          // Iterate through months in range (simplified for Monthly filter mostly)
          const startYear = startDate.getFullYear();
          const startMonth = startDate.getMonth();
          const key = `attendance_data_${emp.id}_${startYear}_${startMonth}`;
          const monthlyData: DailyAttendance[] = JSON.parse(localStorage.getItem(key) || '[]');

          monthlyData.forEach(d => {
             const recordDate = new Date(d.date);
             if (recordDate >= startDate && recordDate <= endDate) {
                 if (d.status === AttendanceStatus.PRESENT || d.status === AttendanceStatus.HALF_DAY) {
                     stats.present++;
                     empPresent++;
                     if (d.isLate) {
                         stats.late++;
                         empLate++;
                     }
                 } else if (d.status === AttendanceStatus.ABSENT) {
                     stats.absent++;
                     empAbsent++;
                 } else if (d.status === AttendanceStatus.PAID_LEAVE) {
                     stats.leave++;
                     empLeave++;
                 }
                 stats.totalDays++;
             }
          });

          stats.employeeStats.push({
              id: emp.id,
              name: emp.name,
              role: emp.role,
              present: empPresent,
              absent: empAbsent,
              late: empLate,
              leave: empLeave
          });
      });

      return stats;
  }, [employees, dateFilterType, selectedMonth, customStartDate, customEndDate, selectedCorporate, selectedBranch]);


  const exportPDF = async () => {
    const element = document.getElementById('reports-container');
    if (!element) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Financial_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error(err);
    }
    setIsExporting(false);
  };

  const tabs = [
    { id: 'Finance & Expenses', icon: DollarSign },
    { id: 'Driver Payments', icon: CreditCard },
    { id: 'Payroll Management', icon: Users },
    { id: 'Attendance Management', icon: Calendar },
    { id: 'Trip Earning', icon: Truck },
    { id: 'Customer Care', icon: PhoneCall },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500" id="reports-container">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2>
          <p className="text-gray-500">Performance insights across all modules</p>
        </div>
        
        {/* Filters Bar */}
        <div className="flex flex-wrap gap-3 items-center bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            {isSuperAdmin && (
                <select 
                    value={selectedCorporate} 
                    onChange={(e) => { setSelectedCorporate(e.target.value); setSelectedBranch('All'); }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-emerald-500 outline-none min-w-[140px]"
                >
                    <option value="All">All Corporates</option>
                    <option value="admin">Head Office</option>
                    {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                </select>
            )}

            <select 
                value={selectedBranch} 
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-emerald-500 outline-none min-w-[140px]"
            >
                <option value="All">All Branches</option>
                {branches
                    .filter(b => selectedCorporate === 'All' || (selectedCorporate === 'admin' ? !b.owner : b.owner === selectedCorporate))
                    .map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>

            <div className="flex bg-gray-100 rounded-lg p-1">
                <button 
                    onClick={() => setDateFilterType('Monthly')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${dateFilterType === 'Monthly' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Monthly
                </button>
                <button 
                    onClick={() => setDateFilterType('Range')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${dateFilterType === 'Range' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Range
                </button>
            </div>

            {dateFilterType === 'Monthly' ? (
                <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
            ) : (
                <div className="flex gap-2 items-center">
                    <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
            )}

            <button onClick={exportPDF} disabled={isExporting} className="bg-gray-800 hover:bg-gray-900 text-white p-2 rounded-lg shadow-sm transition-colors">
                <Download className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 border-b border-gray-200">
        {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-t-lg text-sm font-bold whitespace-nowrap transition-colors ${
                    activeTab === tab.id 
                    ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-emerald-500' : 'text-gray-400'}`} />
                {tab.id}
            </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'Finance & Expenses' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Overview Card */}
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden border border-white/10">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
                
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <LayoutGrid className="w-64 h-64 text-white" />
                </div>
                
                <div className="flex justify-between items-center mb-10 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-emerald-400 border border-white/10 shadow-inner">
                            <Briefcase className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold tracking-tight">Corporate Profit & Expense Overview</h3>
                            <p className="text-indigo-300/60 text-xs font-medium uppercase tracking-widest mt-0.5">Financial Performance Dashboard</p>
                        </div>
                    </div>
                    <div className="px-5 py-2 bg-white/5 backdrop-blur-md rounded-full text-xs font-mono text-indigo-200 border border-white/10 shadow-sm">
                        {dateFilterType === 'Monthly' ? selectedMonth : `${customStartDate} to ${customEndDate}`}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
                    {/* Admin Earnings */}
                    <div className="space-y-3 p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" /> Admin Earnings
                        </p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-light text-emerald-500/80">₹</span>
                            <h2 className="text-5xl font-bold tracking-tighter">{totalRevenue.toLocaleString()}</h2>
                        </div>
                        <p className="text-indigo-300/40 text-xs font-medium">Total Trip Commissions</p>
                    </div>

                    {/* Total Expense */}
                    <div className="space-y-4 p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                        <div>
                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <TrendingDown className="w-3 h-3" /> Total Expense
                            </p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-light text-rose-500/80">₹</span>
                                <h2 className="text-5xl font-bold tracking-tighter">{totalExpenses.toLocaleString()}</h2>
                            </div>
                        </div>
                        <div className="space-y-2.5 pt-4 border-t border-white/10">
                            <div className="flex justify-between text-xs">
                                <span className="text-indigo-300/60">Office Expenses</span>
                                <span className="font-semibold text-indigo-100">₹{totalOfficeExpenses.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-indigo-300/60">Driver Payments</span>
                                <span className="font-semibold text-indigo-100">₹{totalDriverPayments.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-indigo-300/60">Payroll Payouts</span>
                                <span className="font-semibold text-indigo-100">₹{totalPayroll.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Profit Card */}
                    <div className={`rounded-[1.5rem] p-8 border backdrop-blur-md shadow-2xl flex flex-col justify-center relative overflow-hidden ${
                        netProfit >= 0 
                        ? 'bg-emerald-500/10 border-emerald-500/20' 
                        : 'bg-rose-500/10 border-rose-500/20'
                    }`}>
                        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl ${netProfit >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`} />
                        
                        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-3 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            Net Profit
                        </p>
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className={`text-2xl font-light ${netProfit >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                                {netProfit >= 0 ? '+' : ''}₹
                            </span>
                            <h2 className={`text-5xl font-black tracking-tighter ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {Math.abs(netProfit).toLocaleString()}
                            </h2>
                        </div>
                        <p className="text-indigo-300/40 text-[10px] font-medium uppercase tracking-wider">Earnings - Expenses</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        Income vs Expense Trend
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} tickFormatter={(value) => `₹${value/1000}k`} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                                />
                                <Area type="monotone" dataKey="income" name="Admin Income" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" name="Total Expenses" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                                <Legend iconType="circle" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Total Expense Breakdown</h3>
                    <div className="h-80 w-full relative">
                        {expenseDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                    <Pie
                                        data={expenseDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {expenseDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </RechartsPie>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 italic">
                                No expense data available
                            </div>
                        )}
                        {/* Center Text */}
                        {expenseDistribution.length > 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                                <span className="text-xs text-gray-400 font-medium">Total</span>
                                <span className="text-xl font-bold text-gray-800">₹{(totalExpenses/1000).toFixed(1)}k</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* DRIVER PAYMENTS TAB */}
      {activeTab === 'Driver Payments' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Total Paid</p>
                    <h3 className="text-2xl font-bold text-gray-800">₹{totalDriverPayments.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Pending Requests</p>
                    <h3 className="text-2xl font-bold text-amber-600">
                        {filteredDriverPayments.filter(p => p.status === 'Pending').length}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Total Transactions</p>
                    <h3 className="text-2xl font-bold text-blue-600">{filteredDriverPayments.length}</h3>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">Driver Payment History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Driver Name</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredDriverPayments.length > 0 ? filteredDriverPayments.map((payment, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4">{new Date(payment.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{payment.driverName || 'Unknown Driver'}</td>
                                    <td className="px-6 py-4">{payment.type}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            payment.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                            payment.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                            'bg-rose-100 text-rose-700'
                                        }`}>
                                            {payment.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium">₹{payment.amount.toLocaleString()}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No payment records found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* PAYROLL MANAGEMENT TAB */}
      {activeTab === 'Payroll Management' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Payroll Trends</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={filteredPayroll}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('default', { month: 'short' })} />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="totalAmount" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Total Payout" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Summary</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <span className="text-amber-800 font-medium">Total Payroll Expense</span>
                            <span className="text-2xl font-bold text-amber-700">₹{totalPayroll.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-gray-600 font-medium">Total Records</span>
                            <span className="text-2xl font-bold text-gray-800">{filteredPayroll.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">Payroll History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Month</th>
                                <th className="px-6 py-4">Employees Paid</th>
                                <th className="px-6 py-4 text-right">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPayroll.length > 0 ? filteredPayroll.map((record, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{record.name}</td>
                                    <td className="px-6 py-4">{record.employeeCount}</td>
                                    <td className="px-6 py-4 text-right font-medium">₹{record.totalAmount.toLocaleString()}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400">No payroll records found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* ATTENDANCE MANAGEMENT TAB */}
      {activeTab === 'Attendance Management' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Present</p>
                        <h3 className="text-2xl font-bold text-gray-800">{attendanceStats.present}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-lg"><XCircle className="w-6 h-6" /></div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Absent</p>
                        <h3 className="text-2xl font-bold text-gray-800">{attendanceStats.absent}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><Clock className="w-6 h-6" /></div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Late Arrivals</p>
                        <h3 className="text-2xl font-bold text-gray-800">{attendanceStats.late}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Calendar className="w-6 h-6" /></div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">On Leave</p>
                        <h3 className="text-2xl font-bold text-gray-800">{attendanceStats.leave}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">Employee Attendance Summary</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4 text-center">Present</th>
                                <th className="px-6 py-4 text-center">Absent</th>
                                <th className="px-6 py-4 text-center">Late</th>
                                <th className="px-6 py-4 text-center">Leaves</th>
                                <th className="px-6 py-4 text-right">Attendance %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {attendanceStats.employeeStats.map((stat) => {
                                const totalDays = stat.present + stat.absent + stat.leave; // Simplified total
                                const percentage = totalDays > 0 ? Math.round((stat.present / totalDays) * 100) : 0;
                                return (
                                    <tr key={stat.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{stat.name}</td>
                                        <td className="px-6 py-4 text-gray-500">{stat.role}</td>
                                        <td className="px-6 py-4 text-center text-emerald-600 font-medium">{stat.present}</td>
                                        <td className="px-6 py-4 text-center text-rose-600 font-medium">{stat.absent}</td>
                                        <td className="px-6 py-4 text-center text-amber-600 font-medium">{stat.late}</td>
                                        <td className="px-6 py-4 text-center text-blue-600 font-medium">{stat.leave}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${percentage >= 90 ? 'bg-emerald-100 text-emerald-700' : percentage >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {percentage}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {attendanceStats.employeeStats.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">No employee attendance data found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* TRIP EARNING TAB */}
      {activeTab === 'Trip Earning' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Total Trips</p>
                    <h3 className="text-2xl font-bold text-gray-800">{filteredTrips.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-emerald-600">₹{totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500">Completed Trips</p>
                    <h3 className="text-2xl font-bold text-blue-600">
                        {filteredTrips.filter(t => t.bookingStatus === 'Completed').length}
                    </h3>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Trip Revenue Trend</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <RechartsTooltip formatter={(val: number) => `₹${val.toLocaleString()}`} />
                            <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} dot={false} name="Revenue" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">Recent Trips</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Trip ID</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Commission</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTrips.slice(0, 10).map((trip, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-mono text-xs">{trip.tripId}</td>
                                    <td className="px-6 py-4">{new Date(trip.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{trip.userName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            trip.bookingStatus === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                            trip.bookingStatus === 'Cancelled' ? 'bg-rose-100 text-rose-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {trip.bookingStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium">₹{trip.adminCommission.toLocaleString()}</td>
                                </tr>
                            ))}
                            {filteredTrips.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No trips found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'Customer Care' && (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
              <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                  <PhoneCall className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Coming Soon</h3>
              <p className="text-gray-500">The Customer Care analytics module is under development.</p>
          </div>
      )}

    </div>
  );
};

export default Reports;
