
import React, { useMemo, useState, useEffect } from 'react';
import { Download, TrendingUp, DollarSign, FileText, CheckCircle, Clock, Plus, AlertCircle, X, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, SalaryAdvanceRequest } from '../../types';

const UserSalary: React.FC = () => {
  const [user, setUser] = useState<Employee | null>(null);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ amount: '', reason: '' });
  const [advanceHistory, setAdvanceHistory] = useState<SalaryAdvanceRequest[]>([]);

  // Payout Settings State
  const [payoutSettings, setPayoutSettings] = useState({
      dates: {} as Record<string, string>,
      globalDay: '5'
  });

  // Helper to safely calculate payout date (handles Feb 30 -> Feb 28/29)
  const getSafePayoutDate = (year: number, monthIndex: number, targetDay: number): Date => {
    // Get the last day of the specific month
    // monthIndex + 1, day 0 gives the last day of monthIndex
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const safeDay = Math.min(targetDay, daysInMonth);
    return new Date(year, monthIndex, safeDay);
  };

  // Helper to find employee by ID across all storage locations
  const findEmployeeById = (id: string): Employee | undefined => {
      // 1. Check Admin Staff
      try {
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        let found = adminStaff.find((e: any) => e.id === id);
        if (found) return found;
      } catch(e) {}

      // 2. Check Corporate Staff
      try {
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        for (const corp of corporates) {
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]');
            const found = cStaff.find((e: any) => e.id === id);
            if (found) return found;
        }
      } catch(e) {}

      // 3. Check Mocks
      return MOCK_EMPLOYEES.find(e => e.id === id);
  };

  // Resolve Logged In User & Load Advances & Payout Settings
  useEffect(() => {
      const storedSessionId = localStorage.getItem('app_session_id');
      if (storedSessionId) {
          const found = findEmployeeById(storedSessionId);
          setUser(found || MOCK_EMPLOYEES[0]);
      } else {
          setUser(MOCK_EMPLOYEES[0]);
      }

      // Load Payout Settings
      try {
          const dates = JSON.parse(localStorage.getItem('company_payout_dates') || '{}');
          const globalDay = localStorage.getItem('company_global_payout_day') || '5';
          setPayoutSettings({ dates, globalDay });
      } catch(e) {
          console.error("Error loading payout settings", e);
      }
  }, []);

  // Load Advance History
  useEffect(() => {
      if(!user) return;
      
      const loadAdvances = () => {
          const allAdvances = JSON.parse(localStorage.getItem('salary_advances') || '[]');
          const myAdvances = allAdvances.filter((a: SalaryAdvanceRequest) => a.employeeId === user.id);
          setAdvanceHistory(myAdvances.sort((a: any, b: any) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
      };
      
      loadAdvances();
      
      // Listen for changes
      const handleStorageChange = () => loadAdvances();
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  const handleRequestAdvance = (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      if (!advanceForm.amount || !advanceForm.reason) {
          alert("Please fill all details");
          return;
      }

      const newRequest: SalaryAdvanceRequest = {
          id: `ADV-${Date.now()}`,
          employeeId: user.id,
          employeeName: user.name,
          amountRequested: parseFloat(advanceForm.amount),
          amountApproved: 0,
          reason: advanceForm.reason,
          status: 'Pending',
          requestDate: new Date().toISOString(),
          corporateId: '' 
      };

      const existing = JSON.parse(localStorage.getItem('salary_advances') || '[]');
      const updated = [newRequest, ...existing];
      localStorage.setItem('salary_advances', JSON.stringify(updated));
      
      setAdvanceHistory(prev => [newRequest, ...prev]);
      setIsAdvanceModalOpen(false);
      setAdvanceForm({ amount: '', reason: '' });
      alert("Advance request submitted successfully!");
  };

  // Dynamically calculate salary based on this month's attendance
  const salaryData = useMemo(() => {
    if (!user) return null;

    const monthlyCtc = parseFloat(user.salary || '65000');
    const attendance = getEmployeeAttendance(user, 2025, 10); // Using Nov 2025 mock context
    const daysInMonth = 30;
    
    let payableDays = 0;
    attendance.forEach(day => {
        if (day.status === AttendanceStatus.PRESENT || 
            day.status === AttendanceStatus.WEEK_OFF || 
            day.status === AttendanceStatus.PAID_LEAVE) {
            payableDays += 1;
        } else if (day.status === AttendanceStatus.HALF_DAY) {
            payableDays += 0.5;
        }
    });

    const perDaySalary = monthlyCtc / daysInMonth;
    const grossEarned = Math.round(perDaySalary * payableDays);

    const basicSalary = Math.round(grossEarned * 0.5);
    const hra = Math.round(grossEarned * 0.3);
    const allowances = Math.round(grossEarned * 0.2);
    
    // Auto-Deduct Paid Advances for this month
    const paidAdvances = advanceHistory
        .filter(a => a.status === 'Paid')
        .reduce((sum, item) => sum + (item.amountApproved || 0), 0);

    const netPay = grossEarned - paidAdvances;

    // Determine Payout Date from Admin Settings
    let payoutDay = parseInt(payoutSettings.globalDay) || 5;
    if (user.department && payoutSettings.dates[user.department]) {
        payoutDay = parseInt(payoutSettings.dates[user.department]) || payoutDay;
    }
    
    // Context is Salary Month Nov 2025 -> Payout Month Dec 2025
    // Safe date calculation (e.g., if Payout is 31st, Dec has 31, so it works. 
    // If it was Feb, getSafePayoutDate handles it)
    const payoutDateObj = getSafePayoutDate(2025, 11, payoutDay); // 11 is December
    const payoutDateStr = payoutDateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

    return {
        month: 'November 2025',
        netPay,
        grossEarned,
        workingDays: daysInMonth,
        paidDays: payableDays,
        payoutDate: payoutDateStr,
        status: 'Pending',
        earnings: [
            { label: 'Basic Salary', amount: basicSalary },
            { label: 'HRA', amount: hra },
            { label: 'Special Allowance', amount: allowances },
        ],
        deductions: paidAdvances > 0 ? [{ label: 'Salary Advance Rec.', amount: paidAdvances }] : []
    };
  }, [user, advanceHistory, payoutSettings]);

  // Generate History based on Joining Date
  const salaryHistory = useMemo(() => {
    if (!user) return [];

    // Determine configured day for history dates consistency
    let payoutDay = parseInt(payoutSettings.globalDay) || 5;
    if (user.department && payoutSettings.dates[user.department]) {
        payoutDay = parseInt(payoutSettings.dates[user.department]) || payoutDay;
    }

    const history = [];
    const joinDate = new Date(user.joiningDate);
    // Start of the joining month
    const joinMonthStart = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1); 
    
    // Assuming "Today" in app context is Nov 2025 for consistency with dashboard
    const contextToday = new Date(2025, 10, 15); // Nov 15, 2025
    let iteratorDate = new Date(contextToday.getFullYear(), contextToday.getMonth() - 1, 1); // Start from previous month (Oct 2025)

    // Generate up to 6 months of history
    for (let i = 0; i < 6; i++) {
        // Stop if the iterator month is before the joining month
        if (iteratorDate < joinMonthStart) break;

        const monthStr = iteratorDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const baseAmount = parseFloat(user.salary || '0');
        
        let amount = baseAmount;
        
        // If this is the joining month, maybe partial?
        if (iteratorDate.getMonth() === joinDate.getMonth() && iteratorDate.getFullYear() === joinDate.getFullYear()) {
             // Pro-rate for joining month
             const daysInMonth = new Date(iteratorDate.getFullYear(), iteratorDate.getMonth() + 1, 0).getDate();
             const daysWorked = daysInMonth - joinDate.getDate() + 1;
             if (daysWorked < daysInMonth) {
                 amount = Math.round((baseAmount / daysInMonth) * daysWorked);
             }
        }

        // Payout is typically the next month. 
        // E.g. Salary for Oct is paid in Nov.
        const payoutMonthIndex = iteratorDate.getMonth() + 1; 
        const payoutYear = iteratorDate.getFullYear() + (payoutMonthIndex > 11 ? 1 : 0);
        // Normalize month index if it rolled over (0-11)
        const normalizedPayoutMonthIndex = payoutMonthIndex > 11 ? 0 : payoutMonthIndex;

        const payoutDate = getSafePayoutDate(payoutYear, normalizedPayoutMonthIndex, payoutDay);

        history.push({
            month: monthStr,
            amount: amount,
            status: 'Paid',
            date: payoutDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
        });

        // Move back one month
        iteratorDate.setMonth(iteratorDate.getMonth() - 1);
    }

    return history;
  }, [user, payoutSettings]);

  if (!user || !salaryData) {
      return <div className="p-8 text-center text-gray-500">Loading salary details...</div>;
  }

  const totalEarnings = salaryData.earnings.reduce((acc, curr) => acc + curr.amount, 0);
  const totalDeductions = salaryData.deductions.reduce((acc, curr) => acc + curr.amount, 0);

  const chartData = [...salaryHistory].reverse().map(item => ({
    name: item.month.split(' ')[0],
    amount: item.amount
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Salary</h2>
          <p className="text-gray-500">View your salary structure and payslip history</p>
        </div>
        <button 
            onClick={() => setIsAdvanceModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all flex items-center gap-2"
        >
           <Plus className="w-4 h-4" /> Request Advance
        </button>
      </div>

      {/* Advance Request Modal */}
      {isAdvanceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="font-bold text-gray-800">Request Salary Advance</h3>
                      <button onClick={() => setIsAdvanceModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                  </div>
                  <form onSubmit={handleRequestAdvance} className="p-6 space-y-4">
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 mb-2">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          Advance amount will be deducted from your next salary payout.
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Amount Required (₹)</label>
                          <input 
                              type="number" 
                              required 
                              min="500"
                              max={parseFloat(user.salary || '0') / 2}
                              value={advanceForm.amount}
                              onChange={(e) => setAdvanceForm({...advanceForm, amount: e.target.value})}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="e.g. 5000"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                          <textarea 
                              required
                              rows={3}
                              value={advanceForm.reason}
                              onChange={(e) => setAdvanceForm({...advanceForm, reason: e.target.value})}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                              placeholder="Reason for advance..."
                          />
                      </div>
                      <button type="submit" className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-bold shadow-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                          <Send className="w-4 h-4" /> Submit Request
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Advance History (Only show if exists) */}
      {advanceHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-800 text-sm">Advance Requests History</div>
              <div className="p-4 space-y-3">
                  {advanceHistory.map(req => (
                      <div key={req.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                          <div>
                              <div className="font-bold text-gray-800">₹{req.amountRequested.toLocaleString()} <span className="text-gray-400 font-normal text-xs">for {req.reason}</span></div>
                              <div className="text-xs text-gray-500">{new Date(req.requestDate).toDateString()}</div>
                          </div>
                          <div className="text-right">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  req.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                                  req.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                                  req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                              }`}>
                                  {req.status}
                              </span>
                              {req.status === 'Paid' && (
                                  <div className="text-[10px] text-gray-400 mt-1">Approved: ₹{req.amountApproved}</div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Salary Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-6 -right-6 p-8 opacity-10 rotate-12">
            <DollarSign className="w-48 h-48" />
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-emerald-100 font-medium mb-1 flex items-center gap-2">
                   Net Pay for {salaryData.month}
                   {salaryData.status === 'Paid' ? (
                       <CheckCircle className="w-4 h-4 text-emerald-200" />
                   ) : (
                       <Clock className="w-4 h-4 text-emerald-200" />
                   )}
                </p>
                <h3 className="text-5xl font-bold tracking-tight">₹{salaryData.netPay.toLocaleString()}</h3>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-bold shadow-sm border border-white/10">
                {salaryData.status}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm mt-8">
              <div className="bg-black/10 rounded-lg p-3 backdrop-blur-sm border border-white/5">
                <p className="text-emerald-100 text-xs mb-1 opacity-80">Payout Date</p>
                <p className="font-semibold text-lg">{salaryData.payoutDate}</p>
              </div>
              <div className="bg-black/10 rounded-lg p-3 backdrop-blur-sm border border-white/5">
                <p className="text-emerald-100 text-xs mb-1 opacity-80">Paid Days</p>
                <p className="font-semibold text-lg">{salaryData.paidDays} / {salaryData.workingDays}</p>
              </div>
              <div className="bg-black/10 rounded-lg p-3 backdrop-blur-sm border border-white/5">
                 <p className="text-emerald-100 text-xs mb-1 opacity-80">Deductions</p>
                 <p className="font-semibold text-lg text-white">₹{totalDeductions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats / Trends */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col">
           <div className="mb-auto">
             <h4 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
               <TrendingUp className="w-4 h-4 text-emerald-500" /> Income Trend
             </h4>
             <p className="text-xs text-gray-500">Salary history since joining</p>
           </div>
           
           <div className="h-48 mt-4">
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                   <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      fontSize={12} 
                      tick={{fill: '#9ca3af'}} 
                      dy={10}
                   />
                   <Tooltip 
                      cursor={{fill: '#f3f4f6'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                   />
                   <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 4, 4]} barSize={32} />
                 </BarChart>
               </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                    No history data available yet.
                </div>
             )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salary Structure */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Salary Breakdown</h3>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Monthly</span>
          </div>
          
          <div className="p-5 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                 <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Earnings</h4>
                 <span className="text-xs text-gray-400">Amount (₹)</span>
              </div>
              <div className="space-y-3">
                {salaryData.earnings.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm group">
                    <span className="text-gray-600 group-hover:text-gray-900 transition-colors">{item.label}</span>
                    <span className="font-medium text-gray-900">₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-3 border-t border-dashed border-gray-200 mt-2">
                  <span className="font-semibold text-gray-700">Gross Earnings</span>
                  <span className="font-bold text-gray-900">₹{totalEarnings.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                 <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Deductions</h4>
                 <span className="text-xs text-gray-400">Amount (₹)</span>
              </div>
              <div className="space-y-3">
                {salaryData.deductions.length > 0 ? (
                    salaryData.deductions.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm group">
                        <span className="text-gray-600 group-hover:text-gray-900 transition-colors">{item.label}</span>
                        <span className="font-medium text-red-600">-₹{item.amount.toLocaleString()}</span>
                    </div>
                    ))
                ) : (
                    <div className="text-sm text-gray-400 italic text-center py-2">No deductions applied</div>
                )}
                <div className="flex justify-between text-sm pt-3 border-t border-dashed border-gray-200 mt-2">
                  <span className="font-semibold text-gray-700">Total Deductions</span>
                  <span className="font-bold text-red-600">-₹{totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-emerald-50 rounded-xl p-4 flex justify-between items-center border border-emerald-100">
               <div className="flex flex-col">
                  <span className="text-sm text-emerald-800 font-medium">Total Net Payable</span>
                  <span className="text-xs text-emerald-600">Calculated after all deductions</span>
               </div>
               <span className="font-bold text-2xl text-emerald-700">₹{salaryData.netPay.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payslip History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Payslip History</h3>
            <button className="text-sm text-emerald-600 font-medium hover:underline flex items-center gap-1">
               View All
            </button>
          </div>
          <div className="divide-y divide-gray-100 flex-1 overflow-auto max-h-[400px]">
            {salaryHistory.length > 0 ? (
                salaryHistory.map((slip, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">Salary Slip - {slip.month}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${slip.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {slip.status.toUpperCase()}
                        </span>
                        <p className="text-xs text-gray-400">Credited on {slip.date}</p>
                        </div>
                    </div>
                    </div>
                    <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-700">₹{slip.amount.toLocaleString()}</span>
                    <button className="text-gray-400 hover:text-emerald-600 p-2 rounded-full hover:bg-emerald-50 transition-colors" title="Download PDF">
                        <Download className="w-4 h-4" />
                    </button>
                    </div>
                </div>
                ))
            ) : (
                <div className="p-8 text-center text-gray-400">
                    <p className="text-sm italic">No salary history available.</p>
                    <p className="text-xs mt-1">Payslips will appear here after your first month.</p>
                </div>
            )}
          </div>
          {salaryHistory.length > 0 && (
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                <button className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors">Load more history</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSalary;
