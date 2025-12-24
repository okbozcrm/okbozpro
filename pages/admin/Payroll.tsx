import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DollarSign, Save, Download, Filter, Search, Calculator, RefreshCw, CheckCircle, Clock, X, Eye, CreditCard, Banknote, History, Trash2, Printer, User, ArrowLeft, Calendar, Building2, MapPin } from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, Employee, SalaryAdvanceRequest } from '../../types';

// FIX: Added formatCurrency helper to resolve "Cannot find name 'formatCurrency'" error
const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

interface PayrollEntry {
  employeeId: string;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  advanceDeduction: number;
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

interface ExtendedEmployee extends Employee {
    corporateId?: string;
    corporateName?: string;
}

const Payroll: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Salary' | 'Advances' | 'History'>('Salary');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [payrollData, setPayrollData] = useState<Record<string, PayrollEntry>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [history, setHistory] = useState<PayrollHistoryRecord[]>([]);
  const [viewBatch, setViewBatch] = useState<PayrollHistoryRecord | null>(null);
  const [viewSlip, setViewSlip] = useState<{entry: PayrollEntry, name: string, role: string, batchDate: string} | null>(null);
  const [advances, setAdvances] = useState<SalaryAdvanceRequest[]>([]);
  const [selectedAdvance, setSelectedAdvance] = useState<SalaryAdvanceRequest | null>(null);
  const [approvalForm, setApprovalForm] = useState({ approvedAmount: '', paymentMode: 'Bank Transfer' });
  const [corporatesList, setCorporatesList] = useState<any[]>([]);

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const [employees, setEmployees] = useState<ExtendedEmployee[]>([]);

  const loadData = () => {
      // 1. Load History
      let allHistory: any[] = [];
      const rootHistory = localStorage.getItem('payroll_history');
      if (rootHistory) allHistory = JSON.parse(rootHistory);
      
      if (isSuperAdmin) {
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          setCorporatesList(corps);
          corps.forEach((c: any) => {
              const cHistory = localStorage.getItem(`payroll_history_${c.email}`);
              if (cHistory) allHistory = [...allHistory, ...JSON.parse(cHistory)];
          });
      }
      setHistory(allHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      // 2. Load Advances
      let allAdvances: any[] = [];
      const rootAdv = localStorage.getItem('salary_advances');
      if (rootAdv) allAdvances = JSON.parse(rootAdv);
      if (isSuperAdmin) {
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          corps.forEach((c: any) => {
              const cAdv = localStorage.getItem(`salary_advances_${c.email}`);
              if (cAdv) allAdvances = [...allAdvances, ...JSON.parse(cAdv)];
          });
      }
      setAdvances(allAdvances);

      // 3. Load Employees
      let allEmp: ExtendedEmployee[] = [];
      if (isSuperAdmin) {
          const adminData = localStorage.getItem('staff_data');
          if (adminData) allEmp = JSON.parse(adminData).map((e: any) => ({...e, corporateId: 'admin', corporateName: 'Head Office'}));
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          corps.forEach((corp: any) => {
              const cData = localStorage.getItem(`staff_data_${corp.email}`);
              if (cData) allEmp = [...allEmp, ...JSON.parse(cData).map((e:any) => ({...e, corporateId: corp.email, corporateName: corp.companyName}))];
          });
      } else {
          const saved = localStorage.getItem(`staff_data_${sessionId}`);
          if (saved) allEmp = JSON.parse(saved);
      }
      setEmployees(allEmp);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [isSuperAdmin, sessionId]);

  const departments = useMemo(() => ['All', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))], [employees]);
  const branchOptions = useMemo(() => ['All', ...Array.from(new Set(employees.map(e => e.branch).filter(Boolean)))], [employees]);

  useEffect(() => {
    handleAutoCalculate();
  }, [employees, advances, selectedMonth]);

  const handleAutoCalculate = () => {
    setIsCalculating(true);
    const newPayrollData: Record<string, PayrollEntry> = {};
    const [year, monthStr] = selectedMonth.split('-').map(n => parseInt(n));
    const daysInMonth = new Date(year, monthStr, 0).getDate();

    employees.forEach(emp => {
        const monthlyCtc = parseFloat(emp.salary || '0');
        const attendance = getEmployeeAttendance(emp, year, monthStr - 1);
        let payableDays = 0;
        attendance.forEach(day => {
            if ([AttendanceStatus.PRESENT, AttendanceStatus.WEEK_OFF, AttendanceStatus.PAID_LEAVE].includes(day.status)) payableDays += 1;
            else if (day.status === AttendanceStatus.HALF_DAY) payableDays += 0.5;
        });

        const grossEarned = Math.round((monthlyCtc / daysInMonth) * payableDays);
        const paidAdvances = advances.filter(a => a.employeeId === emp.id && a.status === 'Paid').reduce((s, i) => s + (i.amountApproved || 0), 0);

        newPayrollData[emp.id] = {
            employeeId: emp.id,
            basicSalary: Math.round(grossEarned * 0.5),
            allowances: Math.round(grossEarned * 0.5),
            bonus: 0,
            deductions: 0,
            advanceDeduction: paidAdvances,
            payableDays,
            totalDays: daysInMonth,
            status: 'Pending'
        };
    });
    setPayrollData(newPayrollData);
    setIsCalculating(false);
  };

  const calculateNetPay = (entry: PayrollEntry) => (entry.basicSalary + entry.allowances + entry.bonus) - (entry.deductions + entry.advanceDeduction);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDepartment === 'All' || emp.department === filterDepartment;
    const matchesCorporate = isSuperAdmin ? (filterCorporate === 'All' || emp.corporateId === filterCorporate) : true;
    const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
    return matchesSearch && matchesDept && matchesCorporate && matchesBranch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2><p className="text-gray-500">View and aggregate company-wide payroll</p></div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            {['Salary', 'Advances', 'History'].map(t => (
                <button key={t} onClick={() => setActiveTab(t as any)} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === t ? 'bg-white shadow text-emerald-600' : 'text-gray-600'}`}>{t}</button>
            ))}
        </div>
      </div>

      {activeTab === 'Salary' && (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50">
            <div className="flex flex-wrap gap-2">
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                {isSuperAdmin && (
                    <select value={filterCorporate} onChange={(e) => setFilterCorporate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                        <option value="All">All Corporates</option>
                        {corporatesList.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                    </select>
                )}
                <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            <button 
                onClick={() => { 
                    const netTotal = Object.values(payrollData).reduce((s: number, e) => s + calculateNetPay(e as PayrollEntry), 0);
                    const record = { id: Date.now().toString(), name: `Payroll ${selectedMonth}`, date: new Date().toISOString(), totalAmount: netTotal, employeeCount: filteredEmployees.length, data: payrollData };
                    const key = isSuperAdmin ? 'payroll_history' : `payroll_history_${sessionId}`;
                    const currentHistory = JSON.parse(localStorage.getItem(key) || '[]');
                    localStorage.setItem(key, JSON.stringify([record, ...currentHistory]));
                    loadData();
                    alert("Payroll batch saved!"); 
                }} 
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-emerald-600 transition-colors"
            >
                Save Batch
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 border-b">
                    <tr><th className="px-6 py-4">Employee</th><th className="px-4 py-4">Days</th><th className="px-4 py-4">Gross Earned</th><th className="px-4 py-4">Advance Ded.</th><th className="px-6 py-4">Net Pay</th><th className="px-4 py-4 text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y">
                    {filteredEmployees.map(emp => {
                        const data = payrollData[emp.id];
                        if (!data) return null;
                        return (
                            <tr key={emp.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4"><div><div className="font-bold">{emp.name}</div><div className="text-xs text-gray-500">{emp.role} {isSuperAdmin && `• ${emp.corporateName}`}</div></div></td>
                                <td className="px-4 py-4">{data.payableDays}/{data.totalDays}</td>
                                <td className="px-4 py-4">₹{(data.basicSalary + data.allowances).toLocaleString()}</td>
                                <td className="px-4 py-4 text-red-500">-₹{data.advanceDeduction}</td>
                                <td className="px-6 py-4 font-bold">₹{calculateNetPay(data).toLocaleString()}</td>
                                <td className="px-4 py-4 text-center"><span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-[10px] font-bold">PENDING</span></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>
      )}
      
      {activeTab === 'History' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800">Payroll Batch History</div>
              <div className="divide-y divide-gray-100">
                  {history.map(batch => (
                      <div key={batch.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><History className="w-5 h-5"/></div>
                              <div>
                                  <p className="font-bold text-gray-800">{batch.name}</p>
                                  <p className="text-xs text-gray-500">Processed on {new Date(batch.date).toLocaleString()} • {batch.employeeCount} Staff</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="font-bold text-gray-900">{formatCurrency(batch.totalAmount)}</p>
                              <button className="text-xs text-indigo-600 font-bold hover:underline">View Breakdown</button>
                          </div>
                      </div>
                  ))}
                  {history.length === 0 && <div className="p-12 text-center text-gray-400">No payroll history found.</div>}
              </div>
          </div>
      )}
    </div>
  );
};

export default Payroll;