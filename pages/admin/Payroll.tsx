import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  DollarSign, Save, Download, Filter, Search, Calculator, 
  RefreshCw, CheckCircle, Clock, X, Eye, CreditCard, 
  Banknote, History, Trash2, Printer, User, ArrowLeft, 
  Calendar, Building2, MapPin, Users, TrendingDown, Wallet,
  ArrowRight, ShieldCheck, Landmark, Loader2
} from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, SalaryAdvanceRequest } from '../../types';

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
  const [activeTab, setActiveTab] = useState<'Salary' | 'Advances' | 'History'>('Salary');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [payrollData, setPayrollData] = useState<Record<string, PayrollEntry>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [history, setHistory] = useState<PayrollHistoryRecord[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvanceRequest[]>([]);
  const [corporatesList, setCorporatesList] = useState<any[]>([]);

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const [employees, setEmployees] = useState<ExtendedEmployee[]>([]);

  const loadData = () => {
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
          if (saved) allEmp = JSON.parse(saved);
      }
      setEmployees(allEmp);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [isSuperAdmin, sessionId]);

  const departments = useMemo(() => ['All', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))], [employees]);

  useEffect(() => {
    handleAutoCalculate();
  }, [employees, advances, selectedMonth]);

  const handleAutoCalculate = () => {
    setIsCalculating(true);
    const newPayrollData: Record<string, PayrollEntry> = {};
    const [year, monthStr] = selectedMonth.split('-').map(n => parseInt(n));
    const daysInMonth = new Date(year, monthStr, 0).getDate();

    employees.forEach(emp => {
        const monthlyCtc = parseFloat(emp.salary || '0');
        const attendance = getEmployeeAttendance(emp, year, monthStr - 1);
        let payableDays = 0;
        attendance.forEach(day => {
            if ([AttendanceStatus.PRESENT, AttendanceStatus.WEEK_OFF, AttendanceStatus.PAID_LEAVE].includes(day.status)) payableDays += 1;
            else if (day.status === AttendanceStatus.HALF_DAY) payableDays += 0.5;
        });

        const grossEarned = Math.round((monthlyCtc / daysInMonth) * payableDays);
        const paidAdvances = advances.filter(a => a.employeeId === emp.id && a.status === 'Paid').reduce((s, i) => s + (i.amountApproved || 0), 0);

        newPayrollData[emp.id] = {
            employeeId: emp.id,
            basicSalary: Math.round(grossEarned * 0.5),
            allowances: Math.round(grossEarned * 0.5),
            bonus: 0,
            deductions: 0,
            advanceDeduction: paidAdvances,
            payableDays,
            totalDays: daysInMonth,
            status: 'Pending'
        };
    });
    setPayrollData(newPayrollData);
    setIsCalculating(false);
  };

  /* FIX: Explicitly typed return value as number to resolve type inference issues in reduce callbacks. */
  const calculateNetPay = (entry: PayrollEntry): number => (entry.basicSalary + entry.allowances + entry.bonus) - (entry.deductions + entry.advanceDeduction);

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
    let count = 0;

    filteredEmployees.forEach(emp => {
        const data = payrollData[emp.id];
        if (data) {
            count++;
            totalGross += (data.basicSalary + data.allowances + data.bonus);
            totalAdvances += data.advanceDeduction;
            totalNet += calculateNetPay(data);
        }
    });

    return { totalGross, totalAdvances, totalNet, count };
  }, [filteredEmployees, payrollData]);

  const handleProcessPayout = () => {
    if (payrollSummary.count === 0) {
        alert("No employee records to process.");
        return;
    }
    
    if (window.confirm(`Confirm total payout of ${formatCurrency(payrollSummary.totalNet)} for ${payrollSummary.count} staff members?`)) {
        setIsProcessingPayout(true);
        setTimeout(() => {
            /* FIX: Cast Object.values to PayrollEntry[] to resolve 'unknown' type in reduce callback. */
            const netTotal = (Object.values(payrollData) as PayrollEntry[]).reduce((s: number, e) => s + calculateNetPay(e), 0);
            const record = { 
                id: Date.now().toString(), 
                name: `Payout Batch ${selectedMonth}`, 
                date: new Date().toISOString(), 
                totalAmount: netTotal, 
                employeeCount: filteredEmployees.length, 
                data: payrollData 
            };
            const key = isSuperAdmin ? 'payroll_history' : `payroll_history_${sessionId}`;
            const currentHistory = JSON.parse(localStorage.getItem(key) || '[]');
            localStorage.setItem(key, JSON.stringify([record, ...currentHistory]));
            loadData();
            setIsProcessingPayout(false);
            alert(`Payout executed successfully! Total disbursed: ${formatCurrency(netTotal)}`);
        }, 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2>
          <p className="text-gray-500">Calculate, verify and execute monthly salary disbursements</p>
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-xl shadow-inner">
            {['Salary', 'Advances', 'History'].map(t => (
                <button key={t} onClick={() => setActiveTab(t as any)} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === t ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
            ))}
        </div>
      </div>

      {activeTab === 'Salary' && (
      <div className="space-y-6">
        {/* Payroll Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Staff</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{payrollSummary.count}</h3>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-5 h-5"/></div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Salary</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">₹{payrollSummary.totalGross.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign className="w-5 h-5"/></div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Advance Recovery</p>
                    <h3 className="text-2xl font-bold text-red-600 mt-1">₹{payrollSummary.totalAdvances.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-lg"><TrendingDown className="w-5 h-5"/></div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-xl text-white shadow-lg flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer" onClick={handleProcessPayout}>
                <div className="relative z-10">
                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Total Net Payout</p>
                    <h3 className="text-2xl font-bold mt-1">₹{payrollSummary.totalNet.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-white/20 text-white rounded-lg relative z-10 group-hover:bg-white group-hover:text-emerald-600 transition-colors"><CreditCard className="w-5 h-5"/></div>
                <DollarSign className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-10 rotate-12" />
            </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50">
                <div className="flex flex-wrap gap-2">
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium" />
                    {isSuperAdmin && (
                        <select value={filterCorporate} onChange={(e) => setFilterCorporate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium">
                            <option value="All">All Corporates</option>
                            {corporatesList.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                        </select>
                    )}
                    <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium">
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleAutoCalculate}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
                        Recalculate
                    </button>
                    <div className="w-px h-8 bg-gray-200 mx-1"></div>
                    <button 
                        onClick={handleProcessPayout}
                        disabled={isProcessingPayout}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-black shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-50"
                    >
                        {isProcessingPayout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
                        Process Total Payout: {formatCurrency(payrollSummary.totalNet)}
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                        <tr><th className="px-8 py-5">Staff Member</th><th className="px-4 py-5 text-center">Worked Days</th><th className="px-4 py-5 text-right">Gross Earned</th><th className="px-4 py-5 text-right">Advance Adj.</th><th className="px-8 py-5 text-right">Net Payout</th><th className="px-6 py-5 text-center">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredEmployees.map(emp => {
                            const data = payrollData[emp.id];
                            if (!data) return null;
                            const net = calculateNetPay(data);
                            return (
                                <tr key={emp.id} className="hover:bg-gray-50/50 transition-all">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border ${net > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>{emp.name.charAt(0)}</div>
                                            <div>
                                                <div className="font-bold text-gray-900">{emp.name}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{emp.role} {isSuperAdmin && `• ${emp.corporateName}`}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 text-center font-black text-gray-600">{data.payableDays} <span className="text-gray-300 font-normal">/ {data.totalDays}</span></td>
                                    <td className="px-4 py-5 text-right font-bold text-gray-900">₹{(data.basicSalary + data.allowances).toLocaleString()}</td>
                                    <td className="px-4 py-5 text-right text-rose-500 font-bold">-₹{data.advanceDeduction.toLocaleString()}</td>
                                    <td className="px-8 py-5 text-right font-black text-gray-900 text-lg">₹{net.toLocaleString()}</td>
                                    <td className="px-6 py-5 text-center">
                                        <button className="text-xs font-bold text-indigo-600 hover:underline">View Slip</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {filteredEmployees.length === 0 && (
                <div className="py-32 text-center text-gray-400 italic bg-gray-50/30 flex flex-col items-center gap-2">
                    <Users className="w-12 h-12 opacity-10" />
                    <p className="font-bold uppercase tracking-widest text-xs">No employee records found for processing.</p>
                </div>
            )}
        </div>
      </div>
      )}
      
      {activeTab === 'History' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800">Payroll Batch History</div>
              <div className="divide-y divide-gray-100">
                  {history.map(batch => (
                      <div key={batch.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                          <div className="flex items-center gap-5">
                              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all"><History className="w-6 h-6"/></div>
                              <div>
                                  <p className="font-black text-gray-800 text-lg">{batch.name}</p>
                                  <p className="text-sm text-gray-500 font-medium">Processed: {new Date(batch.date).toLocaleString()} • {batch.employeeCount} Staff Members</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="font-black text-gray-900 text-xl">{formatCurrency(batch.totalAmount)}</p>
                              <button className="mt-1 text-xs text-indigo-600 font-black hover:underline uppercase tracking-widest flex items-center gap-1 justify-end">
                                  Breakdown <ArrowRight className="w-3 h-3" />
                              </button>
                          </div>
                      </div>
                  ))}
                  {history.length === 0 && (
                      <div className="py-24 text-center text-gray-300 flex flex-col items-center gap-4">
                          <Landmark className="w-16 h-16 opacity-10" />
                          <p className="font-black uppercase tracking-[0.2em] text-sm">No payroll batches recorded yet.</p>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default Payroll;