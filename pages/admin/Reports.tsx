
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import { 
  Download, TrendingUp, DollarSign, 
  Briefcase, ArrowUpRight, Car, MapPin, Activity, CheckSquare, Users, Percent, Calendar, Clock, Filter, PieChart as PieChartIcon,
  Share2, Mail, MessageCircle, FileText, Check, Loader2, Truck, Wallet, ReceiptIndianRupee
} from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, CorporateAccount, Branch } from '../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];

// Helper for strict 2-decimal currency formatting
const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const Reports: React.FC = () => {
  // Ref for PDF Capture
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Set 'Profit & Sharing' as default
  const [activeTab, setActiveTab] = useState<'Profit & Sharing' | 'Financial' | 'Payroll' | 'Driver Payments' | 'Transport'>('Profit & Sharing');
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]); // This loads payroll_history
  const [leads, setLeads] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]); // Need detailed staff to link payroll
  const [trips, setTrips] = useState<any[]>([]);
  const [driverPayments, setDriverPayments] = useState<any[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);

  // Session Info
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // Load Data with Strict Isolation
  useEffect(() => {
    // Helper to load specific key or namespaced key
    const loadData = (key: string, setter: any, isGlobal: boolean = false) => {
        if (isGlobal || isSuperAdmin) {
            // Super Admin loads everything aggregated OR global keys
            if (key === 'office_expenses' && isSuperAdmin) {
                // Aggregate expenses
                let all: any[] = [];
                try {
                    const adminData = JSON.parse(localStorage.getItem('office_expenses') || '[]');
                    all = [...all, ...adminData];
                    const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
                    corps.forEach((c: any) => {
                        const cData = JSON.parse(localStorage.getItem(`office_expenses_${c.email}`) || '[]');
                        all = [...all, ...cData];
                    });
                } catch(e) {}
                setter(all);
                return;
            }

            if (key === 'trips_data' && isSuperAdmin) {
                // Aggregate trips
                let all: any[] = [];
                try {
                    const adminData = JSON.parse(localStorage.getItem('trips_data') || '[]');
                    all = [...all, ...adminData];
                    const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
                    corps.forEach((c: any) => {
                        const cData = JSON.parse(localStorage.getItem(`trips_data_${c.email}`) || '[]');
                        all = [...all, ...cData];
                    });
                } catch(e) {}
                setter(all);
                return;
            }

            // Fallback for simple keys
            try {
                const data = localStorage.getItem(key);
                if (data) setter(JSON.parse(data));
            } catch (e) {}

        } else {
            // Franchise / Corporate User: Load ONLY namespaced data
            const targetKey = `${key}_${sessionId}`;
            try {
                const data = localStorage.getItem(targetKey);
                if (data) setter(JSON.parse(data));
                else setter([]); // Empty if no data yet
            } catch (e) { setter([]); }
        }
    };

    loadData('office_expenses', setExpenses);
    loadData('payroll_history', setPayroll); // Usually global/admin managed, or needs namespacing if decentralized payroll
    loadData('leads_data', setLeads);
    loadData('staff_data', setStaff);
    loadData('trips_data', setTrips);
    loadData('driver_payment_records', setDriverPayments); 
    
    // Corporate accounts list is only relevant for Super Admin reports
    if (isSuperAdmin) {
        loadData('corporate_accounts', setCorporates, true);
    }

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

  // --- Derived Stats for Financial Tab ---
  const financialStats = useMemo(() => {
      const totalIncome = expenses.filter(e => e.type === 'Income').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalExpense = expenses.filter(e => e.type === 'Expense').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const netProfit = totalIncome - totalExpense;
      
      return { totalIncome, totalExpense, netProfit };
  }, [expenses]);

  // --- Derived Stats for Profit Sharing Tab (Super Admin Only Logic usually, but safe to calc if data is filtered) ---
  const profitSharingData = useMemo(() => {
      // Calculate Total Company Profit (Mock Logic based on trip commissions + income - expenses)
      // In a real app, this would be strictly defined.
      const tripCommissionTotal = trips.reduce((sum, t) => sum + (Number(t.adminCommission) || 0), 0);
      const officeIncome = expenses.filter(e => e.type === 'Income').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const officeExpense = expenses.filter(e => e.type === 'Expense').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      
      const totalProfit = (tripCommissionTotal + officeIncome) - officeExpense;

      // Map corporates to their share
      const shares = corporates.map(corp => {
          const sharePercent = corp.profitSharingPercentage || 0;
          const amount = (totalProfit * sharePercent) / 100;
          return {
              name: corp.companyName,
              percent: sharePercent,
              amount: amount > 0 ? amount : 0,
              partners: corp.partners || []
          };
      });

      return { totalProfit, shares };
  }, [trips, expenses, corporates]);

  // --- Derived Stats for Payroll Tab ---
  const payrollStats = useMemo(() => {
      const totalPayout = payroll.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const totalEmployeesPaid = payroll.reduce((sum, p) => sum + (p.employeeCount || 0), 0);
      // Chart Data: Reverse to show oldest to newest if needed, or take last 6
      const chartData = payroll
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(p => ({
              name: new Date(p.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              amount: p.totalAmount
          }));
      return { totalPayout, totalEmployeesPaid, chartData };
  }, [payroll]);

  // --- Derived Stats for Driver Payments Tab ---
  const driverPaymentStats = useMemo(() => {
      const totalPaid = driverPayments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0);
      const pendingRequests = driverPayments.filter(p => p.status === 'Pending').length;
      
      // Chart Data: Group by type
      const typeDataObj: Record<string, number> = {};
      driverPayments.forEach(p => {
          if (p.status === 'Paid') {
              typeDataObj[p.type] = (typeDataObj[p.type] || 0) + p.amount;
          }
      });
      const typeChartData = Object.keys(typeDataObj).map(key => ({ name: key, value: typeDataObj[key] }));

      return { totalPaid, pendingRequests, typeChartData };
  }, [driverPayments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2>
          <p className="text-gray-500">
              {isSuperAdmin ? "Comprehensive insights across all branches" : "Insights for your franchise"}
          </p>
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

      <div ref={reportRef} className="space-y-6 bg-transparent">
          {activeTab === 'Profit & Sharing' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                  {/* Total Profit Card */}
                  <div className="lg:col-span-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                          <p className="text-emerald-100 font-medium mb-1">Net Profit Pool (YTD)</p>
                          <h3 className="text-5xl font-bold">{formatCurrency(profitSharingData.totalProfit)}</h3>
                          <p className="text-sm mt-4 opacity-90">Calculated from Trip Commissions + Office Income - Expenses</p>
                      </div>
                      <div className="absolute right-0 bottom-0 opacity-10">
                          <DollarSign className="w-64 h-64" />
                      </div>
                  </div>

                  {/* Corporate Shares List - Only visible to Super Admin or if you want franchise to see their own share */}
                  {isSuperAdmin ? (
                      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                              <PieChartIcon className="w-5 h-5 text-emerald-500" /> Corporate Profit Distribution
                          </h3>
                          <div className="space-y-6">
                              {profitSharingData.shares.map((corp, idx) => (
                                  <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                      <div className="flex justify-between items-center mb-2">
                                          <div className="flex items-center gap-2">
                                              <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                                              <div>
                                                  <h4 className="font-bold text-gray-800">{corp.name}</h4>
                                                  <p className="text-xs text-gray-500">{corp.percent}% Share</p>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <p className="text-lg font-bold text-emerald-600">{formatCurrency(corp.amount)}</p>
                                          </div>
                                      </div>
                                      
                                      {/* Partner Breakdown */}
                                      {corp.partners && corp.partners.length > 0 && (
                                          <div className="mt-3 pt-3 border-t border-gray-200 pl-4">
                                              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Partner Splits</p>
                                              <div className="grid grid-cols-2 gap-4">
                                                  {corp.partners.map((p, pIdx) => (
                                                      <div key={pIdx} className="flex justify-between text-sm">
                                                          <span className="text-gray-600">{p.name} ({p.share}%)</span>
                                                          <span className="font-medium text-gray-800">{formatCurrency((corp.amount * p.share) / 100)}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              ))}
                              {profitSharingData.shares.length === 0 && (
                                  <p className="text-center text-gray-500 py-8">No corporate accounts found.</p>
                              )}
                          </div>
                      </div>
                  ) : (
                      <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-500">
                          Profit Sharing details are managed by Head Office.
                      </div>
                  )}

                  {/* Chart - Only for Admin */}
                  {isSuperAdmin && (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
                          <h3 className="font-bold text-gray-800 mb-6">Distribution Overview</h3>
                          <div className="flex-1 min-h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                      <Pie
                                          data={profitSharingData.shares}
                                          dataKey="amount"
                                          nameKey="name"
                                          cx="50%"
                                          cy="50%"
                                          innerRadius={60}
                                          outerRadius={80}
                                          paddingAngle={5}
                                      >
                                          {profitSharingData.shares.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                          ))}
                                      </Pie>
                                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                      <Legend verticalAlign="bottom" height={36} />
                                  </PieChart>
                              </ResponsiveContainer>
                          </div>
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
                          <p className="text-sm text-gray-500 mb-1">Net Balance</p>
                          <h3 className={`text-2xl font-bold ${financialStats.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(financialStats.netProfit)}</h3>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96">
                      <h3 className="font-bold text-gray-800 mb-6">Income vs Expense Trend</h3>
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                              data={[
                                  { name: 'Jan', Income: 4000, Expense: 2400 },
                                  { name: 'Feb', Income: 3000, Expense: 1398 },
                                  { name: 'Mar', Income: 2000, Expense: 9800 },
                                  { name: 'Apr', Income: 2780, Expense: 3908 },
                                  { name: 'May', Income: 1890, Expense: 4800 },
                                  { name: 'Jun', Income: 2390, Expense: 3800 },
                              ]}
                          >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="Income" fill="#10b981" />
                              <Bar dataKey="Expense" fill="#ef4444" />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          )}

          {activeTab === 'Payroll' && (
              <div className="space-y-6 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                          <div>
                              <p className="text-sm text-gray-500 mb-1">Total Payroll Payout</p>
                              <h3 className="text-3xl font-bold text-indigo-600">{formatCurrency(payrollStats.totalPayout)}</h3>
                          </div>
                          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                              <DollarSign className="w-8 h-8" />
                          </div>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                          <div>
                              <p className="text-sm text-gray-500 mb-1">Processed Batches</p>
                              <h3 className="text-3xl font-bold text-gray-800">{payroll.length}</h3>
                          </div>
                          <div className="p-3 bg-gray-100 text-gray-600 rounded-lg">
                              <FileText className="w-8 h-8" />
                          </div>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-indigo-500" /> Payroll History Trend
                      </h3>
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={payrollStats.chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              <Legend />
                              <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          )}

          {activeTab === 'Driver Payments' && (
              <div className="space-y-6 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                          <div>
                              <p className="text-sm text-gray-500 mb-1">Total Driver Compensation</p>
                              <h3 className="text-3xl font-bold text-emerald-600">{formatCurrency(driverPaymentStats.totalPaid)}</h3>
                          </div>
                          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                              <ReceiptIndianRupee className="w-8 h-8" />
                          </div>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                          <div>
                              <p className="text-sm text-gray-500 mb-1">Pending Requests</p>
                              <h3 className="text-3xl font-bold text-orange-600">{driverPaymentStats.pendingRequests}</h3>
                          </div>
                          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                              <Clock className="w-8 h-8" />
                          </div>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <Truck className="w-5 h-5 text-emerald-500" /> Payment Breakdown by Type
                      </h3>
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={driverPaymentStats.typeChartData} layout="vertical" margin={{ left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" />
                              <YAxis dataKey="name" type="category" width={100} />
                              <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              <Legend />
                              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={40} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          )}

          {activeTab === 'Transport' && (
              <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm animate-in fade-in">
                  <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800">Transport Reports</h3>
                  <p className="text-gray-500 mt-2">Detailed vehicle utilization, trip analytics and mileage reports.</p>
                  <p className="text-xs text-gray-400 mt-4">Coming in next update.</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default Reports;
