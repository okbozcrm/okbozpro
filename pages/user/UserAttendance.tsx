
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, List, CheckCircle, XCircle, 
  User, MapPin, Clock, Fingerprint, Download, X, 
  PieChart as PieChartIcon, Activity, ScanLine, Loader2, Navigation,
  Phone, DollarSign, Plane, Briefcase, Filter, Search, FileText, Save,
  QrCode, Crosshair, AlertTriangle, ShieldCheck, ChevronDown, Laptop, Globe,
  CalendarDays, LayoutDashboard, Map, MapPinned, Building2, Timer, Settings2,
  Users, HeartPulse
} from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, DailyAttendance, Employee, Branch, CorporateAccount } from '../../types';

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
  const [viewMode, setViewMode] = useState<'Calendar' | 'Report'>('Calendar');
  
  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = currentSessionId === 'admin';
  
  const [filterCorporate, setFilterCorporate] = useState(isSuperAdmin ? 'All' : currentSessionId);
  const [filterBranch, setFilterBranch] = useState('All');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ status: AttendanceStatus.PRESENT, checkIn: '', checkOut: '' });

  // Load all necessary data for filtering and selection
  useEffect(() => {
    const loadData = () => {
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        setCorporates(corps);

        let branchesList: any[] = [];
        let staffList: any[] = [];

        if (isSuperAdmin) {
            // Admin Data (Head Office)
            const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
            branchesList = [...adminBranches.map((b: any) => ({...b, corporateId: 'admin'}))];
            
            const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
            staffList = [...adminStaff.map((s: any) => ({...s, corporateId: 'admin'}))];

            // Add all Corporate Data for Super Admin visibility
            corps.forEach((c: any) => {
                const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
                branchesList = [...branchesList, ...cBranches.map((b: any) => ({...b, corporateId: c.email}))];
                
                const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
                staffList = [...staffList, ...cStaff.map((s: any) => ({...s, corporateId: c.email}))];
            });
        } else {
            // Franchise User: Only load their own scoped data
            const myBranches = JSON.parse(localStorage.getItem(`branches_data_${currentSessionId}`) || '[]');
            branchesList = myBranches.map((b: any) => ({...b, corporateId: currentSessionId}));

            const myStaff = JSON.parse(localStorage.getItem(`staff_data_${currentSessionId}`) || '[]');
            staffList = myStaff.map((s: any) => ({...s, corporateId: currentSessionId}));
        }

        setBranches(branchesList);
        setAllEmployees(staffList);

        // Initial selection for single employee view
        if (!isAdmin) {
            const found = staffList.find(s => s.id === currentSessionId);
            setSelectedEmployee(found || staffList[0] || MOCK_EMPLOYEES[0]);
        }
    };
    loadData();
  }, [isAdmin, currentSessionId, isSuperAdmin]);

  // Derive branches based on corporate filter
  const availableBranches = useMemo(() => {
      if (filterCorporate === 'All') return branches;
      return branches.filter(b => b.corporateId === filterCorporate);
  }, [branches, filterCorporate]);

  // Derived staff list based on Corporate and Branch filters
  const filteredStaffList = useMemo(() => {
      return allEmployees.filter(s => {
          const matchCorp = filterCorporate === 'All' || s.corporateId === filterCorporate;
          const matchBranch = filterBranch === 'All' || s.branch === filterBranch;
          return matchCorp && matchBranch;
      });
  }, [allEmployees, filterCorporate, filterBranch]);

  // Sync selected employee when filters change
  useEffect(() => {
      if (isAdmin && filteredStaffList.length > 0) {
          if (!selectedEmployee || !filteredStaffList.find(s => s.id === selectedEmployee.id)) {
              if (viewMode === 'Calendar') {
                  setSelectedEmployee(filteredStaffList[0]);
              }
          }
      }
  }, [filteredStaffList, isAdmin, selectedEmployee, viewMode]);

  // Load attendance records for the selected employee
  useEffect(() => {
      if (!selectedEmployee) return;
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
      const saved = localStorage.getItem(key);
      setAttendanceData(saved ? JSON.parse(saved) : getEmployeeAttendance(selectedEmployee, year, month));
  }, [selectedEmployee, selectedMonth]);

  // Daily Report Data Logic - This is used for both the table and the high-level dashboard stats
  const dailyReportData = useMemo(() => {
      const year = new Date(selectedDate).getFullYear();
      const month = new Date(selectedDate).getMonth();
      
      // Filter list further if a specific employee is selected in Report mode
      // Actually, for the dashboard stats, we want the whole filtered list
      const listToMap = filteredStaffList;

      return listToMap.map(emp => {
          const key = `attendance_data_${emp.id}_${year}_${month}`;
          const saved = localStorage.getItem(key);
          const monthData: DailyAttendance[] = saved ? JSON.parse(saved) : getEmployeeAttendance(emp, year, month);
          const dayRecord = monthData.find(d => d.date === selectedDate);
          
          return {
              employee: emp,
              record: dayRecord || { date: selectedDate, status: AttendanceStatus.NOT_MARKED }
          };
      });
  }, [filteredStaffList, selectedDate]);

  // Dashboard Stats - Calculated across all filtered staff for the selected date
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4 w-full md:w-auto">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100">
                    <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Attendance Management</h2>
                    <p className="text-sm text-gray-500 font-medium tracking-wide">Workforce presence & logs</p>
                </div>
            </div>
            
            {/* COMPACT FILTER BAR */}
            <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-wrap gap-3">
                {isSuperAdmin && (
                    <div className="relative">
                        <select 
                            value={filterCorporate} 
                            onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }}
                            className="pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 appearance-none outline-none focus:ring-4 focus:ring-emerald-500/10 cursor-pointer"
                        >
                            <option value="All">All Corporates</option>
                            <option value="admin">Head Office</option>
                            {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                )}
                
                {/* Branch Selector */}
                <div className="relative">
                    <select 
                        value={filterBranch} 
                        onChange={(e) => setFilterBranch(e.target.value)}
                        className="pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 appearance-none outline-none focus:ring-4 focus:ring-emerald-500/10 cursor-pointer"
                    >
                        <option value="All">All Branches</option>
                        {availableBranches.map((b, i) => <option key={i} value={b.name}>{b.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>

                {/* STAFF SELECTOR - NOW NEXT TO BRANCHES */}
                <div className="relative">
                    <select 
                        value={selectedEmployee?.id || ''} 
                        onChange={(e) => {
                            const emp = allEmployees.find(emp => emp.id === e.target.value);
                            setSelectedEmployee(emp || null);
                        }}
                        className="pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 appearance-none outline-none focus:ring-4 focus:ring-emerald-500/10 cursor-pointer min-w-[150px]"
                    >
                        {viewMode === 'Report' && <option value="">All Staff Members</option>}
                        {filteredStaffList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setViewMode('Calendar')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'Calendar' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Calendar</button>
                    <button onClick={() => setViewMode('Report')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'Report' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Report</button>
                </div>
            </div>
        </div>

        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Select Date:</span>
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2 bg-gray-50 border-gray-100 rounded-xl text-sm font-black text-gray-700 outline-none focus:ring-4 focus:ring-emerald-500/10"
                />
            </div>
        </div>
      </div>

      {/* DASHBOARD STATS - CORRECTED DATA AND ADDED TOTAL STAFF */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {[
              { label: 'TOTAL STAFF', count: dashboardStats.total, color: 'slate', icon: Users },
              { label: 'PRESENT', count: dashboardStats.present, color: 'emerald', icon: CheckCircle },
              { label: 'ABSENT', count: dashboardStats.absent, color: 'rose', icon: XCircle },
              { label: 'LATE', count: dashboardStats.late, color: 'amber', icon: Clock },
              { label: 'HALF DAY', count: dashboardStats.halfDay, color: 'orange', icon: Activity },
              { label: 'LEAVE', count: dashboardStats.leave, color: 'blue', icon: Plane }
          ].map((item, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-gray-50 flex flex-col items-center justify-center text-center transition-all hover:scale-105 group">
                  <div className={`p-3 rounded-2xl bg-${item.color}-50 text-${item.color}-600 mb-4 group-hover:scale-110 transition-transform`}>
                      <item.icon className="w-6 h-6" />
                  </div>
                  <h4 className={`text-5xl font-black text-${item.color}-600 mb-1 tracking-tight`}>{item.count}</h4>
                  <p className={`text-[11px] font-black text-${item.color}-700/60 uppercase tracking-[0.2em]`}>{item.label}</p>
              </div>
          ))}
      </div>

      {/* MAIN VIEW: CALENDAR OR REPORT */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/20">
            <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-gray-900 uppercase text-sm tracking-[0.2em]">
                    {viewMode === 'Calendar' ? `Ledger: ${selectedEmployee?.name || 'Loading...'}` : `Daily Report`}
                </h3>
            </div>
            <div className="flex items-center gap-6 bg-white p-2 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40">
                <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))} className="p-3 hover:bg-gray-50 rounded-full transition-all text-gray-400 hover:text-emerald-600"><ChevronLeft className="w-6 h-6" /></button>
                <span className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] min-w-[160px] text-center">{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))} className="p-3 hover:bg-gray-50 rounded-full transition-all text-gray-400 hover:text-emerald-600"><ChevronRight className="w-6 h-6" /></button>
            </div>
        </div>

        {viewMode === 'Calendar' ? (
            <div className="animate-in fade-in duration-500">
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/10">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                        <div key={day} className={`py-5 text-center text-[11px] font-black tracking-[0.3em] border-r border-gray-100 last:border-r-0 ${day === 'SUN' ? 'text-rose-500' : 'text-gray-400'}`}>
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {[...Array(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay()).fill(null), ...attendanceData].map((day, idx) => {
                        const colIndex = idx % 7;
                        if (!day) return <div key={idx} className={`bg-white/40 min-h-[160px] border-b border-gray-100 ${colIndex < 6 ? 'border-r' : ''}`}></div>;
                        const isToday = day.date === new Date().toISOString().split('T')[0];
                        const style = getStatusStyle(day.status);
                        return (
                            <div key={idx} className={`relative p-5 min-h-[160px] flex flex-col justify-between transition-all bg-white border-b border-gray-100 hover:z-20 hover:shadow-2xl hover:scale-[1.05] group ${style.bg} ${colIndex < 6 ? 'border-r' : ''} ${isToday ? 'ring-4 ring-inset ring-emerald-500/20' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <span className={`text-2xl font-black ${isToday ? 'text-emerald-600' : 'text-gray-900'}`}>{new Date(day.date).getDate()}</span>
                                    {day.status !== AttendanceStatus.NOT_MARKED && <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase border ${style.badge} ${style.text} tracking-wider shadow-sm`}>{day.status.replace('_', ' ')}</span>}
                                </div>
                                {day.checkIn && (
                                    <div className="mt-4 space-y-2.5 p-3 bg-white/70 rounded-[1.5rem] border border-gray-100 backdrop-blur-md group-hover:bg-white transition-all shadow-sm">
                                        <div className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> {day.checkIn}</div>
                                        <div className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-2 opacity-80"><div className="w-1.5 h-1.5 bg-rose-400 rounded-full" /> {day.checkOut || '--:--'}</div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/50 text-gray-500 font-black border-b border-gray-200 text-[10px] uppercase tracking-[0.3em]">
                        <tr>
                            <th className="px-8 py-6 w-12"><div className="w-4 h-4 border-2 border-gray-200 rounded"></div></th>
                            <th className="px-6 py-6">Employee</th>
                            <th className="px-6 py-6">Branch</th>
                            <th className="px-6 py-6">Status</th>
                            <th className="px-6 py-6">Punch In</th>
                            <th className="px-6 py-6">In Location</th>
                            <th className="px-6 py-6">Punch Out</th>
                            <th className="px-6 py-6 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {dailyReportData.map((row, idx) => {
                            const style = getStatusStyle(row.record.status);
                            return (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-all group">
                                    <td className="px-8 py-6"><div className="w-4 h-4 border-2 border-gray-200 rounded"></div></td>
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-4">
                                            <img src={row.employee.avatar} alt="" className="w-10 h-10 rounded-full border border-gray-100 shadow-sm" />
                                            <div>
                                                <div className="font-black text-gray-900">{row.employee.name}</div>
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{row.employee.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 font-black text-gray-600 text-xs">{row.employee.branch || '-'}</td>
                                    <td className="px-6 py-6">
                                        <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${style.badge} ${style.text} shadow-sm`}>
                                            {row.record.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-black font-mono text-emerald-600 text-sm">{row.record.checkIn || '-'}</td>
                                    <td className="px-6 py-4 font-black text-gray-600 text-xs">{row.record.checkIn ? (row.employee.branch || 'Remote') : '-'}</td>
                                    <td className="px-6 py-4 font-black font-mono text-rose-500 text-sm">{row.record.checkOut || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => { setEditingDay(row); setEditForm({ status: row.record.status, checkIn: row.record.checkIn || '', checkOut: row.record.checkOut || '' }); setIsEditModalOpen(true); }}
                                            className="text-[11px] font-black text-gray-400 hover:text-emerald-600 transition-colors uppercase tracking-[0.2em] border-b border-transparent hover:border-emerald-600"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {dailyReportData.length === 0 && (
                            <tr>
                                <td colSpan={8} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-30">
                                        <Users className="w-12 h-12 text-gray-400" />
                                        <p className="text-sm font-black text-gray-500 uppercase tracking-[0.2em]">No staff records found for this date</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* MONTHLY LOCATION HISTORY */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="p-10 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center bg-white">
              <div className="flex items-center gap-5">
                  <div className="p-5 bg-blue-50 text-blue-600 rounded-[2rem] border border-blue-100 shadow-sm">
                      <MapPinned className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                      <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Monthly Location History</h3>
                      <p className="text-xs text-gray-400 font-black uppercase tracking-[0.2em]">Geotagged punch records</p>
                  </div>
              </div>
              <button className="mt-4 md:mt-0 px-10 py-4 bg-blue-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 shadow-2xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-3">
                  <Download className="w-4 h-4" /> Export CSV
              </button>
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-white text-gray-400 font-black border-b border-gray-100 text-[10px] uppercase tracking-[0.3em]">
                      <tr>
                          <th className="px-12 py-10">Date</th>
                          <th className="px-12 py-10">Punch In</th>
                          <th className="px-12 py-10">In Location</th>
                          <th className="px-12 py-10">Punch Out</th>
                          <th className="px-12 py-10 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {attendanceData.filter(d => d.checkIn).slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-all group border-b border-gray-50 last:border-b-0">
                              <td className="px-12 py-10 font-black text-gray-500 text-sm tracking-tight">{row.date}</td>
                              <td className="px-12 py-10 text-emerald-600 font-black font-mono text-xl">{row.checkIn}</td>
                              <td className="px-12 py-10">
                                  <div className="flex items-center gap-3 text-blue-600 bg-blue-50/50 px-6 py-2.5 rounded-full w-fit text-[11px] font-black border border-blue-100 uppercase tracking-widest group-hover:scale-105 transition-transform">
                                      <MapPin className="w-4 h-4" /> REMOTE
                                  </div>
                              </td>
                              <td className="px-12 py-10 text-rose-500 font-black font-mono text-xl">{row.checkOut || '--:--'}</td>
                              <td className="px-12 py-10 text-right">
                                  <button className="text-[10px] font-black text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 px-8 py-3.5 rounded-full transition-all uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-blue-500/20 active:scale-95">VIEW ON MAP</button>
                              </td>
                          </tr>
                      ))}
                      {attendanceData.filter(d => d.checkIn).length === 0 && (
                          <tr>
                              <td colSpan={5} className="py-32 text-center">
                                  <div className="flex flex-col items-center gap-4 opacity-20">
                                      <MapPinned className="w-16 h-16 text-gray-400" />
                                      <p className="text-sm font-black text-gray-500 uppercase tracking-[0.2em]">No location logs recorded yet</p>
                                  </div>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && editingDay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.2)] w-full max-w-md border border-gray-100 animate-in zoom-in duration-200 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[3rem]">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Adjust Log</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{editingDay.employee.name} • {selectedDate}</p>
                    </div>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-8 space-y-8">
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Update Status</label>
                        <div className="relative">
                            <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as any})} className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-[2rem] text-sm font-black text-gray-900 appearance-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500/50 outline-none transition-all cursor-pointer hover:bg-gray-100/50 shadow-inner">
                                {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3">Punch In</label>
                            <input value={editForm.checkIn} onChange={e => setEditForm({...editForm, checkIn: e.target.value})} placeholder="09:30 AM" className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-[1.8rem] font-black text-gray-800 text-center uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all shadow-inner" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3">Punch Out</label>
                            <input value={editForm.checkOut} onChange={e => setEditForm({...editForm, checkOut: e.target.value})} placeholder="06:30 PM" className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-[1.8rem] font-black text-gray-800 text-center uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all shadow-inner" />
                        </div>
                    </div>
                </div>
                <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex justify-end gap-4 rounded-b-[3rem]">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-8 py-4 rounded-2xl font-black text-gray-400 text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-gray-900 transition-all border border-transparent hover:border-gray-200">Cancel</button>
                    <button onClick={handleSaveEdit} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl shadow-emerald-500/30 hover:bg-emerald-700 text-[10px] uppercase tracking-[0.3em] transform active:scale-95 transition-all flex items-center gap-3">
                        <Save className="w-4 h-4" /> Save Record
                    </button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default UserAttendance;
