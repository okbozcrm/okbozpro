
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, List, CheckCircle, XCircle, 
  User, MapPin, Clock, Fingerprint, Download, X, 
  PieChart as PieChartIcon, Activity, ScanLine, Loader2, Navigation,
  Phone, DollarSign, Plane, Briefcase, Filter, Search, FileText, Save,
  QrCode, Crosshair, AlertTriangle, ShieldCheck, ChevronDown, Laptop, Globe,
  TrendingUp, Users, UserCheck, UserX, BarChart3, MoreHorizontal, UserMinus,
  Building2, ExternalLink, MousePointer2, Send, Timer, Edit2, ListOrdered, ArrowRightLeft,
  // Add missing icons
  History, Trash2, Plus
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, DailyAttendance, Employee, Branch, CorporateAccount, UserRole, PunchRecord } from '../../types';
import { sendSystemNotification } from '../../services/cloudService';

interface UserAttendanceProps {
  isAdmin?: boolean;
}

const parseToMinutes = (t: string) => {
  const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const mod = match[3].toUpperCase();
  if (h === 12) h = 0;
  if (mod === 'PM') h += 12;
  return h * 60 + m;
};

const convertTo24Hour = (time12h?: string) => {
  if (!time12h || time12h === '--:--') return '';
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
  return `${hours.padStart(2, '0')}:${minutes}`;
};

const convertTo12Hour = (time24h?: string) => {
  if (!time24h) return '';
  let [hours, minutes] = time24h.split(':');
  const h = parseInt(hours, 10);
  const modifier = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 || 12;
  return `${displayHours.toString().padStart(2, '0')}:${minutes} ${modifier}`;
};

const calculateTotalWorkTime = (punches?: PunchRecord[]) => {
    if (!punches || punches.length === 0) return 0;
    return punches.reduce((total, p) => {
        if (!p.out) return total;
        const diff = parseToMinutes(p.out) - parseToMinutes(p.in);
        return total + (diff > 0 ? diff : 0);
    }, 0);
};

const formatDuration = (mins: number) => {
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
};

const UserAttendance: React.FC<UserAttendanceProps> = ({ isAdmin = false }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Daily Status'>(isAdmin ? 'Daily Status' : 'Dashboard');
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  
  const [refreshToggle, setRefreshToggle] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyAttendance & { empId?: string }>({ date: '', status: AttendanceStatus.NOT_MARKED });
  const [filterSearch, setFilterSearch] = useState('');
  const todayDateStr = new Date().toISOString().split('T')[0];
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  
  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = currentSessionId === 'admin';
  const [isPunchedIn, setIsPunchedIn] = useState(false);

  useEffect(() => {
    const triggerRefresh = () => {
        setRefreshToggle(prev => prev + 1);
    };
    window.addEventListener('storage', triggerRefresh);
    window.addEventListener('attendance-updated', triggerRefresh);
    return () => {
        window.removeEventListener('storage', triggerRefresh);
        window.removeEventListener('attendance-updated', triggerRefresh);
    };
  }, []);

  useEffect(() => {
    const loadData = () => {
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        setCorporates(corps);
        let allBranches: any[] = [];
        if (isSuperAdmin) {
            allBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
            corps.forEach((c: any) => {
                const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
                allBranches = [...allBranches, ...cBranches.map((b: any) => ({...b, owner: c.email}))];
            });
            allBranches = allBranches.map(b => b.owner ? b : {...b, owner: 'admin'});
        } else {
            const ownerId = localStorage.getItem('logged_in_employee_corporate_id') || currentSessionId;
            const branchKey = ownerId === 'admin' ? 'branches_data' : `branches_data_${ownerId}`;
            allBranches = JSON.parse(localStorage.getItem(branchKey) || '[]');
            allBranches = allBranches.map(b => ({...b, owner: ownerId}));
        }
        setBranches(allBranches);
        let allStaff: any[] = [];
        if (isSuperAdmin) {
            const adminData = localStorage.getItem('staff_data');
            if (adminData) allStaff = [...JSON.parse(adminData).map((e: any) => ({...e, corporateId: 'admin'}))];
            corps.forEach((c: any) => {
                const cData = localStorage.getItem(`staff_data_${c.email}`);
                if(cData) allStaff = [...allStaff, ...JSON.parse(cData).map((e: any) => ({...e, corporateId: c.email}))];
            });
        } else {
            const ownerId = localStorage.getItem('logged_in_employee_corporate_id') || currentSessionId;
            const key = ownerId === 'admin' ? 'staff_data' : `staff_data_${ownerId}`;
            allStaff = JSON.parse(localStorage.getItem(key) || '[]').map((e: any) => ({...e, corporateId: ownerId}));
        }
        setEmployees(allStaff);
        if (!selectedEmployee && allStaff.length > 0) {
            const defaultEmp = isAdmin ? allStaff[0] : allStaff.find(e => e.id === currentSessionId);
            setSelectedEmployee(defaultEmp || allStaff[0]);
        }
    };
    loadData();
  }, [isAdmin, isSuperAdmin, currentSessionId, refreshToggle]);

  useEffect(() => {
    if (!selectedEmployee) return;
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
    const saved = localStorage.getItem(key);
    const data = saved ? JSON.parse(saved) : getEmployeeAttendance(selectedEmployee, year, month);
    setAttendanceData(data);
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = data.find((d: any) => d.date === today);
    setIsPunchedIn(!!(todayRecord && todayRecord.punches && todayRecord.punches.length > 0 && !todayRecord.punches[todayRecord.punches.length - 1].out));
  }, [selectedEmployee, selectedMonth, refreshToggle]);

  const filteredStaffList = useMemo(() => {
    return employees.filter(emp => {
        const matchesSearch = filterSearch ? emp.name.toLowerCase().includes(filterSearch.toLowerCase()) : true;
        const matchesCorp = filterCorporate === 'All' || (emp as any).corporateId === filterCorporate;
        const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
        return matchesSearch && matchesCorp && matchesBranch;
    });
  }, [employees, filterCorporate, filterBranch, filterSearch, refreshToggle]);

  const staffDailyLogs = useMemo(() => {
    if (!isAdmin) return [];
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    return filteredStaffList.map(emp => {
        const key = `attendance_data_${emp.id}_${year}_${month}`;
        const saved = localStorage.getItem(key);
        const data = saved ? JSON.parse(saved) : getEmployeeAttendance(emp, year, month);
        const record = data.find((d: any) => d.date === selectedDate) || { date: selectedDate, status: AttendanceStatus.NOT_MARKED, punches: [] };
        return { ...emp, dailyRecord: record };
    });
  }, [filteredStaffList, selectedDate, isAdmin, refreshToggle]);

  const dashboardStats = useMemo(() => {
    if (!isAdmin) {
        let present = 0, absent = 0, late = 0, halfDay = 0, leave = 0;
        attendanceData.forEach(day => {
            if (day.status === AttendanceStatus.PRESENT) { present++; if (day.isLate) late++; }
            else if (day.status === AttendanceStatus.ABSENT) absent++;
            else if (day.status === AttendanceStatus.HALF_DAY) halfDay++;
            else if (day.status === AttendanceStatus.PAID_LEAVE) leave++;
        });
        return { total: attendanceData.length, present, absent, late, halfDay, leave, onField: present };
    }
    const present = staffDailyLogs.filter(l => l.dailyRecord.status === AttendanceStatus.PRESENT).length;
    const absent = staffDailyLogs.filter(l => l.dailyRecord.status === AttendanceStatus.ABSENT).length;
    const late = staffDailyLogs.filter(l => l.dailyRecord.isLate).length;
    const halfDay = staffDailyLogs.filter(l => l.dailyRecord.status === AttendanceStatus.HALF_DAY).length;
    const leave = staffDailyLogs.filter(l => l.dailyRecord.status === AttendanceStatus.PAID_LEAVE).length;
    return { total: filteredStaffList.length, present, absent, late, halfDay, leave, onField: present };
  }, [filteredStaffList, staffDailyLogs, attendanceData, isAdmin, refreshToggle]);

  const availableBranchesList = useMemo(() => {
    if (filterCorporate === 'All') return branches;
    return branches.filter(b => b.owner === filterCorporate);
  }, [branches, filterCorporate, refreshToggle]);

  const handlePrevMonth = () => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const handleEditClick = (record: DailyAttendance, empId?: string) => {
      if (!isAdmin) return; 
      setEditingRecord({ ...record, empId: empId || selectedEmployee?.id });
      setIsEditModalOpen(true);
  };

  const handleSaveChanges = () => {
      const targetEmpId = editingRecord.empId || selectedEmployee?.id;
      if (!targetEmpId || !editingRecord.date) return;
      const date = new Date(editingRecord.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `attendance_data_${targetEmpId}_${year}_${month}`;
      const targetEmp = employees.find(e => e.id === targetEmpId);
      if (!targetEmp) return;
      const currentMonthData = JSON.parse(localStorage.getItem(key) || JSON.stringify(getEmployeeAttendance(targetEmp, year, month)));
      const updatedMonthData = currentMonthData.map((d: DailyAttendance) => d.date === editingRecord.date ? {
          ...d,
          status: editingRecord.status,
          punches: editingRecord.punches || [],
          isLate: editingRecord.isLate
      } : d);
      localStorage.setItem(key, JSON.stringify(updatedMonthData));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      window.dispatchEvent(new CustomEvent('cloud-sync-immediate'));
      setIsEditModalOpen(false);
  };

  const handlePunchAction = async (action: 'In' | 'Out') => {
    if (!selectedEmployee) return;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const year = now.getFullYear();
    const month = now.getMonth();
    const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
    const currentData = JSON.parse(localStorage.getItem(key) || JSON.stringify(getEmployeeAttendance(selectedEmployee, year, month)));
    
    const updated = currentData.map((d: DailyAttendance) => {
        if (d.date === today) {
            const punches = d.punches || [];
            if (action === 'In') {
                punches.push({ in: time });
                return { 
                    ...d, 
                    status: AttendanceStatus.PRESENT, 
                    punches, 
                    checkIn: d.checkIn || time, // Set checkIn if first punch
                    isLate: punches.length === 1 ? now.getHours() >= 10 : d.isLate 
                };
            } else {
                if (punches.length > 0) {
                    punches[punches.length - 1].out = time;
                }
                return { ...d, punches, checkOut: time };
            }
        }
        return d;
    });

    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('attendance-updated'));
    window.dispatchEvent(new CustomEvent('cloud-sync-immediate'));
    
    const ownerId = localStorage.getItem('logged_in_employee_corporate_id') || 'admin';
    await sendSystemNotification({
        type: 'system',
        title: `Employee Punched ${action}`,
        message: `${selectedEmployee.name} (${selectedEmployee.id}) has just punched ${action.toLowerCase()} at ${time}. Today's Punch Count: ${updated.find((d: any) => d.date === today)?.punches?.length || 1}`,
        targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
        corporateId: ownerId === 'admin' ? undefined : ownerId,
        employeeId: selectedEmployee.id,
        link: '/admin/attendance'
    });

    setAttendanceData(updated);
    setIsPunchedIn(action === 'In');
    alert(`Successfully Punched ${action}! Current Time: ${time}`);
  };

  const renderDailyStatus = () => (
    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-emerald-900/5 overflow-hidden animate-in fade-in duration-500">
        <div className="p-8 md:p-10 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/30">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Calendar className="w-5 h-5" /></div>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none outline-none font-black text-gray-800 text-sm appearance-none cursor-pointer" />
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="flex gap-2">
                    <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black border border-emerald-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> {dashboardStats.present} Present
                    </span>
                    <span className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-black border border-rose-100">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div> {dashboardStats.absent} Absent
                    </span>
                </div>
            </div>
            <div className="flex gap-4">
                {isSuperAdmin && (
                    <div className="relative group">
                        <select value={filterCorporate} onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }} className="pl-12 pr-10 py-4 bg-white border border-gray-100 rounded-[1.5rem] text-xs font-black text-gray-500 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px] appearance-none cursor-pointer shadow-sm">
                            <option value="All">Corporate: All</option>
                            <option value="admin">Head Office</option>
                            {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                        </select>
                        <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                )}
                <div className="relative group">
                    <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="pl-12 pr-10 py-4 bg-white border border-gray-100 rounded-[1.5rem] text-xs font-black text-gray-500 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px] appearance-none cursor-pointer shadow-sm">
                        <option value="All">Branch: All</option>
                        {availableBranchesList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 bg-white">
                    <tr><th className="px-10 py-8">Staff Name</th><th className="px-10 py-8">Branch / Shift</th><th className="px-10 py-8">History (Punches)</th><th className="px-10 py-8">Total Time</th><th className="px-10 py-8 text-center">Status</th><th className="px-10 py-8 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {staffDailyLogs.map((log, i) => {
                        const totalMins = calculateTotalWorkTime(log.dailyRecord.punches);
                        const durationStr = formatDuration(totalMins);
                        const punchCount = log.dailyRecord.punches?.length || 0;
                        return (
                            <tr key={i} className="hover:bg-gray-50/50 transition-all group">
                                <td className="px-10 py-8"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg border border-emerald-100 shadow-sm">{log.name.charAt(0)}</div><div><p className="font-black text-gray-800 tracking-tight">{log.name}</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{log.role}</p></div></div></td>
                                <td className="px-10 py-8"><p className="font-bold text-gray-600 text-sm">{log.branch || 'Head Office'}</p><p className="text-[10px] text-gray-400 font-black">{log.workingHours || '09:30 - 18:30'}</p></td>
                                <td className="px-10 py-8">
                                    <div className="flex flex-col gap-1.5">
                                        {punchCount > 0 ? (
                                            <>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase">
                                                    <ListOrdered className="w-3 h-3" /> {punchCount} Punches
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {log.dailyRecord.punches?.slice(0, 2).map((p, pi) => (
                                                        <span key={pi} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-gray-600 font-bold">
                                                            {p.in} - {p.out || '...'}
                                                        </span>
                                                    ))}
                                                    {punchCount > 2 && <span className="text-[10px] text-gray-400 font-bold">+{punchCount - 2} more</span>}
                                                </div>
                                            </>
                                        ) : <span className="text-gray-300 text-sm italic">No punches</span>}
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-3">
                                        <Clock className={`w-5 h-5 ${durationStr ? 'text-emerald-500' : 'text-gray-300'}`} />
                                        <span className={`text-lg font-black ${durationStr ? 'text-gray-800' : 'text-gray-300'}`}>{durationStr || '--:--'}</span>
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-center"><span className={`inline-flex px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${log.dailyRecord.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : log.dailyRecord.status === AttendanceStatus.ABSENT ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{log.dailyRecord.status.replace('_', ' ')}</span></td>
                                <td className="px-10 py-8 text-right"><button onClick={() => handleEditClick(log.dailyRecord, log.id)} className="p-3 hover:bg-white rounded-2xl text-gray-400 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100 hover:shadow-md"><Edit2 className="w-5 h-5" /></button></td>
                            </tr>
                        );
                    })}
                    {staffDailyLogs.length === 0 && (
                        <tr><td colSpan={6} className="py-32 text-center"><div className="flex flex-col items-center gap-4 text-gray-300"><Users className="w-16 h-16 opacity-20" /><p className="font-black uppercase tracking-[0.3em] text-sm">No staff records found for this criteria.</p></div></td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderMonthlyCalendar = () => (
    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-emerald-900/5 overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-8 md:p-10 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
                {isAdmin && (
                    <div className="relative group">
                        <select value={selectedEmployee?.id} onChange={(e) => setSelectedEmployee(employees.find(emp => emp.id === e.target.value) || null)} className="pl-6 pr-12 py-4 bg-gray-50 border-none rounded-[1.5rem] text-sm font-black text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[220px] appearance-none cursor-pointer shadow-inner transition-all">
                            {filteredStaffList.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none group-hover:text-emerald-500 transition-colors" />
                    </div>
                )}
                <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-[1.5rem] p-1.5 shadow-sm">
                    <button onClick={handlePrevMonth} className="p-3 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-emerald-600"><ChevronLeft className="w-6 h-6"/></button>
                    <span className="px-6 text-sm font-black uppercase tracking-[0.2em] text-gray-800 min-w-[200px] text-center">{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={handleNextMonth} className="p-3 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-emerald-600"><ChevronRight className="w-6 h-6"/></button>
                </div>
            </div>
        </div>
        <div className="p-8 md:p-12">
            <div className="grid grid-cols-7 gap-px bg-gray-50 border border-gray-50 rounded-[2.5rem] overflow-hidden shadow-inner">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
                    <div key={day} className={`bg-white py-8 text-center text-[12px] font-black tracking-[0.3em] ${i === 0 ? 'text-rose-500' : 'text-gray-400'}`}>{day}</div>
                ))}
                {Array.from({ length: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay() }).map((_, i) => <div key={`pad-${i}`} className="bg-white min-h-[180px] opacity-10"></div>)}
                {attendanceData.map((day, idx) => {
                    const isWeekend = new Date(day.date).getDay() === 0;
                    const isToday = day.date === todayDateStr;
                    const totalMins = calculateTotalWorkTime(day.punches);
                    const durationStr = formatDuration(totalMins);
                    const punchCount = day.punches?.length || 0;
                    
                    return (
                        <div key={idx} onClick={() => handleEditClick(day)} className={`bg-white p-6 min-h-[180px] flex flex-col gap-4 relative transition-all hover:bg-emerald-50/20 group ${isToday ? 'ring-4 ring-inset ring-emerald-500/30 z-10 bg-emerald-50/10' : ''} ${isAdmin ? 'cursor-pointer' : ''}`}>
                            <div className="flex justify-between items-start z-10">
                                <span className={`text-3xl font-black ${isWeekend ? 'text-rose-400' : 'text-gray-900'}`}>{new Date(day.date).getDate()}</span>
                                {day.status !== AttendanceStatus.NOT_MARKED ? (
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg tracking-widest uppercase border shadow-sm ${day.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : day.status === AttendanceStatus.WEEK_OFF ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{day.status.replace('_', ' ')}</span>
                                ) : isWeekend ? <span className="text-[10px] font-black px-3 py-1 rounded-lg tracking-widest uppercase border bg-gray-50 text-gray-400 border-gray-100">WEEK OFF</span> : null}
                            </div>
                            
                            {punchCount > 0 && (
                                <div className="mt-auto space-y-2 p-3 bg-gray-50 rounded-[1.5rem] border border-gray-100 text-[11px] font-black transition-all group-hover:bg-white group-hover:shadow-md z-10">
                                    <div className="flex items-center justify-between text-indigo-600">
                                        <div className="flex items-center gap-1.5"><ArrowRightLeft className="w-3 h-3" /><span>{punchCount} Punches</span></div>
                                        <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">History</span>
                                    </div>
                                    <div className="pt-1.5 border-t border-gray-200/50 flex items-center justify-between text-emerald-600">
                                        <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /><span>{durationStr || '0h 0m'}</span></div>
                                        <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">Logged Hrs</span>
                                    </div>
                                </div>
                            )}
                            {isToday && <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-emerald-500 animate-ping z-10"></div>}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );

  return (
    <div className="max-w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4"><div className="p-3 bg-emerald-50 rounded-2xl"><Calendar className="w-8 h-8 text-emerald-600" /></div><div><h2 className="text-3xl font-black text-gray-800 tracking-tighter">Attendance Dashboard</h2><p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{isAdmin ? "Track daily shift and performance" : `Your Shift: ${selectedEmployee?.workingHours || '09:30 - 18:30'}`}</p></div></div>
        {isAdmin && <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-100 shadow-inner">{['Dashboard', 'Daily Status'].map((tab) => <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === tab ? 'bg-white shadow-xl text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>{tab === 'Daily Status' ? <div className="flex items-center gap-2"><Timer className="w-4 h-4" /> Daily Status</div> : tab}</button>)}</div>}
      </div>

      {activeTab === 'Dashboard' && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {[
                      { label: isAdmin ? 'TOTAL STAFF' : 'WORKING DAYS', val: dashboardStats.total, icon: Users, color: 'text-gray-800', bg: 'bg-white' },
                      { label: 'PRESENT', val: dashboardStats.present, icon: UserCheck, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                      { label: 'ABSENT', val: dashboardStats.absent, icon: UserX, color: 'text-rose-700', bg: 'bg-rose-50' },
                      { label: 'LATE', val: dashboardStats.late, icon: Clock, color: 'text-orange-700', bg: 'bg-orange-50' },
                      { label: 'ON FIELD', val: dashboardStats.onField, icon: Send, color: 'text-blue-700', bg: 'bg-blue-50' },
                      { label: 'HALF DAY', val: dashboardStats.halfDay, icon: Activity, color: 'text-amber-700', bg: 'bg-amber-50' },
                      { label: 'LEAVE', val: dashboardStats.leave, icon: UserMinus, color: 'text-indigo-700', bg: 'bg-indigo-50' },
                  ].map((kpi, i) => (
                      <div key={i} className={`${kpi.bg} p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md h-32`}><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">{kpi.label}</p><div className="flex justify-between items-end"><h4 className={`text-4xl font-black ${kpi.color}`}>{kpi.val}</h4><kpi.icon className={`w-7 h-7 opacity-20 ${kpi.color}`} /></div></div>
                  ))}
              </div>
              {!isAdmin && selectedEmployee && (
                  <div className="bg-white rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(16,185,129,0.15)] border border-gray-50 overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-600 transition-all duration-700 group-hover:h-6"></div>
                    <div className="p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-16">
                        <div className="text-center md:text-left space-y-10">
                            <div className="space-y-2">
                                <h3 className="text-5xl font-black text-gray-900 tracking-tighter">Hello, {selectedEmployee.name.split(' ')[0]}! 👋</h3>
                                <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[12px]">Ready for today's shift?</p>
                            </div>
                            <div className="inline-flex flex-col items-start gap-4">
                                <div className="inline-flex items-center gap-8 px-12 py-8 bg-emerald-50 rounded-[3rem] border border-emerald-100 transition-all hover:scale-105 shadow-[0_20px_40px_rgba(16,185,129,0.1)]">
                                    <Clock className="w-12 h-12 text-emerald-600" />
                                    <span className="text-7xl font-black font-mono text-gray-800 tracking-tighter tabular-nums">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                {attendanceData.find(d => d.date === todayDateStr)?.punches && (
                                    <div className="flex gap-4 animate-in fade-in slide-in-from-left-4">
                                        <div className="px-6 py-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                                            <ListOrdered className="w-5 h-5 text-indigo-600" />
                                            <span className="text-sm font-black text-indigo-800 uppercase tracking-widest">{attendanceData.find(d => d.date === todayDateStr)?.punches?.length || 0} Punches Today</span>
                                        </div>
                                        <div className="px-6 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                            <Timer className="w-5 h-5 text-emerald-600" />
                                            <span className="text-sm font-black text-emerald-800 uppercase tracking-widest">Total: {formatDuration(calculateTotalWorkTime(attendanceData.find(d => d.date === todayDateStr)?.punches)) || '0h 0m'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button onClick={() => handlePunchAction(isPunchedIn ? 'Out' : 'In')} className={`relative w-72 h-72 rounded-full shadow-[0_60px_100px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center text-white transition-all transform hover:scale-110 active:scale-90 overflow-hidden group ${isPunchedIn ? 'bg-gradient-to-br from-rose-500 via-red-600 to-red-800 shadow-red-200' : 'bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 shadow-emerald-200'}`}>
                            <Fingerprint className="w-24 h-24 mb-4 group-hover:scale-125 transition-transform duration-500" />
                            <span className="text-2xl font-black uppercase tracking-[0.2em]">{isPunchedIn ? 'Punch Out' : 'Punch In'}</span>
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                    </div>
                  </div>
              )}
              {renderMonthlyCalendar()}
          </div>
      )}

      {isAdmin && activeTab === 'Daily Status' && renderDailyStatus()}

      {isEditModalOpen && editingRecord && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Punch History - {editingRecord.date}</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-2xl transition-all text-gray-400 hover:text-gray-900"><X className="w-6 h-6"/></button>
                </div>
                <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-1">Status</label>
                        <div className="relative group">
                            <select value={editingRecord.status} onChange={(e) => setEditingRecord({...editingRecord, status: e.target.value as any})} className="w-full px-6 py-5 bg-white border border-gray-100 rounded-[1.75rem] text-sm font-black text-gray-800 outline-none focus:ring-4 focus:ring-emerald-500/20 appearance-none cursor-pointer shadow-sm transition-all">
                                <option value={AttendanceStatus.PRESENT}>PRESENT</option>
                                <option value={AttendanceStatus.ABSENT}>ABSENT</option>
                                <option value={AttendanceStatus.HALF_DAY}>HALF DAY</option>
                                <option value={AttendanceStatus.PAID_LEAVE}>PAID LEAVE</option>
                                <option value={AttendanceStatus.WEEK_OFF}>WEEK OFF</option>
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none group-hover:text-emerald-500" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <History className="w-3 h-3" /> Detailed Punch Logs
                        </label>
                        {(editingRecord.punches || []).length > 0 ? (
                            <div className="space-y-3">
                                {editingRecord.punches?.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-left-2 transition-all">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">{idx + 1}</div>
                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[8px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Punch In</label>
                                                <input 
                                                    type="time" 
                                                    value={convertTo24Hour(p.in)} 
                                                    onChange={e => {
                                                        const punches = [...(editingRecord.punches || [])];
                                                        punches[idx].in = convertTo12Hour(e.target.value);
                                                        setEditingRecord({...editingRecord, punches});
                                                    }}
                                                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-rose-500 uppercase tracking-widest block mb-1">Punch Out</label>
                                                <input 
                                                    type="time" 
                                                    value={convertTo24Hour(p.out)} 
                                                    onChange={e => {
                                                        const punches = [...(editingRecord.punches || [])];
                                                        punches[idx].out = convertTo12Hour(e.target.value);
                                                        setEditingRecord({...editingRecord, punches});
                                                    }}
                                                    className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-black text-rose-700 outline-none focus:ring-2 focus:ring-rose-500/20"
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const punches = editingRecord.punches?.filter((_, i) => i !== idx);
                                                setEditingRecord({...editingRecord, punches});
                                            }}
                                            className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-400">
                                <Fingerprint className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                <p className="text-xs font-black uppercase tracking-widest">No punch logs recorded</p>
                            </div>
                        )}
                        <button 
                            onClick={() => {
                                const punches = editingRecord.punches || [];
                                punches.push({ in: '09:30 AM', out: '06:30 PM' });
                                setEditingRecord({...editingRecord, punches});
                            }}
                            className="w-full py-3 bg-gray-50 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded-xl border border-dashed border-gray-200 hover:border-emerald-200 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <Plus className="w-3 h-3" /> Add New Entry
                        </button>
                    </div>

                    <div className="pt-8 flex gap-5 border-t border-gray-100">
                        <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[1.75rem] font-black text-sm hover:bg-gray-200 transition-all active:scale-95 shadow-sm">Cancel</button>
                        <button onClick={handleSaveChanges} className="flex-[1.5] py-5 bg-emerald-600 text-white rounded-[1.75rem] font-black text-sm shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all transform hover:scale-[1.02] active:scale-95">Sync & Save Changes</button>
                    </div>
                </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default UserAttendance;
