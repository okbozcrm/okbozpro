import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Phone, Upload, Download, Play, Pause, SkipForward, 
  CheckCircle, XCircle, Clock, AlertCircle, FileSpreadsheet, 
  Trash2, RefreshCcw, Search, MessageSquare, Save, UserPlus, X,
  Settings, Mail, Calendar, MapPin, PieChart as PieIcon, BarChart3, Edit2, RotateCcw, Filter, Building2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CallHistoryLog {
  timestamp: string;
  status: string;
  note: string;
}

interface CallContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  status: 'Pending' | 'Interested' | 'Not Interested' | 'No Answer' | 'Callback' | 'Completed';
  note: string;
  lastCalled?: string;
  nextFollowUp?: string; // ISO Date String
  history?: CallHistoryLog[];
  ownerId?: string; // For data scoping
  franchiseName?: string; // For display
}

interface MessageTemplates {
  whatsappNoAnswer: string;
  emailNoAnswer: string;
  whatsappIntro: string;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const AutoDialer: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';
  
  // -- State --
  const [contacts, setContacts] = useState<CallContact[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);

  // Load Contacts with scoping
  useEffect(() => {
      const loadData = () => {
          let allContacts: CallContact[] = [];
          
          // Load Corporates for filtering
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          setCorporates(corps);

          if (isSuperAdmin) {
              // 1. Load Admin Data
              const adminData = localStorage.getItem('auto_dialer_data');
              if (adminData) {
                  try {
                      allContacts = [...allContacts, ...JSON.parse(adminData).map((c: any) => ({...c, ownerId: 'admin', franchiseName: 'Head Office'}))];
                  } catch (e) {}
              }
              // 2. Load Franchise Data
              corps.forEach((corp: any) => {
                  const cData = localStorage.getItem(`auto_dialer_data_${corp.email}`);
                  if (cData) {
                      try {
                          allContacts = [...allContacts, ...JSON.parse(cData).map((c: any) => ({...c, ownerId: corp.email, franchiseName: corp.companyName}))];
                      } catch (e) {}
                  }
              });
          } else {
              const key = `auto_dialer_data_${sessionId}`;
              const saved = localStorage.getItem(key);
              if (saved) {
                  try {
                      allContacts = JSON.parse(saved).map((c: any) => ({...c, ownerId: sessionId, franchiseName: 'My Branch'}));
                  } catch (e) {}
              }
          }
          setContacts(allContacts.sort((a, b) => new Date(b.id.split('-').pop() || 0).getTime() - new Date(a.id.split('-').pop() || 0).getTime()));
      };

      loadData();
      window.addEventListener('storage', loadData);
      return () => window.removeEventListener('storage', loadData);
  }, [isSuperAdmin, sessionId]);

  const [templates, setTemplates] = useState<MessageTemplates>(() => {
    const saved = localStorage.getItem('dialer_templates');
    return saved ? JSON.parse(saved) : {
      whatsappNoAnswer: "Hi [Name], we tried calling you from OK BOZ regarding your enquiry. Please let us know when you are free.",
      emailNoAnswer: "Missed Call - OK BOZ Support",
      whatsappIntro: "Hello [Name], greetings from OK BOZ! We have a special offer for you."
    };
  });
  
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCity, setFilterCity] = useState('All');
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterDateType, setFilterDateType] = useState<'All' | 'Today' | 'Month'>('All');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Forms
  const [manualContact, setManualContact] = useState({ name: '', phone: '', email: '', city: '' });
  const [editFormData, setEditFormData] = useState({ id: '', name: '', phone: '', email: '', city: '' });
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');

  // -- Persistence --
  useEffect(() => {
    if (contacts.length === 0) return;
    
    if (isSuperAdmin) {
        // Save back strictly to HO data
        const hoContacts = contacts.filter(c => c.ownerId === 'admin');
        const clean = hoContacts.map(({ownerId, franchiseName, ...rest}) => rest);
        localStorage.setItem('auto_dialer_data', JSON.stringify(clean));
    } else {
        const key = `auto_dialer_data_${sessionId}`;
        const clean = contacts.map(({ownerId, franchiseName, ...rest}) => rest);
        localStorage.setItem(key, JSON.stringify(clean));
    }
  }, [contacts, isSuperAdmin, sessionId]);

  useEffect(() => {
    localStorage.setItem('dialer_templates', JSON.stringify(templates));
  }, [templates]);

  // -- Derived State & Analytics --
  const activeContact = contacts[activeIndex];
  const cities = useMemo(() => Array.from(new Set(contacts.map(c => c.city || 'Unknown').filter(Boolean))), [contacts]);

  const stats = useMemo(() => {
    const total = contacts.length;
    const completedCount = contacts.filter(c => c.status === 'Interested' || c.status === 'Not Interested' || c.status === 'Completed').length;
    const interested = contacts.filter(c => c.status === 'Interested').length;
    const callbackCount = contacts.filter(c => c.status === 'Callback').length;
    const notInterested = contacts.filter(c => c.status === 'Not Interested').length;
    const progress = total === 0 ? 0 : Math.round((completedCount / total) * 100);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const pendingLeads = contacts.filter(c => c.status === 'Pending');
    const dueFollowUps = contacts.filter(c => c.status === 'Callback' && c.nextFollowUp && c.nextFollowUp.split('T')[0] <= todayStr);
    
    const todaysFocusTotal = pendingLeads.length + dueFollowUps.length;

    return { 
        total, 
        completed: completedCount, 
        interested, 
        callback: callbackCount, 
        notInterested, 
        progress, 
        pendingLeads: pendingLeads.length,
        dueFollowUps: dueFollowUps.length,
        todaysFocusTotal
    };
  }, [contacts]);

  const pieData = [
    { name: 'Interested', value: stats.interested },
    { name: 'Callback', value: stats.callback },
    { name: 'Not Interested', value: stats.notInterested },
    { name: 'Pending', value: stats.pendingLeads },
  ].filter(d => d.value > 0);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
      const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
      const matchesCity = filterCity === 'All' || (c.city || 'Unknown') === filterCity;
      const matchesCorporate = filterCorporate === 'All' || c.ownerId === filterCorporate;
      
      let matchesDate = true;
      if (filterDateType === 'Today') {
          const todayStr = new Date().toISOString().split('T')[0];
          const isPending = c.status === 'Pending';
          const isDueCallback = c.status === 'Callback' && c.nextFollowUp && c.nextFollowUp.split('T')[0] <= todayStr;
          matchesDate = isPending || isDueCallback;
      } else if (filterDateType === 'Month') {
          if (c.nextFollowUp) matchesDate = c.nextFollowUp.startsWith(filterMonth);
          else matchesDate = false;
      }

      return matchesSearch && matchesStatus && matchesCity && matchesCorporate && matchesDate;
    });
  }, [contacts, searchTerm, filterStatus, filterCity, filterCorporate, filterDateType, filterMonth]);

  // -- Handlers --

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualContact.name || !manualContact.phone) {
        alert("Please enter Name and Phone Number");
        return;
    }

    const newContact: CallContact = {
        id: `C-MAN-${Date.now()}`,
        name: manualContact.name,
        phone: manualContact.phone,
        email: manualContact.email,
        city: manualContact.city || 'Unknown',
        status: 'Pending',
        note: '',
        history: [],
        ownerId: isSuperAdmin ? 'admin' : sessionId,
        franchiseName: isSuperAdmin ? 'Head Office' : 'My Branch'
    };

    setContacts(prev => [newContact, ...prev]);
    setManualContact({ name: '', phone: '', email: '', city: '' });
    setIsAddModalOpen(false);
  };

  const handleEditContact = (contact: CallContact) => {
      setEditFormData({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email || '',
          city: contact.city || ''
      });
      setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      setContacts(prev => prev.map(c => c.id === editFormData.id ? {
          ...c,
          name: editFormData.name,
          phone: editFormData.phone,
          email: editFormData.email,
          city: editFormData.city
      } : c));
      setIsEditModalOpen(false);
  };

  const handleDeleteContact = (id: string) => {
      if(window.confirm("Are you sure you want to delete this contact?")) {
          setContacts(prev => prev.filter(c => c.id !== id));
          if (activeContact?.id === id) setActiveIndex(0);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newContacts: CallContact[] = [];
      
      let startIndex = 0;
      if (lines[0].toLowerCase().includes('name')) startIndex = 1;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        const name = cols[0]?.trim().replace(/"/g, '') || 'Unknown';
        const phone = cols[1]?.trim().replace(/"/g, '') || '';
        const city = cols[2]?.trim().replace(/"/g, '') || 'Unknown';
        
        if (phone) {
          newContacts.push({
            id: `C-${Date.now()}-${i}`,
            name, phone, city,
            status: 'Pending',
            note: '',
            history: [],
            ownerId: isSuperAdmin ? 'admin' : sessionId,
            franchiseName: isSuperAdmin ? 'Head Office' : 'My Branch'
          });
        }
      }

      if (newContacts.length > 0) {
        if (window.confirm(`Imported ${newContacts.length} contacts. Append or Replace? OK to Append, Cancel to Replace.`)) {
             setContacts(prev => [...prev, ...newContacts]);
        } else {
             setContacts(newContacts);
             setActiveIndex(0);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
    const headers = "Name,Phone,City,Status,Note,Last Called,Next FollowUp\n";
    const rows = filteredContacts.map(c => 
      `"${c.name}","${c.phone}","${c.city}","${c.status}","${c.note}","${c.lastCalled || ''}","${c.nextFollowUp || ''}"`
    ).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `dialer_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCall = () => {
    if (!activeContact) return;
    window.location.href = `tel:${activeContact.phone}`;
    setIsSessionActive(true);
  };

  const handleOutcome = (status: CallContact['status']) => {
    if (!activeContact) return;
    if (!activeContact.note || !activeContact.note.trim()) {
        alert("Please enter a note describing the conversation.");
        return;
    }
    if (status === 'Callback') {
        setIsCallbackModalOpen(true);
        return; 
    }
    updateContactStatus(status);
  };

  const saveCallback = () => {
      if (!callbackDate || !callbackTime) {
          alert("Please select date and time");
          return;
      }
      updateContactStatus('Callback', `${callbackDate}T${callbackTime}`);
      setIsCallbackModalOpen(false);
      setCallbackDate(''); setCallbackTime('');
  };

  const updateContactStatus = (status: CallContact['status'], nextFollowUp?: string) => {
    const updatedContacts = [...contacts];
    const timestamp = new Date().toLocaleString();
    const newLog: CallHistoryLog = { timestamp, status, note: activeContact.note };

    const idxInMaster = contacts.findIndex(c => c.id === activeContact.id);
    if (idxInMaster === -1) return;

    updatedContacts[idxInMaster] = {
      ...activeContact,
      status,
      lastCalled: timestamp,
      nextFollowUp: nextFollowUp || activeContact.nextFollowUp,
      history: [newLog, ...(activeContact.history || [])],
      note: ''
    };
    setContacts(updatedContacts);

    if (isSessionActive) {
       let nextIndex = -1;
       for (let i = activeIndex + 1; i < contacts.length; i++) {
           if (contacts[i].status === 'Pending') {
               nextIndex = i;
               break;
           }
       }
       if (nextIndex !== -1) setActiveIndex(nextIndex);
       else setIsSessionActive(false);
    }
  };

  const cancelNote = () => {
      if(!activeContact) return;
      setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, note: '' } : c));
  };

  const prepareMessage = (templateKey: keyof MessageTemplates) => {
      let text = templates[templateKey];
      text = text.replace('[Name]', activeContact.name);
      return text;
  };

  const sendWhatsApp = (type: 'NoAnswer' | 'Intro') => {
      if (!activeContact) return;
      const text = prepareMessage(type === 'NoAnswer' ? 'whatsappNoAnswer' : 'whatsappIntro');
      const cleanPhone = activeContact.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendEmail = () => {
      if (!activeContact?.email) {
          alert("No email address for this contact.");
          return;
      }
      const subject = "Regarding your enquiry - OK BOZ";
      const body = prepareMessage('emailNoAnswer');
      window.location.href = `mailto:${activeContact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleClearAll = () => {
      if (window.confirm("Delete ALL contacts? This cannot be undone.")) {
          setContacts([]);
          setActiveIndex(0);
      }
  };

  const selectContact = (id: string) => {
      const realIndex = contacts.findIndex(c => c.id === id);
      if (realIndex !== -1) setActiveIndex(realIndex);
  };

  const handleResetFilters = () => {
      setSearchTerm('');
      setFilterStatus('All');
      setFilterCity('All');
      setFilterCorporate('All');
      setFilterDateType('All');
      setFilterMonth(new Date().toISOString().slice(0, 7));
  };

  const pieColors = useMemo(() => COLORS, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Phone className="w-8 h-8 text-emerald-600" /> Smart AutoDialer
          </h2>
          <p className="text-gray-500">Auto-dial, follow-up management, and instant messaging.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsTemplateModalOpen(true)} className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors">
                <Settings className="w-4 h-4" /> Templates
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all transform active:scale-95">
                <UserPlus className="w-4 h-4" /> Add Lead
            </button>
            <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors">
                <Upload className="w-4 h-4" /> Import
            </button>
        </div>
      </div>

      {/* Dashboard Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          {/* TODAY'S FOCUS CARD */}
          <div 
            className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white shadow-lg flex flex-col relative overflow-hidden cursor-pointer group hover:scale-[1.02] transition-all" 
            onClick={() => { handleResetFilters(); setFilterDateType('Today'); }}
          >
              <div className="relative z-10">
                  <h3 className="font-bold flex items-center gap-2 text-indigo-100 mb-3 uppercase tracking-widest text-[10px]">
                      <Calendar className="w-4 h-4" /> Today's Action Center
                  </h3>
                  <div className="flex justify-between items-end">
                      <div>
                          <p className="text-5xl font-black">{stats.todaysFocusTotal}</p>
                          <p className="text-sm text-indigo-200 font-bold">Total Priority Items</p>
                      </div>
                      <div className="text-right space-y-1">
                          <p className="text-sm font-bold text-white/90 flex items-center justify-end gap-1.5">
                             <div className="w-2 h-2 rounded-full bg-orange-400"></div> {stats.pendingLeads} New Leads
                          </p>
                          <p className="text-sm font-bold text-white/90 flex items-center justify-end gap-1.5">
                             <div className="w-2 h-2 rounded-full bg-blue-400"></div> {stats.dueFollowUps} Callbacks
                          </p>
                      </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-[10px] font-bold text-indigo-200">
                     <AlertCircle className="w-3 h-3" /> Click to view today's list
                  </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-[0.08] group-hover:scale-110 transition-transform duration-700">
                  <BarChart3 className="w-32 h-32 text-white" />
              </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center h-32">
              <div className="flex-1 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                              {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />)}
                          </Pie>
                          <Tooltip />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
              <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-medium text-gray-700"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Interested ({stats.interested})</div>
                  <div className="flex items-center gap-2 font-medium text-gray-700"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Callback ({stats.callback})</div>
                  <div className="flex items-center gap-2 font-medium text-gray-700"><div className="w-2 h-2 rounded-full bg-red-500"></div> No Match ({stats.notInterested})</div>
              </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center gap-4 h-32">
              <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm font-medium">Daily Completion</span>
                  <span className="text-emerald-600 font-bold">{stats.progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${stats.progress}%` }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  <span>{stats.completed} Handled</span>
                  <span>{stats.total} Lead Base</span>
              </div>
          </div>
      </div>

      {/* Workspace */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          {/* Active Caller Card */}
          <div className="lg:w-1/3 flex flex-col">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg flex-1 flex flex-col overflow-hidden relative">
                  <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                  
                  {activeContact ? (
                      <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                          <div className="flex justify-between items-start mb-6">
                              <div className="min-w-0">
                                  <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-500 text-[10px] font-bold mb-2">
                                      #{activeIndex + 1} / {contacts.length}
                                  </span>
                                  <h3 className="text-2xl font-bold text-gray-900 leading-tight flex items-center gap-2 truncate">
                                      {activeContact.name}
                                      <button 
                                        onClick={() => handleEditContact(activeContact)}
                                        className="text-gray-300 hover:text-blue-500 transition-colors shrink-0"
                                      >
                                          <Edit2 className="w-4 h-4" />
                                      </button>
                                  </h3>
                                  <p className="text-lg text-gray-500 font-mono mt-1">{activeContact.phone}</p>
                                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-medium">
                                      <MapPin className="w-3 h-3" /> {activeContact.city || 'Unknown City'}
                                      {isSuperAdmin && (
                                          <span className="flex items-center gap-1 text-indigo-500 font-bold">
                                              <Building2 className="w-3 h-3" /> {activeContact.franchiseName}
                                          </span>
                                      )}
                                  </div>
                              </div>
                              <div className={`w-3 h-3 rounded-full shadow-sm shrink-0 ${activeContact.status === 'Pending' ? 'bg-orange-400' : 'bg-green-500'}`}></div>
                          </div>

                          <button 
                              onClick={handleCall}
                              className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-1 mb-6 group"
                          >
                              <Phone className="w-8 h-8 fill-current group-hover:scale-110 transition-transform" />
                              <span className="text-lg font-bold tracking-wide">DIAL NOW</span>
                          </button>

                          <div className="space-y-4">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Outcome & Next Step</p>
                              <div className="grid grid-cols-2 gap-3">
                                  <button onClick={() => handleOutcome('Interested')} className="py-2.5 bg-green-50 text-green-700 font-bold rounded-xl border border-green-200 hover:bg-green-100 flex items-center justify-center gap-2 text-xs transition-colors text-center">
                                      <CheckCircle className="w-4 h-4" /> Interested
                                  </button>
                                  <button onClick={() => handleOutcome('Callback')} className="py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-2 text-xs transition-colors text-center">
                                      <Clock className="w-4 h-4" /> Callback
                                  </button>
                                  <button onClick={() => handleOutcome('No Answer')} className="py-2.5 bg-orange-50 text-orange-700 font-bold rounded-xl border border-orange-200 hover:bg-orange-100 flex items-center justify-center gap-2 text-xs transition-colors text-center">
                                      <AlertCircle className="w-4 h-4" /> No Ans
                                  </button>
                                  <button onClick={() => handleOutcome('Not Interested')} className="py-2.5 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200 hover:bg-red-100 flex items-center justify-center gap-2 text-xs transition-colors text-center">
                                      <XCircle className="w-4 h-4" /> Not Intr.
                                  </button>
                              </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-gray-100">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
                              <div className="flex gap-2">
                                  <button onClick={() => sendWhatsApp('NoAnswer')} className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-green-200 transition-colors">
                                      <MessageSquare className="w-3 h-3" /> WA: No Ans
                                  </button>
                                  <button onClick={() => sendWhatsApp('Intro')} className="flex-1 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-indigo-200 transition-colors">
                                      <MessageSquare className="w-3 h-3" /> WA: Intro
                                  </button>
                                  <button onClick={sendEmail} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                                      <Mail className="w-3 h-3" /> Email
                                  </button>
                              </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Current Note <span className="text-red-500">*</span>
                                </label>
                                <button onClick={cancelNote} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
                                    <RotateCcw className="w-2.5 h-2.5" /> Clear
                                </button>
                              </div>
                              <textarea 
                                  value={activeContact.note}
                                  onChange={(e) => {
                                      const updated = [...contacts];
                                      const idx = contacts.findIndex(c => c.id === activeContact.id);
                                      updated[idx] = { ...activeContact, note: e.target.value };
                                      setContacts(updated);
                                  }}
                                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20 shadow-inner"
                                  placeholder="Describe conversation (required for status)..."
                              />
                          </div>
                      </div>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                          <FileSpreadsheet className="w-16 h-16 mb-4 opacity-50" />
                          <h3 className="text-lg font-bold text-gray-600 mb-2">List Empty</h3>
                          <p className="text-sm">Import CSV or add manually to start.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Right: List View */}
          <div className="lg:w-2/3 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Search Name or Mobile..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                        />
                    </div>
                    
                    <button 
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium ${showAdvancedFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                    >
                        <Filter className="w-4 h-4" /> {showAdvancedFilters ? 'Close Filters' : 'Filters'}
                    </button>

                    <button onClick={handleExport} className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 text-gray-600 shadow-sm transition-colors" title="Export CSV">
                        <Download className="w-4 h-4" />
                    </button>
                    <button onClick={handleClearAll} className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 shadow-sm transition-colors" title="Clear All">
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Advanced Filter Bar (Toggleable) */}
                  {showAdvancedFilters && (
                      <div className="p-4 bg-white border border-indigo-100 rounded-xl flex flex-wrap gap-4 items-end animate-in slide-in-from-top-2 duration-200">
                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Focus Period</label>
                              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                                <button onClick={() => setFilterDateType('All')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${filterDateType === 'All' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-800'}`}>All</button>
                                <button onClick={() => setFilterDateType('Today')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${filterDateType === 'Today' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-800'}`}>Today Focus</button>
                                <button onClick={() => setFilterDateType('Month')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${filterDateType === 'Month' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>Target Month</button>
                              </div>
                          </div>
                          
                          {filterDateType === 'Month' && (
                              <div>
                                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Target Month</label>
                                  <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500" />
                              </div>
                          )}

                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-[120px]">
                                  <option value="All">All Status</option>
                                  <option value="Pending">Pending (New)</option>
                                  <option value="Callback">Callback Set</option>
                                  <option value="Interested">Interested</option>
                                  <option value="Not Interested">Not Interested</option>
                                  <option value="No Answer">No Answer</option>
                              </select>
                          </div>

                          <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">City</label>
                              <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-[120px]">
                                  <option value="All">All Cities</option>
                                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>

                          {isSuperAdmin && (
                              <div>
                                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Franchise Source</label>
                                  <select value={filterCorporate} onChange={(e) => setFilterCorporate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-[140px]">
                                      <option value="All">All Sources</option>
                                      <option value="admin">Head Office</option>
                                      {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                                  </select>
                              </div>
                          )}

                          <button 
                            onClick={handleResetFilters}
                            className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 flex items-center gap-2 text-xs font-bold"
                          >
                              <RotateCcw className="w-4 h-4" /> Reset
                          </button>
                      </div>
                  )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-white text-gray-400 text-[11px] font-black uppercase tracking-widest border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                          <tr>
                              <th className="px-6 py-4 w-12 text-center">#</th>
                              <th className="px-6 py-4">Lead Details</th>
                              <th className="px-6 py-4">Current Status</th>
                              <th className="px-6 py-4">Schedule</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {filteredContacts.map((contact, idx) => {
                              const isSelected = activeContact?.id === contact.id;
                              const todayStr = new Date().toISOString().split('T')[0];
                              const isDue = contact.nextFollowUp && contact.nextFollowUp.split('T')[0] <= todayStr;
                              
                              return (
                                  <tr 
                                      key={contact.id} 
                                      className={`hover:bg-gray-50 transition-all cursor-pointer group ${isSelected ? 'bg-indigo-50/50' : ''} ${isDue ? 'bg-yellow-50/40' : ''}`}
                                      onClick={() => selectContact(contact.id)}
                                  >
                                      <td className="px-6 py-4 text-center text-gray-400 text-[10px] font-bold">
                                          {isSelected ? <Play className="w-3.5 h-3.5 text-indigo-600 fill-current mx-auto animate-pulse"/> : idx + 1}
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>{contact.name}</div>
                                          <div className="text-[10px] text-gray-500 font-medium flex items-center gap-2">
                                              {contact.city} • {contact.phone}
                                              {isSuperAdmin && <span className="bg-indigo-50 text-indigo-500 px-1 rounded font-bold uppercase tracking-tighter">{contact.franchiseName}</span>}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                                              contact.status === 'Interested' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                              contact.status === 'Callback' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                              contact.status === 'No Answer' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                              contact.status === 'Pending' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                              'bg-gray-100 text-gray-600 border-gray-200'
                                          }`}>
                                              {contact.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-xs">
                                          <div className="flex flex-col">
                                              {contact.nextFollowUp ? (
                                                  <span className={`flex items-center gap-1.5 font-black ${isDue ? 'text-rose-600' : 'text-gray-500'}`}>
                                                      <Calendar className="w-3 h-3" /> {new Date(contact.nextFollowUp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                                                  </span>
                                              ) : (
                                                  <span className="text-gray-300 text-[10px] italic font-medium">New / No schedule</span>
                                              )}
                                              {contact.lastCalled && (
                                                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1">
                                                      Last Contact: {new Date(contact.lastCalled).toLocaleDateString()}
                                                  </span>
                                              )}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          {isSelected ? (
                                              <span className="text-[10px] font-black text-indigo-600 tracking-widest animate-pulse">ACTIVE DIALER</span>
                                          ) : (
                                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button 
                                                      onClick={(e) => { e.stopPropagation(); handleEditContact(contact); }}
                                                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-white border border-transparent hover:border-indigo-100 transition-all"
                                                  >
                                                      <Edit2 className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button 
                                                      onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact.id); }}
                                                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white border border-transparent hover:border-red-100 transition-all"
                                                  >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                              </div>
                                          )}
                                      </td>
                                  </tr>
                              );
                          })}
                          {filteredContacts.length === 0 && (
                              <tr><td colSpan={5} className="py-20 text-center text-gray-400 font-medium italic">No leads match your current filters.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* Modals */}
      
      {/* 1. Add Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h3 className="text-xl font-black text-gray-900 tracking-tighter">Add Lead Manually</h3>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-400 hover:text-gray-900"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleManualAdd} className="p-8 space-y-5">
                 <div className="space-y-4">
                    <input className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-800" placeholder="Full Name" value={manualContact.name} onChange={e => setManualContact({...manualContact, name: e.target.value})} required />
                    <input className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-800" placeholder="Mobile Number" value={manualContact.phone} onChange={e => setManualContact({...manualContact, phone: e.target.value})} required />
                    <input className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-800" placeholder="Email (Optional)" value={manualContact.email} onChange={e => setManualContact({...manualContact, email: e.target.value})} />
                    <input className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-800" placeholder="City" value={manualContact.city} onChange={e => setManualContact({...manualContact, city: e.target.value})} />
                 </div>
                 <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-900/10 hover:bg-emerald-700 transition-all transform active:scale-95">Add to Campaign</button>
              </form>
           </div>
        </div>
      )}

      {/* 2. Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h3 className="text-xl font-black text-gray-900 tracking-tighter">Dialer Templates</h3>
                 <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-400 hover:text-gray-900"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">WhatsApp (No Answer)</label>
                    <textarea className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium h-24 outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-inner" value={templates.whatsappNoAnswer} onChange={e => setTemplates({...templates, whatsappNoAnswer: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Email Body (No Answer)</label>
                    <textarea className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium h-24 outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-inner" value={templates.emailNoAnswer} onChange={e => setTemplates({...templates, emailNoAnswer: e.target.value})} />
                 </div>
                 <div className="flex justify-end pt-2">
                    <button onClick={() => setIsTemplateModalOpen(false)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-black transition-all">Save Changes</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 3. Callback Scheduler Modal */}
      {isCallbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h3 className="text-xl font-black text-gray-900 tracking-tighter">Schedule Follow-up</h3>
                 <button onClick={() => setIsCallbackModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-400 hover:text-gray-900"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Date</label>
                        <input type="date" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 shadow-inner" value={callbackDate} onChange={e => setCallbackDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Time</label>
                        <input type="time" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 shadow-inner" value={callbackTime} onChange={e => setCallbackTime(e.target.value)} />
                    </div>
                 </div>
                 <button onClick={saveCallback} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/10 hover:bg-blue-700 transition-all transform active:scale-95">Set Callback</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default AutoDialer;