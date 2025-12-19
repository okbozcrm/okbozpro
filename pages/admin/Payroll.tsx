
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  DollarSign, Save, Download, Filter, Search, Calculator, 
  RefreshCw, CheckCircle, Clock, X, Eye, CreditCard, 
  Banknote, History, Trash2, Printer, User, ArrowLeft, 
  Calendar, Building2, MapPin, LayoutDashboard, TrendingUp, 
  PieChart as PieChartIcon, FileText, ArrowUpRight, Wallet, TrendingDown, Settings
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, SalaryAdvanceRequest } from '../../types';

interface PayrollEntry {
  employeeId: string;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  advanceDeduction: number;
  payableDays: number;
  totalDays: number;
  status: 'Paid' | 'Pending';
}

interface PayrollHistoryRecord {
  id: string;
  name: string;
  date: string;
  totalAmount: number;
  employeeCount: number;
  data: Record<string, PayrollEntry>;
}

interface ExtendedEmployee extends Employee {
    corporateId?: string;
    corporateName?: string;
}

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Payroll: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Salary' | 'Advances' | 'History'>('Overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');

  const [payrollData, setPayrollData] = useState<Record<string, PayrollEntry>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [history, setHistory] = useState<PayrollHistoryRecord[]>([]);
  
  const [viewBatch, setViewBatch] = useState<PayrollHistoryRecord | null>(null);
  const [viewSlip, setViewSlip] = useState<{entry: PayrollEntry, name: string, role: string, batchDate: string} | null>(null);

  const [advances, setAdvances] = useState<SalaryAdvanceRequest[]>([]);
  const [selectedAdvance, setSelectedAdvance] = useState<SalaryAdvanceRequest | null>(null);
  const [approvalForm, setApprovalForm] = useState({ approvedAmount: '', paymentMode: 'Bank Transfer' });

  const [corporatesList, setCorporatesList] = useState<any[]>([]);

  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';
  const sessionId = localStorage.getItem('app_session_id') || 'admin';

  const [employees, setEmployees] = useState<ExtendedEmployee[]>(() => {
    if (isSuperAdmin) {
        let allEmployees: ExtendedEmployee[] = [];
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { 
                const parsed = JSON.parse(adminData);
                allEmployees = [...allEmployees, ...parsed.map((e: any) => ({...e, corporateId: 'admin', corporateName: 'Head Office'}))]; 
            } catch (e) {}
        }
        try {
            const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corporates.forEach((corp: any) => {
                const cData = localStorage.getItem(`staff_data_${corp.email}`);
                if (cData) {
                    try { 
                        const parsed = JSON.parse(cData);
                        allEmployees = [...allEmployees, ...parsed.map((e:any) => ({...e, corporateId: corp.email, corporateName: corp.companyName}))]; 
                    } catch (e) {}
                }
            });
        } catch(e) {}
        return allEmployees;
    } else {
        const key = sessionId === 'admin' ? 'staff_data' : `staff_data_${sessionId}`;
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
        return [];
    }
  });

  useEffect(() => {
      const loadData = () => {
          const allAdvances = JSON.parse(localStorage.getItem('salary_advances') || '[]');
          setAdvances(allAdvances.sort((a: any, b: any) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
          const savedHistory = localStorage.getItem('payroll_history');
          if (savedHistory) try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
          if (isSuperAdmin) setCorporatesList(JSON.parse(localStorage.getItem('corporate_accounts') || '[]'));
      };
      loadData();
  }, [isSuperAdmin]);

  const departments = useMemo(() => ['All', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))], [employees]);
  const branchOptions = useMemo(() => ['All', ...Array.from(new Set(employees.map(e => e.branch).filter(Boolean)))], [employees]);

  useEffect(() => { localStorage.setItem('payroll_history', JSON.stringify(history)); }, [history]);

  const handleAutoCalculate = () => {
    setIsCalculating(true);
    const newPayrollData: Record<string, PayrollEntry> = {};
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    employees.forEach(emp => {
        const monthlyCtc = parseFloat(emp.salary || '30000');
        const attendance = getEmployeeAttendance(emp, year, monthIndex);
        let payableDays = 0;
        attendance.forEach(day => {
            if (day.status === AttendanceStatus.PRESENT || day.status === AttendanceStatus.WEEK_OFF || day.status === AttendanceStatus.PAID_LEAVE) payableDays += 1;
            else if (day.status === AttendanceStatus.HALF_DAY) payableDays += 0.5;
        });

        const perDaySalary = monthlyCtc / daysInMonth;
        const grossEarned = Math.round(perDaySalary * payableDays);
        const basicSalary = Math.round(grossEarned * 0.5);
        const hra = Math.round(grossEarned * 0.3);
        const allowances = Math.round(grossEarned * 0.2);
        const employeeAdvances = advances.filter(a => a.employeeId === emp.id && a.status === 'Paid');
        const advanceDeduction = employeeAdvances.reduce((sum, item) => sum + (item.amountApproved || 0), 0);
        
        const existingEntry = payrollData[emp.id];
        newPayrollData[emp.id] = {
            employeeId: emp.id,
            basicSalary, allowances: hra + allowances,
            bonus: existingEntry ? existingEntry.bonus : 0,
            deductions: existingEntry ? existingEntry.deductions : 0,
            advanceDeduction, payableDays, totalDays: daysInMonth,
            status: existingEntry ? existingEntry.status : 'Pending'
        };
    });

    setTimeout(() => { setPayrollData(newPayrollData); setIsCalculating(false); }, 500);
  };

  useEffect(() => { handleAutoCalculate(); }, [employees, advances, selectedMonth]);

  const calculateNetPay = (entry: PayrollEntry | undefined) => {
    if (!entry) return 0;
    return (entry.basicSalary || 0) + (entry.allowances || 0) + (entry.bonus || 0) - (entry.deductions || 0) - (entry.advanceDeduction || 0);
  };

  // --- Dashboard Analytics ---
  const dashboardStats = useMemo(() => {
      // Fix: Explicitly cast Object.values to PayrollEntry[] to avoid unknown type errors in reduce
      const data = Object.values(payrollData) as PayrollEntry[];
      // Fix: Add explicit types for sum and e in reduce function to resolve operator '+' error
      const totalPayout = data.reduce((sum: number, e: PayrollEntry) => sum + calculateNetPay(e), 0);
      const totalBonus = data.reduce((sum: number, e: PayrollEntry) => sum + e.bonus, 0);
      const totalDeductions = data.reduce((sum: number, e: PayrollEntry) => sum + e.deductions + e.advanceDeduction, 0);
      const paidCount = data.filter(e => e.status === 'Paid').length;
      const pendingCount = data.length - paidCount;

      // Dept distribution
      const deptMap: Record<string, number> = {};
      employees.forEach(e => {
          const pay = calculateNetPay(payrollData[e.id]);
          deptMap[e.department || 'General'] = (deptMap[e.department || 'General'] || 0) + pay;
      });
      const pieData = Object.keys(deptMap).map(k => ({ name: k, value: deptMap[k] }));

      // History Trend
      const trendData = history.slice(-6).reverse().map(h => ({
          name: h.name.split('-')[1]?.trim() || h.date.slice(0,7),
          amount: h.totalAmount
      }));

      return { totalPayout, totalBonus, totalDeductions, paidCount, pendingCount, pieData, trendData };
  }, [payrollData, history, employees]);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDepartment === 'All' || emp.department === filterDepartment;
    const matchesCorp = isSuperAdmin ? (filterCorporate === 'All' || emp.corporateId === filterCorporate) : true;
    const matchesStatus = filterStatus === 'All' || (payrollData[emp.id]?.status === filterStatus);
    return matchesSearch && matchesDept && matchesCorp && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <style>{`@media print { body * { visibility: hidden; } .printable-slip, .printable-slip * { visibility: visible; } .printable-slip { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 20px; z-index: 9999; } .no-print { display: none !important; } }`}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2>
          <p className="text-gray-500">Analytics, monthly salaries, and advances</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('Overview')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'Overview' ? 'bg-white shadow text-emerald-600' : 'text-gray-600'}`}>
                <LayoutDashboard className="w-4 h-4" /> Overview
            </button>
            <button onClick={() => setActiveTab('Salary')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'Salary' ? 'bg-white shadow text-emerald-600' : 'text-gray-600'}`}>
                Salary Ledger
            </button>
            <button onClick={() => setActiveTab('Advances')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'Advances' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}>
                Advances {advances.filter(a => a.status === 'Pending').length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
            </button>
            <button onClick={() => setActiveTab('History')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'History' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}>
                History
            </button>
        </div>
      </div>

      {activeTab === 'Overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Monthly Payout</p>
                          <h3 className="text-2xl font-bold text-emerald-600 mt-1">₹{dashboardStats.totalPayout.toLocaleString()}</h3>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><DollarSign className="w-6 h-6"/></div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Status</p>
                          <h3 className="text-2xl font-bold text-gray-800 mt-1">{dashboardStats.paidCount} <span className="text-sm font-normal text-gray-400">Paid</span></h3>
                          <p className="text-[10px] text-orange-500 font-bold">{dashboardStats.pendingCount} Pending Approval</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><CheckCircle className="w-6 h-6"/></div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Incentives/Bonus</p>
                          <h3 className="text-2xl font-bold text-indigo-600 mt-1">₹{dashboardStats.totalBonus.toLocaleString()}</h3>
                      </div>
                      <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600"><ArrowUpRight className="w-6 h-6"/></div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Deductions</p>
                          <h3 className="text-2xl font-bold text-red-600 mt-1">₹{dashboardStats.totalDeductions.toLocaleString()}</h3>
                      </div>
                      {/* Fix: Added missing TrendingDown import to avoid name error */}
                      <div className="p-3 bg-red-50 rounded-lg text-red-600"><TrendingDown className="w-6 h-6"/></div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-500" /> Payout Trend (Last 6 Batches)
                      </h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={dashboardStats.trendData}>
                                  <defs>
                                      <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <PieChartIcon className="w-5 h-5 text-indigo-500" /> Department Distribution
                      </h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={dashboardStats.pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                      {dashboardStats.pieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                  </Pie>
                                  <Tooltip />
                                  <Legend verticalAlign="bottom" height={36}/>
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('Salary')}>
                      <h4 className="text-xl font-bold mb-2">Monthly Salary</h4>
                      <p className="text-slate-400 text-sm mb-4">View the detailed payroll ledger and adjust bonuses or deductions.</p>
                      <button className="flex items-center gap-2 text-emerald-400 font-bold text-sm group-hover:gap-3 transition-all">
                          Process Ledger <ArrowUpRight className="w-4 h-4"/>
                      </button>
                      <DollarSign className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-5" />
                  </div>
                  <div className="bg-emerald-600 text-white p-6 rounded-xl shadow-lg relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('Advances')}>
                      <h4 className="text-xl font-bold mb-2">Advance Requests</h4>
                      <p className="text-emerald-100 text-sm mb-4">Review and approve pending salary advance requests from staff.</p>
                      <button className="flex items-center gap-2 text-white font-bold text-sm group-hover:gap-3 transition-all underline decoration-white/30">
                          View Requests <ArrowUpRight className="w-4 h-4"/>
                      </button>
                      <Wallet className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-10" />
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm group">
                      <h4 className="text-xl font-bold text-gray-800 mb-2">Payroll Settings</h4>
                      <p className="text-gray-500 text-sm mb-4">Configure CTC structures, payout dates, and calculation cycles.</p>
                      {/* Fix: Added missing Settings icon import to avoid name error */}
                      <button className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:text-indigo-700 transition-all">
                          Configure <Settings className="w-4 h-4"/>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'Salary' && (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        <div className="p-4 border-b border-gray-200 flex flex-col gap-4 bg-gray-50">
             <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex flex-wrap gap-3 w-full md:w-auto flex-1">
                    <div className="relative min-w-[200px] flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-white" />
                    </div>
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
                    {isSuperAdmin && (
                        <select value={filterCorporate} onChange={(e) => setFilterCorporate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white cursor-pointer">
                            <option value="All">All Corporates</option>
                            <option value="admin">Head Office</option>
                            {corporatesList.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                        </select>
                    )}
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button onClick={handleAutoCalculate} disabled={isCalculating} className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"><RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} /> Recalculate</button>
                    <button onClick={() => {
                        // Fix: Cast Object.values to PayrollEntry[] and add explicit sum type in reduce to avoid type errors
                        const entriesArray = Object.values(payrollData) as PayrollEntry[];
                        const total = entriesArray.reduce((s: number, e: PayrollEntry) => s + calculateNetPay(e), 0);
                        const [y, m] = selectedMonth.split('-');
                        const date = new Date(parseInt(y), parseInt(m)-1, 1);
                        const record = { id: `PAY-${Date.now()}`, name: `Payroll - ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, date: new Date().toISOString(), totalAmount: total, employeeCount: employees.length, data: payrollData };
                        setHistory([record, ...history]);
                        setActiveTab('History');
                    }} className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg shadow-sm"><Save className="w-4 h-4" /> Save Batch</button>
                </div>
             </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-4 w-64">Employee</th>
                        <th className="px-4 py-4 text-center">Days</th>
                        <th className="px-4 py-4">Basic+Allow</th>
                        <th className="px-4 py-4">Bonus</th>
                        <th className="px-4 py-4 text-red-600">Deduction</th>
                        <th className="px-4 py-4 text-orange-600">Advances</th>
                        <th className="px-6 py-4 bg-gray-50">Net Pay</th>
                        <th className="px-4 py-4">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredEmployees.map(emp => {
                        const data = payrollData[emp.id] || { basicSalary: 0, allowances: 0, bonus: 0, deductions: 0, advanceDeduction: 0, payableDays: 0, totalDays: 30, status: 'Pending' };
                        return (
                            <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={emp.avatar} className="w-10 h-10 rounded-full" />
                                        <div><div className="font-semibold text-gray-900">{emp.name}</div><div className="text-xs text-emerald-600">{emp.department} • {emp.role}</div></div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center"><span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">{data.payableDays}/{data.totalDays}</span></td>
                                <td className="px-4 py-4 font-medium">₹{(data.basicSalary + data.allowances).toLocaleString()}</td>
                                <td className="px-4 py-4"><input type="number" className="w-20 px-2 py-1 border rounded text-right" value={data.bonus || ''} onChange={(e) => setPayrollData({...payrollData, [emp.id]: {...data, bonus: parseFloat(e.target.value) || 0}})} /></td>
                                <td className="px-4 py-4"><input type="number" className="w-20 px-2 py-1 border rounded text-right text-red-600" value={data.deductions || ''} onChange={(e) => setPayrollData({...payrollData, [emp.id]: {...data, deductions: parseFloat(e.target.value) || 0}})} /></td>
                                <td className="px-4 py-4 font-medium text-orange-600">-₹{data.advanceDeduction}</td>
                                <td className="px-6 py-4 bg-gray-50 font-bold text-gray-900">₹{calculateNetPay(data).toLocaleString()}</td>
                                <td className="px-4 py-4">
                                    <select value={data.status} onChange={(e) => setPayrollData({...payrollData, [emp.id]: {...data, status: e.target.value as any}})} className={`px-2 py-1 rounded-full text-xs font-bold border cursor-pointer ${data.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                        <option value="Pending">Pending</option><option value="Paid">Paid</option>
                                    </select>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>
      )}

      {activeTab === 'Advances' && (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px] animate-in fade-in slide-in-from-right-4">
          <div className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-gray-800">Pending Advance Requests</div>
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
                      <tr>
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Reason</th>
                          <th className="px-6 py-4 text-right">Requested</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {advances.filter(a => a.status === 'Pending').map(req => (
                          <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900">{req.employeeName}</td>
                              <td className="px-6 py-4 text-gray-500">{new Date(req.requestDate).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{req.reason}</td>
                              <td className="px-6 py-4 text-right font-bold text-indigo-600">₹{req.amountRequested}</td>
                              <td className="px-6 py-4 text-center"><span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Pending</span></td>
                              <td className="px-6 py-4 text-right">
                                  <button onClick={() => { setSelectedAdvance(req); setApprovalForm({ approvedAmount: req.amountRequested.toString(), paymentMode: 'Bank Transfer' }); }} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Review</button>
                              </td>
                          </tr>
                      ))}
                      {advances.filter(a => a.status === 'Pending').length === 0 && <tr><td colSpan={6} className="py-20 text-center text-gray-400">No pending requests.</td></tr>}
                  </tbody>
              </table>
          </div>
      </div>
      )}

      {activeTab === 'History' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4">
            <div className="p-6 border-b border-gray-200 bg-gray-50 font-bold text-gray-800">Payroll Archives</div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4">Batch</th>
                            <th className="px-6 py-4 text-center">Staff</th>
                            <th className="px-6 py-4 text-right">Total Payout</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {history.map(record => (
                            <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-800">{record.name}</td>
                                <td className="px-6 py-4 text-center"><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{record.employeeCount} Staff</span></td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600">₹{record.totalAmount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-center"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">Completed</span></td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button onClick={() => setViewBatch(record)} className="text-gray-400 hover:text-blue-600 p-2"><Eye className="w-4 h-4" /></button>
                                    <button onClick={() => setHistory(history.filter(h => h.id !== record.id))} className="text-gray-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {selectedAdvance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl"><h3 className="font-bold">Process Advance</h3><button onClick={() => setSelectedAdvance(null)}><X className="w-5 h-5"/></button></div>
                  <div className="p-6 space-y-4">
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">Requested by <strong>{selectedAdvance.employeeName}</strong>: ₹{selectedAdvance.amountRequested}</div>
                      <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Approved Amount</label><input type="number" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={approvalForm.approvedAmount} onChange={(e) => setApprovalForm({...approvalForm, approvedAmount: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => setApprovalForm({...approvalForm, paymentMode: 'Cash'})} className={`p-3 border rounded-lg text-center ${approvalForm.paymentMode === 'Cash' ? 'border-emerald-500 bg-emerald-50' : ''}`}><Banknote className="mx-auto mb-1"/> Cash</button>
                          <button onClick={() => setApprovalForm({...approvalForm, paymentMode: 'Bank Transfer'})} className={`p-3 border rounded-lg text-center ${approvalForm.paymentMode === 'Bank Transfer' ? 'border-emerald-500 bg-emerald-50' : ''}`}><CreditCard className="mx-auto mb-1"/> Bank/UPI</button>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => { setAdvances(advances.map(a => a.id === selectedAdvance.id ? {...a, status: 'Rejected'} : a)); setSelectedAdvance(null); }} className="flex-1 py-2 border border-red-200 text-red-600 rounded-lg font-bold">Reject</button>
                          <button onClick={() => { setAdvances(advances.map(a => a.id === selectedAdvance.id ? {...a, status: 'Paid', amountApproved: parseFloat(approvalForm.approvedAmount), paymentMode: approvalForm.paymentMode, paymentDate: new Date().toISOString()} : a)); setSelectedAdvance(null); handleAutoCalculate(); }} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold">Approve</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {viewBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center"><h3 className="font-bold text-lg">{viewBatch.name}</h3><button onClick={() => setViewBatch(null)}><X className="w-6 h-6"/></button></div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b"><tr><th className="px-6 py-4">Employee</th><th className="px-4 py-4">Basic+Allow</th><th className="px-4 py-4">Bonus</th><th className="px-4 py-4 text-red-600">Deductions</th><th className="px-6 py-4 bg-gray-50 font-bold">Net Pay</th></tr></thead>
                        <tbody className="divide-y">
                            {/* Fix: Explicitly cast Object.values results to PayrollEntry[] and use proper typing in property access */}
                            {(Object.values(viewBatch.data) as PayrollEntry[]).map(entry => (
                                <tr key={entry.employeeId} className="hover:bg-gray-50"><td className="px-6 py-4 font-medium">{employees.find(e => e.id === entry.employeeId)?.name}</td><td className="px-4 py-4">₹{(entry.basicSalary + entry.allowances).toLocaleString()}</td><td className="px-4 py-4 text-green-600">+₹{entry.bonus}</td><td className="px-4 py-4 text-red-600">-₹{entry.deductions + entry.advanceDeduction}</td><td className="px-6 py-4 bg-gray-50 font-bold">₹{calculateNetPay(entry).toLocaleString()}</td></tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Payroll;
