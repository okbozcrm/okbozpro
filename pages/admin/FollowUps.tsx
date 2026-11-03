
import React, { useState } from 'react';
import { 
  Users, Search, Filter, Plus, Phone, 
  MessageSquare, Calendar, ChevronLeft, ChevronRight,
  Clock, CheckCircle2, AlertCircle, TrendingUp,
  MapPin, MoreHorizontal, MessageCircle, Edit2, 
  LayoutDashboard, List, CheckCircle, X, Mail
} from 'lucide-react';

const MOCK_FOLLOW_UPS = [
  { id: '1', name: 'Kumar S', mobile: '9876543210', city: 'Salem', state: 'Tamil Nadu', type: 'Phone Call', time: '21 May 2024 10:30 AM', staff: 'Arun Kumar', role: 'Marketing Executive', status: 'Completed', nextFollowUp: '22 May 2024 11:30 AM' },
  { id: '2', name: 'Raja M', mobile: '9876543211', city: 'Madurai', state: 'Tamil Nadu', type: 'WhatsApp', time: '21 May 2024 11:00 AM', staff: 'Priya Natarajan', role: 'Telecaller', status: 'Pending', nextFollowUp: '21 May 2024 04:00 PM' },
  { id: '3', name: 'Suresh Babu', mobile: '9876543212', city: 'Coimbatore', state: 'Tamil Nadu', type: 'Meeting', time: '21 May 2024 12:00 PM', staff: 'Suresh Babu', role: 'Franchise Consultant', status: 'Completed', nextFollowUp: '23 May 2024 02:00 PM' },
  { id: '4', name: 'Priya R', mobile: '9876543213', city: 'Trichy', state: 'Tamil Nadu', type: 'Phone Call', time: '21 May 2024 02:30 PM', staff: 'Karthik R', role: 'Marketing Executive', status: 'Pending', nextFollowUp: '22 May 2024 10:30 AM' },
  { id: '5', name: 'Manikandan', mobile: '9876543214', city: 'Tirunelveli', state: 'Tamil Nadu', type: 'Follow-up Call', time: '21 May 2024 03:00 PM', staff: 'Suresh Babu', role: 'Franchise Consultant', status: 'Overdue', nextFollowUp: '21 May 2024 03:00 PM' },
  { id: '6', name: 'Vijayakumar', mobile: '9876543215', city: 'Salem', state: 'Tamil Nadu', type: 'WhatsApp', time: '21 May 2024 03:30 PM', staff: 'Priya Natarajan', role: 'Telecaller', status: 'Pending', nextFollowUp: '22 May 2024 12:00 PM' },
  { id: '7', name: 'Anand Kumar', mobile: '9876543216', city: 'Erode', state: 'Tamil Nadu', type: 'Meeting', time: '21 May 2024 04:00 PM', staff: 'Arun Kumar', role: 'Marketing Executive', status: 'Pending', nextFollowUp: '22 May 2024 11:30 AM' },
  { id: '8', name: 'Deepak R', mobile: '9876543217', city: 'Vaniyambadi', state: 'Tamil Nadu', type: 'Follow-up Call', time: '21 May 2024 04:30 PM', staff: 'Karthik R', role: 'Marketing Executive', status: 'Completed', nextFollowUp: '24 May 2024 10:00 AM' },
];

const FollowUps = () => {
  const [activeTab, setActiveTab] = useState('Today');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = [
    { label: "Today's Follow-up", value: '28', change: '12%', trend: 'up', icon: Phone, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Upcoming', value: '42', change: '8%', trend: 'up', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Missed', value: '07', change: '5%', trend: 'down', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Completed', value: '36', change: '15%', trend: 'up', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Conversion', value: '18', change: '20%', trend: 'up', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-0 z-30">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
             <span>Home</span>
             <span>/</span>
             <span className="text-emerald-600">Follow-ups</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
             Follow-ups
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <div className="flex border border-gray-100 rounded-xl p-1 bg-gray-50/50">
              <button className="px-4 py-2 text-xs font-bold text-gray-600 flex items-center gap-2 hover:bg-white rounded-lg transition-all">
                 <MapPin className="w-3.5 h-3.5"/> All Cities <ChevronLeft className="w-3 h-3 -rotate-90"/>
              </button>
           </div>
           <div className="flex border border-gray-100 rounded-xl p-1 bg-gray-50/50">
              <button className="px-4 py-2 text-xs font-bold text-gray-600 flex items-center gap-2 hover:bg-white rounded-lg transition-all">
                 <Calendar className="w-3.5 h-3.5"/> 21 May 2024 - 21 May 2024 <ChevronLeft className="w-3 h-3 -rotate-90"/>
              </button>
           </div>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               type="text" 
               placeholder="Search..."
               className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs w-60 focus:ring-2 focus:ring-emerald-500 outline-none font-bold shadow-sm"
             />
           </div>
           <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-600 hover:bg-gray-50 transition-all relative">
              <MessageCircle className="w-5 h-5" />
           </button>
           <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-600 hover:bg-gray-50 transition-all relative">
              <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></div>
              <Users className="w-5 h-5 text-gray-400" />
           </button>
           <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden text-[10px] font-black flex items-center justify-center">
              AK
           </div>
        </div>
      </div>

      <div className="p-8 pb-32">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
           {stats.map((stat, i) => (
             <div key={i} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                   <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-gray-900">{stat.value}</span>
                   </div>
                   <div className={`flex items-center gap-1 text-[10px] font-black ${stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {stat.trend === 'up' ? '↑' : '↓'} {stat.change} <span className="text-gray-300 ml-1">vs yesterday</span>
                   </div>
                </div>
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                   <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
             </div>
           ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
           {/* Left Content */}
           <div className="flex-1 space-y-6">
              {/* Filters & Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="flex flex-wrap items-center gap-2">
                    {['All (105)', 'Today (28)', 'Tomorrow (14)', 'This Week (42)', 'Overdue (07)', 'Completed (36)'].map((tab) => (
                      <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
                      >
                        {tab}
                      </button>
                    ))}
                 </div>
                 <button className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Follow-up
                 </button>
              </div>

              {/* Advanced Filters */}
              <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
                 <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                    <input type="text" value="21 May 2024" readOnly className="pl-11 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold w-40" />
                 </div>
                 {['All Types', 'All Staff', 'All Status', 'All Sources'].map(filter => (
                    <div key={filter} className="relative group">
                       <select className="pl-4 pr-10 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold appearance-none min-w-[120px] focus:ring-2 focus:ring-emerald-500/20 outline-none">
                          <option>{filter}</option>
                       </select>
                       <ChevronLeft className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 group-hover:text-emerald-500 transition-all -rotate-90 pointer-events-none" />
                    </div>
                 ))}
                 <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                    <input type="text" placeholder="Search lead, mobile, city..." className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold" />
                 </div>
                 <button className="px-6 py-2.5 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 hover:bg-gray-50 transition-all">
                    <Filter className="w-4 h-4" /> Filter
                 </button>
              </div>

              {/* Table */}
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full">
                       <thead>
                          <tr className="bg-gray-50/50 border-b border-gray-100">
                             <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead Details</th>
                             <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Follow-up Type</th>
                             <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Time</th>
                             <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Staff</th>
                             <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                             <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Next Follow-up</th>
                             <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {MOCK_FOLLOW_UPS.map((followUp) => (
                             <tr key={followUp.id} className="hover:bg-gray-50 transition-all group">
                                <td className="px-6 py-5">
                                   <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${followUp.id === '1' || followUp.id === '5' ? 'bg-rose-50 text-rose-600' : followUp.id === '2' || followUp.id === '6' ? 'bg-blue-50 text-blue-600' : followUp.id === '3' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                         {followUp.name.split(' ')[0][0]}
                                      </div>
                                      <div>
                                         <p className="text-xs font-black text-gray-900">{followUp.name}</p>
                                         <p className="text-[10px] font-bold text-gray-400">{followUp.mobile}</p>
                                         <p className="text-[10px] font-bold text-gray-400">{followUp.city}, {followUp.state}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-5">
                                   <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                      {followUp.type === 'Phone Call' || followUp.type === 'Follow-up Call' ? <Phone className="w-4 h-4 text-emerald-500" /> : followUp.type === 'WhatsApp' ? <MessageCircle className="w-4 h-4 text-emerald-500" /> : <Users className="w-4 h-4 text-violet-500" />}
                                      {followUp.type}
                                   </div>
                                </td>
                                <td className="px-6 py-5 text-xs font-bold text-gray-500 italic">{followUp.time}</td>
                                <td className="px-6 py-5">
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-white shadow-sm flex items-center justify-center text-[10px]">👤</div>
                                      <div>
                                         <p className="text-xs font-black text-gray-900">{followUp.staff}</p>
                                         <p className="text-[10px] font-bold text-gray-300">{followUp.role}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-5">
                                   <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${followUp.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : followUp.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                      {followUp.status}
                                   </span>
                                </td>
                                <td className="px-6 py-5 text-xs font-bold text-gray-500 italic">{followUp.nextFollowUp}</td>
                                <td className="px-6 py-5">
                                   <div className="flex items-center justify-center gap-2">
                                      <button className="p-2 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-all rounded-xl"><Phone className="w-4 h-4" /></button>
                                      <button className="p-2 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-all rounded-xl"><MessageCircle className="w-4 h-4" /></button>
                                      <button className="p-2 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-all rounded-xl"><Edit2 className="w-4 h-4" /></button>
                                      <button className="p-2 hover:bg-gray-100 text-gray-400 transition-all rounded-xl"><MoreHorizontal className="w-4 h-4" /></button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
                 <div className="px-8 py-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span>Showing 1 to 10 of 28 entries</span>
                    <div className="flex items-center gap-2">
                       <button className="w-8 h-8 rounded-lg border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all">
                          <ChevronLeft className="w-4 h-4" />
                       </button>
                       {[1, 2, 3].map(i => (
                          <button key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${i === 1 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'hover:bg-gray-50 text-gray-500'}`}>{i}</button>
                       ))}
                       <button className="w-8 h-8 rounded-lg border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all">
                          <ChevronRight className="w-4 h-4" />
                       </button>
                       <select className="ml-4 border border-gray-100 rounded-lg px-2 py-1 bg-white outline-none">
                          <option>10 / page</option>
                       </select>
                    </div>
                 </div>
              </div>
           </div>

           {/* Right Sidebar */}
           <div className="w-full lg:w-[350px] space-y-6">
              {/* Follow-up Calendar */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">Follow-up Calendar</h3>
                    <div className="flex items-center gap-2">
                       <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-gray-400" /></button>
                       <span className="text-xs font-black text-gray-900">May 2024</span>
                       <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-gray-400" /></button>
                    </div>
                 </div>
                 <div className="grid grid-cols-7 text-center mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{day}</div>
                    ))}
                 </div>
                 <div className="grid grid-cols-7 gap-y-2 mb-8 text-center">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <div key={day} className={`relative px-1 py-2 text-[11px] font-black transition-all cursor-pointer rounded-xl ${day === 21 ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200' : day === 15 || day === 19 ? 'text-gray-900 hover:bg-gray-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                         {day}
                         {day === 21 && (
                           <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                              <div className="w-1 h-1 rounded-full bg-emerald-200"></div>
                              <div className="w-1 h-1 rounded-full bg-emerald-200"></div>
                           </div>
                         )}
                         {day === 22 && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                               <div className="w-1 h-1 rounded-full bg-amber-400"></div>
                               <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                            </div>
                         )}
                         {(day === 24 || day === 25) && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                               <div className="w-1 h-1 rounded-full bg-rose-400"></div>
                               <div className="w-1 h-1 rounded-full bg-amber-400"></div>
                            </div>
                         )}
                      </div>
                    ))}
                 </div>
                 <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-6 border-t border-gray-50">
                    {[
                       { label: 'Call', color: 'bg-emerald-500' },
                       { label: 'Meeting', color: 'bg-blue-500' },
                       { label: 'WhatsApp', color: 'bg-emerald-400' },
                       { label: 'Overdue', color: 'bg-rose-500' }
                    ].map(legend => (
                       <div key={legend.label} className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${legend.color}`}></div>
                          <span className="text-[10px] font-bold text-gray-400">{legend.label}</span>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Follow-up Summary */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                 <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-8">Follow-up Summary</h3>
                 <div className="space-y-4">
                    {[
                       { label: 'Phone Calls', value: '12', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Phone },
                       { label: 'WhatsApp', value: '08', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: MessageCircle },
                       { label: 'Meetings', value: '05', color: 'text-violet-600', bg: 'bg-violet-50', icon: Users },
                       { label: 'Site Visits', value: '02', color: 'text-amber-600', bg: 'bg-amber-50', icon: MapPin },
                       { label: 'Others', value: '01', color: 'text-gray-500', bg: 'bg-gray-100', icon: List }
                    ].map(item => (
                       <div key={item.label} className="flex items-center justify-between p-3 rounded-2xl border border-gray-50 hover:border-gray-100 transition-all group cursor-pointer">
                          <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <item.icon className={`w-4 h-4 ${item.color}`} />
                             </div>
                             <span className="text-xs font-bold text-gray-600">{item.label}</span>
                          </div>
                          <span className="text-xs font-black text-gray-900 tracking-wider font-mono">{item.value}</span>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Top Staff Performance */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                 <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-2">Top Staff Performance</h3>
                 <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-8">(This Month)</p>
                 <div className="space-y-6">
                    <div className="flex items-center text-[10px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 pb-2">
                       <span className="flex-1">Staff Name</span>
                       <span className="w-16 text-center">Completed</span>
                       <span className="w-16 text-center">Conversion</span>
                    </div>
                    {[
                       { name: 'Arun Kumar', completed: 56, conversion: 18 },
                       { name: 'Priya Natarajan', completed: 42, conversion: 12 },
                       { name: 'Suresh Babu', completed: 38, conversion: 11 },
                       { name: 'Karthik R', completed: 31, conversion: 8 }
                    ].map(staff => (
                       <div key={staff.name} className="flex items-center">
                          <span className="flex-1 text-xs font-black text-gray-700">{staff.name}</span>
                          <span className="w-16 text-center text-xs font-bold text-gray-500">{staff.completed}</span>
                          <span className="w-16 text-center text-xs font-bold text-emerald-600">{staff.conversion}</span>
                       </div>
                    ))}
                 </div>
                 <button className="w-full mt-10 py-3 rounded-xl border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">
                    View Full Report
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Action Navigation Footer (Visual Placeholder) */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-white/50 shadow-2xl p-3 flex items-center gap-3 z-40 border-gray-100 shadow-emerald-900/10">
        <button className="bg-emerald-600 text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Follow-up
        </button>
        <div className="h-10 w-px bg-gray-200 mx-2"></div>
        <button className="px-6 py-3 hover:bg-emerald-50 rounded-full text-emerald-600 font-black text-[10px] uppercase tracking-widest border border-emerald-100">Today</button>
        <button className="px-6 py-3 hover:bg-gray-100 rounded-full text-gray-400 font-bold text-[10px] uppercase tracking-widest">Upcoming</button>
        <button className="px-6 py-3 hover:bg-gray-100 rounded-full text-gray-400 font-bold text-[10px] uppercase tracking-widest">Missed</button>
        <button className="px-6 py-3 hover:bg-gray-100 rounded-full text-gray-400 font-bold text-[10px] uppercase tracking-widest border-l border-gray-100">Calendar</button>
      </div>
    </div>
  );
};

export default FollowUps;
