import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  DollarSign, Save, Download, Filter, Search, Calculator, 
  RefreshCw, CheckCircle, Clock, X, Eye, CreditCard, 
  Banknote, History, Trash2, Printer, User, ArrowLeft, 
  Calendar, Building2, MapPin, Users, TrendingDown, Wallet,
  ArrowRight, ShieldCheck, Landmark, Loader2, FileText
} from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, SalaryAdvanceRequest } from '../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [payrollData, setPayrollData] = useState<Record<string, PayrollEntry>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [history, setHistory] = useState<PayrollHistoryRecord[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvanceRequest[]>([]);
  const [corporatesList, setCorporatesList] = useState<any[]>([]);

  // Slip Modal State
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [activeSlip, setActiveSlip] = useState<{ emp: ExtendedEmployee, data: PayrollEntry } | null>(null);
  const slipRef = useRef<HTMLDivElement>(null);
  const [isExportingSlip, setIsExportingSlip] = useState(false);

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

  const handleViewSlip = (emp: ExtendedEmployee, data: PayrollEntry) => {
    setActiveSlip({ emp, data });
    setIsSlipModalOpen(true);
  };

  const downloadSlipPDF = async () => {
    if (!slipRef.current || !activeSlip) return;
    setIsExportingSlip(true);
    try {
      const canvas = await html2canvas(slipRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SalarySlip_${activeSlip.emp.name.replace(/\s+/g, '_')}_${selectedMonth}.pdf`);
    } catch (err) {
      console.error("PDF Export Failed", err);
    }
    setIsExportingSlip(false);
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
                        Process Total Payout
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
                                        <button 
                                          onClick={() => handleViewSlip(emp, data)}
                                          className="text-xs font-bold text-indigo-600 hover:underline"
                                        >
                                          View Slip
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
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
              </div>
          </div>
      )}

      {/* Salary Slip Modal */}
      {isSlipModalOpen && activeSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
               <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <FileText className="w-5 h-5 text-indigo-500" /> Employee Salary Slip
               </h3>
               <button onClick={() => setIsSlipModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50 custom-scrollbar">
               <div ref={slipRef} className="bg-white border border-gray-200 p-8 shadow-sm max-w-xl mx-auto rounded-lg font-sans">
                  {/* Slip Header */}
                  <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100">
                    <div>
                      <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">OK BOZ PRO</h2>
                      <p className="text-xs text-gray-500 font-medium">{activeSlip.emp.corporateName || 'Head Office'}</p>
                      <p className="text-xs text-gray-400 mt-1">Payroll for {new Date(selectedMonth).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pay Slip #</p>
                      <p className="text-sm font-mono font-bold text-gray-900">{activeSlip.data.employeeId}-{Date.now().toString().slice(-6)}</p>
                    </div>
                  </div>

                  {/* Employee Meta */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Employee Name</p>
                      <p className="text-sm font-bold text-gray-800">{activeSlip.emp.name}</p>
                      <p className="text-xs text-gray-500">{activeSlip.emp.role}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Department</p>
                      <p className="text-sm font-bold text-gray-800">{activeSlip.emp.department || '-'}</p>
                      <p className="text-xs text-gray-500">Days Payable: {activeSlip.data.payableDays}/{activeSlip.data.totalDays}</p>
                    </div>
                  </div>

                  {/* Earnings & Deductions Table */}
                  <div className="grid grid-cols-2 border border-gray-100 rounded-lg overflow-hidden mb-8">
                    <div className="border-r border-gray-100">
                       <div className="bg-gray-50 px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Earnings</div>
                       <div className="p-4 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Basic Salary</span>
                            <span className="font-medium text-gray-900">₹{activeSlip.data.basicSalary.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Allowances</span>
                            <span className="font-medium text-gray-900">₹{activeSlip.data.allowances.toLocaleString()}</span>
                          </div>
                          {activeSlip.data.bonus > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Bonus</span>
                              <span className="font-medium text-emerald-600">+₹{activeSlip.data.bonus.toLocaleString()}</span>
                            </div>
                          )}
                       </div>
                    </div>
                    <div>
                       <div className="bg-gray-50 px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Deductions</div>
                       <div className="p-4 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">TDS / Prof Tax</span>
                            <span className="font-medium text-gray-900">₹{activeSlip.data.deductions.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Advance Recovery</span>
                            <span className="font-medium text-red-600">-₹{activeSlip.data.advanceDeduction.toLocaleString()}</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-indigo-50/50 rounded-xl p-6 border border-indigo-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Net Monthly Payout</p>
                      <p className="text-[10px] text-indigo-500">Transferred via {activeSlip.emp.paymentCycle || 'Bank'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-indigo-700">{formatCurrency(calculateNetPay(activeSlip.data))}</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 font-medium italic">This is a computer generated document and does not require a physical signature.</p>
                    <p className="text-[9px] text-gray-300 mt-1">Generated by OK BOZ Staff Management System</p>
                  </div>
               </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-2xl">
               <span className="text-xs text-gray-400 font-medium">Download as PDF for employee record</span>
               <div className="flex gap-3">
                  <button 
                    onClick={() => setIsSlipModalOpen(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Close
                  </button>
                  <button 
                    onClick={downloadSlipPDF}
                    disabled={isExportingSlip}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-black text-sm shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    {isExportingSlip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download PDF
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;