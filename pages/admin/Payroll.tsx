
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  RefreshCw, X, 
  BarChart3,
  ChevronLeft, ChevronRight,
  Info, Download, Loader2,
  Check, DollarSign, Trash2,
  Users, Clock, CheckCircle2, Save
} from 'lucide-react';
import { getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, SalaryAdvanceRequest, DailyAttendance, TravelAllowanceRequest, UserRole, PayrollEntry, CorporateAccount } from '../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { sendSystemNotification } from '../../services/cloudService';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';



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

interface AttendanceCounts {
    present: number;
    half: number;
    leave: number;
    off: number;
    holiday: number;
    alternate: number;
    absent: number;
}

export const Payroll: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Salary' | 'Advances' | 'KM Claims (TA)' | 'History'>('Salary');
  const [searchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollData, setPayrollData] = useState<Record<string, PayrollEntry>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [history, setHistory] = useState<PayrollHistoryRecord[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvanceRequest[]>([]);
  const [kmClaims, setKmClaims] = useState<TravelAllowanceRequest[]>([]);
  const [refreshToggle, setRefreshToggle] = useState(0);

  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [activeSlip, setActiveSlip] = useState<{ emp: ExtendedEmployee, data: PayrollEntry, counts?: AttendanceCounts } | null>(null);
  const slipRef = useRef<HTMLDivElement>(null);
  const [isExportingSlip, setIsExportingSlip] = useState(false);

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';
  const [employees, setEmployees] = useState<ExtendedEmployee[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [selectedCorporate, setSelectedCorporate] = useState<string>('All');
  const navigate = useNavigate();

  const loadData = useCallback(() => {
      let allHistory: PayrollHistoryRecord[] = [];
      if (isSuperAdmin) {
          const rootHistory = localStorage.getItem('payroll_history');
          if (rootHistory) allHistory = JSON.parse(rootHistory);
          const corps: CorporateAccount[] = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          setCorporates(corps);
          corps.forEach((c: CorporateAccount) => {
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
          if (adminData) allEmp = JSON.parse(adminData).map((e: Employee) => ({...e, corporateId: 'admin', corporateName: 'Head Office'}));
          const corps: CorporateAccount[] = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          corps.forEach((corp: CorporateAccount) => {
              const cData = localStorage.getItem(`staff_data_${corp.email}`);
              if (cData) allEmp = [...allEmp, ...JSON.parse(cData).map((e: Employee) => ({...e, corporateId: corp.email, corporateName: corp.companyName}))];
          });
      } else {
          const saved = localStorage.getItem(`staff_data_${sessionId}`);
          if (saved) allEmp = JSON.parse(saved).map((e: Employee) => ({...e, corporateId: sessionId, corporateName: 'My Franchise'}));
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

    // Get Permission Settings
    const PERMISSION_KEY = isSuperAdmin ? 'company_permission_limit' : `company_permission_limit_${sessionId}`;
    const GRACE_KEY = isSuperAdmin ? 'company_grace_minutes' : `company_grace_minutes_${sessionId}`;
    const permissionLimit = parseInt(localStorage.getItem(PERMISSION_KEY) || '2');
    const graceMinutes = parseInt(localStorage.getItem(GRACE_KEY) || '15');

    const parseTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    employees.forEach(emp => {
        const monthlyCtc = parseFloat(emp.salary || '0');
        const key = `attendance_data_${emp.id}_${year}_${monthStr-1}`;
        const savedAttendance = localStorage.getItem(key);
        const attendance: DailyAttendance[] = savedAttendance ? JSON.parse(savedAttendance) : getEmployeeAttendance(emp, year, monthStr - 1);
        
        let payableDays = 0;
        let lateDaysCount = 0;
        let totalLateDeduction = 0;

        const joiningDate = emp.joiningDate ? new Date(emp.joiningDate + 'T12:00:00') : new Date('2000-01-01');
        const terminationDate = (emp.status === 'Terminated' && emp.terminationDate) ? new Date(emp.terminationDate + 'T12:00:00') : null;
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        attendance.forEach((day) => {
            const dayDate = new Date(day.date + 'T12:00:00');
            
            // Skip days before joining
            if (dayDate < joiningDate) return;

            // Skip days after termination
            if (terminationDate && dayDate > terminationDate) return;

            // Skip future dates (upcoming week offs/holidays should not be counted yet)
            if (dayDate > today) return;

            const dayOfWeek = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
            const isSunday = dayDate.getDay() === 0;
            const isCustomWeekOff = emp.weekOff === dayOfWeek;
            const isImplicitWeekOff = (isSunday || isCustomWeekOff) && day.status === AttendanceStatus.NOT_MARKED;

            if ([AttendanceStatus.PRESENT, AttendanceStatus.WEEK_OFF, AttendanceStatus.PAID_LEAVE, AttendanceStatus.HOLIDAY, AttendanceStatus.ALTERNATE_DAY].includes(day.status) || isImplicitWeekOff) payableDays += 1;
            else if (day.status === AttendanceStatus.HALF_DAY) payableDays += 0.5;

            // Late Deduction Logic
            if ((day.status === AttendanceStatus.PRESENT || day.status === AttendanceStatus.HALF_DAY) && emp.shift) {
                const punchIn = day.punches?.[0]?.in || day.checkIn;
                if (punchIn) {
                    const match = emp.shift.match(/\((\d{2}:\d{2}) - (\d{2}:\d{2})\)/);
                    if (match) {
                        const [, startStr, endStr] = match;
                        const shiftStart = parseTime(startStr);
                        const shiftEnd = parseTime(endStr);
                        const punchInTime = parseTime(punchIn);
                        
                        const diff = punchInTime - shiftStart;
                        if (diff > graceMinutes) {
                            lateDaysCount++;
                            if (lateDaysCount > permissionLimit) {
                                let shiftDuration = shiftEnd - shiftStart;
                                if (shiftDuration < 0) shiftDuration += 24 * 60; // Handle overnight
                                
                                if (shiftDuration > 0) {
                                    const dailySalary = (monthlyCtc / daysInMonth);
                                    const deduction = (diff / shiftDuration) * dailySalary;
                                    totalLateDeduction += deduction;
                                }
                            }
                        }
                    }
                }
            }
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
            lateDeduction: Math.round(totalLateDeduction),
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
    (entry.basicSalary + entry.allowances + entry.travelAllowance + entry.bonus) - (entry.advanceDeduction + entry.manualDeductions + (entry.lateDeduction || 0));

  const getAttendanceBreakup = (empId: string) => {
      const [year, monthStr] = selectedMonth.split('-').map(n => parseInt(n));
      const key = `attendance_data_${empId}_${year}_${monthStr-1}`;
      const saved = localStorage.getItem(key);
      const emp = employees.find(e => e.id === empId);
      if (!emp) return null;
      const attendance: DailyAttendance[] = saved ? JSON.parse(saved) : getEmployeeAttendance(emp, year, monthStr - 1);
      
      const joiningDate = emp.joiningDate ? new Date(emp.joiningDate + 'T12:00:00') : new Date('2000-01-01');
      const terminationDate = (emp.status === 'Terminated' && emp.terminationDate) ? new Date(emp.terminationDate + 'T12:00:00') : null;
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      attendance.forEach(day => {
          const dayDate = new Date(day.date + 'T12:00:00');
          
          // Skip days before joining
          if (dayDate < joiningDate) return;

          // Skip days after termination
          if (terminationDate && dayDate > terminationDate) return;

          // Skip future dates (upcoming week offs/holidays should not be counted yet)
          if (dayDate > today) return;

          const dayOfWeek = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
          const isSunday = dayDate.getDay() === 0;
          const isCustomWeekOff = emp.weekOff === dayOfWeek;
          const isImplicitWeekOff = (isSunday || isCustomWeekOff) && day.status === AttendanceStatus.NOT_MARKED;

          if (day.status === AttendanceStatus.PRESENT) counts.present++;
          else if (day.status === AttendanceStatus.WEEK_OFF || isImplicitWeekOff) counts.off++;
          else if (day.status === AttendanceStatus.HOLIDAY) counts.holiday++;
          else if (day.status === AttendanceStatus.PAID_LEAVE) counts.leave++;
          else if (day.status === AttendanceStatus.HALF_DAY) counts.half++;
          else if (day.status === AttendanceStatus.ALTERNATE_DAY) counts.alternate++;
          else if (day.status === AttendanceStatus.ABSENT) counts.absent++;
      });
      return counts;
  };

  const handleAdvanceStatus = (id: string, newStatus: SalaryAdvanceRequest['status']) => {
      if (window.confirm(`Mark this advance request as ${newStatus}?`)) {
          const updated = advances.map(a => a.id === id ? { ...a, status: newStatus } : a);
          localStorage.setItem('salary_advances', JSON.stringify(updated));
          setAdvances(updated);
          
          const req = advances.find(a => a.id === id);
          if (req) {
              sendSystemNotification({
                  type: 'system',
                  title: `Advance Request ${newStatus}`,
                  message: `Your advance request for ₹${req.amountRequested} has been ${newStatus}.`,
                  targetRoles: [UserRole.EMPLOYEE],
                  employeeId: req.employeeId,
                  link: '/user/salary'
              });
          }
      }
  };

  const handleDeleteAdvance = (id: string) => {
      if (window.confirm("Delete this advance request?")) {
          const updated = advances.filter(a => a.id !== id);
          localStorage.setItem('salary_advances', JSON.stringify(updated));
          setAdvances(updated);
      }
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

  const filteredEmployees = useMemo(() => {
      return employees.filter(emp => {
          const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesCorp = selectedCorporate === 'All' || emp.corporateId === selectedCorporate;
          return matchesSearch && matchesCorp;
      });
  }, [employees, searchTerm, selectedCorporate]);

  const stats = useMemo(() => {
      let totalCost = 0;
      let pendingCount = 0;
      let paidCount = 0;
      let totalDays = 0;
      let payableDays = 0;
      
      filteredEmployees.forEach(emp => {
          const data = payrollData[emp.id];
          if (data) {
              totalCost += calculateNetPay(data);
              if (data.status === 'Pending') pendingCount++;
              if (data.status === 'Paid') paidCount++;
              totalDays += data.totalDays || 0;
              payableDays += data.payableDays || 0;
          }
      });

      return {
          totalCost,
          employeeCount: filteredEmployees.length,
          avgSalary: filteredEmployees.length ? Math.round(totalCost / filteredEmployees.length) : 0,
          pendingCount,
          paidCount,
          avgAttendance: totalDays ? Math.round((payableDays / totalDays) * 100) : 0
      };
  }, [filteredEmployees, payrollData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2><p className="text-gray-500">Execution and history for monthly disbursements</p></div>
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/reports')} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-sm"><BarChart3 className="w-4 h-4" /> View Analytics</button>
            <div className="flex bg-gray-100 p-1.5 rounded-xl shadow-inner">
                {['Salary', 'Advances', 'KM Claims (TA)', 'History'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t as 'Salary' | 'Advances' | 'KM Claims (TA)' | 'History')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === t ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
                ))}
            </div>
        </div>
      </div>

      {activeTab === 'Salary' && (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-full text-emerald-600"><DollarSign className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Payroll Cost</p>
                    <h3 className="text-2xl font-black text-gray-900">₹{stats.totalCost.toLocaleString()}</h3>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full text-blue-600"><Users className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Employees</p>
                    <h3 className="text-2xl font-black text-gray-900">{stats.employeeCount}</h3>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-full text-amber-600"><Clock className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Clearance</p>
                    <h3 className="text-2xl font-black text-gray-900">{stats.pendingCount}</h3>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-full text-indigo-600"><CheckCircle2 className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg. Attendance</p>
                    <h3 className="text-2xl font-black text-gray-900">{stats.avgAttendance}%</h3>
                </div>
            </div>
        </div>

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
                    <p className="col-span-2 text-rose-600">• <b>Late Policy:</b> Pro-rata deduction after limit exceeded</p>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                <div className="flex flex-wrap gap-2 items-center">
                    {isSuperAdmin && (
                        <select 
                            value={selectedCorporate} 
                            onChange={(e) => setSelectedCorporate(e.target.value)} 
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="All">All Corporates</option>
                            <option value="admin">Head Office</option>
                            {corporates.map(c => (
                                <option key={c.id} value={c.email}>{c.companyName}</option>
                            ))}
                        </select>
                    )}
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
                <button onClick={() => {
                    if (window.confirm("Are you sure you want to process payroll for this month? This will save the current calculation to history.")) {
                        const record: PayrollHistoryRecord = {
                            id: `PAY-${Date.now()}`,
                            name: new Date(selectedMonth + '-01').toLocaleDateString('default', { month: 'long', year: 'numeric' }),
                            date: new Date().toISOString(),
                            totalAmount: stats.totalCost,
                            employeeCount: stats.employeeCount,
                            data: payrollData
                        };
                        
                        let targetKey = 'payroll_history';
                        if (isSuperAdmin) {
                             if (selectedCorporate !== 'All') {
                                 targetKey = `payroll_history_${selectedCorporate}`;
                             }
                        } else {
                            targetKey = `payroll_history_${sessionId}`;
                        }
                        
                        const existing = JSON.parse(localStorage.getItem(targetKey) || '[]');
                        localStorage.setItem(targetKey, JSON.stringify([record, ...existing]));
                        
                        alert("Payroll processed and saved to history!");
                        loadData();
                    }
                }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"><Save className="w-4 h-4" /> Process Payroll</button>
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
                                    <td className="px-4 py-5 text-right text-red-500 font-bold">-₹{(data.advanceDeduction + data.manualDeductions + (data.lateDeduction || 0)).toLocaleString()}</td>
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

      {activeTab === 'Advances' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Reason</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {advances.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">No advance requests found.</td></tr>
                        ) : (
                            advances.map(adv => (
                                <tr key={adv.id} className="hover:bg-gray-50/50 transition-all">
                                    <td className="px-6 py-4 font-medium text-gray-900">{new Date(adv.requestDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-bold text-gray-800">{adv.employeeName}</td>
                                    <td className="px-6 py-4 font-black text-gray-900">₹{adv.amountRequested.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-gray-500 italic max-w-xs truncate" title={adv.reason}>{adv.reason}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                            adv.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            adv.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                            adv.status === 'Paid' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                            'bg-orange-50 text-orange-700 border-orange-100'
                                        }`}>{adv.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {adv.status === 'Pending' && (
                                                <>
                                                    <button onClick={() => handleAdvanceStatus(adv.id, 'Approved')} className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200 transition-colors" title="Approve"><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => handleAdvanceStatus(adv.id, 'Rejected')} className="p-1.5 bg-rose-100 text-rose-600 rounded hover:bg-rose-200 transition-colors" title="Reject"><X className="w-4 h-4" /></button>
                                                </>
                                            )}
                                            {adv.status === 'Approved' && (
                                                <button onClick={() => handleAdvanceStatus(adv.id, 'Paid')} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors" title="Mark Paid"><DollarSign className="w-4 h-4" /></button>
                                            )}
                                            <button onClick={() => handleDeleteAdvance(adv.id)} className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'KM Claims (TA)' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Recent Travel Claims</h3>
                <button onClick={() => navigate('/admin/km-claims')} className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1">Manage All Claims <ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Distance</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Remarks</th>
                            <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {kmClaims.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">No travel claims found.</td></tr>
                        ) : (
                            kmClaims.slice(0, 50).map(claim => (
                                <tr key={claim.id} className="hover:bg-gray-50/50 transition-all">
                                    <td className="px-6 py-4 font-medium text-gray-900">{claim.date}</td>
                                    <td className="px-6 py-4 font-bold text-gray-800">{claim.employeeName}</td>
                                    <td className="px-6 py-4 text-gray-600">{claim.totalKm} km</td>
                                    <td className="px-6 py-4 font-black text-gray-900">₹{claim.totalAmount.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-gray-500 italic max-w-xs truncate">{claim.remarks || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                            claim.status === 'Paid' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                            claim.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            claim.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                            'bg-orange-50 text-orange-700 border-orange-100'
                                        }`}>{claim.status}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'History' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Payroll Month</th>
                            <th className="px-6 py-4">Processed Date</th>
                            <th className="px-6 py-4 text-center">Staff Count</th>
                            <th className="px-6 py-4 text-right">Total Payout</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {history.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">No payroll history found.</td></tr>
                        ) : (
                            history.map(rec => (
                                <tr key={rec.id} className="hover:bg-gray-50/50 transition-all">
                                    <td className="px-6 py-4 font-black text-gray-900">{rec.name}</td>
                                    <td className="px-6 py-4 text-gray-500 font-medium">{new Date(rec.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center font-bold text-gray-700">{rec.employeeCount}</td>
                                    <td className="px-6 py-4 text-right font-black text-emerald-600 text-lg">₹{rec.totalAmount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-indigo-600 font-bold text-xs hover:underline flex items-center justify-end gap-1 ml-auto">
                                            <Download className="w-4 h-4" /> Download Report
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
                                {(activeSlip.data.lateDeduction && activeSlip.data.lateDeduction > 0) ? (
                                    <tr><td className="px-6 py-4 text-rose-500">Late Deduction (-)</td><td className="px-6 py-4 text-right font-mono text-rose-500">- ₹{activeSlip.data.lateDeduction.toLocaleString()}</td></tr>
                                ) : null}
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
