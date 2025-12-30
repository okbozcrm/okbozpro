
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Send, FileText, PieChart } from 'lucide-react';
import { LeaveRequest, UserRole } from '../../types';
import { sendSystemNotification } from '../../services/cloudService';

const ApplyLeave: React.FC = () => {
  const [formData, setFormData] = useState({
    type: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const sessionId = localStorage.getItem('app_session_id') || '';
  const userRole = localStorage.getItem('user_role');

  // Initialize history from global storage filtered by current user
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);

  // Function to load and calculate data
  const loadData = () => {
        // 1. Load History
        const savedRequests = localStorage.getItem('global_leave_requests');
        let allRequests: LeaveRequest[] = [];
        if (savedRequests) {
            try {
                allRequests = JSON.parse(savedRequests);
                setHistory(allRequests.filter(r => r.employeeId === sessionId).sort((a,b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime()));
            } catch (e) { console.error("Failed to parse leave history", e); }
        }

        // 2. Identify Corporate Owner to fetch Settings
        let ownerId = 'admin';
        if (userRole === 'EMPLOYEE') {
            ownerId = localStorage.getItem('logged_in_employee_corporate_id') || 'admin';
        } else if (userRole === 'CORPORATE') {
            ownerId = sessionId;
        }

        // 3. Load Configured Leave Types
        const configKey = ownerId === 'admin' ? 'company_leave_types' : `company_leave_types_${ownerId}`;
        const rawConfig = localStorage.getItem(configKey);
        
        let configuredLeaves = [];
        if (rawConfig) {
            try { configuredLeaves = JSON.parse(rawConfig); } catch(e) {}
        }
        
        // Fallback Defaults if no config found
        if (configuredLeaves.length === 0) {
            configuredLeaves = [
                { id: 1, name: 'Casual Leave', code: 'CL', days: 12 },
                { id: 2, name: 'Sick Leave', code: 'SL', days: 10 },
                { id: 3, name: 'Privilege Leave', code: 'PL', days: 15 }
            ];
        }

        // 4. Calculate Balances
        const COLORS = [
            { color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' },
            { color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500' },
            { color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
            { color: 'text-purple-600', bg: 'bg-purple-50', bar: 'bg-purple-500' },
            { color: 'text-orange-600', bg: 'bg-orange-50', bar: 'bg-orange-500' },
        ];

        const computedBalances = configuredLeaves.map((leave: any, idx: number) => {
            // Count used days: Approved requests matching this leave type name
            const usedDays = allRequests
                .filter(r => r.employeeId === sessionId && r.status === 'Approved' && (r.type === leave.name || r.type.includes(leave.name)))
                .reduce((sum, r) => sum + (Number(r.days) || 0), 0);
            
            const total = Number(leave.days) || 0;
            const style = COLORS[idx % COLORS.length];

            return {
                type: leave.name,
                code: leave.code,
                total: total,
                available: Math.max(0, total - usedDays),
                used: usedDays,
                ...style
            };
        });

        setLeaveBalances(computedBalances);
        
        // Set default form type if empty
        if (computedBalances.length > 0) {
            setFormData(prev => {
                if (!prev.type) return { ...prev, type: `${computedBalances[0].type} (${computedBalances[0].code})` };
                return prev;
            });
        }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [sessionId, userRole]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      alert("Please fill in all fields.");
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (start < today) {
       alert("You cannot apply for leave in the past.");
       return;
    }

    if (end < start) {
      alert("End date cannot be earlier than start date.");
      return;
    }
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check Balance (Simple check based on name)
    const selectedTypeName = formData.type.split(' (')[0]; // Extract name from "Name (Code)"
    const balanceObj = leaveBalances.find(b => b.type === selectedTypeName);
    
    // Only block if it's a tracked leave type and balance is insufficient
    // "Loss of Pay" usually bypasses this, or if config is missing
    if (balanceObj && days > balanceObj.available && !formData.type.includes("Loss of Pay")) {
        if (!window.confirm(`Warning: You only have ${balanceObj.available} days available for ${selectedTypeName}. This may be treated as Loss of Pay. Continue?`)) {
            return;
        }
    }

    const employeeName = sessionStorage.getItem('loggedInUserName') || localStorage.getItem('logged_in_employee_name') || 'Employee';
    const corporateId = localStorage.getItem('logged_in_employee_corporate_id') || 'admin';

    const newLeave: LeaveRequest = {
      id: `LV-${Date.now()}`,
      employeeId: sessionId,
      employeeName: employeeName,
      corporateId: corporateId,
      type: formData.type,
      from: formData.startDate,
      to: formData.endDate,
      days: isNaN(days) ? 1 : days,
      status: 'Pending',
      reason: formData.reason,
      appliedOn: new Date().toISOString()
    };

    const savedRaw = localStorage.getItem('global_leave_requests');
    const allRequests = savedRaw ? JSON.parse(savedRaw) : [];
    localStorage.setItem('global_leave_requests', JSON.stringify([newLeave, ...allRequests]));

    // NOTIFY ADMIN
    await sendSystemNotification({
        type: 'leave_request',
        title: 'New Leave Request',
        message: `${employeeName} requested ${newLeave.days} day(s) leave from ${newLeave.from}. Reason: ${newLeave.reason}`,
        targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
        corporateId: corporateId === 'admin' ? undefined : corporateId,
        employeeId: sessionId,
        link: '/admin/attendance' // Admin checks attendance dashboard for leaves usually
    });

    setHistory([newLeave, ...history]);
    
    // Reset form but keep default type
    const defaultType = leaveBalances.length > 0 ? `${leaveBalances[0].type} (${leaveBalances[0].code})` : '';
    setFormData({ type: defaultType, startDate: '', endDate: '', reason: '' });
    
    window.dispatchEvent(new Event('storage'));
    alert("Leave request submitted successfully! It is now pending Admin approval.");
  };

  const todayDate = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Leave Management</h2>
        <p className="text-gray-500">Apply for new leaves and check status</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              New Application
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Leave Type</label>
                <select 
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  {leaveBalances.map(b => (
                      <option key={b.code} value={`${b.type} (${b.code})`}>{b.type} ({b.code})</option>
                  ))}
                  <option value="Loss of Pay (LWP)">Loss of Pay (LWP)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">From Date</label>
                  <input 
                    type="date" 
                    name="startDate"
                    min={todayDate}
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">To Date</label>
                  <input 
                    type="date" 
                    name="endDate"
                    min={formData.startDate || todayDate}
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                <textarea 
                  name="reason"
                  rows={4}
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Briefly describe the reason..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                Submit Request
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
               <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <Clock className="w-5 h-5 text-emerald-500" />
                 Recent History
               </h3>
            </div>
            
            <div className="divide-y divide-gray-100">
              {history.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors group">
                   <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-800">{item.type}</span>
                          <span className="text-xs text-gray-400">• {item.days} Day{item.days > 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(item.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                          <span className="text-gray-300">→</span>
                          {new Date(item.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        item.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                        item.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {item.status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                        {item.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                        {item.status === 'Pending' && <AlertCircle className="w-3 h-3" />}
                        {item.status}
                      </span>
                   </div>
                   
                   <div className="flex justify-between items-end">
                      <p className="text-sm text-gray-500 italic">"{item.reason}"</p>
                      <span className="text-xs text-gray-400">Applied on {new Date(item.appliedOn).toLocaleDateString()}</span>
                   </div>
                </div>
              ))}
              
              {history.length === 0 && (
                <div className="p-8 text-center text-gray-400 italic">
                  No leave history found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;
