
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, CheckCircle, XCircle, 
  Clock, X, Activity, Plane, Save, ChevronDown, 
  CalendarDays, Users, DollarSign, Search
} from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, DailyAttendance, Employee, CorporateAccount } from '../../types';

interface UserAttendanceProps {
  isAdmin?: boolean;
}

const UserAttendance: React.FC<UserAttendanceProps> = ({ isAdmin = false }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [viewMode, setViewMode] = useState<'Daily' | 'Monthly' | 'Payroll'>('Daily');
  
  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = currentSessionId === 'admin';
  
  const [filterCorporate, setFilterCorporate] = useState(isSuperAdmin ? 'All' : currentSessionId);
  const [filterBranch, setFilterBranch] = useState('All');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ status: AttendanceStatus.PRESENT, checkIn: '', checkOut: '' });

  useEffect(() => {
    const loadData = () => {
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        setCorporates(corps);

        let branchesList: any[] = [];
        let staffList: any[] = [];

        if (isSuperAdmin) {
            const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
            branchesList = [...adminBranches.map((b: any) => ({...b, corporateId: 'admin'}))];
            const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
            staffList = [...adminStaff.map((s: any) => ({...s, corporateId: 'admin'}))];

            corps.forEach((c: any) => {
                const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
                branchesList = [...branchesList, ...cBranches.map((b: any) => ({...b, corporateId: c.email}))];
                const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
                staffList = [...staffList, ...cStaff.map((s: any) => ({...s, corporateId: c.email}))];
            });
        } else {
            const myBranches = JSON.parse(localStorage.getItem(`branches_data_${currentSessionId}`) || '[]');
            branchesList = myBranches.map((b: any) => ({...b, corporateId: currentSessionId}));
            const myStaff = JSON.parse(localStorage.getItem(`staff_data_${currentSessionId}`) || '[]');
            staffList = myStaff.map((s: any) => ({...s, corporateId: currentSessionId}));
        }

        setBranches(branchesList);
        setAllEmployees(staffList);

        if (!isAdmin) {
            const found = staffList.find(s => s.id === currentSessionId);
            setSelectedEmployee(found || staffList[0] || MOCK_EMPLOYEES[0]);
        }
    };
    loadData();
  }, [isAdmin, currentSessionId, isSuperAdmin]);

  const availableBranches = useMemo(() => {
      if (filterCorporate === 'All') return branches;
      return branches.filter(b => b.corporateId === filterCorporate);
  }, [branches, filterCorporate]);

  const filteredStaffList = useMemo(() => {
      return allEmployees.filter(s => {
          const matchCorp = filterCorporate === 'All' || s.corporateId === filterCorporate;
          const matchBranch = filterBranch === 'All' || s.branch === filterBranch;
          return matchCorp && matchBranch;
      });
  }, [allEmployees, filterCorporate, filterBranch]);

  useEffect(() => {
      if (isAdmin && filteredStaffList.length > 0) {
          if (!selectedEmployee || !filteredStaffList.find(s => s.id === selectedEmployee.id)) {
              if (viewMode === 'Monthly') {
                  setSelectedEmployee(filteredStaffList[0]);
              }
          }
      }
  }, [filteredStaffList, isAdmin, selectedEmployee, viewMode]);

  useEffect(() => {
      if (!selectedEmployee) return;
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
      const saved = localStorage.getItem(key);
      setAttendanceData(saved ? JSON.parse(saved) : getEmployeeAttendance(selectedEmployee, year, month));
  }, [selectedEmployee, selectedMonth]);

  const dailyReportData = useMemo(() => {
      const year = new Date(selectedDate).getFullYear();
      const month = new Date(selectedDate).getMonth();
      
      return filteredStaffList.map(emp => {
          const key = `attendance_data_${emp.id}_${year}_${month}`;
          const saved = localStorage.getItem(key);
          const monthData: DailyAttendance[] = saved ? JSON.parse(saved) : getEmployeeAttendance(emp, year, month);
          const dayRecord = monthData.find(d => d.date === selectedDate);
          
          return {
              employee: emp,
              record: dayRecord || { date: selectedDate, status: AttendanceStatus.NOT_MARKED, isLate: false }
          };
      });
  }, [filteredStaffList, selectedDate]);

  const dashboardStats = useMemo(() => ({
    total: dailyReportData.length,
    present: dailyReportData.filter(d => d.record.status === AttendanceStatus.PRESENT).length,
    absent: dailyReportData.filter(d => d.record.status === AttendanceStatus.ABSENT).length,
    late: dailyReportData.filter(d => d.record.isLate).length,
    halfDay: dailyReportData.filter(d => d.record.status === AttendanceStatus.HALF_DAY).length,
    leave: dailyReportData.filter(d => d.record.status === AttendanceStatus.PAID_LEAVE).length,
  }), [dailyReportData]);

  const handleSaveEdit = () => {
    if (!editingDay) return;
    const year = new Date(selectedDate).getFullYear();
    const month = new Date(selectedDate).getMonth();
    const key = `attendance_data_${editingDay.employee.id}_${year}_${month}`;
    
    const saved = localStorage.getItem(key);
    const monthData: DailyAttendance[] = saved ? JSON.parse(saved) : getEmployeeAttendance(editingDay.employee, year, month);
    
    const updatedMonthData = monthData.map(d => d.date === selectedDate ? { ...d, ...editForm } : d);
    localStorage.setItem(key, JSON.stringify(updatedMonthData));
    
    if (selectedEmployee?.id === editingDay.employee.id) {
        setAttendanceData(updatedMonthData);
    }
    
    setIsEditModalOpen(false);
    setEditingDay(null);
  };

  const getStatusStyle = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT: return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 border-emerald-300' };
      case AttendanceStatus.ABSENT: return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100 border-rose-300' };
      case AttendanceStatus.HALF_DAY: return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 border-amber-300' };
      case AttendanceStatus.PAID_LEAVE: return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', badge: 'bg-sky-100 border-sky-300' };
      case AttendanceStatus.WEEK_OFF: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', badge: 'bg-slate-100 border-slate-300' };
      default: return { bg: 'bg-white', text: 'text-gray-400', border: 'border-gray-200', badge: 'bg-gray-50 border-gray-200' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100">
                <CalendarDays className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Attendance Dashboard</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Workforce Presence Analytics</p>
            </div>
        </div>

        {/* NEW FILTER BAR MATCHING IMAGE */}
        <div className="bg-white p-2 rounded-[1.25rem] border border-gray-200 shadow-sm flex flex-wrap items-center gap-3 w-full md:w-auto">
            {isSuperAdmin && (
                <div className="relative">
                    <select 
                        value={filterCorporate} 
                        onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }}
                        className="pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 appearance-none outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer min-w-[160px]"
                    >
                        <option value="All">All Corporates</option>
                        <option value="admin">Head Office</option>
                        {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            )}
            
            <div className="relative">
                <select 
                    value={filterBranch} 
                    onChange={(e) => setFilterBranch(e.target.value)}
                    className="pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 appearance-none outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer min-w-[140px]"
                >
                    <option value="All">All Branches</option>
                    {availableBranches.map((b, i) => <option key={i} value={b.name}>{b.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>

            <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setViewMode('Daily')} 
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'Daily' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Daily
                </button>
                <button 
                  onClick={() => setViewMode('Monthly')} 
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'Monthly' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setViewMode('Payroll')} 
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'Payroll' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Payroll
                </button>
            </div>

            <div className="relative flex items-center bg-white border border-gray-100 rounded-xl px-3 py-2">
                <input 
                    type={viewMode === 'Daily' ? 'date' : 'month'} 
                    value={viewMode === 'Daily' ? selectedDate : selectedMonth.toISOString().slice(0, 7)} 
                    onChange={(e) => {
                      if (viewMode === 'Daily') setSelectedDate(e.target.value);
                      else setSelectedMonth(new Date(e.target.value));
                    }}
                    className="text-xs font-bold text-gray-700 outline-none pr-8 bg-transparent"
                />
                <Calendar className="absolute right-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
        </div>
      </div>

      {/* DASHBOARD STATS */}
      {viewMode !== 'Payroll' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 animate-in fade-in duration-500">
            {[
                { label: 'TOTAL STAFF', count: dashboardStats.total, color: 'slate', icon: Users },
                { label: 'PRESENT', count: dashboardStats.present, color: 'emerald', icon: CheckCircle },
                { label: 'ABSENT', count: dashboardStats.absent, color: 'rose', icon: XCircle },
                { label: 'LATE', count: dashboardStats.late, color: 'amber', icon: Clock },
                { label: 'HALF DAY', count: dashboardStats.halfDay, color: 'orange', icon: Activity },
                { label: 'LEAVE', count: dashboardStats.leave, color: 'blue', icon: Plane }
            ].map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center transition-all hover:scale-105 group">
                    <div className={`p-2.5 rounded-xl bg-${item.color}-50 text-${item.color}-600 mb-3`}>
                        <item.icon className="w-5 h-5" />
                    </div>
                    <h4 className={`text-3xl font-black text-${item.color}-600 mb-1`}>{item.count}</h4>
                    <p className={`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>{item.label}</p>
                </div>
            ))}
        </div>
      )}

      {/* MAIN VIEW CONTENT */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden min-h-[500px]">
        {viewMode === 'Monthly' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-emerald-600" />
                        <select 
                            value={selectedEmployee?.id || ''} 
                            onChange={(e) => setSelectedEmployee(allEmployees.find(emp => emp.id === e.target.value) || null)}
                            className="bg-transparent border-none text-sm font-black text-gray-800 focus:ring-0 cursor-pointer"
                        >
                            {filteredStaffList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-4 bg-white p-1.5 rounded-xl border border-gray-200">
                        <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-emerald-600"><ChevronLeft className="w-5 h-5" /></button>
                        <span className="text-xs font-black text-gray-800 uppercase tracking-widest min-w-[120px] text-center">{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-emerald-600"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/10">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                        <div key={day} className={`py-4 text-center text-[10px] font-black tracking-widest ${day === 'SUN' ? 'text-rose-500' : 'text-gray-400'}`}>
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {[...Array(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay()).fill(null), ...attendanceData].map((day, idx) => {
                        if (!day) return <div key={idx} className="bg-gray-50/20 min-h-[140px] border-b border-r border-gray-100 last:border-r-0"></div>;
                        const style = getStatusStyle(day.status);
                        return (
                            <div key={idx} className={`relative p-5 min-h-[140px] flex flex-col justify-between transition-all bg-white border-b border-r border-gray-100 last:border-r-0 hover:bg-gray-50/50 ${style.bg}`}>
                                <div className="flex justify-between items-start">
                                    <span className={`text-xl font-black text-gray-900`}>{new Date(day.date).getDate()}</span>
                                    {day.status !== AttendanceStatus.NOT_MARKED && <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${style.badge} ${style.text}`}>{day.status.replace('_', ' ')}</span>}
                                </div>
                                {day.checkIn && (
                                    <div className="mt-4 space-y-1 text-[10px] font-bold">
                                        <div className="text-emerald-600 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> {day.checkIn}</div>
                                        <div className="text-rose-400 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-rose-400 rounded-full" /> {day.checkOut || '--:--'}</div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {viewMode === 'Daily' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/50 text-gray-400 font-black border-b border-gray-100 text-[10px] uppercase tracking-[0.2em]">
                        <tr>
                            <th className="px-8 py-6">Staff Member</th>
                            <th className="px-6 py-6">Status</th>
                            <th className="px-6 py-6">In Time</th>
                            <th className="px-6 py-6">Out Time</th>
                            <th className="px-6 py-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {dailyReportData.map((row, idx) => {
                            const style = getStatusStyle(row.record.status);
                            return (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <img src={row.employee.avatar} alt="" className="w-10 h-10 rounded-full bg-gray-100" />
                                            <div>
                                                <div className="font-black text-gray-900">{row.employee.name}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{row.employee.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${style.badge} ${style.text}`}>
                                            {row.record.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 font-mono text-emerald-600 font-bold">{row.record.checkIn || '-'}</td>
                                    <td className="px-6 py-6 font-mono text-rose-400 font-bold">{row.record.checkOut || '-'}</td>
                                    <td className="px-6 py-6 text-right">
                                        <button 
                                            onClick={() => { setEditingDay(row); setEditForm({ status: row.record.status, checkIn: row.record.checkIn || '', checkOut: row.record.checkOut || '' }); setIsEditModalOpen(true); }}
                                            className="text-[10px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest"
                                        >
                                            Modify
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}

        {viewMode === 'Payroll' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-8 text-center border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xl font-black text-gray-900">Attendance Payout Check</h3>
                    <p className="text-sm text-gray-500 mt-1">Review payable days and estimates for {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/50 text-gray-400 font-black border-b border-gray-100 text-[10px] uppercase tracking-[0.2em]">
                        <tr>
                            <th className="px-8 py-6">Employee</th>
                            <th className="px-6 py-6">Basic Salary</th>
                            <th className="px-6 py-6 text-center">Payable Days</th>
                            <th className="px-6 py-6 text-right">Est. Payout</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredStaffList.map((emp, idx) => {
                            const year = selectedMonth.getFullYear();
                            const month = selectedMonth.getMonth();
                            const key = `attendance_data_${emp.id}_${year}_${month}`;
                            const saved = localStorage.getItem(key);
                            const monthData: DailyAttendance[] = saved ? JSON.parse(saved) : getEmployeeAttendance(emp, year, month);
                            
                            let payableDays = 0;
                            monthData.forEach(d => {
                                if (d.status === AttendanceStatus.PRESENT || d.status === AttendanceStatus.PAID_LEAVE || d.status === AttendanceStatus.WEEK_OFF) payableDays += 1;
                                else if (d.status === AttendanceStatus.HALF_DAY) payableDays += 0.5;
                            });

                            const basic = parseFloat(emp.salary || '30000');
                            const daily = basic / 30;
                            const est = Math.round(daily * payableDays);

                            return (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-8 py-6 font-black text-gray-900">{emp.name}</td>
                                    <td className="px-6 py-6 font-mono text-gray-500">₹{basic.toLocaleString()}</td>
                                    <td className="px-6 py-6 text-center font-black">
                                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs">{payableDays} / 30</span>
                                    </td>
                                    <td className="px-6 py-6 text-right font-black text-emerald-600 text-lg">₹{est.toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* MODAL SECTION */}
      {isEditModalOpen && editingDay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md border border-gray-200 animate-in zoom-in duration-200 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Modify Log</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{editingDay.employee.name} • {selectedDate}</p>
                    </div>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Change Status</label>
                        <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as any})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-black text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500/20">
                            {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">In Time</label>
                            <input value={editForm.checkIn} onChange={e => setEditForm({...editForm, checkIn: e.target.value})} placeholder="09:00 AM" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-800 text-center uppercase tracking-widest outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Out Time</label>
                            <input value={editForm.checkOut} onChange={e => setEditForm({...editForm, checkOut: e.target.value})} placeholder="06:00 PM" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-800 text-center uppercase tracking-widest outline-none focus:border-emerald-500" />
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 rounded-xl font-black text-gray-400 text-[10px] uppercase tracking-widest hover:bg-white transition-all">Cancel</button>
                    <button onClick={handleSaveEdit} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-black shadow-lg hover:bg-emerald-700 text-[10px] uppercase tracking-widest transition-all flex items-center gap-2">
                        <Save className="w-4 h-4" /> Apply Changes
                    </button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default UserAttendance;
