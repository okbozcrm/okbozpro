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

  const [employees, setEmployees] = useState<ExtendedEmployee[]>(() => {
    let all: ExtendedEmployee[] = [];
    if (isSuperAdmin) {
        const adminData = localStorage.getItem('staff_data');
        if (adminData) all = JSON.parse(adminData).map((e: any) => ({...e, corporateId: 'admin', corporateName: 'Head Office'}));
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporates.forEach((corp: any) => {
            const cData = localStorage.getItem(`staff_data_${corp.email}`);
            if (cData) all = [...all, ...JSON.parse(cData).map((e:any) => ({...e, corporateId: corp.email, corporateName: corp.companyName}))];
        });
    } else {
        const saved = localStorage.getItem(`staff_data_${sessionId}`);
        if (saved) all = JSON.parse(saved);
    }
    return all;
  });

  useEffect(() => {
    const loadData = () => {
        setAdvances(JSON.parse(localStorage.getItem('salary_advances') || '[]'));
        setHistory(JSON.parse(localStorage.getItem('payroll_history') || '[]'));
        if (isSuperAdmin) setCorporatesList(JSON.parse(localStorage.getItem('corporate_accounts') || '[]'));
    };
    loadData();
  }, [isSuperAdmin]);

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
        <div><h2 className="text-2xl font-bold text-gray-800">Payroll Management</h2><p className="text-gray-500">Manage salaries and advances</p></div>
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
            {/* FIX: Explicitly cast 's' to 'number' in reduce function to resolve 'unknown' type errors. */}
            <button onClick={() => { localStorage.setItem('payroll_history', JSON.stringify([{ id: Date.now(), name: `Payroll ${selectedMonth}`, date: new Date().toISOString(), totalAmount: Object.values(payrollData).reduce((s: number, e) => s + calculateNetPay(e as PayrollEntry), 0), employeeCount: employees.length, data: payrollData }, ...history])); alert("Payroll saved!"); }} className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold">Save Payroll</button>
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
                                <td className="px-6 py-4"><div><div className="font-bold">{emp.name}</div><div className="text-xs text-gray-500">{emp.role}</div></div></td>
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
    </div>
  );
};

export default Payroll;