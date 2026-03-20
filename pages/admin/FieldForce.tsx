
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Navigation, 
  ClipboardList, 
  Activity, 
  CreditCard, 
  DollarSign, 
  Map as MapIcon, 
  ChevronRight, 
  ArrowUpRight, 
  Clock, 
  TrendingUp,
  UserCheck,
  Bike
} from 'lucide-react';
import { Employee, TravelAllowanceRequest, AttendanceStatus, Enquiry } from '../../types';

const FieldForce: React.FC = () => {
  const navigate = useNavigate();
  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState(0);
  const [pendingClaims, setPendingClaims] = useState(0);

  useEffect(() => {
    // Load stats
    try {
      const activeLocations = JSON.parse(localStorage.getItem('active_staff_locations') || '[]');
      setActiveStaffCount(activeLocations.length);

      const enquiries = JSON.parse(localStorage.getItem('global_enquiries_data') || '[]');
      setPendingTasks(enquiries.filter((e: Enquiry) => e.status === 'New' || e.status === 'In Progress').length);

      const staff = JSON.parse(localStorage.getItem('staff_data') || '[]');
      const today = new Date().toISOString().split('T')[0];
      let presentCount = 0;
      staff.forEach((emp: Employee) => {
        const attendance = JSON.parse(localStorage.getItem(`attendance_${emp.id}`) || '[]');
        if (attendance.some((a: { date: string; status: AttendanceStatus }) => a.date === today && a.status === AttendanceStatus.PRESENT)) {
          presentCount++;
        }
      });
      setTodayAttendance(presentCount);

      const claims = JSON.parse(localStorage.getItem('global_travel_requests') || '[]');
      setPendingClaims(claims.filter((c: TravelAllowanceRequest) => c.status === 'Pending').length);
    } catch (e) {
      console.error("Error loading field force stats", e);
    }
  }, []);

  const modules = [
    {
      id: 'tracking',
      title: 'Field Staff Tracking',
      description: 'Real-time GPS location and movement history of field force.',
      icon: Navigation,
      path: '/admin/tracking',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100'
    },
    {
      id: 'tasks',
      title: 'Field Task Management',
      description: 'Assign, track and manage field tasks and customer visits.',
      icon: ClipboardList,
      path: '/admin/tasks',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100'
    },
    {
      id: 'attendance',
      title: 'Field Staff Attendance',
      description: 'Geofenced attendance marking and shift management.',
      icon: Activity,
      path: '/admin/attendance',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-100'
    },
    {
      id: 'expenses',
      title: 'Field Expense Management',
      description: 'Track fuel, maintenance and other field-related expenses.',
      icon: CreditCard,
      path: '/admin/finance-and-expenses',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100'
    },
    {
      id: 'payroll',
      title: 'HRMS & Payroll Management',
      description: 'Comprehensive payroll processing and staff records.',
      icon: DollarSign,
      path: '/admin/payroll',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100'
    },
    {
      id: 'claims',
      title: 'KM Claims (TA)',
      description: 'Verify and approve travel allowance based on odometer readings.',
      icon: Bike,
      path: '/admin/km-claims',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100'
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-[0.2em] mb-2">
            <TrendingUp className="w-4 h-4" />
            Operations Centre
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Field Force <span className="text-emerald-500">Tracking</span></h1>
          <p className="text-gray-500 mt-2 font-medium">Manage your entire field operations from a single dashboard.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
          <button className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">Overview</button>
          <button className="px-4 py-2 text-sm font-bold text-white bg-gray-900 rounded-xl shadow-lg">Live View</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Staff', value: activeStaffCount, icon: MapIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Tasks', value: pendingTasks, icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Today Present', value: todayAttendance, icon: UserCheck, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Pending Claims', value: pendingClaims, icon: Bike, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1 text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full text-[10px] font-bold">
                <ArrowUpRight className="w-3 h-3" />
                Live
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <div 
            key={module.id}
            onClick={() => navigate(module.path)}
            className={`group cursor-pointer bg-white p-8 rounded-[2.5rem] border ${module.borderColor} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden`}
          >
            {/* Background Accent */}
            <div className={`absolute -right-8 -top-8 w-32 h-32 ${module.bgColor} rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>
            
            <div className="relative z-10">
              <div className={`w-14 h-14 rounded-2xl ${module.bgColor} ${module.color} flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform`}>
                <module.icon className="w-7 h-7" />
              </div>
              
              <h3 className="text-xl font-black text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors">{module.title}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                {module.description}
              </p>
              
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-gray-900 transition-colors">
                Open Module
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />
              Recent Field Activity
            </h3>
            <button className="text-xs font-bold text-emerald-600 hover:underline">View All</button>
          </div>
          <div className="p-4 space-y-2">
            {[
              { user: 'Rahul Sharma', action: 'Punched In', time: '09:15 AM', status: 'success' },
              { user: 'Priya Patel', action: 'Completed Task #452', time: '10:30 AM', status: 'success' },
              { user: 'Amit Kumar', action: 'Submitted KM Claim', time: '11:05 AM', status: 'warning' },
              { user: 'Suresh Raina', action: 'Location Offline', time: '11:45 AM', status: 'error' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                    {activity.user.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{activity.user}</div>
                    <div className="text-xs text-gray-500 font-medium">{activity.action}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-gray-400">{activity.time}</div>
                  <div className={`text-[10px] font-black uppercase tracking-tighter mt-1 ${
                    activity.status === 'success' ? 'text-emerald-500' : 
                    activity.status === 'warning' ? 'text-orange-500' : 'text-rose-500'
                  }`}>
                    {activity.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10">
            <Navigation className="w-64 h-64 -mr-16 -mb-16" />
          </div>
          
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-[0.2em] mb-4">
              <Activity className="w-4 h-4" />
              System Status
            </div>
            <h3 className="text-3xl font-black mb-4 leading-tight">All systems are <span className="text-emerald-400">operational</span>.</h3>
            <p className="text-gray-400 text-sm font-medium mb-8 max-w-xs">
              GPS tracking is active for all 24 registered field devices. Data sync is running every 30 seconds.
            </p>
            
            <div className="mt-auto grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-2xl font-black text-white">98.2%</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Uptime</div>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-2xl font-black text-white">1.2s</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Latency</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldForce;
