
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  DollarSign, Save, Download, Filter, Search, Calculator, 
  RefreshCw, CheckCircle, Clock, X, Eye, CreditCard, 
  Banknote, History, Trash2, Printer, User, ArrowLeft, 
  Calendar, Building2, MapPin, Users, TrendingUp, TrendingDown, Wallet,
  ArrowRight, ShieldCheck, Landmark, Loader2, FileText, Bike
} from 'lucide-react';
import { getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, SalaryAdvanceRequest, DailyAttendance, TravelAllowanceRequest, UserRole } from '../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { sendSystemNotification } from '../../services/cloudService';

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

interface PayrollEntry {
  employeeId: string;
  basicSalary: number;
  allowances: number;
  travelAllowance: number; // Linked to KM Claims
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

const Payroll: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Salary' | 'Advances' | 'KM Claims (TA)' | 'History'>('Salary');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [payrollData, setPayrollData] = useState<Record<string, PayrollEntry>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [history, setHistory] = useState<PayrollHistoryRecord[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvanceRequest[]>([]);
  const [kmClaims, setKmClaims] = useState<TravelAllowanceRequest[]>([]);
  const [corporatesList, setCorporatesList] = useState<any[]>([]);
  const [refreshToggle, setRefreshToggle] = useState(0);

  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [activeSlip, setActiveSlip] = useState<{ emp: ExtendedEmployee, data: PayrollEntry } | null>(null);
  const slipRef = useRef<HTMLDivElement>(null);
  const [isExportingSlip, setIsExportingSlip] = useState(false);

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';
  const [employees, setEmployees] = useState<ExtendedEmployee[]>([]);

  const loadData = useCallback(() => {
      let allHistory: any[] = [];
      const rootHistory = localStorage.getItem('payroll_history');
      if (rootHistory) allHistory = JSON.parse(rootHistory);
      if (isSuperAdmin) {
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          setCorporatesList(corps);
          corps.forEach((c: any) => {
              const cHistory = localStorage.getItem(`payroll_history_${c.email}`);
              if (cHistory) allHistory = [...allHistory, ...JSON.parse(cHistory)];
          });
      }
      setHistory(allHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      let allAdvances: any[] = [];
      const rootAdv = localStorage.getItem('salary_advances');
      if (rootAdv) allAdvances = JSON.parse(rootAdv);
      if (isSuperAdmin) {
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          corps.forEach((c: any) => {
              const cAdv = localStorage.getItem(`salary_advances_${c.email}`);
              if (cAdv) allAdvances = [...allAdvances, ...JSON.parse(cAdv)];
          });
      }
      setAdvances(allAdvances);

      const rootClaims = JSON.parse(localStorage.getItem('global_travel_requests') || '[]');
      setKmClaims(rootClaims);

      let allEmp: ExtendedEmployee[] = [];
      if (isSuperAdmin) {
          const adminData = localStorage.getItem('staff_data');
          if (adminData) allEmp = JSON.parse(adminData).map((e: any) => ({...e, corporateId: 'admin', corporateName: 'Head Office'}));
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          corps.forEach((corp: any) => {
              const cData = localStorage.getItem(`staff_data_${corp.email}`);
              if (cData) allEmp = [...allEmp, ...JSON.parse(cData).map((e:any) => ({...e, corporateId: corp.email, corporateName: corp.companyName}))];
          });
      } else {
          const saved = localStorage.getItem(`staff_data_${sessionId}`);
          if (saved) allEmp = JSON.parse(saved).map((e: any) => ({...e, corporateId: sessionId, corporateName: 'My Franchise'}));
      }
      setEmployees(allEmp);
  }, [isSuperAdmin, sessionId]);

  useEffect(() => {
    loadData();
    const triggerRefresh = () => { loadData(); setRefreshToggle(v => v + 1); };
    window.addEventListener('storage', triggerRefresh);
    window.addEventListener('attendance-updated', triggerRefresh);
    return () => {
        window.removeEventListener('storage', triggerRefresh);
        window.removeEventListener('attendance-updated', triggerRefresh);
    };
  }, [loadData]);

  const departments = useMemo(() => ['All', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))], [employees]);

  useEffect(() => {
    const handleAutoCalculate = () => {
      setIsCalculating(true);
      const newPayrollData: Record<string, PayrollEntry> = {};
      const [year, monthStr] = selectedMonth.split('-').map(n => parseInt(n));
      const daysInMonth = new Date(year, monthStr, 0).getDate();

      employees.forEach(emp => {
          const monthlyCtc = parseFloat(emp.salary || '0');
          const key = `attendance_data_${emp.id}_${year}_${monthStr-1}`;
          const saved = localStorage.getItem(key);
          const attendance: DailyAttendance[] = saved ? JSON.parse(saved) : getEmployeeAttendance(emp, year, monthStr - 1);
          
          let payableDays = 0;
          attendance.forEach((day) => {
              if ([AttendanceStatus.PRESENT, AttendanceStatus.WEEK_OFF, AttendanceStatus.PAID_LEAVE, AttendanceStatus.HOLIDAY, AttendanceStatus.ALTERNATE_DAY].includes(day.status)) {
                  payableDays += 1;
              } else if (day.status === AttendanceStatus.HALF_DAY) {
                  payableDays += 0.5;
              }
          });

          const grossEarned = Math.round((monthlyCtc / daysInMonth) * payableDays);
          const unpaidAdvances = advances.filter(a => a.employeeId === emp.id && a.status === 'Approved').reduce((s, i) => s + (i.amountApproved || 0), 0);
          
          const travelIncentive = kmClaims
              .filter(r => r.employeeId === emp.id && (r.status === 'Approved' || r.status === 'Paid') && r.date.startsWith(selectedMonth))
              .reduce((sum, r) => sum + r.totalAmount, 0);

          newPayrollData[emp.id] = {
              employeeId: emp.id,
              basicSalary: Math.round(grossEarned * 0.5),
              allowances: Math.round(grossEarned * 0.5),
              travelAllowance: travelIncentive,
              bonus: 0,
              deductions: 0,
              advanceDeduction: unpaidAdvances,
              payableDays,
              totalDays: daysInMonth,
              status: 'Pending'
          };
      });
      setPayrollData(newPayrollData);
      setIsCalculating(false);
    };

    handleAutoCalculate();
  }, [employees, advances, kmClaims, selectedMonth, refreshToggle]);

  const calculateNetPay = (entry: PayrollEntry): number => 
    (entry.basicSalary + entry.allowances + entry.travelAllowance + entry.bonus) - (entry.deductions + entry.advanceDeduction);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDepartment === 'All' || emp.department === filterDepartment;
    const matchesCorporate = isSuperAdmin ? (filterCorporate === 'All' || emp.corporateId === filterCorporate) : true;
    const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
    return matchesSearch && matchesDept && matchesCorporate && matchesBranch;
  });

  const payrollSummary = useMemo(() => {
    let totalGross = 0;
    let totalAdvances = 0;
    let totalNet = 0;
    let totalTravel = 0;
    let count = 0;
    filteredEmployees.forEach(emp => {
        const data = payrollData[emp.id];
        if (data) {
            count++;
            totalGross += (data.basicSalary + data.allowances + data.bonus);
            totalTravel += data.travelAllowance;
            totalAdvances += data.advanceDeduction;
            totalNet += calculateNetPay(data);
        }
    });
    return { totalGross, totalAdvances, totalNet, totalTravel, count };
  }, [filteredEmployees, payrollData]);

  const handleProcessPayout = () => {
    if (payrollSummary.count === 0) { alert("No employee records to process."); return; }
    if (window.confirm(`Confirm total payout of ${formatCurrency(payrollSummary.totalNet)}?`)) {
        setIsProcessingPayout(true);
        setTimeout(() => {
            const entries = Object.values(payrollData) as PayrollEntry[];
            const netTotal = entries.reduce((s: number, e: PayrollEntry) => s + calculateNetPay(e), 0);
            const record = { id: Date.now().toString(), name: `Payout Batch ${selectedMonth}`, date: new Date().toISOString(), totalAmount: netTotal, employeeCount: filteredEmployees.length, data: payrollData };
            
            const allClaimsStr = localStorage.getItem('global_travel_requests');
            const allClaims: TravelAllowanceRequest[] = allClaimsStr ? JSON.parse(allClaimsStr) : [];
            const updatedClaims = allClaims.map((r: TravelAllowanceRequest) => {
                if (r.status === 'Approved' && r.date.startsWith(selectedMonth)) return { ...r, status: 'Paid' };
                return r;
            });
            localStorage.setItem('global_travel_requests', JSON.stringify(updatedClaims));

            const allAdvancesStr = localStorage.getItem('salary_advances');
            const allAdvances: SalaryAdvanceRequest[] = allAdvancesStr ? JSON.parse(allAdvancesStr) : [];
            const updatedAdvances = allAdvances.map((a: SalaryAdvanceRequest) => {
                const pData = payrollData[a.employeeId];
                if (pData && a.status === 'Approved') return { ...a, status: 'Paid' };
                return a;
            });
            localStorage.setItem('salary_advances', JSON.stringify(updatedAdvances));

            entries.forEach((entry: PayrollEntry) => {
                const amount = calculateNetPay(entry);
                if (amount > 0) {
                    sendSystemNotification({
                        type: 'system',
                        title: 'Salary Update',
                        message: `Your salary of ₹${amount.toLocaleString()} for ${new Date(selectedMonth).toLocaleDateString('en-US', {month:'long', year:'numeric'})} has been disbursed.`,
                        targetRoles: [UserRole.EMPLOYEE],
                        employeeId: entry.employeeId,
                        link: '/user/salary'
                    });
                }
            });

            const key = isSuperAdmin ? 'payroll_history' : `payroll_history_${sessionId}`;
            const currentHistory = JSON.parse(localStorage.getItem(key) || '[]');
            localStorage.setItem(key, JSON.stringify([record, ...currentHistory]));
            
            loadData();
            setIsProcessingPayout(false);
            alert(`Payout executed! Total: ${formatCurrency(netTotal)}`);
        }, 2000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2>
          <p className="text-gray-500">Execution and history for monthly disbursements</p>
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-xl shadow-inner">
            {['Salary', 'Advances', 'KM Claims (TA)', 'History'].map(t => (
                <button key={t} onClick={() => setActiveTab(t as any)} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === t ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
            ))}
        </div>
      </div>

      {activeTab === 'Salary' && (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Salary</p><h3 className="text-2xl font-bold text-gray-800 mt-1">₹{payrollSummary.totalGross.toLocaleString()}</h3></div><div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign className="w-5 h-5"/></div></div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Travel Incentives</p><h3 className="text-2xl font-bold text-blue-600 mt-1">₹{payrollSummary.totalTravel.toLocaleString()}</h3></div><div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Bike className="w-5 h-5"/></div></div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Advance Recovery</p><h3 className="text-2xl font-bold text-red-600 mt-1">₹{payrollSummary.totalAdvances.toLocaleString()}</h3></div><div className="p-3 bg-red-50 text-red-600 rounded-lg"><TrendingDown className="w-5 h-5"/></div></div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-xl text-white shadow-lg flex items-center justify-between relative overflow-hidden"><div><p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest">Total Net Payout</p><h3 className="text-2xl font-bold mt-1">₹{payrollSummary.totalNet.toLocaleString()}</h3></div><CreditCard className="w-10 h-10 text-white/20"/></div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                <div className="flex flex-wrap gap-2">
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-black" />
                    {isSuperAdmin && (<select value={filterCorporate} onChange={(e) => setFilterCorporate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-black"><option value="All">All Corporates</option>{corporatesList.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}</select>)}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setRefreshToggle(v => v + 1)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} /> Recalculate</button>
                    <button onClick={handleProcessPayout} disabled={isProcessingPayout} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-black shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-50">{isProcessingPayout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}Process Payouts</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                        <tr><th className="px-8 py-5">Staff Member</th><th className="px-4 py-5 text-center">Days</th><th className="px-4 py-5 text-right">Gross Salary</th><th className="px-4 py-5 text-right text-blue-600">Travel Incentive</th><th className="px-4 py-5 text-right text-red-500">Advances</th><th className="px-8 py-5 text-right">Net Payout</th><th className="px-6 py-5 text-center">Slip</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredEmployees.map(emp => {
                            const data = payrollData[emp.id];
                            if (!data) return null;
                            const net = calculateNetPay(data);
                            return (
                                <tr key={emp.id} className="hover:bg-gray-50/50 transition-all">
                                    <td className="px-8 py-5"><div className="font-bold text-gray-900">{emp.name}</div><div className="text-[10px] text-gray-400 font-bold uppercase">{emp.role} {isSuperAdmin && `• ${emp.corporateName}`}</div></td>
                                    <td className="px-4 py-5 text-center font-black text-gray-600">{data.payableDays}/{data.totalDays}</td>
                                    <td className="px-4 py-5 text-right font-bold text-gray-900">₹{(data.basicSalary + data.allowances).toLocaleString()}</td>
                                    <td className="px-4 py-5 text-right text-blue-600 font-bold">₹{data.travelAllowance.toLocaleString()}</td>
                                    <td className="px-4 py-5 text-right text-red-500 font-bold">-₹{data.advanceDeduction.toLocaleString()}</td>
                                    <td className="px-8 py-5 text-right font-black text-gray-900 text-lg">₹{net.toLocaleString()}</td>
                                    <td className="px-6 py-5 text-center"><button onClick={() => { setActiveSlip({ emp, data }); setIsSlipModalOpen(true); }} className="text-xs font-bold text-indigo-600 hover:underline">View</button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
      )}

      {activeTab === 'Advances' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold">Pending Salary Advances</div>
              <div className="p-8 text-center text-gray-400 italic">This view lists all approved advance requests awaiting recovery in current payroll cycle.</div>
          </div>
      )}

      {activeTab === 'KM Claims (TA)' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold flex justify-between items-center">
                  <span>Travel Claims Summary - {new Date(selectedMonth).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</span>
                  <Bike className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                          <tr><th className="px-8 py-5">Staff Name</th><th className="px-4 py-5">Claims Approved</th><th className="px-4 py-5 text-right">Total Payable</th><th className="px-8 py-5 text-center">Inclusion Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {filteredEmployees.map(emp => {
                              const data = payrollData[emp.id];
                              if (!data || data.travelAllowance === 0) return null;
                              return (
                                  <tr key={emp.id} className="hover:bg-gray-50/50">
                                      <td className="px-8 py-5 font-bold">{emp.name}</td>
                                      <td className="px-4 py-5">{kmClaims.filter(r => r.employeeId === emp.id && (r.status === 'Approved' || r.status === 'Paid') && r.date.startsWith(selectedMonth)).length} Requests</td>
                                      <td className="px-4 py-5 text-right font-black text-blue-600">₹{data.travelAllowance.toLocaleString()}</td>
                                      <td className="px-8 py-5 text-center"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded">Added to Payroll</span></td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'History' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="divide-y divide-gray-100">
                  {history.map(batch => (
                      <div key={batch.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                          <div className="flex items-center gap-5"><History className="w-6 h-6 text-indigo-500"/><div><p className="font-black text-gray-800 text-lg">{batch.name}</p><p className="text-sm text-gray-500">{new Date(batch.date).toLocaleString()} • {batch.employeeCount} Staff</p></div></div>
                          <div className="text-right"><p className="font-black text-gray-900 text-xl">{formatCurrency(batch.totalAmount)}</p></div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {isSlipModalOpen && activeSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-800">Salary Slip - {activeSlip.emp.name}</h3>
                <button onClick={() => setIsSlipModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50 custom-scrollbar">
                <div ref={slipRef} className="bg-white border border-gray-200 p-8 shadow-sm max-w-xl mx-auto rounded-lg font-sans">
                    <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100">
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">OK BOZ SUPER APP</h2>
                            <p className="text-xs text-gray-500 font-medium">{activeSlip.emp.corporateName || 'Head Office'}</p>
                            <p className="text-xs text-gray-400 mt-1">Earnings for {new Date(selectedMonth).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</p>
                        </div>
                        <div className="text-right"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pay Slip #</p><p className="text-sm font-mono font-bold text-gray-900">{activeSlip.data.employeeId}-{Date.now().toString().slice(-6)}</p></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 mb-8 border-b border-gray-50 pb-6">
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Employee</p><p className="text-sm font-bold text-gray-800">{activeSlip.emp.name}</p><p className="text-xs text-gray-500">{activeSlip.emp.role}</p></div>
                        <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Worked Days</p><p className="text-sm font-bold text-gray-800">{activeSlip.data.payableDays} / {activeSlip.data.totalDays}</p></div>
                    </div>

                    <div className="grid grid-cols-2 border border-gray-100 rounded-lg overflow-hidden mb-8">
                        <div className="border-r border-gray-100">
                            <div className="bg-gray-50 px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Earnings</div>
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between text-sm"><span className="text-gray-600">Basic + HRA</span><span className="font-medium text-gray-900">₹{(activeSlip.data.basicSalary + activeSlip.data.allowances).toLocaleString()}</span></div>
                                {activeSlip.data.travelAllowance > 0 && (
                                    <div className="flex justify-between text-sm"><span className="text-blue-600">Travel Allowance</span><span className="font-bold text-blue-600">+₹{activeSlip.data.travelAllowance.toLocaleString()}</span></div>
                                )}
                                {activeSlip.data.bonus > 0 && (<div className="flex justify-between text-sm"><span className="text-emerald-600">Bonus</span><span className="font-bold text-emerald-600">+₹{activeSlip.data.bonus.toLocaleString()}</span></div>)}
                            </div>
                        </div>
                        <div>
                            <div className="bg-gray-50 px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Deductions</div>
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between text-sm"><span className="text-gray-600">Tax / Prof Tax</span><span className="font-medium text-gray-900">₹{activeSlip.data.deductions.toLocaleString()}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-red-600">Advance Adj.</span><span className="font-bold text-red-600">-₹{activeSlip.data.advanceDeduction.toLocaleString()}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 rounded-xl p-6 border border-indigo-100 flex justify-between items-center">
                        <div><p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Net Monthly Payout</p><p className="text-[10px] text-indigo-500">Transferred via Bank</p></div>
                        <div className="text-right"><p className="text-3xl font-black text-indigo-700">{formatCurrency(calculateNetPay(activeSlip.data))}</p></div>
                    </div>
                </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={() => setIsSlipModalOpen(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700">Close</button>
                <button onClick={async () => {
                    if (!slipRef.current || !activeSlip) return;
                    setIsExportingSlip(true);
                    const canvas = await html2canvas(slipRef.current, { scale: 2 });
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), (canvas.height * pdf.internal.pageSize.getWidth()) / canvas.width);
                    pdf.save(`SalarySlip_${activeSlip.emp.name}_${selectedMonth}.pdf`);
                    setIsExportingSlip(false);
                }} disabled={isExportingSlip} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-black text-sm shadow-md flex items-center gap-2">
                    {isExportingSlip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
