import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Phone, Upload, Download, Play, Pause, SkipForward, 
  CheckCircle, XCircle, Clock, AlertCircle, FileSpreadsheet, 
  Trash2, RefreshCcw, Search, MessageSquare, Save, UserPlus, X,
  Settings, Mail, Calendar, MapPin, PieChart as PieIcon, BarChart3, Edit2, RotateCcw, Filter, Building2, History, Plus, ChevronRight, ExternalLink
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

interface CustomTemplate {
  id: string;
  name: string;
  type: 'WhatsApp' | 'Email';
  content: string;
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
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          setCorporates(corps);

          if (isSuperAdmin) {
              const adminData = localStorage.getItem('auto_dialer_data');
              if (adminData) {
                  try {
                      allContacts = [...allContacts, ...JSON.parse(adminData).map((c: any) => ({...c, ownerId: 'admin', franchiseName: 'Head Office'}))];
                  } catch (e) {}
              }
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

  // -- Dynamic Templates State --
  const [templates, setTemplates] = useState<CustomTemplate[]>(() => {
    const saved = localStorage.getItem('dialer_custom_templates');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'No Answer (WA)', type: 'WhatsApp', content: 'Hi [Name], we tried calling you from OK BOZ regarding your enquiry. Please let us know when you are free.' },
      { id: '2', name: 'Intro Message (WA)', type: 'WhatsApp', content: 'Hello [Name], greetings from OK BOZ! We have a special offer for your business.' },
      { id: '3', name: 'Follow up (Email)', type: 'Email', content: 'Hi [Name], following up on our recent interaction...' }
    ];
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
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  
  // Forms
  const [manualContact, setManualContact] = useState({ name: '', phone: '', email: '', city: '' });
  const [editFormData, setEditFormData] = useState({ id: '', name: '', phone: '', email: '', city: '' });
  const [templateForm, setTemplateForm] = useState<Partial<CustomTemplate>>({ name: '', type: 'WhatsApp', content: '' });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('');

  // Mobile View Detection
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  // -- Persistence --
  useEffect(() => {
    if (contacts.length === 0) return;
    if (isSuperAdmin) {
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
    localStorage.setItem('dialer_custom_templates', JSON.stringify(templates));
  }, [templates]);

  // -- Derived State & Analytics --
  const activeContact = contacts[activeIndex];
  const cities = useMemo(() => Array.from(new Set(contacts.map(c => c.city || 'Unknown').filter(Boolean))), [contacts]);

  const stats = useMemo(() => {
    const total = contacts.length;
    const completedCount = contacts.filter(c => c.status === 'Interested' || c.status === 'Not Interested' || c.status === 'No Answer' || c.status === 'Completed').length;
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

  const handleSaveTemplate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!templateForm.name || !templateForm.content) return;

      if (editingTemplateId) {
          setTemplates(prev => prev.map(t => t.id === editingTemplateId ? { ...t, ...templateForm as CustomTemplate } : t));
          setEditingTemplateId(null);
      } else {
          const newT: CustomTemplate = {
              id: `T-${Date.now()}`,
              name: templateForm.name!,
              type: templateForm.type as 'WhatsApp' | 'Email',
              content: templateForm.content!
          };
          setTemplates(prev => [...prev, newT]);
      }
      setTemplateForm({ name: '', type: 'WhatsApp', content: '' });
  };

  const handleSendFromTemplate = (template: CustomTemplate) => {
    if (!activeContact) return;
    
    let text = template.content;
    text = text.replace(/\[Name\]/g, activeContact.name);

    if (template.type === 'WhatsApp') {
        const cleanPhone = activeContact.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
        if (!activeContact.email) {
            alert("This contact has no email address.");
            return;
        }
        window.location.href = `mailto:${activeContact.email}?subject=${encodeURIComponent(template.name)}&body=${encodeURIComponent(text)}`;
    }
    setShowTemplatePicker(false);
  };

  const handleCall = () => {
    if (!activeContact) return;
    window.location.href = `tel:${activeContact.phone}`;
    setIsSessionActive(true);
  };

  const handleOutcome = (status: CallContact['status']) => {
    if (!activeContact) return;
    let finalNote = activeContact.note.trim();
    if (!finalNote) {
        if (status === 'No Answer') finalNote = "Attempted call, but the customer did not answer.";
        if (status === 'Not Interested') finalNote = "Customer stated they are not interested at this time.";
        if (status === 'Interested') finalNote = "Customer expressed interest in our services.";
        if (status === 'Callback') finalNote = "Requested a follow-up call at a later time.";
    }

    if (status === 'Callback') {
        setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, note: finalNote } : c));
        setIsCallbackModalOpen(true);
        return; 
    }
    updateContactStatus(status, undefined, finalNote);
  };

  const saveCallback = () => {
      if (!callbackDate || !callbackTime) {
          alert("Please select date and time");
          return;
      }
      updateContactStatus('Callback', `${callbackDate}T${callbackTime}`, activeContact.note);
      setIsCallbackModalOpen(false);
      setCallbackDate(''); 
      setCallbackTime('');
  };

  const updateContactStatus = (status: CallContact['status'], nextFollowUp?: string, noteOverride?: string) => {
    const timestamp = new Date().toLocaleString();
    const targetId = activeContact.id;

    setContacts(prevContacts => {
        const updated = [...prevContacts];
        const idxInMaster = updated.findIndex(c => c.id === targetId);
        if (idxInMaster === -1) return prevContacts;

        const currentContact = updated[idxInMaster];
        const finalNote = noteOverride || currentContact.note || `Call logged as ${status}`;
        const newLog: CallHistoryLog = { timestamp, status, note: finalNote };

        updated[idxInMaster] = {
          ...currentContact,
          status,
          lastCalled: timestamp,
          nextFollowUp: nextFollowUp || currentContact.nextFollowUp,
          history: [newLog, ...(currentContact.history || [])],
          note: '' 
        };
        return updated;
    });

    if (isSessionActive) {
       setContacts(prev => {
           let nextIndex = -1;
           for (let i = activeIndex + 1; i < prev.length; i++) {
               if (prev[i].status === 'Pending') {
                   nextIndex = i;
                   break;
               }
           }
           if (nextIndex !== -1) setActiveIndex(nextIndex);
           else setIsSessionActive(false);
           return prev;
       });
    }
  };

  const handleResetFilters = () => {
      setSearchTerm('');
      setFilterStatus('All');
      setFilterCity('All');
      setFilterCorporate('All');
      setFilterDateType('All');
      setFilterMonth(new Date().toISOString().slice(0, 7));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) {
        alert("Invalid CSV format. Please use a header row.");
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const newContacts: CallContact[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const data: any = {};
        headers.forEach((h, idx) => {
          data[h] = values[idx];
        });

        if (data.name && data.phone) {
          newContacts.push({
            id: `C-IMP-${Date.now()}-${i}`,
            name: data.name,
            phone: data.phone,
            email: data.email || '',
            city: data.city || 'Unknown',
            status: 'Pending',
            note: '',
            history: [],
            ownerId: isSuperAdmin ? 'admin' : sessionId,
            franchiseName: isSuperAdmin ? 'Head Office' : 'My Branch'
          });
        }
      }

      if (newContacts.length > 0) {
        setContacts(prev => [...newContacts, ...prev]);
        alert(`Imported ${newContacts.length} contacts.`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
    if (filteredContacts.length === 0) return;
    const headers = ["Name", "Phone", "Email", "City", "Status", "Last Called", "Follow Up"];
    const rows = filteredContacts.map(c => [
      c.name, c.phone, c.email || '', c.city || '', c.status, c.lastCalled || '', c.nextFollowUp || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `autodialer_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSample = () => {
    const headers = ["Name", "Phone", "Email", "City"];
    const sampleRow = ["John Doe", "9876543210", "john@example.com", "Coimbatore"];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), sampleRow.join(",")].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "autodialer_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearAll = () => {
    if (window.confirm("Clear all contacts for this account?")) {
        setContacts(prev => isSuperAdmin ? prev.filter(c => c.ownerId !== 'admin') : prev.filter(c => c.ownerId !== sessionId));
        setActiveIndex(0);
        setIsSessionActive(false);
    }
  };

  const selectContact = (id: string) => {
    const idx = contacts.findIndex(c => c.id === id);
    if (idx !== -1) {
        setActiveIndex(idx);
        if (isMobileView) setShowChatOnMobile(true);
    }
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

  const handleDeleteContact = (id: string) => {
    if (window.confirm("Delete this contact?")) {
        setContacts(prev => prev.filter(c => c.id !== id));
        if (activeContact?.id === id) {
            setActiveIndex(0);
        }
    }
  };

  const handleUpdateContact = (e: React.FormEvent) => {
      e.preventDefault();
      setContacts(prev => prev.map(c => c.id === editFormData.id ? { ...c, ...editFormData } : c));
      setIsEditModalOpen(false);
  };

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
                <Settings className="w-4 h-4" /> Manage Templates
            </button>
            <button onClick={handleDownloadSample} className="bg-white border border-gray-300 text-gray-500 px-3 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm" title="Download Sample CSV">
                <FileSpreadsheet className="w-4 h-4" /> Sample
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

      {/* Dashboard Section - Swapped order to put Action Center on right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center h-32">
              <div className="flex-1 h-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">{pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
              <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-medium text-gray-700"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Interested ({stats.interested})</div>
                  <div className="flex items-center gap-2 font-medium text-gray-700"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Callback ({stats.callback})</div>
                  <div className="flex items-center gap-2 font-medium text-gray-700"><div className="w-2 h-2 rounded-full bg-red-500"></div> No Match ({stats.notInterested})</div>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center gap-4 h-32">
              <div className="flex justify-between items-center"><span className="text-gray-500 text-sm font-medium">Daily Completion</span><span className="text-emerald-600 font-bold">{stats.progress}%</span></div>
              <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${stats.progress}%` }}></div></div>
              <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider"><span>{stats.completed} Handled</span><span>{stats.total} Lead Base</span></div>
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white shadow-lg flex flex-col relative overflow-hidden cursor-pointer group hover:scale-[1.02] transition-all" onClick={() => { handleResetFilters(); setFilterDateType('Today'); }}>
              <div className="relative z-10">
                  <h3 className="font-bold flex items-center gap-2 text-indigo-100 mb-3 uppercase tracking-widest text-[10px]"><Calendar className="w-4 h-4" /> Today's Action Center</h3>
                  <div className="flex justify-between items-end">
                      <div><p className="text-5xl font-black">{stats.todaysFocusTotal}</p><p className="text-sm text-indigo-200 font-bold">Total Priority Items</p></div>
                      <div className="text-right space-y-1">
                          <p className="text-sm font-bold text-white/90 flex items-center justify-end gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400"></div> {stats.pendingLeads} New Leads</p>
                          <p className="text-sm font-bold text-white/90 flex items-center justify-end gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400"></div> {stats.dueFollowUps} Callbacks</p>
                      </div>
                  </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-[0.08] group-hover:scale-110 transition-transform duration-700"><BarChart3 className="w-32 h-32 text-white" /></div>
          </div>
      </div>

      {/* Workspace - Swapped order to put List on left */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          {/* Left: List View */}
          <div className="lg:w-2/3 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                    <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium ${showAdvancedFilters ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}><Filter className="w-4 h-4" /></button>
                    <button onClick={handleExport} className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 text-gray-600"><Download className="w-4 h-4" /></button>
                    <button onClick={handleClearAll} className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>

              {showAdvancedFilters && (
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 animate-in slide-in-from-top-2">
                      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold outline-none"><option value="All">Status: All</option><option value="Pending">Pending</option><option value="Interested">Interested</option><option value="Callback">Callback</option></select>
                      <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="px-3 py-2 border rounded-lg text-xs font-bold outline-none"><option value="All">City: All</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select>
                      <button onClick={handleResetFilters} className="px-3 py-2 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Reset Filters</button>
                  </div>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-white text-gray-400 text-[11px] font-black uppercase tracking-widest border-b border-gray-200 sticky top-0 z-10">
                          <tr><th className="px-6 py-4 w-12 text-center">#</th><th className="px-6 py-4">Lead Details</th><th className="px-6 py-4">Current Status</th><th className="px-6 py-4">Schedule</th><th className="px-6 py-4 text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {filteredContacts.map((contact, idx) => {
                              const isSelected = activeContact?.id === contact.id;
                              const isDue = contact.nextFollowUp && contact.nextFollowUp.split('T')[0] <= new Date().toISOString().split('T')[0];
                              return (
                                  <tr key={contact.id} className={`hover:bg-gray-50 transition-all cursor-pointer group ${isSelected ? 'bg-indigo-50/50' : ''} ${isDue ? 'bg-yellow-50/40' : ''}`} onClick={() => selectContact(contact.id)}>
                                      <td className="px-6 py-4 text-center text-gray-400 text-[10px] font-bold">{isSelected ? <Play className="w-3.5 h-3.5 text-indigo-600 fill-current mx-auto animate-pulse"/> : idx + 1}</td>
                                      <td className="px-6 py-4"><div className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>{contact.name}</div><div className="text-[10px] text-gray-500 font-medium">{contact.city} • {contact.phone}</div></td>
                                      <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border shadow-sm ${contact.status === 'Interested' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : contact.status === 'Callback' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-500'}`}>{contact.status}</span></td>
                                      <td className="px-6 py-4 text-xs">{contact.nextFollowUp ? <span className={`flex items-center gap-1.5 font-black ${isDue ? 'text-rose-600' : 'text-gray-500'}`}><Calendar className="w-3 h-3" /> {new Date(contact.nextFollowUp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span> : '-'}</td>
                                      <td className="px-6 py-4 text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); handleEditContact(contact); }} className="p-1.5 text-gray-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact.id); }} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Right: Active Caller Card */}
          <div className="lg:w-1/3 flex flex-col min-h-0">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg flex-1 flex flex-col overflow-hidden relative">
                  <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                  
                  {activeContact ? (
                      <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                          <div className="flex justify-between items-start mb-6 shrink-0">
                              <div className="min-w-0">
                                  <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-500 text-[10px] font-bold mb-2">#{activeIndex + 1} / {contacts.length}</span>
                                  <h3 className="text-2xl font-bold text-gray-900 leading-tight flex items-center gap-2 truncate">{activeContact.name}</h3>
                                  <p className="text-lg text-gray-500 font-mono mt-1">{activeContact.phone}</p>
                                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-medium">
                                      <MapPin className="w-3 h-3" /> {activeContact.city || 'Unknown City'}
                                      {isSuperAdmin && <span className="flex items-center gap-1 text-indigo-500 font-bold"><Building2 className="w-3 h-3" /> {activeContact.franchiseName}</span>}
                                  </div>
                              </div>
                              <div className={`w-3 h-3 rounded-full shadow-sm shrink-0 ${activeContact.status === 'Pending' ? 'bg-orange-400' : 'bg-green-500'}`}></div>
                          </div>

                          <button onClick={handleCall} className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-1 mb-6 group shrink-0">
                              <Phone className="w-8 h-8 fill-current group-hover:scale-110 transition-transform" />
                              <span className="text-lg font-bold tracking-wide">DIAL NOW</span>
                          </button>

                          <div className="mb-6 space-y-3">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><History className="w-3 h-3" /> Previous History</p>
                              <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 max-h-32 overflow-y-auto custom-scrollbar shadow-inner text-xs text-gray-600 italic">
                                  {(activeContact.history || []).length > 0 ? activeContact.history![0].note : "No previous history for this lead."}
                              </div>
                          </div>

                          <div className="space-y-6 pt-2 border-t border-gray-100">
                              <div>
                                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 block">Current Interaction Note</label>
                                  <textarea 
                                      value={activeContact.note}
                                      onChange={(e) => setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, note: e.target.value } : c))}
                                      className="w-full p-3 bg-white border border-emerald-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-24 shadow-sm"
                                      placeholder="Summarize the interaction..."
                                  />
                              </div>

                              <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-3">
                                      <button onClick={() => handleOutcome('Interested')} className="py-2.5 bg-green-50 text-green-700 font-bold rounded-xl border border-green-200 hover:bg-green-100 flex items-center justify-center gap-2 text-xs">Interested</button>
                                      <button onClick={() => handleOutcome('Callback')} className="py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-2 text-xs">Callback</button>
                                      <button onClick={() => handleOutcome('No Answer')} className="py-2.5 bg-orange-50 text-orange-700 font-bold rounded-xl border border-orange-200 hover:bg-orange-100 flex items-center justify-center gap-2 text-xs">No Ans</button>
                                      <button onClick={() => handleOutcome('Not Interested')} className="py-2.5 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200 hover:bg-red-100 flex items-center justify-center gap-2 text-xs">Not Intr.</button>
                                  </div>
                              </div>
                          </div>

                          <div className="mt-8 pt-4 border-t border-gray-100 relative">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">One-Click Engagement</p>
                              <button 
                                onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                              >
                                  <MessageSquare className="w-4 h-4" /> Send Dynamic Template
                              </button>
                              
                              {showTemplatePicker && (
                                  <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-20 animate-in fade-in slide-in-from-bottom-2 overflow-hidden">
                                      <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select a Template</span>
                                          <button onClick={() => setShowTemplatePicker(false)}><X className="w-3 h-3 text-gray-400"/></button>
                                      </div>
                                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                          {templates.map(t => (
                                              <button 
                                                key={t.id} 
                                                onClick={() => handleSendFromTemplate(t)}
                                                className="w-full p-3 text-left hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between group"
                                              >
                                                  <div className="min-w-0 flex-1">
                                                      <div className="text-xs font-bold text-gray-800 truncate">{t.name}</div>
                                                      <div className="text-[10px] text-gray-400 font-medium truncate">{t.type}</div>
                                                  </div>
                                                  <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400"><FileSpreadsheet className="w-16 h-16 mb-4 opacity-50" /><h3 className="text-lg font-bold text-gray-600 mb-2">List Empty</h3><p className="text-sm">Import CSV or add manually to start.</p></div>
                  )}
              </div>
          </div>
      </div>

      {/* Templates Modal */}
      {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 flex flex-col h-[80vh]">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                      <h3 className="text-xl font-black text-gray-900 tracking-tighter flex items-center gap-2">
                        <Settings className="w-6 h-6 text-indigo-500" /> Manage Messaging Templates
                      </h3>
                      <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-400 hover:text-gray-900"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="flex-1 flex overflow-hidden">
                      {/* Left: Template List */}
                      <div className="w-1/2 border-r border-gray-100 flex flex-col bg-gray-50/30">
                          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Saved Templates ({templates.length})</span>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                              {templates.map(t => (
                                  <div key={t.id} className={`p-4 rounded-xl border transition-all relative group ${editingTemplateId === t.id ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-100 hover:border-indigo-200 shadow-sm'}`}>
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-2">
                                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${t.type === 'WhatsApp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{t.type}</span>
                                              <h4 className="font-bold text-gray-900 text-sm truncate max-w-[150px]">{t.name}</h4>
                                          </div>
                                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button onClick={() => { setEditingTemplateId(t.id); setTemplateForm(t); }} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-white"><Edit2 className="w-3.5 h-3.5"/></button>
                                              <button onClick={() => setTemplates(prev => prev.filter(x => x.id !== t.id))} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white"><Trash2 className="w-3.5 h-3.5"/></button>
                                          </div>
                                      </div>
                                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">"{t.content}"</p>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Right: Add/Edit Form */}
                      <div className="w-1/2 p-8 flex flex-col bg-white overflow-y-auto">
                          <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6 pb-2 border-b border-gray-50">
                              {editingTemplateId ? 'Edit Template' : 'Create New Template'}
                          </h4>
                          <form onSubmit={handleSaveTemplate} className="space-y-6">
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Template Label</label>
                                  <input 
                                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all" 
                                    placeholder="e.g. Price Quote WhatsApp"
                                    value={templateForm.name}
                                    onChange={e => setTemplateForm({...templateForm, name: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Channel Type</label>
                                  <div className="flex gap-3">
                                      {['WhatsApp', 'Email'].map(type => (
                                          <button 
                                            key={type}
                                            type="button"
                                            onClick={() => setTemplateForm({...templateForm, type: type as any})}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${templateForm.type === type ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                          >
                                              {type}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                              <div>
                                  <div className="flex justify-between items-center mb-1.5 ml-1">
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message Content</label>
                                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Use [Name] to personalize</span>
                                  </div>
                                  <textarea 
                                    className="w-full p-4 border border-gray-200 rounded-2xl text-sm font-medium h-48 outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-inner bg-gray-50 focus:bg-white transition-all" 
                                    placeholder="Hello [Name], thank you for contacting OK BOZ..."
                                    value={templateForm.content}
                                    onChange={e => setTemplateForm({...templateForm, content: e.target.value})}
                                  />
                              </div>
                              <div className="flex gap-4 pt-2">
                                  {editingTemplateId && (
                                      <button 
                                        type="button" 
                                        onClick={() => { setEditingTemplateId(null); setTemplateForm({ name: '', type: 'WhatsApp', content: '' }); }}
                                        className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50"
                                      >
                                          Cancel
                                      </button>
                                  )}
                                  <button 
                                    type="submit" 
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/10 hover:bg-indigo-700 transition-all transform active:scale-95"
                                  >
                                      {editingTemplateId ? 'Update Template' : 'Add Template'}
                                  </button>
                              </div>
                          </form>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Callback Scheduler Modal */}
      {isCallbackModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h3 className="text-xl font-black text-gray-900 tracking-tighter">Schedule Callback</h3>
                 <button onClick={() => setIsCallbackModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-400 hover:text-gray-900"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Follow-up Date</label>
                        <input type="date" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 shadow-inner" value={callbackDate} onChange={e => setCallbackDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Preferred Time</label>
                        <input type="time" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 shadow-inner" value={callbackTime} onChange={e => setCallbackTime(e.target.value)} />
                    </div>
                 </div>
                 <button onClick={saveCallback} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/10 hover:bg-blue-700 transition-all transform active:scale-95">Set Callback</button>
              </div>
           </div>
        </div>
      )}

      {/* Manual Add Contact Modal */}
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
                 <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all transform active:scale-95">Add to Campaign</button>
              </form>
           </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h3 className="text-xl font-black text-gray-900 tracking-tighter">Edit Lead</h3>
                 <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-400 hover:text-gray-900"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleUpdateContact} className="p-8 space-y-5">
                 <div className="space-y-4">
                    <input className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-800" placeholder="Full Name" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} required />
                    <input className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-800" placeholder="Mobile Number" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} required />
                    <input className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-800" placeholder="Email (Optional)" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} />
                    <input className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-gray-800" placeholder="City" value={editFormData.city} onChange={e => setEditFormData({...editFormData, city: e.target.value})} />
                 </div>
                 <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all transform active:scale-95">Update Details</button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default AutoDialer;