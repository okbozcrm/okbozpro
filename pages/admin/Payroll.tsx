
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
  const [activeSlip, setActiveSlip] = useState<{ emp: ExtendedEmployee, data: PayrollEntry, counts?: any } | null>(null);
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
            if ([AttendanceStatus.PRESENT, AttendanceStatus.WEEK_OFF, AttendanceStatus.PAID_LEAVE, AttendanceStatus.HOLIDAY, AttendanceStatus.ALTERNATE_DAY].includes(day.status)) payableDays += 1;
            else if (day.status === AttendanceStatus.HALF_DAY) payableDays += 0.5;
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

  const getAttendanceBreakup = (empId: string) => {
      const [year, monthStr] = selectedMonth.split('-').map(n => parseInt(n));
      const key = `attendance_data_${empId}_${year}_${monthStr-1}`;
      const saved = localStorage.getItem(key);
      const emp = employees.find(e => e.id === empId);
      if (!emp) return null;
      const attendance: DailyAttendance[] = saved ? JSON.parse(saved) : getEmployeeAttendance(emp, year, monthStr - 1);
      
      let counts = { present: 0, half: 0, leave: 0, off: 0, holiday: 0, alternate: 0, absent: 0 };
      attendance.forEach(day => {
          if (day.status === AttendanceStatus.PRESENT) counts.present++;
          else if (day.status === AttendanceStatus.WEEK_OFF) counts.off++;
          else if (day.status === AttendanceStatus.HOLIDAY) counts.holiday++;
          else if (day.status === AttendanceStatus.PAID_LEAVE) counts.leave++;
          else if (day.status === AttendanceStatus.HALF_DAY) counts.half++;
          else if (day.status === AttendanceStatus.ALTERNATE_DAY) counts.alternate++;
          else if (day.status === AttendanceStatus.ABSENT) counts.absent++;
      });
      return counts;
  };

  const handleOpenSlip = (emp: ExtendedEmployee, data: PayrollEntry) => {
      const counts = getAttendanceBreakup(emp.id);
      setActiveSlip({ emp, data, counts });
      setIsSlipModalOpen(true);
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

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={() => {
                        const date = new Date(selectedMonth + '-01');
                        date.setMonth(date.getMonth() - 1);
                        setSelectedMonth(date.toISOString().slice(0, 7));
                    }} className="p-2 text-indigo-600 font-black hover:bg-indigo-200 bg-indigo-100 rounded-lg transition-colors border border-indigo-200"><ChevronLeft className="w-4 h-4" /></button>
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-black" />
                    <button onClick={() => {
                        const date = new Date(selectedMonth + '-01');
                        date.setMonth(date.getMonth() + 1);
                        setSelectedMonth(date.toISOString().slice(0, 7));
                    }} className="p-2 text-indigo-600 font-black hover:bg-indigo-200 bg-indigo-100 rounded-lg transition-colors border border-indigo-200"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <button onClick={() => setRefreshToggle(v => v + 1)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} /> Recalculate</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
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
                        {employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => {
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
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${data.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{data.status}</span>
                                    </td>
                                    <td className="px-6 py-5 text-center"><button onClick={() => handleOpenSlip(emp, data)} className="text-xs font-bold text-indigo-600 hover:underline">View Slip</button></td>
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
                            <div className="mt-2 pt-2 border-t border-gray-50">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Monthly CTC</p>
                                <p className="text-sm font-black text-gray-800">₹{parseFloat(activeSlip.emp.salary || '0').toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Attendance Detailed Breakup</p>
                            <div className="text-[10px] space-y-1 font-bold text-gray-600">
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-400 uppercase">Working Days (Pres.)</span>
                                    <span className="text-gray-900">{activeSlip.counts.present + activeSlip.counts.alternate}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-400 uppercase">Week Offs</span>
                                    <span className="text-gray-900">{activeSlip.counts.off}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-400 uppercase">Holidays/Paid Lve</span>
                                    <span className="text-gray-900">{activeSlip.counts.holiday + activeSlip.counts.leave}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-400 uppercase">Half Days (0.5x)</span>
                                    <span className="text-amber-600">{activeSlip.counts.half}</span>
                                </div>
                                <div className="flex justify-between gap-4 border-t border-gray-100 pt-1">
                                    <span className="text-rose-500 uppercase">Absent Days</span>
                                    <span className="text-rose-600">{activeSlip.counts.absent}</span>
                                </div>
                                <div className="h-px bg-indigo-50 my-1"></div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-400 uppercase">Total Month Days</span>
                                    <span className="text-gray-900">{activeSlip.data.totalDays}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-indigo-600 font-black">
                                    <span className="uppercase">Net Payable Days</span>
                                    <span>{activeSlip.data.payableDays}</span>
                                </div>
                            </div>
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
    </div>
  );
};
