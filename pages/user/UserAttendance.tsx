
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, List, CheckCircle, XCircle, 
  User, MapPin, Clock, Fingerprint, Download, X, 
  PieChart as PieChartIcon, Activity, ScanLine, Loader2, Navigation,
  Phone, DollarSign, Plane, Briefcase, Filter, Search, FileText, Save,
  QrCode, Crosshair, AlertTriangle, ShieldCheck, ChevronDown, Laptop, Globe,
  CalendarDays, LayoutDashboard, Map, MapPinned
} from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, DailyAttendance, Employee, Branch, CorporateAccount } from '../../types';

interface UserAttendanceProps {
  isAdmin?: boolean;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const UserAttendance: React.FC<UserAttendanceProps> = ({ isAdmin = false }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [viewMode, setViewMode] = useState<'Calendar' | 'Report'>('Calendar');
  const [liveTime, setLiveTime] = useState(new Date());
  
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<DailyAttendance | null>(null);
  const [editForm, setEditForm] = useState({ status: AttendanceStatus.PRESENT, checkIn: '', checkOut: '' });
  
  const [ripples, setRipples] = useState<{ x: number, y: number, id: number }[]>([]);

  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = currentSessionId === 'admin';

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadData = () => {
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        setCorporates(corps);

        let branchesList: any[] = [];
        const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
        branchesList = [...adminBranches.map((b: any) => ({...b, ownerId: 'admin'}))];
        corps.forEach((c: any) => {
            const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
            branchesList = [...branchesList, ...cBranches.map((b: any) => ({...b, ownerId: c.email}))];
        });
        setBranches(branchesList);

        let staffList: any[] = [];
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        staffList = [...adminStaff.map((s: any) => ({...s, ownerId: 'admin'}))];
        corps.forEach((c: any) => {
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
            staffList = [...staffList, ...cStaff.map((s: any) => ({...s, ownerId: c.email}))];
        });
        setAllEmployees(staffList);

        if (isAdmin) {
            if (staffList.length > 0 && !selectedEmployee) setSelectedEmployee(staffList[0]);
        } else {
            const found = staffList.find(s => s.id === currentSessionId);
            setSelectedEmployee(found || MOCK_EMPLOYEES[0]);
        }
    };
    loadData();
  }, [isAdmin, currentSessionId]);

  useEffect(() => {
      if (!selectedEmployee) return;
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
      const saved = localStorage.getItem(key);
      setAttendanceData(saved ? JSON.parse(saved) : getEmployeeAttendance(selectedEmployee, year, month));
  }, [selectedEmployee, selectedMonth]);

  const availableBranches = useMemo(() => {
      if (filterCorporate === 'All') return branches;
      return branches.filter(b => b.ownerId === filterCorporate);
  }, [branches, filterCorporate]);

  const filteredStaffList = useMemo(() => {
      return allEmployees.filter(s => {
          const matchCorp = filterCorporate === 'All' || s.ownerId === filterCorporate;
          const matchBranch = filterBranch === 'All' || s.branch === filterBranch;
          return matchCorp && matchBranch;
      });
  }, [allEmployees, filterCorporate, filterBranch]);

  const handlePunchAction = (e: React.MouseEvent<HTMLButtonElement>, type: 'In' | 'Out') => {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const todayStr = now.toISOString().split('T')[0];
      const updatedData = [...attendanceData];
      const todayIndex = updatedData.findIndex(d => d.date === todayStr);

      if (todayIndex >= 0) {
          updatedData[todayIndex] = {
              ...updatedData[todayIndex],
              status: type === 'In' ? AttendanceStatus.PRESENT : updatedData[todayIndex].status,
              checkIn: type === 'In' ? timeString : updatedData[todayIndex].checkIn,
              checkOut: type === 'Out' ? timeString : updatedData[todayIndex].checkOut,
          };
      } else {
          updatedData.push({ date: todayStr, status: AttendanceStatus.PRESENT, checkIn: timeString });
      }
      saveAttendanceToStorage(updatedData);
      alert(`Success: Punched ${type} at ${timeString}`);
  };

  const saveAttendanceToStorage = (newData: DailyAttendance[]) => {
      if (!selectedEmployee) return;
      const key = `attendance_data_${selectedEmployee.id}_${selectedMonth.getFullYear()}_${selectedMonth.getMonth()}`;
      localStorage.setItem(key, JSON.stringify(newData));
      setAttendanceData(newData);
  };

  const handleDateClick = (day: DailyAttendance) => {
    if (!isAdmin) return;
    setEditingDay(day);
    setEditForm({ status: day.status, checkIn: day.checkIn || '', checkOut: day.checkOut || '' });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingDay) return;
    const updatedData = attendanceData.map(d => d.date === editingDay.date ? { ...d, ...editForm } : d);
    saveAttendanceToStorage(updatedData);
    setIsEditModalOpen(false);
  };

  const stats = useMemo(() => ({
      present: attendanceData.filter(d => d.status === AttendanceStatus.PRESENT).length,
      absent: attendanceData.filter(d => d.status === AttendanceStatus.ABSENT).length,
      late: attendanceData.filter(d => d.isLate).length,
      halfDay: attendanceData.filter(d => d.status === AttendanceStatus.HALF_DAY).length,
      leave: attendanceData.filter(d => d.status === AttendanceStatus.PAID_LEAVE).length,
  }), [attendanceData]);

  const calendarGrid = [...Array(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay()).fill(null), ...attendanceData];
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayRecord = attendanceData.find(d => d.date === todayDateStr);
  const isPunchedIn = todayRecord?.checkIn && !todayRecord?.checkOut;

  const getStatusStyle = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT: return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 border-emerald-300' };
      case AttendanceStatus.ABSENT: return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100 border-rose-300' };
      case AttendanceStatus.HALF_DAY: return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 border-amber-300' };
      case AttendanceStatus.PAID_LEAVE: return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', badge: 'bg-sky-100 border-sky-300' };
      case AttendanceStatus.WEEK_OFF: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', badge: 'bg-slate-100 border-slate-300' };
      default: return { bg: 'bg-white', text: 'text-gray-400', border: 'border-gray-100', badge: 'bg-gray-100 border-gray-200' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      <style>{`
        @keyframes ripple-animation { 0% { transform: scale(0); opacity: 0.5; } 100% { transform: scale(4); opacity: 0; } }
        .ripple { position: absolute; background: rgba(255, 255, 255, 0.4); border-radius: 50%; pointer-events: none; width: 100px; height: 100px; margin-top: -50px; margin-left: -50px; animation: ripple-animation 1s ease-out forwards; }
      `}</style>

      {/* DASHBOARD HEADER */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100">
                <CalendarDays className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Attendance Management</h2>
                <p className="text-sm text-gray-500 font-medium">Real-time status monitoring & logs</p>
            </div>
        </div>

        {isAdmin && (
            <div className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/40 flex flex-col xl:flex-row gap-4 items-center">
                <div className="flex flex-wrap gap-3 flex-1 w-full">
                    {isSuperAdmin && (
                        <div className="relative group">
                            <select 
                                className="px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-emerald-500/10 appearance-none outline-none pr-10 cursor-pointer transition-all hover:bg-gray-100"
                                value={filterCorporate}
                                onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }}
                            >
                                <option value="All">All Corporates</option>
                                <option value="admin">Head Office</option>
                                {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    )}
                    <div className="relative group">
                        <select 
                            className="px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-emerald-500/10 appearance-none outline-none pr-10 cursor-pointer transition-all hover:bg-gray-100"
                            value={filterBranch}
                            onChange={(e) => setFilterBranch(e.target.value)}
                        >
                            <option value="All">All Branches</option>
                            {availableBranches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="relative group">
                        <select 
                            className="px-5 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm font-black text-emerald-800 focus:ring-4 focus:ring-emerald-500/10 appearance-none outline-none pr-10 cursor-pointer transition-all hover:bg-emerald-100"
                            value={selectedEmployee?.id || ''}
                            onChange={(e) => setSelectedEmployee(allEmployees.find(emp => emp.id === e.target.value) || null)}
                        >
                            {filteredStaffList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />
                    </div>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem] shadow-inner">
                    <button onClick={() => setViewMode('Calendar')} className={`px-6 py-2.5 text-xs font-black rounded-2xl transition-all uppercase tracking-widest ${viewMode === 'Calendar' ? 'bg-white text-emerald-600 shadow-lg border border-emerald-50' : 'text-gray-500 hover:text-gray-800'}`}>Calendar</button>
                    <button onClick={() => setViewMode('Report')} className={`px-6 py-2.5 text-xs font-black rounded-2xl transition-all uppercase tracking-widest ${viewMode === 'Report' ? 'bg-white text-emerald-600 shadow-lg border border-emerald-50' : 'text-gray-500 hover:text-gray-800'}`}>Report</button>
                </div>
            </div>
        )}
      </div>

      {/* STATS WITH PREMIUM COLOR CODING */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
          {[
              { label: 'Present', val: stats.present, col: 'emerald', icon: CheckCircle },
              { label: 'Absent', val: stats.absent, col: 'rose', icon: XCircle },
              { label: 'Late', val: stats.late, col: 'amber', icon: Clock },
              { label: 'Half Day', val: stats.halfDay, col: 'yellow', icon: Activity },
              { label: 'Leave', val: stats.leave, col: 'sky', icon: Plane }
          ].map(s => (
              <div key={s.label} className={`bg-white border-2 border-gray-100 p-6 rounded-[2.5rem] flex flex-col items-center justify-center text-center transition-all hover:scale-105 hover:shadow-xl hover:border-${s.col}-200 group`}>
                  <div className={`p-2 rounded-xl bg-${s.col}-50 text-${s.col}-600 mb-3 group-hover:scale-110 transition-transform`}>
                      <s.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-4xl font-black text-${s.col}-600 mb-1 tracking-tight`}>{s.val}</span>
                  <span className={`text-[10px] font-black text-${s.col}-700 uppercase tracking-[0.2em]`}>{s.label}</span>
              </div>
          ))}
      </div>

      {/* CALENDAR SECTION WITH BORDERLINE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12">
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-6 bg-gray-50/20">
                    <h3 className="font-black text-gray-900 flex items-center gap-3 uppercase text-sm tracking-[0.2em]"><Calendar className="w-5 h-5 text-emerald-600" /> Attendance Ledger</h3>
                    <div className="flex items-center gap-6 bg-white p-2 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40">
                        <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))} className="p-3 hover:bg-gray-50 rounded-full transition-all text-gray-400 hover:text-emerald-600"><ChevronLeft className="w-6 h-6" /></button>
                        <span className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] min-w-[160px] text-center">{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))} className="p-3 hover:bg-gray-50 rounded-full transition-all text-gray-400 hover:text-emerald-600"><ChevronRight className="w-6 h-6" /></button>
                    </div>
                </div>
                {/* GRID HEADER */}
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/10">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                        <div key={day} className={`py-5 text-center text-[11px] font-black tracking-[0.3em] border-r border-gray-100 last:border-r-0 ${day === 'SUN' ? 'text-rose-500' : 'text-gray-400'}`}>
                            {day}
                        </div>
                    ))}
                </div>
                {/* GRID CONTENT */}
                <div className="grid grid-cols-7 border-b border-gray-100">
                    {calendarGrid.map((day, idx) => {
                        if (!day) return <div key={idx} className="bg-white/40 min-h-[160px] border-r border-b border-gray-100"></div>;
                        const isToday = day.date === todayDateStr;
                        const style = getStatusStyle(day.status);
                        const isWeekend = new Date(day.date).getDay() === 0;
                        const colIndex = idx % 7;
                        
                        return (
                            <div 
                                key={idx} 
                                onClick={() => handleDateClick(day)} 
                                className={`relative p-5 min-h-[160px] flex flex-col justify-between transition-all bg-white border-r border-b border-gray-100 hover:z-20 hover:shadow-2xl hover:scale-[1.05] cursor-pointer group ${style.bg} ${colIndex === 6 ? 'border-r-0' : ''} ${isToday ? 'ring-4 ring-inset ring-emerald-500/20' : ''}`}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-2xl font-black ${isToday ? 'text-emerald-600' : isWeekend ? 'text-rose-400' : 'text-gray-900'}`}>
                                        {new Date(day.date).getDate()}
                                    </span>
                                    {day.status !== AttendanceStatus.NOT_MARKED && (
                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase border ${style.badge} ${style.text} tracking-wider shadow-sm`}>
                                            {day.status.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                                {day.checkIn && (
                                    <div className="mt-4 space-y-2.5 p-3 bg-white/70 rounded-[1.5rem] border border-gray-100 backdrop-blur-md group-hover:bg-white transition-all shadow-sm">
                                        <div className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> 
                                            {day.checkIn}
                                        </div>
                                        <div className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-2 opacity-80">
                                            <div className="w-1.5 h-1.5 bg-rose-400 rounded-full" /> 
                                            {day.checkOut || '--:--'}
                                        </div>
                                    </div>
                                )}
                                {isToday && (
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
      </div>

      {/* LOCATION LOG - ADMIN ONLY */}
      {isAdmin && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/40">
                <div className="flex items-center gap-3">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem] border border-blue-100 shadow-sm"><MapPinned className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase text-sm mb-1">Monthly Location History</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Geotagged punch records</p>
                    </div>
                </div>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 shadow-2xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-3">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 text-gray-400 font-black border-b border-gray-100 text-[10px] uppercase tracking-[0.3em]">
                        <tr>
                            <th className="px-10 py-8">Date</th>
                            <th className="px-10 py-8">Punch In</th>
                            <th className="px-10 py-8">In Location</th>
                            <th className="px-10 py-8">Punch Out</th>
                            <th className="px-10 py-8 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {attendanceData.filter(d => d.checkIn).map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/80 transition-all group">
                                <td className="px-10 py-7 font-black text-gray-500 text-xs tracking-wider">{row.date}</td>
                                <td className="px-10 py-7 text-emerald-600 font-black font-mono text-lg">{row.checkIn}</td>
                                <td className="px-10 py-7">
                                    <div className="flex items-center gap-3 text-blue-600 bg-blue-50 px-5 py-2 rounded-full w-fit text-[11px] font-black border border-blue-100 uppercase tracking-widest group-hover:scale-105 transition-transform">
                                        <MapPin className="w-3.5 h-3.5" /> {selectedEmployee?.branch || 'Remote'}
                                    </div>
                                </td>
                                <td className="px-10 py-7 text-rose-500 font-black font-mono text-lg">{row.checkOut || '--:--'}</td>
                                <td className="px-10 py-7 text-right">
                                    <button className="text-[10px] font-black text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 px-6 py-2.5 rounded-full transition-all uppercase tracking-[0.2em] hover:shadow-lg hover:shadow-blue-500/20 active:scale-95">VIEW ON MAP</button>
                                </td>
                            </tr>
                        ))}
                        {attendanceData.filter(d => d.checkIn).length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-30">
                                        <MapPin className="w-12 h-12 text-gray-400" />
                                        <p className="text-sm font-black text-gray-500 uppercase tracking-[0.2em]">No location logs found for this period</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* EDIT MODAL - POLISHED FOR NEW UI */}
      {isEditModalOpen && editingDay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
            <div className="bg-white rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.2)] w-full max-w-md border border-gray-100 animate-in zoom-in duration-300 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[3rem]">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Modify Record</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{editingDay.date}</p>
                    </div>
                    <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-white rounded-full transition-all border border-transparent hover:border-gray-100 text-gray-400 hover:text-rose-500"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-8 space-y-8">
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Day Status</label>
                        <div className="relative">
                            <select 
                                value={editForm.status} 
                                onChange={e => setEditForm({...editForm, status: e.target.value as any})} 
                                className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-[2rem] text-sm font-black text-gray-900 appearance-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500/50 outline-none transition-all cursor-pointer hover:bg-gray-100/50 shadow-inner"
                            >
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
