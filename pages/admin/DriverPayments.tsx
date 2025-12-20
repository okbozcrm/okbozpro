import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Plus, Search, Filter, Download, 
  Truck, DollarSign, Calendar, CheckCircle, 
  AlertCircle, X, Save, ChevronDown, PieChart, Info, Building2,
  Wallet, ArrowRightLeft, User, ThumbsUp, ThumbsDown, CreditCard, Edit2, Hash, RefreshCcw
} from 'lucide-react';
import { Employee, CorporateAccount } from '../../types';
import AiAssistant from '../../components/AiAssistant';

// --- Types ---

interface PaymentRules {
  freeLimitKm: number;
  maxPayableKm: number;
  ratePerKm: number;
  maxPromoPay: number;
  maxStickerPay: number;
}

interface DriverPayment {
  id: string;
  driverName: string;
  phone: string;
  vehicleNo: string;
  orderId: string;
  branch: string;
  corporateId: string;
  type: 'Empty Km' | 'Promo Code' | 'Sticker';
  amount: number;
  status: 'Paid' | 'Pending' | 'Rejected';
  date: string;
  paymentMode: string;
  remarks: string;
  details: {
    distance?: number;
    paidKm?: number;
    promoName?: string;
    stickerDuration?: number;
  };
}

interface WalletTransaction {
  id: string;
  orderId: string;
  date: string;
  corporateId: string;
  branchName: string;
  driverName: string;
  phone: string;
  type: 'Top-up' | 'Deduct';
  amount: number;
  paymentMode: string;
  receivedBy: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  remarks: string;
}

const DEFAULT_RULES: PaymentRules = {
  freeLimitKm: 5,
  maxPayableKm: 15,
  ratePerKm: 10,
  maxPromoPay: 100,
  maxStickerPay: 3000
};

const DriverPayments: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- State ---
  const [mainTab, setMainTab] = useState<'Payments' | 'Wallet'>('Payments'); 
  const [activeView, setActiveView] = useState<'Dashboard' | 'Rules'>('Dashboard');
  
  // Data State
  const [payments, setPayments] = useState<DriverPayment[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [rules, setRules] = useState<PaymentRules>(DEFAULT_RULES);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [staffList, setStaffList] = useState<Employee[]>([]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false); // Compensation Modal
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false); // Wallet Modal
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);

  // General Search
  const [searchTerm, setSearchTerm] = useState('');

  // Wallet Specific Filters
  const [walletFromDate, setWalletFromDate] = useState('');
  const [walletToDate, setWalletToDate] = useState('');
  const [walletStatus, setWalletStatus] = useState('All');
  const [walletType, setWalletType] = useState('All');
  const [walletCorpFilter, setWalletCorpFilter] = useState('All');

  // Compensation Specific Filters
  const [compDate, setCompDate] = useState(new Date().toISOString().split('T')[0]);
  const [compStatus, setCompStatus] = useState('All');
  
  // Compensation Form State
  const [paymentType, setPaymentType] = useState<'Empty Km' | 'Promo Code' | 'Sticker'>('Empty Km');
  const [compForm, setCompForm] = useState({
    branch: '',
    driverName: '',
    phone: '',
    vehicleNo: '',
    orderId: '',
    pickupDistance: '',
    promoName: '',
    discountAmount: '',
    stickerDuration: '',
    stickerAmount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Paid',
    paymentMode: 'Cash',
    remarks: ''
  });

  // Wallet Form State
  const initialWalletForm = {
    corporateId: isSuperAdmin ? '' : sessionId,
    orderId: '',
    driverName: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Top-up' as 'Top-up' | 'Deduct',
    amount: '',
    paymentMode: 'Cash',
    receivedBy: '', 
    remarks: ''
  };
  const [walletForm, setWalletForm] = useState(initialWalletForm);
  const [allBranches, setAllBranches] = useState<any[]>([]);

  // --- Load Data ---
  useEffect(() => {
    // 1. Load Rules (Global)
    const savedRules = localStorage.getItem('driver_payment_rules');
    if (savedRules) {
        try {
            setRules(JSON.parse(savedRules));
        } catch(e) {
            setRules(DEFAULT_RULES);
        }
    }

    // 2. Load Corporates
    const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
    setCorporates(corps);

    // 3. Load Data based on Role
    let loadedPayments: DriverPayment[] = [];
    let loadedWallet: WalletTransaction[] = [];
    let loadedStaff: Employee[] = [];
    let loadedBranches: any[] = [];

    if (isSuperAdmin) {
        // --- Admin View: Aggregate Everything ---
        
        // A. Payments
        const adminPay = JSON.parse(localStorage.getItem('driver_payment_records') || '[]');
        loadedPayments = [...adminPay];
        corps.forEach((c: any) => {
            const cPay = JSON.parse(localStorage.getItem(`driver_payment_records_${c.email}`) || '[]');
            loadedPayments = [...loadedPayments, ...cPay];
        });

        // B. Wallet
        const adminWalletRaw = JSON.parse(localStorage.getItem('driver_wallet_data') || '[]');
        const adminWallet = adminWalletRaw.map((t: any) => ({ ...t, corporateId: t.corporateId || 'admin' }));
        loadedWallet = [...adminWallet];

        corps.forEach((c: any) => {
            const cWalletRaw = JSON.parse(localStorage.getItem(`driver_wallet_data_${c.email}`) || '[]');
            const cWallet = cWalletRaw.map((t: any) => ({ ...t, corporateId: t.corporateId || c.email }));
            loadedWallet = [...loadedWallet, ...cWallet];
        });

        // C. Staff
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        loadedStaff = [...adminStaff];
        corps.forEach((c: any) => {
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
            loadedStaff = [...loadedStaff, ...cStaff];
        });

        // D. Branches
        const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
        loadedBranches = [...adminBranches];
        corps.forEach((c: any) => {
            const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
            loadedBranches = [...loadedBranches, ...cBranches];
        });

    } else {
        // --- Franchise View: Scoped Data ---
        const payKey = `driver_payment_records_${sessionId}`;
        const walletKey = `driver_wallet_data_${sessionId}`;
        const staffKey = `staff_data_${sessionId}`;
        const branchKey = `branches_data_${sessionId}`;

        loadedPayments = JSON.parse(localStorage.getItem(payKey) || '[]');
        
        const myWalletRaw = JSON.parse(localStorage.getItem(walletKey) || '[]');
        loadedWallet = myWalletRaw.map((t: any) => ({ ...t, corporateId: sessionId }));
        
        loadedStaff = JSON.parse(localStorage.getItem(staffKey) || '[]');
        loadedBranches = JSON.parse(localStorage.getItem(branchKey) || '[]');
    }

    setPayments(loadedPayments);
    setWalletTransactions(loadedWallet);
    setStaffList(loadedStaff);
    setAllBranches(loadedBranches);
  }, [isSuperAdmin, sessionId]);

  // --- Computed Logic for Compensation Form ---
  const eligiblePaidKm = useMemo(() => {
      const dist = parseFloat(compForm.pickupDistance) || 0;
      if (dist <= 0) return 0;
      const capped = Math.min(dist, rules.maxPayableKm);
      return Math.max(0, capped - rules.freeLimitKm);
  }, [compForm.pickupDistance, rules]);

  const calculatedPayable = useMemo(() => {
      if (paymentType === 'Empty Km') return eligiblePaidKm * rules.ratePerKm;
      if (paymentType === 'Promo Code') return parseFloat(compForm.discountAmount) || 0;
      if (paymentType === 'Sticker') return parseFloat(compForm.stickerAmount) || 0;
      return 0;
  }, [paymentType, compForm, eligiblePaidKm, rules]);


  // --- Handlers: Compensation ---

  const saveRules = () => {
    localStorage.setItem('driver_payment_rules', JSON.stringify(rules));
    alert("Rules updated successfully!");
    setActiveView('Dashboard');
  };

  const handleSaveCompensation = () => {
    if (!compForm.driverName || !compForm.phone) {
        alert("Please enter driver details");
        return;
    }

    let finalAmount = 0;
    let details: any = {};

    if (paymentType === 'Empty Km') {
        const dist = parseFloat(compForm.pickupDistance) || 0;
        finalAmount = calculatedPayable;
        details = { distance: dist, paidKm: eligiblePaidKm };
    } else if (paymentType === 'Promo Code') {
        finalAmount = parseFloat(compForm.discountAmount) || 0;
        details = { promoName: compForm.promoName };
    } else {
        finalAmount = parseFloat(compForm.stickerAmount) || 0;
        details = { stickerDuration: parseInt(compForm.stickerDuration) };
    }

    const newPayment: DriverPayment = {
        id: `DP-${Date.now()}`,
        driverName: compForm.driverName,
        phone: compForm.phone,
        vehicleNo: compForm.vehicleNo,
        orderId: compForm.orderId || `ORD-${Math.floor(10000 + Math.random()*90000)}`,
        branch: compForm.branch || 'Main Branch',
        corporateId: isSuperAdmin ? 'admin' : sessionId,
        type: paymentType,
        amount: finalAmount,
        status: compForm.status as any,
        date: compForm.date,
        paymentMode: compForm.paymentMode,
        remarks: compForm.remarks,
        details: details
    };

    const updated = [newPayment, ...payments];
    setPayments(updated);
    
    // Save to specific storage
    const key = isSuperAdmin ? 'driver_payment_records' : `driver_payment_records_${sessionId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([newPayment, ...existing]));
    
    setIsModalOpen(false);
    setCompForm(prev => ({ 
        ...prev, 
        driverName: '', phone: '', vehicleNo: '', orderId: '', 
        pickupDistance: '', discountAmount: '', stickerAmount: '', promoName: '' 
    }));
    alert("Payment Logged Successfully!");
  };

  // --- Handlers: Wallet ---

  const handleOpenWalletModal = (existingTransaction?: WalletTransaction) => {
      if (existingTransaction) {
          setEditingWalletId(existingTransaction.id);
          setWalletForm({
              corporateId: existingTransaction.corporateId,
              orderId: existingTransaction.orderId,
              driverName: existingTransaction.driverName,
              phone: existingTransaction.phone,
              date: existingTransaction.date,
              type: existingTransaction.type,
              amount: existingTransaction.amount.toString(),
              paymentMode: existingTransaction.paymentMode,
              receivedBy: existingTransaction.receivedBy,
              remarks: existingTransaction.remarks
          });
      } else {
          setEditingWalletId(null);
          setWalletForm({
              ...initialWalletForm,
              orderId: `ORD-${Math.floor(100000 + Math.random() * 900000)}`
          });
      }
      setIsWalletModalOpen(true);
  };

  const handleWalletTypeChange = (type: 'Top-up' | 'Deduct') => {
      setWalletForm(prev => ({
          ...prev,
          type,
          paymentMode: type === 'Deduct' ? 'OK BOZ Wallet' : 'Cash'
      }));
  };

  const handleSaveWallet = () => {
      if (!walletForm.driverName || !walletForm.amount || !walletForm.phone) {
          alert("Please fill in required fields.");
          return;
      }

      // Determine Corporate ID and Branch Name
      let targetCorpId = isSuperAdmin ? walletForm.corporateId : sessionId;
      if (isSuperAdmin && !targetCorpId) targetCorpId = 'admin';

      let branchName = 'Head Office';
      if (targetCorpId !== 'admin') {
          const corp = corporates.find(c => c.email === targetCorpId);
          if (corp) branchName = corp.companyName;
      } else if (!isSuperAdmin) {
          const me = corporates.find(c => c.email === sessionId);
          branchName = me ? me.companyName : 'My Branch';
      }

      let status: 'Pending' | 'Approved' | 'Rejected' = isSuperAdmin ? 'Approved' : 'Pending';
      
      if (editingWalletId) {
          const existing = walletTransactions.find(t => t.id === editingWalletId);
          if (existing) status = existing.status;
      }

      const transactionData: WalletTransaction = {
          id: editingWalletId || `WT-${Date.now()}`,
          orderId: walletForm.orderId || `ORD-${Date.now().toString().slice(-6)}`,
          date: walletForm.date,
          corporateId: targetCorpId,
          branchName: branchName,
          driverName: walletForm.driverName,
          phone: walletForm.phone,
          type: walletForm.type,
          amount: parseFloat(walletForm.amount),
          paymentMode: walletForm.paymentMode,
          receivedBy: walletForm.receivedBy,
          status: status,
          remarks: walletForm.remarks
      };

      let updatedList;
      if (editingWalletId) {
          updatedList = walletTransactions.map(t => t.id === editingWalletId ? transactionData : t);
      } else {
          updatedList = [transactionData, ...walletTransactions];
      }
      setWalletTransactions(updatedList);

      const key = targetCorpId === 'admin' ? 'driver_wallet_data' : `driver_wallet_data_${targetCorpId}`;
      const existingStorage = JSON.parse(localStorage.getItem(key) || '[]');
      let newStorage;
      if (editingWalletId) {
          newStorage = existingStorage.map((t: any) => t.id === editingWalletId ? transactionData : t);
      } else {
          newStorage = [transactionData, ...existingStorage];
      }
      localStorage.setItem(key, JSON.stringify(newStorage));

      setIsWalletModalOpen(false);
      alert(editingWalletId ? "Transaction Updated!" : (isSuperAdmin ? "Transaction Processed!" : "Request Sent for Approval!"));
  };

  const handleApproveWallet = (id: string, corporateId: string) => {
      if (!isSuperAdmin) return;
      if (!window.confirm("Approve this wallet request?")) return;

      const updated = walletTransactions.map(t => t.id === id ? { ...t, status: 'Approved' as const } : t);
      setWalletTransactions(updated);

      const key = (!corporateId || corporateId === 'admin') ? 'driver_wallet_data' : `driver_wallet_data_${corporateId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const newStored = existing.map((t: any) => t.id === id ? { ...t, status: 'Approved' } : t);
      localStorage.setItem(key, JSON.stringify(newStored));
  };

  const handleRejectWallet = (id: string, corporateId: string) => {
      if (!isSuperAdmin) return;
      if (!window.confirm("Reject this wallet request?")) return;

      const updated = walletTransactions.map(t => t.id === id ? { ...t, status: 'Rejected' as const } : t);
      setWalletTransactions(updated);

      const key = (!corporateId || corporateId === 'admin') ? 'driver_wallet_data' : `driver_wallet_data_${corporateId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const newStored = existing.map((t: any) => t.id === id ? { ...t, status: 'Rejected' } : t);
      localStorage.setItem(key, JSON.stringify(newStored));
  };

  const resetWalletFilters = () => {
      setSearchTerm('');
      setWalletFromDate('');
      setWalletToDate('');
      setWalletStatus('All');
      setWalletType('All');
      setWalletCorpFilter('All');
  };

  // --- Computed Stats for Dashboard ---
  const walletStats = useMemo(() => {
      const approved = walletTransactions.filter(t => t.status === 'Approved');
      const topUp = approved.filter(t => t.type === 'Top-up').reduce((sum, t) => sum + t.amount, 0);
      const deduct = approved.filter(t => t.type === 'Deduct').reduce((sum, t) => sum + t.amount, 0);
      const balance = topUp - deduct;
      const pending = walletTransactions.filter(t => t.status === 'Pending').length;
      return { balance, topUp, deduct, pending };
  }, [walletTransactions]);

  const compStats = useMemo(() => {
      const totalPaid = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
      const pendingCount = payments.filter(p => p.status === 'Pending').length;
      const emptyKmPaid = payments.filter(p => p.type === 'Empty Km' && p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
      const promoStickerPaid = payments.filter(p => (p.type === 'Promo Code' || p.type === 'Sticker') && p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
      return { totalPaid, pendingCount, emptyKmPaid, promoStickerPaid };
  }, [payments]);

  // Filtering
  const filteredWallet = walletTransactions.filter(t => {
      const matchesSearch = t.driverName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.phone.includes(searchTerm) ||
                            t.orderId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = walletStatus === 'All' || t.status === walletStatus;
      const matchesType = walletType === 'All' || t.type === walletType;
      
      let matchesCorp = true;
      if (isSuperAdmin) {
          matchesCorp = walletCorpFilter === 'All' || t.corporateId === walletCorpFilter || (walletCorpFilter === 'admin' && t.corporateId === 'admin');
      } else {
          matchesCorp = t.corporateId === sessionId;
      }

      let matchesDate = true;
      if (walletFromDate) matchesDate = matchesDate && t.date >= walletFromDate;
      if (walletToDate) matchesDate = matchesDate && t.date <= walletToDate;

      return matchesSearch && matchesStatus && matchesType && matchesCorp && matchesDate;
  });

  const filteredPayments = payments.filter(p => {
      const matchesSearch = p.driverName.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm);
      const matchesStatus = compStatus === 'All' || p.status === compStatus;
      const matchesDate = !compDate || p.date === compDate;
      const matchesCorp = isSuperAdmin ? true : p.corporateId === sessionId;
      return matchesSearch && matchesStatus && matchesCorp && matchesDate;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Truck className="w-8 h-8 text-emerald-600" /> Driver Payments & Wallet
          </h2>
          <p className="text-gray-500">Manage compensations and driver wallet balance</p>
        </div>
        <div className="flex gap-2">
            {!isSuperAdmin && (
                <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> My Branch
                </div>
            )}
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => { setMainTab('Payments'); setSearchTerm(''); }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mainTab === 'Payments' ? 'bg-white shadow text-emerald-600' : 'text-gray-600'}`}
                >
                    Compensations
                </button>
                <button 
                    onClick={() => { setMainTab('Wallet'); setSearchTerm(''); }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mainTab === 'Wallet' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                >
                    <Wallet className="w-4 h-4" /> Wallet
                </button>
            </div>
        </div>
      </div>

      {/* ---------------- WALLET TAB ---------------- */}
      {mainTab === 'Wallet' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Balance Card */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                          <p className="text-blue-100 text-xs font-bold uppercase mb-1">Total Wallet Balance</p>
                          <h3 className="text-4xl font-bold">₹{walletStats.balance.toLocaleString()}</h3>
                          <div className="flex gap-4 mt-4 text-xs font-medium text-blue-100">
                              <span className="flex items-center gap-1"><ArrowRightLeft className="w-3 h-3"/> Top-up: ₹{walletStats.topUp.toLocaleString()}</span>
                              <span>Deducted: ₹{walletStats.deduct.toLocaleString()}</span>
                          </div>
                      </div>
                      <Wallet className="absolute -bottom-6 -right-6 w-32 h-32 text-white opacity-10" />
                  </div>

                  {/* Pending Card */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                      <div>
                          <p className="text-xs font-bold text-gray-500 uppercase">Pending Requests</p>
                          <h3 className="text-3xl font-bold text-orange-500 mt-2">{walletStats.pending}</h3>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">Requires Admin Approval</div>
                  </div>

                  {/* Action Card */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-start">
                      <button 
                          onClick={() => handleOpenWalletModal()}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2"
                      >
                          <Plus className="w-5 h-5" /> Request Top-up / Deduct
                      </button>
                      <p className="text-xs text-center text-gray-400 mt-3 w-full">
                          {isSuperAdmin ? 'Process transactions instantly.' : 'Requests require admin approval.'}
                      </p>
                  </div>
              </div>

              {/* Advanced Filter Bar */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                          placeholder="Search Order ID / Driver / Phone..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                  </div>
                  
                  <div className="flex flex-wrap gap-2 items-center">
                      <div className="flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200">
                          <span className="text-xs text-gray-500 font-bold px-1">Date:</span>
                          <input 
                              type="date" 
                              value={walletFromDate} 
                              onChange={(e) => setWalletFromDate(e.target.value)}
                              className="text-xs border border-gray-300 rounded px-1 py-0.5 outline-none"
                          />
                          <span className="text-xs text-gray-400">-</span>
                          <input 
                              type="date" 
                              value={walletToDate} 
                              onChange={(e) => setWalletToDate(e.target.value)}
                              className="text-xs border border-gray-300 rounded px-1 py-0.5 outline-none"
                          />
                      </div>

                      <select 
                          value={walletStatus}
                          onChange={(e) => setWalletStatus(e.target.value)}
                          className="px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none cursor-pointer"
                      >
                          <option value="All">All Status</option>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                      </select>

                      <select 
                          value={walletType}
                          onChange={(e) => setWalletType(e.target.value)}
                          className="px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none cursor-pointer"
                      >
                          <option value="All">All Types</option>
                          <option value="Top-up">Top-up (Credit)</option>
                          <option value="Deduct">Deduct (Debit)</option>
                      </select>

                      {isSuperAdmin && (
                          <select 
                              value={walletCorpFilter}
                              onChange={(e) => setWalletCorpFilter(e.target.value)}
                              className="px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none cursor-pointer max-w-[120px]"
                          >
                              <option value="All">All Corp</option>
                              <option value="admin">Head Office</option>
                              {corporates.map(c => (
                                  <option key={c.email} value={c.email}>{c.companyName}</option>
                              ))}
                          </select>
                      )}

                      <button 
                          onClick={resetWalletFilters}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                          title="Reset Filters"
                      >
                          <RefreshCcw className="w-4 h-4" />
                      </button>
                  </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                              <tr>
                                  <th className="px-6 py-4">Date</th>
                                  <th className="px-6 py-4">Order ID</th>
                                  <th className="px-6 py-4">Driver</th>
                                  <th className="px-6 py-4">Branch</th>
                                  <th className="px-6 py-4">Type</th>
                                  <th className="px-6 py-4">Amount</th>
                                  <th className="px-6 py-4">Mode</th>
                                  <th className="px-6 py-4">Received By</th>
                                  <th className="px-6 py-4 text-center">Status</th>
                                  <th className="px-6 py-4 text-right">Action</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {filteredWallet.map(t => (
                                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 text-gray-600">{t.date}</td>
                                      <td className="px-6 py-4 font-mono text-xs text-blue-600">{t.orderId}</td>
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-gray-900">{t.driverName}</div>
                                          <div className="text-xs text-gray-500">{t.phone}</div>
                                      </td>
                                      <td className="px-6 py-4 text-gray-600">{t.branchName}</td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'Top-up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                              {t.type}
                                          </span>
                                      </td>
                                      <td className={`px-6 py-4 font-bold ${t.type === 'Top-up' ? 'text-green-600' : 'text-red-600'}`}>
                                          {t.type === 'Top-up' ? '+' : '-'}₹{t.amount}
                                      </td>
                                      <td className="px-6 py-4 text-gray-600">{t.paymentMode}</td>
                                      <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                                          <User className="w-3 h-3 text-gray-400"/> {t.receivedBy}
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                              t.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                              t.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                                          }`}>
                                              {t.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end gap-2">
                                              {(isSuperAdmin || t.status === 'Pending') && (
                                                  <button 
                                                      onClick={() => handleOpenWalletModal(t)} 
                                                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" 
                                                      title="Edit"
                                                  >
                                                      <Edit2 className="w-4 h-4" />
                                                  </button>
                                              )}
                                              {isSuperAdmin && t.status === 'Pending' && (
                                                  <>
                                                      <button onClick={() => handleApproveWallet(t.id, t.corporateId)} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Approve"><ThumbsUp className="w-4 h-4" /></button>
                                                      <button onClick={() => handleRejectWallet(t.id, t.corporateId)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Reject"><ThumbsDown className="w-4 h-4" /></button>
                                                  </>
                                              )}
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                              {filteredWallet.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-gray-400">No transactions found.</td></tr>}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* ---------------- PAYMENTS TAB (Compensations) ---------------- */}
      {mainTab === 'Payments' && (
        <div className="animate-in fade-in slide-in-from-left-4">
            {/* View Toggle (Dashboard vs Rules) */}
            <div className="flex justify-end mb-4">
                <div className="flex bg-white border border-gray-200 rounded-lg p-1">
                    <button 
                        onClick={() => setActiveView('Dashboard')}
                        className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${activeView === 'Dashboard' ? 'bg-gray-100 text-gray-800' : 'text-gray-500'}`}
                    >
                        Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveView('Rules')}
                        className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${activeView === 'Rules' ? 'bg-gray-100 text-gray-800' : 'text-gray-500'}`}
                    >
                        Rules
                    </button>
                </div>
            </div>

            {/* Rules View */}
            {activeView === 'Rules' && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500" /> Configure Rules</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="p-4 rounded-xl border-l-4 border-l-orange-500 bg-white border border-gray-200 shadow-sm">
                            <label className="text-xs font-bold text-gray-500 uppercase">Free Limit (KM)</label>
                            <input 
                                type="number" 
                                value={rules.freeLimitKm} 
                                onChange={(e) => setRules({...rules, freeLimitKm: parseFloat(e.target.value)})}
                                className="text-2xl font-bold text-gray-800 w-full mt-1 outline-none border-b border-transparent focus:border-orange-500 transition-colors bg-transparent"
                            />
                        </div>
                        <div className="p-4 rounded-xl border-l-4 border-l-blue-500 bg-white border border-gray-200 shadow-sm">
                            <label className="text-xs font-bold text-gray-500 uppercase">Max Payable KM</label>
                            <input 
                                type="number" 
                                value={rules.maxPayableKm} 
                                onChange={(e) => setRules({...rules, maxPayableKm: parseFloat(e.target.value)})}
                                className="text-2xl font-bold text-gray-800 w-full mt-1 outline-none border-b border-transparent focus:border-blue-500 transition-colors bg-transparent"
                            />
                        </div>
                        <div className="p-4 rounded-xl border-l-4 border-l-emerald-500 bg-white border border-gray-200 shadow-sm">
                            <label className="text-xs font-bold text-gray-500 uppercase">Rate Per KM</label>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-gray-400 font-bold text-lg">₹</span>
                                <input 
                                    type="number" 
                                    value={rules.ratePerKm} 
                                    onChange={(e) => setRules({...rules, ratePerKm: parseFloat(e.target.value)})}
                                    className="text-2xl font-bold text-gray-800 w-full outline-none border-b border-transparent focus:border-emerald-500 transition-colors bg-transparent"
                                />
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border-l-4 border-l-purple-500 bg-white border border-gray-200 shadow-sm">
                            <label className="text-xs font-bold text-gray-500 uppercase">Max Promo Pay</label>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-gray-400 font-bold text-lg">₹</span>
                                <input 
                                    type="number" 
                                    value={rules.maxPromoPay} 
                                    onChange={(e) => setRules({...rules, maxPromoPay: parseFloat(e.target.value)})}
                                    className="text-2xl font-bold text-gray-800 w-full outline-none border-b border-transparent focus:border-purple-500 transition-colors bg-transparent"
                                />
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border-l-4 border-l-pink-500 bg-white border border-gray-200 shadow-sm">
                            <label className="text-xs font-bold text-gray-500 uppercase">Max Sticker Pay</label>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-gray-400 font-bold text-lg">₹</span>
                                <input 
                                    type="number" 
                                    value={rules.maxStickerPay} 
                                    onChange={(e) => setRules({...rules, maxStickerPay: parseFloat(e.target.value)})}
                                    className="text-2xl font-bold text-gray-800 w-full outline-none border-b border-transparent focus:border-pink-500 transition-colors bg-transparent"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button onClick={saveRules} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors shadow-sm">
                            Save Rules
                        </button>
                    </div>
                </div>
            )}

            {/* Dashboard View */}
            {activeView === 'Dashboard' && (
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase">Total Paid</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">₹{compStats.totalPaid.toLocaleString()}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase">Pending</p>
                            <h3 className="text-3xl font-bold text-red-600 mt-2">{compStats.pendingCount}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase">Empty Km Paid</p>
                            <h3 className="text-2xl font-bold text-orange-500 mt-1">₹{compStats.emptyKmPaid.toLocaleString()}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase">Other Paid</p>
                            <h3 className="text-2xl font-bold text-purple-600 mt-1">₹{compStats.promoStickerPaid.toLocaleString()}</h3>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800">Compensation History</h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsModalOpen(true)}
                                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm"
                                >
                                    <Plus className="w-4 h-4" /> Log Payment
                                </button>
                                <input 
                                    type="date"
                                    value={compDate}
                                    onChange={(e) => setCompDate(e.target.value)}
                                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                                />
                                <select 
                                    value={compStatus}
                                    onChange={(e) => setCompStatus(e.target.value)}
                                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Pending">Pending</option>
                                </select>
                                <input 
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-3 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Order ID</th>
                                        <th className="px-6 py-4">Driver</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPayments.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-600">{p.date}</td>
                                            <td className="px-6 py-4 font-mono text-blue-600">{p.orderId}</td>
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.driverName}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                                    p.type === 'Empty Km' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                    {p.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">₹{p.amount}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.status === 'Paid' ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPayments.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-gray-400">No records found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Compensation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800 text-lg">Log Driver Payment</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                 
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Truck className="w-3 h-3"/> Driver Details</label>
                     <div className="space-y-3">
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                             <select 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                                value={compForm.branch}
                                onChange={(e) => setCompForm({...compForm, branch: e.target.value})}
                             >
                                <option value="">Select Branch</option>
                                {allBranches.map((b: any) => (
                                    <option key={b.id || b.name} value={b.name}>{b.name}</option>
                                ))}
                             </select>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                             <input 
                                 placeholder="Driver Name" 
                                 className="p-2 border border-gray-300 rounded-lg text-sm outline-none w-full"
                                 value={compForm.driverName}
                                 onChange={(e) => setCompForm({...compForm,driverName: e.target.value})}
                             />
                             <input 
                                 placeholder="Phone Number" 
                                 className="p-2 border border-gray-300 rounded-lg text-sm outline-none w-full"
                                 value={compForm.phone}
                                 onChange={(e) => setCompForm({...compForm, phone: e.target.value})}
                             />
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                             <input 
                                 placeholder="Vehicle No (Optional)" 
                                 className="p-2 border border-gray-300 rounded-lg text-sm outline-none w-full"
                                 value={compForm.vehicleNo}
                                 onChange={(e) => setCompForm({...compForm, vehicleNo: e.target.value})}
                             />
                             <input 
                                 placeholder="Order ID (Auto if empty)" 
                                 className="p-2 border border-gray-300 rounded-lg text-sm outline-none w-full"
                                 value={compForm.orderId}
                                 onChange={(e) => setCompForm({...compForm, orderId: e.target.value})}
                             />
                         </div>
                     </div>
                 </div>

                 {/* Payment Type Tabs */}
                 <div className="bg-gray-100 p-1 rounded-lg flex">
                     {['Empty Km', 'Promo Code', 'Sticker'].map((t) => (
                         <button 
                             key={t}
                             onClick={() => setPaymentType(t as any)}
                             className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${paymentType === t ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                         >
                             {t}
                         </button>
                     ))}
                 </div>

                 {/* Dynamic Fields */}
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                     {paymentType === 'Empty Km' && (
                         <div className="space-y-3">
                             <label className="text-xs font-bold text-gray-500 uppercase">Pickup Distance (KM)</label>
                             <input 
                                type="number"
                                placeholder="e.g. 8"
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none"
                                value={compForm.pickupDistance}
                                onChange={(e) => setCompForm({...compForm, pickupDistance: e.target.value})}
                             />
                             <div className="bg-blue-50 border border-blue-100 p-2 rounded text-xs text-blue-700 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Applied Rules: First <strong>{rules.freeLimitKm}km</strong> free. Paid up to <strong>{rules.maxPayableKm}km</strong>. Rate: <strong>₹{rules.ratePerKm}/km</strong>.
                             </div>
                             <div className="flex justify-between items-center text-xs font-medium text-gray-600 pt-1">
                                 <span>Eligible Paid Km:</span>
                                 <span className="font-bold text-emerald-600">{eligiblePaidKm} km</span>
                             </div>
                         </div>
                     )}
                     {paymentType === 'Promo Code' && (
                         <div className="space-y-3">
                             <input placeholder="Promo Name" className="w-full p-2 border rounded-lg text-sm" value={compForm.promoName} onChange={(e) => setCompForm({...compForm, promoName: e.target.value})}/>
                             <input type="number" placeholder="Amount" className="w-full p-2 border rounded-lg text-sm" value={compForm.discountAmount} onChange={(e) => setCompForm({...compForm, discountAmount: e.target.value})}/>
                         </div>
                     )}
                     {paymentType === 'Sticker' && (
                         <div className="space-y-3">
                             <input type="number" placeholder="Amount" className="w-full p-2 border rounded-lg text-sm" value={compForm.stickerAmount} onChange={(e) => setCompForm({...compForm, stickerAmount: e.target.value})}/>
                         </div>
                     )}
                     <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                         <span className="font-bold text-gray-700">Calculated Payable:</span>
                         <span className="text-xl font-bold text-emerald-600">₹{calculatedPayable}</span>
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                         <input type="date" value={compForm.date} onChange={(e) => setCompForm({...compForm, date: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                         <select value={compForm.status} onChange={(e) => setCompForm({...compForm, status: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white">
                             <option>Paid</option>
                             <option>Pending</option>
                         </select>
                     </div>
                 </div>

                 <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Mode</label>
                     <select value={compForm.paymentMode} onChange={(e) => setCompForm({...compForm, paymentMode: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white">
                         <option>Cash</option>
                         <option>UPI</option>
                         <option>Bank Transfer</option>
                     </select>
                 </div>

                 <div>
                     <textarea 
                        rows={2} 
                        placeholder="Remarks (Optional)..." 
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none resize-none"
                        value={compForm.remarks}
                        onChange={(e) => setCompForm({...compForm, remarks: e.target.value})}
                     />
                 </div>

              </div>
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-2xl">
                  <button 
                      onClick={handleSaveCompensation}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors"
                  >
                      Save Payment
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Wallet Transaction Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800 text-lg">
                     {editingWalletId ? 'Edit Transaction' : (isSuperAdmin ? 'Process Transaction' : 'Request Transaction')}
                 </h3>
                 <button onClick={() => setIsWalletModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                 {/* Type Switch */}
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                     <button 
                         onClick={() => handleWalletTypeChange('Top-up')}
                         className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${walletForm.type === 'Top-up' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}
                     >
                         Top-up (Credit)
                     </button>
                     <button 
                         onClick={() => handleWalletTypeChange('Deduct')}
                         className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${walletForm.type === 'Deduct' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}
                     >
                         Deduct (Debit)
                     </button>
                 </div>

                 {/* Branch Selection (Super Admin Only) */}
                 {isSuperAdmin && (
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Corporate / Branch</label>
                         <select 
                             className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                             value={walletForm.corporateId}
                             onChange={(e) => setWalletForm({...walletForm, corporateId: e.target.value})}
                         >
                             <option value="">Head Office</option>
                             {corporates.map(c => (
                                 <option key={c.email} value={c.email}>{c.companyName}</option>
                             ))}
                         </select>
                     </div>
                 )}

                 <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                     <div className="relative">
                         <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                         <input 
                             className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none font-mono"
                             value={walletForm.orderId}
                             onChange={(e) => setWalletForm({...walletForm, orderId: e.target.value})}
                             placeholder="ORD-..."
                         />
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                         <input 
                             className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none"
                             value={walletForm.driverName}
                             onChange={(e) => setWalletForm({...walletForm, driverName: e.target.value})}
                             placeholder="Name"
                         />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                         <input 
                             className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none"
                             value={walletForm.phone}
                             onChange={(e) => setWalletForm({...walletForm, phone: e.target.value})}
                             placeholder="Phone"
                         />
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                         <input 
                             type="date"
                             className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none"
                             value={walletForm.date}
                             onChange={(e) => setWalletForm({...walletForm, date: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                         <input 
                             type="number"
                             className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none font-bold"
                             value={walletForm.amount}
                             onChange={(e) => setWalletForm({...walletForm, amount: e.target.value})}
                             placeholder="0.00"
                         />
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                         <select 
                             className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none disabled:bg-gray-100"
                             value={walletForm.paymentMode}
                             onChange={(e) => setWalletForm({...walletForm, paymentMode: e.target.value})}
                             disabled={walletForm.type === 'Deduct'}
                         >
                             {walletForm.type === 'Deduct' ? (
                                 <option value="OK BOZ Wallet">OK BOZ Wallet</option>
                             ) : (
                                 <>
                                     <option value="Cash">Cash</option>
                                     <option value="UPI">UPI</option>
                                     <option value="Razorpay">Razorpay</option>
                                 </>
                             )}
                         </select>
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Received By (Staff)</label>
                         <select 
                             className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                             value={walletForm.receivedBy}
                             onChange={(e) => setWalletForm({...walletForm, receivedBy: e.target.value})}
                         >
                             <option value="">Select Staff</option>
                             {staffList.map(s => (
                                 <option key={s.id} value={s.name}>{s.name}</option>
                             ))}
                         </select>
                     </div>
                 </div>

                 <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                     <textarea 
                         rows={2}
                         className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none resize-none"
                         value={walletForm.remarks}
                         onChange={(e) => setWalletForm({...walletForm, remarks: e.target.value})}
                         placeholder="Notes..."
                     />
                 </div>

                 {/* Disclaimer for Deduction */}
                 {walletForm.type === 'Deduct' && (
                     <div className="bg-orange-50 border border-orange-200 text-orange-800 text-xs p-3 rounded-lg flex items-start gap-2">
                         <Info className="w-4 h-4 shrink-0 mt-0.5" />
                         <span>Money will be deducted from the branch/driver OK BOZ Wallet balance. {isSuperAdmin ? '' : 'Admin approval required.'}</span>
                     </div>
                 )}
              </div>

              <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-2xl">
                  <button 
                      onClick={handleSaveWallet}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors"
                  >
                      {editingWalletId ? 'Update Transaction' : (isSuperAdmin ? 'Process Transaction' : 'Request Transaction')}
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* --- Boz Chat Assistant --- */}
      <AiAssistant
        systemInstruction="You are an AI assistant specialized in Driver Wallet & Finance management for OK BOZ. Help the admin analyze wallet trends, verify deduction logic, and summarize pending requests."
        initialMessage="Hello! I can help you with wallet analysis or transaction queries."
        triggerButtonLabel="Wallet AI"
        chatPrompt="Summarize today's wallet activity." 
      />
    </div>
  );
};

export default DriverPayments;