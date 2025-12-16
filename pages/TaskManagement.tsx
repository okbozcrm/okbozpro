
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Calendar, User, Clock, CheckCircle, AlertCircle, 
  Trash2, Search, Filter, MoreHorizontal, X, SlidersHorizontal, 
  Pencil, Building2, Save, BarChart3, List
} from 'lucide-react';
import { UserRole, Employee, CorporateAccount } from '../types';
import { MOCK_EMPLOYEES } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { sendSystemNotification } from '../services/cloudService';

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // Employee ID
  assignedByName: string;
  corporateId?: string; // To link to specific franchise
  corporateName?: string; // Display name
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  createdAt: string;
}

interface TaskManagementProps {
  role: UserRole;
}

const COLUMNS = [
  { id: 'Todo', label: 'To Do', color: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
  { id: 'Review', label: 'In Review', color: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  { id: 'Done', label: 'Completed', color: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' }
] as const;

const TaskManagement: React.FC<TaskManagementProps> = ({ role }) => {
  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = currentSessionId === 'admin';

  // --- Data Loading (Corporates & Staff) ---
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [allStaff, setAllStaff] = useState<(Employee & { corporateId?: string })[]>([]);

  useEffect(() => {
    const savedCorps = localStorage.getItem('corporate_accounts');
    const parsedCorps = savedCorps ? JSON.parse(savedCorps) : [];
    setCorporates(parsedCorps);

    let aggregatedStaff: (Employee & { corporateId?: string })[] = [];

    const adminStaffData = localStorage.getItem('staff_data');
    if (adminStaffData) {
        const adminStaff = JSON.parse(adminStaffData).map((e: Employee) => ({ ...e, corporateId: 'admin' }));
        aggregatedStaff = [...aggregatedStaff, ...adminStaff];
    } else {
        aggregatedStaff = [...aggregatedStaff, ...MOCK_EMPLOYEES.map(e => ({ ...e, corporateId: 'admin' }))];
    }

    parsedCorps.forEach((corp: CorporateAccount) => {
        const corpStaffKey = `staff_data_${corp.email}`;
        const corpStaffData = localStorage.getItem(corpStaffKey);
        if (corpStaffData) {
            const corpStaff = JSON.parse(corpStaffData).map((e: Employee) => ({ ...e, corporateId: corp.email }));
            aggregatedStaff = [...aggregatedStaff, ...corpStaff];
        }
    });

    setAllStaff(aggregatedStaff);
  }, []);

  // --- Task State ---
  const [tasks, setTasks] = useState<Task[]>(() => {
    const key = isSuperAdmin ? 'tasks_data' : `tasks_data`; 
    const saved = localStorage.getItem(key);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  useEffect(() => {
    const key = isSuperAdmin ? 'tasks_data' : `tasks_data`;
    localStorage.setItem(key, JSON.stringify(tasks));
  }, [tasks, isSuperAdmin]);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'Kanban' | 'Performance'>('Kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  
  // --- Form State ---
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    corporateId: 'admin',
    assignedTo: '',
    priority: 'Medium',
    dueDate: '',
    status: 'Todo'
  });

  const availableStaff = useMemo(() => {
    if (formData.corporateId === 'admin') {
        return allStaff.filter(s => s.corporateId === 'admin');
    }
    return allStaff.filter(s => s.corporateId === formData.corporateId);
  }, [allStaff, formData.corporateId]);

  // --- Handlers ---

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      corporateId: 'admin',
      assignedTo: '',
      priority: 'Medium',
      dueDate: '',
      status: 'Todo'
    });
    setEditingTask(null);
    setIsModalOpen(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    if (role === UserRole.EMPLOYEE) {
        const me = allStaff.find(s => s.id === currentSessionId);
        if (me) {
            setFormData(prev => ({
                ...prev,
                assignedTo: me.id,
                corporateId: me.corporateId || 'admin'
            }));
        }
    } else if (role === UserRole.CORPORATE) {
        setFormData(prev => ({
            ...prev,
            corporateId: currentSessionId
        }));
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      corporateId: task.corporateId || 'admin',
      assignedTo: task.assignedTo,
      priority: task.priority,
      dueDate: task.dueDate,
      status: task.status
    });
    setIsModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.assignedTo) return;

    let corpName = 'Head Office';
    if (formData.corporateId !== 'admin') {
       const c = corporates.find(c => c.email === formData.corporateId);
       if (c) corpName = c.companyName;
    }

    let assignedByName = 'Admin';
    if (role === UserRole.CORPORATE) assignedByName = 'Manager';
    if (role === UserRole.EMPLOYEE) assignedByName = 'Self';

    if (editingTask) {
      const updatedTasks = tasks.map(t => t.id === editingTask.id ? {
        ...t,
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo,
        corporateId: formData.corporateId,
        corporateName: corpName,
        priority: formData.priority as any,
        dueDate: formData.dueDate,
        status: formData.status as any
      } : t);
      setTasks(updatedTasks);
    } else {
      const newTask: Task = {
        id: `T${Date.now()}`,
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo,
        assignedByName: assignedByName,
        corporateId: formData.corporateId,
        corporateName: corpName,
        status: 'Todo',
        priority: formData.priority as any,
        dueDate: formData.dueDate,
        createdAt: new Date().toISOString()
      };
      setTasks([newTask, ...tasks]);

      // Send targeted notification
      if (formData.assignedTo && formData.assignedTo !== currentSessionId) {
          sendSystemNotification({
              type: 'task_assigned',
              title: `New Task: ${newTask.title}`,
              message: `You have been assigned a new task due on ${newTask.dueDate}.`,
              targetRoles: [UserRole.EMPLOYEE],
              employeeId: formData.assignedTo, // Target specific employee
              link: `/user/tasks`
          });
      }
    }
    resetForm();
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm('Delete this task?')) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const getStaffDetails = (id: string) => {
    const staff = allStaff.find(s => s.id === id);
    return staff || { name: 'Unknown', avatar: '' };
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // --- Filtering & Stats ---
  const filteredTasks = tasks.filter(t => {
     if (role === UserRole.EMPLOYEE && t.assignedTo !== currentSessionId) return false;
     if (role === UserRole.CORPORATE && t.corporateId !== currentSessionId) return false;

     const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           getStaffDetails(t.assignedTo).name.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
     return matchesSearch && matchesPriority;
  });

  const performanceStats = useMemo(() => {
    const stats: Record<string, { name: string, total: number, completed: number, pending: number, role: string }> = {};
    
    // Determine relevant staff to show
    let relevantStaff = allStaff;
    if (role === UserRole.CORPORATE) {
        relevantStaff = allStaff.filter(s => s.corporateId === currentSessionId);
    } else if (role === UserRole.EMPLOYEE) {
        relevantStaff = allStaff.filter(s => s.id === currentSessionId);
    }

    relevantStaff.forEach(emp => {
        const empTasks = tasks.filter(t => t.assignedTo === emp.id);
        const total = empTasks.length;
        const completed = empTasks.filter(t => t.status === 'Done').length;
        const pending = empTasks.filter(t => t.status !== 'Done').length;
        
        if (role === UserRole.ADMIN || total > 0) { // Admins see everyone, others see if active
            stats[emp.id] = {
                name: emp.name,
                role: emp.role,
                total,
                completed,
                pending
            };
        }
    });

    return Object.values(stats);
  }, [allStaff, tasks, role, currentSessionId]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Task Management</h2>
          <p className="text-gray-500">
              {role === UserRole.EMPLOYEE ? "Manage and track your daily tasks" : "Assign tasks to staff and track status"}
          </p>
        </div>
        <div className="flex gap-3">
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('Kanban')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'Kanban' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <List className="w-4 h-4" /> Kanban Board
                </button>
                <button 
                    onClick={() => setActiveTab('Performance')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'Performance' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <BarChart3 className="w-4 h-4" /> Performance Report
                </button>
            </div>
            {activeTab === 'Kanban' && (
                <button 
                onClick={handleOpenCreate}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
                >
                <Plus className="w-5 h-5" />
                Create Task
                </button>
            )}
        </div>
      </div>

      {activeTab === 'Kanban' ? (
        <>
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                    type="text" 
                    placeholder="Search tasks..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
                <select 
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                    <option value="All">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                </select>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
                <div className="flex h-full min-w-[1000px] gap-6">
                {COLUMNS.map(col => {
                    const colTasks = filteredTasks.filter(t => t.status === col.id);
                    return (
                    <div key={col.id} className="flex-1 flex flex-col bg-gray-50/50 rounded-xl border border-gray-200 h-full max-h-full">
                        <div className={`p-4 border-b-2 ${col.border} bg-white rounded-t-xl sticky top-0 z-10 flex justify-between items-center shadow-sm`}>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${col.text}`}>{col.label}</span>
                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">{colTasks.length}</span>
                        </div>
                        </div>

                        <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                        {colTasks.map(task => {
                            const assignee = getStaffDetails(task.assignedTo);
                            return (
                            <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all group relative">
                                {/* Header Badges */}
                                <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityColor(task.priority)} uppercase`}>
                                    {task.priority}
                                </span>
                                <div className="flex gap-1">
                                    <button onClick={() => handleOpenEdit(task)} className="text-gray-300 hover:text-blue-500 p-1">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDeleteTask(task.id)} className="text-gray-300 hover:text-red-500 p-1">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                </div>

                                {/* Content */}
                                <h4 className="font-bold text-gray-800 mb-1 text-sm leading-snug">{task.title}</h4>
                                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-1 mb-3">
                                    <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200">
                                        <User className="w-3 h-3" /> By {task.assignedByName}
                                    </div>
                                    {isSuperAdmin && task.corporateName && (
                                        <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-medium border border-indigo-100">
                                            <Building2 className="w-3 h-3" /> {task.corporateName}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                <div className="flex items-center gap-2">
                                    <img src={assignee.avatar || `https://ui-avatars.com/api/?name=${assignee.name}`} alt="" className="w-6 h-6 rounded-full" title={assignee.name} />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-400">Due Date</span>
                                        <span className="text-xs font-medium text-gray-600">{task.dueDate}</span>
                                    </div>
                                </div>
                                
                                {/* Status Change Menu */}
                                <div className="relative group/menu">
                                    <button className="p-1 hover:bg-gray-100 rounded text-gray-400">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                    <div className="absolute right-0 bottom-full mb-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 hidden group-hover/menu:block z-20 overflow-hidden">
                                        {COLUMNS.map(c => (
                                            <button
                                            key={c.id}
                                            onClick={() => handleStatusChange(task.id, c.id)}
                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${task.status === c.id ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-gray-600'}`}
                                            >
                                            {task.status === c.id && <CheckCircle className="w-3 h-3" />} {c.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                </div>
                            </div>
                            );
                        })}
                        </div>
                    </div>
                    );
                })}
                </div>
            </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* PERFORMANCE REPORT VIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {performanceStats.map((stat, idx) => {
                        const efficiency = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
                        return (
                            <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{stat.name}</h3>
                                        <p className="text-xs text-gray-500">{stat.role}</p>
                                    </div>
                                    <div className={`text-lg font-bold ${efficiency >= 80 ? 'text-emerald-600' : efficiency >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {efficiency}%
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                                    <div 
                                        className={`h-2 rounded-full ${efficiency >= 80 ? 'bg-emerald-500' : efficiency >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                        style={{width: `${efficiency}%`}}
                                    ></div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="bg-gray-50 p-2 rounded-lg">
                                        <span className="block font-bold text-gray-800 text-sm">{stat.total}</span>
                                        <span className="text-gray-500">Total</span>
                                    </div>
                                    <div className="bg-green-50 p-2 rounded-lg">
                                        <span className="block font-bold text-green-700 text-sm">{stat.completed}</span>
                                        <span className="text-green-600">Done</span>
                                    </div>
                                    <div className="bg-orange-50 p-2 rounded-lg">
                                        <span className="block font-bold text-orange-700 text-sm">{stat.pending}</span>
                                        <span className="text-orange-600">Pending</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {performanceStats.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500">
                            No performance data available.
                        </div>
                    )}
                </div>

                {/* Comparative Chart (Admin Only) */}
                {(role === UserRole.ADMIN || role === UserRole.CORPORATE) && (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96">
                        <h3 className="font-bold text-gray-800 mb-6">Task Completion Overview</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceStats.slice(0, 5)} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Legend wrapperStyle={{fontSize: '12px'}} />
                                <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                <Bar dataKey="pending" name="Pending" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
                 <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveTask} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input required type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Task title" />
                 </div>
                 
                 {/* Corporate Selection (Only for Super Admin) */}
                 {isSuperAdmin && (
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Corporate / Branch</label>
                       <select 
                          value={formData.corporateId}
                          onChange={(e) => setFormData({...formData, corporateId: e.target.value, assignedTo: ''})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                       >
                          <option value="admin">Head Office</option>
                          {corporates.map(c => (
                             <option key={c.email} value={c.email}>{c.companyName} ({c.city})</option>
                          ))}
                       </select>
                    </div>
                 )}

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                    <select 
                       required 
                       value={formData.assignedTo}
                       onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                       disabled={role === UserRole.EMPLOYEE} // Disable if employee, as they assign to self
                       className={`w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${role === UserRole.EMPLOYEE ? 'bg-gray-50 text-gray-500' : ''}`}
                    >
                       <option value="">Select Staff</option>
                       {availableStaff.map(s => (
                          <option key={s.id} value={s.id}>{s.name} - {s.role}</option>
                       ))}
                    </select>
                    {role === UserRole.EMPLOYEE && <p className="text-xs text-emerald-600 mt-1">Auto-assigned to self</p>}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                       <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white">
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                       <input required type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
                    </div>
                 </div>

                 {editingTask && (
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                       <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white">
                          <option value="Todo">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Review">Review</option>
                          <option value="Done">Done</option>
                       </select>
                    </div>
                 )}

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none resize-none" />
                 </div>

                 <div className="pt-2">
                    <button type="submit" className="w-full bg-emerald-500 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-600 transition-colors shadow-md flex items-center justify-center gap-2">
                       <Save className="w-4 h-4" /> {editingTask ? 'Save Changes' : 'Create Task'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagement;
