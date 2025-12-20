import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, List, CheckCircle, XCircle, 
  User, MapPin, Clock, Fingerprint, Download, X, 
  PieChart as PieChartIcon, Activity, ScanLine, Loader2, Navigation,
  Phone, DollarSign, Plane, Briefcase, Filter, Search, FileText, Save,
  QrCode, Crosshair, AlertTriangle, ShieldCheck, ChevronDown, Laptop, Globe,
  TrendingUp, Users, UserCheck, UserX, BarChart3, MoreHorizontal, UserMinus,
  Building2, ExternalLink, MousePointer2, Send
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, DailyAttendance, Employee, Branch, CorporateAccount } from '../../types';

interface UserAttendanceProps {
  isAdmin?: boolean;
}

const UserAttendance: React.FC<UserAttendanceProps> = ({ isAdmin = false }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Daily Status' | 'Monthly Summary' | 'My Calendar'>('Dashboard');
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyAttendance | null>(null);

  // Filters
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  
  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = currentSessionId === 'admin';
  const [isPunchedIn, setIsPunchedIn] = useState(false);

  // --- Data Loading ---
  useEffect(() => {
    if (!isAdmin) setActiveTab('My Calendar');

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
            allBranches = JSON.parse(localStorage.getItem(`branches_data_${currentSessionId}`) || '[]');
            allBranches = allBranches.map(b => ({...b, owner: currentSessionId}));
        }
        setBranches(allBranches);

        let allStaff: (Employee & { corporateId: string })[] = [];
        if (isSuperAdmin) {
            const adminData = localStorage.getItem('staff_data');
            if (adminData) allStaff = [...JSON.parse(adminData).map((e: any) => ({...e, corporateId: 'admin'}))];
            
            corps.forEach((c: any) => {
                const cData = localStorage.getItem(`staff_data_${c.email}`);
                if(cData) allStaff = [...allStaff, ...JSON.parse(cData).map((e: any) => ({...e, corporateId: c.email}))];
            });
            if (allStaff.length === 0) allStaff = MOCK_EMPLOYEES.map(e => ({...e, corporateId: 'admin'}));
        } else {
            const saved = localStorage.getItem(`staff_data_${currentSessionId}`);
            if(saved) allStaff = JSON.parse(saved).map((e: any) => ({...e, corporateId: currentSessionId}));
            if (allStaff.length === 0) allStaff = MOCK_EMPLOYEES.filter(e => e.id === currentSessionId).map(e => ({...e, corporateId: 'admin'}));
        }
        setEmployees(allStaff);

        if (!selectedEmployee && allStaff.length > 0) {
            const defaultEmp = isAdmin ? allStaff[0] : allStaff.find(e => e.id === currentSessionId);
            setSelectedEmployee(defaultEmp || allStaff[0]);
        }
    };

    loadData();
  }, [isAdmin, isSuperAdmin, currentSessionId]);

  // Filtering Logic for Employees to populate the selection dropdown
  const filteredStaffList = useMemo(() => {
    return employees.filter(emp => {
        const matchesCorp = filterCorporate === 'All' || (emp as any).corporateId === filterCorporate;
        const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
        return matchesCorp && matchesBranch;
    });
  }, [employees, filterCorporate, filterBranch]);

  // Available Branches for the Branch Filter (Cascading)
  const availableBranchesList = useMemo(() => {
    if (filterCorporate === 'All') return branches;
    return branches.filter(b => b.owner === filterCorporate);
  }, [branches, filterCorporate]);

  // If the current selected employee is not in the filtered list, select the first available one
  useEffect(() => {
      if (isAdmin && filteredStaffList.length > 0 && selectedEmployee) {
          const isStillVisible = filteredStaffList.some(e => e.id === selectedEmployee.id);
          if (!isStillVisible) {
              setSelectedEmployee(filteredStaffList[0]);
          }
      }
  }, [filteredStaffList, isAdmin]);

  // Load attendance data for the grid
  useEffect(() => {
    if (!selectedEmployee) return;
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
    const saved = localStorage.getItem(key);
    const data = saved ? JSON.parse(saved) : getEmployeeAttendance(selectedEmployee, year, month);
    setAttendanceData(data);
    
    // Punch status check
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = data.find((d: any) => d.date === today);
    setIsPunchedIn(!!(todayRecord && todayRecord.checkIn && !todayRecord.checkOut));
  }, [selectedEmployee, selectedMonth]);

  const handlePrevMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const dashboardStats = useMemo(() => {
    // Stats for Dashboard tab calculated based on filteredStaffList
    // (This is usually a real-time today aggregation)
    return { 
        total: filteredStaffList.length, 
        present: Math.round(filteredStaffList.length * 0.85), 
        absent: 0, 
        late: 0, 
        halfDay: 0, 
        leave: 0, 
        onField: 0 
    };
  }, [filteredStaffList]);

  const handleEditClick = (record: DailyAttendance) => {
      setEditingRecord({ ...record });
      setIsEditModalOpen(true);
  };

  const handleSaveChanges = () => {
      if (!selectedEmployee || !editingRecord) return;
      const date = new Date(editingRecord.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
      
      const currentMonthData = JSON.parse(localStorage.getItem(key) || JSON.stringify(getEmployeeAttendance(selectedEmployee, year, month)));
      const updatedMonthData = currentMonthData.map((d: DailyAttendance) => d.date === editingRecord.date ? editingRecord : d);
      
      localStorage.setItem(key, JSON.stringify(updatedMonthData));
      setAttendanceData(updatedMonthData);
      setIsEditModalOpen(false);
      setEditingRecord(null);
  };

  const handlePunchAction = (action: 'In' | 'Out') => {
    if (!selectedEmployee) return;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const updated = attendanceData.map(d => {
        if (d.date === today) {
            return action === 'In' 
                ? { ...d, status: AttendanceStatus.PRESENT, checkIn: time }
                : { ...d, checkOut: time };
        }
        return d;
    });

    const key = `attendance_data_${selectedEmployee.id}_${now.getFullYear()}_${now.getMonth()}`;
    localStorage.setItem(key, JSON.stringify(updated));
    setAttendanceData(updated);
    setIsPunchedIn(action === 'In');
    alert(`Successfully Punched ${action}!`);
  };

  const todayDateStr = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Header matching screenshot */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-emerald-50 rounded-2xl">
              <Calendar className="w-8 h-8 text-emerald-600" /> 
           </div>
           <div>
              <h2 className="text-3xl font-black text-gray-800 tracking-tighter">Attendance Dashboard</h2>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Track your daily shift and performance</p>
           </div>
        </div>

        {isAdmin && (
            <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-100">
                {['Dashboard', 'Daily Status', 'Monthly Summary'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === tab ? 'bg-white shadow-xl text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* --- ADMIN DASHBOARD VIEW --- */}
      {isAdmin && activeTab === 'Dashboard' && (
          <div className="space-y-8">
              
              {/* KPI CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {[
                      { label: 'TOTAL STAFF', val: dashboardStats.total, icon: Users, color: 'text-gray-800', bg: 'bg-white' },
                      { label: 'PRESENT', val: dashboardStats.present, icon: UserCheck, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                      { label: 'ABSENT', val: dashboardStats.absent, icon: UserX, color: 'text-rose-700', bg: 'bg-rose-50' },
                      { label: 'LATE', val: dashboardStats.late, icon: Clock, color: 'text-orange-700', bg: 'bg-orange-50' },
                      { label: 'ON FIELD', val: dashboardStats.onField, icon: Send, color: 'text-blue-700', bg: 'bg-blue-50' },
                      { label: 'HALF DAY', val: dashboardStats.halfDay, icon: Activity, color: 'text-amber-700', bg: 'bg-amber-50' },
                      { label: 'LEAVE', val: dashboardStats.leave, icon: UserMinus, color: 'text-indigo-700', bg: 'bg-indigo-50' },
                  ].map((kpi, i) => (
                      <div key={i} className={`${kpi.bg} p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md h-32`}>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">{kpi.label}</p>
                          <div className="flex justify-between items-end">
                              <h4 className={`text-4xl font-black ${kpi.color}`}>{kpi.val}</h4>
                              <kpi.icon className={`w-7 h-7 opacity-20 ${kpi.color}`} />
                          </div>
                      </div>
                  ))}
              </div>

              {/* MONTHLY SUMMARY CALENDAR GRID - MATCHING SCREENSHOT */}
              <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-emerald-900/5 overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="p-8 md:p-10 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="relative group">
                            <select 
                                value={selectedEmployee?.id}
                                onChange={(e) => setSelectedEmployee(employees.find(emp => emp.id === e.target.value) || null)}
                                className="pl-6 pr-12 py-4 bg-gray-50 border-none rounded-[1.5rem] text-sm font-black text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[220px] appearance-none cursor-pointer shadow-inner transition-all"
                            >
                                {filteredStaffList.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                {filteredStaffList.length === 0 && <option value="">No staff found</option>}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none group-hover:text-emerald-500 transition-colors" />
                        </div>

                        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-[1.5rem] p-1.5 shadow-sm">
                            <button onClick={handlePrevMonth} className="p-3 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-emerald-600"><ChevronLeft className="w-6 h-6"/></button>
                            <span className="px-6 text-sm font-black uppercase tracking-[0.2em] text-gray-800 min-w-[200px] text-center">
                                {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={handleNextMonth} className="p-3 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-emerald-600"><ChevronRight className="w-6 h-6"/></button>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        {isSuperAdmin && (
                            <div className="relative group">
                                <select 
                                    value={filterCorporate}
                                    onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }}
                                    className="pl-12 pr-10 py-4 bg-gray-50 border-none rounded-[1.5rem] text-xs font-black text-gray-500 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px] appearance-none cursor-pointer shadow-inner"
                                >
                                    <option value="All">Corporate: All</option>
                                    <option value="admin">Head Office</option>
                                    {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                                </select>
                                <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        )}
                        <div className="relative group">
                            <select 
                                value={filterBranch}
                                onChange={(e) => setFilterBranch(e.target.value)}
                                className="pl-12 pr-10 py-4 bg-gray-50 border-none rounded-[1.5rem] text-xs font-black text-gray-500 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px] appearance-none cursor-pointer shadow-inner"
                            >
                                <option value="All">Branch: All</option>
                                {availableBranchesList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                            </select>
                            <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                  </div>
                  
                  <div className="p-8 md:p-12">
                    <div className="grid grid-cols-7 gap-px bg-gray-50 border border-gray-50 rounded-[2.5rem] overflow-hidden shadow-inner">
                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
                            <div key={day} className={`bg-white py-8 text-center text-[12px] font-black tracking-[0.3em] ${i === 0 ? 'text-rose-500' : 'text-gray-400'}`}>{day}</div>
                        ))}
                        
                        {Array.from({ length: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay() }).map((_, i) => (
                            <div key={`pad-${i}`} className="bg-white min-h-[180px] opacity-10"></div>
                        ))}

                        {attendanceData.map((day, idx) => {
                            const isWeekend = new Date(day.date).getDay() === 0;
                            const isToday = day.date === todayDateStr;
                            
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => handleEditClick(day)}
                                    className={`bg-white p-6 min-h-[180px] flex flex-col gap-4 relative transition-all hover:bg-emerald-50/20 cursor-pointer group ${isToday ? 'ring-4 ring-inset ring-emerald-500/30 z-10 bg-emerald-50/10' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-3xl font-black ${isWeekend ? 'text-rose-400' : 'text-gray-900'}`}>{new Date(day.date).getDate()}</span>
                                        {day.status !== AttendanceStatus.NOT_MARKED ? (
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-lg tracking-widest uppercase border shadow-sm ${
                                                day.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                day.status === AttendanceStatus.WEEK_OFF ? 'bg-gray-50 text-gray-400 border-gray-100' :
                                                'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                                {day.status.replace('_', ' ')}
                                            </span>
                                        ) : isWeekend ? (
                                            <span className="text-[10px] font-black px-3 py-1 rounded-lg tracking-widest uppercase border bg-gray-50 text-gray-400 border-gray-100">WEEK OFF</span>
                                        ) : null}
                                    </div>
                                    
                                    {(day.checkIn || isWeekend) && (
                                        <div className="mt-auto space-y-2.5 p-3 bg-gray-50 rounded-[1.5rem] border border-gray-100 text-[11px] font-black transition-all group-hover:bg-white group-hover:shadow-md">
                                            {day.checkIn ? (
                                                <>
                                                    <div className="flex items-center gap-2 text-emerald-600">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                                                        {day.checkIn}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-rose-500">
                                                        <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]"></div>
                                                        {day.checkOut || '--:--'}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-gray-300 text-center py-2">--:--</div>
                                            )}
                                        </div>
                                    )}

                                    {isToday && (
                                        <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                  </div>
              </div>

              {/* MONTHLY LOCATION LOG TABLE */}
              <div className="bg-white rounded-[3rem] border border-gray-50 shadow-2xl shadow-emerald-900/5 overflow-hidden animate-in slide-in-from-bottom-6 duration-700">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                            <Navigation className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 tracking-tighter">Monthly Location Log</h3>
                    </div>
                    <button className="text-sm font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-2 bg-emerald-50 px-6 py-3 rounded-2xl transition-all hover:shadow-lg">
                        Download CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 bg-white">
                            <tr>
                                <th className="px-10 py-8">Date</th>
                                <th className="px-10 py-8">Punch In</th>
                                <th className="px-10 py-8">In Location</th>
                                <th className="px-10 py-8">Punch Out</th>
                                <th className="px-10 py-8">Out Location</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {attendanceData.filter(d => d.checkIn).map((log, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-10 py-8 font-bold text-gray-600">{log.date}</td>
                                    <td className="px-10 py-8 font-black text-emerald-600 text-lg">{log.checkIn}</td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-3 px-5 py-2.5 bg-blue-50 text-blue-600 text-[11px] font-black rounded-2xl border border-blue-100 w-fit uppercase shadow-sm">
                                            <MapPin className="w-4 h-4" /> {selectedEmployee?.branch || 'HEAD OFFICE'}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 font-black text-rose-500 text-lg">{log.checkOut || '06:30 PM'}</td>
                                    <td className="px-10 py-8">
                                        <button className="text-sm font-black text-gray-400 hover:text-emerald-600 transition-colors flex items-center gap-2 group-hover:translate-x-1 duration-300">
                                            View Map <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {attendanceData.filter(d => d.checkIn).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 text-gray-300">
                                            <AlertTriangle className="w-12 h-12 opacity-30" />
                                            <p className="font-black uppercase tracking-widest">No movement logs found for this period.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
              </div>
          </div>
      )}

      {/* --- EDIT ATTENDANCE MODAL --- */}
      {isEditModalOpen && editingRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-2xl animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                  <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                      <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Edit Attendance - {editingRecord.date}</h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-2xl transition-all text-gray-400 hover:text-gray-900"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="p-10 space-y-10">
                      <div>
                          <label className="block text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-1">Status</label>
                          <div className="relative group">
                            <select 
                                value={editingRecord.status}
                                onChange={(e) => setEditingRecord({...editingRecord, status: e.target.value as any})}
                                className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.75rem] text-sm font-black text-gray-800 outline-none focus:ring-4 focus:ring-emerald-500/20 appearance-none cursor-pointer shadow-inner transition-all"
                            >
                                <option value={AttendanceStatus.PRESENT}>PRESENT</option>
                                <option value={AttendanceStatus.ABSENT}>ABSENT</option>
                                <option value={AttendanceStatus.HALF_DAY}>HALF DAY</option>
                                <option value={AttendanceStatus.PAID_LEAVE}>PAID LEAVE</option>
                                <option value={AttendanceStatus.WEEK_OFF}>WEEK OFF</option>
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none group-hover:text-emerald-500" />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                          <div>
                              <label className="block text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-1">Check In</label>
                              <input 
                                type="text"
                                value={editingRecord.checkIn || ''}
                                onChange={(e) => setEditingRecord({...editingRecord, checkIn: e.target.value})}
                                placeholder="09:30 AM"
                                className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.75rem] text-lg font-black text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-inner transition-all"
                              />
                          </div>
                          <div>
                              <label className="block text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-1">Check Out</label>
                              <input 
                                type="text"
                                value={editingRecord.checkOut || ''}
                                onChange={(e) => setEditingRecord({...editingRecord, checkOut: e.target.value})}
                                placeholder="06:30 PM"
                                className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.75rem] text-lg font-black text-rose-500 outline-none focus:ring-4 focus:ring-rose-500/20 shadow-inner transition-all"
                              />
                          </div>
                      </div>

                      <div className="pt-8 flex gap-5">
                          <button 
                            onClick={() => setIsEditModalOpen(false)}
                            className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[1.75rem] font-black text-sm hover:bg-gray-200 transition-all active:scale-95 shadow-sm"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleSaveChanges}
                            className="flex-[1.5] py-5 bg-emerald-600 text-white rounded-[1.75rem] font-black text-sm shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all transform hover:scale-[1.02] active:scale-95"
                          >
                            Save Changes
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- PERSONAL CALENDAR VIEW --- */}
      {!isAdmin && selectedEmployee && (
        <div className="space-y-10 animate-in fade-in duration-700">
          <div className="bg-white rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(16,185,129,0.15)] border border-gray-50 overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-600 transition-all duration-700 group-hover:h-6"></div>
              <div className="p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-16">
                  <div className="text-center md:text-left space-y-10">
                      <div className="space-y-2">
                        <h3 className="text-5xl font-black text-gray-900 tracking-tighter">Hello, {selectedEmployee.name.split(' ')[0]}! 👋</h3>
                        <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[12px]">Welcome to your daily workspace</p>
                      </div>
                      <div className="inline-flex items-center gap-8 px-12 py-8 bg-emerald-50 rounded-[3rem] border border-emerald-100 transition-all hover:scale-105 shadow-[0_20px_40px_rgba(16,185,129,0.1)]">
                          <Clock className="w-12 h-12 text-emerald-600" />
                          <span className="text-7xl font-black font-mono text-gray-800 tracking-tighter tabular-nums">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                  </div>

                  <button 
                      onClick={() => handlePunchAction(isPunchedIn ? 'Out' : 'In')}
                      className={`relative w-72 h-72 rounded-full shadow-[0_60px_100px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center text-white transition-all transform hover:scale-110 active:scale-90 overflow-hidden group ${isPunchedIn ? 'bg-gradient-to-br from-rose-500 via-red-600 to-red-800 shadow-red-200' : 'bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 shadow-emerald-200'}`}
                  >
                      <Fingerprint className="w-24 h-24 mb-4 group-hover:scale-125 transition-transform duration-500" />
                      <span className="text-2xl font-black uppercase tracking-[0.2em]">{isPunchedIn ? 'Punch Out' : 'Punch In'}</span>
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
              </div>
          </div>

          <div className="bg-white rounded-[4rem] border border-gray-50 shadow-2xl overflow-hidden select-none">
              <div className="p-12 flex justify-between items-center border-b border-gray-50 bg-gray-50/20">
                  <h3 className="text-2xl font-black text-gray-800 uppercase tracking-widest flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm">
                        <Calendar className="w-7 h-7 text-emerald-600"/> 
                    </div>
                    {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex gap-4">
                    <button onClick={handlePrevMonth} className="p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-xl transition-all text-gray-400 hover:text-emerald-600"><ChevronLeft className="w-8 h-8"/></button>
                    <button onClick={handleNextMonth} className="p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-xl transition-all text-gray-400 hover:text-emerald-600"><ChevronRight className="w-8 h-8"/></button>
                  </div>
              </div>
              <div className="grid grid-cols-7 border-b border-gray-50 bg-gray-50/30">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
                      <div key={day} className={`py-10 text-center text-[12px] font-black tracking-[0.3em] ${i === 0 ? 'text-rose-500' : 'text-gray-400'}`}>{day}</div>
                  ))}
              </div>
              <div className="grid grid-cols-7 bg-gray-100 gap-px border-b border-gray-50">
                  {Array.from({ length: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay() }).map((_, i) => (
                      <div key={`personal-pad-${i}`} className="bg-white min-h-[200px]"></div>
                  ))}
                  {attendanceData.map((day, idx) => {
                      const isWeekend = new Date(day.date).getDay() === 0;
                      const isToday = day.date === todayDateStr;
                      return (
                          <div key={idx} className={`relative p-8 min-h-[200px] flex flex-col justify-between transition-all bg-white hover:z-10 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:scale-[1.02] group ${isToday ? 'ring-4 ring-inset ring-emerald-500/20 bg-emerald-50/5' : ''}`}>
                              <div className="flex justify-between items-start">
                                  <span className={`text-4xl font-black ${isWeekend ? 'text-rose-500' : isToday ? 'text-emerald-600' : 'text-gray-900'}`}>
                                      {new Date(day.date).getDate()}
                                  </span>
                                  <span className={`text-[10px] font-black px-3 py-1 rounded-xl tracking-widest uppercase border shadow-sm ${
                                      day.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                      day.status === AttendanceStatus.WEEK_OFF ? 'bg-gray-50 text-gray-400 border-gray-100' :
                                      'bg-gray-100 text-gray-500 border-gray-200'
                                  }`}>{day.status.replace('_', ' ')}</span>
                              </div>
                              {day.checkIn && (
                                  <div className="mt-8 space-y-3 p-4 bg-gray-50 rounded-[2rem] border border-gray-100 text-[12px] font-black uppercase group-hover:bg-emerald-50/50 group-hover:border-emerald-200 transition-colors">
                                      <div className="flex items-center gap-3 text-emerald-700 font-black">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                                        {day.checkIn}
                                      </div>
                                      <div className="flex items-center gap-3 text-rose-600 font-black">
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></div>
                                        {day.checkOut || '--:--'}
                                      </div>
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAttendance;