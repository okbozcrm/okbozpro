
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, List, CheckCircle, XCircle, 
  User, MapPin, Clock, Fingerprint, Download, X, 
  PieChart as PieChartIcon, Activity, ScanLine, Loader2, Navigation,
  Phone, DollarSign, Plane, Briefcase, Filter, Search, FileText, Save,
  QrCode, Crosshair, AlertTriangle, ShieldCheck, ChevronDown, Laptop, Globe
} from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, DailyAttendance, Employee, Branch } from '../../types';

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

const calculateWorkingHours = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return null;
    const d1 = new Date(`2000/01/01 ${checkIn}`);
    const d2 = new Date(`2000/01/01 ${checkOut}`);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    let diffMs = d2.getTime() - d1.getTime();
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.round(((diffMs % 3600000) / 60000));
    return `${diffHrs}h ${diffMins}m`;
};

const UserAttendance: React.FC<UserAttendanceProps> = ({ isAdmin = false }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'Calendar' | 'Report'>('Calendar');
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distanceToBranch, setDistanceToBranch] = useState<number | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<DailyAttendance | null>(null);
  const [editForm, setEditForm] = useState({ status: '', checkIn: '', checkOut: '' });
  
  // Ripple effect state
  const [ripples, setRipples] = useState<{ x: number, y: number, id: number }[]>([]);

  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = currentSessionId === 'admin';

  useEffect(() => {
    const loadBranches = () => {
        let allBranches: any[] = [];
        if (isSuperAdmin) {
            allBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
                const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
                allBranches = [...allBranches, ...cBranches];
            });
        } else {
            allBranches = JSON.parse(localStorage.getItem(`branches_data_${currentSessionId}`) || '[]');
            if (allBranches.length === 0) allBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
        }
        setBranches(allBranches);
    };
    loadBranches();

    if (isAdmin) {
        let allStaff: Employee[] = [];
        if (isSuperAdmin) {
            const adminData = localStorage.getItem('staff_data');
            if (adminData) allStaff = [...JSON.parse(adminData)];
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
                const cData = localStorage.getItem(`staff_data_${c.email}`);
                if(cData) allStaff = [...allStaff, ...JSON.parse(cData)];
            });
            if (allStaff.length === 0) allStaff = MOCK_EMPLOYEES;
        } else {
            const saved = localStorage.getItem(`staff_data_${currentSessionId}`);
            if(saved) allStaff = JSON.parse(saved);
        }
        setEmployees(allStaff);
        if (allStaff.length > 0 && !selectedEmployee) setSelectedEmployee(allStaff[0]);
    } else {
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        let found = adminStaff.find((e: any) => e.id === currentSessionId);
        if (!found) {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            for (const c of corps) {
                const cData = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
                found = cData.find((e: any) => e.id === currentSessionId);
                if (found) break;
            }
        }
        setSelectedEmployee(found || MOCK_EMPLOYEES[0]);
    }
  }, [isAdmin, isSuperAdmin, currentSessionId]);

  useEffect(() => {
      if (!selectedEmployee) return;
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
      const saved = localStorage.getItem(key);
      setAttendanceData(saved ? JSON.parse(saved) : getEmployeeAttendance(selectedEmployee, year, month));
  }, [selectedEmployee, selectedMonth]);

  const updateGlobalLiveLocation = (pos: GeolocationPosition) => {
      if (!selectedEmployee) return;
      let ownerId = (selectedEmployee as any).owner || (selectedEmployee as any).franchiseId || localStorage.getItem('logged_in_employee_corporate_id') || 'admin';
      const liveData = JSON.parse(localStorage.getItem('active_staff_locations') || '[]');
      const filtered = liveData.filter((d: any) => d.id !== selectedEmployee.id);
      filtered.push({
          id: selectedEmployee.id,
          name: selectedEmployee.name,
          role: selectedEmployee.role,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          lastUpdate: new Date().toLocaleTimeString(),
          corporateId: ownerId,
          status: 'Active'
      });
      localStorage.setItem('active_staff_locations', JSON.stringify(filtered));
  };

  const updateLocationAndCheckGeofence = () => {
      if (!navigator.geolocation) {
          setLocationError("Geolocation not supported.");
          return;
      }
      
      setIsLocating(true);

      const successHandler = (position: GeolocationPosition) => {
          setCurrentLocation(position);
          setLocationError(null);
          setIsLocating(false);
          if (selectedEmployee?.liveTracking) updateGlobalLiveLocation(position);
          if (selectedEmployee?.branch) {
              const branch = branches.find(b => b.name === selectedEmployee.branch);
              if (branch) {
                  const dist = calculateDistance(position.coords.latitude, position.coords.longitude, branch.lat, branch.lng);
                  setDistanceToBranch(dist);
                  setIsWithinGeofence(dist <= (parseInt(branch.radius) || 100));
              }
          }
      };

      const errorHandler = (error: GeolocationPositionError) => {
           if (error.code === 2 || error.code === 3) {
               navigator.geolocation.getCurrentPosition(
                   successHandler,
                   (secondError) => {
                       setIsLocating(false);
                       let msg = "Unable to retrieve location.";
                       if (secondError.code === 1) msg = "Location permission denied.";
                       else if (secondError.code === 2) msg = "GPS unavailable. Ensure Location is ON.";
                       else if (secondError.code === 3) msg = "Request timed out.";
                       setLocationError(msg);
                   },
                   { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
               );
               return;
           }
          setIsLocating(false);
          setLocationError("Unable to retrieve location.");
      };

      navigator.geolocation.getCurrentPosition(successHandler, errorHandler, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  useEffect(() => {
      if (!selectedEmployee) return;
      const config = selectedEmployee.attendanceConfig;
      const needsPolling = selectedEmployee.liveTracking;
      const needsInitial = config?.gpsGeofencing || config?.manualPunch;

      if (needsInitial || needsPolling) {
          updateLocationAndCheckGeofence();
          if (needsPolling) {
              const interval = setInterval(updateLocationAndCheckGeofence, 30000);
              return () => clearInterval(interval);
          }
      }
  }, [selectedEmployee, branches]);

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    
    setRipples(prev => [...prev, { x, y, id }]);
    setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
    }, 1000);
  };

  const handlePunchAction = (e: React.MouseEvent<HTMLButtonElement>, type: 'In' | 'Out') => {
      createRipple(e);
      if (!selectedEmployee) return;
      const config = selectedEmployee.attendanceConfig || { gpsGeofencing: true, qrScan: false, manualPunch: true, manualPunchMode: 'Branch' };
      if (config.qrScan && type === 'In') {
          setShowQRScanner(true);
          return;
      }
      const isRemoteAllowed = config.manualPunchMode === 'Anywhere' || selectedEmployee.allowRemotePunch;
      const isBranchRestricted = config.manualPunchMode === 'Branch' || config.gpsGeofencing;
      if (isBranchRestricted && !isRemoteAllowed) {
          if (!currentLocation || !isWithinGeofence) {
              updateLocationAndCheckGeofence();
              if (!currentLocation) { alert("Locating... Please wait."); return; }
              if (!isWithinGeofence) { alert(`You are outside the branch zone (${distanceToBranch ? Math.round(distanceToBranch) : '?'}m away).`); return; }
          }
      }
      performPunch(type, isRemoteAllowed ? 'Remote/Anywhere' : 'Office/Branch');
  };

  const handleQRSubmit = () => {
      if (!selectedEmployee?.branch) return;
      if (qrInput.trim() === `OK BOZ - ${selectedEmployee.branch}`) {
          performPunch('In', 'QR Scan');
          setShowQRScanner(false);
          setQrInput('');
      } else {
          alert("Invalid QR Code.");
      }
  };

  const performPunch = (type: 'In' | 'Out', method: string) => {
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
              isLate: type === 'In' ? (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30)) : updatedData[todayIndex].isLate
          };
      } else {
          updatedData.push({
              date: todayStr,
              status: AttendanceStatus.PRESENT,
              checkIn: type === 'In' ? timeString : undefined,
              checkOut: type === 'Out' ? timeString : undefined,
              isLate: type === 'In' ? (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30)) : false
          });
      }
      saveAttendanceToStorage(updatedData);
      if (type === 'In' && currentLocation) updateGlobalLiveLocation(currentLocation);
      alert(`Successfully Punched ${type} at ${timeString} via ${method}`);
  };

  const saveAttendanceToStorage = (newData: DailyAttendance[]) => {
      if (!selectedEmployee) return;
      const key = `attendance_data_${selectedEmployee.id}_${selectedMonth.getFullYear()}_${selectedMonth.getMonth()}`;
      localStorage.setItem(key, JSON.stringify(newData));
      setAttendanceData(newData);
  };

  const stats = useMemo(() => ({
      present: attendanceData.filter(d => d.status === AttendanceStatus.PRESENT).length,
      absent: attendanceData.filter(d => d.status === AttendanceStatus.ABSENT).length,
      late: attendanceData.filter(d => d.isLate).length,
      halfDay: attendanceData.filter(d => d.status === AttendanceStatus.HALF_DAY).length,
      leave: attendanceData.filter(d => d.status === AttendanceStatus.PAID_LEAVE).length,
  }), [attendanceData]);

  const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay();
  const calendarGrid = [...Array(firstDayOfWeek).fill(null), ...attendanceData];

  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayRecord = attendanceData.find(d => d.date === todayDateStr);
  const isPunchedIn = todayRecord?.checkIn && !todayRecord?.checkOut;
  const isPunchedOut = !!todayRecord?.checkOut;

  const isRemoteAllowed = selectedEmployee?.attendanceConfig?.manualPunchMode === 'Anywhere' || selectedEmployee?.allowRemotePunch;
  const isGeofencingRequired = selectedEmployee?.attendanceConfig?.gpsGeofencing || selectedEmployee?.attendanceConfig?.manualPunchMode === 'Branch';
  
  const isPunchDisabled = (!isRemoteAllowed && isLocating) || (isGeofencingRequired && !isWithinGeofence && !isRemoteAllowed && !isPunchedIn);

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-6">
      <style>{`
        @keyframes ripple-animation {
            0% { transform: scale(0); opacity: 0.5; }
            100% { transform: scale(4); opacity: 0; }
        }
        .ripple {
            position: absolute;
            background: rgba(255, 255, 255, 0.4);
            border-radius: 50%;
            pointer-events: none;
            width: 100px;
            height: 100px;
            margin-top: -50px;
            margin-left: -50px;
            animation: ripple-animation 1s ease-out forwards;
        }
      `}</style>

      <div className="flex flex-col gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-emerald-600" /> Attendance
                </h2>
                <p className="text-gray-500 text-sm mt-1">Track your daily shift and performance</p>
              </div>
          </div>
          <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-4">
                  {isAdmin && (
                      <select 
                        className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2.5 px-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={selectedEmployee?.id || ''}
                        onChange={(e) => setSelectedEmployee(employees.find(emp => emp.id === e.target.value) || null)}
                      >
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                  )}
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
                      <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))} className="p-1.5 hover:bg-white rounded-xl transition-colors"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
                      <span className="text-sm font-extrabold text-gray-800 min-w-[120px] text-center uppercase tracking-wider">{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))} className="p-1.5 hover:bg-white rounded-xl transition-colors"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
                  </div>
              </div>
          </div>
      </div>

      {!isAdmin && selectedEmployee && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 border border-gray-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500"></div>
              <div className="p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="text-center md:text-left space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black text-gray-900">Hello, {selectedEmployee.name.split(' ')[0]}! 👋</h3>
                        <p className="text-gray-500 font-medium">Ready to start your day?</p>
                      </div>
                      <div className="inline-flex items-center gap-4 px-6 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 transition-all hover:scale-105">
                          <Clock className="w-7 h-7 text-emerald-600" />
                          <span className="text-4xl font-black font-mono text-gray-800 tracking-tighter">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                      {locationError && isGeofencingRequired && !isRemoteAllowed && (
                          <div className="text-red-600 text-xs flex items-center gap-2 bg-red-50 px-4 py-2 rounded-2xl border border-red-100 font-bold">
                              <AlertTriangle className="w-5 h-5 shrink-0" /> {locationError}
                          </div>
                      )}
                      {isGeofencingRequired && !isRemoteAllowed && (
                          <div className={`text-sm px-6 py-3 rounded-2xl flex items-center gap-3 font-bold transition-all ${isWithinGeofence ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200 animate-pulse'}`}>
                              <MapPin className="w-5 h-5 shrink-0" />
                              {isLocating ? 'Locating...' : (isWithinGeofence ? `You are in the office zone` : `You are ${distanceToBranch ? Math.round(distanceToBranch) : '?'}m away.`)}
                          </div>
                      )}
                      {isRemoteAllowed && (
                          <div className="text-sm px-6 py-3 rounded-2xl flex items-center gap-3 font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Globe className="w-5 h-5 shrink-0" /> Work From Anywhere
                          </div>
                      )}
                  </div>

                  <button 
                      onClick={(e) => handlePunchAction(e, isPunchedIn ? 'Out' : 'In')}
                      disabled={isPunchDisabled || isPunchedOut}
                      className={`relative w-48 h-48 rounded-full shadow-2xl flex flex-col items-center justify-center text-white transition-all transform hover:scale-110 active:scale-90 disabled:opacity-40 disabled:scale-100 disabled:grayscale overflow-hidden ${isPunchedIn ? 'bg-gradient-to-br from-rose-500 via-red-600 to-red-700 shadow-red-200' : 'bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-700 shadow-emerald-200'}`}
                  >
                      {ripples.map(r => (
                          <span key={r.id} className="ripple" style={{ left: r.x, top: r.y }} />
                      ))}
                      {isPunchedIn ? <Fingerprint className="w-16 h-16 mb-2" /> : <Fingerprint className="w-16 h-16 mb-2" />}
                      <span className="text-xl font-black uppercase tracking-widest">{isPunchedIn ? 'Punch Out' : 'Punch In'}</span>
                  </button>
              </div>
          </div>
      )}

      {viewMode === 'Calendar' && (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden select-none">
              <div className="grid grid-cols-7 border-b border-gray-50 bg-gray-50/50">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
                      <div key={day} className={`py-5 text-center text-xs font-black tracking-widest ${i === 0 ? 'text-rose-500' : 'text-gray-400'}`}>{day}</div>
                  ))}
              </div>
              <div className="grid grid-cols-7 bg-gray-50 gap-0.5 border-b border-gray-50">
                  {calendarGrid.map((day, idx) => {
                      if (!day) return <div key={idx} className="bg-white min-h-[120px]"></div>;
                      const isWeekend = new Date(day.date).getDay() === 0;
                      const isToday = day.date === todayDateStr;
                      
                      return (
                          <div key={idx} className={`relative p-3 min-h-[120px] flex flex-col justify-between transition-all bg-white hover:z-10 hover:shadow-2xl hover:scale-[1.02] ${isToday ? 'ring-2 ring-inset ring-emerald-500 bg-emerald-50/10' : ''}`}>
                              <div className="flex justify-between items-start">
                                  <span className={`text-lg font-black ${isWeekend ? 'text-rose-500' : isToday ? 'text-emerald-600' : 'text-gray-800'}`}>
                                      {new Date(day.date).getDate()}
                                  </span>
                                  {day.status !== AttendanceStatus.NOT_MARKED && (
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md tracking-wider uppercase border ${
                                        day.status === AttendanceStatus.PRESENT ? 'bg-green-50 text-green-700 border-green-100' : 
                                        day.status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-700 border-red-100' : 
                                        'bg-gray-100 text-gray-500 border-gray-200'
                                    }`}>
                                        {day.status.replace('_', ' ')}
                                    </span>
                                  )}
                              </div>
                              {day.checkIn && (
                                  <div className="mt-2 space-y-1.5 p-2 bg-gray-50 rounded-xl border border-gray-100">
                                      <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-700 uppercase">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        {day.checkIn}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[9px] font-black text-rose-700 uppercase">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                        {day.checkOut || '--:--'}
                                      </div>
                                  </div>
                              )}
                              {day.isLate && (
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 opacity-10 pointer-events-none">
                                      <span className="text-4xl font-black text-rose-600 border-4 border-rose-600 px-2 rounded-xl">LATE</span>
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {isAdmin && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Navigation className="w-6 h-6 text-blue-600" /> Monthly Location Log
                </h3>
                <button className="text-sm font-bold text-blue-600 hover:underline">Download CSV</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-gray-500 font-bold border-b border-gray-200 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Punch In</th>
                            <th className="px-6 py-4">In Location</th>
                            <th className="px-6 py-4">Punch Out</th>
                            <th className="px-6 py-4">Out Location</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {attendanceData
                          .filter(d => d.status === AttendanceStatus.PRESENT || d.status === AttendanceStatus.HALF_DAY)
                          .slice(0, 15)
                          .map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-gray-700">{row.date}</td>
                                <td className="px-6 py-4 text-emerald-600 font-black font-mono">{row.checkIn}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit text-xs font-bold border border-blue-100">
                                        <MapPin className="w-3 h-3" /> {selectedEmployee?.branch || 'Remote'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-rose-500 font-black font-mono">{row.checkOut}</td>
                                <td className="px-6 py-4 text-gray-500 text-xs font-medium">View Map</td>
                            </tr>
                        ))}
                        {attendanceData.filter(d => d.status === AttendanceStatus.PRESENT).length === 0 && (
                            <tr><td colSpan={5} className="py-12 text-center text-gray-400 font-medium italic">No attendance records found for this month.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default UserAttendance;
