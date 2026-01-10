

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Download, TrendingUp, DollarSign, FileText, CheckCircle, Clock, Plus, AlertCircle, X, Send, Timer, Bike, Loader2, MessageCircle, Mail } from 'lucide-react';
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

  const [payoutSettings, setPayoutSettings] = useState({ dates: {} as Record<string, string>, globalDay: '5' });

  const slipRef = useRef<HTMLDivElement>(null);
  const [isExportingSlip, setIsExportingSlip] = useState(false);

  // NEW: State to hold current month's payroll entry for display
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

              // NEW: Load current month's payroll entry
              if (found) {
                  const currentMonthYear = new Date().toISOString().slice(0, 7);
                  const payrollKey = corporateOwnerId === 'admin' ? 'payroll_data' : `payroll_data_${corporateOwnerId}`;
                  const currentPayrollState = JSON.parse(localStorage.getItem(payrollKey) || '{}');
                  setCurrentMonthPayrollEntry(currentPayrollState[found.id] || null);
              }
          }
          setPayoutSettings({ 
              dates: JSON.parse(localStorage.getItem('company_payout_dates') || '{}'), 
              globalDay: localStorage.getItem('company_global_payout_day') || '5' 
          });
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

  const salaryData = useMemo(() => {
    if (!user) return null;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const currentMonthStr = today.toISOString().slice(0, 7);
    const monthlyCtc = parseFloat(user.salary || '0');
    
    // Check if currentMonthPayrollEntry exists, otherwise calculate
    let grossEarned = 0;
    let payableDays = 0;
    let totalWorkMinutes = 0;
    let paidAdvances = 0;
    let travelIncentive = 0;
    
    if (currentMonthPayrollEntry) {
        grossEarned = currentMonthPayrollEntry.basicSalary + currentMonthPayrollEntry.allowances;
        payableDays = currentMonthPayrollEntry.payableDays;
        paidAdvances = currentMonthPayrollEntry.advanceDeduction;
        travelIncentive = currentMonthPayrollEntry.travelAllowance;
        // Total work minutes need to be calculated separately if not directly stored in PayrollEntry
        const savedAttendance = localStorage.getItem(`attendance_data_${user.id}_${year}_${month}`);
        const attendance: DailyAttendance[] = savedAttendance ? JSON.parse(savedAttendance) : getEmployeeAttendance(user, year, month);
        attendance.forEach(day => {
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

    } else { // Fallback if no specific payroll entry is found
        const savedAttendance = localStorage.getItem(`attendance_data_${user.id}_${year}_${month}`);
        const attendance: DailyAttendance[] = savedAttendance ? JSON.parse(savedAttendance) : getEmployeeAttendance(user, year, month);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        attendance.forEach(day => {
            if ([AttendanceStatus.PRESENT, AttendanceStatus.WEEK_OFF, AttendanceStatus.PAID_LEAVE, AttendanceStatus.HOLIDAY, AttendanceStatus.ALTERNATE_DAY].includes(day.status)) payableDays += 1;
            else if (day.status === AttendanceStatus.HALF_DAY) payableDays += 0.5;
            if (day.punches) { // Use punches array for accurate work time
                day.punches.forEach(punch => {
                    if (punch.in && punch.out) {
                        const start = timeToMinutes(punch.in);
                        const end = timeToMinutes(punch.out);
                        if (end > start) totalWorkMinutes += (end - start);
                    }
                });
            }
        });

        const perDaySalary = monthlyCtc / daysInMonth;
        grossEarned = Math.round(perDaySalary * payableDays);
        paidAdvances = advanceHistory.filter(a => a.status === 'Paid').reduce((sum, item) => sum + (item.amountApproved || 0), 0);
        travelIncentive = kmClaims.filter(c => c.status === 'Approved' && c.date.startsWith(currentMonthStr)).reduce((sum, c) => sum + c.totalAmount, 0);
    }


    const netPay = grossEarned + travelIncentive - paidAdvances;
    const workingDays = new Date(year, month + 1, 0).getDate();

    const earnings = [
        { label: 'Basic Salary & HRA', amount: grossEarned },
        { label: 'Travel Allowance (KM Claims)', amount: travelIncentive }
    ];

    return {
        month: today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        netPay,
        grossEarned: grossEarned + travelIncentive,
        workingDays: workingDays,
        paidDays: payableDays,
        totalWorkTime: `${Math.floor(totalWorkMinutes / 60)}h ${totalWorkMinutes % 60}m`,
        earnings,
        deductions: paidAdvances > 0 ? [{ label: 'Salary Advance Rec.', amount: paidAdvances }] : []
    };
  }, [user, advanceHistory, kmClaims, refreshToggle, currentMonthPayrollEntry]);

  const handleSubmitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !advanceForm.amount || !advanceForm.reason) return;

    setIsSubmitting(true);
    
    const amountRequested = parseFloat(advanceForm.amount);
    const ownerId = localStorage.getItem('logged_in_employee_corporate_id') || 'admin';

    const newRequest: SalaryAdvanceRequest = {
        id: `ADV-${Date.now()}`,
        employeeId: user.id,
        employeeName: user.name,
        amountRequested: amountRequested,
        amountApproved: 0,
        reason: advanceForm.reason,
        status: 'Pending',
        requestDate: new Date().toISOString(),
        corporateId: ownerId
    };

    // Save to global storage
    const allAdvances = JSON.parse(localStorage.getItem('salary_advances') || '[]');
    const updatedAll = [newRequest, ...allAdvances];
    localStorage.setItem('salary_advances', JSON.stringify(updatedAll));

    // Notify Admin
    await sendSystemNotification({
        type: 'advance_request',
        title: 'New Salary Advance Request',
        message: `${user.name} has requested an advance of ₹${amountRequested.toLocaleString()}. Reason: ${advanceForm.reason}`,
        targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
        corporateId: ownerId === 'admin' ? undefined : ownerId,
        employeeId: user.id,
        link: '/admin/payroll'
    });

    // Update local state
    setAdvanceHistory(prev => [newRequest, ...prev]);
    setIsSubmitting(false);
    setIsAdvanceModalOpen(false);
    setAdvanceForm({ amount: '', reason: '' });
    alert("Advance request submitted successfully. It will be reviewed by HR.");
  };

  const generateSlipPDF = async () => {
    if (!slipRef.current || !user || !salaryData) return;
    setIsExportingSlip(true);
    try {
      const canvas = await html2canvas(slipRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), (canvas.height * pdf.internal.pageSize.getWidth()) / canvas.width);
      pdf.save(`SalarySlip_${user.name}_${new Date().toISOString().slice(0, 7)}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsExportingSlip(false);
    }
  };

  const generateShareableText = () => {
    if (!user || !salaryData) return '';
    const monthYear = salaryData.month;
    
    let text = `*OK BOZ Salary Slip Summary*\n\n`;
    text += `Employee: *${user.name}*\n`;
    text += `Month: *${monthYear}*\n`;
    text += `Net Payout: *₹${salaryData.netPay.toLocaleString()}*\n\n`;
    text += `Status: *${currentMonthPayrollEntry?.status || 'Pending'}*\n`;
    if (currentMonthPayrollEntry?.status === 'Paid') {
        text += `Paid Date: ${currentMonthPayrollEntry.paidDate || 'N/A'}\n`;
        text += `Payment Mode: ${currentMonthPayrollEntry.paymentMode || 'N/A'}\n`;
    }
    if (currentMonthPayrollEntry?.remarks) {
        text += `Notes: "${currentMonthPayrollEntry.remarks}"\n`;
    }
    text += `\nThank you for your hard work!`;
    return text;
  };

  const handleShareWhatsApp = () => {
    if (!user) return;
    const text = generateShareableText();
    const phone = user.phone.replace(/\D/g, '');
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      alert("Your phone number is not available for WhatsApp share.");
    }
  };

  const handleShareEmail = () => {
    if (!user) return;
    const text = generateShareableText();
    const email = user.email;
    if (email) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(`OK BOZ Salary Slip for ${user.name}`)}&body=${encodeURIComponent(text)}`;
    } else {
      alert("Your email is not available for Email share.");
    }
  };

  if (!user || !salaryData) return <div className="p-10 text-center font-bold text-gray-500">Loading salary structure...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div><h2 className="text-2xl font-bold text-gray-800">My Salary</h2><p className="text-gray-500">Structure and history overview</p></div>
        <button onClick={() => setIsAdvanceModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2 transform active:scale-95 transition-all"><Plus className="w-4 h-4" /> Request Advance</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
          <DollarSign className="absolute -top-6 -right-6 w-48 h-48 opacity-10 rotate-12" />
          <div className="relative z-10 space-y-8">
            <div>
                <p className="text-emerald-100 font-black uppercase tracking-widest text-[10px]">Estimated Payout for {salaryData.month}</p>
                <h3 className="text-5xl font-black tracking-tighter mt-1">₹{salaryData.netPay.toLocaleString()}</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm"><p className="text-[9px] font-black uppercase opacity-60">Paid Days</p><p className="font-bold">{salaryData.paidDays} / {salaryData.workingDays}</p></div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm"><p className="text-[9px] font-black uppercase opacity-60">Total Time</p><p className="font-bold">{salaryData.totalWorkTime}</p></div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm"><p className="text-[9px] font-black uppercase opacity-60">Earnings</p><p className="font-bold text-emerald-200">₹{salaryData.grossEarned.toLocaleString()}</p></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-blue-50 rounded-full text-blue-600 mb-4"><Bike className="w-8 h-8" /></div>
            <h4 className="font-black text-gray-800 uppercase tracking-widest text-[10px] mb-1">Approved Travel Allowances</h4>
            <p className="text-2xl font-black text-blue-600">₹{kmClaims.filter(c => c.status === 'Approved' && c.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, c) => s + c.totalAmount, 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">Calculated from approved KM claims</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div ref={slipRef} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-black uppercase tracking-widest text-[11px] text-gray-400">Current Month Breakdown ({salaryData.month})</h3>
            {currentMonthPayrollEntry?.status === 'Paid' && (
                <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold border border-emerald-200">
                    <CheckCircle className="w-3 h-3"/> Paid
                </span>
            )}
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
                {salaryData.earnings.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-gray-600 font-medium flex items-center gap-2">{item.label.includes('Travel') && <Bike className="w-4 h-4 text-blue-500" />}{item.label}</span>
                    <span className={`font-black ${item.label.includes('Travel') ? 'text-blue-600' : 'text-gray-900'}`}>₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
                {salaryData.deductions.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-red-500 border-b border-gray-50 pb-3">
                    <span className="font-medium">{item.label}</span>
                    <span className="font-black">-₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
            </div>
            <div className="pt-4 flex justify-between items-center">
                <span className="text-lg font-black text-gray-800">Net Payable Amount</span>
                <span className="text-3xl font-black text-emerald-600">₹{salaryData.netPay.toLocaleString()}</span>
            </div>

            {currentMonthPayrollEntry?.status === 'Paid' && (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-2 mt-6">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Payment Details
                    </h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div><span className="text-gray-600">Status:</span> <span className="font-medium text-emerald-700">{currentMonthPayrollEntry.status}</span></div>
                        <div><span className="text-gray-600">Paid Date:</span> <span className="font-medium text-emerald-700">{currentMonthPayrollEntry.paidDate || 'N/A'}</span></div>
                        <div className="col-span-2"><span className="text-gray-600">Mode:</span> <span className="font-medium text-emerald-700">{currentMonthPayrollEntry.paymentMode || 'N/A'}</span></div>
                    </div>
                    {currentMonthPayrollEntry.remarks && (
                        <div className="mt-2 pt-2 border-t border-emerald-100">
                            <span className="text-xs text-gray-600">Notes:</span> <span className="text-sm italic text-gray-700">"{currentMonthPayrollEntry.remarks}"</span>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-black uppercase tracking-widest text-[11px] text-gray-400">Recent Advance Requests</h3></div>
            <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-3">
                {advanceHistory.map(req => (
                    <div key={req.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-gray-800 truncate">₹{req.amountRequested.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-500 truncate italic">"{req.reason}"</p>
                        </div>
                        <div className="text-right ml-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                req.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                req.status === 'Paid' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}>{req.status}</span>
                            <p className="text-[9px] text-gray-400 mt-1">{new Date(req.requestDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
                {advanceHistory.length === 0 && <div className="py-10 text-center text-gray-400 italic text-sm">No advance history found.</div>}
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
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

      {/* Advance Request Modal */}
      {isAdvanceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="text-xl font-black text-gray-900 tracking-tighter flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" /> Salary Advance Request
                      </h3>
                      <button onClick={() => setIsAdvanceModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-400 hover:text-gray-900"><X className="w-5 h-5"/></button>
                  </div>
                  <form onSubmit={handleSubmitAdvance} className="p-8 space-y-6">
                      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-800 leading-relaxed">
                              Requests will be reviewed by HR. Approved amounts are usually deducted from the upcoming month's salary disbursement.
                          </p>
                      </div>

                      <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount Requested (₹)</label>
                          <input 
                              type="number" 
                              required 
                              min="100"
                              placeholder="e.g. 5000"
                              value={advanceForm.amount}
                              onChange={e => setAdvanceForm({...advanceForm, amount: e.target.value})}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-lg font-black text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner" 
                          />
                      </div>

                      <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Advance</label>
                          <textarea 
                              required
                              rows={3}
                              placeholder="Please describe why you need this advance..."
                              value={advanceForm.reason}
                              onChange={e => setAdvanceForm({...advanceForm, reason: e.target.value})}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 resize-none shadow-inner"
                          />
                      </div>

                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-2xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                          Submit Request
                      </button>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default UserSalary;
