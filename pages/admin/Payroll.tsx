
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DollarSign, Save, Download, Filter, Search, Calculator, RefreshCw, CheckCircle, Clock, X, Eye, CreditCard, Banknote, History, Trash2, Printer, User, ArrowLeft, Calendar, Building2, MapPin } from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, SalaryAdvanceRequest } from '../../types';

interface PayrollEntry {
  employeeId: string;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  advanceDeduction: number; // New field
  payableDays: number;
  totalDays: number;
  status: 'Paid' | 'Pending';
}

interface PayrollHistoryRecord {
  id: string;
  name: string;
  date: string;
  totalAmount: number;
  employeeCount: number;
  data: Record<string, PayrollEntry>;
}

// Extended Employee type for internal use
interface ExtendedEmployee extends Employee {
    corporateId?: string;
    corporateName?: string;
}

const Payroll: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Salary' | 'Advances' | 'History'>('Salary');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');

  const [payrollData, setPayrollData] = useState<Record<string, PayrollEntry>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [history, setHistory] = useState<PayrollHistoryRecord[]>([]);
  
  // History Drill-down States
  const [viewBatch, setViewBatch] = useState<PayrollHistoryRecord | null>(null);
  const [viewSlip, setViewSlip] = useState<{entry: PayrollEntry, name: string, role: string, batchDate: string} | null>(null);

  // Advances State
  const [advances, setAdvances] = useState<SalaryAdvanceRequest[]>([]);
  const [selectedAdvance, setSelectedAdvance] = useState<SalaryAdvanceRequest | null>(null);
  const [approvalForm, setApprovalForm] = useState({ approvedAmount: '', paymentMode: 'Bank Transfer' });

  // Data Lists
  const [corporatesList, setCorporatesList] = useState<any[]>([]);

  // Determine Session Context
  const getSessionKey = () => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? 'staff_data' : `staff_data_${sessionId}`;
  };

  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  // Load employees with Metadata
  const [employees, setEmployees] = useState<ExtendedEmployee[]>(() => {
    if (isSuperAdmin) {
        let allEmployees: ExtendedEmployee[] = [];
        
        // 1. Admin Data (Head Office)
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { 
                const parsed = JSON.parse(adminData);
                allEmployees = [...allEmployees, ...parsed.map((e: any) => ({...e, corporateId: 'admin', corporateName: 'Head Office'}))]; 
            } catch (e) {}
        } else {
            allEmployees = [...allEmployees, ...MOCK_EMPLOYEES.map(e => ({...e, corporateId: 'admin', corporateName: 'Head Office'}))];
        }

        // 2. Corporate Data
        try {
            const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corporates.forEach((corp: any) => {
                const cData = localStorage.getItem(`staff_data_${corp.email}`);
                if (cData) {
                    try { 
                        const parsed = JSON.parse(cData);
                        allEmployees = [...allEmployees, ...parsed.map((e:any) => ({...e, corporateId: corp.email, corporateName: corp.companyName}))]; 
                    } catch (e) {}
                }
            });
        } catch(e) {}
        
        return allEmployees;
    } else {
        const key = getSessionKey();
        const saved = localStorage.getItem(key);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return [];
    }
  });

  // Load Corporates List & Other Data
  useEffect(() => {
      const loadData = () => {
          const allAdvances = JSON.parse(localStorage.getItem('salary_advances') || '[]');
          setAdvances(allAdvances.sort((a: any, b: any) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));

          const savedHistory = localStorage.getItem('payroll_history');
          if (savedHistory) {
              try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
          }

          if (isSuperAdmin) {
              const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
              setCorporatesList(corps);
          }
      };
      
      loadData();
      const handleStorage = () => loadData();
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
  }, [isSuperAdmin]);

  // Derived Lists for Filters
  const departments = useMemo(() => {
      const depts = new Set(employees.map(e => e.department).filter(Boolean));
      return ['All', ...Array.from(depts)];
  }, [employees]);

  const branchOptions = useMemo(() => {
      let relevantEmployees = employees;
      if (isSuperAdmin && filterCorporate !== 'All') {
          relevantEmployees = employees.filter(e => e.corporateId === filterCorporate);
      }
      const branches = new Set(relevantEmployees.map(e => e.branch).filter(Boolean));
      return ['All', ...Array.from(branches)];
  }, [employees, filterCorporate, isSuperAdmin]);

  // Persist History
  useEffect(() => {
      localStorage.setItem('payroll_history', JSON.stringify(history));
  }, [history]);

  // Auto-calculate on mount or when month/filters changes
  useEffect(() => {
    handleAutoCalculate();
  }, [employees, advances, selectedMonth]); 

  const handleAutoCalculate = () => {
    setIsCalculating(true);
    const newPayrollData: Record<string, PayrollEntry> = {};
    
    // Parse selected month
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    employees.forEach(emp => {
        // 1. Get Base Salary
        const monthlyCtc = parseFloat(emp.salary || '50000');
        
        // 2. Get Attendance for SELECTED Month
        const attendance = getEmployeeAttendance(emp, year, monthIndex);
        
        // 3. Calculate Payable Days
        let payableDays = 0;
        attendance.forEach(day => {
            if (day.status === AttendanceStatus.PRESENT || 
                day.status === AttendanceStatus.WEEK_OFF || 
                day.status === AttendanceStatus.PAID_LEAVE) {
                payableDays += 1;
            } else if (day.status === AttendanceStatus.HALF_DAY) {
                payableDays += 0.5;
            }
        });

        // 4. Calculate Pro-rated Salary
        const perDaySalary = monthlyCtc / daysInMonth;
        const grossEarned = Math.round(perDaySalary * payableDays);

        // 5. Breakdown
        const basicSalary = Math.round(grossEarned * 0.5);
        const hra = Math.round(grossEarned * 0.3);
        const allowances = Math.round(grossEarned * 0.2);
        
        // 6. Deductions: Fetch PAID Advances
        const employeeAdvances = advances.filter(a => a.employeeId === emp.id && a.status === 'Paid');
        const advanceDeduction = employeeAdvances.reduce((sum, item) => sum + (item.amountApproved || 0), 0);
        
        // Preserve existing manual edits if entry exists
        const existingEntry = payrollData[emp.id];

        newPayrollData[emp.id] = {
            employeeId: emp.id,
            basicSalary: basicSalary,
            allowances: hra + allowances,
            bonus: existingEntry ? existingEntry.bonus : 0,
            deductions: existingEntry ? existingEntry.deductions : 0,
            advanceDeduction: advanceDeduction,
            payableDays,
            totalDays: daysInMonth,
            status: existingEntry ? existingEntry.status : 'Pending'
        };
    });

    setTimeout(() => {
        setPayrollData(newPayrollData);
        setIsCalculating(false);
    }, 500);
  };

  const handleInputChange = (empId: string, field: keyof PayrollEntry, value: string) => {
    const cleanValue = value.replace(/^0+/, '') || '0';
    const numValue = parseFloat(cleanValue);
    
    setPayrollData(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: isNaN(numValue) ? 0 : numValue
      }
    }));
  };

  const handleStatusChange = (empId: string, newStatus: 'Paid' | 'Pending') => {
    setPayrollData(prev => ({
        ...prev,
        [empId]: {
            ...prev[empId],
            status: newStatus
        }
    }));
  };

  // --- Advance Approval Logic ---
  const handleOpenApproval = (req: SalaryAdvanceRequest) => {
      setSelectedAdvance(req);
      setApprovalForm({ 
          approvedAmount: req.amountRequested.toString(), 
          paymentMode: 'Bank Transfer' 
      });
  };

  const handleApproveAdvance = () => {
      if(!selectedAdvance) return;
      
      const updatedAdvances = advances.map(a => {
          if (a.id === selectedAdvance.id) {
              return {
                  ...a,
                  status: 'Paid' as const,
                  amountApproved: parseFloat(approvalForm.approvedAmount) || 0,
                  paymentMode: approvalForm.paymentMode,
                  paymentDate: new Date().toISOString()
              };
          }
          return a;
      });
      
      setAdvances(updatedAdvances);
      localStorage.setItem('salary_advances', JSON.stringify(updatedAdvances));
      setSelectedAdvance(null);
      handleAutoCalculate(); 
  };

  const handleRejectAdvance = () => {
      if(!selectedAdvance) return;
      const updatedAdvances = advances.map(a => 
          a.id === selectedAdvance.id ? { ...a, status: 'Rejected' as const } : a
      );
      setAdvances(updatedAdvances);
      localStorage.setItem('salary_advances', JSON.stringify(updatedAdvances));
      setSelectedAdvance(null);
  };

  // --- Save Record / History Logic ---
  const handleSaveRecords = () => {
      const totalAmount = (Object.values(payrollData) as PayrollEntry[]).reduce((sum, entry) => sum + calculateNetPay(entry), 0);
      
      // Use selected month date for the record name
      const [yearStr, monthStr] = selectedMonth.split('-');
      const batchDate = new Date(parseInt(yearStr), parseInt(monthStr)-1, 1);
      
      const newRecord: PayrollHistoryRecord = {
          id: `PAY-${Date.now()}`,
          name: `Payroll - ${batchDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          date: new Date().toISOString(),
          totalAmount,
          employeeCount: employees.length,
          data: payrollData
      };
      
      setHistory([newRecord, ...history]);
      alert("Payroll record saved to History successfully!");
      setActiveTab('History');
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm("Are you sure you want to delete this payroll record?")) {
          setHistory(prev => prev.filter(h => h.id !== id));
      }
  };

  const calculateNetPay = (entry: PayrollEntry | undefined) => {
    if (!entry) return 0;
    return (entry.basicSalary || 0) + (entry.allowances || 0) + (entry.bonus || 0) - (entry.deductions || 0) - (entry.advanceDeduction || 0);
  };

  // --- Lookup Helper for History View ---
  const getEmployeeDetails = (empId: string) => {
      return employees.find(e => e.id === empId) || { name: 'Unknown Employee', role: 'N/A' };
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDepartment === 'All' || emp.department === filterDepartment;
    const matchesCorporate = isSuperAdmin ? (filterCorporate === 'All' || emp.corporateId === filterCorporate) : true;
    const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
    
    const entry = payrollData[emp.id];
    const matchesStatus = filterStatus === 'All' || (entry && entry.status === filterStatus) || (!entry && filterStatus === 'Pending');

    return matchesSearch && matchesDept && matchesCorporate && matchesBranch && matchesStatus;
  });

  const filteredAdvances = advances.filter(a => 
    a.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) && 
    a.status !== 'Rejected'
  );

  const totalPayroll = (Object.values(payrollData) as PayrollEntry[]).reduce((sum, entry) => sum + calculateNetPay(entry), 0);
  
  return (
    <div className="space-y-6">
        {/* CSS for printing */}
        <style>{`
            @media print {
                body * {
                    visibility: hidden;
                }
                .printable-slip, .printable-slip * {
                    visibility: visible;
                }
                .printable-slip {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: white;
                    padding: 20px;
                    z-index: 9999;
                }
                .no-print {
                    display: none !important;
                }
            }
        `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2>
          <p className="text-gray-500">Manage salaries, deductions, and advance requests</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('Salary')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'Salary' ? 'bg-white shadow text-emerald-600' : 'text-gray-600'}`}
            >
                Monthly Salary
            </button>
            <button 
                onClick={() => setActiveTab('Advances')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'Advances' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
            >
                Advance Requests
                {advances.filter(a => a.status === 'Pending').length > 0 && (
                    <span className="w-5 h-5 flex items-center justify-center bg-red-50 text-white text-[10px] rounded-full">
                        {advances.filter(a => a.status === 'Pending').length}
                    </span>
                )}
            </button>
            <button 
                onClick={() => setActiveTab('History')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'History' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
            >
                Payroll History
            </button>
        </div>
      </div>

      {activeTab === 'Salary' && (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col gap-4 bg-gray-50">
             
             <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                {/* Search & Filters */}
                <div className="flex flex-wrap gap-3 w-full md:w-auto flex-1">
                    <div className="relative min-w-[200px] flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Search employee..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        />
                    </div>
                    
                    <input 
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    {isSuperAdmin && (
                        <select 
                            value={filterCorporate}
                            onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                            <option value="All">All Corporates</option>
                            <option value="admin">Head Office</option>
                            {corporatesList.map(c => (
                                <option key={c.email} value={c.email}>{c.companyName}</option>
                            ))}
                        </select>
                    )}

                    <select 
                        value={filterBranch}
                        onChange={(e) => setFilterBranch(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                        <option value="All">All Branches</option>
                        {branchOptions.map(branch => (
                            <option key={branch} value={branch}>{branch}</option>
                        ))}
                    </select>

                    <select 
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept === 'All' ? 'All Depts' : dept}</option>
                        ))}
                    </select>

                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                    </select>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="text-right hidden lg:block mr-2">
                        <p className="text-xs text-gray-500 uppercase font-bold">Total Payout</p>
                        <p className="text-lg font-bold text-gray-900">₹{totalPayroll.toLocaleString()}</p>
                    </div>
                    <button 
                    onClick={handleAutoCalculate}
                    disabled={isCalculating}
                    className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} /> 
                        {isCalculating ? 'Calc...' : 'Recalculate'}
                    </button>
                    <button 
                        onClick={handleSaveRecords}
                        className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 shadow-sm transition-colors"
                    >
                        <Save className="w-4 h-4" /> Save
                    </button>
                </div>
             </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-4 w-64">Employee</th>
                        <th className="px-4 py-4 text-center">Days</th>
                        <th className="px-4 py-4">Basic + Allow</th>
                        <th className="px-4 py-4">Bonus</th>
                        <th className="px-4 py-4 text-red-600">Other Ded.</th>
                        <th className="px-4 py-4 text-orange-600">Adv. Ded.</th>
                        <th className="px-6 py-4 bg-gray-50">Net Pay</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredEmployees.map(emp => {
                        const data = payrollData[emp.id] || { 
                          employeeId: emp.id,
                          basicSalary: 0, allowances: 0, bonus: 0, deductions: 0, advanceDeduction: 0,
                          payableDays: 0, totalDays: 30, status: 'Pending'
                        };
                        const netPay = calculateNetPay(data);

                        return (
                            <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={emp.avatar} alt="" className="w-10 h-10 rounded-full border border-gray-200" />
                                        <div>
                                            <div className="font-semibold text-gray-900">{emp.name}</div>
                                            <div className="text-xs text-emerald-600 font-medium">{emp.department} • {emp.role}</div>
                                            {isSuperAdmin && emp.corporateName && (
                                                <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                    <Building2 className="w-2.5 h-2.5" /> {emp.corporateName}
                                                </div>
                                            )}
                                            {emp.branch && (
                                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <MapPin className="w-2.5 h-2.5" /> {emp.branch}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <div className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-full inline-block">
                                        {data.payableDays}/{data.totalDays}
                                    </div>
                                </td>
                                <td className="px-4 py-4 font-medium">
                                    ₹{(data.basicSalary + data.allowances).toLocaleString()}
                                </td>
                                <td className="px-4 py-4">
                                    <input 
                                        type="number" 
                                        className="w-20 px-2 py-1 border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        value={data.bonus || ''}
                                        onChange={(e) => handleInputChange(emp.id, 'bonus', e.target.value)}
                                        placeholder="0"
                                    />
                                </td>
                                <td className="px-4 py-4">
                                    <input 
                                        type="number" 
                                        className="w-20 px-2 py-1 border border-gray-200 rounded text-right text-red-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                                        value={data.deductions || ''}
                                        onChange={(e) => handleInputChange(emp.id, 'deductions', e.target.value)}
                                        placeholder="0"
                                    />
                                </td>
                                <td className="px-4 py-4 font-medium text-orange-600">
                                    -₹{data.advanceDeduction}
                                </td>
                                <td className="px-6 py-4 bg-gray-50 font-bold text-gray-900">
                                    ₹{netPay.toLocaleString()}
                                </td>
                                <td className="px-4 py-4">
                                    <select 
                                        value={data.status} 
                                        onChange={(e) => handleStatusChange(emp.id, e.target.value as 'Paid' | 'Pending')}
                                        className={`px-2 py-1 rounded-full text-xs font-bold border outline-none cursor-pointer ${
                                            data.status === 'Paid' 
                                            ? 'bg-green-50 text-green-700 border-green-200' 
                                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Paid">Paid</option>
                                    </select>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <button className="text-gray-400 hover:text-emerald-600 p-2" title="Download Payslip">
                                        <Download className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    {filteredEmployees.length === 0 && (
                        <tr>
                            <td colSpan={9} className="py-8 text-center text-gray-400">
                                No employees found matching the filters.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
      )}

      {activeTab === 'Advances' && (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px] animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-800">Requests Overview</h3>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
                      <tr>
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4">Requested Date</th>
                          <th className="px-6 py-4">Reason</th>
                          <th className="px-6 py-4 text-right">Amount Requested</th>
                          <th className="px-6 py-4 text-right">Approved Amount</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredAdvances.map(req => (
                          <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900">{req.employeeName}</td>
                              <td className="px-6 py-4 text-gray-500">{new Date(req.requestDate).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{req.reason}</td>
                              <td className="px-6 py-4 text-right font-medium">₹{req.amountRequested}</td>
                              <td className="px-6 py-4 text-right text-emerald-600 font-bold">
                                  {req.status === 'Paid' ? `₹${req.amountApproved}` : '-'}
                              </td>
                              <td className="px-6 py-4 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      req.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                      req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                      'bg-yellow-100 text-yellow-700'
                                  }`}>
                                      {req.status === 'Paid' ? 'Paid & Deducted' : req.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  {req.status === 'Pending' && (
                                      <button 
                                          onClick={() => handleOpenApproval(req)}
                                          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                      >
                                          Review
                                      </button>
                                  )}
                              </td>
                          </tr>
                      ))}
                      {filteredAdvances.length === 0 && (
                          <tr>
                              <td colSpan={7} className="py-12 text-center text-gray-400">No advance requests found.</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
      )}

      {activeTab === 'History' && (
        <>
        {viewBatch ? (
            // BATCH DETAIL VIEW
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4">
               <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                       <button onClick={() => setViewBatch(null)} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm text-gray-500">
                           <ArrowLeft className="w-5 h-5" />
                       </button>
                       <div>
                           <h3 className="font-bold text-gray-800 text-lg">{viewBatch.name}</h3>
                           <p className="text-xs text-gray-500">Generated on {new Date(viewBatch.date).toLocaleDateString()}</p>
                       </div>
                   </div>
                   <div className="text-right">
                       <span className="block text-xs font-bold text-gray-500 uppercase">Total Payout</span>
                       <span className="text-xl font-bold text-emerald-600">₹{viewBatch.totalAmount.toLocaleString()}</span>
                   </div>
               </div>
               
               <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                       <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
                           <tr>
                               <th className="px-6 py-4">Employee</th>
                               <th className="px-6 py-4">Role</th>
                               <th className="px-6 py-4 text-right">Basic + Allow</th>
                               <th className="px-6 py-4 text-right">Bonus</th>
                               <th className="px-6 py-4 text-right text-red-600">Deductions</th>
                               <th className="px-6 py-4 text-right bg-gray-50 font-bold">Net Pay</th>
                               <th className="px-6 py-4 text-center">Status</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                           {(Object.values(viewBatch.data) as PayrollEntry[]).map((entry) => {
                               const empDetails = getEmployeeDetails(entry.employeeId);
                               const netPay = calculateNetPay(entry);
                               return (
                                   <tr 
                                     key={entry.employeeId} 
                                     className="hover:bg-blue-50 transition-colors cursor-pointer group"
                                     onClick={() => setViewSlip({ 
                                         entry, 
                                         name: empDetails.name, 
                                         role: empDetails.role, 
                                         batchDate: viewBatch.date 
                                     })}
                                   >
                                       <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2 group-hover:text-blue-600">
                                           <User className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                           {empDetails.name}
                                       </td>
                                       <td className="px-6 py-4 text-gray-600">{empDetails.role}</td>
                                       <td className="px-6 py-4 text-right">₹{(entry.basicSalary + entry.allowances).toLocaleString()}</td>
                                       <td className="px-6 py-4 text-right text-green-600">
                                           {entry.bonus > 0 ? `+₹${entry.bonus}` : '-'}
                                       </td>
                                       <td className="px-6 py-4 text-right text-red-600">
                                           {(entry.deductions + entry.advanceDeduction) > 0 ? `-₹${entry.deductions + entry.advanceDeduction}` : '-'}
                                       </td>
                                       <td className="px-6 py-4 text-right bg-gray-50 font-bold text-gray-900">
                                           ₹{netPay.toLocaleString()}
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                           <span className={`px-2 py-1 rounded-full text-xs font-bold ${entry.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                               {entry.status}
                                           </span>
                                       </td>
                                   </tr>
                               );
                           })}
                       </tbody>
                   </table>
               </div>
            </div>
        ) : (
            // HISTORY LIST VIEW
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" /> Past Payroll Batches
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Batch Name</th>
                                <th className="px-6 py-4">Generated On</th>
                                <th className="px-6 py-4 text-center">Employees</th>
                                <th className="px-6 py-4 text-right">Total Payout</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.length === 0 ? (
                                <tr><td colSpan={6} className="py-12 text-center text-gray-400 italic">No history available. Save a record from Monthly Salary tab.</td></tr>
                            ) : (
                                history.map(record => (
                                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">{record.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{new Date(record.date).toLocaleDateString()} <span className="text-xs text-gray-400">{new Date(record.date).toLocaleTimeString()}</span></td>
                                        <td className="px-6 py-4 text-center cursor-pointer" onClick={() => setViewBatch(record)}>
                                            <span className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors">
                                                {record.employeeCount} Staff
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600">₹{record.totalAmount.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto">
                                                <CheckCircle className="w-3 h-3" /> Completed
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => setViewBatch(record)}
                                                    className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded transition-colors" 
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDeleteHistory(record.id, e)}
                                                    className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors" 
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        </>
      )}

      {/* Approval Modal */}
      {selectedAdvance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="font-bold text-gray-800">Approve Advance</h3>
                      <button onClick={() => setSelectedAdvance(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <span className="text-sm text-blue-800">Requested by <strong>{selectedAdvance.employeeName}</strong></span>
                          <span className="font-bold text-blue-900">₹{selectedAdvance.amountRequested}</span>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Approved Amount</label>
                          <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                              <input 
                                  type="number" 
                                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-800"
                                  value={approvalForm.approvedAmount}
                                  onChange={(e) => setApprovalForm({...approvalForm, approvedAmount: e.target.value})}
                              />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">You can approve a partial amount.</p>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Mode</label>
                          <div className="grid grid-cols-2 gap-3">
                              <button 
                                  onClick={() => setApprovalForm({...approvalForm, paymentMode: 'Cash'})}
                                  className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${approvalForm.paymentMode === 'Cash' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 hover:bg-gray-50'}`}
                              >
                                  <Banknote className="w-5 h-5" /> <span className="text-xs font-bold">Cash</span>
                              </button>
                              <button 
                                  onClick={() => setApprovalForm({...approvalForm, paymentMode: 'Bank Transfer'})}
                                  className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${approvalForm.paymentMode === 'Bank Transfer' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 hover:bg-gray-50'}`}
                              >
                                  <CreditCard className="w-5 h-5" /> <span className="text-xs font-bold">Bank / UPI</span>
                              </button>
                          </div>
                      </div>

                      <div className="pt-2 flex gap-3">
                          <button onClick={handleRejectAdvance} className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 transition-colors">Reject</button>
                          <button onClick={handleApproveAdvance} className="flex-[2] py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md transition-colors">Pay & Approve</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Individual Payslip Modal */}
      {viewSlip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="printable-slip bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                  
                  {/* Header (Visible on screen and print) */}
                  <div className="p-6 border-b border-gray-200 bg-gray-50">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <h2 className="text-2xl font-bold text-gray-900">Payslip</h2>
                              <p className="text-sm text-gray-500">OK BOZ Staff Management</p>
                          </div>
                          <div className="text-right">
                              <p className="font-mono text-sm font-bold text-gray-800">#{viewSlip.entry.employeeId}</p>
                              <p className="text-xs text-gray-500">{new Date(viewSlip.batchDate).toLocaleDateString()}</p>
                          </div>
                      </div>
                      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                          <div>
                              <p className="text-xs text-gray-400 uppercase font-bold">Employee</p>
                              <p className="font-bold text-gray-800">{viewSlip.name}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-gray-400 uppercase font-bold">Role</p>
                              <p className="font-medium text-gray-700">{viewSlip.role}</p>
                          </div>
                      </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-6">
                      
                      {/* Earnings */}
                      <div>
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b border-gray-100 pb-1">Earnings</h4>
                          <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                  <span className="text-gray-600">Basic Salary</span>
                                  <span className="font-medium text-gray-900">₹{viewSlip.entry.basicSalary.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="text-gray-600">Allowances (HRA/Special)</span>
                                  <span className="font-medium text-gray-900">₹{viewSlip.entry.allowances.toLocaleString()}</span>
                              </div>
                              {viewSlip.entry.bonus > 0 && (
                                  <div className="flex justify-between">
                                      <span className="text-gray-600">Bonus / Incentives</span>
                                      <span className="font-medium text-emerald-600">+₹{viewSlip.entry.bonus.toLocaleString()}</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Deductions */}
                      {(viewSlip.entry.deductions > 0 || viewSlip.entry.advanceDeduction > 0) && (
                          <div>
                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b border-gray-100 pb-1">Deductions</h4>
                              <div className="space-y-2 text-sm">
                                  {viewSlip.entry.deductions > 0 && (
                                      <div className="flex justify-between">
                                          <span className="text-gray-600">Other Deductions</span>
                                          <span className="font-medium text-red-600">-₹{viewSlip.entry.deductions.toLocaleString()}</span>
                                      </div>
                                  )}
                                  {viewSlip.entry.advanceDeduction > 0 && (
                                      <div className="flex justify-between">
                                          <span className="text-gray-600">Salary Advance Repayment</span>
                                          <span className="font-medium text-orange-600">-₹{viewSlip.entry.advanceDeduction.toLocaleString()}</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      {/* Total */}
                      <div className="pt-4 border-t-2 border-gray-200 flex justify-between items-center">
                          <div>
                              <p className="text-sm font-bold text-gray-800">Net Payable</p>
                              <p className="text-xs text-gray-500">{viewSlip.entry.payableDays} Paid Days</p>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">₹{calculateNetPay(viewSlip.entry).toLocaleString()}</p>
                      </div>
                  </div>

                  {/* Footer (Actions - Hidden on Print) */}
                  <div className="no-print p-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                      <button 
                          onClick={() => setViewSlip(null)} 
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                      >
                          Close
                      </button>
                      <button 
                          onClick={() => window.print()} 
                          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors flex items-center gap-2"
                      >
                          <Printer className="w-4 h-4" /> Print Slip
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Payroll;
