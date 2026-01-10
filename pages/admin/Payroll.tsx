
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  DollarSign, Save, Download, Filter, Search, Calculator, 
  RefreshCw, CheckCircle, Clock, X, Eye, CreditCard, 
  Banknote, History, Trash2, Printer, User, ArrowLeft, 
  Calendar, Building2, MapPin, Users, TrendingUp, TrendingDown, Wallet,
  ArrowRight, ShieldCheck, Landmark, Loader2, FileText, Bike, BarChart3,
  Send, AlertCircle, IndianRupee, Check, MessageCircle, Mail, ChevronLeft, ChevronRight
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

const Payroll: React.FC = () => {
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

  // State for Mark Paid Modal
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [currentEmployeeForPayout, setCurrentEmployeeForPayout] = useState<{ emp: ExtendedEmployee, data: PayrollEntry } | null>(null);
  const [payoutForm, setPayoutForm] = useState({
      paidDate: new Date().toISOString().split('T')[0],
      paymentMode: 'Bank Transfer',
      remarks: '',
      manualDeductions: '', // NEW: Add manualDeductions to payoutForm
  });
  const [isProcessingMarkPaid, setIsProcessingMarkPaid] = useState(false);


  const loadData = useCallback(() => {
      let allHistory: PayrollHistoryRecord[] = [];
      
      if (isSuperAdmin) {
          // Admin loads root history + all corporate histories
          const rootHistory = localStorage.getItem('payroll_history');
          if (rootHistory) allHistory = JSON.parse(rootHistory);
          
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          setCorporatesList(corps);
          corps.forEach((c: any) => {
              const cHistory = localStorage.getItem(`payroll_history_${c.email}`);
              if (cHistory) allHistory = [...allHistory, ...JSON.parse(cHistory)];
          });
      } else {
          // Franchise/Employee loads only their specific history
          const myHistory = localStorage.getItem(`payroll_history_${sessionId}`);
          if (myHistory) allHistory = JSON.parse(myHistory);
      }
      setHistory(allHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      let allAdvances: any[] = [];
      const rootAdv = localStorage.getItem('salary_advances');
      if (rootAdv) allAdvances = JSON.parse(rootAdv);
      // NOTE: Advances are global list in this system design for simplicity, filtering happens in UI
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
          const savedAttendance = localStorage.getItem(key);
          const attendance: DailyAttendance[] = savedAttendance ? JSON.parse(savedAttendance) : getEmployeeAttendance(emp, year, monthStr - 1);
          
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

          // Preserve existing manual deductions if available, otherwise default to 0
          const existingEntry = payrollData[emp.id];
          newPayrollData[emp.id] = {
              employeeId: emp.id,
              basicSalary: Math.round(grossEarned * 0.5),
              allowances: Math.round(grossEarned * 0.5),
              travelAllowance: travelIncentive,
              bonus: 0,
              // `deductions` field is no longer used, replaced by `manualDeductions`
              // deductions: 0, 
              advanceDeduction: unpaidAdvances,
              manualDeductions: existingEntry?.manualDeductions || 0, // NEW: Preserve or default manual deductions
              payableDays,
              totalDays: daysInMonth,
              status: existingEntry?.status || 'Pending', // Initialize as Pending if no existing status
              paidDate: existingEntry?.paidDate,
              paymentMode: existingEntry?.paymentMode,
              remarks: existingEntry?.remarks, 
          };
      });
      setPayrollData(newPayrollData);
      setIsCalculating(false);
    };

    handleAutoCalculate();
  }, [employees, advances, kmClaims, selectedMonth, refreshToggle]);

  // Updated calculateNetPay to include manualDeductions
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
    let totalGross = 0;
    let totalAdvances = 0;
    let totalManualDeductions = 0; // NEW: Track total manual deductions
    let totalNet = 0;
    let totalTravel = 0;
    let count = 0;
    let totalPaid = 0;
    let totalPending = 0;

    filteredEmployees.forEach(emp => {
        const data = payrollData[emp.id];
        if (data) {
            count++;
            const netPay = calculateNetPay(data);
            totalGross += (data.basicSalary + data.allowances + data.bonus);
            totalTravel += data.travelAllowance;
            totalAdvances += data.advanceDeduction;
            totalManualDeductions += data.manualDeductions; // NEW: Add to total
            totalNet += netPay;

            if (data.status === 'Paid') totalPaid += netPay;
            else totalPending += netPay;
        }
    });
    return { totalGross, totalAdvances, totalManualDeductions, totalNet, totalTravel, count, totalPaid, totalPending }; // NEW: Return totalManualDeductions
  }, [filteredEmployees, payrollData]);

  // Handle Mark Paid for an Employee
  const handleMarkPaid = (emp: ExtendedEmployee, data: PayrollEntry) => {
    setCurrentEmployeeForPayout({ emp, data });
    setPayoutForm({
        paidDate: new Date().toISOString().split('T')[0],
        paymentMode: 'Bank Transfer',
        remarks: data.remarks || '',
        manualDeductions: data.manualDeductions?.toString() || '', // NEW: Populate manualDeductions
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
        manualDeductions: parseFloat(payoutForm.manualDeductions) || 0, // NEW: Save manual deductions
    };

    setPayrollData(prev => ({
        ...prev,
        [emp.id]: updatedEntry
    }));

    const [year, monthStr] = selectedMonth.split('-').map(n => parseInt(n));
    const isCurrentMonth = (new Date().getFullYear() === year && new Date().getMonth() + 1 === monthStr);
    
    if (isCurrentMonth) {
        const payrollKey = emp.corporateId === 'admin' ? 'payroll_data' : `payroll_data_${emp.corporateId}`;
        const currentPayrollState = JSON.parse(localStorage.getItem(payrollKey) || '{}');
        localStorage.setItem(payrollKey, JSON.stringify({ ...currentPayrollState, [emp.id]: updatedEntry }));
    } else {
        const payrollHistoryKey = emp.corporateId === 'admin' ? 'payroll_history' : `payroll_history_${emp.corporateId}`;
        const existingHistory = JSON.parse(localStorage.getItem(payrollHistoryKey) || '[]');
        
        const updatedHistory = existingHistory.map((rec: PayrollHistoryRecord) => {
            if (rec.date.startsWith(selectedMonth)) {
                return {
                    ...rec,
                    data: {
                        ...rec.data,
                        [emp.id]: updatedEntry
                    }
                };
            }
            return rec;
        });
        localStorage.setItem(payrollHistoryKey, JSON.stringify(updatedHistory));
    }

    await sendSystemNotification({
        type: 'system',
        title: `Salary Payment Processed`,
        message: `Your net payout of ₹${netPay.toLocaleString()} for ${selectedMonth} has been processed via ${payoutForm.paymentMode} on ${payoutForm.paidDate}.`,
        targetRoles: [UserRole.EMPLOYEE],
        employeeId: emp.id,
        link: '/user/salary'
    });

    setIsProcessingMarkPaid(false);
    setIsMarkPaidModalOpen(false);
    loadData();
    alert(`Payout for ${emp.name} marked as Paid!`);
  };

  // --- Year Navigation Handlers ---
  const handlePrevYear = () => {
    const [year, month] = selectedMonth.split('-');
    const newYear = parseInt(year, 10) - 1;
    setSelectedMonth(`${newYear}-${month}`);
  };

  const handleNextYear = () => {
    const [year, month] = selectedMonth.split('-');
    const newYear = parseInt(year, 10) + 1;
    setSelectedMonth(`${newYear}-${month}`);
  };

  // --- SLIP GENERATION & SHARING HANDLERS ---
  const generateSlipPDF = async () => {
    if (!slipRef.current || !activeSlip) return;
    setIsExportingSlip(true);
    try {
      const canvas = await html2canvas(slipRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), (canvas.height * pdf.internal.pageSize.getWidth()) / canvas.width);
      pdf.save(`SalarySlip_${activeSlip.emp.name}_${new Date(selectedMonth).toISOString().slice(0, 7)}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsExportingSlip(false);
    }
  };

  const generateShareableText = () => {
    if (!activeSlip) return '';
    const monthYear = new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const netPay = calculateNetPay(activeSlip.data);
    
    let text = `*OK BOZ Salary Slip Summary*\n\n`;
    text += `Employee: *${activeSlip.emp.name}*\n`;
    text += `Month: *${monthYear}*\n`;
    text += `Net Payout: *₹${netPay.toLocaleString()}*\n\n`;
    text += `Status: *${activeSlip.data.status || 'Pending'}*\n`;
    if (activeSlip.data.status === 'Paid') {
        text += `Paid Date: ${activeSlip.data.paidDate || 'N/A'}\n`;
        text += `Payment Mode: ${activeSlip.data.paymentMode || 'N/A'}\n`;
    }
    if (activeSlip.data.remarks) {
        text += `Notes: "${activeSlip.data.remarks}"\n`;
    }
    text += `\nThank you for your hard work!`;
    return text;
  };

  const handleShareWhatsApp = () => {
    if (!activeSlip) return;
    const text = generateShareableText();
    const phone = activeSlip.emp.phone?.replace(/\D/g, '');
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      alert("Driver's phone number is not available for WhatsApp share.");
    }
  };

  const handleShareEmail = () => {
    if (!activeSlip) return;
    const text = generateShareableText();
    const email = activeSlip.emp.email;
    if (email) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(`OK BOZ Salary Slip for ${activeSlip.emp.name}`)}&body=${encodeURIComponent(text)}`;
    } else {
      alert("Driver's email is not available for Email share.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2>
          <p className="text-gray-500">Execution and history for monthly disbursements</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => navigate('/admin/reports')}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-sm"
            >
                <BarChart3 className="w-4 h-4" /> View Analytics
            </button>
            <div className="flex bg-gray-100 p-1.5 rounded-xl shadow-inner">
                {['Salary', 'Advances', 'KM Claims (TA)', 'History'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t as any)} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === t ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
                ))}
            </div>
        </div>
      </div>

      {activeTab === 'Salary' && (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Salary</p><h3 className="text-2xl font-bold text-gray-800 mt-1">₹{payrollSummary.totalGross.toLocaleString()}</h3></div><div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign className="w-5 h-5"/></div></div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Travel Incentives</p><h3 className="text-2xl font-bold text-blue-600 mt-1">₹{payrollSummary.totalTravel.toLocaleString()}</h3></div><div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Bike className="w-5 h-5"/></div></div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Advance Recovery</p><h3 className="text-2xl font-bold text-red-600 mt-1">₹{payrollSummary.totalAdvances.toLocaleString()}</h3></div><div className="p-3 bg-red-50 text-red-600 rounded-lg"><TrendingDown className="w-5 h-5"/></div></div>
            <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Paid Payouts</p><h3 className="text-2xl font-bold text-emerald-700 mt-1">₹{payrollSummary.totalPaid.toLocaleString()}</h3></div><div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle className="w-5 h-5"/></div></div>
            <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm flex items-center justify-between"><div><p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Total Pending Payouts</p><h3 className="text-2xl font-bold text-orange-700 mt-1">₹{payrollSummary.totalPending.toLocaleString()}</h3></div><div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><Clock className="w-5 h-5"/></div></div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={handlePrevYear} className="p-2 text-indigo-600 font-black hover:bg-indigo-200 bg-indigo-100 rounded-lg transition-colors border border-indigo-200" title="Previous Year">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-black" />
                    <button onClick={handleNextYear} className="p-2 text-indigo-600 font-black hover:bg-indigo-200 bg-indigo-100 rounded-lg transition-colors border border-indigo-200" title="Next Year">
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    {isSuperAdmin && (<select value={filterCorporate} onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-black"><option value="All">All Corporates</option><option value="admin">Head Office</option>{corporatesList.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}</select>)}
                    <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-black"><option value="All">All Branches</option>{Array.from(new Set(employees.map(e => e.branch).filter(Boolean))).map(b => <option key={b} value={b}>{b}</option>)}</select>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setRefreshToggle(v => v + 1)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} /> Recalculate</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                        <tr>
                            <th className="px-8 py-5">Staff Member</th>
                            <th className="px-4 py-5 text-center">Days</th>
                            <th className="px-4 py-5 text-right">Gross Salary</th>
                            <th className="px-4 py-5 text-right text-blue-600">Travel Incentive</th>
                            <th className="px-4 py-5 text-right text-red-500">Advances</th>
                            <th className="px-4 py-5 text-right text-red-500">Other Deductions</th> {/* NEW COLUMN */}
                            <th className="px-8 py-5 text-right">Net Payout</th>
                            <th className="px-6 py-5 text-center">Status</th>
                            <th className="px-6 py-5 text-center">Paid Date</th>
                            <th className="px-6 py-5 text-center">Mode</th>
                            <th className="px-6 py-5 text-center">Actions</th>
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
                                    <td className="px-8 py-5"><div className="font-bold text-gray-900">{emp.name}</div><div className="text-[10px] text-gray-400 font-bold uppercase">{emp.role} {isSuperAdmin && `• ${emp.corporateName}`}</div></td>
                                    <td className="px-4 py-5 text-center font-black text-gray-600">{data.payableDays}/{data.totalDays}</td>
                                    <td className="px-4 py-5 text-right font-bold text-gray-900">₹{(data.basicSalary + data.allowances).toLocaleString()}</td>
                                    <td className="px-4 py-5 text-right text-blue-600 font-bold">₹{data.travelAllowance.toLocaleString()}</td>
                                    <td className="px-4 py-5 text-right text-red-500 font-bold">-₹{data.advanceDeduction.toLocaleString()}</td>
                                    <td className="px-4 py-5 text-right text-red-500 font-bold">-₹{data.manualDeductions.toLocaleString()}</td> {/* NEW DISPLAY */}
                                    <td className="px-8 py-5 text-right font-black text-gray-900 text-lg">₹{net.toLocaleString()}</td>
                                    <td className="px-6 py-5 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            data.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                                        }`}>
                                            {data.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-center text-gray-600">{data.paidDate || '-'}</td>
                                    <td className="px-6 py-5 text-center text-gray-600">{data.paymentMode || '-'}</td>
                                    <td className="px-6 py-5 text-center">
                                        {data.status === 'Pending' && (
                                            <button 
                                                onClick={() => handleMarkPaid(emp, data)} 
                                                className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-green-100 transition-colors"
                                            >
                                                <IndianRupee className="w-3 h-3"/> Mark Paid
                                            </button>
                                        )}
                                        {data.status === 'Paid' && (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-center"><button onClick={() => { setActiveSlip({ emp, data }); setIsSlipModalOpen(true); }} className="text-xs font-bold text-indigo-600 hover:underline">View</button></td>
                                </tr>
                            );
                        })}
                        {filteredEmployees.length === 0 && <tr><td colSpan={12} className="py-20 text-center text-gray-400 italic">No staff found for the selected filters.</td></tr>} {/* Updated colspan */}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
      )}

      {activeTab === 'Advances' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold">Pending Salary Advances</div>
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                        <tr><th className="px-8 py-5">Staff Name</th><th className="px-4 py-5">Amount</th><th className="px-4 py-5">Reason</th><th className="px-4 py-5">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {advances.filter(a => a.status === 'Pending').map(adv => (
                            <tr key={adv.id}>
                                <td className="px-8 py-5 font-bold">{adv.employeeName}</td>
                                <td className="px-4 py-5 font-mono">₹{adv.amountRequested}</td>
                                <td className="px-4 py-5 text-gray-500 italic">{adv.reason}</td>
                                <td className="px-4 py-5"><span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Pending</span></td>
                            </tr>
                        ))}
                         {advances.filter(a => a.status === 'Pending').length === 0 && <tr><td colSpan={4} className="py-10 text-center text-gray-400">No pending advances.</td></tr>}
                    </tbody>
                 </table>
              </div>
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
                  {history.length === 0 && <div className="p-10 text-center text-gray-400">No payout history available.</div>}
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
                            <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">OK BOZ SUPER APP</h2>
                            <p className="text-xs text-gray-500 font-medium">{activeSlip.emp.corporateName || 'Head Office'}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Generated: {new Date().toLocaleDateString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pay Slip #</p>
                            <p className="text-sm font-mono font-bold text-gray-900">{activeSlip.data.employeeId}-{Date.now().toString().slice(-6)}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 mb-8 border-b border-gray-50 pb-6">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Employee</p>
                            <p className="text-sm font-bold text-gray-800">{activeSlip.emp.name}</p>
                            <p className="text-xs text-gray-500">{activeSlip.emp.role}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Worked Days</p>
                            <p className="text-sm font-bold text-gray-800">{activeSlip.data.payableDays} / {activeSlip.data.totalDays}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 border border-gray-100 rounded-lg overflow-hidden mb-8">
                        <div className="border-r border-gray-100">
                            <div className="bg-gray-50 px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Earnings for {new Date(selectedMonth).toLocaleDateString('en-US', {month: 'long'})}</div>
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
                                {/* Display existing advance deduction */}
                                <div className="flex justify-between text-sm"><span className="text-red-600">Advance Adj.</span><span className="font-bold text-red-600">-₹{activeSlip.data.advanceDeduction.toLocaleString()}</span></div>
                                {/* Display new manual deductions */}
                                {activeSlip.data.manualDeductions > 0 && (
                                    <div className="flex justify-between text-sm"><span className="text-red-600">Other Deductions</span><span className="font-bold text-red-600">-₹{activeSlip.data.manualDeductions.toLocaleString()}</span></div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 rounded-xl p-6 border border-indigo-100 flex justify-between items-center mb-6">
                        <div>
                            <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Net Monthly Payout</p>
                            <p className="text-[10px] text-indigo-500">Transferred via Bank</p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-black text-indigo-700">{formatCurrency(calculateNetPay(activeSlip.data))}</p>
                        </div>
                    </div>

                    {activeSlip.data.status === 'Paid' && (
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-2 mb-6">
                            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Payment Details
                            </h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div><span className="text-gray-600">Status:</span> <span className="font-medium text-emerald-700">{activeSlip.data.status}</span></div>
                                <div><span className="text-gray-600">Paid Date:</span> <span className="font-medium text-emerald-700">{activeSlip.data.paidDate || 'N/A'}</span></div>
                                <div className="col-span-2"><span className="text-gray-600">Mode:</span> <span className="font-medium text-emerald-700">{activeSlip.data.paymentMode || 'N/A'}</span></div>
                            </div>
                            {activeSlip.data.remarks && (
                                <div className="mt-2 pt-2 border-t border-emerald-100">
                                    <span className="text-xs text-gray-600">Notes:</span> <span className="text-sm italic text-gray-700">"{activeSlip.data.remarks}"</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={generateSlipPDF} disabled={isExportingSlip} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-black text-sm shadow-md flex items-center gap-2">
                    {isExportingSlip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
                </button>
                <button onClick={handleShareWhatsApp} className="bg-green-500 text-white px-6 py-2 rounded-lg font-black text-sm shadow-md flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
                <button onClick={handleShareEmail} className="bg-blue-500 text-white px-6 py-2 rounded-lg font-black text-sm shadow-md flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {isMarkPaidModalOpen && currentEmployeeForPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Mark Payout as Paid</h3>
              <button onClick={() => setIsMarkPaidModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-2xl transition-all text-gray-400 hover:text-gray-900"><X className="w-6 h-6"/></button>
            </div>
            <div className="p-10 space-y-8">
                <div className="bg-emerald-50/50 rounded-xl p-6 border border-emerald-100 flex justify-between items-center">
                    <div>
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Employee</p>
                        <p className="text-lg font-black text-emerald-700">{currentEmployeeForPayout.emp.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Net Payout</p>
                        <p className="text-3xl font-black text-emerald-700">{formatCurrency(calculateNetPay(currentEmployeeForPayout.data))}</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Paid Date</label>
                    <input 
                        type="date"
                        value={payoutForm.paidDate}
                        onChange={e => setPayoutForm({...payoutForm, paidDate: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Mode</label>
                    <select 
                        value={payoutForm.paymentMode}
                        onChange={e => setPayoutForm({...payoutForm, paymentMode: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                        <option>Bank Transfer</option>
                        <option>UPI</option>
                        <option>Cash</option>
                        <option>Cheque</option>
                    </select>
                </div>
                <div> {/* NEW: Input for Other Deductions */}
                    <label className="block text-sm font-medium text-red-700 mb-1.5">Other Deductions (₹)</label>
                    <input
                        type="number"
                        min="0"
                        value={payoutForm.manualDeductions}
                        onChange={e => setPayoutForm({...payoutForm, manualDeductions: e.target.value})}
                        className="w-full px-4 py-3 border border-red-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 bg-red-50 font-bold text-red-800"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks (Optional)</label>
                    <textarea 
                        rows={2}
                        value={payoutForm.remarks}
                        onChange={e => setPayoutForm({...payoutForm, remarks: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-gray-50"
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <button 
                        onClick={confirmMarkPaid}
                        disabled={isProcessingMarkPaid}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white py-5 px-10 rounded-[2rem] font-black text-sm shadow-2xl shadow-emerald-900/20 transition-all transform active:scale-95 flex items-center justify-center gap-3"
                    >
                        {isProcessingMarkPaid ? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-5 h-5"/>}
                        Confirm Payout
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Payroll };