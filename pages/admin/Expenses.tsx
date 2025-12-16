
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, DollarSign, 
  PieChart, FileText, 
  CheckCircle, X, Download,
  Smartphone, Zap, Wifi, Users, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, Building2, Upload, Loader2, Paperclip, Eye, Edit2, Trash2, Printer, MapPin, Filter, RefreshCcw, Calendar
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { uploadFileToCloud } from '../../services/cloudService';

interface Expense {
  id: string;
  transactionNumber: string; 
  type: 'Income' | 'Expense';
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  status: 'Paid' | 'Pending';
  description?: string;
  franchiseName?: string; 
  corporateId?: string; // Added for filtering
  branch?: string; // Added for filtering
  receiptUrl?: string; 
}

const EXPENSE_CATEGORIES = [
  'Office Rent',
  'Manager Salary',
  'Staff Salary',
  'EB Rent (Electricity)',
  'Internet Rent',
  'Cell Phone Fee',
  'Utility Expense',
  'Coupon No of Booking',
  'Marketing',
  'Other Expenses'
];

const INCOME_CATEGORIES = [
  'Sales',
  'Consulting Fee',
  'Service Charge',
  'Commission',
  'Investment',
  'Refund',
  'Other Income'
];

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'];

const Expenses: React.FC = () => {
  // Determine Session Context
  const getSessionKey = () => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? 'office_expenses' : `office_expenses_${sessionId}`;
  };

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // State
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (isSuperAdmin) {
        // --- SUPER ADMIN AGGREGATION ---
        let allExpenses: Expense[] = [];
        
        // 1. Admin Data
        const adminData = localStorage.getItem('office_expenses');
        if (adminData) {
            try { 
                const parsed = JSON.parse(adminData);
                allExpenses = [...allExpenses, ...parsed.map((e: any) => ({...e, franchiseName: 'Head Office', corporateId: 'admin'}))];
            } catch (e) {}
        }

        // 2. Corporate Data
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporates.forEach((corp: any) => {
            const cData = localStorage.getItem(`office_expenses_${corp.email}`);
            if (cData) {
                try {
                    const parsed = JSON.parse(cData);
                    const tagged = parsed.map((e: any) => ({...e, franchiseName: corp.companyName, corporateId: corp.email}));
                    allExpenses = [...allExpenses, ...tagged];
                } catch (e) {}
            }
        });
        return allExpenses;
    } else {
        const key = getSessionKey();
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
        return [];
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // --- FILTERS STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All'); 
  
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterDateType, setFilterDateType] = useState<'Month' | 'Date'>('Month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD

  // --- DATA LOADING FOR DROPDOWNS ---
  const [corporates, setCorporates] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);

  useEffect(() => {
      // Load Corporates
      const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      setCorporates(corps);

      // Load Branches
      let branches: any[] = [];
      if (isSuperAdmin) {
          const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
          branches = [...branches, ...adminBranches.map((b:any) => ({...b, corporateId: 'admin'}))];
          
          corps.forEach((c: any) => {
              const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
              branches = [...branches, ...cBranches.map((b:any) => ({...b, corporateId: c.email}))];
          });
      } else {
          const key = `branches_data_${sessionId}`;
          const saved = localStorage.getItem(key);
          if (saved) branches = JSON.parse(saved).map((b:any) => ({...b, corporateId: sessionId}));
      }
      setAllBranches(branches);
  }, [isSuperAdmin, sessionId]);

  // Derived available branches based on corporate selection
  const availableBranches = useMemo(() => {
      if (filterCorporate === 'All') return allBranches;
      return allBranches.filter(b => b.corporateId === filterCorporate);
  }, [allBranches, filterCorporate]);

  // Branches specifically for the Add/Edit form (current user context)
  const formBranches = useMemo(() => {
      if (isSuperAdmin) return allBranches.filter(b => b.corporateId === 'admin');
      return allBranches.filter(b => b.corporateId === sessionId);
  }, [allBranches, isSuperAdmin, sessionId]);
  
  
  const [rawReceiptPreviewUrl, setRawReceiptPreviewUrl] = useState<string | null>(null); 
  const [showInvoiceViewer, setShowInvoiceViewer] = useState(false); 
  const [invoiceData, setInvoiceData] = useState<Expense | null>(null); 

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const initialFormState: Partial<Expense> = {
    type: 'Expense',
    transactionNumber: '',
    title: '',
    category: 'Other Expenses',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    status: 'Pending',
    description: '',
    receiptUrl: '',
    branch: '' // Added branch to form
  };
  const [formData, setFormData] = useState<Partial<Expense>>(initialFormState);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null); 

  // Persistence
  useEffect(() => {
    if (!isSuperAdmin) {
        const key = getSessionKey();
        localStorage.setItem(key, JSON.stringify(expenses));
    } else {
        // Super Admin: Only save back "Head Office" expenses to main key
        const headOfficeExpenses = expenses.filter(e => e.corporateId === 'admin');
        const cleanExpenses = headOfficeExpenses.map(({franchiseName, corporateId, ...rest}) => rest);
        localStorage.setItem('office_expenses', JSON.stringify(cleanExpenses));
    }
  }, [expenses, isSuperAdmin]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setSelectedFile(e.target.files[0]);
      } else {
          setSelectedFile(null);
      }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setSelectedFile(null);
    setEditingExpenseId(null);
    setIsModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const handleOpenAddTransaction = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setFormData({
        type: expense.type,
        transactionNumber: expense.transactionNumber,
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        date: expense.date,
        paymentMethod: expense.paymentMethod,
        status: expense.status,
        description: expense.description,
        receiptUrl: expense.receiptUrl,
        branch: expense.branch || '',
    });
    setSelectedFile(null); 
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      if (editingExpenseId === id) {
          resetForm();
      }
    }
  };

  const handleViewInvoice = (expense: Expense) => {
    setInvoiceData(expense);
    setShowInvoiceViewer(true);
  };

  const closeInvoiceViewer = () => {
    setShowInvoiceViewer(false);
    setInvoiceData(null);
  };

  const closeRawReceiptPreview = () => {
    setRawReceiptPreviewUrl(null);
  };

  const handleResetFilters = () => {
      setSearchTerm('');
      setCategoryFilter('All');
      setTypeFilter('All');
      setFilterCorporate('All');
      setFilterBranch('All');
      setFilterDateType('Month');
      setSelectedMonth(new Date().toISOString().slice(0, 7));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.transactionNumber) {
        alert("Please fill all required fields including Transaction Number.");
        return;
    }

    setIsUploading(true);
    let receiptUrl = formData.receiptUrl || ''; 

    if (selectedFile) {
        const sessionId = localStorage.getItem('app_session_id') || 'admin';
        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `receipts/${sessionId}/${Date.now()}_${safeName}`;
        
        const cloudUrl = await uploadFileToCloud(selectedFile, path);
        
        if (cloudUrl) {
            receiptUrl = cloudUrl;
        } else {
            try {
                receiptUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(selectedFile);
                });
            } catch (err) {
                console.error("Local fallback failed", err);
            }
        }
    }

    const transactionData: Expense = {
      id: editingExpenseId || Date.now().toString(),
      transactionNumber: formData.transactionNumber || `TXN-${Date.now()}`,
      type: formData.type as 'Income' | 'Expense',
      title: formData.title || '',
      category: formData.category || 'Other Expenses',
      amount: formData.amount || 0,
      date: formData.date || new Date().toISOString().split('T')[0],
      paymentMethod: formData.paymentMethod || 'Cash',
      status: (formData.status as 'Paid' | 'Pending') || 'Pending',
      description: formData.description,
      branch: formData.branch,
      franchiseName: isSuperAdmin ? 'Head Office' : undefined,
      corporateId: isSuperAdmin ? 'admin' : undefined,
      receiptUrl: receiptUrl
    };

    if (editingExpenseId) {
        setExpenses(prev => prev.map(exp => exp.id === editingExpenseId ? { ...transactionData, franchiseName: exp.franchiseName, corporateId: exp.corporateId } : exp));
    } else {
        setExpenses(prev => [transactionData, ...prev]);
    }
    
    setIsUploading(false);
    resetForm(); 
  };

  // derived state
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (exp.franchiseName && exp.franchiseName.toLowerCase().includes(searchTerm.toLowerCase())) || 
                          (exp.transactionNumber && exp.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'All' || exp.category === categoryFilter;
    const matchesType = typeFilter === 'All' || exp.type === typeFilter;
    
    // Strict Corporate & Branch Filter
    let matchesCorporate = true;
    if (isSuperAdmin) {
        matchesCorporate = filterCorporate === 'All' || exp.corporateId === filterCorporate;
    } else {
        matchesCorporate = exp.corporateId === sessionId; // Explicit check for Franchise
    }
    
    const matchesBranch = filterBranch === 'All' || exp.branch === filterBranch;

    // Date Filter
    let matchesDate = true;
    if (filterDateType === 'Month') {
        matchesDate = exp.date.startsWith(selectedMonth);
    } else {
        matchesDate = exp.date === selectedDate;
    }

    return matchesSearch && matchesCategory && matchesType && matchesCorporate && matchesBranch && matchesDate;
  });

  const stats = useMemo(() => {
    // Only calculate stats on filtered expenses to reflect current view
    const totalIncome = filteredExpenses
      .filter(e => e.type === 'Income')
      .reduce((sum, item) => sum + item.amount, 0);

    const totalExpense = filteredExpenses
      .filter(e => e.type === 'Expense')
      .reduce((sum, item) => sum + item.amount, 0);

    const balance = totalIncome - totalExpense;
    
    // Group for chart (Expenses Only)
    const categoryData: Record<string, number> = {};
    filteredExpenses
        .filter(e => e.type === 'Expense')
        .forEach(exp => {
           categoryData[exp.category] = (categoryData[exp.category] || 0) + exp.amount;
        });
    
    const chartData = Object.keys(categoryData).map(key => ({
      name: key,
      value: categoryData[key]
    }));

    return { totalIncome, totalExpense, balance, chartData };
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Finance & Expenses</h2>
          <p className="text-gray-500">
             {isSuperAdmin ? "Consolidated financial report across all franchises" : "Track income, office expenses, and net balance"}
          </p>
        </div>
        <button 
          onClick={handleOpenAddTransaction}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Transaction
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Income</p>
            <h3 className="text-2xl font-bold text-emerald-600">+₹{stats.totalIncome.toLocaleString()}</h3>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p>
            <h3 className="text-2xl font-bold text-red-600">-₹{stats.totalExpense.toLocaleString()}</h3>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-red-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Net Balance</p>
            <h3 className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                ₹{stats.balance.toLocaleString()}
            </h3>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List Section */}
        <div className="lg:col-span-2 space-y-6">
           {/* Filters */}
           <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
             {/* Row 1: Search & Basic Filters */}
             <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search transactions..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
                
                {/* Date Type Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button 
                        onClick={() => setFilterDateType('Month')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterDateType === 'Month' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                    >
                        Month
                    </button>
                    <button 
                        onClick={() => setFilterDateType('Date')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterDateType === 'Date' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                    >
                        Date
                    </button>
                </div>

                {filterDateType === 'Month' ? (
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                    />
                ) : (
                    <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                    />
                )}
             </div>

             {/* Row 2: Advanced Filters (Corporate, Branch, Type, Category) */}
             <div className="flex flex-wrap gap-2 items-center">
                <Filter className="w-4 h-4 text-gray-400 mr-1" />
                
                {isSuperAdmin && (
                    <select 
                        value={filterCorporate}
                        onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }}
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                    >
                        <option value="All">All Corporates</option>
                        <option value="admin">Head Office</option>
                        {corporates.map((c: any) => (
                            <option key={c.email} value={c.email}>{c.companyName}</option>
                        ))}
                    </select>
                )}

                <select 
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                >
                    <option value="All">All Branches</option>
                    {availableBranches.map((b: any) => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                </select>

                <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                >
                    <option value="All">All Types</option>
                    <option value="Income">Income Only</option>
                    <option value="Expense">Expense Only</option>
                </select>

                <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm max-w-[150px]"
                >
                    <option value="All">All Categories</option>
                    {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].sort().map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <button 
                    onClick={handleResetFilters}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    title="Reset Filters"
                >
                    <RefreshCcw className="w-4 h-4" />
                </button>
             </div>
           </div>

           {/* Table */}
           <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                   <tr>
                     <th className="px-6 py-4">Ref #</th>
                     <th className="px-6 py-4">Title / Category</th>
                     {isSuperAdmin && <th className="px-6 py-4">Franchise</th>}
                     <th className="px-6 py-4">Branch</th>
                     <th className="px-6 py-4">Date</th>
                     <th className="px-6 py-4">Amount</th>
                     <th className="px-6 py-4 text-center">Status</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {filteredExpenses.map((exp) => (
                     <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                       <td className="px-6 py-4 text-xs font-mono text-gray-500">{exp.transactionNumber || '-'}</td>
                       <td className="px-6 py-4">
                         <div className="flex items-start gap-3">
                             <div className={`mt-1 p-1.5 rounded-full ${exp.type === 'Income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                 {exp.type === 'Income' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                             </div>
                             <div>
                                <div className="font-bold text-gray-900">{exp.title}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                    {exp.category === 'Office Rent' && <DollarSign className="w-3 h-3" />}
                                    {exp.category.includes('Salary') && <Users className="w-3 h-3" />}
                                    {exp.category.includes('EB') && <Zap className="w-3 h-3" />}
                                    {exp.category.includes('Internet') && <Wifi className="w-3 h-3" />}
                                    {exp.category.includes('Phone') && <Smartphone className="w-3 h-3" />}
                                    {exp.category}
                                </div>
                             </div>
                         </div>
                       </td>
                       {isSuperAdmin && (
                           <td className="px-6 py-4">
                               {exp.franchiseName && (
                                   <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-semibold border border-indigo-100">
                                       <Building2 className="w-3 h-3" />
                                       {exp.franchiseName}
                                   </div>
                               )}
                           </td>
                       )}
                       <td className="px-6 py-4 text-gray-600">{exp.branch || '-'}</td>
                       <td className="px-6 py-4 text-gray-600">{exp.date}</td>
                       <td className={`px-6 py-4 font-mono font-bold ${exp.type === 'Income' ? 'text-emerald-600' : 'text-red-600'}`}>
                           {exp.type === 'Income' ? '+' : '-'}₹{exp.amount.toLocaleString()}
                       </td>
                       <td className="px-6 py-4 text-center">
                         <span className={`px-2 py-1 rounded-full text-xs font-bold border ${exp.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                           {exp.status}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                           <div className="flex justify-end gap-2">
                               <button 
                                   onClick={() => handleViewInvoice(exp)}
                                   className="text-gray-400 hover:text-blue-500 p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                                   title="View Details"
                               >
                                   <Eye className="w-4 h-4" />
                               </button>
                               <button 
                                   onClick={() => handleEdit(exp)}
                                   className="text-gray-400 hover:text-emerald-600 p-1.5 rounded-full hover:bg-emerald-50 transition-colors"
                                   title="Edit Transaction"
                               >
                                   <Edit2 className="w-4 h-4" />
                               </button>
                               <button 
                                   onClick={() => handleDelete(exp.id)}
                                   className="text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                                   title="Delete Transaction"
                               >
                                   <Trash2 className="w-4 h-4" />
                               </button>
                           </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             {filteredExpenses.length === 0 && (
               <div className="p-10 text-center text-gray-500">
                  No records found for this period.
               </div>
             )}
           </div>
        </div>

        {/* Analytics Section */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                 <PieChart className="w-5 h-5 text-emerald-500" /> Expense Distribution
              </h3>
              <div className="h-64 w-full">
                 {stats.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                        <Pie
                            data={stats.chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {stats.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <ReTooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '10px'}} />
                        </RePieChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        No expense data to display
                    </div>
                 )}
              </div>
           </div>

           <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
              <div className="flex justify-between items-start mb-4">
                 <h3 className="font-bold text-lg">Download Report</h3>
                 <FileText className="w-6 h-6 opacity-80" />
              </div>
              <p className="text-indigo-100 text-sm mb-6">
                 Generate a detailed PDF report of all income and expenses for auditing purposes.
              </p>
              <button className="w-full bg-white text-indigo-600 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                 <Download className="w-4 h-4" /> Export PDF
              </button>
           </div>
        </div>
      </div>

      {/* Add/Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingExpenseId ? 'Edit Transaction' : 'Add Transaction'}</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type Toggle */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                 <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'Income', category: INCOME_CATEGORIES[0] }))}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${formData.type === 'Income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
                 >
                    <ArrowUpCircle className="w-4 h-4" /> Income
                 </button>
                 <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'Expense', category: EXPENSE_CATEGORIES[0] }))}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${formData.type === 'Expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
                 >
                    <ArrowDownCircle className="w-4 h-4" /> Expense
                 </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Number</label>
                <input 
                  type="text" 
                  name="transactionNumber"
                  required
                  placeholder="e.g. TXN-2025-001"
                  value={formData.transactionNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input 
                  type="text" 
                  name="title"
                  required
                  placeholder={formData.type === 'Income' ? "e.g. Client Payment" : "e.g. Office Rent"}
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Branch Selection */}
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select
                      name="branch"
                      value={formData.branch}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                      <option value="">Select Branch</option>
                      {formBranches.map((b: any) => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                      ))}
                  </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                   <select 
                     name="category"
                     value={formData.category}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                   >
                     {(formData.type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                        <option key={c} value={c}>{c}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                   <input 
                     type="date"
                     name="date" 
                     value={formData.date}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                   />
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input 
                  type="number" 
                  name="amount"
                  required
                  min="0"
                  value={formData.amount || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                   <select 
                     name="paymentMethod"
                     value={formData.paymentMethod}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                   >
                     <option>Cash</option>
                     <option>Bank Transfer</option>
                     <option>UPI</option>
                     <option>Credit Card</option>
                     <option>Cheque</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                   <select 
                     name="status"
                     value={formData.status}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                   >
                     <option>Paid</option>
                     <option>Pending</option>
                   </select>
                 </div>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Receipt / File</label>
                  <div className="flex gap-2 items-center">
                      <input 
                          type="file" 
                          className="hidden" 
                          ref={fileInputRef}
                          onChange={handleFileChange}
                      />
                      <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 border border-dashed border-gray-300 rounded-lg py-2 px-4 text-sm text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      >
                          {selectedFile ? (
                              <span className="text-emerald-600 font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                          ) : (
                              <>
                                  <Upload className="w-4 h-4" /> Select File
                              </>
                          )}
                      </button>
                      {selectedFile && (
                          <button onClick={() => setSelectedFile(null)} type="button" className="text-red-500 hover:bg-red-50 p-2 rounded"><X className="w-4 h-4"/></button>
                      )}
                      {!selectedFile && formData.receiptUrl && (
                          <a href={formData.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs flex items-center gap-1">
                              <Paperclip className="w-3 h-3" /> View Existing
                          </a>
                      )}
                  </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                 <textarea 
                   name="description"
                   rows={2}
                   value={formData.description}
                   onChange={handleInputChange}
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                 />
              </div>

              <div className="pt-2 flex gap-3">
                 <button 
                    type="button" 
                    onClick={resetForm}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-white transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                    type="submit"
                    disabled={isUploading}
                    className={`flex-1 text-white font-bold py-3 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 ${formData.type === 'Income' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                 >
                    {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingExpenseId ? 'Update Transaction' : (formData.type === 'Income' ? 'Record Income' : 'Record Expense')}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Details (Invoice-like) Modal */}
      {showInvoiceViewer && invoiceData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="printable-invoice bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                  {/* Header (Visible on screen and print) */}
                  <div className="p-6 border-b border-gray-200 bg-gray-50">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <h2 className="text-2xl font-bold text-gray-900">Transaction Details</h2>
                              <p className="text-sm text-gray-500">Invoice/Receipt Summary</p>
                          </div>
                          <div className="text-right">
                              <p className="font-mono text-sm font-bold text-gray-800">#{invoiceData.transactionNumber}</p>
                              <p className="text-xs text-gray-500">{invoiceData.date}</p>
                          </div>
                      </div>
                      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                          <div>
                              <p className="text-xs text-gray-400 uppercase font-bold">Transaction For</p>
                              <p className="font-bold text-gray-800">{invoiceData.title}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-gray-400 uppercase font-bold">Category</p>
                              <p className="font-medium text-gray-700">{invoiceData.category}</p>
                          </div>
                      </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-6">
                      
                      {/* Amount & Type */}
                      <div className="flex justify-between items-center">
                          <div>
                              <p className="text-sm font-bold text-gray-800">Amount</p>
                              <p className={`text-xl font-bold ${invoiceData.type === 'Income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {invoiceData.type === 'Income' ? '+' : '-'}₹{invoiceData.amount.toLocaleString()}
                              </p>
                          </div>
                          <div className="text-right">
                              <p className="text-sm font-bold text-gray-800">Type</p>
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${invoiceData.type === 'Income' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                  {invoiceData.type}
                              </span>
                          </div>
                      </div>

                      {/* Payment Method & Status */}
                      <div>
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b border-gray-100 pb-1">Payment & Status</h4>
                          <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                  <span className="text-gray-600">Method</span>
                                  <span className="font-medium text-gray-900">{invoiceData.paymentMethod}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="text-gray-600">Transaction Status</span>
                                  <span className={`font-medium ${invoiceData.status === 'Paid' ? 'text-green-600' : 'text-yellow-600'}`}>{invoiceData.status}</span>
                              </div>
                              {invoiceData.branch && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Branch</span>
                                    <span className="font-medium text-gray-900">{invoiceData.branch}</span>
                                </div>
                              )}
                          </div>
                      </div>

                      {/* Description */}
                      {invoiceData.description && (
                          <div>
                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b border-gray-100 pb-1">Description</h4>
                              <p className="text-sm text-gray-600">{invoiceData.description}</p>
                          </div>
                      )}
                      
                      {/* Franchise Name for Super Admin */}
                      {isSuperAdmin && invoiceData.franchiseName && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b border-gray-100 pb-1">Franchise</h4>
                            <p className="text-sm text-gray-600">{invoiceData.franchiseName}</p>
                        </div>
                      )}
                  </div>

                  {/* Footer (Actions - Hidden on Print) */}
                  <div className="no-print p-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                      {invoiceData.receiptUrl && (
                          <button
                              onClick={() => setRawReceiptPreviewUrl(invoiceData.receiptUrl!)}
                              className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
                          >
                              <Paperclip className="w-4 h-4" /> View Original Receipt
                          </button>
                      )}
                      <button 
                          onClick={() => window.print()} 
                          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors flex items-center gap-2"
                      >
                          <Printer className="w-4 h-4" /> Print Invoice
                      </button>
                      <button 
                          onClick={closeInvoiceViewer} 
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                      >
                          Close
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Raw Receipt Preview Modal */}
      {rawReceiptPreviewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                  <h3 className="font-bold text-gray-800">Receipt Preview</h3>
                  <button onClick={closeRawReceiptPreview} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200">
                      <X className="w-5 h-5" />
                  </button>
              </div>
              <div className="flex-1 bg-gray-100 flex items-center justify-center p-4 overflow-hidden relative">
                  {rawReceiptPreviewUrl.startsWith('data:application/pdf') || rawReceiptPreviewUrl.endsWith('.pdf') ? (
                      <iframe src={rawReceiptPreviewUrl} className="w-full h-full rounded border border-gray-300" title="Receipt PDF"></iframe>
                  ) : (
                      <img src={rawReceiptPreviewUrl} alt="Receipt" className="max-w-full max-h-full object-contain shadow-md rounded" />
                  )}
              </div>
              <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
                  <a 
                    href={rawReceiptPreviewUrl} 
                    download="receipt" 
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 flex items-center gap-2"
                  >
                      <Download className="w-4 h-4" /> Download
                  </a>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;