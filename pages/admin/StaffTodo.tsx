
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Trash2, CheckCircle, Circle, 
  Calendar, User, AlertCircle, Clock, CheckSquare, ListTodo
} from 'lucide-react';
import { UserRole, Employee, CorporateAccount } from '../../types';

interface Todo {
  id: string;
  employeeId: string;
  employeeName: string;
  text: string;
  description?: string;
  completed: boolean;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  createdAt: string;
  corporateId?: string;
}

interface StaffTodoProps {
  role: UserRole;
}

const StaffTodo: React.FC<StaffTodoProps> = ({ role }) => {
  const currentSessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = currentSessionId === 'admin';

  // --- Data Loading ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [filterEmployee, setFilterEmployee] = useState('All');

  const [formData, setFormData] = useState({
    employeeId: '',
    text: '',
    description: '',
    priority: 'Medium' as Todo['priority'],
    dueDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // Load employees
    const loadEmployees = () => {
      let all: Employee[] = [];
      const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
      all = [...adminStaff];

      const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      corps.forEach((corp: CorporateAccount) => {
        const corpStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]');
        all = [...all, ...corpStaff];
      });
      setEmployees(all);
    };

    // Load todos
    const loadTodos = () => {
      const saved = localStorage.getItem('staff_todos');
      if (saved) {
        try {
          setTodos(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse todos", e);
        }
      }
    };

    loadEmployees();
    loadTodos();
  }, []);

  useEffect(() => {
    localStorage.setItem('staff_todos', JSON.stringify(todos));
  }, [todos]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text || !formData.employeeId) return;

    const employee = employees.find(e => e.id === formData.employeeId);
    const newTodo: Todo = {
      id: `todo_${Date.now()}`,
      employeeId: formData.employeeId,
      employeeName: employee?.name || 'Unknown',
      text: formData.text,
      description: formData.description,
      completed: false,
      priority: formData.priority,
      dueDate: formData.dueDate,
      createdAt: new Date().toISOString(),
      corporateId: isSuperAdmin ? 'admin' : currentSessionId
    };

    setTodos([newTodo, ...todos]);
    setIsModalOpen(false);
    setFormData({
      employeeId: '',
      text: '',
      description: '',
      priority: 'Medium',
      dueDate: new Date().toISOString().split('T')[0]
    });
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: string) => {
    if (window.confirm("Delete this todo?")) {
      setTodos(todos.filter(t => t.id !== id));
    }
  };

  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      // Role based filtering
      if (role === UserRole.EMPLOYEE && t.employeeId !== currentSessionId) return false;
      if (role === UserRole.CORPORATE && t.corporateId !== currentSessionId) return false;

      // Status filtering
      if (filterStatus === 'Pending' && t.completed) return false;
      if (filterStatus === 'Completed' && !t.completed) return false;

      // Employee filtering (for admin/corp)
      if (filterEmployee !== 'All' && t.employeeId !== filterEmployee) return false;

      // Search filtering
      const searchLower = searchQuery.toLowerCase();
      return t.text.toLowerCase().includes(searchLower) || 
             t.employeeName.toLowerCase().includes(searchLower);
    });
  }, [todos, role, currentSessionId, filterStatus, filterEmployee, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredTodos.length;
    const completed = filteredTodos.filter(t => t.completed).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [filteredTodos]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-emerald-500" />
            Staff To-Do List
          </h2>
          <p className="text-gray-500">
            {role === UserRole.EMPLOYEE 
              ? "Your personal and assigned tasks" 
              : "Manage and track daily tasks for your team"}
          </p>
        </div>
        {(role === UserRole.ADMIN || role === UserRole.CORPORATE) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Assign Todo
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Todos</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Completed</p>
              <h3 className="text-2xl font-bold text-emerald-600">{stats.completed}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending</p>
              <h3 className="text-2xl font-bold text-orange-600">{stats.pending}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search todos or staff..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'All' | 'Pending' | 'Completed')}
            className="flex-1 md:flex-none px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold text-gray-700"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
          {(role === UserRole.ADMIN || role === UserRole.CORPORATE) && (
            <select 
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="flex-1 md:flex-none px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold text-gray-700"
            >
              <option value="All">All Staff</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Todo List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
        {filteredTodos.length > 0 ? (
          filteredTodos.map(todo => (
            <div 
              key={todo.id} 
              className={`bg-white p-4 rounded-2xl border transition-all flex items-center gap-4 group ${todo.completed ? 'border-gray-100 opacity-75' : 'border-gray-200 shadow-sm hover:border-emerald-200'}`}
            >
              <button 
                onClick={() => toggleTodo(todo.id)}
                className={`shrink-0 transition-colors ${todo.completed ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'}`}
              >
                {todo.completed ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-bold text-sm truncate ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {todo.text}
                  </h4>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                    todo.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                    todo.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                    'bg-green-50 text-green-600 border-green-100'
                  }`}>
                    {todo.priority}
                  </span>
                </div>
                {todo.description && (
                  <p className={`text-xs mb-2 line-clamp-1 ${todo.completed ? 'text-gray-300' : 'text-gray-500'}`}>
                    {todo.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <User className="w-3 h-3" /> {todo.employeeName}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <Calendar className="w-3 h-3" /> Due: {new Date(todo.dueDate).toLocaleDateString()}
                  </div>
                  {new Date(todo.dueDate) < new Date() && !todo.completed && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                      <AlertCircle className="w-3 h-3" /> Overdue
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {(role === UserRole.ADMIN || role === UserRole.CORPORATE) && (
                  <button 
                    onClick={() => deleteTodo(todo.id)}
                    className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
            <div className="p-4 bg-white rounded-3xl shadow-sm mb-4">
              <ListTodo className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-700">No Todos Found</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {searchQuery ? "Try adjusting your search or filters" : "Everything is clear! No pending tasks for now."}
            </p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg animate-in zoom-in duration-200 overflow-hidden border border-white">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Assign New Todo</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-rose-500 transition-all">
                <Trash2 className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddTodo} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Assign To Staff *</label>
                  <select 
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Todo Title *</label>
                  <input 
                    required
                    type="text"
                    value={formData.text}
                    onChange={(e) => setFormData({...formData, text: e.target.value})}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Description (Optional)</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Add more details..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Priority</label>
                    <select 
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as Todo['priority']})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 mb-1 block">Due Date</label>
                    <input 
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all transform active:scale-95"
              >
                Create Todo Task
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffTodo;
