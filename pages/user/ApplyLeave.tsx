
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Send, FileText, PieChart } from 'lucide-react';

interface LeaveRequest {
  id: number;
  type: string;
  from: string;
  to: string;
  days: number;
  status: string;
  reason: string;
  appliedOn: string;
}

const ApplyLeave: React.FC = () => {
  const [formData, setFormData] = useState({
    type: 'Casual Leave (CL)',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Initialize history from localStorage
  const [history, setHistory] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('leave_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse leave history", e);
      }
    }
    return [];
  });

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('leave_history', JSON.stringify(history));
  }, [history]);

  const balances = [
    { type: 'Casual Leave', code: 'CL', available: 8, total: 12, color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' },
    { type: 'Sick Leave', code: 'SL', available: 8, total: 10, color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500' },
    { type: 'Privilege Leave', code: 'PL', available: 9, total: 15, color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      alert("Please fill in all fields.");
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Validation: Start date cannot be in the past
    if (start < today) {
       alert("You cannot apply for leave in the past.");
       return;
    }

    // Validation: End date cannot be before start date
    if (end < start) {
      alert("End date cannot be earlier than start date.");
      return;
    }
    
    // Simple day calculation (inclusive)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newLeave: LeaveRequest = {
      id: Date.now(),
      type: formData.type,
      from: formData.startDate,
      to: formData.endDate,
      days: isNaN(days) ? 1 : days,
      status: 'Pending',
      reason: formData.reason,
      appliedOn: new Date().toISOString().split('T')[0]
    };

    setHistory([newLeave, ...history]);
    setFormData({ type: 'Casual Leave (CL)', startDate: '', endDate: '', reason: '' });
    alert("Leave request submitted successfully!");
  };

  // Get today's date in YYYY-MM-DD format for the min attribute
  const todayDate = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Leave Management</h2>
        <p className="text-gray-500">Check your balances and apply for new leaves</p>
      </div>

      {/* Leave Balances Grid */}
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
        {/* Application Form */}
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
                  <option>Casual Leave (CL)</option>
                  <option>Sick Leave (SL)</option>
                  <option>Privilege Leave (PL)</option>
                  <option>Loss of Pay (LWP)</option>
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

        {/* History List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
               <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <Clock className="w-5 h-5 text-emerald-500" />
                 Recent History
               </h3>
               <button className="text-sm text-emerald-600 font-medium hover:underline">View All</button>
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
                      <span className="text-xs text-gray-400">Applied on {item.appliedOn}</span>
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
