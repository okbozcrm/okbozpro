import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, 
  Download, DollarSign, 
  CreditCard, Briefcase, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';
import { CorporateAccount, Expense, PayrollEntry, Trip } from '../../types';
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
}

const Reports: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const userRole = localStorage.getItem('user_role');
  const isSuperAdmin = userRole === 'ADMIN';
  const contextOwnerId = isSuperAdmin ? 'admin' : (localStorage.getItem('logged_in_employee_corporate_id') || sessionId);

  // State
  const [dateFilter, setDateFilter] = useState('This Month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCorporate, setSelectedCorporate] = useState('All');
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  
  // Data State
  const [officeExpenses, setOfficeExpenses] = useState<Expense[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<PayrollHistoryRecord[]>([]);
  const [driverPayments, setDriverPayments] = useState<DriverPayment[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Load Data
  useEffect(() => {
    const loadData = () => {
      const corps: CorporateAccount[] = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      setCorporates(corps);

      // Helper to fetch data from multiple keys if Super Admin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchData = (baseKey: string) => {
        let data: any[] = [];
        if (isSuperAdmin) {
          const rootData = JSON.parse(localStorage.getItem(baseKey) || '[]');
          data = [...rootData];
          corps.forEach(c => {
            const cData = JSON.parse(localStorage.getItem(`${baseKey}_${c.email}`) || '[]');
            data = [...data, ...cData];
          });
        } else {
          const key = contextOwnerId === 'admin' ? baseKey : `${baseKey}_${contextOwnerId}`;
          data = JSON.parse(localStorage.getItem(key) || '[]');
        }
        return data;
      };

      setOfficeExpenses(fetchData('office_expenses'));
      setPayrollHistory(fetchData('payroll_history'));
      setDriverPayments(fetchData('driver_payment_records'));
      setTrips(fetchData('trips_data'));
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [isSuperAdmin, contextOwnerId]);

  // Filter Logic
  const filterDataByDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    
    if (dateFilter === 'This Month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    } else if (dateFilter === 'Last Month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
    } else if (dateFilter === 'This Year') {
      return date.getFullYear() === now.getFullYear();
    } else if (dateFilter === 'Custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    return true; // All Time
  };

  const filterByCorporate = (itemCorpId?: string) => {
    if (!isSuperAdmin) return true;
    if (selectedCorporate === 'All') return true;
    return itemCorpId === selectedCorporate;
  };

  // --- CALCULATIONS ---

  // 1. Office Expenses (Only type === 'Expense')
  const filteredOfficeExpenses = useMemo(() => {
    return officeExpenses.filter(e => 
      e.type === 'Expense' && 
      filterDataByDate(e.date) && 
      filterByCorporate(e.corporateId)
    );
  }, [officeExpenses, dateFilter, customStartDate, customEndDate, selectedCorporate]);

  const totalOfficeExpenses = filteredOfficeExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 2. Payroll (Total Net Payout)
  const filteredPayroll = useMemo(() => {
    return payrollHistory.filter(p => 
      filterDataByDate(p.date) 
      // Note: Payroll history structure might not strictly have corporateId on the root object in all legacy data, 
      // but usually it's scoped by storage key. For Super Admin aggregation, we might need to rely on the source.
      // However, for simplicity and based on current structure, we assume the fetched data is already correct.
      // If specific corporate filtering is needed on aggregated payroll, we'd need corporateId on the record.
      // Assuming 'name' or context implies it, or we accept all for now if corporateId is missing.
    );
  }, [payrollHistory, dateFilter, customStartDate, customEndDate]);

  const totalPayroll = filteredPayroll.reduce((sum, p) => sum + p.totalAmount, 0);

  // 3. Driver Payments (Status === 'Paid')
  const filteredDriverPayments = useMemo(() => {
    return driverPayments.filter(p => 
      p.status === 'Paid' && 
      filterDataByDate(p.date) && 
      filterByCorporate(p.corporateId)
    );
  }, [driverPayments, dateFilter, customStartDate, customEndDate, selectedCorporate]);

  const totalDriverPayments = filteredDriverPayments.reduce((sum, p) => sum + p.amount, 0);

  // --- TOTAL EXPENSES ---
  const totalExpenses = totalOfficeExpenses + totalPayroll + totalDriverPayments;


  // 4. Revenue (Admin Commission from Trips)
  const filteredTrips = useMemo(() => {
    return trips.filter(t => 
      filterDataByDate(t.date) && 
      filterByCorporate(t.ownerId)
    );
  }, [trips, dateFilter, customStartDate, customEndDate, selectedCorporate]);

  const totalRevenue = filteredTrips.reduce((sum, t) => sum + (t.adminCommission || 0), 0);


  // --- NET PROFIT ---
  const netProfit = totalRevenue - totalExpenses;


  // Chart Data
  const expenseDistribution = [
    { name: 'Office Expenses', value: totalOfficeExpenses, color: '#EF4444' }, // Red
    { name: 'Payroll', value: totalPayroll, color: '#F59E0B' }, // Amber
    { name: 'Driver Payouts', value: totalDriverPayments, color: '#3B82F6' }, // Blue
  ].filter(d => d.value > 0);

  const profitData = [
    { name: 'Revenue', value: totalRevenue },
    { name: 'Expenses', value: totalExpenses },
    { name: 'Profit', value: Math.max(0, netProfit) },
  ];

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500" id="reports-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Financial Reports & Analytics</h2>
          <p className="text-gray-500">Comprehensive overview of revenue, expenses, and profitability</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {isSuperAdmin && (
            <select 
              value={selectedCorporate} 
              onChange={(e) => setSelectedCorporate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="All">All Corporates</option>
              <option value="admin">Head Office</option>
              {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
            </select>
          )}
          
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
            <option value="This Year">This Year</option>
            <option value="All Time">All Time</option>
            <option value="Custom">Custom Range</option>
          </select>

          {dateFilter === 'Custom' && (
            <div className="flex gap-2">
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
            </div>
          )}

          <button onClick={exportPDF} disabled={isExporting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            {isExporting ? 'Exporting...' : <><Download className="w-4 h-4" /> Export PDF</>}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
              <h3 className="text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Admin Commission
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p>
              <h3 className="text-3xl font-bold text-gray-900">₹{totalExpenses.toLocaleString()}</h3>
              <p className="text-xs text-rose-600 font-medium mt-2 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Office + Payroll + Driver
              </p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
        </div>

        {/* Net Profit Card */}
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group ${netProfit >= 0 ? 'bg-gradient-to-br from-white to-emerald-50/30' : 'bg-gradient-to-br from-white to-rose-50/30'}`}>
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Net Profit</p>
              <h3 className={`text-3xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                ₹{netProfit.toLocaleString()}
              </h3>
              <p className={`text-xs font-medium mt-2 flex items-center gap-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {netProfit >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {netProfit >= 0 ? 'Profitable' : 'Loss'}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
          <div className={`absolute bottom-0 left-0 w-full h-1 ${netProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600'} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expense Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Expense Breakdown</h3>
          <div className="h-80 w-full">
            {expenseDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie width={400} height={400}>
                  <Pie
                    data={expenseDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 italic">No expense data available</div>
            )}
          </div>
        </div>

        {/* Profitability Overview */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Profitability Overview</h3>
          <div className="h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                  <RechartsTooltip formatter={(value: number) => `₹${value.toLocaleString()}`} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {profitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : index === 1 ? '#EF4444' : '#6366F1'} />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Detailed Financial Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">% of Total Expenses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium text-gray-900">Office Expenses</td>
                <td className="px-6 py-4 text-gray-500">Operational</td>
                <td className="px-6 py-4 text-right font-medium">₹{totalOfficeExpenses.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-gray-500">{totalExpenses > 0 ? ((totalOfficeExpenses / totalExpenses) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium text-gray-900">Payroll</td>
                <td className="px-6 py-4 text-gray-500">Staff Salaries</td>
                <td className="px-6 py-4 text-right font-medium">₹{totalPayroll.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-gray-500">{totalExpenses > 0 ? ((totalPayroll / totalExpenses) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium text-gray-900">Driver Payouts</td>
                <td className="px-6 py-4 text-gray-500">Incentives & Claims</td>
                <td className="px-6 py-4 text-right font-medium">₹{totalDriverPayments.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-gray-500">{totalExpenses > 0 ? ((totalDriverPayments / totalExpenses) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className="bg-gray-50 font-bold">
                <td className="px-6 py-4 text-gray-900">Total Expenses</td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 text-right text-rose-600">₹{totalExpenses.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
