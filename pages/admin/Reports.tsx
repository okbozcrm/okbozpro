import React, { useState, useEffect } from 'react';
import { 
  Download, Users, DollarSign, 
  TrendingUp, Briefcase, Building2, Search, RefreshCcw 
} from 'lucide-react';
import { AttendanceStatus, CorporateAccount, Employee, SalaryAdvanceRequest, TravelAllowanceRequest, DailyAttendance, Branch } from '../../types';
import { getEmployeeAttendance } from '../../constants';

interface ReportRow {
  employeeId: string;
  name: string;
  role: string;
  branch: string;
  corporateId: string;
  presentDays: number;
  totalDays: number;
  monthlySalary: number;
  grossEarned: number;
  travelIncentive: number;
  advanceDeduction: number;
  netPayable: number;
  status: string;
}

const Reports: React.FC = () => {
  const [filterType, setFilterType] = useState<'Date' | 'Month'>('Month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterCorporate, setFilterCorporate] = useState<string>('All');
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [staff, setStaff] = useState<Employee[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvanceRequest[]>([]);
  const [kmClaims, setKmClaims] = useState<TravelAllowanceRequest[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const fetchData = () => {
      setLoading(true);
      // 1. Fetch Advances & Claims
      setAdvances(JSON.parse(localStorage.getItem('salary_advances') || '[]'));
      setKmClaims(JSON.parse(localStorage.getItem('global_travel_requests') || '[]'));
      setBranches(JSON.parse(localStorage.getItem('branches') || '[]'));
      
      // 2. Fetch Staff
      let allStaff: Employee[] = [];
      let corps: CorporateAccount[] = [];

      if (isSuperAdmin) {
          const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
          allStaff = [...adminStaff.map((s: Employee) => ({ ...s, corporateId: 'admin' }))];
          
          corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          setCorporates(corps);

          corps.forEach((c: CorporateAccount) => {
              const cs = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
              allStaff = [...allStaff, ...cs.map((s: Employee) => ({ ...s, corporateId: c.email }))];
          });
      } else {
          // Corporate View
          const myStaff = JSON.parse(localStorage.getItem(`staff_data_${sessionId}`) || '[]');
          allStaff = myStaff.map((s: Employee) => ({ ...s, corporateId: sessionId }));
      }
      setStaff(allStaff);
      setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateReport();
  }, [staff, advances, kmClaims, selectedMonth, selectedDate, filterType, filterCorporate, filterBranch, searchTerm]);

  const calculateReport = () => {
    let targetYear = new Date().getFullYear();
    let targetMonth = new Date().getMonth();
    let daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    
    if (filterType === 'Month') {
        const [y, m] = selectedMonth.split('-').map(Number);
        targetYear = y;
        targetMonth = m - 1;
        daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    }

    const filteredStaff = staff.filter(emp => {
        const matchesCorp = isSuperAdmin ? (filterCorporate === 'All' || emp.corporateId === filterCorporate) : true;
        const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              emp.role.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCorp && matchesBranch && matchesSearch;
    });

    const rows: ReportRow[] = filteredStaff.map(emp => {
        const monthlyCtc = parseFloat(emp.salary || '0');
        const key = `attendance_data_${emp.id}_${targetYear}_${targetMonth}`;
        const saved = localStorage.getItem(key);
        const attendance: DailyAttendance[] = saved ? JSON.parse(saved) : getEmployeeAttendance(emp, targetYear, targetMonth);

        let payableDays = 0;
        
        if (filterType === 'Date') {
            const dayRecord = attendance.find(d => d.date === selectedDate);
            if (dayRecord) {
                if ([AttendanceStatus.PRESENT, AttendanceStatus.WEEK_OFF, AttendanceStatus.PAID_LEAVE, AttendanceStatus.HOLIDAY, AttendanceStatus.ALTERNATE_DAY].includes(dayRecord.status)) {
                    payableDays = 1;
                } else if (dayRecord.status === AttendanceStatus.HALF_DAY) {
                    payableDays = 0.5;
                }
            }
        } else {
            attendance.forEach((day) => {
                if ([
                    AttendanceStatus.PRESENT, 
                    AttendanceStatus.WEEK_OFF, 
                    AttendanceStatus.PAID_LEAVE, 
                    AttendanceStatus.HOLIDAY, 
                    AttendanceStatus.ALTERNATE_DAY
                ].includes(day.status)) {
                    payableDays += 1;
                } else if (day.status === AttendanceStatus.HALF_DAY) {
                    payableDays += 0.5;
                }
            });
        }

        // Calculate Gross Earned
        // If Date filter, we calculate per-day rate
        const grossEarned = filterType === 'Date' 
            ? Math.round((monthlyCtc / daysInMonth) * payableDays)
            : Math.round((monthlyCtc / daysInMonth) * payableDays);

        // Travel Incentive
        const travelIncentive = kmClaims
            .filter(r => r.employeeId === emp.id && (r.status === 'Approved' || r.status === 'Paid') && (filterType === 'Date' ? r.date === selectedDate : r.date.startsWith(selectedMonth)))
            .reduce((sum, r) => sum + r.totalAmount, 0);

        // Advance Deduction
        let advanceDeduction = 0;
        if (filterType === 'Month') { 
            advanceDeduction = advances
                .filter(a => a.employeeId === emp.id && a.status === 'Approved') // In real app, check if deduction month matches
                .reduce((s, i) => s + (i.amountApproved || 0), 0);
        }

        return {
            employeeId: emp.id,
            name: emp.name,
            role: emp.role,
            branch: emp.branch || '-',
            corporateId: emp.corporateId || '-',
            presentDays: payableDays,
            totalDays: filterType === 'Date' ? 1 : daysInMonth,
            monthlySalary: monthlyCtc,
            grossEarned,
            travelIncentive,
            advanceDeduction,
            netPayable: grossEarned + travelIncentive - advanceDeduction,
            status: 'Active'
        };
    });

    setReportData(rows);
  };

  const handleExportCSV = () => {
    const headers = ['Employee Name', 'Role', 'Branch', 'Present Days', 'Monthly Salary', 'Gross Earned', 'Travel Incentive', 'Advance Deduction', 'Net Payable'];
    const csvContent = [
        headers.join(','),
        ...reportData.map(row => [
            row.name,
            row.role,
            row.branch,
            row.presentDays,
            row.monthlySalary,
            row.grossEarned,
            row.travelIncentive,
            row.advanceDeduction,
            row.netPayable
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Report_${filterType}_${filterType === 'Date' ? selectedDate : selectedMonth}.csv`;
    link.click();
  };

  // Stats for Cards
  const totalPayroll = reportData.reduce((sum, r) => sum + r.grossEarned, 0);
  const totalIncentives = reportData.reduce((sum, r) => sum + r.travelIncentive, 0);
  const totalDeductions = reportData.reduce((sum, r) => sum + r.advanceDeduction, 0);
  const netPayout = totalPayroll + totalIncentives - totalDeductions;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2>
            <p className="text-gray-500">Attendance-synced performance insights & payroll estimation</p>
        </div>
        <div className="flex gap-2">
            <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                <RefreshCcw className="w-4 h-4" />
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium">
                <Download className="w-4 h-4" /> Export CSV
            </button>
        </div>
       </div>

       {/* Filters */}
       <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button onClick={() => setFilterType('Month')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === 'Month' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Month</button>
                    <button onClick={() => setFilterType('Date')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === 'Date' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Date</button>
                </div>
                
                {filterType === 'Month' ? (
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
                ) : (
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />
                )}

                {isSuperAdmin && (
                    <select value={filterCorporate} onChange={(e) => setFilterCorporate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm">
                        <option value="All">All Corporates</option>
                        <option value="admin">Head Office</option>
                        {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                    </select>
                )}

                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm">
                    <option value="All">All Branches</option>
                    {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                </select>
            </div>
            
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search employee..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
            </div>
       </div>

       {/* Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Staff</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">{reportData.length}</h3>
                    </div>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-5 h-5" /></div>
                </div>
                <div className="mt-4 text-xs text-gray-400">Active employees in report</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Payroll</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">₹{totalPayroll.toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
                </div>
                <div className="mt-4 text-xs text-gray-400">Based on attendance</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Incentives</p>
                        <h3 className="text-2xl font-bold text-purple-600 mt-1">₹{totalIncentives.toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                </div>
                <div className="mt-4 text-xs text-gray-400">Travel & Performance</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Payout</p>
                        <h3 className="text-2xl font-bold text-indigo-600 mt-1">₹{netPayout.toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Briefcase className="w-5 h-5" /></div>
                </div>
                <div className="mt-4 text-xs text-gray-400">After deductions</div>
            </div>
       </div>

       {/* Detailed Report Table */}
       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" /> 
                    Detailed Payroll Report ({filterType === 'Date' ? selectedDate : selectedMonth})
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3">Employee</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Branch</th>
                            <th className="px-6 py-3 text-center">Present Days</th>
                            <th className="px-6 py-3 text-right">Monthly CTC</th>
                            <th className="px-6 py-3 text-right">Gross Earned</th>
                            <th className="px-6 py-3 text-right">Incentives</th>
                            <th className="px-6 py-3 text-right">Deductions</th>
                            <th className="px-6 py-3 text-right">Net Payable</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">Loading data...</td></tr>
                        ) : reportData.length === 0 ? (
                            <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">No records found for the selected period.</td></tr>
                        ) : (
                            reportData.map((row) => (
                                <tr key={row.employeeId} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-gray-800">{row.name}</td>
                                    <td className="px-6 py-3 text-gray-500 text-xs">{row.role}</td>
                                    <td className="px-6 py-3 text-gray-500 text-xs">{row.branch}</td>
                                    <td className="px-6 py-3 text-center">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-bold text-xs">
                                            {row.presentDays} / {row.totalDays}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right text-gray-500">₹{row.monthlySalary.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-right font-medium text-gray-800">₹{row.grossEarned.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-right text-emerald-600">+₹{row.travelIncentive.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-right text-red-500">-₹{row.advanceDeduction.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-right font-bold text-indigo-600">₹{row.netPayable.toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
       </div>
    </div>
  );
};

export default Reports;
