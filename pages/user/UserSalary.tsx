
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Download, TrendingUp, DollarSign, FileText, CheckCircle, Clock, Plus, AlertCircle, X, Send, Timer, Bike, Loader2, MessageCircle, Mail, MapPin, Building, User, ReceiptIndianRupee, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, SalaryAdvanceRequest, DailyAttendance, TravelAllowanceRequest, UserRole, PayrollEntry } from '../../types';
import { sendSystemNotification } from '../../services/cloudService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const timeToMinutes = (timeStr?: string) => {
  if (!timeStr || timeStr === '--:--') return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3].toUpperCase();
  if (hours === 12) hours = 0;
  if (modifier === 'PM') hours += 12;
  return hours * 60 + minutes;
};

const UserSalary: React.FC = () => {
  const [user, setUser] = useState<Employee | null>(null);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ amount: '', reason: '' });
  const [advanceHistory, setAdvanceHistory] = useState<SalaryAdvanceRequest[]>([]);
  const [kmClaims, setKmClaims] = useState<TravelAllowanceRequest[]>([]);
  const [refreshToggle, setRefreshToggle] = useState(0);

  const [payoutSettings, setPayoutSettings] = useState({ 
    dates: {} as Record<string, string>, 
    globalDay: '5',
    ratePerKm: '10' 
  });

  const slipRef = useRef<HTMLDivElement>(null);
  const [isExportingSlip, setIsExportingSlip] = useState(false);
  const [currentMonthPayrollEntry, setCurrentMonthPayrollEntry] = useState<PayrollEntry | null>(null);

  useEffect(() => {
      const loadUserAndSettings = () => {
          const storedSessionId = localStorage.getItem('app_session_id');
          if (storedSessionId) {
              const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
              let found = adminStaff.find((e: any) => e.id === storedSessionId);
              let corporateOwnerId = 'admin';

              if (!found) {
                const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
                for (const corp of corporates) {
                    const key = `staff_data_${corp.email}`;
                    const cStaff = JSON.parse(localStorage.getItem(key) || '[]');
                    found = cStaff.find((e: any) => e.id === storedSessionId);
                    if (found) {
                        corporateOwnerId = corp.email;
                        break;
                    }
                }
              }
              setUser(found || null);

              if (found) {
                  const currentMonthYear = new Date().toISOString().slice(0, 7);
                  const payrollKey = corporateOwnerId === 'admin' ? 'payroll_data' : `payroll_data_${corporateOwnerId}`;
                  const currentPayrollState = JSON.parse(localStorage.getItem(payrollKey) || '{}');
                  setCurrentMonthPayrollEntry(currentPayrollState[found.id] || null);
              }

              const rateKey = corporateOwnerId === 'admin' ? 'company_ta_rate' : `company_ta_rate_${corporateOwnerId}`;
              const savedRate = localStorage.getItem(rateKey) || '10';

              setPayoutSettings({ 
                  dates: JSON.parse(localStorage.getItem('company_payout_dates') || '{}'), 
                  globalDay: localStorage.getItem('company_global_payout_day') || '5',
                  ratePerKm: savedRate
              });
          }
          setRefreshToggle(v => v + 1);
      };
      loadUserAndSettings();
      window.addEventListener('storage', loadUserAndSettings);
      return () => window.removeEventListener('storage', loadUserAndSettings);
  }, []);

  useEffect(() => {
      if(!user) return;
      const loadHistories = () => {
          const allAdvances = JSON.parse(localStorage.getItem('salary_advances') || '[]');
          setAdvanceHistory(allAdvances.filter((a: SalaryAdvanceRequest) => a.employeeId === user.id));
          const allClaims = JSON.parse(localStorage.getItem('global_travel_requests') || '[]');
          setKmClaims(allClaims.filter((c: TravelAllowanceRequest) => c.employeeId === user.id));
      };
      loadHistories();
      window.addEventListener('storage', loadHistories);
      return () => window.removeEventListener('storage', loadHistories);
  }, [user]);

  const handleSubmitAdvance = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !advanceForm.amount || !advanceForm.reason) return;
      setIsSubmitting(true);
      const corporateId = localStorage.getItem('logged_in_employee_corporate_id') || 'admin';
      const newRequest: SalaryAdvanceRequest = {
          id: `ADV-${Date.now()}`,
          employeeId: user.id,
          employeeName: user.name,
          amountRequested: parseFloat(advanceForm.amount),
          amountApproved: 0,
          reason: advanceForm.reason,
          status: 'Pending',
          requestDate: new Date().toISOString(),
          corporateId: corporateId
      };
      const existingAdvances = JSON.parse(localStorage.getItem('salary_advances') || '[]');
      localStorage.setItem('salary_advances', JSON.stringify([newRequest, ...existingAdvances]));
      await sendSystemNotification({
          type: 'advance_request',
          title: 'New Salary Advance Request',
          message: `${user.name} requested ₹${newRequest.amountRequested}. Reason: ${newRequest.reason}`,
          targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
          corporateId: corporateId === 'admin' ? undefined : corporateId,
          employeeId: user.id,
          link: '/admin'
      });
      setAdvanceHistory([newRequest, ...advanceHistory]);
      setIsAdvanceModalOpen(false);
      setAdvanceForm({ amount: '', reason: '' });
      setIsSubmitting(false);
      alert("Request submitted successfully!");
  };

  const salaryData = useMemo(() => {
    if (!user) return null;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const currentMonthStr = today.toISOString().slice(0, 7);
    const monthlyCtc = parseFloat(user.salary || '0');
    
    let grossEarned = 0;
    let payableDays = 0;
    let totalWorkMinutes = 0;
    let paidAdvances = 0;
    let travelIncentive = 0;

    const savedAttendance = localStorage.getItem(`attendance_data_${user.id}_${year}_${month}`);
    const attendance: DailyAttendance[] = savedAttendance ? JSON.parse(savedAttendance) : getEmployeeAttendance(user, year, month);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let counts = { present: 0, half: 0, leave: 0, off: 0, holiday: 0, alternate: 0, absent: 0 };
    
    attendance.forEach(day => {
        // --- 1.0x Pay Rules ---
        if (day.status === AttendanceStatus.PRESENT) {
            payableDays += 1;
            counts.present++;
        } else if (day.status === AttendanceStatus.ALTERNATE_DAY) {
            payableDays += 1;
            counts.alternate++;
        } else if (day.status === AttendanceStatus.PAID_LEAVE) {
            payableDays += 1;
            counts.leave++;
        } else if (day.status === AttendanceStatus.WEEK_OFF) {
            payableDays += 1;
            counts.off++;
        } else if (day.status === AttendanceStatus.HOLIDAY) {
            payableDays += 1;
            counts.holiday++;
        } 
        // --- 0.5x Pay Rules ---
        else if (day.status === AttendanceStatus.HALF_DAY) {
            payableDays += 0.5;
            counts.half++;
        } 
        // --- 0.0x Pay Rules ---
        else if (day.status === AttendanceStatus.ABSENT) {
            counts.absent++;
        }

        if (day.punches) {
            day.punches.forEach(punch => {
                if (punch.in && punch.out) {
                    const start = timeToMinutes(punch.in);
                    const end = timeToMinutes(punch.out);
                    if (end > start) totalWorkMinutes += (end - start);
                }
            });
        }
    });

    if (currentMonthPayrollEntry) {
        grossEarned = currentMonthPayrollEntry.basicSalary + currentMonthPayrollEntry.allowances;
        paidAdvances = currentMonthPayrollEntry.advanceDeduction;
        travelIncentive = currentMonthPayrollEntry.travelAllowance;
    } else {
        const perDaySalary = monthlyCtc / daysInMonth;
        grossEarned = Math.round(perDaySalary * payableDays);
        paidAdvances = advanceHistory.filter(a => a.status === 'Approved').reduce((sum, item) => sum + (item.amountApproved || 0), 0);
        travelIncentive = kmClaims.filter(c => (c.status === 'Approved' || c.status === 'Paid') && c.date.startsWith(currentMonthStr)).reduce((sum, c) => sum + c.totalAmount, 0);
    }

    const netPay = grossEarned + travelIncentive - paidAdvances;

    return {
        month: today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        netPay,
        grossEarned: grossEarned + travelIncentive,
        workingDays: daysInMonth,
        paidDays: payableDays,
        counts,
        totalWorkTime: `${Math.floor(totalWorkMinutes / 60)}h ${totalWorkMinutes % 60}m`,
        earnings: [
            { label: 'Basic Salary & HRA', amount: grossEarned },
            { label: 'Travel Allowance (KM Claims)', amount: travelIncentive }
        ],
        deductions: paidAdvances > 0 ? [{ label: 'Salary Advance Rec.', amount: paidAdvances }] : []
    };
  }, [user, advanceHistory, kmClaims, refreshToggle, currentMonthPayrollEntry]);

  const handleShareWhatsApp = () => {
    if (!user || !salaryData) return;
    let text = `*OK BOZ Salary Slip Summary*\n\n`;
    text += `Employee: *${user.name}*\n`;
    text += `Month: *${salaryData.month}*\n`;
    text += `Payable Days: *${salaryData.paidDays}*\n`;
    text += `Net Payout: *₹${salaryData.netPay.toLocaleString()}*\n`;
    text += `Status: *${currentMonthPayrollEntry?.status || 'Pending'}*\n\n`;
    text += `_Thank you for your hard work!_`;
    window.open(`https://wa.me/${user.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareEmail = () => {
    if (!user || !salaryData) return;
    const text = `Hi ${user.name},\n\nYour salary slip for ${salaryData.month} is ready. Net Payout: ₹${salaryData.netPay.toLocaleString()}.`;
    window.location.href = `mailto:${user.email}?subject=Salary Slip ${salaryData.month}&body=${encodeURIComponent(text)}`;
  };

  const generateSlipPDF = async () => {
    if (!slipRef.current || !user || !salaryData) return;
    setIsExportingSlip(true);
    try {
      const canvas = await html2canvas(slipRef.current, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SalarySlip_${user.name}_${new Date().toISOString().slice(0, 7)}.pdf`);
    } catch (error) {
      console.error("PDF generation failed", error);
    } finally {
      setIsExportingSlip(false);
    }
  };

  if (!user || !salaryData) return <div className="p-10 text-center text-gray-400 font-bold">Initializing salary manifest...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">My Salary Dashboard</h2><p className="text-gray-500">Live breakdown and historical payout data</p></div>
        <button onClick={() => setIsAdvanceModalOpen(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all transform active:scale-95 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Request Advance</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10 space-y-8">
            <div>
                <p className="text-emerald-100 font-black uppercase tracking-[0.2em] text-[10px]">Estimated Net Payout • {salaryData.month}</p>
                <h3 className="text-6xl font-black tracking-tighter mt-2">₹{salaryData.netPay.toLocaleString()}</h3>
            </div>
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                    <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Payable Days</p>
                    <p className="text-xl font-black">{salaryData.paidDays} <span className="text-xs opacity-50">/ {salaryData.workingDays}</span></p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                    <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Hours Logged</p>
                    <p className="text-xl font-black">{salaryData.totalWorkTime}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                    <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Travel TA</p>
                    <p className="text-xl font-black text-emerald-200">₹{salaryData.earnings[1].amount.toLocaleString()}</p>
                </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-5 bg-blue-50 rounded-3xl text-blue-600 animate-bounce"><Bike className="w-10 h-10" /></div>
            <div>
                <h4 className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Approved Travel (KM)</h4>
                <p className="text-4xl font-black text-blue-600 mt-1">₹{salaryData.earnings[1].amount.toLocaleString()}</p>
            </div>
            <p className="text-xs text-gray-400 font-medium">Calculated at ₹{payoutSettings.ratePerKm}/km from your approved claims.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
            {/* Professional Slip Ref Section */}
            <div ref={slipRef} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden font-sans p-10 max-w-xl mx-auto">
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">OK BOZ SUPER APP</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-1">Employee Salary Slip</p>
                    </div>
                    <div className="text-right">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${currentMonthPayrollEntry?.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                            {currentMonthPayrollEntry?.status || 'Calculated'}
                        </span>
                        <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">{salaryData.month}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Employee Details</p>
                            <p className="font-black text-gray-800">{user.name}</p>
                            <p className="text-xs text-gray-500 font-bold">{user.role}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">ID: {user.id}</p>
                        </div>
                    </div>
                    <div className="space-y-4 text-right">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Attendance Detailed Summary</p>
                            <div className="text-[10px] space-y-1 font-bold text-gray-600">
                                <p className="flex justify-between">Present: <span className="text-gray-900">{salaryData.counts.present}</span></p>
                                <p className="flex justify-between">Week Off: <span className="text-gray-900">{salaryData.counts.off}</span></p>
                                <p className="flex justify-between">Holiday: <span className="text-gray-900">{salaryData.counts.holiday}</span></p>
                                <p className="flex justify-between">Paid Leave: <span className="text-gray-900">{salaryData.counts.leave}</span></p>
                                <p className="flex justify-between">Alternate Day: <span className="text-gray-900">{salaryData.counts.alternate}</span></p>
                                <p className="flex justify-between border-t border-gray-100 pt-1">Half Day (50%): <span className="text-gray-900">{salaryData.counts.half}</span></p>
                                <div className="h-px bg-indigo-100 my-1"></div>
                                <p className="flex justify-between text-indigo-600 text-xs font-black">Payable Days: <span>{salaryData.paidDays}</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-10">
                    <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>Description</span>
                        <span>Amount (INR)</span>
                    </div>
                    <div className="p-4 space-y-3">
                        {salaryData.earnings.map((e, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-600">{e.label}</span>
                                <span className="font-mono font-bold text-gray-800">₹{e.amount.toLocaleString()}</span>
                            </div>
                        ))}
                        {salaryData.deductions.map((d, idx) => (
                            <div key={idx} className="flex justify-between items-center text-rose-500">
                                <span className="text-sm font-bold">{d.label}</span>
                                <span className="font-mono font-bold">- ₹{d.amount.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="bg-emerald-600 p-6 flex justify-between items-center text-white">
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Net Take Home</span>
                        <span className="text-3xl font-black tracking-tighter">₹{salaryData.netPay.toLocaleString()}</span>
                    </div>
                </div>

                <div className="text-center pt-6 border-t border-dashed border-gray-200">
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em]">Automated Salary Disbursement System</p>
                </div>
            </div>

            <div className="flex gap-4">
                <button onClick={generateSlipPDF} disabled={isExportingSlip} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    {isExportingSlip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF Slip
                </button>
                <div className="flex gap-2">
                    <button onClick={handleShareWhatsApp} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-colors"><MessageCircle className="w-5 h-5"/></button>
                    <button onClick={handleShareEmail} className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-colors"><Mail className="w-5 h-5"/></button>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Clock className="w-4 h-4" /></div>
                <h3 className="font-black uppercase tracking-widest text-[11px] text-gray-500">Advance Request History</h3>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[500px] p-6 space-y-4 custom-scrollbar">
                {advanceHistory.map(req => (
                    <div key={req.id} className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-gray-800 truncate">₹{req.amountRequested.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-500 truncate italic mt-0.5">"{req.reason}"</p>
                        </div>
                        <div className="text-right ml-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                                req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                req.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                req.status === 'Paid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>{req.status}</span>
                            <p className="text-[9px] text-gray-400 mt-1 font-bold">{new Date(req.requestDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
      {/* ... advance modal remains unchanged ... */}
    </div>
  );
};

export default UserSalary;
