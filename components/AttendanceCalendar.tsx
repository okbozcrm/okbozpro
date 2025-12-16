import React from 'react';
import { DailyAttendance, AttendanceStatus } from '../types';

interface AttendanceCalendarProps {
  data: DailyAttendance[];
  stats: {
    present: number;
    absent: number;
    halfDay: number;
    paidLeave: number;
    weekOff: number;
  };
  onDateClick?: (day: DailyAttendance) => void;
}

interface DayCellProps {
  dayData: DailyAttendance | null | undefined;
  onClick?: (day: DailyAttendance) => void;
}

const DayCell: React.FC<DayCellProps> = ({ dayData, onClick }) => {
  if (!dayData) return <div className="h-14 bg-transparent"></div>;

  const dayNumber = parseInt(dayData.date.split('-')[2], 10);
  
  let bgClass = 'bg-white border-dashed border-gray-200 text-gray-300';
  
  // MILD COLOR SCHEME - Pastel Backgrounds with matching borders
  switch (dayData.status) {
    case AttendanceStatus.PRESENT:
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 border-solid';
      break;
    case AttendanceStatus.ABSENT:
      bgClass = 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 border-solid';
      break;
    case AttendanceStatus.HALF_DAY:
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 border-solid';
      break;
    case AttendanceStatus.PAID_LEAVE:
      bgClass = 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 border-solid';
      break;
    case AttendanceStatus.WEEK_OFF:
      bgClass = 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 border-solid';
      break;
    case AttendanceStatus.NOT_MARKED:
      bgClass = 'bg-white border-dashed border-gray-200 text-gray-300 hover:bg-gray-50';
      break;
  }

  return (
    <div 
      onClick={() => onClick && onClick(dayData)}
      className={`relative h-14 rounded-lg border flex flex-col items-center justify-center ${bgClass} transition-all cursor-pointer group`}
      title={dayData.status.replace('_', ' ')}
    >
      <span className="text-sm font-bold">{dayNumber}</span>
      {dayData.status === AttendanceStatus.PRESENT && dayData.isLate && (
        <span className="absolute bottom-1 text-[7px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-1 rounded">LATE</span>
      )}
      {dayData.status === AttendanceStatus.HALF_DAY && (
        <span className="absolute bottom-1 text-[7px] font-bold uppercase tracking-wider opacity-80">HALF</span>
      )}
    </div>
  );
};

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ data, stats, onDateClick }) => {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Safe date parsing to prevent timezone shifts
  const getDayOfWeek = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    const date = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );
    return date.getDay();
  };

  const startDayOfWeek = data.length > 0 ? getDayOfWeek(data[0].date) : 0;
  
  const paddedData = [
    ...Array(startDayOfWeek).fill(null),
    ...data
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-md mx-auto">
      {/* Header Stats */}
      <div className="p-4 grid grid-cols-5 gap-2 border-b border-gray-100 bg-gray-50/50">
        <div className="text-center">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Present</div>
          <div className="font-bold text-lg text-gray-800">{stats.present}</div>
        </div>
        <div className="text-center border-l border-gray-200">
          <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Absent</div>
          <div className="font-bold text-lg text-gray-800">{stats.absent}</div>
        </div>
        <div className="text-center border-l border-gray-200">
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Half</div>
          <div className="font-bold text-lg text-gray-800">{stats.halfDay}</div>
        </div>
        <div className="text-center border-l border-gray-200">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Leave</div>
          <div className="font-bold text-lg text-gray-800">{stats.paidLeave}</div>
        </div>
        <div className="text-center border-l border-gray-200">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Off</div>
          <div className="font-bold text-lg text-gray-800">{stats.weekOff}</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-3">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {paddedData.map((day, idx) => (
            <DayCell key={idx} dayData={day} onClick={onDateClick} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;