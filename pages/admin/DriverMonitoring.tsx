
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Bus, BarChart3, TrendingUp, Clock, Users, CheckCircle, Calendar, 
  Scale, ArrowRightLeft 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend
} from 'recharts';
import { Employee, DriverActivityLog } from '../../types';
import { MOCK_EMPLOYEES } from '../../constants';

// Helper function to get the ISO week number from a date
function getWeekNumber(d: Date): number {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

// Helper to get consistent week label
const getYearWeekLabel = (date: Date): string => {
  const weekNum = getWeekNumber(date);
  const year = date.getFullYear();
  return `W${String(weekNum).padStart(2, '0')} ${year}`;
};

interface ExtendedEmployee extends Employee {
  isDriver: boolean;
  corporateId?: string;
  corporateName?: string;
}

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

const DriverMonitoring: React.FC = () => {
  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = currentSessionId === 'admin';

  // --- State ---
  const [allDrivers, setAllDrivers] = useState<ExtendedEmployee[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<'All' | string>('All');
  const [activityLogs, setActivityLogs] = useState<DriverActivityLog[]>([]);

  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]); // Last 30 days
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [comparisonMode, setComparisonMode] = useState(false);
  const [compareDate1, setCompareDate1] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]); // Last week's date
  const [compareDate2, setCompareDate2] = useState(new Date().toISOString().split('T')[0]); // This week's date


  // --- Data Loading & Mock Generation ---
  const fetchDrivers = useCallback(() => {
    let drivers: ExtendedEmployee[] = [];
    if (isSuperAdmin) {
      const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]').map((e: Employee) => ({ ...e, corporateId: 'admin', corporateName: 'Head Office' }));
      drivers = [...drivers, ...adminStaff];
      const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      corporates.forEach((corp: any) => {
        const corpStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]').map((e: Employee) => ({ ...e, corporateId: corp.email, corporateName: corp.companyName }));
        drivers = [...drivers, ...corpStaff];
      });
    } else {
      const key = `staff_data_${currentSessionId}`;
      drivers = JSON.parse(localStorage.getItem(key) || '[]').map((e: Employee) => ({ ...e, corporateId: currentSessionId, corporateName: 'My Branch' }));
    }

    // Filter for employees whose role includes 'Driver'
    const actualDrivers = drivers.filter(e => e.role.toLowerCase().includes('driver')).map(e => ({ ...e, isDriver: true }));
    setAllDrivers(actualDrivers.length > 0 ? actualDrivers : MOCK_EMPLOYEES.filter(e => e.role.toLowerCase().includes('driver')).map(e => ({ ...e, isDriver: true }))); // Fallback to mock drivers
  }, [isSuperAdmin, currentSessionId]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);


  const generateMockDriverActivity = useCallback((driver: ExtendedEmployee, year: number, month: number): DriverActivityLog[] => {
    const key = `driver_activity_log_${driver.id}_${year}_${month}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved activity data", e);
      }
    }

    const logs: DriverActivityLog[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalShiftMinutes = 9 * 60; // 9-hour shift

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      let onlineMinutes = 0;
      
      const dayOfWeek = new Date(year, month, i).getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekend && Math.random() > 0.1) { // 90% chance to be active on weekdays
        onlineMinutes = Math.floor(totalShiftMinutes * (0.6 + Math.random() * 0.4)); // 60-100% of shift
      } else if (isWeekend && Math.random() > 0.7) { // 30% chance to be active on weekends
        onlineMinutes = Math.floor(totalShiftMinutes * (0.3 + Math.random() * 0.5)); // 30-80% of shift
      }

      logs.push({
        id: `${driver.id}-${dateStr}`,
        driverId: driver.id,
        driverName: driver.name,
        date: dateStr,
        onlineMinutes: onlineMinutes,
        offlineMinutes: totalShiftMinutes - onlineMinutes,
        totalShiftMinutes: totalShiftMinutes,
      });
    }
    localStorage.setItem(key, JSON.stringify(logs));
    return logs;
  }, []);

  useEffect(() => {
    const loadAllActivity = () => {
      let allLogs: DriverActivityLog[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      allDrivers.forEach(driver => {
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        while (current <= end) {
          const logsForMonth = generateMockDriverActivity(driver, current.getFullYear(), current.getMonth());
          allLogs = [...allLogs, ...logsForMonth];
          current.setMonth(current.getMonth() + 1);
        }
      });
      setActivityLogs(allLogs);
    };

    if (allDrivers.length > 0) {
      loadAllActivity();
    }
  }, [allDrivers, startDate, endDate, generateMockDriverActivity]);


  // --- Data Aggregation ---
  const filteredActivity = useMemo(() => {
    return activityLogs.filter(log => {
      const logDate = new Date(log.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);

      const matchesDriver = selectedDriverId === 'All' || log.driverId === selectedDriverId;
      const matchesDateRange = logDate >= start && logDate <= end;

      return matchesDriver && matchesDateRange;
    });
  }, [activityLogs, selectedDriverId, startDate, endDate]);

  const chartData = useMemo(() => {
    const data: Record<string, { name: string; 'Online Hours': number; 'Offline Hours': number }> = {};

    filteredActivity.forEach(log => {
      const date = new Date(log.date);
      let key = '';
      let name = '';

      switch (granularity) {
        case 'daily':
          key = log.date;
          name = new Date(log.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
          break;
        case 'weekly':
          key = getYearWeekLabel(date);
          name = key; // e.g., W01 2025
          break;
        case 'monthly':
          key = date.toISOString().slice(0, 7);
          name = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          break;
        case 'yearly':
          key = date.getFullYear().toString();
          name = key;
          break;
        default: 
          return;
      }

      if (!data[key]) {
        data[key] = { name, 'Online Hours': 0, 'Offline Hours': 0 };
      }
      data[key]['Online Hours'] += log.onlineMinutes / 60;
      data[key]['Offline Hours'] += log.offlineMinutes / 60;
    });

    return Object.values(data).sort((a, b) => {
      // Sort by name (which will be date/week/month string, ensuring correct order)
      return a.name.localeCompare(b.name);
    });
  }, [filteredActivity, granularity]);

  const comparisonData = useMemo(() => {
    if (!comparisonMode || !compareDate1 || !compareDate2 || allDrivers.length === 0) return null;

    const data1: Record<string, number> = {}; // driverId -> onlineMinutes for compareDate1
    const data2: Record<string, number> = {}; // driverId -> onlineMinutes for compareDate2

    // Get logs for compareDate1
    activityLogs
      .filter(log => log.date === compareDate1)
      .forEach(log => { data1[log.driverId] = log.onlineMinutes; });

    // Get logs for compareDate2
    activityLogs
      .filter(log => log.date === compareDate2)
      .forEach(log => { data2[log.driverId] = log.onlineMinutes; });
    
    // Combine for charting
    return allDrivers.map(driver => ({
      name: driver.name,
      [`${compareDate1} Online Hours`]: (data1[driver.id] || 0) / 60,
      [`${compareDate2} Online Hours`]: (data2[driver.id] || 0) / 60,
    }));

  }, [comparisonMode, compareDate1, compareDate2, activityLogs, allDrivers]);


  // --- Render ---
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bus className="w-8 h-8 text-indigo-600" /> Driver Monitoring
          </h2>
          <p className="text-gray-500">Analyze driver online activity and performance trends</p>
        </div>
      </div>

      {/* Filter and Controls */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
        {/* Driver Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="driver-select" className="text-sm font-medium text-gray-700">Driver:</label>
          <select
            id="driver-select"
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="All">All Drivers</option>
            {allDrivers.map(driver => (
              <option key={driver.id} value={driver.id}>{driver.name}</option>
            ))}
          </select>
        </div>

        {/* Granularity */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">View:</label>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['daily', 'weekly', 'monthly', 'yearly'].map(g => (
              <button
                key={g}
                onClick={() => setGranularity(g as Granularity)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${granularity === g ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <label htmlFor="start-date" className="text-sm font-medium text-gray-700">From:</label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <label htmlFor="end-date" className="text-sm font-medium text-gray-700">To:</label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <button
          onClick={() => setComparisonMode(!comparisonMode)}
          className={`ml-auto px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${comparisonMode ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          <Scale className="w-4 h-4" /> {comparisonMode ? 'Hide Comparison' : 'Compare Periods'}
        </button>
      </div>

      {/* Comparison Mode Controls */}
      {comparisonMode && (
        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm animate-in fade-in slide-in-from-top-2 flex flex-wrap gap-4 items-center">
          <p className="text-sm font-bold text-indigo-700 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Compare Online Hours:</p>
          <div className="flex items-center gap-2">
            <label htmlFor="compare-date-1" className="text-sm text-gray-700">Period 1:</label>
            <input
              type="date"
              id="compare-date-1"
              value={compareDate1}
              onChange={(e) => setCompareDate1(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="compare-date-2" className="text-sm text-gray-700">Period 2:</label>
            <input
              type="date"
              id="compare-date-2"
              value={compareDate2}
              onChange={(e) => setCompareDate2(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      )}


      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Online Activity Chart */}
        <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm ${comparisonMode ? 'lg:col-span-2' : ''}`}>
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" /> Driver Online Activity ({granularity.charAt(0).toUpperCase() + granularity.slice(1)})
          </h3>
          <div className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    angle={granularity === 'daily' || granularity === 'weekly' ? -45 : 0}
                    textAnchor={granularity === 'daily' || granularity === 'weekly' ? 'end' : 'middle'}
                    height={granularity === 'daily' || granularity === 'weekly' ? 60 : 30}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Online Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Offline Hours" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No activity data for the selected period and filters.
              </div>
            )}
          </div>
        </div>

        {/* Comparison Charts */}
        {comparisonMode && comparisonData && (
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-indigo-500" /> Comparison: {compareDate1}
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey={`${compareDate1} Online Hours`} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-indigo-500" /> Comparison: {compareDate2}
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey={`${compareDate2} Online Hours`} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>
        )}

        {comparisonMode && (!comparisonData || comparisonData.length === 0) && (
          <div className="lg:col-span-2 p-6 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            Select two dates and ensure drivers have activity to see a comparison.
          </div>
        )}

        {/* Quick Insights */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" /> Quick Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center gap-3">
              <Clock className="w-6 h-6 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Avg. Online Hours</p>
                <p className="text-xl font-bold text-gray-800">
                  {(filteredActivity.reduce((sum, l) => sum + l.onlineMinutes, 0) / (filteredActivity.length || 1) / 60).toFixed(1)} hrs
                </p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Active Drivers</p>
                <p className="text-xl font-bold text-gray-800">
                  {new Set(filteredActivity.map(l => l.driverId)).size} / {allDrivers.length}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Compliance</p>
                <p className="text-xl font-bold text-gray-800">
                  {(filteredActivity.filter(l => l.onlineMinutes > l.totalShiftMinutes * 0.8).length / (filteredActivity.length || 1) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Activity List */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" /> Raw Activity Logs
        </h3>
        <div className="overflow-x-auto h-64 custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Online Hours</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offline Hours</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredActivity.map(log => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.driverName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-semibold">{(log.onlineMinutes / 60).toFixed(1)} hrs</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{(log.offlineMinutes / 60).toFixed(1)} hrs</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DriverMonitoring;
