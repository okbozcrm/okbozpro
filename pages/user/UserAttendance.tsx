
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, List, CheckCircle, XCircle, 
  User, MapPin, Clock, Fingerprint, Download, X, 
  PieChart as PieChartIcon, Activity, ScanLine, Loader2, Navigation,
  Phone, DollarSign, Plane, Briefcase, Filter, Search, FileText, Save,
  QrCode, Crosshair, AlertTriangle, ShieldCheck, ChevronDown, Laptop, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, DailyAttendance, Employee, Branch } from '../../types';

interface UserAttendanceProps {
  isAdmin?: boolean;
}

// Helper to calculate distance in meters (Haversine Formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const d = R * c; // in metres
    return d;
};

// Helper to calculate working hours string
const calculateWorkingHours = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return null;
    
    // Parse times (assuming format "HH:MM AM/PM" or similar, handled by Date parser if complete date, but these are just time strings)
    // We'll use a dummy date for calculation
    const d1 = new Date(`2000/01/01 ${checkIn}`);
    const d2 = new Date(`2000/01/01 ${checkOut}`);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;

    let diffMs = d2.getTime() - d1.getTime();
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // Handle cross-midnight if necessary, though simplistic

    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.round(((diffMs % 3600000) / 60000));

    return `${diffHrs}h ${diffMins}m`;
};

const UserAttendance: React.FC<UserAttendanceProps> = ({ isAdmin = false }) => {
  // --- State ---
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<any[]>([]); // Use any to allow flexible structure
  const [viewMode, setViewMode] = useState<'Calendar' | 'Report'>('Calendar');

  // --- Location / Punching State ---
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distanceToBranch, setDistanceToBranch] = useState<number | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // --- Edit Modal State (Admin) ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<DailyAttendance | null>(null);
  const [editForm, setEditForm] = useState({
    status: '',
    checkIn: '',
    checkOut: ''
  });

  // determine session
  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = currentSessionId === 'admin';

  // --- Data Loading ---
  useEffect(() => {
    // Load Branches
    const loadBranches = () => {
        let allBranches: any[] = [];
        if (isSuperAdmin) {
            const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
            allBranches = [...adminBranches];
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
                const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
                allBranches = [...allBranches, ...cBranches];
            });
        } else {
            const key = `branches_data_${currentSessionId}`; // Assuming corporate login or employee mapped to corporate data
            // For employee, we might need to search across, but typically employee logs in and their data is fetched.
            // Simplified: Try loading from session key first.
            const saved = localStorage.getItem(key);
            if (saved) allBranches = JSON.parse(saved);
            
            // Fallback for employee: if no direct branch data, load global admin branches (or appropriate logic)
            // In a real app, API handles this. Here we try to find the branch the employee belongs to.
            if (allBranches.length === 0) {
                 const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
                 allBranches = [...adminBranches];
            }
        }
        setBranches(allBranches);
    };
    loadBranches();

    // Load Employees
    if (isAdmin) {
        let allStaff: Employee[] = [];
        if (isSuperAdmin) {
            const adminData = localStorage.getItem('staff_data');
            if (adminData) {
                try { allStaff = [...allStaff, ...JSON.parse(adminData)]; } catch(e) {}
            }
            // Add Corporate Staff
            try {
                const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
                corps.forEach((c: any) => {
                    const cData = localStorage.getItem(`staff_data_${c.email}`);
                    if(cData) allStaff = [...allStaff, ...JSON.parse(cData)];
                });
            } catch(e) {}
            
            if (allStaff.length === 0) allStaff = MOCK_EMPLOYEES;
        } else {
            const key = `staff_data_${currentSessionId}`;
            const saved = localStorage.getItem(key);
            if(saved) allStaff = JSON.parse(saved);
        }
        setEmployees(allStaff);
        if (allStaff.length > 0 && !selectedEmployee) setSelectedEmployee(allStaff[0]);
    } else {
        // Employee View: Load Self
        const loadSelf = () => {
             // 1. Try finding in admin list
             const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
             let found = adminStaff.find((e: any) => e.id === currentSessionId);
             
             // 2. Try corporate lists if not found
             if (!found) {
                 const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
                 for (const c of corps) {
                     const cData = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
                     found = cData.find((e: any) => e.id === currentSessionId);
                     if (found) break;
                 }
             }
             
             setSelectedEmployee(found || MOCK_EMPLOYEES[0]);
        };
        loadSelf();
    }
  }, [isAdmin, isSuperAdmin, currentSessionId]);

  // Load Attendance
  useEffect(() => {
      if (!selectedEmployee) return;
      
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
      
      const saved = localStorage.getItem(key);
      if (saved) {
          setAttendanceData(JSON.parse(saved));
      } else {
          // Generate Fresh
          const generated = getEmployeeAttendance(selectedEmployee, year, month);
          setAttendanceData(generated);
      }
  }, [selectedEmployee, selectedMonth]);

  // --- Helper: Update Global Live Location ---
  // This updates the shared `active_staff_locations` key used by the Admin Live Tracking page
  const updateGlobalLiveLocation = (pos: GeolocationPosition) => {
      if (!selectedEmployee) return;

      // Determine owner ID (Corporate ID) for filtering on Admin side
      // If employee object has an ownerId or franchiseId, use it. Otherwise, assume Admin or try to find it.
      let ownerId = (selectedEmployee as any).owner || (selectedEmployee as any).franchiseId;
      
      // Fallback: If logged in as employee, check storage for saved corporate ID
      if (!ownerId && !isAdmin) {
          ownerId = localStorage.getItem('logged_in_employee_corporate_id') || 'admin';
      }
      if (!ownerId) ownerId = 'admin';

      const liveData = JSON.parse(localStorage.getItem('active_staff_locations') || '[]');
      
      // Remove existing entry for this employee to update it
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

  // --- Geolocation Logic ---
  const updateLocationAndCheckGeofence = () => {
      if (!navigator.geolocation) {
          setLocationError("Geolocation is not supported by your browser.");
          return;
      }
      
      setIsLocating(true);

      const successHandler = (position: GeolocationPosition) => {
          setCurrentLocation(position);
          setLocationError(null);
          setIsLocating(false);

          // 1. Update Global Tracking if enabled
          if (selectedEmployee?.liveTracking) {
              updateGlobalLiveLocation(position);
          }

          // 2. Check Geofence
          if (selectedEmployee && selectedEmployee.branch) {
              const branch = branches.find(b => b.name === selectedEmployee.branch);
              
              if (branch) {
                  const dist = calculateDistance(
                      position.coords.latitude, 
                      position.coords.longitude, 
                      branch.lat, 
                      branch.lng
                  );
                  setDistanceToBranch(dist);
                  const radius = parseInt(branch.radius) || 100; // Default 100m
                  setIsWithinGeofence(dist <= radius);
              } else {
                  setDistanceToBranch(null);
                  setIsWithinGeofence(false); 
              }
          }
      };

      const errorHandler = (error: GeolocationPositionError) => {
           // Fallback: If high accuracy fails (Code 2 or 3), try low accuracy
           if (error.code === 2 || error.code === 3) {
               console.warn("High accuracy geolocation failed. Retrying with low accuracy...");
               navigator.geolocation.getCurrentPosition(
                   successHandler,
                   (secondError) => {
                       setIsLocating(false);
                       let msg = "Unable to retrieve location.";
                       if (secondError.code === 1) msg = "Location permission denied. Please enable GPS.";
                       else if (secondError.code === 2) msg = "Position unavailable. Ensure GPS/Wi-Fi is on.";
                       else if (secondError.code === 3) msg = "Location request timed out.";
                       setLocationError(msg);
                       console.error("Geolocation Error (Fallback):", secondError.message, `(Code: ${secondError.code})`);
                   },
                   { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
               );
               return;
           }

          setIsLocating(false);
          let msg = "Unable to retrieve location.";
          if (error.code === 1) msg = "Location permission denied. Please enable GPS.";
          else if (error.code === 2) msg = "Location unavailable.";
          else if (error.code === 3) msg = "Location request timed out.";
          setLocationError(msg);
          console.error("Geolocation Error:", error.message, `(Code: ${error.code})`);
      };

      // Initial High Accuracy Attempt
      navigator.geolocation.getCurrentPosition(
          successHandler,
          errorHandler,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
  };

  // Poll location if necessary
  useEffect(() => {
      const config = selectedEmployee?.attendanceConfig;
      // We check location if:
      // 1. Live Tracking is ON
      // 2. OR Manual Punch is ON AND Mode is 'Branch' (Geofencing Required)
      // 3. OR simply to provide coordinates for "Work from Anywhere" mode punches
      const needLocation = selectedEmployee && (
          selectedEmployee.liveTracking || 
          (config?.gpsGeofencing) || 
          (config?.manualPunch) // Always fetch location for manual punch to allow tagging
      );

      if (needLocation) {
          updateLocationAndCheckGeofence();
          const interval = setInterval(updateLocationAndCheckGeofence, 30000); // 30s Updates
          return () => clearInterval(interval);
      }
  }, [selectedEmployee, branches]);


  // --- Punching Handlers ---

  const handlePunchAction = (type: 'In' | 'Out') => {
      if (!selectedEmployee) return;
      
      const config = selectedEmployee.attendanceConfig || { gpsGeofencing: true, qrScan: false, manualPunch: true, manualPunchMode: 'Branch' };
      
      // 1. QR Scan Check (Priority)
      if (config.qrScan && type === 'In') {
          setShowQRScanner(true);
          return; // Wait for QR scan to complete punch
      }

      // 2. Geofence Logic for Manual Punch
      const isRemoteAllowed = config.manualPunchMode === 'Anywhere' || selectedEmployee.allowRemotePunch;
      const isBranchRestricted = config.manualPunchMode === 'Branch' || config.gpsGeofencing;

      if (isBranchRestricted && !isRemoteAllowed) {
          // If we haven't determined location yet or are outside
          if (!currentLocation || !isWithinGeofence) {
              updateLocationAndCheckGeofence();
              // Immediate check state logic (might need UI feedback delay if locating)
              if (!currentLocation) {
                  alert("Locating... Please wait a moment and try again.");
                  return;
              }
              if (!isWithinGeofence) {
                  alert(`Restricted Mode: You are outside the branch radius (${distanceToBranch ? Math.round(distanceToBranch) : '?'}m). Please reach the office to punch in.`);
                  return;
              }
          }
      }

      // 3. Manual Punch (Web Button)
      performPunch(type, isRemoteAllowed ? 'Remote/Anywhere' : 'Office/Branch');
  };

  const handleQRSubmit = () => {
      if (!selectedEmployee?.branch) {
          alert("No branch assigned to employee. Cannot verify QR.");
          return;
      }

      // QR Validation Logic: Expected format "OK BOZ - [BranchName]"
      const expectedString = `OK BOZ - ${selectedEmployee.branch}`;
      
      if (qrInput.trim() === expectedString) {
          performPunch('In', 'QR Scan');
          setShowQRScanner(false);
          setQrInput('');
      } else {
          alert("Invalid QR Code. Please scan the correct branch QR.");
      }
  };

  const performPunch = (type: 'In' | 'Out', method: string) => {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const todayStr = now.toISOString().split('T')[0];

      // Update Local State & Storage
      const updatedData = [...attendanceData];
      const todayIndex = updatedData.findIndex(d => d.date === todayStr);

      if (todayIndex >= 0) {
          updatedData[todayIndex] = {
              ...updatedData[todayIndex],
              status: type === 'In' ? AttendanceStatus.PRESENT : updatedData[todayIndex].status,
              checkIn: type === 'In' ? timeString : updatedData[todayIndex].checkIn,
              checkOut: type === 'Out' ? timeString : updatedData[todayIndex].checkOut,
              isLate: type === 'In' ? (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30)) : updatedData[todayIndex].isLate // Late after 9:30 AM
          };
      } else {
          // New record for today
          updatedData.push({
              date: todayStr,
              status: AttendanceStatus.PRESENT,
              checkIn: type === 'In' ? timeString : undefined,
              checkOut: type === 'Out' ? timeString : undefined,
              isLate: type === 'In' ? (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30)) : false
          });
      }

      saveAttendanceToStorage(updatedData);
      
      // Update Live Tracking Data
      if (type === 'In' && currentLocation) {
          // Force update the live location map
          updateGlobalLiveLocation(currentLocation);
          console.log(`[LiveTrack] ${selectedEmployee?.name} punched IN. Location updated.`);
      } else if (type === 'Out') {
          // Optionally remove from live map on punch out
          // const liveData = JSON.parse(localStorage.getItem('active_staff_locations') || '[]');
          // const filtered = liveData.filter((d: any) => d.id !== selectedEmployee?.id);
          // localStorage.setItem('active_staff_locations', JSON.stringify(filtered));
      }

      alert(`Successfully Punched ${type} at ${timeString} via ${method}`);
  };

  // --- Data Helpers ---
  
  const saveAttendanceToStorage = (newData: DailyAttendance[]) => {
      if (!selectedEmployee) return;
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
      localStorage.setItem(key, JSON.stringify(newData));
      setAttendanceData(newData);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
      if (!selectedEmployee) return;
      const updated = attendanceData.map(d => {
          const dateObj = new Date(d.date);
          const today = new Date();
          if (dateObj > today) return d;
          const isOverwritable = d.status === AttendanceStatus.NOT_MARKED || d.status === AttendanceStatus.ABSENT || (status === AttendanceStatus.ABSENT && d.status === AttendanceStatus.PRESENT);
          if (isOverwritable) {
              return {
                  ...d,
                  status: status,
                  checkIn: status === AttendanceStatus.PRESENT ? '09:30 AM' : undefined,
                  checkOut: status === AttendanceStatus.PRESENT ? '06:30 PM' : undefined,
                  isLate: false
              };
          }
          return d;
      });
      saveAttendanceToStorage(updated);
  };

  // --- Modal Handlers ---
  const handleDayClick = (day: DailyAttendance) => {
      if (!isAdmin) return; 
      setEditingDay(day);
      setEditForm({
          status: day.status,
          checkIn: day.checkIn || '',
          checkOut: day.checkOut || ''
      });
      setIsEditModalOpen(true);
  };

  const handleSaveDay = () => {
      if (!editingDay) return;
      const updated = attendanceData.map(d => {
          if (d.date === editingDay.date) {
              return {
                  ...d,
                  status: editForm.status as AttendanceStatus,
                  checkIn: (editForm.status === AttendanceStatus.PRESENT || editForm.status === AttendanceStatus.HALF_DAY) ? editForm.checkIn : undefined,
                  checkOut: (editForm.status === AttendanceStatus.PRESENT || editForm.status === AttendanceStatus.HALF_DAY) ? editForm.checkOut : undefined,
                  isLate: editForm.checkIn.includes('PM') || (parseInt(editForm.checkIn) > 9 && !editForm.checkIn.startsWith('09'))
              };
          }
          return d;
      });
      saveAttendanceToStorage(updated);
      setIsEditModalOpen(false);
      setEditingDay(null);
  };

  // --- Stats Calculation ---
  const stats = useMemo(() => {
      return {
          present: attendanceData.filter(d => d.status === AttendanceStatus.PRESENT).length,
          absent: attendanceData.filter(d => d.status === AttendanceStatus.ABSENT).length,
          late: attendanceData.filter(d => d.isLate).length,
          halfDay: attendanceData.filter(d => d.status === AttendanceStatus.HALF_DAY).length,
          leave: attendanceData.filter(d => d.status === AttendanceStatus.PAID_LEAVE).length,
      };
  }, [attendanceData]);

  // --- Calendar Helpers ---
  const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay();
  const calendarGrid = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarGrid.push(null);
  attendanceData.forEach(d => calendarGrid.push(d));

  // Determine current day status for Punch Card
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayRecord = attendanceData.find(d => d.date === todayDateStr);
  const isPunchedIn = todayRecord?.checkIn && !todayRecord?.checkOut;
  const isPunchedOut = !!todayRecord?.checkOut;

  // Determine button disabled state
  const isRemoteAllowed = selectedEmployee?.attendanceConfig?.manualPunchMode === 'Anywhere' || selectedEmployee?.allowRemotePunch;
  const isGeofencingRequired = selectedEmployee?.attendanceConfig?.gpsGeofencing || selectedEmployee?.attendanceConfig?.manualPunchMode === 'Branch';
  
  // Logic: Disable if (Geofencing Required AND Not Inside AND Not Remote Allowed) AND Not Punched In yet
  // Also disable if currently Locating (loading)
  const isPunchDisabled = isLocating || (isGeofencingRequired && !isWithinGeofence && !isRemoteAllowed && !isPunchedIn);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* 1. Header & Filters */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-emerald-600" /> Attendance Management
                  </h2>
                  <p className="text-gray-500 text-sm">Monitor and manage employee attendance</p>
              </div>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-3">
                  {isAdmin && (
                      <>
                        <div className="relative">
                            <select className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[150px]">
                                <option>All Branches</option>
                                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="relative">
                            <select 
                                className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
                                value={selectedEmployee?.id || ''}
                                onChange={(e) => setSelectedEmployee(employees.find(emp => emp.id === e.target.value) || null)}
                            >
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                      </>
                  )}

                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1">
                      <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))} className="p-1 hover:bg-white rounded"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
                      <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
                          {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))} className="p-1 hover:bg-white rounded"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
                  </div>
              </div>

              <div className="flex gap-3">
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button onClick={() => setViewMode('Calendar')} className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 ${viewMode === 'Calendar' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>
                          <Calendar className="w-3.5 h-3.5" /> Calendar
                      </button>
                      <button onClick={() => setViewMode('Report')} className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 ${viewMode === 'Report' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>
                          <FileText className="w-3.5 h-3.5" /> Report
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {/* 2. PUNCH CARD (For User or Admin viewing User) */}
      {!isAdmin && selectedEmployee && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-blue-500"></div>
              <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  {/* Status & Time */}
                  <div className="text-center md:text-left">
                      <h3 className="text-lg font-bold text-gray-800 mb-1">
                          Hello, {selectedEmployee.name.split(' ')[0]}! 👋
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                          {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                          <Clock className="w-5 h-5 text-emerald-600" />
                          <span className="text-2xl font-mono font-bold text-gray-800">
                              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                      </div>
                  </div>

                  {/* Location Status & Warning Banner */}
                  <div className="flex flex-col items-center gap-3">
                      {locationError && (
                          <div className="text-red-600 text-xs flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                              <AlertTriangle className="w-4 h-4 shrink-0" /> {locationError}
                          </div>
                      )}
                      
                      {/* Geofence Status */}
                      {!locationError && isGeofencingRequired && (
                          <div className={`text-xs px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                              isWithinGeofence ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                          }`}>
                              <MapPin className="w-4 h-4 shrink-0" />
                              {isLocating ? 'Locating...' : (
                                  isWithinGeofence 
                                  ? `You are in the office zone` 
                                  : `You are ${distanceToBranch ? Math.round(distanceToBranch) : '?'}m away from branch.`
                              )}
                          </div>
                      )}

                      {/* Info Badge for Remote Users */}
                      {!isGeofencingRequired && isRemoteAllowed && (
                          <div className="text-xs px-4 py-2 rounded-lg flex items-center gap-2 font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <Globe className="w-4 h-4 shrink-0" />
                              Remote Punching Allowed
                          </div>
                      )}
                      
                      <div className="text-xs text-gray-400 flex gap-2">
                          {isGeofencingRequired && <span title="Geofencing Active" className="flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Branch Only</span>}
                          {isRemoteAllowed && <span title="Work from Anywhere" className="flex items-center gap-1"><Laptop className="w-3 h-3"/> Remote</span>}
                          {selectedEmployee.attendanceConfig?.qrScan && <span title="QR Scan Required" className="flex items-center gap-1"><QrCode className="w-3 h-3"/> QR Mode</span>}
                      </div>
                  </div>

                  {/* Punch Button */}
                  <div>
                      {!isPunchedIn ? (
                          <button 
                              onClick={() => handlePunchAction('In')}
                              disabled={isPunchDisabled || isPunchedOut} // Disable if out of range OR already punched out for the day
                              className="w-40 h-40 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-xl shadow-emerald-200 flex flex-col items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                          >
                              {selectedEmployee.attendanceConfig?.qrScan ? <QrCode className="w-10 h-10 mb-2" /> : <Fingerprint className="w-12 h-12 mb-2" />}
                              <span className="text-lg font-bold">{selectedEmployee.attendanceConfig?.qrScan ? 'Scan to In' : 'Punch In'}</span>
                          </button>
                      ) : (
                          <button 
                              onClick={() => handlePunchAction('Out')}
                              className="w-40 h-40 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-xl shadow-red-200 flex flex-col items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95"
                          >
                              <Fingerprint className="w-12 h-12 mb-2" />
                              <span className="text-lg font-bold">Punch Out</span>
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* 3. Action Buttons & Stats (Admin Only View) */}
      {isAdmin && (
          <div className="space-y-6">
              <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => handleMarkAll(AttendanceStatus.PRESENT)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                  >
                      <CheckCircle className="w-4 h-4" /> Mark All Present
                  </button>
                  <button 
                    onClick={() => handleMarkAll(AttendanceStatus.ABSENT)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                  >
                      <XCircle className="w-4 h-4" /> Mark All Absent
                  </button>
              </div>

              <div className="grid grid-cols-5 gap-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                      <h3 className="text-3xl font-bold text-emerald-600">{stats.present}</h3>
                      <p className="text-xs font-bold text-emerald-800 uppercase mt-1">Present</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                      <h3 className="text-3xl font-bold text-red-600">{stats.absent}</h3>
                      <p className="text-xs font-bold text-red-800 uppercase mt-1">Absent</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                      <h3 className="text-3xl font-bold text-orange-600">{stats.late}</h3>
                      <p className="text-xs font-bold text-orange-800 uppercase mt-1">Late</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                      <h3 className="text-3xl font-bold text-amber-600">{stats.halfDay}</h3>
                      <p className="text-xs font-bold text-amber-800 uppercase mt-1">Half Day</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                      <h3 className="text-3xl font-bold text-blue-600">{stats.leave}</h3>
                      <p className="text-xs font-bold text-blue-800 uppercase mt-1">Leave</p>
                  </div>
              </div>
          </div>
      )}

      {/* 4. Calendar Grid */}
      {viewMode === 'Calendar' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden select-none">
              {/* Weekday Header */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
                      <div key={day} className={`py-3 text-center text-xs font-bold ${i === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                          {day}
                      </div>
                  ))}
              </div>
              
              {/* Days Grid */}
              <div className="grid grid-cols-7 bg-gray-200 gap-px border-b border-gray-200">
                  {calendarGrid.map((day, idx) => {
                      if (!day) return <div key={idx} className="bg-white min-h-[100px]"></div>;
                      
                      const isWeekend = new Date(day.date).getDay() === 0;
                      const isPresent = day.status === AttendanceStatus.PRESENT;
                      const isAbsent = day.status === AttendanceStatus.ABSENT;
                      const isHalf = day.status === AttendanceStatus.HALF_DAY;
                      const isLate = day.isLate;
                      const workHours = calculateWorkingHours(day.checkIn, day.checkOut);

                      let borderColor = 'border-transparent';
                      let bgColor = 'bg-white';
                      let textColor = 'text-gray-800';
                      let statusBadge = null;

                      if (isPresent) {
                          borderColor = 'border-l-4 border-l-emerald-500';
                          statusBadge = <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded">PRESENT</span>;
                      } else if (isAbsent) {
                          borderColor = 'border-l-4 border-l-red-500';
                          bgColor = 'bg-red-50/30';
                          statusBadge = <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded">ABSENT</span>;
                      } else if (isHalf) {
                          borderColor = 'border-l-4 border-l-amber-500';
                          statusBadge = <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded">HALF DAY</span>;
                      } else if (day.status === AttendanceStatus.WEEK_OFF) {
                          bgColor = 'bg-gray-50';
                          textColor = 'text-gray-400';
                      }

                      return (
                          <div 
                            key={idx} 
                            onClick={() => handleDayClick(day)}
                            className={`relative p-2 min-h-[100px] flex flex-col justify-between hover:bg-blue-50 cursor-pointer transition-colors ${bgColor} ${borderColor}`}
                          >
                              <div className="flex justify-between items-start">
                                  <span className={`text-sm font-bold ${isWeekend ? 'text-red-500' : textColor}`}>
                                      {new Date(day.date).getDate()}
                                  </span>
                                  {statusBadge}
                                  {day.status === AttendanceStatus.WEEK_OFF && <span className="text-[9px] text-gray-400 font-medium">OFF</span>}
                                  {isLate && isPresent && <span className="bg-orange-100 text-orange-700 text-[9px] font-bold px-1.5 py-0.5 rounded">LATE</span>}
                              </div>

                              {(isPresent || isHalf) && (
                                  <div className="mt-2 space-y-1">
                                      <div className="flex items-center gap-1 text-[10px] text-gray-600">
                                          <span className="text-emerald-600">➔</span>
                                          <span className="font-mono">{day.checkIn || '-'}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] text-gray-600">
                                          <span className="text-red-500">←</span>
                                          <span className="font-mono">{day.checkOut || '-'}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-1 pt-1 border-t border-gray-100">
                                          <Clock className="w-3 h-3" /> {workHours || '--'}
                                      </div>
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* 5. Location Log Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-600" /> Monthly Location Log
              </h3>
              <button className="text-xs text-blue-600 hover:underline">Download Report</button>
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
                        .slice(0, 15) // Show first 15 for demo
                        .map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-mono text-gray-700">{row.date}</td>
                              <td className="px-6 py-4 text-emerald-600 font-bold font-mono">{row.checkIn}</td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit text-xs cursor-pointer hover:bg-blue-100">
                                      <MapPin className="w-3 h-3" /> {selectedEmployee?.branch || 'Remote'}
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-red-500 font-bold font-mono">{row.checkOut}</td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-1 text-gray-500 hover:text-gray-800 cursor-pointer text-xs">
                                      <MapPin className="w-3 h-3" /> View
                                  </div>
                              </td>
                          </tr>
                      ))}
                      {attendanceData.filter(d => d.status === AttendanceStatus.PRESENT).length === 0 && (
                          <tr><td colSpan={5} className="py-8 text-center text-gray-400">No attendance records found for this month.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Edit Attendance Modal (Admin) */}
      {isEditModalOpen && editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800 text-lg">Edit Attendance - {editingDay.date}</h3>
                 <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-6 space-y-5">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                    <select 
                       value={editForm.status}
                       onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                       className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                       {Object.values(AttendanceStatus).map(s => (
                           <option key={s} value={s}>{s.replace('_', ' ')}</option>
                       ))}
                    </select>
                 </div>

                 {(editForm.status === AttendanceStatus.PRESENT || editForm.status === AttendanceStatus.HALF_DAY) && (
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Check In</label>
                            <input 
                               type="text" 
                               value={editForm.checkIn}
                               onChange={(e) => setEditForm({...editForm, checkIn: e.target.value})}
                               className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                               placeholder="09:30 AM"
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Check Out</label>
                            <input 
                               type="text" 
                               value={editForm.checkOut}
                               onChange={(e) => setEditForm({...editForm, checkOut: e.target.value})}
                               className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                               placeholder="06:30 PM"
                            />
                         </div>
                     </div>
                 )}

                 <div className="flex gap-3 pt-2">
                    <button 
                       onClick={() => setIsEditModalOpen(false)} 
                       className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                    >
                       Cancel
                    </button>
                    <button 
                       onClick={handleSaveDay} 
                       className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                       <Save className="w-4 h-4" /> Save Changes
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* QR Scanner Mock Modal */}
      {showQRScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in fade-in duration-300">
                  <div className="bg-gray-900 p-6 text-center relative h-64 flex flex-col items-center justify-center">
                      <div className="absolute inset-0 bg-black opacity-50"></div>
                      <ScanLine className="w-16 h-16 text-emerald-400 animate-pulse relative z-10" />
                      <p className="text-white relative z-10 mt-4 font-medium">Align QR Code within frame</p>
                      <button onClick={() => setShowQRScanner(false)} className="absolute top-4 right-4 text-white hover:text-gray-300 z-20"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-gray-500 text-center">
                          Simulated Scanner: Please enter the branch code.
                          <br/>
                          <span className="text-xs italic">(Hint: Check Branch Admin for code)</span>
                      </p>
                      <input 
                          type="text" 
                          placeholder="Scan Value (e.g. OK BOZ - Main Branch)" 
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={qrInput}
                          onChange={(e) => setQrInput(e.target.value)}
                      />
                      <button 
                          onClick={handleQRSubmit}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md transition-colors"
                      >
                          Verify & Punch
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default UserAttendance;
