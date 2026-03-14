
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Send, FileText, PieChart } from 'lucide-react';
import { LeaveRequest, UserRole } from '../../types';
import { sendSystemNotification } from '../../services/cloudService';

interface LeaveType {
    id: number;
    name: string;
    code: string;
    days: number;
}

const ApplyLeave: React.FC = () => {
  const [formData, setFormData] = useState({
    type: 'Casual Leave (CL)',
    startDate: '',
    endDate: '',
    reason: '',
    duration: '1 Hour'
  });

  const sessionId = localStorage.getItem('app_session_id') || '';

  // Initialize history from global storage filtered by current user
  const [history, setHistory] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    const loadLeaveHistory = () => {
        const saved = localStorage.getItem('global_leave_requests');
        if (saved) {
            try {
                const all: LeaveRequest[] = JSON.parse(saved);
                setHistory(all.filter(r => r.employeeId === sessionId).sort((a,b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime()));
            } catch (e) { console.error("Failed to parse leave history", e); }
        }
    };
    loadLeaveHistory();
    window.addEventListener('storage', loadLeaveHistory);
    return () => window.removeEventListener('storage', loadLeaveHistory);
  }, [sessionId]);

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<{ type: string, code: string, available: number, total: number, color: string, bg: string, bar: string }[]>([]);

  useEffect(() => {
    const loadLeaveSettings = () => {
        const corporateId = localStorage.getItem('logged_in_employee_corporate_id') || 'admin';
        const LEAVE_KEY = corporateId === 'admin' ? 'company_leave_types' : `company_leave_types_${corporateId}`;
        
        let configuredLeaves: LeaveType[] = [];
        const defaults: LeaveType[] = [
            { id: 1, name: 'Casual Leave', code: 'CL', days: 12 },
            { id: 2, name: 'Sick Leave', code: 'SL', days: 10 },
        ];

        try {
            const saved = localStorage.getItem(LEAVE_KEY);
            configuredLeaves = saved ? JSON.parse(saved) : defaults;
            if (!Array.isArray(configuredLeaves)) configuredLeaves = defaults;
        } catch {
            configuredLeaves = defaults;
        }
        setLeaveTypes(configuredLeaves);

        // Calculate Balances
        const colors = [
            { color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' },
            { color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500' },
            { color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
            { color: 'text-purple-600', bg: 'bg-purple-50', bar: 'bg-purple-500' },
            { color: 'text-orange-600', bg: 'bg-orange-50', bar: 'bg-orange-500' },
        ];

        const calculatedBalances = configuredLeaves.map((leave: LeaveType, index: number) => {
            const used = history
                .filter(h => h.type.includes(leave.code) && h.status === 'Approved')
                .reduce((sum, h) => sum + (h.days || 0), 0);
            
            const style = colors[index % colors.length];
            
            return {
                type: leave.name,
                code: leave.code,
                available: Math.max(0, leave.days - used),
                total: leave.days,
                ...style
            };
        });
        setBalances(calculatedBalances);
        
        // Ensure valid default selection using functional update to access latest state
        setFormData(prev => {
            const currentTypeValid = configuredLeaves.some((l: LeaveType) => `${l.name} (${l.code})` === prev.type) 
                || prev.type === 'Permission' 
                || prev.type === 'Loss of Pay (LWP)';

            if (!currentTypeValid && configuredLeaves.length > 0) {
                return { ...prev, type: `${configuredLeaves[0].name} (${configuredLeaves[0].code})` };
            }
            return prev;
        });
    };

    loadLeaveSettings();
    window.addEventListener('storage', loadLeaveSettings);
    return () => window.removeEventListener('storage', loadLeaveSettings);
  }, [history]); // Re-run when history changes to update used counts

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isPermission = formData.type === 'Permission';
    
    if (!formData.startDate || (!isPermission && !formData.endDate) || !formData.reason) {
      alert("Please fill in all fields.");
      return;
    }

    const start = new Date(formData.startDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (start < today) {
       alert("You cannot apply for leave in the past.");
       return;
    }

    let days = 0;
    let end = new Date(formData.startDate);

    const corporateId = localStorage.getItem('logged_in_employee_corporate_id') || 'admin';

    if (isPermission) {
        // Permission Logic
        const month = start.getMonth();
        const year = start.getFullYear();
        
        const permissionsThisMonth = history.filter(h => {
            const d = new Date(h.from);
            return h.type === 'Permission' && d.getMonth() === month && d.getFullYear() === year && h.status !== 'Rejected';
        }).length;

        const PERMISSION_KEY = corporateId === 'admin' ? 'company_permission_limit' : `company_permission_limit_${corporateId}`;
        const limitStr = localStorage.getItem(PERMISSION_KEY) || localStorage.getItem('company_permission_limit') || '2';
        const limit = parseInt(limitStr);

        if (permissionsThisMonth >= limit) {
            alert(`You have reached the monthly permission limit of ${limit}.`);
            return;
        }

        if (formData.duration === 'Half Day') {
            days = 0.5;
        } else if (formData.duration === '2 Hours') {
            days = 0.25;
        } else {
            days = 0.125; // 1 Hour
        }
        
        end = start; // End date is same as start date
    } else {
        end = new Date(formData.endDate);
        if (end < start) {
          alert("End date cannot be earlier than start date.");
          return;
        }
        const diffTime = Math.abs(end.getTime() - start.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const employeeName = sessionStorage.getItem('loggedInUserName') || localStorage.getItem('logged_in_employee_name') || 'Employee';

    const newLeave: LeaveRequest = {
      id: `LV-${Date.now()}`,
      employeeId: sessionId,
      employeeName: employeeName,
      corporateId: corporateId,
      type: formData.type,
      from: formData.startDate,
      to: isPermission ? formData.startDate : formData.endDate,
      days: isNaN(days) ? 1 : days,
      status: 'Pending',
      reason: formData.reason,
      appliedOn: new Date().toISOString(),
      duration: isPermission ? formData.duration : undefined
    };

    const savedRaw = localStorage.getItem('global_leave_requests');
    const allRequests = savedRaw ? JSON.parse(savedRaw) : [];
    localStorage.setItem('global_leave_requests', JSON.stringify([newLeave, ...allRequests]));

    // NOTIFY ADMIN
    await sendSystemNotification({
        type: 'leave_request',
        title: 'New Leave Request',
        message: `${employeeName} requested ${isPermission ? formData.duration + ' Permission' : newLeave.days + ' day(s) leave'} from ${newLeave.from}. Reason: ${newLeave.reason}`,
        targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
        corporateId: corporateId === 'admin' ? undefined : corporateId,
        employeeId: sessionId,
        link: '/admin'
    });

    setHistory([newLeave, ...history]);
    setFormData({ type: 'Casual Leave (CL)', startDate: '', endDate: '', reason: '', duration: '1 Hour' });
    window.dispatchEvent(new Event('storage'));
    alert("Request submitted successfully! It is now pending Admin approval.");
  };

  const todayDate = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Leave Management</h2>
                <p className="text-gray-500">Check your balances and apply for new leaves</p>
            </div>
            <button onClick={() => window.dispatchEvent(new Event('storage'))} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors" title="Refresh Data">
                <Clock className="w-5 h-5 text-gray-600" />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {balances.map((bal, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-gray-500 text-sm font-medium">{bal.type}</p>
                <h3 className={`text-3xl font-bold mt-1 ${bal.color}`}>{bal.available}</h3>
              </div>
              <div className={`p-2 rounded-lg ${bal.bg}`}>
                <PieChart className={`w-5 h-5 ${bal.color}`} />
              </div>
            </div>
            <div className="z-10">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Used: {bal.total - bal.available}</span>
                <span>Total: {bal.total}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${bal.bar}`} 
                  style={{ width: `${(bal.available / bal.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
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
                  {leaveTypes.map(leave => (
                      <option key={leave.id} value={`${leave.name} (${leave.code})`}>{leave.name} ({leave.code})</option>
                  ))}
                  <option value="Loss of Pay (LWP)">Loss of Pay (LWP)</option>
                  <option value="Permission">Permission</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={formData.type === 'Permission' ? 'col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{formData.type === 'Permission' ? 'Date' : 'From Date'}</label>
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
                {formData.type !== 'Permission' ? (
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
                ) : (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration</label>
                  <select 
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option>1 Hour</option>
                    <option>2 Hours</option>
                    <option>Half Day</option>
                  </select>
                </div>
                )}
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
                          <span className="text-xs text-gray-400">• {item.duration ? item.duration : `${item.days} Day${item.days > 1 ? 's' : ''}`}</span>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(item.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                          {item.type !== 'Permission' && (
                            <>
                            <span className="text-gray-300">→</span>
                            {new Date(item.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </>
                          )}
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
                      <p className="text-sm text-gray-500 italic">&quot;{item.reason}&quot;</p>
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
