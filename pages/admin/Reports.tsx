
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import { 
  Download, TrendingUp, DollarSign, 
  Briefcase, ArrowUpRight, Car, MapPin, Activity, CheckSquare, Users, Percent, Calendar, Clock, Filter, PieChart as PieChartIcon,
  Share2, Mail, MessageCircle, FileText, Check, Loader2, Truck, Wallet, ReceiptIndianRupee, RefreshCw, TrendingDown, History, Landmark, X, Building2, ChevronDown, Database, ArrowRight, ShieldCheck, Map,
  CheckCircle, Minus, Equal
} from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, CorporateAccount, Branch, Employee, UserRole } from '../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

const Reports: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const activeTabStates = ['Profit & Sharing', 'Financial', 'Payroll', 'Driver Payments', 'Transport'] as const;
  const [activeTab, setActiveTab] = useState<typeof activeTabStates[number]>('Profit & Sharing');
  
  const [filterType, setFilterType] = useState<'All' | 'Date' | 'Month'>('Month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterCorporate, setFilterCorporate] = useState<string>('All');
  const [filterBranch, setFilterBranch] = useState<string>('All');

  const [expenses, setExpenses] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [driverPayments, setDriverPayments] = useState<any[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [refreshToggle, setRefreshToggle] = useState(0);

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const loadAggregatedData = (key: string) => {
      let aggregated: any[] = [];
      
      if (isSuperAdmin) {
          const adminData = localStorage.getItem(key);
          if (adminData) {
              try { 
                  const parsed = JSON.parse(adminData);
                  aggregated = [...parsed.map((item: any) => ({ ...item, corporateId: 'admin' }))]; 
              } catch(e) {}
          }
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          corps.forEach((c: any) => {
              const cData = localStorage.getItem(`${key}_${c.email}`);
              if (cData) {
                  try {
                      const parsed = JSON.parse(cData);
                      aggregated = [...aggregated, ...parsed.map((item: any) => ({ ...item, corporateId: c.email }))];
                  } catch (e) {}
              }
          });
      } else {
          const cData = localStorage.getItem(`${key}_${sessionId}`);
          if (cData) {
              try {
                  const parsed = JSON.parse(cData);
                  aggregated = parsed.map((item: any) => ({ ...item, corporateId: sessionId }));
              } catch (e) {}
          }
      }
      return aggregated;
  };

  const handleCorporateFilterChange = (newCorp: string) => {
    setFilterCorporate(newCorp);
    setFilterBranch('All');
  };

  const fetchData = () => {
      setExpenses(loadAggregatedData('office_expenses'));
      setPayroll(loadAggregatedData('payroll_history'));
      setTrips(loadAggregatedData('trips_data'));
      setDriverPayments(loadAggregatedData('driver_payment_records'));
      setCorporates(JSON.parse(localStorage.getItem('corporate_accounts') || '[]'));
      
      let allStaff: any[] = [];
      if (isSuperAdmin) {
          const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
          allStaff = [...adminStaff.map((s: any) => ({ ...s, corporateId: 'admin' }))];
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          corps.forEach((c: any) => {
              const cs = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
              allStaff = [...allStaff, ...cs.map((s: any) => ({ ...s, corporateId: c.email }))];
          });
      } else {
          const myStaff = JSON.parse(localStorage.getItem(`staff_data_${sessionId}`) || '[]');
          allStaff = myStaff.map((s: any) => ({ ...s, corporateId: sessionId }));
      }
      setStaff(allStaff);

      let scopedBranches: any[] = [];
      if (isSuperAdmin) {
          const adminB = JSON.parse(localStorage.getItem('branches_data') || '[]');
          scopedBranches = [...adminB.map((b: any) => ({ ...b, corporateId: 'admin' }))];
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          corps.forEach((c: any) => {
              const cb = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
              scopedBranches = [...scopedBranches, ...cb.map((b: any) => ({ ...b, corporateId: c.email }))];
          });
      } else {
          const myB = JSON.parse(localStorage.getItem(`branches_data_${sessionId}`) || '[]');
          scopedBranches = myB.map((b: any) => ({ ...b, corporateId: sessionId }));
      }
      setBranches(scopedBranches);
  };

  useEffect(() => {
    fetchData();

    const handleStorage = (e: StorageEvent) => {
        if (e.key?.includes('_data') || e.key?.includes('expenses') || e.key?.includes('records') || e.key === 'corporate_accounts' || e.key?.includes('payroll_history')) {
            fetchData();
            setRefreshToggle(v => v + 1);
        }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isSuperAdmin, sessionId, refreshToggle]);

  const handleRecalculate = () => {
    setIsRecalculating(true);
    // Simulate complex calculation delay for UX
    setTimeout(() => {
        fetchData();
        setRefreshToggle(v => v + 1);
        setIsRecalculating(false);
    }, 1000);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
        const canvas = await html2canvas(reportRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Report_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
        console.error("PDF Export Failed", err);
    }
    setIsExporting(false);
  };

  const applyFilters = (data: any[]) => {
      let filtered = data;
      if (isSuperAdmin && filterCorporate !== 'All') {
          filtered = filtered.filter(item => item.corporateId === filterCorporate);
      }
      if (filterBranch !== 'All') {
          filtered = filtered.filter(item => item.branch === filterBranch || item.branchName === filterBranch);
      }
      if (filterType !== 'All') {
          filtered = filtered.filter(item => {
              const itemDate = item.date || item.createdAt || item.timestamp || '';
              if (filterType === 'Date') return itemDate.startsWith(selectedDate);
              if (filterType === 'Month') return itemDate.startsWith(selectedMonth);
              return true;
          });
      }
      return filtered;
  };

  const filteredExpenses = useMemo(() => applyFilters(expenses), [expenses, filterType, selectedDate, selectedMonth, filterCorporate, filterBranch, isSuperAdmin]);
  const filteredTrips = useMemo(() => applyFilters(trips), [trips, filterType, selectedDate, selectedMonth, filterCorporate, filterBranch, isSuperAdmin]);
  const filteredDriverPayments = useMemo(() => applyFilters(driverPayments), [driverPayments, filterType, selectedDate, selectedMonth, filterCorporate, filterBranch, isSuperAdmin]);

  const filteredPayroll = useMemo(() => {
    let base = payroll;
    if (isSuperAdmin && filterCorporate !== 'All') {
        base = base.filter(p => p.corporateId === filterCorporate);
    }
    const filteredBatches = base.map(batch => {
        // Recalculate totals from individual entries to ensure accuracy and match Payroll logic exactly
        // This handles cases where stored total might be outdated or calculated differently
        const filteredEntries: Record<string, any> = {};
        let filteredAmount = 0;
        let filteredCount = 0;
        
        if (batch.data) {
            Object.entries(batch.data).forEach(([empId, entry]: [string, any]) => {
                const employee = staff.find(s => s.id === empId);
                const matchesBranch = filterBranch === 'All' || (employee && employee.branch === filterBranch);

                if (matchesBranch) {
                    filteredEntries[empId] = entry;
                    filteredCount++;
                    // Exact calculation: (Basic + Allowances + Travel + Bonus) - (Deductions + Advances)
                    const basic = Number(entry.basicSalary) || 0;
                    const allow = Number(entry.allowances) || 0;
                    const travel = Number(entry.travelAllowance) || 0;
                    const bonus = Number(entry.bonus) || 0;
                    const ded = Number(entry.deductions) || 0;
                    const adv = Number(entry.advanceDeduction) || 0;
                    
                    const net = (basic + allow + travel + bonus) - (ded + adv);
                    filteredAmount += net;
                }
            });
        }
        return { ...batch, employeeCount: filteredCount, totalAmount: filteredAmount, data: filteredEntries };
    }).filter(batch => batch.employeeCount > 0);

    if (filterType !== 'All') {
        return filteredBatches.filter(item => {
            const d = item.date || '';
            if (filterType === 'Date') return d.startsWith(selectedDate);
            if (filterType === 'Month') return d.startsWith(selectedMonth);
            return true;
        });
    }
    return filteredBatches;
  }, [payroll, staff, filterType, selectedDate, selectedMonth, filterCorporate, filterBranch, isSuperAdmin]);

  const availableBranches = useMemo(() => {
    return Array.from(new Set(branches.map(b => b.name)));
  }, [branches]);

  const profitSharingData = useMemo(() => {
      // 1. Revenue: Strictly Admin Commission from Trips
      const adminCommissionTotal = filteredTrips.reduce((sum, t) => sum + (Number(t.adminCommission) || 0), 0);
      
      // 2. Expenses Aggregation
      const officeOnlyExpenses = filteredExpenses.filter(e => e.type === 'Expense').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      
      // This uses the RECALCULATED total from filteredPayroll, ensuring it matches the Payroll module perfectly
      const payrollTotal = filteredPayroll.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
      
      const driverTotalPaid = filteredDriverPayments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      
      const totalExpenses = officeOnlyExpenses + payrollTotal + driverTotalPaid;
      
      // 3. Net Profit Calculation
      const netProfit = adminCommissionTotal - totalExpenses;
      
      const shares = corporates.map(corp => {
          const sharePercent = corp.profitSharingPercentage || 0;
          const amount = (netProfit * sharePercent) / 100;
          return { id: corp.email, name: corp.companyName, percent: sharePercent, amount: amount > 0 ? amount : 0 };
      });
      const filteredShares = isSuperAdmin ? (filterCorporate === 'All' ? shares : shares.filter(s => s.id === filterCorporate)) : shares.filter(s => s.id === sessionId);
      
      return { 
          totalProfit: netProfit, 
          shares: filteredShares, 
          revenue: adminCommissionTotal, 
          expensesBreakdown: { 
              office: officeOnlyExpenses, 
              payroll: payrollTotal, 
              drivers: driverTotalPaid, 
              total: totalExpenses 
          } 
      };
  }, [filteredTrips, filteredExpenses, filteredPayroll, filteredDriverPayments, corporates, isSuperAdmin, filterCorporate, sessionId]);

  const financialStats = useMemo(() => {
      const totalIncome = filteredExpenses.filter(e => e.type === 'Income').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalExpense = filteredExpenses.filter(e => e.type === 'Expense').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return { totalIncome, totalExpense, netProfit: totalIncome - totalExpense };
  }, [filteredExpenses]);

  const payrollStats = useMemo(() => {
      const totalDisbursed = filteredPayroll.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
      const totalEmployeesPaid = filteredPayroll.reduce((sum, p) => sum + (Number(p.employeeCount) || 0), 0);
      const historyData = filteredPayroll.map(p => ({
          date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' }),
          amount: p.totalAmount,
          count: p.employeeCount
      })).reverse();
      return { totalDisbursed, totalBatches: filteredPayroll.length, avgSalary: totalEmployeesPaid > 0 ? totalDisbursed / totalEmployeesPaid : 0, historyData };
  }, [filteredPayroll]);

  const driverPaymentStats = useMemo(() => {
      const totalPaid = filteredDriverPayments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const typeDataObj: Record<string, number> = {};
      filteredDriverPayments.forEach(p => { if (p.status === 'Paid') typeDataObj[p.type] = (typeDataObj[p.type] || 0) + (Number(p.amount) || 0); });
      return { totalPaid, pendingRequests: filteredDriverPayments.filter(p => p.status === 'Pending').length, typeChartData: Object.keys(typeDataObj).map(key => ({ name: key, value: typeDataObj[key] })) };
  }, [filteredDriverPayments]);

  const transportStats = useMemo(() => {
    const completed = filteredTrips.filter(t => t.bookingStatus === 'Completed');
    const totalRevenue = completed.reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0);
    const totalCommission = completed.reduce((sum, t) => sum + (Number(t.adminCommission) || 0), 0);

    const categories: Record<string, number> = {};
    completed.forEach(t => { categories[t.tripCategory] = (categories[t.tripCategory] || 0) + 1; });
    const categoryData = Object.keys(categories).map(k => ({ name: k, value: categories[k] }));

    const vehicles: Record<string, number> = {};
    completed.forEach(t => { vehicles[t.transportType] = (vehicles[t.transportType] || 0) + 1; });
    const vehicleData = Object.keys(vehicles).map(k => ({ name: k, amount: vehicles[k] })).sort((a,b) => b.amount - a.amount);

    const branchRev: Record<string, number> = {};
    completed.forEach(t => { branchRev[t.branch] = (branchRev[t.branch] || 0) + (Number(t.totalPrice) || 0); });
    const branchData = Object.keys(branchRev).map(k => ({ name: k, amount: branchRev[k] })).sort((a,b) => b.amount - a.amount);

    return { 
        totalTrips: filteredTrips.length, 
        completed: completed.length, 
        totalRevenue, 
        totalCommission, 
        categoryData, 
        vehicleData, 
        branchData 
    };
  }, [filteredTrips]);

  const resetFilters = () => {
      setFilterType('Month');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedMonth(new Date().toISOString().slice(0, 7));
      setFilterCorporate('All');
      setFilterBranch('All');
  };

  const handleBackupProfitReport = () => {
      const headers = ["Entity Name", "Share %", "Allocated Amount", "Date/Period"];
      const period = filterType === 'All' ? 'Life-time' : filterType === 'Date' ? selectedDate : selectedMonth;
      const rows = profitSharingData.shares.map(s => [s.name, `${s.percent}%`, s.amount.toFixed(2), period]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `Profit_Allocation_Backup_${period}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2><p className="text-gray-500">{isSuperAdmin ? "Consolidated Insights (Admin)" : "Insights (Franchise)"}</p></div>
        <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">{activeTabStates.map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white shadow text-emerald-600' : 'text-gray-600 hover:text-gray-900'}`}>{tab}</button>))}</div>
        <button onClick={handleExportPDF} disabled={isExporting} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-900 transition-colors">{isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />} Export PDF</button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
          <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-gray-400" /><span className="text-sm font-bold text-gray-700">Scope:</span></div>
          <div className="flex flex-wrap gap-3 items-center flex-1">
              {isSuperAdmin && (<div className="relative group min-w-[160px]"><select value={filterCorporate} onChange={(e) => handleCorporateFilterChange(e.target.value)} className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"><option value="All">All Corporates</option><option value="admin">Head Office</option>{corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}</select><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /></div>)}
              <div className="relative group min-w-[140px]"><select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"><option value="All">All Branches</option>{availableBranches.map(b => <option key={b} value={b}>{b}</option>)}</select><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /></div>
              <div className="h-6 w-px bg-gray-200 mx-1 hidden lg:block"></div>
              <div className="flex bg-gray-100 p-1 rounded-lg">{(['All', 'Date', 'Month'] as const).map(type => (<button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === type ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>{type === 'All' ? 'All' : type === 'Date' ? 'Daily' : 'Monthly'}</button>))}</div>
              {filterType === 'Date' && (<div className="flex items-center gap-2 animate-in zoom-in-95"><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"/></div>)}
              {filterType === 'Month' && (<div className="flex items-center gap-2 animate-in zoom-in-95"><input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"/></div>)}
              <button onClick={resetFilters} className="p-2 text-gray-400 hover:text-red-500 transition-colors ml-auto"><RefreshCw className="w-4 h-4" /></button>
          </div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest hidden xl:block border-l border-gray-100 pl-4">{filterType === 'All' ? 'Viewing Life-time' : filterType === 'Date' ? `${new Date(selectedDate).toLocaleDateString()}` : `${new Date(selectedMonth).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`}</div>
      </div>

      <div className="space-y-6">
          {activeTab === 'Profit & Sharing' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                  <div className="lg:col-span-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden group">
                      <div className="relative z-10">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <p className="text-emerald-100 font-bold mb-1 uppercase tracking-[0.2em] text-xs">Corporate Profit & Expense Overview</p>
                                  <h3 className="text-4xl font-black">{isSuperAdmin ? 'Global Financial Status' : 'My Franchise Financials'}</h3>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={handleRecalculate} disabled={isRecalculating} className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all transform active:scale-95 shadow-sm">
                                      {isRecalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                      Recalculate
                                  </button>
                                  <button onClick={handleBackupProfitReport} className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all transform active:scale-95 shadow-sm">
                                      <Database className="w-4 h-4" />Backup Report
                                  </button>
                              </div>
                          </div>
                          
                          <div className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-0 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden text-center divide-x divide-white/10">
                              <div className="p-6">
                                  <p className="text-[10px] font-black text-emerald-200 uppercase mb-2 tracking-widest">Total Revenue</p>
                                  <p className="text-[9px] text-emerald-100/60 font-medium mb-1">(Admin Commission Only)</p>
                                  <p className="text-2xl font-black text-white">{formatCurrency(profitSharingData.revenue)}</p>
                              </div>
                              <div className="p-6 flex items-center justify-center bg-black/10">
                                  <Minus className="w-8 h-8 text-white/40" />
                              </div>
                              <div className="p-6">
                                  <p className="text-[10px] font-black text-red-200 uppercase mb-2 tracking-widest">Total Expenses</p>
                                  <p className="text-[9px] text-red-100/60 font-medium mb-1">(Office + Payroll + Driver)</p>
                                  <p className="text-2xl font-black text-white">{formatCurrency(profitSharingData.expensesBreakdown.total)}</p>
                              </div>
                              <div className="p-6 flex items-center justify-center bg-black/10">
                                  <Equal className="w-8 h-8 text-white/40" />
                              </div>
                              <div className="p-6 bg-emerald-500/20">
                                  <p className="text-[10px] font-black text-emerald-100 uppercase mb-2 tracking-widest">Net Profit</p>
                                  <p className="text-[9px] text-emerald-100/60 font-medium mb-1">(Revenue - Expenses)</p>
                                  <p className="text-3xl font-black text-white">{formatCurrency(profitSharingData.totalProfit)}</p>
                              </div>
                          </div>
                      </div>
                      <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform duration-700"><DollarSign className="w-64 h-64" /></div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-500" /> Detailed Expense Breakdown</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10"><Building2 className="w-12 h-12" /></div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Office Expenses</p>
                                <p className="text-xs text-gray-500 mb-2 font-medium">Finance Module</p>
                                <p className="text-lg font-black text-gray-800">{formatCurrency(profitSharingData.expensesBreakdown.office)}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10"><Users className="w-12 h-12" /></div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Staff Payroll</p>
                                <p className="text-xs text-gray-500 mb-2 font-medium">Net Disbursed</p>
                                <p className="text-lg font-black text-gray-800">{formatCurrency(profitSharingData.expensesBreakdown.payroll)}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10"><Truck className="w-12 h-12" /></div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Driver Payouts</p>
                                <p className="text-xs text-gray-500 mb-2 font-medium">Incentives & Comp.</p>
                                <p className="text-lg font-black text-gray-800">{formatCurrency(profitSharingData.expensesBreakdown.drivers)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-emerald-500" /> {isSuperAdmin ? "Franchise Profit Distribution" : "Your Agreed Earnings"}</h3>
                        <div className="space-y-4">
                            {profitSharingData.shares.map((corp, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex justify-between items-center group hover:border-emerald-200 transition-all">
                                    <div>
                                        <h4 className="font-black text-gray-800 text-sm">{corp.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase">{corp.percent}% Share</span>
                                            <span className="text-[10px] text-gray-400">of Net Profit</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-emerald-600">{formatCurrency(corp.amount)}</p>
                                    </div>
                                </div>
                            ))}
                            {profitSharingData.shares.length === 0 && (<div className="text-center py-10 text-gray-400 italic font-medium text-sm">No profit share data available for this view.</div>)}
                        </div>
                    </div>
                  </div>

                  <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full min-h-[400px]">
                      <h3 className="font-bold text-gray-800 mb-6">Distribution Visual</h3>
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={profitSharingData.shares} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>{profitSharingData.shares.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie>
                              <Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          )}

          {activeTab === 'Financial' && (
              <div className="space-y-6 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><p className="text-sm text-gray-500 mb-1">Total Income</p><h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(financialStats.totalIncome)}</h3></div>
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><p className="text-sm text-gray-500 mb-1">Total Expenses</p><h3 className="text-2xl font-bold text-red-600">{formatCurrency(financialStats.totalExpense)}</h3></div>
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><p className="text-sm text-gray-500 mb-1">Net Cash Flow</p><h3 className={`text-2xl font-bold ${financialStats.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(financialStats.netProfit)}</h3></div>
                  </div>
              </div>
          )}

          {activeTab === 'Payroll' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                  <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Landmark className="w-5 h-5 text-indigo-500" /> Total Net Payout Analytics</h3>
                          <div className="grid grid-cols-3 gap-4 mb-8">
                              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100"><p className="text-indigo-600 text-xs font-bold uppercase tracking-wider">Total Net Payout</p><h4 className="text-2xl font-black text-indigo-700 mt-1">{formatCurrency(payrollStats.totalDisbursed)}</h4></div>
                              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100"><p className="text-emerald-600 text-xs font-bold uppercase tracking-wider">Avg. / Staff</p><h4 className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(payrollStats.avgSalary)}</h4></div>
                              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100"><p className="text-blue-600 text-xs font-bold uppercase tracking-wider">Batches</p><h4 className="text-2xl font-black text-blue-700 mt-1">{payrollStats.totalBatches}</h4></div>
                          </div>
                          <div className="h-64 mt-4">
                              <ResponsiveContainer width="100%" height="100%"><AreaChart data={payrollStats.historyData}><defs><linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} /><Tooltip formatter={(value: number) => formatCurrency(value)} /><Area type="monotone" dataKey="amount" name="Net Payout" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" /></AreaChart></ResponsiveContainer>
                          </div>
                      </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full min-h-[400px]">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Users className="w-5 h-5 text-emerald-500" /> Staff Volume Trend</h3>
                      <ResponsiveContainer width="100%" height="100%"><BarChart data={payrollStats.historyData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} /><Tooltip cursor={{fill: '#f9fafb'}} /><Bar dataKey="count" name="Staff Count" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                  </div>
              </div>
          )}

          {activeTab === 'Driver Payments' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                  <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><ReceiptIndianRupee className="w-5 h-5 text-indigo-500" /> Driver Compensation Overview</h3>
                      <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100"><p className="text-indigo-600 text-xs font-bold uppercase tracking-wider">Total Paid Compensations</p><h4 className="text-3xl font-black text-indigo-700 mt-1">{formatCurrency(driverPaymentStats.totalPaid)}</h4></div>
                          <div className="bg-amber-50 p-6 rounded-xl border border-amber-100"><p className="text-amber-600 text-xs font-bold uppercase tracking-wider">Pending Payout Claims</p><h4 className="text-3xl font-black text-amber-700 mt-1">{driverPaymentStats.pendingRequests}</h4></div>
                      </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full min-h-[400px]">
                      <h3 className="font-bold text-gray-800 mb-6">Payment Distribution</h3>
                      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={driverPaymentStats.typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>{driverPaymentStats.typeChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value: number) => formatCurrency(value)} /><Legend verticalAlign="bottom" height={36} /></PieChart></ResponsiveContainer>
                  </div>
              </div>
          )}

          {activeTab === 'Transport' && (
              <div className="space-y-6 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 group hover:shadow-md transition-all">
                          <div className="flex justify-between items-start">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bookings</p>
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Car className="w-5 h-5"/></div>
                          </div>
                          <h3 className="text-3xl font-black text-gray-800">{transportStats.totalTrips}</h3>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 group hover:shadow-md transition-all">
                          <div className="flex justify-between items-start">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Gross Revenue</p>
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign className="w-5 h-5"/></div>
                          </div>
                          <h3 className="text-3xl font-black text-gray-800">{formatCurrency(transportStats.totalRevenue)}</h3>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 group hover:shadow-md transition-all">
                          <div className="flex justify-between items-start">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Commission Earned</p>
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Percent className="w-5 h-5"/></div>
                          </div>
                          <h3 className="text-3xl font-black text-gray-800">{formatCurrency(transportStats.totalCommission)}</h3>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 group hover:shadow-md transition-all">
                          <div className="flex justify-between items-start">
                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Success Rate</p>
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><CheckCircle className="w-5 h-5"/></div>
                          </div>
                          <h3 className="text-3xl font-black text-gray-800">{transportStats.totalTrips > 0 ? Math.round((transportStats.completed / transportStats.totalTrips) * 100) : 0}%</h3>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full min-h-[400px]">
                          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-indigo-500" /> Category Breakdown</h3>
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={transportStats.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>{transportStats.categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie>
                                  <Tooltip /><Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full min-h-[400px]">
                          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Car className="w-5 h-5 text-emerald-500" /> Vehicle Preference</h3>
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  {/* FIX: Changed dataKey from "value" to "amount" to match data structure */}
                                  <Pie data={transportStats.vehicleData} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>{transportStats.vehicleData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />)}</Pie>
                                  <Tooltip /><Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full min-h-[400px]">
                          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-500" /> Revenue by Branch</h3>
                          <div className="flex-1 overflow-y-auto custom-scrollbar">
                              <div className="space-y-4">
                                  {transportStats.branchData.map((branch, idx) => (
                                      <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex justify-between items-center group hover:border-indigo-300 transition-all">
                                          <div className="min-w-0">
                                              <p className="text-sm font-bold text-gray-800 truncate">{branch.name}</p>
                                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Active Branch</p>
                                          </div>
                                          <div className="text-right">
                                              <p className="text-base font-black text-indigo-600">{formatCurrency(branch.amount)}</p>
                                          </div>
                                      </div>
                                  ))}
                                  {transportStats.branchData.length === 0 && (
                                      <div className="h-full flex flex-col items-center justify-center text-center py-20 text-gray-300 italic">
                                          <Map className="w-12 h-12 opacity-10 mb-2" />
                                          <p className="text-xs uppercase font-black tracking-widest">No branch data</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
                      <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                          <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs flex items-center gap-2">
                            <History className="w-4 h-4 text-emerald-500" /> Recent Booking Manifest (Analyzed)
                          </h3>
                          <button onClick={() => setRefreshToggle(v => v + 1)} className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"><RefreshCw className="w-4 h-4" /></button>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-left">
                              <thead className="bg-white text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                                  <tr>
                                      <th className="px-8 py-5">Trip ID</th>
                                      <th className="px-8 py-5">Customer</th>
                                      <th className="px-8 py-5">Vehicle</th>
                                      <th className="px-8 py-5">Branch</th>
                                      <th className="px-8 py-5 text-right">Revenue</th>
                                      <th className="px-8 py-5 text-center">Status</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                  {filteredTrips.slice(0, 10).map((trip, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-8 py-4 font-black text-gray-900">{trip.tripId}</td>
                                          <td className="px-8 py-4">
                                              <p className="font-bold text-gray-800 text-sm">{trip.userName}</p>
                                              <p className="text-[10px] text-gray-400 font-bold uppercase">{trip.tripCategory}</p>
                                          </td>
                                          <td className="px-8 py-4"><span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded border border-indigo-100">{trip.transportType}</span></td>
                                          <td className="px-8 py-4 text-gray-500 text-sm font-medium">{trip.branch}</td>
                                          <td className="px-8 py-4 text-right font-black text-gray-900">{formatCurrency(trip.totalPrice)}</td>
                                          <td className="px-8 py-4 text-center">
                                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${trip.bookingStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                  {trip.bookingStatus}
                                              </span>
                                          </td>
                                      </tr>
                                  ))}
                                  {filteredTrips.length === 0 && (
                                      <tr><td colSpan={6} className="py-20 text-center text-gray-300 font-black uppercase tracking-widest text-xs italic">No transport manifest found</td></tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default Reports;
