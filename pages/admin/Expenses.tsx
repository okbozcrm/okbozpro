
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Plus, Search, DollarSign, 
  PieChart, FileText, 
  CheckCircle, X, Download,
  Smartphone, Zap, Wifi, Users, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, Building2, Upload, Loader2, Paperclip, Eye, Edit2, Trash2, Printer, MapPin, Filter, RefreshCcw, Calendar,
  Info, FileSpreadsheet
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { uploadFileToCloud } from '../../services/cloudService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { UserRole } from '../../types'; // Import UserRole for type checking

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
  corporateId?: string; 
  branch?: string; 
  receiptUrl?: string;
  // New tracking fields
  editedBy?: string;
  lastEditedAt?: string;
}

const EXPENSE_CATEGORIES = [
  'Office Rent', 'Manager Salary', 'Staff Salary', 'EB Rent (Electricity)', 'Internet Rent',
  'Cell Phone Fee', 'Utility Expense', 'Coupon No of Booking', 'Marketing', 'Other Expenses'
];

const INCOME_CATEGORIES = [
  'Sales', 'Consulting Fee', 'Service Charge', 'Commission', 'Investment', 'Refund', 'Other Income'
];

const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'];

const Expenses: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null); // Ref for file input
  const [isExporting, setIsExporting] = useState(false);
  
  // Session & User Info
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const userRole = localStorage.getItem('user_role') || 'ADMIN';
  const isSuperAdmin = sessionId === 'admin';
  const loggedInUserName = sessionStorage.getItem('loggedInUserName') || localStorage.getItem('logged_in_employee_name') || (isSuperAdmin ? 'Super Admin' : 'Admin');
  const employeeCorporateId = localStorage.getItem('logged_in_employee_corporate_id');

  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All'); 
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterDateType, setFilterDateType] = useState<'Month' | 'Date'>('Month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 

  const [corporates, setCorporates] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);

  // NEW STATE for Other Expense Detail
  const [otherExpenseDetail, setOtherExpenseDetail] = useState('');

  // Function to load expenses to ensure UI stays in sync with LocalStorage/Cloud
  const loadExpenses = useCallback(() => {
    let allExpenses: Expense[] = [];
    
    if (isSuperAdmin) {
        // Admin: Load Root + All Corporates
        const adminData = localStorage.getItem('office_expenses');
        if (adminData) {
            try { 
                allExpenses = [...allExpenses, ...JSON.parse(adminData).map((e: any) => ({...e, franchiseName: e.franchiseName || 'Head Office', corporateId: e.corporateId || 'admin'}))];
            } catch (e) {}
        }
        
        // Dynamically load from all available corporate accounts
        const currentCorps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        currentCorps.forEach((corp: any) => {
            const cData = localStorage.getItem(`office_expenses_${corp.email}`);
            if (cData) {
                try {
                    allExpenses = [...allExpenses, ...JSON.parse(cData).map((e: any) => ({...e, franchiseName: corp.companyName, corporateId: corp.email}))];
                } catch (e) {}
            }
        });
    } else {
        // Franchise OR Employee View: Load Scoped Data
        // If employee, they should see expenses for their corporate ID
        const targetOwnerId = userRole === 'EMPLOYEE' ? (employeeCorporateId || 'admin') : sessionId;
        const key = targetOwnerId === 'admin' ? 'office_expenses' : `office_expenses_${targetOwnerId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try { 
                allExpenses = JSON.parse(saved).map((e: any) => ({...e, corporateId: e.corporateId || targetOwnerId})); 
            } catch(e) { 
                console.error("Error parsing expenses", e);
            }
        }
    }
    setExpenses(allExpenses.reverse()); // Show newest first
  }, [isSuperAdmin, sessionId, userRole, employeeCorporateId]);

  // Initial Data Load
  useEffect(() => {
      loadExpenses();
      
      const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      setCorporates(corps);
      
      let branches: any[] = [];
      if (isSuperAdmin) {
          const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
          branches = [...adminBranches.map((b:any) => ({...b, corporateId: 'admin'}))];
          corps.forEach((c: any) => {
              const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
              branches = [...branches, ...cBranches.map((b:any) => ({...b, corporateId: c.email}))];
          });
      } else {
          // Scoped branches for franchise/employee
          const targetOwnerId = userRole === 'EMPLOYEE' ? (employeeCorporateId || 'admin') : sessionId;
          const key = targetOwnerId === 'admin' ? 'branches_data' : `branches_data_${targetOwnerId}`;
          const saved = localStorage.getItem(key);
          if (saved) branches = JSON.parse(saved).map((b:any) => ({...b, corporateId: targetOwnerId}));
      }
      setAllBranches(branches);

      // Listen for updates (from Cloud Sync or other tabs)
      const handleStorageChange = () => loadExpenses();
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('cloud-sync-immediate', handleStorageChange); // Custom event for immediate UI update

      return () => {
          window.removeEventListener('storage', handleStorageChange);
          window.removeEventListener('cloud-sync-immediate', handleStorageChange);
      };
  }, [isSuperAdmin, sessionId, loadExpenses, userRole, employeeCorporateId]);

  const availableBranches = useMemo(() => {
      if (filterCorporate === 'All') return allBranches;
      return allBranches.filter(b => b.corporateId === filterCorporate);
  }, [allBranches, filterCorporate]);

  const [showInvoiceViewer, setShowInvoiceViewer] = useState(false); 
  const [invoiceData, setInvoiceData] = useState<Expense | null>(null); 
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState: Partial<Expense> = {
    type: 'Expense',
    transactionNumber: '',
    title: '',
    category: 'Marketing',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    status: 'Pending',
    description: '',
    receiptUrl: '',
    corporateId: isSuperAdmin ? 'admin' : sessionId,
    branch: ''
  };

  const [formData, setFormData] = useState<Partial<Expense>>(initialFormState);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null); 

  const formBranches = useMemo(() => {
      // Allow selecting branches based on the selected corporate in form (for admin) or current session (for franchise/employee)
      let targetOwner = isSuperAdmin ? (formData.corporateId || 'admin') : sessionId;
      if (userRole === 'EMPLOYEE') targetOwner = employeeCorporateId || 'admin';
      
      return allBranches.filter(b => b.corporateId === targetOwner);
  }, [allBranches, formData.corporateId, isSuperAdmin, sessionId, userRole, employeeCorporateId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
  };

  const handleViewInvoice = (expense: Expense) => {
    setInvoiceData(expense);
    setShowInvoiceViewer(true);
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setSelectedFile(null);
    setEditingExpenseId(null);
    setOtherExpenseDetail(''); // Reset custom input
    setIsModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  // --- NEW: Global Rolling Transaction Number Generator ---
  const generateNextTransactionNumber = () => {
    // Attempt to get the global counter from storage
    let currentCount = parseInt(localStorage.getItem('global_transaction_counter') || '0');
    
    // If counter is 0 (first time run or reset), try to find the max from existing loaded expenses to prevent overlap
    if (currentCount === 0 && expenses.length > 0) {
        const existingNumbers = expenses
            .map(e => e.transactionNumber)
            .filter(n => n && n.startsWith('JK-'))
            .map(n => parseInt(n.replace('JK-', ''), 10))
            .filter(n => !isNaN(n));
        
        if (existingNumbers.length > 0) {
            currentCount = Math.max(...existingNumbers);
        }
    }

    const nextCount = currentCount + 1;
    // Update Global Counter immediately
    localStorage.setItem('global_transaction_counter', nextCount.toString());
    
    return `JK-${nextCount.toString().padStart(5, '0')}`;
  };

  const handleOpenAddTransaction = () => {
    resetForm();
    const nextId = generateNextTransactionNumber();
    
    // Default Owner Calculation
    let defaultOwner = 'admin';
    if (!isSuperAdmin) {
        if (userRole === 'EMPLOYEE') defaultOwner = employeeCorporateId || 'admin';
        else defaultOwner = sessionId;
    }

    setFormData(prev => ({ 
        ...prev, 
        transactionNumber: nextId,
        corporateId: defaultOwner 
    }));
    setIsModalOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    
    // Check if category is a custom "Other Expenses" string
    let categoryToSet = expense.category;
    let customDetail = '';
    
    if (expense.category.startsWith('Other Expenses:')) {
        categoryToSet = 'Other Expenses';
        customDetail = expense.category.replace('Other Expenses: ', '');
    }

    setFormData({ ...expense, category: categoryToSet });
    setOtherExpenseDetail(customDetail);
    setIsModalOpen(true);
  };

  // --- Export Excel Logic ---
  const handleExportExcel = () => {
    if (filteredExpenses.length === 0) {
        alert("No expenses to export.");
        return;
    }
    const headers = ["Ref #", "Date", "Type", "Category", "Title", "Amount", "Payment Method", "Status", "Branch", "Franchise", "Description"];
    const rows = filteredExpenses.map(e => [
      e.transactionNumber,
      e.date,
      e.type,
      e.category,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      e.amount,
      e.paymentMethod,
      e.status,
      e.branch || '',
      e.franchiseName || '',
      `"${(e.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Download Sample Excel Logic ---
  const handleDownloadSample = () => {
      const headers = ["TransactionRef", "Date", "Type", "Category", "Title", "Amount", "PaymentMethod", "Status", "Branch", "Description"];
      const sampleRow = ["JK-00001", "2023-10-25", "Expense", "Marketing", "Facebook Ads", "5000", "Credit Card", "Paid", "Main Branch", "October Campaign"];
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), sampleRow.join(",")].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "expense_import_sample.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- Import Excel Logic ---
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const lines = text.split('\n');
          // Basic CSV Parsing (Assumes comma separated, no complex quotes handling for simplicity)
          const headers = lines[0].split(',').map(h => h.trim());
          
          const newExpenses: Expense[] = [];
          
          // Determine import target based on current user
          let targetCorpId = isSuperAdmin ? 'admin' : sessionId; 
          if (userRole === 'EMPLOYEE') targetCorpId = employeeCorporateId || 'admin';
          
          const storageKey = targetCorpId === 'admin' ? 'office_expenses' : `office_expenses_${targetCorpId}`;
          
          let franchiseName = 'Head Office';
          if (targetCorpId !== 'admin') {
              const c = corporates.find(x => x.email === targetCorpId);
              if (c) franchiseName = c.companyName;
              else franchiseName = 'Franchise Panel';
          }

          for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
              
              // Map by index based on Sample: 
              // 0:Ref, 1:Date, 2:Type, 3:Category, 4:Title, 5:Amount, 6:Method, 7:Status, 8:Branch, 9:Desc
              if (values.length >= 6) {
                  const expense: Expense = {
                      id: `EXP-IMP-${Date.now()}-${i}`,
                      transactionNumber: values[0] || `IMP-${Date.now()}-${i}`,
                      date: values[1] || new Date().toISOString().split('T')[0],
                      type: (values[2] === 'Income' ? 'Income' : 'Expense') as 'Income' | 'Expense',
                      category: values[3] || 'Other Expenses',
                      title: values[4] || 'Imported Transaction',
                      amount: parseFloat(values[5]) || 0,
                      paymentMethod: values[6] || 'Cash',
                      status: (values[7] === 'Paid' ? 'Paid' : 'Pending') as 'Paid' | 'Pending',
                      branch: values[8] || '',
                      description: values[9] || 'Imported via Excel',
                      corporateId: targetCorpId,
                      franchiseName: franchiseName,
                      receiptUrl: ''
                  };
                  newExpenses.push(expense);
              }
          }

          if (newExpenses.length > 0) {
              const currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
              const updatedData = [...newExpenses, ...currentData];
              localStorage.setItem(storageKey, JSON.stringify(updatedData));
              loadExpenses();
              window.dispatchEvent(new Event('cloud-sync-immediate'));
              alert(`Successfully imported ${newExpenses.length} transactions.`);
          } else {
              alert("No valid data found in file.");
          }
      };
      reader.readAsText(file);
      if (importFileRef.current) importFileRef.current.value = '';
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
        const canvas = await html2canvas(reportRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Finance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
        console.error("PDF Export Failed", err);
    }
    setIsExporting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.transactionNumber) return;

    setIsUploading(true);
    let receiptUrl = formData.receiptUrl || ''; 
    if (selectedFile) {
        const cloudUrl = await uploadFileToCloud(selectedFile, `receipts/${sessionId}/${Date.now()}_${selectedFile.name}`);
        receiptUrl = cloudUrl || await new Promise(r => { const reader = new FileReader(); reader.onloadend = () => r(reader.result as string); reader.readAsDataURL(selectedFile!); });
    }

    // --- DETERMINE CORRECT OWNER/STORAGE KEY ---
    // If Super Admin: Use selected corporateId or 'admin'
    // If Franchise: Use sessionId
    // If Employee: Use employeeCorporateId (Employer's ID) - This fixes the visibility issue
    
    let targetCorpId = 'admin';
    if (isSuperAdmin) {
        targetCorpId = formData.corporateId || 'admin';
    } else if (userRole === 'EMPLOYEE') {
        targetCorpId = employeeCorporateId || 'admin';
    } else {
        targetCorpId = sessionId; // Franchise
    }
    
    // Determine Franchise Name
    let resolvedFranchiseName = 'Head Office';
    if (targetCorpId !== 'admin') {
        const corp = corporates.find(c => c.email === targetCorpId);
        resolvedFranchiseName = corp ? corp.companyName : 'Franchise';
    } else if (!isSuperAdmin) {
        // If logged in as franchise and saving to self
        resolvedFranchiseName = 'My Franchise';
    }

    // Determine Edit Metadata
    let editMetadata = {};
    if (editingExpenseId) {
        editMetadata = {
            editedBy: loggedInUserName,
            lastEditedAt: new Date().toLocaleString()
        };
    }

    // Handle Custom Category Logic
    let finalCategory = formData.category || 'Other Expenses';
    if (formData.category === 'Other Expenses' && otherExpenseDetail.trim()) {
        finalCategory = `Other Expenses: ${otherExpenseDetail.trim()}`;
    }

    const transactionData: Expense = {
      id: editingExpenseId || Date.now().toString(),
      transactionNumber: formData.transactionNumber!,
      type: formData.type as 'Income' | 'Expense',
      title: formData.title || '',
      category: finalCategory,
      amount: formData.amount || 0,
      date: formData.date || new Date().toISOString().split('T')[0], // Ensure updated date is saved
      paymentMethod: formData.paymentMethod || 'Cash',
      status: formData.status as 'Paid' | 'Pending',
      description: formData.description,
      branch: formData.branch,
      franchiseName: resolvedFranchiseName,
      corporateId: targetCorpId,
      receiptUrl: receiptUrl,
      ...editMetadata
    };

    // --- SAVE TO LOCALSTORAGE (Specific Key) ---
    const storageKey = targetCorpId === 'admin' ? 'office_expenses' : `office_expenses_${targetCorpId}`;
    
    // Fetch current data for this specific key to append/update
    let currentData: Expense[] = [];
    try {
        currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch(e) {}

    let updatedData: Expense[];
    if (editingExpenseId) {
        // We find the existing record to merge other potential fields not in the form, though Expense type covers all.
        // Important: this map replaces the object.
        updatedData = currentData.map(exp => exp.id === editingExpenseId ? transactionData : exp);
    } else {
        updatedData = [transactionData, ...currentData];
    }
    
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    
    // Update local state immediately via re-fetch
    loadExpenses();
    
    setIsUploading(false);
    resetForm();
    
    // Trigger Sync
    window.dispatchEvent(new Event('cloud-sync-immediate'));
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) || (exp.franchiseName && exp.franchiseName.toLowerCase().includes(searchTerm.toLowerCase())) || (exp.transactionNumber && exp.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // UPDATED FILTER LOGIC FOR CUSTOM CATEGORIES
    let matchesCategory = false;
    if (categoryFilter === 'All') {
        matchesCategory = true;
    } else if (categoryFilter === 'Other Expenses') {
        // Match base "Other Expenses" or custom "Other Expenses: ..."
        matchesCategory = exp.category === 'Other Expenses' || exp.category.startsWith('Other Expenses:');
    } else {
        matchesCategory = exp.category === categoryFilter;
    }

    const matchesType = typeFilter === 'All' || exp.type === typeFilter;
    const matchesCorporate = isSuperAdmin ? (filterCorporate === 'All' || exp.corporateId === filterCorporate) : (exp.corporateId || sessionId) === sessionId;
    const matchesBranch = filterBranch === 'All' || exp.branch === filterBranch;
    const matchesDate = filterDateType === 'Month' ? exp.date.startsWith(selectedMonth) : exp.date === selectedDate;
    return matchesSearch && matchesCategory && matchesType && matchesCorporate && matchesBranch && matchesDate;
  });

  const stats = useMemo(() => {
    const totalIncome = filteredExpenses.filter(e => e.type === 'Income').reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = filteredExpenses.filter(e => e.type === 'Expense').reduce((sum, item) => sum + item.amount, 0);
    const categoryData: Record<string, number> = {};
    filteredExpenses.filter(e => e.type === 'Expense').forEach(exp => { 
        // Group all "Other Expenses: ..." under "Other Expenses" for chart clarity
        const key = exp.category.startsWith('Other Expenses') ? 'Other Expenses' : exp.category;
        categoryData[key] = (categoryData[key] || 0) + exp.amount; 
    });
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, chartData: Object.keys(categoryData).map(key => ({ name: key, value: categoryData[key] })) };
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">Finance & Expenses</h2><p className="text-gray-500">{isSuperAdmin ? "Consolidated financial report across all franchises" : "Track income, office expenses, and net balance"}</p></div>
        <div className="flex flex-wrap gap-2">
            <input type="file" accept=".csv" className="hidden" ref={importFileRef} onChange={handleImportExcel} />
            <button onClick={() => importFileRef.current?.click()} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors text-sm">
                <Upload className="w-4 h-4" /> Import Excel
            </button>
            <button onClick={handleDownloadSample} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-500 px-3 py-2 rounded-lg font-medium flex items-center gap-1 shadow-sm transition-colors text-xs" title="Download Sample CSV">
                <FileSpreadsheet className="w-4 h-4" /> Sample
            </button>
            <button onClick={handleExportExcel} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors text-sm">
                <Download className="w-4 h-4" /> Export Excel
            </button>
            <button onClick={handleOpenAddTransaction} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors text-sm"><Plus className="w-5 h-5" /> Add Transaction</button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500 mb-1">Total Income</p><h3 className="text-2xl font-bold text-emerald-600">+₹{stats.totalIncome.toLocaleString()}</h3></div><div className="bg-emerald-50 p-3 rounded-lg text-emerald-600"><TrendingUp className="w-6 h-6" /></div></div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p><h3 className="text-2xl font-bold text-red-600">-₹{stats.totalExpense.toLocaleString()}</h3></div><div className="bg-red-50 p-3 rounded-lg text-red-600"><TrendingDown className="w-6 h-6" /></div></div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500 mb-1">Net Balance</p><h3 className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>₹{stats.balance.toLocaleString()}</h3></div><div className="bg-blue-50 p-3 rounded-lg text-blue-600"><Wallet className="w-6 h-6" /></div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
                 <div className="flex flex-col md:flex-row gap-2">
                    <div className="relative flex-1 w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" placeholder="Search transactions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200"><button onClick={() => setFilterDateType('Month')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterDateType === 'Month' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Month</button><button onClick={() => setFilterDateType('Date')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterDateType === 'Date' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Date</button></div>
                    {filterDateType === 'Month' ? (<input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />) : (<input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm" />)}
                 </div>
                 <div className="flex flex-wrap gap-2 items-center"><Filter className="w-4 h-4 text-gray-400 mr-1" />
                    {isSuperAdmin && (<select value={filterCorporate} onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }} className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"><option value="All">All Corporates</option><option value="admin">Head Office</option>{corporates.map((c: any) => (<option key={c.email} value={c.email}>{c.companyName}</option>))}</select>)}
                    <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"><option value="All">All Branches</option>{availableBranches.map((b: any) => (<option key={b.name} value={b.name}>{b.name}</option>))}</select>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"><option value="All">All Types</option><option value="Income">Income Only</option><option value="Expense">Expense Only</option></select>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm max-w-[150px]"><option value="All">All Categories</option>{[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].sort().map(c => <option key={c} value={c}>{c}</option>)}</select>
                    <button onClick={() => {setSearchTerm('');setCategoryFilter('All');setTypeFilter('All');setFilterCorporate('All');setFilterBranch('All');setFilterDateType('Month');}} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"><RefreshCcw className="w-4 h-4" /></button>
                 </div>
               </div>

               <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap">
                     <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                       <tr>
                         <th className="px-6 py-4">Ref # / Activity</th>
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
                         <tr key={exp.id} className="hover:bg-gray-50 transition-colors group">
                           <td className="px-6 py-4 text-xs font-mono text-gray-500">
                              <div className="font-bold text-gray-700">{exp.transactionNumber || '-'}</div>
                              {exp.editedBy && (
                                <div className="mt-1 flex flex-col gap-0.5 animate-in fade-in">
                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded w-fit border border-amber-100">
                                        <Edit2 className="w-2.5 h-2.5" /> Edited by {exp.editedBy}
                                    </span>
                                    <span className="text-[9px] text-gray-400 pl-1">
                                        {exp.lastEditedAt}
                                    </span>
                                </div>
                              )}
                           </td>
                           <td className="px-6 py-4"><div className="flex items-start gap-3"><div className={`mt-1 p-1.5 rounded-full ${exp.type === 'Income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{exp.type === 'Income' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}</div><div><div className="font-bold text-gray-900">{exp.title}</div><div className="text-xs text-gray-500">{exp.category}</div></div></div></td>
                           {isSuperAdmin && (<td className="px-6 py-4">{exp.franchiseName && (<div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-semibold border border-indigo-100"><Building2 className="w-3 h-3" />{exp.franchiseName}</div>)}</td>)}
                           <td className="px-6 py-4 text-gray-600">{exp.branch || '-'}</td>
                           <td className="px-6 py-4 text-gray-600">{exp.date}</td>
                           <td className={`px-6 py-4 font-mono font-bold ${exp.type === 'Income' ? 'text-emerald-600' : 'text-red-600'}`}>{exp.type === 'Income' ? '+' : '-'}₹{exp.amount.toLocaleString()}</td>
                           <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold border ${exp.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{exp.status}</span></td>
                           <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2">
                               <button type="button" onClick={() => handleViewInvoice(exp)} className="text-gray-400 hover:text-blue-500 p-1.5 rounded-full hover:bg-blue-50 transition-colors cursor-pointer"><Eye className="w-4 h-4" /></button>
                               <button type="button" onClick={() => handleEdit(exp)} className="text-gray-400 hover:text-emerald-600 p-1.5 rounded-full hover:bg-emerald-50 transition-colors cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                           </div></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
                 {filteredExpenses.length === 0 && (<div className="p-10 text-center text-gray-500">No records found.</div>)}
               </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><PieChart className="w-5 h-5 text-emerald-500" /> Expense Distribution</h3>
                  <div className="h-64 w-full">
                     {stats.chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%"><RePieChart><Pie data={stats.chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{stats.chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><ReTooltip formatter={(value: number) => `₹${value.toLocaleString()}`} /><Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '10px'}} /></RePieChart></ResponsiveContainer>
                     ) : (<div className="h-full flex items-center justify-center text-gray-400 text-sm">No data to display</div>)}
                  </div>
               </div>
               <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl text-white shadow-lg"><div className="flex justify-between items-start mb-4"><h3 className="font-bold text-lg">Download Report</h3><FileText className="w-6 h-6 opacity-80" /></div><p className="text-indigo-100 text-sm mb-6">Generate detailed PDF reports for auditing.</p><button type="button" onClick={handleExportPDF} disabled={isExporting} className="w-full bg-white text-indigo-600 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">{isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />} Export PDF</button></div>
            </div>
          </div>
      </div>

      {/* Invoice Viewer Modal - ADDED THIS BLOCK */}
      {showInvoiceViewer && invoiceData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-gray-800">Transaction Details</h3>
                 <button onClick={() => setShowInvoiceViewer(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="flex justify-between border-b border-gray-100 pb-4 mb-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Amount</p>
                        <p className={`text-2xl font-black ${invoiceData.type === 'Income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {invoiceData.type === 'Income' ? '+' : '-'}₹{invoiceData.amount.toLocaleString()}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-bold">Date</p>
                        <p className="text-sm font-medium text-gray-900">{invoiceData.date}</p>
                    </div>
                 </div>
                 
                 <div className="space-y-3">
                     <div>
                         <p className="text-xs text-gray-500">Title</p>
                         <p className="font-bold text-gray-800">{invoiceData.title}</p>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <p className="text-xs text-gray-500">Category</p>
                             <p className="text-sm font-medium">{invoiceData.category}</p>
                         </div>
                         <div>
                             <p className="text-xs text-gray-500">Payment Mode</p>
                             <p className="text-sm font-medium">{invoiceData.paymentMethod}</p>
                         </div>
                     </div>
                     <div>
                         <p className="text-xs text-gray-500">Transaction Ref</p>
                         <p className="text-sm font-mono text-gray-600 bg-gray-50 p-1 rounded w-fit">{invoiceData.transactionNumber}</p>
                     </div>
                     {invoiceData.description && (
                         <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                             <p className="text-xs text-gray-500 mb-1">Description</p>
                             <p className="text-sm text-gray-700 italic">"{invoiceData.description}"</p>
                         </div>
                     )}
                     
                     {invoiceData.receiptUrl && (
                         <div className="mt-4">
                             <p className="text-xs text-gray-500 mb-2">Attached Receipt</p>
                             <div className="relative group rounded-lg overflow-hidden border border-gray-200">
                                 {invoiceData.receiptUrl.includes('application/pdf') ? (
                                     <div className="p-4 flex items-center justify-center bg-gray-50 text-gray-500">
                                         <FileText className="w-8 h-8" />
                                         <span className="ml-2 text-sm">PDF Document</span>
                                     </div>
                                 ) : (
                                     <img src={invoiceData.receiptUrl} alt="Receipt" className="w-full h-48 object-cover" />
                                 )}
                                 <a 
                                    href={invoiceData.receiptUrl} 
                                    download={`Receipt-${invoiceData.transactionNumber}`}
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold gap-2"
                                    target="_blank"
                                    rel="noreferrer"
                                 >
                                    <Download className="w-5 h-5" /> Download
                                 </a>
                             </div>
                         </div>
                     )}
                     
                     {invoiceData.editedBy && (
                         <div className="text-[10px] text-gray-400 mt-4 pt-4 border-t border-gray-100">
                             Last edited by <span className="font-bold">{invoiceData.editedBy}</span> on {invoiceData.lastEditedAt}
                         </div>
                     )}
                 </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                 <button onClick={() => setShowInvoiceViewer(false)} className="w-full py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 text-sm shadow-sm">
                     Close
                 </button>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"><h3 className="font-bold text-gray-800">{editingExpenseId ? 'Edit Transaction' : 'Add Transaction'}</h3><button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {editingExpenseId && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Note: Editing this transaction will be logged with your username ({loggedInUserName}).</span>
                  </div>
              )}
              <div className="flex bg-gray-100 p-1 rounded-lg"><button type="button" onClick={() => setFormData(prev => ({ ...prev, type: 'Income', category: INCOME_CATEGORIES[0] }))} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${formData.type === 'Income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}><ArrowUpCircle className="w-4 h-4" /> Income</button><button type="button" onClick={() => setFormData(prev => ({ ...prev, type: 'Expense', category: 'Marketing' }))} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${formData.type === 'Expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}><ArrowDownCircle className="w-4 h-4" /> Expense</button></div>
              {isSuperAdmin && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Franchise / Entity</label>
                    <select name="corporateId" value={formData.corporateId} onChange={(e) => setFormData(prev => ({ ...prev, corporateId: e.target.value, branch: '' }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none bg-white text-sm focus:ring-2 focus:ring-emerald-500">
                        <option value="admin">Head Office</option>
                        {corporates.map((c: any) => (<option key={c.email} value={c.email}>{c.companyName}</option>))}
                    </select>
                  </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Transaction Ref #</label>
                    <input 
                        type="text" 
                        name="transactionNumber" 
                        required 
                        placeholder="Auto-Generated" 
                        value={formData.transactionNumber} 
                        readOnly
                        className="w-full px-4 py-2.5 border border-gray-300 bg-gray-50 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm text-gray-600 cursor-not-allowed" 
                    />
                </div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label><input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" /></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label><input type="text" name="title" required value={formData.title} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" placeholder="e.g. Office Electricity Bill" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch</label><select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm"><option value="">Select Branch</option>{formBranches.map((b: any) => (<option key={b.name} value={b.name}>{b.name}</option>))}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm">{(formData.type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (<option key={c} value={c}>{c}</option>))}</select>
                </div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (₹)</label><input type="number" name="amount" required min="0" value={formData.amount || ''} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold" placeholder="0.00" /></div>
              </div>
              
              {/* Conditional Input for 'Other Expenses' */}
              {formData.category === 'Other Expenses' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Specify Expense Details</label>
                    <input 
                      type="text" 
                      value={otherExpenseDetail} 
                      onChange={(e) => setOtherExpenseDetail(e.target.value)} 
                      placeholder="e.g. Printer Repair" 
                      className="w-full px-4 py-2.5 border border-blue-200 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" 
                    />
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label><select name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none bg-white text-sm"><option>Cash</option><option>Bank Transfer</option><option>UPI</option></select></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label><select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none bg-white text-sm"><option>Paid</option><option>Pending</option></select></div></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Receipt Attachment</label><input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} /><button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">{selectedFile ? selectedFile.name : 'Click to Upload Invoice/Receipt'}</button></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description / Notes</label><textarea name="description" rows={3} value={formData.description} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none text-sm" placeholder="Additional details about this transaction..." /></div>
            </form>
            <div className="p-5 border-t border-gray-100 bg-gray-50 shrink-0">
               <button type="submit" onClick={handleSubmit} disabled={isUploading} className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 ${formData.type === 'Income' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}>{isUploading && <Loader2 className="w-4 h-4 animate-spin" />}{editingExpenseId ? 'Update Transaction' : 'Record Transaction'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
