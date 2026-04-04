
import { AttendanceStatus, DailyAttendance, Employee } from './types';

export const MOCK_EMPLOYEES: Employee[] = [];

// Generate attendance helper (Updated to support multiple punches)
export const generateMockAttendance = (employee: Employee, year: number, month: number): DailyAttendance[] => {
  if (!employee) return [];
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const attendance: DailyAttendance[] = [];

  // Determine the current day for the generated month.
  const today = new Date();
  let simulatedCurrentDay: number;

  if (year === today.getFullYear() && month === today.getMonth()) {
    simulatedCurrentDay = today.getDate(); // For current real month, fill up to today
  } else if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())) {
    simulatedCurrentDay = 0; // Future months should be empty
  } else {
    simulatedCurrentDay = daysInMonth; // Past months should be full
  }

  const employeeJoiningDate = new Date(employee.joiningDate);
  employeeJoiningDate.setHours(0,0,0,0); // Normalize to start of day

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const currentDayDate = new Date(year, month, i);
    currentDayDate.setHours(0,0,0,0); // Normalize

    // 1. Pre-Joining check
    if (currentDayDate < employeeJoiningDate) {
      attendance.push({ date: dateStr, status: AttendanceStatus.NOT_MARKED, punches: [] });
      continue;
    }

    // 1.5 Relieving Date check
    if (employee.relievingDate) {
        const relievingDate = new Date(employee.relievingDate);
        relievingDate.setHours(0, 0, 0, 0);
        if (currentDayDate > relievingDate) {
            attendance.push({ date: dateStr, status: AttendanceStatus.NOT_MARKED, punches: [] });
            continue;
        }
    }
    
    // 2. Future check
    if (i > simulatedCurrentDay) {
        attendance.push({
            date: dateStr,
            status: AttendanceStatus.NOT_MARKED,
            isLate: false,
            punches: []
        });
        continue;
    }

    // 3. Current Day (Today) check - Force NOT_MARKED initially so user must punch in
    const isToday = (year === today.getFullYear() && month === today.getMonth() && i === today.getDate());
    if (isToday) {
        attendance.push({
            date: dateStr,
            status: AttendanceStatus.NOT_MARKED,
            isLate: false,
            punches: []
        });
        continue;
    }

    const dayOfWeek = new Date(year, month, i).getDay();
    let status: AttendanceStatus;
    const isLate = false;

    if (dayOfWeek === 0 || employee.weekOff === new Date(year, month, i).toLocaleDateString('en-US', { weekday: 'long' })) { 
      status = AttendanceStatus.WEEK_OFF;
    } else {
        // Default to present for generated history unless overridden by real data storage
        status = AttendanceStatus.PRESENT;
    }

    const punches = status === AttendanceStatus.PRESENT ? [{ in: '09:30 AM', out: '06:30 PM' }] : [];

    attendance.push({
      date: dateStr,
      status,
      isLate,
      punches,
      checkIn: punches.length > 0 ? punches[0].in : undefined,
      checkOut: punches.length > 0 ? punches[0].out : undefined,
    });
  }
  return attendance;
};

// Helper to get consistent "random" attendance for a specific employee
export const getEmployeeAttendance = (employee: Employee, year: number, month: number): DailyAttendance[] => {
  return generateMockAttendance(employee, year, month);
};

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, { bg: string; text: string; border: string; badge: string; cell: string }> = {
  [AttendanceStatus.PRESENT]: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
    badge: 'bg-emerald-100 text-emerald-600 border-emerald-200 shadow-sm',
    cell: 'bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/60'
  },
  [AttendanceStatus.ABSENT]: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-100',
    badge: 'bg-rose-100 text-rose-600 border-rose-200 shadow-sm',
    cell: 'bg-rose-50/30 border-rose-100 hover:bg-rose-50/60'
  },
  [AttendanceStatus.HALF_DAY]: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-600 border-amber-200 shadow-sm',
    cell: 'bg-amber-50/30 border-amber-100 hover:bg-amber-50/60'
  },
  [AttendanceStatus.PAID_LEAVE]: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    badge: 'bg-blue-100 text-blue-600 border-blue-200 shadow-sm',
    cell: 'bg-blue-50/30 border-blue-100 hover:bg-blue-50/60'
  },
  [AttendanceStatus.WEEK_OFF]: {
    bg: 'bg-slate-50',
    text: 'text-slate-500',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-400 border-slate-200',
    cell: 'bg-slate-50/50 border-slate-100'
  },
  [AttendanceStatus.HOLIDAY]: {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-100',
    badge: 'bg-violet-100 text-violet-600 border-violet-200 shadow-sm',
    cell: 'bg-violet-50/30 border-violet-100 hover:bg-violet-50/60'
  },
  [AttendanceStatus.ALTERNATE_DAY]: {
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-100',
    badge: 'bg-teal-100 text-teal-600 border-teal-200 shadow-sm',
    cell: 'bg-teal-50/30 border-teal-100 hover:bg-teal-50/60'
  },
  [AttendanceStatus.NOT_MARKED]: {
    bg: 'bg-slate-50',
    text: 'text-slate-400',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-400 border-slate-200',
    cell: 'bg-white border-slate-100'
  }
};

export const MOCK_ATTENDANCE_NOV_2025: DailyAttendance[] = [];
