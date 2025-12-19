
import { AttendanceStatus, DailyAttendance, Employee } from './types';

export const MOCK_EMPLOYEES: Employee[] = [];

// Generate attendance helper with realistic randomized data
export const generateMockAttendance = (employee: Employee, year: number, month: number): DailyAttendance[] => {
  if (!employee) return [];
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const attendance: DailyAttendance[] = [];

  const today = new Date();
  let simulatedCurrentDay = 32;

  if (year === today.getFullYear() && month === today.getMonth()) {
    simulatedCurrentDay = today.getDate();
  } else if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())) {
    simulatedCurrentDay = 0;
  } else {
    simulatedCurrentDay = daysInMonth;
  }

  const employeeJoiningDate = new Date(employee.joiningDate);
  employeeJoiningDate.setHours(0,0,0,0);

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const currentDayDate = new Date(year, month, i);
    currentDayDate.setHours(0,0,0,0);

    if (currentDayDate < employeeJoiningDate) {
      attendance.push({ date: dateStr, status: AttendanceStatus.NOT_MARKED });
      continue;
    }
    
    if (i > simulatedCurrentDay) {
        attendance.push({ date: dateStr, status: AttendanceStatus.NOT_MARKED, isLate: false });
        continue;
    }

    const isToday = (year === today.getFullYear() && month === today.getMonth() && i === today.getDate());
    if (isToday) {
        attendance.push({ date: dateStr, status: AttendanceStatus.NOT_MARKED, isLate: false });
        continue;
    }

    const dayOfWeek = new Date(year, month, i).getDay();
    
    // Default logic: Sunday is off
    if (dayOfWeek === 0 || employee.weekOff === new Date(year, month, i).toLocaleDateString('en-US', { weekday: 'long' })) { 
      attendance.push({
        date: dateStr,
        status: AttendanceStatus.WEEK_OFF,
        checkIn: undefined,
        checkOut: undefined
      });
      continue;
    }

    // RANDOMIZED LOGIC FOR "CORRECT" DASHBOARD DATA
    const random = Math.random();
    let status = AttendanceStatus.PRESENT;
    let isLate = false;
    let checkIn = '09:15 AM';
    let checkOut = '06:30 PM';

    if (random < 0.05) {
        status = AttendanceStatus.ABSENT;
        checkIn = undefined as any;
        checkOut = undefined as any;
    } else if (random < 0.12) {
        status = AttendanceStatus.HALF_DAY;
        checkIn = '09:30 AM';
        checkOut = '01:30 PM';
    } else {
        status = AttendanceStatus.PRESENT;
        // 20% chance of being late if present
        if (Math.random() < 0.20) {
            isLate = true;
            checkIn = '10:15 AM';
        }
    }

    attendance.push({
      date: dateStr,
      status,
      isLate,
      checkIn,
      checkOut,
    });
  }
  return attendance;
};

export const getEmployeeAttendance = (employee: Employee, year: number, month: number): DailyAttendance[] => {
  return generateMockAttendance(employee, year, month);
};

export const MOCK_ATTENDANCE_NOV_2025: DailyAttendance[] = [];
