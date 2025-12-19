
import React, { useState, useEffect, useMemo } from 'react';
/* Added missing MessageSquare import */
import { 
  Clock, CheckCircle, Calendar, ClipboardList, 
  ArrowRight, DollarSign, PieChart, Bell, 
  TrendingUp, Play, MapPin, Zap, User, Star, MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee } from '../../types';

const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<Employee | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Load User Info
  useEffect(() => {
    const sessionId = localStorage.getItem('app_session_id');
    const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
    let found = adminStaff.find((s: any) => s.id === sessionId);
    
    if (!found) {
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        for (const corp of corps) {
            const corpStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]');
            found = corpStaff.find((s: any) => s.id === sessionId);
            if (found) break;
        }
    }
    setUser(found);
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute Greeting
  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  // Mock Stats for the Panel
  const stats = useMemo(() => {
    if (!user) return { attendance: 0, tasks: 0, leaves: 0, salary: '0' };
    
    // Simple logic based on current date
    const now = new Date();
    const attendance = getEmployeeAttendance(user, now.getFullYear(), now.getMonth());
    const presentCount = attendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
    
    // Load tasks
    const tasks = JSON.parse(localStorage.getItem('tasks_data') || '[]');
    const myPendingTasks = tasks.filter((t: any) => t.assignedTo === user.id && t.status !== 'Done').length;

    return {
      attendance: Math.round((presentCount / now.getDate()) * 100) || 0,
      tasks: myPendingTasks,
      leaves: 8, // Mock remaining
      salary: user.salary ? Number(user.salary).toLocaleString() : '0'
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {greeting}, <span className="text-emerald-600">{user.name.split(' ')[0]}!</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">Here is what's happening today at {user.branch || 'Head Office'}.</p>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="text-right">
                <p className="text-lg font-black text-slate-800 leading-none">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {currentTime.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
            </div>
            <div className="w-px h-8 bg-slate-100"></div>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <Clock className="w-6 h-6" />
            </div>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'ATTENDANCE', value: `${stats.attendance}%`, icon: Calendar, color: 'emerald', sub: 'Present rate' },
          { label: 'PENDING TASKS', value: stats.tasks, icon: ClipboardList, color: 'blue', sub: 'Needs action' },
          { label: 'LEAVE BALANCE', value: stats.leaves, icon: PieChart, color: 'orange', sub: 'Days remaining' },
          { label: 'EST. SALARY', value: `₹${stats.salary}`, icon: DollarSign, color: 'indigo', sub: 'Current month' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className={`w-12 h-12 rounded-2xl bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <item.icon className="w-6 h-6" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-1">{item.value}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
            <p className="text-xs text-slate-400 mt-2 font-medium">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Center Column: Today's Schedule & Tasks */}
        <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-emerald-500" /> ACTIVE TASKS
                    </h2>
                    <button onClick={() => navigate('/user/tasks')} className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline">View All</button>
                </div>
                <div className="p-2">
                    <div className="space-y-2">
                        {/* Task Item 1 */}
                        <div className="p-6 rounded-3xl hover:bg-slate-50 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <Star className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Complete Onboarding Docs</h4>
                                    <p className="text-xs text-slate-400">Due: Today, 5:00 PM</p>
                                </div>
                            </div>
                            <button className="p-2 text-slate-300 group-hover:text-emerald-500 transition-colors">
                                <CheckCircle className="w-6 h-6" />
                            </button>
                        </div>
                        {/* Task Item 2 */}
                        <div className="p-6 rounded-3xl hover:bg-slate-50 transition-colors flex items-center justify-between group border-t border-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Field Report - Branch B</h4>
                                    <p className="text-xs text-slate-400">Due: Tomorrow</p>
                                </div>
                            </div>
                            <button className="p-2 text-slate-300 group-hover:text-emerald-500 transition-colors">
                                <CheckCircle className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                    onClick={() => navigate('/user')}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <h3 className="text-xl font-black mb-2">My Attendance</h3>
                        <p className="text-slate-400 text-sm mb-6">Punch in, view logs, and mark leaves.</p>
                        <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-[0.2em]">
                            Open Panel <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                    <Calendar className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" />
                </div>

                <div 
                    onClick={() => navigate('/user/chat')}
                    className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <h3 className="text-xl font-black mb-2">Team Chat</h3>
                        <p className="text-emerald-100/60 text-sm mb-6">Connect with your team instantly.</p>
                        <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-[0.2em]">
                            Open Messenger <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                    <MessageSquare className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" />
                </div>
            </div>
        </div>

        {/* Right Sidebar: Profile & Payout */}
        <div className="space-y-8">
            {/* Salary Progress Card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">UPCOMING PAYOUT</p>
                        <h3 className="text-2xl font-black text-slate-900">₹{stats.salary}</h3>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                    <div className="bg-emerald-500 h-full w-[65%]" />
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-400 uppercase tracking-tighter">Cycle Progress</span>
                    <span className="text-slate-800">65%</span>
                </div>
                <button 
                    onClick={() => navigate('/user/salary')}
                    className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                >
                    View Payslip
                </button>
            </div>

            {/* Profile Snapshot */}
            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center">
                <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-20 h-20 rounded-full border-4 border-white shadow-md mb-4" 
                />
                <h3 className="font-black text-slate-900">{user.name}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-6">{user.role}</p>
                <div className="w-full grid grid-cols-2 gap-2">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200/50">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ID</p>
                        <p className="text-xs font-bold text-slate-800">{user.id}</p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-200/50">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dept</p>
                        <p className="text-xs font-bold text-slate-800 truncate">{user.department}</p>
                    </div>
                </div>
                <button 
                    onClick={() => navigate('/user/profile')}
                    className="w-full mt-6 flex items-center justify-center gap-2 text-xs font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
                >
                    Edit Profile <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
