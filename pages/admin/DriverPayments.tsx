
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Plus, Search, Filter, Download, 
  Truck, DollarSign, Calendar, CheckCircle, 
  AlertCircle, X, Save, ChevronDown, PieChart, Info, Building2,
  Wallet, ArrowRightLeft, User, ThumbsUp, ThumbsDown, CreditCard, Edit2, Hash, RefreshCw, Check, MapPin
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

export const DriverPayments: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const userRole = localStorage.getItem('user_role');
  const isSuperAdmin = userRole === 'ADMIN';

  // Helper to determine the "Data Owner" ID
  const getContextOwnerId = () => {
      if (isSuperAdmin) return 'admin';
      if (userRole === 'EMPLOYEE') {
          return localStorage.getItem('logged_in_employee_corporate_id') || 'admin';
      }
      return sessionId;
  };

  const contextOwnerId = getContextOwnerId();

  // --- State ---
  const [mainTab, setMainTab] = useState<'Payments' | 'Wallet'>('Payments'); 
  const [activeView, setActiveView] = useState<'Dashboard' | 'Rules'>('Dashboard');
  
  // Data State
  const [payments, setPayments] = useState<DriverPayment[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [rules, setRules] = useState<PaymentRules>(DEFAULT_RULES);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [staffList, setStaffList] = useState<Employee[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
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
  const [compDate, setCompDate] = useState('');
  const [compStatus, setCompStatus] = useState('All');
  
  // Compensation Form State - Multi-select supported
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<string[]>(['Empty Km']);
  const [compForm, setCompForm] = useState({
    corporateId: isSuperAdmin ? 'admin' : contextOwnerId, // Default owner
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
    corporateId: isSuperAdmin ? '' : contextOwnerId,
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

  // --- Load Data ---
  const loadAllData = () => {
    // 1. Load Rules
    const savedRules = localStorage.getItem('driver_payment_rules');
    if (savedRules) {
        try { setRules(JSON.parse(savedRules)); } catch(e) { setRules(DEFAULT_RULES); }
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
        const adminPay = JSON.parse(localStorage.getItem('driver_payment_records') || '[]');
        loadedPayments = [...adminPay];
        corps.forEach((c: any) => {
            const cPay = JSON.parse(localStorage.getItem(`driver_payment_records_${c.email}`) || '[]');
            loadedPayments = [...loadedPayments, ...cPay];
        });

        const adminWalletRaw = JSON.parse(localStorage.getItem('driver_wallet_data') || '[]');
        loadedWallet = [...adminWalletRaw.map((t: any) => ({ ...t, corporateId: 'admin' }))];
        corps.forEach((c: any) => {
            const cWalletRaw = JSON.parse(localStorage.getItem(`driver_wallet_data_${c.email}`) || '[]');
            loadedWallet = [...loadedWallet, ...cWalletRaw.map((t: any) => ({ ...t, corporateId: c.email }))];
        });

        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        loadedStaff = [...adminStaff.map((s:any) => ({...s, owner: 'admin'}))];
        corps.forEach((c: any) => {
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
            loadedStaff = [...loadedStaff, ...cStaff.map((s:any) => ({...s, owner: c.email}))];
        });

        const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
        loadedBranches = [...adminBranches.map((b:any) => ({...b, owner: 'admin'}))];
        corps.forEach((c: any) => {
            const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
            loadedBranches = [...loadedBranches, ...cBranches.map((b:any) => ({...b, owner: c.email}))];
        });
    } else {
        // --- Franchise / Employee View: Scoped Data ---
        const payKey = contextOwnerId === 'admin' ? 'driver_payment_records' : `driver_payment_records_${contextOwnerId}`;
        const walletKey = contextOwnerId === 'admin' ? 'driver_wallet_data' : `driver_wallet_data_${contextOwnerId}`;
        const staffKey = contextOwnerId === 'admin' ? 'staff_data' : `staff_data_${contextOwnerId}`;
        const branchKey = contextOwnerId === 'admin' ? 'branches_data' : `branches_data_${contextOwnerId}`;

        loadedPayments = JSON.parse(localStorage.getItem(payKey) || '[]');
        const myWalletRaw = JSON.parse(localStorage.getItem(walletKey) || '[]');
        loadedWallet = myWalletRaw.map((t: any) => ({ ...t, corporateId: contextOwnerId }));
        loadedStaff = JSON.parse(localStorage.getItem(staffKey) || '[]').map((s:any) => ({...s, owner: contextOwnerId}));
        loadedBranches = JSON.parse(localStorage.getItem(branchKey) || '[]').map((b:any) => ({...b, owner: contextOwnerId}));
    }

    setPayments(loadedPayments.reverse());
    setWalletTransactions(loadedWallet.reverse());
    setStaffList(loadedStaff);
    setAllBranches(loadedBranches);
  };

  useEffect(() => {
    loadAllData();
    window.addEventListener('storage', loadAllData);
    return () => window.removeEventListener('storage', loadAllData);
  }, [sessionId, userRole, isSuperAdmin]);

  // --- Computed Form Lists (Dynamic Filtering) ---
  const formBranches = useMemo(() => {
      const targetOwner = compForm.corporateId || 'admin';
      return allBranches.filter(b => b.owner === targetOwner);
  }, [allBranches, compForm.corporateId]);

  // --- Computed Logic ---
  const eligiblePaidKm = useMemo(() => {
      const dist = parseFloat(compForm.pickupDistance) || 0;
      if (dist <= 0) return 0;
      const capped = Math.min(dist, rules.maxPayableKm);
      return Math.max(0, capped - rules.freeLimitKm);
  }, [compForm.pickupDistance, rules]);

  // Combined Calculation for all selected types
  const calculatedPayable = useMemo(() => {
      let total = 0;
      if (selectedPaymentTypes.includes('Empty Km')) total += (eligiblePaidKm * rules.ratePerKm);
      if (selectedPaymentTypes.includes('Promo Code')) total += (parseFloat(compForm.discountAmount) || 0);
      if (selectedPaymentTypes.includes('Sticker')) total += (parseFloat(compForm.stickerAmount) || 0);
      return total;
  }, [selectedPaymentTypes, compForm, eligiblePaidKm, rules]);

  const existingOrderPayments = useMemo(() => {
      if (!compForm.orderId.trim()) return [];
      return payments.filter(p => p.orderId === compForm.orderId.trim() && p.status !== 'Rejected');
  }, [compForm.orderId, payments]);

  const existingOrderTotal = useMemo(() => {
      return existingOrderPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [existingOrderPayments]);


  // --- Handlers: Compensation ---

  const saveRules = () => {
    localStorage.setItem('driver_payment_rules', JSON.stringify(rules));
    alert("Rules updated successfully!");
    setActiveView('Dashboard');
  };

  const togglePaymentType = (type: string) => {
    setSelectedPaymentTypes(prev => {
        if (prev.includes(type)) {
            // Don't allow deselecting everything, keep at least one if clicked
            if (prev.length === 1 && prev[0] === type) return prev;
            return prev.filter(t => t !== type);
        }
        return [...prev, type];
    });
  };

  const handleSaveCompensation = () => {
    if (!compForm.driverName || !compForm.phone) {
        alert("Please enter driver details");
        return;
    }

    if (selectedPaymentTypes.length === 0) {
        alert("Please select at least one payment type.");
        return;
    }

    // --- ORDER ID VALIDATION ---
    const orderIdRequired = selectedPaymentTypes.some(t => ['Empty Km', 'Promo Code'].includes(t));
    if (orderIdRequired && !compForm.orderId.trim()) {
        alert("Order ID is required for Empty Km and Promo Code payments.");
        return;
    }

    const targetCorpId = compForm.corporateId || 'admin';
    const key = targetCorpId === 'admin' ? 'driver_payment_records' : `driver_payment_records_${targetCorpId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const newRecords: DriverPayment[] = [];
    const timestamp = Date.now();

    // Check existing Order ID validity
    if (compForm.orderId.trim()) {
        const relatedPayments = existing.filter((p: DriverPayment) => 
            p.orderId === compForm.orderId && p.status !== 'Rejected'
        );
        // Check if any selected type is already paid
        const duplicates = selectedPaymentTypes.filter(type => relatedPayments.some((p: DriverPayment) => p.type === type));
        if (duplicates.length > 0) {
            alert(`Payment type(s) '${duplicates.join(', ')}' already recorded for Order ID ${compForm.orderId}.`);
            return;
        }
    }

    // Generate records for each selected type
    selectedPaymentTypes.forEach((type, idx) => {
        let amount = 0;
        let details: any = {};

        if (type === 'Empty Km') {
            const dist = parseFloat(compForm.pickupDistance) || 0;
            amount = eligiblePaidKm * rules.ratePerKm;
            details = { distance: dist, paidKm: eligiblePaidKm };
        } else if (type === 'Promo Code') {
            amount = parseFloat(compForm.discountAmount) || 0;
            details = { promoName: compForm.promoName };
        } else if (type === 'Sticker') {
            amount = parseFloat(compForm.stickerAmount) || 0;
            details = { stickerDuration: parseInt(compForm.stickerDuration) };
        }

        // Only save if amount is valid or it's a specific type record
        if (amount > 0 || type === 'Sticker') {
             const newPayment: DriverPayment = {
                id: `DP-${timestamp}-${idx}`,
                driverName: compForm.driverName,
                phone: compForm.phone,
                vehicleNo: compForm.vehicleNo,
                orderId: compForm.orderId || `ORD-${Math.floor(10000 + Math.random()*90000)}`,
                branch: compForm.branch || 'Main Branch',
                corporateId: targetCorpId,
                type: type as any,
                amount: amount,
                status: compForm.status as any,
                date: compForm.date,
                paymentMode: compForm.paymentMode,
                remarks: compForm.remarks,
                details: details
            };
            newRecords.push(newPayment);
        }
    });

    if (newRecords.length === 0) {
        alert("No valid amounts entered for selected types.");
        return;
    }

    localStorage.setItem(key, JSON.stringify([...newRecords, ...existing]));
    window.dispatchEvent(new Event('cloud-sync-immediate'));
    
    loadAllData();
    setIsModalOpen(false);
    setCompForm(prev => ({ 
        ...prev, 
        driverName: '', phone: '', vehicleNo: '', orderId: '', 
        pickupDistance: '', discountAmount: '', stickerAmount: '', promoName: '' 
    }));
    alert("Payment(s) Logged Successfully!");
  };

  // ... (Wallet handlers remain the same) ...
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
              corporateId: isSuperAdmin ? 'admin' : contextOwnerId,
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
      let targetCorpId = isSuperAdmin ? walletForm.corporateId : contextOwnerId;
      if (!targetCorpId) targetCorpId = 'admin';

      let branchName = 'Head Office';
      if (targetCorpId !== 'admin') {
          const corp = corporates.find(c => c.email === targetCorpId);
          if (corp) branchName = corp.companyName;
      } else {
          branchName = isSuperAdmin ? 'Head Office' : 'My Branch';
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

      const key = targetCorpId === 'admin' ? 'driver_wallet_data' : `driver_wallet_data_${targetCorpId}`;
      const existingStorage = JSON.parse(localStorage.getItem(key) || '[]');
      let newStorage;
      if (editingWalletId) {
          newStorage = existingStorage.map((t: any) => t.id === editingWalletId ? transactionData : t);
      } else {
          newStorage = [transactionData, ...existingStorage];
      }
      localStorage.setItem(key, JSON.stringify(newStorage));

      loadAllData();
      setIsWalletModalOpen(false);
      alert(editingWalletId ? "Transaction Updated!" : (isSuperAdmin ? "Transaction Processed!" : "Request Sent for Approval!"));
  };

  const handleApproveWallet = (id: string, corporateId: string) => {
      if (!isSuperAdmin) return;
      if (!window.confirm("Approve this wallet request?")) return;
      const key = (!corporateId || corporateId === 'admin') ? 'driver_wallet_data' : `driver_wallet_data_${corporateId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const newStored = existing.map((t: any) => t.id === id ? { ...t, status: 'Approved' } : t);
      localStorage.setItem(key, JSON.stringify(newStored));
      loadAllData();
  };

  const handleRejectWallet = (id: string, corporateId: string) => {
      if (!isSuperAdmin) return;
      if (!window.confirm("Reject this wallet request?")) return;
      const key = (!corporateId || corporateId === 'admin') ? 'driver_wallet_data' : `driver_wallet_data_${corporateId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const newStored = existing.map((t: any) => t.id === id ? { ...t, status: 'Rejected' } : t);
      localStorage.setItem(key, JSON.stringify(newStored));
      loadAllData();
  };

  // --- Stats & Filtering (Same as before) ---
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
          matchesCorp = t.corporateId === contextOwnerId;
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
      const matchesCorp = isSuperAdmin ? true : p.corporateId === contextOwnerId;
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
                    <Building2 className="w-4 h-4" /> {contextOwnerId === 'admin' ? 'Head Office' : 'My Branch'}
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
              {/* Wallet UI (Stats, Filter, Table) ... Same as before ... */}
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
                  {/* ... other wallet cards ... */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                      <div>
                          <p className="text-xs font-bold text-gray-500 uppercase">Pending Requests</p>
                          <h3 className="text-3xl font-bold text-orange-500 mt-2">{walletStats.pending}</h3>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">Requires Admin Approval</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-start">
                      <button 
                          onClick={() => handleOpenWalletModal()}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2"
                      >
                          <Plus className="w-5 h-5" /> Request Top-up / Deduct
                      </button>
                  </div>
              </div>
              
              {/* Wallet Filters & Table ... */}
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
                      {/* ... Filter inputs ... */}
                      <button onClick={() => { setSearchTerm(''); setWalletStatus('All'); setWalletType('All'); }} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"><RefreshCw className="w-4 h-4" /></button>
                  </div>
              </div>

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
                                          <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'Top-up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.type}</span>
                                      </td>
                                      <td className={`px-6 py-4 font-bold ${t.type === 'Top-up' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'Top-up' ? '+' : '-'}₹{t.amount}</td>
                                      <td className="px-6 py-4 text-gray-600">{t.paymentMode}</td>
                                      <td className="px-6 py-4 text-gray-600 flex items-center gap-2"><User className="w-3 h-3 text-gray-400"/> {t.receivedBy}</td>
                                      <td className="px-6 py-4 text-center">
                                          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${t.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : t.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{t.status}</span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end gap-2">
                                              {(isSuperAdmin || t.status === 'Pending') && <button onClick={() => handleOpenWalletModal(t)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Edit"><Edit2 className="w-4 h-4" /></button>}
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
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* ---------------- PAYMENTS TAB (Compensations) ---------------- */}
      {mainTab === 'Payments' && (
        <div className="animate-in fade-in slide-in-from-left-4">
            {/* View Toggle */}
            <div className="flex justify-end mb-4">
                <div className="flex bg-white border border-gray-200 rounded-lg p-1">
                    <button onClick={() => setActiveView('Dashboard')} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${activeView === 'Dashboard' ? 'bg-gray-100 text-gray-800' : 'text-gray-500'}`}>Dashboard</button>
                    <button onClick={() => setActiveView('Rules')} className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${activeView === 'Rules' ? 'bg-gray-100 text-gray-800' : 'text-gray-500'}`}>Rules</button>
                </div>
            </div>

            {/* Rules View */}
            {activeView === 'Rules' && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500" /> Configure Rules</h3>
                    </div>
                    {/* ... Rule Inputs ... */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="p-4 rounded-xl border-l-4 border-l-orange-500 bg-white border border-gray-200 shadow-sm">
                            <label className="text-xs font-bold text-gray-500 uppercase">Free Limit (KM)</label>
                            <input type="number" value={rules.freeLimitKm} onChange={(e) => setRules({...rules, freeLimitKm: parseFloat(e.target.value)})} className="text-2xl font-bold text-gray-800 w-full mt-1 outline-none border-b border-transparent focus:border-orange-500 transition-colors bg-transparent"/>
                        </div>
                        {/* ... other rule inputs ... */}
                        <div className="p-4 rounded-xl border-l-4 border-l-blue-500 bg-white border border-gray-200 shadow-sm">
                            <label className="text-xs font-bold text-gray-500 uppercase">Max Payable KM</label>
                            <input type="number" value={rules.maxPayableKm} onChange={(e) => setRules({...rules, maxPayableKm: parseFloat(e.target.value)})} className="text-2xl font-bold text-gray-800 w-full mt-1 outline-none border-b border-transparent focus:border-blue-500 transition-colors bg-transparent"/>
                        </div>
                        <div className="p-4 rounded-xl border-l-4 border-l-emerald-500 bg-white border border-gray-200 shadow-sm">
                            <label className="text-xs font-bold text-gray-500 uppercase">Rate Per KM</label>
                            <input type="number" value={rules.ratePerKm} onChange={(e) => setRules({...rules, ratePerKm: parseFloat(e.target.value)})} className="text-2xl font-bold text-gray-800 w-full mt-1 outline-none border-b border-transparent focus:border-emerald-500 transition-colors bg-transparent"/>
                        </div>
                        <div className="p-4 rounded-xl border-l-4 border-l-purple-500 bg-white border border-gray-200 shadow-sm">
                            <label className="text-xs font-bold text-gray-500 uppercase">Max Promo Pay</label>
                            <input type="number" value={rules.maxPromoPay} onChange={(e) => setRules({...rules, maxPromoPay: parseFloat(e.target.value)})} className="text-2xl font-bold text-gray-800 w-full mt-1 outline-none border-b border-transparent focus:border-purple-500 transition-colors bg-transparent"/>
                        </div>
                        <div className="p-4 rounded-xl border-l-4 border-l-pink-500 bg-white border border-gray-200 shadow-sm">
                            <label className="text-xs font-bold text-gray-500 uppercase">Max Sticker Pay</label>
                            <input type="number" value={rules.maxStickerPay} onChange={(e) => setRules({...rules, maxStickerPay: parseFloat(e.target.value)})} className="text-2xl font-bold text-gray-800 w-full mt-1 outline-none border-b border-transparent focus:border-pink-500 transition-colors bg-transparent"/>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button onClick={saveRules} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors shadow-sm">Save Rules</button>
                    </div>
                </div>
            )}

            {/* Dashboard View */}
            {activeView === 'Dashboard' && (
                <div className="space-y-6">
                    {/* Stats & Table ... */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* ... Stats Cards ... */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase">Total Paid</p><h3 className="text-3xl font-bold text-gray-900 mt-2">₹{compStats.totalPaid.toLocaleString()}</h3></div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase">Pending</p><h3 className="text-3xl font-bold text-red-600 mt-2">{compStats.pendingCount}</h3></div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase">Empty Km Paid</p><h3 className="text-2xl font-bold text-orange-500 mt-1">₹{compStats.emptyKmPaid.toLocaleString()}</h3></div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase">Other Paid</p><h3 className="text-2xl font-bold text-purple-600 mt-1">₹{compStats.promoStickerPaid.toLocaleString()}</h3></div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
                            <h3 className="font-bold text-gray-800">Compensation History</h3>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm"><Plus className="w-4 h-4" /> Log Payment</button>
                                <input type="date" value={compDate} onChange={(e) => setCompDate(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"/>
                                <select value={compStatus} onChange={(e) => setCompStatus(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"><option value="All">All Status</option><option value="Paid">Paid</option><option value="Pending">Pending</option></select>
                                <input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-3 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm"/>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
                                    <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Order ID</th><th className="px-6 py-4">Driver</th><th className="px-6 py-4">Type</th><th className="px-6 py-4 text-right">Amount</th><th className="px-6 py-4 text-center">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPayments.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-600">{p.date}</td>
                                            <td className="px-6 py-4 font-mono text-blue-600">{p.orderId}</td>
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.driverName}</td>
                                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold border ${p.type === 'Empty Km' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{p.type}</span></td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">₹{p.amount}</td>
                                            <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${p.status === 'Paid' ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'}`}>{p.status}</span></td>
                                        </tr>
                                    ))}
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
                 
                 {/* Updated Corporate and Branch Filtering Logic */}
                 <div className="grid grid-cols-2 gap-3 mb-4">
                   {isSuperAdmin && (
                       <div>
                           <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Corporate/Franchise</label>
                           <select 
                               className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                               value={compForm.corporateId}
                               onChange={(e) => setCompForm(prev => ({...prev, corporateId: e.target.value, branch: '', driverName: ''}))}
                           >
                               <option value="admin">Head Office</option>
                               {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                           </select>
                       </div>
                   )}
                   <div className={isSuperAdmin ? "" : "col-span-2"}>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Branch</label>
                        <select 
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                            value={compForm.branch}
                            onChange={(e) => setCompForm(prev => ({...prev, branch: e.target.value, driverName: ''}))}
                        >
                            <option value="">All Branches</option>
                            {formBranches.map((b: any) => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                   </div>
                 </div>

                 <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Truck className="w-3 h-3"/> Driver Details</label>
                     <div className="grid grid-cols-2 gap-3">
                         <input 
                            type="text"
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                            placeholder="Driver Name"
                            value={compForm.driverName}
                            onChange={(e) => setCompForm({...compForm, driverName: e.target.value})}
                         />
                         <input 
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" 
                            placeholder="Phone Number" 
                            value={compForm.phone} 
                            onChange={(e) => setCompForm({...compForm, phone: e.target.value})} 
                         />
                     </div>
                 </div>
                 
                 <div>
                     <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                        Order ID {selectedPaymentTypes.some(t => ['Empty Km', 'Promo Code'].includes(t)) ? <span className="text-red-500 font-bold ml-1">(Required)</span> : '(Optional)'}
                     </label>
                     <input className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Related Order ID" value={compForm.orderId} onChange={(e) => setCompForm({...compForm, orderId: e.target.value})} />
                 </div>

                 <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-500 uppercase">Payment Components</label>
                     <div className="flex flex-wrap gap-2">
                         {['Empty Km', 'Promo Code', 'Sticker'].map(type => (
                             <button 
                                key={type} 
                                onClick={() => togglePaymentType(type)}
                                className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${selectedPaymentTypes.includes(type) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                             >
                                 {selectedPaymentTypes.includes(type) && <Check className="w-3 h-3" />}
                                 {type}
                             </button>
                         ))}
                     </div>
                 </div>

                 {selectedPaymentTypes.includes('Empty Km') && (
                     <div className="space-y-4 animate-in slide-in-from-left-4">
                         <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                             <div className="flex justify-between items-center mb-2">
                                 <label className="text-xs font-bold text-orange-700">Empty Km Details</label>
                                 <span className="text-[10px] bg-white px-2 py-0.5 rounded text-orange-600 border border-orange-200">Free Limit: {rules.freeLimitKm} km</span>
                             </div>
                             <div className="flex items-center gap-3">
                                 <input 
                                    type="number" 
                                    className="flex-1 p-2 text-sm font-bold border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                                    placeholder="Pickup Dist (KM)"
                                    value={compForm.pickupDistance}
                                    onChange={(e) => setCompForm({...compForm, pickupDistance: e.target.value})}
                                 />
                                 <div className="text-right">
                                    <span className="block text-[10px] text-orange-600 uppercase font-bold">Payable</span>
                                    <span className="text-sm font-black text-orange-800">₹{(eligiblePaidKm * rules.ratePerKm).toFixed(0)}</span>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}

                 {selectedPaymentTypes.includes('Promo Code') && (
                     <div className="space-y-3 animate-in slide-in-from-left-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                         <label className="text-xs font-bold text-blue-700 uppercase">Promo Code Details</label>
                         <div className="grid grid-cols-2 gap-3">
                             <input className="w-full p-2 border border-blue-200 rounded-lg text-sm bg-white" placeholder="Promo Name" value={compForm.promoName} onChange={(e) => setCompForm({...compForm, promoName: e.target.value})} />
                             <input type="number" className="w-full p-2 border border-blue-200 rounded-lg text-sm bg-white font-bold" placeholder="Amount (₹)" value={compForm.discountAmount} onChange={(e) => setCompForm({...compForm, discountAmount: e.target.value})} />
                         </div>
                     </div>
                 )}

                 {selectedPaymentTypes.includes('Sticker') && (
                     <div className="space-y-3 animate-in slide-in-from-left-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                         <label className="text-xs font-bold text-purple-700 uppercase">Sticker Details</label>
                         <div className="grid grid-cols-2 gap-3">
                             <input type="number" className="w-full p-2 border border-purple-200 rounded-lg text-sm bg-white" placeholder="Duration (Months)" value={compForm.stickerDuration} onChange={(e) => setCompForm({...compForm, stickerDuration: e.target.value})} />
                             <input type="number" className="w-full p-2 border border-purple-200 rounded-lg text-sm bg-white font-bold" placeholder="Amount (₹)" value={compForm.stickerAmount} onChange={(e) => setCompForm({...compForm, stickerAmount: e.target.value})} />
                         </div>
                     </div>
                 )}

                 <div className="grid grid-cols-2 gap-3">
                     <div>
                         <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Status</label>
                         <select className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white" value={compForm.status} onChange={(e) => setCompForm({...compForm, status: e.target.value})}>
                             <option>Paid</option>
                             <option>Pending</option>
                         </select>
                     </div>
                     <div>
                         <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mode</label>
                         <select className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white" value={compForm.paymentMode} onChange={(e) => setCompForm({...compForm, paymentMode: e.target.value})}>
                             <option>Cash</option>
                             <option>Wallet</option>
                             <option>Bank Transfer</option>
                         </select>
                     </div>
                 </div>

                 {/* Total Amount Summary Block */}
                 {(selectedPaymentTypes.length > 0) && (
                     <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">New Payment Total:</span>
                            <span className="font-bold text-gray-900">₹{calculatedPayable.toFixed(2)}</span>
                        </div>
                        {existingOrderTotal > 0 && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-blue-600">Previous Payments ({compForm.orderId}):</span>
                                <span className="font-bold text-blue-700">₹{existingOrderTotal.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                            <span className="text-sm font-black text-emerald-800 uppercase tracking-wider">Cumulative Total</span>
                            <span className="text-xl font-black text-emerald-600">₹{(calculatedPayable + existingOrderTotal).toFixed(2)}</span>
                        </div>
                     </div>
                 )}

                 <button onClick={handleSaveCompensation} className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                     <Save className="w-4 h-4" /> Save Record(s)
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Wallet Modal ... (Same as existing) */}
      {isWalletModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                  {/* ... Wallet modal content ... */}
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><Wallet className="w-5 h-5 text-indigo-500" /> {editingWalletId ? 'Update Transaction' : 'Wallet Transaction'}</h3>
                      <button onClick={() => setIsWalletModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-5 flex-1">
                      {isSuperAdmin && (
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Franchise (Optional)</label>
                              <select 
                                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                                  value={walletForm.corporateId}
                                  onChange={(e) => setWalletForm(prev => ({...prev, corporateId: e.target.value}))}
                              >
                                  <option value="admin">Head Office</option>
                                  {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                              </select>
                          </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Driver Name *</label>
                              <input 
                                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" 
                                  placeholder="Name" 
                                  value={walletForm.driverName}
                                  onChange={(e) => setWalletForm(prev => ({...prev, driverName: e.target.value}))}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Phone *</label>
                              <input 
                                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" 
                                  placeholder="+91..." 
                                  value={walletForm.phone}
                                  onChange={(e) => setWalletForm(prev => ({...prev, phone: e.target.value}))}
                              />
                          </div>
                      </div>

                      <div className="flex bg-gray-100 p-1 rounded-lg">
                          <button 
                              onClick={() => handleWalletTypeChange('Top-up')}
                              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${walletForm.type === 'Top-up' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}
                          >
                              Top-up (Credit)
                          </button>
                          <button 
                              onClick={() => handleWalletTypeChange('Deduct')}
                              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${walletForm.type === 'Deduct' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}
                          >
                              Deduct (Debit)
                          </button>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Amount (₹) *</label>
                          <input 
                              type="number" 
                              className="w-full p-3 border border-gray-300 rounded-lg text-lg font-bold text-gray-800" 
                              placeholder="0.00" 
                              value={walletForm.amount}
                              onChange={(e) => setWalletForm(prev => ({...prev, amount: e.target.value}))}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Payment Mode</label>
                              <select 
                                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                                  value={walletForm.paymentMode}
                                  onChange={(e) => setWalletForm(prev => ({...prev, paymentMode: e.target.value}))}
                              >
                                  <option>Cash</option>
                                  <option>UPI</option>
                                  <option>Bank Transfer</option>
                                  <option>OK BOZ Wallet</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Received By</label>
                              <input 
                                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" 
                                  placeholder="Staff Name" 
                                  value={walletForm.receivedBy}
                                  onChange={(e) => setWalletForm(prev => ({...prev, receivedBy: e.target.value}))}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Remarks</label>
                          <textarea 
                              rows={2} 
                              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm resize-none" 
                              placeholder="Notes..." 
                              value={walletForm.remarks}
                              onChange={(e) => setWalletForm(prev => ({...prev, remarks: e.target.value}))}
                          />
                      </div>

                      <button onClick={handleSaveWallet} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-all">
                          {editingWalletId ? 'Update Transaction' : (isSuperAdmin ? 'Process Transaction' : 'Submit Request')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      <AiAssistant 
        systemInstruction="You are an AI assistant for Driver Payments & Wallet management. Help calculate commissions, explain wallet deduction rules, and clarify payment statuses."
        initialMessage="Need help calculating a driver's payout or understanding wallet rules?"
        triggerButtonLabel="Payment AI"
      />
    </div>
  );
};

export const DriverPaymentsExport = DriverPayments;
