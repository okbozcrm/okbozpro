
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, CheckCircle, XCircle, 
  MapPin, Clock, Fingerprint, X, 
  Activity, AlertTriangle, ChevronDown, Plane,
  Users, UserCheck, UserX, UserMinus,
  Building2, Send, Timer, Edit2, ListOrdered, ArrowRightLeft,
  History, Trash2, Plus, CalendarDays, Zap, Shield,
  Coffee, RefreshCw, Check, Undo, Redo, Map as MapIcon, Power
} from 'lucide-react';
import { getEmployeeAttendance, ATTENDANCE_STATUS_COLORS } from '../../constants';
import { AttendanceStatus, DailyAttendance, Employee, CorporateAccount, PunchRecord, LeaveRequest, Branch, UserRole } from '../../types';
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
  const parts = time.split(':');
  let hours = parts[0];
  const minutes = parts[1];
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
  return `${hours.padStart(2, '0')}:${minutes}`;
};

const convertTo12Hour = (time24h?: string) => {
  if (!time24h) return '';
  const [hours, minutes] = time24h.split(':');
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

// Utility to safely stringify objects with potential circular references
const safeStringify = (obj: unknown) => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  });
};

const UserAttendance: React.FC<UserAttendanceProps> = ({ isAdmin = false }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Daily Status' | 'Leave Requests'>('Dashboard');
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  
  // History for Undo/Redo
  // history stores snapshots of attendanceData
  const [history, setHistory] = useState<DailyAttendance[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  
  const [refreshToggle, setRefreshToggle] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyAttendance & { empId?: string }>({ date: '', status: AttendanceStatus.NOT_MARKED });
  const [filterSearch] = useState('');
  const todayDateStr = new Date().toISOString().split('T')[0];
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  
  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = currentSessionId === 'admin';
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [isPunching, setIsPunching] = useState(false); 
  const [isTracking, setIsTracking] = useState(false);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    // Check if already tracking on mount
    if (!isAdmin && selectedEmployee) {
        const allActive = JSON.parse(localStorage.getItem('active_staff_locations') || '[]');
        const isAlreadyTracking = allActive.some((s: { employeeId: string }) => s.employeeId === selectedEmployee.id);
        if (isAlreadyTracking) {
            setIsTracking(true);
            // Re-establish watcher if needed, or just keep state. 
            // For simplicity, we'll let the user toggle it back on if they refresh, 
            // but the record stays in localStorage until they toggle off or it times out (if we had timeout).
            // Actually, better to re-start if it was on.
            handleTrackingToggle(true);
        }
    }
    return () => {
        if (watchId.current) {
            navigator.geolocation.clearWatch(watchId.current);
        }
    };
  }, [selectedEmployee, isAdmin]);

  const handleTrackingToggle = (forceOn = false) => {
    if (isTracking && !forceOn) {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      setIsTracking(false);
      // Remove from localStorage
      const allActive = JSON.parse(localStorage.getItem('active_staff_locations') || '[]');
      const updated = allActive.filter((s: { employeeId: string }) => s.employeeId !== selectedEmployee?.id);
      localStorage.setItem('active_staff_locations', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      
      sendSystemNotification({
          type: 'system',
          title: 'Live Tracking Disabled',
          message: `${selectedEmployee?.name} has stopped live tracking.`,
          targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
          corporateId: localStorage.getItem('logged_in_employee_corporate_id') || undefined,
          employeeId: selectedEmployee?.id,
          link: '/admin/tracking'
      }).catch(console.error);
    } else {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
      }
      setIsTracking(true);
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const allActive = JSON.parse(localStorage.getItem('active_staff_locations') || '[]');
          const empId = selectedEmployee?.id;
          const corpId = localStorage.getItem('logged_in_employee_corporate_id') || 'admin';
          
          const newLoc = {
            employeeId: empId,
            corporateId: corpId,
            lat: latitude,
            lng: longitude,
            name: selectedEmployee?.name || 'Unknown',
            role: selectedEmployee?.role || 'Staff',
            lastUpdate: new Date().toLocaleTimeString()
          };

          const existingIdx = allActive.findIndex((s: { employeeId: string }) => s.employeeId === empId);
          if (existingIdx >= 0) {
            allActive[existingIdx] = newLoc;
          } else {
            allActive.push(newLoc);
          }
          localStorage.setItem('active_staff_locations', JSON.stringify(allActive));
          window.dispatchEvent(new Event('storage'));
        },
        (error) => {
          console.error("Tracking error:", error);
          setIsTracking(false);
          if (watchId.current) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
          }
        },
        { enableHighAccuracy: true }
      );
      watchId.current = id;

      if (!forceOn) {
          sendSystemNotification({
              type: 'system',
              title: 'Live Tracking Enabled',
              message: `${selectedEmployee?.name} has started live tracking.`,
              targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
              corporateId: localStorage.getItem('logged_in_employee_corporate_id') || undefined,
              employeeId: selectedEmployee?.id,
              link: '/admin/tracking'
          }).catch(console.error);
      }
    }
  };

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
        let allBranches: Branch[] = [];
        if (isSuperAdmin) {
            allBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
            corps.forEach((c: CorporateAccount) => {
                const cBranches: Branch[] = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
                allBranches = [...allBranches, ...cBranches.map((b: Branch) => ({...b, owner: c.email}))];
            });
            allBranches = allBranches.map(b => b.owner ? b : {...b, owner: 'admin'});
        } else {
            const isFranchiseLogin = currentSessionId.includes('@') && currentSessionId !== 'admin';
            const ownerId = isFranchiseLogin ? currentSessionId : (localStorage.getItem('logged_in_employee_corporate_id') || currentSessionId);
            const branchKey = ownerId === 'admin' ? 'branches_data' : `branches_data_${ownerId}`;
            allBranches = JSON.parse(localStorage.getItem(branchKey) || '[]');
            allBranches = allBranches.map(b => ({...b, owner: ownerId}));
        }
        setBranches(allBranches);
        let allStaff: Employee[] = [];
        if (isSuperAdmin) {
            const adminData = localStorage.getItem('staff_data');
            if (adminData) allStaff = [...JSON.parse(adminData).map((e: Employee) => ({...e, corporateId: 'admin'}))];
            corps.forEach((c: CorporateAccount) => {
                const cData = localStorage.getItem(`staff_data_${c.email}`);
                if(cData) allStaff = [...allStaff, ...JSON.parse(cData).map((e: Employee) => ({...e, corporateId: c.email}))];
            });
        } else {
            const isFranchiseLogin = currentSessionId.includes('@') && currentSessionId !== 'admin';
            const ownerId = isFranchiseLogin ? currentSessionId : (localStorage.getItem('logged_in_employee_corporate_id') || currentSessionId);
            const key = ownerId === 'admin' ? 'staff_data' : `staff_data_${ownerId}`;
            allStaff = JSON.parse(localStorage.getItem(key) || '[]').map((e: Employee) => ({...e, corporateId: ownerId}));
        }
        // For non-admin (employee) view, strictly filter to only their own record
        let staffToDisplay = allStaff;
        if (!isAdmin) {
            const loggedInId = localStorage.getItem('logged_in_employee_id') || currentSessionId;
            staffToDisplay = allStaff.filter(e => e.id === loggedInId);
        }
        // Update employees state once to prevent flickering and redundant re-renders
        setEmployees(staffToDisplay);

        // Load Leave Requests
        const leaves = JSON.parse(localStorage.getItem('global_leave_requests') || '[]');
        if (isSuperAdmin) setLeaveRequests(leaves);
        else {
            const isFranchiseLogin = currentSessionId.includes('@') && currentSessionId !== 'admin';
            const ownerId = isFranchiseLogin ? currentSessionId : (localStorage.getItem('logged_in_employee_corporate_id') || currentSessionId);
            setLeaveRequests(leaves.filter((l: LeaveRequest) => l.corporateId === ownerId));
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
    // Initialize History with current state
    setHistory([JSON.parse(safeStringify(data))]);
    setHistoryIndex(0);

    const today = new Date().toISOString().split('T')[0];
    const todayRecord = data.find((d: DailyAttendance) => d.date === today);
    setIsPunchedIn(!!(todayRecord && todayRecord.punches && todayRecord.punches.length > 0 && !todayRecord.punches[todayRecord.punches.length - 1].out));
  }, [selectedEmployee, selectedMonth]); // Removing refreshToggle from deps to prevent history reset on external updates

  // --- UNDO / REDO LOGIC ---
  const pushToHistory = (newData: DailyAttendance[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(safeStringify(newData)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      // Update State and Storage
      setAttendanceData(newData);
      saveToStorage(newData);
  };

  const handleUndo = () => {
      if (historyIndex > 0) {
          const prevIndex = historyIndex - 1;
          const prevData = history[prevIndex];
          setAttendanceData(prevData);
          setHistoryIndex(prevIndex);
          saveToStorage(prevData);
      }
  };

  const handleRedo = () => {
      if (historyIndex < history.length - 1) {
          const nextIndex = historyIndex + 1;
          const nextData = history[nextIndex];
          setAttendanceData(nextData);
          setHistoryIndex(nextIndex);
          saveToStorage(nextData);
      }
  };

  const saveToStorage = (data: DailyAttendance[]) => {
      if (!selectedEmployee) return;
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
      localStorage.setItem(key, safeStringify(data));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('attendance-updated'));
  };

  const filteredStaffList = useMemo(() => {
    // Get start and end of selected month for filtering
    const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

    return employees.filter(emp => {
        const matchesSearch = filterSearch ? emp.name.toLowerCase().includes(filterSearch.toLowerCase()) : true;
        
        // Corporate Filter (for Super Admin)
        const matchesCorp = filterCorporate === 'All' || emp.corporateId === filterCorporate;
        
        // Branch Filter
        // If filterBranch is 'All', we show all employees for the selected corporate (or logged-in franchise).
        // If filterBranch is specific, we strictly match the employee's branch.
        const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;

        // Joining Date Logic: Staff must have joined on or before the end of the selected month
        const joiningDate = emp.joiningDate ? new Date(emp.joiningDate + 'T12:00:00') : null;
        const hasJoined = !joiningDate || joiningDate <= endOfMonth;

        // Termination/Relieving Date Logic: Staff must not have been terminated or relieved before the start of the selected month
        const terminationDate = (emp.status === 'Terminated' && emp.terminationDate) ? new Date(emp.terminationDate + 'T12:00:00') : null;
        const relievingDate = emp.relievingDate ? new Date(emp.relievingDate + 'T12:00:00') : null;
        
        const isNotTerminatedYet = !terminationDate || terminationDate >= startOfMonth;
        const isNotRelievedYet = !relievingDate || relievingDate >= startOfMonth;

        return matchesSearch && matchesCorp && matchesBranch && hasJoined && isNotTerminatedYet && isNotRelievedYet;
    });
  }, [employees, filterCorporate, filterBranch, filterSearch, refreshToggle, selectedMonth]);

  // Effect to update selectedEmployee when filtered list changes
  useEffect(() => {
      if (filteredStaffList.length > 0) {
          // Find the current selected employee in the new filtered list by ID
          const currentInList = selectedEmployee ? filteredStaffList.find(e => e.id === selectedEmployee.id) : null;
          
          if (!currentInList) {
              // If currently selected employee is NOT in the filtered list, select the first one from the list
              setSelectedEmployee(filteredStaffList[0]);
          } else if (currentInList !== selectedEmployee) {
              // If the employee is in the list but the object reference changed (e.g., after data refresh),
              // update to the latest object from the list to ensure we have fresh data
              setSelectedEmployee(currentInList);
          }
      } else {
          // If list is empty, clear selection
          setSelectedEmployee(null);
      }
  }, [filteredStaffList, selectedEmployee]);

  const staffDailyLogs = useMemo(() => {
    if (!isAdmin) return [];
    const date = new Date(selectedDate + 'T12:00:00');
    const year = date.getFullYear();
    const month = date.getMonth();
    return filteredStaffList.map(emp => {
        const key = `attendance_data_${emp.id}_${year}_${month}`;
        const saved = localStorage.getItem(key);
        const data = saved ? JSON.parse(saved) : getEmployeeAttendance(emp, year, month);
        const record = data.find((d: DailyAttendance) => d.date === selectedDate) || { date: selectedDate, status: AttendanceStatus.NOT_MARKED, punches: [] };
        
        let displayStatus = record.status;
        if (displayStatus === AttendanceStatus.NOT_MARKED && selectedDate <= todayDateStr) {
            displayStatus = AttendanceStatus.ABSENT;
        }

        return { ...emp, dailyRecord: { ...record, status: displayStatus } };
    });
  }, [filteredStaffList, selectedDate, isAdmin, todayDateStr, refreshToggle]);

  const dashboardStats = useMemo(() => {
    if (!isAdmin || (isAdmin && activeTab === 'Dashboard' && selectedEmployee)) {
        let present = 0, absent = 0, late = 0, halfDay = 0, leave = 0, holidays = 0, weekOff = 0, onField = 0;
        const isFieldStaff = selectedEmployee?.attendanceConfig?.locationRestriction === 'Anywhere';
        
        const joiningDate = selectedEmployee?.joiningDate ? new Date(selectedEmployee.joiningDate + 'T12:00:00') : new Date('2000-01-01');
        const terminationDate = (selectedEmployee?.status === 'Terminated' && selectedEmployee?.terminationDate) ? new Date(selectedEmployee.terminationDate + 'T12:00:00') : null;
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        attendanceData.forEach(day => {
            const dayDate = new Date(day.date + 'T12:00:00');
            
            // Skip days before joining
            if (dayDate < joiningDate) return;

            // Skip days after termination
            if (terminationDate && dayDate > terminationDate) return;

            // Skip future dates
            if (dayDate > today) return;

            const dayOfWeek = dayDate.getDay();
            const isSunday = dayOfWeek === 0;
            const isCustomWeekOff = selectedEmployee?.weekOff === dayDate.toLocaleDateString('en-US', { weekday: 'long' });
            const isImplicitWeekOff = (isSunday || isCustomWeekOff) && day.status === AttendanceStatus.NOT_MARKED;

            const isPresent = day.status === AttendanceStatus.PRESENT || day.status === AttendanceStatus.ALTERNATE_DAY;
            if (isPresent) { 
                present++; 
                if (day.isLate) late++; 
                if (isFieldStaff) onField++;
            }
            else if (day.status === AttendanceStatus.ABSENT || (day.status === AttendanceStatus.NOT_MARKED && day.date <= todayDateStr && !isImplicitWeekOff)) {
                absent++;
            }
            else if (day.status === AttendanceStatus.HALF_DAY) {
                halfDay++;
                if (isFieldStaff) onField += 0.5;
            }
            else if (day.status === AttendanceStatus.PAID_LEAVE) leave++;
            else if (day.status === AttendanceStatus.HOLIDAY) holidays++;
            else if (day.status === AttendanceStatus.WEEK_OFF || isImplicitWeekOff) weekOff++;
        });
        return { 
            total: attendanceData.length, 
            present, absent, late, halfDay, leave, holidays, weekOff, onField,
            pendingLeaves: leaveRequests.filter(l => l.status === 'Pending').length
        };
    }

    const presentLogs = staffDailyLogs.filter(l => l.dailyRecord.status === AttendanceStatus.PRESENT || l.dailyRecord.status === AttendanceStatus.ALTERNATE_DAY);
    const present = presentLogs.length;
    const onField = presentLogs.filter(l => l.attendanceConfig?.locationRestriction === 'Anywhere').length;
    const absent = staffDailyLogs.filter(l => l.dailyRecord.status === AttendanceStatus.ABSENT).length;
    const late = staffDailyLogs.filter(l => l.dailyRecord.isLate).length;
    const halfDay = staffDailyLogs.filter(l => l.dailyRecord.status === AttendanceStatus.HALF_DAY).length;
    const leave = staffDailyLogs.filter(l => l.dailyRecord.status === AttendanceStatus.PAID_LEAVE).length;
    const holidays = staffDailyLogs.filter(l => l.dailyRecord.status === AttendanceStatus.HOLIDAY).length;
    const weekOff = staffDailyLogs.filter(l => l.dailyRecord.status === AttendanceStatus.WEEK_OFF).length;
    
    return { 
        total: filteredStaffList.length, 
        present, absent, late, halfDay, leave, holidays, weekOff, onField,
        pendingLeaves: leaveRequests.filter(l => l.status === 'Pending').length
    };
  }, [filteredStaffList, staffDailyLogs, attendanceData, isAdmin, activeTab, selectedEmployee, todayDateStr, refreshToggle, leaveRequests]);

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
      
      // Update history only if it's for the currently selected employee in view
      if (targetEmpId === selectedEmployee?.id) {
          pushToHistory(updatedMonthData);
      } else {
          localStorage.setItem(key, JSON.stringify(updatedMonthData));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('attendance-updated'));
      }
      
      window.dispatchEvent(new CustomEvent('cloud-sync-immediate'));
      setIsEditModalOpen(false);
  };

  const handleLeaveAction = async (id: string, status: 'Approved' | 'Rejected') => {
      if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this leave request?`)) return;
      
      const key = 'global_leave_requests';
      const all: LeaveRequest[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = all.map(r => r.id === id ? { ...r, status } : r);
      localStorage.setItem(key, JSON.stringify(updated));
      
      const req = all.find(r => r.id === id);
      if (req) {
          await sendSystemNotification({
              type: 'leave_approval',
              title: `Leave Request ${status}`,
              message: `Your ${req.type} for ${req.from} has been ${status.toLowerCase()}.`,
              targetRoles: [UserRole.EMPLOYEE],
              employeeId: req.employeeId,
              link: '/user/apply-leave'
          });
      }

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      setRefreshToggle(v => v + 1);
  };

  const handleMarkStatusRange = async (status: AttendanceStatus) => {
    if (!selectedEmployee) return;
    
    // Calculate new state based on CURRENT attendanceData
    const now = new Date();
    const currentDay = now.getDate();
    // Use selectedMonth logic to ensure we target the viewed month
    const viewedYear = selectedMonth.getFullYear();
    const viewedMonth = selectedMonth.getMonth();
    const isCurrentMonth = viewedYear === now.getFullYear() && viewedMonth === now.getMonth();
    
    // Limit to today if current month, else full month if past (future logic handled in loop usually)
    const limitDay = isCurrentMonth ? currentDay : 32; 

    const updated = attendanceData.map((d: DailyAttendance) => {
      const dDate = new Date(d.date);
      if (dDate.getDate() <= limitDay && d.status !== AttendanceStatus.WEEK_OFF) {
        let punches = d.punches || [];
        if (status === AttendanceStatus.PRESENT && punches.length === 0) {
          punches = [{ in: '09:30 AM', out: '06:30 PM' }];
        } else if (status === AttendanceStatus.ABSENT || status === AttendanceStatus.HOLIDAY) {
          punches = [];
        }
        return { 
          ...d, 
          status, 
          punches, 
          checkIn: punches.length > 0 ? punches[0].in : undefined,
          checkOut: punches.length > 0 ? punches[punches.length - 1].out : undefined,
          isLate: false
        };
      }
      return d;
    });

    // PUSH TO HISTORY & SAVE
    pushToHistory(updated);
    window.dispatchEvent(new CustomEvent('cloud-sync-immediate'));

    const isFranchiseLogin = currentSessionId.includes('@') && currentSessionId !== 'admin';
    const ownerId = isFranchiseLogin ? currentSessionId : (localStorage.getItem('logged_in_employee_corporate_id') || 'admin');
    await sendSystemNotification({
        type: 'system',
        title: `Batch Attendance: ${status.replace('_', ' ')}`,
        message: `${selectedEmployee.name} was marked ${status.toLowerCase().replace('_', ' ')} for ${selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`,
        targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
        corporateId: ownerId === 'admin' ? undefined : ownerId,
        employeeId: selectedEmployee.id,
        link: '/admin/attendance'
    });
  };

  const handlePunchAction = async (action: 'In' | 'Out') => {
    if (!selectedEmployee || isPunching) return;

    // Check for relieving date
    if (selectedEmployee.relievingDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const relieving = new Date(selectedEmployee.relievingDate);
        relieving.setHours(0, 0, 0, 0);
        if (today > relieving) {
            alert('Attendance is disabled for this employee as the relieving date has passed.');
            return;
        }
    }
    
    setIsPunching(true); 
    await new Promise(resolve => setTimeout(resolve, 2000));

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // We update the local attendanceData which reflects current month
    // If user is viewing a different month, this punch might not be visible immediately in the calendar view
    // but logic below updates the state correctly if today matches view.
    
    const updated = attendanceData.map((d: DailyAttendance) => {
        if (d.date === today) {
            const punches = d.punches || [];
            if (action === 'In') {
                punches.push({ in: time });
                return { 
                    ...d, 
                    status: AttendanceStatus.PRESENT, 
                    punches, 
                    checkIn: d.checkIn || time, 
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

    // Update state and history
    pushToHistory(updated);
    window.dispatchEvent(new CustomEvent('cloud-sync-immediate'));
    
    const isFranchiseLogin = currentSessionId.includes('@') && currentSessionId !== 'admin';
    const ownerId = isFranchiseLogin ? currentSessionId : (localStorage.getItem('logged_in_employee_corporate_id') || 'admin');
    await sendSystemNotification({
        type: action === 'In' ? 'punch_in' : 'punch_out',
        title: `Employee Punched ${action}`,
        message: `${selectedEmployee.name} punched ${action.toLowerCase()} at ${time}.`,
        targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
        corporateId: ownerId === 'admin' ? undefined : ownerId,
        employeeId: selectedEmployee.id,
        branchId: selectedEmployee.branch,
        link: '/admin/attendance'
    });

    setIsPunchedIn(action === 'In');
    setIsPunching(false); 
  };

  const renderLeaveRequests = () => {
    const pending = leaveRequests.filter(l => l.status === 'Pending').sort((a,b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime());
    const history = leaveRequests.filter(l => l.status !== 'Pending').sort((a,b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime());

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-8 md:p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><Plane className="w-5 h-5" /></div>
                        <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Pending Leave Applications ({pending.length})</h3>
                    </div>
                </div>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50">
                            <tr>
                                <th className="px-10 py-8">Staff Name</th>
                                <th className="px-10 py-8">Leave Type</th>
                                <th className="px-10 py-8">Duration</th>
                                <th className="px-10 py-8">Reason</th>
                                <th className="px-10 py-8 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pending.map((req, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-all group">
                                    <td className="px-10 py-8"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-100 shadow-sm">{req.employeeName.charAt(0)}</div><div><p className="font-black text-slate-900 tracking-tight">{req.employeeName}</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ID: {req.employeeId}</p></div></div></td>
                                    <td className="px-10 py-8"><span className="px-3 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-lg border border-rose-100">{req.type}</span></td>
                                    <td className="px-10 py-8">
                                        <p className="font-bold text-slate-900 text-sm">{new Date(req.from).toLocaleDateString()} - {new Date(req.to).toLocaleDateString()}</p>
                                        <p className="text-[10px] text-slate-500 font-black">{req.days} Day(s)</p>
                                    </td>
                                    <td className="px-10 py-8 max-w-xs"><p className="text-sm text-slate-600 truncate italic" title={req.reason}>&quot;{req.reason}&quot;</p></td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleLeaveAction(req.id, 'Approved')} className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all transform active:scale-90"><Check className="w-5 h-5"/></button>
                                            <button onClick={() => handleLeaveAction(req.id, 'Rejected')} className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200 hover:bg-rose-100 transition-all transform active:scale-90"><X className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100">
                    {pending.map((req, i) => (
                        <div key={i} className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-base border border-indigo-100 shadow-sm">{req.employeeName.charAt(0)}</div>
                                    <div>
                                        <p className="font-black text-slate-900 text-sm tracking-tight">{req.employeeName}</p>
                                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">ID: {req.employeeId}</p>
                                    </div>
                                </div>
                                <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[8px] font-black uppercase rounded-md border border-rose-100">{req.type}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Duration</p>
                                    <p className="font-bold text-slate-900 text-[10px]">{new Date(req.from).toLocaleDateString()} - {new Date(req.to).toLocaleDateString()}</p>
                                    <p className="text-[8px] text-slate-500 font-black">{req.days} Day(s)</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Reason</p>
                                    <p className="text-[10px] text-slate-600 italic line-clamp-2">&quot;{req.reason}&quot;</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => handleLeaveAction(req.id, 'Approved')} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"><Check className="w-3 h-3"/> Approve</button>
                                <button onClick={() => handleLeaveAction(req.id, 'Rejected')} className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"><X className="w-3 h-3"/> Reject</button>
                            </div>
                        </div>
                    ))}
                </div>

                {pending.length === 0 && (
                    <div className="py-24 text-center text-slate-400 italic"><div className="flex flex-col items-center gap-2"><CheckCircle className="w-12 h-12 opacity-20" /><p className="font-black uppercase tracking-widest text-xs">No pending leave requests</p></div></div>
                )}
            </div>

            <div className="bg-white rounded-3xl md:rounded-[3rem] border border-slate-200 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-500" />
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Leave Processing History</h4>
                </div>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100">
                            <tr><th className="px-10 py-5">Staff Member</th><th className="px-10 py-5">Type</th><th className="px-10 py-5">Dates</th><th className="px-10 py-5 text-center">Result</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.slice(0, 10).map((req, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-10 py-5 font-bold text-slate-900">{req.employeeName}</td>
                                    <td className="px-10 py-5 text-slate-600 font-medium">{req.type}</td>
                                    <td className="px-10 py-5 text-slate-500">{req.from} → {req.to}</td>
                                    <td className="px-10 py-5 text-center">
                                        <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest ${req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{req.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Mobile History View */}
                <div className="md:hidden divide-y divide-slate-100">
                    {history.slice(0, 5).map((req, i) => (
                        <div key={i} className="p-4 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-900 text-[10px]">{req.employeeName}</p>
                                <p className="text-[8px] text-slate-500">{req.from} → {req.to}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full font-black text-[8px] uppercase tracking-widest ${req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{req.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderDailyStatus = () => (
    <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden animate-in fade-in duration-500">
        <div className="p-8 md:p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/50">
                    <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Calendar className="w-5 h-5" /></div>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none outline-none font-black text-slate-900 text-sm appearance-none cursor-pointer" />
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="flex gap-2">
                    <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black border border-emerald-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> {dashboardStats.present} Present
                    </span>
                    <span className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-black border border-rose-100">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div> {dashboardStats.absent} Absent
                    </span>
                    <button 
                        onClick={() => setRefreshToggle(v => v + 1)}
                        className="p-2.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-400 hover:text-emerald-600 shadow-sm transition-all"
                        title="Recalculate Stats"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="flex gap-4">
                {isSuperAdmin && (
                    <div className="relative group">
                        <select value={filterCorporate} onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }} className="pl-12 pr-10 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px] appearance-none cursor-pointer shadow-sm">
                            <option value="All">Corporate: All</option>
                            <option value="admin">Head Office</option>
                            {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                        </select>
                        <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                )}
                <div className="relative group">
                    <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="pl-12 pr-10 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px] appearance-none cursor-pointer shadow-sm">
                        <option value="All">Branch: All</option>
                        {availableBranchesList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>
        </div>
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
                <thead className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50">
                    <tr><th className="px-10 py-8">Staff Name</th><th className="px-10 py-8">Branch / Shift</th><th className="px-10 py-8">History (Punches)</th><th className="px-10 py-8">Total Time</th><th className="px-10 py-8 text-center">Status</th><th className="px-10 py-8 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {staffDailyLogs.map((log, i) => {
                        const totalMins = calculateTotalWorkTime(log.dailyRecord.punches);
                        const durationStr = formatDuration(totalMins);
                        const punchCount = log.dailyRecord.punches?.length || 0;
                        return (
                            <tr key={i} className="hover:bg-slate-50 transition-all group">
                                <td className="px-10 py-8"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg border border-emerald-100 shadow-sm">{log.name.charAt(0)}</div><div><p className="font-black text-slate-900 tracking-tight">{log.name}</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{log.role}</p></div></div></td>
                                <td className="px-10 py-8"><p className="font-bold text-slate-700 text-sm">{log.branch || 'Head Office'}</p><p className="text-[10px] text-slate-500 font-black">{log.workingHours || '09:30 - 18:30'}</p></td>
                                <td className="px-10 py-8">
                                    <div className="flex flex-col gap-1.5">
                                        {punchCount > 0 ? (
                                            <>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase">
                                                    <ListOrdered className="w-3 h-3" /> {punchCount} Punches
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {log.dailyRecord.punches?.slice(0, 2).map((p, pi) => (
                                                        <span key={pi} className="text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                                                            {p.in} - {p.out || '...'}
                                                        </span>
                                                    ))}
                                                    {punchCount > 2 && <span className="text-[10px] text-slate-400 font-bold">+{punchCount - 2} more</span>}
                                                </div>
                                            </>
                                        ) : <span className="text-slate-400 text-sm italic">No punches</span>}
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-3">
                                        <Clock className={`w-5 h-5 ${durationStr ? 'text-emerald-600' : 'text-slate-300'}`} />
                                        <span className={`text-lg font-black ${durationStr ? 'text-slate-900' : 'text-slate-300'}`}>{durationStr || '--:--'}</span>
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-center">
                                    <span className={`inline-flex px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                        ATTENDANCE_STATUS_COLORS[log.dailyRecord.status as AttendanceStatus]?.bg || 'bg-slate-50'
                                    } ${
                                        ATTENDANCE_STATUS_COLORS[log.dailyRecord.status as AttendanceStatus]?.text || 'text-slate-400'
                                    } ${
                                        ATTENDANCE_STATUS_COLORS[log.dailyRecord.status as AttendanceStatus]?.border || 'border-slate-200'
                                    }`}>
                                        {log.dailyRecord.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-10 py-8 text-right"><button onClick={() => handleEditClick(log.dailyRecord, log.id)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-emerald-600 transition-all border border-transparent hover:border-slate-200 hover:shadow-md"><Edit2 className="w-5 h-5" /></button></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
            {staffDailyLogs.map((log, i) => {
                const totalMins = calculateTotalWorkTime(log.dailyRecord.punches);
                const durationStr = formatDuration(totalMins);
                const punchCount = log.dailyRecord.punches?.length || 0;
                return (
                    <div key={i} className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-base border border-emerald-100 shadow-sm">{log.name.charAt(0)}</div>
                                <div>
                                    <p className="font-black text-slate-900 text-sm tracking-tight">{log.name}</p>
                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{log.role}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm ${
                                ATTENDANCE_STATUS_COLORS[log.dailyRecord.status as AttendanceStatus]?.bg || 'bg-slate-100'
                            } ${
                                ATTENDANCE_STATUS_COLORS[log.dailyRecord.status as AttendanceStatus]?.text || 'text-slate-500'
                            } ${
                                ATTENDANCE_STATUS_COLORS[log.dailyRecord.status as AttendanceStatus]?.border || 'border-slate-200'
                            }`}>
                                {log.dailyRecord.status.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Branch / Shift</p>
                                <p className="font-bold text-slate-700 text-[10px]">{log.branch || 'Head Office'}</p>
                                <p className="text-[8px] text-slate-400 font-black">{log.workingHours || '09:30 - 18:30'}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Time</p>
                                <div className="flex items-center gap-1.5">
                                    <Clock className={`w-3 h-3 ${durationStr ? 'text-emerald-500' : 'text-slate-300'}`} />
                                    <span className={`text-[10px] font-black ${durationStr ? 'text-slate-900' : 'text-slate-400'}`}>{durationStr || '--:--'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ListOrdered className="w-3 h-3 text-indigo-500" />
                                <span className="text-[10px] font-black text-indigo-500 uppercase">{punchCount} Punches</span>
                            </div>
                            <button onClick={() => handleEditClick(log.dailyRecord, log.id)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-emerald-600 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"><Edit2 className="w-3 h-3" /> Edit</button>
                        </div>
                    </div>
                );
            })}
        </div>

        {staffDailyLogs.length === 0 && (
            <div className="py-32 text-center"><div className="flex flex-col items-center gap-4 text-slate-600"><Users className="w-16 h-16 opacity-20" /><p className="font-black uppercase tracking-[0.3em] text-sm">No staff records found for this criteria.</p></div></div>
        )}
    </div>
  );

  const renderMonthlyCalendar = () => (
    <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-indigo-900/10 overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-6 md:p-12 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative overflow-hidden">
            {/* Decorative background icon */}
            <Calendar className="absolute -right-10 -bottom-10 w-48 h-48 opacity-10 rotate-12" />
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto relative z-10">
                {isAdmin && (
                    <div className="relative group w-full sm:w-auto">
                        <select value={selectedEmployee?.id} onChange={(e) => setSelectedEmployee(employees.find(emp => emp.id === e.target.value) || null)} className="w-full sm:w-auto pl-6 pr-12 py-3 md:py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl md:rounded-[1.5rem] text-xs md:text-sm font-black text-white outline-none focus:ring-2 focus:ring-white/30 min-w-[200px] md:min-w-[220px] appearance-none cursor-pointer shadow-sm transition-all hover:bg-white/20">
                            {filteredStaffList.map(emp => <option key={emp.id} value={emp.id} className="text-slate-900">{emp.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/60 pointer-events-none group-hover:text-white transition-colors" />
                    </div>
                )}
                <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl md:rounded-[1.5rem] p-1 md:p-1.5 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
                    <button onClick={handlePrevMonth} className="p-2 md:p-3 hover:bg-white/20 rounded-lg md:rounded-xl transition-all text-white/60 hover:text-white"><ChevronLeft className="w-5 h-5 md:w-6 md:h-6"/></button>
                    <span className="px-2 md:px-6 text-[10px] md:text-sm font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-white min-w-[120px] md:min-w-[200px] text-center">{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={handleNextMonth} className="p-2 md:p-3 hover:bg-white/20 rounded-lg md:rounded-xl transition-all text-white/60 hover:text-white"><ChevronRight className="w-5 h-5 md:w-6 md:h-6"/></button>
                </div>
            </div>
            {isAdmin && selectedEmployee && (
                <div className="flex flex-wrap justify-center gap-2 relative z-10">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleUndo()}
                            disabled={historyIndex <= 0}
                            className={`p-2 md:p-3 rounded-xl md:rounded-2xl border transition-all shadow-sm ${historyIndex > 0 ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'}`}
                            title="Undo"
                        >
                            <Undo className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        <button 
                            onClick={() => handleRedo()}
                            disabled={historyIndex >= history.length - 1}
                            className={`p-2 md:p-3 rounded-xl md:rounded-2xl border transition-all shadow-sm ${historyIndex < history.length - 1 ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'}`}
                            title="Redo"
                        >
                            <Redo className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                    </div>
                    <div className="hidden sm:block h-8 md:h-10 w-px bg-white/20 mx-1 md:mx-2"></div>
                    <button onClick={() => handleMarkStatusRange(AttendanceStatus.PRESENT)} className="px-3 md:px-5 py-2 md:py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-emerald-400 hover:border-emerald-500 transition-all flex items-center gap-1 md:gap-2 shadow-lg shadow-emerald-900/20"><CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden xs:inline">Present</span></button>
                    <button onClick={() => handleMarkStatusRange(AttendanceStatus.ABSENT)} className="px-3 md:px-5 py-2 md:py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-rose-400 hover:border-rose-500 transition-all flex items-center gap-1 md:gap-2 shadow-lg shadow-rose-900/20"><XCircle className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden xs:inline">Absent</span></button>
                </div>
            )}
        </div>
        <div className="p-4 md:p-12">
            <div className="grid grid-cols-7 gap-2 md:gap-4 bg-transparent">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
                    <div key={day} className={`py-4 md:py-8 text-center text-[8px] md:text-[12px] font-black tracking-[0.1em] md:tracking-[0.3em] ${i === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{day}</div>
                ))}
                {Array.from({ length: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay() }).map((_, i) => <div key={`pad-${i}`} className="min-h-[60px] md:min-h-[180px] opacity-0"></div>)}
                {attendanceData.map((day, idx) => {
                    const dayOfWeek = new Date(day.date).getDay();
                    const isSunday = dayOfWeek === 0;
                    const isCustomWeekOff = selectedEmployee?.weekOff === new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' });
                    const isWeekend = isSunday || isCustomWeekOff;
                    
                    const isToday = day.date === todayDateStr;
                    const totalMins = calculateTotalWorkTime(day.punches);
                    const durationStr = formatDuration(totalMins);
                    const punchCount = day.punches?.length || 0;
                                      // Dynamic Color Logic
                    const statusColors = ATTENDANCE_STATUS_COLORS[day.status as AttendanceStatus] || ATTENDANCE_STATUS_COLORS[AttendanceStatus.NOT_MARKED];
                    let cellStyle = statusColors.cell;
                    let badgeStyle = statusColors.badge;
                    let statusText = day.status.replace('_', ' ');

                    if (day.status === AttendanceStatus.NOT_MARKED) {
                         if (day.date <= todayDateStr && !isWeekend) {
                            cellStyle = "bg-gradient-to-br from-rose-400 to-rose-600 text-white border-rose-300";
                            badgeStyle = "bg-white/20 text-white border-white/30";
                            statusText = "ABSENT (N/A)";
                         } else if (isWeekend) {
                            cellStyle = "bg-gradient-to-br from-slate-300 to-slate-500 text-white border-slate-200";
                            badgeStyle = "bg-white/20 text-white border-white/30";
                            statusText = "WEEK OFF";
                         }
                    }

                    return (
                        <div key={idx} onClick={() => handleEditClick(day)} className={`p-2 md:p-4 min-h-[100px] md:min-h-[200px] flex flex-col gap-2 md:gap-4 relative transition-all border-2 group hover:scale-[1.02] hover:z-10 duration-300 rounded-2xl md:rounded-[2rem] shadow-sm hover:shadow-xl ${cellStyle} ${isToday ? 'ring-4 ring-emerald-500/30 z-10' : ''} ${isAdmin ? 'cursor-pointer' : ''}`}>
                            <div className="flex justify-between items-start z-10">
                                <div className={`w-8 h-8 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-sm md:text-3xl font-black shadow-inner ${day.status === AttendanceStatus.NOT_MARKED && !isWeekend && day.date > todayDateStr ? 'bg-slate-100 text-slate-900' : 'bg-white/20 text-white'}`}>
                                    {new Date(day.date).getDate()}
                                </div>
                                {statusText && (
                                    <span className={`text-[6px] md:text-[10px] font-black px-1.5 md:px-3 py-0.5 md:py-1 rounded-lg tracking-tighter md:tracking-widest uppercase border backdrop-blur-md ${badgeStyle} hidden xs:block`}>
                                        {statusText.length > 10 ? statusText.substring(0, 8) + '..' : statusText}
                                    </span>
                                )}
                            </div>
                            
                            {punchCount > 0 && (
                                <div className="mt-auto space-y-1 md:space-y-2 p-2 md:p-4 bg-white/10 backdrop-blur-md rounded-xl md:rounded-[1.5rem] border border-white/20 text-[8px] md:text-[11px] font-black transition-all group-hover:bg-white/20 z-10 text-white">
                                    <div className="flex items-center justify-between opacity-90">
                                        <div className="flex items-center gap-1 md:gap-1.5"><ArrowRightLeft className="w-2 h-2 md:w-3 md:h-3" /><span>{punchCount} <span className="hidden sm:inline">Punches</span></span></div>
                                    </div>
                                    <div className="pt-1 border-t border-white/10 flex items-center justify-between opacity-90">
                                        <div className="flex items-center gap-1 md:gap-1.5"><Clock className="w-2 h-2 md:w-3 md:h-3" /><span>{durationStr || '0h 0m'}</span></div>
                                    </div>
                                </div>
                            )}
                            {isToday && <div className="absolute top-2 right-2 md:top-6 md:right-6 w-1.5 h-1.5 md:w-3 md:h-3 rounded-full bg-white animate-ping z-10"></div>}
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );

  return (
    <div className="max-w-full mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2 md:p-3 bg-emerald-50 rounded-xl md:rounded-2xl border border-emerald-100">
            <Calendar className="w-6 h-6 md:w-8 md:h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter">Attendance Dashboard</h2>
            <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-widest">
              {isAdmin ? "Track monthly shift and performance" : `Your Shift: ${selectedEmployee?.workingHours || '09:30 - 18:30'}`}
            </p>
          </div>
        </div>
        <div className="flex bg-slate-50 p-1 rounded-xl md:rounded-2xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
            {['Dashboard', 'Daily Status', 'Leave Requests'].map((tab) => {
                if (!isAdmin && (tab === 'Daily Status' || tab === 'Leave Requests')) return null;
                return (
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab as 'Dashboard' | 'Daily Status' | 'Leave Requests')} 
                        className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? 'bg-white shadow-sm text-emerald-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab === 'Daily Status' ? <Timer className="w-3 h-3 md:w-4 md:h-4" /> : tab === 'Leave Requests' ? <Plane className="w-3 h-3 md:w-4 md:h-4" /> : null}
                        {tab}
                        {tab === 'Leave Requests' && dashboardStats.pendingLeaves > 0 && (
                            <span className="bg-rose-500 text-white text-[8px] md:text-[10px] font-bold px-1 md:px-1.5 py-0.5 rounded-full animate-pulse">{dashboardStats.pendingLeaves}</span>
                        )}
                    </button>
                );
            })}
        </div>
      </div>

      <div className="space-y-6 md:space-y-8 animate-in zoom-in-95 duration-500">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {[
                  { 
                      label: isAdmin && activeTab !== 'Dashboard' ? 'TOTAL STAFF' : 'WORKING DAYS', 
                      val: dashboardStats.total, 
                      icon: Users, 
                      gradient: 'from-indigo-600 to-indigo-800',
                      shadow: 'shadow-indigo-900/20'
                  },
                  { 
                      label: 'PRESENT', 
                      val: dashboardStats.present, 
                      icon: UserCheck, 
                      gradient: 'from-emerald-500 to-emerald-700',
                      shadow: 'shadow-emerald-900/20'
                  },
                  { 
                      label: 'ABSENT', 
                      val: dashboardStats.absent, 
                      icon: UserX, 
                      gradient: 'from-rose-500 to-rose-700',
                      shadow: 'shadow-rose-900/20'
                  },
                  { 
                      label: 'ON FIELD', 
                      val: dashboardStats.onField, 
                      icon: Send, 
                      gradient: 'from-blue-500 to-blue-700',
                      shadow: 'shadow-blue-900/20'
                  },
                  { 
                      label: 'LATE', 
                      val: dashboardStats.late, 
                      icon: Clock, 
                      gradient: 'from-orange-500 to-orange-700',
                      shadow: 'shadow-orange-900/20'
                  },
                  { 
                      label: 'HALF DAY', 
                      val: dashboardStats.halfDay, 
                      icon: Activity, 
                      gradient: 'from-amber-500 to-amber-700',
                      shadow: 'shadow-amber-900/20'
                  },
                  { 
                      label: 'HOLIDAY', 
                      val: dashboardStats.holidays, 
                      icon: CalendarDays, 
                      gradient: 'from-violet-500 to-violet-700',
                      shadow: 'shadow-violet-900/20'
                  },
                  { 
                      label: 'WEEK OFF', 
                      val: dashboardStats.weekOff, 
                      icon: Coffee, 
                      gradient: 'from-cyan-500 to-cyan-700',
                      shadow: 'shadow-cyan-900/20'
                  },
                  { 
                      label: 'LEAVE', 
                      val: dashboardStats.leave, 
                      icon: UserMinus, 
                      gradient: 'from-slate-500 to-slate-700',
                      shadow: 'shadow-slate-900/20'
                  },
              ].map((kpi, i) => (
                  <div key={i} className={`bg-gradient-to-br ${kpi.gradient} p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-xl ${kpi.shadow} relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 h-32 md:h-40 flex flex-col justify-between`}>
                      <div className="relative z-10 flex justify-between items-start">
                          <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{kpi.label}</p>
                          <div className="p-2 bg-white/20 rounded-xl w-fit">
                              <kpi.icon className="w-4 h-4" />
                          </div>
                      </div>
                      <div className="relative z-10">
                          <h3 className="text-2xl md:text-4xl font-black tracking-tighter">{kpi.val}</h3>
                      </div>
                      <kpi.icon className="absolute -right-4 -bottom-4 w-16 h-16 md:w-24 md:h-24 opacity-[0.08] group-hover:scale-110 transition-transform duration-700" />
                  </div>
              ))}
          </div>
          
          {activeTab === 'Dashboard' && (
              <>
                  {!isAdmin && selectedEmployee && (
                      <div className="bg-white rounded-[4rem] shadow-xl border border-slate-200 overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-600 transition-all duration-700 group-hover:h-6"></div>
                        <div className="p-6 md:p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16">
                            <div className="text-center md:text-left space-y-6 md:space-y-10 w-full">
                                <div className="space-y-2">
                                    <h3 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">
                                        Hello, {(localStorage.getItem('logged_in_employee_name') || selectedEmployee?.name || 'User').split(' ')[0]}! 👋
                                    </h3>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-[12px]">Welcome to your attendance portal</p>
                                </div>
                                
                <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full sm:w-auto">
                                        <div className="flex items-center gap-4 md:gap-8 bg-slate-50 px-6 md:px-10 py-4 md:py-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-inner w-full sm:w-auto justify-center sm:justify-start">
                                            <div className="p-2 md:p-4 bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-200">
                                                <Clock className="w-6 h-6 md:w-10 md:h-10 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1">Server Time</p>
                                                <span className="text-3xl md:text-5xl font-black font-mono text-slate-900 tracking-tighter tabular-nums">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>

                                        {/* Live Tracking Toggle */}
                                        <div className={`flex items-center gap-4 md:gap-6 px-6 md:px-8 py-4 md:py-6 rounded-2xl md:rounded-[2.5rem] border transition-all duration-500 w-full sm:w-auto justify-center sm:justify-start ${isTracking ? 'bg-indigo-50 border-indigo-100 shadow-indigo-100/20' : 'bg-slate-50 border-slate-100 shadow-inner'}`}>
                                            <div className={`p-2 md:p-4 rounded-xl md:rounded-2xl shadow-sm border transition-colors ${isTracking ? 'bg-white text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                <MapIcon className={`w-6 h-6 md:w-8 md:h-8 ${isTracking ? 'animate-pulse' : ''}`} />
                                            </div>
                                            <div className="flex flex-col gap-1 md:gap-2">
                                                <div>
                                                    <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1">Live Tracking</p>
                                                    <span className={`text-[10px] md:text-sm font-black uppercase tracking-widest ${isTracking ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                        {isTracking ? 'ACTIVE' : 'INACTIVE'}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => handleTrackingToggle()}
                                                    className={`flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all transform active:scale-95 ${
                                                        isTracking 
                                                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' 
                                                        : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                                    }`}
                                                >
                                                    <Power className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                                    {isTracking ? 'Stop Tracking' : 'Start Tracking'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {(!selectedEmployee?.relievingDate || new Date().setHours(0,0,0,0) <= new Date(selectedEmployee.relievingDate).setHours(0,0,0,0)) ? (
                                        <div className="relative group">
                                            <div className={`absolute -inset-4 md:-inset-6 rounded-full blur-xl md:blur-2xl transition-all duration-500 ${isPunching ? 'bg-indigo-500/20 opacity-100 scale-110' : isPunchedIn ? 'bg-rose-500/10 opacity-50' : 'bg-emerald-500/10 opacity-50'}`}></div>
                                            <button 
                                                onClick={() => handlePunchAction(isPunchedIn ? 'Out' : 'In')}
                                                disabled={isPunching}
                                                className={`relative z-10 w-32 h-32 md:w-48 md:h-48 rounded-full flex flex-col items-center justify-center gap-2 md:gap-4 transition-all transform active:scale-90 border-4 ${
                                                    isPunching ? 'bg-indigo-600 border-indigo-700 shadow-indigo-600/20 cursor-wait' :
                                                    isPunchedIn ? 'bg-rose-600 border-rose-700 shadow-2xl shadow-rose-600/20' : 'bg-emerald-600 border-emerald-700 shadow-2xl shadow-emerald-600/20'
                                                }`}
                                            >
                                                {isPunching ? (
                                                    <div className="flex flex-col items-center gap-2 md:gap-3">
                                                        <div className="relative">
                                                            <Fingerprint className="w-10 h-10 md:w-16 md:h-16 text-white animate-pulse" />
                                                            <div className="absolute inset-0 border-2 md:border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        </div>
                                                        <span className="text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest">Scanning...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Fingerprint className="w-10 h-10 md:w-16 md:h-16 text-white group-hover:scale-110 transition-transform duration-500" />
                                                        <span className="text-white text-[10px] md:text-xs font-black uppercase tracking-widest">{isPunchedIn ? 'Punch Out' : 'Punch In'}</span>
                                                    </>
                                                )}
                                            </button>
                                            {!isPunching && (
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 md:mt-6 w-full text-center animate-in fade-in slide-in-from-top-2">
                                                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Authenticated via</p>
                                                    <div className="flex items-center justify-center gap-1.5 md:gap-2 text-emerald-600 font-bold text-[10px] md:text-xs bg-emerald-50 px-3 md:px-4 py-1 md:py-1.5 rounded-full inline-flex border border-emerald-100">
                                                        <Shield className="w-3 h-3 md:w-3.5 md:h-3.5" /> Biometric Identity
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-rose-50 border border-rose-100 p-6 md:p-8 rounded-2xl md:rounded-[3rem] text-center max-w-xs animate-in zoom-in duration-300">
                                            <AlertTriangle className="w-8 h-8 md:w-12 md:h-12 text-rose-500 mx-auto mb-4" />
                                            <p className="text-rose-900 font-black text-xs md:text-sm uppercase tracking-tighter">Attendance Disabled</p>
                                            <p className="text-rose-600 text-[8px] md:text-[10px] font-bold mt-1 uppercase tracking-[0.2em]">Employee Relieved on {selectedEmployee.relievingDate}</p>
                                        </div>
                                    )}
                                </div>
                            <div className="hidden lg:block relative">
                                <div className="w-80 h-80 rounded-[4rem] bg-slate-50 flex items-center justify-center border-2 border-slate-100 shadow-inner relative overflow-hidden group-hover:border-emerald-100 transition-colors duration-700">
                                    <Zap className={`w-32 h-32 transition-all duration-700 ${isPunching ? 'text-indigo-400 scale-110' : isPunchedIn ? 'text-rose-100' : 'text-emerald-100'}`} />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent"></div>
                                    <div className="absolute inset-4 border border-dashed border-slate-200 rounded-full animate-[spin_20s_linear_infinite]"></div>
                                    <div className="absolute top-1/2 left-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                  )}
                  {renderMonthlyCalendar()}
              </>
          )}

          {activeTab === 'Daily Status' && isAdmin && renderDailyStatus()}
          {activeTab === 'Leave Requests' && isAdmin && renderLeaveRequests()}
      </div>

      {isEditModalOpen && editingRecord && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Modify Attendance - {editingRecord.date}</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900"><X className="w-6 h-6"/></button>
                </div>
                <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => {
                                setEditingRecord({
                                    ...editingRecord,
                                    status: AttendanceStatus.PRESENT,
                                    punches: editingRecord.punches?.length === 0 ? [{ in: '09:30 AM', out: '06:30 PM' }] : editingRecord.punches
                                });
                            }}
                            className={`py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${editingRecord.status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}
                        >
                            <CheckCircle className="w-4 h-4" /> Present
                        </button>
                        <button 
                            onClick={() => {
                                setEditingRecord({
                                    ...editingRecord,
                                    status: AttendanceStatus.ABSENT,
                                    punches: []
                                });
                            }}
                            className={`py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${editingRecord.status === AttendanceStatus.ABSENT ? 'bg-rose-600 text-white border-rose-600 shadow-lg' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}`}
                        >
                            <XCircle className="w-4 h-4" /> Absent
                        </button>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-1">Detailed Status Select</label>
                        <div className="relative group">
                            <select value={editingRecord.status} onChange={(e) => setEditingRecord({...editingRecord, status: e.target.value as AttendanceStatus})} className="w-full px-6 py-5 bg-white border border-slate-200 rounded-[1.75rem] text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 appearance-none cursor-pointer shadow-sm transition-all">
                                <option value={AttendanceStatus.PRESENT}>PRESENT</option>
                                <option value={AttendanceStatus.ABSENT}>ABSENT</option>
                                <option value={AttendanceStatus.HALF_DAY}>HALF DAY</option>
                                <option value={AttendanceStatus.PAID_LEAVE}>PAID LEAVE</option>
                                <option value={AttendanceStatus.WEEK_OFF}>WEEK OFF</option>
                                <option value={AttendanceStatus.HOLIDAY}>HOLIDAY</option>
                                <option value={AttendanceStatus.ALTERNATE_DAY}>ALTERNATE WORKING DAY</option>
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 pointer-events-none group-hover:text-emerald-600" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <History className="w-3 h-3" /> Punch Logs
                        </label>
                        {(editingRecord.punches || []).length > 0 ? (
                            <div className="space-y-3">
                                {editingRecord.punches?.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-left-2 transition-all">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">{idx + 1}</div>
                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Punch In</label>
                                                <input 
                                                    type="time" 
                                                    value={convertTo24Hour(p.in)} 
                                                    onChange={e => {
                                                        const punches = [...(editingRecord.punches || [])];
                                                        punches[idx].in = convertTo12Hour(e.target.value);
                                                        setEditingRecord({...editingRecord, punches});
                                                    }}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500/10"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-rose-600 uppercase tracking-widest block mb-1">Punch Out</label>
                                                <input 
                                                    type="time" 
                                                    value={convertTo24Hour(p.out)} 
                                                    onChange={e => {
                                                        const punches = [...(editingRecord.punches || [])];
                                                        punches[idx].out = convertTo12Hour(e.target.value);
                                                        setEditingRecord({...editingRecord, punches});
                                                    }}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-rose-600 outline-none focus:ring-2 focus:ring-rose-500/10"
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const punches = editingRecord.punches?.filter((_, i) => i !== idx);
                                                setEditingRecord({...editingRecord, punches});
                                            }}
                                            className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400">
                                <Fingerprint className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                <p className="text-xs font-black uppercase tracking-widest">No punch logs</p>
                            </div>
                        )}
                        <button 
                            onClick={() => {
                                const punches = editingRecord.punches || [];
                                punches.push({ in: '09:30 AM', out: '06:30 PM' });
                                setEditingRecord({...editingRecord, punches});
                            }}
                            className="w-full py-3 bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-xl border border-dashed border-slate-200 hover:border-emerald-200 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <Plus className="w-3 h-3" /> Add Log Entry
                        </button>
                    </div>

                    <div className="pt-8 flex gap-5 border-t border-slate-100">
                        <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[1.75rem] font-black text-sm hover:bg-slate-200 transition-all active:scale-95 shadow-sm border border-slate-200">Cancel</button>
                        <button onClick={handleSaveChanges} className="flex-[1.5] py-5 bg-emerald-600 text-white rounded-[1.75rem] font-black text-sm shadow-2xl shadow-emerald-600/40 hover:bg-emerald-700 transition-all transform hover:scale-[1.02] active:scale-95">Save Update</button>
                    </div>
                </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default UserAttendance;
