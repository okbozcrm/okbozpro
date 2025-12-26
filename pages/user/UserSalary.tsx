
import React, { useMemo, useState, useEffect } from 'react';
import { Download, TrendingUp, DollarSign, FileText, CheckCircle, Clock, Plus, AlertCircle, X, Send, Timer, Bike } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, SalaryAdvanceRequest, DailyAttendance, TravelAllowanceRequest } from '../../types';

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
  const [advanceForm, setAdvanceForm] = useState({ amount: '', reason: '' });
  const [advanceHistory, setAdvanceHistory] = useState<SalaryAdvanceRequest[]>([]);
  const [kmClaims, setKmClaims] = useState<TravelAllowanceRequest[]>([]);
  const [refreshToggle, setRefreshToggle] = useState(0);

  const [payoutSettings, setPayoutSettings] = useState({ dates: {} as Record<string, string>, globalDay: '5' });

  useEffect(() => {
      const loadUserAndSettings = () => {
          const storedSessionId = localStorage.getItem('app_session_id');
          if (storedSessionId) {
              const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
              let found = adminStaff.find((e: any) => e.id === storedSessionId);
              if (!found) {
                const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
                for (const corp of corporates) {
                    const key = `staff_data_${corp.email}`;
                    const cStaff = JSON.parse(localStorage.getItem(key) || '[]');
                    found = cStaff.find((e: any) => e.id === storedSessionId);
                    if (found) break;
                }
              }
              setUser(found || null);
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
    
    const savedAttendance = localStorage.getItem(`attendance_data_${user.id}_${year}_${month}`);
    const attendance: DailyAttendance[] = savedAttendance ? JSON.parse(savedAttendance) : getEmployeeAttendance(user, year, month);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let payableDays = 0;
    let totalWorkMinutes = 0;
    attendance.forEach(day => {
        if ([AttendanceStatus.PRESENT, AttendanceStatus.WEEK_OFF, AttendanceStatus.PAID_LEAVE, AttendanceStatus.HOLIDAY, AttendanceStatus.ALTERNATE_DAY].includes(day.status)) payableDays += 1;
        else if (day.status === AttendanceStatus.HALF_DAY) payableDays += 0.5;
        if (day.checkIn && day.checkOut) {
            const start = timeToMinutes(day.checkIn);
            const end = timeToMinutes(day.checkOut);
            if (end > start) totalWorkMinutes += (end - start);
        }
    });

    const perDaySalary = monthlyCtc / daysInMonth;
    const grossEarned = Math.round(perDaySalary * payableDays);
    const paidAdvances = advanceHistory.filter(a => a.status === 'Paid').reduce((sum, item) => sum + (item.amountApproved || 0), 0);
    const travelIncentive = kmClaims.filter(c => c.status === 'Approved' && c.date.startsWith(currentMonthStr)).reduce((sum, c) => sum + c.totalAmount, 0);
    const netPay = grossEarned + travelIncentive - paidAdvances;

    const earnings = [
        { label: 'Basic Salary & HRA', amount: grossEarned },
        { label: 'Travel Allowance (KM Claims)', amount: travelIncentive }
    ];

    return {
        month: today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        netPay,
        grossEarned: grossEarned + travelIncentive,
        workingDays: daysInMonth,
        paidDays: payableDays,
        totalWorkTime: `${Math.floor(totalWorkMinutes / 60)}h ${totalWorkMinutes % 60}m`,
        earnings,
        deductions: paidAdvances > 0 ? [{ label: 'Salary Advance Rec.', amount: paidAdvances }] : []
    };
  }, [user, advanceHistory, kmClaims, payoutSettings, refreshToggle]);

  if (!user || !salaryData) return <div className="p-10 text-center font-bold text-gray-500">Loading salary structure...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div><h2 className="text-2xl font-bold text-gray-800">My Salary</h2><p className="text-gray-500">Structure and history overview</p></div>
        <button onClick={() => setIsAdvanceModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2"><Plus className="w-4 h-4" /> Request Advance</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
          <DollarSign className="absolute -top-6 -right-6 w-48 h-48 opacity-10 rotate-12" />
          <div className="relative z-10 space-y-8">
            <div>
                <p className="text-emerald-100 font-black uppercase tracking-widest text-[10px]">Net Payout for {salaryData.month}</p>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center"><h3 className="font-black uppercase tracking-widest text-[11px] text-gray-400">Current Month Breakdown</h3></div>
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
            <div className="pt-4 flex justify-between items-center"><span className="text-lg font-black text-gray-800">Net Payable Amount</span><span className="text-3xl font-black text-emerald-600">₹{salaryData.netPay.toLocaleString()}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-black uppercase tracking-widest text-[11px] text-gray-400">Recent KM Claims (Approved)</h3></div>
            <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-3">
                {kmClaims.filter(c => c.status === 'Approved').map(claim => (
                    <div key={claim.id} className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex justify-between items-center">
                        <div><p className="text-xs font-black text-blue-800">{claim.date}</p><p className="text-[10px] text-blue-600">{claim.totalKm} KM journey</p></div>
                        <p className="font-black text-blue-700">₹{claim.totalAmount.toLocaleString()}</p>
                    </div>
                ))}
                {kmClaims.filter(c => c.status === 'Approved').length === 0 && <div className="py-10 text-center text-gray-400 italic text-sm">No approved claims for current month.</div>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default UserSalary;
