import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import { 
  Download, TrendingUp, DollarSign, 
  Briefcase, ArrowUpRight, Car, MapPin, Activity, CheckSquare, Users, Percent, Calendar, Clock, Filter, PieChart as PieChartIcon,
  Share2, Mail, MessageCircle, FileText, Check, Loader2, Truck, Wallet, ReceiptIndianRupee, RefreshCw, TrendingDown, History, Landmark, X, Building2, ChevronDown, Database
} from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, CorporateAccount, Branch, Employee } from '../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const Reports: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'Profit & Sharing' | 'Financial' | 'Payroll' | 'Driver Payments' | 'Transport'>('Profit & Sharing');
  
  // -- Filter State --
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

  // Aggregation Logic with strict scoping
  const loadAggregatedData = (key: string) => {
      let aggregated: any[] = [];
      
      if (isSuperAdmin) {
          // Load HO Data
          const adminData = localStorage.getItem(key);
          if (adminData) {
              try { 
                  const parsed = JSON.parse(adminData);
                  aggregated = [...parsed.map((item: any) => ({ ...item, corporateId: 'admin' }))]; 
              } catch(e) {}
          }
          // Load All Franchise Data
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
          // ONLY Load THIS franchise's data
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

  useEffect(() => {
    const fetchData = () => {
        setExpenses(loadAggregatedData('office_expenses'));
        setPayroll(loadAggregatedData('payroll_history'));
        setTrips(loadAggregatedData('trips_data'));
        setDriverPayments(loadAggregatedData('driver_payment_records'));
        setCorporates(JSON.parse(localStorage.getItem('corporate_accounts') || '[]'));
        
        // Load Staff for Branch Mapping
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

        // Load Branches strictly for the current user's scope
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

    fetchData();

    const handleStorage = (e: StorageEvent) => {
        if (e.key?.includes('_data') || e.key?.includes('expenses') || e.key?.includes('records') || e.key === 'corporate_accounts' || e.key?.includes('payroll_history')) {
            fetchData();
            setRefreshToggle(v => v + 1);
        }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isSuperAdmin, sessionId]);

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

  // --- Filtering Helper ---
  const applyFilters = (data: any[]) => {
      let filtered = data;

      // 1. Corporate Filter
      if (isSuperAdmin && filterCorporate !== 'All') {
          filtered = filtered.filter(item => item.corporateId === filterCorporate);
      }

      // 2. Branch Filter
      if (filterBranch !== 'All') {
          filtered = filtered.filter(item => item.branch === filterBranch || item.branchName === filterBranch);
      }

      // 3. Date Filter
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

  // --- Filtered Datasets ---
  const filteredExpenses = useMemo(() => applyFilters(expenses), [expenses, filterType, selectedDate, selectedMonth, filterCorporate, filterBranch, isSuperAdmin, sessionId]);
  const filteredTrips = useMemo(() => applyFilters(trips), [trips, filterType, selectedDate, selectedMonth, filterCorporate, filterBranch, isSuperAdmin, sessionId]);
  const filteredDriverPayments = useMemo(() => applyFilters(driverPayments), [driverPayments, filterType, selectedDate, selectedMonth, filterCorporate, filterBranch, isSuperAdmin, sessionId]);

  // Special Filter for Payroll (Join with Staff to get Branch)
  const filteredPayroll = useMemo(() => {
    let base = payroll;
    if (isSuperAdmin && filterCorporate !== 'All') {
        base = base.filter(p => p.corporateId === filterCorporate);
    }

    // Map each batch to only include relevant branch employees if branch filter is on
    const filteredBatches = base.map(batch => {
        if (filterBranch === 'All') return batch;
        
        const filteredEntries: Record<string, any> = {};
        let filteredAmount = 0;
        let filteredCount = 0;

        Object.entries(batch.data).forEach(([empId, entry]: [string, any]) => {
            const employee = staff.find(s => s.id === empId);
            if (employee && employee.branch === filterBranch) {
                filteredEntries[empId] = entry;
                filteredCount++;
                // Net Pay calculation within batch context
                const net = (entry.basicSalary + entry.allowances + entry.bonus) - (entry.deductions + entry.advanceDeduction);
                filteredAmount += net;
            }
        });

        return {
            ...batch,
            employeeCount: filteredCount,
            totalAmount: filteredAmount,
            data: filteredEntries
        };
    }).filter(batch => batch.employeeCount > 0);

    // Apply standard date filter on the resulting batches
    if (filterType !== 'All') {
        return filteredBatches.filter(item => {
            if (filterType === 'Date') return item.date.startsWith(selectedDate);
            if (filterType === 'Month') return item.date.startsWith(selectedMonth);
            return true;
        });
    }

    return filteredBatches;
  }, [payroll, staff, filterType, selectedDate, selectedMonth, filterCorporate, filterBranch, isSuperAdmin]);

  const availableBranches = useMemo(() => {
    return Array.from(new Set(branches.map(b => b.name)));
  }, [branches]);

  const financialStats = useMemo(() => {
      const totalIncome = filteredExpenses.filter(e => e.type === 'Income').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalExpense = filteredExpenses.filter(e => e.type === 'Expense').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const netProfit = totalIncome - totalExpense;
      return { totalIncome, totalExpense, netProfit };
  }, [filteredExpenses]);

  const profitSharingData = useMemo(() => {
      const tripCommissionTotal = filteredTrips.reduce((sum, t) => sum + (Number(t.adminCommission) || 0), 0);
      const officeIncome = filteredExpenses.filter(e => e.type === 'Income').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const officeExpense = filteredExpenses.filter(e => e.type === 'Expense').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalProfit = (tripCommissionTotal + officeIncome) - officeExpense;

      const shares = corporates.map(corp => {
          const sharePercent = corp.profitSharingPercentage || 0;
          const amount = (totalProfit * sharePercent) / 100;
          return {
              id: corp.email,
              name: corp.companyName,
              percent: sharePercent,
              amount: amount > 0 ? amount : 0
          };
      });

      // Filter shares based on corporate selection for Super Admin, or sessionId for Franchise
      const filteredShares = isSuperAdmin 
        ? (filterCorporate === 'All' ? shares : shares.filter(s => s.id === filterCorporate))
        : shares.filter(s => s.id === sessionId);

      return { totalProfit, shares: filteredShares };
  }, [filteredTrips, filteredExpenses, corporates, isSuperAdmin, filterCorporate, sessionId]);

  const payrollStats = useMemo(() => {
      const totalDisbursed = filteredPayroll.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
      const totalBatches = filteredPayroll.length;
      const totalEmployeesPaid = filteredPayroll.reduce((sum, p) => sum + (Number(p.employeeCount) || 0), 0);
      const avgSalary = totalEmployeesPaid > 0 ? totalDisbursed / totalEmployeesPaid : 0;
      
      const historyData = filteredPayroll.map(p => ({
          date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' }),
          amount: p.totalAmount,
          count: p.employeeCount
      })).reverse();

      return { totalDisbursed, totalBatches, avgSalary, historyData };
  }, [filteredPayroll]);

  const driverPaymentStats = useMemo(() => {
      const totalPaid = filteredDriverPayments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const pendingRequests = filteredDriverPayments.filter(p => p.status === 'Pending').length;
      const typeDataObj: Record<string, number> = {};
      filteredDriverPayments.forEach(p => {
          if (p.status === 'Paid') {
              typeDataObj[p.type] = (typeDataObj[p.type] || 0) + (Number(p.amount) || 0);
          }
      });
      const typeChartData = Object.keys(typeDataObj).map(key => ({ name: key, value: typeDataObj[key] }));
      return { totalPaid, pendingRequests, typeChartData };
  }, [filteredDriverPayments]);

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
      
      const rows = profitSharingData.shares.map(s => [
          s.name,
          `${s.percent}%`,
          s.amount.toFixed(2),
          period
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
          + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      
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
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2>
          <p className="text-gray-500">{isSuperAdmin ? "Consolidated Insights (Admin)" : "Insights (Franchise)"}</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {['Profit & Sharing', 'Financial', 'Payroll', 'Driver Payments', 'Transport'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white shadow text-emerald-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    {tab}
                </button>
            ))}
        </div>
        <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-slate-900 transition-colors"
        >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />}
            Export PDF
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-bold text-gray-700">Scope:</span>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center flex-1">
              {/* Entity Filters */}
              {isSuperAdmin && (
                <div className="relative group min-w-[160px]">
                    <select 
                        value={filterCorporate} 
                        onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }}
                        className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                    >
                        <option value="All">All Corporates</option>
                        <option value="admin">Head Office</option>
                        {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                    </select>
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}

              <div className="relative group min-w-[140px]">
                  <select 
                      value={filterBranch} 
                      onChange={(e) => setFilterBranch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                  >
                      <option value="All">All Branches</option>
                      {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="h-6 w-px bg-gray-200 mx-1 hidden lg:block"></div>

              {/* Period Filters */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                  {(['All', 'Date', 'Month'] as const).map(type => (
                      <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === type ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          {type === 'All' ? 'All' : type === 'Date' ? 'Daily' : 'Monthly'}
                      </button>
                  ))}
              </div>

              {filterType === 'Date' && (
                  <div className="flex items-center gap-2 animate-in zoom-in-95">
                      <input 
                          type="date" 
                          value={selectedDate} 
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                      />
                  </div>
              )}
              {filterType === 'Month' && (
                  <div className="flex items-center gap-2 animate-in zoom-in-95">
                      <input 
                          type="month" 
                          value={selectedMonth} 
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                      />
                  </div>
              )}

              <button 
                  onClick={resetFilters}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors ml-auto"
                  title="Reset All Filters"
              >
                  <RefreshCw className="w-4 h-4" />
              </button>
          </div>

          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest hidden xl:block border-l border-gray-100 pl-4">
              {filterType === 'All' ? 'Viewing Life-time' : filterType === 'Date' ? `${new Date(selectedDate).toLocaleDateString()}` : `${new Date(selectedMonth).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`}
          </div>
      </div>

      <div ref={reportRef} className="space-y-6 bg-transparent">
          {activeTab === 'Profit & Sharing' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                  <div className="lg:col-span-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden group">
                      <div className="relative z-10">
                          <div className="flex justify-between items-start">
                              <div>
                                  <p className="text-emerald-100 font-medium mb-1 uppercase tracking-widest text-xs">
                                     Net Profit Allocation
                                  </p>
                                  <h3 className="text-5xl font-bold">{formatCurrency(profitSharingData.totalProfit)}</h3>
                              </div>
                              <button 
                                  onClick={handleBackupProfitReport}
                                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all transform active:scale-95 shadow-sm"
                              >
                                  <Database className="w-4 h-4" />
                                  Backup Report
                              </button>
                          </div>
                          <p className="text-sm mt-4 opacity-90 max-w-2xl">
                              {isSuperAdmin ? "Aggregated profit across HO and all Franchise partners." : "Your total profit generated from trip commissions and office operations."}
                          </p>
                      </div>
                      <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform duration-700"><DollarSign className="w-64 h-64" /></div>
                  </div>

                  <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <PieChartIcon className="w-5 h-5 text-emerald-500" /> 
                          {isSuperAdmin ? "Franchise Distribution" : "Your Agreed Earnings"}
                      </h3>
                      <div className="space-y-4">
                          {profitSharingData.shares.map((corp, idx) => (
                              <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                  <div className="flex justify-between items-center">
                                      <div>
                                          <h4 className="font-bold text-gray-800">{corp.name}</h4>
                                          <p className="text-xs text-gray-500">{corp.percent}% Agreed Share</p>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-lg font-bold text-emerald-600">{formatCurrency(corp.amount)}</p>
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {profitSharingData.shares.length === 0 && (
                              <div className="text-center py-10 text-gray-400 italic">No share data available for this selection.</div>
                          )}
                      </div>
                  </div>

                  {profitSharingData.shares.length > 1 && (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full min-h-[400px]">
                          <h3 className="font-bold text-gray-800 mb-6">Distribution Visual</h3>
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={profitSharingData.shares} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                      {profitSharingData.shares.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                  </Pie>
                                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                  <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'Financial' && (
              <div className="space-y-6 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-sm text-gray-500 mb-1">Total Income</p>
                          <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(financialStats.totalIncome)}</h3>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
                          <h3 className="text-2xl font-bold text-red-600">{formatCurrency(financialStats.totalExpense)}</h3>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <p className="text-sm text-gray-500 mb-1">Net Cash Flow</p>
                          <h3 className={`text-2xl font-bold ${financialStats.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(financialStats.netProfit)}</h3>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'Payroll' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                  <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                              <Landmark className="w-5 h-5 text-indigo-500" /> Salary Disbursement Analytics
                          </h3>
                          <div className="grid grid-cols-3 gap-4 mb-8">
                              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                  <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider">Disbursed</p>
                                  <h4 className="text-2xl font-black text-indigo-700 mt-1">{formatCurrency(payrollStats.totalDisbursed)}</h4>
                              </div>
                              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                  <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider">Avg. / Staff</p>
                                  <h4 className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(payrollStats.avgSalary)}</h4>
                              </div>
                              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                  <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">Batches</p>
                                  <h4 className="text-2xl font-black text-blue-700 mt-1">{payrollStats.totalBatches}</h4>
                              </div>
                          </div>
                          
                          <div className="h-64 mt-4">
                              <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={payrollStats.historyData}>
                                      <defs>
                                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                          </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                      <Area type="monotone" dataKey="amount" name="Payout" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                                  </AreaChart>
                              </ResponsiveContainer>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full min-h-[400px]">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-500" /> Staff Volume Trend
                      </h3>
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={payrollStats.historyData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                              <Tooltip cursor={{fill: '#f9fafb'}} />
                              <Bar dataKey="count" name="Staff Count" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          )}

          {activeTab === 'Driver Payments' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                  <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <ReceiptIndianRupee className="w-5 h-5 text-indigo-500" /> Driver Compensation Overview
                      </h3>
                      <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                              <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider">Total Paid Compensations</p>
                              <h4 className="text-3xl font-black text-indigo-700 mt-1">{formatCurrency(driverPaymentStats.totalPaid)}</h4>
                          </div>
                          <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                              <p className="text-amber-600 text-xs font-bold uppercase tracking-wider">Pending Payout Claims</p>
                              <h4 className="text-3xl font-black text-amber-700 mt-1">{driverPaymentStats.pendingRequests}</h4>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full min-h-[400px]">
                      <h3 className="font-bold text-gray-800 mb-6">Payment Distribution</h3>
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={driverPaymentStats.typeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                  {driverPaymentStats.typeChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          )}

          {activeTab === 'Transport' && (
              <div className="bg-white p-20 rounded-xl border border-dashed border-gray-200 text-center text-gray-400">
                  <Truck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-bold">Transport Operational Analysis</p>
                  <p className="text-sm">Coming soon in next update. Generating fleet utilization heatmaps.</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default Reports;