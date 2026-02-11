
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  DollarSign, Save, Download, Filter, Search, Calculator, 
  RefreshCw, CheckCircle, Clock, X, Eye, CreditCard, 
  Banknote, History, Trash2, Printer, User, ArrowLeft, 
  Calendar, Building2, MapPin, Users, TrendingUp, TrendingDown, Wallet,
  ArrowRight, ShieldCheck, Landmark, Loader2, FileText, Bike, BarChart3,
  Send, AlertCircle, IndianRupee, Check, MessageSquare, Mail, ChevronLeft, ChevronRight,
  Info
} from 'lucide-react';
import { getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, SalaryAdvanceRequest, DailyAttendance, TravelAllowanceRequest, UserRole, PayrollEntry } from '../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { sendSystemNotification } from '../../services/cloudService';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

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

export const Payroll: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Salary' | 'Advances' | 'KM Claims (TA)' | 'History'>('Salary');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [payrollData, setPayrollData] = useState<Record<string, PayrollEntry>>({});
  const [isCalculating, setIsCalculating] = useState(false);
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
  const navigate = useNavigate();

  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [currentEmployeeForPayout, setCurrentEmployeeForPayout] = useState<{ emp: ExtendedEmployee, data: PayrollEntry } | null>(null);
  const [payoutForm, setPayoutForm] = useState({
      paidDate: new Date().toISOString().split('T')[0],
      paymentMode: 'Bank Transfer',
      remarks: '',
      manualDeductions: '',
      manualDeductionReason: '',
  });
  const [isProcessingMarkPaid, setIsProcessingMarkPaid] = useState(false);

  const loadData = useCallback(() => {
      let allHistory: PayrollHistoryRecord[] = [];
      if (isSuperAdmin) {
          const rootHistory = localStorage.getItem('payroll_history');
          if (rootHistory) allHistory = JSON.parse(rootHistory);
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          setCorporatesList(corps);
          corps.forEach((c: any) => {
              const cHistory = localStorage.getItem(`payroll_history_${c.email}`);
              if (cHistory) allHistory = [...allHistory, ...JSON.parse(cHistory)];
          });
      } else {
          const myHistory = localStorage.getItem(`payroll_history_${sessionId}`);
          if (myHistory) allHistory = JSON.parse(myHistory);
      }
      setHistory(allHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      const rootAdv = localStorage.getItem('salary_advances');
      setAdvances(rootAdv ? JSON.parse(rootAdv) : []);

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

  useEffect(() => {
    setIsCalculating(true);
    const newPayrollData: Record<string, PayrollEntry> = {};
    const [year, monthStr] = selectedMonth.split('-').map(n => parseInt(n));
    const daysInMonth = new Date(year, monthStr, 0).getDate();

    employees.forEach(emp => {
        const monthlyCtc = parseFloat(emp.salary || '0');
        const key = `attendance_data_${emp.id}_${year}_${monthStr-1}`;
        const savedAttendance = localStorage.getItem(key);
        const attendance: DailyAttendance[] = savedAttendance ? JSON.parse(savedAttendance) : getEmployeeAttendance(emp, year, monthStr - 1);
        
        let payableDays = 0;
        attendance.forEach((day) => {
            // Strict Calculation Rules: 1.0x for Present, Week Off, Paid Leave, Holiday, Alt Day
            if ([
                AttendanceStatus.PRESENT, 
                AttendanceStatus.WEEK_OFF, 
                AttendanceStatus.PAID_LEAVE, 
                AttendanceStatus.HOLIDAY, 
                AttendanceStatus.ALTERNATE_DAY
            ].includes(day.status)) {
                payableDays += 1;
            } 
            // 0.5x for Half Day
            else if (day.status === AttendanceStatus.HALF_DAY) {
                payableDays += 0.5;
            }
            // 0.0x for Absent
        });

        const grossEarned = Math.round((monthlyCtc / daysInMonth) * payableDays);
        const unpaidAdvances = advances.filter(a => a.employeeId === emp.id && a.status === 'Approved').reduce((s, i) => s + (i.amountApproved || 0), 0);
        const travelIncentive = kmClaims
            .filter(r => r.employeeId === emp.id && (r.status === 'Approved' || r.status === 'Paid') && r.date.startsWith(selectedMonth))
            .reduce((sum, r) => sum + r.totalAmount, 0);

        const existingEntry = payrollData[emp.id];
        newPayrollData[emp.id] = {
            employeeId: emp.id,
            basicSalary: Math.round(grossEarned * 0.5),
            allowances: Math.round(grossEarned * 0.5),
            travelAllowance: travelIncentive,
            bonus: 0,
            advanceDeduction: unpaidAdvances,
            manualDeductions: existingEntry?.manualDeductions || 0,
            manualDeductionReason: existingEntry?.manualDeductionReason || '',
            payableDays,
            totalDays: daysInMonth,
            status: existingEntry?.status || 'Pending',
            paidDate: existingEntry?.paidDate,
            paymentMode: existingEntry?.paymentMode,
            remarks: existingEntry?.remarks, 
        };
    });
    setPayrollData(newPayrollData);
    setIsCalculating(false);
  }, [employees, advances, kmClaims, selectedMonth, refreshToggle]);

  const calculateNetPay = (entry: PayrollEntry): number => 
    (entry.basicSalary + entry.allowances + entry.travelAllowance + entry.bonus) - (entry.advanceDeduction + entry.manualDeductions);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDepartment === 'All' || emp.department === filterDepartment;
    const matchesCorporate = isSuperAdmin ? (filterCorporate === 'All' || emp.corporateId === filterCorporate) : true;
    const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
    return matchesSearch && matchesDept && matchesCorporate && matchesBranch;
  });

  const payrollSummary = useMemo(() => {
    let totalGross = 0, totalAdvances = 0, totalManualDeductions = 0, totalNet = 0, totalTravel = 0, totalPaid = 0, totalPending = 0;
    filteredEmployees.forEach(emp => {
        const data = payrollData[emp.id];
        if (data) {
            const netPay = calculateNetPay(data);
            totalGross += (data.basicSalary + data.allowances + data.bonus);
            totalTravel += data.travelAllowance;
            totalAdvances += data.advanceDeduction;
            totalManualDeductions += data.manualDeductions;
            totalNet += netPay;
            if (data.status === 'Paid') totalPaid += netPay;
            else totalPending += netPay;
        }
    });
    return { totalGross, totalAdvances, totalManualDeductions, totalNet, totalTravel, totalPaid, totalPending };
  }, [filteredEmployees, payrollData]);

  const handleMarkPaid = (emp: ExtendedEmployee, data: PayrollEntry) => {
    setCurrentEmployeeForPayout({ emp, data });
    setPayoutForm({
        paidDate: new Date().toISOString().split('T')[0],
        paymentMode: 'Bank Transfer',
        remarks: data.remarks || '',
        manualDeductions: data.manualDeductions?.toString() || '',
        manualDeductionReason: data.manualDeductionReason || '',
    });
    setIsMarkPaidModalOpen(true);
  };

  const confirmMarkPaid = async () => {
    if (!currentEmployeeForPayout) return;
    setIsProcessingMarkPaid(true);
    const { emp, data } = currentEmployeeForPayout;
    const netPay = calculateNetPay(data);
    const updatedEntry: PayrollEntry = {
        ...data,
        status: 'Paid',
        paidDate: payoutForm.paidDate,
        paymentMode: payoutForm.paymentMode,
        remarks: payoutForm.remarks,
        manualDeductions: parseFloat(payoutForm.manualDeductions) || 0,
        manualDeductionReason: payoutForm.manualDeductionReason,
    };
    setPayrollData(prev => ({ ...prev, [emp.id]: updatedEntry }));
    const payrollKey = emp.corporateId === 'admin' ? 'payroll_data' : `payroll_data_${emp.corporateId}`;
    const currentPayrollState = JSON.parse(localStorage.getItem(payrollKey) || '{}');
    localStorage.setItem(payrollKey, JSON.stringify({ ...currentPayrollState, [emp.id]: updatedEntry }));

    await sendSystemNotification({
        type: 'system',
        title: `Salary Payment Processed`,
        message: `Your net payout of ₹${netPay.toLocaleString()} for ${selectedMonth} was processed on ${payoutForm.paidDate}.`,
        targetRoles: [UserRole.EMPLOYEE],
        employeeId: emp.id,
        link: '/user/salary'
    });
    setIsProcessingMarkPaid(false);
    setIsMarkPaidModalOpen(false);
    loadData();
  };

  const handlePrevMonth = () => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() + 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const generateSlipPDF = async () => {
    if (!slipRef.current || !activeSlip) return;
    setIsExportingSlip(true);
    try {
      const canvas = await html2canvas(slipRef.current, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SalarySlip_${activeSlip.emp.name}_${selectedMonth}.pdf`);
    } catch (error) { console.error(error); }
    finally { setIsExportingSlip(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2><p className="text-gray-500">Execution and history for monthly disbursements</p></div>
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/reports')} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-sm"><BarChart3 className="w-4 h-4" /> View Analytics</button>
            <div className="flex bg-gray-100 p-1.5 rounded-xl shadow-inner">
                {['Salary', 'Advances', 'KM Claims (TA)', 'History'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t as any)} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === t ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
                ))}
            </div>
        </div>
      </div>

      {activeTab === 'Salary' && (
      <div className="space-y-6">
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-800">
                <p className="font-bold mb-1 uppercase tracking-widest">Salary Calculation Rules</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1">
                    <p>• <b>Present:</b> 100% Pay</p>
                    <p>• <b>Paid Leave:</b> 100% Pay</p>
                    <p>• <b>Week Off:</b> 100% Pay</p>
                    <p>• <b>Holiday:</b> 100% Pay</p>
                    <p>• <b>Alternate Day:</b> 100% Pay</p>
                    <p>• <b>Half Day:</b> 50% Pay</p>
                    <p>• <b>Absent:</b> No Pay</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Salary</p><h3 className="text-2xl font-bold text-gray-800 mt-1">₹{payrollSummary.totalGross.toLocaleString()}</h3></div><div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign className="w-5 h-5"/></div></div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Travel TA</p><h3 className="text-2xl font-bold text-blue-600 mt-1">₹{payrollSummary.totalTravel.toLocaleString()}</h3></div><div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Bike className="w-5 h-5"/></div></div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Advance Recovery</p><h3 className="text-2xl font-bold text-red-600 mt-1">₹{payrollSummary.totalAdvances.toLocaleString()}</h3></div><div className="p-3 bg-red-50 text-red-600 rounded-lg"><TrendingDown className="w-5 h-5"/></div></div>
            <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Paid</p><h3 className="text-2xl font-bold text-emerald-700 mt-1">₹{payrollSummary.totalPaid.toLocaleString()}</h3></div><div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle className="w-5 h-5"/></div></div>
            <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Total Pending</p><h3 className="text-2xl font-bold text-orange-700 mt-1">₹{payrollSummary.totalPending.toLocaleString()}</h3></div><div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><Clock className="w-5 h-5"/></div></div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={handlePrevMonth} className="p-2 text-indigo-600 font-black hover:bg-indigo-200 bg-indigo-100 rounded-lg transition-colors border border-indigo-200"><ChevronLeft className="w-4 h-4" /></button>
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-black" />
                    <button onClick={handleNextMonth} className="p-2 text-indigo-600 font-black hover:bg-indigo-200 bg-indigo-100 rounded-lg transition-colors border border-indigo-200"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <button onClick={() => setRefreshToggle(v => v + 1)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} /> Recalculate</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                        <tr>
                            <th className="px-8 py-5">Staff Member</th>
                            <th className="px-4 py-5 text-center">Pay Days</th>
                            <th className="px-4 py-5 text-right">Gross</th>
                            <th className="px-4 py-5 text-right text-blue-600">Travel TA</th>
                            <th className="px-4 py-5 text-right text-red-500">Recovery</th>
                            <th className="px-8 py-5 text-right">Net Payout</th>
                            <th className="px-6 py-5 text-center">Status</th>
                            <th className="px-6 py-5 text-center">Slip</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredEmployees.map(emp => {
                            const data = payrollData[emp.id];
                            if (!data) return null;
                            const net = calculateNetPay(data);
                            return (
                                <tr key={emp.id} className="hover:bg-gray-50/50 transition-all">
                                    <td className="px-8 py-5"><div className="font-bold text-gray-900">{emp.name}</div><div className="text-[10px] text-gray-400 font-bold uppercase">{emp.role}</div></td>
                                    <td className="px-4 py-5 text-center font-black text-gray-600">{data.payableDays}/{data.totalDays}</td>
                                    <td className="px-4 py-5 text-right font-bold text-gray-900">₹{(data.basicSalary + data.allowances).toLocaleString()}</td>
                                    <td className="px-4 py-5 text-right text-blue-600 font-bold">₹{data.travelAllowance.toLocaleString()}</td>
                                    <td className="px-4 py-5 text-right text-red-500 font-bold">-₹{(data.advanceDeduction + data.manualDeductions).toLocaleString()}</td>
                                    <td className="px-8 py-5 text-right font-black text-gray-900 text-lg">₹{net.toLocaleString()}</td>
                                    <td className="px-6 py-5 text-center">
                                        {data.status === 'Pending' ? (
                                            <button onClick={() => handleMarkPaid(emp, data)} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-green-100 transition-colors"><IndianRupee className="w-3 h-3"/> Mark Paid</button>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700">{data.status}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-center"><button onClick={() => { setActiveSlip({ emp, data }); setIsSlipModalOpen(true); }} className="text-xs font-bold text-indigo-600 hover:underline">View Slip</button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
      )}

      {isSlipModalOpen && activeSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-800">Professional Salary Slip</h3>
                <button onClick={() => setIsSlipModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50 custom-scrollbar">
                <div ref={slipRef} className="bg-white border border-gray-200 p-10 shadow-sm max-w-xl mx-auto rounded-lg font-sans">
                    <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">OK BOZ SUPER APP</h2>
                            <p className="text-xs text-gray-500 font-medium">{activeSlip.emp.corporateName || 'Head Office'}</p>
                        </div>
                        <div className="text-right">
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-3 py-1 rounded border border-emerald-100">Status: {activeSlip.data.status}</span>
                            <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">{selectedMonth}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-10 mb-8">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Staff Information</p>
                            <p className="text-lg font-black text-gray-900">{activeSlip.emp.name}</p>
                            <p className="text-xs text-gray-500 font-bold">{activeSlip.emp.role}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">Emp ID: {activeSlip.emp.id}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Attendance Summary</p>
                            <p className="text-xs font-bold text-gray-700">Payable Days: {activeSlip.data.payableDays} / {activeSlip.data.totalDays}</p>
                            <p className="text-[10px] text-gray-400 mt-1">Acc No: •••• {activeSlip.emp.accountNumber?.slice(-4) || 'XXXX'}</p>
                        </div>
                    </div>
                    <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm mb-10">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                <tr><th className="px-6 py-4 text-left">Description</th><th className="px-6 py-4 text-right">Amount (INR)</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                <tr><td className="px-6 py-4 text-gray-700">Basic & Allowances</td><td className="px-6 py-4 text-right font-mono">₹{(activeSlip.data.basicSalary + activeSlip.data.allowances).toLocaleString()}</td></tr>
                                <tr><td className="px-6 py-4 text-gray-700">Travel TA (Approved)</td><td className="px-6 py-4 text-right font-mono">₹{activeSlip.data.travelAllowance.toLocaleString()}</td></tr>
                                {(activeSlip.data.advanceDeduction > 0) && (
                                    <tr><td className="px-6 py-4 text-rose-500">Advance Recovery (-)</td><td className="px-6 py-4 text-right font-mono text-rose-500">- ₹{activeSlip.data.advanceDeduction.toLocaleString()}</td></tr>
                                )}
                            </tbody>
                            <tfoot className="bg-indigo-600 text-white font-black">
                                <tr><td className="px-6 py-5 uppercase tracking-widest">Net Payable</td><td className="px-6 py-5 text-right text-2xl tracking-tighter">₹{calculateNetPay(activeSlip.data).toLocaleString()}</td></tr>
                            </tfoot>
                        </table>
                    </div>
                    <div className="text-center pt-6 border-t border-dashed border-gray-200">
                        <p className="text-[9px] font-bold text-gray-300 tracking-[0.3em] uppercase italic">Generated by OK BOZ Payroll Engine</p>
                    </div>
                </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={generateSlipPDF} disabled={isExportingSlip} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-black text-sm shadow-md flex items-center gap-2">
                    {isExportingSlip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
                </button>
                <button onClick={() => setIsSlipModalOpen(false)} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 font-bold">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ... (Rest of component remains unchanged) ... */}
    </div>
  );
};
